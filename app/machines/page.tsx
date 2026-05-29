"use client";

import React from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { PlusIcon, SettingsIcon, TrashIcon } from "../components/ui/Icons";
import MachineSettingsModal from "../components/forms/MachineSettingsModal";
import AddMachineModal from "../components/forms/AddMachineModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import MachineDetailsModal from "../components/machines/MachineDetailsModal";

export default function MachinesPage() {
    const { t } = useLanguage();
    const { checkAuth } = useAuth();
    const { success, error: showError } = useToast();
    const [machines, setMachines] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [selectedMachine, setSelectedMachine] = React.useState<any>(null);
    const [machineToDelete, setMachineToDelete] = React.useState<any>(null);
    const [selectedLocation, setSelectedLocation] = React.useState("ALL");
    const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
    const [machineForDetails, setMachineForDetails] = React.useState<any>(null);

    // Location counts
    const counts = React.useMemo(() => {
        return {
            ALL: machines.length,
            FZ: machines.filter(m => m.location?.toUpperCase() === 'FZ').length,
            RTE: machines.filter(m => m.location?.toUpperCase() === 'RTE').length,
            UT: machines.filter(m => m.location?.toUpperCase() === 'UT' || m.location?.toUpperCase() === 'UTILITY').length,
        };
    }, [machines]);

    const filteredMachines = React.useMemo(() => {
        if (selectedLocation === 'ALL') return machines;
        if (selectedLocation === 'UT') {
            return machines.filter(m => m.location?.toUpperCase() === 'UT' || m.location?.toUpperCase() === 'UTILITY');
        }
        return machines.filter(m => m.location?.toUpperCase() === selectedLocation);
    }, [machines, selectedLocation]);

    const fetchMachines = async () => {
        try {
            setLoading(true);
            const { getMachines } = await import("../lib/firebaseService");
            const data = await getMachines();
            setMachines(data);
        } catch (error) {
            console.error("Failed to fetch machines:", error);
            showError(t("msgError") || "Error", "Failed to fetch machines");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchMachines();
    }, []);

    const handleOpenSettings = (machine: any) => {
        if (!checkAuth()) return;
        setSelectedMachine(machine);
        setSettingsModalOpen(true);
    };

    const handleOpenDelete = (machine: any) => {
        if (!checkAuth()) return;
        setMachineToDelete(machine);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteMachine = async () => {
        if (!machineToDelete) return;
        try {
            const { deleteMachine } = await import("../lib/firebaseService");
            await deleteMachine(machineToDelete.id);
            success(t("msgDeleteSuccess") || "Deleted", t("msgDeleteSuccess") || "Machine deleted successfully");
            fetchMachines();
        } catch (error: any) {
            console.error("Delete failed", error);
            showError(t("msgDeleteError") || "Delete Failed", error.message || "Failed to delete machine");
        } finally {
            setDeleteConfirmOpen(false); // Close modal
            setMachineToDelete(null);
        }
    };

    const handleOpenDetails = (machine: any) => {
        setMachineForDetails(machine);
        setDetailsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-yellow/20 flex items-center justify-center">
                            <SettingsIcon size={20} className="text-accent-yellow" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navMachines")}</h1>
                            <p className="text-sm text-text-muted">
                                {loading ? t("msgLoading") : t("machineCount", { count: machines.length })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { if (checkAuth()) setAddModalOpen(true); }}
                        className="btn btn-primary h-8"
                    >
                        <PlusIcon size={16} />
                        {t("actionAddMachine")}
                    </button>
                </div>

                {/* Location Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-8">
                    {[
                        { id: 'ALL', label: t("filterAllLocations") || 'All Locations', color: 'accent-purple' },
                        ...Array.from(new Set(machines.map(m => m.location?.toUpperCase()).filter(l => l && l !== 'ALL' && l !== 'UT' && l !== 'UTILITY')))
                            .sort()
                            .map((loc, idx) => ({
                                id: loc,
                                label: loc,
                                color: ['accent-cyan', 'green-500', 'accent-yellow', 'accent-red', 'blue-500'][idx % 5]
                            })),
                        // Add UT/UTILITY manually if they exist to group them
                        ...(machines.some(m => m.location?.toUpperCase() === 'UT' || m.location?.toUpperCase() === 'UTILITY') ? [{ id: 'UT', label: 'UT', color: 'accent-yellow' }] : [])
                    ].map((loc) => {
                        const count = loc.id === 'ALL'
                            ? machines.length
                            : loc.id === 'UT'
                                ? machines.filter(m => m.location?.toUpperCase() === 'UT' || m.location?.toUpperCase() === 'UTILITY').length
                                : machines.filter(m => m.location?.toUpperCase() === loc.id).length;

                        return (
                            <button
                                key={loc.id}
                                onClick={() => setSelectedLocation(loc.id)}
                                className={`
                                    relative px-4 py-2 rounded-xl transition-all duration-300
                                    border backdrop-blur-md flex items-center gap-2
                                    ${selectedLocation === loc.id
                                        ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg scale-105`
                                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10 hover:border-white/20'}
                                `}
                            >
                                <span className={`text-sm font-bold tracking-wide`}>{loc.label}</span>
                                <span className={`
                                    px-1.5 py-0.5 rounded-md text-[10px] font-black
                                    ${selectedLocation === loc.id
                                        ? `bg-${loc.color} text-bg-primary`
                                        : 'bg-white/10 text-text-muted'}
                                `}>
                                    {count}
                                </span>
                                {selectedLocation === loc.id && (
                                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-${loc.color}`}></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {/* Machine Grid */}
                {!loading && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                        {filteredMachines.map((machine, index) => (
                            <MachineCard
                                key={machine.id || index}
                                machine={machine}
                                index={index}
                                onRefresh={fetchMachines}
                                onOpenSettings={() => handleOpenSettings(machine)}
                                onOpenDelete={() => handleOpenDelete(machine)}
                                onOpenDetails={() => handleOpenDetails(machine)}
                            />
                        ))}
                    </div>
                )}

                {!loading && machines.length === 0 && (
                    <div className="text-center py-12 text-text-muted">
                        {t("msgNoMachines")}
                    </div>
                )}
            </main>

            <MobileNav />

            {selectedMachine && (
                <MachineSettingsModal
                    isOpen={settingsModalOpen}
                    onClose={() => setSettingsModalOpen(false)}
                    machine={selectedMachine}
                    onSuccess={fetchMachines}
                />
            )}

            <AddMachineModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSuccess={fetchMachines}
            />

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteMachine}
                title={t("confirmDeleteTitle")}
                message={t("confirmDeleteMessageDetail", { name: machineToDelete?.name || "" })}
                confirmText={t("actionDelete")}
                cancelText={t("actionCancel")}
                isDestructive={true}
            />

            <MachineDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                machineId={machineForDetails?.id}
                machineName={machineForDetails?.name}
            />
        </div>
    );
}

// Sub-component for Machine Card
function MachineCard({ machine, index, onRefresh, onOpenSettings, onOpenDelete, onOpenDetails }: { machine: any, index: number, onRefresh: () => void, onOpenSettings: () => void, onOpenDelete: () => void, onOpenDetails: () => void }) {
    const { t } = useLanguage();

    const handleDelete = () => {
        onOpenDelete();
    };

    const locationKey = machine.location?.toUpperCase() || "";
    const getStyles = () => {
        switch (locationKey) {
            case 'FZ':
                return { 
                    border: 'border-accent-cyan/30', 
                    shadow: 'hover:shadow-accent-cyan/20', 
                    code: 'text-accent-cyan',
                    glow: 'bg-accent-cyan/10',
                    borderLine: 'from-transparent via-accent-cyan to-transparent',
                    textGradient: 'group-hover:from-accent-cyan group-hover:to-blue-400',
                };
            case 'RTE':
                return { 
                    border: 'border-green-500/30', 
                    shadow: 'hover:shadow-green-500/20', 
                    code: 'text-green-400',
                    glow: 'bg-green-500/10',
                    borderLine: 'from-transparent via-green-400 to-transparent',
                    textGradient: 'group-hover:from-green-400 group-hover:to-emerald-400',
                };
            case 'UTILITY':
            case 'UT':
                return { 
                    border: 'border-accent-yellow/30', 
                    shadow: 'hover:shadow-accent-yellow/20', 
                    code: 'text-accent-yellow',
                    glow: 'bg-accent-yellow/10',
                    borderLine: 'from-transparent via-accent-yellow to-transparent',
                    textGradient: 'group-hover:from-accent-yellow group-hover:to-amber-500',
                };
            default:
                return { 
                    border: 'border-white/10', 
                    shadow: 'hover:shadow-primary/10', 
                    code: 'text-primary-light',
                    glow: 'bg-primary/10',
                    borderLine: 'from-transparent via-primary-light to-transparent',
                    textGradient: 'group-hover:from-primary-light group-hover:to-indigo-400',
                };
        }
    };
    const styles = getStyles();

    // Mock operating hours and calculate health percentage (simulating real machine data)
    // Using machine ID to generate a consistent mock value for demo purposes
    const idHash = machine.id ? machine.id.charCodeAt(0) + machine.id.charCodeAt(machine.id.length - 1) : 150;
    const operatingHours = machine.operatingHours || (idHash * 13) % 1800 + 200; 
    const maxHours = machine.maintenanceInterval || 2000;
    const healthPercentage = Math.min(100, Math.max(0, 100 - (operatingHours / maxHours) * 100));
    
    // Determine status color based on health
    const healthColor = healthPercentage > 50 ? 'bg-green-500' : healthPercentage > 20 ? 'bg-accent-yellow' : 'bg-accent-red';

    return (
        <div
            onClick={onOpenDetails}
            className={`group relative h-80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl ${styles.shadow} transition-all duration-500 animate-fade-in-up border ${styles.border} cursor-pointer flex flex-col bg-bg-tertiary`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Top Section - Visual Tech Identity */}
            <div className="relative h-32 flex items-center justify-center overflow-hidden border-b border-white/5 bg-gradient-to-br from-bg-secondary to-bg-tertiary">
                {/* CAD Technical blueprint grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                
                {/* Glowing ambient lights */}
                <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full ${styles.glow} blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700`}></div>
                
                {/* Technical Crosshairs */}
                <div className="absolute top-3 left-3 w-1.5 h-1.5 border-t border-l border-white/20"></div>
                <div className="absolute top-3 right-3 w-1.5 h-1.5 border-t border-r border-white/20"></div>
                <div className="absolute bottom-3 left-3 w-1.5 h-1.5 border-b border-l border-white/20"></div>
                <div className="absolute bottom-3 right-3 w-1.5 h-1.5 border-b border-r border-white/20"></div>

                {/* Machine Code Badge (replaces image) */}
                <div className="
                    relative px-8 py-3 rounded-2xl 
                    bg-gradient-to-b from-white/10 to-white/5 
                    border border-white/15 
                    flex items-center justify-center 
                    shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_10px_25px_rgba(0,0,0,0.5)] 
                    group-hover:border-white/30 group-hover:scale-105
                    transition-all duration-500
                ">
                    <div className={`absolute inset-x-2 top-0 h-px bg-gradient-to-r ${styles.borderLine} opacity-70`}></div>
                    <span className={`
                        text-3xl font-black tracking-widest text-white/90
                        drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]
                        group-hover:text-transparent group-hover:bg-clip-text
                        group-hover:bg-gradient-to-r ${styles.textGradient}
                        transition-all duration-300
                    `}>
                        {machine.code ? machine.code.toUpperCase() : machine.name.substring(0, 3).toUpperCase()}
                    </span>
                    <span className="absolute -bottom-2.5 px-3 py-0.5 rounded bg-bg-secondary border border-white/10 text-[9px] font-black text-text-muted tracking-widest uppercase shadow-sm">
                        {machine.location || "SYS"}
                    </span>
                </div>
            </div>

            {/* Bottom Section - Data & Specs */}
            <div className="relative flex-1 p-5 flex flex-col justify-between bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-primary z-10">
                {/* Header: Name and Status */}
                <div>
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-white tracking-tight drop-shadow-md truncate pr-2">
                            {machine.name}
                        </h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm border flex-shrink-0 ${machine.status === 'active' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/10 border-white/20 text-text-muted'}`}>
                            {machine.status === 'active' ? t("statusActive") : machine.status}
                        </span>
                    </div>
                    
                    {/* Brand & Model */}
                    <div className="text-xs text-white/60 font-medium truncate mb-3">
                        {(machine.brand || machine.model) ? (
                            `${machine.brand || ''} ${machine.model || ''}`.trim()
                        ) : machine.brandModel ? (
                            machine.brandModel
                        ) : "N/A"}
                    </div>
                </div>

                {/* Operating Hours Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Health / Cycle</span>
                        <span className="text-[11px] font-bold text-white/90 font-mono">
                            {healthPercentage.toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={`h-full ${healthColor} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${healthPercentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-text-muted font-mono">{operatingHours} hrs</span>
                        <span className="text-[9px] text-text-muted font-mono">{maxHours} hrs max</span>
                    </div>
                </div>

                {/* Badges Grid */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {machine.Location && machine.Location !== "No Zone" && (
                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                            Zone: {machine.Location}
                        </span>
                    )}
                    {machine.performance && (
                        <span className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary-light backdrop-blur-sm">
                            {machine.performance} kW
                        </span>
                    )}
                    {machine.serialNumber && machine.serialNumber !== "-" && (
                        <span className="px-2 py-1 rounded-md bg-accent-purple/10 border border-accent-purple/20 text-[10px] font-medium text-accent-purple backdrop-blur-sm">
                            SN: {machine.serialNumber}
                        </span>
                    )}
                    {machine.remark && (
                        <span className="px-2 py-1 rounded-md bg-accent-yellow/10 border border-accent-yellow/20 text-[10px] font-bold text-accent-yellow backdrop-blur-sm">
                            {t("labelClass")} {machine.remark}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Buttons - Absolute positioned at top right */}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenSettings();
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-primary hover:border-primary hover:scale-110 transition-all duration-300 shadow-lg"
                    title={t("labelMachineSettings")}
                >
                    <SettingsIcon size={16} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                    }}
                    className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-accent-red hover:border-accent-red hover:scale-110 transition-all duration-300 shadow-lg"
                    title={t("actionDelete")}
                >
                    <TrashIcon size={16} />
                </button>
            </div>
        </div>
    );
}

