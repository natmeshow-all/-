"use client";

import React, { useState, useRef, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { PMPlan } from "../../types";
import { CameraIcon, CheckCircleIcon, XIcon, ActivityIcon, PlusIcon, UserIcon, FileTextIcon, ClockIcon } from "../ui/Icons";
import { completePMTask } from "../../lib/firebaseService";
import Image from "next/image";

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

    // Auto-fill technician from userProfile
    const defaultTechnician = userProfile?.nickname || userProfile?.displayName || "";
    const [technician, setTechnician] = useState(defaultTechnician);
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for checklist items - each item has completed status and value
    const [checklistResults, setChecklistResults] = useState<Record<number, ChecklistItemResult>>({});

    // Initialize checklist results when plan changes
    useEffect(() => {
        if (plan?.checklistItems) {
            const initialResults: Record<number, ChecklistItemResult> = {};
            plan.checklistItems.forEach((_, index) => {
                initialResults[index] = { completed: false, value: "" };
            });
            setChecklistResults(initialResults);
        }
    }, [plan?.checklistItems]);

    const handleChecklistChange = (index: number, field: "completed" | "value", value: boolean | string) => {
        setChecklistResults(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                [field]: value
            }
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Build details string from checklist results
    const buildDetailsString = (): string => {
        const cycleInfo = plan.scheduleType === 'weekly' ? `[${t("labelWeekly")}]` : `[${t("labelEveryMonthly")} ${plan.cycleMonths || 1} ${t("labelMonths")}]`;

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

            const machineZone = plan.locationType === 'machine_zone' ? plan.customLocation : undefined;

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
                    zone: machineZone || "", // Save zone for auditing
                },
                imageFile || undefined
            );

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error completing PM task:", error);
        } finally {
            setLoading(false);
        }
    };

    const hasChecklistItems = plan?.checklistItems && plan.checklistItems.length > 0;
    const completedCount = Object.values(checklistResults).filter(r => r.completed).length;
    const totalItems = plan?.checklistItems?.length || 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("pmExecutionTitle")}>
            <div className="space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
                {/* Header Information */}
                <div className="p-4 bg-bg-tertiary rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                            <ActivityIcon size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-text-primary">{plan.taskName}</h3>
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
                            <span>{t("textEveryMonths", { count: plan.cycleMonths || 1 })}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Technician Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
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
                            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <CheckCircleIcon size={14} />
                                {t("labelChecklist")} ({completedCount}/{totalItems})
                            </label>
                            <div className="space-y-2">
                                {plan.checklistItems!.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border transition-all ${checklistResults[index]?.completed
                                            ? 'bg-accent-green/10 border-accent-green/30'
                                            : 'bg-bg-tertiary border-white/5'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <button
                                                type="button"
                                                onClick={() => handleChecklistChange(index, "completed", !checklistResults[index]?.completed)}
                                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all mt-0.5 ${checklistResults[index]?.completed
                                                    ? 'bg-accent-green border-accent-green text-white'
                                                    : 'border-white/20 hover:border-accent-blue'
                                                    }`}
                                            >
                                                {checklistResults[index]?.completed && (
                                                    <CheckCircleIcon size={14} />
                                                )}
                                            </button>

                                            {/* Item content */}
                                            <div className="flex-1 space-y-2">
                                                <span className={`text-sm font-medium ${checklistResults[index]?.completed
                                                    ? 'text-accent-green'
                                                    : 'text-text-primary'
                                                    }`}>
                                                    {item}
                                                </span>
                                                {/* Value input field */}
                                                <input
                                                    type="text"
                                                    placeholder={t("placeholderChecklistValue")}
                                                    className="input-field w-full text-sm py-2"
                                                    value={checklistResults[index]?.value || ""}
                                                    onChange={(e) => handleChecklistChange(index, "value", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional Notes (if no checklist or for extra notes) */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            {hasChecklistItems ? t("labelAdditionalNotes") : t("labelMaintenanceDetails")}
                        </label>
                        <textarea
                            required={!hasChecklistItems}
                            placeholder={hasChecklistItems
                                ? t("placeholderAdditionalNotesHint")
                                : t("placeholderMaintenanceDetailsHint")
                            }
                            className="input-field w-full min-h-[80px] py-3 resize-none"
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                        />
                    </div>

                    {/* Photo Evidence */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            {t("labelEvidencePhoto")}
                        </label>

                        {!imagePreview ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-28 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent-blue/50 hover:text-accent-blue transition-all bg-white/5"
                            >
                                <PlusIcon size={20} />
                                <span className="text-xs">{t("actionTakePhoto")}</span>
                            </button>
                        ) : (
                            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
                                <Image
                                    src={imagePreview}
                                    alt="Evidence"
                                    fill
                                    className="object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-accent-red transition-colors"
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                        />
                    </div>

                    {/* Rescheduling Note */}
                    <div className="bg-accent-green/5 border border-accent-green/20 p-3 rounded-xl">
                        <p className="text-[11px] text-accent-green/80 flex items-start gap-2 leading-relaxed">
                            <CheckCircleIcon size={14} className="mt-0.5 shrink-0" />
                            <span>
                                {t("msgAutoScheduleHint", { count: plan.cycleMonths || 1 })}
                            </span>
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                        >
                            {t("actionCancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !technician || (!hasChecklistItems && !additionalNotes)}
                            className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {t("actionConfirmNextCycle")}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
