"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Machine, PMPlan } from "../../types";
import { CalendarIcon, ClockIcon, CheckCircleIcon, SettingsIcon, ActivityIcon, MapPinIcon, ChevronDownIcon } from "../ui/Icons";
import { addPMPlan, updatePMPlan, getParts } from "../../lib/firebaseService";

interface PMConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    machine: Machine;
    plan?: PMPlan;
    onSuccess?: () => void;
}

// Part-Checklist Mapping (รายการซ่อมบำรุงตามประเภทอะไหล่)
// NOTE: Specifically keeping these technical checklist items in Thai as per business requirements, 
// but UI controls around them are localized.
const PART_CHECKLIST_MAP: Record<string, string[]> = {
    // ระบบขับเคลื่อน
    "Motor": ["ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจแรงดันไฟฟ้า (Volt)", "วัดอุณหภูมิ", "วัดค่าสั่นสะเทือน (X/Y/Z)", "ตรวจสภาพมอเตอร์"],
    "Motor + Gear": ["เปลี่ยนถ่ายน้ำมันเกียร์", "ตรวจเช็คกระแสไฟฟ้า", "วัดอุณหภูมิ", "ตรวจสภาพฟันเกียร์"],
    "Gear Motor": ["เปลี่ยนถ่ายน้ำมันเกียร์", "ตรวจระดับน้ำมัน", "ตรวจเสียงผิดปกติ"],
    "Servo Motor": ["ตรวจเช็คพารามิเตอร์", "ตรวจ Encoder", "ตรวจสายไฟ"],
    "Blower Motor": ["ตรวจใบพัด", "ตรวจสั่นสะเทือน", "ทำความสะอาดพัดลม"],
    "Bearing": ["ตรวจเช็คสภาพแบริ่ง", "เปลี่ยนจารบี", "วัดค่าสั่นสะเทือน"],
    "Belt": ["ตรวจสภาพสายพาน", "ตรวจความตึงสายพาน", "ตรวจรอยแตกร้าว"],
    "สายพาน": ["ตรวจสภาพสายพาน", "ตรวจความตึงสายพาน", "ตรวจรอยแตกร้าว"],
    "Chain": ["ฉีดสารหล่อลื่น", "ตรวจความตึงโซ่", "ตรวจสภาพข้อโซ่"],
    "โซ่": ["ฉีดสารหล่อลื่น", "ตรวจความตึงโซ่", "ตรวจสภาพข้อโซ่"],

    // ระบบไฟฟ้าและควบคุม
    "VFD": ["ตรวจพารามิเตอร์", "ตรวจพัดลมระบายความร้อน", "ตรวจสายไฟ", "ทำความสะอาด"],
    "Temperature Sensor": ["Calibrate เซ็นเซอร์", "ตรวจค่าที่อ่านได้", "ตรวจสายสัญญาณ"],
    "Metal Detector": ["ตรวจความไว", "Calibrate เครื่อง", "ทดสอบ Test Piece"],

    // ระบบนิวเมติกส์
    "Pump": ["ตรวจแรงดัน", "ตรวจรอยรั่วซึม", "ตรวจซีล"],
    "Valve": ["ตรวจการเปิด-ปิด", "ตรวจรอยรั่ว", "ตรวจสภาพซีล"],
    "Pneumatic Valve": ["ตรวจการเปิด-ปิด", "ตรวจรอยรั่ว", "ตรวจสภาพซีล"],
    "Compressor": ["ตรวจแรงดัน", "เปลี่ยนไส้กรอง", "ตรวจระดับน้ำมัน", "ไล่น้ำในถังลม"],

    // ระบบทำความเย็น
    "Evaporator": ["ทำความสะอาดแผงคอยล์", "ตรวจละลายน้ำแข็ง", "ตรวจพัดลม"],
    "Chiller": ["ตรวจอุณหภูมิน้ำ", "ตรวจสารทำความเย็น", "ทำความสะอาดคอนเดนเซอร์"],
    "Fancoil Unit": ["ทำความสะอาดไส้กรอง", "ตรวจพัดลม", "ตรวจท่อน้ำ"],
    "Air Condition": ["ทำความสะอาดไส้กรอง", "ล้างคอยล์", "ตรวจสารทำความเย็น"],
    "Refrigerator": ["ตรวจอุณหภูมิ", "ทำความสะอาดคอนเดนเซอร์", "ตรวจซีลประตู"],
    "Cooling Tunnel": ["ตรวจอุณหภูมิ", "ทำความสะอาดสายพาน", "ตรวจระบบทำความเย็น"],

    // เครื่องจักรการผลิต
    "Mixer": ["ทำความสะอาดโถผสม", "ตรวจใบกวน", "เช็คน้ำมันเกียร์"],
    "Spiral Mixer": ["ทำความสะอาดโถผสม", "ตรวจใบกวน", "เช็คน้ำมันเกียร์"],
    "Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา"],
    "Rack Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา"],
    "Deck Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา"],
    "Combi Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจระบบไอน้ำ"],
    "Proofer": ["ตรวจอุณหภูมิ-ความชื้น", "ทำความสะอาดถาด", "ตรวจระบบไอน้ำ"],
    "Conveyor": ["ตรวจสายพาน", "ตรวจโรลเลอร์", "หล่อลื่นโซ่"],
    "Slicer": ["ลับใบมีด", "ทำความสะอาด", "ตรวจตั้งระยะใบมีด"],
    "Bread Slicer": ["ลับใบมีด", "ทำความสะอาด", "ตรวจตั้งระยะใบมีด"],
    "Depositor": ["ทำความสะอาดหัวจ่าย", "ตรวจวาล์ว", "Calibrate ปริมาณจ่าย"],
    "Packaging Machine": ["ตรวจซีล", "ตรวจอุณหภูมิ Sealing", "ทำความสะอาด"],
    "Vacuum Cooler": ["ตรวจสุญญากาศ", "ตรวจซีลประตู", "ทำความสะอาดถาด"],
};

export default function PMConfigModal({ isOpen, onClose, machine, plan, onSuccess }: PMConfigModalProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);

    const [selectedMaintenanceType, setSelectedMaintenanceType] = useState(plan?.taskName || "");
    const [customMaintenanceName, setCustomMaintenanceName] = useState("");
    const [checklistItems, setChecklistItems] = useState<string[]>(plan?.checklistItems || []);
    const [newItem, setNewItem] = useState("");
    const [selectedPartType, setSelectedPartType] = useState("");

    const [scheduleType, setScheduleType] = useState<"monthly" | "weekly">(plan?.scheduleType || "monthly");
    const [cycleMonths, setCycleMonths] = useState<number>(plan?.cycleMonths || 1);
    const [weeklyDay, setWeeklyDay] = useState<number>(plan?.weeklyDay || 1);

    const [startDate, setStartDate] = useState(
        plan?.startDate
            ? new Date(plan.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );

    const [selectedLocation, setSelectedLocation] = useState(plan?.customLocation || machine.Location || "");
    const [customLocation, setCustomLocation] = useState("");
    const [useCustomLocation, setUseCustomLocation] = useState(plan?.locationType === "custom");

    const [allPartNames, setAllPartNames] = useState<string[]>([]);
    const [allLocations, setAllLocations] = useState<string[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    const CYCLE_OPTIONS = [
        { label: `1 ${t("labelMonths")}`, value: 1 },
        { label: `2 ${t("labelMonths")}`, value: 2 },
        { label: `3 ${t("labelMonths")}`, value: 3 },
        { label: `6 ${t("labelMonths")}`, value: 6 },
        { label: `9 ${t("labelMonths")}`, value: 9 },
        { label: `12 ${t("labelMonths")}`, value: 12 },
    ];

    useEffect(() => {
        if (isOpen) {
            fetchPartsData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (plan) {
            setSelectedMaintenanceType(plan.taskName || "");
            setChecklistItems(plan.checklistItems || []);
            setSelectedLocation(plan.customLocation || machine.Location || "");
            setUseCustomLocation(plan.locationType === "custom");
        }
    }, [plan, machine.Location]);

    const fetchPartsData = async () => {
        setLoadingData(true);
        try {
            const parts = await getParts();
            const uniquePartNames = Array.from(new Set(parts.map(p => p.partName).filter(Boolean))).sort();
            setAllPartNames(uniquePartNames);
            const uniqueLocations = Array.from(new Set(parts.map(p => p.Location).filter(Boolean))).sort();
            setAllLocations(uniqueLocations);
        } catch (error) {
            console.error("Error fetching parts data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const addChecklistItem = () => {
        if (newItem.trim()) {
            setChecklistItems([...checklistItems, newItem.trim()]);
            setNewItem("");
        }
    };

    const removeChecklistItem = (index: number) => {
        setChecklistItems(checklistItems.filter((_, i) => i !== index));
    };

    const handleAddSuggestedItem = (item: string) => {
        if (!checklistItems.includes(item)) {
            setChecklistItems([...checklistItems, item]);
        }
    };

    const getSuggestedItems = (): string[] => {
        if (!selectedPartType) return [];
        if (PART_CHECKLIST_MAP[selectedPartType]) return PART_CHECKLIST_MAP[selectedPartType];
        for (const [key, items] of Object.entries(PART_CHECKLIST_MAP)) {
            if (selectedPartType.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(selectedPartType.toLowerCase())) {
                return items;
            }
        }
        return [];
    };

    const getTaskName = () => {
        if (selectedMaintenanceType === t("labelOtherCustom") || selectedMaintenanceType === "อื่นๆ") return customMaintenanceName;
        return selectedMaintenanceType;
    };

    const getLocation = () => {
        if (useCustomLocation) return customLocation;
        return selectedLocation;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const taskName = getTaskName();
        if (!taskName) return;
        setLoading(true);

        try {
            const start = new Date(startDate);
            const finalNextDueDate = new Date(startDate);

            const planData: any = {
                taskName,
                checklistItems,
                scheduleType,
                cycleMonths: scheduleType === 'monthly' ? cycleMonths : undefined,
                weeklyDay: scheduleType === 'weekly' ? weeklyDay : undefined,
                startDate: start,
                nextDueDate: finalNextDueDate,
                locationType: useCustomLocation ? 'custom' : 'machine_Location',
                customLocation: getLocation(),
            };

            if (plan) {
                await updatePMPlan(plan.id, planData);
            } else {
                await addPMPlan({
                    machineId: machine.id,
                    machineName: machine.name,
                    ...planData,
                    status: "active",
                    completedCount: 0
                });
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Error saving PM plan:", error);
        } finally {
            setLoading(false);
        }
    };

    const suggestedItems = getSuggestedItems();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("pmConfigTitle")}>
            <div className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-bg-tertiary border-white/5">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-inner bg-bg-secondary text-accent-blue">
                        <SettingsIcon size={28} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-text-primary">{machine.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
                            <span className="bg-bg-secondary px-2 py-0.5 rounded text-xs border border-white/5">
                                {machine.Location}
                            </span>
                            <span>•</span>
                            <span>{machine.location}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                            <ActivityIcon size={14} className="text-accent-blue" />
                            {t("labelMaintenanceType")}
                        </label>
                        <div className="relative">
                            <select
                                required
                                className="input-field w-full text-lg font-semibold appearance-none cursor-pointer"
                                value={selectedMaintenanceType}
                                onChange={(e) => {
                                    setSelectedMaintenanceType(e.target.value);
                                    if (e.target.value !== t("labelOtherCustom") && e.target.value !== "อื่นๆ") {
                                        setSelectedPartType(e.target.value);
                                    }
                                }}
                            >
                                <option value="">{t("placeholderSelectMaintenanceType")}</option>
                                {allPartNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                                <option value="อื่นๆ">{t("labelOtherCustom")}</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                <ChevronDownIcon size={16} />
                            </div>
                        </div>

                        {(selectedMaintenanceType === "อื่นๆ" || selectedMaintenanceType === t("labelOtherCustom")) && (
                            <input
                                type="text"
                                required
                                placeholder={t("placeholderSpecifyMaintenanceName")}
                                className="input-field w-full mt-2 bg-accent-blue/5 border-accent-blue/30 focus:border-accent-blue"
                                value={customMaintenanceName}
                                onChange={(e) => setCustomMaintenanceName(e.target.value)}
                                autoFocus
                            />
                        )}
                    </div>

                    <div className="space-y-3 bg-bg-secondary/30 p-4 rounded-xl border border-white/5">
                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircleIcon size={14} className="text-accent-blue" />
                                {t("labelChecklist")}
                            </div>
                            <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded-full">
                                {checklistItems.length} {t("statFoundHistorySuffix")}
                            </span>
                        </label>

                        <div className="space-y-2">
                            <label className="text-[10px] text-text-muted">{t("labelSelectPartTypeSuggestion")}</label>
                            <div className="relative">
                                <select
                                    className="input-field w-full text-sm appearance-none cursor-pointer"
                                    value={selectedPartType}
                                    onChange={(e) => setSelectedPartType(e.target.value)}
                                >
                                    <option value="">{t("placeholderSelectPartType")}</option>
                                    {Object.keys(PART_CHECKLIST_MAP).map(partType => (
                                        <option key={partType} value={partType}>{partType}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                    <ChevronDownIcon size={14} />
                                </div>
                            </div>
                        </div>

                        {suggestedItems.length > 0 && (
                            <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-3">
                                <p className="text-[10px] text-accent-blue font-bold mb-2">{t("labelSuggestedItems")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedItems.map((item, idx) => {
                                        const isAdded = checklistItems.includes(item);
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleAddSuggestedItem(item)}
                                                disabled={isAdded}
                                                className={`text-[11px] px-2 py-1 rounded-lg border transition-all ${isAdded
                                                    ? 'bg-accent-green/20 border-accent-green/30 text-accent-green cursor-default'
                                                    : 'bg-bg-tertiary border-white/10 hover:border-accent-blue hover:text-accent-blue cursor-pointer'
                                                    }`}
                                            >
                                                {isAdded ? '✓' : '+'} {item}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t("placeholderAddSubItem")}
                                className="input-field flex-1 text-sm"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                            />
                            <button
                                type="button"
                                onClick={addChecklistItem}
                                className="bg-accent-blue text-white w-10 h-10 rounded-lg flex items-center justify-center hover:bg-accent-blue/90 transition-all"
                            >
                                +
                            </button>
                        </div>

                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                            {checklistItems.length === 0 && (
                                <p className="text-center text-sm text-text-muted/50 py-2 italic">{t("msgNoItems")}</p>
                            )}
                            {checklistItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-bg-tertiary px-3 py-2 rounded-lg border border-white/5 group">
                                    <span className="text-sm text-text-primary">{idx + 1}. {item}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeChecklistItem(idx)}
                                        className="text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <ClockIcon size={14} className="text-accent-blue" />
                                    {t("labelTimeFormat")}
                                </label>
                                <div className="flex bg-bg-tertiary p-1 rounded-lg border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('monthly')}
                                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${scheduleType === 'monthly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'}`}
                                    >
                                        {t("labelMonthly")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('weekly')}
                                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${scheduleType === 'weekly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'}`}
                                    >
                                        {t("labelWeekly")}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                    {scheduleType === 'monthly' ? t("labelEveryMonthly") : t("labelEveryWeekly")}
                                </label>
                                {scheduleType === 'monthly' ? (
                                    <div className="relative">
                                        <select
                                            className="input-field w-full appearance-none"
                                            value={cycleMonths}
                                            onChange={(e) => setCycleMonths(Number(e.target.value))}
                                        >
                                            {CYCLE_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                            ▼
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => setWeeklyDay(d)}
                                                className={`py-2 text-xs font-bold rounded-lg border transition-all ${weeklyDay === d
                                                    ? 'bg-accent-blue border-accent-blue text-white'
                                                    : 'bg-bg-tertiary border-white/5 text-text-muted hover:border-white/20'
                                                    }`}
                                            >
                                                {[t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")][d]}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <CalendarIcon size={14} className="text-accent-blue" />
                                    {t("labelFirstStartDate")}
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="input-field w-full"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <MapPinIcon size={14} className="text-accent-blue" />
                                    {t("labelWorkLocation")}
                                </label>
                                <div className="relative">
                                    <select
                                        className="input-field w-full appearance-none cursor-pointer"
                                        value={useCustomLocation ? "custom" : selectedLocation}
                                        onChange={(e) => {
                                            if (e.target.value === "custom") {
                                                setUseCustomLocation(true);
                                            } else {
                                                setUseCustomLocation(false);
                                                setSelectedLocation(e.target.value);
                                            }
                                        }}
                                    >
                                        <option value="">{t("placeholderSelectLocation")}</option>
                                        {allLocations.map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                        <option value="custom">{t("labelOtherCustom")}</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                        <ChevronDownIcon size={14} />
                                    </div>
                                </div>
                                {useCustomLocation && (
                                    <input
                                        type="text"
                                        placeholder={t("placeholderSpecifyLocation")}
                                        className="input-field w-full bg-accent-blue/5 border-accent-blue/30 focus:border-accent-blue"
                                        value={customLocation}
                                        onChange={(e) => setCustomLocation(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-bg-tertiary text-text-primary font-bold hover:bg-white/10 transition-colors"
                        >
                            {t("actionCancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-blue/20"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <CheckCircleIcon size={18} />
                                    {t("actionSavePlan")}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
