"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import MaintenanceRecordModal from "../components/forms/MaintenanceRecordModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { formatDateThai } from "../lib/dateUtils";
import { getMaintenanceRecords, deleteMaintenanceRecord, getMachines } from "../lib/firebaseService";
import { MaintenanceRecord, Machine } from "../types";
import {
    WrenchIcon,
    PlusIcon,
    CalendarIcon,
    UserIcon,
    ClockIcon,
    CheckIcon,
    AlertTriangleIcon,
    TrashIcon,
    SettingsIcon,
    ZapIcon,
    FileTextIcon,
    SearchIcon,
    FilterIcon,
    MapPinIcon,
    RefreshCwIcon,
    BoxIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ActivityIcon,
    TargetIcon,
} from "../components/ui/Icons";
import { mockMaintenanceRecords } from "../data/mockData";

import RecordDetailsModal from "../components/pm/RecordDetailsModal";

export default function MaintenancePage() {
    const { t } = useLanguage();
    const { checkAuth, isAdmin } = useAuth();
    const { success, error } = useToast();
    const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());


    // Expanded Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMachine, setSelectedMachine] = useState("all");
    const [selectedLocation, setSelectedLocation] = useState("all");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [allRecordsForStats, setAllRecordsForStats] = useState<MaintenanceRecord[]>([]);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);
    const [mounted, setMounted] = useState(false);
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const toggleExpand = (id: string) => {
        setExpandedRecords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const [recordsData, machinesData] = await Promise.all([
                getMaintenanceRecords(),
                getMachines()
            ]);

            setAllRecordsForStats(recordsData);
            // Only show preventive maintenance records as the primary list on this page
            const preventiveData = recordsData.filter(r => r.type === 'preventive');
            setRecords(preventiveData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setAllMachines(machinesData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            record.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMachine = selectedMachine === "all" || record.machineId === selectedMachine || record.machineName === selectedMachine;

        // Location (Area) matching logic
        let matchesLocation = selectedLocation === "all";
        if (!matchesLocation) {
            // First try record.Location, then fallback to looking up the machine
            let recordLocation = record.Location?.toUpperCase() || "";

            if (!recordLocation) {
                const machine = allMachines.find(m => m.id === record.machineId || m.name === record.machineName);
                recordLocation = machine?.location?.toUpperCase() || machine?.Location?.toUpperCase() || "";
            }

            if (selectedLocation === "UT") {
                matchesLocation = recordLocation === "UT" || recordLocation === "UTILITY";
            } else {
                matchesLocation = recordLocation === selectedLocation;
            }
        }

        const recordDate = new Date(record.date);
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        const matchesMonth = selectedMonth === "all" || recordMonth === selectedMonth;

        return matchesSearch && matchesMachine && matchesLocation && matchesMonth;
    });

    const getMonthOptions = () => {
        const months = new Set<string>();
        records.forEach(r => {
            const d = new Date(r.date);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(months).sort().reverse();
    };

    const handleDeleteClick = (record: MaintenanceRecord) => {
        setRecordToDelete(record);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;

        try {
            await deleteMaintenanceRecord(recordToDelete.id);
            // Optimistic update
            setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
            success(t("msgDeleteSuccess") || "ลบข้อมูลเรียบร้อยแล้ว");
        } catch (err) {
            console.error("Error deleting record:", err);
            error(t("msgDeleteError") || "เกิดข้อผิดพลาดในการลบข้อมูล");
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
                {/* Page Header and Filters */}
                <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-red/20 flex items-center justify-center">
                                <SettingsIcon size={20} className="text-accent-red" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-text-primary">{t("maintenancePageTitle")}</h1>
                                <p className="text-sm text-text-muted">{t("maintenanceHistoryTitle")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Search and Filter UI */}
                    <div className="bg-bg-secondary/40 p-4 rounded-2xl border border-border-light/50 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 group">
                                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-accent-blue" />
                                <input
                                    type="text"
                                    placeholder={t("placeholderSearchHistory") || "ค้นหาข่าง, รายละเอียด..."}
                                    className="input h-10 w-full pl-10 text-sm bg-bg-secondary/60 border-border-light/40 focus:border-accent-blue/30"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                className={`h-10 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 relative overflow-hidden
                                    ${isFilterExpanded
                                        ? 'bg-accent-blue/20 text-white border-accent-blue/40 shadow-[0_0_15px_rgba(0,149,255,0.2)]'
                                        : 'bg-bg-secondary/60 text-text-muted border-border-light/40 hover:bg-bg-secondary/80'}
                                    border hover:shadow-[0_0_10px_rgba(0,149,255,0.1)] group`}
                            >
                                <FilterIcon size={16} className={`${isFilterExpanded ? 'text-accent-blue' : 'text-text-muted'}`} />
                                <span className="text-xs font-bold whitespace-nowrap hidden sm:block">
                                    {isFilterExpanded ? t("filterHide") || 'ซ่อนตัวกรอง' : t("filterShow") || 'ตัวกรอง'}
                                </span>
                                {/* Glowing indicator */}
                                {!isFilterExpanded && (
                                    <div className="absolute right-0 top-0 h-full w-1 bg-accent-blue animate-pulse opacity-50 shadow-[0_0_8px_rgba(0,149,255,0.8)]" />
                                )}
                            </button>
                        </div>

                        {/* Expandable Dropdowns */}
                        {isFilterExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                                <div className="flex items-center gap-2 bg-bg-secondary/40 p-1.5 rounded-xl border border-border-light/30">
                                    <MapPinIcon size={14} className="text-text-muted shrink-0 ml-1.5" />
                                    <select
                                        className="bg-transparent border-0 focus:ring-0 text-xs w-full h-8 text-text-primary appearance-none cursor-pointer"
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllLocations")}</option>
                                        {["FZ", "RTE", "UT"].map(z => (
                                            <option key={z} value={z} className="bg-bg-secondary">{z}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon size={14} className="text-text-muted mr-1.5 pointer-events-none" />
                                </div>
                                <div className="flex items-center gap-2 bg-bg-secondary/40 p-1.5 rounded-xl border border-border-light/30">
                                    <SettingsIcon size={14} className="text-text-muted shrink-0 ml-1.5" />
                                    <select
                                        className="bg-transparent border-0 focus:ring-0 text-xs w-full h-8 text-text-primary appearance-none cursor-pointer"
                                        value={selectedMachine}
                                        onChange={(e) => setSelectedMachine(e.target.value)}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllMachines")}</option>
                                        {allMachines.filter(m => {
                                            if (selectedLocation === 'all') return true;
                                            const loc = m.location?.toUpperCase() || m.Location?.toUpperCase() || "";
                                            if (selectedLocation === 'UT') return loc === 'UT' || loc === 'UTILITY';
                                            return loc === selectedLocation;
                                        }).map(m => (
                                            <option key={m.id} value={m.id} className="bg-bg-secondary">{m.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon size={14} className="text-text-muted mr-1.5 pointer-events-none" />
                                </div>
                                <div className="flex items-center gap-2 bg-bg-secondary/40 p-1.5 rounded-xl border border-border-light/30">
                                    <CalendarIcon size={14} className="text-text-muted shrink-0 ml-1.5" />
                                    <select
                                        className="bg-transparent border-0 focus:ring-0 text-xs w-full h-8 text-text-primary appearance-none cursor-pointer"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllTime")}</option>
                                        {getMonthOptions().map(m => (
                                            <option key={m} value={m} className="bg-bg-secondary">
                                                {new Date(m).toLocaleDateString(t("language") === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon size={14} className="text-text-muted mr-1.5 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Location Shortcut Buttons */}
                        <div className="flex flex-col gap-4 pt-2 border-t border-border-light/10">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'ทั้งหมด', color: 'accent-blue' },
                                    { id: 'FZ', label: 'FZ', color: 'accent-cyan' },
                                    { id: 'RTE', label: 'RTE', color: 'accent-green' },
                                    { id: 'UT', label: 'UT', color: 'accent-yellow' }
                                ].map((loc) => (
                                    <button
                                        key={loc.id}
                                        onClick={() => setSelectedLocation(loc.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2
                                                ${selectedLocation === loc.id
                                                ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg`
                                                : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary hover:border-border-light/50'}`}
                                    >
                                        {loc.label}
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedLocation === loc.id ? `bg-${loc.color} text-white` : 'bg-bg-secondary/60 text-text-muted'}`}>
                                            {loc.id === 'all' ? records.length : records.filter(r => {
                                                // Count logic should match filtering logic
                                                let recordLocation = r.Location?.toUpperCase() || "";
                                                if (!recordLocation) {
                                                    const m = allMachines.find(mach => mach.id === r.machineId || mach.name === r.machineName);
                                                    recordLocation = m?.location?.toUpperCase() || m?.Location?.toUpperCase() || "";
                                                }

                                                if (loc.id === 'UT') return recordLocation === 'UT' || recordLocation === 'UTILITY';
                                                return recordLocation === loc.id;
                                            }).length}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
                                <p>{t("statFoundHistoryPrefix") || "พบประวัติทั้งหมด"} <span className="text-text-primary font-bold">{filteredRecords.length}</span> {t("statFoundHistorySuffix") || "รายการ"}</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_5px_rgba(0,149,255,0.5)]" />
                                        <span>PM: <span className="text-text-primary font-bold">{allRecordsForStats.filter(r => r.type === 'preventive').length}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_5px_rgba(0,255,149,0.5)]" />
                                        <span>Overhaul: <span className="text-text-primary font-bold">{allRecordsForStats.filter(r => r.type === 'partReplacement').length}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                    </div>
                )}

                {/* Maintenance Records */}
                {!loading && (
                    <div className="space-y-4">
                        {filteredRecords.map((record, index) => {
                            const isExpanded = expandedRecords.has(record.id);
                            const hasMotorData = record.motorGearData && (record.motorGearData.motorSize || record.motorGearData.temperature || record.motorGearData.currentIdle || record.motorGearData.currentLoad || record.motorGearData.voltageL1);
                            const hasShaftData = record.motorGearData?.shaftData && (record.motorGearData.shaftData.shaftBend || record.motorGearData.shaftData.dialGauge);
                            const hasVibrationData = record.motorGearData && (record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value);

                            return (
                                <div
                                    key={record.id}
                                    className="card animate-fade-in-up overflow-hidden"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Compact Header - Always Visible */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                                                <WrenchIcon size={20} className="text-accent-green" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-text-primary truncate">{record.machineName}</h3>
                                                    {(record.Location || allMachines.find(m => m.id === record.machineId)?.Location) && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase
                                                            ${(record.Location || allMachines.find(m => m.id === record.machineId)?.Location)?.toUpperCase() === 'FZ' ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan' :
                                                                (record.Location || allMachines.find(m => m.id === record.machineId)?.Location)?.toUpperCase() === 'RTE' ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' :
                                                                    (record.Location || allMachines.find(m => m.id === record.machineId)?.Location)?.toUpperCase() === 'UT' || (record.Location || allMachines.find(m => m.id === record.machineId)?.Location)?.toUpperCase() === 'UTILITY' ? 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow' :
                                                                        'bg-bg-tertiary border-border-light text-text-muted'}
                                                        `}>
                                                            {record.Location || allMachines.find(m => m.id === record.machineId)?.Location}
                                                        </span>
                                                    )}
                                                    {/* Machine Location (FZ, RTE, UT) */}
                                                    {allMachines.find(m => m.id === record.machineId)?.location && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase
                                                            ${allMachines.find(m => m.id === record.machineId)?.location?.toUpperCase() === 'FZ' ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan' :
                                                                allMachines.find(m => m.id === record.machineId)?.location?.toUpperCase() === 'RTE' ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' :
                                                                    allMachines.find(m => m.id === record.machineId)?.location?.toUpperCase() === 'UT' || allMachines.find(m => m.id === record.machineId)?.location?.toUpperCase() === 'UTILITY' ? 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow' :
                                                                        'bg-bg-tertiary border-border-light text-text-muted'}
                                                        `}>
                                                            {allMachines.find(m => m.id === record.machineId)?.location}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-muted truncate">{record.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {getPriorityIcon(record.priority)}
                                            <span className={`badge text-[10px] ${getStatusColor(record.status)}`}>
                                                {getStatusText(record.status)}
                                            </span>
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(record);
                                                    }}
                                                    className="p-1 rounded-full hover:bg-accent-red/20 text-text-muted hover:text-accent-red transition-colors"
                                                    title={t("actionDelete")}
                                                >
                                                    <TrashIcon size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Summary Row */}
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon size={12} />
                                            {mounted ? formatDateThai(record.date) : '--/--/----'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <UserIcon size={12} />
                                            {record.technician}
                                        </span>
                                        <span className="badge badge-primary text-[9px]">
                                            {getTypeText(record.type)}
                                        </span>
                                    </div>

                                    {/* Expand/Collapse Button */}
                                    <button
                                        onClick={() => toggleExpand(record.id)}
                                        className="w-full mt-3 pt-2 border-t border-border-light flex items-center justify-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                                    >
                                        <span>{isExpanded ? t("filterHide") : t("filterShow")}</span>
                                        <ChevronDownIcon size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expandable Details */}
                                    {isExpanded && (
                                        <div className="mt-2 space-y-2 animate-fade-in">
                                            {/* Section 1: ข้อมูลทั่วไป & Motor/Gear (Grid Layout) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {/* ข้อมูลทั่วไป */}
                                                <div className="bg-bg-tertiary/50 p-2 rounded-lg border border-border-light">
                                                    <h4 className="text-[11px] font-bold text-primary mb-1 pb-1 border-b border-border-light flex items-center gap-1.5">
                                                        <FileTextIcon size={10} />
                                                        ข้อมูลทั่วไป
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-muted">ประเภท:</span>
                                                            <span className="text-text-primary">{getTypeText(record.type)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-muted">ช่าง:</span>
                                                            <span className="text-text-primary truncate ml-1">{record.technician}</span>
                                                        </div>
                                                        {record.duration && (
                                                            <div className="flex items-center justify-between col-span-2">
                                                                <span className="text-text-muted">ระยะเวลา:</span>
                                                                <span className="text-text-primary">{record.duration} วัน</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ข้อมูล Motor/Gear */}
                                                {hasMotorData && (
                                                    <div className="bg-bg-tertiary/50 p-2 rounded-lg border border-border-light">
                                                        <h4 className="text-[11px] font-bold text-accent-cyan mb-1 pb-1 border-b border-border-light flex items-center gap-1.5">
                                                            <ActivityIcon size={10} />
                                                            ข้อมูล Motor/Gear
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                                                            {record.motorGearData?.motorSize && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-text-muted">ขนาด:</span>
                                                                    <span className="text-text-primary">{record.motorGearData.motorSize}</span>
                                                                </div>
                                                            )}
                                                            {record.motorGearData?.temperature && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-text-muted">Temp:</span>
                                                                    <span className="text-text-primary">{record.motorGearData.temperature}°C</span>
                                                                </div>
                                                            )}
                                                            {(record.motorGearData?.currentIdle || record.motorGearData?.currentLoad) && (
                                                                <div className="flex items-center justify-between col-span-2">
                                                                    <span className="text-text-muted">Amp (Idle/Load):</span>
                                                                    <span className="text-text-primary">{record.motorGearData.currentIdle || '-'} / {record.motorGearData.currentLoad || '-'} A</span>
                                                                </div>
                                                            )}
                                                            {(record.motorGearData?.voltageL1 || record.motorGearData?.voltageL2 || record.motorGearData?.voltageL3) && (
                                                                <div className="flex items-center justify-between col-span-2">
                                                                    <span className="text-text-muted">Volt:</span>
                                                                    <span className="text-accent-cyan font-mono text-[10px]">{record.motorGearData?.voltageL1 || '-'}/{record.motorGearData?.voltageL2 || '-'}/{record.motorGearData?.voltageL3 || '-'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Section 2: Shaft & Vibration */}
                                            {(hasShaftData || hasVibrationData) && (
                                                <div className="bg-bg-tertiary/50 p-2 rounded-lg border border-border-light">
                                                    <h4 className="text-[11px] font-bold text-accent-green mb-1 pb-1 border-b border-border-light flex items-center gap-1.5">
                                                        <TargetIcon size={10} />
                                                        ข้อมูล Shaft & Vibration
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                                                        {record.motorGearData?.shaftData?.shaftBend && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-text-muted">Shaft Bend:</span>
                                                                <span className="text-text-primary">{record.motorGearData.shaftData.shaftBend} mm</span>
                                                            </div>
                                                        )}
                                                        {record.motorGearData?.shaftData?.dialGauge && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-text-muted">Dial Gauge:</span>
                                                                <span className="text-text-primary">{record.motorGearData.shaftData.dialGauge} mm</span>
                                                            </div>
                                                        )}
                                                        {hasVibrationData && (
                                                            <div className="flex items-center col-span-2 mt-0.5 pt-0.5 border-t border-white/5">
                                                                <span className="text-text-muted mr-2">Vibration:</span>
                                                                <div className="flex gap-1">
                                                                    {[{ l: 'X', d: record.motorGearData?.vibrationX }, { l: 'Y', d: record.motorGearData?.vibrationY }, { l: 'Z', d: record.motorGearData?.vibrationZ }].map((v, i) =>
                                                                        v.d?.value ? (
                                                                            <span key={i} className={`px-1 py-0 rounded text-[9px] font-medium border ${v.d.level === 'normal' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' : v.d.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20' : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}>
                                                                                {v.l}:{v.d.value}
                                                                            </span>
                                                                        ) : null
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 3: Checklist - Compact List */}
                                            {record.checklist && record.checklist.length > 0 && (
                                                <div className="bg-bg-tertiary/50 p-2 rounded-lg border border-border-light">
                                                    <h4 className="text-[11px] font-bold text-accent-yellow mb-1 pb-1 border-b border-border-light flex items-center gap-1.5">
                                                        <CheckIcon size={10} />
                                                        รายการตรวจสอบ
                                                    </h4>
                                                    <div className="space-y-0.5">
                                                        {record.checklist.map((item, idx) => {
                                                            // Check if value is JSON (specifically vibration data)
                                                            let isVibrationData = false;
                                                            let vibrationObj: any = null;

                                                            if (item.value && item.value.startsWith('{') && item.value.includes('"x":')) {
                                                                try {
                                                                    vibrationObj = JSON.parse(item.value);
                                                                    isVibrationData = true;
                                                                } catch (e) { }
                                                            }

                                                            return (
                                                                <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 hover:bg-white/5 px-1 rounded transition-colors">
                                                                    <span className="text-text-secondary truncate flex-1 mr-2">{item.item}</span>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        {isVibrationData && vibrationObj ? (
                                                                            <div className="flex gap-1">
                                                                                {['x', 'y', 'z'].map((axis) => vibrationObj[axis] && (
                                                                                    <span key={axis} className={`px-1 rounded text-[9px] ${vibrationObj[axis].status === 'warning' ? 'text-accent-yellow bg-accent-yellow/10' : vibrationObj[axis].status === 'danger' ? 'text-accent-red bg-accent-red/10' : 'text-accent-green bg-accent-green/10'}`}>
                                                                                        {axis.toUpperCase()}:{vibrationObj[axis].value}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : item.value && (
                                                                            <span className="text-accent-cyan font-mono text-[10px]">{item.value}</span>
                                                                        )}
                                                                        {item.completed ? (
                                                                            <CheckIcon size={12} className="text-accent-green" />
                                                                        ) : (
                                                                            <span className="text-accent-red text-[10px] font-bold">✕</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 4: Details & Notes */}
                                            {(record.details || record.notes) && (
                                                <div className="bg-bg-tertiary/50 p-2 rounded-lg border border-border-light">
                                                    {record.details && !record.details.includes('{') && (
                                                        <div className="mb-2 last:mb-0">
                                                            <h4 className="text-[11px] font-bold text-text-secondary mb-0.5 flex items-center gap-1.5">
                                                                <FileTextIcon size={10} /> รายละเอียด
                                                            </h4>
                                                            <p className="text-[11px] text-text-muted leading-snug">{record.details}</p>
                                                        </div>
                                                    )}
                                                    {record.notes && (
                                                        <div className="pt-2 border-t border-border-light/50 first:pt-0 first:border-0">
                                                            <h4 className="text-[11px] font-bold text-text-secondary mb-0.5 flex items-center gap-1.5">
                                                                <FileTextIcon size={10} /> หมายเหตุ
                                                            </h4>
                                                            <p className="text-[11px] text-text-muted italic leading-snug">{record.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && filteredRecords.length === 0 && (
                    <div className="empty-state py-12">
                        <WrenchIcon size={48} className="text-text-muted mb-3" />
                        <p className="text-text-primary font-medium mb-1">{t("msgNoData")}</p>
                        <p className="text-text-muted text-sm">{t("msgNoHistory")}</p>
                    </div>
                )}
            </main>

            <MobileNav />

            <MaintenanceRecordModal
                isOpen={maintenanceModalOpen}
                onClose={() => setMaintenanceModalOpen(false)}
                onSuccess={fetchRecords}
            />

            <RecordDetailsModal
                isOpen={!!selectedRecord}
                onClose={() => setSelectedRecord(null)}
                record={selectedRecord}
            />

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t("titleConfirmDelete") || "ยืนยันการลบ"}
                message={`${t("confirmDeleteMessage") || "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?"} ${recordToDelete ? `"${recordToDelete.machineName} - ${recordToDelete.description}"` : ""}`}
                isDestructive={true}
                confirmText={t("actionDelete") || "ลบ"}
            />
        </div>
    );
}
