"use client";

import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import StatCard from "./components/ui/StatCard";
import AddPartModal from "./components/forms/AddPartModal";
import MaintenanceRecordModal from "./components/forms/MaintenanceRecordModal";
import ConfirmModal from "./components/ui/ConfirmModal"; // Import ConfirmModal
import { useLanguage } from "./contexts/LanguageContext";
import { useAuth } from "./contexts/AuthContext";
import { useToast } from "./contexts/ToastContext";
import { getDashboardStats, getParts, deletePart } from "./lib/firebaseService";
import MachineDetailsModal from "./components/machines/MachineDetailsModal"; // Import MachineDetailsModal
import Lightbox from "./components/ui/Lightbox"; // Import Lightbox
import {
  BoxIcon,
  SettingsIcon,
  MapPinIcon,
  AlertTriangleIcon,
  PlusIcon,
  EditIcon,
  HistoryIcon,
  DownloadIcon,
  SearchIcon,
  RefreshIcon,
  ChevronDownIcon,
  MaximizeIcon,
  MinimizeIcon,
} from "./components/ui/Icons";
import { Part, PartFilters, DashboardStats } from "./types";
import Image from "next/image";

export default function Dashboard() {
  const { t, language, setLanguage, tData } = useLanguage();
  const { user } = useAuth();
  const { success } = useToast();
  const [addPartModalOpen, setAddPartModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);

  // Confirm Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [viewMachineId, setViewMachineId] = useState<string | undefined>(undefined);
  const [viewMachineName, setViewMachineName] = useState<string | undefined>(undefined);
  const [triggerPart, setTriggerPart] = useState<Part | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Table Fullscreen State
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  // Filter Expanded State
  const [isFilterExpanded, setIsFilterExpanded] = useState(false); // Default to collapsed
  const tableSectionRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Handlers for action buttons
  const handleEditPart = (part: Part) => {
    setSelectedPart(part);
    setAddPartModalOpen(true);
  };

  const handleMaintenancePart = (part: Part) => {
    // Ideally pass part details to maintenance modal
    setMaintenanceModalOpen(true);
  };

  const handleDeleteClick = (part: Part) => {
    setPartToDelete(part);
    setConfirmModalOpen(true);
  };

  const confirmDeletePart = async () => {
    if (!partToDelete) return;
    try {
      await deletePart(partToDelete.id);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to delete part", error);
      alert("Failed to delete part");
    }
  };

  const openMachineDetails = (part: Part) => {
    setViewMachineId(part.machineId);
    setViewMachineName(part.machineName);
    setTriggerPart(part);
    setMachineModalOpen(true);
  };

  const [stats, setStats] = useState<DashboardStats>({
    totalParts: 0,
    totalMachines: 0,
    totalZones: 0,
    maintenanceRecords: 0,
    pendingMaintenance: 0,
    upcomingSchedule: 0,
  });
  const [parts, setParts] = useState<Part[]>([]);
  const [filters, setFilters] = useState<PartFilters>({
    machineId: "",
    zone: "",
    partName: "",
  });
  const fetchData = async () => {
    // Check session storage to see if we've already shown the startup notification
    const hasShownNotification = typeof window !== 'undefined' && sessionStorage.getItem('db_notification_shown');

    try {
      setLoading(true);
      const [statsData, partsData] = await Promise.all([
        getDashboardStats(),
        getParts()
      ]);
      setStats(statsData);
      setParts(partsData);

      // Trigger success toast only once per session
      if (!hasShownNotification) {
        success(t("msgDbConnected"), t("msgDbReady"));
        sessionStorage.setItem('db_notification_shown', 'true');
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Trigger error toast only once per session if initial load failed
      if (!hasShownNotification) {
        useToast().error(t("msgDbConnectError"), t("msgDbErrorDetail"));
        sessionStorage.setItem('db_notification_shown', 'true');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Body scroll lock for fullscreen
  useEffect(() => {
    if (isTableFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTableFullscreen]);

  // Auto-fullscreen logic
  useEffect(() => {
    if (loading || isTableFullscreen) return; // Removed isTableFullscreen check to allow re-triggering? No, if it's already full, don't trigger. 
    // Wait, if it's full, setting it to true again does nothing. 
    // If user minimized it (isTableFullscreen = false), we want it to trigger again ONLY if they scroll away and back?
    // The IntersectionObserver only fires changes. If they minimize while in view, checking "isTableFullscreen" in dependency might cause loop if we are not careful?
    // Actually, if they minimize, `isTableFullscreen` becomes false. The effect re-runs.
    // Observer is re-created. Checks entry. If intersecting -> sets true immediately. 
    // This basically implies "You cannot minimize it while it's in view", it will pop back up.
    // That might be annoying. But user said "Every time scroll down to".
    // Usually "Scroll down to" implies entering the view.
    // If I keep `isTableFullscreen` in the dependency array and early return, then when they close it, the effect runs, sees `isTableFullscreen` is false, creates observer. Observer sees it's visible, triggers true.
    // User won't be able to close it!
    // I should probably ONLY trigger if it *crosses* the threshold (not just "is visible upon mount").
    // But IntersectionObserver fires initial check.

    // To solve "Cannot close":
    // 1. Only auto-trigger if they are SCROLLING INTO view.
    // 2. If they are already there and close it, don't reopen.
    // Logic: `hasTriggered` per intersection instance?
    // Or, remove `isTableFullscreen` from dependency array?
    // If I remove `isTableFullscreen` from dependency, the effect only runs on mount (or updates to `loading`).
    // The observer callback closes over `setIsTableFullscreen`. That's fine.
    // If they close it, `isTableFullscreen` becomes false. Changes state. Re-renders. Effect doesn't run.
    // Observer is still alive.
    // If they scroll out and back in, observer callback fires. `entries[0].isIntersecting` becomes true. `setIsTableFullscreen(true)`.
    // THIS IS WHAT WE WANT.
    // So removing `isTableFullscreen` from dependency array is key?
    // Wait, the observer variable needs to be cleaned up.
    // If I remove `isTableFullscreen` from deps, I should make sure I don't stale-closure something important? No, `setIsTableFullscreen` is stable.

    // Let's try removing `isTableFullscreen` from the early return and dependency array.

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Only auto-fullscreen on mobile/tablets (< 768px)
          if (window.innerWidth < 768) {
            setIsTableFullscreen(true);
          }
        }
      },
      {
        threshold: 0.1,
      }
    );

    if (tableSectionRef.current) {
      observer.observe(tableSectionRef.current);
    }

    return () => observer.disconnect();
  }, [loading]); // Run once when loading finishes.

  // Derive unique values for filters from real data
  const availableMachines = Array.from(new Set(parts.map(p => p.machineName || p.machineId))).filter(Boolean).sort();
  const availableZones = Array.from(new Set(parts.map(p => p.zone))).filter(Boolean).sort();
  const availablePartNames = Array.from(new Set(parts.map(p => p.partName))).filter(Boolean).sort();

  // Filter parts based on current filters
  const filteredParts = parts.filter((part) => {
    // Machine filter: match by ID OR name for maximum compatibility
    if (filters.machineId && part.machineId !== filters.machineId && part.machineName !== filters.machineId) return false;
    if (filters.zone && part.zone !== filters.zone) return false;
    if (filters.partName && part.partName !== filters.partName) return false;
    return true;
  });

  const handleFilterChange = (key: keyof PartFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ machineId: "", zone: "", partName: "" });
  };

  // Count unique values for filter badges
  const uniqueMachinesCount = availableMachines.length;
  const uniqueZonesCount = availableZones.length;
  const uniquePartNamesCount = availablePartNames.length;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="main-container px-4 py-6 sm:px-6">
        {/* Stats Section */}
        <section className="mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={<BoxIcon size={12} />}
              value={stats.totalParts}
              label={t("statTotalParts")}
              iconBgColor="bg-primary/20"
              iconTextColor="text-primary-light"
              delay={0}
            />
            <StatCard
              icon={<SettingsIcon size={12} />}
              value={stats.totalMachines}
              label={t("statMachines")}
              iconBgColor="bg-accent-yellow/20"
              iconTextColor="text-accent-yellow"
              delay={50}
            />
            <StatCard
              icon={<MapPinIcon size={12} />}
              value={stats.totalZones}
              label={t("statZones")}
              iconBgColor="bg-accent-cyan/20"
              iconTextColor="text-accent-cyan"
              delay={100}
            />
            <StatCard
              icon={<AlertTriangleIcon size={12} />}
              value={stats.maintenanceRecords}
              label={t("statMaintenanceRecords")}
              iconBgColor="bg-accent-red/20"
              iconTextColor="text-accent-red"
              delay={150}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setAddPartModalOpen(true)}
              className="flex-1 min-w-[120px] btn btn-active bg-accent-green text-bg-primary hover:bg-accent-green/90 border-none h-8 text-[11px] font-bold"
            >
              <PlusIcon size={14} className="mr-1" />
              {t("actionAddPart")}
            </button>
            <button
              onClick={() => setMaintenanceModalOpen(true)}
              className="flex-1 min-w-[120px] btn btn-active bg-accent-yellow text-bg-primary hover:bg-accent-yellow/90 border-none h-8 text-[11px] font-bold"
            >
              <HistoryIcon size={14} className="mr-1" />
              {t("actionRecordMaintenance")}
            </button>
            <button className="flex-1 min-w-[120px] btn btn-outline border-white/10 hover:bg-white/5 h-8 text-[11px] font-bold text-text-primary">
              <RefreshIcon size={14} className="mr-1" />
              {t("actionMaintenanceHistory")}
            </button>
          </div>
        </section>

        {/* Filter Section */}
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <div className="filter-section">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              <h3 className="filter-title mb-0 text-xs">
                <SearchIcon size={12} />
                {t("filterTitle")}
              </h3>
              <button
                className={`transition-all duration-300 p-1 rounded-full ${!isFilterExpanded ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse" : "text-text-muted hover:text-primary hover:bg-white/5"}`}
              >
                <ChevronDownIcon size={12} className={`transition-transform duration-200 ${isFilterExpanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isFilterExpanded && (
              <div className="mt-2 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  {/* Machine Filter */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                      <SettingsIcon size={10} />
                      {t("filterMachine")}
                      <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{uniqueMachinesCount}</span>
                    </label>
                    <select
                      value={filters.machineId}
                      onChange={(e) => handleFilterChange("machineId", e.target.value)}
                      className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                    >
                      <option value="">{t("filterAll")}</option>
                      {availableMachines.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone Filter */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                      <MapPinIcon size={10} />
                      {t("filterZone")}
                      <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{uniqueZonesCount}</span>
                    </label>
                    <select
                      value={filters.zone}
                      onChange={(e) => handleFilterChange("zone", e.target.value)}
                      className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                    >
                      <option value="">{t("filterAll")}</option>
                      {availableZones.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  {/* Part Name Filter */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                      <BoxIcon size={10} />
                      {t("filterPartName")}
                      <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{uniquePartNamesCount}</span>
                    </label>
                    <select
                      value={filters.partName}
                      onChange={(e) => handleFilterChange("partName", e.target.value)}
                      className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                    >
                      <option value="">{t("filterAll")}</option>
                      {availablePartNames.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                  <p className="text-[11px] text-text-muted">
                    {t("filterShowResults")}{" "}
                    <span className="text-primary-light font-semibold">{filteredParts.length}</span>
                    {" "}{t("filterOf")}{" "}
                    <span className="text-text-primary font-semibold">{loading ? "..." : parts.length}</span>
                    {" "}{t("filterRecords")}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilters();
                    }}
                    className="btn btn-outline text-[10px] py-1 px-2 h-6"
                  >
                    <RefreshIcon size={10} />
                    {t("actionClearFilters")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Machine Parts Section */}
        <section
          ref={tableSectionRef}
          className={`animate-fade-in-up transition-all duration-300 ${isTableFullscreen ? "fixed inset-0 z-50 bg-bg-primary p-0 flex flex-col" : "mb-6"}`}
          style={{ animationDelay: "300ms" }}
        >
          {/* Header Card - Separate on mobile if not fullscreen */}
          <div className={`card overflow-hidden mb-4 ${isTableFullscreen ? "rounded-none border-0 flex-1 flex flex-col mb-0" : ""}`}>
            <div className="px-4 py-3 border-b border-border-light flex items-center justify-between bg-bg-secondary flex-none">
              <div className="flex items-center gap-2">
                <SettingsIcon size={18} className="text-text-muted" />
                <h2 className="font-semibold text-text-primary">{t("tableTitleParts")}</h2>
              </div>
              <button
                onClick={() => setIsTableFullscreen(!isTableFullscreen)}
                className={`transition-all duration-300 p-1.5 rounded-lg ${!isTableFullscreen ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse" : "text-text-muted hover:text-primary hover:bg-bg-tertiary"}`}
                title={isTableFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isTableFullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={20} />}
              </button>
            </div>

            {/* Desktop Table View inside the same card */}
            <div className={`hidden md:block w-full ${isTableFullscreen ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
              <div className={`table-container ${isTableFullscreen ? "flex-1 overflow-auto bg-bg-secondary custom-scrollbar" : ""}`} style={isTableFullscreen ? { WebkitOverflowScrolling: 'touch' } : {}}>
                <table className="table w-full">
                  <thead>
                    <tr className="bg-bg-tertiary">
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableImage")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableMachine")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tablePartName")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableModelSpec")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableBrand")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableZone")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableQuantity")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableLocation")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableNotes")}</th>
                      <th className={`px-4 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableManagement")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {!loading && filteredParts.map((part, index) => (
                      <tr
                        key={part.id}
                        className="animate-fade-in hover:bg-bg-tertiary/30 transition-colors"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="py-3 px-4">
                          <div
                            className="w-12 h-12 rounded-lg bg-bg-tertiary overflow-hidden flex items-center justify-center border border-border-light relative group cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => openMachineDetails(part)}
                          >
                            {part.imageUrl ? (
                              <Image
                                src={part.imageUrl}
                                alt={part.partName}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <BoxIcon size={20} className="text-text-muted" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-text-primary">
                          <span
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => openMachineDetails(part)}
                          >
                            {part.machineName || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-text-secondary font-medium">
                          {tData(part.partName)}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-text-muted text-xs max-w-[150px] truncate" title={part.modelSpec}>
                          {part.modelSpec || "-"}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-text-secondary text-sm">
                          {part.brand || "-"}
                        </td>
                        <td className="py-3 px-4 text-text-secondary text-sm">
                          {tData(part.zone || "-")}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-semibold text-text-primary">{part.quantity || 0}</span>
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell text-text-secondary text-sm">
                          {part.location || "-"}
                        </td>
                        <td className="py-3 px-4 hidden 2xl:table-cell text-text-muted text-xs max-w-[200px] truncate" title={part.notes}>
                          {tData(part.notes || "-")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {user ? (
                              <>
                                <button
                                  onClick={() => handleEditPart(part)}
                                  className="p-1.5 rounded-lg text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                                  title={t("actionEdit")}
                                >
                                  <EditIcon size={16} />
                                </button>
                                <button
                                  onClick={() => handleMaintenancePart(part)}
                                  className="p-1.5 rounded-lg text-accent-yellow hover:bg-accent-yellow/10 transition-colors"
                                  title={t("actionMaintenance")}
                                >
                                  <SettingsIcon size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(part)}
                                  className="p-1.5 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                                  title={t("actionDelete")}
                                >
                                  <BoxIcon size={16} className="rotate-45" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-text-muted italic opacity-50">{t("statusReadOnly")}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fullscreen Mobile View Content - Inside specialized container when fullscreen */}
            {isTableFullscreen && (
              <div className="md:hidden flex-1 overflow-auto bg-bg-primary p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredParts.length > 0 ? (
                  filteredParts.map((part, index) => (
                    <div
                      key={part.id}
                      className="relative w-full h-[320px] rounded-2xl overflow-hidden shadow-lg border border-white/10 group active:scale-[0.99] transition-transform animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Background Image */}
                      <div
                        className="absolute inset-0 bg-bg-tertiary"
                        onClick={() => {
                          if (part.imageUrl) {
                            setLightboxImage(part.imageUrl);
                          }
                        }}
                      >
                        {part.imageUrl ? (
                          <Image
                            src={part.imageUrl}
                            alt={part.partName}
                            fill
                            className="object-cover w-full h-full"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted bg-bg-secondary">
                            <BoxIcon size={48} className="opacity-20 mb-2" />
                            <span className="text-xs opacity-50">No Image</span>
                          </div>
                        )}

                        {/* Gradient Overlay for text visibility */}
                        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
                      </div>

                      {/* Content Overlay - Glassmorphism */}
                      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end h-full pointer-events-none">
                        <div className="pointer-events-auto">
                          {/* Badge Top Right */}
                          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                            <div className="flex flex-col items-end gap-1">
                              <span className="badge badge-primary font-bold shadow-lg backdrop-blur-md bg-primary/80 border border-white/20">
                                x{part.quantity}
                              </span>
                              <span className="text-[10px] text-white/60 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
                                {t("tableQuantity")}
                              </span>
                            </div>

                            {/* Location Badge */}
                            <div className="flex flex-col items-end gap-1">
                              <span className="badge bg-accent-cyan/80 text-bg-primary font-bold shadow-lg backdrop-blur-md border border-white/20">
                                {part.location || "-"}
                              </span>
                              <span className="text-[10px] text-white/60 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
                                {t("tableLocation")}
                              </span>
                            </div>

                            {/* small red delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(part);
                              }}
                              className="w-8 h-8 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 flex items-center justify-center hover:bg-accent-red hover:text-white transition-all shadow-lg active:scale-90"
                              title={t("actionDelete")}
                            >
                              <BoxIcon size={14} className="rotate-45" />
                            </button>
                          </div>

                          {/* Main Info */}
                          <div className="mb-4">
                            <h3 className="text-2xl font-bold text-white drop-shadow-lg leading-tight mb-1">
                              {tData(part.partName)}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-primary-light drop-shadow-md">
                              <SettingsIcon size={14} />
                              <span className="font-semibold">{part.machineName}</span>
                            </div>
                          </div>

                          {/* Individual Detail Tags - Frosted Glass Pills */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-1.5 py-0.5 flex flex-col min-w-[60px]">
                              <span className="text-[8px] text-white/50 uppercase tracking-tighter font-bold">{t("tableBrand")}</span>
                              <span className="text-[10px] text-white font-medium truncate max-w-[80px]">{part.brand || "-"}</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-1.5 py-0.5 flex flex-col min-w-[90px]">
                              <span className="text-[8px] text-white/50 uppercase tracking-tighter font-bold">{t("tableModelSpec")}</span>
                              <span className="text-[10px] text-white font-medium truncate max-w-[140px]" title={part.modelSpec}>{part.modelSpec || "-"}</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-1.5 py-0.5 flex flex-col min-w-[40px]">
                              <span className="text-[8px] text-white/50 uppercase tracking-tighter font-bold">{t("tableZone")}</span>
                              <span className="text-[10px] text-white font-medium">{tData(part.zone || "-")}</span>
                            </div>

                            {part.notes && (
                              <div className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-1.5 flex gap-1.5 items-start mt-0.5">
                                <AlertTriangleIcon size={10} className="text-accent-yellow shrink-0 mt-0.5" />
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-white/40 uppercase tracking-widest font-bold">{t("tableNotes")}</span>
                                  <span className="text-[10px] text-white/80 italic line-clamp-1">"{tData(part.notes)}"</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPart(part)}
                              className="flex-1 btn bg-white/10 backdrop-blur-md border border-white/20 hover:bg-primary transition-all text-[11px] h-8 text-white rounded-lg px-2"
                            >
                              <EditIcon size={12} className="mr-1" />
                              {t("actionEdit")}
                            </button>
                            <button
                              onClick={() => handleMaintenancePart(part)}
                              className="flex-1 btn bg-white/10 backdrop-blur-md border border-white/20 hover:bg-accent-yellow hover:text-black transition-all text-[11px] h-8 text-white rounded-lg px-2"
                            >
                              <SettingsIcon size={12} className="mr-1" />
                              {t("actionMaintenance")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state py-12">
                    <BoxIcon size={48} className="text-text-muted mb-3" />
                    <p className="text-text-muted">{t("msgNoData")}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Normal Mobile List View (Not Fullscreen) - Standalone Cards */}
          {!isTableFullscreen && (
            <div className="md:hidden space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredParts.length > 0 ? (
                filteredParts.map((part, index) => (
                  <div
                    key={part.id}
                    className="relative w-full h-[320px] rounded-2xl overflow-hidden shadow-lg border border-white/10 group active:scale-[0.99] transition-transform animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Background Image */}
                    <div
                      className="absolute inset-0 bg-bg-tertiary"
                      onClick={() => {
                        if (part.imageUrl) {
                          setLightboxImage(part.imageUrl);
                        }
                      }}
                    >
                      {part.imageUrl ? (
                        <Image
                          src={part.imageUrl}
                          alt={part.partName}
                          fill
                          className="object-cover w-full h-full"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-text-muted bg-bg-secondary">
                          <BoxIcon size={48} className="opacity-20 mb-2" />
                          <span className="text-xs opacity-50">No Image</span>
                        </div>
                      )}

                      {/* Gradient Overlay for text visibility */}
                      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent pointer-events-none" />
                    </div>

                    {/* Content Overlay - Glassmorphism */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end h-full pointer-events-none">
                      <div className="pointer-events-auto">
                        {/* Badge Top Right */}
                        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                          <div className="flex flex-col items-end gap-1">
                            <span className="badge badge-primary font-bold shadow-lg backdrop-blur-md bg-primary/80 border border-white/20">
                              x{part.quantity}
                            </span>
                            <span className="text-[10px] text-white/60 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
                              {t("tableQuantity")}
                            </span>
                          </div>

                          {/* Location Badge */}
                          <div className="flex flex-col items-end gap-1">
                            <span className="badge bg-accent-cyan/80 text-bg-primary font-bold shadow-lg backdrop-blur-md border border-white/20">
                              {part.location || "-"}
                            </span>
                            <span className="text-[10px] text-white/60 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
                              {t("tableLocation")}
                            </span>
                          </div>

                          {/* small red delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(part);
                            }}
                            className="w-8 h-8 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 flex items-center justify-center hover:bg-accent-red hover:text-white transition-all shadow-lg active:scale-90"
                            title={t("actionDelete")}
                          >
                            <BoxIcon size={14} className="rotate-45" />
                          </button>
                        </div>

                        {/* Main Info */}
                        <div className="mb-4">
                          <h3 className="text-2xl font-bold text-white drop-shadow-lg leading-tight mb-1">
                            {tData(part.partName)}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-primary-light drop-shadow-md">
                            <SettingsIcon size={14} />
                            <span className="font-semibold">{part.machineName}</span>
                          </div>
                        </div>

                        {/* Individual Detail Tags - Frosted Glass Pills */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {/* Brand */}
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-1.5 py-0.5 flex flex-col min-w-[60px]">
                            <span className="text-[8px] text-white/50 uppercase tracking-tighter font-bold">{t("tableBrand")}</span>
                            <span className="text-[10px] text-white font-medium truncate max-w-[80px]">{part.brand || "-"}</span>
                          </div>
                          {/* Model */}
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-1.5 py-0.5 flex flex-col min-w-[90px]">
                            <span className="text-[8px] text-white/50 uppercase tracking-tighter font-bold">{t("tableModelSpec")}</span>
                            <span className="text-[10px] text-white font-medium truncate max-w-[140px]" title={part.modelSpec}>{part.modelSpec || "-"}</span>
                          </div>
                          {/* Zone */}
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-1.5 py-0.5 flex flex-col min-w-[40px]">
                            <span className="text-[8px] text-white/50 uppercase tracking-tighter font-bold">{t("tableZone")}</span>
                            <span className="text-[10px] text-white font-medium">{tData(part.zone || "-")}</span>
                          </div>

                          {/* Notes - Separate Refined Block */}
                          {part.notes && (
                            <div className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-1.5 flex gap-1.5 items-start mt-0.5">
                              <AlertTriangleIcon size={10} className="text-accent-yellow shrink-0 mt-0.5" />
                              <div className="flex flex-col">
                                <span className="text-[8px] text-white/40 uppercase tracking-widest font-bold">{t("tableNotes")}</span>
                                <span className="text-[10px] text-white/80 italic line-clamp-1">"{tData(part.notes)}"</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPart(part)}
                            className="flex-1 btn bg-white/10 backdrop-blur-md border border-white/20 hover:bg-primary transition-all text-[11px] h-8 text-white rounded-lg px-2"
                          >
                            <EditIcon size={12} className="mr-1" />
                            {t("actionEdit")}
                          </button>
                          <button
                            onClick={() => handleMaintenancePart(part)}
                            className="flex-1 btn bg-white/10 backdrop-blur-md border border-white/20 hover:bg-accent-yellow hover:text-black transition-all text-[11px] h-8 text-white rounded-lg px-2"
                          >
                            <SettingsIcon size={12} className="mr-1" />
                            {t("actionMaintenance")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state py-12">
                  <BoxIcon size={48} className="text-text-muted mb-3" />
                  <p className="text-text-muted">{t("msgNoData")}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Modals */}
      <AddPartModal
        isOpen={addPartModalOpen}
        onClose={() => {
          setAddPartModalOpen(false);
          setSelectedPart(null); // Clear selected part on close
        }}
        onSuccess={fetchData}
        partToEdit={selectedPart}
      />
      <MaintenanceRecordModal
        isOpen={maintenanceModalOpen}
        onClose={() => setMaintenanceModalOpen(false)}
        onSuccess={fetchData}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmDeletePart}
        title={t("confirmDeleteTitle")}
        message={
          partToDelete
            ? t("confirmDeleteMessageDetail").replace("{name}", `${partToDelete.machineName} - ${tData(partToDelete.partName)}`)
            : t("confirmDeleteMessage")
        }
        confirmText={t("actionDelete")}
        cancelText={t("actionCancel")}
        isDestructive={true}
      />

      <MachineDetailsModal
        isOpen={machineModalOpen}
        onClose={() => setMachineModalOpen(false)}
        machineId={viewMachineId}
        machineName={viewMachineName}
        initialPart={triggerPart || undefined}
        onEditPart={(part) => {
          setMachineModalOpen(false);
          handleEditPart(part);
        }}
        onRepairPart={(part) => {
          setMachineModalOpen(false);
          handleMaintenancePart(part);
        }}
        onDeletePart={(part) => {
          setMachineModalOpen(false);
          handleDeleteClick(part);
        }}
      />

      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageSrc={lightboxImage || ""}
      />
    </div>
  );
}
