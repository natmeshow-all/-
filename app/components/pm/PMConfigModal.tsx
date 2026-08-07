"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Machine, PMPlan } from "../../types";
import { CalendarIcon, ClockIcon, CheckCircleIcon, SettingsIcon, ActivityIcon, MapPinIcon, ChevronDownIcon, FileTextIcon, AlertTriangleIcon, SearchIcon, XIcon, CheckIcon } from "../ui/Icons";
import { addPMPlan, updatePMPlan, getParts, getPMPlans, getMachines } from "../../lib/firebaseService";
import { useToast } from "../../contexts/ToastContext";

interface PMConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    machine: Machine;
    plan?: PMPlan;
    existingMachinePlans?: PMPlan[];
    allMachines?: Machine[];
    allPlans?: PMPlan[];
    onSuccess?: () => void;
}

export interface InheritedInfo {
    sourceMachineName: string;
    sourceMachineCode?: string;
    sourcePlanId?: string;
    itemCount: number;
    matchReason: string;
    scheduleType?: string;
    cycleMonths?: number;
}

/**
 * Extracts a normalized alphanumeric prefix (series identifier) from any machine code.
 * Examples:
 *   "MX01", "MX02", "MX 03", "mx-09" -> "MX"
 *   "CV01", "CV-02", "CV 04" -> "CV"
 *   "CM01", "CM02", "CM-03" -> "CM"
 *   "PK01", "PK-02" -> "PK"
 *   "FP01", "FP02" -> "FP"
 *   "WT01", "WT-02" -> "WT"
 *   "BO01", "BO-02" -> "BO"
 *   "CT01", "CT02" -> "CT"
 *   "EG01", "EG02" -> "EG"
 *   "FN01", "FN02" -> "FN"
 *   "CP01", "CP02" -> "CP"
 *   "TB01", "TB02" -> "TB"
 *   "IC01", "IC02" -> "IC"
 *   "MG01", "MG02" -> "MG"
 *   "M-01", "M-02" -> "M"
 *   "LINE1_CV02" -> "LINE1_CV"
 */
export function extractCodePrefix(code: string): string {
    if (!code) return "";
    const cleaned = code.trim().toUpperCase();
    // 1. If code contains characters followed by digits at the end (e.g. MX03, MX-03, MX 03, CV-001)
    const match = cleaned.match(/^([A-Z0-9_\-\s]*?[A-Z]+)[\s\-_#]*\d+$/i);
    if (match) {
        return match[1].replace(/[\s\-_#]+$/, "").trim();
    }
    // 2. Strip any trailing numbers
    const fallback = cleaned.replace(/[\s\-_#]*\d+[\s\-_#]*$/, "").trim();
    return fallback;
}

/**
 * Extracts the base name from any machine name (removing trailing numbers/series index/symbols).
 * Examples:
 *   "Mix 1", "Mix 2", "Mix 3", "Mix 03" -> "mix"
 *   "Conveyor 1", "Conveyor #2" -> "conveyor"
 *   "Belt Conveyor 3" -> "belt conveyor"
 *   "Spiral Mixer 2" -> "spiral mixer"
 *   "Chiller 1", "Chiller 2" -> "chiller"
 *   "Cooling Tower 1" -> "cooling tower"
 *   "Packing Machine 1" -> "packing machine"
 *   "เครื่องบด 1", "เครื่องบด 2" -> "เครื่องบด"
 *   "เครื่องร่อน 1", "เครื่องร่อน 2" -> "เครื่องร่อน"
 *   "สายพานลำเลียง 1", "สายพานลำเลียง 2" -> "สายพานลำเลียง"
 */
export function extractNameBase(name: string): string {
    if (!name) return "";
    const trimmed = name.trim();
    // Remove trailing numbers, digits, thai numbers, Roman numerals, or (#N) / (N)
    const base = trimmed
        .replace(/[\s\-_#]+(?:\d+|[ivxlcdm]+|\([0-9]+\)|[๑-๙]+)$/i, "")
        .replace(/[\s\-_#]+$/, "")
        .trim();
    return base.length >= 2 ? base.toLowerCase() : trimmed.toLowerCase();
}

/**
 * Finds the best PM Plan template from a sibling machine in the same series or group.
 */
export function findSiblingTemplatePlan(
    targetMachine: Machine,
    allPlans: PMPlan[],
    allMachines: Machine[]
): { plan: PMPlan; sourceMachine: Partial<Machine>; matchReason: string } | null {
    if (!targetMachine || !allPlans || allPlans.length === 0) return null;

    const targetCode = (targetMachine.code || "").trim();
    const targetName = (targetMachine.name || "").trim();
    const targetCodePrefix = extractCodePrefix(targetCode);
    const targetNameBase = extractNameBase(targetName);

    // Build machine lookup maps by ID and by Name/Code
    const machineMapById = new Map<string, Machine>();
    const machineMapByName = new Map<string, Machine>();
    const machineMapByCode = new Map<string, Machine>();

    (allMachines || []).forEach(m => {
        if (m.id) machineMapById.set(m.id, m);
        if (m.name) machineMapByName.set(m.name.trim().toLowerCase(), m);
        if (m.code) machineMapByCode.set(m.code.trim().toUpperCase(), m);
    });

    const candidates: Array<{
        plan: PMPlan;
        sourceMachine: Partial<Machine>;
        score: number;
        reason: string;
    }> = [];

    allPlans.forEach(p => {
        // Skip current machine's own plans
        if (p.machineId === targetMachine.id) return;
        if (p.machineName?.trim().toLowerCase() === targetName.toLowerCase()) return;
        if (!p.checklistItems || p.checklistItems.length === 0) return;

        // Resolve source machine object
        let sourceMach = machineMapById.get(p.machineId);
        if (!sourceMach && p.machineName) {
            sourceMach = machineMapByName.get(p.machineName.trim().toLowerCase());
        }

        const sourceName = sourceMach?.name || p.machineName || "เครื่องจักร";
        const sourceCode = sourceMach?.code || "";
        const sourceCodePrefix = extractCodePrefix(sourceCode);
        const sourceNameBase = extractNameBase(sourceName);

        let score = 0;
        const matchReasons: string[] = [];

        // 1. Code Prefix Match (e.g. MX01 vs MX03, CV01 vs CV02, CM01 vs CM02, PK01 vs PK02)
        if (
            targetCodePrefix &&
            sourceCodePrefix &&
            targetCodePrefix.length >= 2 &&
            targetCodePrefix === sourceCodePrefix
        ) {
            score += 120;
            matchReasons.push(`รหัสกลุ่ม ${targetCodePrefix}..`);
        }

        // 2. Name Base Match (e.g. "Mix 1" vs "Mix 3", "Conveyor 1" vs "Conveyor 2")
        if (
            targetNameBase &&
            sourceNameBase &&
            targetNameBase.length >= 2 &&
            (targetNameBase === sourceNameBase ||
             targetNameBase.startsWith(sourceNameBase) ||
             sourceNameBase.startsWith(targetNameBase))
        ) {
            score += 100;
            matchReasons.push(`ชื่อกลุ่ม "${sourceNameBase}"`);
        }

        // 3. Location / Zone Match boost
        const targetLoc = (targetMachine.Location || targetMachine.location || "").toLowerCase().trim();
        const sourceLoc = (sourceMach?.Location || sourceMach?.location || p.customLocation || "").toLowerCase().trim();
        if (targetLoc && sourceLoc && targetLoc === sourceLoc) {
            score += 15;
        }

        // 4. Checklist richness boost
        score += Math.min(p.checklistItems.length, 20);

        if (score >= 80) {
            candidates.push({
                plan: p,
                sourceMachine: sourceMach || { id: p.machineId, name: sourceName, code: sourceCode },
                score,
                reason: matchReasons.join(" และ ") || "กลุ่มเครื่องจักรเดียวกัน"
            });
        }
    });

    if (candidates.length === 0) return null;

    // Highest score first
    candidates.sort((a, b) => b.score - a.score);
    return {
        plan: candidates[0].plan,
        sourceMachine: candidates[0].sourceMachine,
        matchReason: candidates[0].reason
    };
}

// Part-Checklist Mapping (รายการซ่อมบำรุงตามประเภทอะไหล่)
// NOTE: Specifically keeping these technical checklist items in Thai as per business requirements, 
// but UI controls around them are localized.
const PART_CHECKLIST_MAP: Record<string, string[]> = {
    // ═══════════════════════════════════════════════
    // ระบบขับเคลื่อน (Drive Systems)
    // ═══════════════════════════════════════════════
    "Motor": ["ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจแรงดันไฟฟ้า (Volt)", "วัดอุณหภูมิ", "วัดค่าสั่นสะเทือน (X/Y/Z)", "ตรวจสภาพมอเตอร์"],
    "Motor + Gear": ["เปลี่ยนถ่ายน้ำมันเกียร์", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจแรงดันไฟฟ้า (Volt)", "วัดอุณหภูมิ", "ตรวจสภาพฟันเกียร์", "ตรวจระดับน้ำมันเกียร์"],
    "Gear Motor": ["เปลี่ยนถ่ายน้ำมันเกียร์", "ตรวจระดับน้ำมัน", "ตรวจเสียงผิดปกติ", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสภาพฟันเกียร์"],
    "Servo Motor": ["ตรวจเช็คพารามิเตอร์", "ตรวจ Encoder", "ตรวจสายไฟ", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจแรงดันไฟฟ้า (Volt)"],
    "Blower Motor": ["ตรวจใบพัด", "ตรวจสั่นสะเทือน", "ทำความสะอาดพัดลม", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสภาพแบริ่ง"],
    "Bearing": ["ตรวจเช็คสภาพแบริ่ง", "เปลี่ยนจารบี", "วัดค่าสั่นสะเทือน", "ตรวจเสียงผิดปกติ"],
    "Belt": ["ตรวจสภาพสายพาน", "ตรวจความตึงสายพาน", "ตรวจรอยแตกร้าว", "ตรวจการเบี่ยงเบน"],
    "สายพาน": ["ตรวจสภาพสายพาน", "ตรวจความตึงสายพาน", "ตรวจรอยแตกร้าว", "ตรวจการเบี่ยงเบน"],
    "Chain": ["ฉีดสารหล่อลื่น", "ตรวจความตึงโซ่", "ตรวจสภาพข้อโซ่", "ตรวจเฟืองขับโซ่"],
    "โซ่": ["ฉีดสารหล่อลื่น", "ตรวจความตึงโซ่", "ตรวจสภาพข้อโซ่", "ตรวจเฟืองขับโซ่"],
    "Coupling": ["ตรวจสภาพยางคัปปลิ้ง", "ตรวจการ Alignment", "ตรวจรอยแตกร้าว"],
    "Sprocket": ["ตรวจสภาพฟันเฟือง", "ตรวจการสึกหรอ", "หล่อลื่น"],
    "Roller": ["ตรวจสภาพโรลเลอร์", "ตรวจแบริ่ง", "ทำความสะอาด", "ตรวจการหมุน"],
    "Gear Box": ["เปลี่ยนถ่ายน้ำมันเกียร์", "ตรวจระดับน้ำมัน", "ตรวจเสียงผิดปกติ", "ตรวจรอยรั่วซึม", "ตรวจสภาพฟันเกียร์"],

    // ═══════════════════════════════════════════════
    // ระบบไฟฟ้าและควบคุม (Electrical & Control)
    // ═══════════════════════════════════════════════
    "VFD": ["ตรวจพารามิเตอร์", "ตรวจพัดลมระบายความร้อน", "ตรวจสายไฟ", "ทำความสะอาด"],
    "Inverter": ["ตรวจพารามิเตอร์", "ตรวจพัดลมระบายความร้อน", "ตรวจสายไฟ", "ทำความสะอาด"],
    "Temperature Sensor": ["Calibrate เซ็นเซอร์", "ตรวจค่าที่อ่านได้", "ตรวจสายสัญญาณ"],
    "Metal Detector": ["ตรวจความไว", "Calibrate เครื่อง", "ทดสอบ Test Piece"],
    "Heater": ["ตรวจสภาพฮีตเตอร์", "วัดค่าความต้านทาน (Ohm)", "ตรวจสายไฟ/ขั้วต่อ", "ทำความสะอาด", "ตรวจอุณหภูมิทำงาน"],
    "Transformer": ["ตรวจแรงดันไฟฟ้า (Volt)", "วัดอุณหภูมิ", "ตรวจระดับน้ำมัน", "ตรวจรอยรั่วซึม", "ทำความสะอาด"],
    "Generator": ["ตรวจแรงดันไฟฟ้า (Volt)", "ตรวจระดับน้ำมันเชื้อเพลิง", "ตรวจระดับน้ำมันเครื่อง", "ตรวจระดับน้ำหล่อเย็น", "ทดสอบเดินเครื่อง", "ตรวจแบตเตอรี่"],
    "UPS": ["ตรวจแรงดันไฟฟ้า (Volt)", "ตรวจสภาพแบตเตอรี่", "ทดสอบ Load Transfer", "ทำความสะอาด"],
    "Electrical Panel": ["ตรวจสายไฟ/ขั้วต่อ", "วัดอุณหภูมิ", "ทำความสะอาดตู้ไฟ", "ตรวจ Breaker", "ตรวจ Fuse", "ตรวจเช็คแรงดันไฟฟ้า", "ตรวจเช็คกระแสไฟฟ้า"],
    "PLC": ["ตรวจสถานะ LED/Error", "ตรวจแบตเตอรี่สำรอง", "ทำความสะอาด", "ตรวจสายสัญญาณ"],
    "Sensor": ["Calibrate เซ็นเซอร์", "ตรวจค่าที่อ่านได้", "ตรวจสายสัญญาณ", "ทำความสะอาดหน้าสัมผัส"],
    "Solenoid Valve": ["ตรวจการเปิด-ปิด", "ตรวจคอยล์", "ตรวจรอยรั่ว", "ตรวจสายไฟ"],
    "Proximity Sensor": ["Calibrate เซ็นเซอร์", "ตรวจระยะตรวจจับ", "ตรวจสายสัญญาณ", "ทำความสะอาด"],
    "Photo Sensor": ["Calibrate เซ็นเซอร์", "ทำความสะอาดเลนส์", "ตรวจสายสัญญาณ", "ตรวจระยะตรวจจับ"],

    // ═══════════════════════════════════════════════
    // ระบบนิวเมติกส์และปั๊ม (Pneumatics & Pumps)
    // ═══════════════════════════════════════════════
    "Pump": ["ตรวจแรงดัน", "ตรวจรอยรั่วซึม", "ตรวจซีล", "ตรวจเช็คกระแสไฟฟ้า (Amp)"],
    "Water Pump": ["ตรวจแรงดันน้ำ", "ตรวจรอยรั่วซึม", "ตรวจซีล/แพ็คกิ้ง", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสภาพใบพัด"],
    "Valve": ["ตรวจการเปิด-ปิด", "ตรวจรอยรั่ว", "ตรวจสภาพซีล"],
    "Pneumatic Valve": ["ตรวจการเปิด-ปิด", "ตรวจรอยรั่ว", "ตรวจสภาพซีล"],
    "Compressor": ["ตรวจแรงดัน", "เปลี่ยนไส้กรอง", "ตรวจระดับน้ำมัน", "ไล่น้ำในถังลม", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสายพานขับ"],
    "Air Compressor": ["ตรวจแรงดัน", "เปลี่ยนไส้กรอง Air/Oil", "ตรวจระดับน้ำมัน", "ไล่น้ำในถังลม", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสายพานขับ", "ตรวจ Safety Valve"],
    "Air Dryer": ["ตรวจอุณหภูมิจุดน้ำค้าง", "ไล่น้ำ/ตรวจ Auto Drain", "เปลี่ยนไส้กรอง", "ทำความสะอาดคอนเดนเซอร์"],
    "Cylinder": ["ตรวจการทำงาน (เข้า-ออก)", "ตรวจรอยรั่วลม", "ตรวจซีล/แพ็คกิ้ง", "หล่อลื่นก้านสูบ"],
    "FRL Unit": ["ตรวจระดับน้ำมันหล่อลื่น", "ไล่น้ำในถ้วยกรอง", "เปลี่ยนไส้กรอง", "ตรวจแรงดัน Regulator"],

    // ═══════════════════════════════════════════════
    // ระบบทำความเย็น/ทำความร้อน (HVAC & Thermal)
    // ═══════════════════════════════════════════════
    "Evaporator": ["ทำความสะอาดแผงคอยล์", "ตรวจละลายน้ำแข็ง", "ตรวจพัดลม", "ตรวจอุณหภูมิ"],
    "Chiller": ["ตรวจอุณหภูมิน้ำ", "ตรวจสารทำความเย็น", "ทำความสะอาดคอนเดนเซอร์", "ตรวจแรงดันน้ำยา", "ตรวจเช็คกระแสไฟฟ้า (Amp)"],
    "Fancoil Unit": ["ทำความสะอาดไส้กรอง", "ตรวจพัดลม", "ตรวจท่อน้ำ", "ตรวจอุณหภูมิ"],
    "Air Condition": ["ทำความสะอาดไส้กรอง", "ล้างคอยล์", "ตรวจสารทำความเย็น", "ตรวจอุณหภูมิ"],
    "แอร์": ["ทำความสะอาดไส้กรอง", "ล้างคอยล์", "ตรวจสารทำความเย็น", "ตรวจอุณหภูมิ"],
    "Refrigerator": ["ตรวจอุณหภูมิ", "ทำความสะอาดคอนเดนเซอร์", "ตรวจซีลประตู"],
    "Freezer": ["ตรวจอุณหภูมิ", "ทำความสะอาดคอนเดนเซอร์", "ตรวจซีลประตู", "ตรวจละลายน้ำแข็ง", "ตรวจพัดลม Evaporator"],
    "ตู้แช่แข็ง": ["ตรวจอุณหภูมิ", "ทำความสะอาดคอนเดนเซอร์", "ตรวจซีลประตู", "ตรวจละลายน้ำแข็ง"],
    "ตู้แช่เย็น": ["ตรวจอุณหภูมิ", "ทำความสะอาดคอนเดนเซอร์", "ตรวจซีลประตู"],
    "Cooling Tunnel": ["ตรวจอุณหภูมิ", "ทำความสะอาดสายพาน", "ตรวจระบบทำความเย็น", "ตรวจพัดลม"],
"Cooling Tower": ["ตรวจอุณหภูมิน้ำ", "ทำความสะอาดถาดน้ำ", "ตรวจพัดลม", "ตรวจระดับน้ำ", "ตรวจสารเคมี"],
    "Boiler": ["ตรวจแรงดันไอน้ำ", "ตรวจระดับน้ำ", "ตรวจ Safety Valve", "ตรวจหัวเผา", "ไล่ตะกรัน/Blow Down", "ตรวจสภาพท่อ"],
    "Steam Generator": ["ตรวจแรงดันไอน้ำ", "ตรวจระดับน้ำ", "ตรวจ Safety Valve", "ทำความสะอาด", "ตรวจท่อส่งไอน้ำ"],
    "AHU": ["ทำความสะอาดไส้กรอง", "ตรวจพัดลม", "ตรวจสายพาน", "ตรวจมอเตอร์", "ตรวจท่อลม"],
    "Exhaust Fan": ["ตรวจใบพัด", "ตรวจสั่นสะเทือน", "ทำความสะอาด", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสภาพแบริ่ง"],
    "พัดลมระบายอากาศ": ["ตรวจใบพัด", "ตรวจสั่นสะเทือน", "ทำความสะอาด", "ตรวจเช็คกระแสไฟฟ้า (Amp)", "ตรวจสภาพแบริ่ง"],

    // ═══════════════════════════════════════════════
    // ระบบน้ำ (Water Systems)
    // ═══════════════════════════════════════════════
    "Water Treatment": ["ตรวจค่า pH", "ตรวจค่า TDS", "เปลี่ยนไส้กรอง", "ตรวจแรงดันน้ำ", "ตรวจระบบ Dosing"],
    "ระบบบำบัดน้ำ": ["ตรวจค่า pH", "ตรวจค่า TDS", "เปลี่ยนไส้กรอง", "ตรวจแรงดันน้ำ"],
    "Water Filter": ["เปลี่ยนไส้กรอง", "ตรวจแรงดันน้ำ", "ตรวจรอยรั่วซึม"],
    "RO System": ["เปลี่ยนไส้กรอง/เมมเบรน", "ตรวจค่า TDS", "ตรวจแรงดันน้ำ", "ตรวจอัตราการไหล"],
    "Water Softener": ["ตรวจค่าความกระด้าง", "เติมเกลือ", "ตรวจ Regeneration", "ตรวจแรงดัน"],

    // ═══════════════════════════════════════════════
    // เครื่องจักรการผลิต — เบเกอรี่ (Bakery Production)
    // ═══════════════════════════════════════════════
    "Mixer": ["ทำความสะอาดโถผสม", "ตรวจใบกวน", "เช็คน้ำมันเกียร์", "ตรวจสภาพมอเตอร์", "ตรวจซีลก้นโถ"],
    "Spiral Mixer": ["ทำความสะอาดโถผสม", "ตรวจใบกวน", "เช็คน้ำมันเกียร์", "ตรวจซีลก้นโถ", "ตรวจสภาพมอเตอร์"],
    "Planetary Mixer": ["ทำความสะอาดโถผสม", "ตรวจหัวตี", "เช็คน้ำมันเกียร์", "ตรวจสภาพมอเตอร์"],
    "Dough Sheeter": ["ทำความสะอาดลูกรีด", "ตรวจสายพาน", "หล่อลื่น", "ตรวจระยะห่างลูกรีด", "ตรวจสภาพมอเตอร์"],
    "เครื่องรีดแป้ง": ["ทำความสะอาดลูกรีด", "ตรวจสายพาน", "หล่อลื่น", "ตรวจระยะห่างลูกรีด"],
    "Divider": ["ทำความสะอาด", "ตรวจระดับน้ำมัน", "Calibrate น้ำหนัก", "ตรวจมีดตัด", "ตรวจสภาพมอเตอร์"],
    "เครื่องแบ่งแป้ง": ["ทำความสะอาด", "ตรวจระดับน้ำมัน", "Calibrate น้ำหนัก", "ตรวจมีดตัด"],
    "Rounder": ["ทำความสะอาด", "ตรวจแผ่นปั้นกลม", "หล่อลื่น", "ตรวจสายพาน"],
    "เครื่องปั้นกลม": ["ทำความสะอาด", "ตรวจแผ่นปั้นกลม", "หล่อลื่น", "ตรวจสายพาน"],
    "Molder": ["ทำความสะอาดลูกรีด", "ตรวจสายพาน", "ตรวจแผ่นม้วน", "หล่อลื่น", "ตรวจสภาพมอเตอร์"],
    "เครื่องม้วนแป้ง": ["ทำความสะอาดลูกรีด", "ตรวจสายพาน", "ตรวจแผ่นม้วน", "หล่อลื่น"],
    "Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา", "ตรวจสายพาน", "ตรวจพัดลม"],
    "Rack Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา", "ตรวจระบบไอน้ำ", "ตรวจซีลประตู"],
    "Deck Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา", "ตรวจหินอบ"],
    "Tunnel Oven": ["ตรวจอุณหภูมิแต่ละ Zone", "ทำความสะอาดสายพาน", "ตรวจหัวเผา", "ตรวจพัดลม", "หล่อลื่นโซ่"],
    "Rotary Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจหัวเผา", "ตรวจระบบหมุน", "ตรวจซีลประตู"],
    "Combi Oven": ["ตรวจอุณหภูมิ", "ทำความสะอาดห้องอบ", "ตรวจระบบไอน้ำ", "ล้าง Descale"],
    "Proofer": ["ตรวจอุณหภูมิ-ความชื้น", "ทำความสะอาดถาด", "ตรวจระบบไอน้ำ", "ตรวจพัดลม"],
    "Retarder Proofer": ["ตรวจอุณหภูมิ-ความชื้น", "ตรวจระบบทำความเย็น", "ตรวจระบบไอน้ำ", "ทำความสะอาด", "ตรวจซีลประตู"],
    "Conveyor": ["ตรวจสายพาน", "ตรวจโรลเลอร์", "หล่อลื่นโซ่", "ตรวจสภาพมอเตอร์"],
    "Slicer": ["ลับใบมีด", "ทำความสะอาด", "ตรวจตั้งระยะใบมีด", "ตรวจสภาพสายพาน"],
    "Bread Slicer": ["ลับใบมีด", "ทำความสะอาด", "ตรวจตั้งระยะใบมีด", "ตรวจสภาพสายพาน"],
    "Depositor": ["ทำความสะอาดหัวจ่าย", "ตรวจวาล์ว", "Calibrate ปริมาณจ่าย", "ตรวจสภาพท่อ/สาย"],
    "Fryer": ["เปลี่ยนน้ำมัน", "ทำความสะอาดอ่าง", "ตรวจอุณหภูมิ", "ตรวจหัวเผา/ฮีตเตอร์", "ตรวจสายพาน"],
    "เครื่องทอด": ["เปลี่ยนน้ำมัน", "ทำความสะอาดอ่าง", "ตรวจอุณหภูมิ", "ตรวจหัวเผา/ฮีตเตอร์"],
    "Waffle Machine": ["ทำความสะอาดแม่พิมพ์", "ตรวจสภาพฮีตเตอร์", "ตรวจอุณหภูมิ", "หล่อลื่นบานพับ", "ตรวจสายไฟ/ขั้วต่อ"],
    "วาฟเฟิล": ["ทำความสะอาดแม่พิมพ์", "ตรวจสภาพฮีตเตอร์", "ตรวจอุณหภูมิ", "หล่อลื่นบานพับ", "ตรวจสายไฟ/ขั้วต่อ"],
    "Pan Greaser": ["ทำความสะอาดหัวฉีด", "ตรวจระดับน้ำมัน", "ตรวจปั๊ม", "Calibrate ปริมาณจ่าย"],
    "Depanner": ["ตรวจสภาพถ้วยดูด", "ตรวจระบบสุญญากาศ", "ทำความสะอาด", "หล่อลื่น"],
    "Cream Injector": ["ทำความสะอาดหัวจ่าย", "ตรวจวาล์ว", "Calibrate ปริมาณจ่าย", "ตรวจท่อ/สาย"],
    "Enrober": ["ทำความสะอาดอ่างช็อกโกแลต", "ตรวจอุณหภูมิ", "ตรวจสายพาน", "ตรวจปั๊ม"],
    "Tempering Machine": ["ตรวจอุณหภูมิ", "ทำความสะอาด", "ตรวจระบบน้ำหมุนเวียน", "ตรวจปั๊ม"],
    "Cookie Machine": ["ทำความสะอาดหัวจ่าย", "ตรวจแม่พิมพ์", "หล่อลื่น", "ตรวจสภาพมอเตอร์"],
    "Dough Extruder": ["ทำความสะอาดหัวฉีด/แม่พิมพ์", "ตรวจสกรู", "หล่อลื่น", "ตรวจสภาพมอเตอร์"],

    // ═══════════════════════════════════════════════
    // เครื่องจักรบรรจุภัณฑ์ (Packaging)
    // ═══════════════════════════════════════════════
    "Packaging Machine": ["ตรวจซีล", "ตรวจอุณหภูมิ Sealing", "ทำความสะอาด", "ตรวจใบมีดตัด"],
    "Wrapping Machine": ["ตรวจอุณหภูมิ Sealing", "ตรวจสภาพใบมีดตัด", "ตรวจสายพาน", "ทำความสะอาด", "ตรวจม้วนฟิล์ม"],
    "เครื่องแพ็ค": ["ตรวจอุณหภูมิ Sealing", "ตรวจสภาพใบมีดตัด", "ตรวจสายพาน", "ทำความสะอาด"],
    "Sealing Machine": ["ตรวจอุณหภูมิ Sealing", "ตรวจสภาพเทฟลอน", "ตรวจแรงกด", "ทำความสะอาด"],
    "Shrink Tunnel": ["ตรวจอุณหภูมิ", "ตรวจสายพาน", "ทำความสะอาด", "ตรวจฮีตเตอร์", "ตรวจพัดลม"],
    "Labeling Machine": ["ตรวจหัวติดฉลาก", "Calibrate ตำแหน่ง", "ทำความสะอาด", "ตรวจเซ็นเซอร์"],
    "Inkjet Printer": ["ทำความสะอาดหัวพิมพ์", "ตรวจระดับหมึก", "ตรวจคุณภาพการพิมพ์", "เปลี่ยนไส้กรอง"],
    "Date Coder": ["ทำความสะอาดหัวพิมพ์", "ตรวจระดับหมึก", "ตรวจคุณภาพการพิมพ์"],
    "Vacuum Packer": ["ตรวจสุญญากาศ", "ตรวจซีล", "ตรวจปั๊มสุญญากาศ", "ทำความสะอาด"],
    "Vacuum Cooler": ["ตรวจสุญญากาศ", "ตรวจซีลประตู", "ทำความสะอาดถาด", "ตรวจปั๊มสุญญากาศ"],
    "Strapping Machine": ["ตรวจสภาพสายรัด", "ตรวจหัวเชื่อม", "ตรวจความตึงสายรัด", "ทำความสะอาด", "หล่อลื่น"],
    "เครื่องรัดสาย": ["ตรวจสภาพสายรัด", "ตรวจหัวเชื่อม", "ตรวจความตึงสายรัด", "ทำความสะอาด"],
    "Pallet Wrapper": ["ตรวจสภาพม้วนฟิล์ม", "ตรวจระบบหมุน", "ตรวจสภาพมอเตอร์", "ทำความสะอาด"],
    "Checkweigher": ["Calibrate น้ำหนัก", "ตรวจเซ็นเซอร์", "ทำความสะอาด", "ตรวจสายพาน"],
    "X-Ray Machine": ["Calibrate เครื่อง", "ทดสอบ Test Piece", "ทำความสะอาด", "ตรวจสายพาน"],

    // ═══════════════════════════════════════════════
    // คลังสินค้าและขนถ่าย (Warehouse & Material Handling)
    // ═══════════════════════════════════════════════
    "AS/RS": ["ตรวจราง/Rail", "ตรวจสภาพมอเตอร์", "หล่อลื่น", "ตรวจเซ็นเซอร์", "ตรวจสายสลิง/โซ่", "ตรวจระบบ Safety"],
    "Forklift": ["ตรวจระดับน้ำมัน", "ตรวจแบตเตอรี่", "ตรวจยาง", "ตรวจโซ่ยก", "ตรวจเบรก", "หล่อลื่น"],
    "Dock Leveler": ["ตรวจระบบไฮดรอลิก", "ตรวจบานพับ", "หล่อลื่น", "ตรวจ Safety Lip"],
    "Lift": ["ตรวจสายสลิง", "ตรวจระบบ Safety", "ตรวจสภาพมอเตอร์", "หล่อลื่นราง", "ตรวจเบรก"],
    "ลิฟต์": ["ตรวจสายสลิง", "ตรวจระบบ Safety", "ตรวจสภาพมอเตอร์", "หล่อลื่นราง"],
    "Hoist": ["ตรวจสายสลิง/โซ่", "ตรวจเบรก", "ตรวจ Hook/ตะขอ", "หล่อลื่น"],
    "Roller Conveyor": ["ตรวจสภาพโรลเลอร์", "ตรวจแบริ่ง", "หล่อลื่น", "ตรวจสภาพมอเตอร์"],
    "Spiral Conveyor": ["ตรวจสายพาน", "หล่อลื่นโซ่", "ตรวจสภาพมอเตอร์", "ตรวจโรลเลอร์", "ตรวจการเบี่ยงเบน"],

    // ═══════════════════════════════════════════════
    // ชิ้นส่วนทั่วไป (General Components)
    // ═══════════════════════════════════════════════
    "Filter": ["เปลี่ยนไส้กรอง", "ตรวจแรงดัน Diff.", "ทำความสะอาด"],
    "ไส้กรอง": ["เปลี่ยนไส้กรอง", "ตรวจแรงดัน Diff.", "ทำความสะอาด"],
    "Gasket": ["ตรวจสภาพแกสเก็ต", "ตรวจรอยรั่ว", "ตรวจแรงขันสกรู"],
    "Seal": ["ตรวจสภาพซีล", "ตรวจรอยรั่วซึม", "เปลี่ยนซีล"],
    "Hose": ["ตรวจสภาพท่อยาง", "ตรวจรอยรั่ว", "ตรวจรอยแตกร้าว", "ตรวจแคลมป์"],

    // ═══════════════════════════════════════════════
    // ระบบดับเพลิง/ความปลอดภัย (Fire & Safety)
    // ═══════════════════════════════════════════════
    "Fire Pump": ["ทดสอบเดินเครื่อง", "ตรวจแรงดันน้ำ", "ตรวจระดับน้ำมันเชื้อเพลิง", "ตรวจแบตเตอรี่", "ตรวจวาล์ว"],
    "Sprinkler": ["ตรวจแรงดันน้ำ", "ตรวจหัวสปริงเกอร์", "ตรวจวาล์ว", "ทดสอบระบบ"],
    "Fire Extinguisher": ["ตรวจแรงดัน Gauge", "ตรวจสภาพถัง", "ตรวจวันหมดอายุ", "ตรวจสลักนิรภัย"],
};

export default function PMConfigModal({
    isOpen,
    onClose,
    machine,
    plan,
    existingMachinePlans = [],
    allMachines = [],
    allPlans = [],
    onSuccess
}: PMConfigModalProps) {
    const { t } = useLanguage();
    const { success, error: showError } = useToast();

    // Compute existing plans to disable duplicate schedule types
    const existingMonthlyPlan = existingMachinePlans.find(p => p.scheduleType === 'monthly' && p.id !== plan?.id);
    const existingWeeklyPlan = existingMachinePlans.find(p => p.scheduleType === 'weekly' && p.id !== plan?.id);
    const existingYearlyPlan = existingMachinePlans.find(p => p.scheduleType === 'yearly' && p.id !== plan?.id);

    const existingMonthly = !!existingMonthlyPlan;
    const existingWeekly = !!existingWeeklyPlan;
    const existingYearly = !!existingYearlyPlan;

    const getDaysRemainingText = (p?: PMPlan) => {
        if (!p || !p.nextDueDate) return "";
        const now = new Date();
        now.setHours(0,0,0,0);
        const due = new Date(p.nextDueDate);
        due.setHours(0,0,0,0);
        const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 0) return "เลยกำหนด";
        if (days === 0) return "ถึงกำหนดวันนี้";
        return `อีก ${days} วัน`;
    };

    // Initial default schedule type
    let defaultSchedule = plan?.scheduleType || "monthly";
    if (!plan) {
        if (existingMonthly && !existingWeekly) defaultSchedule = "weekly";
        else if (existingMonthly && existingWeekly && !existingYearly) defaultSchedule = "yearly";
        else if (existingMonthly && existingWeekly && existingYearly) defaultSchedule = "monthly"; // All exist, fallback
    }
    const [loading, setLoading] = useState(false);

    const [checklistItems, setChecklistItems] = useState<string[]>(plan?.checklistItems || []);
    const [newItem, setNewItem] = useState("");
    const [selectedPartType, setSelectedPartType] = useState("");
    
    const checklistEndRef = useRef<HTMLDivElement>(null);

    const [scheduleType, setScheduleType] = useState<"monthly" | "weekly" | "yearly" | "custom">(defaultSchedule as any);
    const [cycleMonths, setCycleMonths] = useState<number>(plan?.cycleMonths || 1);
    const [weeklyDay, setWeeklyDay] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>((plan?.weeklyDay ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6);

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

    // Auto-inheritance & manual copy states
    const [allPlansList, setAllPlansList] = useState<PMPlan[]>(allPlans || []);
    const [allMachinesList, setAllMachinesList] = useState<Machine[]>(allMachines || []);
    const [inheritedFrom, setInheritedFrom] = useState<InheritedInfo | null>(null);
    const [copyModalOpen, setCopyModalOpen] = useState(false);
    const [copySearchQuery, setCopySearchQuery] = useState("");

    const CYCLE_OPTIONS = [
        { label: `1 ${t("labelMonths")}`, value: 1 },
        { label: `2 ${t("labelMonths")}`, value: 2 },
        { label: `3 ${t("labelMonths")}`, value: 3 },
        { label: `6 ${t("labelMonths")}`, value: 6 },
        { label: `9 ${t("labelMonths")}`, value: 9 },
        { label: `12 ${t("labelMonths")}`, value: 12 },
    ];

    const fetchPartsData = async () => {
        setLoadingData(true);
        try {
            const [parts, fetchedPlans, fetchedMachines] = await Promise.all([
                getParts(),
                allPlans && allPlans.length > 0 ? Promise.resolve(allPlans) : getPMPlans(),
                allMachines && allMachines.length > 0 ? Promise.resolve(allMachines) : getMachines()
            ]);
            
            setAllPlansList(fetchedPlans);
            setAllMachinesList(fetchedMachines);

            const uniquePartNames = Array.from(new Set(parts.map(p => p.partName).filter(Boolean))).sort();
            setAllPartNames(uniquePartNames);
            
            // Extract unique locations from Parts
            const partLocations = parts.map(p => p.Location).filter(Boolean);
            const planLocations = fetchedPlans.map(p => p.customLocation).filter(Boolean);
            
            const rawLocations = [...partLocations, ...planLocations] as string[];
            const normalizedMap = new Map<string, string>();
            
            rawLocations.forEach(loc => {
                const trimmed = loc.trim().replace(/\s+/g, ' ');
                if (!trimmed) return;
                
                const key = trimmed.toLowerCase().replace(/\s+/g, '');
                if (!normalizedMap.has(key)) {
                    normalizedMap.set(key, trimmed);
                } else {
                    const current = normalizedMap.get(key)!;
                    const currentSpaces = (current.match(/\s/g) || []).length;
                    const newSpaces = (trimmed.match(/\s/g) || []).length;
                    const currentCaps = (current.match(/[A-Z]/g) || []).length;
                    const newCaps = (trimmed.match(/[A-Z]/g) || []).length;
                    
                    if (newSpaces > currentSpaces) {
                        normalizedMap.set(key, trimmed);
                    } else if (newSpaces === currentSpaces && newCaps > currentCaps) {
                        normalizedMap.set(key, trimmed);
                    }
                }
            });
            
            const uniqueLocations = Array.from(normalizedMap.values()).sort((a, b) => a.localeCompare(b, 'th'));
            setAllLocations(uniqueLocations);

            // Auto-detect sibling template plan if creating new plan and no items set yet
            if (!plan && machine) {
                const sibling = findSiblingTemplatePlan(machine, fetchedPlans, fetchedMachines);
                if (sibling && sibling.plan.checklistItems && sibling.plan.checklistItems.length > 0) {
                    setChecklistItems([...sibling.plan.checklistItems]);
                    if (sibling.plan.scheduleType && !existingMachinePlans.some(p => p.scheduleType === sibling.plan.scheduleType)) {
                        setScheduleType(sibling.plan.scheduleType as any);
                        if (sibling.plan.cycleMonths) setCycleMonths(sibling.plan.cycleMonths);
                        if (sibling.plan.weeklyDay !== undefined) setWeeklyDay(sibling.plan.weeklyDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
                    }
                    const sMachName = sibling.sourceMachine.name || sibling.plan.machineName || "เครื่องจักร";
                    const sMachCode = sibling.sourceMachine.code || "";
                    setInheritedFrom({
                        sourceMachineName: sMachName,
                        sourceMachineCode: sMachCode,
                        sourcePlanId: sibling.plan.id,
                        itemCount: sibling.plan.checklistItems.length,
                        matchReason: sibling.matchReason,
                        scheduleType: sibling.plan.scheduleType,
                        cycleMonths: sibling.plan.cycleMonths
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching parts and plans data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setInheritedFrom(null);
            fetchPartsData();
            if (plan) {
                setChecklistItems(plan.checklistItems || []);
                setScheduleType(plan.scheduleType || 'monthly');
                setCycleMonths(plan.cycleMonths || 1);
                setWeeklyDay((plan.weeklyDay ?? 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6);
                setStartDate(
                    plan.startDate
                        ? new Date(plan.startDate).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0]
                );
                setSelectedLocation(plan.customLocation || machine?.Location || machine?.location || "");
                setUseCustomLocation(plan.locationType === "custom");
                setCustomLocation(plan.locationType === "custom" ? (plan.customLocation || "") : "");
            } else {
                setChecklistItems([]);
                setScheduleType(defaultSchedule as any);
                setCycleMonths(1);
                setWeeklyDay(1);
                setStartDate(new Date().toISOString().split('T')[0]);
                setSelectedLocation(machine?.Location || machine?.location || "");
                setUseCustomLocation(false);
                setCustomLocation("");
            }
            setNewItem("");
            setSelectedPartType("");
            setCopyModalOpen(false);
            setCopySearchQuery("");
        }
    }, [isOpen, plan, machine]);

    const handleCopyFromPlan = (sourcePlan: PMPlan, sourceMach?: Machine | Partial<Machine>) => {
        if (!sourcePlan.checklistItems || sourcePlan.checklistItems.length === 0) {
            showError("แผน PM ที่เลือกไม่มีรายการเช็คลิสต์", "ไม่พบรายการ");
            return;
        }
        setChecklistItems([...sourcePlan.checklistItems]);
        if (sourcePlan.scheduleType && !existingMachinePlans.some(p => p.scheduleType === sourcePlan.scheduleType)) {
            setScheduleType(sourcePlan.scheduleType as any);
            if (sourcePlan.cycleMonths) setCycleMonths(sourcePlan.cycleMonths);
            if (sourcePlan.weeklyDay !== undefined) setWeeklyDay(sourcePlan.weeklyDay as 0 | 1 | 2 | 3 | 4 | 5 | 6);
        }
        const sName = sourceMach?.name || sourcePlan.machineName || "เครื่องจักร";
        const sCode = sourceMach?.code || "";
        setInheritedFrom({
            sourceMachineName: sName,
            sourceMachineCode: sCode,
            sourcePlanId: sourcePlan.id,
            itemCount: sourcePlan.checklistItems.length,
            matchReason: "เลือกคัดลอกจากเครื่องอื่น",
            scheduleType: sourcePlan.scheduleType,
            cycleMonths: sourcePlan.cycleMonths
        });
        setCopyModalOpen(false);
        success(`คัดลอก ${sourcePlan.checklistItems.length} รายการ จาก ${sCode ? sCode + ' • ' : ''}${sName} เรียบร้อย`, "คัดลอกสำเร็จ");
    };

    // Prepare list of machines with available PM checklists for manual copy
    const availableCopyPlans = useMemo(() => {
        const machineMapById = new Map<string, Machine>();
        allMachinesList.forEach(m => { if (m.id) machineMapById.set(m.id, m); });

        const list: Array<{ plan: PMPlan; machine?: Machine }> = [];
        const seen = new Set<string>();

        allPlansList.forEach(p => {
            if (p.machineId === machine.id) return;
            if (p.machineName?.trim().toLowerCase() === machine.name?.trim().toLowerCase()) return;
            if (!p.checklistItems || p.checklistItems.length === 0) return;

            const mObj = machineMapById.get(p.machineId) || allMachinesList.find(m => m.name?.trim().toLowerCase() === p.machineName?.trim().toLowerCase());
            const key = `${p.machineId || p.machineName}_${p.scheduleType}`;
            if (!seen.has(key)) {
                seen.add(key);
                list.push({ plan: p, machine: mObj });
            }
        });

        if (!copySearchQuery.trim()) return list;

        const q = copySearchQuery.toLowerCase().trim();
        return list.filter(({ plan: p, machine: m }) => {
            const mName = (m?.name || p.machineName || "").toLowerCase();
            const mCode = (m?.code || "").toLowerCase();
            const mLoc = (m?.Location || m?.location || p.customLocation || "").toLowerCase();
            return mName.includes(q) || mCode.includes(q) || mLoc.includes(q);
        });
    }, [allPlansList, allMachinesList, machine, copySearchQuery]);

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
        const finalItem = selectedPartType ? `${selectedPartType}: ${item}` : item;
        if (!checklistItems.includes(finalItem)) {
            setChecklistItems([...checklistItems, finalItem]);
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
        if (scheduleType === 'monthly') {
            return `PM: ${t("labelMonthly") || "Monthly"} (${cycleMonths} ${t("unitMonth") || "Months"})`;
        } else if (scheduleType === 'weekly') {
            const days = [t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")];
            return `PM: ${t("labelWeekly") || "Weekly"} (${days[weeklyDay]})`;
        } else if (scheduleType === 'yearly') {
            return `PM: ${t("labelYearly") || "Yearly"}`;
        }
        return `PM: ${t("labelOtherCustom") || "Custom"}`;
    };

    const calculateNextDueDate = (start: string, type: string, months: number, dayOfWeek: number) => {
        const d = new Date(start);
        if (type === 'monthly') {
            d.setMonth(d.getMonth() + months);
        } else if (type === 'weekly') {
            const currentDay = d.getDay();
            let distance = dayOfWeek - currentDay;
            if (distance <= 0) {
                distance += 7;
            }
            d.setDate(d.getDate() + distance);
        } else if (type === 'yearly') {
            d.setFullYear(d.getFullYear() + 1);
        }
        return d;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const resolvedLocation = useCustomLocation ? customLocation.trim() : selectedLocation;
            const nextDue = calculateNextDueDate(startDate, scheduleType, cycleMonths, weeklyDay);

            const planData: Omit<PMPlan, "id"> = {
                machineId: machine.id,
                machineName: machine.name,
                taskName: getTaskName(),
                scheduleType,
                cycleMonths: scheduleType === 'monthly' ? cycleMonths : undefined,
                weeklyDay: scheduleType === 'weekly' ? weeklyDay : undefined,
                startDate: new Date(startDate),
                nextDueDate: nextDue,
                checklistItems,
                locationType: useCustomLocation ? "custom" : "machine_Location",
                customLocation: resolvedLocation || machine.Location || machine.location,
                status: "active",
                createdAt: plan?.createdAt || new Date(),
                updatedAt: new Date(),
            };

            if (plan) {
                await updatePMPlan(plan.id, planData);
                success(t("msgSaveSuccess"));
            } else {
                await addPMPlan(planData);
                success(t("msgSaveSuccess"));
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving PM Plan:", error);
            showError(t("msgSaveError"));
        } finally {
            setLoading(false);
        }
    };

    const suggestedItems = getSuggestedItems();

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={t("pmConfigTitle")}>
                <div className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center gap-4 p-4 rounded-xl border bg-bg-tertiary border-white/5">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-inner bg-bg-secondary text-accent-blue">
                            <SettingsIcon size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-lg text-text-primary">{machine.name}</h3>
                                {machine.code && (
                                    <span className="text-xs font-mono font-bold bg-accent-blue/20 text-accent-cyan px-2 py-0.5 rounded border border-accent-blue/30">
                                        {machine.code}
                                    </span>
                                )}
                            </div>
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

                        <div className="space-y-3 bg-bg-secondary/30 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <CheckCircleIcon size={14} className="text-accent-blue" />
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{t("labelChecklist")}</span>
                                    <span className="text-[10px] bg-accent-blue/20 text-accent-blue px-2 py-0.5 rounded-full font-bold">
                                        {checklistItems.length} {t("statFoundHistorySuffix")}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCopyModalOpen(true)}
                                    className="text-xs text-accent-blue hover:text-accent-cyan flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 transition-all font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                                    title="เลือกคัดลอกรายการเช็คลิสต์จากเครื่องจักรอื่น"
                                >
                                    <FileTextIcon size={13} />
                                    <span>📋 คัดลอกจากเครื่องอื่น...</span>
                                </button>
                            </div>

                            {/* Auto-Inherited or Manually Copied Notification Banner */}
                            {inheritedFrom && (
                                <div className="bg-gradient-to-r from-accent-blue/20 via-accent-cyan/15 to-transparent border border-accent-blue/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-accent-blue/25 text-accent-blue flex items-center justify-center shrink-0 mt-0.5 border border-accent-blue/40 shadow-inner">
                                            <FileTextIcon size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-accent-blue flex items-center gap-1">
                                                    ✨ ดึงรายการตรวจเช็ค PM อัตโนมัติ
                                                </span>
                                                <span className="text-[11px] bg-accent-blue/30 text-accent-cyan font-bold px-2 py-0.5 rounded-md border border-accent-blue/40 font-mono">
                                                    {inheritedFrom.sourceMachineCode ? `${inheritedFrom.sourceMachineCode} • ` : ""}{inheritedFrom.sourceMachineName}
                                                </span>
                                                <span className="text-[10px] bg-accent-green/20 text-accent-green font-bold px-2 py-0.5 rounded-md border border-accent-green/30">
                                                    {inheritedFrom.itemCount} รายการ
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-text-muted mt-1">
                                                คัดลอกรายการ PM จากเครื่องในกลุ่มเดียวกัน (<span className="text-text-primary font-medium">{inheritedFrom.matchReason}</span>)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => setCopyModalOpen(true)}
                                            className="px-2.5 py-1.5 rounded-lg bg-bg-secondary hover:bg-white/10 text-text-primary text-xs font-medium border border-white/10 transition-all flex items-center gap-1.5"
                                            title="เลือกคัดลอกจากเครื่องอื่น"
                                        >
                                            <SettingsIcon size={12} className="text-accent-blue" />
                                            <span>เปลี่ยนเครื่อง</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setChecklistItems([]);
                                                setInheritedFrom(null);
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg bg-accent-red/10 hover:bg-accent-red/20 text-accent-red text-xs font-medium border border-accent-red/20 transition-all"
                                            title="ล้างรายการเช็คลิสต์"
                                        >
                                            ล้างรายการ
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                            const finalItem = selectedPartType ? `${selectedPartType}: ${item}` : item;
                                            const isAdded = checklistItems.includes(finalItem);
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

                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar p-1">
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
                                <div ref={checklistEndRef} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                            <ClockIcon size={14} className="text-accent-blue" />
                                            {t("labelTimeFormat")}
                                        </label>
                                        {(existingMonthly || existingWeekly || existingYearly) && (
                                            <span className="text-[10px] font-bold text-accent-red flex items-center gap-1 bg-accent-red/10 px-2 py-0.5 rounded border border-accent-red/20 shadow-sm animate-pulse whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-[250px]" title={`มีแผน ${[existingMonthlyPlan ? `รอบเดือน (${getDaysRemainingText(existingMonthlyPlan)})` : null, existingWeeklyPlan ? `รอบสัปดาห์ (${getDaysRemainingText(existingWeeklyPlan)})` : null, existingYearlyPlan ? `รอบปี (${getDaysRemainingText(existingYearlyPlan)})` : null].filter(Boolean).join(", ")} แล้ว`}>
                                                <AlertTriangleIcon size={12} className="shrink-0" />
                                                <span className="truncate">
                                                    มีแผน {
                                                        [
                                                            existingMonthlyPlan ? `รอบเดือน (${getDaysRemainingText(existingMonthlyPlan)})` : null,
                                                            existingWeeklyPlan ? `รอบสัปดาห์ (${getDaysRemainingText(existingWeeklyPlan)})` : null,
                                                            existingYearlyPlan ? `รอบปี (${getDaysRemainingText(existingYearlyPlan)})` : null
                                                        ].filter(Boolean).join(", ")
                                                    } แล้ว
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex bg-bg-tertiary p-1 rounded-lg border border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => !existingMonthly && setScheduleType('monthly')}
                                            disabled={existingMonthly}
                                            title={existingMonthly ? "เครื่องนี้มีแผนรอบเดือนแล้ว" : ""}
                                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
                                                existingMonthly 
                                                    ? 'opacity-40 cursor-not-allowed bg-black/20 text-white/30' 
                                                    : scheduleType === 'monthly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'
                                            }`}
                                        >
                                            {t("labelMonthly")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !existingWeekly && setScheduleType('weekly')}
                                            disabled={existingWeekly}
                                            title={existingWeekly ? "เครื่องนี้มีแผนรอบสัปดาห์แล้ว" : ""}
                                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
                                                existingWeekly 
                                                    ? 'opacity-40 cursor-not-allowed bg-black/20 text-white/30' 
                                                    : scheduleType === 'weekly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'
                                            }`}
                                        >
                                            {t("labelWeekly")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => !existingYearly && setScheduleType('yearly')}
                                            disabled={existingYearly}
                                            title={existingYearly ? "เครื่องนี้มีแผนรอบปีแล้ว" : ""}
                                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
                                                existingYearly 
                                                    ? 'opacity-40 cursor-not-allowed bg-black/20 text-white/30' 
                                                    : scheduleType === 'yearly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'
                                            }`}
                                        >
                                            {t("labelYearly")}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                        {scheduleType === 'monthly' ? t("labelEveryMonthly") : scheduleType === 'yearly' ? t("labelEveryYearly") : t("labelEveryWeekly")}
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
                                    ) : scheduleType === 'yearly' ? (
                                        <div className="bg-bg-tertiary border border-white/10 rounded-lg p-2.5 text-center text-sm font-medium text-text-primary">
                                            1 {t("labelYears")}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2">
                                            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setWeeklyDay(d as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
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

            {/* Copy From Another Machine Modal */}
            <Modal
                isOpen={copyModalOpen}
                onClose={() => setCopyModalOpen(false)}
                title="คัดลอกรายการตรวจเช็ค PM จากเครื่องอื่น"
            >
                <div className="space-y-4 max-h-[70vh] flex flex-col">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อเครื่อง, รหัส (เช่น MX01, CV01, PK02), หรือสถานที่..."
                            className="input-field w-full pl-9 text-sm"
                            value={copySearchQuery}
                            onChange={(e) => setCopySearchQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                            <SearchIcon size={16} />
                        </div>
                        {copySearchQuery && (
                            <button
                                type="button"
                                onClick={() => setCopySearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                            >
                                <XIcon size={14} />
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-text-muted">
                        เลือกเครื่องจักรที่มีแผน PM เพื่อนำรายการตรวจเช็คมาใช้งานกับ <span className="text-accent-blue font-bold">{machine.code ? `${machine.code} • ` : ""}{machine.name}</span>
                    </p>

                    <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1 max-h-[50vh]">
                        {availableCopyPlans.length === 0 ? (
                            <div className="text-center py-8 text-text-muted opacity-60">
                                <p className="text-sm">ไม่พบเครื่องจักรอื่นที่มีรายการเช็คลิสต์ PM</p>
                            </div>
                        ) : (
                            availableCopyPlans.map(({ plan: p, machine: m }) => {
                                const mName = m?.name || p.machineName || "เครื่องจักร";
                                const mCode = m?.code || "";
                                const mLoc = m?.Location || m?.location || p.customLocation || "";
                                const count = p.checklistItems?.length || 0;
                                const typeLabel = p.scheduleType === 'monthly' ? `รายเดือน (${p.cycleMonths || 1} เดือน)` : p.scheduleType === 'weekly' ? 'รายสัปดาห์' : 'รายปี';

                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleCopyFromPlan(p, m)}
                                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-bg-tertiary border border-white/5 hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center text-accent-blue group-hover:scale-105 transition-transform border border-white/5">
                                                <FileTextIcon size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-sm text-text-primary group-hover:text-accent-blue transition-colors">
                                                        {mName}
                                                    </h4>
                                                    {mCode && (
                                                        <span className="text-[10px] font-mono bg-accent-blue/20 text-accent-cyan px-1.5 py-0.5 rounded border border-accent-blue/30 font-bold">
                                                            {mCode}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-muted mt-0.5">
                                                    {mLoc && <span>{mLoc} • </span>}
                                                    <span>แผน {typeLabel}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs bg-accent-green/20 text-accent-green font-bold px-2 py-1 rounded-lg border border-accent-green/30">
                                                {count} รายการ
                                            </span>
                                            <span className="text-xs text-accent-blue group-hover:translate-x-0.5 transition-transform font-medium">
                                                คัดลอก →
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="pt-3 border-t border-white/5 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setCopyModalOpen(false)}
                            className="px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary text-sm font-bold hover:bg-white/10 transition-colors"
                        >
                            {t("actionCancel")}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
