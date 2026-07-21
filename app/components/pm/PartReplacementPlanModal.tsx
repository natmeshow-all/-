"use client";

import React, { useState, useEffect, useMemo } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Part, MaintenanceRecord, Machine } from "../../types";
import { getParts, addMaintenanceRecord, updateMaintenanceRecord, updatePart, getMachines, getMaintenanceRecordsByMachine, getMaintenanceRecordsByType } from "../../lib/firebaseService";
import { BoxIcon, CalendarIcon, ClockIcon, AlertTriangleIcon, ActivityIcon, CheckCircleIcon, HistoryIcon, RefreshCwIcon, SettingsIcon, FileTextIcon } from "../ui/Icons";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface PartReplacementPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    machineId?: string;
    machineName?: string;
    onViewHistory: () => void;
    fromPMHistory?: boolean;
}

export default function PartReplacementPlanModal({ isOpen, onClose, machineId: initialMachineId, machineName: initialMachineName, onViewHistory, fromPMHistory }: PartReplacementPlanModalProps) {
    const { t } = useLanguage();
    const { user, permissions } = useAuth();
    const { success, error: showError } = useToast();

    const [allParts, setAllParts] = useState<Part[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string>(initialMachineId || "");
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    // All part replacement records across all machines (both pending and completed)
    const [allReplacementRecords, setAllReplacementRecords] = useState<MaintenanceRecord[]>([]);
    // PM pending plans for the currently selected machine
    const [pmPlans, setPmPlans] = useState<MaintenanceRecord[]>([]);
    // Confirm-replace date state: { recordId: isoString }
    const [replaceDates, setReplaceDates] = useState<Record<string, string>>({});
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedMachineId(initialMachineId || "");
            loadData();
        }
    }, [isOpen, initialMachineId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const machineIdToLoad = initialMachineId;
            const [partsData, machinesData, maintenanceData] = await Promise.all([
                getParts(),
                getMachines(),
                getMaintenanceRecordsByType("partReplacement")
            ]);
            setAllParts(partsData);
            setMachines(machinesData);
            setAllReplacementRecords(maintenanceData);

            if (!initialMachineId && machinesData.length > 0) {
                const relevantMachines = machinesData.filter(m => 
                    partsData.some(p => p.machineId === m.id) || 
                    maintenanceData.some(r => r.machineId === m.id)
                );
                if (relevantMachines.length > 0) {
                    setSelectedMachineId(relevantMachines[0].id);
                }
            }

            // We will let the useEffect handle loading pmPlans when selectedMachineId changes
        } catch (error) {
            console.error("Error loading data:", error);
            showError("เกิดข้อผิดพลาดในการดึงข้อมูล", "Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchPmPlans = async () => {
            if (selectedMachineId) {
                try {
                    const records = await getMaintenanceRecordsByMachine(selectedMachineId);
                    const pending = records.filter(
                        r => r.type === "partReplacement" && r.status === "pending" && (r as any).fromPM === true
                    );
                    setPmPlans(pending);
                } catch (err) {
                    console.error("Error fetching pm plans for machine:", err);
                }
            } else {
                setPmPlans([]);
            }
        };
        fetchPmPlans();
    }, [selectedMachineId]);

    const displayedParts = useMemo(() => {
        if (!selectedMachineId) return [];
        return allParts.filter(p => p.machineId === selectedMachineId);
    }, [allParts, selectedMachineId]);

    // ===== Confirm part replacement (from Part registry) =====
    const handleReplacePart = async (part: Part) => {
        if (!confirm(`ยืนยันการเปลี่ยนอะไหล่ ${part.partName} และเริ่มนับเวลาใหม่?`)) return;

        setProcessingId(part.id);
        try {
            const now = new Date();
            const currentMachine = machines.find(m => m.id === part.machineId);

            await updatePart(part.id, {
                ...part,
                lastReplacedDate: now.toISOString()
            });

            const record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt"> = {
                machineId: part.machineId || selectedMachineId,
                machineName: currentMachine?.name || initialMachineName || "Unknown Machine",
                description: `เปลี่ยนอะไหล่: ${part.partName}`,
                type: "partReplacement",
                priority: "normal",
                status: "completed",
                date: now,
                technician: user?.displayName || "Technician",
                details: `เปลี่ยนอะไหล่ ${part.partName} เข้าสู่รอบการใช้งานใหม่`,
                location: part.Location || part.location || currentMachine?.Location || currentMachine?.location || "",
                Location: part.Location || part.location || currentMachine?.Location || currentMachine?.location || ""
            };

            await addMaintenanceRecord(record);
            success(`บันทึกการเปลี่ยนอะไหล่ ${part.partName} สำเร็จ`);
            await loadData();
        } catch (error) {
            console.error("Error replacing part:", error);
            showError("เกิดข้อผิดพลาดในการบันทึก", "Error");
        } finally {
            setProcessingId(null);
        }
    };

    // ===== Confirm date for a PM plan (เริ่มนับอายุการใช้งาน) =====
    const handleConfirmPMPlan = async (plan: MaintenanceRecord) => {
        const replacedDate = replaceDates[plan.id] ? new Date(replaceDates[plan.id]) : new Date();
        const partNameStr = (plan as any).partName || plan.description.replace("[แผน PM] เปลี่ยนอะไหล่: ", "");

        setConfirmingId(plan.id);
        try {
            const currentMachine = machines.find(m => m.id === plan.machineId);

            // 1. Find matching Part and update lastReplacedDate
            const matchingPart = allParts.find(p =>
                p.machineId === plan.machineId &&
                p.partName.toLowerCase().trim() === partNameStr.toLowerCase().trim()
            );
            if (matchingPart) {
                await updatePart(matchingPart.id, {
                    ...matchingPart,
                    lastReplacedDate: replacedDate.toISOString()
                });
            }

            // 2. Update the existing pending record to completed status
            //    This ensures the record disappears from the "pending" section immediately
            await updateMaintenanceRecord(plan.id, {
                status: "completed",
                date: replacedDate,
                description: `เปลี่ยนอะไหล่: ${partNameStr}`,
                technician: user?.displayName || "Technician",
                details: `[จากแผน PM: ${(plan as any).pmTaskName || ""}] เปลี่ยนอะไหล่ ${partNameStr} และเริ่มนับอายุการใช้งานใหม่`,
                Location: plan.Location || currentMachine?.Location || "",
            } as any);

            success(`บันทึกวันที่เปลี่ยน ${partNameStr} สำเร็จ เริ่มนับอายุการใช้งานแล้ว`);
            await loadData();
        } catch (error) {
            console.error("Error confirming PM plan:", error);
            showError("เกิดข้อผิดพลาดในการบันทึก", "Error");
        } finally {
            setConfirmingId(null);
        }
    };

    // ===== Lifespan helpers =====
    const calculateLifespan = (lastReplaced: Date | string | undefined) => {
        if (!lastReplaced) return null;
        const start = new Date(lastReplaced);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);
        const remainingDays = days % 365;
        const months = Math.floor(remainingDays / 30);
        const finalDays = remainingDays % 30;
        return { years, months, days: finalDays, totalDays: days };
    };

    // Calculate usage rate per year from all completed replacement records
    const calcUsagePerYear = (part: Part): number | null => {
        if (!part.lastReplacedDate) return null;
        const lifespan = calculateLifespan(part.lastReplacedDate);
        if (!lifespan || lifespan.totalDays < 1) return null;
        return parseFloat((365 / lifespan.totalDays).toFixed(2));
    };

    const currentMachineName = initialMachineName || machines.find(m => m.id === selectedMachineId)?.name || "เลือกเครื่องจักร";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`แผนเปลี่ยนอะไหล่: ${currentMachineName}`} size="lg">
            <div className="space-y-5">
                {/* Banner: Opened from PM History */}
                {fromPMHistory && (
                    <div className="flex items-center gap-2 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl px-4 py-2.5">
                        <span className="text-accent-yellow text-sm">⚠️</span>
                        <div>
                            <span className="text-accent-yellow text-xs font-bold">แผนนี้มาจากงาน PM</span>
                            <p className="text-text-muted text-[11px] mt-0.5">พบรายการที่ถึงกำหนดเปลี่ยนจากการตรวจสอบ PM กรุณาเปลี่ยนอะไหล่และกดบันทึกเพื่อรีเซ็ตการจับเวลา</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    {!initialMachineId ? (
                        <div className="w-full sm:w-1/2">
                            <label className="text-xs text-text-muted mb-1 block">เลือกระบบ / เครื่องจักร</label>
                            <div className="relative">
                                <SettingsIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <select
                                    className="input-field w-full pl-9 h-10 text-sm"
                                    value={selectedMachineId}
                                    onChange={(e) => setSelectedMachineId(e.target.value)}
                                >
                                    <option value="" disabled>-- เลือกเครื่องจักร --</option>
                                    {machines.filter(m => 
                                        allParts.some(p => p.machineId === m.id) || 
                                        allReplacementRecords.some(r => r.machineId === m.id)
                                    ).map(m => (
                                        <option key={m.id} value={m.id}>{m.code ? `[${m.code}] ` : ''}{m.name} {m.location ? `[${m.location}]` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted">ระบบจะคำนวณอายุการใช้งานของอะไหล่แต่ละชิ้นโดยอัตโนมัติ</p>
                    )}
                    <button
                        onClick={() => { onClose(); onViewHistory(); }}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2 mt-auto"
                    >
                        <HistoryIcon size={14} />
                        ดูประวัติงาน PM / เปลี่ยนอะไหล่
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* ===== SECTION 1: Pending PM Plans ===== */}
                        {pmPlans.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex-1 h-px bg-orange-500/20"></span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30">
                                        <AlertTriangleIcon size={12} className="text-orange-400" />
                                        <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">
                                            รอดำเนินการ — จาก PM ({pmPlans.length})
                                        </span>
                                    </div>
                                    <span className="flex-1 h-px bg-orange-500/20"></span>
                                </div>

                                {pmPlans.map(plan => {
                                    const partName = (plan as any).partName || plan.description.replace("[แผน PM] เปลี่ยนอะไหล่: ", "");
                                    const pmTaskName = (plan as any).pmTaskName || "";
                                    const checklistLabel = (plan as any).checklistItemLabel || "";
                                    const createdAt = plan.createdAt ? new Date(plan.createdAt) : new Date(plan.date);
                                    const daysSinceCreated = Math.floor((new Date().getTime() - createdAt.getTime()) / 86400000);

                                    // Find matching part for lifespan data
                                    const matchingPart = allParts.find(p =>
                                        p.machineId === plan.machineId &&
                                        p.partName.toLowerCase().trim() === partName.toLowerCase().trim()
                                    );
                                    const lifespan = matchingPart ? calculateLifespan(matchingPart.lastReplacedDate) : null;

                                    return (
                                        <div key={plan.id} className="bg-gradient-to-r from-orange-500/10 to-red-500/5 border border-orange-500/30 rounded-xl p-4 space-y-3">
                                            {/* Header row */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-white text-sm">{partName}</h4>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                                            🏷️ มาจาก PM
                                                        </span>
                                                        {daysSinceCreated > 7 && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                                                รอ {daysSinceCreated} วัน
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-text-muted mt-0.5 truncate">
                                                        📋 งาน PM: <span className="text-orange-300/80 font-medium">{pmTaskName}</span>
                                                    </p>
                                                    {checklistLabel && (
                                                        <p className="text-[10px] text-white/40 mt-0.5 truncate">
                                                            รายการ: {checklistLabel}
                                                        </p>
                                                    )}
                                                </div>
                                                {plan.notes && (
                                                    <div className="flex items-center gap-1 text-[10px] text-white/40 flex-shrink-0">
                                                        <FileTextIcon size={10} />
                                                        <span className="max-w-[100px] truncate">{plan.notes as string}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Lifespan info from Part registry */}
                                            {matchingPart && (
                                                <div className="flex flex-wrap gap-3 text-xs py-2 border-t border-orange-500/10">
                                                    <div className="flex items-center gap-1.5">
                                                        <CalendarIcon size={12} className="text-accent-blue" />
                                                        <span className="text-text-muted">เปลี่ยนล่าสุด:</span>
                                                        <span className="text-white font-medium">
                                                            {matchingPart.lastReplacedDate
                                                                ? new Date(matchingPart.lastReplacedDate).toLocaleDateString('th-TH')
                                                                : "ยังไม่เคยบันทึก"}
                                                        </span>
                                                    </div>
                                                    {lifespan && (
                                                        <div className="flex items-center gap-1.5">
                                                            <ClockIcon size={12} className="text-accent-yellow" />
                                                            <span className="text-text-muted">ใช้มาแล้ว:</span>
                                                            <span className="text-accent-yellow font-bold">
                                                                {lifespan.years > 0 ? `${lifespan.years} ปี ` : ""}
                                                                {lifespan.months > 0 ? `${lifespan.months} เดือน ` : ""}
                                                                {lifespan.days} วัน
                                                            </span>
                                                        </div>
                                                    )}
                                                    {lifespan && lifespan.totalDays >= 30 && (() => {
                                                        const perYear = parseFloat((365 / lifespan.totalDays).toFixed(2));
                                                        return (
                                                            <div className="flex items-center gap-1.5">
                                                                <ActivityIcon size={12} className="text-accent-green" />
                                                                <span className="text-text-muted">อัตราใช้:</span>
                                                                <span className="text-accent-green font-bold">≈ {perYear} ชิ้น/ปี</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {/* Date picker + Confirm button */}
                                            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center pt-1">
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-orange-300/70 mb-1 block">วันที่เปลี่ยนอะไหล่จริง</label>
                                                    <input
                                                        type="date"
                                                        className="input-field text-xs h-8 w-full bg-black/30"
                                                        defaultValue={new Date().toISOString().split("T")[0]}
                                                        onChange={e => setReplaceDates(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleConfirmPMPlan(plan)}
                                                    disabled={confirmingId === plan.id}
                                                    className="sm:mt-5 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-300 border border-orange-500/40 rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"
                                                >
                                                    {confirmingId === plan.id ? (
                                                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-orange-300"></span>
                                                    ) : (
                                                        <CheckCircleIcon size={13} />
                                                    )}
                                                    บันทึกวันที่เปลี่ยน + เริ่มนับอายุ
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ===== SECTION 2: Part Registry (lifespan tracking) ===== */}
                        {displayedParts.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex-1 h-px bg-white/10"></span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                        <BoxIcon size={11} className="text-text-muted" />
                                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                            อะไหล่ในระบบ ({displayedParts.length})
                                        </span>
                                    </div>
                                    <span className="flex-1 h-px bg-white/10"></span>
                                </div>

                                {displayedParts.map(part => {
                                    const lifespan = calculateLifespan(part.lastReplacedDate);
                                    const expectedDays = part.expectedLifespanDays || 365;
                                    const usagePerYear = calcUsagePerYear(part);

                                    let statusColor = "bg-accent-green/10 text-accent-green border-accent-green/20";
                                    let statusIcon = <CheckCircleIcon size={14} />;
                                    let statusText = "ปกติ";

                                    if (lifespan) {
                                        if (lifespan.totalDays >= expectedDays) {
                                            statusColor = "bg-accent-red/10 text-accent-red border-accent-red/20";
                                            statusIcon = <AlertTriangleIcon size={14} />;
                                            statusText = "ถึงกำหนดเปลี่ยน";
                                        } else if (lifespan.totalDays >= expectedDays * 0.8) {
                                            statusColor = "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20";
                                            statusIcon = <ActivityIcon size={14} />;
                                            statusText = "ใกล้ถึงกำหนด";
                                        }
                                    }

                                    return (
                                        <div key={part.id} className="bg-bg-tertiary border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="font-bold text-white text-base">{part.partName}</h4>
                                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${statusColor}`}>
                                                            {statusIcon}
                                                            {statusText}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-text-muted mb-3 flex items-center gap-1">
                                                        <BoxIcon size={12} /> {part.brand || '-'} | {part.modelSpec || '-'}
                                                    </p>

                                                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <CalendarIcon size={14} className="text-accent-blue" />
                                                            <span className="text-text-secondary">เปลี่ยนล่าสุด:</span>
                                                            <span className="text-white font-medium">
                                                                {part.lastReplacedDate ? new Date(part.lastReplacedDate).toLocaleDateString('th-TH') : "ไม่เคยบันทึก"}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <ClockIcon size={14} className="text-accent-yellow" />
                                                            <span className="text-text-secondary">ใช้มาแล้ว:</span>
                                                            <span className="text-accent-yellow font-bold">
                                                                {lifespan
                                                                    ? `${lifespan.years > 0 ? `${lifespan.years} ปี ` : ''}${lifespan.months > 0 ? `${lifespan.months} เดือน ` : ''}${lifespan.days} วัน`
                                                                    : "เริ่มนับเมื่อมีการเปลี่ยนครั้งแรก"}
                                                            </span>
                                                        </div>
                                                        {usagePerYear !== null && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <ActivityIcon size={14} className="text-accent-green" />
                                                                <span className="text-text-secondary">อัตราใช้:</span>
                                                                <span className="text-accent-green font-bold">≈ {usagePerYear} ชิ้น/ปี</span>
                                                            </div>
                                                        )}
                                                        {lifespan && part.expectedLifespanDays && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-text-muted">อายุกำหนด:</span>
                                                                <span className="text-white/60">{part.expectedLifespanDays} วัน</span>
                                                                <span className={`font-bold ${lifespan.totalDays >= part.expectedLifespanDays ? 'text-accent-red' : 'text-accent-green'}`}>
                                                                    ({Math.round((lifespan.totalDays / part.expectedLifespanDays) * 100)}%)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="w-full sm:w-auto flex-shrink-0">
                                                    {permissions.canExecuteTask && (
                                                        <button
                                                            onClick={() => handleReplacePart(part)}
                                                            disabled={processingId === part.id}
                                                            className="w-full sm:w-auto px-4 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                                        >
                                                            {processingId === part.id ? (
                                                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-accent-blue"></span>
                                                            ) : (
                                                                <RefreshCwIcon size={14} />
                                                            )}
                                                            บันทึกเปลี่ยนอะไหล่ชิ้นนี้
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty state */}
                        {pmPlans.length === 0 && displayedParts.length === 0 && (
                            <div className="bg-white/5 border border-white/5 rounded-xl py-12 flex flex-col items-center justify-center text-center">
                                <CheckCircleIcon size={40} className="text-white/20 mb-3" />
                                <h3 className="text-white font-medium mb-1">ไม่มีแผนรอดำเนินการ</h3>
                                <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">
                                    เครื่องจักรนี้ไม่มีแผนเปลี่ยนอะไหล่ค้างอยู่ และยังไม่มีรายการอะไหล่ในระบบ
                                </p>
                                <div className="bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg p-3 text-xs text-accent-yellow/90 max-w-xs mx-auto">
                                    💡 คุณสามารถกดปุ่ม <strong className="text-accent-yellow">"ดูประวัติงาน PM / เปลี่ยนอะไหล่"</strong> สีเหลืองด้านบนขวาเพื่อดูประวัติที่ผ่านมาได้ครับ
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
