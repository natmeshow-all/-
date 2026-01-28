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
    // State for multiple images (for Monthly PM)
    const [images, setImages] = useState<{ [key: string]: File | null }>({});
    const [previews, setPreviews] = useState<{ [key: string]: string | null }>({}); // Store previews as strings

    // Determine if this is a monthly plan (or any periodic plan except weekly) that requires 3 photos
    // This ensures Custom/Yearly/Monthly all get the 3-photo treatment
    const isMonthly = plan.scheduleType !== 'weekly';

    // Required photo keys for Monthly
    const requiredPhotos = isMonthly
        ? ['current', 'vibration', 'other']
        : ['evidence']; // 'evidence' is the default single photo key

    const getPhotoLabel = (key: string) => {
        switch (key) {
            case 'current': return t("labelPhotoAmp") || "ภาพถ่ายกระแสไฟฟ้า (Amp)";
            case 'vibration': return t("labelPhotoVibration") || "ภาพถ่ายค่าความสั่นสะเทือน";
            case 'other': return t("labelPhotoOther") || "จุดที่สำคัญอื่นๆ";
            default: return t("labelEvidencePhoto");
        }
    };

    const [checklistResults, setChecklistResults] = useState<ChecklistItemResult[]>(
        plan.checklistItems?.map(() => ({ completed: false, value: "" })) || []
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset states when modal opens
            setTechnician(defaultTechnician);
            setAdditionalNotes("");
            setImages({});
            setPreviews({});
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

    const handleMultiImageChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImages(prev => ({ ...prev, [key]: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [key]: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveMultiImage = (key: string) => {
        setImages(prev => {
            const temp = { ...prev };
            delete temp[key];
            return temp;
        });
        setPreviews(prev => {
            const temp = { ...prev };
            delete temp[key];
            return temp;
        });
        const input = document.getElementById(`file-${key}`) as HTMLInputElement;
        if (input) input.value = "";
    };

    // Legacy handler
    const handleRemoveImage = () => {
        // dummy for safety if invoked
    };
    // Legacy handler mostly for compatibility if needed, but we'll switch to using the multi-state primarily
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleMultiImageChange('evidence', e);
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

            // Prepare additional evidence files
            const additionalFiles: { label: string; file: File }[] = [];

            if (isMonthly) {
                if (images['current']) additionalFiles.push({ label: 'Electric Current (Amp)', file: images['current']! });
                if (images['vibration']) additionalFiles.push({ label: 'Vibration', file: images['vibration']! });
                if (images['other']) additionalFiles.push({ label: 'Other', file: images['other']! });
            }

            const primaryFile = isMonthly ? images['other'] : images['evidence'];
            const filteredAdditional = additionalFiles.filter(f => f.file !== primaryFile);

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
                },
                primaryFile || undefined,
                filteredAdditional
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

    // Check if all required photos are present
    const hasRequiredPhotos = requiredPhotos.every(key => !!images[key]);

    // Submit Button Footer
    const footerContent = (
        <button
            onClick={handleSubmit}
            disabled={loading || !hasRequiredPhotos}
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
                            <span>{t("textEveryMonths", { count: plan.cycleMonths || 1 })}</span>
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

                    {/* Photo Evidence */}
                    <div className="space-y-4">
                        <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider flex items-center gap-2">
                            {isMonthly ? `${t("labelEvidencePhoto")} (3 Required)` : t("labelEvidencePhoto")}
                        </label>

                        <div className={`grid gap-3 ${isMonthly ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                            {requiredPhotos.map((key) => (
                                <div key={key} className="space-y-2">
                                    {isMonthly && (
                                        <p className="text-xs text-text-muted font-bold ml-1">{getPhotoLabel(key)}</p>
                                    )}

                                    {!previews[key] ? (
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById(`file-${key}`)?.click()}
                                            className="w-full h-28 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent-blue/50 hover:text-accent-blue transition-all bg-white/5"
                                        >
                                            <PlusIcon size={20} />
                                            <span className="text-[10px] text-center px-2">{t("actionTakePhoto")}</span>
                                        </button>
                                    ) : (
                                        <div className="relative w-full h-28 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
                                            <Image
                                                src={previews[key]!}
                                                alt={key}
                                                fill
                                                className="object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMultiImage(key)}
                                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-accent-red transition-colors"
                                            >
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        id={`file-${key}`}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={(e) => handleMultiImageChange(key, e)}
                                    />
                                </div>
                            ))}
                        </div>
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
