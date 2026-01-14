
import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { Machine, Part, SparePart } from "../../types";
import { getMachines, getPartsByMachine, getPartsByMachineName } from "../../lib/firebaseService";
import { useLanguage } from "../../contexts/LanguageContext";
import { BoxIcon, MapPinIcon, SettingsIcon, WrenchIcon, AlertTriangleIcon, SearchIcon, FilterIcon, XIcon, MaximizeIcon, CheckCircleIcon, TrashIcon, EditIcon } from "../ui/Icons";
import Lightbox from "@/app/components/ui/Lightbox";
import Image from "next/image";

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
    const [machine, setMachine] = useState<Machine | null>(null);
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedZone, setSelectedZone] = useState<string>("All");

    // Fetch data when modal opens
    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;

            setLoading(true);
            try {
                // 1. Fetch Machine Details
                // If we have ID, fetch by ID. If not, find by Name from all machines
                let targetMachine: Machine | undefined;
                const allMachines = await getMachines();

                if (machineId) {
                    targetMachine = allMachines.find(m => m.id === machineId);
                }

                // If not found by ID, try by name
                if (!targetMachine && machineName) {
                    targetMachine = allMachines.find(m =>
                        m.name?.toLowerCase() === machineName.toLowerCase()
                    );
                }

                setMachine(targetMachine || null);

                // 2. Fetch Parts for this machine
                // Use a robust approach: try indexed query first, then fallback to client-side filtering
                let machineParts: Part[] = [];

                // Attempt 1: Try indexed query by machineId (requires Firebase index)
                if (targetMachine?.id) {
                    try {
                        machineParts = await getPartsByMachine(targetMachine.id);
                    } catch (indexError) {
                        console.warn("Index query failed, falling back to client-side filtering:", indexError);
                    }
                }

                // Attempt 2: If no parts found, use fallback by machine name (client-side filtering)
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

    // Safety fallback for display if machine record doesn't exist but we have Part info
    const displayName = machine?.name || machineName || initialPart?.machineName || "Unknown Machine";
    const displayZone = machine?.zone || initialPart?.zone || "-";
    const displayImage = machine?.imageUrl || initialPart?.imageUrl || ""; // Prefer machine image, fallback to part image? User said "Part Image" -> "MACHINE", maybe they want machine image.

    // Calculate stats
    // Calculate stats & Filter
    const uniqueZones = Array.from(new Set(parts.map(p => p.zone).filter(Boolean))).sort();

    const displayedParts = selectedZone === "All"
        ? parts
        : parts.filter(p => p.zone === selectedZone);

    const totalParts = parts.length;
    const lowStockCount = parts.filter(p => p.quantity <= (p.minStockThreshold || 0)).length; // Safe fallback

    // Reset filter when parts change (e.g. machine change)
    useEffect(() => {
        setSelectedZone("All");
    }, [machineId, machineName]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            hideHeader={true} // We will use a custom header
            noPadding={true} // Full width content
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
                                    {machineName || machine?.name || "Machine"}
                                </h2>
                                <p className="text-indigo-400/80 text-xs md:text-sm font-medium">
                                    {t("machineDetailsSubtitle")}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
                        >
                            <XIcon size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-text-muted animate-pulse">{t("msgLoading")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 md:space-y-6">
                            {/* Stats Cards Grid - Stacked on Mobile, Side-by-Side on Desktop */}
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
                                        <div className="text-xs md:text-sm text-text-muted mb-2 font-medium text-[#A855F7]" style={{ color: '#A855F7' }}>{t("statTotalZones")}</div>
                                        <div className="text-3xl md:text-4xl font-bold text-white leading-none">
                                            {uniqueZones.length}
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-600/20 flex items-center justify-center text-[#A855F7] shadow-inner" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#A855F7' }}>
                                        <MapPinIcon size={24} className="md:w-7 md:h-7" />
                                    </div>
                                </div>
                            </div>

                            {/* Parts List Header */}
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-[#1E293B]/40 p-4 rounded-2xl border border-white/5 shadow-md gap-4">
                                <h3 className="font-bold text-md md:text-lg text-white flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <BoxIcon size={20} />
                                    </div>
                                    {t("tableTitleParts")}
                                </h3>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:flex-none">
                                        <select
                                            value={selectedZone}
                                            onChange={(e) => setSelectedZone(e.target.value)}
                                            className="w-full md:w-auto appearance-none bg-[#0F172A] border border-white/10 text-text-primary text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all"
                                        >
                                            <option value="All">{t("filterAll")}</option>
                                            {uniqueZones.map(zone => (
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

                            {/* Parts Grid - High Fidelity Cards */}
                            {displayedParts.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 md:gap-6">
                                    {displayedParts.map(part => {
                                        const isLowStock = part.quantity <= (part.minStockThreshold || 0);
                                        return (
                                            <div key={part.id} className="bg-[#1E293B]/50 rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col shadow-xl group transition-all hover:border-blue-500/30">
                                                {/* Image Area with Low Stock Badge */}
                                                <div
                                                    className="relative aspect-[16/9] overflow-hidden cursor-pointer bg-black/20"
                                                    onClick={() => {
                                                        // Lightbox logic could go here if needed
                                                    }}
                                                >
                                                    {part.imageUrl ? (
                                                        <Image
                                                            src={part.imageUrl}
                                                            alt={part.partName}
                                                            fill
                                                            className="object-cover transition-transform group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/10">
                                                            <BoxIcon size={48} className="md:w-16 md:h-16" />
                                                        </div>
                                                    )}

                                                    {/* Top Right Badges */}
                                                    <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col items-end gap-2">
                                                        {isLowStock ? (
                                                            <div className="bg-red-500/90 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-lg flex items-center gap-1">
                                                                <AlertTriangleIcon size={10} />
                                                                {t("statusLowStock")}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-green-500/90 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-lg">
                                                                {t("partsInStock")}
                                                            </div>
                                                        )}

                                                        {/* Location Badge */}
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <div className="bg-blue-400/90 text-[#0F172A] text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm shadow-lg">
                                                                {part.location || "-"}
                                                            </div>
                                                            <div className="text-[8px] text-white/60 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
                                                                {t("tableLocation")}
                                                            </div>
                                                        </div>

                                                        {/* Small Red Delete Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeletePart?.(part);
                                                            }}
                                                            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                                                            title={t("actionDelete")}
                                                        >
                                                            <TrashIcon size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Content Area */}
                                                <div className="p-4 md:p-6 flex flex-col flex-grow bg-gradient-to-b from-[#1E293B]/10 to-[#0F172A]/30">
                                                    <div className="mb-4">
                                                        <h4 className="text-lg md:text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
                                                            {part.partName}
                                                        </h4>
                                                        <p className="text-white/50 text-[10px] md:text-xs font-medium uppercase tracking-wider line-clamp-1">
                                                            {part.modelSpec || t("partsNoSpec")}
                                                        </p>
                                                    </div>

                                                    {/* Data Grid 2x2 */}
                                                    <div className="grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4 mb-4 md:mb-6 text-sm">
                                                        <div>
                                                            <div className="text-white/30 text-[10px] font-bold uppercase mb-1">{t("tableBrand")}</div>
                                                            <div className="text-white font-medium truncate">{part.brand || "-"}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-white/30 text-[10px] font-bold uppercase mb-1">{t("tableZone")}</div>
                                                            <div className="text-white font-medium truncate">{part.zone || "-"}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-white/30 text-[10px] font-bold uppercase mb-1">{t("tableQuantity")}</div>
                                                            <div className="text-white font-bold flex items-center gap-2">
                                                                <span className={isLowStock ? "text-red-400" : "text-green-400"}>
                                                                    {part.quantity}
                                                                </span>
                                                                <span className="text-white/30 text-xs font-normal">{(part as any).unit || "ชิ้น"}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Notes Section */}
                                                    {part.notes && (
                                                        <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl bg-[#0F172A]/50 border border-white/5">
                                                            <div className="text-white/30 text-[10px] font-bold uppercase mb-1">{t("tableNotes")}</div>
                                                            <p className="text-white/70 text-xs leading-relaxed italic line-clamp-2">
                                                                "{part.notes}"
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons - 3 Buttons in a row */}
                                                    <div className="mt-auto grid grid-cols-3 gap-2 md:gap-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEditPart?.(part); }}
                                                            className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white py-2 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm"
                                                        >
                                                            <EditIcon size={16} />
                                                            {t("actionEdit")}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onRepairPart?.(part); }}
                                                            className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 text-amber-500 hover:text-white py-2 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm"
                                                        >
                                                            <SettingsIcon size={16} />
                                                            {t("actionRepair")}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onDeletePart?.(part); }}
                                                            className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 bg-red-600/10 hover:bg-red-600 border border-red-500/30 text-red-500 hover:text-white py-2 md:py-3 rounded-lg md:rounded-xl transition-all font-bold text-[10px] md:text-sm"
                                                        >
                                                            <TrashIcon size={16} />
                                                            {t("actionDelete")}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-[#1E293B]/30 p-8 md:p-12 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10">
                                        <BoxIcon size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-white font-medium">{t("msgNoData")}</p>
                                        <p className="text-text-muted text-sm px-4 md:px-10">{t("partsNoPartsDesc")}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox for large images */}
            {lightboxOpen && (
                <Lightbox
                    imageSrc={displayImage}
                    altText={machineName || "Machine"}
                    isOpen={lightboxOpen}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </Modal>
    );
};
