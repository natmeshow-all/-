"use client";

import React, { useState, useEffect, useMemo } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Part, MaintenanceRecord, Machine } from "../../types";
import { getParts, addMaintenanceRecord, updatePart, getMachines } from "../../lib/firebaseService";
import { BoxIcon, CalendarIcon, ClockIcon, AlertTriangleIcon, ActivityIcon, CheckCircleIcon, HistoryIcon, RefreshCwIcon, SettingsIcon } from "../ui/Icons";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface PartReplacementPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    machineId?: string; // Optional: if provided, locks to this machine
    machineName?: string;
    onViewHistory: () => void; // Callback to open PM History
    fromPMHistory?: boolean; // Flag when opened from PM History page
}

export default function PartReplacementPlanModal({ isOpen, onClose, machineId: initialMachineId, machineName: initialMachineName, onViewHistory, fromPMHistory }: PartReplacementPlanModalProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    
    const [allParts, setAllParts] = useState<Part[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachineId, setSelectedMachineId] = useState<string>(initialMachineId || "");
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedMachineId(initialMachineId || "");
            loadData();
        }
    }, [isOpen, initialMachineId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [partsData, machinesData] = await Promise.all([
                getParts(),
                getMachines()
            ]);
            setAllParts(partsData);
            setMachines(machinesData);
            
            // If no machine selected and we have machines, select the first one that has parts
            if (!initialMachineId && machinesData.length > 0) {
                const machinesWithParts = machinesData.filter(m => partsData.some(p => p.machineId === m.id));
                if (machinesWithParts.length > 0) {
                    setSelectedMachineId(machinesWithParts[0].id);
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
            showError("เกิดข้อผิดพลาดในการดึงข้อมูล", "Error");
        } finally {
            setLoading(false);
        }
    };

    const displayedParts = useMemo(() => {
        if (!selectedMachineId) return [];
        return allParts.filter(p => p.machineId === selectedMachineId);
    }, [allParts, selectedMachineId]);

    const handleReplacePart = async (part: Part) => {
        if (!confirm(`ยืนยันการเปลี่ยนอะไหล่ ${part.partName} และเริ่มนับเวลาใหม่?`)) return;
        
        setProcessingId(part.id);
        try {
            const now = new Date();
            const currentMachine = machines.find(m => m.id === part.machineId);
            
            // 1. Update Part's lastReplacedDate
            await updatePart(part.id, {
                ...part,
                lastReplacedDate: now.toISOString()
            });
            
            // 2. Create Maintenance Record
            const record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt"> = {
                machineId: part.machineId || selectedMachineId,
                machineName: currentMachine?.name || initialMachineName || "Unknown Machine",
                description: `เปลี่ยนอะไหล่: ${part.partName}`,
                type: "partReplacement",
                priority: "normal",
                status: "completed",
                date: now,
                technician: user?.displayName || "Technician",
                details: `เปลี่ยนอะไหล่ ${part.partName} เข้าสู่รอบการใช้งานใหม่`,
                location: part.Location || part.location || currentMachine?.Location || currentMachine?.location || "",
                Location: part.Location || part.location || currentMachine?.Location || currentMachine?.location || ""
            };
            
            await addMaintenanceRecord(record);
            
            success(`บันทึกการเปลี่ยนอะไหล่ ${part.partName} สำเร็จ`);
            await loadData();
        } catch (error) {
            console.error("Error replacing part:", error);
            showError("เกิดข้อผิดพลาดในการบันทึก", "Error");
        } finally {
            setProcessingId(null);
        }
    };

    // Calculate time elapsed
    const calculateLifespan = (lastReplaced: Date | string | undefined) => {
        if (!lastReplaced) return null;
        const start = new Date(lastReplaced);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);
        const remainingDays = days % 365;
        const months = Math.floor(remainingDays / 30);
        const finalDays = remainingDays % 30;
        
        return { years, months, days: finalDays, totalDays: days };
    };

    const currentMachineName = initialMachineName || machines.find(m => m.id === selectedMachineId)?.name || "เลือกเครื่องจักร";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`แผนเปลี่ยนอะไหล่: ${currentMachineName}`} size="lg">
            <div className="space-y-4">
                {/* Banner: Opened from PM History */}
                {fromPMHistory && (
                    <div className="flex items-center gap-2 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl px-4 py-2.5">
                        <span className="text-accent-yellow text-sm">⚠️</span>
                        <div>
                            <span className="text-accent-yellow text-xs font-bold">แผนนี้มาจากงาน PM</span>
                            <p className="text-text-muted text-[11px] mt-0.5">พบรายการที่ถึงกำหนดเปลี่ยนจากการตรวจสอบ PM กรุณาเปลี่ยนอะไหล่และกดบันทึกเพื่อรีเซ็ตการจับเวลา</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                    {!initialMachineId ? (
                        <div className="w-full sm:w-1/2">
                            <label className="text-xs text-text-muted mb-1 block">เลือกระบบ / เครื่องจักร</label>
                            <div className="relative">
                                <SettingsIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <select 
                                    className="input-field w-full pl-9 h-10 text-sm"
                                    value={selectedMachineId}
                                    onChange={(e) => setSelectedMachineId(e.target.value)}
                                >
                                    <option value="" disabled>-- เลือกเครื่องจักร --</option>
                                    {machines.filter(m => allParts.some(p => p.machineId === m.id)).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} {m.location ? `[${m.location}]` : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted">
                            ระบบจะคำนวณอายุการใช้งานของอะไหล่แต่ละชิ้นโดยอัตโนมัติ
                        </p>
                    )}
                    <button 
                        onClick={() => {
                            onClose();
                            onViewHistory();
                        }}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2 mt-auto"
                    >
                        <HistoryIcon size={14} />
                        ดูประวัติงาน PM / เปลี่ยนอะไหล่
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                    </div>
                ) : displayedParts.length === 0 ? (
                    <div className="bg-white/5 border border-white/5 rounded-xl py-12 flex flex-col items-center justify-center text-center">
                        <BoxIcon size={40} className="text-white/20 mb-3" />
                        <h3 className="text-white font-medium mb-1">ยังไม่มีรายการอะไหล่</h3>
                        <p className="text-text-muted text-sm">เพิ่มอะไหล่ในเมนูจัดการอะไหล่และผูกกับเครื่องจักรนี้</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayedParts.map(part => {
                            const lifespan = calculateLifespan(part.lastReplacedDate);
                            const expectedDays = part.expectedLifespanDays || 365; // Default 1 year if not set
                            
                            // Determine status
                            let statusColor = "bg-accent-green/10 text-accent-green border-accent-green/20";
                            let statusIcon = <CheckCircleIcon size={14} />;
                            let statusText = "ปกติ";
                            
                            if (lifespan) {
                                if (lifespan.totalDays >= expectedDays) {
                                    statusColor = "bg-accent-red/10 text-accent-red border-accent-red/20";
                                    statusIcon = <AlertTriangleIcon size={14} />;
                                    statusText = "ถึงกำหนดเปลี่ยน";
                                } else if (lifespan.totalDays >= expectedDays * 0.8) {
                                    statusColor = "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20";
                                    statusIcon = <ActivityIcon size={14} />;
                                    statusText = "ใกล้ถึงกำหนด";
                                }
                            }

                            return (
                                <div key={part.id} className="bg-bg-tertiary border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:border-white/20 transition-all">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-white text-base">{part.partName}</h4>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${statusColor}`}>
                                                {statusIcon}
                                                {statusText}
                                            </div>
                                        </div>
                                        <p className="text-xs text-text-muted mb-3 flex items-center gap-1">
                                            <BoxIcon size={12} /> {part.brand || '-'} | {part.modelSpec || '-'}
                                        </p>
                                        
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs">
                                                <CalendarIcon size={14} className="text-accent-blue" />
                                                <span className="text-text-secondary">เปลี่ยนล่าสุด:</span>
                                                <span className="text-white font-medium">
                                                    {part.lastReplacedDate ? new Date(part.lastReplacedDate).toLocaleDateString('th-TH') : "ไม่เคยบันทึก"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <ClockIcon size={14} className="text-accent-yellow" />
                                                <span className="text-text-secondary">อายุการใช้งาน:</span>
                                                <span className="text-accent-yellow font-bold">
                                                    {lifespan 
                                                        ? `${lifespan.years > 0 ? `${lifespan.years} ปี ` : ''}${lifespan.months > 0 ? `${lifespan.months} เดือน ` : ''}${lifespan.days} วัน` 
                                                        : "เริ่มนับเมื่อมีการเปลี่ยนครั้งแรก"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full sm:w-auto">
                                        <button 
                                            onClick={() => handleReplacePart(part)}
                                            disabled={processingId === part.id}
                                            className="w-full sm:w-auto px-4 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {processingId === part.id ? (
                                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-accent-blue"></span>
                                            ) : (
                                                <RefreshCwIcon size={14} />
                                            )}
                                            บันทึกเปลี่ยนอะไหล่ชิ้นนี้
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
