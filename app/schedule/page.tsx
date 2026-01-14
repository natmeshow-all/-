"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { CalendarIcon, ClockIcon, SettingsIcon, AlertTriangleIcon, BoxIcon, FolderIcon, CheckCircleIcon, PlusIcon } from "../components/ui/Icons";
import { getPMPlans } from "../lib/firebaseService";
import { PMPlan } from "../types";
import PMExecutionModal from "../components/pm/PMExecutionModal";
import PMConfigModal from "../components/pm/PMConfigModal";
import PMHistoryModal from "../components/pm/PMHistoryModal";
import { getMachines } from "../lib/firebaseService";
import { Machine } from "../types";
import Modal from "../components/ui/Modal";

export default function SchedulePage() {
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);
    const [plans, setPlans] = useState<PMPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<PMPlan | null>(null);
    const [executionModalOpen, setExecutionModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [machineSelectOpen, setMachineSelectOpen] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [allMachines, setAllMachines] = useState<Machine[]>([]);

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

        if (diffDays < 0) return { label: "เกินกำหนด", color: "text-accent-red", bg: "bg-accent-red/20", border: "border-accent-red/30", days: diffDays };
        if (diffDays === 0) return { label: "วันนี้!", color: "text-accent-yellow", bg: "bg-accent-yellow/20", border: "border-accent-yellow/30", days: diffDays };
        if (diffDays <= 7) return { label: "เร็วๆ นี้", color: "text-accent-blue", bg: "bg-accent-blue/20", border: "border-accent-blue/30", days: diffDays };
        return { label: "ตามกำหนด", color: "text-accent-green", bg: "bg-accent-green/20", border: "border-accent-green/30", days: diffDays };
    };

    const handleExecuteClick = (plan: PMPlan) => {
        setSelectedPlan(plan);
        setExecutionModalOpen(true);
    };

    const handleHistoryClick = (plan: PMPlan) => {
        setSelectedPlan(plan);
        setHistoryModalOpen(true);
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
                            <p className="text-sm text-text-muted">รายการแผนงานซ่อมบำรุงเชิงป้องกัน (PM)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMachineSelectOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-all shadow-md active:scale-95 border border-accent-blue/30"
                            title="จัดการแผน PM"
                        >
                            <SettingsIcon size={16} />
                            <span className="text-xs font-bold whitespace-nowrap">จัดการแผน PM</span>
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
                                <p className="font-semibold text-accent-red">มีรายการที่ถึงกำหนดหรือเกินกำหนดซ่อมบำรุง!</p>
                                <p className="text-sm text-text-muted">กรุณาดำเนินการและบันทึกผลการทำงาน</p>
                            </div>
                        </div>
                    )}

                {/* Schedule Timeline */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                            <p>กำลังโหลดแผนงาน...</p>
                        </div>
                    ) : plans.length > 0 ? (
                        plans.map((item, index) => {
                            const status = getStatusInfo(item.nextDueDate);
                            return (
                                <div
                                    key={item.id}
                                    className={`card hover-lift animate-fade-in-up border-l-4 ${status.days < 0 ? "border-l-accent-red" :
                                        status.days === 0 ? "border-l-accent-yellow" :
                                            status.days <= 7 ? "border-l-accent-blue" :
                                                "border-l-accent-green"
                                        }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.bg}`}>
                                                <SettingsIcon size={24} className={status.color} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-text-primary">{item.taskName}</h3>
                                                <p className="text-sm text-text-muted">{item.machineName}</p>
                                            </div>
                                        </div>
                                        <span className={`badge ${status.bg} ${status.color} border ${status.border} shadow-sm px-2.5 py-1 text-[10px] font-bold uppercase`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                        <div className="flex flex-wrap gap-4 text-xs">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <CalendarIcon size={14} />
                                                <span>กำหนด: {item.nextDueDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <ClockIcon size={14} />
                                                <span className={status.days <= 0 ? "text-accent-red font-bold" : ""}>
                                                    {status.days < 0 ? `เกินมา ${Math.abs(status.days)} วัน` :
                                                        status.days === 0 ? "วันนี้" :
                                                            `อีก ${status.days} วัน`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleHistoryClick(item)}
                                                className="w-10 h-10 rounded-lg bg-bg-tertiary text-text-muted hover:text-accent-blue border border-white/5 flex items-center justify-center transition-all active:scale-90"
                                                title="ดูประวัติ"
                                            >
                                                <ClockIcon size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleExecuteClick(item)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 ${status.days <= 0
                                                    ? "bg-accent-blue text-white hover:bg-accent-blue/90"
                                                    : "bg-bg-tertiary text-text-primary hover:bg-white/10"
                                                    }`}
                                            >
                                                <CheckCircleIcon size={16} />
                                                <span>ปิดงาน</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-50 bg-bg-secondary/30 rounded-3xl border border-dashed border-white/10">
                            <BoxIcon size={48} className="mb-4" />
                            <p>ไม่มีแผนงานซ่อมบำรุงในขณะนี้</p>
                        </div>
                    )}
                </div>
            </main>

            {selectedPlan && (
                <PMExecutionModal
                    isOpen={executionModalOpen}
                    onClose={() => setExecutionModalOpen(false)}
                    plan={selectedPlan}
                    onSuccess={fetchData}
                />
            )}

            {selectedPlan && (
                <PMHistoryModal
                    isOpen={historyModalOpen}
                    onClose={() => setHistoryModalOpen(false)}
                    plan={selectedPlan}
                />
            )}

            {/* Machine Selection Modal */}
            <Modal
                isOpen={machineSelectOpen}
                onClose={() => setMachineSelectOpen(false)}
                title="เลือกเครื่องจักรสำหรับแผน PM"
            >
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    {allMachines.map(machine => (
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
                                <p className="text-xs text-text-muted">{machine.zone} • {machine.location}</p>
                            </div>
                            <PlusIcon size={18} className="text-text-muted group-hover:text-accent-blue" />
                        </button>
                    ))}
                </div>
            </Modal>

            {/* Config Modal */}
            {selectedMachine && (
                <PMConfigModal
                    isOpen={configModalOpen}
                    onClose={() => setConfigModalOpen(false)}
                    machine={selectedMachine}
                    onSuccess={fetchData}
                />
            )}

            <MobileNav />
        </div>
    );
}
