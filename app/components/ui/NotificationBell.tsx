import React, { useState, useEffect, useRef } from "react";
import { BellIcon, BoxIcon, AlertTriangleIcon, CheckIcon } from "./Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { NotificationItem, requestNotificationPermission, sendBrowserNotification, checkUpcomingPM } from "../../lib/notificationService";
import { getSpareParts, getSchedules } from "../../lib/firebaseService";

export default function NotificationBell() {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initial check for notifications
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "granted") {
            setPermissionGranted(true);
        }

        const checkNotifications = async () => {
            const newNotifications: NotificationItem[] = [];

            // 1. Check Low Stock
            try {
                const parts = await getSpareParts();
                const lowStockParts = parts.filter(p => p.quantity <= p.minStockThreshold);

                lowStockParts.forEach(part => {
                    newNotifications.push({
                        id: `low_${part.id}`,
                        type: "low_stock",
                        titleKey: "statusLowStock",
                        messageKey: "notificationLowStock",
                        params: { name: part.name },
                        timestamp: new Date(),
                        read: false,
                        link: "/parts"
                    });
                });
            } catch (error) {
                console.error("Error checking stock for notifications:", error);
            }

            // 2. Check Upcoming PM
            try {
                const schedules = await getSchedules();
                const pmNotifications = checkUpcomingPM(schedules);
                newNotifications.push(...pmNotifications);
            } catch (error) {
                console.error("Error checking PM for notifications:", error);
            }

            setNotifications(newNotifications);
        };

        checkNotifications();
        // Check every 5 minutes
        const interval = setInterval(checkNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission();
        setPermissionGranted(granted);
        if (granted) {
            sendBrowserNotification(t("notificationTitle"), t("msgSaveSuccess"));
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case "low_stock": return <BoxIcon size={16} className="text-error" />;
            case "upcoming_pm": return <AlertTriangleIcon size={16} className="text-warning" />;
            default: return <BellIcon size={16} className="text-primary" />;
        }
    };

    const getTranslatedMessage = (key: string, params?: Record<string, string | number>) => {
        let msg = t(key as any) || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                msg = msg.replace(`{${k}}`, String(v));
            });
        }
        return msg;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
                <BellIcon size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border border-bg-secondary animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary rounded-xl border border-border-light shadow-2xl z-50 animate-fade-in-up origin-top-right overflow-hidden">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-text-primary px-1">{t("notificationTitle")}</h3>
                        {!permissionGranted && (
                            <button
                                onClick={handleEnableNotifications}
                                className="text-[10px] text-primary hover:text-primary-hover font-medium bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                            >
                                {t("notificationEnable")}
                            </button>
                        )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted flex flex-col items-center gap-3">
                                <BellIcon size={24} className="opacity-20" />
                                <span className="text-xs">{t("notificationEmpty")}</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-3 hover:bg-bg-tertiary/50 transition-colors flex gap-3 ${!notification.read ? 'bg-primary/5' : ''}`}
                                    >
                                        <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-bg-tertiary ${notification.type === 'low_stock' ? 'text-error' : 'text-primary'
                                            }`}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-text-primary mb-0.5">
                                                {t(notification.titleKey as any)}
                                            </p>
                                            <p className="text-xs text-text-secondary leading-relaxed">
                                                {getTranslatedMessage(notification.messageKey, notification.params)}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-1.5">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
