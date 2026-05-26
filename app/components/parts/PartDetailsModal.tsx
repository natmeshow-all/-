"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import { Part } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { EditIcon, TrashIcon, BoxIcon, WrenchIcon, XIcon, LayersIcon, ChevronRightIcon, HistoryIcon } from "../ui/Icons";

interface PartDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    part: Part | null;
    onEdit: (part: Part) => void;
    onDelete: (part: Part) => void;
    onRepair: (part: Part) => void;
    onViewHistory?: (part: Part) => void; // New prop
    subParts?: Part[];
    onSelectPart?: (part: Part) => void;
}

export default function PartDetailsModal({
    isOpen,
    onClose,
    part,
    onEdit,
    onDelete,
    onRepair,
    onViewHistory,
    subParts = [],
    onSelectPart
}: PartDetailsModalProps) {
    const { t } = useLanguage();
    const { checkAuth, isAdmin } = useAuth();
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (!part) return null;

    // Lightbox Component
    const LocalLightbox = () => {
        if (!lightboxOpen || !part.imageUrl) return null;

        return (
            <div
                className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
                onClick={() => setLightboxOpen(false)}
            >
                <button
                    onClick={() => setLightboxOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                    <XIcon size={24} />
                </button>
                <img
                    src={part.imageUrl}
                    alt={part.partName || part.name || t("altImage")}
                    className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl animate-scale-in"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={part.partName || part.name || ""}
                titleIcon={<BoxIcon size={24} className="text-primary" />}
                size="lg"
            >
                <div className="flex flex-col gap-6">
                    {/* Image Section */}
                    <div className="w-full h-64 sm:h-80 rounded-xl bg-bg-tertiary overflow-hidden border border-white/5 relative group">
                        {part.imageUrl && !imageError ? (
                            <>
                                <img
                                    src={part.imageUrl}
                                    alt={part.partName || part.name}
                                    onError={() => setImageError(true)}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                    onClick={() => setLightboxOpen(true)}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium backdrop-blur-sm">
                                        {t("labelViewFullscreen")}
                                    </span>
                                </div>
                            </>
                        ) : (
                            (() => {
                                const getPartTheme = (category: string) => {
                                    const cat = category?.toLowerCase() || "";
                                    if (cat.includes("mech")) return { glow: "bg-blue-500/10", borderLine: "from-transparent via-blue-500 to-transparent", textGradient: "from-blue-400 to-indigo-400" };
                                    if (cat.includes("elect") || cat.includes("wire")) return { glow: "bg-accent-yellow/10", borderLine: "from-transparent via-accent-yellow to-transparent", textGradient: "from-accent-yellow to-amber-500" };
                                    if (cat.includes("hyd")) return { glow: "bg-accent-red/10", borderLine: "from-transparent via-accent-red to-transparent", textGradient: "from-accent-red to-pink-500" };
                                    if (cat.includes("pneu")) return { glow: "bg-accent-cyan/10", borderLine: "from-transparent via-accent-cyan to-transparent", textGradient: "from-accent-cyan to-teal-400" };
                                    if (cat.includes("con") || cat.includes("oil") || cat.includes("grease") || cat.includes("spare")) return { glow: "bg-green-500/10", borderLine: "from-transparent via-green-500 to-transparent", textGradient: "from-green-400 to-emerald-400" };
                                    return { glow: "bg-primary/10", borderLine: "from-transparent via-primary-light to-transparent", textGradient: "from-primary-light to-indigo-400" };
                                };
                                const theme = getPartTheme(part.category || "");
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-primary p-6 relative overflow-hidden select-none">
                                        {/* Tech blueprint grid pattern */}
                                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:12px_20px]"></div>

                                        {/* Technical ambient glow */}
                                        <div className={`absolute -top-12 -left-12 w-36 h-36 rounded-full ${theme.glow} blur-3xl opacity-60`}></div>
                                        <div className="absolute -bottom-12 -right-12 w-36 h-36 rounded-full bg-blue-500/5 blur-3xl opacity-40"></div>

                                        {/* squircle neon shield */}
                                        <div className="
                                            relative w-24 h-24 rounded-[22px] 
                                            bg-gradient-to-b from-white/10 to-white/5 
                                            border border-white/15 
                                            flex flex-col items-center justify-center 
                                            shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.5)] 
                                        ">
                                            {/* Glowing border line */}
                                            <div className={`absolute inset-x-3 top-0 h-px bg-gradient-to-r ${theme.borderLine} opacity-70`}></div>

                                            {/* initials */}
                                            <span className={`text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.textGradient} drop-shadow-[0_2px_6px_rgba(255,255,255,0.1)]`}>
                                                {part.name ? part.name.substring(0, 2).toUpperCase() : "PT"}
                                            </span>

                                            {/* sub-badge category */}
                                            <span className="absolute -bottom-2 px-1.5 py-0.5 rounded bg-black/85 border border-white/10 text-[7px] font-black text-text-muted tracking-widest uppercase">
                                                {part.category || "PART"}
                                            </span>
                                        </div>

                                        {/* Technical corner decors */}
                                        <div className="absolute top-3 left-3 w-1.5 h-1.5 border-t border-l border-white/10"></div>
                                        <div className="absolute top-3 right-3 w-1.5 h-1.5 border-t border-r border-white/10"></div>
                                        <div className="absolute bottom-3 left-3 w-1.5 h-1.5 border-b border-l border-white/10"></div>
                                        <div className="absolute bottom-3 right-3 w-1.5 h-1.5 border-b border-r border-white/10"></div>
                                    </div>
                                );
                            })()
                        )}

                        {/* Status Badge Overlay */}
                        <div className="absolute top-4 right-4">
                            {part.quantity <= part.minStockThreshold ? (
                                <span className="px-3 py-1 rounded-full bg-error text-white text-xs font-bold shadow-lg">
                                    {t("statusLowStock")}
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full bg-success text-white text-xs font-bold shadow-lg">
                                    {t("statusInStock")}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-bg-secondary/50 border border-white/5">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableModelSpec")}</h3>
                                <p className="text-base text-text-primary">{part.description || "-"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableBrand")}</h3>
                                <p className="text-base text-text-primary">{part.brand || "-"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableLocation")}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent-cyan"></span>
                                    <p className="text-base text-text-primary">{part.location || "-"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("addPartCategory")}</h3>
                                <p className="text-base text-text-primary capitalize">{part.category || "-"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableQuantity")}</h3>
                                <div className="flex items-end gap-2">
                                    <span className={`text-2xl font-bold ${part.quantity <= part.minStockThreshold ? 'text-error' : 'text-primary'}`}>
                                        {part.quantity}
                                    </span>
                                    <span className="text-sm text-text-muted mb-1">{part.unit}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableNotes")}</h3>
                                <p className="text-sm text-text-secondary italic">{part.notes || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sub-Parts Section */}
                    {subParts.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                    <LayersIcon size={16} className="text-primary" />
                                    {t("labelSubParts")}
                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                                        {subParts.length}
                                    </span>
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {subParts.map(sub => (
                                    <div
                                        key={sub.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/30 border border-white/5 hover:border-primary/50 transition-all cursor-pointer group"
                                        onClick={() => onSelectPart?.(sub)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-bg-secondary shrink-0 overflow-hidden border border-white/5">
                                                {sub.imageUrl ? (
                                                    <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                                                        <BoxIcon size={18} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{sub.name}</div>
                                                <div className="text-xs text-text-muted">{sub.description || sub.brand || "-"}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className={`text-sm font-bold ${sub.quantity <= sub.minStockThreshold ? 'text-error' : 'text-primary'}`}>
                                                    {sub.quantity}
                                                </div>
                                                <div className="text-[10px] text-text-muted">{sub.unit}</div>
                                            </div>
                                            <ChevronRightIcon size={16} className="text-text-muted group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                         <button
                            onClick={() => { if (onViewHistory) onViewHistory(part); }}
                            className="btn bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary border-white/10 flex items-center justify-center gap-2 h-12 text-sm rounded-xl font-medium transition-all"
                        >
                            <div className="p-1 rounded-full bg-primary/10 text-primary">
                                <HistoryIcon size={16} />
                            </div>
                            {t("historyTitle") || "History"}
                        </button>

                        <button
                            onClick={() => { if (checkAuth()) onEdit(part); }}
                            className="btn btn-warning flex items-center justify-center gap-2 h-12 text-sm text-white font-bold shadow-lg shadow-yellow-500/20"
                        >
                            <EditIcon size={18} />
                            {t("actionEdit")}
                        </button>
                        <button
                            onClick={() => { if (checkAuth()) onRepair(part); }}
                            className="btn bg-accent-orange/10 text-accent-orange hover:bg-accent-orange/20 border-accent-orange/20 flex items-center justify-center gap-2 h-12 text-sm rounded-xl font-medium transition-all"
                        >
                            <WrenchIcon size={18} />
                            {t("actionRepair")}
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => { if (checkAuth()) onDelete(part); }}
                                className="btn btn-danger flex items-center justify-center gap-2 h-12 text-sm rounded-xl font-medium transition-all shadow-lg shadow-error/20"
                            >
                                <TrashIcon size={18} />
                                {t("actionDelete")}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Render Lightbox outside Modal to ensure it's on top */}
            <LocalLightbox />
        </>
    );
}
