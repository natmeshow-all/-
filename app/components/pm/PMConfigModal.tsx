"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Machine, Part } from "../../types";
import { CalendarIcon, ClockIcon, CheckCircleIcon, SettingsIcon, ActivityIcon } from "../ui/Icons";
import { PMPlan } from "../../types";
import { addPMPlan, updatePMPlan, getPartsByMachine } from "../../lib/firebaseService";

interface PMConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    machine: Machine;
    plan?: PMPlan;
    onSuccess?: () => void;
}

const CYCLE_OPTIONS = [
    { label: "1 เดือน", value: 1 },
    { label: "2 เดือน", value: 2 },
    { label: "3 เดือน", value: 3 },
    { label: "6 เดือน", value: 6 },
    { label: "9 เดือน", value: 9 },
    { label: "12 เดือน", value: 12 },
];

export default function PMConfigModal({ isOpen, onClose, machine, plan, onSuccess }: PMConfigModalProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    // Form State
    const [taskName, setTaskName] = useState(plan?.taskName || "");
    const [checklistItems, setChecklistItems] = useState<string[]>(plan?.checklistItems || []);
    const [newItem, setNewItem] = useState("");

    const [priority, setPriority] = useState<"normal" | "high" | "urgent">(plan?.priority || "normal");

    const [scheduleType, setScheduleType] = useState<"monthly" | "weekly">(plan?.scheduleType || "monthly");
    const [cycleMonths, setCycleMonths] = useState<number>(plan?.cycleMonths || 1);
    const [weeklyDay, setWeeklyDay] = useState<number>(plan?.weeklyDay || 1); // Default to Monday

    const [startDate, setStartDate] = useState(
        plan?.startDate
            ? new Date(plan.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    // Location State
    const [locationType, setLocationType] = useState<"machine_zone" | "custom">(plan?.locationType || "machine_zone");
    const [customLocation, setCustomLocation] = useState(plan?.customLocation || "");

    // Parts State
    const [machineParts, setMachineParts] = useState<Part[]>([]);
    const [loadingParts, setLoadingParts] = useState(false);

    useEffect(() => {
        if (isOpen && machine.id) {
            fetchParts();
        }
    }, [isOpen, machine.id]);

    const fetchParts = async () => {
        setLoadingParts(true);
        try {
            // Import dynamically to avoid circular dependencies if any, or just use standard import
            const parts = await getPartsByMachine(machine.id);
            setMachineParts(parts);
        } catch (error) {
            console.error("Error fetching parts:", error);
        } finally {
            setLoadingParts(false);
        }
    };

    const addChecklistItem = () => {
        if (newItem.trim()) {
            setChecklistItems([...checklistItems, newItem.trim()]);
            setNewItem("");
        }
    };

    const removeChecklistItem = (index: number) => {
        setChecklistItems(checklistItems.filter((_, i) => i !== index));
    };

    const handleAddPartToChecklist = (partName: string) => {
        setChecklistItems([...checklistItems, `ตรวจสอบ/เปลี่ยน ${partName}`]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskName) return;
        setLoading(true);

        try {
            const start = new Date(startDate);
            const nextDue = new Date(start);

            // Calculate next due date logic
            if (scheduleType === 'monthly') {
                nextDue.setMonth(nextDue.getMonth() + cycleMonths);
            } else {
                // Weekly logic - logic to find next occurrence of the specific day
                const currentDay = start.getDay();
                const daysUntilNext = (weeklyDay + 7 - currentDay) % 7;
                // If daysUntilNext is 0, it means it's today. 
                // Using 7 to ensure it's next week if we strictly want next cycle, 
                // or 0/7 logic depends on if 'start date' equals 'first due date'.
                // Let's assume startDate IS the first due date if it matches the day, or we find the next match.
                // Simple logic: Start date is strictly the first due date user picks. 
                // Next due calculation happens AFTER completion. 
                // But here we are setting initial 'nextDueDate'. 
                // Usually initial nextDueDate = startDate.
            }
            // Note: In this simple implementation, we trust startDate is the first due date.
            // But verify: 
            const finalNextDueDate = new Date(startDate); // First due is start date

            const planData: any = {
                taskName,
                checklistItems,
                priority,
                scheduleType,
                cycleMonths: scheduleType === 'monthly' ? cycleMonths : undefined,
                weeklyDay: scheduleType === 'weekly' ? weeklyDay : undefined,
                startDate: start,
                nextDueDate: finalNextDueDate, // Set first occurrence
                locationType,
                customLocation: locationType === 'custom' ? customLocation : undefined,
                // If it's a new plan, these are set. If update, these overwrite.
            };

            if (plan) {
                await updatePMPlan(plan.id, planData);
            } else {
                await addPMPlan({
                    machineId: machine.id,
                    machineName: machine.name,
                    ...planData,
                    status: "active",
                    completedCount: 0
                });
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error saving PM plan:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าแผนซ่อมบำรุงเชิงป้องกัน (PM)">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                {/* Header Card */}
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${priority === 'urgent' ? 'bg-accent-red/10 border-accent-red/30' :
                    priority === 'high' ? 'bg-accent-yellow/10 border-accent-yellow/30' :
                        'bg-bg-tertiary border-white/5'
                    }`}>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-inner ${priority === 'urgent' ? 'bg-accent-red text-white' :
                        priority === 'high' ? 'bg-accent-yellow text-white' :
                            'bg-bg-secondary text-accent-blue'
                        }`}>
                        <SettingsIcon size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-text-primary">{machine.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
                            <span className="bg-bg-secondary px-2 py-0.5 rounded text-xs border border-white/5">
                                {machine.zone}
                            </span>
                            <span>•</span>
                            <span>{machine.location}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Task Name & Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="sm:col-span-3 space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <ActivityIcon size={14} className="text-accent-blue" />
                                ชื่อแผนการซ่อมบำรุง
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="เช่น เปลี่ยนน้ำมันเครื่องประจำปี, ตรวจเช็คสายพาน"
                                className="input-field w-full text-lg font-semibold"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">ความเร่งด่วน</label>
                            <select
                                className={`input-field w-full font-bold ${priority === 'urgent' ? 'text-accent-red border-accent-red/50' :
                                    priority === 'high' ? 'text-accent-yellow border-accent-yellow/50' :
                                        'text-accent-green border-accent-green/50'
                                    }`}
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                            >
                                <option value="normal">🟢 ปกติ</option>
                                <option value="high">🟡 สำคัญ</option>
                                <option value="urgent">🔴 เร่งด่วน</option>
                            </select>
                        </div>
                    </div>

                    {/* 2. Checklist & Parts */}
                    <div className="space-y-3 bg-bg-secondary/30 p-4 rounded-xl border border-white/5">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircleIcon size={14} className="text-accent-blue" />
                                รายการที่ต้องทำ (Checklist)
                            </div>
                            <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded-full">
                                {checklistItems.length} รายการ
                            </span>
                        </label>

                        {/* Add Item Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="เพิ่มรายการย่อย..."
                                className="input-field flex-1 text-sm"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                            />
                            <button
                                type="button"
                                onClick={addChecklistItem}
                                className="bg-accent-blue text-white w-10 h-10 rounded-lg flex items-center justify-center hover:bg-accent-blue/90 transition-all"
                            >
                                +
                            </button>
                        </div>

                        {/* Checklist Display */}
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {checklistItems.length === 0 && (
                                <p className="text-center text-sm text-text-muted/50 py-2 italic">- ยังไม่มีรายการ -</p>
                            )}
                            {checklistItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-bg-tertiary px-3 py-2 rounded-lg border border-white/5 group">
                                    <span className="text-sm text-text-primary">{idx + 1}. {item}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeChecklistItem(idx)}
                                        className="text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Quick Add Parts */}
                        {machineParts.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                                <p className="text-xs text-text-muted mb-2">เพิ่มรายการจากอะไหล่เครื่องจักร:</p>
                                <div className="flex flex-wrap gap-2">
                                    {machineParts.slice(0, 5).map(part => (
                                        <button
                                            key={part.id}
                                            type="button"
                                            onClick={() => handleAddPartToChecklist(part.partName)}
                                            className="text-[10px] bg-bg-tertiary border border-white/10 hover:border-accent-blue hover:text-accent-blue px-2 py-1 rounded transition-colors"
                                        >
                                            + {part.partName}
                                        </button>
                                    ))}
                                    {machineParts.length > 5 && (
                                        <span className="text-[10px] text-text-muted self-center">+{machineParts.length - 5} more</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Schedule & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Schedule Type */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <ClockIcon size={14} className="text-accent-blue" />
                                    รูปแบบเวลา
                                </label>
                                <div className="flex bg-bg-tertiary p-1 rounded-lg border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('monthly')}
                                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${scheduleType === 'monthly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'}`}
                                    >
                                        รายเดือน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('weekly')}
                                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${scheduleType === 'weekly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'}`}
                                    >
                                        รายสัปดาห์
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Interval Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                    {scheduleType === 'monthly' ? 'รอบทุกๆ (เดือน)' : 'ทำทุกวัน'}
                                </label>
                                {scheduleType === 'monthly' ? (
                                    <div className="relative">
                                        <select
                                            className="input-field w-full appearance-none"
                                            value={cycleMonths}
                                            onChange={(e) => setCycleMonths(Number(e.target.value))}
                                        >
                                            {CYCLE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                            ▼
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setWeeklyDay(d)}
                                                className={`py-2 text-xs font-bold rounded-lg border transition-all ${weeklyDay === d
                                                    ? 'bg-accent-blue border-accent-blue text-white'
                                                    : 'bg-bg-tertiary border-white/5 text-text-muted hover:border-white/20'
                                                    }`}
                                            >
                                                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][d]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Start Date & Location */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <CalendarIcon size={14} className="text-accent-blue" />
                                    วันที่เริ่มรอบแรก
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="input-field w-full"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">สถานที่ปฏิบัติงาน</label>
                                <select
                                    className="input-field w-full mb-2"
                                    value={locationType}
                                    onChange={(e) => setLocationType(e.target.value as any)}
                                >
                                    <option value="machine_zone">ตามเครื่องจักร ({machine.zone})</option>
                                    <option value="custom">ระบุเอง (อื่นๆ)</option>
                                </select>
                                {locationType === 'custom' && (
                                    <input
                                        type="text"
                                        placeholder="ระบุสถานที่..."
                                        className="input-field w-full bg-accent-blue/5 border-accent-blue/30 focus:border-accent-blue"
                                        value={customLocation}
                                        onChange={(e) => setCustomLocation(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircleIcon size={18} />
                                    บันทึกแผนงาน
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
