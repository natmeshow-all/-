"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { PMPlan } from "../../types";
import { CheckCircleIcon, XIcon, ActivityIcon, PlusIcon, UserIcon, FileTextIcon, ClockIcon } from "../ui/Icons";
import { completePMTask } from "../../lib/firebaseService";
import { useToast } from "../../contexts/ToastContext";

interface PMExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PMPlan;
    onSuccess?: () => void;
}

interface ChecklistItemResult {
    completed: boolean;
    value: string;
}

export default function PMExecutionModal({ isOpen, onClose, plan, onSuccess }: PMExecutionModalProps) {
    const { t } = useLanguage();
    const { userProfile } = useAuth();
    const { success, error: showError } = useToast();

    // Auto-fill technician from userProfile
    const defaultTechnician = userProfile?.nickname || userProfile?.displayName || "";
    const [technician, setTechnician] = useState(defaultTechnician);
    const [additionalNotes, setAdditionalNotes] = useState("");


    const [checklistResults, setChecklistResults] = useState<ChecklistItemResult[]>(
        plan.checklistItems?.map(() => ({ completed: false, value: "" })) || []
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset states when modal opens
            setTechnician(defaultTechnician);
            setAdditionalNotes("");
            setChecklistResults(plan.checklistItems?.map(() => ({ completed: false, value: "" })) || []);
            setLoading(false);
        }
    }, [isOpen, plan, defaultTechnician]);

    const handleChecklistChange = (index: number, completed: boolean, value?: string) => {
        setChecklistResults(prev => {
            const newResults = [...prev];
            newResults[index] = { completed, value: value !== undefined ? value : newResults[index]?.value || "" };
            return newResults;
        });
    };



    // Build details string from checklist results
    const buildDetailsString = (): string => {
        let cycleInfo = "";
        if (plan.scheduleType === 'weekly') {
            cycleInfo = `[${t("labelWeekly")}]`;
        } else if (plan.scheduleType === 'yearly') {
            cycleInfo = `[${t("labelYearly")}]`;
        } else {
            cycleInfo = `[${t("labelEveryMonthly")} ${plan.cycleMonths || 1} ${t("labelMonths")}]`;
        }

        if (!plan?.checklistItems || plan.checklistItems.length === 0) {
            return `${cycleInfo}\n${additionalNotes}`;
        }

        const itemDetails = plan.checklistItems.map((item, index) => {
            const result = checklistResults[index];
            const status = result?.completed ? "✓" : "○";
            const value = result?.value ? `: ${result.value}` : "";
            return `${status} ${item}${value}`;
        }).join("\n");

        return additionalNotes
            ? `${cycleInfo}\n${itemDetails}\n\n[${t("labelAdditionalNotes")}]\n${additionalNotes}`
            : `${cycleInfo}\n${itemDetails}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const details = buildDetailsString();

            // Convert local checklistResults to ChecklistItemResult[]
            const structuredChecklist = plan.checklistItems?.map((item, index) => ({
                item,
                completed: checklistResults[index]?.completed || false,
                value: checklistResults[index]?.value || ""
            }));

            await completePMTask(
                plan.id,
                {
                    machineId: plan.machineId,
                    machineName: plan.machineName,
                    description: `PM: ${plan.taskName}`,
                    type: "preventive",
                    priority: "normal",
                    status: "completed",
                    date: new Date(),
                    technician: technician || "Technician",
                    details: details,
                    checklist: structuredChecklist,
                    Location: plan.customLocation || "",
                }
            );

            success(t("msgSaveSuccess") || "บันทึกข้อมูลสำเร็จ", plan.taskName);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error("Error completing PM task:", err);
            showError(t("msgSaveError") || "เกิดข้อผิดพลาดในการบันทึก", err.message);
        } finally {
            setLoading(false);
        }
    };

    const hasChecklistItems = plan?.checklistItems && plan.checklistItems.length > 0;
    const completedCount = Object.values(checklistResults).filter(r => r.completed).length;
    const totalItems = plan?.checklistItems?.length || 0;



    // Submit Button Footer
    const footerContent = (
        <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-base shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                    <span>{t("msgSaving")}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <CheckCircleIcon size={18} />
                    <span>{t("actionConfirmNextCycle")}</span>
                </div>
            )}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("pmExecutionTitle")} footer={footerContent}>
            <div className="space-y-5">
                {/* Header Information */}
                <div className="p-4 bg-bg-tertiary rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                            <ActivityIcon size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-accent-orange">{plan.taskName}</h3>
                            <p className="text-xs text-text-muted">{plan.machineName}</p>
                        </div>
                        {hasChecklistItems && (
                            <div className="text-right">
                                <span className="text-lg font-bold text-accent-blue">{completedCount}/{totalItems}</span>
                                <p className="text-[10px] text-text-muted">{t("labelItemsCompleted")}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-text-muted">
                            <ClockIcon size={12} />
                            <span>
                                {plan.scheduleType === 'weekly' ? t("labelWeekly") :
                                    plan.scheduleType === 'yearly' ? t("labelYearly") :
                                        t("textEveryMonths", { count: plan.cycleMonths || 1 })}
                            </span>
                        </div>
                    </div>
                </div>

                <form id="pm-execution-form" onSubmit={handleSubmit} className="space-y-5">
                    {/* Technician Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider flex items-center gap-2">
                            {t("labelTechnician")}
                        </label>
                        <input
                            type="text"
                            required
                            placeholder={t("placeholderSpecifyTechnician")}
                            className="input-field w-full"
                            value={technician}
                            onChange={(e) => setTechnician(e.target.value)}
                        />
                    </div>



                    {/* Checklist Items - Dynamic based on PM plan */}
                    {hasChecklistItems && (
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider flex items-center gap-2">
                                <CheckCircleIcon size={14} />
                                {t("labelChecklist")} ({completedCount}/{totalItems})
                            </label>
                            <div className="space-y-2">
                                {plan.checklistItems!.map((item, index) => (
                                    <div key={index} className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                                        <div className="flex items-start gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleChecklistChange(index, !checklistResults[index]?.completed)}
                                                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${checklistResults[index]?.completed
                                                    ? 'bg-accent-blue border-accent-blue text-white'
                                                    : 'border-white/20 hover:border-accent-blue/50'
                                                    }`}
                                            >
                                                {checklistResults[index]?.completed && <CheckCircleIcon size={12} />}
                                            </button>
                                            <span className={`text-sm cursor-pointer ${checklistResults[index]?.completed ? 'text-text-muted transition-colors' : 'text-white'}`}
                                                onClick={() => handleChecklistChange(index, !checklistResults[index]?.completed)}>
                                                {item}
                                            </span>
                                        </div>

                                        {checklistResults[index]?.completed && (
                                            <div className="pl-8 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <input
                                                    type="text"
                                                    placeholder={t("placeholderChecklistValue")}
                                                    value={checklistResults[index]?.value || ""}
                                                    onChange={(e) => handleChecklistChange(index, true, e.target.value)}
                                                    className="input-field text-xs w-full bg-black/20"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Notes */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider flex items-center gap-2">
                            <FileTextIcon size={14} />
                            {t("labelAdditionalNotes")}
                        </label>
                        <textarea
                            placeholder={t("placeholderAdditionalNotesHint")}
                            className="input-field w-full min-h-[80px]"
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                        />
                    </div>
                </form>
            </div>
        </Modal>
    );

}
