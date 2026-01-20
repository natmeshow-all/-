"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { PMPlan, MaintenanceRecord } from "../../types";
import { getMaintenanceRecordsByPMPlan, deleteMaintenanceRecord } from "../../lib/firebaseService";
import { ClockIcon, UserIcon, FileTextIcon, CalendarIcon, BoxIcon, TrashIcon } from "../ui/Icons";
import Image from "next/image";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface PMHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PMPlan;
}

export default function PMHistoryModal({ isOpen, onClose, plan }: PMHistoryModalProps) {
    const { t } = useLanguage();
    const { isAdmin } = useAuth();
    const { success, error: showError } = useToast();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMaintenanceRecord(deleteId);
            success(t("msgDeleteSuccess") || "Deleted successfully", t("msgDeleteSuccess"));
            setDeleteId(null);

            // Refresh
            const data = await getMaintenanceRecordsByPMPlan(plan.id);
            setRecords(data);
        } catch (error) {
            console.error("Error deleting record:", error);
            showError(t("msgDeleteError") || "Delete failed", "Error");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("pmHistoryModalTitle")} size="lg">
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
                            <p>{t("msgLoadingHistory")}</p>
                        </div>
                    ) : records.length > 0 ? (
                        records.map((record) => (
                            <div key={record.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                                {/* Timeline Dot */}
                                <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

                                <div
                                    className="relative p-5 transition-all rounded-2xl border bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10 group"
                                >
                                    {/* Action Buttons (Top Right) */}
                                    <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
                                        {isAdmin && (
                                            <button
                                                onClick={() => setDeleteId(record.id)}
                                                className="p-2 rounded-xl text-accent-red hover:bg-accent-red/10 transition-all active:scale-95"
                                                title={t("actionDelete")}
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {/* Row 1: Date & Tech */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-12">
                                            <div className="flex items-center gap-2 text-accent-blue font-bold">
                                                <CalendarIcon size={16} />
                                                <span>{record.date.toLocaleDateString(t("language") === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-text-muted bg-white/5 px-2.5 py-1 rounded-lg self-start">
                                                <UserIcon size={12} />
                                                <span>{record.technician}</span>
                                            </div>
                                        </div>

                                        {/* Row 2: Work Details */}
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2 text-sm text-text-primary leading-relaxed bg-black/10 p-3 rounded-xl border border-white/5">
                                                <FileTextIcon size={14} className="mt-1 shrink-0 text-text-muted" />
                                                <p>{record.details}</p>
                                            </div>
                                        </div>

                                        {/* Evidence Photo */}
                                        {record.evidenceImageUrl && (
                                            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 mt-2 group">
                                                <Image
                                                    src={record.evidenceImageUrl}
                                                    alt="Evidence"
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-40">
                            <ClockIcon size={48} className="mb-4" />
                            <p>{t("msgNoHistoryForItem")}</p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                    >
                        {t("actionCloseWindow")}
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title={t("modalConfirmDeletePM") || "Confirm Delete"}
                zIndex={60} // Higher than history modal
            >
                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-4">
                            <TrashIcon size={32} className="text-accent-red" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">{t("modalAreYouSure")}</h3>
                        <p className="text-text-muted">
                            {t("modalDeletePMConfirm", { name: "this record" })}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="flex-1 py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10"
                        >
                            {t("actionCancel")}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-3 rounded-xl bg-accent-red text-white font-bold hover:bg-accent-red/90"
                        >
                            {t("actionDelete")}
                        </button>
                    </div>
                </div>
            </Modal>
        </Modal >
    );
}
