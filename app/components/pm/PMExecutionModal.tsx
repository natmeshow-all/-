"use client";

import React, { useState, useRef } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { PMPlan } from "../../types";
import { CameraIcon, CheckCircleIcon, XIcon, SettingsIcon, ActivityIcon, PlusIcon, UserIcon, FileTextIcon, ClockIcon } from "../ui/Icons";
import { completePMTask } from "../../lib/firebaseService";
import Image from "next/image";

interface PMExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PMPlan;
    onSuccess?: () => void;
}

export default function PMExecutionModal({ isOpen, onClose, plan, onSuccess }: PMExecutionModalProps) {
    const { t } = useLanguage();
    const [details, setDetails] = useState("");
    const [technician, setTechnician] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="บันทึกผลการซ่อมบำรุง (PM)">
            <div className="space-y-6">
                {/* Header Information */}
                <div className="p-4 bg-bg-tertiary rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                            <ActivityIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary">{plan.taskName}</h3>
                            <p className="text-xs text-text-muted">{plan.machineName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-text-muted">
                            <ClockIcon size={12} />
                            <span>รอบทุก {plan.cycleMonths} เดือน</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Technician Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <UserIcon size={14} />
                            ผู้ปฏิบัติงาน
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="ระบุชื่อผู้ทำ"
                            className="input-field w-full"
                            value={technician}
                            onChange={(e) => setTechnician(e.target.value)}
                        />
                    </div>

                    {/* Work Details */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <FileTextIcon size={14} />
                            รายละเอียดการซ่อมบำรุง
                        </label>
                        <textarea
                            required
                            placeholder="ระบุสิ่งที่ทำ เช่น ทำความสะอาด, เปลี่ยนอะไหล่ชิ้นไหน..."
                            className="input-field w-full min-h-[100px] py-3 resize-none"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                    </div>

                    {/* Photo Evidence */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <CameraIcon size={14} />
                            รูปถ่ายหลังการทำงาน (หลักฐาน)
                        </label>

                        {!imagePreview ? (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent-blue/50 hover:text-accent-blue transition-all bg-white/5"
                            >
                                <PlusIcon size={24} />
                                <span className="text-sm">กดเพื่อถ่ายรูปหรืออัปโหลดรูป</span>
                            </button>
                        ) : (
                            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
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
                    <div className="bg-accent-green/5 border border-accent-green/20 p-4 rounded-xl">
                        <p className="text-xs text-accent-green/80 flex items-start gap-2 leading-relaxed">
                            <CheckCircleIcon size={14} className="mt-0.5 shrink-0" />
                            <span>
                                เมื่อกดยืนยัน ระบบจะบันทึกประวัติ และคำนวณวันซ่อมบำรุงรอบถัดไป (ในอีก {plan.cycleMonths} เดือน) ให้โดยอัตโนมัติ
                            </span>
                        </p>
                    </div>

                    {/* Action Buttons */}
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
                            disabled={loading || !technician || !details}
                            className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircleIcon size={18} />
                                    ยืนยันและรันรอบถัดไป
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
