"use client";

import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../ui/Modal";
import { addMaintenanceRecord } from "../../lib/firebaseService";
import {
    EditIcon,
    InfoIcon,
    SettingsIcon,
    FileTextIcon,
    CalendarIcon,
    ClockIcon,
    UserIcon,
    ZapIcon,
    ThermometerIcon,
    ActivityIcon,
    CheckIcon,
    RulerIcon,
    TargetIcon,
} from "../ui/Icons";
import { mockMachines, mockVoltageOptions } from "../../data/mockData";
import { MaintenanceRecordFormData, MaintenanceType, VibrationLevel } from "../../types";

import { TranslationKeys } from "../../translations";

interface MaintenanceRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const maintenanceTypes: { value: MaintenanceType; labelKey: keyof TranslationKeys }[] = [
    { value: "preventive", labelKey: "typePreventive" },
    { value: "corrective", labelKey: "typeCorrective" },
    { value: "oilChange", labelKey: "typeOilChange" },
    { value: "partReplacement", labelKey: "typePartReplacement" },
    { value: "inspection", labelKey: "typeInspection" },
];

const VibrationSection: React.FC<{
    axis: string;
    axisLabel: string;
    value: string;
    level: VibrationLevel;
    onValueChange: (value: string) => void;
    onLevelChange: (level: VibrationLevel) => void;
    t: (key: keyof TranslationKeys) => string;
}> = ({ axis, axisLabel, value, level, onValueChange, onLevelChange, t }) => (
    <div className="bg-bg-primary/50 rounded-lg p-3 border border-border-light">
        <h4 className="text-sm font-medium text-text-primary mb-2">{axisLabel}</h4>
        <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={t("placeholderVibration")}
            className="input text-sm mb-2"
        />
        <div className="space-y-1">
            {(["normal", "medium", "abnormal"] as VibrationLevel[]).map((lvl) => (
                <label key={lvl} className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name={`vibration-${axis}`}
                        checked={level === lvl}
                        onChange={() => onLevelChange(lvl)}
                        className="w-3 h-3 accent-primary"
                    />
                    <span className={`text-xs ${lvl === "normal" ? "text-accent-green" :
                        lvl === "medium" ? "text-accent-yellow" :
                            "text-accent-red"
                        }`}>
                        {lvl === "normal" ? `✓ ${t("maintenanceVibrationNormal")}` :
                            lvl === "medium" ? `⚠ ${t("maintenanceVibrationMedium")}` :
                                `✕ ${t("maintenanceVibrationAbnormal")}`}
                    </span>
                </label>
            ))}
        </div>
    </div>
);

export default function MaintenanceRecordModal({
    isOpen,
    onClose,
    onSuccess
}: MaintenanceRecordModalProps) {
    const { t } = useLanguage();
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<MaintenanceRecordFormData>({
        machineId: "",
        description: "",
        type: "preventive",
        priority: "normal",
        date: new Date().toISOString().split("T")[0],
        duration: "",
        technician: "",
        status: "completed",
        motorSize: "",
        vibrationXValue: "",
        vibrationXLevel: "normal",
        vibrationYValue: "",
        vibrationYLevel: "normal",
        vibrationZValue: "",
        vibrationZLevel: "normal",
        voltageL1: "",
        voltageL2: "",
        voltageL3: "",
        currentIdle: "",
        currentLoad: "",
        temperature: "",
        shaftBend: "",
        dialGauge: "",
        details: "",
        notes: "",
    });

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleVibrationChange = (
        axis: "X" | "Y" | "Z",
        field: "value" | "level",
        value: string | VibrationLevel
    ) => {
        const key = field === "value"
            ? `vibration${axis}Value`
            : `vibration${axis}Level`;
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        // Validation with toast
        if (!formData.machineId) {
            toast.warning(t("msgRequiredInfo"), t("msgSelectMachine"));
            return;
        }
        if (!formData.description) {
            toast.warning(t("msgRequiredInfo"), t("msgSpecifyDetails"));
            return;
        }

        try {
            setIsSubmitting(true);

            // Add machine name based on ID
            const machine = mockMachines.find(m => m.id === formData.machineId);

            const dataToSubmit: any = {
                machineId: formData.machineId,
                machineName: machine?.name || "Unknown Machine",
                description: formData.description,
                type: formData.type,
                priority: formData.priority,
                date: new Date(formData.date),
                duration: parseInt(formData.duration) || 0,
                technician: formData.technician,
                status: formData.status,
                details: formData.details,
                notes: formData.notes,
                motorGearData: {
                    motorSize: formData.motorSize,
                    vibrationX: { value: formData.vibrationXValue, level: formData.vibrationXLevel },
                    vibrationY: { value: formData.vibrationYValue, level: formData.vibrationYLevel },
                    vibrationZ: { value: formData.vibrationZValue, level: formData.vibrationZLevel },
                    voltageL1: formData.voltageL1,
                    voltageL2: formData.voltageL2,
                    voltageL3: formData.voltageL3,
                    currentIdle: formData.currentIdle,
                    currentLoad: formData.currentLoad,
                    temperature: formData.temperature,
                    shaftData: {
                        shaftBend: formData.shaftBend,
                        dialGauge: formData.dialGauge,
                    }
                }
            };

            await addMaintenanceRecord(dataToSubmit);

            // Show success toast
            toast.success(t("msgSaveSuccess"), t("msgSaveSuccess"));

            if (onSuccess) {
                onSuccess();
            }

            onClose();
            // Reset form could go here
        } catch (error: any) {
            console.error("Error adding maintenance record:", error);
            const errorMessage = error?.message || "Unknown error occurred";
            if (errorMessage.includes("insufficient permissions")) {
                toast.error(t("msgNoAccess"), t("msgCheckRules"));
            } else {
                toast.error(t("msgError"), t("msgSaveError"));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("maintenanceTitle")}
            titleIcon={<EditIcon size={18} />}
            size="xl"
            footer={
                <>
                    <button onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
                        <span className="flex items-center gap-2">
                            ✕ {t("actionCancel")}
                        </span>
                    </button>
                    <button onClick={handleSubmit} className="btn btn-secondary" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                {t("msgSavingData")}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckIcon size={16} />
                                {t("maintenanceSaveRecord")}
                            </span>
                        )}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Section 1: General Information */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <InfoIcon size={16} />
                        {t("maintenanceGeneralInfo")}
                    </h3>
                    <div className="form-grid form-grid-2">
                        <div>
                            <label className="label">
                                <SettingsIcon size={14} />
                                {t("maintenanceMachine")}
                            </label>
                            <select
                                name="machineId"
                                value={formData.machineId}
                                onChange={handleInputChange}
                                className="input select"
                            >
                                <option value="">{t("maintenanceSelectMachine")}</option>
                                {mockMachines.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">
                                <FileTextIcon size={14} />
                                {t("maintenanceDescription")}
                            </label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder={t("placeholderDescription")}
                                className="input"
                            />
                        </div>
                    </div>
                    <div className="form-grid form-grid-2 mt-3">
                        <div>
                            <label className="label">
                                <SettingsIcon size={14} />
                                {t("maintenanceType")}
                            </label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="input select"
                            >
                                <option value="">{t("maintenanceSelectType")}</option>
                                {maintenanceTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {t(type.labelKey)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">
                                <ActivityIcon size={14} />
                                {t("maintenancePriority")}
                            </label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleInputChange}
                                className="input select"
                            >
                                <option value="normal">{t("maintenancePriorityNormal")}</option>
                                <option value="high">{t("maintenancePriorityHigh")}</option>
                                <option value="urgent">{t("maintenancePriorityUrgent")}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Operation Details */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <ClockIcon size={16} />
                        {t("maintenanceOperationInfo")}
                    </h3>
                    <div className="form-grid form-grid-2">
                        <div>
                            <label className="label">
                                <CalendarIcon size={14} />
                                {t("maintenanceDate")}
                            </label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <ClockIcon size={14} />
                                {t("maintenanceDuration")}
                            </label>
                            <input
                                type="text"
                                name="duration"
                                value={formData.duration}
                                onChange={handleInputChange}
                                placeholder={t("placeholderDuration")}
                                className="input"
                            />
                        </div>
                    </div>
                    <div className="form-grid form-grid-2 mt-3">
                        <div>
                            <label className="label">
                                <UserIcon size={14} />
                                {t("maintenanceTechnician")}
                            </label>
                            <input
                                type="text"
                                name="technician"
                                value={formData.technician}
                                onChange={handleInputChange}
                                placeholder={t("placeholderTechnician")}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <CheckIcon size={14} />
                                {t("maintenanceStatus")}
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="input select"
                            >
                                <option value="pending">{t("maintenanceStatusPending")}</option>
                                <option value="inProgress">{t("maintenanceStatusInProgress")}</option>
                                <option value="completed">{t("maintenanceStatusCompleted")}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 3: Motor & Gear Data */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <SettingsIcon size={16} />
                        {t("maintenanceMotorGearInfo")}
                    </h3>

                    {/* Motor Size */}
                    <div className="mb-4">
                        <label className="label">
                            <SettingsIcon size={14} />
                            {t("maintenanceMotorSize")}
                            <span className="text-text-muted font-normal ml-1">
                                {t("maintenanceMotorSizeHint")}
                            </span>
                        </label>
                        <input
                            type="text"
                            name="motorSize"
                            value={formData.motorSize}
                            onChange={handleInputChange}
                            placeholder={t("placeholderMotorSize")}
                            className="input"
                        />
                    </div>

                    {/* Vibration */}
                    <div className="mb-4">
                        <label className="label">
                            <ActivityIcon size={14} />
                            {t("maintenanceVibration")}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <VibrationSection
                                axis="X"
                                axisLabel={t("maintenanceAxisX")}
                                value={formData.vibrationXValue}
                                level={formData.vibrationXLevel}
                                onValueChange={(v) => handleVibrationChange("X", "value", v)}
                                onLevelChange={(l) => handleVibrationChange("X", "level", l)}
                                t={t}
                            />
                            <VibrationSection
                                axis="Y"
                                axisLabel={t("maintenanceAxisY")}
                                value={formData.vibrationYValue}
                                level={formData.vibrationYLevel}
                                onValueChange={(v) => handleVibrationChange("Y", "value", v)}
                                onLevelChange={(l) => handleVibrationChange("Y", "level", l)}
                                t={t}
                            />
                            <VibrationSection
                                axis="Z"
                                axisLabel={t("maintenanceAxisZ")}
                                value={formData.vibrationZValue}
                                level={formData.vibrationZLevel}
                                onValueChange={(v) => handleVibrationChange("Z", "value", v)}
                                onLevelChange={(l) => handleVibrationChange("Z", "level", l)}
                                t={t}
                            />
                        </div>
                    </div>

                    {/* Voltage */}
                    <div className="mb-4">
                        <label className="label">
                            <ZapIcon size={14} />
                            {t("maintenanceVoltage")}
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {["L1", "L2", "L3"].map((phase, index) => (
                                <div key={phase}>
                                    <span className="text-xs text-text-muted mb-1 block">{phase} (V)</span>
                                    <select
                                        name={`voltage${phase}`}
                                        value={formData[`voltageL${index + 1}` as keyof MaintenanceRecordFormData] as string}
                                        onChange={handleInputChange}
                                        className="input select text-sm"
                                    >
                                        <option value="">{t("maintenanceSelectVoltage")}</option>
                                        {mockVoltageOptions.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Current */}
                    <div className="mb-4">
                        <label className="label">
                            <ZapIcon size={14} />
                            {t("maintenanceCurrent")}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="text-xs text-text-muted mb-1 block">
                                    {t("maintenanceCurrentIdle")}
                                </span>
                                <input
                                    type="text"
                                    name="currentIdle"
                                    value={formData.currentIdle}
                                    onChange={handleInputChange}
                                    placeholder={t("placeholderCurrentIdle")}
                                    className="input"
                                />
                            </div>
                            <div>
                                <span className="text-xs text-text-muted mb-1 block">
                                    {t("maintenanceCurrentLoad")}
                                </span>
                                <input
                                    type="text"
                                    name="currentLoad"
                                    value={formData.currentLoad}
                                    onChange={handleInputChange}
                                    placeholder={t("placeholderCurrentLoad")}
                                    className="input"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Temperature */}
                    <div>
                        <label className="label">
                            <ThermometerIcon size={14} />
                            {t("maintenanceTemperature")}
                            <span className="text-text-muted font-normal ml-1">
                                {t("maintenanceTemperatureHint")}
                            </span>
                        </label>
                        <input
                            type="text"
                            name="temperature"
                            value={formData.temperature}
                            onChange={handleInputChange}
                            placeholder={t("placeholderTemperature")}
                            className="input"
                        />
                        <p className="mt-1 text-xs text-text-muted flex items-center gap-1">
                            <InfoIcon size={12} />
                            {t("msgMaintenanceDocHint")}
                        </p>
                    </div>
                </div>

                {/* Section 4: Shaft & Dial Gauge Data (NEW) */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <RulerIcon size={16} />
                        {t("maintenanceShaftInfo")}
                    </h3>
                    <div className="form-grid form-grid-2">
                        <div>
                            <label className="label">
                                <TargetIcon size={14} />
                                {t("maintenanceShaftBend")}
                            </label>
                            <input
                                type="text"
                                name="shaftBend"
                                value={formData.shaftBend}
                                onChange={handleInputChange}
                                placeholder={t("placeholderShaftBend")}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <RulerIcon size={14} />
                                {t("maintenanceDialGauge")}
                            </label>
                            <input
                                type="text"
                                name="dialGauge"
                                value={formData.dialGauge}
                                onChange={handleInputChange}
                                placeholder={t("placeholderDialGauge")}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 5: Details & Notes */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <FileTextIcon size={16} />
                        {t("maintenanceDetailsNotes")}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="label">
                                <FileTextIcon size={14} />
                                {t("maintenanceDetailDescription")}
                            </label>
                            <textarea
                                name="details"
                                value={formData.details}
                                onChange={handleInputChange}
                                placeholder={t("placeholderMaintenanceDetails")}
                                rows={3}
                                className="input resize-none"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <EditIcon size={14} />
                                {t("maintenanceAdditionalNotes")}
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder={t("placeholderAdditionalNotes")}
                                rows={2}
                                className="input resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
