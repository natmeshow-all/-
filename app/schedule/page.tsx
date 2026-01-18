"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { CalendarIcon, ClockIcon, SettingsIcon, AlertTriangleIcon, BoxIcon, FolderIcon, CheckCircleIcon, PlusIcon, EditIcon, TrashIcon } from "../components/ui/Icons";
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
    const [selectedLocation, setSelectedLocation] = useState<string>("All");

    const locations = ["All", "Utility", "FZ", "RTE"];

    const filteredMachines = allMachines.filter(machine => {
        if (selectedLocation === "All") return true;

        const loc = machine.Location?.toUpperCase() || machine.location?.toUpperCase() || "";
        if (selectedLocation === "Utility") {
            return loc === "UT" || loc === "UTILITY";
        }
        return loc === selectedLocation.toUpperCase();
    });

    // Delete Confirmation State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<PMPlan | null>(null);

    const fetchData = async () => {
        setLoading(true);
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
        fetchData();
    }, []);

    const getStatusInfo = (nextDueDate: Date) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(nextDueDate);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Overdue -> Yellow/Orange (Warning)
        if (diffDays < 0) return {
            label: t("statusOverdueLabel"),
            color: "text-accent-yellow",
            bg: "bg-accent-yellow/20",
            border: "border-accent-yellow/30",
            days: diffDays
        };

        // Today -> Red + Blink (Urgent)
        if (diffDays === 0) return {
            label: t("statusTodayLabel"),
            color: "text-accent-red",
            bg: "bg-accent-red/20",
            border: "border-accent-red/30",
            days: diffDays
        };

        if (diffDays <= 7) return { label: t("statusUpcomingLabel"), color: "text-accent-blue", bg: "bg-accent-blue/20", border: "border-accent-blue/30", days: diffDays };
        return { label: t("statusOnTrackLabel"), color: "text-accent-green", bg: "bg-accent-green/20", border: "border-accent-green/30", days: diffDays };
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

        if (diffDays !== 0) {
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
            fetchData();
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
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                            <p>{t("msgLoadingPlans")}</p>
                        </div>
                    ) : plans.length > 0 ? (
                        [...plans].sort((a, b) => {
                            const getDiffDays = (date: Date) => {
                                const now = new Date();
                                now.setHours(0, 0, 0, 0);
                                const due = new Date(date);
                                due.setHours(0, 0, 0, 0);
                                return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            };

                            const daysA = getDiffDays(a.nextDueDate);
                            const daysB = getDiffDays(b.nextDueDate);

                            // 1. Today (days === 0)
                            const isTodayA = daysA === 0;
                            const isTodayB = daysB === 0;
                            if (isTodayA && !isTodayB) return -1;
                            if (!isTodayA && isTodayB) return 1;

                            // 2. Overdue (days < 0)
                            const isOverdueA = daysA < 0;
                            const isOverdueB = daysB < 0;
                            if (isOverdueA && !isOverdueB) return -1;
                            if (!isOverdueA && isOverdueB) return 1;

                            // 3. Date Ascending
                            return daysA - daysB;
                        }).map((item, index) => {
                            const status = getStatusInfo(item.nextDueDate);
                            const isToday = status.days === 0;
                            const isOverdue = status.days < 0;

                            // Priority Styles
                            const priorityColor = item.priority === 'urgent' ? 'border-accent-red bg-accent-red/5'
                                : item.priority === 'high' ? 'border-accent-yellow bg-accent-yellow/5'
                                    : 'border-white/5 bg-transparent';

                            const priorityBadge = item.priority === 'urgent' ? { label: 'Urgent', color: 'bg-accent-red text-white' }
                                : item.priority === 'high' ? { label: 'High', color: 'bg-accent-yellow text-white' }
                                    : null;

                            return (
                                <div
                                    key={item.id}
                                    className={`card hover-lift animate-fade-in-up border-l-4 ${isOverdue ? "border-l-accent-yellow animate-warning-pulse" :
                                        isToday ? "border-l-accent-red animate-urgent-pulse" :
                                            status.days <= 7 ? "border-l-accent-blue" :
                                                "border-l-accent-green"
                                        } ${priorityColor} border-y border-r transition-all duration-300`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.bg} relative`}>
                                                <SettingsIcon size={24} className={status.color} />
                                                {item.completedCount && item.completedCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border border-bg-primary">
                                                        {item.completedCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg text-text-primary">{item.machineName}</h3>
                                                    {priorityBadge && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${priorityBadge.color}`}>
                                                            {priorityBadge.label}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-text-muted flex items-center gap-2">
                                                    {item.taskName}
                                                    {item.checklistItems && item.checklistItems.length > 0 && (
                                                        <span className="text-xs bg-bg-tertiary px-1.5 rounded text-text-muted border border-white/5">
                                                            {item.checklistItems.length} items
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(item);
                                                    }}
                                                    className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-all"
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
                                                        className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all"
                                                        title="ลบแผนงาน"
                                                    >
                                                        <TrashIcon size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <span className={`badge ${status.bg} ${status.color} border ${status.border} shadow-sm px-2.5 py-1 text-[10px] font-bold uppercase`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                        <div className="flex flex-wrap gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <CalendarIcon size={14} />
                                                <span>{t("labelDue", { date: item.nextDueDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>
                                            </div>
                                            {item.scheduleType === 'weekly' ? (
                                                <div className="flex items-center gap-2 text-text-muted">
                                                    <span>{t("labelEveryDay", { day: [t("calendarSun"), t("calendarMon"), t("calendarTue"), t("calendarWed"), t("calendarThu"), t("calendarFri"), t("calendarSat")][item.weeklyDay || 0] })}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-text-muted">
                                                    <ClockIcon size={14} />
                                                    <span className={status.days === 0 ? "text-accent-red font-bold" : status.days < 0 ? "text-accent-yellow font-bold" : ""}>
                                                        {status.days < 0 ? t("labelOverdueBy", { days: Math.abs(status.days) }) :
                                                            status.days === 0 ? t("labelToday") :
                                                                t("labelInDays", { days: status.days })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleExecuteClick(item)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 ${status.days <= 0
                                                    ? "bg-accent-blue text-white hover:bg-accent-blue/90"
                                                    : "bg-bg-tertiary text-text-primary hover:bg-white/10"
                                                    }`}
                                            >
                                                <CheckCircleIcon size={16} />
                                                <span>{t("actionCloseWork")}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-50 bg-bg-secondary/30 rounded-3xl border border-dashed border-white/10">
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
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                    {locations.map(loc => (
                        <button
                            key={loc}
                            onClick={() => setSelectedLocation(loc)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedLocation === loc
                                ? "bg-accent-blue text-white shadow-md"
                                : "bg-bg-tertiary text-text-muted hover:bg-white/5 hover:text-text-primary border border-white/5"
                                }`}
                        >
                            {loc === "All" ? t("labelAll") : loc}
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
                                    setConfigModalOpen(true);
                                }}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-bg-tertiary border border-white/5 hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
                                    <SettingsIcon size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-text-primary group-hover:text-accent-blue transition-colors">{machine.name}</h3>
                                    <p className="text-xs text-text-muted">{machine.Location} • {machine.location || '-'}</p>
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
