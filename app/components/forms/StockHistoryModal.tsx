import React, { useState, useEffect } from "react";
import { XIcon, HistoryIcon, ArrowUpIcon, ArrowDownIcon, UserIcon, ClockIcon, MapPinIcon, ImageIcon, BoxIcon } from "../ui/Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { getStockTransactions } from "../../lib/firebaseService";
import { SparePart, StockTransaction } from "../../types";

interface StockHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    part: SparePart | null;
}

export default function StockHistoryModal({ isOpen, onClose, part }: StockHistoryModalProps) {
    const { t, language } = useLanguage();
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && part) {
            setLoading(true);
            getStockTransactions(part.id)
                .then(data => setTransactions(data))
                .catch(err => console.error("Error fetching transactions:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, part]);

    if (!isOpen || !part) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-bg-secondary w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-bg-tertiary/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                            <HistoryIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">{t("historyTitle")}</h2>
                            <p className="text-sm text-text-muted">{part.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                    >
                        <XIcon size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 rounded-full border-4 border-white/5 border-t-primary animate-spin" />
                            <p className="text-text-muted animate-pulse">{t("msgLoading")}</p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
                            <HistoryIcon size={48} className="opacity-20" />
                            <p>{t("historyNoData")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map((txn) => (
                                <div key={txn.id} className="relative pl-8 pb-4 border-l border-white/10 group last:border-0 last:pb-0">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full border-2 border-bg-secondary z-10 ${txn.type === "withdraw" ? "bg-error" : "bg-success"
                                        }`} />

                                    <div className="bg-bg-tertiary/50 rounded-xl p-4 border border-white/5 group-hover:border-white/10 transition-colors">
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${txn.type === "withdraw" ? "bg-error/10 text-error" : "bg-success/10 text-success"
                                                    }`}>
                                                    {txn.type === "withdraw" ? t("partsWithdraw") : t("partsReceive")}
                                                </div>
                                                <span className="text-lg font-bold text-text-primary">
                                                    {txn.type === "withdraw" ? "-" : "+"}{txn.quantity} {part.unit}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                                    <ClockIcon size={12} />
                                                    {txn.performedAt.toLocaleString(language === "th" ? "th-TH" : "en-US", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            {/* User Info */}
                                            <div className="flex items-start gap-2">
                                                <UserIcon size={14} className="mt-1 text-text-muted" />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-text-secondary truncate">{txn.performedBy}</p>
                                                    {txn.performedByEmail && (
                                                        <p className="text-[10px] text-text-muted truncate">{txn.performedByEmail}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Context Info (Machine/Zone/Supplier) */}
                                            <div className="flex items-start gap-2">
                                                {txn.type === "withdraw" ? (
                                                    <>
                                                        <MapPinIcon size={14} className="mt-1 text-text-muted" />
                                                        <div className="min-w-0">
                                                            <p className="text-text-secondary truncate">{txn.machineName || "N/A"}</p>
                                                            {(txn.Location || (txn as any).zone) && (
                                                                <p className="text-[10px] text-text-muted tracking-tight">
                                                                    {t("stockLocation")}: {txn.Location || (txn as any).zone}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <BoxIcon size={14} className="mt-1 text-text-muted" />
                                                        <div className="min-w-0">
                                                            <p className="text-text-secondary truncate">{txn.supplier || "Unknown Supplier"}</p>
                                                            {txn.refDocument && (
                                                                <p className="text-[10px] text-text-muted">{t("stockRefDoc")}: {txn.refDocument}</p>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes & Evidence */}
                                        {(txn.notes || txn.evidenceImageUrl) && (
                                            <div className="mt-3 pt-3 border-t border-white/5 flex gap-4">
                                                {txn.notes && (
                                                    <p className="flex-1 text-xs text-text-muted italic bg-white/5 p-2 rounded-lg">
                                                        "{txn.notes}"
                                                    </p>
                                                )}
                                                {txn.evidenceImageUrl && (
                                                    <a
                                                        href={txn.evidenceImageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="group/img relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 block"
                                                    >
                                                        <img src={txn.evidenceImageUrl} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                            <ImageIcon size={12} className="text-white" />
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-bg-tertiary/10 text-center">
                    <button
                        onClick={onClose}
                        className="btn btn-ghost w-full sm:w-auto px-10"
                    >
                        {t("historyClose")}
                    </button>
                </div>
            </div>
        </div>
    );
}
