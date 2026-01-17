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
            className="stat-card animate-fade-in-up hover:scale-[1.05] hover:shadow-xl hover:shadow-primary/5 hover:border-white/20 transition-all duration-300 group cursor-default"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`stat-icon ${iconBgColor} ${iconTextColor} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="stat-value group-hover:text-primary-light transition-colors">{value}</span>
                <span className="stat-label">{label}</span>
            </div>
        </div>
    );
}
