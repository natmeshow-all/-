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
    equalTo,
    serverTimestamp as rtdbTimestamp
} from "firebase/database";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { database, storage } from "./firebase";
import { Machine, Part, MaintenanceRecord, SparePart, StockTransaction, MaintenanceSchedule } from "../types";

// Collection names
const COLLECTIONS = {
    MACHINES: "machines",
    PARTS: "parts",
    MAINTENANCE_RECORDS: "maintenance_records",
    SCHEDULES: "schedules",
};

// ==================== MACHINES ====================

// ==================== MACHINES ====================

// ==================== MACHINES ====================

export async function getMachines(): Promise<Machine[]> {
    // 1. Fetch parts to derive machines
    const partsRef = ref(database, COLLECTIONS.PARTS);
    const partsSnapshot = await get(partsRef);

    // 2. Fetch explicit machine data (custom images, etc.)
    const machinesRef = ref(database, COLLECTIONS.MACHINES);
    const machinesSnapshot = await get(machinesRef);
    const explicitMachines = machinesSnapshot.exists() ? machinesSnapshot.val() : {};

    const machinesMap = new Map<string, Machine>();

    // Process parts to find machines
    if (partsSnapshot.exists()) {
        partsSnapshot.forEach((childSnapshot) => {
            const part = childSnapshot.val();
            const machineName = part.machineName || part.machine || "Unknown Machine";
            const zone = part.zone || "No Zone";
            const location = part.location || "";

            if (machineName) {
                // Check if we already have this machine
                if (!machinesMap.has(machineName)) {
                    // Check if we have explicit data for this machine name
                    let explicitData = null;
                    let machineId = machineName;

                    for (const [key, value] of Object.entries(explicitMachines)) {
                        const mData = value as any;
                        if (key === machineName || mData.name === machineName) {
                            explicitData = mData;
                            machineId = key;
                            break;
                        }
                    }

                    machinesMap.set(machineName, {
                        id: machineId,
                        name: machineName,
                        description: explicitData ? explicitData.description : "",
                        zone: zone,
                        location: location,
                        status: "active",
                        imageUrl: (explicitData && explicitData.imageUrl)
                            ? explicitData.imageUrl
                            : (part.imageUrl || ""),
                        serialNumber: explicitData ? explicitData.serialNumber : "",
                        installationDate: explicitData ? explicitData.installationDate : "",
                        brandModel: explicitData ? explicitData.brandModel : "",
                        operatingHours: explicitData ? explicitData.operatingHours : 0,
                        capacity: explicitData ? explicitData.capacity : "",
                        powerRating: explicitData ? explicitData.powerRating : "",
                        maintenanceCycle: explicitData ? explicitData.maintenanceCycle : 0,
                        createdAt: explicitData?.createdAt ? new Date(explicitData.createdAt) : new Date(),
                        updatedAt: explicitData?.updatedAt ? new Date(explicitData.updatedAt) : new Date(),
                    });
                } else {
                    const existing = machinesMap.get(machineName)!;

                    // Update location/zone if missing
                    if (!existing.location && location) existing.location = location;
                    if (!existing.zone && zone) existing.zone = zone;

                    // Re-check for explicit data to potentially update image if not already set by explicit
                    let isExplicit = false;
                    for (const [key, value] of Object.entries(explicitMachines)) {
                        const mData = value as any;
                        if (key === machineName || mData.name === machineName) {
                            isExplicit = true;
                            break;
                        }
                    }

                    if (!isExplicit && !existing.imageUrl && part.imageUrl) {
                        existing.imageUrl = part.imageUrl;
                    }
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

    return newMachineRef.key!;
}

export async function updateMachine(id: string, data: Partial<Machine>): Promise<void> {
    const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);

    await update(machineRef, {
        ...data,
        updatedAt: new Date().toISOString(),
    });
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

export async function getPartsByMachine(machineId: string): Promise<Part[]> {
    const partsRef = ref(database, COLLECTIONS.PARTS);
    // Note: RTDB querying is limited. If machineId is stored, we can query.
    // However, legacy data might store machine name string instead of ID.
    const q = query(partsRef, orderByChild("machineId"), equalTo(machineId));
    const snapshot = await get(q);

    if (!snapshot.exists()) return [];

    const parts: Part[] = [];
    snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        parts.push({
            id: childSnapshot.key!,
            ...data,
            imageUrl: data.image || data.image_url || data.imageUrl || "",
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
        });
    });

    return parts;
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

// ==================== STORAGE ====================

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
    const q = query(hashesRef, orderByChild("hash"), equalTo(hash));
    const snapshot = await get(q);

    if (snapshot.exists()) {
        // Return the first match
        const key = Object.keys(snapshot.val())[0];
        return { key, ...snapshot.val()[key] };
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
