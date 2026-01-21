import React, { useState, useRef, useEffect } from "react";
import {
    BoxIcon,
    XIcon,
    UploadIcon,
    SaveIcon,
    LayersIcon,
    SettingsIcon
} from "../ui/Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { addSparePart, updateSparePart } from "../../lib/firebaseService";
import { SparePart } from "../../types";
import { PART_NAMES } from "../../constants";

interface AddSparePartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialParentId?: string; // Optional: prepopulate if adding sub-part from a parent
    partToEdit?: SparePart | null; // Optional: part to edit
}

export default function AddSparePartModal({ isOpen, onClose, onSuccess, initialParentId, partToEdit }: AddSparePartModalProps) {
    const { t } = useLanguage();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [isCustomName, setIsCustomName] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: "",
        category: "bearing", // default
        quantity: 0,
        unit: "pcs",
        minStockThreshold: 3, // default < 3 alert
        location: "",
        supplier: "",
        pricePerUnit: "",
        description: "",
        model: "", // Add model field
        customCategory: "",
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Populate form when editing
    React.useEffect(() => {
        if (isOpen && partToEdit) {
            setFormData({
                name: partToEdit.name || "",
                category: partToEdit.category || "bearing",
                quantity: partToEdit.quantity || 0,
                unit: partToEdit.unit || "pcs",
                minStockThreshold: partToEdit.minStockThreshold || 3,
                location: partToEdit.location || "",
                supplier: partToEdit.supplier || "",
                pricePerUnit: partToEdit.pricePerUnit?.toString() || "",
                description: partToEdit.description || "",
                model: partToEdit.model || "",
                customCategory: partToEdit.category && !["bearing", "belt", "oil", "filter", "seal", "other"].includes(partToEdit.category) ? partToEdit.category : "",
            });
            setIsCustomName(!PART_NAMES.includes(partToEdit.name || ""));
            if (partToEdit.imageUrl) {
                setPreviewUrl(partToEdit.imageUrl);
            }
        } else if (isOpen && !partToEdit) {
            // Reset form when adding new
            setFormData({
                name: "",
                category: "bearing",
                quantity: 0,
                unit: "pcs",
                minStockThreshold: 3,
                location: "",
                supplier: "",
                pricePerUnit: "",
                description: "",
                model: "",
                customCategory: "",
            });
            setIsCustomName(false);
            setPreviewUrl(null);
            setImageFile(null);
        }
    }, [isOpen, partToEdit]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const partData = {
                name: formData.name,
                category: formData.category === 'other' ? formData.customCategory : formData.category,
                quantity: Number(formData.quantity),
                unit: formData.unit,
                minStockThreshold: Number(formData.minStockThreshold),
                location: formData.location,
                supplier: formData.supplier,
                pricePerUnit: formData.pricePerUnit ? Number(formData.pricePerUnit) : undefined,
                description: formData.description,
                model: formData.model,
            };

            if (partToEdit) {
                // Update existing part
                await updateSparePart(partToEdit.id, partData, imageFile || undefined);
                success(t("msgEditPartSuccess") || "แก้ไขอะไหล่สำเร็จ!", t("msgEditPartDetail", { name: formData.name }));
            } else {
                // Add new part
                await addSparePart(partData, imageFile || undefined);
                success(t("msgAddPartSuccess") || "เพิ่มอะไหล่สำเร็จ!", t("msgAddPartDetail", { name: formData.name }));
            }

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                name: "",
                category: "bearing",
                quantity: 0,
                unit: "pcs",
                minStockThreshold: 3,
                location: "",
                supplier: "",
                pricePerUnit: "",
                description: "",
                model: "",
                customCategory: "",
            });
            setImageFile(null);
            setPreviewUrl(null);
        } catch (error: any) {
            console.error(`Error ${partToEdit ? 'updating' : 'adding'} spare part:`, error);
            showError(t("msgSaveError") || "ไม่สามารถบันทึกได้", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-secondary w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                            <BoxIcon size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">{t("addPartTitle")}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-white transition-colors"
                    >
                        <XIcon size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="flex justify-center">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 group overflow-hidden"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <UploadIcon size={24} className="text-text-muted group-hover:text-primary mb-2 transition-colors" />
                                    <span className="text-xs text-text-muted">{t("actionUploadPhoto")}</span>
                                </>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Name & Category */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                ชื่ออะไหล่หลัก
                            </label>
                            {!isCustomName ? (
                                <select
                                    name="name"
                                    value={PART_NAMES.includes(formData.name) ? formData.name : (formData.name ? "other" : "")}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "other") {
                                            setIsCustomName(true);
                                            setFormData(prev => ({ ...prev, name: "" }));
                                        } else {
                                            setFormData(prev => ({ ...prev, name: val }));
                                        }
                                    }}
                                    className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                                >
                                    <option value="">-- เลือกชื่ออะไหล่หลัก --</option>
                                    {PART_NAMES.map((name: string) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                    <option value="other">{t("optionOther") || "อื่นๆ (ระบุ)"}</option>
                                </select>
                            ) : (
                                <div className="flex gap-2 animate-fade-in">
                                    <input
                                        required
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="ระบุชื่ออะไหล่หลัก เช่น 6205-2RS, เบอร์ 220..."
                                        className="input flex-1 bg-bg-tertiary border-white/10 focus:border-primary/50"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomName(false)}
                                        className="btn btn-ghost px-2"
                                        title={t("actionCancel")}
                                    >
                                        <XIcon size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                {t("addPartCategory")}
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                            >
                                <option value="bearing">{t("categoryBearing")}</option>
                                <option value="oil">{t("categoryOil")}</option>
                                <option value="belt">{t("categoryBelt")}</option>
                                <option value="electrical">{t("categoryElectrical")}</option>
                                <option value="motor">{t("categoryMotor")}</option>
                                <option value="pneumatic">{t("categoryPneumatic")}</option>
                                <option value="tool">{t("categoryTool")}</option>
                                <option value="other">{t("categoryOther")}</option>
                            </select>
                        </div>

                        {formData.category === 'other' && (
                            <div className="animate-fade-in sm:col-span-1">
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    {t("labelCustomCategory") || "หมวดหมู่เพิ่มเติม (Custom Category)"}
                                </label>
                                <input
                                    required={formData.category === 'other'}
                                    name="customCategory"
                                    value={formData.customCategory}
                                    onChange={handleChange}
                                    placeholder={t("placeholderCustomCategory") || "ระบุหมวดหมู่..."}
                                    className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                                />
                            </div>
                        )}

                        {/* Part Model / Spec (New field) */}
                        <div className="sm:col-span-2 animate-fade-in">
                            <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-2">
                                <SettingsIcon size={14} className="text-primary" />
                                รุ่นของอะไหล่
                            </label>
                            <input
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="เช่น เบอร์ลูกปืน (6205), เบอร์น้ำมันเกียร์ (VG 220)..."
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                            />
                        </div>


                        {/* Stock Info */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                จำนวนที่ใช้ <span className="text-red-400">*</span>
                            </label>
                            <input
                                required
                                type="number"
                                min="0"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                {t("addPartUnit")}
                            </label>
                            <input
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                placeholder="pcs, set, box, L"
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                            />
                        </div>



                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                {t("stockPrice")}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                name="pricePerUnit"
                                value={formData.pricePerUnit}
                                onChange={handleChange}
                                placeholder="0.00"
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                            />
                        </div>

                        {/* Supplier Info */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                {t("stockSupplier")}
                            </label>
                            <input
                                name="supplier"
                                value={formData.supplier}
                                onChange={handleChange}
                                placeholder={t("placeholderBrand")}
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                {t("labelDescription")}
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50 resize-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-bg-secondary/50">
                    <button
                        onClick={onClose}
                        className="btn btn-ghost"
                        disabled={loading}
                    >
                        {t("actionCancel")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn btn-primary shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                {t("msgSaving")}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <SaveIcon size={18} />
                                {t("actionSave")}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
