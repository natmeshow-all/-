"use client";

import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../ui/Modal";
import { addMaintenanceRecord, uploadMaintenanceEvidence } from "../../lib/firebaseService";
import { useAuth } from "../../contexts/AuthContext";
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
    BoxIcon,
    RefreshCwIcon,
    TrendingUpIcon,
    AlertTriangleIcon,
    ImageIcon,
    TrashIcon,
} from "../ui/Icons";
import { mockMachines, mockVoltageOptions } from "../../data/mockData";
import { MaintenanceRecordFormData, MaintenanceType, VibrationLevel, Part, Machine } from "../../types";
import { getParts, getMachines } from "../../lib/firebaseService";
import { useEffect } from "react";

import { TranslationKeys } from "../../translations";

interface MaintenanceRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialPart?: Part;
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
    onSuccess,
    initialPart
}: MaintenanceRecordModalProps) {
    const { t } = useLanguage();
    const toast = useToast();
    const { userProfile } = useAuth();
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
        startTime: "",
        endTime: "",

        // Part selection
        partId: "",
        manualPartName: "",
        isOverhaul: false,
        lifespanValue: "",
        lifespanUnit: "months",
        serialNumber: "",

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

        // Advanced
        machineHours: "",
        changeReason: "worn",
        partCondition: "poor",

        period: "routine",
    });

    const [allParts, setAllParts] = useState<Part[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [locationFilter, setLocationFilter] = useState<string>("All");
    const [loadingParts, setLoadingParts] = useState(false);

    // Image Upload State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Handle Image Selection
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
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [machinesData, partsData] = await Promise.all([
                    getMachines(),
                    getParts()
                ]);
                setMachines(machinesData);
                setAllParts(partsData);

                // Set initial part data if provided and we have the data
                if (initialPart) {
                    // Try to find machine ID even if we only have name
                    let targetMachineId = initialPart.machineId;
                    if (!targetMachineId && initialPart.machineName) {
                        const m = machinesData.find(mach =>
                            mach.name?.toLowerCase() === initialPart.machineName?.toLowerCase()
                        );
                        if (m) targetMachineId = m.id;
                    }

                    setFormData(prev => ({
                        ...prev,
                        machineId: targetMachineId || "",
                        partId: initialPart.id || "",
                        type: "partReplacement",
                        isOverhaul: initialPart.partName?.toLowerCase().includes("overhaul") || false,
                        technician: userProfile?.nickname || userProfile?.displayName || ""
                    }));
                } else if (isOpen) {
                    // Reset to defaults if opening empty
                    setFormData({
                        machineId: "",
                        description: "",
                        type: "preventive",
                        priority: "normal",
                        date: new Date().toISOString().split("T")[0],
                        duration: "",
                        technician: userProfile?.nickname || userProfile?.displayName || "",
                        status: "completed",
                        startTime: "",
                        endTime: "",
                        partId: "",
                        manualPartName: "",
                        isOverhaul: false,
                        lifespanValue: "",
                        lifespanUnit: "months",
                        previousReplacementDate: "",
                        partLifespan: "",
                        serialNumber: "",
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
                        machineHours: "",
                        changeReason: "worn",
                        partCondition: "poor",
                    });
                } else if (isOpen && !formData.technician && userProfile) {
                    // Update technician if it was empty when opening
                    setFormData(prev => ({
                        ...prev,
                        technician: userProfile.nickname || userProfile.displayName || ""
                    }));
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };

        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen, initialPart, userProfile]);

    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const start = new Date(formData.startTime);
            const end = new Date(formData.endTime);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                const diffMs = end.getTime() - start.getTime();
                const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
                setFormData(prev => ({ ...prev, duration: diffDays.toString() }));
            }
        }
    }, [formData.startTime, formData.endTime]);

    // Auto-calculate Part Lifespan
    useEffect(() => {
        if (formData.previousReplacementDate && formData.endTime) {
            const prev = new Date(formData.previousReplacementDate);
            const current = new Date(formData.endTime);

            if (!isNaN(prev.getTime()) && !isNaN(current.getTime())) {
                prev.setHours(0, 0, 0, 0);
                current.setHours(0, 0, 0, 0);
                const diffMs = current.getTime() - prev.getTime();
                // If previous date is earlier than current, calculated days. Minimal is 0.
                const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

                // Format into years, months, days for display and submission
                let displayText = "";
                const years = Math.floor(diffDays / 365);
                const remainingDaysAfterYears = diffDays % 365;
                const months = Math.floor(remainingDaysAfterYears / 30);
                const days = remainingDaysAfterYears % 30;

                if (years > 0) displayText += `${years} ${t("unitYear")} `;
                if (months > 0) displayText += `${months} ${t("unitMonth")} `;
                if (days > 0 || displayText === "") displayText += `${days} ${t("unitDay")}`;

                setFormData(prevData => ({ ...prevData, partLifespan: displayText.trim() }));
            }
        }
    }, [formData.previousReplacementDate, formData.endTime, t]);

    const filteredMachines = locationFilter === "All"
        ? machines
        : machines.filter(m => {
            const loc = (m.location || m.Location || "").toUpperCase();
            if (locationFilter === "UT") return loc === "UT" || loc === "UTILITY";
            return loc === locationFilter;
        });

    const filteredParts = allParts.filter(p => {
        if (!formData.machineId) return false;
        const selectedMachine = machines.find(m => m.id === formData.machineId);

        return (
            p.machineId === formData.machineId ||
            (p.machineName && selectedMachine && p.machineName === selectedMachine.name) ||
            ((p as any).machine && selectedMachine && (p as any).machine === selectedMachine.name)
        );
    });
    const selectedPartData = allParts.find(p => p.id === formData.partId);
    const isPartChange = !!(initialPart || formData.partId || formData.isOverhaul || formData.type === "partReplacement");

    // Check if part is Motor or Gear by category OR part name (case-insensitive)
    const isMotorOrGear = (() => {
        if (!selectedPartData) return false;
        const category = (selectedPartData.category || '').toLowerCase();
        const partName = (selectedPartData.partName || '').toLowerCase();
        return category.includes('motor') || category.includes('gear') ||
            partName.includes('motor') || partName.includes('gear') ||
            partName.includes('มอเตอร์') || partName.includes('เกียร์');
    })();

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        if (name === "machineId") {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                partId: "", // Reset part when machine changes
                manualPartName: ""
            }));
            return;
        }

        if (name === "partId") {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                isOverhaul: false, // Mutually exclusive
                type: value ? "partReplacement" : prev.type
            }));
            return;
        }

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

        try {
            setIsSubmitting(true);

            // Add machine name based on ID
            const machine = machines.find(m => m.id === formData.machineId);

            const dataToSubmit: any = {
                machineId: formData.machineId,
                machineName: machine?.name || "Unknown Machine",
                type: formData.type,
                priority: formData.priority,
                date: formData.startTime ? new Date(formData.startTime) : new Date(),
                startTime: formData.startTime ? new Date(formData.startTime) : undefined,
                endTime: formData.endTime ? new Date(formData.endTime) : undefined,
                duration: parseInt(formData.duration) || 0,
                technician: formData.technician,
                status: formData.status,
                details: formData.details,
                notes: formData.notes,

                // New fields
                partId: formData.partId === 'others' ? undefined : (formData.partId || undefined),
                partName: formData.partId === 'others' ? formData.manualPartName : undefined,
                isOverhaul: formData.isOverhaul,
                lifespanUnit: formData.lifespanUnit,
                serialNumber: formData.serialNumber,

                // Advanced tracking for analysis
                machineHours: parseFloat(formData.machineHours) || 0,
                changeReason: formData.changeReason,
                partCondition: formData.partCondition,
                previousReplacementDate: formData.previousReplacementDate || undefined,
                partLifespan: formData.partLifespan || undefined,

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
                },
                period: formData.period || "routine",
            };

            // Upload evidence image if selected
            if (imageFile) {
                setUploadingImage(true);
                try {
                    const evidenceUrl = await uploadMaintenanceEvidence(imageFile);
                    dataToSubmit.evidenceImageUrl = evidenceUrl;
                } catch (imgErr) {
                    console.error("Error uploading image:", imgErr);
                    // Continue without image if upload fails
                }
                setUploadingImage(false);
            }

            await addMaintenanceRecord(dataToSubmit);

            // Reset image state
            handleRemoveImage();

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
            title={
                formData.isOverhaul
                    ? t("maintenanceTitleOverhaul") || "บันทึก Overhaul"
                    : t("maintenanceTitlePartChange") || "บันทึกเปลี่ยนอะไหล่"
            }
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="label !mb-0">
                                    <SettingsIcon size={14} />
                                    {t("maintenanceMachine")}
                                </label>
                                <div className="flex gap-1">
                                    {["All", "FZ", "RTE", "UT"].map((loc) => (
                                        <button
                                            key={loc}
                                            type="button"
                                            onClick={() => setLocationFilter(loc)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${locationFilter === loc
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-bg-tertiary text-text-muted hover:text-text-primary'
                                                }`}
                                        >
                                            {loc}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <select
                                name="machineId"
                                value={formData.machineId}
                                onChange={handleInputChange}
                                className="input select"
                            >
                                <option value="">{t("maintenanceSelectMachine")}</option>
                                {filteredMachines.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} {m.location ? `[${m.location}]` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">
                                <BoxIcon size={14} />
                                {t("filterPartName")}
                            </label>
                            <select
                                name="partId"
                                value={formData.partId}
                                onChange={handleInputChange}
                                className="input select"
                                disabled={!formData.machineId}
                            >
                                <option value="">{t("addPartSelectPart")}</option>
                                {filteredParts.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.partName} {p.brand ? `(${p.brand})` : ''}
                                        {p.Location ? ` @ ${p.Location}` : ''}
                                    </option>
                                ))}
                                <option value="others">+ {t("labelOther") || "อื่นๆ (ระบุเอง)"}</option>
                            </select>

                            {formData.partId === "others" && (
                                <div className="mt-2 animate-fade-in">
                                    <input
                                        type="text"
                                        name="manualPartName"
                                        value={formData.manualPartName}
                                        onChange={handleInputChange}
                                        placeholder={t("placeholderOtherPartName") || "ระบุชื่ออะไหล่..."}
                                        className="input text-sm"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                    {/* Part Replacement Indicator */}
                    <div
                        className={`flex-1 py-1.5 px-3 rounded-lg border transition-all flex items-center justify-center gap-2 font-semibold text-xs cursor-default
                                ${formData.partId
                                ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue shadow-sm shadow-accent-blue/5'
                                : 'bg-bg-tertiary/50 border-white/5 text-text-muted opacity-40'}`}
                    >
                        <BoxIcon size={14} />
                        <span>{t("labelPartReplacement") || "เปลี่ยนอะไหล่"}</span>
                        {formData.partId && <CheckIcon size={12} className="ml-auto" />}
                    </div>

                    {/* Overhaul Toggle */}
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                            ...prev,
                            isOverhaul: !prev.isOverhaul,
                            partId: !prev.isOverhaul ? "" : prev.partId,
                            manualPartName: !prev.isOverhaul ? "" : prev.manualPartName
                        }))}
                        className={`flex-1 py-1.5 px-3 rounded-lg border transition-all flex items-center justify-center gap-2 font-semibold text-xs
                                ${formData.isOverhaul
                                ? 'bg-accent-yellow/20 border-accent-yellow/50 text-accent-yellow shadow-sm shadow-accent-yellow/5'
                                : 'bg-bg-tertiary border-white/5 text-text-muted hover:border-white/10 hover:text-text-primary'}`}
                    >
                        <RefreshCwIcon size={14} />
                        <span>Overhaul</span>
                        {formData.isOverhaul && <CheckIcon size={12} className="ml-auto" />}
                    </button>
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
                                {t("labelStartDate")}
                            </label>
                            <input
                                type="date"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleInputChange}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <CalendarIcon size={14} />
                                {t("labelEndDate")}
                            </label>
                            <input
                                type="date"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleInputChange}
                                className="input"
                            />
                        </div>
                    </div>
                    <div className="form-grid form-grid-2 mt-3">
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
                                className="input bg-bg-tertiary/50"
                                readOnly
                            />
                        </div>
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
                    </div>
                    <div className="form-grid form-grid-2 mt-3">
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

                {/* Section: Period Selector (For Preventive Only) */}
                {
                    formData.type === "preventive" && (
                        <div className="form-section animate-fade-in mt-4">
                            <h3 className="form-section-title">
                                <ClockIcon size={16} />
                                {t("labelPeriod")}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <RefreshCwIcon size={14} />
                                        {t("labelPeriod")}
                                    </label>
                                    <select
                                        name="period"
                                        value={formData.period || "routine"}
                                        onChange={handleInputChange}
                                        className="input select"
                                    >
                                        <option value="routine">{t("periodRoutine")}</option>
                                        <option value="1month">{t("period1Month")}</option>
                                        <option value="3months">{t("period3Months")}</option>
                                        <option value="6months">{t("period6Months")}</option>
                                        <option value="1year">{t("period1Year")}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Section 3: Motor & Gear Data - Show based on Part Selection OR Period (1 Month+) */}
                {
                    (isMotorOrGear || (formData.type === 'preventive' && formData.period && formData.period !== 'routine')) && (
                        <div className="form-section animate-fade-in">
                            <h3 className="form-section-title">
                                <SettingsIcon size={16} />
                                {t("maintenanceMotorGearInfo")}
                            </h3>

                            {/* Motor Size */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                {/* Temperature */}
                                <div className="mb-4 text-left">
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
                                </div>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                <input
                                                    type="text"
                                                    name={`voltageL${index + 1}`}
                                                    value={formData[`voltageL${index + 1}` as keyof MaintenanceRecordFormData] as string}
                                                    onChange={handleInputChange}
                                                    placeholder="e.g. 380"
                                                    className="input text-sm px-2"
                                                />
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
                            </div>

                            <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
                                <InfoIcon size={12} />
                                {t("msgMaintenanceDocHint")}
                            </p>
                        </div>
                    )
                }

                {/* Section: Advanced Tracking (Lifespan & Analysis) */}
                {
                    (formData.partId || formData.isOverhaul || formData.type === "partReplacement") && (
                        <div className="form-section animate-fade-in border-l-2 border-l-primary/50">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="form-section-title !mb-0 text-primary-light">
                                    <TrendingUpIcon size={16} />
                                    {t("maintenanceAdvancedTracking")}
                                </h3>
                                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                    {t("labelAnalysisMode")}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left: Hours and Dates */}
                                <div className="space-y-4">
                                    {/* Machine Hours Reading */}
                                    <div>
                                        <label className="label">
                                            <ClockIcon size={14} />
                                            {t("maintenanceMachineHours")}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                name="machineHours"
                                                value={formData.machineHours}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                className="input pl-9"
                                            />
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                                <TrendingUpIcon size={16} />
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                                                {t("labelHoursShort")}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Previous Replacement Date & Lifespan */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">
                                                <CalendarIcon size={14} />
                                                {t("labelPreviousReplacementDate")}
                                            </label>
                                            <input
                                                type="date"
                                                name="previousReplacementDate"
                                                value={formData.previousReplacementDate || ""}
                                                onChange={handleInputChange}
                                                className="input"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">
                                                <ClockIcon size={14} />
                                                {t("labelUsagePeriod") || t("labelPartLifespan")}
                                            </label>
                                            <input
                                                type="text"
                                                name="partLifespan"
                                                value={formData.partLifespan || ""}
                                                readOnly
                                                placeholder={t("placeholderAutoCalc")}
                                                className="input bg-bg-tertiary/50 text-text-muted cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Analysis (Reason & Condition) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-light/50">
                                        <label className="label">
                                            <AlertTriangleIcon size={14} className="text-accent-yellow" />
                                            {t("maintenanceChangeReason")}
                                        </label>
                                        <div className="grid grid-cols-1 gap-1.5 mt-2">
                                            {[
                                                { val: "worn", label: "maintenanceReasonWorn" },
                                                { val: "failed", label: "maintenanceReasonFailed" },
                                                { val: "planned", label: "maintenanceReasonPlanned" },
                                                { val: "improvement", label: "maintenanceReasonImprovement" }
                                            ].map((reason) => (
                                                <label key={reason.val} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-bg-tertiary transition-colors group">
                                                    <input
                                                        type="radio"
                                                        name="changeReason"
                                                        checked={formData.changeReason === reason.val}
                                                        onChange={() => setFormData(prev => ({ ...prev, changeReason: reason.val }))}
                                                        className="w-3 h-3 accent-primary"
                                                    />
                                                    <span className={`text-[11px] ${formData.changeReason === reason.val ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                                        {t(reason.label as keyof TranslationKeys)}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-light/50">
                                        <label className="label">
                                            <InfoIcon size={14} className="text-accent-cyan" />
                                            {t("maintenanceOldPartStatus")}
                                        </label>
                                        <div className="grid grid-cols-1 gap-1.5 mt-2">
                                            {[
                                                { val: "good", label: "maintenanceConditionGood" },
                                                { val: "fair", label: "maintenanceConditionFair" },
                                                { val: "poor", label: "maintenanceConditionPoor" },
                                                { val: "broken", label: "maintenanceConditionBroken" }
                                            ].map((cond) => (
                                                <label key={cond.val} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-bg-tertiary transition-colors group">
                                                    <input
                                                        type="radio"
                                                        name="partCondition"
                                                        checked={formData.partCondition === cond.val}
                                                        onChange={() => setFormData(prev => ({ ...prev, partCondition: cond.val }))}
                                                        className="w-3 h-3 accent-primary"
                                                    />
                                                    <span className={`text-[11px] ${formData.partCondition === cond.val ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                                        {t(cond.label as keyof TranslationKeys)}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Predicted Lifespan setting */}
                            <div className="mt-4 pt-4 border-t border-border-light/50">
                                <label className="label">
                                    <RefreshCwIcon size={14} />
                                    {t("labelMaintenanceCycle")}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        name="lifespanValue"
                                        value={formData.lifespanValue}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        className="input"
                                    />
                                    <select
                                        name="lifespanUnit"
                                        value={formData.lifespanUnit}
                                        onChange={handleInputChange}
                                        className="input select"
                                    >
                                        <option value="months">{t("labelMonths")}</option>
                                        <option value="years">{t("labelYears")}</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-text-muted mt-2 pl-1">
                                    * {t("msgMaintenanceDocHint")}
                                </p>
                            </div>
                        </div>
                    )
                }

                {/* Section 4: Shaft & Dial Gauge Data - Hide for part changes, Show for 3 Months+ or specific parts */}
                {
                    (formData.type === 'preventive' && formData.period && ['3months', '6months', '1year'].includes(formData.period)) && (

                        <div className="form-section animate-fade-in">
                            <h3 className="form-section-title">
                                <RulerIcon size={16} />
                                {t("maintenanceShaftInfo")}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    )
                }

                {/* Section: Evidence Image Upload */}
                <div className="form-section">
                    <h3 className="form-section-title">
                        <ImageIcon size={16} />
                        {t("labelEvidenceImage")}
                    </h3>
                    <div className="space-y-3">
                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="relative w-full max-w-xs mx-auto">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-auto rounded-lg border border-border-light shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-accent-red/80 text-white hover:bg-accent-red transition-colors shadow-md"
                                    title={t("actionRemoveImage")}
                                >
                                    <TrashIcon size={14} />
                                </button>
                            </div>
                        )}

                        {/* File Input */}
                        {!imagePreview && (
                            <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border-light hover:border-primary/50 bg-bg-tertiary/30 hover:bg-bg-tertiary/50 cursor-pointer transition-all group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <ImageIcon size={32} className="text-text-muted group-hover:text-primary transition-colors mb-2" />
                                    <p className="text-sm text-text-muted group-hover:text-text-primary">{t("placeholderChooseImage")}</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </label>
                        )}

                        {uploadingImage && (
                            <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
                                <span>กำลังอัปโหลดรูปภาพ...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 5: Details & Notes - Hide for part changes */}
                {
                    !isPartChange && (
                        <div className="form-section">
                            <h3 className="form-section-title">
                                <FileTextIcon size={16} />
                                {t("maintenanceDetailsNotes")}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        rows={4}
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
                                        rows={4}
                                        className="input resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </Modal >
    );
}
