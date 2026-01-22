import {
    ref,
    get,
    set,
    push,
    remove
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
        await set(settingsRef, settings);
    } catch (error) {
        console.error("Error updating system settings:", error);
        throw error;
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
