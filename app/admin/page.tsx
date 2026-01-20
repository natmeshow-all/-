"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import { useRouter } from "next/navigation";
import {
    ShieldCheckIcon,
    ChartBarIcon,
    UsersIcon,
    UserCircleIcon,
    CheckIcon,
    ActivityIcon,
    StarIcon,
    SettingsIcon,
    FileTextIcon
} from "../components/ui/Icons";
import { getAdminStats } from "../lib/firebaseService";
import { AdminStats } from "../types";

// Tab Components
import AnalyticsTab from "../components/admin/AnalyticsTab";
import TechniciansTab from "../components/admin/TechniciansTab";
import UserApprovalTab from "../components/admin/UserApprovalTab";
import AuditLogTab from "../components/admin/AuditLogTab";
import SystemSettingsTab from "../components/admin/SystemSettingsTab";

type AdminTab = "analytics" | "technicians" | "approvals" | "auditlog" | "settings";

export default function AdminPage() {
    const { t } = useLanguage();
    const { isAdmin, loading: authLoading } = useAuth();
    const { error: showError } = useToast();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<AdminTab>("analytics");
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push("/");
        }
    }, [authLoading, isAdmin, router]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await getAdminStats();
            setStats(data);
        } catch (err) {
            console.error("Error fetching admin stats:", err);
            showError(t("msgError"), "Failed to load dashboard statistics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchStats();
        }
    }, [isAdmin]);

    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 mb-24">
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple to-primary flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
                            <ShieldCheckIcon size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t("adminDashboardTitle")}</h1>
                            <p className="text-sm text-text-muted">{t("adminDashboardSubtitle")}</p>
                        </div>
                    </div>
                </div>

                {/* Top Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={<ActivityIcon size={20} />}
                        label={t("adminStatTotalAccess")}
                        value={stats?.totalLogins.toLocaleString() || "0"}
                        subValue={t("adminStatTotalAccessSub")}
                        color="text-primary"
                        bgColor="bg-primary/10"
                    />
                    <StatCard
                        icon={<ChartBarIcon size={20} />}
                        label={t("adminStatDailyAvg")}
                        value={stats?.avgLoginsPerDay.toFixed(1) || "0"}
                        subValue={t("adminStatDailyAvgSub")}
                        color="text-accent-cyan"
                        bgColor="bg-accent-cyan/10"
                    />
                    <StatCard
                        icon={<UsersIcon size={20} />}
                        label={t("adminStatTechnicians")}
                        value={stats?.technicianCount.toString() || "0"}
                        subValue={t("adminStatTechniciansSub")}
                        color="text-accent-blue"
                        bgColor="bg-accent-blue/10"
                    />
                    <StatCard
                        icon={<StarIcon size={20} />}
                        label={t("adminStatAvgPerformance")}
                        value={stats?.avgPerformance ? stats.avgPerformance.toFixed(1) : "0.0"}
                        subValue={t("adminStatAvgPerformanceSub")}
                        color="text-accent-yellow"
                        bgColor="bg-accent-yellow/10"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 p-1.5 bg-bg-secondary/50 rounded-2xl border border-white/5 mb-8 overflow-x-auto no-scrollbar">
                    <TabButton
                        active={activeTab === "analytics"}
                        onClick={() => setActiveTab("analytics")}
                        icon={<ChartBarIcon size={18} />}
                        label={t("adminTabAnalytics")}
                    />
                    <TabButton
                        active={activeTab === "technicians"}
                        onClick={() => setActiveTab("technicians")}
                        icon={<UserCircleIcon size={18} />}
                        label={t("adminTabTechnicians")}
                    />
                    <TabButton
                        active={activeTab === "approvals"}
                        onClick={() => setActiveTab("approvals")}
                        icon={<CheckIcon size={18} />}
                        label={t("adminTabApprovals")}
                    />
                    <TabButton
                        active={activeTab === "auditlog"}
                        onClick={() => setActiveTab("auditlog")}
                        icon={<FileTextIcon size={18} />}
                        label={t("adminTabAuditLog")}
                    />
                    <TabButton
                        active={activeTab === "settings"}
                        onClick={() => setActiveTab("settings")}
                        icon={<SettingsIcon size={18} />}
                        label={t("adminTabSettings")}
                    />
                </div>

                {/* Content Rendering */}
                <div className="animate-fade-in">
                    {activeTab === "analytics" && <AnalyticsTab stats={stats} loading={loading} />}
                    {activeTab === "technicians" && <TechniciansTab />}
                    {activeTab === "approvals" && <UserApprovalTab />}
                    {activeTab === "auditlog" && <AuditLogTab />}
                    {activeTab === "settings" && <SystemSettingsTab />}
                </div>
            </main>

            <MobileNav />
        </div>
    );
}

function StatCard({ icon, label, value, subValue, color, bgColor }: any) {
    return (
        <div className="card p-5 bg-bg-secondary/30 border border-white/5 hover:border-primary/20 hover:bg-bg-secondary/50 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex items-start gap-4 group cursor-default">
            <div className={`p-3 rounded-xl ${bgColor} ${color} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-text-muted mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-text-primary group-hover:text-primary transition-colors">{value}</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">{subValue}</p>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap active:scale-95
                ${active
                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                    : "text-text-muted hover:bg-white/5 hover:text-text-primary hover:scale-105"}`}
        >
            {icon}
            {label}
        </button>
    );
}
