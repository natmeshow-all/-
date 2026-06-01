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
import { getDashboardStats, getParts, deletePart, getMachines, getPartsPaginated, getPartsByMachineName, getPartsByLocation } from "./lib/firebaseService";
import MachineDetailsModal from "./components/machines/MachineDetailsModal"; // Import MachineDetailsModal
import GlobalMaintenanceHistoryModal from "./components/pm/GlobalMaintenanceHistoryModal";
import Lightbox from "./components/ui/Lightbox"; // Import Lightbox
import PriorityPMAlert from "./components/ui/PriorityPMAlert"; // Import PriorityPMAlert
import PageLoadingOverlay from "./components/ui/PageLoadingOverlay"; // Import PageLoadingOverlay
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
  const { user, checkAuth, loading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  const [addPartModalOpen, setAddPartModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

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

  // Split loading states to prevent blocking UI
  const [statsLoading, setStatsLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(true);

  const [cursor, setCursor] = useState<{ updatedAt: string, id: string } | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Handlers for action buttons
  const handleEditPart = (part: Part) => {
    if (!checkAuth()) return;
    setSelectedPart(part);
    setAddPartModalOpen(true);
  };

  const handleMaintenancePart = (part: Part) => {
    if (!checkAuth()) return;
    setTriggerPart(part);
    setMaintenanceModalOpen(true);
  };

  const handleDeleteClick = (part: Part) => {
    if (!checkAuth()) return;
    setPartToDelete(part);
    setConfirmModalOpen(true);
  };

  const confirmDeletePart = async () => {
    if (!partToDelete) return;
    try {
      await deletePart(partToDelete.id);
      success(t("msgDeleteSuccess") || "Deleted", "Part deleted successfully");
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error("Failed to delete part", error);
      showError(t("msgDeleteError") || "Delete Failed", error.message || "Failed to delete part");
    } finally {
      setConfirmModalOpen(false); // Close modal
      setPartToDelete(null);
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
    totalLocations: 0,
    maintenanceRecords: 0,
    totalPM: 0,
    totalOverhaul: 0,
    pendingMaintenance: 0,
    upcomingSchedule: 0,
    totalSpareParts: 0,
    lastUpdated: 0,
    locationCounts: {
      ALL: 0,
      FZ: 0,
      RTE: 0,
      UT: 0
    }
  });
  const [parts, setParts] = useState<Part[]>([]);
  const [filters, setFilters] = useState<PartFilters>({
    machineId: "",
    Location: "",
    partName: "",
    location: "",
  });
  const [allMachines, setAllMachines] = useState<any[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const getPartTheme = (category: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("mech")) return { glow: "bg-blue-500/10", borderLine: "from-transparent via-blue-500 to-transparent", textGradient: "group-hover:from-blue-400 group-hover:to-indigo-400" };
    if (cat.includes("elect") || cat.includes("wire")) return { glow: "bg-accent-yellow/10", borderLine: "from-transparent via-accent-yellow to-transparent", textGradient: "group-hover:from-accent-yellow group-hover:to-amber-500" };
    if (cat.includes("hyd")) return { glow: "bg-accent-red/10", borderLine: "from-transparent via-accent-red to-transparent", textGradient: "group-hover:from-accent-red group-hover:to-pink-500" };
    if (cat.includes("pneu")) return { glow: "bg-accent-cyan/10", borderLine: "from-transparent via-accent-cyan to-transparent", textGradient: "group-hover:from-accent-cyan group-hover:to-teal-400" };
    if (cat.includes("con") || cat.includes("oil") || cat.includes("grease") || cat.includes("spare")) return { glow: "bg-green-500/10", borderLine: "from-transparent via-green-500 to-transparent", textGradient: "group-hover:from-green-400 group-hover:to-emerald-400" };
    return { glow: "bg-primary/10", borderLine: "from-transparent via-primary-light to-transparent", textGradient: "group-hover:from-primary-light group-hover:to-indigo-400" };
  };

  const fetchData = async () => {
    // Wait for auth check to complete
    if (authLoading) return;

    // If not logged in, clear data and return
    if (!user) {
      setStats({
        totalParts: 0,
        totalMachines: 0,
        totalLocations: 0,
        maintenanceRecords: 0,
        totalPM: 0,
        totalOverhaul: 0,
        pendingMaintenance: 0,
        upcomingSchedule: 0,
        totalSpareParts: 0,
        lastUpdated: 0,
        locationCounts: {
          ALL: 0,
          FZ: 0,
          RTE: 0,
          UT: 0
        }
      });
      setParts([]);
      setAllMachines([]);
      setStatsLoading(false);
      setPartsLoading(false);
      return;
    }

    // Check session storage to see if we've already shown the startup notification
    const hasShownNotification = typeof window !== 'undefined' && sessionStorage.getItem('db_notification_shown');

    // Helper to add timeout to any promise
    async function withTimeout<T>(promise: Promise<T>, ms: number = 45000): Promise<T> {
      const timeout = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out")), ms)
      );
      return Promise.race([promise, timeout]);
    }

    try {
      setStatsLoading(true);
      // Use safe timeout for stats to prevent hanging
      const [statsData, machinesData] = await Promise.all([
        withTimeout(getDashboardStats()),
        withTimeout(getMachines())
      ]);
      setStats(statsData);
      setAllMachines(machinesData);

      // Trigger success toast only once per session
      // Double check sessionStorage here to prevent race conditions in React StrictMode
      const isShownNow = typeof window !== 'undefined' && sessionStorage.getItem('db_notification_shown');
      if (!hasShownNotification && !isShownNow) {
        if (user) {
          success(t("msgWelcomeBack") || "Welcome back", `${user.displayName || 'User'}`);
        } else {
          success(t("msgDbConnected"), t("msgDbReady"));
        }
        sessionStorage.setItem('db_notification_shown', 'true');
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Trigger error toast only once per session if initial load failed
      const isShownNow = typeof window !== 'undefined' && sessionStorage.getItem('db_notification_shown');
      if (!hasShownNotification && !isShownNow) {
        showError(t("msgDbConnectError"), t("msgDbErrorDetail")); // Use showError instead of useToast().error
        sessionStorage.setItem('db_notification_shown', 'true');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Ensure fullscreen is off on mount (fix for user reported bug)
    setIsTableFullscreen(false);
  }, [user, authLoading]);

  // Load parts when filters change (Server-side filtering for scalability)
  useEffect(() => {
    const loadFilteredParts = async () => {
      if (!user) return;
      setPartsLoading(true);

      // Helper to add timeout to any promise
      async function withTimeout<T>(promise: Promise<T>, ms: number = 30000): Promise<T> {
        const timeout = new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), ms)
        );
        return Promise.race([promise, timeout]);
      }

      try {
        if (filters.machineId) {
          // filters.machineId holds the Name
          // Use fallback empty array if timeout/error
          const res = await withTimeout(getPartsByMachineName(filters.machineId)).catch(e => {
            console.error("Timeout fetching machine parts:", e);
            return [];
          });
          setParts(res || []); // Ensure array
          setHasMore(false);
        } else if (filters.Location) {
          const res = await withTimeout(getPartsByLocation(filters.Location)).catch(e => {
            console.error("Timeout fetching location parts:", e);
            return [];
          });
          setParts(res || []); // Ensure array
          setHasMore(false);
        } else {
          // Default: Pagination (Recent Items)
          const res = await withTimeout(getPartsPaginated(50)).catch(e => {
            console.error("Timeout fetching paginated parts:", e);
            return null;
          });

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
        setParts([]); // Fallback to empty
      } finally {
        setPartsLoading(false);
      }
    };

    // Debounce to prevent rapid firing
    const timer = setTimeout(() => {
      loadFilteredParts();
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.machineId, filters.Location, user]);

  const handleLoadMore = async () => {
    if (!hasMore || partsLoading || !cursor) return;
    setPartsLoading(true);
    try {
      const res = await getPartsPaginated(50, cursor.updatedAt, cursor.id);
      setParts(prev => [...prev, ...res.parts]);
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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTableFullscreen]);

  // Auto-fullscreen logic removed as per user request to prevent unwanted popup on refresh

  // Derive unique values for filters from real data with cascading logic

  // 0. Location Counts (for the filter buttons)
  // Use server-side stats if available, otherwise fallback to safe default
  const locationCounts = React.useMemo(() => {
    return stats.locationCounts || {
      ALL: stats.totalParts || 0,
      FZ: 0,
      RTE: 0,
      UT: 0,
    };
  }, [stats]);

  // 1. Available Machines: Filtered by location
  const availableMachines = React.useMemo(() => {
    let filteredMachines = allMachines || [];
    if (filters.location) {
      if (filters.location === 'UT') {
        filteredMachines = filteredMachines.filter(m => m.location?.toUpperCase() === 'UT' || m.location?.toUpperCase() === 'UTILITY');
      } else {
        filteredMachines = filteredMachines.filter(m => m.location?.toUpperCase() === filters.location);
      }
    }
    return filteredMachines.map(m => m.name || m.id).sort();
  }, [allMachines, filters.location]);

  // 2. Available Locations: Filtered by area AND selected machine
  const availableLocations = React.useMemo(() => {
    if (!parts) return [];
    return Array.from(new Set(
      parts
        .filter(p => {
          if (!filters.location) return true;
          const machine = allMachines?.find(m => m.name === p.machineName || m.id === p.machineId);
          const mLoc = machine?.location?.toUpperCase();
          if (filters.location === 'UT') return mLoc === 'UT' || mLoc === 'UTILITY';
          return mLoc === filters.location;
        })
        .filter(p => !filters.machineId || p.machineName === filters.machineId || p.machineId === filters.machineId)
        .map(p => p.Location)
    )).filter(Boolean).sort();
  }, [parts, allMachines, filters.location, filters.machineId]);

  // 3. Available Part Names: Filtered by area, machine AND location
  const availablePartNames = React.useMemo(() => {
    return Array.from(new Set(
      parts
        .filter(p => {
          if (!filters.location) return true;
          const machine = allMachines.find(m => m.name === p.machineName || m.id === p.machineId);
          const mLoc = machine?.location?.toUpperCase();
          if (filters.location === 'UT') return mLoc === 'UT' || mLoc === 'UTILITY';
          return mLoc === filters.location;
        })
        .filter(p => !filters.machineId || p.machineName === filters.machineId || p.machineId === filters.machineId)
        .filter(p => !filters.Location || p.Location === filters.Location)
        .map(p => p.partName)
    )).filter(Boolean).sort();
  }, [parts, allMachines, filters.location, filters.machineId, filters.Location]);

  // Filter parts based on current filters
  const filteredParts = parts.filter((part) => {
    // Machine filter: match by ID OR name for maximum compatibility
    if (filters.machineId && part.machineId !== filters.machineId && part.machineName !== filters.machineId) return false;
    if (filters.Location && part.Location !== filters.Location) return false;
    if (filters.partName && part.partName !== filters.partName) return false;

    // Location filter: Check machine's location
    if (filters.location) {
      const machine = allMachines?.find(m => m.id === part.machineId || m.name === part.machineName);
      const mLoc = machine?.location?.toUpperCase();
      if (filters.location === 'UT') {
        if (mLoc !== 'UT' && mLoc !== 'UTILITY') return false;
      } else {
        if (mLoc !== filters.location) return false;
      }
    }

    return true;
  });

  const handleFilterChange = (key: keyof PartFilters, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      // Cascading Reset:
      if (key === "location") {
        newFilters.machineId = "";
        newFilters.Location = "";
        newFilters.partName = "";
      } else if (key === "machineId") {
        newFilters.Location = "";
        newFilters.partName = "";
      } else if (key === "Location") {
        newFilters.partName = "";
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({ machineId: "", Location: "", partName: "", location: "" });
  };

  // Count unique values for filter badges
  const uniqueMachinesCount = availableMachines.length;
  const uniqueLocationsCount = availableLocations.length;
  const uniquePartNamesCount = availablePartNames.length;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <MobileNav />

      <main className="main-container px-4 py-6 sm:px-6">
        {/* Full-screen Data Loading Overlay */}
        <PageLoadingOverlay
          isLoading={statsLoading && partsLoading}
          message={t("msgLoading") || "กำลังโหลดข้อมูล..."}
        />

        {/* Priority Alert Section */}
        <PriorityPMAlert />

        {/* Modern Dashboard Stats Section */}
        <section className="mb-6 mt-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
            
            {/* Inventory Overview (Present) */}
            <div className="glass-card overflow-hidden relative group p-0 border-white/10 hover:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 group-hover:bg-primary/30"></div>
              
              <div className="p-4 border-b border-white/5 bg-gradient-to-r from-bg-tertiary/40 to-transparent flex items-center justify-between relative z-10">
                <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                  <span className="p-1.5 rounded-lg bg-primary/20 text-primary-light backdrop-blur-sm border border-primary/20 shadow-inner shadow-primary/20">
                    <BoxIcon size={14} />
                  </span>
                  {language === "th" ? "ภาพรวมสินทรัพย์" : "Inventory Overview"}
                </h3>
                <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-white/5 text-text-muted rounded-full border border-white/10 shadow-sm">Present</span>
              </div>
              
              <div className="p-5 grid grid-cols-3 gap-2 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium" title={t("statTotalParts")}>{t("statTotalParts")}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-text-primary leading-none group-hover:text-primary-light transition-colors drop-shadow-sm">{statsLoading ? "..." : stats.totalParts}</span>
                  </div>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-3">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium" title={t("statMachines")}>{t("statMachines")}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-text-primary leading-none group-hover:text-accent-yellow transition-colors drop-shadow-sm">{statsLoading ? "..." : stats.totalMachines}</span>
                  </div>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-3">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium" title={t("statLocations")}>{t("statLocations")}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-text-primary leading-none group-hover:text-accent-cyan transition-colors drop-shadow-sm">{statsLoading ? "..." : stats.totalLocations}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Maintenance (Past) */}
            <div className="glass-card overflow-hidden relative group p-0 border-white/10 hover:border-accent-green/50 transition-all duration-300 shadow-lg shadow-black/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-green/20 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 group-hover:bg-accent-green/30"></div>
              
              <div className="p-4 border-b border-white/5 bg-gradient-to-r from-bg-tertiary/40 to-transparent flex items-center justify-between relative z-10">
                <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                  <span className="p-1.5 rounded-lg bg-accent-green/20 text-accent-green backdrop-blur-sm border border-accent-green/20 shadow-inner shadow-accent-green/20">
                    <HistoryIcon size={14} />
                  </span>
                  {language === "th" ? "ประวัติการซ่อมบำรุง" : "Maintenance History"}
                </h3>
                <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-white/5 text-text-muted rounded-full border border-white/10 shadow-sm">Past</span>
              </div>
              
              <div className="p-5 grid grid-cols-2 gap-2 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{t("statPMCount") || (language === "th" ? "PM ทั้งหมด" : "Total PM")}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-text-primary leading-none group-hover:text-accent-green transition-colors drop-shadow-sm">{statsLoading ? "..." : stats.totalPM}</span>
                  </div>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-3">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{t("statOverhaulCount") || (language === "th" ? "Overhaul ทั้งหมด" : "Total Overhaul")}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-text-primary leading-none group-hover:text-accent-red transition-colors drop-shadow-sm">{statsLoading ? "..." : stats.totalOverhaul}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming & Pending (Future) */}
            <div className={`glass-card overflow-hidden relative group p-0 border-white/10 transition-all duration-300 shadow-lg shadow-black/20 ${!statsLoading && stats.pendingMaintenance > 0 ? "border-accent-yellow/40 hover:border-accent-yellow/70 shadow-[0_0_20px_rgba(217,119,6,0.15)]" : "hover:border-accent-yellow/50"}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 ${!statsLoading && stats.pendingMaintenance > 0 ? "bg-accent-yellow/30 animate-pulse" : "bg-accent-yellow/20 group-hover:bg-accent-yellow/30"}`}></div>
              
              <div className="p-4 border-b border-white/5 bg-gradient-to-r from-bg-tertiary/40 to-transparent flex items-center justify-between relative z-10">
                <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                  <span className={`p-1.5 rounded-lg backdrop-blur-sm border shadow-inner ${!statsLoading && stats.pendingMaintenance > 0 ? "bg-accent-red/20 text-accent-red border-accent-red/30 shadow-accent-red/20 animate-pulse" : "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/20 shadow-accent-yellow/20"}`}>
                    <AlertTriangleIcon size={14} />
                  </span>
                  {language === "th" ? "แผนงานอนาคต" : "Pending & Upcoming"}
                </h3>
                <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-sm ${!statsLoading && stats.pendingMaintenance > 0 ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30" : "bg-white/5 text-text-muted border-white/10"}`}>Future</span>
              </div>
              
              <div className="p-5 grid grid-cols-2 gap-2 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "งานรอดำเนินการ" : "Pending Tasks"}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold leading-none transition-colors drop-shadow-sm ${!statsLoading && stats.pendingMaintenance > 0 ? "text-accent-red" : "text-text-primary group-hover:text-accent-yellow"}`}>
                      {statsLoading ? "..." : stats.pendingMaintenance}
                    </span>
                    {!statsLoading && stats.pendingMaintenance > 0 && (
                      <span className="text-[9px] bg-accent-red/20 text-accent-red px-1.5 py-0.5 rounded font-bold animate-pulse border border-accent-red/20 shadow-sm">{language === "th" ? "ด่วน" : "Urgent"}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-3">
                  <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "กำหนดการเร็วๆนี้" : "Upcoming Schedule"}</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-text-primary leading-none group-hover:text-accent-blue transition-colors drop-shadow-sm">{statsLoading ? "..." : stats.upcomingSchedule}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

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
              onClick={() => { if (checkAuth()) setMaintenanceModalOpen(true); }}
              className="flex-1 min-w-[120px] btn btn-active bg-accent-yellow text-bg-primary hover:bg-accent-yellow/90 hover:scale-105 active:scale-95 border-none h-8 text-[11px] font-bold transition-all shadow-sm hover:shadow-accent-yellow/20"
            >
              <HistoryIcon size={14} className="mr-1" />
              {t("actionRecordMaintenance")}
            </button>
            <button
              onClick={() => { if (checkAuth()) setHistoryModalOpen(true); }}
              className="flex-1 min-w-[120px] btn btn-active bg-accent-purple text-white hover:bg-accent-purple/90 hover:scale-105 active:scale-95 border-none h-8 text-[11px] font-bold transition-all shadow-sm hover:shadow-accent-purple/20"
            >
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
                {/* Location Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {[
                    { id: '', label: t("labelAll"), color: 'accent-purple' },
                    { id: 'FZ', label: 'FZ', color: 'accent-cyan' },
                    { id: 'RTE', label: 'RTE', color: 'green-500' },
                    { id: 'UT', label: 'UT', color: 'accent-yellow' }
                  ].map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleFilterChange("location", loc.id)}
                      className={`
                        relative px-3 py-1.5 rounded-lg transition-all duration-300
                        border backdrop-blur-md flex items-center gap-1.5
                        ${filters.location === loc.id
                          ? `bg-${loc.color}/20 border-${loc.color}/40 text-white scale-105`
                          : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'}
                      `}
                    >
                      <span className="text-[10px] font-bold tracking-tight">{loc.label}</span>
                      <span className={`
                        px-1 py-0.5 rounded text-[8px] font-black
                        ${filters.location === loc.id
                          ? `bg-${loc.color} text-bg-primary`
                          : 'bg-white/10 text-text-muted'}
                      `}>
                        {loc.id === '' ? locationCounts.ALL : (locationCounts as any)[loc.id]}
                      </span>
                    </button>
                  ))}
                </div>

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

                  {/* Location Filter */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                      <MapPinIcon size={10} />
                      {t("filterLocation")}
                      <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{uniqueLocationsCount}</span>
                    </label>
                    <select
                      value={filters.Location}
                      onChange={(e) => handleFilterChange("Location", e.target.value)}
                      className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                    >
                      <option value="">{t("filterAll")}</option>
                      {availableLocations.map((z) => (
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
                    <span className="text-text-primary font-semibold">{partsLoading ? "..." : parts.length}</span>
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
          <div className={`${isTableFullscreen ? "rounded-none border-0 flex-1 flex flex-col mb-0 overflow-hidden" : "mb-2"}`}>
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

            {/* Desktop Table View inside the same card */}
            <div className={`hidden md:block w-full ${isTableFullscreen ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
              <div className={`table-container ${isTableFullscreen ? "flex-1 overflow-auto bg-bg-secondary custom-scrollbar" : ""}`} style={isTableFullscreen ? { WebkitOverflowScrolling: 'touch' } : {}}>
                <table className="table w-full">
                  <thead>
                    <tr className="bg-bg-tertiary">
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{language === "th" ? "หมวดหมู่" : "Category"}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableMachine")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tablePartName")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableModelSpec")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableBrand")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableLocationArea")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableQuantity")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableLocation")}</th>
                      <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableNotes")}</th>
                      <th className={`px-4 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider ${isTableFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : ""}`}>{t("tableManagement")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {!partsLoading && filteredParts.map((part, index) => (
                      <tr
                        key={part.id}
                        className="animate-fade-in hover:bg-bg-tertiary/30 transition-colors"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="py-3 px-4">
                          {(() => {
                            const theme = getPartTheme(part.category || "");
                            return (
                              <span className={`
                                inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase
                                border backdrop-blur-md transition-all duration-300
                                ${theme.glow} ${theme.borderLine.includes("via-blue") ? "border-blue-500/30 text-blue-400" :
                                  theme.borderLine.includes("via-accent-yellow") ? "border-accent-yellow/30 text-accent-yellow" :
                                  theme.borderLine.includes("via-accent-red") ? "border-accent-red/30 text-accent-red" :
                                  theme.borderLine.includes("via-accent-cyan") ? "border-accent-cyan/30 text-accent-cyan" :
                                  theme.borderLine.includes("via-green") ? "border-green-500/30 text-green-400" : "border-white/10 text-primary-light"}
                              `}>
                                {part.category || "PART"}
                              </span>
                            );
                          })()}
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
                          {tData(part.Location || "-")}
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMore && !filters.machineId && !filters.Location && (
                  <div className="flex justify-center p-4 border-t border-border-light">
                    <button
                      onClick={handleLoadMore}
                      disabled={partsLoading}
                      className="btn btn-sm btn-ghost text-primary hover:bg-primary/10"
                    >
                      {partsLoading ? "..." : t("actionLoadMore") || "Load More"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Fullscreen Mobile View Content - Inside specialized container when fullscreen */}
            {isTableFullscreen && (
              <div className="md:hidden flex-1 overflow-auto bg-bg-primary p-4 space-y-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {partsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredParts.length > 0 ? (
                  filteredParts.map((part, index) => (
                    <div
                      key={part.id}
                      className="relative w-full rounded-2xl bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-primary p-5 border border-white/10 shadow-lg group active:scale-[0.99] transition-all duration-300 animate-fade-in flex flex-col justify-between overflow-hidden gap-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Tech grid watermarks */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_16px] pointer-events-none"></div>
                      
                      {/* Upper row: Category & Badges */}
                      <div className="flex items-start justify-between relative z-10 pointer-events-auto">
                        {(() => {
                          const theme = getPartTheme(part.category || "");
                          return (
                            <span className={`px-2.5 py-1 rounded bg-black/60 border border-white/10 text-[9px] font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r ${theme.textGradient}`}>
                              {part.category || "PART"}
                            </span>
                          );
                        })()}
                        
                        <div className="flex items-center gap-2">
                          {/* Quantity badge */}
                          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                            <span className="text-[10px] font-bold text-white">x{part.quantity}</span>
                          </div>
                          {/* Location area */}
                          {part.location && (
                            <span className="px-1.5 py-0.5 rounded bg-accent-cyan/20 border border-accent-cyan/30 text-[9px] font-bold text-accent-cyan">
                              {part.location}
                            </span>
                          )}
                          {/* Delete action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(part);
                            }}
                            className="w-6 h-6 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20 flex items-center justify-center hover:bg-accent-red hover:text-white transition-all shadow active:scale-90"
                            title={t("actionDelete")}
                          >
                            <BoxIcon size={12} className="rotate-45" />
                          </button>
                        </div>
                      </div>

                      {/* Middle Row: Main Spec Info */}
                      <div className="flex flex-col gap-1 relative z-10 pointer-events-auto">
                        <h3 className="text-xl font-bold text-white tracking-tight">{tData(part.partName)}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-primary-light">
                          <SettingsIcon size={12} />
                          <span className="font-semibold">{part.machineName}</span>
                        </div>
                      </div>

                      {/* Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 relative z-10 pointer-events-auto text-[10px]">
                        <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableBrand")}</span>
                          <span className="text-white font-medium truncate">{part.brand || "-"}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableModelSpec")}</span>
                          <span className="text-white font-medium truncate" title={part.modelSpec}>{part.modelSpec || "-"}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableLocationArea")}</span>
                          <span className="text-white font-medium truncate">{tData(part.Location || "-")}</span>
                        </div>
                      </div>

                      {/* Stock level analysis bar */}
                      <div className="relative z-10 pointer-events-auto">
                        {(() => {
                          const percentage = Math.min(100, Math.max(0, (part.quantity / (part.minStockThreshold || 5)) * 100));
                          const isLowStock = part.quantity <= part.minStockThreshold;
                          const barColor = isLowStock ? "bg-accent-red" : "bg-accent-green";
                          const glowColor = isLowStock ? "shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "";
                          return (
                            <div className="w-full bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="text-text-muted uppercase tracking-wider font-bold">STOCK LEVEL</span>
                                <span className={isLowStock ? "text-accent-red font-black flex items-center gap-1 animate-pulse" : "text-accent-green font-black"}>
                                  {isLowStock ? "⚠️ LOW" : "✅ OK"}
                                </span>
                              </div>
                              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                                <div className={`h-full ${barColor} ${glowColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Notes block if exists */}
                      {part.notes && (
                        <div className="relative z-10 pointer-events-auto bg-white/5 border border-white/10 rounded-lg p-2 flex gap-1.5 items-start text-[10px]">
                          <AlertTriangleIcon size={10} className="text-accent-yellow shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableNotes")}</span>
                            <span className="text-white/80 italic line-clamp-1">"{tData(part.notes)}"</span>
                          </div>
                        </div>
                      )}

                      {/* Lower Row: Actions */}
                      <div className="flex gap-2 relative z-10 pointer-events-auto pt-1.5 border-t border-white/5">
                        <button
                          onClick={() => handleEditPart(part)}
                          className="flex-1 btn bg-white/5 border border-white/10 hover:bg-primary transition-all text-[11px] h-8 text-white rounded-lg px-2"
                        >
                          <EditIcon size={12} className="mr-1" />
                          {t("actionEdit")}
                        </button>
                        <button
                          onClick={() => handleMaintenancePart(part)}
                          className="flex-1 btn bg-white/5 border border-white/10 hover:bg-accent-yellow hover:text-black transition-all text-[11px] h-8 text-white rounded-lg px-2"
                        >
                          <SettingsIcon size={12} className="mr-1" />
                          {t("actionMaintenance")}
                        </button>
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
              {partsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredParts.length > 0 ? (
                filteredParts.map((part, index) => (
                  <div
                    key={part.id}
                    className="relative w-full rounded-2xl bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-primary p-5 border border-white/10 shadow-lg group active:scale-[0.99] transition-all duration-300 animate-fade-in flex flex-col justify-between overflow-hidden gap-4"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Tech grid watermarks */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_16px] pointer-events-none"></div>
                    
                    {/* Upper row: Category & Badges */}
                    <div className="flex items-start justify-between relative z-10 pointer-events-auto">
                      {(() => {
                        const theme = getPartTheme(part.category || "");
                        return (
                          <span className={`px-2.5 py-1 rounded bg-black/60 border border-white/10 text-[9px] font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r ${theme.textGradient}`}>
                            {part.category || "PART"}
                          </span>
                        );
                      })()}
                      
                      <div className="flex items-center gap-2">
                        {/* Quantity badge */}
                        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded px-1.5 py-0.5">
                          <span className="text-[10px] font-bold text-white">x{part.quantity}</span>
                        </div>
                        {/* Location area */}
                        {part.location && (
                          <span className="px-1.5 py-0.5 rounded bg-accent-cyan/20 border border-accent-cyan/30 text-[9px] font-bold text-accent-cyan">
                            {part.location}
                          </span>
                        )}
                        {/* Delete action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(part);
                          }}
                          className="w-6 h-6 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20 flex items-center justify-center hover:bg-accent-red hover:text-white transition-all shadow active:scale-90"
                          title={t("actionDelete")}
                        >
                          <BoxIcon size={12} className="rotate-45" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Main Spec Info */}
                    <div className="flex flex-col gap-1 relative z-10 pointer-events-auto">
                      <h3 className="text-xl font-bold text-white tracking-tight">{tData(part.partName)}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-primary-light">
                        <SettingsIcon size={12} />
                        <span className="font-semibold">{part.machineName}</span>
                      </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 relative z-10 pointer-events-auto text-[10px]">
                      <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableBrand")}</span>
                        <span className="text-white font-medium truncate">{part.brand || "-"}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableModelSpec")}</span>
                        <span className="text-white font-medium truncate" title={part.modelSpec}>{part.modelSpec || "-"}</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableLocationArea")}</span>
                        <span className="text-white font-medium truncate">{tData(part.Location || "-")}</span>
                      </div>
                    </div>

                    {/* Stock level analysis bar */}
                    <div className="relative z-10 pointer-events-auto">
                      {(() => {
                        const percentage = Math.min(100, Math.max(0, (part.quantity / (part.minStockThreshold || 5)) * 100));
                        const isLowStock = part.quantity <= part.minStockThreshold;
                        const barColor = isLowStock ? "bg-accent-red" : "bg-accent-green";
                        const glowColor = isLowStock ? "shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "";
                        return (
                          <div className="w-full bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="text-text-muted uppercase tracking-wider font-bold">STOCK LEVEL</span>
                              <span className={isLowStock ? "text-accent-red font-black flex items-center gap-1 animate-pulse" : "text-accent-green font-black"}>
                                {isLowStock ? "⚠️ LOW" : "✅ OK"}
                              </span>
                            </div>
                            <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                              <div className={`h-full ${barColor} ${glowColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Notes block if exists */}
                    {part.notes && (
                      <div className="relative z-10 pointer-events-auto bg-white/5 border border-white/10 rounded-lg p-2 flex gap-1.5 items-start text-[10px]">
                        <AlertTriangleIcon size={10} className="text-accent-yellow shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableNotes")}</span>
                          <span className="text-white/80 italic line-clamp-1">"{tData(part.notes)}"</span>
                        </div>
                      </div>
                    )}

                    {/* Lower Row: Actions */}
                    <div className="flex gap-2 relative z-10 pointer-events-auto pt-1.5 border-t border-white/5">
                      <button
                        onClick={() => handleEditPart(part)}
                        className="flex-1 btn bg-white/5 border border-white/10 hover:bg-primary transition-all text-[11px] h-8 text-white rounded-lg px-2"
                      >
                        <EditIcon size={12} className="mr-1" />
                        {t("actionEdit")}
                      </button>
                      <button
                        onClick={() => handleMaintenancePart(part)}
                        className="flex-1 btn bg-white/5 border border-white/10 hover:bg-accent-yellow hover:text-black transition-all text-[11px] h-8 text-white rounded-lg px-2"
                      >
                        <SettingsIcon size={12} className="mr-1" />
                        {t("actionMaintenance")}
                      </button>
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
        onClose={() => {
          setMaintenanceModalOpen(false);
          setTriggerPart(null);
        }}
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

      <GlobalMaintenanceHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />

      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageSrc={lightboxImage || ""}
      />
    </div>
  );
}
