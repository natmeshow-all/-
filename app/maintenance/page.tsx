"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import MaintenanceRecordModal from "../components/forms/MaintenanceRecordModal";
import { useLanguage } from "../contexts/LanguageContext";
import { formatDateThai } from "../lib/dateUtils";
import { getMaintenanceRecords } from "../lib/firebaseService";
import { MaintenanceRecord } from "../types";
import {
    WrenchIcon,
    PlusIcon,
    CalendarIcon,
    UserIcon,
    ClockIcon,
    CheckIcon,
    AlertTriangleIcon,
} from "../components/ui/Icons";
import { mockMaintenanceRecords } from "../data/mockData";

export default function MaintenancePage() {
    const { t } = useLanguage();
    const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const data = await getMaintenanceRecords();
            setRecords(data);
        } catch (error) {
            console.error("Error fetching records:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchRecords();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "badge-success";
            case "inProgress": return "badge-warning";
            case "pending": return "badge-danger";
            default: return "badge-primary";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "completed": return t("maintenanceStatusCompleted");
            case "inProgress": return t("maintenanceStatusInProgress");
            case "pending": return t("maintenanceStatusPending");
            default: return status;
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case "urgent": return <AlertTriangleIcon size={14} className="text-accent-red" />;
            case "high": return <AlertTriangleIcon size={14} className="text-accent-yellow" />;
            default: return <CheckIcon size={14} className="text-accent-green" />;
        }
    };

    const getTypeText = (type: string) => {
        const typeMap: Record<string, string> = {
            preventive: t("typePreventive"),
            corrective: t("typeCorrective"),
            oilChange: t("typeOilChange"),
            partReplacement: t("typePartReplacement"),
            inspection: t("typeInspection"),
        };
        return typeMap[type] || type;
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center">
                            <WrenchIcon size={20} className="text-accent-green" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navMaintenance")}</h1>
                            <p className="text-sm text-text-muted">
                                {loading ? "Loading..." : `${records.length} รายการ`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setMaintenanceModalOpen(true)}
                        className="btn btn-primary"
                    >
                        <PlusIcon size={18} />
                        <span className="hidden sm:inline">{t("actionRecordMaintenance")}</span>
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {/* Maintenance Records */}
                {!loading && (
                    <div className="space-y-4">
                        {records.map((record, index) => (
                            <div
                                key={record.id}
                                className="card hover-lift cursor-pointer animate-fade-in-up"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-cyan/20 flex items-center justify-center">
                                            <WrenchIcon size={24} className="text-accent-green" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-text-primary">{record.machineName}</h3>
                                            <p className="text-sm text-text-muted">{record.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getPriorityIcon(record.priority)}
                                        <span className={`badge ${getStatusColor(record.status)}`}>
                                            {getStatusText(record.status)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <CalendarIcon size={14} />
                                        {mounted && <span>{formatDateThai(record.date)}</span>}
                                        {!mounted && <span>--/--/----</span>}
                                    </div>
                                    {record.duration && (
                                        <div className="flex items-center gap-2 text-text-muted">
                                            <ClockIcon size={14} />
                                            <span>{record.duration} นาที</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <UserIcon size={14} />
                                        <span>{record.technician}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="badge badge-primary text-xs">
                                            {getTypeText(record.type)}
                                        </span>
                                    </div>
                                </div>

                                {/* Motor/Gear Data Summary */}
                                {record.motorGearData && (
                                    <div className="mt-3 pt-3 border-t border-border-light">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            {record.motorGearData.motorSize && (
                                                <div className="text-text-muted">
                                                    <span className="text-text-secondary">Motor:</span> {record.motorGearData.motorSize}
                                                </div>
                                            )}
                                            {record.motorGearData.temperature && (
                                                <div className="text-text-muted">
                                                    <span className="text-text-secondary">Temp:</span> {record.motorGearData.temperature}°C
                                                </div>
                                            )}
                                            {record.motorGearData.shaftData && (
                                                <>
                                                    <div className="text-text-muted">
                                                        <span className="text-text-secondary">Shaft:</span> {record.motorGearData.shaftData.shaftBend} mm
                                                    </div>
                                                    <div className="text-text-muted">
                                                        <span className="text-text-secondary">Dial:</span> {record.motorGearData.shaftData.dialGauge} mm
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {record.notes && (
                                    <div className="mt-3 pt-3 border-t border-border-light">
                                        <p className="text-sm text-text-muted italic">{record.notes}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!loading && records.length === 0 && (
                    <div className="empty-state py-12">
                        <WrenchIcon size={48} className="text-text-muted mb-3" />
                        <p className="text-text-primary font-medium mb-1">{t("msgNoData")}</p>
                        <p className="text-text-muted text-sm">ยังไม่มีประวัติการซ่อมบำรุง</p>
                    </div>
                )}
            </main>

            <MobileNav />

            <MaintenanceRecordModal
                isOpen={maintenanceModalOpen}
                onClose={() => setMaintenanceModalOpen(false)}
                onSuccess={fetchRecords}
            />
        </div>
    );
}
