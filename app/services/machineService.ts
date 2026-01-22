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
    startAfter,
    limitToFirst
} from "firebase/database";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";
import { database, storage } from "../lib/firebase";
import { Machine } from "../types";
import { syncTranslation } from "./translationService";
import { compressImage } from "../lib/imageCompression";
import { COLLECTIONS } from "./constants";

// Helper to map machine data
export function mapMachineData(key: string, data: any): Machine {
    const machineName = data.name || key;
    return {
        id: key,
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
    };
}

/**
 * Fetches all machines from the database.
 */
export async function getMachines(): Promise<Machine[]> {
    try {
        const machinesMap = new Map<string, Machine>();

        // 1. Fetch explicit machine data first
        const machinesRef = ref(database, COLLECTIONS.MACHINES);
        // Use server-side sorting by name
        const machinesQuery = query(machinesRef, orderByChild("name"));
        const machinesSnapshot = await get(machinesQuery);

        if (machinesSnapshot.exists()) {
            machinesSnapshot.forEach((child) => {
                const data = child.val();
                const machine = mapMachineData(child.key!, data);
                machinesMap.set(machine.name, machine);
            });
        }

        // Return values (already sorted by Firebase, but Map iteration order is insertion order usually, so it should be fine)
        // Re-sort to be safe as Map iteration order is insertion order
        return Array.from(machinesMap.values());
    } catch (error) {
        console.error("Error in getMachines:", error);
        throw error;
    }
}

/**
 * Fetches machines with pagination.
 */
export async function getMachinesPaginated(
    limit: number = 20,
    lastName?: string,
    lastId?: string
): Promise<{ machines: Machine[], lastItem: { name: string, id: string } | null }> {
    try {
        const machinesRef = ref(database, COLLECTIONS.MACHINES);
        let machinesQuery;

        if (lastName && lastId) {
            machinesQuery = query(
                machinesRef,
                orderByChild("name"),
                startAfter(lastName, lastId),
                limitToFirst(limit)
            );
        } else {
            machinesQuery = query(
                machinesRef,
                orderByChild("name"),
                limitToFirst(limit)
            );
        }

        const snapshot = await get(machinesQuery);
        if (!snapshot.exists()) return { machines: [], lastItem: null };

        const machines: Machine[] = [];
        let newLastItem = null;

        snapshot.forEach((childSnapshot) => {
            const machine = mapMachineData(childSnapshot.key!, childSnapshot.val());
            machines.push(machine);
            newLastItem = { name: machine.name, id: machine.id };
        });

        return { machines, lastItem: newLastItem };
    } catch (error) {
        console.error("Error fetching paginated machines:", error);
        throw error;
    }
}

/**
 * Updates or creates a machine record with a new image.
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
    try {
        const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);
        const snapshot = await get(machineRef);

        if (!snapshot.exists()) return null;

        return mapMachineData(snapshot.key!, snapshot.val());
    } catch (error) {
        console.error(`Error fetching machine ${id}:`, error);
        throw error;
    }
}

export async function addMachine(machine: Omit<Machine, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
        // Input validation
        if (!machine.name || machine.name.trim().length === 0) {
            throw new Error("Machine name is required");
        }
        if (machine.name.length > 100) {
            throw new Error("Machine name is too long (max 100 chars)");
        }

        const machinesRef = ref(database, COLLECTIONS.MACHINES);
        const newMachineRef = push(machinesRef);

        // Clean undefined values
        const cleanMachine = Object.fromEntries(
            Object.entries(machine).filter(([_, v]) => v !== undefined)
        );

        await set(newMachineRef, {
            ...cleanMachine,
            name: machine.name.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Auto-translate relevant fields
        if (machine.name) syncTranslation(machine.name);
        if (machine.brand) syncTranslation(machine.brand);
        if (machine.model) syncTranslation(machine.model);
        if (machine.description) syncTranslation(machine.description);

        return newMachineRef.key!;
    } catch (error) {
        console.error("Error adding machine:", error);
        throw error;
    }
}

/**
 * Updates a machine record and performs cascading updates if the name changes.
 */
export async function updateMachine(id: string, data: Partial<Machine>): Promise<void> {
    try {
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
    } catch (error) {
        console.error(`Error updating machine ${id}:`, error);
        throw error;
    }
}

export async function deleteMachine(id: string): Promise<void> {
    try {
        const machineRef = ref(database, `${COLLECTIONS.MACHINES}/${id}`);
        await remove(machineRef);
    } catch (error) {
        console.error(`Error deleting machine ${id}:`, error);
        throw error;
    }
}
