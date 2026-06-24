"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { PMPlan } from "../../types";
import { CheckCircleIcon, ActivityIcon, FileTextIcon, ClockIcon } from "../ui/Icons";
import { completePMTask, addMaintenanceRecord } from "../../lib/firebaseService";
import { useToast } from "../../contexts/ToastContext";
import html2canvas from "html2canvas";
import { PMReportCard } from "./PMReportCard";

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
                {value.includes("ถึงกำหนดเปลี่ยน") && onQueueReplacement && (
                    <button
                        type="button"
                        onClick={onQueueReplacement}
                        disabled={isQueued}
                        className={`text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors border w-fit ${
                            isQueued 
                            ? 'bg-accent-green/20 text-accent-green border-accent-green/30 cursor-default' 
                            : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 cursor-pointer'
                        }`}
                    >
                        {isQueued ? <CheckCircleIcon size={12} /> : <span>+</span>}
                        {isQueued ? 'บันทึกคิวงานเปลี่ยนอะไหล่แล้ว' : 'สร้างแผนงานเปลี่ยนอะไหล่ (ด่วน)'}
                    </button>
                )}
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
    const [pendingReplacements, setPendingReplacements] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const reportCardRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTechnician(defaultTechnician);
            setAdditionalNotes("");
            setChecklistResults(plan.checklistItems?.map(() => ({ completed: false, value: "" })) || []);
            setPendingReplacements([]);
            setLoading(false);
        }
    }, [isOpen, plan, defaultTechnician]);

    const handleChecklistChange = (index: number, completed: boolean, value?: string) => {
        setChecklistResults(prev => {
            const newResults = [...prev];
            const currentValue = newResults[index]?.value || "";

            // Auto-fill default when checking an item that has no value yet
            let finalValue = value !== undefined ? value : currentValue;
            if (completed && !currentValue && value === undefined) {
                finalValue = getDefaultValue(plan.checklistItems?.[index] || "");
            }

            newResults[index] = { completed, value: finalValue };
            return newResults;
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

        return additionalNotes
            ? `${cycleInfo}\n${itemDetails}\n\n[${t("labelAdditionalNotes")}]\n${additionalNotes}`
            : `${cycleInfo}\n${itemDetails}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const details = buildDetailsString();
            const structuredChecklist = plan.checklistItems?.map((item, index) => ({
                item,
                completed: checklistResults[index]?.completed || false,
                value: checklistResults[index]?.value || "",
            }));

            // Generate Report Image Base64
            let telegramImageBase64 = undefined;
            if (reportCardRef.current) {
                try {
                    // Slight delay to ensure DOM is fully painted
                    await new Promise(r => setTimeout(r, 100));
                    const canvas = await html2canvas(reportCardRef.current, {
                        scale: 1.5, // Reduced from 2 to avoid payload limits
                        backgroundColor: "#0F172A",
                        useCORS: true,
                        logging: true
                    });
                    telegramImageBase64 = canvas.toDataURL("image/jpeg", 0.8);
                } catch (imgError) {
                    console.error("Failed to generate report image:", imgError);
                }
            } else {
                console.warn("reportCardRef is null, cannot generate image");
            }

            await completePMTask(plan.id, {
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
            }, telegramImageBase64);

            // Create pending replacements
            if (pendingReplacements.length > 0) {
                for (const item of pendingReplacements) {
                    await addMaintenanceRecord({
                        machineId: plan.machineId,
                        machineName: plan.machineName,
                        description: `[จากแผน PM] เปลี่ยนอะไหล่: ${item}`,
                        type: "partReplacement",
                        priority: "high",
                        status: "pending",
                        date: new Date(),
                        technician: technician || "Technician",
                        Location: plan.customLocation || "",
                    });
                }
            }

            success(t("msgSaveSuccess") || "บันทึกข้อมูลสำเร็จ", plan.taskName);
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

                                    return (
                                        <div
                                            key={index}
                                            className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${completed
                                                ? "bg-white/5 border-accent-blue/30"
                                                : "bg-white/5 border-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            {/* Row: checkbox + label + hint badge */}
                                            <div className="flex items-start gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleChecklistChange(index, !completed)}
                                                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${completed
                                                        ? "bg-accent-blue border-accent-blue text-white"
                                                        : "border-white/20 hover:border-accent-blue/50"
                                                        }`}
                                                >
                                                    {completed && <CheckCircleIcon size={12} />}
                                                </button>
                                                <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                                                    <span
                                                        className={`text-sm cursor-pointer ${completed ? "text-text-muted" : "text-white"}`}
                                                        onClick={() => handleChecklistChange(index, !completed)}
                                                    >
                                                        {item}
                                                    </span>
                                                    {/* Show hint badge only when not yet checked */}
                                                    {!completed && <TypeHintBadge type={fieldType} />}
                                                </div>
                                            </div>

                                            {/* Smart input revealed after checking */}
                                            {completed && (
                                                <div className={`animate-in fade-in slide-in-from-top-1 duration-200 ${isMultiField ? "pl-1" : "pl-8"}`}>
                                                    <SmartChecklistInput
                                                        item={item}
                                                        value={checklistResults[index]?.value || ""}
                                                        onChange={(val) => handleChecklistChange(index, true, val)}
                                                        onQueueReplacement={() => setPendingReplacements(prev => [...prev, item])}
                                                        isQueued={pendingReplacements.includes(item)}
                                                    />
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
                </form>
            </div>
            
            {/* Hidden Report Card for Telegram Export */}
            <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', zIndex: -9999 }}>
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
                        machineCode={"ID: " + plan.machineId.substring(0,6)}
                    />
                )}
            </div>
        </Modal>
    );
}
