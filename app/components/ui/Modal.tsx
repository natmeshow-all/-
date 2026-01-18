"use client";

import React, { useEffect, useRef, useState } from "react";
import { XIcon } from "./Icons";
import { soundManager } from "../../lib/soundService";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    titleIcon?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
    hideHeader?: boolean;
    noPadding?: boolean;
}

const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
};

export default function Modal({
    isOpen,
    onClose,
    title,
    titleIcon,
    children,
    footer,
    size = "lg",
    hideHeader = false,
    noPadding = false,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Handle lifecycle for animations
    // Handle lifecycle for animations
    useEffect(() => {
        if (isOpen) {
            soundManager.playPop();
            setShouldRender(true);
            // Small delay to allow render before adding active class (for transition)
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
            document.body.style.overflow = "hidden";

            // Cleanup function ensuring overflow is reset if unmounted while open
            return () => {
                document.body.style.overflow = "";
            };
        } else {
            setIsVisible(false);
            setIsExiting(true);
            // Wait for transition to finish before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsExiting(false);
                document.body.style.overflow = "";
            }, 300); // Match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    // Handle click outside
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!shouldRender) return null;

    return (
        <div
            className={`
                modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4
                transition-all duration-300 ease-out
                ${isVisible ? "bg-black/60 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"}
            `}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                ref={modalRef}
                className={`
                    modal-content bg-bg-secondary rounded-2xl border border-white/10 shadow-2xl
                    flex flex-col max-h-[90vh] w-full
                    transform transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
                    ${sizeClasses[size]}
                    ${isVisible
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 translate-y-8"
                    }
                `}
            >
                {/* Header */}
                {!hideHeader && (
                    <div className="modal-header flex items-center gap-3 p-6 border-b border-border-light">
                        {titleIcon && (
                            <div className="flex-shrink-0">
                                {titleIcon}
                            </div>
                        )}
                        <h2 id="modal-title" className="modal-title text-xl font-bold text-text-primary flex-1">
                            {title}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="Close modal"
                        >
                            <XIcon size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className={`modal-body ${noPadding ? '' : 'p-6'} overflow-y-auto custom-scrollbar`}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="modal-footer p-6 border-t border-border-light flex justify-end gap-3 bg-bg-tertiary/30 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
