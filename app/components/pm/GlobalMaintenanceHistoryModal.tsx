"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { MaintenanceRecord } from "../../types";
import { getMaintenanceRecords, getMachines } from "../../lib/firebaseService";
import { ClockIcon, UserIcon, FileTextIcon, CalendarIcon, BoxIcon, SettingsIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon, FilterIcon, CheckCircleIcon, CameraIcon, MapPinIcon } from "../ui/Icons";
import Image from "next/image";

interface GlobalMaintenanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalMaintenanceHistoryModal({ isOpen, onClose }: GlobalMaintenanceHistoryModalProps) {
    const { t } = useLanguage();
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [machines, setMachines] = useState<{ id: string, name: string, zone?: string, location?: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMachine, setSelectedMachine] = useState<string>("all");
    const [selectedZone, setSelectedZone] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all"); // YYYY-MM
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) return;
            setLoading(true);
            try {
                const [recordsData, machinesData] = await Promise.all([
                    getMaintenanceRecords(),
                    getMachines()
                ]);
                setRecords(recordsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setMachines(machinesData.map(m => ({ id: m.id, name: m.name, zone: m.zone, location: m.location })));
            } catch (error) {
                console.error("Error fetching global maintenance history:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isOpen]);

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            record.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.details?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMachine = selectedMachine === "all" || record.machineId === selectedMachine || record.machineName === selectedMachine;

        // Location (Zone) matching logic - updated to match Machines page (FZ, RTE, UT)
        let matchesZone = selectedZone === "all";
        if (!matchesZone) {
            const machine = machines.find(m => m.id === record.machineId || m.name === record.machineName);
            const machineLocation = machine?.location?.toUpperCase() || "";

            if (selectedZone === "UT") {
                matchesZone = machineLocation === "UT" || machineLocation === "UTILITY";
            } else {
                matchesZone = machineLocation === selectedZone;
            }
        }

        const recordDate = new Date(record.date);
        const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        const matchesMonth = selectedMonth === "all" || recordMonth === selectedMonth;

        return matchesSearch && matchesMachine && matchesZone && matchesMonth;
    });

    const getMonthOptions = () => {
        const months = new Set<string>();
        records.forEach(r => {
            const d = new Date(r.date);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(months).sort().reverse();
    };

    const getZoneOptions = () => {
        const zones = new Set<string>();
        machines.forEach(m => {
            if (m.zone) zones.add(m.zone);
        });
        return Array.from(zones).sort();
    };

    const toggleExpand = (id: string) => {
        setExpandedRecord(expandedRecord === id ? null : id);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="ประวัติการซ่อมบำรุงและผลการตรวจเช็ค" size="lg">
            <div className="space-y-6">
                {/* Search and Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-bg-tertiary/30 p-4 rounded-2xl border border-white/5">
                    <div className="relative">
                        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                            type="text"
                            placeholder="ค้นหาช่าง, รายละเอียด..."
                            className="input-field w-full pl-9 h-10 text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPinIcon size={14} className="text-text-muted shrink-0" />
                        <select
                            className="input-field w-full h-10 text-xs py-0"
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                        >
                            <option value="all">ทุกสถานที่</option>
                            {getZoneOptions().map(z => (
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
                            <option value="all">ทุกเครื่องจักร</option>
                            {machines.filter(m => {
                                if (selectedZone === 'all') return true;
                                const loc = m.location?.toUpperCase() || "";
                                if (selectedZone === 'UT') return loc === 'UT' || loc === 'UTILITY';
                                return loc === selectedZone;
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
                            <option value="all">ทุกช่วงเวลา</option>
                            {getMonthOptions().map(m => (
                                <option key={m} value={m}>{new Date(m).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</option>
                            ))}
                        </select>
                    </div>
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
                                onClick={() => setSelectedZone(loc.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2
                                    ${selectedZone === loc.id
                                        ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg`
                                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'}`}
                            >
                                {loc.label === 'All' ? 'ทั้งหมด' : loc.label}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${selectedZone === loc.id ? `bg-${loc.color} text-bg-primary` : 'bg-white/10 text-white/40'}`}>
                                    {loc.id === 'all' ? records.length : records.filter(r => {
                                        const m = machines.find(mach => mach.id === r.machineId || mach.name === r.machineName);
                                        const locUpper = m?.location?.toUpperCase() || "";
                                        if (loc.id === 'UT') return locUpper === 'UT' || locUpper === 'UTILITY';
                                        return locUpper === loc.id;
                                    }).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted px-2">
                        <p>พบประวัติทั้งหมด <span className="text-text-primary font-bold">{filteredRecords.length}</span> รายการ</p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-accent-blue" />
                                <span>PM</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-accent-red" />
                                <span>ซ่อมเร่งด่วน</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
                            <p>กำลังโหลดประวัติ...</p>
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
                                                    {new Date(record.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </span>
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
                                        <div className="space-y-4 pt-2 animate-fade-in">
                                            {/* Details Text Section */}
                                            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                <p className="text-xs font-bold text-text-muted uppercase mb-2 flex items-center gap-2">
                                                    <FileTextIcon size={12} /> รายละเอียดการทำงาน
                                                </p>
                                                <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                                                    {record.details}
                                                </div>
                                            </div>

                                            {/* Checklist Audit Section */}
                                            {record.checklist && record.checklist.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                                        <CheckCircleIcon size={12} className="text-accent-green" /> รายการตรวจเช็ค (Audit Checklist)
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

                                            {/* Evidence Photo */}
                                            {record.evidenceImageUrl && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-text-muted uppercase flex items-center gap-2">
                                                        <CameraIcon size={12} /> รูปถ่ายหลักฐาน
                                                    </p>
                                                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 group">
                                                        <Image
                                                            src={record.evidenceImageUrl}
                                                            alt="Evidence"
                                                            fill
                                                            className="object-cover transition-transform group-hover:scale-105"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-40">
                            <ClockIcon size={48} className="mb-4" />
                            <p>ไม่พบประวัติการซ่อมบำรุงที่ตรงกับเงื่อนไข</p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </Modal>
    );
}
