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
import { getPartsPaginated, searchSpareParts, deleteSparePart, getStockTransactionsPaginated } from "../lib/firebaseService";
import { getMaintenanceRecordsPaginated } from "../services/maintenanceService";
import { Part } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { BoxIcon, PlusIcon, SearchIcon, FilterIcon, ArrowUpIcon, ArrowDownIcon, AlertIcon, HistoryIcon, TrashIcon, LayersIcon, ChevronDownIcon, ChevronUpIcon } from "../components/ui/Icons";

export default function PartsPage() {
    const { t } = useLanguage();
    const { user, checkAuth, isAdmin } = useAuth();
    const { success, error } = useToast();
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [partToEdit, setPartToEdit] = useState<Part | null>(null);
    const [stockActionModalOpen, setStockActionModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [selectedPart, setSelectedPart] = useState<Part | null>(null); // For actions
    const [viewPart, setViewPart] = useState<Part | null>(null); // For details view
    const [partToDelete, setPartToDelete] = useState<Part | null>(null);

    const [actionType, setActionType] = useState<"restock" | "withdraw">("withdraw");

    const [searchQuery, setSearchQuery] = useState("");
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

    const getPartTheme = (category: string) => {
        const cat = category?.toLowerCase() || "";
        if (cat.includes("mech")) return { glow: "bg-blue-500/10", borderLine: "from-transparent via-blue-500 to-transparent", textColor: "text-blue-400 group-hover:text-blue-300" };
        if (cat.includes("elect") || cat.includes("wire")) return { glow: "bg-accent-yellow/10", borderLine: "from-transparent via-accent-yellow to-transparent", textColor: "text-accent-yellow group-hover:text-amber-400" };
        if (cat.includes("hyd")) return { glow: "bg-accent-red/10", borderLine: "from-transparent via-accent-red to-transparent", textColor: "text-accent-red group-hover:text-pink-400" };
        if (cat.includes("pneu")) return { glow: "bg-accent-cyan/10", borderLine: "from-transparent via-accent-cyan to-transparent", textColor: "text-accent-cyan group-hover:text-teal-400" };
        if (cat.includes("con") || cat.includes("oil") || cat.includes("grease") || cat.includes("spare")) return { glow: "bg-green-500/10", borderLine: "from-transparent via-green-500 to-transparent", textColor: "text-green-400 group-hover:text-emerald-400" };
        return { glow: "bg-primary/10", borderLine: "from-transparent via-primary-light to-transparent", textColor: "text-primary-light group-hover:text-indigo-400" };
    };

    // Pagination State
    const [lastCursor, setLastCursor] = useState<{ updatedAt: string, id: string } | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const loadParts = async (isLoadMore = false, force = false) => {
        if ((loading && !force) || loadingMore) return;

        try {
            if (isLoadMore) {
                if (!hasMore || isSearching) return;
                setLoadingMore(true);
                const { parts: newParts, lastItem } = await getPartsPaginated(20, lastCursor?.updatedAt, lastCursor?.id);
                setParts(prev => [...prev, ...newParts]);
                setLastCursor(lastItem);
                setHasMore(!!lastItem);
            } else {
                setLoading(true);
                // Initial load or reset
                const { parts: newParts, lastItem } = await getPartsPaginated(20);
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
            // Don't set loading to false here, let loadParts handle it
            // Force load to bypass the initial loading state check
            loadParts(false, true);
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

    const openStockModal = (part: Part, type: "restock" | "withdraw") => {
        if (!checkAuth()) return;
        setSelectedPart(part);
        setActionType(type);
        setStockActionModalOpen(true);
    };

    const openHistoryModal = (part: Part) => {
        setSelectedPart(part);
        setHistoryModalOpen(true);
    };

    const openDetailsModal = (part: Part) => {
        setViewPart(part);
        setDetailsModalOpen(true);
    };

    const handleEditPart = (part: Part) => {
        if (!checkAuth()) return;
        if (!isAdmin) {
            error(t("msgNoEditPermission") || "คุณไม่มีสิทธ์แก้ไข");
            return;
        }
        setDetailsModalOpen(false);
        setPartToEdit(part);
        setAddModalOpen(true);
    };

    const handleDeleteClick = (part: Part) => {
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

    const handleRepairPart = (part: Part) => {
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
    }, {} as Record<string, Part[]>);

    // 2. Group Root parts by Category (for the main view)
    const groupedParts = rootParts.reduce((acc, part) => {
        const cat = part.category || "Other";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(part);
        return acc;
    }, {} as Record<string, Part[]>);

    // Identify Low Stock Items - No longer used for banner but may be used elsewhere if needed
    // const lowStockItems = parts.filter(p => p.quantity <= p.minStockThreshold);


    // Tab State
    const [activeTab, setActiveTab] = useState<'inventory' | 'history'>('inventory');

    // History State
    const [historyItems, setHistoryItems] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // We'll simplisticly reload history on tab switch for now to ensure freshness and simpler pagination merging
    // A proper merged pagination is complex, so we'll fetch latest 50 of each and merge for "Recent Activity" 
    // effectively disabling infinite scroll for history in this iteration for simplicity/robustness, 
    // or we implement a "Load More" that blindly fetches next page of both and re-sorts.
    // Let's go with "Load More" strategy fetching both.

    const [historyCursor, setHistoryCursor] = useState<{
        maintenance?: { date: string, key: string },
        stock?: { date: string, id: string }
    }>({});

    // Import these dynamically or assumes they are imported
    // We need to add imports for getMaintenanceRecordsPaginated, getStockTransactionsPaginated

    const loadHistory = async (isLoadMore = false) => {
        if (historyLoading) return;
        setHistoryLoading(true);

        try {
            const limit = 20;
            // Fetch Maintenance Records (for Part Usage)
            const maintenancePromise = getMaintenanceRecordsPaginated(
                limit,
                isLoadMore ? historyCursor.maintenance?.date : undefined,
                isLoadMore ? historyCursor.maintenance?.key : undefined
            );

            // Fetch Stock Transactions (for Restock/Withdraw)
            const stockPromise = getStockTransactionsPaginated(
                limit,
                isLoadMore ? historyCursor.stock?.date : undefined,
                isLoadMore ? historyCursor.stock?.id : undefined
            );

            const [reqMaintenance, reqStock] = await Promise.all([maintenancePromise, stockPromise]);

            // Filter Maintenance for Part replacements only
            const validMaintenance = reqMaintenance.records.filter(r =>
                (r.type === 'partReplacement' || r.partId || r.isOverhaul) && r.status === 'completed'
            ).map(r => ({
                type: 'maintenance',
                date: new Date(r.date), // Ensure Date object
                data: r,
                id: r.id
            }));

            // Map Stock Transactions
            const validStock = reqStock.transactions.map(t => ({
                type: 'stock',
                date: new Date(t.performedAt), // Ensure Date object
                data: t,
                id: t.id
            }));

            // Merge and Sort
            const merged = [...validMaintenance, ...validStock].sort((a, b) => b.date.getTime() - a.date.getTime());

            if (isLoadMore) {
                setHistoryItems(prev => [...prev, ...merged]);
            } else {
                setHistoryItems(merged);
            }

            setHistoryCursor({
                maintenance: reqMaintenance.nextCursor,
                stock: reqStock.lastItem || undefined
            });

        } catch (err) {
            console.error("Error loading history:", err);
            error("Failed to load history");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history' && historyItems.length === 0) {
            loadHistory();
        }
    }, [activeTab]);

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
                        {activeTab === 'inventory' && (
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
                        )}

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

                {/* Tab Switcher */}
                <div className="flex justify-center mb-8">
                    <div className="bg-bg-secondary p-1 rounded-xl flex gap-1 shadow-inner">
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inventory'
                                ? 'bg-bg-tertiary text-primary shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                                }`}
                        >
                            <BoxIcon size={16} className="inline mr-2 mb-0.5" />
                            {t("tabInventory") || "Inventory"}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history'
                                ? 'bg-bg-tertiary text-accent-blue shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                                }`}
                        >
                            <HistoryIcon size={16} className="inline mr-2 mb-0.5" />
                            {t("tabHistory") || "History"}
                        </button>
                    </div>
                </div>

                {/* INVENTORY TAB */}
                {activeTab === 'inventory' && (
                    <>
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {items.map(part => {
                                                const theme = getPartTheme(part.category || "");
                                                const isLowStock = part.quantity <= (part.minStockThreshold || 0);

                                                return (
                                                    <div
                                                        key={part.id}
                                                        className="relative w-full rounded-xl bg-bg-secondary p-3 border border-white/5 shadow-sm flex flex-col gap-2 animate-fade-in transition-colors cursor-pointer hover:bg-bg-tertiary"
                                                        onClick={() => openDetailsModal(part)}
                                                    >
                                                        {/* Left Edge Indicator */}
                                                        <div className={`absolute top-0 left-0 w-1 h-full ${isLowStock ? 'bg-error animate-pulse' : 'bg-primary'}`} />
                                                        
                                                        <div className="flex items-start justify-between pl-2">
                                                            <div className="flex flex-col flex-1 min-w-0 pr-2">
                                                                {/* Category & Title */}
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase whitespace-nowrap shrink-0 ${theme.textColor}`}>
                                                                        {part.category || "PART"}
                                                                    </span>
                                                                    <h3 className="text-sm font-bold text-white truncate">{part.name}</h3>
                                                                </div>
                                                                
                                                                {/* Specs Row */}
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/70 mt-0.5">
                                                                    <span className={`font-bold px-1.5 py-0.5 rounded ${isLowStock ? 'bg-error/20 text-error' : 'bg-white/10 text-white'}`}>
                                                                        x{part.quantity} {part.unit || "pcs"}
                                                                    </span>
                                                                    {(part.brand || part.model || part.description) && (
                                                                        <span className="truncate max-w-[150px]">
                                                                            {[part.brand, part.model || part.description].filter(Boolean).join(" ")}
                                                                        </span>
                                                                    )}
                                                                    {part.location && (
                                                                        <span className="truncate text-accent-cyan bg-accent-cyan/10 px-1 rounded">{part.location}</span>
                                                                    )}
                                                                    {part.pricePerUnit && (
                                                                        <span className="text-accent-orange font-bold">฿{Number(part.pricePerUnit).toLocaleString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-1 shrink-0 mt-1">
                                                                {subPartsMap[part.id] && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleExpand(part.id); }}
                                                                        className={`px-2 h-8 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-all shadow-sm ${expandedParts[part.id] ? 'bg-primary border border-primary text-white' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/20'}`}
                                                                    >
                                                                        <LayersIcon size={12} />
                                                                        {subPartsMap[part.id].length}
                                                                        <ChevronDownIcon size={10} className={expandedParts[part.id] ? "rotate-180 transition-transform" : "transition-transform"} />
                                                                    </button>
                                                                )}
                                                                {isAdmin && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteClick(part);
                                                                        }}
                                                                        className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors"
                                                                        title={t("actionDelete")}
                                                                    >
                                                                        <TrashIcon size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Sub-Parts List (Expandable Inline) */}
                                                        {subPartsMap[part.id] && expandedParts[part.id] && (
                                                            <div className="pl-2 mt-2 pt-2 border-t border-white/5 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                {subPartsMap[part.id].map(sub => (
                                                                    <div
                                                                        key={sub.id}
                                                                        className="flex items-center justify-between p-2 rounded-lg bg-bg-primary/50 border border-white/5 hover:border-primary/30 transition-colors cursor-pointer"
                                                                        onClick={() => openDetailsModal(sub)}
                                                                    >
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <BoxIcon size={14} className="text-text-muted/50 shrink-0" />
                                                                            <div className="min-w-0 flex flex-col">
                                                                                <span className="text-xs font-bold text-text-primary truncate leading-none">{sub.name}</span>
                                                                                <span className="text-[9px] text-text-muted truncate mt-0.5">{sub.description || sub.brand || "-"}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`text-[10px] font-bold shrink-0 ml-2 px-1.5 py-0.5 rounded ${sub.quantity <= (sub.minStockThreshold || 0) ? 'bg-error/10 text-error' : 'bg-white/5 text-primary'}`}>
                                                                            x{sub.quantity} {sub.unit || "pcs"}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
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
                    </>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {historyLoading && historyItems.length === 0 ? (
                            <div className="flex justify-center py-20">
                                <div className="w-12 h-12 rounded-full border-4 border-bg-tertiary border-t-primary animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {historyItems.map((item) => {
                                    // Render Logic for merged items
                                    if (item.type === 'maintenance') {
                                        const r = item.data;
                                        return (
                                            <div key={item.id} className="bg-bg-secondary/50 rounded-xl p-4 border border-white/5 hover:border-accent-blue/30 transition-all flex gap-4">
                                                <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0 border border-accent-blue/20">
                                                    <BoxIcon size={20} className="text-accent-blue" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-text-primary">{r.partName || "Part Replacement"}</h4>
                                                            <div className="text-sm text-accent-blue font-medium mt-0.5">{r.machineName}</div>
                                                        </div>
                                                        <span className="text-xs text-text-muted whitespace-nowrap">
                                                            {new Date(r.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-xs text-text-muted flex items-center gap-2">
                                                        <span>👤 {r.technician}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                        <span>{t("labelPartReplacement") || "เปลี่ยนอะไหล่"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        const t = item.data;
                                        const isRestock = t.type === 'restock';
                                        return (
                                            <div key={item.id} className="bg-bg-secondary/50 rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-all flex gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${isRestock ? 'bg-primary/10 border-primary/20' : 'bg-accent-orange/10 border-accent-orange/20'}`}>
                                                    {isRestock ? <ArrowUpIcon size={20} className="text-primary" /> : <ArrowDownIcon size={20} className="text-accent-orange" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-text-primary">{t.partName}</h4>
                                                            <div className={`text-sm font-bold mt-0.5 ${isRestock ? 'text-primary' : 'text-accent-orange'}`}>
                                                                {isRestock ? '+' : '-'}{t.quantity} {t.unit || ""}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-text-muted whitespace-nowrap">
                                                            {new Date(t.performedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-xs text-text-muted flex items-center gap-2">
                                                        <span>👤 {t.performedBy}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                        <span>{isRestock ? (t("actionRestock") || "เติมสต็อก") : (t("actionWithdraw") || "เบิกจ่าย")}</span>
                                                        {t.machineName && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                                <span className="text-text-primary/70">{t.machineName}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                })}

                                {historyItems.length > 0 && (
                                    <div className="flex justify-center pt-4">
                                        <button
                                            onClick={() => loadHistory(true)}
                                            disabled={historyLoading}
                                            className="text-sm text-text-muted hover:text-text-primary underline"
                                        >
                                            {historyLoading ? "Loading..." : (t("actionLoadMore") || "โหลดเพิ่มเติม")}
                                        </button>
                                    </div>
                                )}

                                {!historyLoading && historyItems.length === 0 && (
                                    <div className="text-center py-20 text-text-muted">
                                        <div className="text-center py-20 text-text-muted">
                                            {t("msgNoHistory") || "No history found"}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
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
                onViewHistory={openHistoryModal}
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
