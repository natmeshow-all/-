import { MaintenanceSchedule } from "../types";

export interface NotificationItem {
    id: string;
    type: "low_stock" | "upcoming_pm" | "due_today" | "info";
    titleKey: string;
    messageKey: string;
    params?: Record<string, string | number>;
    timestamp: Date;
    read: boolean;
    link?: string;
}

export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

export const sendBrowserNotification = (title: string, body: string, icon?: string) => {
    if (Notification.permission === "granted") {
        new Notification(title, {
            body,
            icon: icon || "/favicon.ico",
        });
    }
};

/**
 * Logic to check for upcoming preventive maintenance
 */
export function checkUpcomingPM(schedules: MaintenanceSchedule[]): NotificationItem[] {
    const notifications: NotificationItem[] = [];
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    schedules.forEach(schedule => {
        const nextDue = new Date(schedule.nextDue);

        // If due date is within the next 7 days
        if (nextDue <= next7Days && nextDue >= now) {
            notifications.push({
                id: `pm_${schedule.machineId}_${nextDue.getTime()}`,
                type: "upcoming_pm",
                titleKey: "notificationPmUpcomingTitle",
                messageKey: "notificationPmUpcomingMessage",
                params: {
                    machine: schedule.machineName,
                    days: Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                },
                timestamp: now,
                read: false,
                link: `/schedule?machineId=${schedule.machineId}`
            });
        }
        // If overdue
        else if (nextDue < now) {
            notifications.push({
                id: `pm_overdue_${schedule.machineId}_${nextDue.getTime()}`,
                type: "due_today", // Reusing this type for priority
                titleKey: "notificationPmOverdueTitle",
                messageKey: "notificationPmOverdueMessage",
                params: {
                    machine: schedule.machineName,
                    date: nextDue.toLocaleDateString()
                },
                timestamp: now,
                read: false,
                link: `/schedule?machineId=${schedule.machineId}`
            });
        }
    });

    return notifications;
}
