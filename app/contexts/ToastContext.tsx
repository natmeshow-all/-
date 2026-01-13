"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ToastContainer, ToastData, ToastType } from "../components/ui/Toast";

interface ToastContextType {
    showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (type: ToastType, title: string, message?: string, duration?: number) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newToast: ToastData = {
                id,
                type,
                title,
                message,
                duration: duration || 4000,
            };
            setToasts((prev) => [...prev, newToast]);
        },
        []
    );

    const success = useCallback(
        (title: string, message?: string) => showToast("success", title, message),
        [showToast]
    );

    const error = useCallback(
        (title: string, message?: string) => showToast("error", title, message, 6000),
        [showToast]
    );

    const warning = useCallback(
        (title: string, message?: string) => showToast("warning", title, message, 5000),
        [showToast]
    );

    const info = useCallback(
        (title: string, message?: string) => showToast("info", title, message),
        [showToast]
    );

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
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
