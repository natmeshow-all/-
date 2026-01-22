import {
    ref,
    get,
    set,
    push
} from "firebase/database";
import { database } from "../lib/firebase";
import { AuditLog, AuditActionType, SystemSettings, UserRole } from "../types";

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
        await set(settingsRef, settings);
    } catch (error) {
        console.error("Error updating system settings:", error);
        throw error;
    }
}
