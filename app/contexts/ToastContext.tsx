"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ToastContainer, ToastData, ToastType } from "../components/ui/Toast";
import { useLanguage } from "./LanguageContext";

interface ToastContextType {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    loginRequired: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const { t } = useLanguage();
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (type: ToastType, title: string, message?: string, duration?: number) => {
            // Deduplication: Check if an identical toast exists within the last 2 seconds
            // This prevents spamming the same notification (e.g., from double-clicks or strict mode)
            setToasts((prev) => {
                const isDuplicate = prev.some(
                    (t) => t.title === title && t.message === message && t.type === type
                );
                if (isDuplicate) return prev;

                // Intercept Permission Denied errors to show user-friendly message
                if (message && (message.includes("PERMISSION_DENIED") || message.includes("permission_denied"))) {
                    type = "error";
                    title = t("msgNoEditPermission") || "คุณไม่มีสิทธ์แก้ไข";
                    message = t("msgPleaseLogin") || "กรุณาล็อกอิน";
                }

                const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newToast: ToastData = {
                    id,
                    type,
                    title,
                    message,
                    duration: duration || 2000,
                };
                return [...prev, newToast];
            });
        },
        [t]
    );

    const success = useCallback(
        (title: string, message?: string) => showToast("success", title, message, 2000),
        [showToast]
    );

    const error = useCallback(
        (title: string, message?: string) => showToast("error", title, message, 2000),
        [showToast]
    );

    const warning = useCallback(
        (title: string, message?: string) => showToast("warning", title, message, 2000),
        [showToast]
    );

    const info = useCallback(
        (title: string, message?: string) => showToast("info", title, message, 2000),
        [showToast]
    );

    const loginRequired = useCallback(
        () => showToast("error", t("msgNoEditPermission") || "คุณไม่มีสิทธ์แก้ไข", t("msgPleaseLogin") || "กรุณาล็อกอิน", 2000),
        [showToast, t]
    );

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info, loginRequired }}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
