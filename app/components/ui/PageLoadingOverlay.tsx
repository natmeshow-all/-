"use client";

import React from "react";

interface PageLoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

/**
 * A semi-transparent overlay for in-page data loading states.
 * Use this when data is being fetched AFTER the page is already mounted.
 */
export default function PageLoadingOverlay({
    isLoading,
    message = "กำลังโหลดข้อมูล...",
}: PageLoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm pointer-events-auto animate-fade-in">
            <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-bg-secondary/80 border border-white/10 shadow-2xl">
                {/* Compact Spinner */}
                <div className="relative w-16 h-16">
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-[spin_3s_linear_infinite]" />
                    {/* Inner gradient ring */}
                    <div className="absolute inset-1 rounded-full border-t-2 border-r-2 border-primary animate-[spin_1s_linear_infinite]" />
                    {/* Center dot */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                </div>

                {/* Message */}
                <p className="text-text-primary font-medium animate-pulse">{message}</p>

                {/* Progress dots */}
                <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
