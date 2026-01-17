import React, { useState, useRef, useEffect } from "react";
import { BoxIcon, XIcon, UploadIcon, SaveIcon, ArrowUpIcon, ArrowDownIcon } from "../ui/Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { adjustStock, getMachines } from "../../lib/firebaseService";
import { Machine, SparePart, TransactionType } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface StockActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    actionType: TransactionType; // "restock" or "withdraw"
    part: SparePart | null;
}

export default function StockActionModal({ isOpen, onClose, onSuccess, actionType, part }: StockActionModalProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { success, error: showError, loginRequired } = useToast();
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [machines, setMachines] = useState<Machine[]>([]);

    const [formData, setFormData] = useState({
        quantity: 1,
        machineId: "",
        zone: "",
        notes: "",
        supplier: "", // For restock
        pricePerUnit: "", // For restock
        refDocument: "", // For restock
    });

    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && actionType === "withdraw") {
            // Load machines for selection
            getMachines().then(data => setMachines(data));
        }
    }, [isOpen, actionType]);

    // Cleanup preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    if (!isOpen || !part) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === "machineId") {
            const machine = machines.find(m => m.id === value);
            setFormData(prev => ({
                ...prev,
                machineId: value,
                zone: machine?.zone || prev.zone // Auto-populate zone if found
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEvidenceFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            loginRequired();
            return;
        }

        setLoading(true);

        try {
            await adjustStock({
                partId: part.id,
                partName: part.name,
                type: actionType,
                quantity: Number(formData.quantity),
                machineId: actionType === "withdraw" ? formData.machineId : undefined,
                machineName: actionType === "withdraw" ? machines.find(m => m.id === formData.machineId)?.name : undefined,
                zone: actionType === "withdraw" ? formData.zone : undefined,
                performedBy: user.displayName || user.email || "Unknown User",
                performedByEmail: user.email || undefined,
                userId: user.uid,
                performedAt: new Date(),
                notes: formData.notes,
                supplier: actionType === "restock" ? formData.supplier : undefined,
                pricePerUnit: (actionType === "restock" && formData.pricePerUnit) ? Number(formData.pricePerUnit) : undefined,
                refDocument: (actionType === "restock" && formData.refDocument) ? formData.refDocument : undefined,
            }, evidenceFile || undefined);

            onSuccess();
            success(
                isWithdraw ? t("stockWithdrawSuccess") || "เบิกของสำเร็จ" : t("stockReceiveSuccess") || "รับของเข้าสำเร็จ",
                `${part.name}: ${formData.quantity} ${part.unit}`
            );
            onClose();
            // Reset
            setFormData({
                quantity: 1,
                machineId: "",
                zone: "",
                notes: "",
                supplier: "",
                pricePerUnit: "",
                refDocument: "",
            });
            setEvidenceFile(null);
            setPreviewUrl(null);
        } catch (error: any) {
            console.error("Error adjusting stock:", error);
            showError(
                isWithdraw ? t("stockWithdrawError") || "ไม่สามารถเบิกของได้" : t("stockReceiveError") || "ไม่สามารถรับของเข้าได้",
                error.message
            );
        } finally {
            setLoading(false);
        }
    };

    const isWithdraw = actionType === "withdraw";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-secondary w-full max-w-lg rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b border-white/5 ${isWithdraw ? 'bg-error/10' : 'bg-success/10'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWithdraw ? 'bg-error text-white' : 'bg-success text-white'}`}>
                            {isWithdraw ? <ArrowDownIcon size={20} /> : <ArrowUpIcon size={20} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">
                                {isWithdraw ? t("stockWithdrawTitle") : t("stockReceiveTitle")}
                            </h2>
                            <p className="text-sm text-text-muted">{part.name}</p>
                        </div>
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
                    {/* Common Field: Quantity */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                {t("stockQuantity")} ({part.unit})
                            </label>
                            <input
                                required
                                type="number"
                                min="1"
                                max={isWithdraw ? part.quantity : undefined}
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                className="input w-full text-lg font-bold text-center bg-bg-tertiary border-white/10 focus:border-primary/50"
                            />
                        </div>
                        <div className="text-sm text-text-muted pt-6">
                            {t("partsInStock")}: <span className="text-text-primary font-bold">{part.quantity}</span> {part.unit}
                        </div>
                    </div>

                    {/* WITHDRAW SPECIFIC */}
                    {isWithdraw && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    {t("stockMachine")} <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    name="machineId"
                                    value={formData.machineId}
                                    onChange={handleChange}
                                    className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                                >
                                    <option value="">-- {t("maintenanceSelectMachine")} --</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                    <option value="other">{t("stockOtherGeneral")}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    {t("stockZone")}
                                </label>
                                <input
                                    name="zone"
                                    value={formData.zone}
                                    onChange={handleChange}
                                    placeholder={t("placeholderZone")}
                                    className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                                />
                            </div>

                            {/* Evidence Photo */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    {t("stockEvidence")}
                                </label>
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/5 hover:bg-white/10 overflow-hidden shrink-0"
                                    >
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <UploadIcon size={20} className="text-text-muted" />
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </div>
                                    <div className="text-xs text-text-muted">
                                        {t("stockEvidenceHint")}
                                        {t("stockOptionalRecommended")}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* RESTOCK SPECIFIC */}
                    {!isWithdraw && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    {t("stockRefDoc")}
                                </label>
                                <input
                                    name="refDocument"
                                    value={formData.refDocument}
                                    onChange={handleChange}
                                    placeholder="Inv # / PO #"
                                    className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                            {t("stockNotes")}
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={2}
                            placeholder={t("placeholderNotes")}
                            className="input w-full bg-bg-tertiary border-white/10 focus:border-primary/50 resize-none"
                        />
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
                        className={`btn shadow-lg ${isWithdraw
                            ? 'bg-error hover:bg-error-hover shadow-error/20'
                            : 'bg-success hover:bg-success-hover shadow-success/20'
                            } text-white`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                {t("msgSaving")}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <SaveIcon size={18} />
                                {isWithdraw ? t("stockConfirmWithdraw") : t("stockConfirmReceive")}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
