"use client";

import React from "react";
import { AdminStats } from "../../types";
import { ActivityIcon, CalendarIcon } from "../ui/Icons";
import { useLanguage } from "../../contexts/LanguageContext";

interface AnalyticsTabProps {
    stats: AdminStats | null;
    loading: boolean;
}

export default function AnalyticsTab({ stats, loading }: AnalyticsTabProps) {
    const { t } = useLanguage();

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
            <div className="card p-6 border-white/5 bg-bg-secondary/30 hover:border-white/10 transition-all group">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">{t("adminUsageHistory")}</h2>
                        <p className="text-xs text-text-muted">{t("adminUsageSubtitle")}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-bg-tertiary group-hover:scale-110 transition-transform">
                        <CalendarIcon size={18} className="text-text-muted" />
                    </div>
                </div>

                {/* Simple Usage Chart (CSS implementation) */}
                <div className="h-64 flex items-end gap-1.5 px-2">
                    {stats.usageHistory.map((day, idx) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group/bar relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 px-2 py-1 bg-bg-primary text-white text-[10px] rounded border border-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none shadow-xl scale-90 group-hover/bar:scale-100 origin-bottom">
                                {new Date(day.date).toLocaleDateString()} : {day.count} {t("adminUsageHits")}
                            </div>

                            <div
                                className="w-full bg-primary/20 group-hover/bar:bg-primary/60 group-hover/bar:scale-x-110 transition-all rounded-t-sm relative overflow-hidden"
                                style={{
                                    height: `${Math.max((day.count / (Math.max(...stats.usageHistory.map(d => d.count)) || 1)) * 100, 5)}%`
                                }}
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-primary group-hover/bar:h-2 transition-all" />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between mt-4 text-[10px] text-text-muted border-t border-white/5 pt-4">
                    <span>{stats.usageHistory[0]?.date}</span>
                    <span className="font-bold text-primary/60">{t("adminUsageDailyActivity")}</span>
                    <span>{t("adminUsageRecent")}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 border-white/5 bg-bg-secondary/30 hover:scale-[1.02] hover:bg-bg-secondary/40 transition-all duration-300 group">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                        <ActivityIcon size={16} className="text-accent-cyan group-hover:scale-125 transition-transform" />
                        {t("adminSystemHealth")}
                    </h3>
                    <div className="space-y-4">
                        <HealthMetric label={t("adminDbResponse")} value={t("adminStatusNormal")} status="success" />
                        <HealthMetric label={t("adminStorageUsage")} value="1.2 GB" status="warning" />
                        <HealthMetric label={t("adminAuthSystem")} value={t("adminStatusOnline")} status="success" />
                    </div>
                </div>

                <div className="card p-6 border-white/5 bg-bg-secondary/30 hover:scale-[1.02] hover:bg-bg-secondary/40 transition-all duration-300 group">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                        <ActivityIcon size={16} className="text-accent-purple group-hover:scale-125 transition-transform" />
                        {t("adminQuickInsights")}
                    </h3>
                    <ul className="space-y-3 text-xs text-text-muted">
                        <li className="flex items-start gap-2 hover:text-text-primary transition-colors cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 animate-pulse" />
                            {t("adminInsightPeak")}
                        </li>
                        <li className="flex items-start gap-2 hover:text-text-primary transition-colors cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 animate-pulse" />
                            {t("adminInsightMobile")}
                        </li>
                        <li className="flex items-start gap-2 hover:text-text-primary transition-colors cursor-default">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 animate-pulse" />
                            {t("adminInsightStable")}
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
