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
import { getAdminStats, getDashboardStats, getSystemErrors, clearSystemErrors, getPendingUsers } from "../../lib/firebaseService";
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
            const [adminData, dashData, errorsData] = await Promise.all([
                getAdminStats(),
                getDashboardStats(),
                getSystemErrors(10)
            ]);
            setStats(adminData);
            setDashStats(dashData);
            setErrors(errorsData);
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

                {/* System Overview */}
                <div className="bg-bg-primary rounded-xl border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <BoxIcon className="text-accent-purple" />
                        <h3 className="text-lg font-bold text-text-primary">{t("adminSystemOverview")}</h3>
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
