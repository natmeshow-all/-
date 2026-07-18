"use client";

import React from "react";

interface AnimatedLogoProps {
    size?: number;
    className?: string;
}

export default function AnimatedLogo({ size = 40, className = "" }: AnimatedLogoProps) {
    return (
        <div
            className={`relative group ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Outer rotating ring */}
            <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full animate-spin-slow"
                style={{ animationDuration: "12s" }}
            >
                <defs>
                    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                    </linearGradient>
                </defs>
                <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke="url(#ring-gradient)"
                    strokeWidth="2"
                    strokeDasharray="12 8 4 8"
                    strokeLinecap="round"
                />
            </svg>

            {/* Inner counter-rotating ring */}
            <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                style={{ animation: "spin 8s linear infinite reverse" }}
            >
                <defs>
                    <linearGradient id="inner-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                <circle
                    cx="50" cy="50" r="38"
                    fill="none"
                    stroke="url(#inner-ring)"
                    strokeWidth="1.5"
                    strokeDasharray="6 12"
                    strokeLinecap="round"
                />
            </svg>

            {/* Main body - gradient background */}
            <div className="absolute inset-[15%] rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow duration-500">
                {/* Shimmer overlay */}
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    />
                </div>
            </div>

            {/* Gear/wrench icon - maintenance themed */}
            <svg
                viewBox="0 0 100 100"
                className="absolute inset-[15%] w-[70%] h-[70%] text-white drop-shadow-md"
                style={{ animation: "pulse-subtle 3s ease-in-out infinite" }}
            >
                {/* Gear */}
                <g transform="translate(50,50)" fill="currentColor">
                    {/* Gear teeth */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                        <rect
                            key={i}
                            x="-4" y="-28"
                            width="8" height="10"
                            rx="2"
                            transform={`rotate(${angle})`}
                            opacity="0.9"
                        />
                    ))}
                    {/* Gear body */}
                    <circle cx="0" cy="0" r="20" fill="currentColor" opacity="0.95" />
                    {/* Gear hole */}
                    <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(59,130,246,0.8)" strokeWidth="3" />
                    {/* Center dot */}
                    <circle cx="0" cy="0" r="3" fill="rgba(59,130,246,0.9)" />
                </g>
            </svg>

            {/* Orbiting particle 1 */}
            <div
                className="absolute w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-lg shadow-cyan-400/60"
                style={{
                    animation: "orbit 4s linear infinite",
                    top: "0%",
                    left: "50%",
                    transformOrigin: `0px ${size / 2}px`,
                }}
            />

            {/* Orbiting particle 2 */}
            <div
                className="absolute w-1 h-1 rounded-full bg-accent-purple shadow-lg shadow-purple-400/60"
                style={{
                    animation: "orbit 6s linear infinite reverse",
                    top: "0%",
                    left: "50%",
                    transformOrigin: `0px ${size / 2}px`,
                }}
            />

            {/* Pulsating glow behind */}
            <div
                className="absolute inset-0 rounded-xl bg-blue-500/20 blur-xl -z-10"
                style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
            />

            {/* Inline keyframes */}
            <style jsx>{`
                @keyframes orbit {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse-subtle {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.04); opacity: 0.92; }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.15); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
