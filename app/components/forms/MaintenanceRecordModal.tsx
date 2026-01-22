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
import { VOLTAGE_OPTIONS } from "../../constants";
import { MaintenanceRecordFormData, MaintenanceType, VibrationLevel, Part, Machine, SparePart } from "../../types";
import { getParts, getMachines, getSpareParts } from "../../lib/firebaseService";
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

import VibrationSection from "./maintenance/VibrationSection";
import MotorDataSection from "./maintenance/MotorDataSection";
import VoltageSection from "./maintenance/VoltageSection";
import AdvancedTrackingSection from "./maintenance/AdvancedTrackingSection";
import ShaftDataSection from "./maintenance/ShaftDataSection";
import PeriodSelectorSection from "./maintenance/PeriodSelectorSection";
import EvidenceImageSection from "./maintenance/EvidenceImageSection";
import DetailsNotesSection from "./maintenance/DetailsNotesSection";

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
    const [allSpareParts, setAllSpareParts] = useState<SparePart[]>([]);
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
                const [machinesData, partsData, sparePartsData] = await Promise.all([
                    getMachines(),
                    getParts(),
                    getSpareParts()
                ]);
                setMachines(machinesData);
                setAllParts(partsData);
                setAllSpareParts(sparePartsData);

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

    const filteredParts = [
        ...allParts.filter(p => {
            if (!formData.machineId) return false;
            const selectedMachine = machines.find(m => m.id === formData.machineId);

            return (
                p.machineId === formData.machineId ||
                (p.machineName && selectedMachine && p.machineName === selectedMachine.name) ||
                ((p as any).machine && selectedMachine && (p as any).machine === selectedMachine.name)
            );
        }),
        ...allSpareParts.map(sp => ({
            id: sp.id,
            partName: sp.name || sp.partName,
            brand: sp.brand,
            Location: sp.location,
            machineId: "global", // Identifier for global spare parts
            machineName: "Inventory",
            modelSpec: sp.model || sp.description,
            quantity: sp.quantity,
            brandName: sp.brand
        } as any))
    ];

    // Remove duplicates based on part name and brand if they overlap between machine parts and spare parts
    const uniqueParts = filteredParts.filter((part, index, self) =>
        index === self.findIndex((t) => (
            t.partName === part.partName && t.brand === part.brand
        ))
    );

    const selectedPartData = [...allParts, ...allSpareParts.map(sp => ({ ...sp, partName: sp.name } as any))].find(p => p.id === formData.partId);
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
                                {uniqueParts.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.partName} {p.brand ? `(${p.brand})` : ''}
                                        {p.machineName === "Inventory" ? ` [Inventory]` : (p.Location ? ` @ ${p.Location}` : '')}
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
                        <PeriodSelectorSection
                            period={formData.period || "routine"}
                            onInputChange={handleInputChange}
                            t={t}
                        />
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

                            {/* Motor Size & Temperature */}
                            <MotorDataSection
                                motorSize={formData.motorSize}
                                temperature={formData.temperature}
                                onMotorSizeChange={(v) => handleInputChange({ target: { name: 'motorSize', value: v } } as any)}
                                onTemperatureChange={(v) => handleInputChange({ target: { name: 'temperature', value: v } } as any)}
                                t={t}
                            />

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

                            <VoltageSection
                                voltageL1={formData.voltageL1 || ""}
                                voltageL2={formData.voltageL2 || ""}
                                voltageL3={formData.voltageL3 || ""}
                                currentIdle={formData.currentIdle}
                                currentLoad={formData.currentLoad}
                                onVoltageChange={(phase, v) => handleInputChange({ target: { name: `voltage${phase}`, value: v } } as any)}
                                onCurrentChange={(type, v) => handleInputChange({ target: { name: type === 'idle' ? 'currentIdle' : 'currentLoad', value: v } } as any)}
                                t={t}
                            />

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
                        <AdvancedTrackingSection
                            machineHours={formData.machineHours}
                            previousReplacementDate={formData.previousReplacementDate || null}
                            partLifespan={formData.partLifespan || null}
                            changeReason={formData.changeReason}
                            partCondition={formData.partCondition}
                            lifespanValue={formData.lifespanValue}
                            lifespanUnit={formData.lifespanUnit}
                            onInputChange={handleInputChange}
                            onReasonChange={(val) => setFormData(prev => ({ ...prev, changeReason: val }))}
                            onConditionChange={(val) => setFormData(prev => ({ ...prev, partCondition: val }))}
                            t={t}
                        />
                    )
                }

                {/* Section 4: Shaft & Dial Gauge Data - Hide for part changes, Show for 3 Months+ or specific parts */}
                {
                    (formData.type === 'preventive' && formData.period && ['3months', '6months', '1year'].includes(formData.period)) && (
                        <ShaftDataSection
                            shaftBend={formData.shaftBend}
                            dialGauge={formData.dialGauge}
                            onInputChange={handleInputChange}
                            t={t}
                        />
                    )
                }

                {/* Section: Evidence Image Upload */}
                <EvidenceImageSection
                    imagePreview={imagePreview}
                    uploadingImage={uploadingImage}
                    onImageChange={handleImageChange}
                    onRemoveImage={handleRemoveImage}
                    t={t}
                />

                {/* Section 5: Details & Notes - Hide for part changes */}
                {
                    !isPartChange && (
                        <DetailsNotesSection
                            details={formData.details}
                            notes={formData.notes}
                            onInputChange={handleInputChange}
                            t={t}
                        />
                    )
                }
            </div >
        </Modal >
    );
}
