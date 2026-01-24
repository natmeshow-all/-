import {
    ref,
    get,
    set,
    push,
    remove,
    query,
    orderByChild,
    startAt,
    endAt,
    limitToLast,
    update
} from "firebase/database";
import { database } from "../lib/firebase";
import { AuditLog, AuditActionType, SystemSettings, UserRole, SystemErrorLog } from "../types";

const AUDIT_LOGS_PATH = "audit_logs";
const SYSTEM_ERRORS_PATH = "system_errors";
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
        if (!userId) {
            console.warn("Attempted to log audit event without userId");
            return;
        }

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
export async function getAuditLogs(
    limit: number = 100,
    startDate?: Date,
    endDate?: Date
): Promise<AuditLog[]> {
    try {
        const logsRef = ref(database, AUDIT_LOGS_PATH);
        let logsQuery;

        if (startDate && endDate) {
            // Adjust endDate to include the full day
            const adjustedEndDate = new Date(endDate);
            adjustedEndDate.setHours(23, 59, 59, 999);

            logsQuery = query(
                logsRef,
                orderByChild("timestamp"),
                startAt(startDate.toISOString()),
                endAt(adjustedEndDate.toISOString())
            );
            // Note: We might want to apply limit here too, but if user filters by date, 
            // they probably want all logs in that range. 
            // Let's keep it safe with a larger limit if needed, or just let it return all (within reason).
            // But to prevent crash, let's limit to 500 if date range is wide.
            // Actually, let's respect the limit but make it optional logic-wise.
            // If user provides dates, maybe they expect ALL logs? 
            // Let's use limitToLast(limit) combined with dates to get "newest in range".
        } else {
            logsQuery = query(
                logsRef,
                orderByChild("timestamp"),
                limitToLast(limit)
            );
        }

        const snapshot = await get(logsQuery);

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

        // Sort by timestamp descending (newest first)
        // If we used limitToLast, they come out ascending, so we need to reverse.
        // But we are doing manual sort below anyway.
        return logs
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit); // Apply limit client-side as well just in case
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
    }
}

/**
 * Logs a system error
 */
export async function logSystemError(
    error: Error,
    componentStack?: string,
    user?: { uid: string; displayName: string } | null
): Promise<void> {
    try {
        const errorRef = push(ref(database, SYSTEM_ERRORS_PATH));
        
        const errorData: any = {
            id: errorRef.key,
            message: error.message || "Unknown Error",
            stack: error.stack,
            url: typeof window !== 'undefined' ? window.location.href : 'server',
            timestamp: new Date().toISOString(),
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        };

        if (componentStack) {
            errorData.componentStack = componentStack;
        }

        if (user) {
            errorData.userId = user.uid;
            errorData.userName = user.displayName;
        }

        await set(errorRef, errorData);
    } catch (err) {
        console.error("Failed to log system error to Firebase:", err);
    }
}

/**
 * Retrieves system errors
 */
export async function getSystemErrors(limit: number = 50): Promise<SystemErrorLog[]> {
    try {
        const errorsRef = ref(database, SYSTEM_ERRORS_PATH);
        const snapshot = await get(errorsRef);

        if (!snapshot.exists()) return [];

        const errors: SystemErrorLog[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            errors.push({
                ...data,
                id: child.key || data.id,
                timestamp: new Date(data.timestamp)
            });
        });

        // Sort by timestamp descending
        return errors
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    } catch (error) {
        console.error("Error fetching system errors:", error);
        return [];
    }
}

/**
 * Clears all system errors
 */
export async function clearSystemErrors(): Promise<void> {
    try {
        const errorsRef = ref(database, SYSTEM_ERRORS_PATH);
        await remove(errorsRef);
    } catch (error) {
        console.error("Error clearing system errors:", error);
        throw error;
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
 * Get database statistics (counts of records in major collections)
 * Note: This fetches all keys which might be expensive for very large datasets.
 */
export async function getDatabaseStats(): Promise<Record<string, number>> {
    try {
        // We will fetch shallow if possible, but JS SDK doesn't support shallow=true easily on 'get'.
        // However, we can use limitToLast(1) to check existence, but for count we need iteration or separate counters.
        // For this implementation, we will fetch top-level nodes for users, machines, parts.
        // Be careful with large collections.
        
        const collections = [
            "users",
            "machines",
            "parts",
            "maintenance_records",
            "pm_plans"
        ];
        
        const stats: Record<string, number> = {};
        
        // Use Promise.allSettled to prevent one failure from breaking all
        const results = await Promise.allSettled(collections.map(async (col) => {
            const colRef = ref(database, col);
            // Optimization: Fetch shallow=true via REST would be better, but SDK doesn't support it.
            // For these collections, we assume they are manageable (<10k).
            const snapshot = await get(colRef);
            return { col, count: snapshot.exists() ? snapshot.size : 0 };
        }));

        results.forEach(result => {
            if (result.status === 'fulfilled') {
                stats[result.value.col] = result.value.count;
            }
        });
        
        return stats;
    } catch (error) {
        console.error("Error fetching database stats:", error);
        return {};
    }
}

/**
 * Export all data for backup
 */
export async function exportDataForBackup(): Promise<any> {
    try {
        const rootRef = ref(database, "/");
        const snapshot = await get(rootRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Error exporting data for backup:", error);
        throw error;
    }
}
