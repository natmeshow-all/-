"use client";

import React from "react";

interface GlobalLoadingSpinnerProps {
    status?: string;
    subStatus?: string;
    variant?: "default" | "auth" | "data" | "ai";
}

export default function GlobalLoadingSpinner({
    status = "กำลังโหลด...",
    subStatus,
    variant = "default",
}: GlobalLoadingSpinnerProps) {
    // Get colors based on variant
    const getColors = () => {
        switch (variant) {
            case "auth":
                return {
                    primary: "from-amber-500 to-orange-500",
                    glow: "shadow-amber-500/30",
                    ring: "border-amber-500/20",
                    dot: "bg-amber-500",
                };
            case "data":
                return {
                    primary: "from-cyan-500 to-blue-500",
                    glow: "shadow-cyan-500/30",
                    ring: "border-cyan-500/20",
                    dot: "bg-cyan-500",
                };
            case "ai":
                return {
                    primary: "from-purple-500 to-pink-500",
                    glow: "shadow-purple-500/30",
                    ring: "border-purple-500/20",
                    dot: "bg-purple-500",
                };
            default:
                return {
                    primary: "from-indigo-500 to-violet-500",
                    glow: "shadow-indigo-500/30",
                    ring: "border-indigo-500/20",
                    dot: "bg-indigo-500",
                };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-primary/95 backdrop-blur-md">
            {/* Animated Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-r ${colors.primary} opacity-10 blur-[100px] animate-pulse`} />
            </div>

            {/* Main Spinner Container */}
            <div className="relative flex items-center justify-center">
                {/* Outer Ring - Slow Spin */}
                <div className={`absolute w-24 h-24 rounded-full border-2 ${colors.ring} animate-[spin_3s_linear_infinite]`} />

                {/* Middle Ring - Medium Spin (Reverse) */}
                <div className={`absolute w-20 h-20 rounded-full border-2 border-dashed ${colors.ring} animate-[spin_2s_linear_infinite_reverse]`} />

                {/* Inner Ring - Fast Spin */}
                <div className={`absolute w-16 h-16 rounded-full border-t-2 border-r-2 bg-gradient-to-r ${colors.primary} border-transparent animate-[spin_1s_linear_infinite] ${colors.glow} shadow-lg`}
                    style={{ borderRadius: '50%', background: `conic-gradient(from 0deg, transparent, rgba(99, 102, 241, 0.3), transparent)` }}
                />

                {/* Center Icon/Logo Area */}
                <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${colors.primary} flex items-center justify-center shadow-lg ${colors.glow}`}>
                    <svg
                        className="w-6 h-6 text-white animate-pulse"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                    </svg>
                </div>

                {/* Orbiting Dots */}
                <div className="absolute w-28 h-28 animate-[spin_4s_linear_infinite]">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${colors.dot} shadow-lg`} />
                </div>
                <div className="absolute w-32 h-32 animate-[spin_5s_linear_infinite_reverse]">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${colors.dot} opacity-60`} />
                </div>
            </div>

            {/* Status Text */}
            <div className="mt-10 text-center z-10">
                <p className={`text-lg font-semibold bg-gradient-to-r ${colors.primary} bg-clip-text text-transparent animate-pulse`}>
                    {status}
                </p>
                {subStatus && (
                    <p className="mt-2 text-sm text-text-muted animate-fade-in">
                        {subStatus}
                    </p>
                )}
            </div>

            {/* Progress Dots */}
            <div className="mt-6 flex gap-2">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${colors.dot} animate-bounce`}
                        style={{ animationDelay: `${i * 150}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}
