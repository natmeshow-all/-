"use client";

import React, { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { DownloadIcon, FileTextIcon, SettingsIcon, CalendarIcon } from "../ui/Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { getMachines, getMaintenanceRecords, getParts, getSpareParts } from "../../lib/firebaseService";
import { telegramService } from "../../services/telegramService";
import * as XLSX from "xlsx";

interface ExportExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ExportExcelModal({ isOpen, onClose }: ExportExcelModalProps) {
    const { t } = useLanguage();
    const { success, error, info } = useToast();
    
    const [exportType, setExportType] = useState<"pm" | "replacement" | "inventory" | "machines">("pm");
    const [machineId, setMachineId] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [isExporting, setIsExporting] = useState(false);
    const [locationFilter, setLocationFilter] = useState<string>("all");
    
    const [machines, setMachines] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadMachines();
            // Default dates: last 30 days
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(today.getDate() - 30);
            
            setEndDate(today.toISOString().split('T')[0]);
            setStartDate(lastMonth.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const loadMachines = async () => {
        try {
            const m = await getMachines();
            setMachines(m);
        } catch (e) {
            console.error(e);
        }
    };

    const generateExcelData = async (ignoreDateFilter: boolean = false) => {
        let rawData: any[] = [];
        let headers: string[] = [];
        let sheetName = "Sheet1";

        if (exportType === "pm" || exportType === "replacement") {
            let records = await getMaintenanceRecords();
            
            // Filter by type
            if (exportType === "pm") {
                records = records.filter(r => r.type === "preventive" || r.type === "inspection" || r.type === "oilChange");
                sheetName = "PM_History";
            } else {
                records = records.filter(r => r.type === "partReplacement" || r.type === "corrective");
                sheetName = "Replacement_History";
            }

            // Filter by Machine
            if (machineId !== "all") {
                records = records.filter(r => r.machineId === machineId || r.machineCode === machineId || r.machineName === machineId);
            }

            // Filter by Date
            if (startDate && !ignoreDateFilter) {
                let sStr = startDate;
                const sYear = parseInt(sStr.split('-')[0]);
                if (sYear > 2400) sStr = `${sYear - 543}-${sStr.split('-').slice(1).join('-')}`;
                
                const sDate = new Date(sStr).getTime();
                records = records.filter(r => new Date(r.date).getTime() >= sDate);
            }
            if (endDate && !ignoreDateFilter) {
                let eStr = endDate;
                const eYear = parseInt(eStr.split('-')[0]);
                if (eYear > 2400) eStr = `${eYear - 543}-${eStr.split('-').slice(1).join('-')}`;

                const eDate = new Date(eStr);
                eDate.setHours(23, 59, 59, 999);
                records = records.filter(r => new Date(r.date).getTime() <= eDate.getTime());
            }

            // Map data
            rawData = records.map(r => ({
                "วันที่ดำเนินการ": new Date(r.date).toLocaleDateString('th-TH'),
                "รหัสเครื่องจักร": r.machineCode || "-",
                "ชื่อเครื่องจักร": r.machineName || "-",
                "ประเภทงาน": r.type === "preventive" ? "ซ่อมบำรุงเชิงป้องกัน (PM)" : 
                             r.type === "partReplacement" ? "เปลี่ยนอะไหล่" :
                             r.type === "corrective" ? "ซ่อมแซมแก้ไข" : r.type,
                "ผู้ดำเนินการ": r.technician || "-",
                "สถานะ": r.status === "completed" ? "เสร็จสิ้น" : r.status === "inProgress" ? "กำลังดำเนินการ" : "รอดำเนินการ",
                "รายละเอียด": [r.description, r.details].filter(Boolean).join("\n") || "-",
                "สรุปการตรวจสอบ": r.checklist ? r.checklist.filter(c => c.completed).length + "/" + r.checklist.length : "-",
                "รายการตรวจสอบ": r.checklist ? r.checklist.map(c => `[${c.completed ? '✓' : '✗'}] ${c.item}${c.value ? ` (${c.value})` : ''}`).join('\n') : "-",
            }));
            
        } else if (exportType === "inventory") {
            const parts = await getParts();
            sheetName = "Parts_Inventory";
            
            // Filter by machine
            let filteredParts = parts;
            if (machineId !== "all") {
                filteredParts = parts.filter(p => p.machineId === machineId || p.machineName === machineId);
            }
            
            rawData = filteredParts.map(p => ({
                "ชื่ออะไหล่": p.name || "-",
                "รายละเอียด": p.description || "-",
                "เครื่องจักรที่ใช้": p.machineName || "-",
                "สถานที่ (Location)": p.location || p.Location || "-",
                "ประเภท": p.category || "-",
                "จำนวนที่มี": p.quantity || 0,
                "เปลี่ยนล่าสุดเมื่อ": p.lastReplacedDate ? new Date(p.lastReplacedDate).toLocaleDateString('th-TH') : "-",
            }));
            
        } else if (exportType === "machines") {
            const m = await getMachines();
            sheetName = "Machine_List";
            rawData = m.map(p => ({
                "รหัสเครื่องจักร": p.code || "-",
                "ชื่อเครื่องจักร": p.name || "-",
                "สถานที่ (Location)": p.location || p.Location || "-",
                "สถานะ": p.status || "-",
            }));
        }

        return { rawData, sheetName };
    };

    const handleExport = async (sendToTelegram: boolean = false) => {
        try {
            setIsExporting(true);
            info("เตรียมข้อมูล...", "กำลังรวบรวมข้อมูลตามที่เลือก");
            
            let { rawData, sheetName } = await generateExcelData();
            
            if (rawData.length === 0) {
                if ((exportType === "pm" || exportType === "replacement") && (startDate || endDate)) {
                    // Try again without date filter to see if we have ANY data
                    const fallback = await generateExcelData(true);
                    if (fallback.rawData.length > 0) {
                        info("ปรับวันที่อัตโนมัติ", "ไม่พบข้อมูลในวันที่เลือก ระบบจึงดึงข้อมูลทั้งหมดที่มีมาให้แทน");
                        rawData = fallback.rawData;
                    } else {
                        error("ไม่พบข้อมูล", "ไม่มีข้อมูลตามเงื่อนไขที่เลือกเลย");
                        setIsExporting(false);
                        return;
                    }
                } else {
                    error("ไม่พบข้อมูล", "ไม่มีข้อมูลในช่วงเวลาหรือเงื่อนไขที่เลือก");
                    setIsExporting(false);
                    return;
                }
            }

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rawData);
            
            // Auto-size columns (rough estimation)
            const colWidths = Object.keys(rawData[0] || {}).map(key => ({
                wch: Math.max(key.length + 5, 15) // minimum width 15
            }));
            ws['!cols'] = colWidths;
            
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            
            // Generate file name
            const timestamp = new Date().toISOString().split('T')[0];
            const fileName = `Export_${sheetName}_${timestamp}.xlsx`;

            if (sendToTelegram) {
                info("กำลังส่ง Telegram...", "กำลังจัดเตรียมไฟล์");
                // Create base64 buffer for Telegram
                const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
                
                const caption = `📊 <b>รายงาน: ${sheetName}</b>\n📅 ข้อมูลตั้งแต่วันที่ ${new Date(startDate).toLocaleDateString('th-TH')} ถึง ${new Date(endDate).toLocaleDateString('th-TH')}\nรวมทั้งหมด ${rawData.length} รายการ`;
                
                const result = await telegramService.sendExcelDocument(base64Data, fileName, caption);
                if (result.success) {
                    success("ส่ง Telegram สำเร็จ", "ไฟล์ถูกส่งไปยัง Telegram เรียบร้อยแล้ว");
                } else {
                    error("ส่ง Telegram ล้มเหลว", result.error?.message || "ไม่สามารถส่งไฟล์ได้");
                }
            } else {
                // Browser Download
                XLSX.writeFile(wb, fileName);
                success("ส่งออกสำเร็จ", "ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว");
            }
            
            onClose();
        } catch (e: any) {
            console.error("Export error:", e);
            error("เกิดข้อผิดพลาด", e.message || "ไม่สามารถสร้างไฟล์ Excel ได้");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="ส่งออกข้อมูล (Export to Excel)"
            titleIcon={<DownloadIcon size={20} className="text-accent-cyan" />}
            size="md"
        >
            <div className="space-y-4">
                {/* Data Type */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <FileTextIcon size={16} className="text-text-muted" />
                        ประเภทข้อมูลที่ต้องการ
                    </label>
                    <select
                        value={exportType}
                        onChange={(e: any) => setExportType(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-accent-cyan/50 focus:bg-white/5"
                    >
                        <option value="pm">ประวัติซ่อมบำรุง (PM & Inspection)</option>
                        <option value="replacement">ประวัติการเปลี่ยนอะไหล่ (Part Replacements)</option>
                        <option value="inventory">รายการสต๊อกอะไหล่ (Parts Inventory)</option>
                        <option value="machines">รายชื่อเครื่องจักรทั้งหมด (Machines)</option>
                    </select>
                </div>

                {/* Location Filter & Machine Filter */}
                {exportType !== "machines" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                                <SettingsIcon size={16} className="text-text-muted" />
                                เลือกโซน (Location)
                            </label>
                            <select
                                value={locationFilter}
                                onChange={(e) => {
                                    setLocationFilter(e.target.value);
                                    setMachineId("all");
                                }}
                                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-accent-cyan/50 focus:bg-white/5"
                            >
                                <option value="all">-- ทุกโซน --</option>
                                {Array.from(new Set(machines.map(m => m.location || m.Location).filter(Boolean))).sort().map(loc => (
                                    <option key={loc as string} value={loc as string}>{loc as string}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                                <SettingsIcon size={16} className="text-text-muted" />
                                เลือกเครื่องจักร (Machine)
                            </label>
                            <select
                                value={machineId}
                                onChange={(e) => setMachineId(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-accent-cyan/50 focus:bg-white/5"
                            >
                                <option value="all">-- ทุกเครื่องจักร --</option>
                                {machines.filter(m => locationFilter === "all" || (m.location || m.Location) === locationFilter).map(m => (
                                    <option key={m.id} value={m.id}>{m.code ? `[${m.code}] ` : ""}{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Date Range (Only for history records) */}
                {(exportType === "pm" || exportType === "replacement") && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                                <CalendarIcon size={16} className="text-text-muted" />
                                ตั้งแต่วันที่
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-accent-cyan/50 focus:bg-white/5 [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                                <CalendarIcon size={16} className="text-text-muted" />
                                ถึงวันที่
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 outline-none focus:border-accent-cyan/50 focus:bg-white/5 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                    <button
                        onClick={() => handleExport(false)}
                        disabled={isExporting}
                        className="w-full btn btn-active bg-accent-green text-bg-primary hover:bg-accent-green/90 border-none font-bold"
                    >
                        {isExporting ? <span className="loading loading-spinner loading-sm"></span> : <DownloadIcon size={18} />}
                        ดาวน์โหลดลงเครื่อง (Download Excel)
                    </button>
                    
                    <button
                        onClick={() => handleExport(true)}
                        disabled={isExporting}
                        className="w-full btn btn-active bg-[#0088cc] text-white hover:bg-[#0088cc]/90 border-none font-bold"
                    >
                        {isExporting ? <span className="loading loading-spinner loading-sm"></span> : 
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>}
                        ส่งไฟล์เข้ากลุ่ม Telegram (Send to Telegram)
                    </button>
                    <p className="text-xs text-text-muted text-center italic mt-1">
                        * สำหรับ Line OA จะไม่รองรับการส่งไฟล์ Excel ตรงๆ แนะนำให้ดาวน์โหลดหรือใช้ Telegram
                    </p>
                </div>
            </div>
        </Modal>
    );
}
