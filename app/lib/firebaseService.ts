// Firebase service functions for Maintenance Dashboard using Realtime Database

import {
    ref,
    get,
    set,
    push,
    update,
    remove,
    query,
    orderByChild,
    equalTo
} from "firebase/database";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { database, storage } from "./firebase";
import { Machine, Part, MaintenanceRecord, SparePart, StockTransaction, MaintenanceSchedule, PMPlan, UserProfile, PendingUser, UserRole } from "../types";
import { translateToEnglish } from "./translationService";

// Collection names
const COLLECTIONS = {
    MACHINES: "machines",
    PARTS: "parts",
    MAINTENANCE_RECORDS: "maintenance_records",
    SCHEDULES: "schedules",
    PM_PLANS: "pm_plans",
    DATA_TRANSLATIONS: "data_translations",
};

// ==================== TRANSLATIONS ====================

/**
 * Synchronizes a translation for a piece of text.
 */
export async function syncTranslation(text: string): Promise<void> {
    if (!text || !/[ก-ฮ]/.test(text)) return;

    const normalizedText = text.trim();
    const translationsRef = ref(database, COLLECTIONS.DATA_TRANSLATIONS);

    try {
        const snapshot = await get(translationsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Case-insensitive check
            const alreadyExists = Object.keys(data).some(k => k.toLowerCase() === normalizedText.toLowerCase());
            if (alreadyExists) return;
        }

        const englishText = await translateToEnglish(normalizedText);
        if (englishText && englishText !== normalizedText) {
            await update(translationsRef, {
                [normalizedText]: englishText
            });
        }
    } catch (error) {
        console.error("Error syncing translation:", error);
    }
}

/**
 * Fetches all dynamic translations.
 */
export async function getDynamicTranslations(): Promise<Record<string, string>> {
    const translationsRef = ref(database, COLLECTIONS.DATA_TRANSLATIONS);
    const snapshot = await get(translationsRef);
    return snapshot.exists() ? snapshot.val() : {};
}

// ==================== MACHINES ====================

// ==================== MACHINES ====================

// ==================== MACHINES ====================

export async function getMachines(): Promise<Machine[]> {
    const machinesMap = new Map<string, Machine>();

    // 1. Fetch explicit machine data first
    const machinesRef = ref(database, COLLECTIONS.MACHINES);
    const machinesSnapshot = await get(machinesRef);

    if (machinesSnapshot.exists()) {
        machinesSnapshot.forEach((child) => {
            const data = child.val();
            const machineId = child.key!;
            const machineName = data.name || machineId;

            machinesMap.set(machineName, {
                id: machineId,
                name: machineName,
                code: data.code || "",
                brand: data.brand || "",
                model: data.model || "",
                performance: data.performance || "",
                remark: data.remark || "",
                description: data.description || "",
                zone: data.zone || "No Zone",
                location: data.location || "",
                status: data.status || "active",
                imageUrl: data.imageUrl || "",
                serialNumber: data.serialNumber || "",
                installationDate: data.installationDate || "",
                brandModel: data.brandModel || "",
                operatingHours: data.operatingHours || 0,
                capacity: data.capacity || "",
                powerRating: data.powerRating || "",
                maintenanceCycle: data.maintenanceCycle || 0,
                createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            });
        });
    }

    // 2. Fetch parts to discover legacy/inferred machines
    const partsRef = ref(database, COLLECTIONS.PARTS);
    const partsSnapshot = await get(partsRef);

    if (partsSnapshot.exists()) {
        partsSnapshot.forEach((childSnapshot) => {
            const part = childSnapshot.val();
            const machineName = part.machineName || part.machine || "Unknown Machine";
            const zone = part.zone || "No Zone";
            const location = part.location || "";

            if (machineName) {
                if (!machinesMap.has(machineName)) {
                    // Create new inferred machine
                    machinesMap.set(machineName, {
                        id: machineName,
                        name: machineName,
                        description: "",
                        zone: zone,
                        location: location,
                        status: "active",
                        imageUrl: part.imageUrl || "",
                        serialNumber: "",
                        installationDate: "",
                        brandModel: "",
                        operatingHours: 0,
                        capacity: "",
                        powerRating: "",
                        maintenanceCycle: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                } else {
                    // Enrich existing machine if it lacks image/zone/location
                    const existing = machinesMap.get(machineName)!;
                    if (!existing.imageUrl && part.imageUrl) existing.imageUrl = part.imageUrl;
                    if (existing.zone === "No Zone" && zone && zone !== "No Zone") existing.zone = zone;
                    if (!existing.location && location) existing.location = location;
                }
            }
        });
    }

    // Sort by name
    return Array.from(machinesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateMachineImage(machineName: string, file: File, machineId?: string): Promise<string> {
    try {
        // 1. Upload new image
        const fileName = `machines/${Date.now()}_${file.name}`;
        const sRef = storageRef(storage, fileName);
        await uploadBytes(sRef, file);
        const downloadUrl = await getDownloadURL(sRef);

        // 2. Save/Update machine record in Realtime Database
        const machinesRef = ref(database, COLLECTIONS.MACHINES);
        let existingKey: string | null = machineId || null;

        // If no ID provided, try to find by Name or Key match (consistent with getMachines)
        if (!existingKey) {
            const snapshot = await get(machinesRef);
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const data = child.val();
                    if (child.key === machineName || data.name === machineName) {
                        existingKey = child.key;
                    }
                });
            }
        }

        if (existingKey) {
            // Update existing record
            const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${existingKey}`);
            await update(machineRef, {
                imageUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Create new record
            const newMachineRef = push(machinesRef);
            await set(newMachineRef, {
                name: machineName,
                imageUrl: downloadUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                description: "Machine record",
                status: "active",
                zone: "Unknown"
            });
        }

        return downloadUrl;
    } catch (error) {
        console.error("Error updating machine image:", error);
        throw error;
    }
}

export async function getMachine(id: string): Promise<Machine | null> {
    const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);
    const snapshot = await get(machineRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.val();
    return {
        id: snapshot.key!,
        ...data,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
}

export async function addMachine(machine: Omit<Machine, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const machinesRef = ref(database, COLLECTIONS.MACHINES);
    const newMachineRef = push(machinesRef);

    await set(newMachineRef, {
        ...machine,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // Auto-translate relevant fields
    syncTranslation(machine.name);
    if (machine.brand) syncTranslation(machine.brand);
    if (machine.model) syncTranslation(machine.model);
    if (machine.description) syncTranslation(machine.description);

    return newMachineRef.key!;
}

export async function updateMachine(id: string, data: Partial<Machine>): Promise<void> {
    const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);

    await update(machineRef, {
        ...data,
        updatedAt: new Date().toISOString(),
    });

    // Auto-translate updated fields
    if (data.name) syncTranslation(data.name);
    if (data.brand) syncTranslation(data.brand);
    if (data.model) syncTranslation(data.model);
    if (data.description) syncTranslation(data.description);
}

export async function deleteMachine(id: string): Promise<void> {
    const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);
    await remove(machineRef);
}

// ==================== PARTS ====================

export async function getParts(): Promise<Part[]> {
    const partsRef = ref(database, COLLECTIONS.PARTS);
    const snapshot = await get(partsRef);

    if (!snapshot.exists()) return [];

    const parts: Part[] = [];
    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();

        // Handle legacy data structure
        // Map image_url to imageUrl if existing
        // Prioritize 'image' (legacy) -> 'image_url' (legacy) -> 'imageUrl' (new)
        const imageUrl = data.image || data.image_url || data.imageUrl || "";

        // Map legacy fields
        const quantity = data.quantity !== undefined ? data.quantity : (data.qty !== undefined ? data.qty : 0);
        const modelSpec = data.modelSpec || data.model || "";
        const machineName = data.machineName || data.machine || "";

        parts.push({
            id: childSnapshot.key!,
            ...data,
            imageUrl,
            quantity,
            modelSpec,
            machineName,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        });
    });

    // Sort by updatedAt desc (latest first)
    return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

// Fallback: Fetch all parts and filter by machine name (client-side filtering)
export async function getPartsByMachine(machineId: string): Promise<Part[]> {
    try {
        const partsRef = ref(database, COLLECTIONS.PARTS);
        const snapshot = await get(partsRef);

        if (!snapshot.exists()) return [];

        const parts: Part[] = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            // Client-side filtering for machineId to avoid index error
            // Also handle legacy 'machine' field if needed, but primarily machineId
            if (data.machineId === machineId) {
                const imageUrl = data.image || data.image_url || data.imageUrl || "";
                parts.push({
                    id: childSnapshot.key!,
                    ...data,
                    imageUrl,
                    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
                });
            }
        });

        return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
        console.error("Error fetching parts by machine:", error);
        return [];
    }
}

// Fallback: Fetch all parts and filter by machine name (client-side filtering)
// This is useful when the Firebase index is not set up
export async function getPartsByMachineName(machineName: string): Promise<Part[]> {
    const allParts = await getParts();
    return allParts.filter(p =>
        p.machineName?.toLowerCase() === machineName.toLowerCase() ||
        (p as any).machine?.toLowerCase() === machineName.toLowerCase()
    );
}

export async function addPart(
    part: Omit<Part, "id" | "createdAt" | "updatedAt">,
    imageFile?: File
): Promise<string> {
    let imageUrl = "";

    // Upload image if provided
    if (imageFile) {
        imageUrl = await uploadPartImage(imageFile);
    }

    // Create a clean object
    const { imageFile: _ignore, ...safePartData } = part as any;

    const partsRef = ref(database, COLLECTIONS.PARTS);
    const newPartRef = push(partsRef);

    await set(newPartRef, {
        ...safePartData,
        imageUrl,
        // Save both camelCase and snake_case for compatibility if needed, or just new standard
        image_url: imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    // Auto-translate relevant fields
    syncTranslation(safePartData.partName);
    if (safePartData.modelSpec) syncTranslation(safePartData.modelSpec);
    if (safePartData.brand) syncTranslation(safePartData.brand);
    if (safePartData.location) syncTranslation(safePartData.location);

    return newPartRef.key!;
}

export async function updatePart(
    id: string,
    data: Partial<Part>,
    imageFile?: File
): Promise<void> {
    let imageUrl = data.imageUrl;

    if (imageFile) {
        imageUrl = await uploadPartImage(imageFile);
    }

    const partRef = ref(database, `${COLLECTIONS.PARTS}/${id}`);

    const updateData: any = {
        ...data,
        updatedAt: new Date().toISOString(),
    };

    if (imageUrl !== undefined) {
        updateData.imageUrl = imageUrl;
        updateData.image_url = imageUrl; // Keep sync
    }

    await update(partRef, updateData);

    // Auto-translate updated fields
    if (data.partName) syncTranslation(data.partName);
    if (data.modelSpec) syncTranslation(data.modelSpec);
    if (data.brand) syncTranslation(data.brand);
    if (data.location) syncTranslation(data.location);
    if (data.notes) syncTranslation(data.notes);
}

export async function deletePart(id: string): Promise<void> {
    const partRef = ref(database, `${COLLECTIONS.PARTS}/${id}`);
    await remove(partRef);
}

// ==================== MAINTENANCE RECORDS ====================

export async function getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
    const snapshot = await get(recordsRef);

    if (!snapshot.exists()) return [];

    const records: MaintenanceRecord[] = [];
    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        records.push({
            id: childSnapshot.key!,
            ...data,
            date: data.date ? new Date(data.date) : new Date(),
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        });
    });

    // Sort by date desc (client-side)
    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getMaintenanceRecordsByMachine(machineId: string): Promise<MaintenanceRecord[]> {
    // Client-side filtering because RTDB can only query by one property
    const allRecords = await getMaintenanceRecords();
    return allRecords.filter(r => r.machineId === machineId);
}

export async function getMaintenanceRecordsByPMPlan(planId: string): Promise<MaintenanceRecord[]> {
    const allRecords = await getMaintenanceRecords();
    return allRecords.filter(r => r.pmPlanId === planId);
}

export async function addMaintenanceRecord(
    record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">
): Promise<string> {
    const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
    const newRecordRef = push(recordsRef);

    const now = new Date();
    await set(newRecordRef, {
        ...record,
        date: new Date(record.date).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    });

    // Auto-translate relevant fields
    if (record.description) syncTranslation(record.description);
    if (record.technician) syncTranslation(record.technician);
    if (record.machineName) syncTranslation(record.machineName);

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
        }
    }

    return newRecordRef.key!;
}

export async function updateMaintenanceRecord(
    id: string,
    data: Partial<MaintenanceRecord>
): Promise<void> {
    const recordRef = ref(database, `${COLLECTIONS.MAINTENANCE_RECORDS}/${id}`);

    const updateData: any = {
        ...data,
        updatedAt: new Date().toISOString(),
    };

    if (data.date) {
        updateData.date = new Date(data.date).toISOString();
    }

    await update(recordRef, updateData);

    // Auto-translate updated fields
    if (data.description) syncTranslation(data.description);
    if (data.technician) syncTranslation(data.technician);
    if (data.machineName) syncTranslation(data.machineName);
}

export async function deleteMaintenanceRecord(id: string): Promise<void> {
    const recordRef = ref(database, `${COLLECTIONS.MAINTENANCE_RECORDS}/${id}`);
    await remove(recordRef);
}

// ==================== SCHEDULES (PHASE 4) ====================

export async function getSchedules(): Promise<MaintenanceSchedule[]> {
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
}

export async function upsertSchedule(
    schedule: Omit<MaintenanceSchedule, "id">
): Promise<string> {
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
}

export async function getPMPlans(): Promise<PMPlan[]> {
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
}

export async function addPMPlan(plan: Omit<PMPlan, "id" | "createdAt" | "updatedAt">): Promise<string> {
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
}

export async function updatePMPlan(id: string, data: Partial<PMPlan>): Promise<void> {
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
}

export async function deletePMPlan(id: string): Promise<void> {
    const planRef = ref(database, `${COLLECTIONS.PM_PLANS}/${id}`);
    await remove(planRef);
}

export async function uploadEvidenceImage(file: File): Promise<string> {
    const fileName = `evidence/pm_${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, fileName);
    await uploadBytes(sRef, file);
    return await getDownloadURL(sRef);
}

export const completePMTask = async (
    planId: string,
    record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">,
    evidenceFile?: File
): Promise<void> => {
    try {
        let imageUrl = "";
        let imageHash = "";

        if (evidenceFile) {
            // Calculate hash and check existence
            // For now, simplify image upload logic similar to above or reuse
            // Using direct storage upload for simplicity here as main function seems to rely on separate helpers
            // But per file structure, we have deduplication logic.
            // Let's use uploadEvidenceImage directly.
            imageUrl = await uploadEvidenceImage(evidenceFile);
        }

        // Add Maintenance Record
        const recordRef = push(ref(database, COLLECTIONS.MAINTENANCE_RECORDS));
        const now = new Date();
        const recordData = {
            ...record,
            id: recordRef.key,
            pmPlanId: planId, // Changed from planId to pmPlanId to match MaintenanceRecord type
            evidenceImageUrl: imageUrl, // Changed from imageUrl to evidenceImageUrl
            // imageHash, // This field is not in MaintenanceRecord type
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
        await set(recordRef, recordData);

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

// ==================== STORAGE & DEDUPLICATION ====================

// Helper: Calculate SHA-256 hash of a file
async function calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Helper: Find existing image by hash
async function findImageByHash(hash: string): Promise<any | null> {
    const hashesRef = ref(database, "image_hashes");

    try {
        // Attempt 1: Server-side filtering (Requires Index)
        const q = query(hashesRef, orderByChild("hash"), equalTo(hash));
        const snapshot = await get(q);

        if (snapshot.exists()) {
            // Return the first match
            const key = Object.keys(snapshot.val())[0];
            return { key, ...snapshot.val()[key] };
        }
    } catch (error) {
        // Attempt 2: Fallback to Client-side filtering if index is missing
        console.warn("Firebase Index missing for 'hash'. Falling back to client-side filtering.");
        try {
            const snapshot = await get(hashesRef);
            if (snapshot.exists()) {
                const allData = snapshot.val();
                for (const [key, val] of Object.entries(allData)) {
                    if ((val as any).hash === hash) {
                        return { key, ...val as any };
                    }
                }
            }
        } catch (innerError) {
            console.error("Error in fallback image search:", innerError);
        }
    }

    return null;
}

// Helper: Save new image hash record
async function saveImageHashRecord(file: File, hash: string, url: string) {
    const hashesRef = ref(database, "image_hashes");
    const newHashRef = push(hashesRef);
    await set(newHashRef, {
        hash,
        url,
        fileName: file.name,
        size: file.size,
        usageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
}

// Helper: Increment usage count
async function incrementImageUsage(key: string, currentCount: number) {
    const hashRef = ref(database, `image_hashes/${key}`);
    await update(hashRef, {
        usageCount: currentCount + 1,
        updatedAt: new Date().toISOString(),
    });
}

export async function uploadPartImage(file: File): Promise<string> {
    try {
        // 1. Calculate Hash
        const hash = await calculateFileHash(file);

        // 2. Check for Duplicate
        const existingRecord = await findImageByHash(hash);

        if (existingRecord) {
            console.log("Duplicate image found. Reusing URL:", existingRecord.url);
            // Increment usage count
            await incrementImageUsage(existingRecord.key, existingRecord.usageCount || 1);
            return existingRecord.url;
        }

        // 3. Upload New Image
        const fileName = `parts/${Date.now()}_${file.name}`;
        const sRef = storageRef(storage, fileName);

        await uploadBytes(sRef, file);
        const downloadUrl = await getDownloadURL(sRef);

        // 4. Save Hash Record
        await saveImageHashRecord(file, hash, downloadUrl);

        return downloadUrl;
    } catch (error) {
        console.error("Error handling image upload:", error);
        throw error;
    }
}

export async function deletePartImage(imageUrl: string): Promise<void> {
    try {
        // Note: With deduplication, we should ideally check usageCount before deleting.
        // For now, we'll keep it simple and NOT delete the actual file if it might be shared,
        // OR we just assume manual cleanup for now to avoid breaking other parts.
        // Implementing proper ref-counting deletion is complex (need to checking if hash usageCount <= 1).

        // Find if this URL is tracked in image_hashes
        const hashesRef = ref(database, "image_hashes");
        const q = query(hashesRef, orderByChild("url"), equalTo(imageUrl));
        const snapshot = await get(q);

        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const record = snapshot.val()[key];

            if (record.usageCount > 1) {
                // Decrement usage count
                const hashRef = ref(database, `image_hashes/${key}`);
                await update(hashRef, {
                    usageCount: record.usageCount - 1,
                    updatedAt: new Date().toISOString(),
                });
                return; // Do not delete file from storage
            } else {
                // Remove hash record
                const hashRef = ref(database, `image_hashes/${key}`);
                await remove(hashRef);
            }
        }

        // If usageCount is 1 (or record not found/legacy), delete from storage
        const sRef = storageRef(storage, imageUrl);
        await deleteObject(sRef);
    } catch (error) {
        console.error("Error deleting image:", error);
    }
}

// Helper to remove undefined keys which Firebase doesn't like
const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => newObj[key] === undefined && delete newObj[key]);
    return newObj;
};

// ==================== SPARE PARTS (CONSUMABLES) ====================

export async function getSpareParts(): Promise<SparePart[]> {
    const partsRef = ref(database, "spare_parts");
    const snapshot = await get(partsRef);

    if (!snapshot.exists()) return [];

    const parts: SparePart[] = [];
    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        parts.push({
            id: childSnapshot.key!,
            ...data,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        });
    });

    return parts.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addSparePart(
    part: Omit<SparePart, "id" | "createdAt" | "updatedAt">,
    imageFile?: File
): Promise<string> {
    let imageUrl = "";
    if (imageFile) {
        imageUrl = await uploadPartImage(imageFile); // Reuse part image upload for now
    }

    const partsRef = ref(database, "spare_parts");
    const newPartRef = push(partsRef);

    await set(newPartRef, cleanObject({
        ...part,
        imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }));

    // Auto-translate relevant fields
    syncTranslation(part.name);
    if (part.description) syncTranslation(part.description);
    if (part.brand) syncTranslation(part.brand);
    if (part.location) syncTranslation(part.location);

    return newPartRef.key!;
}

export async function updateSparePart(
    id: string,
    data: Partial<SparePart>,
    imageFile?: File
): Promise<void> {
    let imageUrl = data.imageUrl;

    if (imageFile) {
        imageUrl = await uploadPartImage(imageFile);
    }

    const partRef = ref(database, `spare_parts/${id}`);
    const updateData: any = {
        ...data,
        updatedAt: new Date().toISOString(),
    };

    if (imageUrl !== undefined) {
        updateData.imageUrl = imageUrl;
    }

    await update(partRef, cleanObject(updateData));

    // Auto-translate updated fields
    if (data.name) syncTranslation(data.name);
    if (data.description) syncTranslation(data.description);
    if (data.brand) syncTranslation(data.brand);
    if (data.location) syncTranslation(data.location);
    if (data.notes) syncTranslation(data.notes);
}

export async function deleteSparePart(id: string): Promise<void> {
    const partRef = ref(database, `spare_parts/${id}`);
    await remove(partRef);
}

// ==================== STOCK TRANSACTIONS ====================

export async function adjustStock(
    transaction: Omit<StockTransaction, "id">,
    evidenceImageFile?: File
): Promise<void> {
    // 1. Upload Evidence Image if provided
    let evidenceImageUrl = "";
    if (evidenceImageFile) {
        const fileName = `evidence/${Date.now()}_${evidenceImageFile.name}`;
        const sRef = storageRef(storage, fileName);
        await uploadBytes(sRef, evidenceImageFile);
        evidenceImageUrl = await getDownloadURL(sRef);
    }

    // 2. Record Transaction
    const txnRef = ref(database, "stock_transactions");
    const newTxnRef = push(txnRef);

    await set(newTxnRef, cleanObject({
        ...transaction,
        evidenceImageUrl: evidenceImageUrl || transaction.evidenceImageUrl || "",
        performedAt: transaction.performedAt.toISOString(),
    }));

    // Auto-translate relevant fields
    if (transaction.notes) syncTranslation(transaction.notes);
    if (transaction.machineName) syncTranslation(transaction.machineName);
    if (transaction.partName) syncTranslation(transaction.partName);
    if (transaction.performedBy) syncTranslation(transaction.performedBy);

    // 3. Update Stock Level
    const partRef = ref(database, `spare_parts/${transaction.partId}`);
    const partSnapshot = await get(partRef);

    if (partSnapshot.exists()) {
        const partData = partSnapshot.val();
        let newQuantity = partData.quantity || 0;

        if (transaction.type === "restock") {
            newQuantity += transaction.quantity;
        } else if (transaction.type === "withdraw") {
            newQuantity -= transaction.quantity;
        }

        await update(partRef, {
            quantity: newQuantity,
            updatedAt: new Date().toISOString(),
        });
    }
}

export async function getStockTransactions(partId?: string): Promise<StockTransaction[]> {
    const txnRef = ref(database, "stock_transactions");
    let q = query(txnRef);

    if (partId) {
        q = query(txnRef, orderByChild("partId"), equalTo(partId));
    }

    const snapshot = await get(q);
    if (!snapshot.exists()) return [];

    const txns: StockTransaction[] = [];
    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        txns.push({
            id: childSnapshot.key!,
            ...data,
            performedAt: new Date(data.performedAt),
        });
    });

    return txns.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
}

// ==================== STATISTICS ====================

export async function getDashboardStats() {
    const [parts, machines, records, spareParts] = await Promise.all([
        getParts(),
        getMachines(),
        getMaintenanceRecords(),
        getSpareParts(),
    ]);

    const uniqueZones = new Set(parts.map((p) => p.zone)).size;
    const pendingRecords = records.filter((r) => r.status !== "completed").length;

    // Calculate Spare Parts value could go here if needed

    return {
        totalParts: parts.length,
        totalMachines: machines.length,
        totalZones: uniqueZones,
        maintenanceRecords: records.length,
        pendingMaintenance: pendingRecords,
        upcomingSchedule: 0,
        totalSpareParts: spareParts.length
    };
}

// ==================== USER MANAGEMENT ====================

const USER_COLLECTIONS = {
    USERS: "users",
    PENDING_USERS: "pendingUsers",
};

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
        return snapshot.val() as UserProfile;
    }
    return null;
}

// Get all users (Admin only)
export async function getAllUsers(): Promise<UserProfile[]> {
    const usersRef = ref(database, USER_COLLECTIONS.USERS);
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const users: UserProfile[] = [];
    snapshot.forEach((child) => {
        users.push({ ...child.val(), uid: child.key });
    });

    return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// Get pending users (Admin only)
export async function getPendingUsers(): Promise<PendingUser[]> {
    const pendingRef = ref(database, USER_COLLECTIONS.PENDING_USERS);
    const snapshot = await get(pendingRef);

    if (!snapshot.exists()) return [];

    const pending: PendingUser[] = [];
    snapshot.forEach((child) => {
        pending.push({ ...child.val(), uid: child.key });
    });

    return pending.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

// Create pending user (on first sign up)
export async function createPendingUser(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<void> {
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);

    await set(pendingRef, {
        uid,
        email,
        displayName,
        photoURL: photoURL || "",
        requestedAt: new Date().toISOString(),
    });
}

// Check if user is pending
export async function isPendingUser(uid: string): Promise<boolean> {
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    const snapshot = await get(pendingRef);
    return snapshot.exists();
}

// Approve pending user (Admin only)
export async function approveUser(
    uid: string,
    role: UserRole = "technician",
    displayName?: string,
    nickname?: string
): Promise<void> {
    // Get pending user data
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    const pendingSnapshot = await get(pendingRef);

    if (!pendingSnapshot.exists()) {
        throw new Error("Pending user not found");
    }

    const pendingData = pendingSnapshot.val() as PendingUser;
    const now = new Date().toISOString();

    // Create user profile
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
    await set(userRef, {
        uid,
        email: pendingData.email,
        displayName: displayName || pendingData.displayName,
        nickname: nickname || "",
        role,
        department: "Maintenance",
        isApproved: true,
        isActive: true,
        photoURL: pendingData.photoURL || "",
        createdAt: now,
        updatedAt: now,
    });

    // Remove from pending
    await remove(pendingRef);
}

// Reject pending user (Admin only)
export async function rejectPendingUser(uid: string): Promise<void> {
    const pendingRef = ref(database, `${USER_COLLECTIONS.PENDING_USERS}/${uid}`);
    await remove(pendingRef);
}

// Update user profile
export async function updateUserProfile(
    uid: string,
    updates: Partial<Omit<UserProfile, "uid" | "email" | "createdAt">>
): Promise<void> {
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);
    await update(userRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
}

// Deactivate user (soft delete)
export async function deactivateUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { isActive: false });
}

// Reactivate user
export async function reactivateUser(uid: string): Promise<void> {
    await updateUserProfile(uid, { isActive: true });
}

// Check if email is initial admin
export function isInitialAdminEmail(email: string): boolean {
    const adminEmail = process.env.NEXT_PUBLIC_INITIAL_ADMIN_EMAIL;
    return adminEmail ? email.toLowerCase() === adminEmail.toLowerCase() : false;
}

// Create initial admin user (only if matches env variable)
export async function createInitialAdmin(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string
): Promise<boolean> {
    if (!isInitialAdminEmail(email)) {
        return false;
    }

    // Check if user already exists
    const existingUser = await getUserProfile(uid);
    if (existingUser) {
        return false;
    }

    const now = new Date().toISOString();
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);

    await set(userRef, {
        uid,
        email,
        displayName,
        nickname: "Admin",
        role: "admin" as UserRole,
        department: "Management",
        isApproved: true,
        isActive: true,
        photoURL: photoURL || "",
        createdAt: now,
        updatedAt: now,
    });

    return true;
}

