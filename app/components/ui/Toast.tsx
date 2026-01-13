import React, { useEffect, useState } from "react";
import { CheckIcon, AlertTriangleIcon, InfoIcon, XIcon, CloseIcon } from "./Icons";
import { soundManager } from "../../lib/soundService";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastProps {
    toast: ToastData;
    onClose: (id: string) => void;
}

const iconMap = {
    success: <CheckIcon size={48} className="text-white" />,
    error: <CloseIcon size={48} className="text-white" />,
    warning: <AlertTriangleIcon size={48} className="text-white" />,
    info: <InfoIcon size={48} className="text-white" />,
};

const colorMap = {
    success: "bg-accent-green shadow-accent-green/20",
    error: "bg-accent-red shadow-accent-red/20",
    warning: "bg-accent-yellow shadow-accent-yellow/20",
    info: "bg-accent-cyan shadow-accent-cyan/20",
};

export function Toast({ toast, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Play sound
        if (toast.type === "success") soundManager.playSuccess();
        else if (toast.type === "error") soundManager.playError();
        else if (toast.type === "warning") soundManager.playWarning();
        else soundManager.playPop();

        // Enter animation
        const enterTimer = setTimeout(() => setIsVisible(true), 10);

        // Auto dismiss
        const duration = toast.duration || 3000;
        const dismissTimer = setTimeout(() => {
            handleClose();
        }, duration);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(dismissTimer);
        };
    }, [toast.duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(toast.id);
        }, 200);
    };

    return (
        <div
            className={`
                pointer-events-auto
                relative flex flex-col items-center justify-center p-8 rounded-3xl 
                bg-bg-secondary border border-white/10
                shadow-2xl shadow-black/50 backdrop-blur-md
                min-w-[320px] max-w-md text-center
                transform transition-all duration-300 ease-out
                ${isVisible && !isExiting
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-8"
                }
            `}
        >
            {/* Icon Bubble */}
            <div className={`
                w-20 h-20 rounded-full flex items-center justify-center mb-6
                shadow-lg ${colorMap[toast.type]}
                border-4 border-bg-secondary
            `}>
                {iconMap[toast.type]}
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {toast.title}
            </h3>
            {toast.message && (
                <p className="text-text-muted text-base mb-6 leading-relaxed">
                    {toast.message}
                </p>
            )}

            {/* Close Button (Icon) Top Right */}
            <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-text-muted hover:text-white transition-colors"
            >
                <XIcon size={20} />
            </button>

            {/* Close Button (Action) */}
            {/* Optional: Add a text button for better usability if needed, but icon is fine per design */}
        </div>
    );
}

interface ToastContainerProps {
    toasts: ToastData[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    // Determine if we should show the backdrop
    const hasToasts = toasts.length > 0;

    return (
        <div
            className={`
                fixed inset-0 z-[100] flex items-center justify-center 
                transition-all duration-300
                ${hasToasts ? "pointer-events-auto" : "pointer-events-none"}
            `}
        >
            {/* Backdrop */}
            <div
                className={`
                    absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300
                    ${hasToasts ? "opacity-100" : "opacity-0"}
                `}
                aria-hidden="true"
            />

            {/* Toasts Stack */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onClose={onClose} />
                ))}
            </div>
        </div>
    );
}
