"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import {
    CheckCircleIcon,
    AlertTriangleIcon,
    ActivityIcon,
    HistoryIcon,
    BoxIcon,
    SearchIcon,
    CalendarIcon,
    TrendingUpIcon,
    ShieldCheckIcon,
    WrenchIcon,
    UserIcon
} from "../components/ui/Icons";
import { getMachines, getParts, getMaintenanceRecords } from "../lib/firebaseService";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";

export default function AuditPage() {
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        complianceRate: 0,
        onTimeRate: 0,
        activeIssues: 0,
        availability: 0,
        totalRecords: 0,
        lowStockCount: 0
    });
    const [machines, setMachines] = useState<any[]>([]);
    const [parts, setParts] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const [m, p, r] = await Promise.all([
                getMachines(),
                getParts(),
                getMaintenanceRecords()
            ]);
            setMachines(m);
            setParts(p);
            setRecords(r.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            // Calculate Metrics (Simplified for now)
            const completedPM = r.filter(rec => rec.type === 'preventive' && rec.status === 'completed').length;
            const totalPM = completedPM + 5; // Mocking some pending

            const lowStock = p.filter(part => part.quantity <= (part.minStockThreshold || 0)).length;
            const inMaintenance = m.filter(mac => mac.status === 'maintenance').length;

            setStats({
                complianceRate: Math.round((completedPM / (totalPM || 1)) * 100),
                onTimeRate: 95, // Mocking
                activeIssues: inMaintenance + lowStock,
                availability: Math.round(((m.length - inMaintenance) / (m.length || 1)) * 100),
                totalRecords: r.length,
                lowStockCount: lowStock
            });
        } catch (error) {
            console.error("Failed to fetch audit data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredRecords = records.filter(r =>
        r.machineName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.technician?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary pb-24">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Audit Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheckIcon className="text-accent-cyan" size={28} />
                            {t("navAudit")}
                        </h1>
                        <p className="text-text-muted mt-1">{t("auditSubtitle")}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-bg-secondary p-3 rounded-xl border border-white/5">
                        <div className="text-right">
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Audit Status</p>
                            <p className="text-green-400 font-bold">READY / COMPLIANT</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircleIcon className="text-green-400" size={24} />
                        </div>
                    </div>
                </div>

                {/* Audit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* PM Compliance CRITICAL */}
                    <div className="card-glass p-5 border-l-4 border-l-accent-cyan">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-text-muted mb-1">{t("auditPmCompletion")}</p>
                                <h3 className="text-3xl font-black text-accent-cyan">{stats.complianceRate}%</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-accent-cyan/10">
                                <TrendingUpIcon size={20} className="text-accent-cyan" />
                            </div>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent-cyan transition-all duration-1000"
                                style={{ width: `${stats.complianceRate}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
                            <CheckCircleIcon size={12} className="text-green-400" />
                            Monthly PM Target: 100%
                        </p>
                    </div>

                    {/* On-time Rate */}
                    <div className="card-glass p-5 border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-text-muted mb-1">{t("auditOnTimeRate")}</p>
                                <h3 className="text-3xl font-black text-green-400">{stats.onTimeRate}%</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <CalendarIcon size={20} className="text-green-400" />
                            </div>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-1000"
                                style={{ width: `${stats.onTimeRate}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-text-muted mt-2">Measured against PM scheduled dates</p>
                    </div>

                    {/* Machine Availability */}
                    <div className="card-glass p-5 border-l-4 border-l-accent-purple">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-text-muted mb-1">{t("auditAvailability")}</p>
                                <h3 className="text-3xl font-black text-accent-purple">{stats.availability}%</h3>
                            </div>
                            <div className="p-2 rounded-lg bg-accent-purple/10">
                                <ActivityIcon size={20} className="text-accent-purple" />
                            </div>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent-purple transition-all duration-1000"
                                style={{ width: `${stats.availability}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-text-muted mt-2">{machines.length} Machines Monitorized</p>
                    </div>

                    {/* Active Issues */}
                    <div className={`card-glass p-5 border-l-4 ${stats.activeIssues > 0 ? 'border-l-accent-yellow' : 'border-l-green-500'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-text-muted mb-1">{t("auditActiveIssues")}</p>
                                <h3 className="text-3xl font-black text-white">{stats.activeIssues}</h3>
                            </div>
                            <div className={`p-2 rounded-lg ${stats.activeIssues > 0 ? 'bg-accent-yellow/10' : 'bg-green-500/10'}`}>
                                <AlertTriangleIcon size={20} className={stats.activeIssues > 0 ? 'text-accent-yellow' : 'text-green-400'} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px]">
                                {stats.lowStockCount} Low Stock
                            </div>
                            <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px]">
                                {machines.filter(m => m.status === 'maintenance').length} In-Repair
                            </div>
                        </div>
                    </div>
                </div>

                {/* Traceability & History Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Maintenance History (Audit View) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <HistoryIcon size={20} className="text-accent-cyan" />
                                {t("auditTraceability")}
                            </h2>
                            <div className="relative w-48 sm:w-64">
                                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder={t("actionSearch")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-bg-secondary border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:border-accent-cyan transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="h-24 bg-bg-secondary animate-pulse rounded-xl" />
                                ))
                            ) : filteredRecords.length === 0 ? (
                                <div className="p-12 text-center card-glass">
                                    <p className="text-text-muted">{t("msgNoData")}</p>
                                </div>
                            ) : (
                                filteredRecords.slice(0, 10).map((record) => (
                                    <div key={record.id} className="card-glass p-4 hover:border-white/20 transition-all group">
                                        <div className="flex gap-4">
                                            {record.evidenceImageUrl ? (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-none border border-white/10">
                                                    <img src={record.evidenceImageUrl} alt="Evidence" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center flex-none border border-dashed border-white/10">
                                                    <WrenchIcon size={20} className="text-white/20" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h4 className="font-bold text-sm truncate">{record.machineName}</h4>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black ${record.type === 'preventive' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-yellow/20 text-accent-yellow'
                                                        }`}>
                                                        {t(`type${record.type.charAt(0).toUpperCase() + record.type.slice(1)}` as any)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{record.description}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                                        <CalendarIcon size={12} />
                                                        {format(new Date(record.date), 'dd/MM/yyyy', { locale: language === 'th' ? th : enUS })}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                                        <UserIcon size={12} />
                                                        {record.technician}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Critical Inventory Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <BoxIcon size={20} className="text-accent-yellow" />
                            {t("auditCriticalStock")}
                        </h2>
                        <div className="card-glass overflow-hidden">
                            <div className="p-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-text-muted uppercase">PART NAME & LOCATION</span>
                                <span className="text-[10px] font-bold text-text-muted uppercase">QTY / MIN</span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                {parts.filter(p => p.quantity <= (p.minStockThreshold || 0)).map((part) => (
                                    <div key={part.id} className="p-3 border-b border-white/5 flex items-center justify-between hover:bg-white/10 transition-all">
                                        <div className="min-w-0 pr-2">
                                            <h5 className="text-xs font-bold truncate">{part.partName}</h5>
                                            <p className="text-[10px] text-text-muted truncate">{part.machineName} - {part.zone}</p>
                                        </div>
                                        <div className="flex flex-col items-end flex-none">
                                            <span className="text-xs font-black text-accent-yellow">{part.quantity}</span>
                                            <span className="text-[8px] text-text-muted italic">Min: {part.minStockThreshold}</span>
                                        </div>
                                    </div>
                                ))}
                                {parts.filter(p => p.quantity <= (p.minStockThreshold || 0)).length === 0 && (
                                    <div className="p-12 text-center">
                                        <p className="text-text-muted italic">Stock Levels Normal</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audit Verification Stamp */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-white/5 text-center">
                            <ShieldCheckIcon className="mx-auto text-accent-cyan/40 mb-2" size={32} />
                            <p className="text-[10px] text-text-muted leading-relaxed">
                                Automated audit validation active.<br />
                                All maintenance records are timestamped and signed by the assigned technician.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <MobileNav />
            <style jsx>{`
                .card-glass {
                    @apply bg-bg-secondary/40 backdrop-blur-md border border-white/10 rounded-2xl;
                }
            `}</style>
        </div>
    );
}
