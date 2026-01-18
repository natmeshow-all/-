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
        Location: "",
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
            toastError(t("msgEnterMachineName"));
            return;
        }

        setLoading(true);
        try {
            await addMachine(formData as any);
            success(t("msgSaveSuccess"));
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
                Location: "",
                remark: "",
                status: "active",
                description: "",
                installationDate: "",
                operatingHours: 0,
                maintenanceCycle: 0,
            });
        } catch (err: any) {
            console.error("Error adding machine:", err);
            toastError(t("msgSaveError"), err.message);
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
                            <h2 className="text-xl font-bold text-text-primary">{t("actionAddMachine")}</h2>
                            <p className="text-sm text-text-muted">{t("msgAddMachineSubtitle")}</p>
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
                                {t("labelMachineCode")}
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="HT05"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Machine Name */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelMachineName")} *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Deck oven No.1"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Brand */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelBrand")}
                            </label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                placeholder="WachTel"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Model */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <CpuIcon size={14} className="text-primary" />
                                {t("labelModel")}
                            </label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="Infra ce 416/77 A1"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Serial Number */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <HashIcon size={14} className="text-primary" />
                                {t("labelSerialNumber")}
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
                                {t("labelPerformance")}
                            </label>
                            <input
                                type="text"
                                name="performance"
                                value={formData.performance}
                                onChange={handleChange}
                                placeholder="46 kW"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <div className="text-primary text-xs font-bold w-3.5 h-3.5 flex items-center justify-center border border-primary rounded-sm">L</div>
                                {t("tableLocation")}
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="RTE"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Location (Area) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <div className="text-primary text-xs font-bold w-3.5 h-3.5 flex items-center justify-center border border-primary rounded-sm">L</div>
                                {t("filterLocation")}
                            </label>
                            <input
                                type="text"
                                name="Location"
                                value={formData.Location}
                                onChange={handleChange}
                                placeholder="Baking Room"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Remark (Class) */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <SettingsIcon size={14} className="text-primary" />
                                {t("labelRemark")}
                            </label>
                            <input
                                type="text"
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                placeholder="A"
                                className="input w-full bg-bg-tertiary"
                            />
                        </div>

                        {/* Maintenance Cycle */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                                <RefreshCwIcon size={14} className="text-primary" />
                                {t("labelMaintenanceCycle")}
                            </label>
                            <select
                                name="maintenanceCycle"
                                value={formData.maintenanceCycle}
                                onChange={handleChange}
                                className="input select w-full bg-bg-tertiary"
                            >
                                <option value={0}>{t("labelNoAutoCycle")}</option>
                                <option value={1}>1 {t("labelMonths")}</option>
                                <option value={3}>3 {t("labelMonths")}</option>
                                <option value={6}>6 {t("labelMonths")}</option>
                                <option value={9}>9 {t("labelMonths")}</option>
                                <option value={12}>12 {t("labelMonths")}</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-text-secondary">
                                {t("labelDescription")}
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
                            {t("actionCancel")}
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
                                    {t("actionSave")}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
