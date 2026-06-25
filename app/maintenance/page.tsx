"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import MaintenanceRecordModal from "../components/forms/MaintenanceRecordModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { formatDateThai } from "../lib/dateUtils";
import { getMaintenanceRecordsPaginated, deleteMaintenanceRecord, getMachines } from "../lib/firebaseService";
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
    ImageIcon,
} from "../components/ui/Icons";

import RecordDetailsModal from "../components/pm/RecordDetailsModal";
import PartReplacementPlanModal from "../components/pm/PartReplacementPlanModal";

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
    const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'thisMonth' | 'thisWeek' | 'yearly'>('all');
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [allRecordsForStats, setAllRecordsForStats] = useState<MaintenanceRecord[]>([]);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);
    const [mounted, setMounted] = useState(false);

    // Part Replacement Plan Modal State
    const [replacementPlanOpen, setReplacementPlanOpen] = useState(false);
    const [replacementPlanMachineId, setReplacementPlanMachineId] = useState("");
    const [replacementPlanMachineName, setReplacementPlanMachineName] = useState("");
    const openReplacementPlan = (machineId: string, machineName: string) => {
        setReplacementPlanMachineId(machineId);
        setReplacementPlanMachineName(machineName);
        setReplacementPlanOpen(true);
    };
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [allFetchedRecords, setAllFetchedRecords] = useState<MaintenanceRecord[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<{ date: string, key: string } | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

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

    const uniqueMonths = useMemo(() => {
        const months = new Set<string>();
        records.forEach(r => {
            const d = new Date(r.date);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(months).sort().reverse();
    }, [records]);

    const fetchInitialRecords = async () => {
        setLoading(true);
        try {
            const [paginatedData, machinesData] = await Promise.all([
                getMaintenanceRecordsPaginated(PAGE_SIZE),
                getMachines()
            ]);

            const { records: newRecords, nextCursor } = paginatedData;

            setAllFetchedRecords(newRecords);
            setAllRecordsForStats(newRecords);

            // Only show preventive maintenance records as the primary list on this page
            // Note: This filters from the currently fetched batch. 
            // Users may need to "Load More" to see older preventive records if the recent batch is full of other types.
            const preventiveData = newRecords.filter(r => r.type === 'preventive');
            setRecords(preventiveData);

            setCursor(nextCursor);
            setHasMore(!!nextCursor);
            setAllMachines(machinesData);
        } catch (error) {
            console.error("Error loading maintenance records:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!cursor || loadingMore) return;

        setLoadingMore(true);
        try {
            const { records: newRecords, nextCursor } = await getMaintenanceRecordsPaginated(PAGE_SIZE, cursor.date, cursor.key);

            setAllFetchedRecords(prev => [...prev, ...newRecords]);
            setAllRecordsForStats(prev => [...prev, ...newRecords]);

            const newPreventiveData = newRecords.filter(r => r.type === 'preventive');
            setRecords(prev => [...prev, ...newPreventiveData]);

            setCursor(nextCursor);
            setHasMore(!!nextCursor);
        } catch (error) {
            console.error("Error loading more records:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchInitialRecords();
    }, []);

    // Helper for consistency between final logic and counts
    const getFrequencyType = (r: MaintenanceRecord) => {
        // 1. Check explicit period in record
        const p = r.period?.toLowerCase() || "";
        if (p.includes("week") || p.includes("daily") || p.includes("routine") || p.includes("สัปดาห์") || p.includes("วัน") || p.includes("ประจำวัน")) return 'weekly';
        if (p.includes("year") || p.includes("ปี")) return 'yearly';
        if (p.includes("month") || p.includes("เดือน")) return 'monthly';

        // 2. Fallback: Check Description/Details for keywords (for legacy records)
        const desc = (r.description + " " + (r.details || "")).toLowerCase();
        if (desc.includes("weekly") || desc.includes("routine") || desc.includes("สัปดาห์") || desc.includes("ประจำวัน")) return 'weekly';
        if (desc.includes("monthly") || desc.includes("เดือน") || desc.includes("ประจำเดือน")) return 'monthly';
        if (desc.includes("yearly") || desc.includes("annual") || desc.includes("ปี") || desc.includes("ประจำปี")) return 'yearly';

        // 3. Fallback: Check Machine Schedule (for PM tasks)
        if (r.type === 'preventive') {
            const machine = allMachines.find(m => m.id === r.machineId || m.name === r.machineName);
            // Check legacy maintenanceCycle (days)
            if (machine?.maintenanceCycle) {
                if (machine.maintenanceCycle <= 7) return 'weekly';
                if (machine.maintenanceCycle >= 360) return 'yearly';
            }
        }

        // Default to monthly if no other clues found
        return 'monthly';
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
            // First try record.location (FZ, RTE, UT), then fallback to machine location
            let recordLocation = record.location?.toUpperCase() || "";

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
        const now = new Date();

        let matchesTime = true;

        // Strict Frequency Filtering to prevent overlap
        if (activeQuickFilter === 'thisMonth') {
            // Show Monthly AND Legacy (undefined period)
            matchesTime = getFrequencyType(record) === 'monthly';
        } else if (activeQuickFilter === 'thisWeek') {
            // Show Only Explicit Weekly
            matchesTime = getFrequencyType(record) === 'weekly';
        } else if (activeQuickFilter === 'yearly') {
            // Show Only Explicit Yearly
            matchesTime = getFrequencyType(record) === 'yearly';
        } else {
            // 'all' filter - use dropdown month filter if set
            const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
            matchesTime = selectedMonth === "all" || recordMonth === selectedMonth;
        }

        return matchesSearch && matchesMachine && matchesLocation && matchesTime;
    });

    const getMonthOptions = () => uniqueMonths;

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
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            // Reset quick filter when manually selecting month
                                            if (e.target.value !== 'all') setActiveQuickFilter('all');
                                        }}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllTime")}</option>
                                        {uniqueMonths.map(m => (
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
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5
                                                ${selectedLocation === loc.id
                                                ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg`
                                                : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary hover:border-border-light/50'}`}
                                    >
                                        {loc.label}
                                        <span className={`px-1 py-0.5 rounded text-[9px] ${selectedLocation === loc.id ? `bg-${loc.color} text-white` : 'bg-bg-secondary/60 text-text-muted'}`}>
                                            {loc.id === 'all' ? records.length : records.filter(r => {
                                                // Count logic should match filtering logic
                                                let recordLocation = r.location?.toUpperCase() || "";
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

                            {/* Time Period Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border-light/10">
                                {[
                                    { id: 'all', label: t("labelAll") || "All", color: 'accent-blue' },
                                    { id: 'thisMonth', label: t("labelMonthly") || "Monthly", color: 'accent-cyan' },
                                    { id: 'thisWeek', label: t("labelWeekly") || "Weekly", color: 'accent-green' },
                                    { id: 'yearly', label: t("labelYearly") || "Yearly", color: 'accent-blue' }
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => { setActiveQuickFilter(filter.id as any); setSelectedMonth('all'); }}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5
                                                ${activeQuickFilter === filter.id
                                                ? `bg-${filter.color}/20 border-${filter.color}/40 text-white shadow-lg`
                                                : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary hover:border-border-light/50'}`}
                                    >
                                        {filter.label}
                                        <span className={`px-1 py-0.5 rounded text-[9px] ${activeQuickFilter === filter.id ? `bg-${filter.color} text-white` : 'bg-bg-secondary/60 text-text-muted'}`}>
                                            {/* Count Logic: Uses same frequency helper */}
                                            {filter.id === 'all' ? records.length : records.filter(r => {
                                                if (filter.id === 'thisMonth') return getFrequencyType(r) === 'monthly';
                                                if (filter.id === 'thisWeek') return getFrequencyType(r) === 'weekly';
                                                if (filter.id === 'yearly') return getFrequencyType(r) === 'yearly';
                                                return false;
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
                        <div className="animate-spin rounded-full h-8 w-8 text-accent-blue" style={{ border: '2px solid currentColor', borderTopColor: 'transparent' }}></div>
                    </div>
                )}

                {/* Maintenance Records */}
                {!loading && (
                    <div className="space-y-4">
                        {/* Helper: calculate efficiency from checklist */}
                        {filteredRecords.map((record, index) => {
                            const isExpanded = expandedRecords.has(record.id);
                            const hasMotorData = record.motorGearData && (record.motorGearData.motorSize || record.motorGearData.temperature || record.motorGearData.currentIdle || record.motorGearData.currentLoad || record.motorGearData.voltageL1);
                            const hasShaftData = record.motorGearData?.shaftData && (record.motorGearData.shaftData.shaftBend || record.motorGearData.shaftData.dialGauge);
                            const hasVibrationData = record.motorGearData && (record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value);
                            const machine = allMachines.find(m => m.id === record.machineId || m.name === record.machineName);

                            // === Efficiency Calculation ===
                            const scoreValue = (val: string): number => {
                                const v = val.toLowerCase();
                                if (v.includes('ถึงกำหนดเปลี่ยน')) return 10;
                                if (v.includes('ผิดปกติ')) return 15;
                                if (v.includes('ไม่มี')) return 20;
                                if (v.includes('ต้องเติม')) return 30;
                                if (v.includes('เฝ้าระวัง')) return 50;
                                if (v.includes('พอใช้')) return 65;
                                if (v.includes('เหมาะสม')) return 80;
                                if (v.includes('สมบูรณ์') || v.includes('ปกติ') || v.includes('เรียบร้อย') || v.includes('ไม่มีรอย')) return 100;
                                if (val !== '') return 75; // has a numeric/custom value → generally OK
                                return 0; // empty = not assessed
                            };

                            const checklistItems = record.checklist || [];
                            const assessed = checklistItems.filter(c => c.value && c.value.trim() !== '');
                            const efficiencyPct = assessed.length > 0
                                ? Math.round(assessed.reduce((sum, c) => sum + scoreValue(c.value || ''), 0) / assessed.length)
                                : (record.status === 'completed' ? 100 : 0);

                            // Compare with previous record of same machine
                            const prevRecord = allFetchedRecords
                                .filter(r => r.machineId === record.machineId && r.id !== record.id && (r.checklist?.length ?? 0) > 0)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            let prevEfficiency: number | null = null;
                            if (prevRecord?.checklist) {
                                const prevAssessed = prevRecord.checklist.filter(c => c.value && c.value.trim() !== '');
                                if (prevAssessed.length > 0) {
                                    prevEfficiency = Math.round(prevAssessed.reduce((sum, c) => sum + scoreValue(c.value || ''), 0) / prevAssessed.length);
                                }
                            }
                            const trend = prevEfficiency !== null ? efficiencyPct - prevEfficiency : null;

                            // Ring SVG params
                            const radius = 22;
                            const circ = 2 * Math.PI * radius;
                            const pct = Math.min(100, Math.max(0, efficiencyPct));
                            const strokeDashoffset = circ * (1 - pct / 100);
                            const ringColor = pct >= 80 ? '#10b981' : pct >= 55 ? '#fbbf24' : '#ef4444';

                            return (
                                <div
                                    key={record.id}
                                    onClick={() => toggleExpand(record.id)} // Specific click handler logic below
                                    className={`card overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/50 shadow-lg scale-[1.01]' : 'hover:bg-white/5 cursor-pointer'}`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Compact Header - Clickable Area */}
                                    <div className="flex items-start gap-3 relative">
                                        {/* Left Side: Efficiency Ring or Icon Box */}
                                        {assessed.length > 0 ? (
                                            <div className="flex flex-col items-center flex-shrink-0" title={`ประสิทธิภาพ: ${efficiencyPct}%`}>
                                                <svg width="48" height="48" viewBox="0 0 60 60">
                                                    {/* Track */}
                                                    <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                                                    {/* Progress */}
                                                    <circle
                                                        cx="30" cy="30" r={radius}
                                                        fill="none"
                                                        stroke={ringColor}
                                                        strokeWidth="5"
                                                        strokeLinecap="round"
                                                        strokeDasharray={circ}
                                                        strokeDashoffset={strokeDashoffset}
                                                        transform="rotate(-90 30 30)"
                                                        style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 4px ${ringColor}80)` }}
                                                    />
                                                    <text x="30" y="27" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill={ringColor}>
                                                        {efficiencyPct}%
                                                    </text>
                                                    {trend !== null && (
                                                        <text x="30" y="39" textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={trend >= 0 ? '#10b981' : '#ef4444'}>
                                                            {trend > 0 ? `+${trend}` : trend}
                                                        </text>
                                                    )}
                                                </svg>
                                                <span className="text-[8px] text-text-muted mt-0.5">ประสิทธิภาพ</span>
                                            </div>
                                        ) : (
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner
                                                ${record.type === 'preventive' ? 'bg-accent-blue/10 text-accent-blue' :
                                                    record.type === 'corrective' ? 'bg-accent-red/10 text-accent-red' :
                                                        'bg-accent-green/10 text-accent-green'}`}>
                                                {record.type === 'preventive' ? <RefreshCwIcon size={20} /> :
                                                    record.type === 'corrective' ? <AlertTriangleIcon size={20} /> :
                                                        <WrenchIcon size={20} />}
                                            </div>
                                        )}

                                        {/* Main Content */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className={`font-bold text-sm truncate ${isExpanded ? 'text-primary' : 'text-text-primary'} flex items-baseline gap-1.5`}>
                                                            <span>{record.machineName}</span>
                                                            {machine?.code && (
                                                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 whitespace-nowrap shadow-sm">
                                                                    {machine.code}
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {/* Status Dot */}
                                                        <span className={`w-2 h-2 rounded-full ${record.status === 'completed' ? 'bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-accent-yellow'}`}></span>
                                                    </div>

                                                    {/* Description & Location */}
                                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                                        {(record.location || machine?.location || machine?.Location) && (
                                                            <span className="font-bold text-[10px] uppercase opacity-80 bg-white/5 px-1 rounded border border-white/10">
                                                                {record.location || machine?.location || machine?.Location}
                                                            </span>
                                                        )}
                                                        <p className="truncate opacity-70 max-w-[150px] sm:max-w-xs">
                                                            {record.description || record.type}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right Data: Status + Date */}
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                        {(record as any).fromPM && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 whitespace-nowrap">
                                                                🏷️ PM
                                                            </span>
                                                        )}
                                                        <span className={`badge text-[10px] py-0.5 px-2 font-bold uppercase tracking-wider ${getStatusColor(record.status)}`}>
                                                            {getStatusText(record.status)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-[10px] text-text-muted gap-1">
                                                        <CalendarIcon size={10} />
                                                        <span>{mounted ? formatDateThai(record.date) : '--/--'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sub Info Row (Technician, Type, Expand Arrow) */}
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-white/10">
                                                <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                                                    <div className="flex items-center gap-1.5">
                                                        <UserIcon size={12} className="text-primary/70" />
                                                        <span>{record.technician}</span>
                                                    </div>
                                                    {record.period && (
                                                        <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
                                                            <ClockIcon size={12} className="text-accent-yellow/70" />
                                                            <span>{record.period}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right side: Admin Delete + Chevron */}
                                                <div className="flex items-center gap-2">
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteClick(record);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white transition-all"
                                                            title={t("actionDelete") || "ลบ"}
                                                        >
                                                            <TrashIcon size={12} />
                                                        </button>
                                                    )}
                                                    {/* Chevron */}
                                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-text-muted'}`}>
                                                        <ChevronDownIcon size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Expandable Details */}
                                    {/* Expandable Details */}
                                    {isExpanded && (
                                        <div className="mt-2 space-y-2 animate-fade-in bg-black/10 -mx-4 px-4 py-3 border-t border-white/5">

                                            {/* === Efficiency Analysis Banner === */}
                                            {assessed.length > 0 && (
                                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <ActivityIcon size={14} className="text-accent-cyan" />
                                                            <span className="text-sm font-bold text-white">ประสิทธิภาพเครื่องจักร</span>
                                                            {trend !== null && (
                                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                                                                    {trend > 0 ? `▲ ดีขึ้น +${trend}%` : trend < 0 ? `▼ ลดลง ${trend}%` : '= เท่าเดิม'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-text-muted">เทียบครั้งก่อน: </span>
                                                            <span className="text-xs font-bold" style={{color: ringColor}}>{efficiencyPct}%</span>
                                                        </div>
                                                    </div>
                                                    {/* Problem items */}
                                                    {assessed.filter(c => scoreValue(c.value || '') < 80).length > 0 && (
                                                        <div className="px-4 py-3 bg-black/20 border-t border-white/5">
                                                            <p className="text-[11px] text-text-muted mb-2 font-semibold uppercase tracking-wider">⚠ รายการที่ต้องดูแล</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {assessed
                                                                    .filter(c => scoreValue(c.value || '') < 80)
                                                                    .sort((a, b) => scoreValue(a.value || '') - scoreValue(b.value || ''))
                                                                    .map((c, i) => {
                                                                        const s = scoreValue(c.value || '');
                                                                        const col = s < 30 ? 'bg-accent-red/15 text-accent-red border-accent-red/30' : s < 60 ? 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30' : 'bg-accent-blue/15 text-accent-blue border-accent-blue/30';
                                                                        return (
                                                                            <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium ${col}`}>
                                                                                <span className="max-w-[120px] truncate opacity-80">{c.item}</span>
                                                                                <span className="font-bold shrink-0">{c.value}</span>
                                                                            </div>
                                                                        );
                                                                    })
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Section 1: ข้อมูลทั่วไป & Motor/Gear (Grid Layout) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {/* ข้อมูลทั่วไป */}
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <h4 className="text-[11px] font-bold text-primary mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5 opacity-80">
                                                        <FileTextIcon size={10} />
                                                        ข้อมูลทั่วไป
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-muted">ประเภท:</span>
                                                            <span className="text-text-primary">{getTypeText(record.type)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-muted">ช่าง:</span>
                                                            <span className="text-text-primary truncate ml-1">{record.technician}</span>
                                                        </div>
                                                        {machine?.code && (
                                                            <div className="flex items-center justify-between col-span-2 mt-0.5">
                                                                <span className="text-text-muted">รหัสเครื่องจักร:</span>
                                                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 whitespace-nowrap shadow-sm">
                                                                    {machine.code}
                                                                </span>
                                                            </div>
                                                        )}
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
                                                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                        <h4 className="text-[11px] font-bold text-accent-cyan mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5 opacity-80">
                                                            <ActivityIcon size={10} />
                                                            ข้อมูล Motor/Gear
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
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
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <h4 className="text-[11px] font-bold text-accent-green mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5 opacity-80">
                                                        <TargetIcon size={10} />
                                                        ข้อมูล Shaft & Vibration
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
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

                                            {/* Section 3: Checklist - Grid List */}
                                            {record.checklist && record.checklist.length > 0 && (
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                                                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                                        <span className="text-accent-cyan">📋</span> รายการตรวจสอบ ({record.checklist.length} รายการ)
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {record.checklist.map((item, idx) => {
                                                            let valueColor = "text-accent-cyan font-semibold";
                                                            let bgColor = "bg-accent-cyan/10 border-accent-cyan/20";
                                                            
                                                            const val = item.value || "";
                                                            if (val.includes("สมบูรณ์") || val.includes("ปกติ") || val.includes("เรียบร้อย") || val.includes("ไม่มี")) {
                                                                valueColor = "text-accent-green font-bold";
                                                                bgColor = "bg-accent-green/10 border-accent-green/20";
                                                            } else if (val.includes("พอใช้") || val.includes("เฝ้าระวัง") || val.includes("ต่ำ") || val.includes("เติมเพิ่ม")) {
                                                                valueColor = "text-accent-yellow font-bold";
                                                                bgColor = "bg-accent-yellow/10 border-accent-yellow/20";
                                                            } else if (val.includes("เปลี่ยน") || val.includes("ผิดปกติ") || val.includes("ต้องเติม")) {
                                                                valueColor = "text-accent-red font-bold";
                                                                bgColor = "bg-accent-red/10 border-accent-red/20";
                                                            }

                                                            const isDue = val.includes("ถึงกำหนดเปลี่ยน");

                                                            let isVibrationData = false;
                                                            let vibrationObj: any = null;
                                                            if (val.startsWith('{') && val.includes('"x":')) {
                                                                try {
                                                                    vibrationObj = JSON.parse(val);
                                                                    isVibrationData = true;
                                                                } catch (e) { }
                                                            }

                                                            return (
                                                                <div key={idx} className={`flex flex-col bg-bg-tertiary p-3 rounded-lg border transition-all ${isDue ? 'border-accent-red/30 bg-accent-red/5' : 'border-white/5'}`}>
                                                                    <div className="text-xs text-text-muted mb-2 font-medium">{item.item}</div>
                                                                    {isVibrationData && vibrationObj ? (
                                                                        <div className="flex gap-1 flex-wrap">
                                                                            {['x', 'y', 'z'].map((axis) => vibrationObj[axis] && (
                                                                                <span key={axis} className={`px-2 py-1 rounded text-xs font-semibold border ${vibrationObj[axis].status === 'warning' ? 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20' : vibrationObj[axis].status === 'danger' ? 'text-accent-red bg-accent-red/10 border-accent-red/20' : 'text-accent-green bg-accent-green/10 border-accent-green/20'}`}>
                                                                                    {axis.toUpperCase()}:{vibrationObj[axis].value}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : isDue ? (
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className={`text-xs px-2.5 py-1 rounded border ${bgColor} ${valueColor} w-fit`}>
                                                                                {val}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => openReplacementPlan(record.machineId, record.machineName)}
                                                                                className="text-[11px] px-2.5 py-1 rounded-md border border-accent-red/40 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors w-fit flex items-center gap-1.5 font-semibold"
                                                                            >
                                                                                <ActivityIcon size={11} />
                                                                                📋 ดูแผนเปลี่ยนอะไหล่
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`text-xs px-2.5 py-1 rounded border ${bgColor} ${valueColor} w-fit`}>
                                                                            {val || (item.completed ? "✓" : "-")}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 5: Details & Notes */}
                                            {(record.details || record.notes) && (
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                                                    {record.details && !record.details.includes('{') && (!record.checklist || record.checklist.length === 0) && (
                                                        <div className="mb-2 last:mb-0">
                                                            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                                <FileTextIcon size={14} className="text-accent-cyan" /> รายละเอียด
                                                            </h4>
                                                            <p className="text-sm text-text-muted leading-relaxed">{record.details}</p>
                                                        </div>
                                                    )}
                                                    {record.notes && (
                                                        <div className={`pt-2 ${record.details && (!record.checklist || record.checklist.length === 0) ? 'border-t border-white/10 mt-3 pt-3' : ''}`}>
                                                            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                                <FileTextIcon size={14} className="text-accent-cyan" /> หมายเหตุ
                                                            </h4>
                                                            <p className="text-sm text-accent-yellow/90 italic leading-relaxed">{record.notes}</p>
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
                onSuccess={fetchInitialRecords}
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

            <PartReplacementPlanModal
                isOpen={replacementPlanOpen}
                onClose={() => setReplacementPlanOpen(false)}
                machineId={replacementPlanMachineId}
                machineName={replacementPlanMachineName}
                fromPMHistory={true}
                onViewHistory={() => setReplacementPlanOpen(false)}
            />
        </div>
    );
}
