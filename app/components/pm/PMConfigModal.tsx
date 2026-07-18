"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { Machine, PMPlan } from "../../types";
import { CalendarIcon, ClockIcon, CheckCircleIcon, SettingsIcon, ActivityIcon, MapPinIcon, ChevronDownIcon, FileTextIcon } from "../ui/Icons";
import { addPMPlan, updatePMPlan, getParts, getPMPlans } from "../../lib/firebaseService";
import { useToast } from "../../contexts/ToastContext";

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
    "พัดลมระบายอากาศ": ["ตรวจใบพัด", "ตรวจสั่นสะเทือน", "ทำความสะอาด", "ตรวจเช็คกระแสไฟฟ้า (Amp)"],

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

export default function PMConfigModal({ isOpen, onClose, machine, plan, onSuccess }: PMConfigModalProps) {
    const { t } = useLanguage();
    const { error: showError } = useToast();
    const [loading, setLoading] = useState(false);

    const [checklistItems, setChecklistItems] = useState<string[]>(plan?.checklistItems || []);
    const [newItem, setNewItem] = useState("");
    const [selectedPartType, setSelectedPartType] = useState("");

    const [scheduleType, setScheduleType] = useState<"monthly" | "weekly" | "yearly" | "custom">(plan?.scheduleType || "monthly");
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
            setChecklistItems(plan.checklistItems || []);
            setSelectedLocation(plan.customLocation || machine.Location || "");
            setUseCustomLocation(plan.locationType === "custom");
        }
    }, [plan, machine.Location]);

    const fetchPartsData = async () => {
        setLoadingData(true);
        try {
            const [parts, plans] = await Promise.all([
                getParts(),
                getPMPlans()
            ]);
            
            const uniquePartNames = Array.from(new Set(parts.map(p => p.partName).filter(Boolean))).sort();
            setAllPartNames(uniquePartNames);
            
            // Extract unique locations from Parts
            const partLocations = parts.map(p => p.Location).filter(Boolean);
            // Extract unique custom locations from existing PM plans
            const planLocations = plans.map(p => p.customLocation).filter(Boolean);
            
            // Merge both and remove duplicates
            const uniqueLocations = Array.from(new Set([...partLocations, ...planLocations])).sort();
            setAllLocations(uniqueLocations as string[]);
        } catch (error) {
            console.error("Error fetching parts and plans data:", error);
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
        if (plan?.taskName) return plan.taskName;
        
        if (scheduleType === 'monthly') {
            return `PM: ${t("labelMonthly") || "Monthly"} (${cycleMonths} ${t("unitMonth") || "Months"})`;
        } else if (scheduleType === 'weekly') {
            const days = [t("daySun"), t("dayMon"), t("dayTue"), t("dayWed"), t("dayThu"), t("dayFri"), t("daySat")];
            return `PM: ${t("labelWeekly") || "Weekly"} (${days[weeklyDay]})`;
        } else if (scheduleType === 'yearly') {
            return `PM: ${t("labelYearly") || "Yearly"}`;
        }
        return `PM`;
    };

    const getLocation = () => {
        if (useCustomLocation) return customLocation;
        return selectedLocation;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const taskName = getTaskName();
        if (!taskName) {
            showError("กรุณาระบุประเภทงานซ่อมบำรุง", "Validation Error");
            return;
        }
        if (checklistItems.length === 0) {
            showError("กรุณาเพิ่มรายการที่ต้องทำอย่างน้อย 1 รายการ", "Validation Error");
            return;
        }
        if (!startDate) {
            showError("กรุณาระบุวันที่เริ่มรอบแรก", "Validation Error");
            return;
        }
        setLoading(true);

        try {
            // Check for duplicate plans
            const allPlans = await getPMPlans();
            let duplicateErrorMsg = "";

            const isDuplicate = allPlans.some(p => {
                // If it's a different machine, or we are editing this exact plan, skip
                if (String(p.machineId) !== String(machine.id) || p.id === plan?.id) return false;
                
                // 1. Check for unclosed tasks (due or overdue)
                // If nextDueDate is in the past or today, the task is still pending/overdue
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const pDueDate = new Date(p.nextDueDate);
                pDueDate.setHours(0, 0, 0, 0);
                
                if (pDueDate <= today) {
                    duplicateErrorMsg = "เครื่องจักรนี้มีงาน PM ค้างอยู่ (ยังไม่ได้ปิดงาน) ไม่สามารถสร้างแผนใหม่ได้จนกว่าจะเคลียร์งานเก่า";
                    return true;
                }

                // 2. Check if the schedule type (monthly/weekly/yearly) is the same.
                // We only allow ONE plan of each type per machine.
                const pScheduleType = p.scheduleType || 'monthly';
                if (pScheduleType === scheduleType) {
                    const scheduleText = scheduleType === 'monthly' ? 'รายเดือน' : scheduleType === 'weekly' ? 'รายสัปดาห์' : 'รายปี';
                    duplicateErrorMsg = `เครื่องจักรนี้มีแผนซ่อมบำรุงแบบ "${scheduleText}" อยู่แล้ว กรุณาแก้ไขจากแผนเดิมแทนการสร้างใหม่`;
                    return true;
                }
                
                return false;
            });

            if (isDuplicate) {
                showError(duplicateErrorMsg, "ไม่สามารถสร้างแผนได้");
                setLoading(false);
                return;
            }

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
                                    <button
                                        type="button"
                                        onClick={() => setScheduleType('yearly')}
                                        className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${scheduleType === 'yearly' ? 'bg-accent-blue text-white shadow-md' : 'text-text-muted hover:text-white'}`}
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
