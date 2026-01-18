"use client";

import React from "react";
import Modal from "../ui/Modal";
import { MaintenanceRecord } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import Image from "next/image";
import {
    FileTextIcon,
    CameraIcon,
    CheckCircleIcon,
    ClockIcon,
    ActivityIcon,
    TargetIcon,
} from "../ui/Icons";

interface RecordDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: MaintenanceRecord | null;
}

export default function RecordDetailsModal({
    isOpen,
    onClose,
    record
}: RecordDetailsModalProps) {
    const { t } = useLanguage();

    if (!record) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={record.machineName}
            size="xl"
            footer={
                <button
                    onClick={onClose}
                    className="w-full py-2 rounded-lg bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                >
                    {t("actionCloseWindow")}
                </button>
            }
        >
            <div className="space-y-6">
                {/* Header Information */}
                <div className="flex flex-wrap gap-4 items-center justify-between pb-4 border-b border-border-light">
                    <div>
                        <p className="text-sm text-text-muted">{t("maintenanceDescription")}</p>
                        <p className="font-semibold text-text-primary text-lg">{record.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <span className={`badge ${record.status === 'completed' ? 'badge-success' : record.status === 'inProgress' ? 'badge-warning' : 'badge-primary'}`}>
                            {t(`maintenanceStatus${record.status.charAt(0).toUpperCase() + record.status.slice(1)}` as any)}
                        </span>
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
                            <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                                {record.details || "-"}
                            </div>
                        </div>

                        {/* Additional Notes */}
                        {record.notes && (
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <p className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                    <FileTextIcon size={12} /> {t("maintenanceAdditionalNotes")}
                                </p>
                                <div className="text-sm text-text-muted italic whitespace-pre-wrap leading-relaxed">
                                    {record.notes}
                                </div>
                            </div>
                        )}

                        {/* Evidence Photo */}
                        {record.evidenceImageUrl && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                    <CameraIcon size={12} /> {t("labelEvidencePhotoShort")}
                                </p>
                                <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-white/10 group">
                                    <Image
                                        src={record.evidenceImageUrl}
                                        alt="Evidence"
                                        fill
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                </div>
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
                                        {/* Motor & Gear Data Box */}
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

                                        {/* Shaft & Dial Gauge Data Box */}
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
                        {record.checklist && record.checklist.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                    <CheckCircleIcon size={12} className="text-accent-green" /> {t("labelAuditChecklist")}
                                </p>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                    {record.checklist.map((item, idx) => (
                                        <div key={idx} className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[11px] text-text-secondary font-medium truncate">{item.item}</span>
                                                <span className={`text-[10px] font-bold ${item.completed ? 'text-accent-green' : 'text-accent-red'}`}>
                                                    {item.completed ? 'PASS' : 'FAIL'}
                                                </span>
                                            </div>
                                            {item.value && (
                                                <span className="text-[10px] text-white/40 mt-1 italic font-mono">Value: {item.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
} 
