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
    limitToLast,
    startAt,
    startAfter,
    endAt
} from "firebase/database";
import { database } from "../lib/firebase";
import { Part, SparePart, StockTransaction } from "../types";
import { syncTranslation } from "./translationService";
import { COLLECTIONS } from "./constants";
import { incrementDashboardStat } from "./analyticsService";

// ==================== HELPERS ====================

// Helper to remove undefined keys which Firebase doesn't like
const cleanObject = (obj: any) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach(key => newObj[key] === undefined && delete newObj[key]);
    return newObj;
};

// Helper to map legacy/varied part data to Part interface
function mapPartData(key: string, data: any): Part {
    const quantity = data.quantity !== undefined ? data.quantity : (data.qty !== undefined ? data.qty : 0);
    const modelSpec = data.modelSpec || data.model || "";
    const machineName = data.machineName || data.machine || "";
    const partName = data.partName || data.name || "Unknown Part";

    return {
        id: key,
        ...data,
        partName,
        name: partName, // Alias
        quantity,
        modelSpec,
        model: modelSpec, // Alias
        machineName,
        Location: data.Location || data.zone || "",
        unit: data.unit || "pcs",
        supplier: data.supplier || "",
        pricePerUnit: data.pricePerUnit,
        description: data.description || "",
        notes: data.notes || "",
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
        parentId: data.parentId,
        hasSubParts: data.hasSubParts,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
}

// ==================== PARTS ====================

export async function getParts(limit?: number): Promise<Part[]> {
    try {
        const partsRef = ref(database, COLLECTIONS.PARTS);
        let partsQuery;

        if (limit) {
            partsQuery = query(partsRef, orderByChild("updatedAt"), limitToLast(limit));
        } else {
            partsQuery = partsRef;
        }

        const snapshot = await get(partsQuery);

        if (!snapshot.exists()) return [];

        const parts: Part[] = [];
        snapshot.forEach((childSnapshot) => {
            parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
        });

        // Sort by updatedAt desc (latest first)
        return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
        console.error("Error fetching parts:", error);
        throw error;
    }
}

/**
 * Fetches parts with pagination (sorted by updatedAt descending).
 */
export async function getPartsPaginated(
    limit: number = 20,
    lastDate?: string,
    lastId?: string
): Promise<{ parts: Part[], lastItem: { updatedAt: string, id: string } | null }> {
    try {
        const partsRef = ref(database, COLLECTIONS.PARTS);
        let partsQuery;

        if (lastDate && lastId) {
            // Fetch next page (older items)
            partsQuery = query(
                partsRef,
                orderByChild("updatedAt"),
                endAt(lastDate, lastId),
                limitToLast(limit + 1)
            );
        } else {
            // First page (newest items)
            partsQuery = query(
                partsRef,
                orderByChild("updatedAt"),
                limitToLast(limit)
            );
        }

        const snapshot = await get(partsQuery);
        if (!snapshot.exists()) return { parts: [], lastItem: null };

        const parts: Part[] = [];
        snapshot.forEach((childSnapshot) => {
            parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
        });

        // Firebase returns ascending (oldest -> newest)
        // We want newest -> oldest
        parts.reverse();

        // Handle cursor overlap
        if (lastDate && lastId) {
            const cursorIndex = parts.findIndex(p => p.id === lastId);
            if (cursorIndex !== -1) {
                parts.splice(cursorIndex, 1);
            }
        }

        let newLastItem = null;
        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            newLastItem = {
                updatedAt: lastPart.updatedAt.toISOString(),
                id: lastPart.id
            };
        }

        return { parts, lastItem: newLastItem };
    } catch (error) {
        console.error("Error fetching paginated parts:", error);
        throw error;
    }
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
// Optimized to use server-side filtering if index exists
export async function getPartsByMachineName(machineName: string): Promise<Part[]> {
    try {
        const partsRef = ref(database, COLLECTIONS.PARTS);

        // Attempt server-side filtering using the new index
        try {
            const partsQuery = query(partsRef, orderByChild("machineName"), equalTo(machineName));
            const snapshot = await get(partsQuery);

            if (snapshot.exists()) {
                const parts: Part[] = [];
                snapshot.forEach((childSnapshot) => {
                    parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
                });
                return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            }

            // If no exact match on machineName, check legacy field 'machine' or fallback to client-side
            // But strict machineName match is preferred.
            // If snapshot is empty, it might mean no parts found OR index missing (if rules not deployed).
            // But with index, it just returns empty.

            // To be safe against "index not built yet" or mixed data, we might want to fallback if 0 results?
            // No, if query works, it returns results or empty.

            // However, we also need to check the legacy 'machine' field.
            // Since we can only query one field, let's try 'machine' field query if machineName returned nothing?
            // Or just rely on client-side fallback if we really suspect legacy data.

            if (snapshot.exists()) return []; // Found nothing with machineName

        } catch (queryError) {
            console.warn("Server-side query failed (likely index missing), falling back to client-side:", queryError);
        }

        // Fallback to client-side filtering (Legacy behavior)
        const allParts = await getParts();
        return allParts.filter(p =>
            p.machineName?.toLowerCase() === machineName.toLowerCase() ||
            (p as any).machine?.toLowerCase() === machineName.toLowerCase()
        );
    } catch (error) {
        console.error("Error fetching parts by machine name:", error);
        throw error;
    }
}

export async function getPartsByLocation(location: string): Promise<Part[]> {
    try {
        const partsRef = ref(database, COLLECTIONS.PARTS);
        // Use server-side filtering with the Location index
        const partsQuery = query(partsRef, orderByChild("Location"), equalTo(location));
        const snapshot = await get(partsQuery);

        if (!snapshot.exists()) return [];

        const parts: Part[] = [];
        snapshot.forEach((childSnapshot) => {
            parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
        });

        return parts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
        console.error("Error fetching parts by location:", error);
        throw error;
    }
}

export async function addPart(
    part: Omit<Part, "id" | "createdAt" | "updatedAt">
): Promise<string> {
    try {
        const safePartData = cleanObject(part);

        // Input validation
        if (!safePartData.partName || safePartData.partName.trim().length === 0) {
            throw new Error("Part name is required");
        }
        if (safePartData.partName.length > 200) {
            throw new Error("Part name is too long (max 200 chars)");
        }
        if (safePartData.quantity !== undefined && safePartData.quantity < 0) {
            throw new Error("Quantity cannot be negative");
        }

        const partsRef = ref(database, COLLECTIONS.PARTS);
        const newPartRef = push(partsRef);

        await set(newPartRef, {
            ...safePartData,
            name: safePartData.partName, // Ensure 'name' field exists for sorting/indexing
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        // Update stats
        incrementDashboardStat("totalParts", 1);
        incrementDashboardStat("totalSpareParts", 1);

        // Auto-translate relevant fields
        syncTranslation(safePartData.partName);
        if (safePartData.modelSpec) syncTranslation(safePartData.modelSpec);
        if (safePartData.brand) syncTranslation(safePartData.brand);
        if (safePartData.location) syncTranslation(safePartData.location);

        return newPartRef.key!;
    } catch (error) {
        console.error("Error adding part:", error);
        throw error;
    }
}

export async function updatePart(
    id: string,
    data: Partial<Part>
): Promise<void> {
    try {
        const partRef = ref(database, `${COLLECTIONS.PARTS}/${id}`);

        const updateData: any = {
            ...data,
            updatedAt: new Date().toISOString(),
        };

        if (data.partName) {
            updateData.name = data.partName; // Ensure name stays in sync
        }

        await update(partRef, updateData);

        // Auto-translate updated fields
        if (data.partName) syncTranslation(data.partName);
        if (data.modelSpec) syncTranslation(data.modelSpec);
        if (data.brand) syncTranslation(data.brand);
        if (data.location) syncTranslation(data.location);
        if (data.notes) syncTranslation(data.notes);
    } catch (error) {
        console.error(`Error updating part ${id}:`, error);
        throw error;
    }
}

export async function deletePart(id: string): Promise<void> {
    try {
        const partRef = ref(database, `${COLLECTIONS.PARTS}/${id}`);
        await remove(partRef);

        // Update stats
        incrementDashboardStat("totalParts", -1);
        incrementDashboardStat("totalSpareParts", -1);
    } catch (error) {
        console.error(`Error deleting part ${id}:`, error);
        throw error;
    }
}

export const deleteSparePart = deletePart;

// ==================== SPARE PARTS (CONSUMABLES) ====================

export async function getSparePartsPaginated(limit: number = 20, lastName?: string, lastId?: string): Promise<{ parts: SparePart[], lastItem: { name: string, id: string } | null }> {
    try {
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
    } catch (error) {
        console.error("Error fetching paginated spare parts:", error);
        throw error;
    }
}

export async function searchSpareParts(queryText: string): Promise<Part[]> {
    try {
        if (!queryText) return [];

        const partsRef = ref(database, COLLECTIONS.PARTS);
        const partsQuery = query(partsRef, orderByChild("name"), startAt(queryText), endAt(queryText + "\uf8ff"));
        const snapshot = await get(partsQuery);

        if (!snapshot.exists()) return [];

        const parts: Part[] = [];
        snapshot.forEach((childSnapshot) => {
            parts.push(mapPartData(childSnapshot.key!, childSnapshot.val()));
        });

        return parts;
    } catch (error) {
        console.error("Error searching parts:", error);
        throw error;
    }
}

export async function getSpareParts(): Promise<SparePart[]> {
    try {
        const partsRef = ref(database, COLLECTIONS.PARTS);
        const snapshot = await get(partsRef);

        if (!snapshot.exists()) return [];

        const parts: SparePart[] = [];
        snapshot.forEach((childSnapshot) => {
            parts.push(mapSparePartData(childSnapshot.key!, childSnapshot.val()));
        });

        return parts.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching spare parts:", error);
        throw error;
    }
}

export async function addSparePart(
    part: Omit<SparePart, "id" | "createdAt" | "updatedAt">
): Promise<string> {
    try {
        if (!part.name) throw new Error("Spare part name is required");

        const partsRef = ref(database, COLLECTIONS.PARTS);
        const newPartRef = push(partsRef);

        await set(newPartRef, cleanObject({
            ...part,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        // Update stats
        incrementDashboardStat("totalParts", 1);
        incrementDashboardStat("totalSpareParts", 1);

        // Auto-translate relevant fields
        syncTranslation(part.name);
        if (part.description) syncTranslation(part.description);
        if (part.brand) syncTranslation(part.brand);
        if (part.location) syncTranslation(part.location);
        if (part.model) syncTranslation(part.model);

        return newPartRef.key!;
    } catch (error) {
        console.error("Error adding spare part:", error);
        throw error;
    }
}

export async function updateSparePart(
    id: string,
    data: Partial<SparePart>
): Promise<void> {
    try {
        if (!id) throw new Error("Spare part ID is required for update");

        const partRef = ref(database, `${COLLECTIONS.PARTS}/${id}`);
        const updateData: any = {
            ...data,
            updatedAt: new Date().toISOString(),
        };

        await update(partRef, cleanObject(updateData));

        // Auto-translate updated fields
        if (data.name) syncTranslation(data.name);
        if (data.description) syncTranslation(data.description);
        if (data.brand) syncTranslation(data.brand);
        if (data.location) syncTranslation(data.location || "");
        if (data.notes) syncTranslation(data.notes || "");
        if (data.model) syncTranslation(data.model);
    } catch (error) {
        console.error(`Error updating spare part ${id}:`, error);
        throw error;
    }
}

// ==================== STOCK TRANSACTIONS ====================

export async function adjustStock(
    transaction: Omit<StockTransaction, "id">
): Promise<void> {
    try {
        if (!transaction.partId) throw new Error("Part ID is required for stock adjustment");
        if (!transaction.type) throw new Error("Transaction type is required");
        if (transaction.quantity === undefined || transaction.quantity === null) throw new Error("Quantity is required");

        // 2. Record Transaction
        const txnRef = ref(database, "stock_transactions");
        const newTxnRef = push(txnRef);

        await set(newTxnRef, cleanObject({
            ...transaction,
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
    } catch (error) {
        console.error("Error adjusting stock:", error);
        throw error;
    }
}

export async function getStockTransactions(partId?: string): Promise<StockTransaction[]> {
    try {
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
    } catch (error) {
        console.error("Error fetching stock transactions:", error);
        throw error;
    }
}

export async function getStockTransactionsPaginated(
    limit: number = 20,
    lastDate?: string,
    lastId?: string
): Promise<{ transactions: StockTransaction[], lastItem: { date: string, id: string } | null }> {
    try {
        const txnRef = ref(database, "stock_transactions");
        let q;

        if (lastDate && lastId) {
            q = query(
                txnRef,
                orderByChild("performedAt"),
                endAt(lastDate, lastId),
                limitToLast(limit + 1)
            );
        } else {
            q = query(
                txnRef,
                orderByChild("performedAt"),
                limitToLast(limit)
            );
        }

        const snapshot = await get(q);
        if (!snapshot.exists()) return { transactions: [], lastItem: null };

        const transactions: StockTransaction[] = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            transactions.push({
                id: childSnapshot.key!,
                ...data,
                performedAt: new Date(data.performedAt),
            });
        });

        // Sort descending (Newest first) as Firebase returns ascending
        transactions.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

        // Handle cursor overlap
        if (lastDate && lastId) {
            const cursorIndex = transactions.findIndex(t => t.id === lastId);
            if (cursorIndex !== -1) {
                transactions.splice(cursorIndex, 1);
            }
        }

        let newLastItem = null;
        if (transactions.length > 0) {
            const lastTxn = transactions[transactions.length - 1];
            newLastItem = {
                date: lastTxn.performedAt.toISOString(),
                id: lastTxn.id
            };
        }

        return { transactions, lastItem: newLastItem };
    } catch (error) {
        console.error("Error fetching paginated stock transactions:", error);
        throw error;
    }
}
