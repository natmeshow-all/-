"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { MaintenanceRecord } from "../../types";
import { getMaintenanceRecords, getMachines, getParts } from "../../lib/firebaseService";
import { ClockIcon, UserIcon, FileTextIcon, CalendarIcon, BoxIcon, SettingsIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon, FilterIcon, CheckCircleIcon, CameraIcon, MapPinIcon, RefreshCwIcon, TargetIcon, AlertTriangleIcon, ActivityIcon, InfoIcon } from "../ui/Icons";
import Image from "next/image";

interface GlobalMaintenanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalMaintenanceHistoryModal({ isOpen, onClose }: GlobalMaintenanceHistoryModalProps) {
    const { t } = useLanguage();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [allRecordsForStats, setAllRecordsForStats] = useState<MaintenanceRecord[]>([]);
    const [machines, setMachines] = useState<{ id: string, name: string, Location?: string, location?: string }[]>([]);
    const [parts, setParts] = useState<{ id: string, partName: string, machineId: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMachine, setSelectedMachine] = useState<string>("all");
    const [selectedLocation, setSelectedLocation] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all"); // YYYY-MM
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) return;
            setLoading(true);
            try {
                const [recordsData, machinesData, partsData] = await Promise.all([
                    getMaintenanceRecords(),
                    getMachines(),
                    getParts()
                ]);
                setAllRecordsForStats(recordsData);
                // Filter records to ONLY show Part Change/Overhaul (type === 'partReplacement')
                const overhaulRecords = recordsData.filter(r => r.type === 'partReplacement');
                setRecords(overhaulRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setMachines(machinesData.map(m => ({ id: m.id, name: m.name, Location: m.Location, location: m.location })));
                setParts(partsData.map(p => ({ id: p.id, partName: p.partName, machineId: p.machineId })));
            } catch (error) {
                console.error("Error fetching global maintenance history:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isOpen]);

    const filteredRecords = records.filter(record => {
        // (Base records already filtered for 'partReplacement')

        const matchesSearch =
            record.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.details?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMachine = selectedMachine === "all" || record.machineId === selectedMachine || record.machineName === selectedMachine;

        // Location (Area) matching logic - updated to match Machines page (FZ, RTE, UT)
        let matchesLocation = selectedLocation === "all";
        if (!matchesLocation) {
            // Prioritize part location (FZ, RTE, UT) which corresponds to lowercase 'location'
            // Fallback to machine location if part location is missing
            let recordLocation = record.location?.toUpperCase() || "";

            if (!recordLocation) {
                const machine = machines.find(m => m.id === record.machineId || m.name === record.machineName);
                recordLocation = machine?.location?.toUpperCase() || "";
            }

            if (selectedLocation === "UT") {
                matchesLocation = recordLocation === "UT" || recordLocation === "UTILITY";
            } else {
                matchesLocation = recordLocation === selectedLocation;
            }
        }

        const recordDate = new Date(record.date);
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        const matchesMonth = selectedMonth === "all" || recordMonth === selectedMonth;

        return matchesSearch && matchesMachine && matchesLocation && matchesMonth;
    });

    const getMonthOptions = () => {
        const months = new Set<string>();
        records.forEach(r => {
            const d = new Date(r.date);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(months).sort().reverse();
    };

    const getLocationOptions = () => {
        const locations = new Set<string>();
        machines.forEach(m => {
            if (m.location) locations.add(m.location);
        });
        return Array.from(locations).sort();
    };

    const toggleExpand = (id: string) => {
        setExpandedRecord(expandedRecord === id ? null : id);
    };

    const getPartChangeCount = (partId: string) => {
        return records.filter(r => r.partId === partId).length;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("pmHistoryTitle")} size="xl">
            <div className="space-y-6">
                {/* Search and Filters */}
                <div className="bg-bg-tertiary/30 p-4 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-accent-blue" />
                            <input
                                type="text"
                                placeholder={t("placeholderSearchHistory")}
                                className="input-field w-full pl-9 h-10 text-xs transition-all border-white/5 focus:border-accent-blue/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className={`h-10 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 relative overflow-hidden
                                ${isFilterExpanded
                                    ? 'bg-accent-blue/20 text-white border-accent-blue/30'
                                    : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'}
                                border hover:shadow-[0_0_15px_rgba(0,149,255,0.3)] group`}
                        >
                            <FilterIcon size={16} className={`${isFilterExpanded ? 'text-accent-blue' : 'text-text-muted'}`} />
                            <span className="text-[11px] font-bold whitespace-nowrap hidden sm:block">
                                {isFilterExpanded ? t("filterHide") || 'ซ่อนตัวกรอง' : t("filterShow") || 'ตัวกรอง'}
                            </span>
                            {/* Glowing indicator */}
                            {!isFilterExpanded && (
                                <div className="absolute right-0 top-0 h-full w-1 bg-accent-blue animate-pulse opacity-50 shadow-[0_0_8px_rgba(0,149,255,0.8)]" />
                            )}
                        </button>
                    </div>

                    {isFilterExpanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                            <div className="flex items-center gap-2">
                                <MapPinIcon size={14} className="text-text-muted shrink-0" />
                                <select
                                    className="input-field w-full h-10 text-xs py-0"
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                >
                                    <option value="all">{t("filterAllLocations")}</option>
                                    {getLocationOptions().map(z => (
                                        <option key={z} value={z}>{z}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <SettingsIcon size={14} className="text-text-muted shrink-0" />
                                <select
                                    className="input-field w-full h-10 text-xs py-0"
                                    value={selectedMachine}
                                    onChange={(e) => setSelectedMachine(e.target.value)}
                                >
                                    <option value="all">{t("filterAllMachines")}</option>
                                    {machines.filter(m => {
                                        if (selectedLocation === 'all') return true;
                                        const loc = m.location?.toUpperCase() || "";
                                        if (selectedLocation === 'UT') return loc === 'UT' || loc === 'UTILITY';
                                        return loc === selectedLocation;
                                    }).map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon size={14} className="text-text-muted shrink-0" />
                                <select
                                    className="input-field w-full h-10 text-xs py-0"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    <option value="all">{t("filterAllTime")}</option>
                                    {getMonthOptions().map(m => (
                                        <option key={m} value={m}>{new Date(m).toLocaleDateString(t("language") === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Summary */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 px-1">
                        {[
                            { id: 'all', label: 'All', color: 'accent-blue' },
                            { id: 'FZ', label: 'FZ', color: 'accent-cyan' },
                            { id: 'RTE', label: 'RTE', color: 'accent-green' },
                            { id: 'UT', label: 'UT', color: 'accent-yellow' }
                        ].map((loc) => (
                            <button
                                key={loc.id}
                                onClick={() => setSelectedLocation(loc.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2
                                    ${selectedLocation === loc.id
                                        ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg`
                                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'}`}
                            >
                                {loc.label === 'All' ? t("filterAll") : loc.label}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedLocation === loc.id ? `bg-${loc.color} text-bg-primary` : 'bg-white/10 text-white/40'}`}>
                                    {loc.id === 'all' ? records.length : records.filter(r => {
                                        let recordLoc = r.location?.toUpperCase() || "";
                                        if (!recordLoc) {
                                            const m = machines.find(mach => mach.id === r.machineId || mach.name === r.machineName);
                                            recordLoc = m?.location?.toUpperCase() || "";
                                        }
                                        if (loc.id === 'UT') return recordLoc === 'UT' || recordLoc === 'UTILITY';
                                        return recordLoc === loc.id;
                                    }).length}
                                </span>

                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted px-2">
                        <p>{t("statFoundHistoryPrefix")} <span className="text-text-primary font-bold">{filteredRecords.length}</span> {t("statFoundHistorySuffix")}</p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-accent-blue" />
                                <span>PM: <span className="text-text-primary font-bold">{allRecordsForStats.filter(r => r.type === 'preventive').length}</span></span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-accent-green" />
                                <span>Overhaul: <span className="text-text-primary font-bold">{allRecordsForStats.filter(r => r.type === 'partReplacement').length}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                            <p>{t("msgLoadingHistory")}</p>
                        </div>
                    ) : filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => (
                            <div key={record.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                                {/* Timeline Dot */}
                                <div className={`absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)] 
                                    ${record.type === 'preventive' ? 'bg-accent-blue shadow-accent-blue/50' :
                                        record.type === 'corrective' ? 'bg-accent-red shadow-accent-red/50' : 'bg-accent-green shadow-accent-green/50'}`}
                                />

                                <div
                                    className={`card border p-4 space-y-3 transition-all cursor-pointer group active:scale-[0.99]
                                        ${expandedRecord === record.id
                                            ? 'bg-bg-tertiary border-accent-blue/30 shadow-lg shadow-accent-blue/5'
                                            : 'bg-bg-secondary/50 border-white/5 hover:bg-bg-tertiary/50'}`}
                                    onClick={() => toggleExpand(record.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-text-primary text-sm flex items-center gap-2">
                                                <SettingsIcon size={14} className="text-text-muted" />
                                                {record.machineName}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider
                                                    ${record.type === 'preventive' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' :
                                                        record.type === 'corrective' ? 'bg-accent-red/10 text-accent-red border border-accent-red/20' : 'bg-accent-green/10 text-accent-green border border-accent-green/20'}`}>
                                                    {record.type}
                                                </span>
                                                <span className="text-xs text-text-muted flex items-center gap-1">
                                                    <CalendarIcon size={12} />
                                                    {new Date(record.date).toLocaleDateString(t("language") === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </span>
                                                {record.isOverhaul && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30 flex items-center gap-1">
                                                        <RefreshCwIcon size={8} /> OVERHAUL
                                                    </span>
                                                )}
                                                {record.partId && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-accent-blue/20 text-accent-blue border border-accent-blue/30 flex items-center gap-1">
                                                        <BoxIcon size={8} /> {parts.find(p => p.id === record.partId)?.partName || 'Part Change'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-1.5 text-xs text-text-muted bg-white/5 px-2 py-1 rounded-md">
                                                <UserIcon size={12} />
                                                {record.technician}
                                            </div>
                                            {expandedRecord === record.id ? <ChevronUpIcon size={14} className="text-text-muted" /> : <ChevronDownIcon size={14} className="text-text-muted" />}
                                        </div>
                                    </div>

                                    {/* Brief Details */}
                                    <div className={`text-sm text-text-secondary leading-relaxed pl-2 border-l-2 border-white/5 ${expandedRecord === record.id ? 'hidden' : 'line-clamp-2'}`}>
                                        {record.details}
                                    </div>

                                    {/* Expanded Audit Details */}
                                    {expandedRecord === record.id && (
                                        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                                            {/* Left Column: Details & Evidence */}
                                            <div className="space-y-4">
                                                {/* Details Text Section */}
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                        <FileTextIcon size={12} /> {t("labelWorkDetails")}
                                                    </p>
                                                    <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                                                        {record.details}
                                                    </div>
                                                </div>

                                                {/* Evidence Photo */}
                                                {record.evidenceImageUrl && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                                            <CameraIcon size={12} /> {t("labelEvidencePhotoShort")}
                                                        </p>
                                                        <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-white/10 group">
                                                            <Image
                                                                src={record.evidenceImageUrl}
                                                                alt="Evidence"
                                                                fill
                                                                className="object-cover transition-transform group-hover:scale-105"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Checklist Audit Section (if on mobile it stays here, on desktop we might move it) */}
                                                <div className="lg:hidden">
                                                    {record.checklist && record.checklist.length > 0 && (
                                                        <div className="space-y-2 pt-2">
                                                            <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                                                <CheckCircleIcon size={12} className="text-accent-green" /> {t("labelAuditChecklist")}
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {record.checklist.map((item, idx) => (
                                                                    <div key={idx} className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-[11px] text-text-secondary font-medium truncate">{item.item}</span>
                                                                            <span className={`text-[10px] font-bold ${item.completed ? 'text-accent-green' : 'text-accent-red'}`}>
                                                                                {item.completed ? 'PASS' : 'FAIL'}
                                                                            </span>
                                                                        </div>
                                                                        {item.value && (
                                                                            <span className="text-[10px] text-white/40 mt-1 italic font-mono">Value: {item.value}</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Column: Technical Data */}
                                            <div className="space-y-4">
                                                {/* Part Change Specifics */}
                                                {(record.partId || record.isOverhaul) && (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                                                            {(record.machineHours || record.lifespanValue || record.serialNumber || (record as any).partLifespan) && (
                                                                <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                                        <ClockIcon size={12} /> {t("labelLifespanTracking")}
                                                                    </p>
                                                                    <div className="space-y-1.5 px-1">
                                                                        {record.machineHours && (
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-text-muted flex items-center gap-1">
                                                                                    <ClockIcon size={10} /> {t("labelReading")}:
                                                                                </span>
                                                                                <span className="text-text-primary font-bold">
                                                                                    {record.machineHours} {t("labelHoursShort")}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {record.lifespanValue && (
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-text-muted">{t("labelExpectedLifespan")}:</span>
                                                                                <span className="text-text-primary font-medium">
                                                                                    {record.lifespanValue} {record.lifespanUnit ? t(`label${record.lifespanUnit.charAt(0).toUpperCase() + record.lifespanUnit.slice(1)}` as any) : ''}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {(record as any).partLifespan && (
                                                                            <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                                                                                <span className="text-accent-blue font-semibold">{t("labelActualLifespan")}:</span>
                                                                                <span className="text-accent-blue font-bold">{(record as any).partLifespan}</span>
                                                                            </div>
                                                                        )}
                                                                        {record.serialNumber && (
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-text-muted">{t("labelSerialBatch")}:</span>
                                                                                <span className="font-mono text-accent-cyan">{record.serialNumber}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {(record.changeReason || record.partCondition) && (
                                                                <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                                        <ActivityIcon size={12} className="text-accent-blue" /> {t("labelAnalysisContext")}
                                                                    </p>
                                                                    <div className="space-y-1.5 px-1">
                                                                        {record.changeReason && (
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-text-muted">{t("maintenanceChangeReason")}:</span>
                                                                                <span className={`font-bold ${record.changeReason === 'failed' ? 'text-accent-red' : 'text-accent-blue'}`}>
                                                                                    {t(`maintenanceReason${record.changeReason.charAt(0).toUpperCase() + record.changeReason.slice(1)}` as any)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {record.partCondition && (
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-text-muted">{t("maintenanceOldPartStatus")}:</span>
                                                                                <span className="text-text-primary font-medium">
                                                                                    {t(`maintenanceCondition${record.partCondition.charAt(0).toUpperCase() + record.partCondition.slice(1)}` as any)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                                                                            <span className="text-text-muted">{t("labelChangeFrequency")}:</span>
                                                                            <span className="text-white font-bold">
                                                                                {getPartChangeCount(record.partId || '')} {t("labelTimes")}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Additional Technical Data Section */}
                                                        {record.motorGearData && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                                                                {/* Motor & Gear Data Box */}
                                                                {(record.motorGearData.motorSize || record.motorGearData.temperature || record.motorGearData.currentIdle || record.motorGearData.currentLoad || record.motorGearData.voltageL1 || record.motorGearData.voltageL2 || record.motorGearData.voltageL3) && (
                                                                    <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                                                        <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                                            <ActivityIcon size={12} /> {t("maintenanceMotorGearInfo")}
                                                                        </p>
                                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
                                                                            {record.motorGearData.motorSize && (
                                                                                <div className="flex justify-between text-[11px]">
                                                                                    <span className="text-text-muted">{t("labelSize")}:</span>
                                                                                    <span className="text-text-primary font-medium">{record.motorGearData.motorSize}</span>
                                                                                </div>
                                                                            )}
                                                                            {record.motorGearData.temperature && (
                                                                                <div className="flex justify-between text-[11px]">
                                                                                    <span className="text-text-muted">{t("labelTemp")}:</span>
                                                                                    <span className="text-text-primary font-medium">{record.motorGearData.temperature} °C</span>
                                                                                </div>
                                                                            )}
                                                                            {record.motorGearData.currentIdle && (
                                                                                <div className="flex justify-between text-[11px]">
                                                                                    <span className="text-text-muted">{t("labelIdleA")}:</span>
                                                                                    <span className="text-text-primary font-medium">{record.motorGearData.currentIdle}</span>
                                                                                </div>
                                                                            )}
                                                                            {record.motorGearData.currentLoad && (
                                                                                <div className="flex justify-between text-[11px]">
                                                                                    <span className="text-text-muted">{t("labelLoadA")}:</span>
                                                                                    <span className="text-text-primary font-medium">{record.motorGearData.currentLoad}</span>
                                                                                </div>
                                                                            )}
                                                                            {(record.motorGearData.voltageL1 || record.motorGearData.voltageL2 || record.motorGearData.voltageL3) && (
                                                                                <div className="col-span-2 flex justify-between text-[10px] pt-1 border-t border-white/5">
                                                                                    <span className="text-text-muted">{t("labelVoltageL1L2L3")}:</span>
                                                                                    <span className="text-accent-cyan font-mono">
                                                                                        {record.motorGearData.voltageL1 || '-'}/{record.motorGearData.voltageL2 || '-'}/{record.motorGearData.voltageL3 || '-'}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Shaft & Dial Gauge Data Box */}
                                                                {(record.motorGearData.shaftData?.shaftBend || record.motorGearData.shaftData?.dialGauge || record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value) && (
                                                                    <div className="bg-bg-primary/40 p-3 rounded-xl border border-white/5">
                                                                        <p className="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                                            <TargetIcon size={12} /> {t("maintenanceShaftInfo")}
                                                                        </p>
                                                                        <div className="space-y-1.5 px-1">
                                                                            {record.motorGearData.shaftData?.shaftBend && (
                                                                                <div className="flex justify-between text-[11px]">
                                                                                    <span className="text-text-muted">{t("maintenanceShaftBend")}:</span>
                                                                                    <span className="text-text-primary font-medium">{record.motorGearData.shaftData.shaftBend}</span>
                                                                                </div>
                                                                            )}
                                                                            {record.motorGearData.shaftData?.dialGauge && (
                                                                                <div className="flex justify-between text-[11px]">
                                                                                    <span className="text-text-muted">{t("maintenanceDialGauge")}:</span>
                                                                                    <span className="text-text-primary font-medium">{record.motorGearData.shaftData.dialGauge}</span>
                                                                                </div>
                                                                            )}
                                                                            {(record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value) && (
                                                                                <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                                                                                    <span className="text-[10px] text-text-muted">{t("labelVibrationXYZ")}:</span>
                                                                                    <div className="flex gap-2">
                                                                                        {record.motorGearData.vibrationX?.value && (
                                                                                            <span className={`text-[10px] px-1 rounded ${record.motorGearData.vibrationX?.level === 'normal' ? 'bg-accent-green/10 text-accent-green' : record.motorGearData.vibrationX?.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                                                X: {record.motorGearData.vibrationX.value}
                                                                                            </span>
                                                                                        )}
                                                                                        {record.motorGearData.vibrationY?.value && (
                                                                                            <span className={`text-[10px] px-1 rounded ${record.motorGearData.vibrationY?.level === 'normal' ? 'bg-accent-green/10 text-accent-green' : record.motorGearData.vibrationY?.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                                                Y: {record.motorGearData.vibrationY.value}
                                                                                            </span>
                                                                                        )}
                                                                                        {record.motorGearData.vibrationZ?.value && (
                                                                                            <span className={`text-[10px] px-1 rounded ${record.motorGearData.vibrationZ?.level === 'normal' ? 'bg-accent-green/10 text-accent-green' : record.motorGearData.vibrationZ?.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow' : 'bg-accent-red/10 text-accent-red'}`}>
                                                                                                Z: {record.motorGearData.vibrationZ.value}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Checklist Audit Section (Desktop column 2) */}
                                                <div className="hidden lg:block">
                                                    {record.checklist && record.checklist.length > 0 && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                                                <CheckCircleIcon size={12} className="text-accent-green" /> {t("labelAuditChecklist")}
                                                            </p>
                                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                                                {record.checklist.map((item, idx) => (
                                                                    <div key={idx} className="flex flex-col p-2 rounded-lg bg-white/5 border border-white/5">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-[11px] text-text-secondary font-medium truncate">{item.item}</span>
                                                                            <span className={`text-[10px] font-bold ${item.completed ? 'text-accent-green' : 'text-accent-red'}`}>
                                                                                {item.completed ? 'PASS' : 'FAIL'}
                                                                            </span>
                                                                        </div>
                                                                        {item.value && (
                                                                            <span className="text-[10px] text-white/40 mt-1 italic font-mono">Value: {item.value}</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-40">
                            <ClockIcon size={48} className="mb-4" />
                            <p>{t("msgNoMatchingHistory")}</p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                    >
                        {t("actionCloseWindow")}
                    </button>
                </div>
            </div>
        </Modal >
    );
}
