"use client";

import React from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    BarChartIcon,
    ActivityIcon,
    ThermometerIcon,
    SettingsIcon,
    CalendarIcon,
    WrenchIcon,
    DownloadIcon,
    FileTextIcon,
    TrendingUpIcon,
} from "../components/ui/Icons";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
} from "recharts";

// Sample analytics data
const maintenanceByMonth = [
    { month: "Jul", preventive: 12, corrective: 3, oilChange: 5 },
    { month: "Aug", preventive: 15, corrective: 4, oilChange: 6 },
    { month: "Sep", preventive: 10, corrective: 5, oilChange: 4 },
    { month: "Oct", preventive: 18, corrective: 2, oilChange: 7 },
    { month: "Nov", preventive: 14, corrective: 6, oilChange: 5 },
    { month: "Dec", preventive: 16, corrective: 3, oilChange: 8 },
];

const machineDowntime = [
    { machine: "Mix 2", hours: 8.5 },
    { machine: "Pie Line", hours: 12.3 },
    { machine: "Oven 1", hours: 4.2 },
    { machine: "Cooling", hours: 24.5 },
    { machine: "Packaging", hours: 6.8 },
];

const partsByCategoryRaw = [
    { name: "มอเตอร์", value: 35, color: "#3B82F6" },
    { name: "เกียร์", value: 25, color: "#8B5CF6" },
    { name: "สายพาน", value: 20, color: "#10B981" },
    { name: "Bearing", value: 12, color: "#F59E0B" },
    { name: "อื่นๆ", value: 8, color: "#6B7280" },
];

const vibrationTrend = [
    { date: "1 Dec", axisX: 2.1, axisY: 2.3, axisZ: 2.8 },
    { date: "8 Dec", axisX: 2.3, axisY: 2.5, axisZ: 3.0 },
    { date: "15 Dec", axisX: 2.2, axisY: 2.4, axisZ: 2.9 },
    { date: "22 Dec", axisX: 2.5, axisY: 2.7, axisZ: 3.2 },
    { date: "29 Dec", axisX: 2.4, axisY: 2.6, axisZ: 3.1 },
    { date: "5 Jan", axisX: 2.6, axisY: 2.8, axisZ: 3.4 },
];

const temperatureTrend = [
    { date: "1 Dec", temp: 58.5 },
    { date: "8 Dec", temp: 60.2 },
    { date: "15 Dec", temp: 59.8 },
    { date: "22 Dec", temp: 62.3 },
    { date: "29 Dec", temp: 64.1 },
    { date: "5 Jan", temp: 65.5 },
];

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-bg-secondary border border-border rounded-lg p-3 shadow-lg">
                <p className="text-text-primary font-medium mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPage() {
    const { t, tData } = useLanguage();
    const { success } = useToast();
    const { hasRole, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!authLoading && !hasRole(["supervisor", "admin"])) {
            router.push("/");
        }
    }, [authLoading, hasRole, router]);

    if (authLoading || !hasRole(["supervisor", "admin"])) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const handleGenerateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            success(t("analyticsReportReady"), t("analyticsReportDesc"));
        }, 2000);
    };

    const partsByCategory = partsByCategoryRaw.map(p => ({
        ...p,
        name: tData(p.name)
    }));

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
                            <BarChartIcon size={20} className="text-accent-cyan" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navAnalytics")}</h1>
                            <p className="text-sm text-text-muted">{t("analyticsSubtitle")}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-outline border-white/10 hover:bg-white/5 text-sm">
                            <DownloadIcon size={16} className="mr-2" />
                            {t("analyticsDownloadSchedule")}
                        </button>
                        <button
                            className="btn btn-primary bg-primary text-white text-sm disabled:opacity-50"
                            onClick={handleGenerateReport}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <span className="flex items-center">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    {t("analyticsGenerating")}
                                </span>
                            ) : (
                                <>
                                    <FileTextIcon size={16} className="mr-2" />
                                    {t("analyticsMonthlyReport")}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Maintenance by Month */}
                    <div className="card animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarIcon size={18} className="text-accent-yellow" />
                            <h3 className="font-semibold text-text-primary">{t("analyticsMonthlyMaintenance")}</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={maintenanceByMonth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                                    <YAxis stroke="#94A3B8" fontSize={12} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: "12px" }}
                                        formatter={(value) => <span className="text-text-secondary">{tData(value)}</span>}
                                    />
                                    <Bar dataKey="preventive" name={t("analyticsPreventive")} fill="var(--color-accent-green)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="corrective" name={t("analyticsCorrective")} fill="var(--color-accent-red)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="oilChange" name={t("analyticsOilChange")} fill="var(--color-accent-yellow)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Parts by Category */}
                    <div className="card animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <SettingsIcon size={18} className="text-primary-light" />
                            <h3 className="font-semibold text-text-primary">{t("analyticsPartsByCategory")}</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={partsByCategory}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {partsByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        layout="vertical"
                                        align="right"
                                        verticalAlign="middle"
                                        formatter={(value) => <span className="text-text-secondary text-sm">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Machine Downtime */}
                    <div className="card animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <WrenchIcon size={18} className="text-accent-red" />
                            <h3 className="font-semibold text-text-primary">{t("analyticsDowntimeHours")}</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={machineDowntime} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                                    <YAxis dataKey="machine" type="category" stroke="#94A3B8" fontSize={12} width={80} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="hours" name={t("labelHours")} fill="#EF4444" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Vibration Trend */}
                    <div className="card animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <ActivityIcon size={18} className="text-accent-purple" />
                            <h3 className="font-semibold text-text-primary">{t("analyticsVibrationTrend")}</h3>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={vibrationTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                                    <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 4]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: "12px" }}
                                        formatter={(value) => <span className="text-text-secondary">{tData(value)}</span>}
                                    />
                                    <Line type="monotone" dataKey="axisX" name={t("analyticsAxisX")} stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6" }} />
                                    <Line type="monotone" dataKey="axisY" name={t("analyticsAxisY")} stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981" }} />
                                    <Line type="monotone" dataKey="axisZ" name={t("analyticsAxisZ")} stroke="#F59E0B" strokeWidth={2} dot={{ fill: "#F59E0B" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Temperature Trend - Full Width */}
                    <div className="card lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <ThermometerIcon size={18} className="text-accent-red" />
                            <h3 className="font-semibold text-text-primary">{t("analyticsTemperatureTrend")} - Mix 2</h3>
                            <span className="ml-auto badge badge-warning">{t("analyticsShouldCheck")}</span>
                        </div>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={temperatureTrend}>
                                    <defs>
                                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                                    <YAxis stroke="#94A3B8" fontSize={12} domain={[50, 80]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="temp"
                                        name={t("temperature")}
                                        stroke="#EF4444"
                                        fill="url(#tempGradient)"
                                        strokeWidth={2}
                                    />
                                    {/* Warning threshold line */}
                                    <Line
                                        type="monotone"
                                        dataKey={() => 70}
                                        stroke="#F59E0B"
                                        strokeDasharray="5 5"
                                        strokeWidth={1}
                                        dot={false}
                                        name={t("statusMonitoring")}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="mt-3 text-sm text-text-muted flex items-center gap-2">
                            <span className="w-2 h-2 bg-accent-red rounded-full"></span>
                            {t("analyticsTempRising")}
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div className="card text-center animate-fade-in stagger-1 hover:scale-105 hover:shadow-xl hover:shadow-accent-green/5 transition-all duration-300 cursor-default">
                        <p className="text-3xl font-bold text-accent-green">85%</p>
                        <p className="text-sm text-text-muted">{t("analyticsPreventiveRate")}</p>
                    </div>
                    <div className="card text-center animate-fade-in stagger-2 hover:scale-105 hover:shadow-xl hover:shadow-accent-yellow/5 transition-all duration-300 cursor-default">
                        <p className="text-3xl font-bold text-accent-yellow">56.3 {t("labelHoursShort")}</p>
                        <p className="text-sm text-text-muted">{t("analyticsTotalDowntime")}</p>
                    </div>
                    <div className="card text-center animate-fade-in stagger-3 hover:scale-105 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-default">
                        <p className="text-3xl font-bold text-primary-light">98%</p>
                        <p className="text-sm text-text-muted">{t("analyticsCompletionRate")}</p>
                    </div>
                    <div className="card text-center animate-fade-in stagger-4 hover:scale-105 hover:shadow-xl hover:shadow-accent-purple/5 transition-all duration-300 cursor-default">
                        <p className="text-3xl font-bold text-accent-purple">130</p>
                        <p className="text-sm text-text-muted">{t("analyticsPartsTracked")}</p>
                    </div>
                </div>

                {/* Advanced Cost Analysis (Phase 4) */}
                <div className="mt-8 card bg-bg-secondary border border-border-light">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center">
                                <TrendingUpIcon size={20} className="text-accent-green" />
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary">{t("analyticsAdvancedCost")}</h3>
                                <p className="text-xs text-text-muted">{t("analyticsCostAnalysisDesc")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-bg-tertiary/50">
                                <span className="text-sm text-text-secondary">{t("analyticsAccumulatedCost")}</span>
                                <span className="font-bold text-text-primary">฿45,200</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-bg-tertiary/50">
                                <span className="text-sm text-text-secondary">{t("analyticsDowntimeLoss")}</span>
                                <span className="font-bold text-accent-red">฿120,500</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                                <span className="text-sm font-semibold text-primary-light">{t("analyticsEfficiencyROI")}</span>
                                <span className="font-bold text-primary-light">+24%</span>
                            </div>
                        </div>
                        <div className="p-4 bg-bg-tertiary rounded-xl flex flex-col justify-center">
                            <p className="text-xs text-text-muted italic mb-3">{t("analyticsAiInsight")}: {tData("เครื่อง Mixer 2 มีค่าใช้จ่ายอะไหล่สูงสุด แต่ช่วยลด Downtime ได้ 15% เมื่อเทียบกับเดือนที่แล้ว แนะนำให้รักษามาตรฐานการทำ PM ต่อไป")}</p>
                            <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden">
                                <div className="h-full bg-accent-green w-[85%]" />
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-text-muted">
                                <span>{t("analyticsEfficiencyOpt")}</span>
                                <span>85%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    );
}
