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
    success: <CheckIcon size={24} className="text-white" />,
    error: <CloseIcon size={24} className="text-white" />,
    warning: <AlertTriangleIcon size={24} className="text-white" />,
    info: <InfoIcon size={24} className="text-white" />,
};

const colorMap = {
    success: "bg-accent-green shadow-accent-green/20",
    error: "bg-accent-red shadow-accent-red/20",
    warning: "bg-accent-yellow shadow-accent-yellow/20",
    info: "bg-accent-cyan shadow-accent-cyan/20",
};

// ... (colorMap lines 27-32 skipped as they remain same)

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
                relative flex items-center justify-start p-4 rounded-xl 
                bg-bg-secondary border border-white/10
                shadow-xl shadow-black/40 backdrop-blur-md
                min-w-[280px] max-w-sm text-left gap-4
                transform transition-all duration-300 ease-out
                ${isVisible && !isExiting
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-8"
                }
            `}
        >
            {/* Icon Bubble */}
            <div className={`
                w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                shadow-md ${colorMap[toast.type]}
                border-2 border-bg-secondary
            `}>
                {iconMap[toast.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white leading-tight">
                    {toast.title}
                </h3>
                {toast.message && (
                    <p className="text-text-muted text-sm mt-0.5 leading-snug truncate">
                        {toast.message}
                    </p>
                )}
            </div>

            {/* Close Button (Icon) */}
            <button
                onClick={handleClose}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/5 text-text-muted hover:text-white transition-colors"
            >
                <XIcon size={16} />
            </button>
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
                fixed inset-0 z-[100] flex items-end justify-center pb-8 pointer-events-none
                transition-all duration-300
            `}
        >
            {/* No Backdrop for smaller toasts to be less intrusive */}

            {/* Toasts Stack */}
            <div className="relative z-10 flex flex-col items-center gap-3">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onClose={onClose} />
                ))}
            </div>
        </div>
    );
}
