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
    UserIcon,
    AlertTriangleIcon,
    TrashIcon
} from "../ui/Icons";
import { getAdminStats, getDashboardStats, getSystemErrors, clearSystemErrors, getPendingUsers, getDatabaseStats } from "../../lib/firebaseService";
import { AdminStats, DashboardStats, SystemErrorLog } from "../../types";
import ConfirmModal from "../ui/ConfirmModal";
import { useToast } from "../../contexts/ToastContext";

export default function SystemMonitorTab() {
    const { t } = useLanguage();
    const { success, error: toastError } = useToast();
    const [dbConnected, setDbConnected] = useState<boolean | null>(null);
    const [latency, setLatency] = useState<number | null>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
    const [dbStats, setDbStats] = useState<Record<string, number> | null>(null);
    const [errors, setErrors] = useState<SystemErrorLog[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [userAgent, setUserAgent] = useState("");
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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
            const [adminData, dashData, errorsData, pendingUsers, dbStatsData] = await Promise.all([
                getAdminStats(),
                getDashboardStats(),
                getSystemErrors(50),
                getPendingUsers(),
                getDatabaseStats()
            ]);
            setStats(adminData);
            setDashStats(dashData);
            setErrors(errorsData);
            setPendingCount(pendingUsers.length);
            setDbStats(dbStatsData);
            setLatency(Date.now() - start);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleClearErrors = async () => {
        try {
            await clearSystemErrors();
            success(t("adminErrorsCleared"));
            fetchStats();
        } catch (err) {
            console.error("Error clearing errors:", err);
            toastError(t("errorTitle"));
        }
    };

    // Calculate Error Frequency
    const errorFrequency = errors.reduce((acc, err) => {
        const msg = err.message || "Unknown Error";
        acc[msg] = (acc[msg] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(errorFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

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
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <ActivityIcon size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">{t("adminSystemHealth") || "System Health"}</h3>
                            <p className="text-xs text-text-muted">Real-time system status metrics</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <StatusIndicator 
                            status={dbConnected} 
                            label={t("adminDatabaseConnection") || "Database Connection"} 
                        />
                        
                        <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-white/5">
                            <span className="text-text-secondary">Latency</span>
                            <span className={`text-sm font-mono ${!latency ? 'text-text-muted' : latency < 200 ? 'text-accent-green' : latency < 500 ? 'text-accent-yellow' : 'text-accent-red'}`}>
                                {latency ? `${latency}ms` : 'Calculating...'}
                            </span>
                        </div>

                        <div className="p-4 bg-bg-secondary rounded-lg border border-white/5">
                            <div className="flex justify-between mb-2">
                                <span className="text-text-secondary text-sm">Client Info</span>
                            </div>
                            <div className="text-xs text-text-muted font-mono break-all">
                                {userAgent}
                            </div>
                             <div className="mt-2 text-xs text-text-muted grid grid-cols-2 gap-2">
                                <div>Screen: {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</div>
                                <div>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* System Overview */}
                <div className="bg-bg-primary rounded-xl border border-white/5 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <BoxIcon className="text-accent-purple" />
                        <h3 className="text-lg font-bold text-text-primary">{t("adminSystemOverview")}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
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
                        <div className="p-4 bg-bg-secondary rounded-lg border border-white/5 text-center relative overflow-hidden col-span-2">
                            <div className={`absolute inset-0 opacity-10 ${pendingCount > 0 ? 'bg-accent-orange animate-pulse' : ''}`}></div>
                            <div className={`text-2xl font-bold mb-1 ${pendingCount > 0 ? 'text-accent-orange' : 'text-text-primary'}`}>{pendingCount}</div>
                            <div className="text-xs text-text-muted">Pending Users</div>
                        </div>
                    </div>

                    {/* Database Records Summary */}
                    {dbStats && (
                        <div className="mb-4">
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-2">Database Records</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between p-2 bg-bg-secondary/50 rounded">
                                    <span className="text-text-secondary">Users</span>
                                    <span className="font-mono">{dbStats.users || 0}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-bg-secondary/50 rounded">
                                    <span className="text-text-secondary">Machines</span>
                                    <span className="font-mono">{dbStats.machines || 0}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-bg-secondary/50 rounded">
                                    <span className="text-text-secondary">Parts</span>
                                    <span className="font-mono">{dbStats.parts || 0}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-bg-secondary/50 rounded">
                                    <span className="text-text-secondary">Records</span>
                                    <span className="font-mono">{dbStats.maintenance_records || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Top Errors Summary */}
                    {topErrors.length > 0 && (
                        <div className="mt-auto pt-4 border-t border-white/5">
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-2">Top System Errors</h4>
                            <div className="space-y-2">
                                {topErrors.map(([msg, count], idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <span className="truncate text-text-secondary mr-2" title={msg}>{msg}</span>
                                        <span className="font-mono font-bold text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* System Errors Section */}
            <div className="bg-bg-primary rounded-xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <AlertTriangleIcon className="text-accent-red" />
                        <h3 className="text-lg font-bold text-text-primary">{t("adminSystemErrors")}</h3>
                    </div>
                    {errors.length > 0 && (
                        <button
                            onClick={() => setClearConfirmOpen(true)}
                            className="btn btn-sm btn-ghost text-accent-red hover:bg-accent-red/10"
                        >
                            <TrashIcon size={16} className="mr-2" />
                            Clear Logs
                        </button>
                    )}
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {errors.length === 0 ? (
                        <div className="text-center py-8 text-text-muted border border-dashed border-white/10 rounded-lg">
                            <p>{t("adminNoErrors")}</p>
                        </div>
                    ) : (
                        errors.map((err) => (
                            <div key={err.id} className="p-3 bg-bg-secondary/50 rounded-lg border border-white/5 hover:bg-bg-secondary transition-colors text-left">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-accent-red truncate">{err.message}</p>
                                        <p className="text-xs text-text-muted mt-1 font-mono truncate">{err.url}</p>
                                    </div>
                                    <span className="text-[10px] text-text-muted whitespace-nowrap">
                                        {new Date(err.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                {err.userName && (
                                    <p className="text-xs text-text-primary mt-2 flex items-center gap-1">
                                        <UserIcon size={10} /> {err.userName}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={clearConfirmOpen}
                onClose={() => setClearConfirmOpen(false)}
                onConfirm={handleClearErrors}
                title={t("adminClearErrorsTitle") || "Clear System Errors"}
                message={t("adminClearErrorsMessage") || "Are you sure you want to clear all system error logs? This action cannot be undone."}
                confirmText={t("actionDelete")}
                isDestructive={true}
            />
        </div>
    );
}
