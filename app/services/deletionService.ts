import { ref, get, update, remove } from 'firebase/database';
import { database as db } from '../lib/firebase';
import { Machine, Part, PMPlan, MaintenanceRecord } from '../types';

export interface DeletionRequest {
    id: string;
    collection: 'machines' | 'spare_parts' | 'pm_plans' | 'maintenance_records';
    data: any;
    deleteReason: string;
    deletedBy: string;
    deletedAt: string;
}

export async function requestDeletion(
    collection: 'machines' | 'spare_parts' | 'pm_plans' | 'maintenance_records',
    id: string,
    reason: string,
    uid: string
): Promise<void> {
    const itemRef = ref(db, `${collection}/${id}`);
    await update(itemRef, {
        deleteRequested: true,
        deleteReason: reason,
        deletedBy: uid,
        deletedAt: new Date().toISOString()
    });
}

export async function getDeletionRequests(): Promise<DeletionRequest[]> {
    const collections: Array<'machines' | 'spare_parts' | 'pm_plans' | 'maintenance_records'> = [
        'machines', 'spare_parts', 'pm_plans', 'maintenance_records'
    ];
    
    let requests: DeletionRequest[] = [];

    for (const coll of collections) {
        const collRef = ref(db, coll);
        const snapshot = await get(collRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const key in data) {
                if (data[key].deleteRequested === true) {
                    requests.push({
                        id: key,
                        collection: coll,
                        data: { ...data[key], id: key },
                        deleteReason: data[key].deleteReason || 'No reason provided',
                        deletedBy: data[key].deletedBy || 'Unknown',
                        deletedAt: data[key].deletedAt || new Date().toISOString()
                    });
                }
            }
        }
    }

    return requests.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export async function approveDeletion(collection: string, id: string): Promise<void> {
    const itemRef = ref(db, `${collection}/${id}`);
    await remove(itemRef);
}

export async function rejectDeletion(collection: string, id: string): Promise<void> {
    const itemRef = ref(db, `${collection}/${id}`);
    await update(itemRef, {
        deleteRequested: null,
        deleteReason: null,
        deletedBy: null,
        deletedAt: null
    });
}
