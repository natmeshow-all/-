"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { PMPlan, MaintenanceRecord } from "../../types";
import { getMaintenanceRecordsByPMPlan } from "../../lib/firebaseService";
import { ClockIcon, UserIcon, FileTextIcon, CameraIcon, CalendarIcon, BoxIcon } from "../ui/Icons";
import Image from "next/image";

interface PMHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PMPlan;
}

export default function PMHistoryModal({ isOpen, onClose, plan }: PMHistoryModalProps) {
    const { t } = useLanguage();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!isOpen) return;
            setLoading(true);
            try {
                const data = await getMaintenanceRecordsByPMPlan(plan.id);
                setRecords(data);
            } catch (error) {
                console.error("Error fetching PM history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isOpen, plan.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="ประวัติการซ่อมบำรุงเชิงป้องกัน (PM)" size="lg">
            <div className="space-y-6">
                {/* Header Information */}
                <div className="p-4 bg-bg-tertiary rounded-xl border border-white/5 space-y-2">
                    <h3 className="font-bold text-text-primary flex items-center gap-2 text-lg">
                        <BoxIcon size={20} className="text-accent-blue" />
                        {plan.taskName}
                    </h3>
                    <p className="text-sm text-text-muted">{plan.machineName}</p>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                            <p>กำลังโหลดประวัติ...</p>
                        </div>
                    ) : records.length > 0 ? (
                        records.map((record, index) => (
                            <div key={record.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                                {/* Timeline Dot */}
                                <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

                                <div className="card bg-bg-secondary/50 border border-white/5 p-4 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 text-accent-blue font-bold">
                                            <CalendarIcon size={16} />
                                            <span>{record.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-text-muted bg-white/5 px-2 py-1 rounded-md">
                                            <UserIcon size={12} />
                                            {record.technician}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2 text-sm text-text-primary leading-relaxed">
                                            <FileTextIcon size={14} className="mt-1 shrink-0 text-text-muted" />
                                            <p>{record.details}</p>
                                        </div>
                                    </div>

                                    {record.evidenceImageUrl && (
                                        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 mt-2">
                                            <Image
                                                src={record.evidenceImageUrl}
                                                alt="Evidence"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-40">
                            <ClockIcon size={48} className="mb-4" />
                            <p>ยังไม่มีประวัติการซ่อมบำรุงสำหรับรายการนี้</p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </Modal>
    );
}
