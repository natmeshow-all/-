import React, { useState, useEffect, useRef } from "react";
import { BellIcon, BoxIcon, AlertTriangleIcon, CheckIcon } from "./Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { NotificationItem, requestNotificationPermission, sendBrowserNotification, checkUpcomingPM } from "../../lib/notificationService";
import { getSpareParts, getPMPlans } from "../../lib/firebaseService";

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
                const plans = await getPMPlans();
                const pmNotifications = checkUpcomingPM(plans);
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

    const overdueCount = notifications.filter(n => n.type === 'due_today').length;
    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case "low_stock": return <BoxIcon size={16} className="text-error" />;
            case "upcoming_pm": return <AlertTriangleIcon size={16} className="text-warning" />;
            case "due_today": return <AlertTriangleIcon size={16} className="text-accent-red" />;
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
                <div className={overdueCount > 0 ? "animate-swing" : ""}>
                    <BellIcon size={20} className={overdueCount > 0 ? "text-accent-yellow" : ""} />
                </div>

                {overdueCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 rounded-full bg-accent-yellow text-bg-primary text-[10px] font-bold flex items-center justify-center animate-pulse border-2 border-bg-secondary shadow-sm z-10">
                        {overdueCount}
                    </span>
                ) : unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error border border-bg-secondary animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary/95 backdrop-blur-xl rounded-xl border border-border-light shadow-2xl z-50 animate-fade-in-up origin-top-right overflow-hidden ring-1 ring-white/5">
                    <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h3 className="font-semibold text-sm text-text-primary px-1 flex items-center gap-2">
                            {t("notificationTitle")}
                            {overdueCount > 0 && <span className="text-xs text-accent-yellow font-normal">({overdueCount} {t("notificationAlerts")})</span>}
                        </h3>
                        {!permissionGranted && (
                            <button
                                onClick={handleEnableNotifications}
                                className="text-[10px] text-primary hover:text-primary-hover font-medium bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                            >
                                {t("notificationEnable")}
                            </button>
                        )}
                    </div>

                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted flex flex-col items-center gap-3">
                                <BellIcon size={24} className="opacity-20" />
                                <span className="text-xs">{t("notificationEmpty")}</span>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification, index) => (
                                    <div
                                        key={notification.id}
                                        className={`p-3 hover:bg-bg-tertiary/50 transition-colors flex gap-3 animate-fade-in-up
                                            ${!notification.read ? 'bg-primary/5' : ''}
                                            ${notification.type === 'due_today' ? 'bg-accent-yellow/5 border-l-2 border-l-accent-yellow' : ''}
                                        `}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-bg-tertiary/50 border border-white/5 
                                            ${notification.type === 'low_stock' ? 'text-error shadow-glow-red' :
                                                notification.type === 'due_today' ? 'text-accent-yellow shadow-glow-yellow' : 'text-primary'
                                            }`}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold mb-0.5 truncate ${notification.type === 'due_today' ? 'text-accent-yellow' : 'text-text-primary'}`}>
                                                {t(notification.titleKey as any)}
                                            </p>
                                            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                                                {getTranslatedMessage(notification.messageKey, notification.params)}
                                            </p>
                                            <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
                                                <span>{new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {notification.type === 'due_today' && <span className="px-1.5 py-0.5 rounded-full bg-accent-yellow/10 text-accent-yellow text-[9px] font-medium">{t("labelActionRequired")}</span>}
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
