import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { 
    SearchIcon, 
    TrashIcon, 
    EditIcon, 
    SaveIcon, 
    XIcon, 
    CheckIcon,
    RefreshIcon,
    GlobeIcon
} from "../ui/Icons";
import { getDynamicTranslations, updateTranslation, deleteTranslation } from "../../services/translationService";

export default function TranslationManagementTab() {
    const { t } = useLanguage();
    const { success, error } = useToast();
    
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const loadTranslations = async () => {
        setLoading(true);
        try {
            const data = await getDynamicTranslations();
            setTranslations(data || {});
        } catch (err) {
            console.error("Error loading translations:", err);
            error(t("msgError") || "Error", "Failed to load translations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTranslations();
    }, []);

    const handleStartEdit = (key: string, value: string) => {
        setEditingKey(key);
        setEditValue(value);
        setDeleteConfirm(null);
    };

    const handleCancelEdit = () => {
        setEditingKey(null);
        setEditValue("");
    };

    const handleSaveEdit = async () => {
        if (!editingKey) return;
        
        try {
            await updateTranslation(editingKey, editValue);
            setTranslations(prev => ({
                ...prev,
                [editingKey]: editValue
            }));
            success(t("msgSaveSuccess") || "Saved", "Translation updated successfully");
            setEditingKey(null);
        } catch (err) {
            console.error("Error updating translation:", err);
            error(t("msgError") || "Error", "Failed to update translation");
        }
    };

    const handleDeleteClick = (key: string) => {
        if (deleteConfirm === key) {
            // Confirm delete
            handleDelete(key);
        } else {
            setDeleteConfirm(key);
            // Auto-cancel confirmation after 3 seconds
            setTimeout(() => {
                setDeleteConfirm(prev => (prev === key ? null : prev));
            }, 3000);
        }
    };

    const handleDelete = async (key: string) => {
        try {
            await deleteTranslation(key);
            const newTranslations = { ...translations };
            delete newTranslations[key];
            setTranslations(newTranslations);
            success(t("msgDeleteSuccess") || "Deleted", "Translation deleted successfully");
            setDeleteConfirm(null);
        } catch (err) {
            console.error("Error deleting translation:", err);
            error(t("msgError") || "Error", "Failed to delete translation");
        }
    };

    const filteredTranslations = Object.entries(translations).filter(([key, value]) => {
        const query = searchQuery.toLowerCase();
        return key.toLowerCase().includes(query) || value.toLowerCase().includes(query);
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="card p-6 bg-bg-secondary/30 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <GlobeIcon size={24} />
                            </div>
                            {t("adminTranslationTitle") || "Translation Management"}
                        </h2>
                        <p className="text-sm text-text-muted max-w-2xl">
                            {t("adminTranslationSubtitle") || "Manage dynamic translations for multilingual support."}
                        </p>
                    </div>
                    
                    <button 
                        onClick={loadTranslations}
                        className="btn btn-secondary flex items-center gap-2"
                        disabled={loading}
                    >
                        <RefreshIcon size={18} className={loading ? "animate-spin" : ""} />
                        <span>{t("actionRefresh") || "Refresh"}</span>
                    </button>
                </div>
            </div>

            {/* Search and List */}
            <div className="card bg-bg-secondary/30 border border-white/5">
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <SearchIcon size={20} className="text-text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("adminTranslationSearch") || "Search translations..."}
                        className="bg-transparent border-none outline-none text-text-primary w-full placeholder:text-text-muted/50"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-text-muted hover:text-text-primary">
                            <XIcon size={18} />
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 font-medium text-text-muted w-1/2">{t("adminTranslationKey") || "Thai Text (Key)"}</th>
                                <th className="p-4 font-medium text-text-muted w-1/2">{t("adminTranslationValue") || "English Translation"}</th>
                                <th className="p-4 font-medium text-text-muted w-24 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-text-muted">
                                        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                                        <p>Loading translations...</p>
                                    </td>
                                </tr>
                            ) : filteredTranslations.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-text-muted">
                                        {t("adminTranslationEmpty") || "No translations found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredTranslations.map(([key, value]) => (
                                    <tr key={key} className="hover:bg-white/5 group transition-colors">
                                        <td className="p-4 text-text-primary font-mono text-sm break-all">
                                            {key}
                                        </td>
                                        <td className="p-4 text-text-secondary">
                                            {editingKey === key ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-full bg-bg-primary border border-white/10 rounded px-3 py-1.5 text-text-primary focus:border-primary focus:outline-none"
                                                        autoFocus
                                                    />
                                                </div>
                                            ) : (
                                                <span className="break-all">{value}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {editingKey === key ? (
                                                    <>
                                                        <button 
                                                            onClick={handleSaveEdit}
                                                            className="p-1.5 text-accent-green hover:bg-accent-green/10 rounded transition-colors"
                                                            title={t("adminActionSaveTranslation") || "Save"}
                                                        >
                                                            <CheckIcon size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={handleCancelEdit}
                                                            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/10 rounded transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <XIcon size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStartEdit(key, value)}
                                                            className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                            title="Edit"
                                                        >
                                                            <EditIcon size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteClick(key)}
                                                            className={`p-1.5 rounded transition-colors ${
                                                                deleteConfirm === key 
                                                                    ? "text-white bg-accent-red hover:bg-accent-red/90" 
                                                                    : "text-text-muted hover:text-accent-red hover:bg-accent-red/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                            }`}
                                                            title={deleteConfirm === key ? "Confirm Delete" : t("adminActionDeleteTranslation") || "Delete"}
                                                        >
                                                            {deleteConfirm === key ? <TrashIcon size={18} /> : <TrashIcon size={18} />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
