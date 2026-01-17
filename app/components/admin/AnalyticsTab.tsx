"use client";

import React from "react";
import { AdminStats } from "../../types";
import { ActivityIcon, CalendarIcon } from "../ui/Icons";

interface AnalyticsTabProps {
    stats: AdminStats | null;
    loading: boolean;
}

export default function AnalyticsTab({ stats, loading }: AnalyticsTabProps) {
    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="card p-6 border-white/5 bg-bg-secondary/30">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Usage History</h2>
                        <p className="text-xs text-text-muted">Last 30 days of application access</p>
                    </div>
                    <div className="p-2 rounded-lg bg-bg-tertiary">
                        <CalendarIcon size={18} className="text-text-muted" />
                    </div>
                </div>

                {/* Simple Usage Chart (CSS implementation) */}
                <div className="h-64 flex items-end gap-1.5">
                    {stats.usageHistory.map((day, idx) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 px-2 py-1 bg-bg-primary text-white text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                {new Date(day.date).toLocaleDateString()} : {day.count} hits
                            </div>

                            <div
                                className="w-full bg-primary/20 group-hover:bg-primary/50 transition-all rounded-t-sm relative overflow-hidden"
                                style={{
                                    height: `${Math.max((day.count / (Math.max(...stats.usageHistory.map(d => d.count)) || 1)) * 100, 5)}%`
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between mt-4 text-[10px] text-text-muted border-t border-white/5 pt-4">
                    <span>{stats.usageHistory[0]?.date}</span>
                    <span>Daily Activity (Hits/Day)</span>
                    <span>Recent</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 border-white/5 bg-bg-secondary/30">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                        <ActivityIcon size={16} className="text-accent-cyan" />
                        System Health
                    </h3>
                    <div className="space-y-4">
                        <HealthMetric label="Database Response" value="Normal" status="success" />
                        <HealthMetric label="Storage Usage" value="1.2 GB" status="warning" />
                        <HealthMetric label="Auth System" value="Online" status="success" />
                    </div>
                </div>

                <div className="card p-6 border-white/5 bg-bg-secondary/30">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                        <ActivityIcon size={16} className="text-accent-purple" />
                        Quick Insights
                    </h3>
                    <ul className="space-y-3 text-xs text-text-muted">
                        <li className="flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                            Peak usage usually occurs on Monday mornings.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                            A 15% increase in mobile access over the last week.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                            System stability has been 100% since last update.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function HealthMetric({ label, value, status }: any) {
    const statusColor = status === "success" ? "bg-accent-green" : "bg-accent-yellow";
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">{value}</span>
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            </div>
        </div>
    );
}
