import {
    ref,
    get,
    set,
    push
} from "firebase/database";
import { database } from "../lib/firebase";
import { AdminStats, PerformanceEvaluation, MaintenanceRecord } from "../types";
import { COLLECTIONS } from "./constants";
import { getParts, getSpareParts } from "./partService";
import { getMachines } from "./machineService";
import { getMaintenanceRecords } from "./maintenanceService";

// ==================== STATISTICS ====================

export async function getDashboardStats() {
    const [parts, machines, records, spareParts] = await Promise.all([
        getParts(),
        getMachines(),
        getMaintenanceRecords(),
        getSpareParts(),
    ]);

    const uniqueLocations = new Set(parts.map((p) => p.Location).filter(l => l && l.trim() !== '')).size;
    const pendingRecords = records.filter((r) => r.status !== "completed").length;

    // Separate PM and Overhaul counts
    const totalPM = records.filter(r =>
        r.type === 'preventive' ||
        r.type === 'oilChange' ||
        r.type === 'inspection'
    ).length;

    const totalOverhaul = records.filter(r =>
        r.type === 'partReplacement' ||
        r.isOverhaul === true
    ).length;

    return {
        totalParts: parts.length,
        totalMachines: machines.length,
        totalLocations: uniqueLocations,
        maintenanceRecords: records.length,
        totalPM,
        totalOverhaul,
        pendingMaintenance: pendingRecords,
        upcomingSchedule: 0,
        totalSpareParts: spareParts.length
    };
}

// ==================== ADMIN & ANALYTICS ====================

/**
 * Logs application access for the current day.
 */
export async function logAppAccess(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const accessRef = ref(database, `${COLLECTIONS.USAGE_LOGS}/${today}`);

    try {
        const snapshot = await get(accessRef);
        const currentCount = snapshot.exists() ? snapshot.val().count || 0 : 0;
        await set(accessRef, { count: currentCount + 1 });
    } catch (error) {
        console.error("Error logging app access:", error);
    }
}

/**
 * Fetches admin statistics for dashboard.
 */
export async function getAdminStats(): Promise<AdminStats> {
    const usageRef = ref(database, COLLECTIONS.USAGE_LOGS);
    const usersRef = ref(database, "users");
    const evalsRef = ref(database, COLLECTIONS.PERFORMANCE_EVALUATIONS);

    try {
        const [usageSnap, usersSnap, evalsSnap] = await Promise.all([
            get(usageRef),
            get(usersRef),
            get(evalsRef)
        ]);

        const usageData = usageSnap.exists() ? usageSnap.val() : {};
        const usersData = usersSnap.exists() ? usersSnap.val() : {};
        const evalsData = evalsSnap.exists() ? evalsSnap.val() : {};

        const usageHistory = Object.entries(usageData).map(([date, data]: [string, any]) => ({
            date,
            count: data.count || 0
        })).sort((a, b) => a.date.localeCompare(b.date));

        const totalLogins = usageHistory.reduce((sum, day) => sum + day.count, 0);
        const avgLoginsPerDay = usageHistory.length > 0 ? totalLogins / usageHistory.length : 0;
        const technicianCount = Object.values(usersData).filter((u: any) => u.role === "technician").length;

        // Calculate average performance across all technicians
        let totalScore = 0;
        let evalCount = 0;
        Object.values(evalsData).forEach((techEvals: any) => {
            Object.values(techEvals).forEach((ev: any) => {
                totalScore += ev.averageScore || 0;
                evalCount++;
            });
        });

        const avgPerformance = evalCount > 0 ? totalScore / evalCount : 0;

        return {
            totalLogins,
            avgLoginsPerDay,
            usageHistory: usageHistory.slice(-30),
            technicianCount,
            avgPerformance
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return {
            totalLogins: 0,
            avgLoginsPerDay: 0,
            usageHistory: [],
            technicianCount: 0,
            avgPerformance: 0
        };
    }
}

/**
 * Submits a new performance evaluation for a technician.
 */
export async function submitEvaluation(evaluation: Omit<PerformanceEvaluation, "id">): Promise<string> {
    const evalsRef = ref(database, `${COLLECTIONS.PERFORMANCE_EVALUATIONS}/${evaluation.technicianId}`);
    const newEvalRef = push(evalsRef);

    const data = {
        ...evaluation,
        date: evaluation.date.toISOString(),
        id: newEvalRef.key
    };

    await set(newEvalRef, data);
    return newEvalRef.key!;
}

/**
 * Gets all evaluations for a specific technician.
 */
export async function getTechnicianEvaluations(technicianId: string): Promise<PerformanceEvaluation[]> {
    const evalsRef = ref(database, `${COLLECTIONS.PERFORMANCE_EVALUATIONS}/${technicianId}`);
    const snapshot = await get(evalsRef);

    if (!snapshot.exists()) return [];

    return Object.values(snapshot.val()).map((ev: any) => ({
        ...ev,
        date: new Date(ev.date)
    }));
}

/**
 * Fetches metrics about a technician's work for AI evaluation.
 * 
 * This function aggregates maintenance records and PM plans to calculate:
 * - Total completed tasks (preventive vs corrective)
 * - On-time completion rate
 * - Average note length (as a proxy for technical knowledge)
 * 
 * Note: PM plan statistics are currently incomplete and may need enhancement.
 * 
 * @param technicianName - Name of the technician
 * @param userId - User ID of the technician
 * @returns Object containing work metrics and statistics
 */
export async function getTechnicianWorkMetrics(technicianName: string, userId: string) {
    const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
    const pmPlansRef = ref(database, COLLECTIONS.PM_PLANS);
    // const partsRef = ref(database, COLLECTIONS.PARTS); // Could fetch stock transactions if available

    try {
        const [recordsSnap, pmSnap] = await Promise.all([
            get(recordsRef),
            get(pmPlansRef)
        ]);

        const allRecords: MaintenanceRecord[] = [];
        if (recordsSnap.exists()) {
            recordsSnap.forEach(child => {
                const data = child.val();
                // Match by technician name or userId if stored
                if (data.technician === technicianName || data.userId === userId) {
                    allRecords.push({
                        ...data,
                        id: child.key,
                        date: new Date(data.date)
                    });
                }
            });
        }

        // const pmStats = {
        //     totalCompleted: 0,
        //     onTime: 0,
        //     overdue: 0
        // };

        if (pmSnap.exists()) {
            pmSnap.forEach(child => {
                // const plan = child.val();
                // This is a bit indirect, but we can look at maintenance records that reference this plan
                // For now, let's just count how many records for this technician are 'preventive'
            });
        }

        const preventiveCount = allRecords.filter(r => r.type === "preventive").length;
        const correctiveCount = allRecords.filter(r => r.type === "corrective").length;
        const totalTasks = allRecords.length;

        // Heuristic: Check if they provide detailed notes (Technical Knowledge)
        const avgNoteLength = totalTasks > 0
            ? allRecords.reduce((sum, r) => sum + (r.description?.length || 0), 0) / totalTasks
            : 0;

        return {
            totalTasks,
            preventiveCount,
            correctiveCount,
            avgNoteLength,
            hasPhotoEvidence: allRecords.filter(r => r.evidenceImageUrl).length,
            records: allRecords.slice(0, 10) // Last 10 records for context
        };
    } catch (error) {
        console.error("Error fetching technician metrics:", error);
        return null;
    }
}
