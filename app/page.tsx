"use client";

import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import DashboardStatsSection from "./components/dashboard/DashboardStats";
import PartsFilter from "./components/dashboard/PartsFilter";
import DesktopPartTable from "./components/dashboard/DesktopPartTable";
import MobilePartCards from "./components/dashboard/MobilePartCard";
import dynamic from "next/dynamic";
import { useLanguage } from "./contexts/LanguageContext";
import { useAuth } from "./contexts/AuthContext";
import { useToast } from "./contexts/ToastContext";
import { getDashboardStats, deletePart, getMachines, getPartsPaginated, getPartsByMachineName, getPartsByLocation } from "./lib/firebaseService";
import PageLoadingOverlay from "./components/ui/PageLoadingOverlay";

const AddPartModal = dynamic(() => import("./components/forms/AddPartModal"));
const MaintenanceRecordModal = dynamic(() => import("./components/forms/MaintenanceRecordModal"));
const ConfirmModal = dynamic(() => import("./components/ui/ConfirmModal"));
const MachineDetailsModal = dynamic(() => import("./components/machines/MachineDetailsModal"));
const PartReplacementPlanModal = dynamic(() => import("./components/pm/PartReplacementPlanModal"));
const HelpModal = dynamic(() => import("./components/ui/HelpModal"));
const Lightbox = dynamic(() => import("./components/ui/Lightbox"));
const WelcomeGuide = dynamic(() => import("./components/onboarding/WelcomeGuide"));
const PriorityPMAlert = dynamic(() => import("./components/ui/PriorityPMAlert"));
import {
  PlusIcon,
  HistoryIcon,
  RefreshIcon,
  SettingsIcon,
  MaximizeIcon,
  MinimizeIcon,
  AlertTriangleIcon
} from "./components/ui/Icons";
import { Part, PartFilters, DashboardStats } from "./types";

export default function Dashboard() {
  const { t, language, tData } = useLanguage();
  const { user, checkAuth, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();

  // Modal states
  const [addPartModalOpen, setAddPartModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [viewMachineId, setViewMachineId] = useState<string | undefined>(undefined);
  const [viewMachineName, setViewMachineName] = useState<string | undefined>(undefined);
  const [triggerPart, setTriggerPart] = useState<Part | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Table Fullscreen State
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const tableSectionRef = React.useRef<HTMLDivElement>(null);

  // Loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(true);

  // Pagination
  const [cursor, setCursor] = useState<{ updatedAt: string; id: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Data
  const [stats, setStats] = useState<DashboardStats>({
    totalParts: 0, totalMachines: 0, totalLocations: 0, maintenanceRecords: 0,
    totalPM: 0, totalOverhaul: 0, pendingMaintenance: 0, upcomingSchedule: 0,
    totalSpareParts: 0, pmThisMonth: 0, pmThisWeek: 0, lastUpdated: 0,
    locationCounts: { ALL: 0, FZ: 0, RTE: 0, UT: 0 },
  });
  const [parts, setParts] = useState<Part[]>([]);
  const [filters, setFilters] = useState<PartFilters>({ machineId: "", Location: "", partName: "", location: "" });
  const [allMachines, setAllMachines] = useState<any[]>([]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleEditPart = useCallback((part: Part) => {
    if (!checkAuth()) return;
    setSelectedPart(part);
    setAddPartModalOpen(true);
  }, [checkAuth]);

  const handleMaintenancePart = useCallback((part: Part) => {
    if (!checkAuth()) return;
    setTriggerPart(part);
    setMaintenanceModalOpen(true);
  }, [checkAuth]);

  const handleDeleteClick = useCallback((part: Part) => {
    if (!checkAuth()) return;
    setPartToDelete(part);
    setConfirmModalOpen(true);
  }, [checkAuth]);

  // ─── Data Fetching ─────────────────────────────────────────
  async function withTimeout<T>(promise: Promise<T>, ms: number = 45000): Promise<T> {
    const timeout = new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms));
    return Promise.race([promise, timeout]);
  }

  const fetchData = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setStats({ totalParts: 0, totalMachines: 0, totalLocations: 0, maintenanceRecords: 0, totalPM: 0, totalOverhaul: 0, pendingMaintenance: 0, upcomingSchedule: 0, totalSpareParts: 0, lastUpdated: 0, locationCounts: { ALL: 0, FZ: 0, RTE: 0, UT: 0 } });
      setParts([]);
      setAllMachines([]);
      setStatsLoading(false);
      setPartsLoading(false);
      return;
    }

    const hasShownNotification = typeof window !== "undefined" && sessionStorage.getItem("db_notification_shown");

    try {
      setStatsLoading(true);
      const [statsData, machinesData] = await Promise.all([
        withTimeout(getDashboardStats()),
        withTimeout(getMachines()),
      ]);
      setStats(statsData);
      setAllMachines(machinesData);

      const isShownNow = typeof window !== "undefined" && sessionStorage.getItem("db_notification_shown");
      if (!hasShownNotification && !isShownNow) {
        if (user) {
          success(t("msgWelcomeBack") || "Welcome back", `${user.displayName || "User"}`);
        } else {
          success(t("msgDbConnected"), t("msgDbReady"));
        }
        sessionStorage.setItem("db_notification_shown", "true");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      const isShownNow = typeof window !== "undefined" && sessionStorage.getItem("db_notification_shown");
      if (!hasShownNotification && !isShownNow) {
        showError(t("msgDbConnectError"), t("msgDbErrorDetail"));
        sessionStorage.setItem("db_notification_shown", "true");
      }
    } finally {
      setStatsLoading(false);
    }
  }, [authLoading, user, t, success, showError]);

  const confirmDeletePart = useCallback(async () => {
    if (!partToDelete) return;
    try {
      await deletePart(partToDelete.id);
      success(t("msgDeleteSuccess") || "Deleted", "Part deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Failed to delete part", error);
      showError(t("msgDeleteError") || "Delete Failed", error.message || "Failed to delete part");
    } finally {
      setConfirmModalOpen(false);
      setPartToDelete(null);
    }
  }, [partToDelete, success, t, fetchData, showError]);

  const openMachineDetails = useCallback((part: Part) => {
    setViewMachineId(part.machineId);
    setViewMachineName(part.machineName);
    setTriggerPart(part);
    setMachineModalOpen(true);
  }, []);

  // ─── Data Fetching ─────────────────────────────────────────


  useEffect(() => {
    fetchData();
    setIsTableFullscreen(false);
  }, [user, authLoading]);

  // Load parts when filters change
  useEffect(() => {
    const loadFilteredParts = async () => {
      if (!user) return;
      setPartsLoading(true);

      try {
        if (filters.machineId) {
          const res = await withTimeout(getPartsByMachineName(filters.machineId), 30000).catch(() => []);
          setParts(res || []);
          setHasMore(false);
        } else if (filters.Location) {
          const res = await withTimeout(getPartsByLocation(filters.Location), 30000).catch(() => []);
          setParts(res || []);
          setHasMore(false);
        } else {
          const res = await withTimeout(getPartsPaginated(50), 30000).catch(() => null);
          if (res) {
            setParts(res.parts || []);
            setCursor(res.lastItem);
            setHasMore(!!res.lastItem);
          } else {
            setParts([]);
          }
        }
      } catch (error) {
        console.error("Error loading parts:", error);
        setParts([]);
      } finally {
        setPartsLoading(false);
      }
    };

    const timer = setTimeout(() => loadFilteredParts(), 300);
    return () => clearTimeout(timer);
  }, [filters.machineId, filters.Location, user]);

  const handleLoadMore = async () => {
    if (!hasMore || partsLoading || !cursor) return;
    setPartsLoading(true);
    try {
      const res = await getPartsPaginated(50, cursor.updatedAt, cursor.id);
      setParts((prev) => [...prev, ...res.parts]);
      setCursor(res.lastItem);
      setHasMore(!!res.lastItem);
    } catch (error) {
      console.error("Error loading more parts:", error);
    } finally {
      setPartsLoading(false);
    }
  };

  // Body scroll lock for fullscreen
  useEffect(() => {
    if (isTableFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isTableFullscreen]);

  // ─── Derived Filter Data ───────────────────────────────────
  const locationCounts = React.useMemo(() => {
    return stats.locationCounts || { ALL: stats.totalParts || 0, FZ: 0, RTE: 0, UT: 0 };
  }, [stats]);

  const availableMachines = React.useMemo(() => {
    let filtered = allMachines || [];
    if (filters.location) {
      if (filters.location === "UT") {
        filtered = filtered.filter((m) => m.location?.toUpperCase() === "UT" || m.location?.toUpperCase() === "UTILITY");
      } else {
        filtered = filtered.filter((m) => m.location?.toUpperCase() === filters.location);
      }
    }
    return filtered.map((m) => m.name || m.id).sort();
  }, [allMachines, filters.location]);

  const availableLocations = React.useMemo(() => {
    if (!parts) return [];
    return Array.from(new Set(
      parts
        .filter((p) => {
          if (!filters.location) return true;
          const machine = allMachines?.find((m) => m.name === p.machineName || m.id === p.machineId);
          const mLoc = machine?.location?.toUpperCase();
          if (filters.location === "UT") return mLoc === "UT" || mLoc === "UTILITY";
          return mLoc === filters.location;
        })
        .filter((p) => !filters.machineId || p.machineName === filters.machineId || p.machineId === filters.machineId)
        .map((p) => p.Location)
    )).filter(Boolean).sort();
  }, [parts, allMachines, filters.location, filters.machineId]);

  const availablePartNames = React.useMemo(() => {
    return Array.from(new Set(
      parts
        .filter((p) => {
          if (!filters.location) return true;
          const machine = allMachines.find((m) => m.name === p.machineName || m.id === p.machineId);
          const mLoc = machine?.location?.toUpperCase();
          if (filters.location === "UT") return mLoc === "UT" || mLoc === "UTILITY";
          return mLoc === filters.location;
        })
        .filter((p) => !filters.machineId || p.machineName === filters.machineId || p.machineId === filters.machineId)
        .filter((p) => !filters.Location || p.Location === filters.Location)
        .map((p) => p.partName)
    )).filter(Boolean).sort();
  }, [parts, allMachines, filters.location, filters.machineId, filters.Location]);

  const filteredParts = parts.filter((part) => {
    if (filters.machineId && part.machineId !== filters.machineId && part.machineName !== filters.machineId) return false;
    if (filters.Location && part.Location !== filters.Location) return false;
    if (filters.partName && part.partName !== filters.partName) return false;
    if (filters.location) {
      const machine = allMachines?.find((m) => m.id === part.machineId || m.name === part.machineName);
      const mLoc = machine?.location?.toUpperCase();
      if (filters.location === "UT") {
        if (mLoc !== "UT" && mLoc !== "UTILITY") return false;
      } else {
        if (mLoc !== filters.location) return false;
      }
    }
    return true;
  });

  const handleFilterChange = (key: keyof PartFilters, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      if (key === "location") { newFilters.machineId = ""; newFilters.Location = ""; newFilters.partName = ""; }
      else if (key === "machineId") { newFilters.Location = ""; newFilters.partName = ""; }
      else if (key === "Location") { newFilters.partName = ""; }
      return newFilters;
    });
  };

  const clearFilters = () => setFilters({ machineId: "", Location: "", partName: "", location: "" });

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <MobileNav />

      <main className="main-container px-4 py-6 sm:px-6">
        <PageLoadingOverlay
          isLoading={statsLoading && partsLoading}
          message={t("msgLoading") || "กำลังโหลดข้อมูล..."}
        />

        <WelcomeGuide />
        <PriorityPMAlert />

        {/* Dashboard Stats */}
        <DashboardStatsSection stats={stats} statsLoading={statsLoading} />

        {/* Quick Actions */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => { if (checkAuth()) setAddPartModalOpen(true); }}
              className="flex-1 min-w-[120px] btn btn-active bg-accent-green text-bg-primary hover:bg-accent-green/90 hover:scale-105 active:scale-95 border-none h-8 text-[11px] font-bold transition-all shadow-sm hover:shadow-accent-green/20"
            >
              <PlusIcon size={14} className="mr-1" />
              {t("actionAddPart")}
            </button>
            <button
              onClick={() => setHelpModalOpen(true)}
              className="flex-1 min-w-[120px] btn btn-active bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95 border border-primary/30 h-8 text-[11px] font-bold transition-all shadow-sm"
            >
              <AlertTriangleIcon size={14} className="mr-1 rotate-180" />
              {language === "th" ? "คู่มือ / Help" : "Help Guide"}
            </button>
          </div>
        </section>

        {/* Filters */}
        <PartsFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          locationCounts={locationCounts}
          availableMachines={availableMachines}
          availableLocations={availableLocations}
          availablePartNames={availablePartNames}
          filteredCount={filteredParts.length}
          totalCount={parts.length}
          partsLoading={partsLoading}
        />

        {/* Machine Parts Section */}
        <section
          ref={tableSectionRef}
          className={`animate-fade-in-up transition-all duration-300 ${isTableFullscreen ? "fixed inset-0 z-50 bg-bg-primary p-0 flex flex-col" : "mb-6"}`}
          style={{ animationDelay: "300ms" }}
        >
          <div className={`${isTableFullscreen ? "rounded-none border-0 flex-1 flex flex-col mb-0 overflow-hidden" : "mb-2"}`}>
            {/* Section Header */}
            <div className={`flex items-center justify-between flex-none ${isTableFullscreen ? "px-4 py-3 border-b border-border-light bg-bg-secondary" : "px-2 py-1"}`}>
              <div className="flex items-center gap-2">
                <SettingsIcon size={isTableFullscreen ? 18 : 14} className="text-text-muted" />
                <h2 className={`${isTableFullscreen ? "font-semibold text-text-primary" : "text-sm font-medium text-text-secondary"}`}>{t("tableTitleParts")}</h2>
              </div>
              <button
                onClick={() => setIsTableFullscreen(!isTableFullscreen)}
                className={`transition-all duration-300 p-1 rounded-lg ${!isTableFullscreen ? "bg-primary/10 text-primary/70 hover:text-primary hover:bg-primary/20" : "text-text-muted hover:text-primary hover:bg-bg-tertiary"}`}
                title={isTableFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isTableFullscreen ? <MinimizeIcon size={20} /> : <MaximizeIcon size={14} />}
              </button>
            </div>

            {/* Desktop Table */}
            <DesktopPartTable
              parts={filteredParts}
              partsLoading={partsLoading}
              isFullscreen={isTableFullscreen}
              hasMore={hasMore}
              showLoadMore={!filters.machineId && !filters.Location}
              onLoadMore={handleLoadMore}
              onEditPart={handleEditPart}
              onMaintenancePart={handleMaintenancePart}
              onDeletePart={handleDeleteClick}
              onOpenMachine={openMachineDetails}
            />

            {/* Fullscreen Mobile View */}
            {isTableFullscreen && (
              <div className="md:hidden flex-1 overflow-auto bg-bg-primary p-4 space-y-4 min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
                <MobilePartCards
                  parts={filteredParts}
                  partsLoading={partsLoading}
                  onEditPart={handleEditPart}
                  onMaintenancePart={handleMaintenancePart}
                  onDeletePart={handleDeleteClick}
                />
              </div>
            )}
          </div>

          {/* Normal Mobile List View */}
          {!isTableFullscreen && (
            <div className="md:hidden space-y-4">
              <MobilePartCards
                parts={filteredParts}
                partsLoading={partsLoading}
                onEditPart={handleEditPart}
                onMaintenancePart={handleMaintenancePart}
                onDeletePart={handleDeleteClick}
              />
            </div>
          )}
        </section>
      </main>

      <MobileNav />

      {/* Modals */}
      <AddPartModal
        isOpen={addPartModalOpen}
        onClose={() => { setAddPartModalOpen(false); setSelectedPart(null); }}
        onSuccess={fetchData}
        partToEdit={selectedPart}
      />
      <MaintenanceRecordModal
        isOpen={maintenanceModalOpen}
        onClose={() => { setMaintenanceModalOpen(false); setTriggerPart(null); }}
        onSuccess={fetchData}
        initialPart={triggerPart || undefined}
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
        onEditPart={(part) => { setMachineModalOpen(false); handleEditPart(part); }}
        onRepairPart={(part) => { setMachineModalOpen(false); handleMaintenancePart(part); }}
        onDeletePart={(part) => { setMachineModalOpen(false); handleDeleteClick(part); }}
      />
      <PartReplacementPlanModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onViewHistory={() => {
            window.location.href = "/maintenance";
        }}
      />
      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageSrc={lightboxImage || ""}
      />
      <HelpModal 
        isOpen={helpModalOpen} 
        onClose={() => setHelpModalOpen(false)} 
      />
    </div>
  );
}
