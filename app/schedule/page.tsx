"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { CalendarIcon, ClockIcon, SettingsIcon, AlertTriangleIcon, BoxIcon, FolderIcon, CheckCircleIcon, PlusIcon, EditIcon, TrashIcon, SearchIcon, MapPinIcon } from "../components/ui/Icons";
import { getPMPlans, deletePMPlan, getMachines } from "../lib/firebaseService";
import { PMPlan, Machine } from "../types";
import PMExecutionModal from "../components/pm/PMExecutionModal";
import PMConfigModal from "../components/pm/PMConfigModal";
import Modal from "../components/ui/Modal";
import { useToast } from "../contexts/ToastContext";

export default function SchedulePage() {
    const { t, language } = useLanguage();
    const { checkAuth, isAdmin } = useAuth();
    const { success, error: showError } = useToast();
    const [mounted, setMounted] = useState(false);
    const [plans, setPlans] = useState<PMPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<PMPlan | null>(null);
    const [executionModalOpen, setExecutionModalOpen] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [machineSelectOpen, setMachineSelectOpen] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const locations = [
        { id: 'all', label: t("labelAll") || 'ทั้งหมด', color: 'accent-blue' },
        { id: 'FZ', label: 'FZ', color: 'accent-cyan' },
        { id: 'RTE', label: 'RTE', color: 'accent-green' },
        { id: 'UT', label: 'Utility', color: 'accent-yellow' }
    ];

    const filteredMachines = allMachines.filter(machine => {
        // 1. Text Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase().replace(/\s+/g, '');
            const matchName = machine.name.toLowerCase().replace(/\s+/g, '').includes(query);
            const matchCode = machine.code?.toLowerCase().replace(/\s+/g, '').includes(query);
            if (!matchName && !matchCode) return false;
        }

        // 2. Location Filter
        if (selectedLocation === "all") return true;

        const loc = machine.location?.toUpperCase() || machine.Location?.toUpperCase() || "";
        if (selectedLocation === "UT") {
            return loc === "UT" || loc === "UTILITY";
        }
        return loc === selectedLocation.toUpperCase();
    });

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<PMPlan | null>(null);

    const fetchData = async (showSpinner = true) => {
        if (showSpinner && plans.length === 0) setLoading(true);
        try {
            const [plansData, machinesData] = await Promise.all([
                getPMPlans(),
                getMachines()
            ]);
            setPlans(plansData);
            setAllMachines(machinesData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchData(true);
    }, []);

    const getStatusInfo = (nextDueDate: Date) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(nextDueDate);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 1. Overdue (< 0) -> Red
        if (diffDays < 0) return {
            label: t("statusOverdueLabel"),
            color: "text-accent-red",
            bg: "bg-accent-red/20",
            border: "border-accent-red/30",
            days: diffDays
        };

        // 2. Due Today or within 3 days (0 to 3) -> Yellow
        if (diffDays <= 3) return {
            label: diffDays === 0 ? t("statusTodayLabel") : t("statusUpcomingLabel"),
            color: "text-accent-yellow",
            bg: "bg-accent-yellow/20",
            border: "border-accent-yellow/30",
            days: diffDays
        };

        // 3. Far (> 3) -> Green
        return {
            label: t("statusOnTrackLabel"),
            color: "text-accent-green",
            bg: "bg-accent-green/20",
            border: "border-accent-green/30",
            days: diffDays
        };
    };

    const getCycleInfo = (plan: PMPlan) => {
        const prefix = language === 'th' ? 'รอบ ' : '';

        if (plan.scheduleType === 'weekly') {
            return {
                label: `${prefix}${t("labelWeekly") || "Weekly"}`,
                color: "text-accent-blue",
                bg: "bg-accent-blue/15",
                border: "border-accent-blue/30"
            };
        }

        if (plan.scheduleType === 'yearly') {
            return {
                label: `${prefix}${t("labelYearly") || "Yearly"}`,
                color: "text-accent-orange",
                bg: "bg-accent-orange/15",
                border: "border-accent-orange/30"
            };
        }

        const months = plan.cycleMonths || 1;
        if (months === 1) {
            return {
                label: `${prefix}1 ${t("unitMonth") || "Month"}`,
                color: "text-accent-cyan",
                bg: "bg-accent-cyan/15",
                border: "border-accent-cyan/30"
            };
        }

        if (months === 2) {
            return {
                label: `${prefix}2 ${t("unitMonth") || "Months"}`,
                color: "text-accent-purple",
                bg: "bg-accent-purple/15",
                border: "border-accent-purple/30"
            };
        }

        return {
            label: `${prefix}${months} ${t("unitMonth") || "Months"}`,
            color: "text-accent-orange",
            bg: "bg-accent-orange/15",
            border: "border-accent-orange/30"
        };
    };

    const formatOverdueDuration = (diffDays: number) => {
        if (diffDays >= 0) return null;

        const absoluteDays = Math.abs(diffDays);
        const years = Math.floor(absoluteDays / 365);
        const months = Math.floor((absoluteDays % 365) / 30);
        const days = absoluteDays % 30;

        const resultParts = [];
        if (years > 0) resultParts.push({ value: years, unit: t("unitYear"), color: "text-accent-red" });
        if (months > 0) resultParts.push({ value: months, unit: t("unitMonth"), color: "text-accent-yellow" });
        if (days > 0 || (years === 0 && months === 0)) resultParts.push({ value: days, unit: t("unitDay"), color: "text-accent-orange" });

        return (
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-text-muted italic">{t("labelOverdueBy")}:</span>
                <div className="flex items-center gap-1">
                    {resultParts.map((part, idx) => (
                        <React.Fragment key={idx}>
                            <div className="flex items-center gap-0.5">
                                <span className={`${part.color} font-black text-xs sm:text-sm`}>{part.value}</span>
                                <span className="text-[10px] text-text-muted font-medium">{part.unit}</span>
                            </div>
                            {idx < resultParts.length - 1 && <span className="text-[10px] text-white/20">/</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    const handleExecuteClick = (plan: PMPlan) => {
        if (!checkAuth()) return;

        // Restriction: Only allow closing work on the due date
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(plan.nextDueDate);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            showError(t("msgNotYetDue"), t("msgNotYetDue"));
            return;
        }

        setSelectedPlan(plan);
        setExecutionModalOpen(true);
    };

    const handleEditClick = (plan: PMPlan) => {
        if (!checkAuth()) return;
        const machine = allMachines.find(m => m.id === plan.machineId || m.name === plan.machineName);
        if (machine) {
            setSelectedMachine(machine);
            setSelectedPlan(plan);
            setConfigModalOpen(true);
        }
    };

    const handleDeleteClick = (plan: PMPlan) => {
        if (!checkAuth()) return;
        if (!isAdmin) {
            showError(t("msgNoPermission"), t("msgNoEditPermission"));
            return;
        }
        setPlanToDelete(plan);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!planToDelete) return;

        try {
            await deletePMPlan(planToDelete.id);
            success(t("msgDeleteSuccess"), t("msgDeleteSuccess"));
            setDeleteModalOpen(false);
            setPlanToDelete(null);
            fetchData(false);
        } catch (error: any) {
            console.error("Error deleting PM plan:", error);
            showError(t("msgDeleteError"), error.message || t("msgError"));
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 pb-40">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
                            <CalendarIcon size={20} className="text-accent-purple" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navSchedule")}</h1>
                            <p className="text-sm text-text-muted">{t("scheduleDescription")}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { if (checkAuth()) setMachineSelectOpen(true); }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-all shadow-md active:scale-95 border border-accent-blue/30"
                            title="จัดการแผน PM"
                        >
                            <SettingsIcon size={16} />
                            <span className="text-xs font-bold whitespace-nowrap">{t("actionManagePM")}</span>
                        </button>
                    </div>
                </div>

                {/* Alert for due items */}
                {plans.some(p => {
                    const diffDays = Math.ceil((p.nextDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 0;
                }) && (
                        <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl flex items-center gap-3 animate-pulse-glow">
                            <AlertTriangleIcon size={24} className="text-accent-red shrink-0" />
                            <div>
                                <p className="font-semibold text-accent-red">{t("msgOverdueAlert")}</p>
                                <p className="text-sm text-text-muted">{t("msgActionRequired")}</p>
                            </div>
                        </div>
                    )}

                {/* Schedule Timeline */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                            <p>{t("msgLoadingPlans")}</p>
                        </div>
                    ) : plans.length > 0 ? (() => {
                        // -- Categorize plans into groups --
                        const getDiffDays = (date: Date) => {
                            const now = new Date();
                            now.setHours(0, 0, 0, 0);
                            const due = new Date(date);
                            due.setHours(0, 0, 0, 0);
                            return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        };

                        const sorted = [...plans].sort((a, b) => getDiffDays(a.nextDueDate) - getDiffDays(b.nextDueDate));

                        const overdueItems = sorted.filter(p => getDiffDays(p.nextDueDate) < 0);
                        const dueSoonItems = sorted.filter(p => {
                            const d = getDiffDays(p.nextDueDate);
                            return d >= 0 && d <= 3;
                        });
                        const upcomingItems = sorted.filter(p => {
                            const d = getDiffDays(p.nextDueDate);
                            return d > 3 && d <= 30;
                        });
                        const laterItems = sorted.filter(p => getDiffDays(p.nextDueDate) > 30);

                        // -- Summary Stats --
                        const totalPlans = plans.length;

                        const summaryCards = [
                            { id: 'section-overdue', label: language === 'th' ? "เกินกำหนด" : "Overdue", count: overdueItems.length, color: "accent-red", icon: <AlertTriangleIcon size={18} /> },
                            { id: 'section-due-soon', label: language === 'th' ? "ถึงกำหนด / ใกล้ถึง" : "Due Soon", count: dueSoonItems.length, color: "accent-yellow", icon: <ClockIcon size={18} /> },
                            { id: 'section-upcoming', label: language === 'th' ? "อีก ≤30 วัน" : "≤30 Days", count: upcomingItems.length, color: "accent-cyan", icon: <CalendarIcon size={18} /> },
                            { id: 'section-on-track', label: language === 'th' ? "ตามกำหนด" : "On Track", count: laterItems.length, color: "accent-green", icon: <CheckCircleIcon size={18} /> },
                        ];

                        // -- Render a single plan card (reusable) --
                        const renderPlanCard = (item: PMPlan, animIndex: number) => {
                            const status = getStatusInfo(item.nextDueDate);
                            const isToday = status.days === 0;
                            const isOverdue = status.days < 0;
                            const daysUntilDue = getDiffDays(item.nextDueDate);

                            const priorityColor = item.priority === 'urgent' ? 'border-accent-red bg-accent-red/5'
                                : item.priority === 'high' ? 'border-accent-yellow bg-accent-yellow/5'
                                    : 'border-white/5 bg-transparent';

                            const priorityBadge = item.priority === 'urgent' ? { label: 'Urgent', color: 'bg-accent-red text-white' }
                                : item.priority === 'high' ? { label: 'High', color: 'bg-accent-yellow text-white' }
                                    : null;

                            return (
                                <div
                                    key={item.id}
                                    className={`card p-3 hover-lift animate-fade-in-up relative ${isOverdue ? "animate-warning-pulse" : ""} ${priorityColor} transition-all duration-300`}
                                    style={{
                                        borderLeftWidth: '4px',
                                        borderLeftStyle: 'solid',
                                        borderLeftColor: isOverdue ? '#ef4444' : daysUntilDue <= 3 ? '#eab308' : daysUntilDue <= 30 ? '#06b6d4' : '#22c55e',
                                        animationDelay: `${animIndex * 50}ms`
                                    }}
                                >
                                    <div className="flex items-stretch gap-3">
                                        {/* Icon */}
                                        <div className="flex flex-col">
                                            <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${status.bg} relative`}>
                                                <SettingsIcon size={20} className={status.color} />
                                                {item.completedCount && item.completedCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-blue text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm border border-bg-primary">
                                                        {item.completedCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                {/* Badges Row */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                                    <span className={`badge ${status.bg} ${status.color} border ${status.border} shadow-sm px-2 py-0.5 text-[9px] font-bold uppercase`}>
                                                        {status.label}
                                                    </span>
                                                    {priorityBadge && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${priorityBadge.color}`}>
                                                            {priorityBadge.label}
                                                        </span>
                                                    )}
                                                    {/* Countdown badge for upcoming items */}
                                                    {daysUntilDue > 0 && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wider ${daysUntilDue <= 3
                                                            ? 'bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30'
                                                            : daysUntilDue <= 30
                                                                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25'
                                                                : 'bg-accent-green/15 text-accent-green border border-accent-green/25'
                                                            }`}>
                                                            {language === 'th' ? `อีก ${daysUntilDue} วัน` : `${daysUntilDue} days left`}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Name & Task */}
                                                <div className="mb-2">
                                                    {(() => {
                                                        const machine = allMachines.find(m => m.id === item.machineId || m.name === item.machineName);
                                                        return (
                                                            <h3 className="font-bold text-sm sm:text-base text-text-primary leading-tight flex flex-wrap items-center gap-2 pr-16">
                                                                <span className="truncate">{item.machineName}</span>
                                                                {machine?.code && (
                                                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 whitespace-nowrap shadow-sm">
                                                                        {machine.code}
                                                                    </span>
                                                                )}
                                                            </h3>
                                                        );
                                                    })()}
                                                    <p className="text-xs text-text-muted leading-relaxed mt-0.5 pr-10">{item.taskName}</p>
                                                    {item.customLocation && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <MapPinIcon size={11} className="text-accent-cyan shrink-0" />
                                                            <span className="text-[11px] text-accent-cyan font-medium">{item.customLocation}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-auto pt-2 text-xs text-text-muted">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarIcon size={12} className="opacity-70" />
                                                    <span className={isToday ? "text-accent-red font-bold" : isOverdue ? "text-accent-yellow font-bold" : "font-medium"}>
                                                        {item.nextDueDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                {isOverdue && (
                                                    <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 ml-1">
                                                        {formatOverdueDuration(status.days)}
                                                    </div>
                                                )}
                                                {item.checklistItems && item.checklistItems.length > 0 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                                        <span className="text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded border border-white/5 font-medium">
                                                            {item.checklistItems.length} {t("labelItems") || "items"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row Actions Right */}
                                        <div className="flex flex-col items-end justify-between shrink-0 pl-2 border-l border-white/5 ml-auto self-stretch py-0.5">
                                            {/* Cycle Badge at Top Right */}
                                            <span className={`badge ${getCycleInfo(item).bg} ${getCycleInfo(item).color} border ${getCycleInfo(item).border} shadow-sm px-2 py-0.5 text-[9px] font-bold uppercase`}>
                                                {getCycleInfo(item).label}
                                            </span>

                                            {/* Main Action (Execute) */}
                                            <button
                                                onClick={() => handleExecuteClick(item)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap ${status.days <= 0
                                                    ? "bg-accent-blue text-white hover:bg-accent-blue/90"
                                                    : "bg-bg-tertiary text-text-primary hover:bg-white/10"
                                                    }`}
                                            >
                                                {status.days <= 0 ? (
                                                    <>
                                                        <CheckCircleIcon size={14} />
                                                        {t("actionCloseWork")}
                                                    </>
                                                ) : (
                                                    t("actionRecordPMResult")
                                                )}
                                            </button>

                                            {/* Edit/Delete Buttons */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(item);
                                                    }}
                                                    className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-white/5 transition-all"
                                                    title="แก้ไขแผนงาน"
                                                >
                                                    <EditIcon size={14} />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(item);
                                                        }}
                                                        className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-white/5 transition-all"
                                                        title="ลบแผนงาน"
                                                    >
                                                        <TrashIcon size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        };

                        // -- Section Header component --
                        const SectionHeader = ({ icon, title, count, color, accentBorder }: {
                            icon: React.ReactNode; title: string; count: number; color: string; accentBorder: string;
                        }) => (
                            <div className={`flex items-center gap-3 py-2 px-1`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${color}/15 text-${color}`}>
                                    {icon}
                                </div>
                                <div className="flex-1">
                                    <h2 className={`text-sm font-bold text-${color} uppercase tracking-wider`}>{title}</h2>
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-${color}/15 text-${color} border border-${color}/25`}>
                                    {count} {language === 'th' ? 'แผน' : 'plans'}
                                </span>
                            </div>
                        );

                        let animCounter = 0;

                        return (
                            <>
                                {/* Summary Stats Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                                    {summaryCards.map((card) => (
                                        <div
                                            key={card.label}
                                            onClick={() => {
                                                const el = document.getElementById(card.id);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }}
                                            className={`relative p-3 rounded-xl bg-bg-secondary border border-white/5 flex items-center gap-3 overflow-hidden transition-all cursor-pointer hover:border-${card.color}/30 hover:bg-white/5 active:scale-[0.98]`}
                                        >
                                            <div className={`absolute inset-0 bg-${card.color}/5 pointer-events-none`} />
                                            <div className={`relative shrink-0 w-9 h-9 rounded-lg bg-${card.color}/15 flex items-center justify-center text-${card.color}`}>
                                                {card.icon}
                                            </div>
                                            <div className="relative">
                                                <p className={`text-xl font-black text-${card.color}`}>{card.count}</p>
                                                <p className="text-[10px] text-text-muted font-medium leading-tight">{card.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total plans line */}
                                <div className="flex items-center gap-2 px-1 pb-1">
                                    <FolderIcon size={14} className="text-text-muted" />
                                    <span className="text-xs text-text-muted">
                                        {language === 'th' ? `ทั้งหมด ${totalPlans} แผน PM` : `Total ${totalPlans} PM Plans`}
                                    </span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>

                                {/* === SECTION: Overdue === */}
                                {overdueItems.length > 0 && (
                                    <div id="section-overdue" className="space-y-3 scroll-mt-24">
                                        <SectionHeader
                                            icon={<AlertTriangleIcon size={16} />}
                                            title={language === 'th' ? 'เกินกำหนด — ต้องดำเนินการ' : 'Overdue — Action Required'}
                                            count={overdueItems.length}
                                            color="accent-red"
                                            accentBorder="border-accent-red/30"
                                        />
                                        <div className="space-y-3">
                                            {overdueItems.map((item) => renderPlanCard(item, animCounter++))}
                                        </div>
                                    </div>
                                )}

                                {/* === SECTION: Due Soon === */}
                                {dueSoonItems.length > 0 && (
                                    <div id="section-due-soon" className="space-y-3 scroll-mt-24">
                                        <SectionHeader
                                            icon={<ClockIcon size={16} />}
                                            title={language === 'th' ? 'ถึงกำหนด / ใกล้ถึงกำหนด' : 'Due Today / Due Soon'}
                                            count={dueSoonItems.length}
                                            color="accent-yellow"
                                            accentBorder="border-accent-yellow/30"
                                        />
                                        <div className="space-y-3">
                                            {dueSoonItems.map((item) => renderPlanCard(item, animCounter++))}
                                        </div>
                                    </div>
                                )}

                                {/* === SECTION: Upcoming (≤30 days) === */}
                                {upcomingItems.length > 0 && (
                                    <div id="section-upcoming" className="space-y-3 scroll-mt-24">
                                        <SectionHeader
                                            icon={<CalendarIcon size={16} />}
                                            title={language === 'th' ? 'กำลังจะถึงกำหนด (≤30 วัน)' : 'Upcoming (≤30 Days)'}
                                            count={upcomingItems.length}
                                            color="accent-cyan"
                                            accentBorder="border-accent-cyan/30"
                                        />
                                        <div className="space-y-3">
                                            {upcomingItems.map((item) => renderPlanCard(item, animCounter++))}
                                        </div>
                                    </div>
                                )}

                                {/* === SECTION: On Track (>30 days) === */}
                                {laterItems.length > 0 && (
                                    <div id="section-on-track" className="space-y-3 scroll-mt-24">
                                        <SectionHeader
                                            icon={<CheckCircleIcon size={16} />}
                                            title={language === 'th' ? 'ตามกำหนด (>30 วัน)' : 'On Track (>30 Days)'}
                                            count={laterItems.length}
                                            color="accent-green"
                                            accentBorder="border-accent-green/30"
                                        />
                                        <div className="space-y-3">
                                            {laterItems.map((item) => renderPlanCard(item, animCounter++))}
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })() : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-60 bg-bg-secondary/30 rounded-3xl border border-dashed border-white/10">
                            <BoxIcon size={48} className="mb-4" />
                            <p>{t("msgNoPlans")}</p>
                        </div>
                    )}
                </div>
            </main >

            {selectedPlan && (
                <PMExecutionModal
                    isOpen={executionModalOpen}
                    onClose={() => setExecutionModalOpen(false)}
                    plan={selectedPlan}
                    onSuccess={fetchData}
                />
            )}

            {/* Machine Selection Modal */}
            <Modal
                isOpen={machineSelectOpen}
                onClose={() => setMachineSelectOpen(false)}
                title={t("modalSelectMachinePM")}
            >
                {/* Location Filter */}
                <div className="px-1 mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t("placeholderSearchMachine")}
                            className="input-field w-full pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                            <SearchIcon size={18} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 px-1">
                    {locations.map(loc => (
                        <button
                            key={loc.id}
                            onClick={() => setSelectedLocation(loc.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2
                                ${selectedLocation === loc.id
                                    ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg`
                                    : 'bg-bg-tertiary border-white/10 text-text-muted hover:bg-white/5 hover:text-text-primary'}`}
                        >
                            {loc.label}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedLocation === loc.id ? `bg-${loc.color} text-bg-primary` : 'bg-white/10 text-white/40'}`}>
                                {loc.id === 'all' ? allMachines.length : allMachines.filter(m => {
                                    const machineLoc = m.location?.toUpperCase() || m.Location?.toUpperCase() || "";
                                    if (loc.id === 'UT') return machineLoc === 'UT' || machineLoc === 'UTILITY';
                                    return machineLoc === loc.id;
                                }).length}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    {filteredMachines.length > 0 ? (
                        filteredMachines.map(machine => (
                            <button
                                key={machine.id}
                                onClick={() => {
                                    setSelectedMachine(machine);
                                    setMachineSelectOpen(false);
                                    setSearchQuery(""); // Clear search
                                    setConfigModalOpen(true);
                                }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-bg-tertiary border border-white/5 hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
                                    <SettingsIcon size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-text-primary group-hover:text-accent-blue transition-colors">{machine.name}</h3>
                                    <p className="text-xs text-text-muted">
                                        {machine.code && <span className="font-mono text-accent-cyan mr-1">{machine.code} •</span>}
                                        {machine.Location} • {machine.location || '-'}
                                    </p>
                                </div>
                                <PlusIcon size={18} className="text-text-muted group-hover:text-accent-blue" />
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-8 text-text-muted opacity-60">
                            <p>{t("msgNoMachineLocation")}</p>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Config Modal */}
            {
                selectedMachine && (
                    <PMConfigModal
                        isOpen={configModalOpen}
                        onClose={() => setConfigModalOpen(false)}
                        machine={selectedMachine}
                        plan={selectedPlan || undefined} // Pass detailed plan if editing
                        existingMachinePlans={plans.filter(p => p.machineId === selectedMachine.id)}
                        onSuccess={fetchData}
                    />
                )
            }


            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title={t("modalConfirmDeletePM")}
            >
                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-4">
                            <TrashIcon size={32} className="text-accent-red" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">{t("modalAreYouSure")}</h3>
                        <p className="text-text-muted">
                            {t("modalDeletePMConfirm", { name: planToDelete?.taskName || "" })}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteModalOpen(false)}
                            className="flex-1 py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10"
                        >
                            {t("actionCancel")}
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 py-3 rounded-xl bg-accent-red text-white font-bold hover:bg-accent-red/90"
                        >
                            {t("actionDelete")}
                        </button>
                    </div>
                </div>
            </Modal>

            <MobileNav />
        </div >
    );
}
