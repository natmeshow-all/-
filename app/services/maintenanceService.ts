import {
    ref,
    get,
    set,
    push,
    update,
    remove,
    query,
    orderByChild,
    equalTo,
    limitToLast,
    endAt,
    startAt,
    startAfter,
    limitToFirst
} from "firebase/database";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { database, storage } from "../lib/firebase";
import { MaintenanceRecord, MaintenanceSchedule, PMPlan, MaintenanceType } from "../types";
import { syncTranslation } from "./translationService";
import { compressImage } from "../lib/imageCompression";
import { COLLECTIONS } from "./constants";
import { getMachines } from "./machineService";
import { incrementDashboardStat } from "./analyticsService";

// ==================== HELPERS ====================

// Helper to remove undefined keys which Firebase doesn't like
const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => newObj[key] === undefined && delete newObj[key]);
    return newObj;
};

// Helper to map maintenance record data
function mapMaintenanceRecord(key: string, data: any): MaintenanceRecord {
    return {
        id: key,
        ...data,
        date: data.date ? new Date(data.date) : new Date(),
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
}

// ==================== MAINTENANCE RECORDS ====================

export async function getMaintenanceRecordsPaginated(
    pageSize: number = 20,
    lastDate?: string,
    lastKey?: string
): Promise<{ records: MaintenanceRecord[], nextCursor?: { date: string, key: string } }> {
    try {
        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        let recordsQuery;

        if (lastDate && lastKey) {
            // Fetch next page: items older than (or equal to) the cursor
            // We request pageSize + 1 to include the cursor itself (which we'll drop)
            recordsQuery = query(
                recordsRef,
                orderByChild("date"),
                endAt(lastDate, lastKey),
                limitToLast(pageSize + 1)
            );
        } else {
            // First page: Get the newest items
            recordsQuery = query(
                recordsRef,
                orderByChild("date"),
                limitToLast(pageSize)
            );
        }

        const snapshot = await get(recordsQuery);

        if (!snapshot.exists()) return { records: [] };

        const records: MaintenanceRecord[] = [];
        snapshot.forEach((childSnapshot) => {
            records.push(mapMaintenanceRecord(childSnapshot.key!, childSnapshot.val()));
        });

        // Sort descending (Newest first)
        records.sort((a, b) => b.date.getTime() - a.date.getTime());

        // If paginating, remove the cursor (overlap)
        if (lastDate && lastKey) {
            const cursorIndex = records.findIndex(r => r.id === lastKey);
            if (cursorIndex !== -1) {
                records.splice(cursorIndex, 1);
            }
        }

        let nextCursor = undefined;
        if (records.length > 0) {
            const lastRecord = records[records.length - 1];
            // We assume there might be more if we got results. 
            // The client will stop when it gets an empty list.
            nextCursor = {
                date: lastRecord.date.toISOString(),
                key: lastRecord.id
            };
        }

        return { records, nextCursor };

    } catch (error) {
        console.error("Error fetching paginated maintenance records:", error);
        throw error;
    }
}

export async function getMaintenanceRecords(limit?: number): Promise<MaintenanceRecord[]> {
    try {
        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        let recordsQuery;

        if (limit) {
            recordsQuery = query(recordsRef, orderByChild("date"), limitToLast(limit));
        } else {
            recordsQuery = recordsRef;
        }

        const snapshot = await get(recordsQuery);

        if (!snapshot.exists()) return [];

        const records: MaintenanceRecord[] = [];
        snapshot.forEach((childSnapshot) => {
            records.push(mapMaintenanceRecord(childSnapshot.key!, childSnapshot.val()));
        });

        // Sort by date desc (client-side)
        return records.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error("Error fetching maintenance records:", error);
        throw error;
    }
}

export async function getMaintenanceRecordsByType(type: MaintenanceType): Promise<MaintenanceRecord[]> {
    try {
        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        const recordsQuery = query(recordsRef, orderByChild("type"), equalTo(type));
        const snapshot = await get(recordsQuery);

        if (!snapshot.exists()) return [];

        const records: MaintenanceRecord[] = [];
        snapshot.forEach((childSnapshot) => {
            records.push(mapMaintenanceRecord(childSnapshot.key!, childSnapshot.val()));
        });

        return records.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error(`Error fetching maintenance records by type ${type}:`, error);
        throw error;
    }
}

export async function getMaintenanceRecordsByMachine(machineId: string): Promise<MaintenanceRecord[]> {
    try {
        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        const recordsQuery = query(recordsRef, orderByChild("machineId"), equalTo(machineId));
        const snapshot = await get(recordsQuery);

        if (!snapshot.exists()) return [];

        const records: MaintenanceRecord[] = [];
        snapshot.forEach((childSnapshot) => {
            records.push(mapMaintenanceRecord(childSnapshot.key!, childSnapshot.val()));
        });

        return records.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error("Error fetching maintenance records by machine:", error);
        throw error;
    }
}

export async function getMaintenanceRecordsByPMPlan(planId: string): Promise<MaintenanceRecord[]> {
    try {
        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        const recordsQuery = query(recordsRef, orderByChild("pmPlanId"), equalTo(planId));
        const snapshot = await get(recordsQuery);

        if (!snapshot.exists()) return [];

        const records: MaintenanceRecord[] = [];
        snapshot.forEach((childSnapshot) => {
            records.push(mapMaintenanceRecord(childSnapshot.key!, childSnapshot.val()));
        });

        return records.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
        console.error("Error fetching maintenance records by PM plan:", error);
        throw error;
    }
}

/**
 * Upload a maintenance evidence image with compression.
 * Returns the download URL.
 */
export async function uploadMaintenanceEvidence(file: File): Promise<string> {
    try {
        // Compress image
        const compressedFile = await compressImage(file, 0.6, 1280);

        // Upload to Storage
        const fileName = `maintenance_evidence/${Date.now()}_${compressedFile.name}`;
        const sRef = storageRef(storage, fileName);
        await uploadBytes(sRef, compressedFile);
        const downloadUrl = await getDownloadURL(sRef);

        return downloadUrl;
    } catch (error) {
        console.error("Error uploading maintenance evidence:", error);
        throw error;
    }
}

export async function addMaintenanceRecord(record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
        if (!record.machineId) throw new Error("Machine ID is required");
        if (!record.date) throw new Error("Date is required");
        if (!record.type) throw new Error("Maintenance type is required");

        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        const newRecordRef = push(recordsRef);
        const now = new Date();

        // Clean record from undefined values (optional but good practice)
        const cleanRecord = Object.fromEntries(
            Object.entries(record).filter(([_, v]) => v !== undefined)
        );

        await set(newRecordRef, {
            ...cleanRecord,
            id: newRecordRef.key!,
            createdAt: now.toISOString(), // Ensure ISO string for better reliability
            updatedAt: now.toISOString(),
        });
        if (record.description) syncTranslation(record.description);
        if (record.technician) syncTranslation(record.technician);
        if (record.machineName) syncTranslation(record.machineName);
        if (record.changeReason) syncTranslation(record.changeReason);
        if (record.partCondition) syncTranslation(record.partCondition);

        // Update stats
        incrementDashboardStat("maintenanceRecords", 1);

        if (record.type === "preventive" || record.type === "oilChange" || record.type === "inspection") {
            incrementDashboardStat("totalPM", 1);
        }

        if (record.type === "partReplacement" || (record as any).isOverhaul) {
            incrementDashboardStat("totalOverhaul", 1);
        }

        if (record.status !== "completed") {
            incrementDashboardStat("pendingMaintenance", 1);
        }

        // Update machine operating hours if reported
        if (record.machineHours && record.machineHours > 0) {
            try {
                const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${record.machineId}`);
                const machineSnap = await get(machineRef);
                if (machineSnap.exists()) {
                    const currentHours = machineSnap.val().operatingHours || 0;
                    if (record.machineHours > currentHours) {
                        await update(machineRef, {
                            operatingHours: record.machineHours,
                            updatedAt: now.toISOString()
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to auto-update machine hours:", error);
                // Non-critical, so we don't throw
            }
        }

        // Phase 4: Auto-update/Create Schedule if it's a preventive task
        if (record.type === "preventive" || record.type === "oilChange" || record.type === "inspection") {
            try {
                const machines = await getMachines();
                const machine = machines.find(m => m.id === record.machineId || m.name === record.machineName);

                if (machine && machine.maintenanceCycle && machine.maintenanceCycle > 0) {
                    const nextDueDate = new Date(record.date);
                    nextDueDate.setDate(nextDueDate.getDate() + (machine.maintenanceCycle || 0));

                    await upsertSchedule({
                        machineId: machine.id,
                        machineName: machine.name,
                        type: record.type,
                        scheduledDate: nextDueDate,
                        intervalDays: machine.maintenanceCycle || 0,
                        lastCompleted: new Date(record.date),
                        nextDue: nextDueDate,
                    });
                }
            } catch (error) {
                console.error("Failed to auto-update schedule:", error);
                // Non-critical, so we don't throw
            }
        }

        return newRecordRef.key!;
    } catch (error) {
        console.error("Error adding maintenance record:", error);
        throw error;
    }
}

export async function updateMaintenanceRecord(
    id: string,
    data: Partial<MaintenanceRecord>
): Promise<void> {
    try {
        if (!id) throw new Error("Maintenance Record ID is required for update");

        const recordRef = ref(database, `${COLLECTIONS.MAINTENANCE_RECORDS}/${id}`);

        const updateData: any = {
            ...data,
            updatedAt: new Date().toISOString(),
        };

        if (data.date) {
            updateData.date = new Date(data.date).toISOString();
        }

        await update(recordRef, updateData);

        if (data.description) syncTranslation(data.description);
        if (data.technician) syncTranslation(data.technician);
        if (data.machineName) syncTranslation(data.machineName);
        if (data.changeReason) syncTranslation(data.changeReason);
        if (data.partCondition) syncTranslation(data.partCondition);
    } catch (error) {
        console.error(`Error updating maintenance record ${id}:`, error);
        throw error;
    }
}

export async function deleteMaintenanceRecord(id: string): Promise<void> {
    try {
        const recordRef = ref(database, `${COLLECTIONS.MAINTENANCE_RECORDS}/${id}`);

        // Get record details before deleting to update stats
        const snapshot = await get(recordRef);
        if (snapshot.exists()) {
            const record = snapshot.val();

            // Update stats
            incrementDashboardStat("maintenanceRecords", -1);

            if (record.type === "preventive" || record.type === "oilChange" || record.type === "inspection") {
                incrementDashboardStat("totalPM", -1);
            }

            if (record.type === "partReplacement" || record.isOverhaul) {
                incrementDashboardStat("totalOverhaul", -1);
            }

            if (record.status !== "completed") {
                incrementDashboardStat("pendingMaintenance", -1);
            }
        }

        await remove(recordRef);
    } catch (error) {
        console.error(`Error deleting maintenance record ${id}:`, error);
        throw error;
    }
}

// ==================== SCHEDULES (PHASE 4) ====================

export async function getSchedules(): Promise<MaintenanceSchedule[]> {
    try {
        const schedulesRef = ref(database, COLLECTIONS.SCHEDULES);
        const snapshot = await get(schedulesRef);

        if (!snapshot.exists()) return [];

        const schedules: MaintenanceSchedule[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            schedules.push({
                id: child.key!,
                ...data,
                scheduledDate: new Date(data.scheduledDate),
                lastCompleted: data.lastCompleted ? new Date(data.lastCompleted) : undefined,
                nextDue: new Date(data.nextDue),
            });
        });

        return schedules;
    } catch (error) {
        console.error("Error fetching schedules:", error);
        throw error;
    }
}

export async function upsertSchedule(
    schedule: Omit<MaintenanceSchedule, "id">
): Promise<string> {
    try {
        const schedulesRef = ref(database, COLLECTIONS.SCHEDULES);

        // Check if machine already has a schedule of this type
        const q = query(schedulesRef, orderByChild("machineId"), equalTo(schedule.machineId));
        const snapshot = await get(q);

        let targetRef;
        let existingId = null;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const data = child.val();
                if (data.type === schedule.type) {
                    existingId = child.key;
                }
            });
        }

        if (existingId) {
            targetRef = ref(database, `${COLLECTIONS.SCHEDULES}/${existingId}`);
            await update(targetRef, {
                ...schedule,
                scheduledDate: schedule.scheduledDate.toISOString(),
                lastCompleted: schedule.lastCompleted?.toISOString(),
                nextDue: schedule.nextDue.toISOString(),
            });
            return existingId;
        } else {
            targetRef = push(schedulesRef);
            await set(targetRef, {
                ...schedule,
                scheduledDate: schedule.scheduledDate.toISOString(),
                lastCompleted: schedule.lastCompleted?.toISOString(),
                nextDue: schedule.nextDue.toISOString(),
            });
            return targetRef.key!;
        }
    } catch (error) {
        console.error("Error upserting schedule:", error);
        throw error;
    }
}

export async function getPMPlans(): Promise<PMPlan[]> {
    try {
        const plansRef = ref(database, COLLECTIONS.PM_PLANS);
        const snapshot = await get(plansRef);

        if (!snapshot.exists()) return [];

        const plans: PMPlan[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            plans.push({
                id: child.key!,
                ...data,
                startDate: new Date(data.startDate),
                nextDueDate: new Date(data.nextDueDate),
                lastCompletedDate: data.lastCompletedDate ? new Date(data.lastCompletedDate) : undefined,
                createdAt: new Date(data.createdAt),
                updatedAt: new Date(data.updatedAt),
            });
        });

        return plans.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
    } catch (error) {
        console.error("Error fetching PM plans:", error);
        throw error;
    }
}

export async function addPMPlan(plan: Omit<PMPlan, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
        const plansRef = ref(database, COLLECTIONS.PM_PLANS);
        const newPlanRef = push(plansRef);

        await set(newPlanRef, cleanObject({
            ...plan,
            startDate: plan.startDate.toISOString(),
            nextDueDate: plan.nextDueDate.toISOString(),
            lastCompletedDate: plan.lastCompletedDate?.toISOString() || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        // Auto-translate relevant fields
        if (plan.machineName) syncTranslation(plan.machineName);
        if (plan.taskName) syncTranslation(plan.taskName);
        if (plan.notes) syncTranslation(plan.notes);

        return newPlanRef.key!;
    } catch (error) {
        console.error("Error adding PM plan:", error);
        throw error;
    }
}

export async function updatePMPlan(id: string, data: Partial<PMPlan>): Promise<void> {
    try {
        const planRef = ref(database, `${COLLECTIONS.PM_PLANS}/${id}`);
        const updateData: any = { ...data, updatedAt: new Date().toISOString() };

        if (data.startDate) updateData.startDate = data.startDate.toISOString();
        if (data.nextDueDate) updateData.nextDueDate = data.nextDueDate.toISOString();
        if (data.lastCompletedDate) updateData.lastCompletedDate = data.lastCompletedDate.toISOString();

        await update(planRef, cleanObject(updateData));

        // Auto-translate updated fields
        if (data.machineName) syncTranslation(data.machineName);
        if (data.taskName) syncTranslation(data.taskName);
        if (data.notes) syncTranslation(data.notes);
    } catch (error) {
        console.error(`Error updating PM plan ${id}:`, error);
        throw error;
    }
}

export async function deletePMPlan(id: string): Promise<void> {
    try {
        const planRef = ref(database, `${COLLECTIONS.PM_PLANS}/${id}`);
        await remove(planRef);
    } catch (error) {
        console.error(`Error deleting PM plan ${id}:`, error);
        throw error;
    }
}

export async function uploadEvidenceImage(file: File): Promise<string> {
    try {
        const compressedFile = await compressImage(file);
        const fileName = `evidence/pm_${Date.now()}_${compressedFile.name}`;
        const sRef = storageRef(storage, fileName);
        await uploadBytes(sRef, compressedFile);
        return await getDownloadURL(sRef);
    } catch (error) {
        console.error("Error uploading evidence image:", error);
        throw error;
    }
}

export const completePMTask = async (
    planId: string,
    record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">,
    evidenceFile?: File,
    additionalEvidenceFiles?: { label: string; file: File }[]
): Promise<void> => {
    try {
        let imageUrl = "";

        if (evidenceFile) {
            imageUrl = await uploadEvidenceImage(evidenceFile);
        }

        // Upload additional evidence
        const additionalEvidence: { label: string; url: string; }[] = [];
        if (additionalEvidenceFiles && additionalEvidenceFiles.length > 0) {
            for (const item of additionalEvidenceFiles) {
                const url = await uploadEvidenceImage(item.file);
                additionalEvidence.push({
                    label: item.label,
                    url
                });
            }
        }

        // Add Maintenance Record
        const recordRef = push(ref(database, COLLECTIONS.MAINTENANCE_RECORDS));
        const now = new Date();
        const recordData = {
            ...record,
            id: recordRef.key,
            pmPlanId: planId,
            evidenceImageUrl: imageUrl,
            additionalEvidence: additionalEvidence.length > 0 ? additionalEvidence : undefined,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(recordRef, recordData);

        // Update stats
        incrementDashboardStat("maintenanceRecords", 1);

        if (record.type === "preventive" || record.type === "oilChange" || record.type === "inspection") {
            incrementDashboardStat("totalPM", 1);
        }

        if (record.type === "partReplacement" || (record as any).isOverhaul) {
            incrementDashboardStat("totalOverhaul", 1);
        }

        if (record.status !== "completed") {
            incrementDashboardStat("pendingMaintenance", 1);
        }

        // Auto-translate relevant fields
        if (record.description) syncTranslation(record.description);
        if (record.technician) syncTranslation(record.technician);
        if (record.machineName) syncTranslation(record.machineName);

        // Update PM Plan (Status, Last Completed, Next Due)
        const planRef = ref(database, `${COLLECTIONS.PM_PLANS}/${planId}`);
        const planSnapshot = await get(planRef);
        const plan = planSnapshot.val() as PMPlan;

        if (plan) {
            const lastCompleted = new Date();
            const nextDue = new Date(plan.nextDueDate);

            // Calculate next due date
            if (plan.scheduleType === 'weekly') {
                // Weekly logic: Add 7 days to the current "nextDueDate" to preserve the day of week cycle
                // Or typically, simple maintenance adds interval to completion date. 
                // But strictly scheduled tasks usually stick to the schedule (e.g. Every Monday).
                // If we successfully did it, next one is next week's same day.
                nextDue.setDate(nextDue.getDate() + 7);
            } else if (plan.scheduleType === 'yearly') {
                nextDue.setFullYear(nextDue.getFullYear() + 1);
            } else {
                // Monthly default
                const cycle = plan.cycleMonths || 1;
                nextDue.setMonth(nextDue.getMonth() + cycle);
            }

            // Increment count
            const completedCount = (plan.completedCount || 0) + 1;

            await update(planRef, {
                lastCompletedDate: lastCompleted.toISOString(),
                nextDueDate: nextDue.toISOString(),
                status: "active",
                completedCount,
                updatedAt: now.toISOString(),
            });
        }
    } catch (error) {
        console.error("Error completing PM task:", error);
        throw error;
    }
};
export async function copyPMPlans(
    sourceMachineId: string,
    targetMachineIds: string[]
): Promise<{ success: number; failed: number }> {
    try {
        const plansRef = ref(database, COLLECTIONS.PM_PLANS);

        // 1. Get all plans for source machine
        // First try by machineId
        let q = query(plansRef, orderByChild("machineId"), equalTo(sourceMachineId));
        let snapshot = await get(q);

        // If no results, try by machineName (AI often provides name instead of ID)
        if (!snapshot.exists()) {
            console.log(`[copyPMPlans] No plans found by machineId "${sourceMachineId}", trying by machineName...`);
            q = query(plansRef, orderByChild("machineName"), equalTo(sourceMachineId));
            snapshot = await get(q);
        }

        if (!snapshot.exists()) {
            console.log(`[copyPMPlans] No plans found for "${sourceMachineId}" by either machineId or machineName`);
            return { success: 0, failed: 0 };
        }

        const sourcePlans: PMPlan[] = [];
        snapshot.forEach((child) => {
            const val = child.val();
            if (val.status !== 'deleted') { // optional check
                sourcePlans.push(val);
            }
        });

        if (sourcePlans.length === 0) return { success: 0, failed: 0 };

        // 2. Get target machine details (to get names for the new plans)
        // We need machine names for the denormalized machineName field
        const machines = await getMachines(); // This might be heavy if many machines. 
        // Optimization: We could pass names from frontend, but verifying here is safer.

        let successCount = 0;
        let failCount = 0;

        // 3. Loop targets and copy
        const now = new Date();
        const updates: any = {};

        for (const targetId of targetMachineIds) {
            // Try to find target machine by ID first, then by name (AI often provides names)
            let targetMachine = machines.find(m => m.id === targetId);
            if (!targetMachine) {
                targetMachine = machines.find(m => m.name === targetId);
            }
            if (!targetMachine) {
                console.warn(`Target machine "${targetId}" not found by ID or name`);
                failCount += sourcePlans.length;
                continue;
            }

            for (const srcPlan of sourcePlans) {
                const newPlanRef = push(plansRef); // Generate new ID
                const newPlanId = newPlanRef.key!;

                // Prepare new plan data
                const newPlanData = {
                    ...srcPlan,
                    id: newPlanId,
                    machineId: targetId,
                    machineName: targetMachine.name,
                    locationType: srcPlan.locationType || "machine_Location", // Default
                    // Reset execution history
                    lastCompletedDate: null,
                    completedCount: 0,
                    // Reset dates to clean slate
                    startDate: now.toISOString(),
                    nextDueDate: now.toISOString(), // Due immediately or logic to calc? Let's say now.
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                    status: "active"
                };

                // Clean undefined/nulls just in case
                const cleanData = cleanObject(newPlanData);

                updates[`/${COLLECTIONS.PM_PLANS}/${newPlanId}`] = cleanData;
                successCount++;
            }
        }

        // Batch update
        await update(ref(database), updates);

        return { success: successCount, failed: failCount };

    } catch (error) {
        console.error("Error copyPMPlans:", error);
        throw error;
    }
}
