"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { database } from "../../lib/firebase";
import { ref, onValue } from "firebase/database";
import {
    ActivityIcon,
    BoxIcon,
    ShieldCheckIcon,
    SettingsIcon,
    UserIcon
} from "../ui/Icons";
import { getAdminStats, getDashboardStats } from "../../lib/firebaseService";
import { AdminStats, DashboardStats } from "../../types";

export default function SystemMonitorTab() {
    const { t } = useLanguage();
    const [dbConnected, setDbConnected] = useState<boolean | null>(null);
    const [latency, setLatency] = useState<number | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
    const [userAgent, setUserAgent] = useState("");

    useEffect(() => {
        // Check Firebase connection
        const connectedRef = ref(database, ".info/connected");
        const unsubscribe = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                setDbConnected(true);
            } else {
                setDbConnected(false);
            }
        });

        // Get User Agent
        if (typeof window !== "undefined") {
            setUserAgent(window.navigator.userAgent);
        }

        // Fetch Stats
        fetchStats();

        return () => unsubscribe();
    }, []);

    const fetchStats = async () => {
        const start = Date.now();
        try {
            const [adminData, dashData] = await Promise.all([
                getAdminStats(),
                getDashboardStats()
            ]);
            setStats(adminData);
            setDashStats(dashData);
            setLatency(Date.now() - start);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const StatusIndicator = ({ status, label }: { status: boolean | null, label: string }) => (
        <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-white/5">
            <span className="text-text-secondary">{label}</span>
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status === true ? 'bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.5)]' : status === false ? 'bg-accent-red' : 'bg-gray-500 animate-pulse'}`} />
                <span className={`text-sm font-medium ${status === true ? 'text-accent-green' : status === false ? 'text-accent-red' : 'text-text-muted'}`}>
                    {status === true ? t("adminStatusOnline") : status === false ? "Offline" : "Checking..."}
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Health Panel */}
                <div className="bg-bg-primary rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <ActivityIcon className="text-accent-blue" />
                        <h3 className="text-lg font-bold text-text-primary">{t("adminSystemHealth")}</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <StatusIndicator status={dbConnected} label={t("adminDbResponse")} />
                        
                        <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-white/5">
                            <span className="text-text-secondary">Latency</span>
                            <span className="text-text-primary font-mono">{latency ? `${latency}ms` : "-"}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-white/5">
                            <span className="text-text-secondary">Environment</span>
                            <span className="text-text-primary text-sm max-w-[200px] truncate" title={userAgent}>
                                {process.env.NODE_ENV || "development"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Database Stats Panel */}
                <div className="bg-bg-primary rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <BoxIcon className="text-accent-purple" />
                        <h3 className="text-lg font-bold text-text-primary">Database Nodes</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-bg-secondary rounded-lg border border-white/5 text-center">
                            <div className="text-2xl font-bold text-text-primary mb-1">{stats?.technicianCount || 0}</div>
                            <div className="text-xs text-text-muted">Technicians</div>
                        </div>
                        <div className="p-4 bg-bg-secondary rounded-lg border border-white/5 text-center">
                            <div className="text-2xl font-bold text-text-primary mb-1">{dashStats?.totalMachines || 0}</div>
                            <div className="text-xs text-text-muted">Machines</div>
                        </div>
                        <div className="p-4 bg-bg-secondary rounded-lg border border-white/5 text-center">
                            <div className="text-2xl font-bold text-text-primary mb-1">{dashStats?.totalParts || 0}</div>
                            <div className="text-xs text-text-muted">Parts</div>
                        </div>
                        <div className="p-4 bg-bg-secondary rounded-lg border border-white/5 text-center">
                            <div className="text-2xl font-bold text-text-primary mb-1">{dashStats?.maintenanceRecords || 0}</div>
                            <div className="text-xs text-text-muted">Records</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Info */}
            <div className="bg-bg-primary rounded-xl border border-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheckIcon className="text-accent-cyan" />
                    <h3 className="text-lg font-bold text-text-primary">Client Information</h3>
                </div>
                <div className="p-4 bg-bg-secondary rounded-lg border border-white/5 font-mono text-xs text-text-muted break-all">
                    {userAgent}
                </div>
            </div>
        </div>
    );
}
