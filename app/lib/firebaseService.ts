/**
 * @fileoverview Firebase Realtime Database service layer for the Maintenance Dashboard.
 * 
 * This module provides all data access functions for:
 * - Machines (equipment registry)
 * - Parts (machine components)
 * - Spare Parts (inventory management)
 * - Maintenance Records (work history)
 * - PM Plans (preventive maintenance scheduling)
 * - Stock Transactions (inventory movements)
 * - User Management (profiles and permissions)
 * 
 * All functions handle data transformation, legacy field mapping, and error handling.
 * Auto-translation is triggered for Thai text when saving records.
 * 
 * @module firebaseService
 */

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
import { Machine, Part, MaintenanceRecord, SparePart, StockTransaction, MaintenanceSchedule, PMPlan, UserProfile, PendingUser, UserRole, AdminStats, PerformanceEvaluation } from "../types";
import { translateToEnglish } from "./translationService";
import { compressImage } from "./imageCompression";

// Collection names
const COLLECTIONS = {
    MACHINES: "machines",
    PARTS: "parts",
    MAINTENANCE_RECORDS: "maintenance_records",
    SCHEDULES: "schedules",
    PM_PLANS: "pm_plans",
    DATA_TRANSLATIONS: "data_translations",
    USAGE_LOGS: "usage_logs",
    PERFORMANCE_EVALUATIONS: "performance_evaluations",
};

// ==================== IMAGE UPLOAD ====================

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
    } catch (error: any) {
        // Silently suppress permission denied errors (user may not be logged in or have permissions)
        const errorCode = error?.code?.toLowerCase() || '';
        const errorMessage = error?.message?.toLowerCase() || '';
        if (!errorCode.includes('permission') && !errorMessage.includes('permission')) {
            console.error("Error syncing translation:", error);
        }
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

/**
 * Fetches all machines from the database.
 * 
 * This function performs a two-step process:
 * 1. Fetches explicit machine records from the machines collection
 * 2. Discovers legacy/inferred machines from parts data (for backward compatibility)
 * 
 * Machines are merged and deduplicated by name, with explicit records taking precedence.
 * 
 * @returns Array of Machine objects sorted by name
 */
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
                Location: data.Location || data.zone || "No Zone",
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
            const zone = part.Location || part.zone || "No Zone";
            const location = part.location || "";

            if (machineName) {
                if (!machinesMap.has(machineName)) {
                    // Create new inferred machine
                    machinesMap.set(machineName, {
                        id: machineName,
                        name: machineName,
                        description: "",
                        Location: zone,
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
                    // Enrich existing machine if it lacks image/Location/location
                    const existing = machinesMap.get(machineName)!;
                    if (!existing.imageUrl && part.imageUrl) existing.imageUrl = part.imageUrl;
                    if (existing.Location === "No Zone" && zone && zone !== "No Zone") existing.Location = zone;
                    if (!existing.location && location) existing.location = location;
                }
            }
        });
    }

    // Sort by name
    return Array.from(machinesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Updates or creates a machine record with a new image.
 * 
 * If machineId is provided, updates the existing machine.
 * Otherwise, searches for a machine by name or creates a new record.
 * 
 * @param machineName - Name of the machine
 * @param file - Image file to upload (will be compressed)
 * @param machineId - Optional machine ID for direct update
 * @returns Download URL of the uploaded image
 */
export async function updateMachineImage(machineName: string, file: File, machineId?: string): Promise<string> {
    try {
        // 1. Compress Image
        const compressedFile = await compressImage(file);

        // 2. Upload new image
        const fileName = `machines/${Date.now()}_${compressedFile.name}`;
        const sRef = storageRef(storage, fileName);
        await uploadBytes(sRef, compressedFile);
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
                Location: "Unknown"
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

/**
 * Updates a machine record and performs cascading updates if the name changes.
 * 
 * When a machine name is changed, this function updates all related records:
 * - Parts (via machineId lookup)
 * - Maintenance Records (via machineId lookup)
 * - Schedules (via machineId lookup)
 * 
 * Note: Legacy parts without machineId may not be updated automatically.
 * 
 * @param id - Machine ID
 * @param data - Partial machine data to update
 */
export async function updateMachine(id: string, data: Partial<Machine>): Promise<void> {
    const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);

    // Fetch existing data to check if name changed
    const snapshot = await get(machineRef);
    const existingData = snapshot.exists() ? snapshot.val() : {};
    const oldName = existingData.name;

    await update(machineRef, {
        ...data,
        updatedAt: new Date().toISOString(),
    });

    // Fan-out update if name changed
    if (data.name && oldName && data.name !== oldName) {
        // 1. Update Parts
        const partsRef = ref(database, COLLECTIONS.PARTS);
        const partsSnapshot = await get(query(partsRef, orderByChild("machineId"), equalTo(id)));
        /* 
           Note: If parts don't have machineId (legacy), we might miss them. 
           We could also search by machineName, but that's expensive.
           For now, we rely on the fact that modern parts should have machineId.
           If we really need to support legacy parts, we'd fetch ALL parts and filter in memory.
        */
        if (partsSnapshot.exists()) {
            const updates: Record<string, any> = {};
            partsSnapshot.forEach((child) => {
                updates[`${child.key}/machineName`] = data.name;
                updates[`${child.key}/machine`] = data.name; // Legacy support
            });
            await update(partsRef, updates);
        }

        // 2. Update Maintenance Records
        const recordsRef = ref(database, COLLECTIONS.MAINTENANCE_RECORDS);
        const recordsSnapshot = await get(query(recordsRef, orderByChild("machineId"), equalTo(id)));
        if (recordsSnapshot.exists()) {
            const updates: Record<string, any> = {};
            recordsSnapshot.forEach((child) => {
                updates[`${child.key}/machineName`] = data.name;
            });
            await update(recordsRef, updates);
        }

        // 3. Update Schedules
        const schedulesRef = ref(database, COLLECTIONS.SCHEDULES);
        const schedulesSnapshot = await get(query(schedulesRef, orderByChild("machineId"), equalTo(id)));
        if (schedulesSnapshot.exists()) {
            const updates: Record<string, any> = {};
            schedulesSnapshot.forEach((child) => {
                updates[`${child.key}/machineName`] = data.name;
            });
            await update(schedulesRef, updates);
        }
    }

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
            Location: data.Location || data.zone || "",
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        });
    });

    // Sort by updatedAt desc (latest first)
    return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Fetches all parts for a specific machine.
 * 
 * This is a fallback function that fetches all parts and filters client-side.
 * For better performance with large datasets, consider adding an index on machineId
 * and using Firebase queries instead.
 * 
 * @param machineId - Machine ID to filter parts by
 * @returns Array of Part objects for the specified machine
 */
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

export async function addMaintenanceRecord(record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
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

    if (data.description) syncTranslation(data.description);
    if (data.technician) syncTranslation(data.technician);
    if (data.machineName) syncTranslation(data.machineName);
    if (data.changeReason) syncTranslation(data.changeReason);
    if (data.partCondition) syncTranslation(data.partCondition);
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
    const compressedFile = await compressImage(file);
    const fileName = `evidence/pm_${Date.now()}_${compressedFile.name}`;
    const sRef = storageRef(storage, fileName);
    await uploadBytes(sRef, compressedFile);
    return await getDownloadURL(sRef);
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
        // 0. Compress Image First
        const compressedFile = await compressImage(file);

        // 1. Calculate Hash (of compressed file)
        const hash = await calculateFileHash(compressedFile);

        // 2. Check for Duplicate
        const existingRecord = await findImageByHash(hash);

        if (existingRecord) {
            console.log("Duplicate image found. Reusing URL:", existingRecord.url);
            // Increment usage count
            await incrementImageUsage(existingRecord.key, existingRecord.usageCount || 1);
            return existingRecord.url;
        }

        // 3. Upload New Image
        const fileName = `parts/${Date.now()}_${compressedFile.name}`;
        const sRef = storageRef(storage, fileName);

        await uploadBytes(sRef, compressedFile);
        const downloadUrl = await getDownloadURL(sRef);

        // 4. Save Hash Record
        await saveImageHashRecord(compressedFile, hash, downloadUrl);

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
    if (part.model) syncTranslation(part.model);

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
    if (data.location) syncTranslation(data.location || "");
    if (data.notes) syncTranslation(data.notes || "");
    if (data.model) syncTranslation(data.model);
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
        const compressedFile = await compressImage(evidenceImageFile);
        const fileName = `evidence/${Date.now()}_${compressedFile.name}`;
        const sRef = storageRef(storage, fileName);
        await uploadBytes(sRef, compressedFile);
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

// Auto-register user (when approval is not required)
export async function autoRegisterUser(
    uid: string,
    email: string,
    displayName: string,
    photoURL?: string,
    role: UserRole = "viewer"
): Promise<void> {
    const now = new Date().toISOString();
    const userRef = ref(database, `${USER_COLLECTIONS.USERS}/${uid}`);

    await set(userRef, {
        uid,
        email,
        displayName,
        nickname: "",
        role,
        department: "General",
        isApproved: true,
        isActive: true,
        photoURL: photoURL || "",
        createdAt: now,
        updatedAt: now,
    });
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
    const partsRef = ref(database, COLLECTIONS.PARTS); // Could fetch stock transactions if available

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

        const pmStats = {
            totalCompleted: 0,
            onTime: 0,
            overdue: 0
        };

        if (pmSnap.exists()) {
            pmSnap.forEach(child => {
                const plan = child.val();
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

// ==================== AUDIT LOGS ====================

import { AuditLog, AuditActionType, SystemSettings } from "../types";

const AUDIT_LOGS_PATH = "audit_logs";
const SYSTEM_SETTINGS_PATH = "system_settings";

/**
 * Logs an action to the audit log
 */
export async function logAuditEvent(
    action: AuditActionType,
    userId: string,
    userName: string,
    userRole: string,
    targetId?: string,
    targetName?: string,
    details?: string
): Promise<void> {
    try {
        const logRef = push(ref(database, AUDIT_LOGS_PATH));

        // Build log data, filtering out undefined values (Firebase doesn't accept undefined)
        const logData: Record<string, any> = {
            action,
            userId,
            userName,
            userRole,
            timestamp: new Date().toISOString(),
            id: logRef.key
        };

        // Only add optional fields if they have values
        if (targetId) logData.targetId = targetId;
        if (targetName) logData.targetName = targetName;
        if (details) logData.details = details;
        if (typeof window !== 'undefined') {
            logData.userAgent = window.navigator.userAgent;
        }

        await set(logRef, logData);
    } catch (error) {
        console.error("Error logging audit event:", error);
        // Don't throw - audit logging should not break main flow
    }
}

/**
 * Retrieves audit logs with optional filters
 */
export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    try {
        const logsRef = ref(database, AUDIT_LOGS_PATH);
        const snapshot = await get(logsRef);

        if (!snapshot.exists()) return [];

        const logs: AuditLog[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            logs.push({
                ...data,
                id: child.key || data.id,
                timestamp: new Date(data.timestamp)
            });
        });

        // Sort by timestamp descending (newest first) and limit
        return logs
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return [];
    }
}

/**
 * Gets system settings
 */
export async function getSystemSettings(): Promise<SystemSettings | null> {
    try {
        const settingsRef = ref(database, SYSTEM_SETTINGS_PATH);
        const snapshot = await get(settingsRef);

        if (!snapshot.exists()) {
            // Return default settings
            return {
                maintenanceMode: false,
                allowNewRegistrations: true,
                requireApproval: true,
                dataRetentionDays: 365,
                notificationsEnabled: true
            };
        }

        return snapshot.val() as SystemSettings;
    } catch (error) {
        console.error("Error fetching system settings:", error);
        return null;
    }
}

/**
 * Updates system settings
 */
export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
        const settingsRef = ref(database, SYSTEM_SETTINGS_PATH);
        await update(settingsRef, settings);
    } catch (error) {
        console.error("Error updating system settings:", error);
        throw error;
    }
}

/**
 * Exports data as JSON for backup
 */
export async function exportDataForBackup(): Promise<{
    machines: any[];
    parts: any[];
    maintenanceRecords: any[];
    pmPlans: any[];
    exportDate: string;
}> {
    try {
        const [machines, parts, records, plans] = await Promise.all([
            getMachines(),
            getParts(),
            getMaintenanceRecords(),
            getPMPlans()
        ]);

        return {
            machines,
            parts,
            maintenanceRecords: records,
            pmPlans: plans,
            exportDate: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error exporting data:", error);
        throw error;
    }
}
