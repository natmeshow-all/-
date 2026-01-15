"use client";

import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { addMachine } from "../../lib/firebaseService";
import {
    XIcon,
    PlusIcon,
    SaveIcon,
    SettingsIcon,
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
        code: "",
        name: "",
        brand: "",
        model: "",
        serialNumber: "",
        performance: "",
        location: "",
        zone: "",
        remark: "",
        status: "active",
        description: "",
        installationDate: "",
        operatingHours: 0,
        maintenanceCycle: 0,
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
                code: "",
                name: "",
                brand: "",
                model: "",
                serialNumber: "",
                performance: "",
                location: "",
                zone: "",
                remark: "",
                status: "active",
                description: "",
                installationDate: "",
                operatingHours: 0,
                maintenanceCycle: 0,
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
                        {/* Machine Code */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <HashIcon size={14} className="text-primary" />
                                {t("labelMachineCode") || "Machine Code"}
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="e.g. HT05"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Machine Name */}
                        <div className="space-y-2">
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
                                placeholder="e.g. Deck oven No.1"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Brand */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelBrand") || "Brand"}
                            </label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                placeholder="e.g. WachTel"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Model */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelModel") || "Model"}
                            </label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="e.g. Infra ce 416/77 A1"
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

                        {/* Performance */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <ZapIcon size={14} className="text-primary" />
                                {t("labelPerformance") || "Performance (Capacity/kW)"}
                            </label>
                            <input
                                type="text"
                                name="performance"
                                value={formData.performance}
                                onChange={handleChange}
                                placeholder="e.g. 46"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <div className="text-primary text-xs font-bold w-3.5 h-3.5 flex items-center justify-center border border-primary rounded-sm">L</div>
                                {t("tableLocation") || "Location"}
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="e.g. RTE"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Zone */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <div className="text-primary text-xs font-bold w-3.5 h-3.5 flex items-center justify-center border border-primary rounded-sm">Z</div>
                                {t("filterZone") || "Zone"}
                            </label>
                            <input
                                type="text"
                                name="zone"
                                value={formData.zone}
                                onChange={handleChange}
                                placeholder="e.g. Baking Room"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Remark (Class) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <SettingsIcon size={14} className="text-primary" />
                                {t("labelRemark") || "Remark (Class)"}
                            </label>
                            <input
                                type="text"
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder="e.g. A or B"
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

                        {/* Description */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-text-secondary">
                                {t("labelDescription") || "Additional Description"}
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={2}
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
