
import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { Machine, Part, SparePart } from "../../types";
import { getMachines, getPartsByMachine, getPartsByMachineName } from "../../lib/firebaseService";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { BoxIcon, MapPinIcon, SettingsIcon, WrenchIcon, AlertTriangleIcon, SearchIcon, FilterIcon, XIcon, MaximizeIcon, CheckCircleIcon, TrashIcon, EditIcon, CalendarIcon } from "../ui/Icons";
import Lightbox from "@/app/components/ui/Lightbox";
import Image from "next/image";
import PMConfigModal from "../pm/PMConfigModal";
import PartReplacementPlanModal from "../pm/PartReplacementPlanModal";

interface MachineDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    machineId?: string;
    machineName?: string; // Fallback if ID not available
    initialPart?: Part; // The part that triggered this, if any
    onEditPart?: (part: Part) => void;
    onRepairPart?: (part: Part) => void;
    onDeletePart?: (part: Part) => void;
}

export default function MachineDetailsModal({
    isOpen,
    onClose,
    machineId,
    machineName,
    initialPart,
    onEditPart,
    onRepairPart,
    onDeletePart
}: MachineDetailsModalProps) {
    const { t, tData } = useLanguage();
    const { checkAuth } = useAuth();
    const [machine, setMachine] = useState<Machine | null>(null);
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<string>("All");
    const [pmConfigOpen, setPmConfigOpen] = useState(false);
    const [replacementPlanOpen, setReplacementPlanOpen] = useState(false);
    const [partImageErrors, setPartImageErrors] = useState<Record<string, boolean>>({});

    // Fetch data when modal opens
    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;

            setLoading(true);
            try {
                // 1. Fetch Machine Details
                let targetMachine: Machine | undefined;
                const allMachines = await getMachines();

                if (machineId) {
                    targetMachine = allMachines.find(m => m.id === machineId);
                }

                if (!targetMachine && machineName) {
                    targetMachine = allMachines.find(m =>
                        m.name?.toLowerCase() === machineName.toLowerCase()
                    );
                }

                setMachine(targetMachine || null);

                // 2. Fetch Parts for this machine
                let machineParts: Part[] = [];

                if (targetMachine?.id) {
                    try {
                        machineParts = await getPartsByMachine(targetMachine.id);
                    } catch (indexError) {
                        console.warn("Index query failed, falling back to client-side filtering:", indexError);
                    }
                }

                if (machineParts.length === 0 && (machineName || targetMachine?.name)) {
                    const searchName = machineName || targetMachine?.name || "";
                    machineParts = await getPartsByMachineName(searchName);
                }

                setParts(machineParts);
            } catch (error) {
                console.error("Error fetching machine details:", error);
                setParts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isOpen, machineId, machineName]);

    // Safety fallback for display
    const displayName = machine?.name || machineName || initialPart?.machineName || "Unknown Machine";
    const displayZone = machine?.Location || initialPart?.Location || "-";

    // Calculate stats & Filter
    const uniqueLocations = Array.from(new Set(parts.map(p => p.Location).filter(Boolean))).sort();

    const displayedParts = selectedLocation === "All"
        ? parts
        : parts.filter(p => p.Location === selectedLocation);

    useEffect(() => {
        setSelectedLocation("All");
    }, [machineId, machineName]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            hideHeader={true}
            noPadding={true}
        >
            <div className="relative bg-[#0F172A] flex flex-col h-[85vh] md:h-[90vh] overflow-hidden">
                {/* Custom Gradient Header */}
                <div className="relative p-4 md:p-6 bg-gradient-to-r from-indigo-900 to-[#0F172A] border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <SettingsIcon size={24} className="md:w-8 md:h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">
                                    {displayName}
                                </h2>
                                <div className="flex items-center gap-3 mt-1">
                                    <p className="text-indigo-400/80 text-xs md:text-sm font-medium">
                                        {t("machineDetailsSubtitle")}
                                    </p>
                                    {(machine || machineName) && (
                                        <button
                                            onClick={() => { if (checkAuth()) setPmConfigOpen(true); }}
                                            className="flex items-center gap-2 px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold hover:bg-indigo-500/30 transition-all border border-indigo-500/30 shadow-lg active:scale-95"
                                        >
                                            <CalendarIcon size={12} />
                                            {t("actionPMSettings")}
                                        </button>
                                    )}
                                    {(machine?.id || machineId) && (
                                        <button
                                            onClick={() => setReplacementPlanOpen(true)}
                                            className="flex items-center gap-2 px-2 py-1 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold hover:bg-orange-500/30 transition-all border border-orange-500/30 shadow-lg active:scale-95"
                                        >
                                            <WrenchIcon size={12} />
                                            แผนเปลี่ยนอะไหล่
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all shadow-lg"
                        >
                            <XIcon size={24} />
                        </button>
                    </div>
                </div>

                {/* PM Config Modal */}
                {(machine || machineName) && (
                    <PMConfigModal
                        isOpen={pmConfigOpen}
                        onClose={() => setPmConfigOpen(false)}
                        machine={machine || {
                            id: machineName || "Unknown",
                            name: machineName || "Unknown",
                            Location: initialPart?.Location || "All",
                            location: initialPart?.location || "",
                            status: "active",
                            description: "",
                            serialNumber: "",
                            brandModel: "",
                            installationDate: "",
                            capacity: "",
                            powerRating: "",
                            operatingHours: 0,
                            maintenanceCycle: 0,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }}
                    />
                )}

                {/* Part Replacement Plan Modal */}
                {replacementPlanOpen && (
                    <PartReplacementPlanModal
                        isOpen={replacementPlanOpen}
                        onClose={() => setReplacementPlanOpen(false)}
                        machineId={machine?.id || machineId}
                        machineName={machine?.name || machineName}
                        onViewHistory={() => { window.location.href = "/maintenance"; }}
                    />
                )}

                <div className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-text-muted animate-pulse">{t("msgLoading")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 md:space-y-6">
                            {/* Machine Info Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {machine?.code && (
                                    <div className="bg-[#1E293B]/40 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">{t("labelMachineCode")}</div>
                                        <div className="text-sm font-bold text-white">{machine.code}</div>
                                    </div>
                                )}
                                {(machine?.brand || machine?.model) && (
                                    <div className="bg-[#1E293B]/40 p-3 rounded-xl border border-white/5 md:col-span-1">
                                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">{t("labelBrand")}/{t("labelModel")}</div>
                                        <div className="text-sm font-bold text-white leading-tight">
                                            {machine.brand} {machine.model}
                                        </div>
                                    </div>
                                )}
                                {machine?.performance && (
                                    <div className="bg-[#1E293B]/40 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">{t("labelPerformance")}</div>
                                        <div className="text-sm font-bold text-primary-light">{machine.performance} kW</div>
                                    </div>
                                )}
                                {machine?.location && (
                                    <div className="bg-[#1E293B]/40 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-text-muted uppercase font-bold mb-1">{t("tableLocation")}</div>
                                        <div className="text-sm font-bold text-accent-cyan">{machine.location}</div>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#1E293B]/60 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex items-center justify-between shadow-lg">
                                    <div>
                                        <div className="text-xs md:text-sm text-text-muted mb-2 font-medium">{t("statTotalParts")}</div>
                                        <div className="text-3xl md:text-4xl font-bold text-white leading-none">{parts.length}</div>
                                    </div>
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-500 shadow-inner">
                                        <BoxIcon size={24} className="md:w-7 md:h-7" />
                                    </div>
                                </div>

                                <div className="bg-[#1E293B]/60 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex items-center justify-between shadow-lg">
                                    <div>
                                        <div className="text-xs md:text-sm text-text-muted mb-2 font-medium text-[#A855F7]">{t("statTotalLocations")}</div>
                                        <div className="text-3xl md:text-4xl font-bold text-white leading-none">{uniqueLocations.length}</div>
                                    </div>
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-600/20 flex items-center justify-center text-[#A855F7] shadow-inner" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                        <MapPinIcon size={24} className="md:w-7 md:h-7" />
                                    </div>
                                </div>
                            </div>

                            {/* Filter */}
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-[#1E293B]/60 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 shadow-md gap-4">
                                <h3 className="font-bold text-md md:text-lg text-white flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <BoxIcon size={20} />
                                    </div>
                                    {t("tableTitleParts")}
                                </h3>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:flex-none">
                                        <select
                                            value={selectedLocation}
                                            onChange={(e) => setSelectedLocation(e.target.value)}
                                            className="w-full md:w-auto appearance-none bg-[#0F172A] border border-white/10 text-text-primary text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all"
                                        >
                                            <option value="All">{t("filterAll")}</option>
                                            {uniqueLocations.map(zone => (
                                                <option key={zone} value={zone}>{zone}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                            <FilterIcon size={14} />
                                        </div>
                                    </div>
                                    <span className="text-sm text-text-muted font-medium bg-[#0F172A] px-3 py-1.5 rounded-lg border border-white/5 whitespace-nowrap">
                                        {displayedParts.length}
                                    </span>
                                </div>
                            </div>

                            {/* Parts List */}
                            {displayedParts.length > 0 ? (
                                <div className="space-y-4 md:space-y-6">
                                    {displayedParts.map(part => {
                                        const isLowStock = part.quantity <= (part.minStockThreshold || 0);
                                        return (
                                            <div key={part.id} className="bg-gradient-to-br from-[#1E293B]/80 to-[#0F172A] rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden shadow-xl group transition-all hover:border-indigo-500/30 flex flex-col md:flex-row relative">
                                                
                                                {/* Tech ID Sidebar */}
                                                <div className="w-full md:w-32 bg-black/20 p-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden shrink-0">
                                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:10px_16px]"></div>
                                                    
                                                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                        <span className="text-xl font-black text-white/80 drop-shadow-md group-hover:text-white">
                                                            {part.partName ? part.partName.substring(0, 2).toUpperCase() : "PT"}
                                                        </span>
                                                    </div>
                                                    <span className="relative z-10 mt-3 px-2 py-0.5 rounded bg-black/50 border border-white/10 text-[9px] font-black text-indigo-400 tracking-widest uppercase text-center w-full truncate">
                                                        {part.category || "PART"}
                                                    </span>
                                                </div>

                                                {/* Core Details */}
                                                <div className="flex-1 p-4 md:p-5 flex flex-col justify-between space-y-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-lg md:text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{part.partName}</h4>
                                                                {isLowStock && (
                                                                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1 animate-pulse">
                                                                        <AlertTriangleIcon size={10} /> LOW
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-text-muted text-xs md:text-sm font-medium mt-1">{part.brand || "N/A"} • {part.modelSpec || "No Spec"}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className="badge bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/20">
                                                                {part.location || "-"}
                                                            </span>
                                                            <span className="text-[9px] text-white/40 uppercase tracking-wide">{t("tableLocation")}</span>
                                                        </div>
                                                    </div>

                                                    {/* Spec Grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/20 p-3 rounded-xl border border-white/5 w-full">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] text-text-muted uppercase font-semibold">{t("tableLocationArea")}</span>
                                                            <span className="text-sm font-bold text-white/90">{part.Location || "-"}</span>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] text-text-muted uppercase font-semibold">{t("tableQuantity")}</span>
                                                            <div className="flex items-end gap-1">
                                                                <span className={`text-lg leading-none font-black ${isLowStock ? "text-red-400" : "text-green-400"}`}>{part.quantity}</span>
                                                                <span className="text-[10px] text-text-muted mb-0.5">/ {part.minStockThreshold || 0}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 col-span-2">
                                                            <span className="text-[10px] text-text-muted uppercase font-semibold">{t("tableNotes")}</span>
                                                            <span className="text-xs text-text-primary line-clamp-1 italic">{part.notes || "No notes"}</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5 mt-2">
                                                        <button
                                                            onClick={() => { if (checkAuth()) onEditPart?.(part); }}
                                                            className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-blue-500/20 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/30"
                                                            title={t("actionEdit")}
                                                        >
                                                            <EditIcon size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { if (checkAuth()) onDeletePart?.(part); }}
                                                            className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all border border-transparent hover:border-red-500/30"
                                                            title={t("actionDelete")}
                                                        >
                                                            <TrashIcon size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { if (checkAuth()) onRepairPart?.(part); }}
                                                            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-lg font-bold transition-all border border-indigo-500/30 text-xs"
                                                        >
                                                            <WrenchIcon size={14} />
                                                            {t("actionRepair")}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-white/5 rounded-[2rem] bg-white/5">
                                    <BoxIcon size={48} className="mb-4 opacity-20" />
                                    <p className="font-medium">{t("msgNoParts")}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
