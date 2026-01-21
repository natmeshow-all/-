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
import { getSparePartsPaginated, searchSpareParts, deleteSparePart } from "../lib/firebaseService";
import { SparePart } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { BoxIcon, PlusIcon, SearchIcon, FilterIcon, ArrowUpIcon, ArrowDownIcon, AlertIcon, HistoryIcon, TrashIcon, LayersIcon, ChevronDownIcon, ChevronUpIcon } from "../components/ui/Icons";

export default function PartsPage() {
    const { t } = useLanguage();
    const { user, checkAuth, isAdmin } = useAuth();
    const { success, error } = useToast();
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [partToEdit, setPartToEdit] = useState<SparePart | null>(null);
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
    const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
    
    // Pagination State
    const [lastCursor, setLastCursor] = useState<{name: string, id: string} | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const loadParts = async (isLoadMore = false) => {
        if (loading || loadingMore) return;
        
        try {
            if (isLoadMore) {
                if (!hasMore || isSearching) return;
                setLoadingMore(true);
                const { parts: newParts, lastItem } = await getSparePartsPaginated(20, lastCursor?.name, lastCursor?.id);
                setParts(prev => [...prev, ...newParts]);
                setLastCursor(lastItem);
                setHasMore(!!lastItem);
            } else {
                setLoading(true);
                // Initial load or reset
                const { parts: newParts, lastItem } = await getSparePartsPaginated(20);
                setParts(newParts);
                setLastCursor(lastItem);
                setHasMore(!!lastItem);
            }
        } catch (error) {
            console.error("Error fetching spare parts:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const performSearch = async (query: string) => {
        if (!query) {
            setIsSearching(false);
            setParts([]);
            setLastCursor(null);
            setHasMore(true);
            setLoading(false); 
            loadParts(false);
        } else {
            setIsSearching(true);
            setLoading(true);
            try {
                const results = await searchSpareParts(query);
                setParts(results);
                setHasMore(false);
            } catch (err) {
                console.error("Error searching parts:", err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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
        if (!isAdmin) {
            error(t("msgNoEditPermission") || "คุณไม่มีสิทธ์แก้ไข");
            return;
        }
        setDetailsModalOpen(false);
        setPartToEdit(part);
        setAddModalOpen(true);
    };

    const handleDeleteClick = (part: SparePart) => {
        if (!checkAuth()) return;
        if (!isAdmin) {
            error(t("msgNoEditPermission") || "คุณไม่มีสิทธ์แก้ไข");
            return;
        }
        setPartToDelete(part);
        setConfirmDeleteOpen(true);
        setDetailsModalOpen(false);
    };

    const confirmDelete = async () => {
        if (partToDelete) {
            try {
                setLoading(true);
                await deleteSparePart(partToDelete.id);
                await loadParts(false);
                success(t("msgDeleteSuccess") || "ลบข้อมูลเรียบร้อยแล้ว");
            } catch (err) {
                console.error("Error deleting part:", err);
                error(t("msgDeleteError") || "เกิดข้อผิดพลาดในการลบข้อมูล");
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

    const filteredParts = parts;

    const toggleExpand = (id: string) => {
        setExpandedParts(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Grouping logic for hierarchy
    // 1. Separate Root parts and Sub-parts
    const rootParts = filteredParts.filter(p => !p.parentId);
    const subPartsMap = filteredParts.reduce((acc, p) => {
        if (p.parentId) {
            if (!acc[p.parentId]) acc[p.parentId] = [];
            acc[p.parentId].push(p);
        }
        return acc;
    }, {} as Record<string, SparePart[]>);

    // 2. Group Root parts by Category (for the main view)
    const groupedParts = rootParts.reduce((acc, part) => {
        const cat = part.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(part);
        return acc;
    }, {} as Record<string, SparePart[]>);

    // Identify Low Stock Items - No longer used for banner but may be used elsewhere if needed
    // const lowStockItems = parts.filter(p => p.quantity <= p.minStockThreshold);

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
                                <span>{loading ? "..." : t("partsItemsCount", { count: parts.length })}</span>
                                <span className="w-1 h-1 rounded-full bg-text-muted/30"></span>
                                <span>{t("partsCategoriesCount", { count: Object.keys(groupedParts).length })}</span>
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
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {items.map(part => (
                                        <div
                                            key={part.id}
                                            className="relative w-full h-[300px] rounded-2xl overflow-hidden shadow-xl border border-white/5 group active:scale-[0.99] transition-all duration-300 animate-fade-in"
                                        >
                                            {/* Background Image */}
                                            <div
                                                className="absolute inset-0 bg-bg-tertiary cursor-pointer"
                                                onClick={() => openDetailsModal(part)}
                                            >
                                                {part.imageUrl ? (
                                                    <img
                                                        src={part.imageUrl}
                                                        alt={part.name}
                                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted bg-bg-secondary">
                                                        <BoxIcon size={48} className="opacity-10 mb-2" />
                                                        <span className="text-[10px] opacity-40 font-medium tracking-wider">{t("labelNoImage") || "No Image"}</span>
                                                    </div>
                                                )}

                                                {/* Gradient Overlays */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/20 to-transparent opacity-90" />
                                                <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent" />
                                            </div>

                                            {/* Content Overlay */}
                                            <div className="absolute inset-0 p-4 flex flex-col pointer-events-none">
                                                {/* Header Row */}
                                                <div className="flex justify-between items-start pointer-events-auto">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <h3
                                                            className="text-xl font-bold text-white drop-shadow-lg leading-tight cursor-pointer hover:text-primary-light transition-colors line-clamp-1"
                                                            onClick={() => openDetailsModal(part)}
                                                        >
                                                            {part.name}
                                                        </h3>
                                                        <span className="text-[10px] font-bold text-primary-light uppercase tracking-wider block mt-0.5 opacity-80">
                                                            {part.category}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-2xl font-black ${part.quantity <= part.minStockThreshold ? 'text-error' : 'text-primary'} drop-shadow-lg`}>
                                                                x{part.quantity}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest -mt-1">{part.unit || "pcs"}</span>
                                                        </div>

                                                        <div className="flex gap-1.5">
                                                            {/* Sub-parts Trigger */}
                                                            {subPartsMap[part.id] && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(part.id); }}
                                                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all shadow-lg ${expandedParts[part.id] ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-xl'}`}
                                                                >
                                                                    {expandedParts[part.id] ? <ChevronUpIcon size={16} /> : <LayersIcon size={16} />}
                                                                </button>
                                                            )}

                                                            {/* Admin Delete */}
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClick(part);
                                                                    }}
                                                                    className="w-8 h-8 rounded-lg bg-error/10 hover:bg-error border border-error/20 text-error hover:text-white flex items-center justify-center transition-all shadow-lg opacity-0 group-hover:opacity-100"
                                                                    title={t("actionDelete")}
                                                                >
                                                                    <TrashIcon size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Details Grid - Compact Version */}
                                                <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 pointer-events-auto bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{t("tableModelSpec") || "Model"}</span>
                                                        <span className="text-[11px] text-white font-medium truncate" title={part.model || part.description}>
                                                            {part.model || part.description || "-"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{t("tableBrand") || "Brand"}</span>
                                                        <span className="text-[11px] text-white font-medium truncate">
                                                            {part.brand || "-"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{t("tableLocation") || "Location"}</span>
                                                        <span className="text-[11px] text-white font-medium truncate">
                                                            {part.location || "-"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{t("tablePrice") || "Price"}</span>
                                                        <span className="text-[11px] text-accent-orange font-bold">
                                                            {part.pricePerUnit ? `฿${Number(part.pricePerUnit).toLocaleString()}` : "-"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sub-Parts List (Expandable Overlay) */}
                                            {subPartsMap[part.id] && expandedParts[part.id] && (
                                                <div className="absolute inset-0 z-20 bg-bg-primary/95 backdrop-blur-lg flex flex-col p-4 animate-fade-in">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest">
                                                            <LayersIcon size={14} className="text-primary" />
                                                            {t("labelSubParts")} ({subPartsMap[part.id].length})
                                                        </div>
                                                        <button
                                                            onClick={() => toggleExpand(part.id)}
                                                            className="p-1 rounded-full bg-white/5 text-text-muted hover:text-white"
                                                        >
                                                            <ChevronDownIcon size={18} />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 overflow-auto space-y-2 custom-scrollbar pr-1">
                                                        {subPartsMap[part.id].map(sub => (
                                                            <div
                                                                key={sub.id}
                                                                className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer group/sub"
                                                                onClick={() => openDetailsModal(sub)}
                                                            >
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-10 h-10 rounded-lg bg-bg-secondary shrink-0 overflow-hidden border border-white/5">
                                                                        {sub.imageUrl ? (
                                                                            <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                                                                                <BoxIcon size={16} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="text-xs font-bold text-text-primary truncate">{sub.name}</div>
                                                                        <div className="text-[10px] text-text-muted truncate">{sub.description || sub.brand || "-"}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0 ml-2">
                                                                    <div className={`text-xs font-bold ${sub.quantity <= sub.minStockThreshold ? 'text-error' : 'text-primary'}`}>
                                                                        x{sub.quantity} <span className="text-[9px] font-normal text-text-muted">{sub.unit}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Load More Button */}
                        {!isSearching && hasMore && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={() => loadParts(true)}
                                    disabled={loadingMore}
                                    className="btn btn-secondary px-8"
                                >
                                    {loadingMore ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            {t("loading") || "Loading..."}
                                        </span>
                                    ) : (
                                        t("actionLoadMore") || "Load More"
                                    )}
                                </button>
                            </div>
                        )}
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
                onClose={() => {
                    setAddModalOpen(false);
                    setPartToEdit(null);
                }}
                onSuccess={() => loadParts(false)}
                partToEdit={partToEdit}
            />

            <StockActionModal
                isOpen={stockActionModalOpen}
                onClose={() => setStockActionModalOpen(false)}
                onSuccess={() => loadParts(false)}
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
                subParts={viewPart ? subPartsMap[viewPart.id] : []}
                onSelectPart={(p) => setViewPart(p)}
            />

            <ConfirmModal
                isOpen={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={confirmDelete}
                title={t("titleConfirmDelete") || "ยืนยันการลบ"}
                message={`${t("msgConfirmDelete") || "คุณแน่ใจหรือไม่ว่าต้องการลบ?"} ${partToDelete ? `"${partToDelete.name}"` : ""}`}
                isDestructive={true}
                confirmText={t("actionDelete")}
                cancelText={t("actionCancel")}
            />
        </div>
    );
}
