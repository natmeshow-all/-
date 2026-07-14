"use client";

import React, { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { PMPlan, Part } from "../../types";
import { CheckCircleIcon, ActivityIcon, FileTextIcon, ClockIcon, AlertTriangleIcon, BoxIcon, PlusIcon, XIcon } from "../ui/Icons";
import { completePMTask, addMaintenanceRecord, getPartsByMachine } from "../../lib/firebaseService";
import { useToast } from "../../contexts/ToastContext";
import PartReplacementPlanModal from "./PartReplacementPlanModal";
import { toJpeg } from "html-to-image";
import { PMReportCard } from "./PMReportCard";
import { getMaintenanceRecordsByMachine } from "../../services/maintenanceService";
import { getMachine } from "../../services/machineService";

interface PMExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PMPlan;
    onSuccess?: () => void;
}

interface ChecklistItemResult {
    completed: boolean;
    value: string;
}

// Due part entry created when "ถึงกำหนดเปลี่ยน" is selected
interface DuePart {
    checklistIndex: number;
    checklistLabel: string;  // original checklist item text
    partName: string;        // ชื่ออะไหล่ที่จะเปลี่ยน
    notes: string;
    confirmed: boolean;      // user confirmed adding to plan
}

// ===== Smart Input Type Detection =====
type InputFieldType =
    | "current"       // กระแสไฟฟ้า → number + A
    | "voltage"       // แรงดันไฟฟ้า → L1, L2, L3 + V
    | "vibration"     // สั่นสะเทือน → X, Y, Z + mm/s
    | "temperature"   // อุณหภูมิ → number + °C
    | "resistance"    // ความต้านทาน → number + Ω
    | "oil_change"    // เปลี่ยนถ่ายน้ำมัน → number + ลิตร
    | "grease"        // เปลี่ยนจารบี → number + g
    | "tension"       // ตรวจความตึง → เหมาะสม / ตึงไป / หย่อนไป / ต้องปรับ
    | "pressure"      // ตรวจแรงดัน (ไม่ใช่ไฟ) → ปกติ / สูงไป / ต่ำไป / ต้องตรวจสอบ
    | "condition"     // ตรวจสภาพ (ชิ้นส่วน) → สมบูรณ์ / พอใช้ / ถึงกำหนดเปลี่ยน
    | "level"         // ตรวจระดับน้ำมัน → ปกติ / ต่ำ / ต้องเติม
    | "leak"          // ตรวจรอยรั่ว/แตก → ไม่มี / เล็กน้อย / มาก
    | "sound"         // ตรวจเสียง → ปกติ / ผิดปกติ
    | "done"          // ทำความสะอาด / หล่อลื่น / Calibrate → เรียบร้อย / บางส่วน / ยังไม่ได้ทำ
    | "text";         // default free-text

function detectInputType(label: string): InputFieldType {
    const l = label.toLowerCase();

    // ── Numeric measurements (must come first) ──────────────────────────────
    if (l.includes("กระแส") || l.includes("amp") || l.includes("current") || l.includes("แอมแปร์")) return "current";
    if (l.includes("แรงดันไฟ") || l.includes("volt") || l.includes("voltage") || l.includes("โวลต์")) return "voltage";
    if (l.includes("สั่นสะเทือน") || l.includes("vibrat") || l.includes("x/y/z")) return "vibration";
    if (l.includes("อุณหภูมิ") || l.includes("temp") || l.includes("temperature") || l.includes("เทอร์โม")) return "temperature";
    if (l.includes("ความต้านทาน") || l.includes("ohm") || l.includes("โอห์ม") || l.includes("resistance") || l.includes("megger")) return "resistance";

    // ── Oil / Grease ────────────────────────────────────────────────────────
    if (l.includes("เปลี่ยนถ่ายน้ำมัน") || l.includes("oil change") || l.includes("ถ่ายน้ำมัน")) return "oil_change";
    if (l.includes("เปลี่ยนน้ำมัน") || l.includes("เช็คน้ำมัน") || l.includes("น้ำมันเกียร์")) return "oil_change";
    if (l.includes("จารบี") || l.includes("grease")) return "grease";

    // ── Tension checks (ความตึง) ────────────────────────────────────────────
    if (l.includes("ความตึง") || l.includes("tension") || l.includes("ตรวจตึง")) return "tension";

    // ── Pressure checks (แรงดัน non-electrical) ─────────────────────────────
    if (l.includes("แรงดัน") || l.includes("pressure") || l.includes("สุญญากาศ")) return "pressure";

    // ── Leak / crack checks ─────────────────────────────────────────────────
    if (
        l.includes("รอยรั่ว") || l.includes("รอยแตก") || l.includes("รั่วซึม") ||
        l.includes("ตรวจรอย") || l.includes("leak") || l.includes("crack")
    ) return "leak";

    // ── Condition checks (parts, wiring, safety, general inspection) ──────────
    if (
        l.includes("ตรวจสภาพ") || l.includes("สภาพ") || l.includes("ตรวจสอบ") ||
        l.includes("ตรวจพัดลม") || l.includes("ตรวจฮีตเตอร์") || l.includes("ตรวจ tem") ||
        l.includes("ตรวจซีล") || l.includes("ตรวจใบพัด") || l.includes("ตรวจใบมีด") ||
        l.includes("ตรวจความไว") || l.includes("ตรวจการสึกหรอ") ||
        l.includes("ตรวจการหมุน") || l.includes("ตรวจการเปิด-ปิด") || l.includes("ตรวจการทำงาน") ||
        l.includes("ตรวจการ alignment") || l.includes("ตรวจ encoder") ||
        l.includes("ตรวจสาย") || l.includes("ขั้วต่อ") || l.includes("ตรวจคอยล์") ||
        l.includes("ตรวจ breaker") || l.includes("ตรวจ fuse") || l.includes("ตรวจ led") ||
        l.includes("ตรวจ safety") || l.includes("ตรวจเบรก") || l.includes("ตรวจสลัก") ||
        l.includes("ตรวจแคลมป์") || l.includes("ตรวจยาง") || l.includes("ตรวจ hook") ||
        l.includes("ตรวจหัวสปริงเกอร์") || l.includes("ตรวจขอเอ็น") ||
        l.includes("ตรวจคุณภาพ") || l.includes("ตรวจวันหมดอายุ") ||
        l.includes("ตรวจหัวจ่าย") || l.includes("ตรวจแรงขัน") || l.includes("ตรวจระยะ") ||
        l.includes("ตรวจตำแหน่ง") || l.includes("ตรวจบานพับ") || l.includes("ตรวจเฟือง") ||
        l.includes("ตรวจ gauge") || l.includes("ตรวจ safety lip") || l.includes("ตรวจ")
    ) return "condition";

    // ── Level checks ─────────────────────────────────────────────────────────
    if (l.includes("ระดับน้ำมัน") || l.includes("ระดับน้ำ") || l.includes("ระดับ") || l.includes("level")) return "level";

    // ── Sound checks ─────────────────────────────────────────────────────────
    if (l.includes("เสียงผิดปกติ") || l.includes("เสียง") || l.includes("noise") || l.includes("sound")) return "sound";

    // Done-type tasks (cleaning, lubrication, calibration, replacement actions)
    if (
        l.includes("ทำความสะอาด") || l.includes("ล้าง") || l.includes("ฉีดสารหล่อลื่น") ||
        l.includes("หล่อลื่น") || l.includes("lubricate") || l.includes("clean") ||
        l.includes("calibrat") || l.includes("ไล่น้ำ") || l.includes("เปลี่ยนไส้กรอง") ||
        l.includes("ทดสอบ") || l.includes("ตรวจ encoder") || l.includes("ตรวจพารามิเตอร์") ||
        // เพิ่ม done-type ใหม่
        l.includes("ลับใบมีด") || l.includes("alignment") || l.includes("เปลี่ยนซีล") ||
        l.includes("ไล่ตะกรัน") || l.includes("blow down") || l.includes("blow") ||
        l.includes("descale") || l.includes("เติมเกลือ") || l.includes("เติมน้ำมัน") ||
        l.includes("เปลี่ยนน้ำมัน") || l.includes("เปลี่ยนแบตเตอรี่") || l.includes("เปลี่ยนยาง") ||
        l.includes("เปลี่ยนเมมเบรน") || l.includes("เปลี่ยนไส้") ||
        l.includes("ทดสอบเดินเครื่อง") || l.includes("ทดสอบระบบ") ||
        l.includes("auto drain") || l.includes("dosing") || l.includes("regeneration") ||
        l.includes("เติมสารเคมี") || l.includes("เปลี่ยนหมึก")
    ) return "done";

    return "text";
}

// ===== Auto-fill default values by type =====
function getDefaultValue(label: string): string {
    const type = detectInputType(label);
    switch (type) {
        case "done":       return "เรียบร้อย";
        case "condition":  return "สมบูรณ์";
        case "tension":    return "เหมาะสม";
        case "pressure":   return "ปกติ";
        case "level":      return "ปกติ";
        case "leak":       return "ไม่มี";
        case "sound":      return "ปกติ";
        // Numeric types — leave blank for actual measurement
        case "current":
        case "voltage":
        case "vibration":
        case "temperature":
        case "resistance":
        case "oil_change":
        case "grease":
        default:           return "";
    }
}

// Encode multi-field (e.g. L1/L2/L3 or X/Y/Z) into a single string
function encodeMultiValue(fields: Record<string, string>): string {
    return Object.entries(fields)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");
}

function decodeMultiValue(value: string, keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    keys.forEach((k) => (result[k] = ""));
    if (!value) return result;
    value.split(",").forEach((part) => {
        const [k, v] = part.split(":").map((s) => s.trim());
        if (k && v !== undefined && keys.includes(k)) result[k] = v;
    });
    return result;
}

// ===== Preset Option Button Group =====
interface PresetButtonsProps {
    options: { label: string; color: string; bg: string; border: string }[];
    value: string;
    onChange: (val: string) => void;
    allowCustom?: boolean;
    customPlaceholder?: string;
}

function PresetButtons({ options, value, onChange, allowCustom = false, customPlaceholder }: PresetButtonsProps) {
    const isCustom = value !== "" && !options.find((o) => o.label === value);
    const [showCustom, setShowCustom] = useState(isCustom);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.label}
                        type="button"
                        onClick={() => { onChange(opt.label); setShowCustom(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${value === opt.label
                            ? `${opt.bg} ${opt.border} ${opt.color} shadow-sm scale-105`
                            : "bg-white/5 border-white/10 text-text-muted hover:border-white/25 hover:text-white"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
                {allowCustom && (
                    <button
                        type="button"
                        onClick={() => setShowCustom(!showCustom)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showCustom ? "bg-white/10 border-white/30 text-white" : "bg-white/5 border-white/10 text-text-muted hover:border-white/25"}`}
                    >
                        + บันทึกเพิ่มเติม
                    </button>
                )}
            </div>
            {allowCustom && showCustom && (
                <input
                    type="text"
                    placeholder={customPlaceholder || "รายละเอียดเพิ่มเติม..."}
                    value={isCustom ? value : ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="input-field text-xs w-full bg-black/20"
                />
            )}
        </div>
    );
}

// ===== Smart Checklist Input Component =====
interface SmartChecklistInputProps {
    item: string;
    value: string;
    onChange: (value: string) => void;
    onQueueReplacement?: () => void;
    isQueued?: boolean;
}

function SmartChecklistInput({ item, value, onChange, onQueueReplacement, isQueued }: SmartChecklistInputProps) {
    const type = detectInputType(item);

    // --- Current (A) ---
    if (type === "current") {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="number" step="0.01" placeholder="0.00"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="input-field text-xs flex-1 bg-black/20 min-w-0"
                />
                <span className="text-xs font-bold text-accent-blue shrink-0 px-2 py-1.5 bg-accent-blue/10 border border-accent-blue/30 rounded-md min-w-[32px] text-center">
                    A
                </span>
            </div>
        );
    }

    // --- Temperature (°C) ---
    if (type === "temperature") {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="number" step="0.1" placeholder="0.0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="input-field text-xs flex-1 bg-black/20 min-w-0"
                />
                <span className="text-xs font-bold text-orange-400 shrink-0 px-2 py-1.5 bg-orange-400/10 border border-orange-400/30 rounded-md min-w-[40px] text-center">
                    °C
                </span>
            </div>
        );
    }

    // --- Resistance (Ω) ---
    if (type === "resistance") {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="number" step="0.01" min="0" placeholder="0.00"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="input-field text-xs flex-1 bg-black/20 min-w-0"
                />
                <span className="text-xs font-bold text-rose-400 shrink-0 px-2 py-1.5 bg-rose-400/10 border border-rose-400/30 rounded-md min-w-[40px] text-center">
                    Ω
                </span>
            </div>
        );
    }

    // --- Tension (ความตึง) ---
    if (type === "tension") {
        return (
            <PresetButtons
                options={[
                    { label: "เหมาะสม", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                    { label: "ตึงไป", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "หย่อนไป", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "ต้องปรับ", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                ]}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder="หมายเหตุเพิ่มเติม..."
            />
        );
    }

    // --- Pressure (แรงดัน non-electrical) ---
    if (type === "pressure") {
        return (
            <PresetButtons
                options={[
                    { label: "ปกติ", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                    { label: "สูงไป", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "ต่ำไป", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "ต้องตรวจสอบ", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                ]}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder="ระบุค่าแรงดัน..."
            />
        );
    }

    // --- Voltage L1/L2/L3 (V) ---
    if (type === "voltage") {
        const keys = ["L1", "L2", "L3"];
        const fields = decodeMultiValue(value, keys);
        const handleField = (key: string, val: string) => onChange(encodeMultiValue({ ...fields, [key]: val }));
        return (
            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-yellow-400/80">แรงดันไฟ (V)</p>
                <div className="grid grid-cols-3 gap-2">
                    {keys.map((key) => (
                        <div key={key} className="flex flex-col gap-1 items-center">
                            <span className="text-[11px] font-bold text-yellow-400 tracking-wider">{key}</span>
                            <input
                                type="number" step="0.1" placeholder="0.0"
                                value={fields[key]}
                                onChange={(e) => handleField(key, e.target.value)}
                                className="input-field text-xs w-full bg-black/20 text-center"
                            />
                            <span className="text-[10px] text-text-muted">V</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- Vibration X/Y/Z (mm/s) ---
    if (type === "vibration") {
        const keys = ["X", "Y", "Z"];
        const fields = decodeMultiValue(value, keys);
        const handleField = (key: string, val: string) => onChange(encodeMultiValue({ ...fields, [key]: val }));
        const levelColor = (v: string) => {
            const n = parseFloat(v);
            if (isNaN(n) || v === "") return "text-purple-400";
            if (n < 2.8) return "text-green-400";
            if (n < 7.1) return "text-yellow-400";
            return "text-red-400";
        };
        return (
            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-purple-400/80">ค่าสั่นสะเทือน (mm/s)</p>
                <div className="grid grid-cols-3 gap-2">
                    {keys.map((key) => (
                        <div key={key} className="flex flex-col gap-1 items-center">
                            <span className={`text-[11px] font-bold tracking-wider ${levelColor(fields[key])}`}>{key}</span>
                            <input
                                type="number" step="0.01" placeholder="0.00"
                                value={fields[key]}
                                onChange={(e) => handleField(key, e.target.value)}
                                className="input-field text-xs w-full bg-black/20 text-center"
                            />
                            <span className="text-[10px] text-text-muted">mm/s</span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-3 text-[10px] text-text-muted pt-0.5">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />{"< 2.8 ปกติ"}</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />{"2.8–7.1 เฝ้าระวัง"}</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />{"> 7.1 ผิดปกติ"}</span>
                </div>
            </div>
        );
    }

    // --- Oil Change (ลิตร) ---
    if (type === "oil_change") {
        // Parse "X.X ลิตร" or just number
        const numVal = value.replace(/[^0-9.]/g, "");
        return (
            <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-500/80">ปริมาณน้ำมัน</p>
                <div className="flex items-center gap-2">
                    <input
                        type="number" step="0.1" min="0" placeholder="0.0"
                        value={numVal}
                        onChange={(e) => onChange(e.target.value ? `${e.target.value} ลิตร` : "")}
                        className="input-field text-xs flex-1 bg-black/20 min-w-0"
                    />
                    <span className="text-xs font-bold text-amber-500 shrink-0 px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-md min-w-[52px] text-center">
                        ลิตร
                    </span>
                </div>
                <PresetButtons
                    options={[
                        { label: "ถ่ายเรียบร้อย", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                        { label: "เติมเพิ่ม", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    ]}
                    value={value}
                    onChange={onChange}
                    allowCustom
                    customPlaceholder="หมายเหตุเพิ่มเติม..."
                />
            </div>
        );
    }

    // --- Grease (g) ---
    if (type === "grease") {
        const numVal = value.replace(/[^0-9.]/g, "");
        return (
            <div className="flex items-center gap-2">
                <input
                    type="number" step="1" min="0" placeholder="0"
                    value={numVal}
                    onChange={(e) => onChange(e.target.value ? `${e.target.value} g` : "")}
                    className="input-field text-xs flex-1 bg-black/20 min-w-0"
                />
                <span className="text-xs font-bold text-amber-300 shrink-0 px-2 py-1.5 bg-amber-300/10 border border-amber-300/30 rounded-md min-w-[32px] text-center">
                    g
                </span>
            </div>
        );
    }

    // --- Condition (Part/Component) ---
    if (type === "condition") {
        return (
            <div className="space-y-3">
                <PresetButtons
                    options={[
                        { label: "สมบูรณ์", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                        { label: "พอใช้", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                        { label: "ถึงกำหนดเปลี่ยน", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                    ]}
                    value={value}
                    onChange={onChange}
                    allowCustom
                    customPlaceholder="รายละเอียดเพิ่มเติม..."
                />
            </div>
        );
    }

    // --- Level (Oil/Fluid Level) ---
    if (type === "level") {
        return (
            <PresetButtons
                options={[
                    { label: "ปกติ", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                    { label: "ต่ำ", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "ต้องเติม", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                ]}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder="หมายเหตุ..."
            />
        );
    }

    // --- Leak / Crack ---
    if (type === "leak") {
        return (
            <PresetButtons
                options={[
                    { label: "ไม่มี", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                    { label: "มีเล็กน้อย", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "มีมาก / ต้องซ่อม", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                ]}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder="ระบุตำแหน่ง..."
            />
        );
    }

    // --- Sound / Noise ---
    if (type === "sound") {
        return (
            <PresetButtons
                options={[
                    { label: "ปกติ", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                    { label: "เสียงดัง", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "ผิดปกติ / ต้องตรวจสอบ", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                ]}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder="อธิบายลักษณะเสียง..."
            />
        );
    }

    // --- Done-type (cleaning, lubrication, calibration, etc.) ---
    if (type === "done") {
        return (
            <PresetButtons
                options={[
                    { label: "เรียบร้อย", color: "text-green-400", bg: "bg-green-400/15", border: "border-green-400/40" },
                    { label: "บางส่วน", color: "text-yellow-400", bg: "bg-yellow-400/15", border: "border-yellow-400/40" },
                    { label: "ยังไม่ได้ทำ", color: "text-red-400", bg: "bg-red-400/15", border: "border-red-400/40" },
                ]}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder="หมายเหตุ..."
            />
        );
    }

    // --- Default text ---
    return (
        <input
            type="text"
            placeholder="ใส่ค่า/รายละเอียด (เช่น 2.5A, ปกติ, เปลี่ยนแล้ว)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-field text-xs w-full bg-black/20"
        />
    );
}

// ===== Inline type hint badge =====
function TypeHintBadge({ type }: { type: InputFieldType }) {
    const map: Partial<Record<InputFieldType, { label: string; color: string; bg: string; border: string }>> = {
        current:     { label: "หน่วย: A",          color: "text-accent-blue",  bg: "bg-accent-blue/10",  border: "border-accent-blue/20" },
        temperature: { label: "หน่วย: °C",          color: "text-orange-400",   bg: "bg-orange-400/10",   border: "border-orange-400/20" },
        resistance:  { label: "หน่วย: Ω",           color: "text-rose-400",     bg: "bg-rose-400/10",     border: "border-rose-400/20" },
        voltage:     { label: "L1, L2, L3 (V)",    color: "text-yellow-400",   bg: "bg-yellow-400/10",   border: "border-yellow-400/20" },
        vibration:   { label: "X, Y, Z (mm/s)",    color: "text-purple-400",   bg: "bg-purple-400/10",   border: "border-purple-400/20" },
        oil_change:  { label: "ปริมาณ (ลิตร)",       color: "text-amber-500",    bg: "bg-amber-500/10",    border: "border-amber-500/20" },
        grease:      { label: "ปริมาณ (g)",          color: "text-amber-300",    bg: "bg-amber-300/10",    border: "border-amber-300/20" },
        tension:     { label: "เลือกความตึง",         color: "text-teal-400",     bg: "bg-teal-400/10",     border: "border-teal-400/20" },
        pressure:    { label: "เลือกแรงดัน",          color: "text-teal-400",     bg: "bg-teal-400/10",     border: "border-teal-400/20" },
        condition:   { label: "เลือกสภาพ",           color: "text-cyan-400",     bg: "bg-cyan-400/10",     border: "border-cyan-400/20" },
        level:       { label: "เลือกระดับ",           color: "text-cyan-400",     bg: "bg-cyan-400/10",     border: "border-cyan-400/20" },
        leak:        { label: "เลือกสถานะ",           color: "text-cyan-400",     bg: "bg-cyan-400/10",     border: "border-cyan-400/20" },
        sound:       { label: "เลือกสถานะ",           color: "text-cyan-400",     bg: "bg-cyan-400/10",     border: "border-cyan-400/20" },
        done:        { label: "เลือกสถานะ",           color: "text-cyan-400",     bg: "bg-cyan-400/10",     border: "border-cyan-400/20" },
    };
    const info = map[type];
    if (!info) return null;
    return (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${info.color} ${info.bg} ${info.border}`}>
            {info.label}
        </span>
    );
}

// ===== Main Modal =====
export default function PMExecutionModal({ isOpen, onClose, plan, onSuccess }: PMExecutionModalProps) {
    const { t } = useLanguage();
    const { userProfile } = useAuth();
    const { success, error: showError } = useToast();

    const defaultTechnician = userProfile?.nickname || userProfile?.displayName || "";
    const [technician, setTechnician] = useState(defaultTechnician);
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [checklistResults, setChecklistResults] = useState<ChecklistItemResult[]>(
        plan.checklistItems?.map(() => ({ completed: false, value: "" })) || []
    );
    const [dueParts, setDueParts] = useState<DuePart[]>([]);
    const [machineParts, setMachineParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReplacementPlanModalOpen, setIsReplacementPlanModalOpen] = useState(false);
    const [prevEfficiency, setPrevEfficiency] = useState<number | null>(null);
    const [issuesFound, setIssuesFound] = useState<{description: string}[]>([]);
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [newIssueText, setNewIssueText] = useState("");
    const [realMachineCode, setRealMachineCode] = useState("");
    const reportCardRef = React.useRef<HTMLDivElement>(null);

    // Efficiency Score Calculator
    const scoreValue = (val: string): number => {
        const v = val.toLowerCase();
        if (v.includes('ถึงกำหนดเปลี่ยน')) return 10;
        if (v.includes('ผิดปกติ') || v.includes('มีมาก') || v.includes('ต้องซ่อม') || v.includes('ชำรุด') || v.includes('เสียหาย') || v.includes('แตก')) return 15;
        if (v.includes('ต้องเติม')) return 30;
        if (v.includes('เฝ้าระวัง') || v.includes('มีเล็กน้อย') || v.includes('ควรเปลี่ยน') || v.includes('ควรซ่อม') || v.includes('ต่ำ')) return 50;
        if (v.includes('พอใช้')) return 65;
        if (v.includes('เหมาะสม')) return 80;
        if (v.includes('สมบูรณ์') || v.includes('ปกติ') || v.includes('เรียบร้อย') || v.includes('ไม่มีรอย') || v.includes('ไม่มี')) return 100;
        if (val !== '') return 75; 
        return 0; 
    };

    useEffect(() => {
        if (isOpen) {
            setTechnician(defaultTechnician);
            setAdditionalNotes("");
            setChecklistResults(plan.checklistItems?.map(() => ({ completed: false, value: "" })) || []);
            setDueParts([]);
            setIssuesFound([]);
            setShowIssueForm(false);
            setNewIssueText("");
            setLoading(false);
            // Load parts for this machine
            if (plan.machineId) {
                getPartsByMachine(plan.machineId)
                    .then(setMachineParts)
                    .catch(() => setMachineParts([]));

                // Load real machine code
                getMachine(plan.machineId)
                    .then(machine => {
                        if (machine?.code) setRealMachineCode(machine.code);
                        else setRealMachineCode("");
                    })
                    .catch(() => setRealMachineCode(""));
                
                // Load previous records for efficiency trend
                getMaintenanceRecordsByMachine(plan.machineId)
                    .then(records => {
                        const prevRecord = records
                            .filter(r => (r.checklist?.length ?? 0) > 0)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                        if (prevRecord?.checklist) {
                            const prevAssessed = prevRecord.checklist.filter(c => c.value && c.value.trim() !== '');
                            if (prevAssessed.length > 0) {
                                const prevScore = Math.round(prevAssessed.reduce((sum, c) => sum + scoreValue(c.value || ''), 0) / prevAssessed.length);
                                setPrevEfficiency(prevScore);
                            } else setPrevEfficiency(null);
                        } else setPrevEfficiency(null);
                    })
                    .catch(() => setPrevEfficiency(null));
            }
        }
    }, [isOpen, plan, defaultTechnician]);

    // When a checklist item gets value "ถึงกำหนดเปลี่ยน", auto-add a DuePart draft
    const handleChecklistChange = useCallback((index: number, completed: boolean, value?: string) => {
        setChecklistResults(prev => {
            const newResults = [...prev];
            const currentValue = newResults[index]?.value || "";

            let finalValue = value !== undefined ? value : currentValue;
            if (completed && !currentValue && value === undefined) {
                finalValue = getDefaultValue(plan.checklistItems?.[index] || "");
            }
            newResults[index] = { completed, value: finalValue };

            // Auto-add a DuePart draft when "ถึงกำหนดเปลี่ยน" is selected
            const isDue = finalValue.includes("ถึงกำหนดเปลี่ยน");
            const label = plan.checklistItems?.[index] || "";
            setDueParts(prev2 => {
                const exists = prev2.find(d => d.checklistIndex === index);
                if (isDue && !exists) {
                    return [...prev2, { checklistIndex: index, checklistLabel: label, partName: "", notes: "", confirmed: false }];
                } else if (!isDue && exists) {
                    return prev2.filter(d => d.checklistIndex !== index);
                }
                return prev2;
            });

            return newResults;
        });
    }, [plan.checklistItems]);

    const updateDuePart = (index: number, patch: Partial<DuePart>) => {
        setDueParts(prev => prev.map(d => d.checklistIndex === index ? { ...d, ...patch } : d));
    };

    const removeDuePart = (index: number) => {
        setDueParts(prev => prev.filter(d => d.checklistIndex !== index));
        // Reset checklist value so badge goes away
        setChecklistResults(prev => {
            const next = [...prev];
            if (next[index]) next[index] = { ...next[index], value: "" };
            return next;
        });
    };

    const buildDetailsString = (): string => {
        let cycleInfo = "";
        if (plan.scheduleType === "weekly") cycleInfo = `[${t("labelWeekly")}]`;
        else if (plan.scheduleType === "yearly") cycleInfo = `[${t("labelYearly")}]`;
        else cycleInfo = `[${t("labelEveryMonthly")} ${plan.cycleMonths || 1} ${t("labelMonths")}]`;

        if (!plan?.checklistItems || plan.checklistItems.length === 0)
            return `${cycleInfo}\n${additionalNotes}`;

        const itemDetails = plan.checklistItems.map((item, index) => {
            const result = checklistResults[index];
            const status = result?.completed ? "✓" : "○";
            const value = result?.value ? `: ${result.value}` : "";
            return `${status} ${item}${value}`;
        }).join("\n");

        let result = `${cycleInfo}\n${itemDetails}`;
        if (additionalNotes) {
            result += `\n\n[${t("labelAdditionalNotes")}]\n${additionalNotes}`;
        }
        if (issuesFound.length > 0) {
            result += `\n\n[⚠️ ปัญหาที่พบ]\n${issuesFound.map((iss, i) => `${i+1}. ${iss.description}`).join('\n')}`;
        }
        return result;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const details = buildDetailsString();
            const structuredChecklist = plan.checklistItems?.map((item, index) => {
                const res: any = {
                    item,
                    completed: checklistResults[index]?.completed || false,
                    value: checklistResults[index]?.value || ""
                };
                if (plan.checklistStandards?.[item]) {
                    res.standard = plan.checklistStandards[item];
                }
                return res;
            });

            // Generate Report Image Base64
            let telegramImageBase64 = undefined;
            if (reportCardRef.current) {
                try {
                    await new Promise(r => setTimeout(r, 150));
                    telegramImageBase64 = await toJpeg(reportCardRef.current, {
                        quality: 0.85,
                        backgroundColor: "#0F172A",
                        pixelRatio: 1.5
                    });
                } catch (imgError) {
                    console.error("Failed to generate report image:", imgError);
                }
            }

            const pmRecordId = await completePMTask(plan.id, {
                machineId: plan.machineId,
                machineName: plan.machineName,
                description: `PM: ${plan.taskName}`,
                type: "preventive",
                priority: "normal",
                status: "completed",
                date: new Date(),
                technician: technician || "Technician",
                details,
                checklist: structuredChecklist,
                Location: plan.customLocation || "",
                baseEfficiency: baseEfficiency,
            }, telegramImageBase64);

            // Auto-create part replacement plans for confirmed due parts
            const confirmedParts = dueParts.filter(d => d.confirmed && d.partName.trim());
            for (const dp of confirmedParts) {
                await addMaintenanceRecord({
                    machineId: plan.machineId,
                    machineName: plan.machineName,
                    description: `[แผน PM] เปลี่ยนอะไหล่: ${dp.partName}`,
                    type: "partReplacement",
                    priority: "high",
                    status: "pending",
                    date: new Date(),
                    technician: technician || "Technician",
                    Location: plan.customLocation || "",
                    fromPM: true,
                    pmTaskName: plan.taskName,
                    pmPlanId: plan.id,
                    parentPmRecordId: pmRecordId,
                    checklistItemLabel: dp.checklistLabel,
                    partName: dp.partName,
                    notes: dp.notes || undefined,
                } as any);
            }

            // Auto-create pending records for issues found
            for (const issue of issuesFound) {
                await addMaintenanceRecord({
                    machineId: plan.machineId,
                    machineName: plan.machineName,
                    description: `[PM พบปัญหา] ${issue.description}`,
                    type: "corrective",
                    priority: "high",
                    status: "pending",
                    date: new Date(),
                    technician: technician || "Technician",
                    Location: plan.customLocation || "",
                    fromPM: true,
                    pmTaskName: plan.taskName,
                    pmPlanId: plan.id,
                    parentPmRecordId: pmRecordId,
                } as any);
            }

            const issueCount = issuesFound.length;
            const partCount = confirmedParts.length;
            let successMsg = plan.taskName;
            if (partCount > 0 && issueCount > 0) successMsg = `สร้างแผนเปลี่ยน ${partCount} รายการ + บันทึกปัญหา ${issueCount} รายการ`;
            else if (partCount > 0) successMsg = `สร้างแผนเปลี่ยนอะไหล่ ${partCount} รายการ`;
            else if (issueCount > 0) successMsg = `บันทึกปัญหาที่พบ ${issueCount} รายการ`;
            success(t("msgSaveSuccess") || "บันทึกข้อมูลสำเร็จ", successMsg);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error("Error completing PM task:", err);
            showError(t("msgSaveError") || "เกิดข้อผิดพลาดในการบันทึก", err.message);
        } finally {
            setLoading(false);
        }
    };

    const hasChecklistItems = plan?.checklistItems && plan.checklistItems.length > 0;
    const completedCount = Object.values(checklistResults).filter(r => r.completed).length;
    const totalItems = plan?.checklistItems?.length || 0;

    const assessed = checklistResults.filter(c => c.completed && c.value && c.value.trim() !== '');
    const ISSUE_PENALTY = 5; // Each issue reduces efficiency by 5%
    const baseEfficiency = assessed.length > 0
        ? Math.round(assessed.reduce((sum, c) => sum + scoreValue(c.value), 0) / assessed.length)
        : 100;
    const issuePenalty = issuesFound.length * ISSUE_PENALTY;
    const currentEfficiency = Math.max(0, baseEfficiency - issuePenalty);
    const trend = prevEfficiency !== null ? currentEfficiency - prevEfficiency : null;

    // Build recommendations for the report
    const recommendations: string[] = [];
    if (issuesFound.length > 0) {
        issuesFound.forEach((issue, i) => {
            recommendations.push(`แก้ไข: ${issue.description} → +${ISSUE_PENALTY}%`);
        });
    }
    // Add recommendations for low-scoring checklist items
    assessed.forEach(c => {
        const score = scoreValue(c.value);
        if (score <= 50) {
            recommendations.push(`ปรับปรุงรายการที่คะแนนต่ำ → เพิ่มประสิทธิภาพได้`);
        }
    });

    const footerContent = (
        <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-base shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    <span>{t("msgSaving")}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <CheckCircleIcon size={18} />
                    <span>{t("actionConfirmNextCycle")}</span>
                </div>
            )}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("pmExecutionTitle")} footer={footerContent}>
            <div className="space-y-5">
                {/* Header */}
                <div className="p-4 bg-bg-tertiary rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center text-accent-blue">
                            <ActivityIcon size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-accent-orange">{plan.taskName}</h3>
                            <p className="text-xs text-text-muted">{plan.machineName}</p>
                        </div>
                        {hasChecklistItems && (
                            <div className="text-right">
                                <span className="text-lg font-bold text-accent-blue">{completedCount}/{totalItems}</span>
                                <p className="text-[10px] text-text-muted">{t("labelItemsCompleted")}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-text-muted">
                            <ClockIcon size={12} />
                            <span>
                                {plan.scheduleType === "weekly" ? t("labelWeekly") :
                                    plan.scheduleType === "yearly" ? t("labelYearly") :
                                        t("textEveryMonths", { count: plan.cycleMonths || 1 })}
                            </span>
                        </div>
                    </div>
                </div>

                <form id="pm-execution-form" onSubmit={handleSubmit} className="space-y-5">
                    {/* Technician */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider">
                            {t("labelTechnician")}
                        </label>
                        <input
                            type="text" required
                            placeholder={t("placeholderSpecifyTechnician")}
                            className="input-field w-full"
                            value={technician}
                            onChange={(e) => setTechnician(e.target.value)}
                        />
                    </div>

                    {/* Checklist */}
                    {hasChecklistItems && (
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider flex items-center gap-2">
                                <CheckCircleIcon size={14} />
                                {t("labelChecklist")} ({completedCount}/{totalItems})
                            </label>
                            <div className="space-y-2">
                                {plan.checklistItems!.map((item, index) => {
                                    const fieldType = detectInputType(item);
                                    const isMultiField = fieldType === "voltage" || fieldType === "vibration" || fieldType === "oil_change";
                                    const completed = checklistResults[index]?.completed;
                                    const currentValue = checklistResults[index]?.value || "";
                                    const isDue = currentValue.includes("ถึงกำหนดเปลี่ยน");
                                    const duePart = dueParts.find(d => d.checklistIndex === index);

                                    return (
                                        <div
                                            key={index}
                                            className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                                                isDue
                                                    ? "bg-red-500/5 border-red-500/40"
                                                    : completed
                                                        ? "bg-white/5 border-accent-blue/30"
                                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                            }`}
                                        >
                                            {/* Row: checkbox + label + hint badge */}
                                            <div className="flex items-start gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleChecklistChange(index, !completed)}
                                                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                        isDue
                                                            ? "bg-red-500 border-red-500 text-white"
                                                            : completed
                                                                ? "bg-accent-blue border-accent-blue text-white"
                                                                : "border-white/20 hover:border-accent-blue/50"
                                                    }`}
                                                >
                                                    {isDue ? <AlertTriangleIcon size={11} /> : completed ? <CheckCircleIcon size={12} /> : null}
                                                </button>
                                                <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                                                    <span
                                                        className={`text-sm cursor-pointer ${isDue ? "text-red-300" : completed ? "text-text-muted" : "text-white"}`}
                                                        onClick={() => handleChecklistChange(index, !completed)}
                                                    >
                                                        {item}
                                                    </span>
                                                    {/* Show hint badge only when not yet checked */}
                                                    {!completed && <TypeHintBadge type={fieldType} />}
                                                    {isDue && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                                                            ⚠️ ถึงกำหนดเปลี่ยน
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Smart input revealed after checking */}
                                            {completed && (
                                                <div className={`animate-in fade-in slide-in-from-top-1 duration-200 ${isMultiField ? "pl-1" : "pl-8"}`}>
                                                    <SmartChecklistInput
                                                        item={item}
                                                        value={currentValue}
                                                        onChange={(val) => handleChecklistChange(index, true, val)}
                                                        isQueued={false}
                                                    />
                                                </div>
                                            )}

                                            {/* ♥ Inline DuePart form — appears when "ถึงกำหนดเปลี่ยน" is picked */}
                                            {isDue && duePart && (
                                                <div className="ml-8 mt-1 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl space-y-2.5 animate-in fade-in duration-300">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <BoxIcon size={13} className="text-orange-400" />
                                                            <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">สร้างแผนเปลี่ยนอะไหล่</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDuePart(index)}
                                                            className="text-white/30 hover:text-white/70 transition-colors"
                                                        >
                                                            <XIcon size={14} />
                                                        </button>
                                                    </div>

                                                    {/* Part name: dropdown from machine parts OR free text */}
                                                    <div>
                                                        <label className="text-[10px] text-orange-300/70 mb-1 block">ชื่ออะไหล่ / ชิ้นส่วนที่ถึงกำหนด *</label>
                                                        {machineParts.length > 0 ? (
                                                            <select
                                                                className="input-field w-full text-xs h-8 bg-black/30"
                                                                value={duePart.partName}
                                                                onChange={e => updateDuePart(index, { partName: e.target.value })}
                                                            >
                                                                <option value="">-- เลือกอะไหล่ --</option>
                                                                {machineParts.map(p => (
                                                                    <option key={p.id} value={p.partName}>{p.partName} {p.brand ? `(${p.brand})` : ''}</option>
                                                                ))}
                                                                <option value="__custom__">➕ ระบุชื่อเอง...</option>
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                placeholder="ชื่ออะไหล่ / ชิ้นส่วน..."
                                                                className="input-field w-full text-xs h-8 bg-black/30"
                                                                value={duePart.partName}
                                                                onChange={e => updateDuePart(index, { partName: e.target.value })}
                                                            />
                                                        )}
                                                        {/* Free-text when custom selected */}
                                                        {duePart.partName === "__custom__" && (
                                                            <input
                                                                type="text"
                                                                placeholder="พิมพ์ชื่ออะไหล่..."
                                                                className="input-field w-full text-xs h-8 bg-black/30 mt-1.5"
                                                                autoFocus
                                                                onChange={e => updateDuePart(index, { partName: e.target.value })}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Notes */}
                                                    <div>
                                                        <label className="text-[10px] text-orange-300/70 mb-1 block">หมายเหตุ (ไม่บังคับ)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="รายละเอียดเพิ่มเติม..."
                                                            className="input-field w-full text-xs h-8 bg-black/30"
                                                            value={duePart.notes}
                                                            onChange={e => updateDuePart(index, { notes: e.target.value })}
                                                        />
                                                    </div>

                                                    {/* Confirm toggle */}
                                                    <button
                                                        type="button"
                                                        disabled={!duePart.partName.trim() || duePart.partName === "__custom__"}
                                                        onClick={() => updateDuePart(index, { confirmed: !duePart.confirmed })}
                                                        className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                                                            duePart.confirmed
                                                                ? "bg-green-500/20 border-green-500/40 text-green-400"
                                                                : "bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30"
                                                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                    >
                                                        {duePart.confirmed ? (
                                                            <><CheckCircleIcon size={13} /> เพิ่มในแผนเปลี่ยนแล้ว ✔</>
                                                        ) : (
                                                            <><PlusIcon size={13} /> เพิ่มในแผนเปลี่ยนอะไหล่</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Additional Notes */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-accent-orange uppercase tracking-wider flex items-center gap-2">
                            <FileTextIcon size={14} />
                            {t("labelAdditionalNotes")}
                        </label>
                        <textarea
                            placeholder={t("placeholderAdditionalNotesHint")}
                            className="input-field w-full min-h-[80px]"
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                        />
                    </div>

                    {/* Issues Found Section */}
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setShowIssueForm(!showIssueForm)}
                            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-lg border transition-all ${
                                issuesFound.length > 0
                                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                    : 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10'
                            }`}
                        >
                            <AlertTriangleIcon size={14} />
                            ⚠️ ปัญหาที่พบ {issuesFound.length > 0 && `(${issuesFound.length})`}
                        </button>
                        
                        {showIssueForm && (
                            <div className="space-y-3 bg-gradient-to-r from-red-500/10 to-orange-500/5 border border-red-500/20 rounded-xl p-4">
                                {/* Existing issues */}
                                {issuesFound.map((issue, idx) => (
                                    <div key={idx} className="flex items-start gap-2 bg-black/20 p-2.5 rounded-lg border border-red-500/15">
                                        <span className="text-red-400 text-xs font-bold mt-0.5">{idx + 1}.</span>
                                        <span className="text-xs text-white/80 flex-1">{issue.description}</span>
                                        <button
                                            type="button"
                                            onClick={() => setIssuesFound(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-white/30 hover:text-red-400 transition-colors"
                                        >
                                            <XIcon size={12} />
                                        </button>
                                    </div>
                                ))}
                                
                                {/* Add new issue */}
                                <div className="flex gap-2">
                                    <textarea
                                        placeholder="ระบุรายละเอียดปัญหาที่พบ..."
                                        className="input-field flex-1 text-xs min-h-[60px]"
                                        value={newIssueText}
                                        onChange={e => setNewIssueText(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        disabled={!newIssueText.trim()}
                                        onClick={() => {
                                            if (newIssueText.trim()) {
                                                setIssuesFound(prev => [...prev, { description: newIssueText.trim() }]);
                                                setNewIssueText("");
                                            }
                                        }}
                                        className="px-3 py-1 bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-xs font-bold hover:bg-red-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
                                    >
                                        <PlusIcon size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-red-300/50 italic">
                                    ⚠️ ปัญหาที่เพิ่มจะถูกบันทึกเป็น "สิ่งที่ต้องแก้ไข" ในระบบอัตโนมัติ และแสดงในรายงาน
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ♥ Part Replacement Plans Summary (only if any confirmed) */}
                    {dueParts.some(d => d.confirmed) && (
                        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangleIcon size={14} className="text-orange-400" />
                                <span className="text-xs font-bold text-orange-300">แผนเปลี่ยนอะไหล่ที่จะสร้างอัตโนมัติ ({dueParts.filter(d => d.confirmed).length} รายการ)</span>
                            </div>
                            <div className="space-y-1">
                                {dueParts.filter(d => d.confirmed).map((dp, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                                        <span className="text-orange-400">•</span>
                                        <BoxIcon size={11} className="text-orange-400/70" />
                                        <span className="font-medium">{dp.partName}</span>
                                        <span className="text-white/30">|</span>
                                        <span className="text-white/50 truncate">{dp.checklistLabel}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-orange-300/60 italic">
                                ⚠️ เมื่อกด "ยืนยัน" ระบบจะสร้างแผนเปลี่ยนอะไหล่และบันทึกไว้ในระบบอัตโนมัติ พร้อมป้าย "มาจาก PM"
                            </p>
                        </div>
                    )}
                </form>
            </div>
            
            {/* Hidden Report Card for Telegram Export */}
            <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, opacity: 0.01, pointerEvents: 'none' }}>
                {isOpen && (
                    <PMReportCard 
                        ref={reportCardRef}
                        record={{
                            machineId: plan.machineId,
                            machineName: plan.machineName,
                            description: `PM: ${plan.taskName}`,
                            type: "preventive",
                            priority: "normal",
                            status: "completed",
                            date: new Date(),
                            technician: technician || defaultTechnician || "Technician",
                            Location: plan.customLocation || "",
                            id: "dummy",
                            createdAt: new Date(),
                            updatedAt: new Date()
                        } as any}
                        completedChecklist={plan.checklistItems?.map((item, index) => ({
                            item,
                            completed: checklistResults[index]?.completed || false,
                            value: checklistResults[index]?.value || "",
                        })).filter(c => c.completed) || []}
                        machineCode={realMachineCode || plan.machineId.substring(0,8)}
                        efficiencyPct={currentEfficiency}
                        trend={trend}
                        scheduleText={plan.scheduleType === "weekly" ? t("labelWeekly") : plan.scheduleType === "yearly" ? t("labelYearly") : `${t("labelEveryMonthly") || "ทุก"} ${plan.cycleMonths || 1} ${t("labelMonths") || "เดือน"}`}
                        issuesFound={issuesFound}
                        recommendations={recommendations}
                    />
                )}
            </div>

            {isReplacementPlanModalOpen && (
                <PartReplacementPlanModal
                    isOpen={isReplacementPlanModalOpen}
                    onClose={() => setIsReplacementPlanModalOpen(false)}
                    machineId={plan.machineId}
                    machineName={plan.machineName}
                    onViewHistory={() => {}}
                    fromPMHistory={true}
                />
            )}
        </Modal>
    );
}
