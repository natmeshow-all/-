"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import MaintenanceRecordModal from "../components/forms/MaintenanceRecordModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import Modal from "../components/ui/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { formatDateThai } from "../lib/dateUtils";
import { getMaintenanceRecordsPaginated, deleteMaintenanceRecord, getMachines, updateMaintenanceRecord, addMaintenanceRecord, getMaintenanceRecordsByMachine, getSystemSettings, updateMachine, getPMPlans, updatePMPlan } from "../lib/firebaseService";
import { MaintenanceRecord, Machine, ChecklistItemResult, MaintenanceStatus } from "../types";
import { lineService } from "../services/lineService";
import { telegramService } from "../services/telegramService";
import { toJpeg } from "html-to-image";
import { ResolutionReportCard } from "../components/ResolutionReportCard";
import {
    WrenchIcon,
    PlusIcon,
    CalendarIcon,
    UserIcon,
    ClockIcon,
    CheckIcon,
    AlertTriangleIcon,
    TrashIcon,
    SettingsIcon,
    ZapIcon,
    FileTextIcon,
    SearchIcon,
    FilterIcon,
    MapPinIcon,
    RefreshCwIcon,
    BoxIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ActivityIcon,
    TargetIcon,
    ImageIcon,
    EditIcon,
    SaveIcon,
    XIcon,
    LayersIcon,
    CheckCircleIcon
} from "../components/ui/Icons";

import RecordDetailsModal from "../components/pm/RecordDetailsModal";
import PartReplacementPlanModal from "../components/pm/PartReplacementPlanModal";

export default function MaintenancePage() {
    const { t } = useLanguage();
    const { checkAuth, isAdmin } = useAuth();
    const { success, error } = useToast();
    const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());


    // Expanded Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMachine, setSelectedMachine] = useState("all");
    const [selectedLocation, setSelectedLocation] = useState("all");
    const [selectedMonth, setSelectedMonth] = useState("all");
    const [activeQuickFilter, setActiveQuickFilter] = useState<'all' | 'thisMonth' | 'thisWeek' | 'yearly'>('all');
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [activeTaskTypeFilter, setActiveTaskTypeFilter] = useState<'all' | 'preventive' | 'corrective' | 'partReplacement' | 'fromPM'>('all');
    const [allMachines, setAllMachines] = useState<Machine[]>([]);
    const [allRecordsForStats, setAllRecordsForStats] = useState<MaintenanceRecord[]>([]);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);
    const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
    const resolutionReportCardRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    // Part Replacement Plan Modal State
    const [replacementPlanOpen, setReplacementPlanOpen] = useState(false);
    const [replacementPlanMachineId, setReplacementPlanMachineId] = useState("");
    const [replacementPlanMachineName, setReplacementPlanMachineName] = useState("");
    const openReplacementPlan = (machineId: string, machineName: string) => {
        setReplacementPlanMachineId(machineId);
        setReplacementPlanMachineName(machineName);
        setReplacementPlanOpen(true);
    };
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [allFetchedRecords, setAllFetchedRecords] = useState<MaintenanceRecord[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<{ date: string, key: string } | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    // Admin Editing States
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [editingChecklist, setEditingChecklist] = useState<any[]>([]);
    const [editingRecordStatus, setEditingRecordStatus] = useState<string | null>(null);
    const [editingRecordDetails, setEditingRecordDetails] = useState<string>("");
    const [editingRecordDate, setEditingRecordDate] = useState<string | null>(null);
    const [editingRecordResolvedDate, setEditingRecordResolvedDate] = useState<string | null>(null);

    // Edit description state
    const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
    const [editingDescriptionText, setEditingDescriptionText] = useState<string>("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    
    // Resolve Issue State
    const [recordToResolveId, setRecordToResolveId] = useState<string | null>(null);
    const [resolveDetails, setResolveDetails] = useState("");
    const [resolveLevel, setResolveLevel] = useState<1 | 2 | 3>(1);
    const [resolveProblemCount, setResolveProblemCount] = useState(1);
    const [resolveLocation, setResolveLocation] = useState("");
    const [useCustomLocation, setUseCustomLocation] = useState(false);
    const [resolvedDate, setResolvedDate] = useState("");



    const handleStartEditChecklist = (record: MaintenanceRecord) => {
        setEditingRecordId(record.id);
        setEditingChecklist(record.checklist ? JSON.parse(JSON.stringify(record.checklist)) : []);
        setEditingRecordStatus(record.status);
        setEditingRecordDetails(record.details || "");
        
        // Format date for input type="date"
        try {
            const dateObj = new Date(record.date);
            const offset = dateObj.getTimezoneOffset() * 60000;
            const localISOTime = new Date(dateObj.getTime() - offset).toISOString().split('T')[0];
            setEditingRecordDate(localISOTime);
        } catch(e) {
            setEditingRecordDate(null);
        }
        
        if (record.resolvedAt) {
            try {
                const rDateObj = new Date(record.resolvedAt);
                const offset = rDateObj.getTimezoneOffset() * 60000;
                const rLocalISOTime = new Date(rDateObj.getTime() - offset).toISOString().split('T')[0];
                setEditingRecordResolvedDate(rLocalISOTime);
            } catch(e) {
                setEditingRecordResolvedDate(null);
            }
        } else {
            setEditingRecordResolvedDate(null);
        }
    };

    const handleChecklistItemValueChange = (idx: number, newValue: string) => {
        setEditingChecklist(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], value: newValue };
            return next;
        });
    };

    const handleChecklistItemCompletedChange = (idx: number, newCompleted: boolean) => {
        setEditingChecklist(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], completed: newCompleted };
            return next;
        });
    };
    const allLocations = useMemo(() => {
        return Array.from(new Set(allMachines.map(m => m.Location || m.location).filter(Boolean))).sort();
    }, [allMachines]);

    const handleResolveIssue = (recordId: string, count: number = 1) => {
        setRecordToResolveId(recordId);
        setResolveProblemCount(count);
        setResolveLevel(count >= 3 ? 3 : count === 2 ? 2 : 1);
        setResolveDetails("");
        
        let initialLoc = "";
        if (recordId === 'demo') {
            initialLoc = "เครน AS/RS (Demo)";
        } else {
            const record = records.find(r => r.id === recordId);
            if (record) {
                const machine = allMachines.find(m => m.id === record.machineId || m.name === record.machineName);
                initialLoc = record.Location || record.location || machine?.Location || machine?.location || "";
            }
        }
        
        setResolveLocation(initialLoc);
        setUseCustomLocation(initialLoc ? !allLocations.includes(initialLoc) : false);
        
        // Default resolved date/time to now
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
        setResolvedDate(localISOTime);
        
        setResolveConfirmOpen(true);
    };

    const handleConfirmResolve = async () => {
        if (!recordToResolveId) return;
        
        // Generate Report Image Base64 BEFORE closing the modal
        let telegramImageBase64 = undefined;
        let uploadedImageUrl = undefined;
        
        if (resolutionReportCardRef.current) {
            try {
                // Short wait to ensure rendering is complete
                await new Promise(r => setTimeout(r, 150));
                telegramImageBase64 = await toJpeg(resolutionReportCardRef.current, {
                    quality: 0.85,
                    backgroundColor: "#0F172A",
                    pixelRatio: 1.5
                });
                
                // Upload for Line
                const arr = telegramImageBase64.split(',');
                const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const blob = new Blob([u8arr], {type: mime});
                
                const formData = new FormData();
                formData.append('image', blob, 'resolution-report.jpg');

                const uploadRes = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData
                });
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    uploadedImageUrl = data.url;
                }
            } catch (imgError) {
                console.error("Failed to generate report image:", imgError);
            }
        }
        
        setResolveConfirmOpen(false);
        
        const recordToUpdate = records.find(r => r.id === recordToResolveId);
        const locationToSave = useCustomLocation ? resolveLocation : resolveLocation;
        
        // Update machine location if we have a real record and a valid machine
        if (recordToUpdate && locationToSave) {
            const machine = allMachines.find(m => m.id === recordToUpdate.machineId || m.name === recordToUpdate.machineName);
            if (machine && machine.id && machine.Location !== locationToSave) {
                try {
                    await updateMachine(machine.id, { Location: locationToSave });
                    // Refresh machines softly in the background to get updated location
                    getMachines().then(res => setAllMachines(res));
                } catch (e) {
                    console.error("Failed to update machine location:", e);
                }
            }
        }
        
        if (recordToResolveId === 'demo') {
            const demoRecord: MaintenanceRecord = {
                id: 'demo',
                machineId: 'demo-1',
                machineName: 'Rack oven No.1 (DEMO)',
                machineCode: 'HT02-DEMO',
                description: '[PM พบปัญหา] ทดสอบระบบมอเตอร์สั่น',
                type: 'corrective',
                priority: 'high',
                status: 'completed',
                date: new Date(),
                technician: 'คุณณัฐชนน (Demo)',
                details: resolveDetails || 'นี่คือการทดสอบระบบส่งแจ้งเตือน',
                resolutionLevel: resolveLevel,
                resolvedAt: new Date().toISOString(),
                createdAt: new Date(),
                updatedAt: new Date(),
            } as MaintenanceRecord;
            
            try {
                const settings = await getSystemSettings();
                const lineEnabled = (settings as any)?.lineNotificationsEnabled ?? true;
                const telegramEnabled = (settings as any)?.telegramNotificationsEnabled ?? false;
                if (lineEnabled) {
                    await lineService.sendResolutionNotification(demoRecord, uploadedImageUrl);
                }
                if (telegramEnabled) {
                    await telegramService.sendResolutionNotification(demoRecord, telegramImageBase64);
                }
            } catch (err) {
                console.error('Demo notify failed', err);
            }
            
            success("ทดลองส่งแจ้งเตือนตัวอย่างสำเร็จ! (ตรวจสอบได้ที่ Line / Telegram)");
            return;
        }

        try {
            await updateMaintenanceRecord(recordToResolveId, {
                status: 'completed',
                resolvedAt: resolvedDate ? new Date(resolvedDate).toISOString() : new Date().toISOString(),
                details: resolveDetails,
                resolutionLevel: resolveLevel,
                Location: locationToSave
            });
            success("อัพเดทสถานะสำเร็จ");
            
            // Send Line and Telegram notifications
            if (recordToUpdate) {
                try {
                    const settings = await getSystemSettings();
                    const lineEnabled = (settings as any)?.lineNotificationsEnabled ?? true;
                    const telegramEnabled = (settings as any)?.telegramNotificationsEnabled ?? false;
                    
                    const fullRecord: MaintenanceRecord = {
                        ...recordToUpdate,
                        status: 'completed',
                        resolvedAt: resolvedDate ? new Date(resolvedDate).toISOString() : new Date().toISOString(),
                        details: resolveDetails,
                        resolutionLevel: resolveLevel,
                        Location: locationToSave
                    };
                    
                    if (lineEnabled) {
                        await lineService.sendResolutionNotification(fullRecord, uploadedImageUrl);
                    }
                    if (telegramEnabled) {
                        await telegramService.sendResolutionNotification(fullRecord, telegramImageBase64);
                    }
                } catch (notifyErr) {
                    console.error("Failed to send resolution notification", notifyErr);
                }
            }

            // Optimistic update: mark record as completed immediately so efficiency score re-renders right away
            const resolvedIso = resolvedDate ? new Date(resolvedDate).toISOString() : new Date().toISOString();
            setAllFetchedRecords(prev => prev.map(r =>
                r.id === recordToResolveId
                    ? { ...r, status: 'completed', resolvedAt: resolvedIso, details: resolveDetails, resolutionLevel: resolveLevel, Location: locationToSave }
                    : r
            ));
            setRecords(prev => prev.map(r =>
                r.id === recordToResolveId
                    ? { ...r, status: 'completed', resolvedAt: resolvedIso, details: resolveDetails, resolutionLevel: resolveLevel, Location: locationToSave }
                    : r
            ));

            fetchInitialRecords();
        } catch (err) {
            console.error("Error resolving issue:", err);
            error("เกิดข้อผิดพลาดในการอัพเดทสถานะ");
        }
        setRecordToResolveId(null);
    };

    const handleSaveChecklist = async (recordId: string) => {
        setIsSavingEdit(true);
        try {
            const updateData: any = {
                checklist: editingChecklist,
                details: editingRecordDetails,
            };
            if (editingRecordStatus) {
                updateData.status = editingRecordStatus;
            }
            const currentRecord = records.find(r => r.id === recordId);
            if (editingRecordDate) {
                updateData.date = new Date(editingRecordDate);
            }
            if (editingRecordResolvedDate) {
                updateData.resolvedAt = new Date(editingRecordResolvedDate).toISOString();
            } else if (editingRecordStatus === 'completed' && !currentRecord?.resolvedAt) {
                updateData.resolvedAt = new Date().toISOString();
            }
            await updateMaintenanceRecord(recordId, updateData);
            
            // Also update PM Plan's checklistStandards if this is a PM record with a linked plan
            if (currentRecord?.pmPlanId) {
                try {
                    const allPlans = await getPMPlans();
                    const plan = allPlans.find(p => p.id === currentRecord.pmPlanId);
                    if (plan) {
                        const newStandards = { ...plan.checklistStandards };
                        let hasChanges = false;
                        editingChecklist.forEach(item => {
                            if (item.standard && (item.standard.min !== undefined || item.standard.max !== undefined)) {
                                newStandards[item.item] = {
                                    ...newStandards[item.item],
                                    ...item.standard
                                };
                                hasChanges = true;
                            }
                        });
                        if (hasChanges) {
                            await updatePMPlan(plan.id, { checklistStandards: newStandards });
                        }
                    }
                } catch (e) {
                    console.error("Error updating PM Plan standards:", e);
                }
            }
            
            // Generate pending part replacement plans for items marked "ถึงกำหนดเปลี่ยน"
            if (currentRecord) {
                const dueItems = editingChecklist.filter(item => item.value?.includes("ถึงกำหนดเปลี่ยน"));
                if (dueItems.length > 0) {
                    const existingRecords = await getMaintenanceRecordsByMachine(currentRecord.machineId);
                    
                    for (const item of dueItems) {
                        const isAlreadyPlanned = existingRecords.some(r => 
                            r.type === "partReplacement" && 
                            r.status === "pending" && 
                            (r as any).fromPM === true && 
                            (r as any).pmPlanId === recordId && 
                            (r as any).checklistItemLabel === item.item
                        );

                        if (!isAlreadyPlanned) {
                            await addMaintenanceRecord({
                                machineId: currentRecord.machineId,
                                machineName: currentRecord.machineName,
                                description: `[แผน PM] เปลี่ยนอะไหล่: ${item.item}`,
                                type: "partReplacement",
                                priority: "high",
                                status: "pending",
                                date: new Date(),
                                technician: "Admin",
                                Location: currentRecord.Location || "",
                                fromPM: true,
                                pmTaskName: currentRecord.description || "PM Task",
                                pmPlanId: recordId,
                                checklistItemLabel: item.item,
                                partName: item.item,
                            } as any);
                        }
                    }
                }
            }
            
            // Optimistic update of local records state
            setRecords(prev => prev.map(r => {
                if (r.id === recordId) {
                    const newStatus = (editingRecordStatus as any) || r.status;
                    const newDate = editingRecordDate ? new Date(editingRecordDate) : r.date;
                    const newResolvedAt = editingRecordResolvedDate 
                        ? new Date(editingRecordResolvedDate).toISOString() 
                        : (newStatus === 'completed' && !r.resolvedAt ? new Date().toISOString() : r.resolvedAt);
                    return {
                        ...r,
                        checklist: editingChecklist,
                        details: editingRecordDetails,
                        status: newStatus,
                        date: newDate,
                        resolvedAt: newResolvedAt,
                        updatedAt: new Date()
                    };
                }
                return r;
            }));
            setAllFetchedRecords(prev => prev.map(r => {
                if (r.id === recordId) {
                    const newStatus = (editingRecordStatus as any) || r.status;
                    const newDate = editingRecordDate ? new Date(editingRecordDate) : r.date;
                    const newResolvedAt = editingRecordResolvedDate 
                        ? new Date(editingRecordResolvedDate).toISOString() 
                        : (newStatus === 'completed' && !r.resolvedAt ? new Date().toISOString() : r.resolvedAt);
                    return {
                        ...r,
                        checklist: editingChecklist,
                        details: editingRecordDetails,
                        status: newStatus,
                        date: newDate,
                        resolvedAt: newResolvedAt,
                        updatedAt: new Date()
                    };
                }
                return r;
            }));
            
            setEditingRecordId(null);
            success(t("msgSaveSuccess") || "บันทึกข้อมูลสำเร็จ");
        } catch (err: any) {
            console.error("Error saving checklist edits:", err);
            error(t("msgSaveError") || "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const calculateLifespan = (dateString: string | Date | undefined) => {
        if (!dateString) return null;
        const past = new Date(dateString);
        const now = new Date();
        // If the date is in the future (e.g. they mistakenly selected tomorrow), just show 0 days
        if (now.getTime() < past.getTime()) return { years: 0, months: 0, days: 0, totalDays: 0 };
        
        const diffTime = Math.abs(now.getTime() - past.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = (diffDays % 365) % 30;
        
        return { years, months, days, totalDays: diffDays };
    };

    const getOptionsByValue = (val: string, itemText: string) => {
        const l = itemText.toLowerCase();
        if (l.includes("ความตึง") || l.includes("tension")) {
            return ["เหมาะสม", "ตึงไป", "หย่อนไป", "ต้องปรับ"];
        }
        if (l.includes("ทำความสะอาด") || l.includes("ล้าง") || l.includes("หล่อลื่น") || l.includes("clean") || l.includes("lubricate") || l.includes("calibrat") || l.includes("ฉีดสารหล่อลื่น") || l.includes("เช็ด")) {
            return ["เรียบร้อย", "บางส่วน", "ยังไม่ได้ทำ"];
        }
        if (l.includes("ระดับ") || l.includes("level")) {
            return ["ปกติ", "ต่ำ", "ต้องเติม"];
        }
        if (l.includes("รอยรั่ว") || l.includes("รอยแตก") || l.includes("รั่วซึม") || l.includes("leak") || l.includes("crack")) {
            return ["ไม่มี", "มีเล็กน้อย", "มีมาก / ต้องซ่อม"];
        }
        if (l.includes("เสียง") || l.includes("sound") || l.includes("noise")) {
            return ["ปกติ", "เสียงดัง", "ผิดปกติ / ต้องตรวจสอบ"];
        }
        if (l.includes("ตรวจ") || l.includes("สภาพ") || l.includes("check") || l.includes("inspect")) {
            return ["สมบูรณ์", "พอใช้", "ถึงกำหนดเปลี่ยน"];
        }
        
        // Fallback detection by current value
        if (val.includes("สมบูรณ์") || val.includes("พอใช้") || val.includes("ถึงกำหนดเปลี่ยน")) {
            return ["สมบูรณ์", "พอใช้", "ถึงกำหนดเปลี่ยน"];
        }
        if (val.includes("เรียบร้อย") || val.includes("บางส่วน") || val.includes("ยังไม่ได้ทำ")) {
            return ["เรียบร้อย", "บางส่วน", "ยังไม่ได้ทำ"];
        }
        if (val.includes("เหมาะสม") || val.includes("ตึงไป") || val.includes("หย่อนไป") || val.includes("ต้องปรับ")) {
            return ["เหมาะสม", "ตึงไป", "หย่อนไป", "ต้องปรับ"];
        }
        if (val.includes("ปกติ") || val.includes("เฝ้าระวัง") || val.includes("ผิดปกติ")) {
            return ["ปกติ", "เฝ้าระวัง", "ผิดปกติ"];
        }
        if (val.includes("ปกติ") || val.includes("ต่ำ") || val.includes("ต้องเติม") || val.includes("ต้องตรวจสอบ")) {
            return ["ปกติ", "ต่ำ", "ต้องเติม", "ต้องตรวจสอบ"];
        }
        if (val.includes("ไม่มี") || val.includes("เล็กน้อย") || val.includes("มาก")) {
            return ["ไม่มี", "มีเล็กน้อย", "มีมาก / ต้องซ่อม"];
        }
        
        return ["สมบูรณ์", "พอใช้", "ถึงกำหนดเปลี่ยน"];
    };

    const toggleExpand = (id: string) => {
        setExpandedRecords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const uniqueMonths = useMemo(() => {
        const months = new Set<string>();
        records.forEach(r => {
            const d = new Date(r.date);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        });
        return Array.from(months).sort().reverse();
    }, [records]);

    const fetchInitialRecords = async () => {
        setLoading(true);
        try {
            const [paginatedData, machinesData] = await Promise.all([
                getMaintenanceRecordsPaginated(PAGE_SIZE),
                getMachines()
            ]);

            const { records: newRecords, nextCursor } = paginatedData;

            setAllFetchedRecords(newRecords);
            setAllRecordsForStats(newRecords);

            const preventiveData = newRecords;
            setRecords(preventiveData);

            setCursor(nextCursor);
            setHasMore(!!nextCursor);
            setAllMachines(machinesData);
        } catch (error) {
            console.error("Error loading maintenance records:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!cursor || loadingMore) return;

        setLoadingMore(true);
        try {
            const { records: newRecords, nextCursor } = await getMaintenanceRecordsPaginated(PAGE_SIZE, cursor.date, cursor.key);

            setAllFetchedRecords(prev => [...prev, ...newRecords]);
            setAllRecordsForStats(prev => [...prev, ...newRecords]);

            const newPreventiveData = newRecords;
            setRecords(prev => [...prev, ...newPreventiveData]);

            setCursor(nextCursor);
            setHasMore(!!nextCursor);
        } catch (error) {
            console.error("Error loading more records:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleUpdateDescription = async (recordId: string) => {
        if (!isAdmin) return;
        try {
            await updateMaintenanceRecord(recordId, { description: editingDescriptionText });
            
            // Optimistic update
            setRecords(prev => prev.map(r => r.id === recordId ? { ...r, description: editingDescriptionText } : r));
            setAllFetchedRecords(prev => prev.map(r => r.id === recordId ? { ...r, description: editingDescriptionText } : r));
            success(t("msgSaveSuccess") || "บันทึกรายละเอียดสำเร็จ");
        } catch (err: any) {
            console.error("Error updating description:", err);
            error(t("msgSaveError") || "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setEditingDescriptionId(null);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchInitialRecords();
    }, []);

    // Helper for consistency between final logic and counts
    const getFrequencyType = (r: MaintenanceRecord) => {
        // 1. Check explicit period in record
        const p = r.period?.toLowerCase() || "";
        if (p.includes("week") || p.includes("daily") || p.includes("routine") || p.includes("สัปดาห์") || p.includes("วัน") || p.includes("ประจำวัน")) return 'weekly';
        if (p.includes("year") || p.includes("ปี")) return 'yearly';
        if (p.includes("month") || p.includes("เดือน")) return 'monthly';

        // 2. Fallback: Check Description/Details for keywords (for legacy records)
        const desc = (r.description + " " + (r.details || "")).toLowerCase();
        if (desc.includes("weekly") || desc.includes("routine") || desc.includes("สัปดาห์") || desc.includes("ประจำวัน")) return 'weekly';
        if (desc.includes("monthly") || desc.includes("เดือน") || desc.includes("ประจำเดือน")) return 'monthly';
        if (desc.includes("yearly") || desc.includes("annual") || desc.includes("ปี") || desc.includes("ประจำปี")) return 'yearly';

        // 3. Fallback: Check Machine Schedule (for PM tasks)
        if (r.type === 'preventive') {
            const machine = allMachines.find(m => m.id === r.machineId || m.name === r.machineName);
            // Check legacy maintenanceCycle (days)
            if (machine?.maintenanceCycle) {
                if (machine.maintenanceCycle <= 7) return 'weekly';
                if (machine.maintenanceCycle >= 360) return 'yearly';
            }
        }

        // Default to monthly if no other clues found
        return 'monthly';
    };

    const filteredRecords = records.filter(record => {
        const matchesSearch =
            record.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.technician.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMachine = selectedMachine === "all" || record.machineId === selectedMachine || record.machineName === selectedMachine;

        // Location (Area) matching logic
        let matchesLocation = selectedLocation === "all";
        if (!matchesLocation) {
            // First try record.location (FZ, RTE, UT), then fallback to machine location
            let recordLocation = record.location?.toUpperCase() || "";

            if (!recordLocation) {
                const machine = allMachines.find(m => m.id === record.machineId || m.name === record.machineName);
                recordLocation = machine?.location?.toUpperCase() || machine?.Location?.toUpperCase() || "";
            }

            if (selectedLocation === "UT") {
                matchesLocation = recordLocation === "UT" || recordLocation === "UTILITY";
            } else {
                matchesLocation = recordLocation === selectedLocation;
            }
        }

        const recordDate = new Date(record.date);
        const now = new Date();

        let matchesTime = true;

        // Strict Frequency Filtering to prevent overlap
        if (activeQuickFilter === 'thisMonth') {
            // Show Monthly AND Legacy (undefined period)
            matchesTime = getFrequencyType(record) === 'monthly';
        } else if (activeQuickFilter === 'thisWeek') {
            // Show Only Explicit Weekly
            matchesTime = getFrequencyType(record) === 'weekly';
        } else if (activeQuickFilter === 'yearly') {
            // Show Only Explicit Yearly
            matchesTime = getFrequencyType(record) === 'yearly';
        } else {
            // 'all' filter - use dropdown month filter if set
            const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
            matchesTime = selectedMonth === "all" || recordMonth === selectedMonth;
        }

        // Task Type filter
        let matchesTaskType = true;
        if (activeTaskTypeFilter === 'preventive') {
            matchesTaskType = record.type === 'preventive' || record.type === 'inspection' || record.type === 'oilChange';
        } else if (activeTaskTypeFilter === 'corrective') {
            matchesTaskType = record.type === 'corrective';
        } else if (activeTaskTypeFilter === 'partReplacement') {
            matchesTaskType = record.type === 'partReplacement';
        } else if (activeTaskTypeFilter === 'fromPM') {
            matchesTaskType = record.type === 'partReplacement' && (record as any).fromPM === true;
        }

        return matchesSearch && matchesMachine && matchesLocation && matchesTime && matchesTaskType;
    });

    const getMonthOptions = () => uniqueMonths;

    const handleDeleteClick = (record: MaintenanceRecord) => {
        setRecordToDelete(record);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;

        try {
            await deleteMaintenanceRecord(recordToDelete.id);
            // Optimistic update
            setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
            success(t("msgDeleteSuccess") || "ลบข้อมูลเรียบร้อยแล้ว");
        } catch (err) {
            console.error("Error deleting record:", err);
            error(t("msgDeleteError") || "เกิดข้อผิดพลาดในการลบข้อมูล");
        }
    };



    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "badge-success";
            case "inProgress": return "badge-warning";
            case "pending": return "badge-danger";
            default: return "badge-primary";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "completed": return t("maintenanceStatusCompleted");
            case "inProgress": return t("maintenanceStatusInProgress");
            case "pending": return t("maintenanceStatusPending");
            default: return status;
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case "urgent": return <AlertTriangleIcon size={14} className="text-accent-red" />;
            case "high": return <AlertTriangleIcon size={14} className="text-accent-yellow" />;
            default: return <CheckIcon size={14} className="text-accent-green" />;
        }
    };

    const getTypeText = (type: string) => {
        const typeMap: Record<string, string> = {
            preventive: t("typePreventive"),
            corrective: t("typeCorrective"),
            oilChange: t("typeOilChange"),
            partReplacement: t("typePartReplacement"),
            inspection: t("typeInspection"),
        };
        return typeMap[type] || type;
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Page Header and Filters */}
                <div className="mb-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent-red/20 flex items-center justify-center">
                                <SettingsIcon size={20} className="text-accent-red" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-text-primary">{t("maintenancePageTitle")}</h1>
                                <p className="text-sm text-text-muted">{t("maintenanceHistoryTitle")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Search and Filter UI */}
                    <div className="bg-bg-secondary/40 p-4 rounded-2xl border border-border-light/50 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 group">
                                <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-accent-blue" />
                                <input
                                    type="text"
                                    placeholder={t("placeholderSearchHistory") || "ค้นหาข่าง, รายละเอียด..."}
                                    className="input h-10 w-full pl-10 text-sm bg-bg-secondary/60 border-border-light/40 focus:border-accent-blue/30"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                className={`h-10 px-3 rounded-xl flex items-center gap-2 transition-all duration-300 relative overflow-hidden
                                    ${isFilterExpanded
                                        ? 'bg-accent-blue/20 text-white border-accent-blue/40 shadow-[0_0_15px_rgba(0,149,255,0.2)]'
                                        : 'bg-bg-secondary/60 text-text-muted border-border-light/40 hover:bg-bg-secondary/80'}
                                    border hover:shadow-[0_0_10px_rgba(0,149,255,0.1)] group`}
                            >
                                <FilterIcon size={16} className={`${isFilterExpanded ? 'text-accent-blue' : 'text-text-muted'}`} />
                                <span className="text-xs font-bold whitespace-nowrap hidden sm:block">
                                    {isFilterExpanded ? t("filterHide") || 'ซ่อนตัวกรอง' : t("filterShow") || 'ตัวกรอง'}
                                </span>
                                {/* Glowing indicator */}
                                {!isFilterExpanded && (
                                    <div className="absolute right-0 top-0 h-full w-1 bg-accent-blue animate-pulse opacity-50 shadow-[0_0_8px_rgba(0,149,255,0.8)]" />
                                )}
                            </button>
                        </div>

                        {/* Expandable Dropdowns */}
                        {isFilterExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                                <div className="flex items-center gap-2 bg-bg-secondary/40 p-1.5 rounded-xl border border-border-light/30">
                                    <MapPinIcon size={14} className="text-text-muted shrink-0 ml-1.5" />
                                    <select
                                        className="bg-transparent border-0 focus:ring-0 text-xs w-full h-8 text-text-primary appearance-none cursor-pointer"
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllLocations")}</option>
                                        {["FZ", "RTE", "UT"].map(z => (
                                            <option key={z} value={z} className="bg-bg-secondary">{z}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon size={14} className="text-text-muted mr-1.5 pointer-events-none" />
                                </div>
                                <div className="flex items-center gap-2 bg-bg-secondary/40 p-1.5 rounded-xl border border-border-light/30">
                                    <SettingsIcon size={14} className="text-text-muted shrink-0 ml-1.5" />
                                    <select
                                        className="bg-transparent border-0 focus:ring-0 text-xs w-full h-8 text-text-primary appearance-none cursor-pointer"
                                        value={selectedMachine}
                                        onChange={(e) => setSelectedMachine(e.target.value)}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllMachines")}</option>
                                        {allMachines.filter(m => {
                                            if (selectedLocation === 'all') return true;
                                            const loc = m.location?.toUpperCase() || m.Location?.toUpperCase() || "";
                                            if (selectedLocation === 'UT') return loc === 'UT' || loc === 'UTILITY';
                                            return loc === selectedLocation;
                                        }).map(m => (
                                            <option key={m.id} value={m.id} className="bg-bg-secondary">{m.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon size={14} className="text-text-muted mr-1.5 pointer-events-none" />
                                </div>
                                <div className="flex items-center gap-2 bg-bg-secondary/40 p-1.5 rounded-xl border border-border-light/30">
                                    <CalendarIcon size={14} className="text-text-muted shrink-0 ml-1.5" />
                                    <select
                                        className="bg-transparent border-0 focus:ring-0 text-xs w-full h-8 text-text-primary appearance-none cursor-pointer"
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            // Reset quick filter when manually selecting month
                                            if (e.target.value !== 'all') setActiveQuickFilter('all');
                                        }}
                                    >
                                        <option value="all" className="bg-bg-secondary">{t("filterAllTime")}</option>
                                        {uniqueMonths.map(m => (
                                            <option key={m} value={m} className="bg-bg-secondary">
                                                {new Date(m).toLocaleDateString(t("language") === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon size={14} className="text-text-muted mr-1.5 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Location Shortcut Buttons */}
                        <div className="flex flex-col gap-4 pt-2 border-t border-border-light/10">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'ทั้งหมด', color: 'accent-blue' },
                                    { id: 'FZ', label: 'FZ', color: 'accent-cyan' },
                                    { id: 'RTE', label: 'RTE', color: 'accent-green' },
                                    { id: 'UT', label: 'UT', color: 'accent-yellow' }
                                ].map((loc) => (
                                    <button
                                        key={loc.id}
                                        onClick={() => setSelectedLocation(loc.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5
                                                ${selectedLocation === loc.id
                                                ? `bg-${loc.color}/20 border-${loc.color}/40 text-white shadow-lg`
                                                : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary hover:border-border-light/50'}`}
                                    >
                                        {loc.label}
                                        <span className={`px-1 py-0.5 rounded text-[9px] ${selectedLocation === loc.id ? `bg-${loc.color} text-white` : 'bg-bg-secondary/60 text-text-muted'}`}>
                                            {loc.id === 'all' ? records.length : records.filter(r => {
                                                // Count logic should match filtering logic
                                                let recordLocation = r.location?.toUpperCase() || "";
                                                if (!recordLocation) {
                                                    const m = allMachines.find(mach => mach.id === r.machineId || mach.name === r.machineName);
                                                    recordLocation = m?.location?.toUpperCase() || m?.Location?.toUpperCase() || "";
                                                }

                                                if (loc.id === 'UT') return recordLocation === 'UT' || recordLocation === 'UTILITY';
                                                return recordLocation === loc.id;
                                            }).length}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Time Period Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border-light/10">
                                {[
                                    { id: 'all', label: t("labelAll") || "All", color: 'accent-blue' },
                                    { id: 'thisMonth', label: t("labelMonthly") || "Monthly", color: 'accent-cyan' },
                                    { id: 'thisWeek', label: t("labelWeekly") || "Weekly", color: 'accent-green' },
                                    { id: 'yearly', label: t("labelYearly") || "Yearly", color: 'accent-blue' }
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => { setActiveQuickFilter(filter.id as any); setSelectedMonth('all'); }}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5
                                                ${activeQuickFilter === filter.id
                                                ? `bg-${filter.color}/20 border-${filter.color}/40 text-white shadow-lg`
                                                : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary hover:border-border-light/50'}`}
                                    >
                                        {filter.label}
                                        <span className={`px-1 py-0.5 rounded text-[9px] ${activeQuickFilter === filter.id ? `bg-${filter.color} text-white` : 'bg-bg-secondary/60 text-text-muted'}`}>
                                            {/* Count Logic: Uses same frequency helper */}
                                            {filter.id === 'all' ? records.length : records.filter(r => {
                                                if (filter.id === 'thisMonth') return getFrequencyType(r) === 'monthly';
                                                if (filter.id === 'thisWeek') return getFrequencyType(r) === 'weekly';
                                                if (filter.id === 'yearly') return getFrequencyType(r) === 'yearly';
                                                return false;
                                            }).length}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Task Type Filter Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border-light/10">
                                <span className="text-[10px] text-text-muted self-center mr-1 font-semibold tracking-wide uppercase">ประเภทงาน:</span>
                                {[
                                    { id: 'all', label: 'ทั้งหมด', color: 'accent-blue', emoji: '📋' },
                                    { id: 'preventive', label: 'PM / ตรวจเช็ค', color: 'accent-cyan', emoji: '🔧' },
                                    { id: 'corrective', label: 'ซ่อมทั่วไป', color: 'accent-yellow', emoji: '⚡' },
                                    { id: 'partReplacement', label: 'เปลี่ยนอะไหล่', color: 'accent-green', emoji: '🔩' },
                                    { id: 'fromPM', label: 'เปลี่ยนจากแผน PM', color: 'accent-purple', emoji: '🏷️' },
                                ].map((f) => {
                                    const count = records.filter(r => {
                                        if (f.id === 'all') return true;
                                        if (f.id === 'preventive') return r.type === 'preventive' || r.type === 'inspection' || r.type === 'oilChange';
                                        if (f.id === 'corrective') return r.type === 'corrective';
                                        if (f.id === 'partReplacement') return r.type === 'partReplacement';
                                        if (f.id === 'fromPM') return r.type === 'partReplacement' && (r as any).fromPM === true;
                                        return false;
                                    }).length;
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setActiveTaskTypeFilter(f.id as any)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1.5
                                                ${activeTaskTypeFilter === f.id
                                                ? `bg-${f.color}/20 border-${f.color}/40 text-white shadow-lg`
                                                : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary hover:border-border-light/50'}`}
                                        >
                                            <span>{f.emoji}</span>
                                            {f.label}
                                            <span className={`px-1 py-0.5 rounded text-[9px] ${activeTaskTypeFilter === f.id ? `bg-${f.color} text-white` : 'bg-bg-secondary/60 text-text-muted'}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
                                <p>{t("statFoundHistoryPrefix") || "พบประวัติทั้งหมด"} <span className="text-text-primary font-bold">{filteredRecords.length}</span> {t("statFoundHistorySuffix") || "รายการ"}</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_5px_rgba(0,149,255,0.5)]" />
                                        <span>PM: <span className="text-text-primary font-bold">{allRecordsForStats.filter(r => r.type === 'preventive').length}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_5px_rgba(0,255,149,0.5)]" />
                                        <span>Overhaul: <span className="text-text-primary font-bold">{allRecordsForStats.filter(r => r.type === 'partReplacement').length}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 text-accent-blue" style={{ border: '2px solid currentColor', borderTopColor: 'transparent' }}></div>
                    </div>
                )}

                {/* Maintenance Records */}
                {!loading && (
                    <div className="space-y-4">
                        {/* Helper: calculate efficiency from checklist */}
                        {(() => {
                            const getProblemKey = (r: MaintenanceRecord): string | null => {
                                if (r.type === 'preventive' && !(r as any).fromPM) return null;
                                let text = r.description || '';
                                if (r.partName) text = r.partName;
                                if ((r as any).fromPM && (r as any).checklistItemLabel) {
                                    text = (r as any).checklistItemLabel;
                                }
                                text = text.replace(/\[pm พบปัญหา\]/gi, '').replace(/เปลี่ยนอะไหล่:/gi, '').trim();
                                return text.length > 0 ? text.toLowerCase() : null;
                            };
                            return filteredRecords.map((record, index) => {
                                const isExpanded = expandedRecords.has(record.id);
                            const hasMotorData = record.motorGearData && (record.motorGearData.motorSize || record.motorGearData.temperature || record.motorGearData.currentIdle || record.motorGearData.currentLoad || record.motorGearData.voltageL1);
                            const hasShaftData = record.motorGearData?.shaftData && (record.motorGearData.shaftData.shaftBend || record.motorGearData.shaftData.dialGauge);
                            const hasVibrationData = record.motorGearData && (record.motorGearData.vibrationX?.value || record.motorGearData.vibrationY?.value || record.motorGearData.vibrationZ?.value);
                            const machine = allMachines.find(m => m.id === record.machineId || m.name === record.machineName);

                            // === Efficiency Calculation ===
                            const scoreValue = (val: string, itemLabel: string, standard?: {min?: number, max?: number}): number => {
                                const v = val.toLowerCase();
                                const label = itemLabel.toLowerCase();
                                
                                if (v.includes('ถึงกำหนดเปลี่ยน')) return 10;
                                if (v.includes('ผิดปกติ')) return 15;
                                if (v.includes('ต้องเติม')) return 30;
                                if (v.includes('เฝ้าระวัง')) return 50;
                                if (v.includes('พอใช้')) return 65;
                                if (v.includes('เหมาะสม')) return 80;
                                if (v.includes('สมบูรณ์') || v.includes('ปกติ') || v.includes('เรียบร้อย') || v.includes('ไม่มีรอย') || v.includes('ไม่มี') || v.includes('ทำความสะอาด') || v.includes('เช็ด')) return 100;
                                
                                // Numeric / Measurement Parsing
                                const numbers = val.match(/-?\d+(\.\d+)?/g);
                                if (numbers && numbers.length > 0) {
                                    let min = standard?.min;
                                    let max = standard?.max;
                                    
                                    // Auto-infer if standard is missing
                                    if (min === undefined && max === undefined) {
                                        if (label.includes('amp') || label.includes('กระแส')) { min = 1; max = 15; }
                                        else if (label.includes('volt') || label.includes('แรงดัน')) { min = 170; max = 420; }
                                    }
                                    
                                    if (min !== undefined && max !== undefined) {
                                        const outOfBounds = numbers.some(n => {
                                            const num = parseFloat(n);
                                            return num < min! || num > max!;
                                        });
                                        if (outOfBounds) return 15; // Penalty for out of standard
                                        return 100; // Perfect score if within range
                                    } else {
                                        return 100; // It's a reading with no standard, don't penalize
                                    }
                                }
                                
                                if (val !== '') return 75; // has a numeric/custom value → generally OK
                                return 0; // empty = not assessed
                            };

                            const checklistItems = record.checklist || [];
                            
                            // Find child records for this PM: primary match via parentPmRecordId,
                            // fallback for older records: same machine + fromPM + created within 30 days after this record
                            const pmRecordDate = new Date(record.date).getTime();
                            const isChildRecord = (r: MaintenanceRecord) => {
                                if ((r as any).parentPmRecordId === record.id) return true;
                                // Fallback: same machine, fromPM, no parentPmRecordId, created within 30 days of this PM
                                if (
                                    !(r as any).parentPmRecordId &&
                                    (r as any).fromPM &&
                                    (r.machineId === record.machineId || r.machineName === record.machineName) &&
                                    (r as any).pmPlanId === (record as any).pmPlanId &&
                                    (record as any).pmPlanId
                                ) {
                                    const rDate = new Date(r.date).getTime();
                                    return Math.abs(rDate - pmRecordDate) < 30 * 24 * 60 * 60 * 1000;
                                }
                                return false;
                            };

                            const childRecords = allFetchedRecords.filter(r => isChildRecord(r));
                            const pendingIssuesCount = childRecords.filter(r => r.status === 'pending').length;
                            const completedChildRecords = childRecords.filter(r => r.status === 'completed');
                            
                            const resolvedChecklistLabels = new Set<string>();
                            const resolvedPartNames = new Set<string>();
                            completedChildRecords.forEach(cr => {
                                if ((cr as any).checklistItemLabel) {
                                    resolvedChecklistLabels.add((cr as any).checklistItemLabel);
                                }
                                if (cr.type === 'partReplacement' && cr.partName) {
                                    resolvedPartNames.add(cr.partName.toLowerCase());
                                }
                            });

                            let hasResolvedItems = false;
                            const assessed = checklistItems.filter(c => c.value && c.value.trim() !== '').map(c => {
                                let isResolved = false;
                                if (resolvedChecklistLabels.has(c.item)) {
                                    isResolved = true;
                                } else {
                                    const itemNameLower = c.item.toLowerCase();
                                    for (const pName of resolvedPartNames) {
                                        if (itemNameLower.includes(pName) || pName.includes(itemNameLower)) {
                                            isResolved = true;
                                            break;
                                        }
                                    }
                                }
                                if (isResolved) {
                                    hasResolvedItems = true;
                                    return { ...c, originalValue: c.value, value: 'สมบูรณ์ (เปลี่ยนอะไหล่แล้ว)' };
                                }
                                return c;
                            });
                            
                            const dynamicBaseEff = assessed.length > 0 ? Math.round(assessed.reduce((sum, c) => sum + scoreValue(c.value || '', c.item, c.standard), 0) / assessed.length) : (record.status === 'completed' ? 100 : 0);
                            
                            const baseEff = (record.baseEfficiency !== undefined && !hasResolvedItems)
                                ? record.baseEfficiency 
                                : dynamicBaseEff;
                            
                            const efficiencyPct = Math.max(0, baseEff - (pendingIssuesCount * 5));

                            // Resolved issues from this PM (gain indicator)
                            const resolvedIssuesCount = completedChildRecords.length;
                            const resolvedGain = resolvedIssuesCount * 5;
                            const scoreBeforeResolved = record.baseEfficiency !== undefined 
                                ? Math.max(0, record.baseEfficiency - ((pendingIssuesCount + resolvedIssuesCount) * 5))
                                : Math.max(0, baseEff - ((pendingIssuesCount + resolvedIssuesCount) * 5));
                            // Only show generic +gain indicator if we didn't just boost the base score from checklist directly
                            const showGain = resolvedGain > 0 && pendingIssuesCount === 0 && !hasResolvedItems;

                            // Compare with previous record of same machine
                            const prevRecord = allFetchedRecords
                                .filter(r => r.machineId === record.machineId && r.id !== record.id && (r.checklist?.length ?? 0) > 0)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            let prevEfficiency: number | null = null;
                            if (prevRecord) {
                                const pmPrevDate = new Date(prevRecord.date).getTime();
                                const isPrevChild = (r: MaintenanceRecord) => {
                                    if ((r as any).parentPmRecordId === prevRecord.id) return true;
                                    if (
                                        !(r as any).parentPmRecordId &&
                                        (r as any).fromPM &&
                                        (r.machineId === prevRecord.machineId || r.machineName === prevRecord.machineName) &&
                                        (r as any).pmPlanId === (prevRecord as any).pmPlanId &&
                                        (prevRecord as any).pmPlanId
                                    ) {
                                        const rDate = new Date(r.date).getTime();
                                        return Math.abs(rDate - pmPrevDate) < 30 * 24 * 60 * 60 * 1000;
                                    }
                                    return false;
                                };
                                const prevPendingIssuesCount = allFetchedRecords.filter(r => isPrevChild(r) && r.status === 'pending').length;
                                const prevBaseEff = prevRecord.baseEfficiency !== undefined
                                    ? prevRecord.baseEfficiency
                                    : (prevRecord.checklist && prevRecord.checklist.filter(c => c.value && c.value.trim() !== '').length > 0
                                        ? Math.round(prevRecord.checklist.filter(c => c.value && c.value.trim() !== '').reduce((sum, c) => sum + scoreValue(c.value || '', c.item, c.standard), 0) / prevRecord.checklist.filter(c => c.value && c.value.trim() !== '').length)
                                        : 100);
                                prevEfficiency = Math.max(0, prevBaseEff - (prevPendingIssuesCount * 5));
                            }
                            const trend = prevEfficiency !== null ? efficiencyPct - prevEfficiency : null;

                            // Ring SVG params
                            const radius = 22;
                            const circ = 2 * Math.PI * radius;
                            const pct = Math.min(100, Math.max(0, efficiencyPct));
                            const strokeDashoffset = circ * (1 - pct / 100);
                            const ringColor = pct >= 80 ? '#10b981' : pct >= 55 ? '#fbbf24' : '#ef4444';

                            // Repeated problem count
                            const problemKey = getProblemKey(record);
                            let problemCount = 0;
                            if (problemKey) {
                                problemCount = allFetchedRecords.filter(r => 
                                    (r.machineId === record.machineId || r.machineName === record.machineName) && 
                                    getProblemKey(r) === problemKey && 
                                    new Date(r.date) <= new Date(record.date)
                                ).length;
                            }

                            return (
                                <div
                                    key={record.id}
                                    onClick={() => toggleExpand(record.id)} // Specific click handler logic below
                                    className={`card overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-primary/50 shadow-lg scale-[1.01]' : 'hover:bg-white/5 cursor-pointer'}`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Compact Header - Clickable Area */}
                                    <div className="flex flex-col gap-2 relative">
                                        
                                        {/* Top Row: Machine Name + Right Data */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    {assessed.length === 0 && (
                                                        <span className="text-text-muted shrink-0">
                                                            {record.type === 'preventive' ? <RefreshCwIcon size={14} /> :
                                                                record.type === 'corrective' ? <AlertTriangleIcon size={14} /> :
                                                                    <WrenchIcon size={14} />}
                                                        </span>
                                                    )}
                                                    <h3 className={`font-bold text-sm truncate ${isExpanded ? 'text-primary' : 'text-text-primary'} flex items-baseline gap-1.5`}>
                                                        <span>{record.machineName}</span>
                                                        {machine?.code && (
                                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 whitespace-nowrap shadow-sm">
                                                                {machine.code}
                                                            </span>
                                                        )}
                                                    </h3>
                                                    {/* Status Dot */}
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${record.status === 'completed' ? 'bg-accent-green shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-accent-yellow'}`}></span>
                                                </div>

                                                {/* Description & Location */}
                                                <div className="flex items-start gap-2 text-xs text-text-muted mt-1">
                                                    {(record.location || machine?.location || machine?.Location) && (
                                                        <span className="font-bold text-[10px] uppercase opacity-80 bg-white/5 px-1 rounded border border-white/10 shrink-0 mt-0.5">
                                                            {record.location || machine?.location || machine?.Location}
                                                        </span>
                                                    )}
                                                    {editingDescriptionId === record.id ? (
                                                        <textarea
                                                            value={editingDescriptionText}
                                                            onChange={(e) => setEditingDescriptionText(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onBlur={() => handleUpdateDescription(record.id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleUpdateDescription(record.id);
                                                                }
                                                                if (e.key === 'Escape') setEditingDescriptionId(null);
                                                            }}
                                                            className="bg-bg-tertiary text-xs border border-primary/50 rounded px-2 py-1 outline-none text-white w-full max-w-full resize-none"
                                                            rows={2}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className={`flex items-start gap-2 group w-full`}>
                                                            <div className="flex flex-col gap-1 w-full">
                                                                <p className="line-clamp-3 opacity-70 w-full leading-relaxed">
                                                                    {record.description || (record.partName ? `เปลี่ยนอะไหล่: ${record.partName}` : null) || (record.type === 'partReplacement' ? 'เปลี่ยนอะไหล่' : record.type === 'preventive' ? 'PM / ตรวจเช็ค' : record.type === 'corrective' ? 'ซ่อมทั่วไป' : record.type)}
                                                                </p>
                                                                {problemCount > 1 && (
                                                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 w-fit mt-1 border ${
                                                                        problemCount >= 3 
                                                                        ? (record.status === 'pending' || record.status === 'inProgress' ? 'bg-red-500/20 text-red-500 border-red-500/50 animate-alert-scale origin-left' : 'bg-red-500/10 text-red-400/80 border-red-500/20')
                                                                        : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                                                    }`}>
                                                                        ⚠️ {problemCount >= 3 ? `พบปัญหานี้ซ้ำเป็นครั้งที่ ${problemCount} (ควรพิจารณาเปลี่ยนอะไหล่)` : `พบปัญหาซ้ำครั้งที่ ${problemCount}`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isAdmin && (
                                                                <button 
                                                                    className="text-primary opacity-50 hover:opacity-100 transition-all shrink-0 mt-0.5 p-1 -m-1 rounded-md hover:bg-primary/10 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingDescriptionId(record.id);
                                                                        setEditingDescriptionText(record.description || (record.partName ? `เปลี่ยนอะไหล่: ${record.partName}` : ''));
                                                                    }}
                                                                    title="คลิกเพื่อแก้ไขรายละเอียด"
                                                                >
                                                                    <EditIcon size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                </div>
                                                {/* Right Data: Status + Date */}
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                        {(record as any).fromPM && (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 whitespace-nowrap">
                                                                🏷️ PM
                                                            </span>
                                                        )}
                                                        {editingRecordId === record.id ? (
                                                            <select
                                                                value={editingRecordStatus || record.status}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => setEditingRecordStatus(e.target.value)}
                                                                className="bg-bg-tertiary border border-white/10 text-white rounded px-2 py-0.5 text-[10px] font-bold outline-none focus:border-primary/50 transition-colors cursor-pointer"
                                                            >
                                                                <option value="pending">รอดำเนินการ</option>
                                                                <option value="inProgress">กำลังทำ</option>
                                                                <option value="completed">เสร็จสิ้น</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`badge text-[10px] py-0.5 px-2 font-bold uppercase tracking-wider ${getStatusColor(record.status)}`}>
                                                                {getStatusText(record.status)}
                                                            </span>
                                                         )}
                                                     </div>
                                                     <div className="flex items-center text-[10px] text-text-muted gap-1">
                                                         <span className="font-semibold text-white/50 mr-1">วันที่บันทึก:</span>
                                                         <CalendarIcon size={10} />
                                                         {editingRecordId === record.id ? (
                                                             <input
                                                                 type="date"
                                                                 value={editingRecordDate || ''}
                                                                 onClick={(e) => e.stopPropagation()}
                                                                 onChange={(e) => setEditingRecordDate(e.target.value)}
                                                                 className="bg-bg-tertiary border border-white/10 text-white rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-primary/50"
                                                             />
                                                         ) : (
                                                             <span>{mounted ? formatDateThai(record.date) : '--/--'}</span>
                                                         )}
                                                         {isAdmin && editingRecordId !== record.id && (!record.checklist || record.checklist.length === 0) && (
                                                             <button 
                                                                 onClick={(e) => { e.stopPropagation(); handleStartEditChecklist(record); }}
                                                                 className="text-primary opacity-50 hover:opacity-100 p-0.5 rounded hover:bg-primary/20 ml-1"
                                                                 title="แก้ไขวันที่และสถานะ"
                                                             >
                                                                 <EditIcon size={10} />
                                                             </button>
                                                         )}
                                                         {editingRecordId === record.id && (!record.checklist || record.checklist.length === 0) && (
                                                             <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-1">
                                                                 <button onClick={(e) => { e.stopPropagation(); handleSaveChecklist(record.id); }} className="text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded hover:bg-accent-green/20 font-bold transition-colors">บันทึก</button>
                                                                 <button onClick={(e) => { e.stopPropagation(); setEditingRecordId(null); }} className="text-text-muted bg-white/5 px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors">ยกเลิก</button>
                                                             </div>
                                                         )}
                                                     </div>
                                                     {(record.resolvedAt || (editingRecordId === record.id && (editingRecordStatus === 'completed' || record.status === 'completed'))) && (
                                                         <div className="flex items-center text-[10px] text-accent-green gap-1 mt-0.5">
                                                             <span className="font-semibold text-accent-green/70 mr-1">วันที่แก้ไข:</span>
                                                             <CheckIcon size={12} />
                                                             {editingRecordId === record.id ? (
                                                                 <input
                                                                     type="date"
                                                                     value={editingRecordResolvedDate || ''}
                                                                     onClick={(e) => e.stopPropagation()}
                                                                     onChange={(e) => setEditingRecordResolvedDate(e.target.value)}
                                                                     className="bg-bg-tertiary border border-accent-green/30 text-accent-green rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-accent-green"
                                                                 />
                                                             ) : (
                                                                 <span>{mounted ? formatDateThai(record.resolvedAt || '') : '--/--'}</span>
                                                             )}
                                                         </div>
                                                     )}
                                                 </div>
                                            </div>

                                            {/* Bottom Row: Efficiency Ring */}
                                            {assessed.length > 0 && (
                                                <div className="flex items-start gap-3 mt-1 flex-wrap">
                                                    <div className="flex items-center gap-2 bg-white/5 pr-3 py-1 pl-1 rounded-full border border-white/10">
                                                        <div className="relative w-8 h-8 shrink-0">
                                                            <svg width="32" height="32" viewBox="0 0 60 60" className="absolute top-0 left-0">
                                                                <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                                                <circle
                                                                    cx="30" cy="30" r={radius}
                                                                    fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                                                                    strokeDasharray={circ} strokeDashoffset={strokeDashoffset}
                                                                    transform="rotate(-90 30 30)"
                                                                />
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-[10px] font-bold" style={{color: ringColor}}>{efficiencyPct}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col justify-center gap-0.5">
                                                            <span className="text-[9px] text-text-muted leading-none">ประสิทธิภาพ</span>
                                                            {trend !== null && (
                                                                <span className={`text-[9px] font-bold leading-none ${trend >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                                                    {trend > 0 ? `▲ +${trend}%` : trend < 0 ? `▼ ${Math.abs(trend)}%` : `= 0%`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Score gain from resolved issues */}
                                                    {showGain && (
                                                        <div className="flex items-center gap-1.5 bg-accent-green/10 border border-accent-green/25 rounded-full px-2.5 py-1 animate-fade-in">
                                                            <span className="text-[9px] text-text-muted leading-none whitespace-nowrap">{scoreBeforeResolved}%</span>
                                                            <span className="text-[9px] font-bold text-accent-green leading-none">+{resolvedGain}</span>
                                                            <span className="text-[9px] text-text-muted leading-none">=</span>
                                                            <span className="text-[9px] font-bold leading-none" style={{color: ringColor}}>{efficiencyPct}%</span>
                                                            <span className="text-[8px] text-accent-green/70 leading-none whitespace-nowrap">(แก้ไขแล้ว)</span>
                                                        </div>
                                                    )}

                                                    {/* Pending issues deduction warning */}
                                                    {pendingIssuesCount > 0 && (
                                                        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                                                            <span className="text-[9px] text-text-muted leading-none whitespace-nowrap">{baseEff}%</span>
                                                            <span className="text-[9px] font-bold text-accent-red leading-none">-{pendingIssuesCount * 5}</span>
                                                            <span className="text-[9px] text-text-muted leading-none">=</span>
                                                            <span className="text-[9px] font-bold text-accent-red leading-none">{efficiencyPct}%</span>
                                                            <span className="text-[8px] text-accent-red/70 leading-none whitespace-nowrap">({pendingIssuesCount} ปัญหาค้าง)</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Sub Info Row (Technician, Type, Expand Arrow) */}
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-white/10">
                                                <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                                                    <div className="flex items-center gap-1.5">
                                                        <UserIcon size={12} className="text-primary/70" />
                                                        <span>{record.technician}</span>
                                                    </div>
                                                    {record.period && (
                                                        <div className="flex items-center gap-1.5 pl-3 border-l border-white/10">
                                                            <ClockIcon size={12} className="text-accent-yellow/70" />
                                                            <span>{record.period}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right side: Admin Delete + Chevron */}
                                                <div className="flex items-center gap-2">
                                                    {record.status === 'pending' && record.type !== 'preventive' && isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleResolveIssue(record.id, problemCount);
                                                            }}
                                                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent-green/20 text-accent-green font-bold text-[10px] hover:bg-accent-green hover:text-white transition-all border border-accent-green/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                                            title="บันทึกการแก้ไขปัญหา"
                                                        >
                                                            <CheckIcon size={12} />
                                                            แก้ไขแล้ว
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteClick(record);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white transition-all"
                                                            title={t("actionDelete") || "ลบ"}
                                                        >
                                                            <TrashIcon size={12} />
                                                        </button>
                                                    )}
                                                    {/* Chevron */}
                                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-text-muted'}`}>
                                                        <ChevronDownIcon size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    {/* Expandable Details */}
                                    {isExpanded && (
                                        <div className="mt-2 space-y-2 animate-fade-in bg-black/10 -mx-4 px-4 py-3 border-t border-white/5">

                                            {/* === Efficiency Analysis Banner === */}
                                            {assessed.length > 0 && (
                                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                                    <div className="flex items-center justify-between px-4 py-2.5 bg-white/5">
                                                        <div className="flex items-center gap-2">
                                                            <ActivityIcon size={14} className="text-accent-cyan" />
                                                            <span className="text-sm font-bold text-white">ประสิทธิภาพเครื่องจักร</span>
                                                            {trend !== null && (
                                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                                                                    {trend > 0 ? `▲ ดีขึ้น +${trend}%` : trend < 0 ? `▼ ลดลง ${trend}%` : '= เท่าเดิม'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-text-muted">เทียบครั้งก่อน: </span>
                                                            <span className="text-xs font-bold" style={{color: ringColor}}>{efficiencyPct}%</span>
                                                        </div>
                                                    </div>
                                                                                                        {/* Problem items */}
                                                    {assessed.filter(c => scoreValue(c.value || '', c.item, c.standard) < 80).length > 0 && (
                                                        <div className="px-4 py-3 bg-black/20 border-t border-white/5">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">⚠ รายการที่ดึงคะแนนลง</p>
                                                                <span className="text-[10px] text-text-muted">คะแนนเต็ม = 100/รายการ</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {assessed
                                                                    .filter(c => scoreValue(c.value || '', c.item, c.standard) < 80)
                                                                    .sort((a, b) => scoreValue(a.value || '', a.item, a.standard) - scoreValue(b.value || '', b.item, b.standard))
                                                                    .map((c, i) => {
                                                                        const s = scoreValue(c.value || '', c.item, c.standard);
                                                                        const deduction = 100 - s;
                                                                        const impact = Math.round(deduction / assessed.length);
                                                                        const isCritical = s < 30;
                                                                        const isWarning = s >= 30 && s < 60;
                                                                        const barColor = isCritical ? '#ef4444' : isWarning ? '#fbbf24' : '#60a5fa';
                                                                        const bgCls = isCritical ? 'bg-red-500/5 border-red-500/20' : isWarning ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-blue-500/5 border-blue-500/20';
                                                                        const textCls = isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-blue-400';
                                                                        const tierLabel = isCritical ? '🔴 วิกฤต' : isWarning ? '🟡 เฝ้าระวัง' : '🔵 ดูแล';
                                                                        return (
                                                                            <div key={i} className={`rounded-lg border px-3 py-2 ${bgCls}`}>
                                                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                                                        <span className={`text-[9px] font-bold ${textCls}`}>{tierLabel}</span>
                                                                                        <span className="text-[11px] text-white/90 font-medium leading-tight">{c.item}</span>
                                                                                    </div>
                                                                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                                                        <span className={`text-[10px] font-bold ${textCls}`}>{c.value}</span>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <span className="text-[9px] text-text-muted">{s}/100</span>
                                                                                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${isCritical ? 'bg-red-500/20 text-red-400' : isWarning ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                                                -{impact} ต่อคะแนนรวม
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="w-full bg-white/5 rounded-full h-1.5 mt-1.5">
                                                                                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${s}%`, backgroundColor: barColor }} />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                }
                                                            </div>
                                                            <div className="mt-3 pt-2 border-t border-white/5 flex flex-col gap-1">
                                                                <div className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-text-muted">คะแนนฐาน (ก่อนหักปัญหาค้าง)</span>
                                                                    <span className="font-bold text-white">{baseEff}%</span>
                                                                </div>
                                                                {pendingIssuesCount > 0 && (
                                                                    <div className="flex items-center justify-between text-[10px]">
                                                                        <span className="text-accent-red opacity-90">หักคะแนนปัญหาค้าง (-5% x {pendingIssuesCount} ปัญหา)</span>
                                                                        <span className="font-bold text-accent-red">-{pendingIssuesCount * 5}%</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-white/5">
                                                                    <span className="text-text-muted font-medium">คะแนนประสิทธิภาพสุทธิ</span>
                                                                    <span className="font-bold" style={{color: ringColor}}>{efficiencyPct}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>
                                            )}

                                            {/* Section 1: ข้อมูลทั่วไป & Motor/Gear (Grid Layout) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {/* ข้อมูลทั่วไป */}
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <h4 className="text-[11px] font-bold text-primary mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5 opacity-80">
                                                        <FileTextIcon size={10} />
                                                        ข้อมูลทั่วไป
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-muted">ประเภท:</span>
                                                            <span className="text-text-primary">{getTypeText(record.type)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-text-muted">ช่าง:</span>
                                                            <span className="text-text-primary truncate ml-1">{record.technician}</span>
                                                        </div>
                                                        {machine?.code && (
                                                            <div className="flex items-center justify-between col-span-2 mt-0.5">
                                                                <span className="text-text-muted">รหัสเครื่องจักร:</span>
                                                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 whitespace-nowrap shadow-sm">
                                                                    {machine.code}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {record.duration && (
                                                            <div className="flex items-center justify-between col-span-2">
                                                                <span className="text-text-muted">ระยะเวลา:</span>
                                                                <span className="text-text-primary">{record.duration} วัน</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ข้อมูล Motor/Gear */}
                                                {hasMotorData && (
                                                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                        <h4 className="text-[11px] font-bold text-accent-cyan mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5 opacity-80">
                                                            <ActivityIcon size={10} />
                                                            ข้อมูล Motor/Gear
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                                                            {record.motorGearData?.motorSize && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-text-muted">ขนาด:</span>
                                                                    <span className="text-text-primary">{record.motorGearData.motorSize}</span>
                                                                </div>
                                                            )}
                                                            {record.motorGearData?.temperature && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-text-muted">Temp:</span>
                                                                    <span className="text-text-primary">{record.motorGearData.temperature}°C</span>
                                                                </div>
                                                            )}
                                                            {(record.motorGearData?.currentIdle || record.motorGearData?.currentLoad) && (
                                                                <div className="flex items-center justify-between col-span-2">
                                                                    <span className="text-text-muted">Amp (Idle/Load):</span>
                                                                    <span className="text-text-primary">{record.motorGearData.currentIdle || '-'} / {record.motorGearData.currentLoad || '-'} A</span>
                                                                </div>
                                                            )}
                                                            {(record.motorGearData?.voltageL1 || record.motorGearData?.voltageL2 || record.motorGearData?.voltageL3) && (
                                                                <div className="flex items-center justify-between col-span-2">
                                                                    <span className="text-text-muted">Volt:</span>
                                                                    <span className="text-accent-cyan font-mono text-[10px]">{record.motorGearData?.voltageL1 || '-'}/{record.motorGearData?.voltageL2 || '-'}/{record.motorGearData?.voltageL3 || '-'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Section 2: Shaft & Vibration */}
                                            {(hasShaftData || hasVibrationData) && (
                                                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <h4 className="text-[11px] font-bold text-accent-green mb-1 pb-1 border-b border-white/10 flex items-center gap-1.5 opacity-80">
                                                        <TargetIcon size={10} />
                                                        ข้อมูล Shaft & Vibration
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                                        {record.motorGearData?.shaftData?.shaftBend && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-text-muted">Shaft Bend:</span>
                                                                <span className="text-text-primary">{record.motorGearData.shaftData.shaftBend} mm</span>
                                                            </div>
                                                        )}
                                                        {record.motorGearData?.shaftData?.dialGauge && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-text-muted">Dial Gauge:</span>
                                                                <span className="text-text-primary">{record.motorGearData.shaftData.dialGauge} mm</span>
                                                            </div>
                                                        )}
                                                        {hasVibrationData && (
                                                            <div className="flex items-center col-span-2 mt-0.5 pt-0.5 border-t border-white/5">
                                                                <span className="text-text-muted mr-2">Vibration:</span>
                                                                <div className="flex gap-1">
                                                                    {[{ l: 'X', d: record.motorGearData?.vibrationX }, { l: 'Y', d: record.motorGearData?.vibrationY }, { l: 'Z', d: record.motorGearData?.vibrationZ }].map((v, i) =>
                                                                        v.d?.value ? (
                                                                            <span key={i} className={`px-1 py-0 rounded text-[9px] font-medium border ${v.d.level === 'normal' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' : v.d.level === 'medium' ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20' : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}>
                                                                                {v.l}:{v.d.value}
                                                                            </span>
                                                                        ) : null
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 3: Checklist - Grid List */}
                                            {record.checklist && record.checklist.length > 0 && (
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                            <span className="text-accent-cyan">📋</span> รายการตรวจสอบ ({record.checklist.length} รายการ)
                                                        </h4>
                                                        {isAdmin && editingRecordId !== record.id && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleStartEditChecklist(record); }}
                                                                className="px-3 py-1 rounded bg-accent-blue/20 text-accent-blue text-xs font-bold hover:bg-accent-blue hover:text-white transition-colors"
                                                            >
                                                                แก้ไขสถานะ
                                                            </button>
                                                        )}
                                                        {editingRecordId === record.id && (
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setEditingRecordId(null); }}
                                                                    className="px-3 py-1 rounded bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                                                                    disabled={isSavingEdit}
                                                                >
                                                                    ยกเลิก
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleSaveChecklist(record.id); }}
                                                                    className="px-3 py-1 rounded bg-accent-green text-white text-xs font-bold hover:bg-accent-green/80 transition-colors"
                                                                    disabled={isSavingEdit}
                                                                >
                                                                    {isSavingEdit ? 'กำลังบันทึก...' : 'บันทึก'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {(editingRecordId === record.id ? editingChecklist : record.checklist).map((item, idx) => {
                                                            let valueColor = "text-accent-cyan font-semibold";
                                                            let bgColor = "bg-accent-cyan/10 border-accent-cyan/20";
                                                            
                                                            const val = item.value || "";
                                                            if (val.includes("สมบูรณ์") || val.includes("ปกติ") || val.includes("เรียบร้อย") || val.includes("ไม่มี")) {
                                                                valueColor = "text-accent-green font-bold";
                                                                bgColor = "bg-accent-green/10 border-accent-green/20";
                                                            } else if (val.includes("พอใช้") || val.includes("เฝ้าระวัง") || val.includes("ต่ำ") || val.includes("เติมเพิ่ม")) {
                                                                valueColor = "text-accent-yellow font-bold";
                                                                bgColor = "bg-accent-yellow/10 border-accent-yellow/20";
                                                            } else if (val.includes("เปลี่ยน") || val.includes("ผิดปกติ") || val.includes("ต้องเติม")) {
                                                                valueColor = "text-accent-red font-bold";
                                                                bgColor = "bg-accent-red/10 border-accent-red/20";
                                                            }

                                                            const isDue = val.includes("ถึงกำหนดเปลี่ยน");

                                                            let isVibrationData = false;
                                                            let vibrationObj: any = null;
                                                            if (val.startsWith('{') && val.includes('"x":')) {
                                                                try {
                                                                    vibrationObj = JSON.parse(val);
                                                                    isVibrationData = true;
                                                                } catch (e) { }
                                                            }

                                                            // Calculate trend for efficiency check symbol
                                                            const prevChecklistItem = prevRecord?.checklist?.find(c => c.item === item.item);
                                                            let trendSymbol = null;
                                                            if (prevChecklistItem && prevChecklistItem.value && item.value) {
                                                                const curScore = scoreValue(item.value || '', item.item, item.standard);
                                                                const prevScore = scoreValue(prevChecklistItem.value || '', prevChecklistItem.item, prevChecklistItem.standard);
                                                                if (curScore > prevScore) trendSymbol = 'up';
                                                                else if (curScore < prevScore) trendSymbol = 'down';
                                                            }
                                                            
                                                            // IF IN EDIT MODE
                                                            if (editingRecordId === record.id) {
                                                                const options = getOptionsByValue(val, item.item);
                                                                return (
                                                                    <div key={idx} onClick={(e) => e.stopPropagation()} className="flex flex-col bg-bg-tertiary p-3 rounded-lg border border-primary/30">
                                                                        <div className="text-xs text-text-primary mb-2 font-bold">{item.item}</div>
                                                                        {isVibrationData ? (
                                                                            <input
                                                                                type="text"
                                                                                value={val}
                                                                                onChange={(e) => handleChecklistItemValueChange(idx, e.target.value)}
                                                                                className="bg-bg-secondary border border-white/20 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50 w-full"
                                                                            />
                                                                        ) : options.length > 0 && !options.includes('custom') ? (
                                                                            <select
                                                                                value={val}
                                                                                onChange={(e) => handleChecklistItemValueChange(idx, e.target.value)}
                                                                                className="bg-bg-secondary border border-white/20 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50 w-full cursor-pointer"
                                                                            >
                                                                                <option value="">-- เลือกสถานะ --</option>
                                                                                {options.map((opt, oIdx) => (
                                                                                    <option key={oIdx} value={opt}>{opt}</option>
                                                                                ))}
                                                                            </select>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                value={val}
                                                                                onChange={(e) => handleChecklistItemValueChange(idx, e.target.value)}
                                                                                className="bg-bg-secondary border border-white/20 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-primary/50 w-full"
                                                                                placeholder="ระบุสถานะหรือค่า"
                                                                            />
                                                                        )}
                                                                        
                                                                        {isAdmin && (
                                                                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                                                                                <span className="text-[10px] text-text-muted">เกณฑ์มาตรฐาน:</span>
                                                                                <input 
                                                                                    type="number" 
                                                                                    placeholder="Min" 
                                                                                    value={item.standard?.min ?? ''} 
                                                                                    onChange={(e) => {
                                                                                        const newChecklist = [...editingChecklist];
                                                                                        const val = e.target.value;
                                                                                        newChecklist[idx] = { 
                                                                                            ...newChecklist[idx], 
                                                                                            standard: { ...newChecklist[idx].standard, min: val ? Number(val) : undefined } 
                                                                                        };
                                                                                        setEditingChecklist(newChecklist);
                                                                                    }}
                                                                                    className="bg-bg-secondary border border-white/20 text-white rounded px-2 py-1 text-[10px] w-14 outline-none focus:border-accent-cyan"
                                                                                />
                                                                                <span className="text-[10px] text-text-muted">-</span>
                                                                                <input 
                                                                                    type="number" 
                                                                                    placeholder="Max" 
                                                                                    value={item.standard?.max ?? ''} 
                                                                                    onChange={(e) => {
                                                                                        const newChecklist = [...editingChecklist];
                                                                                        const val = e.target.value;
                                                                                        newChecklist[idx] = { 
                                                                                            ...newChecklist[idx], 
                                                                                            standard: { ...newChecklist[idx].standard, max: val ? Number(val) : undefined } 
                                                                                        };
                                                                                        setEditingChecklist(newChecklist);
                                                                                    }}
                                                                                    className="bg-bg-secondary border border-white/20 text-white rounded px-2 py-1 text-[10px] w-14 outline-none focus:border-accent-cyan"
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-2 mt-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={item.completed || false}
                                                                                onChange={(e) => handleChecklistItemCompletedChange(idx, e.target.checked)}
                                                                                className="w-3.5 h-3.5 rounded border-white/20 bg-black/20 text-primary focus:ring-primary/50 focus:ring-offset-0 cursor-pointer"
                                                                                id={`chk-${idx}`}
                                                                            />
                                                                            <label htmlFor={`chk-${idx}`} className="text-xs text-text-muted cursor-pointer">ตรวจสอบแล้ว</label>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // IF IN VIEW MODE
                                                            let isResolved = false;
                                                            if (resolvedChecklistLabels.has(item.item)) {
                                                                isResolved = true;
                                                            } else {
                                                                const itemNameLower = item.item.toLowerCase();
                                                                for (const pName of resolvedPartNames) {
                                                                    if (itemNameLower.includes(pName) || pName.includes(itemNameLower)) {
                                                                        isResolved = true;
                                                                        break;
                                                                    }
                                                                }
                                                            }

                                                            return (
                                                                <div key={idx} className={`flex flex-col bg-bg-tertiary p-3 rounded-lg border transition-all ${isDue ? 'border-accent-red/30 bg-accent-red/5' : 'border-white/5'}`}>
                                                                    <div className="flex items-start justify-between text-xs text-text-muted mb-2 font-medium">
                                                                        <div className="flex flex-col">
                                                                            <span>{item.item}</span>
                                                                            {item.standard && (item.standard.min !== undefined || item.standard.max !== undefined) && (
                                                                                <span className="text-[10px] text-white/40 mt-0.5 font-normal">
                                                                                    (มาตรฐาน: {item.standard.min ?? ''} - {item.standard.max ?? ''} {item.standard.unit ?? ''})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            {trendSymbol === 'up' && <span className="text-accent-green ml-2" title="ประสิทธิภาพดีขึ้น">▲</span>}
                                                                            {trendSymbol === 'down' && <span className="text-accent-red ml-2" title="ประสิทธิภาพลดลง">▼</span>}
                                                                        </div>
                                                                    </div>
                                                                    {isVibrationData && vibrationObj ? (
                                                                        <div className="flex gap-1 flex-wrap">
                                                                            {['x', 'y', 'z'].map((axis) => vibrationObj[axis] && (
                                                                                <span key={axis} className={`px-2 py-1 rounded text-xs font-semibold border ${vibrationObj[axis].status === 'warning' ? 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20' : vibrationObj[axis].status === 'danger' ? 'text-accent-red bg-accent-red/10 border-accent-red/20' : 'text-accent-green bg-accent-green/10 border-accent-green/20'}`}>
                                                                                    {axis.toUpperCase()}:{vibrationObj[axis].value}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : isDue ? (
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`text-xs px-2.5 py-1 rounded border ${bgColor} ${valueColor} w-fit ${isResolved ? 'line-through opacity-70' : ''}`}>
                                                                                    {val}
                                                                                </div>
                                                                                {isResolved && (
                                                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 flex items-center gap-1">
                                                                                        <span className="text-accent-green text-xs leading-none">✓</span> แก้ไขแล้ว
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {!isResolved && (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); openReplacementPlan(record.machineId, record.machineName); }}
                                                                                    className="text-[11px] px-2.5 py-1 rounded-md border border-accent-red/40 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors w-fit flex items-center gap-1.5 font-semibold"
                                                                                >
                                                                                    <ActivityIcon size={11} />
                                                                                    📋 ดูแผนเปลี่ยนอะไหล่
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`text-xs px-2.5 py-1 rounded border ${bgColor} ${valueColor} w-fit ${isResolved && val && val.trim() !== '' && !val.includes('สมบูรณ์') && !val.includes('ปกติ') ? 'line-through opacity-70' : ''}`}>
                                                                                {val || (item.completed ? "✓" : "-")}
                                                                            </div>
                                                                            {isResolved && val && val.trim() !== '' && !val.includes('สมบูรณ์') && !val.includes('ปกติ') && (
                                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20 flex items-center gap-1">
                                                                                    <span className="text-accent-green text-xs leading-none">✓</span> แก้ไขแล้ว
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {/* Resolution Details Edit Field */}
                                                    {editingRecordId === record.id && (
                                                        <div className="mt-4 pt-4 border-t border-white/10">
                                                            <h4 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1">
                                                                <FileTextIcon size={12} className="text-accent-cyan" /> 
                                                                ผลการแก้ไข / รายละเอียดการดำเนินการ
                                                            </h4>
                                                            <textarea
                                                                value={editingRecordDetails}
                                                                onChange={(e) => setEditingRecordDetails(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-full bg-bg-tertiary border border-white/20 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-accent-cyan/50 resize-none h-20 transition-colors"
                                                                placeholder="ระบุผลการแก้ไข หรือการดำเนินการที่ได้ทำไป..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Section 4.5: Part Replacement Info */}
                                            {record.type === 'partReplacement' && (
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                                                    <h4 className="text-sm font-bold text-accent-green mb-3 flex items-center gap-2">
                                                        <ClockIcon size={14} /> ข้อมูลอายุการใช้งานอะไหล่
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                            <div className="text-[10px] text-text-muted mb-1">วันที่เปลี่ยนอะไหล่</div>
                                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                                <CalendarIcon size={14} className="text-accent-blue" />
                                                                {formatDateThai(record.resolvedAt || record.date)}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                            <div className="text-[10px] text-text-muted mb-1">ใช้งานมาแล้ว (นับถึงปัจจุบัน)</div>
                                                            <div className="text-sm font-bold text-accent-yellow flex items-center gap-2">
                                                                <ActivityIcon size={14} />
                                                                {(() => {
                                                                    const lifespan = calculateLifespan(record.resolvedAt || record.date);
                                                                    if (!lifespan) return "-";
                                                                    let parts = [];
                                                                    if (lifespan.years > 0) parts.push(`${lifespan.years} ปี`);
                                                                    if (lifespan.months > 0) parts.push(`${lifespan.months} เดือน`);
                                                                    parts.push(`${lifespan.days} วัน`);
                                                                    return parts.join(" ");
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Section 5: Details & Notes & Resolution Level */}
                                            {(record.details || record.notes || record.resolutionLevel) && (
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                                                    
                                                    {record.resolutionLevel && (
                                                        <div className="mb-3">
                                                            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                                <LayersIcon size={14} className="text-accent-blue" /> ระดับการแก้ไขปัญหา
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                {record.resolutionLevel === 1 && (
                                                                    <span className="px-2.5 py-1 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-bold">
                                                                        ระดับ 1: ปรับตั้งค่า / ทำความสะอาด
                                                                    </span>
                                                                )}
                                                                {record.resolutionLevel === 2 && (
                                                                    <span className="px-2.5 py-1 rounded bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-xs font-bold">
                                                                        ระดับ 2: เปลี่ยนชิ้นส่วนย่อย / ดัดแปลง
                                                                    </span>
                                                                )}
                                                                {record.resolutionLevel === 3 && (
                                                                    <span className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                                                                        ระดับ 3: ซ่อมใหญ่ / Overhaul
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {record.details && !record.details.includes('{') && (!record.checklist || record.checklist.length === 0 || record.resolutionLevel) && (
                                                        <div className={`mb-2 last:mb-0 ${record.resolutionLevel ? 'border-t border-white/10 mt-3 pt-3' : ''}`}>
                                                            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                                <FileTextIcon size={14} className="text-accent-cyan" /> รายละเอียดการดำเนินการ
                                                            </h4>
                                                            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{record.details}</p>
                                                        </div>
                                                    )}
                                                    {record.notes && (
                                                        <div className={`pt-2 ${(record.details || record.resolutionLevel) ? 'border-t border-white/10 mt-3 pt-3' : ''}`}>
                                                            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                                <FileTextIcon size={14} className="text-accent-cyan" /> หมายเหตุ
                                                            </h4>
                                                            <p className="text-sm text-accent-yellow/90 italic leading-relaxed whitespace-pre-wrap">{record.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                        })()}
                    </div>
                )}

                {!loading && filteredRecords.length === 0 && (
                    <div className="empty-state py-12">
                        <WrenchIcon size={48} className="text-text-muted mb-3" />
                        <p className="text-text-primary font-medium mb-1">{t("msgNoData")}</p>
                        <p className="text-text-muted text-sm">{t("msgNoHistory")}</p>
                    </div>
                )}
            </main>

            <MobileNav />

            <MaintenanceRecordModal
                isOpen={maintenanceModalOpen}
                onClose={() => setMaintenanceModalOpen(false)}
                onSuccess={fetchInitialRecords}
            />

            <RecordDetailsModal
                isOpen={!!selectedRecord}
                onClose={() => setSelectedRecord(null)}
                record={selectedRecord}
            />

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={t("titleConfirmDelete") || "ยืนยันการลบ"}
                message={`${t("confirmDeleteMessage") || "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?"} ${recordToDelete ? `"${recordToDelete.machineName} - ${recordToDelete.description}"` : ""}`}
                isDestructive={true}
                confirmText={t("actionDelete") || "ลบ"}
            />
            
            <Modal
                isOpen={resolveConfirmOpen}
                onClose={() => setResolveConfirmOpen(false)}
                title="ยืนยันการแก้ไขปัญหา"
                titleIcon={<CheckCircleIcon size={24} className="text-accent-green" />}
                size="md"
                footer={
                    <>
                        <button onClick={() => setResolveConfirmOpen(false)} className="btn btn-outline border-white/20 text-white hover:bg-white/10">
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirmResolve}
                            disabled={resolveLevel === 3 && resolveDetails.trim() === ""}
                            className="btn bg-accent-green text-white font-bold hover:bg-accent-green/80 disabled:opacity-50 disabled:cursor-not-allowed border border-accent-green/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            ยืนยันว่าแก้ไขแล้ว
                        </button>
                    </>
                }
            >
                <div className="py-2 flex flex-col gap-5">
                    <p className="text-sm text-text-muted">
                        การยืนยันนี้จะเปลี่ยนสถานะงานเป็น <strong className="text-accent-green">เสร็จสิ้น</strong> พร้อมบันทึกรายละเอียดที่คุณระบุไว้
                    </p>

                    {/* Resolution Level Selector */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <LayersIcon size={16} className="text-accent-blue" />
                            เลือกระดับการแก้ไขปัญหา
                        </h4>
                        
                        {resolveProblemCount >= 3 && (
                            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                                <AlertTriangleIcon size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-red-100">
                                    <strong className="text-red-400 block mb-1">คำแนะนำจากระบบ: ปัญหาซ้ำซาก (เกิน 3 ครั้ง)</strong>
                                    ควรพิจารณาเลือกระดับ 3 (ซ่อมใหญ่/เปลี่ยนอะไหล่หลัก) เพื่อแก้ปัญหาให้เด็ดขาด
                                </div>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-2">
                            <label className={`relative p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${resolveLevel === 1 ? 'bg-accent-cyan/10 border-accent-cyan/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${resolveLevel === 1 ? 'border-accent-cyan' : 'border-text-muted'}`}>
                                    {resolveLevel === 1 && <div className="w-2 h-2 rounded-full bg-accent-cyan" />}
                                </div>
                                <input type="radio" name="resolveLevel" className="hidden" checked={resolveLevel === 1} onChange={() => setResolveLevel(1)} />
                                <div>
                                    <div className={`font-bold text-sm ${resolveLevel === 1 ? 'text-accent-cyan' : 'text-text-primary'}`}>ระดับ 1: ปรับตั้งค่า / ทำความสะอาด</div>
                                    <div className="text-xs text-text-muted mt-1">ขันแน่น, ทำความสะอาด, ปรับตั้งค่า (ไม่ต้องใช้เวลา/งบประมาณมาก)</div>
                                </div>
                            </label>
                            
                            <label className={`relative p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${resolveLevel === 2 ? 'bg-accent-yellow/10 border-accent-yellow/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${resolveLevel === 2 ? 'border-accent-yellow' : 'border-text-muted'}`}>
                                    {resolveLevel === 2 && <div className="w-2 h-2 rounded-full bg-accent-yellow" />}
                                </div>
                                <input type="radio" name="resolveLevel" className="hidden" checked={resolveLevel === 2} onChange={() => setResolveLevel(2)} />
                                <div>
                                    <div className={`font-bold text-sm ${resolveLevel === 2 ? 'text-accent-yellow' : 'text-text-primary'}`}>ระดับ 2: เปลี่ยนชิ้นส่วนย่อย / ดัดแปลง</div>
                                    <div className="text-xs text-text-muted mt-1">เปลี่ยนอะไหล่สิ้นเปลือง, แก้ไขจุดเล็กน้อย (ไม่กระทบโครงสร้างหลัก)</div>
                                </div>
                            </label>

                            <label className={`relative p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${resolveLevel === 3 ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${resolveLevel === 3 ? 'border-red-500' : 'border-text-muted'}`}>
                                    {resolveLevel === 3 && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                </div>
                                <input type="radio" name="resolveLevel" className="hidden" checked={resolveLevel === 3} onChange={() => setResolveLevel(3)} />
                                <div>
                                    <div className={`font-bold text-sm ${resolveLevel === 3 ? 'text-red-500' : 'text-text-primary'}`}>ระดับ 3: ซ่อมใหญ่ / Overhaul</div>
                                    <div className="text-xs text-text-muted mt-1">รื้อประกอบ, เปลี่ยนอะไหล่ชิ้นสำคัญ (จำเป็นต้องระบุรายละเอียด)</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Resolution Details */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <FileTextIcon size={16} className="text-accent-cyan" />
                            รายละเอียดการแก้ไข / อะไหล่ที่เปลี่ยน
                            {resolveLevel === 3 && <span className="text-red-500 text-xs font-normal ml-1">(จำเป็นต้องระบุ)</span>}
                        </h4>
                        <textarea
                            value={resolveDetails}
                            onChange={(e) => setResolveDetails(e.target.value)}
                            className={`w-full bg-bg-tertiary border text-white rounded-lg px-3 py-3 text-sm outline-none resize-none h-28 transition-colors ${
                                resolveLevel === 3 && resolveDetails.trim() === "" 
                                ? "border-red-500/50 focus:border-red-500" 
                                : "border-white/20 focus:border-accent-cyan/50"
                            }`}
                            placeholder="ระบุว่าทำอะไรไปบ้าง เปลี่ยนอะไหล่ตัวไหน..."
                        />
                    </div>

                    {/* Resolved Date */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <CalendarIcon size={16} className="text-accent-yellow" />
                            วันที่/เวลาแก้ไขเสร็จ
                            <span className="text-text-muted text-xs font-normal ml-1">(สามารถย้อนหลังได้)</span>
                        </h4>
                        <input
                            type="datetime-local"
                            value={resolvedDate}
                            onChange={(e) => setResolvedDate(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-yellow/50 focus:bg-white/5 transition-colors [color-scheme:dark]"
                        />
                        <p className="text-xs text-text-muted mt-2 italic">
                            * สามารถปรับวันที่ย้อนหลังได้ สำหรับกรณีเพิ่มรายการย้อนหลัง
                        </p>
                    </div>

                    {/* Location Selector */}
                    <div>
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <MapPinIcon size={16} className="text-accent-blue" />
                            สถานที่ดำเนินการ
                        </h4>
                        
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    className="accent-accent-cyan"
                                    checked={!useCustomLocation} 
                                    onChange={() => setUseCustomLocation(false)} 
                                />
                                <span className="text-sm text-white/90">เลือกจากรายการ</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    className="accent-accent-cyan"
                                    checked={useCustomLocation} 
                                    onChange={() => {
                                        setUseCustomLocation(true);
                                        if (allLocations.includes(resolveLocation)) {
                                            setResolveLocation("");
                                        }
                                    }} 
                                />
                                <span className="text-sm text-white/90">ระบุสถานที่ใหม่</span>
                            </label>
                        </div>
                        
                        {!useCustomLocation ? (
                            <select
                                value={allLocations.includes(resolveLocation) ? resolveLocation : ""}
                                onChange={(e) => setResolveLocation(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-cyan/50 focus:bg-white/5 transition-colors"
                            >
                                <option value="">-- ไม่ระบุ --</option>
                                {allLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={resolveLocation}
                                onChange={(e) => setResolveLocation(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-cyan/50 focus:bg-white/5 transition-colors"
                                placeholder="ระบุสถานที่ใหม่ เช่น ไลน์ผลิต 2, คลังสินค้า..."
                            />
                        )}
                        <p className="text-xs text-text-muted mt-2 italic">
                            * สถานที่ที่ระบุจะถูกบันทึกไว้เป็นที่อยู่ล่าสุดของเครื่องจักรนี้
                        </p>
                    </div>
                </div>
            </Modal>
            
            {/* Hidden Report Card for Telegram/LINE Export */}
            <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, opacity: 0.01, pointerEvents: 'none' }}>
                {resolveConfirmOpen && recordToResolveId && (
                    <ResolutionReportCard 
                        ref={resolutionReportCardRef}
                        record={
                            recordToResolveId === 'demo' ? {
                                id: 'demo',
                                machineId: 'demo-1',
                                machineName: 'Rack oven No.1 (DEMO)',
                                machineCode: 'HT02-DEMO',
                                description: '[PM พบปัญหา] ทดสอบระบบมอเตอร์สั่น',
                                type: 'corrective',
                                priority: 'high',
                                status: 'completed',
                                date: new Date(),
                                technician: 'คุณณัฐชนน (Demo)',
                                details: resolveDetails || 'นี่คือการทดสอบระบบส่งแจ้งเตือน',
                                resolutionLevel: resolveLevel,
                                resolvedAt: new Date().toISOString(),
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            } as MaintenanceRecord : 
                            {
                                ...(records.find(r => r.id === recordToResolveId) || {}),
                                status: 'completed',
                                resolvedAt: new Date().toISOString(),
                                details: resolveDetails,
                                resolutionLevel: resolveLevel
                            } as MaintenanceRecord
                        }
                        machineCode={recordToResolveId === 'demo' ? 'HT02-DEMO' : (records.find(r => r.id === recordToResolveId)?.machineCode || '-')}
                    />
                )}
            </div>

            <PartReplacementPlanModal
                isOpen={replacementPlanOpen}
                onClose={() => setReplacementPlanOpen(false)}
                machineId={replacementPlanMachineId}
                machineName={replacementPlanMachineName}
                fromPMHistory={true}
                onViewHistory={() => setReplacementPlanOpen(false)}
            />
        </div>
    );
}
