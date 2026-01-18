import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Modal from "../ui/Modal";
import { addPart, updatePart, getMachines } from "../../lib/firebaseService";
import {
    PlusIcon,
    SettingsIcon,
    BoxIcon,
    MapPinIcon,
    TagIcon,
    HashIcon,
    ImageIcon,
    FolderIcon,
    FileTextIcon,
    CheckIcon,
    EditIcon,
    AlertTriangleIcon,
    XIcon,
} from "../ui/Icons";
import { mockPartNames } from "../../data/mockData";
import { AddPartFormData, PartCategory, Part, Machine } from "../../types";
import Image from "next/image";

interface AddPartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    partToEdit?: Part | null; // Add optional part prop for editing
}

const categories: { value: PartCategory; labelKey: string }[] = [
    { value: "motor", labelKey: "categoryMotor" },
    { value: "gear", labelKey: "categoryGear" },
    { value: "belt", labelKey: "categoryBelt" },
    { value: "bearing", labelKey: "categoryBearing" },
    { value: "pump", labelKey: "categoryPump" },
    { value: "valve", labelKey: "categoryValve" },
    { value: "electrical", labelKey: "categoryElectrical" },
    { value: "other", labelKey: "categoryOther" },
];

export default function AddPartModal({ isOpen, onClose, onSuccess, partToEdit }: AddPartModalProps) {
    const { t } = useLanguage();
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [isLoadingMachines, setIsLoadingMachines] = useState(false);
    const [formData, setFormData] = useState<AddPartFormData>({
        machineId: "",
        machineName: "",
        partName: "",
        modelSpec: "",
        Location: "",
        brand: "",
        quantity: 1,
        minStockThreshold: 1, // Default to 1
        location: "",
        category: "other",
        notes: "",
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCustomPartName, setIsCustomPartName] = useState(false);
    const [filterLocation, setFilterLocation] = useState("ALL");

    // Helper to format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Populate form if partToEdit changes
    useEffect(() => {
        if (partToEdit) {
            setFormData({
                machineId: partToEdit.machineId || "",
                machineName: partToEdit.machineName || "",
                partName: partToEdit.partName || "",
                modelSpec: partToEdit.modelSpec || "",
                Location: partToEdit.Location || "",
                brand: partToEdit.brand || "",
                quantity: partToEdit.quantity || 1,
                minStockThreshold: partToEdit.minStockThreshold || 1,
                location: partToEdit.location || "",
                category: partToEdit.category || "other",
                notes: partToEdit.notes || "",
            });
            // Check if current part name is custom
            if (partToEdit.partName && !mockPartNames.includes(partToEdit.partName)) {
                setIsCustomPartName(true);
            } else {
                setIsCustomPartName(false);
            }
        } else {
            // Reset if no partToEdit (Adding new mode)
            setFormData({
                machineId: "",
                machineName: "",
                partName: "",
                modelSpec: "",
                Location: "",
                brand: "",
                quantity: 1,
                minStockThreshold: 1,
                location: "",
                category: "other",
                notes: "",
            });
            setIsCustomPartName(false);
        }
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    }, [partToEdit, isOpen]);

    // Fetch machines when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchMachinesData = async () => {
                setIsLoadingMachines(true);
                try {
                    const data = await getMachines();
                    setMachines(data);
                } catch (error) {
                    console.error("Error fetching machines:", error);
                } finally {
                    setIsLoadingMachines(false);
                }
            };
            fetchMachinesData();
        }
    }, [isOpen]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        if (name === "machineId") {
            const machine = machines.find(m => m.id === value);
            setFormData(prev => ({
                ...prev,
                machineId: value,
                machineName: machine?.name || "",
                Location: machine?.Location || prev.Location,
                location: machine?.location || prev.location,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: (name === "quantity" || name === "minStockThreshold") ? parseInt(value) || 0 : value,
            }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Clean up old preview URL if exists
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setFormData(prev => ({ ...prev, imageFile: file }));
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.machineName) {
            toast.warning(t("validateInput"), t("validateSelectMachine"));
            return;
        }
        if (!formData.partName) {
            toast.warning(t("validateInput"), t("validateSelectPart"));
            return;
        }

        try {
            setIsSubmitting(true);

            // Create a timeout promise to detect hanging requests
            const timeoutPromise = new Promise((_, reject) => {
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error("Request timed out. Please check your internet connection and Firebase configuration."));
                }, 15000); // 15 seconds timeout
            });

            // Handle Update vs Add
            const actionPromise = partToEdit
                ? updatePart(partToEdit.id, formData, selectedFile || undefined)
                : addPart(formData, selectedFile || undefined);

            // Race between the actual request and the timeout
            await Promise.race([
                actionPromise,
                timeoutPromise
            ]);

            // Show success toast
            const successTitle = partToEdit ? t("msgEditPartSuccess") : t("msgAddPartSuccess");
            const successDetail = (partToEdit ? t("msgEditPartDetail") : t("msgAddPartDetail"))
                .replace("{name}", formData.partName);
            toast.success(successTitle, successDetail);

            if (onSuccess) {
                onSuccess();
            }

            onClose();
            // Reset handled by useEffect
        } catch (error: any) {
            console.error("Error saving part:", error);
            // Show more detailed error message with toast
            const errorMessage = error?.message || "Unknown error occurred";
            if (errorMessage.includes("insufficient permissions")) {
                toast.error(t("msgNoPermission"), t("msgNoPermissionDetail"));
            } else if (errorMessage.includes("timed out")) {
                toast.error(t("msgTimeout"), t("msgTimeoutDetail"));
            } else {
                toast.error(t("msgError"), errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={partToEdit ? t("editPartTitle") || "Edit Part" : t("addPartTitle")}
            titleIcon={partToEdit ? <EditIcon size={18} /> : <PlusIcon size={18} />}
            size="lg"
            footer={
                <>
                    <button onClick={onClose} className="btn btn-outline" disabled={isSubmitting}>
                        {t("actionCancel")}
                    </button>
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                {t("msgSaving")}
                            </span>
                        ) : (
                            t("actionSave")
                        )}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                {/* Machine & Part Name */}
                <div className="form-grid form-grid-2">
                    <div>
                        <label className="label mb-1">
                            <SettingsIcon size={14} />
                            {t("addPartMachine")}
                        </label>

                        {/* Location Filter Buttons */}
                        <div className="flex flex-wrap gap-1 mb-2">
                            {['ALL', 'FZ', 'RTE', 'UT'].map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => setFilterLocation(loc)}
                                    className={`
                                        px-2 py-1 text-[10px] font-bold rounded-md border transition-all
                                        ${filterLocation === loc
                                            ? 'bg-primary text-white border-primary shadow-md'
                                            : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'}
                                    `}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>

                        <select
                            name="machineId"
                            value={formData.machineId}
                            onChange={handleInputChange}
                            className="input select"
                            disabled={!!partToEdit || isLoadingMachines}
                        >
                            <option value="">{isLoadingMachines ? "Loading..." : t("addPartSelectMachine") || "Select Machine"}</option>
                            {machines
                                .filter(m => filterLocation === 'ALL' ||
                                    (filterLocation === 'UT'
                                        ? (m.location?.toUpperCase() === 'UT' || m.location?.toUpperCase() === 'UTILITY')
                                        : m.location?.toUpperCase() === filterLocation)
                                )
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div>
                        <label className="label">
                            <BoxIcon size={14} />
                            {t("addPartName")}
                        </label>
                        {!isCustomPartName ? (
                            <select
                                name="selectPartName"
                                value={mockPartNames.includes(formData.partName) ? formData.partName : (formData.partName ? "other" : "")}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "other") {
                                        setIsCustomPartName(true);
                                        setFormData(prev => ({ ...prev, partName: "" }));
                                    } else {
                                        setFormData(prev => ({ ...prev, partName: value }));
                                    }
                                }}
                                className="input select"
                            >
                                <option value="">{t("addPartSelectPart")}</option>
                                {mockPartNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                                <option value="other">{t("optionOther") || "Other (Specify)"}</option>
                            </select>
                        ) : (
                            <div className="flex gap-2 animate-fade-in">
                                <input
                                    type="text"
                                    name="partName"
                                    value={formData.partName}
                                    onChange={handleInputChange}
                                    placeholder={t("placeholderPartName") || "Enter part name..."}
                                    className="input flex-1"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomPartName(false);
                                        setFormData(prev => ({ ...prev, partName: "" }));
                                    }}
                                    className="btn btn-ghost px-2 text-xs"
                                    title={t("actionCancel") || "Cancel"}
                                >
                                    <XIcon size={16} />
                                </button>
                            </div>
                        )}
                        {!isCustomPartName && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomPartName(true);
                                    setFormData(prev => ({ ...prev, partName: "" }));
                                }}
                                className="mt-1 text-xs text-accent-green hover:text-accent-green-light transition-colors"
                            >
                                {t("addPartNewPart")}
                            </button>
                        )}
                    </div>
                </div>

                {/* Model/Spec */}
                <div>
                    <label className="label">
                        <FileTextIcon size={14} />
                        {t("addPartModelSpec")}
                    </label>
                    <input
                        type="text"
                        name="modelSpec"
                        value={formData.modelSpec}
                        onChange={handleInputChange}
                        placeholder={t("placeholderModelSpec")}
                        className="input"
                    />
                </div>

                {/* Zone & Brand */}
                <div className="form-grid form-grid-2">
                    <div>
                        <label className="label">
                            <MapPinIcon size={14} />
                            {t("addPartLocationArea")}
                        </label>
                        <input
                            type="text"
                            name="Location"
                            value={formData.Location}
                            onChange={handleInputChange}
                            placeholder={t("placeholderLocationLong")}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">
                            <TagIcon size={14} />
                            {t("addPartBrand")}
                        </label>
                        <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleInputChange}
                            placeholder={t("placeholderBrand")}
                            className="input"
                        />
                    </div>
                </div>

                {/* Quantity & Min Stock */}
                <div className="form-grid form-grid-3">
                    <div>
                        <label className="label">
                            <HashIcon size={14} />
                            {t("addPartQuantity")}
                        </label>
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            min={1}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">
                            <AlertTriangleIcon size={14} />
                            Min Stock
                        </label>
                        <input
                            type="number"
                            name="minStockThreshold"
                            value={formData.minStockThreshold}
                            onChange={handleInputChange}
                            min={0}
                            className="input"
                            placeholder="Min Limit"
                        />
                    </div>
                    <div>
                        <label className="label">
                            <MapPinIcon size={14} />
                            {t("addPartLocation")}
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            placeholder={t("placeholderLocation")}
                            className="input"
                        />
                    </div>
                </div>

                {/* Image Upload */}
                <div>
                    <label className="label">
                        <ImageIcon size={14} />
                        {t("addPartImage")}
                    </label>

                    <div className="space-y-3">
                        {/* Preview Area */}
                        {(previewUrl || partToEdit?.imageUrl) && (
                            <div className="relative group w-40 h-40 mx-auto bg-bg-tertiary rounded-xl overflow-hidden border-2 border-dashed border-border-light hover:border-accent-green transition-all duration-300">
                                <Image
                                    src={previewUrl || partToEdit?.imageUrl || ""}
                                    alt="Preview"
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <p className="text-white text-xs font-medium">New Selection</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg border border-border-light shadow-inner">
                                <label className="btn btn-primary cursor-pointer text-sm py-2 shrink-0">
                                    {t("addPartChooseFile")}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-text-primary text-sm font-medium truncate">
                                        {selectedFile ? selectedFile.name : t("addPartNoFile")}
                                    </span>
                                    {selectedFile && (
                                        <span className="text-text-muted text-[10px] flex items-center gap-1">
                                            {t("labelFileSize")} {formatFileSize(selectedFile.size)}
                                            {selectedFile.size > 5 * 1024 * 1024 && (
                                                <span className="text-accent-red font-bold">(! Too large)</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {partToEdit?.imageUrl && !selectedFile && (
                                <p className="text-xs text-accent-green flex items-center gap-1 bg-accent-green/10 p-2 rounded-md border border-accent-green/20">
                                    <CheckIcon size={12} />
                                    {t("msgCurrentImagePreserved")}
                                </p>
                            )}

                            <p className="text-xs text-text-muted flex items-center gap-1 pl-1">
                                <ImageIcon size={12} className="opacity-60" />
                                {t("addPartImageHint")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="label">
                        <FolderIcon size={14} />
                        {t("addPartCategory")}
                    </label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="input select"
                    >
                        <option value="">{t("addPartSelectCategory")}</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {t(cat.labelKey as keyof typeof t)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Notes */}
                <div>
                    <label className="label">
                        <FileTextIcon size={14} />
                        {t("addPartNotes")}
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder={t("placeholderNotes")}
                        rows={3}
                        className="input resize-none"
                    />
                </div>
            </div>
        </Modal>
    );
}
