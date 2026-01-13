"use client";

import React from "react";

interface StatCardProps {
    icon: React.ReactNode;
    value: number | string;
    label: string;
    iconBgColor?: string;
    iconTextColor?: string;
    delay?: number;
}

export default function StatCard({
    icon,
    value,
    label,
    iconBgColor = "bg-primary/20",
    iconTextColor = "text-primary-light",
    delay = 0,
}: StatCardProps) {
    return (
        <div
            className="stat-card animate-fade-in-up hover-lift"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`stat-icon ${iconBgColor} ${iconTextColor}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
            </div>
        </div>
    );
}
