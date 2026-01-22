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
    limitToFirst,
    startAfter,
    startAt,
    endAt
} from "firebase/database";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { database, storage } from "../lib/firebase";
import { Part, SparePart, StockTransaction } from "../types";
import { syncTranslation } from "./translationService";
import { compressImage } from "../lib/imageCompression";
import { COLLECTIONS } from "./constants";

// ==================== HELPERS ====================

// Helper to remove undefined keys which Firebase doesn't like
const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => newObj[key] === undefined && delete newObj[key]);
    return newObj;
};

// Helper to map legacy/varied part data to Part interface
function mapPartData(key: string, data: any): Part {
    const imageUrl = data.image || data.image_url || data.imageUrl || "";
    const quantity = data.quantity !== undefined ? data.quantity : (data.qty !== undefined ? data.qty : 0);
    const modelSpec = data.modelSpec || data.model || "";
    const machineName = data.machineName || data.machine || "";
    const partName = data.partName || data.name || "Unknown Part";

    return {
        id: key,
        ...data,
        partName,
        imageUrl,
        quantity,
        modelSpec,
        machineName,
        Location: data.Location || data.zone || "",
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
}

function mapSparePartData(key: string, data: any): SparePart {
    return {
        id: key,
        name: data.name || data.partName || "Unknown Part",
        partName: data.partName || data.name,
        description: data.description || "",
        model: data.model || data.modelSpec || "",
        category: data.category || "other",
        brand: data.brand || "",
        notes: data.notes || "",
        quantity: typeof data.quantity === 'number' ? data.quantity : 0,
        unit: data.unit || "pcs",
        minStockThreshold: typeof data.minStockThreshold === 'number' ? data.minStockThreshold : 0,
        location: data.location || data.Location || "",
        supplier: data.supplier || "",
        pricePerUnit: data.pricePerUnit,
        imageUrl: data.imageUrl || data.image_url || "",
        parentId: data.parentId,
        hasSubParts: data.hasSubParts,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
}

// ==================== IMAGE DEDUPLICATION ====================

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

// ==================== PARTS ====================

export async function getParts(): Promise<Part[]> {
    const partsRef = ref(database, COLLECTIONS.PARTS);
    const snapshot = await get(partsRef);

    if (!snapshot.exists()) return [];

    const parts: Part[] = [];
    snapshot.forEach((childSnapshot) => {
        parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
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
        const partsQuery = query(partsRef, orderByChild("machineId"), equalTo(machineId));
        const snapshot = await get(partsQuery);

        if (!snapshot.exists()) return [];

        const parts: Part[] = [];
        snapshot.forEach((childSnapshot) => {
            parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
        });

        return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
        console.error("Error fetching parts by machine:", error);
        throw error;
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

    // Clean undefined values
    const cleanPartData = Object.fromEntries(
        Object.entries(safePartData).filter(([_, v]) => v !== undefined)
    );

    const partsRef = ref(database, COLLECTIONS.PARTS);
    const newPartRef = push(partsRef);

    await set(newPartRef, {
        ...cleanPartData,
        name: safePartData.partName || safePartData.name || "Unknown Part", // Ensure name is saved for indexing/validation
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

    if (data.partName) {
        updateData.name = data.partName; // Ensure name stays in sync
    }

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

export const deleteSparePart = deletePart;

// ==================== SPARE PARTS (CONSUMABLES) ====================

export async function getSparePartsPaginated(limit: number = 20, lastName?: string, lastId?: string): Promise<{ parts: SparePart[], lastItem: {name: string, id: string} | null }> {
    const partsRef = ref(database, COLLECTIONS.PARTS);
    let partsQuery;

    if (lastName && lastId) {
        partsQuery = query(partsRef, orderByChild("name"), startAfter(lastName, lastId), limitToFirst(limit));
    } else {
        partsQuery = query(partsRef, orderByChild("name"), limitToFirst(limit));
    }

    const snapshot = await get(partsQuery);
    if (!snapshot.exists()) return { parts: [], lastItem: null };

    const parts: SparePart[] = [];
    let newLastItem = null;

    snapshot.forEach((childSnapshot) => {
        const part = mapSparePartData(childSnapshot.key!, childSnapshot.val());
        parts.push(part);
        newLastItem = { name: part.name, id: part.id };
    });

    return { parts, lastItem: newLastItem };
}

export async function searchSpareParts(queryText: string): Promise<SparePart[]> {
    if (!queryText) return [];
    
    const partsRef = ref(database, COLLECTIONS.PARTS);
    const partsQuery = query(partsRef, orderByChild("name"), startAt(queryText), endAt(queryText + "\uf8ff"));
    const snapshot = await get(partsQuery);

    if (!snapshot.exists()) return [];

    const parts: SparePart[] = [];
    snapshot.forEach((childSnapshot) => {
        parts.push(mapSparePartData(childSnapshot.key!, childSnapshot.val()));
    });
    
    return parts;
}

export async function getSpareParts(): Promise<SparePart[]> {
    const partsRef = ref(database, COLLECTIONS.PARTS);
    const snapshot = await get(partsRef);

    if (!snapshot.exists()) return [];

    const parts: SparePart[] = [];
    snapshot.forEach((childSnapshot) => {
        parts.push(mapSparePartData(childSnapshot.key!, childSnapshot.val()));
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

    const partsRef = ref(database, COLLECTIONS.PARTS);
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

    const partRef = ref(database, `${COLLECTIONS.PARTS}/${id}`);
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
    const partRef = ref(database, `${COLLECTIONS.PARTS}/${transaction.partId}`);
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
