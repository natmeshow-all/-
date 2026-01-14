"use client";

import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { addMachine } from "../../lib/firebaseService";
import {
    XIcon,
    PlusIcon,
    SaveIcon,
    CalendarIcon,
    ClockIcon,
    CpuIcon,
    HashIcon,
    ZapIcon,
    RefreshCwIcon
} from "../ui/Icons";

interface AddMachineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddMachineModal({ isOpen, onClose, onSuccess }: AddMachineModalProps) {
    const { t } = useLanguage();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        serialNumber: "",
        installationDate: "",
        brandModel: "",
        operatingHours: 0,
        capacity: "",
        powerRating: "",
        maintenanceCycle: 0,
        description: "",
        status: "active",
        zone: "Main", // Default zone
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toastError("Please provide a machine name");
            return;
        }

        setLoading(true);
        try {
            await addMachine(formData as any);
            success(t("msgSaveSuccess") || "Machine added successfully");
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                name: "",
                serialNumber: "",
                installationDate: "",
                brandModel: "",
                operatingHours: 0,
                capacity: "",
                powerRating: "",
                maintenanceCycle: 0,
                description: "",
                status: "active",
                zone: "Main",
            });
        } catch (err) {
            console.error("Error adding machine:", err);
            toastError(t("msgSaveError") || "Failed to add machine");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;

        if (type === "number") {
            finalValue = value === "" ? 0 : parseFloat(value);
            if (isNaN(finalValue)) finalValue = 0;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: finalValue,
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-secondary w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-bg-tertiary/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-green/20 flex items-center justify-center text-accent-green">
                            <PlusIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">{t("actionAddMachine") || "เพิ่มเครื่องจักร"}</h2>
                            <p className="text-sm text-text-muted">กรอกข้อมูลเครื่องจักรใหม่</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-text-muted transition-colors">
                        <XIcon size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Machine Name */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelMachineName") || "ชื่อเครื่องจักร"} *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Mixer A1"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Brand & Model */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelBrandModel") || "Brand & Model"}
                            </label>
                            <input
                                type="text"
                                name="brandModel"
                                value={formData.brandModel}
                                onChange={handleChange}
                                placeholder="e.g. SEW Eurodrive S67"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Serial Number */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <HashIcon size={14} className="text-primary" />
                                {t("labelSerialNumber") || "Serial Number"}
                            </label>
                            <input
                                type="text"
                                name="serialNumber"
                                value={formData.serialNumber}
                                onChange={handleChange}
                                placeholder="SN-XXXX-XXXX"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Installation Date */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CalendarIcon size={14} className="text-primary" />
                                {t("labelInstallationDate") || "Installation Date"}
                            </label>
                            <input
                                type="date"
                                name="installationDate"
                                value={formData.installationDate}
                                onChange={handleChange}
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Operating Hours */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <ClockIcon size={14} className="text-primary" />
                                {t("labelOperatingHours") || "Operating Hours"}
                            </label>
                            <input
                                type="number"
                                name="operatingHours"
                                value={formData.operatingHours}
                                onChange={handleChange}
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Power Rating */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <ZapIcon size={14} className="text-primary" />
                                {t("labelPowerRating") || "Power Rating (kW/Amp)"}
                            </label>
                            <input
                                type="text"
                                name="powerRating"
                                value={formData.powerRating}
                                onChange={handleChange}
                                placeholder="e.g. 380V 3P, Max 80A"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Maintenance Cycle */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <RefreshCwIcon size={14} className="text-primary" />
                                {t("labelMaintenanceCycle") || "Maintenance Cycle (Months)"}
                            </label>
                            <select
                                name="maintenanceCycle"
                                value={formData.maintenanceCycle}
                                onChange={handleChange}
                                className="input select w-full bg-bg-tertiary"
                            >
                                <option value={0}>No automatic cycle</option>
                                <option value={1}>1 Month</option>
                                <option value={3}>3 Months</option>
                                <option value={6}>6 Months</option>
                                <option value={9}>9 Months</option>
                                <option value={12}>12 Months</option>
                            </select>
                        </div>

                        {/* Capacity */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelCapacity") || "Capacity / Production Rate"}
                            </label>
                            <input
                                type="text"
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleChange}
                                placeholder="e.g. 500kg/day"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-text-secondary">
                                {t("labelDescription") || "Additional Description"}
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="input w-full bg-bg-tertiary py-3 resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline"
                        >
                            {t("actionCancel") || "Cancel"}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary min-w-[120px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                            ) : (
                                <>
                                    <SaveIcon size={18} />
                                    {t("actionSave") || "เพิ่มข้อมูล"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
