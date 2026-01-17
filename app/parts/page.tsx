"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import AddSparePartModal from "../components/forms/AddSparePartModal";
import StockActionModal from "../components/forms/StockActionModal";
import StockHistoryModal from "../components/forms/StockHistoryModal";
import PartDetailsModal from "../components/parts/PartDetailsModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useLanguage } from "../contexts/LanguageContext";
import { getSpareParts, deleteSparePart } from "../lib/firebaseService";
import { SparePart } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { BoxIcon, PlusIcon, SearchIcon, FilterIcon, ArrowUpIcon, ArrowDownIcon, AlertIcon, HistoryIcon } from "../components/ui/Icons";

export default function PartsPage() {
    const { t } = useLanguage();
    const { user, checkAuth } = useAuth();
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [stockActionModalOpen, setStockActionModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null); // For actions
    const [viewPart, setViewPart] = useState<SparePart | null>(null); // For details view
    const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);

    const [actionType, setActionType] = useState<"restock" | "withdraw">("withdraw");

    const [searchQuery, setSearchQuery] = useState("");
    const [parts, setParts] = useState<SparePart[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchParts = async () => {
        try {
            setLoading(true);
            const data = await getSpareParts();
            setParts(data);
        } catch (error) {
            console.error("Error fetching spare parts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParts();
    }, []);

    const openStockModal = (part: SparePart, type: "restock" | "withdraw") => {
        if (!checkAuth()) return;
        setSelectedPart(part);
        setActionType(type);
        setStockActionModalOpen(true);
    };

    const openHistoryModal = (part: SparePart) => {
        setSelectedPart(part);
        setHistoryModalOpen(true);
    };

    const openDetailsModal = (part: SparePart) => {
        setViewPart(part);
        setDetailsModalOpen(true);
    };

    const handleEditPart = (part: SparePart) => {
        if (!checkAuth()) return;
        setDetailsModalOpen(false);
        // TODO: Implement Edit Modal or pre-fill Add Modal
        console.log("Edit part:", part);
    };

    const handleDeleteClick = (part: SparePart) => {
        if (!checkAuth()) return;
        setPartToDelete(part);
        setConfirmDeleteOpen(true);
        setDetailsModalOpen(false);
    };

    const confirmDelete = async () => {
        if (partToDelete) {
            try {
                setLoading(true);
                await deleteSparePart(partToDelete.id);
                await fetchParts();
            } catch (error) {
                console.error("Error deleting part:", error);
            } finally {
                setLoading(false);
                setConfirmDeleteOpen(false);
                setPartToDelete(null);
            }
        }
    };

    const handleRepairPart = (part: SparePart) => {
        setDetailsModalOpen(false);
        // Open stock modal for withdraw as repair action
        openStockModal(part, "withdraw");
    };

    const filteredParts = parts.filter(part =>
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group by Category
    const groupedParts = filteredParts.reduce((acc, part) => {
        const cat = part.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(part);
        return acc;
    }, {} as Record<string, SparePart[]>);

    // Identify Low Stock Items
    const lowStockItems = parts.filter(p => p.quantity <= p.minStockThreshold);

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 mb-20">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center shadow-lg shadow-accent-orange/20">
                            <BoxIcon size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t("partsInventoryTitle")}</h1>
                            <div className="flex items-center gap-2 text-sm text-text-muted">
                                <span>{loading ? "..." : t("partsItemsCount").replace("{count}", parts.length.toString())}</span>
                                <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                                <span>{t("partsCategoriesCount").replace("{count}", Object.keys(groupedParts).length.toString())}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("actionSearch")}
                                className="input pl-10 h-11 w-full bg-bg-secondary/50 focus:bg-bg-secondary transition-all"
                            />
                        </div>

                        {/* Add Button - Only for Logged In Users */}
                        <button
                            onClick={() => { if (checkAuth()) setAddModalOpen(true); }}
                            className="btn btn-primary h-11 px-5 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                        >
                            <PlusIcon size={20} />
                            <span className="hidden sm:inline font-medium">{t("actionAddPart")}</span>
                        </button>
                    </div>
                </div>

                {/* Low Stock Alert Banner */}
                {lowStockItems.length > 0 && (
                    <div className="mb-8 p-4 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 animate-fade-in">
                        <div className="p-2 rounded-lg bg-error/20 text-error mt-0.5">
                            <AlertIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-error mb-1">{t("partsLowStockAlert").replace("{count}", lowStockItems.length.toString())}</h3>
                            <p className="text-sm text-text-secondary mb-3">
                                {t("partsLowStockDesc")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {lowStockItems.map(item => (
                                    <span key={item.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-bg-secondary border border-error/30 text-xs text-text-primary">
                                        <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                                        {item.name} ({item.quantity} {item.unit})
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 rounded-full border-4 border-bg-tertiary border-t-primary animate-spin"></div>
                    </div>
                )}

                {/* Content */}
                {!loading && (
                    <div className="space-y-10">
                        {Object.entries(groupedParts).map(([category, items], idx) => (
                            <div key={category} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                {/* Category Header */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="h-px flex-1 bg-gradient-to-r from-border-light to-transparent"></div>
                                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg-secondary/50 border border-white/5 capitalize">
                                        {category}
                                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-bg-tertiary text-text-muted rounded-md">
                                            {items.length}
                                        </span>
                                    </h2>
                                    <div className="h-px flex-1 bg-gradient-to-l from-border-light to-transparent"></div>
                                </div>

                                {/* Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {items.map(part => (
                                        <div key={part.id} className="card p-0 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group border border-white/5 bg-bg-secondary/30">
                                            <div className="p-4 flex gap-4">
                                                {/* Image */}
                                                <div
                                                    className="w-20 h-20 rounded-xl bg-bg-tertiary shrink-0 overflow-hidden border border-white/5 relative group-hover:border-primary/30 transition-colors cursor-pointer"
                                                    onClick={() => openDetailsModal(part)}
                                                >
                                                    {part.imageUrl ? (
                                                        <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                                                            <BoxIcon size={24} />
                                                        </div>
                                                    )}
                                                    {part.quantity <= part.minStockThreshold && (
                                                        <div className="absolute inset-0 bg-error/20 flex items-center justify-center backdrop-blur-[1px]">
                                                            <span className="text-xs font-bold text-white bg-error px-2 py-0.5 rounded shadow-sm">Low Stock</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="min-w-0">
                                                            <h3
                                                                className="font-bold text-text-primary truncate cursor-pointer hover:text-primary transition-colors"
                                                                onClick={() => openDetailsModal(part)}
                                                            >
                                                                {part.name}
                                                            </h3>
                                                            <p className="text-xs text-text-muted truncate mb-1">{part.description || t("partsNoSpec")}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => openHistoryModal(part)}
                                                            className="p-1.5 rounded-lg bg-bg-tertiary text-text-muted hover:text-primary transition-colors hover:bg-primary/10"
                                                            title="ประวัติรายการ"
                                                        >
                                                            <HistoryIcon size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-auto">
                                                        {part.location && (
                                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-bg-tertiary text-[10px] text-text-secondary border border-white/5">
                                                                <span className="w-1 h-1 rounded-full bg-accent-cyan"></span>
                                                                {part.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stock Status Bar */}
                                            <div className="px-4 pb-3">
                                                <div className="flex items-end justify-between mb-1.5">
                                                    <span className="text-xs text-text-muted font-medium">{t("partsInStock")}</span>
                                                    <div className="text-right">
                                                        <span className={`text-lg font-bold ${part.quantity <= part.minStockThreshold ? 'text-error' : 'text-primary'}`}>
                                                            {part.quantity}
                                                        </span>
                                                        <span className="text-xs text-text-muted ml-1">{part.unit}</span>
                                                    </div>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="h-1.5 w-full bg-bg-tertiary rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${part.quantity <= part.minStockThreshold ? 'bg-error' : 'bg-primary'}`}
                                                        style={{ width: `${Math.min((part.quantity / (part.minStockThreshold * 3 || 10)) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Action Buttons (Require Login) */}
                                            <div className="grid grid-cols-2 divide-x divide-white/5 border-t border-white/5">
                                                <button
                                                    onClick={() => openStockModal(part, "withdraw")}
                                                    className="py-3 flex items-center justify-center gap-2 hover:bg-error/10 text-text-secondary hover:text-error transition-colors text-sm font-medium"
                                                    title={t("partsWithdraw")}
                                                >
                                                    <ArrowDownIcon size={16} />
                                                    {t("partsWithdraw")}
                                                </button>
                                                <button
                                                    onClick={() => openStockModal(part, "restock")}
                                                    className="py-3 flex items-center justify-center gap-2 hover:bg-success/10 text-text-secondary hover:text-success transition-colors text-sm font-medium"
                                                    title={t("partsReceive")}
                                                >
                                                    <ArrowUpIcon size={16} />
                                                    {t("partsReceive")}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && parts.length === 0 && (
                    <div className="empty-state py-20">
                        <BoxIcon size={48} className="text-text-muted mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-text-primary mb-2">{t("partsNoParts")}</h3>
                        <p className="text-text-muted text-sm max-w-md mx-auto mb-6">
                            {t("partsNoPartsDesc")}
                        </p>
                        <button
                            onClick={() => { if (checkAuth()) setAddModalOpen(true); }}
                            className="btn btn-primary shadow-lg shadow-primary/20"
                        >
                            <PlusIcon size={20} />
                            {t("partsAddFirst")}
                        </button>
                    </div>
                )}
            </main>

            <MobileNav />

            <AddSparePartModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSuccess={fetchParts}
            />

            <StockActionModal
                isOpen={stockActionModalOpen}
                onClose={() => setStockActionModalOpen(false)}
                onSuccess={fetchParts}
                actionType={actionType}
                part={selectedPart}
            />

            <StockHistoryModal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                part={selectedPart}
            />

            <PartDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                part={viewPart}
                onEdit={handleEditPart}
                onDelete={handleDeleteClick}
                onRepair={handleRepairPart}
            />

            <ConfirmModal
                isOpen={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={confirmDelete}
                title={t("actionDelete") || "Delete Part"}
                message={t("msgConfirmDelete") || "Are you sure you want to delete this part? This action cannot be undone."}
                isDestructive={true}
                confirmText={t("actionDelete") || "Delete"}
                cancelText={t("actionCancel") || "Cancel"}
            />
        </div>
    );
}
