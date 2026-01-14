"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Machine } from "../../types";
import { CalendarIcon, ClockIcon, CheckCircleIcon, SettingsIcon, ActivityIcon } from "../ui/Icons";
import { addPMPlan } from "../../lib/firebaseService";

interface PMConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    machine: Machine;
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

export default function PMConfigModal({ isOpen, onClose, machine, onSuccess }: PMConfigModalProps) {
    const { t } = useLanguage();
    const [taskName, setTaskName] = useState("");
    const [cycleMonths, setCycleMonths] = useState<number>(1);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskName) return;
        setLoading(true);

        try {
            const start = new Date(startDate);
            const nextDue = new Date(start);
            nextDue.setMonth(nextDue.getMonth() + cycleMonths);

            await addPMPlan({
                machineId: machine.id,
                machineName: machine.name,
                taskName,
                cycleMonths: cycleMonths as any,
                startDate: start,
                nextDueDate: nextDue,
                status: "active",
            });

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error creating PM plan:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าแผนซ่อมบำรุงเชิงป้องกัน (PM)">
            <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-bg-tertiary rounded-xl border border-white/5">
                    <div className="w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-text-primary">{machine.name}</h3>
                        <p className="text-xs text-text-muted">{machine.zone} • {machine.location}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <ActivityIcon size={14} />
                            ชื่อรายการซ่อมบำรุง
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="เช่น เปลี่ยนน้ำมันเครื่อง, ตรวจสอบลูกปืน"
                            className="input-field w-full"
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <ClockIcon size={14} />
                                รอบการซ่อมบำรุง
                            </label>
                            <select
                                className="input-field w-full"
                                value={cycleMonths}
                                onChange={(e) => setCycleMonths(Number(e.target.value))}
                            >
                                {CYCLE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <CalendarIcon size={14} />
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
                    </div>

                    <div className="bg-accent-blue/5 border border-accent-blue/20 p-4 rounded-xl">
                        <p className="text-xs text-accent-blue/80 flex items-start gap-2">
                            <CheckCircleIcon size={14} className="mt-0.5 shrink-0" />
                            <span>
                                ระบบจะคำนวณวันซ่อมบำรุงครั้งถัดไปให้โดยนับจากรอบที่คุณเลือก และเมื่อปิดงานในแต่ละรอบ ระบบจะรันรอบใหม่ให้โดยอัตโนมัติ
                            </span>
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
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
                            className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2"
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
