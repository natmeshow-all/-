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
    if (!part) return null;

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
                    {/* Header Tech Banner */}
                    {(() => {
                        const getPartTheme = (category: string) => {
                            const cat = category?.toLowerCase() || "";
                            if (cat.includes("mech")) return { glow: "bg-blue-500/10", borderLine: "from-transparent via-blue-500 to-transparent", textColor: "text-blue-400", bar: "bg-blue-500" };
                            if (cat.includes("elect") || cat.includes("wire")) return { glow: "bg-accent-yellow/10", borderLine: "from-transparent via-accent-yellow to-transparent", textColor: "text-accent-yellow", bar: "bg-accent-yellow" };
                            if (cat.includes("hyd")) return { glow: "bg-accent-red/10", borderLine: "from-transparent via-accent-red to-transparent", textColor: "text-accent-red", bar: "bg-accent-red" };
                            if (cat.includes("pneu")) return { glow: "bg-accent-cyan/10", borderLine: "from-transparent via-accent-cyan to-transparent", textColor: "text-accent-cyan", bar: "bg-accent-cyan" };
                            if (cat.includes("con") || cat.includes("oil") || cat.includes("grease") || cat.includes("spare")) return { glow: "bg-green-500/10", borderLine: "from-transparent via-green-500 to-transparent", textColor: "text-green-400", bar: "bg-green-500" };
                            return { glow: "bg-primary/10", borderLine: "from-transparent via-primary-light to-transparent", textColor: "text-primary-light", bar: "bg-primary" };
                        };
                        const theme = getPartTheme(part.category || "");
                        const stockPercent = part.minStockThreshold && part.minStockThreshold > 0 
                            ? Math.min(100, Math.max(0, (part.quantity / part.minStockThreshold) * 100)) 
                            : 100;
                        const isLowStock = part.quantity <= part.minStockThreshold;
                        const stockColor = isLowStock ? 'bg-error' : theme.bar;

                        return (
                            <div className="w-full rounded-xl bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-primary overflow-hidden border border-white/5 relative p-6 shadow-xl">
                                {/* Tech blueprint grid pattern */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:12px_20px]"></div>

                                {/* Technical ambient glow */}
                                <div className={`absolute -top-12 -left-12 w-48 h-48 rounded-full ${theme.glow} blur-3xl opacity-60`}></div>
                                <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-blue-500/5 blur-3xl opacity-40"></div>

                                {isLowStock && (
                                    <div className="absolute inset-0 bg-error/5 animate-pulse z-0 pointer-events-none"></div>
                                )}

                                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                                    {/* Tech Badge */}
                                    <div className="
                                        w-28 h-28 shrink-0 rounded-[22px] 
                                        bg-gradient-to-b from-white/10 to-white/5 
                                        border border-white/15 
                                        flex flex-col items-center justify-center 
                                        shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.5)] 
                                        relative
                                    ">
                                        <div className={`absolute inset-x-3 top-0 h-px bg-gradient-to-r ${theme.borderLine} opacity-70`}></div>
                                        <span className={`text-4xl font-black ${theme.textColor} drop-shadow-[0_2px_6px_rgba(255,255,255,0.1)]`}>
                                            {part.name ? part.name.substring(0, 2).toUpperCase() : "PT"}
                                        </span>
                                        <span className="absolute -bottom-2.5 px-2 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] font-black text-text-muted tracking-widest uppercase shadow-sm">
                                            {part.category || "PART"}
                                        </span>
                                    </div>

                                    {/* Core Metrics */}
                                    <div className="flex-1 w-full space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-2xl font-bold text-white drop-shadow-md">{part.name}</h2>
                                                <p className="text-sm text-primary-light font-medium uppercase tracking-wider">{part.category}</p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className={`text-3xl font-black ${isLowStock ? 'text-error' : 'text-primary'} drop-shadow-lg leading-none`}>
                                                    x{part.quantity}
                                                </span>
                                                <span className="text-xs font-bold text-white/50 uppercase tracking-widest mt-1">{part.unit || "pcs"}</span>
                                            </div>
                                        </div>

                                        {/* Stock Level Warning Bar */}
                                        <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/5 w-full">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                                                    Stock Capacity
                                                    {isLowStock && <span className="text-error font-black animate-pulse">(CRITICAL LOW)</span>}
                                                </span>
                                                <span className="text-xs font-bold text-white/90 font-mono">
                                                    {part.quantity} / {part.minStockThreshold} Min Threshold
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden shadow-inner relative">
                                                <div 
                                                    className={`h-full ${stockColor} rounded-full transition-all duration-1000 ease-out relative`}
                                                    style={{ width: `${Math.min(100, stockPercent)}%` }}
                                                >
                                                    {isLowStock && (
                                                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
                                            <div className="w-10 h-10 rounded-lg bg-bg-secondary shrink-0 flex items-center justify-center border border-white/5">
                                                <BoxIcon size={18} className="text-text-muted/50" />
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
        </>
    );
}
