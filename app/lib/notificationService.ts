import { PMPlan } from "../types";

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
export function checkUpcomingPM(plans: PMPlan[]): NotificationItem[] {
    const notifications: NotificationItem[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const getDiffDays = (date: string | Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    plans.forEach(plan => {
        // Skip paused plans if necessary, though requirement didn't specify. Assuming "active".
        if (plan.status !== 'active') return;

        const diffDays = getDiffDays(plan.nextDueDate);

        // 1. Today (diffDays === 0)
        if (diffDays === 0) {
            notifications.push({
                id: `pm_today_${plan.id}_${new Date().getTime()}`,
                type: "due_today",
                titleKey: "notificationPmTodayTitle",
                messageKey: "notificationPmTodayMessage",
                params: {
                    machine: plan.machineName
                },
                timestamp: new Date(),
                read: false,
                link: `/schedule?machineId=${plan.machineId}` // Or just /schedule
            });
        }
        // 2. Overdue (diffDays < 0)
        else if (diffDays < 0) {
            notifications.push({
                id: `pm_overdue_${plan.id}_${new Date().getTime()}`,
                type: "due_today", // High priority
                titleKey: "notificationPmOverdueTitle",
                messageKey: "notificationPmOverdueMessage",
                params: {
                    machine: plan.machineName,
                    date: new Date(plan.nextDueDate).toLocaleDateString(),
                    days: Math.abs(diffDays) // In case message supports {days}
                },
                timestamp: new Date(),
                read: false,
                link: `/schedule?machineId=${plan.machineId}`
            });
        }
        // 3. Upcoming within 7 days (diffDays > 0 && diffDays <= 7)
        else if (diffDays > 0 && diffDays <= 7) {
            notifications.push({
                id: `pm_upcoming_${plan.id}_${new Date().getTime()}`,
                type: "upcoming_pm",
                titleKey: "notificationPmUpcomingTitle",
                messageKey: "notificationPmUpcomingMessage",
                params: {
                    machine: plan.machineName,
                    days: diffDays
                },
                timestamp: new Date(),
                read: false,
                link: `/schedule?machineId=${plan.machineId}`
            });
        }
    });

    return notifications;
}
