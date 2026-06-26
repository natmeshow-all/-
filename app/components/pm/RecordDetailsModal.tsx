"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { MaintenanceRecord } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { updateMaintenanceRecord } from "../../lib/firebaseService";
import Image from "next/image";
import {
    FileTextIcon,
    CameraIcon,
    CheckCircleIcon,
    ClockIcon,
    ActivityIcon,
    TargetIcon,
    EditIcon,
    SaveIcon,
    XIcon,
} from "../ui/Icons";

interface RecordDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: MaintenanceRecord | null;
    onRecordUpdated?: (updated: MaintenanceRecord) => void;
}

// Checklist value presets
const CHECKLIST_PRESETS = [
    "สมบูรณ์", "ปกติ", "เรียบร้อย", "ไม่มีรอย", "ไม่มี",
    "พอใช้", "เหมาะสม", "เฝ้าระวัง",
    "ผิดปกติ", "ต้องเติม", "ถึงกำหนดเปลี่ยน",
];

export default function RecordDetailsModal({
    isOpen,
    onClose,
    record,
    onRecordUpdated,
}: RecordDetailsModalProps) {
    const { t } = useLanguage();
    const { isAdmin } = useAuth();
    const { success, error: showError } = useToast();

    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [editStatus, setEditStatus] = useState<string>("");
    const [editChecklist, setEditChecklist] = useState<{ item: string; completed: boolean; value?: string }[]>([]);
    const [editDetails, setEditDetails] = useState<string>("");
    const [editNotes, setEditNotes] = useState<string>("");

    useEffect(() => {
        if (record) {
            setEditStatus(record.status);
            setEditChecklist(record.checklist ? record.checklist.map(c => ({ ...c })) : []);
            setEditDetails(record.details || "");
            setEditNotes(record.notes || "");
        }
        setIsEditMode(false);
    }, [record]);

    if (!record) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: Partial<MaintenanceRecord> = {
                status: editStatus as any,
                details: editDetails,
                notes: editNotes,
                checklist: editChecklist,
            };
            await updateMaintenanceRecord(record.id, updates);
            success("บันทึกการแก้ไขเรียบร้อยแล้ว");
            if (onRecordUpdated) {
                onRecordUpdated({ ...record, ...updates });
            }
            setIsEditMode(false);
        } catch (err) {
            console.error(err);
            showError("เกิดข้อผิดพลาดในการบันทึก", "Error");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original
        setEditStatus(record.status);
        setEditChecklist(record.checklist ? record.checklist.map(c => ({ ...c })) : []);
        setEditDetails(record.details || "");
        setEditNotes(record.notes || "");
        setIsEditMode(false);
    };

    const updateChecklistItem = (idx: number, field: "completed" | "value", val: any) => {
        setEditChecklist(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            return next;
        });
    };

    const displayStatus = isEditMode ? editStatus : record.status;
    const displayChecklist = isEditMode ? editChecklist : (record.checklist || []);

    const statusOptions = [
        { value: "completed", label: "เสร็จสิ้น", color: "text-accent-green" },
        { value: "inProgress", label: "กำลังดำเนินการ", color: "text-accent-yellow" },
        { value: "pending", label: "รอดำเนินการ", color: "text-accent-red" },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={record.machineName}
            size="xl"
            footer={
                <div className="flex gap-2">
                    {isAdmin && isEditMode ? (
                        <>
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="flex-1 py-2 rounded-lg bg-bg-tertiary text-text-muted font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <XIcon size={14} />
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-2 rounded-lg bg-accent-blue/20 border border-accent-blue/40 text-white font-bold hover:bg-accent-blue/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-white" />
                                ) : (
                                    <SaveIcon size={14} />
                                )}
                                บันทึกการแก้ไข
                            </button>
                        </>
                    ) : (
                        <>
                            {isAdmin && (
                                <button
                                    onClick={() => setIsEditMode(true)}
                                    className="py-2 px-4 rounded-lg bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow font-bold hover:bg-accent-yellow/20 transition-colors flex items-center gap-2"
                                >
                                    <EditIcon size={14} />
                                    แก้ไข
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex-1 py-2 rounded-lg bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                            >
                                {t("actionCloseWindow")}
                            </button>
                        </>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* Edit Mode Banner */}
                {isEditMode && (
                    <div className="flex items-center gap-2 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl px-4 py-2.5">
                        <EditIcon size={14} className="text-accent-yellow" />
                        <span className="text-accent-yellow text-xs font-bold">โหมดแก้ไข — การเปลี่ยนแปลงจะมีผลหลังกด "บันทึก"</span>
                    </div>
                )}

                {/* Header Information */}
                <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-border-light">
                    <div>
                        <p className="text-sm text-text-muted">{t("maintenanceDescription")}</p>
                        <p className="font-semibold text-text-primary text-lg">{record.description}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {isEditMode ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">สถานะ:</span>
                                <div className="flex gap-1.5">
                                    {statusOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setEditStatus(opt.value)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all
                                                ${editStatus === opt.value
                                                    ? `bg-white/10 border-white/30 ${opt.color}`
                                                    : 'border-white/10 text-text-muted hover:border-white/20'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <span className={`badge ${displayStatus === 'completed' ? 'badge-success' : displayStatus === 'inProgress' ? 'badge-warning' : 'badge-primary'}`}>
                                {t(`maintenanceStatus${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}` as any)}
                            </span>
                        )}
                        <span className="badge badge-primary">
                            {t(`type${record.type.charAt(0).toUpperCase() + record.type.slice(1)}` as any)}
                        </span>
                    </div>
                </div>

                <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                    {/* Left Column: Details & Evidence */}
                    <div className="space-y-4">
                        {/* Details Text Section */}
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <p className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                <FileTextIcon size={12} /> {t("labelWorkDetails")}
                            </p>
                            {isEditMode ? (
                                <textarea
                                    className="input-field w-full text-sm resize-none min-h-[80px] bg-black/30"
                                    value={editDetails}
                                    onChange={e => setEditDetails(e.target.value)}
                                    placeholder="รายละเอียดงาน..."
                                />
                            ) : (
                                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                                    {record.details || "-"}
                                </div>
                            )}
                        </div>

                        {/* Additional Notes */}
                        {(record.notes || isEditMode) && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                    <FileTextIcon size={12} /> {t("maintenanceAdditionalNotes")}
                                </p>
                                {isEditMode ? (
                                    <textarea
                                        className="input-field w-full text-sm resize-none min-h-[60px] bg-black/30"
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        placeholder="หมายเหตุเพิ่มเติม..."
                                    />
                                ) : (
                                    <div className="text-sm text-text-muted italic whitespace-pre-wrap leading-relaxed">
                                        {record.notes}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Technical Data */}
                    <div className="space-y-4">
                        {/* Part Change Specifics */}
                        {(record.partId || record.isOverhaul) && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-3">
                                    {(record.machineHours || record.lifespanValue || record.serialNumber || (record as any).partLifespan) && (
                                        <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                <ClockIcon size={12} /> {t("labelLifespanTracking")}
                                            </p>
                                            <div className="space-y-1.5 px-1">
                                                {record.machineHours && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-text-muted flex items-center gap-1">
                                                            <ClockIcon size={10} /> {t("labelReading")}:
                                                        </span>
                                                        <span className="text-text-primary font-bold">
                                                            {record.machineHours} {t("labelHoursShort")}
                                                        </span>
                                                    </div>
                                                )}
                                                {record.lifespanValue && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-text-muted">{t("labelExpectedLifespan")}:</span>
                                                        <span className="text-text-primary font-medium">
                                                            {record.lifespanValue} {record.lifespanUnit ? t(`label${record.lifespanUnit.charAt(0).toUpperCase() + record.lifespanUnit.slice(1)}` as any) : ''}
                                                        </span>
                                                    </div>
                                                )}
                                                {(record as any).partLifespan && (
                                                    <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                                                        <span className="text-accent-blue font-semibold">{t("labelActualLifespan")}:</span>
                                                        <span className="text-accent-blue font-bold">{(record as any).partLifespan}</span>
                                                    </div>
                                                )}
                                                {record.serialNumber && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-text-muted">{t("labelSerialBatch")}:</span>
                                                        <span className="font-mono text-accent-cyan">{record.serialNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(record.changeReason || record.partCondition) && (
                                        <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                <ActivityIcon size={12} className="text-accent-blue" /> {t("labelAnalysisContext")}
                                            </p>
                                            <div className="space-y-1.5 px-1">
                                                {record.changeReason && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-text-muted">{t("maintenanceChangeReason")}:</span>
                                                        <span className={`font-bold ${record.changeReason === 'failed' ? 'text-accent-red' : 'text-accent-blue'}`}>
                                                            {t(`maintenanceReason${record.changeReason.charAt(0).toUpperCase() + record.changeReason.slice(1)}` as any)}
                                                        </span>
                                                    </div>
                                                )}
                                                {record.partCondition && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-text-muted">{t("maintenanceOldPartStatus")}:</span>
                                                        <span className="text-text-primary font-medium">
                                                            {t(`maintenanceCondition${record.partCondition.charAt(0).toUpperCase() + record.partCondition.slice(1)}` as any)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Technical Data Section */}
                                {record.motorGearData && (
                                    <div className="grid grid-cols-1 gap-3">
                                        {(record.motorGearData.motorSize || record.motorGearData.temperature || record.motorGearData.currentIdle || record.motorGearData.currentLoad || record.motorGearData.voltageL1 || record.motorGearData.voltageL2 || record.motorGearData.voltageL3) && (
                                            <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                                <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                    <ActivityIcon size={12} /> {t("maintenanceMotorGearInfo")}
                                                </p>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                                                    {record.motorGearData.motorSize && (
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-text-muted">{t("labelSize")}:</span>
                                                            <span className="text-text-primary font-medium">{record.motorGearData.motorSize}</span>
                                                        </div>
                                                    )}
                                                    {record.motorGearData.temperature && (
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-text-muted">{t("labelTemp")}:</span>
                                                            <span className="text-text-primary font-medium">{record.motorGearData.temperature} °C</span>
                                                        </div>
                                                    )}
                                                    {record.motorGearData.currentIdle && (
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-text-muted">{t("labelIdleA")}:</span>
                                                            <span className="text-text-primary font-medium">{record.motorGearData.currentIdle}</span>
                                                        </div>
                                                    )}
                                                    {record.motorGearData.currentLoad && (
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-text-muted">{t("labelLoadA")}:</span>
                                                            <span className="text-text-primary font-medium">{record.motorGearData.currentLoad}</span>
                                                        </div>
                                                    )}
                                                    {(record.motorGearData.voltageL1 || record.motorGearData.voltageL2 || record.motorGearData.voltageL3) && (
                                                        <div className="col-span-2 flex justify-between text-[10px] pt-1 border-t border-white/5">
                                                            <span className="text-text-muted">{t("labelVoltageL1L2L3")}:</span>
                                                            <span className="text-accent-cyan font-mono">
                                                                {record.motorGearData.voltageL1 || '-'}/{record.motorGearData.voltageL2 || '-'}/{record.motorGearData.voltageL3 || '-'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(record.motorGearData.shaftData?.shaftBend || record.motorGearData.shaftData?.dialGauge || record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value) && (
                                            <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                                <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                    <TargetIcon size={12} /> {t("maintenanceShaftInfo")}
                                                </p>
                                                <div className="space-y-1.5 px-1">
                                                    {record.motorGearData.shaftData?.shaftBend && (
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-text-muted">{t("maintenanceShaftBend")}:</span>
                                                            <span className="text-text-primary font-medium">{record.motorGearData.shaftData.shaftBend}</span>
                                                        </div>
                                                    )}
                                                    {record.motorGearData.shaftData?.dialGauge && (
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-text-muted">{t("maintenanceDialGauge")}:</span>
                                                            <span className="text-text-primary font-medium">{record.motorGearData.shaftData.dialGauge}</span>
                                                        </div>
                                                    )}
                                                    {(record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value) && (
                                                        <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                                                            <span className="text-[10px] text-text-muted">{t("labelVibrationXYZ")}:</span>
                                                            <div className="flex gap-2">
                                                                {record.motorGearData.vibrationX?.value && (
                                                                    <span className={`text-[10px] px-1 rounded ${record.motorGearData.vibrationX?.level === 'normal' ? 'bg-accent-green/10 text-accent-green' : record.motorGearData.vibrationX?.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                        X: {record.motorGearData.vibrationX.value}
                                                                    </span>
                                                                )}
                                                                {record.motorGearData.vibrationY?.value && (
                                                                    <span className={`text-[10px] px-1 rounded ${record.motorGearData.vibrationY?.level === 'normal' ? 'bg-accent-green/10 text-accent-green' : record.motorGearData.vibrationY?.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                        Y: {record.motorGearData.vibrationY.value}
                                                                    </span>
                                                                )}
                                                                {record.motorGearData.vibrationZ?.value && (
                                                                    <span className={`text-[10px] px-1 rounded ${record.motorGearData.vibrationZ?.level === 'normal' ? 'bg-accent-green/10 text-accent-green' : record.motorGearData.vibrationZ?.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                        Z: {record.motorGearData.vibrationZ.value}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Checklist Audit Section */}
                        {displayChecklist.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                    <CheckCircleIcon size={12} className="text-accent-green" /> {t("labelAuditChecklist")}
                                    {isEditMode && (
                                        <span className="text-accent-yellow text-[10px] font-normal normal-case ml-1">(คลิกที่รายการเพื่อแก้ไข)</span>
                                    )}
                                </p>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                    {displayChecklist.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex flex-col p-2 rounded-lg border transition-all
                                                ${isEditMode
                                                    ? 'bg-white/5 border-accent-yellow/20 hover:border-accent-yellow/40'
                                                    : 'bg-white/5 border-white/5'}`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] text-text-secondary font-medium truncate">{item.item}</span>
                                                {isEditMode ? (
                                                    <button
                                                        onClick={() => updateChecklistItem(idx, "completed", !item.completed)}
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all flex-shrink-0
                                                            ${item.completed
                                                                ? 'bg-accent-green/10 border-accent-green/30 text-accent-green hover:bg-accent-red/10 hover:border-accent-red/30 hover:text-accent-red'
                                                                : 'bg-accent-red/10 border-accent-red/30 text-accent-red hover:bg-accent-green/10 hover:border-accent-green/30 hover:text-accent-green'}`}
                                                    >
                                                        {item.completed ? '✓ PASS' : '✗ FAIL'}
                                                    </button>
                                                ) : (
                                                    <span className={`text-[10px] font-bold ${item.completed ? 'text-accent-green' : 'text-accent-red'}`}>
                                                        {item.completed ? 'PASS' : 'FAIL'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Value display/edit */}
                                            {isEditMode ? (
                                                <div className="mt-1.5 flex gap-1 flex-wrap">
                                                    <input
                                                        type="text"
                                                        value={item.value || ""}
                                                        onChange={e => updateChecklistItem(idx, "value", e.target.value)}
                                                        placeholder="ระบุค่า..."
                                                        className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded px-2 py-0.5 text-[11px] text-text-primary focus:outline-none focus:border-accent-yellow/40"
                                                    />
                                                    {/* Quick presets */}
                                                    <div className="flex flex-wrap gap-1 mt-1 w-full">
                                                        {CHECKLIST_PRESETS.map(preset => (
                                                            <button
                                                                key={preset}
                                                                onClick={() => {
                                                                    updateChecklistItem(idx, "value", preset);
                                                                    // Auto-set completed based on preset
                                                                    const isGood = ["สมบูรณ์", "ปกติ", "เรียบร้อย", "ไม่มีรอย", "ไม่มี", "พอใช้", "เหมาะสม"].includes(preset);
                                                                    updateChecklistItem(idx, "completed", isGood);
                                                                }}
                                                                className={`text-[9px] px-1.5 py-0.5 rounded border transition-all
                                                                    ${["สมบูรณ์", "ปกติ", "เรียบร้อย", "ไม่มีรอย", "ไม่มี", "เหมาะสม"].includes(preset)
                                                                        ? 'border-accent-green/20 text-accent-green/80 hover:bg-accent-green/10'
                                                                        : ["เฝ้าระวัง", "พอใช้"].includes(preset)
                                                                            ? 'border-accent-yellow/20 text-accent-yellow/80 hover:bg-accent-yellow/10'
                                                                            : 'border-accent-red/20 text-accent-red/80 hover:bg-accent-red/10'}
                                                                    bg-black/20`}
                                                            >
                                                                {preset}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                item.value && (
                                                    <span className="text-[10px] text-white/40 mt-1 italic font-mono">Value: {item.value}</span>
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Evidence Photos */}
                {record.evidencePhotos && record.evidencePhotos.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                            <CameraIcon size={12} className="text-accent-blue" /> {t("maintenanceEvidencePhotos")} ({record.evidencePhotos.length})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {record.evidencePhotos.map((photo, idx) => (
                                <div
                                    key={idx}
                                    className="relative aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-accent-blue/40 transition-all group"
                                    onClick={() => window.open(photo, "_blank")}
                                >
                                    <Image
                                        src={photo}
                                        alt={`Evidence ${idx + 1}`}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                        <CameraIcon size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
