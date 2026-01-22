"use client";

import React, { useState, useEffect } from "react";
import { AuditLog, AuditActionType } from "../../types";
import { getAuditLogs } from "../../lib/firebaseService";
import { useLanguage } from "../../contexts/LanguageContext";
import {
    ActivityIcon,
    UserIcon,
    CalendarIcon,
    SearchIcon,
    DownloadIcon,
    FilterIcon
} from "../ui/Icons";

// Action type to Thai label mapping
const actionLabels: Record<AuditActionType, { th: string; en: string; color: string }> = {
    login: { th: "เข้าสู่ระบบ", en: "Login", color: "text-accent-green" },
    logout: { th: "ออกจากระบบ", en: "Logout", color: "text-text-muted" },
    pm_complete: { th: "ปิดงาน PM", en: "PM Completed", color: "text-accent-blue" },
    pm_create: { th: "สร้าง PM Plan", en: "PM Created", color: "text-accent-cyan" },
    pm_edit: { th: "แก้ไข PM Plan", en: "PM Edited", color: "text-accent-orange" },
    pm_delete: { th: "ลบ PM Plan", en: "PM Deleted", color: "text-accent-red" },
    maintenance_create: { th: "บันทึกซ่อมบำรุง", en: "Maintenance Created", color: "text-accent-blue" },
    maintenance_edit: { th: "แก้ไขซ่อมบำรุง", en: "Maintenance Edited", color: "text-accent-orange" },
    user_approve: { th: "อนุมัติผู้ใช้", en: "User Approved", color: "text-accent-green" },
    user_reject: { th: "ปฏิเสธผู้ใช้", en: "User Rejected", color: "text-accent-red" },
    user_role_change: { th: "เปลี่ยน Role", en: "Role Changed", color: "text-accent-purple" },
    part_add: { th: "เพิ่มอะไหล่", en: "Part Added", color: "text-accent-cyan" },
    part_edit: { th: "แก้ไขอะไหล่", en: "Part Edited", color: "text-accent-orange" },
    part_delete: { th: "ลบอะไหล่", en: "Part Deleted", color: "text-accent-red" },
    stock_change: { th: "เปลี่ยนแปลงสต็อก", en: "Stock Changed", color: "text-accent-yellow" },
    machine_add: { th: "เพิ่มเครื่องจักร", en: "Machine Added", color: "text-accent-cyan" },
    machine_edit: { th: "แก้ไขเครื่องจักร", en: "Machine Edited", color: "text-accent-orange" },
    machine_delete: { th: "ลบเครื่องจักร", en: "Machine Deleted", color: "text-accent-red" },
    settings_change: { th: "เปลี่ยนการตั้งค่า", en: "Settings Changed", color: "text-accent-purple" },
    data_export: { th: "Export ข้อมูล", en: "Data Exported", color: "text-accent-blue" },
    system_error: { th: "ข้อผิดพลาดระบบ", en: "System Error", color: "text-accent-red" }
};

export default function AuditLogTab() {
    const { language } = useLanguage();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAction, setFilterAction] = useState<AuditActionType | "all">("all");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await getAuditLogs(200);
            setLogs(data);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.targetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = filterAction === "all" || log.action === filterAction;

        return matchesSearch && matchesAction;
    });

    const exportToCSV = () => {
        const headers = ["Timestamp", "User", "Action", "Target", "Details"];
        const rows = filteredLogs.map(log => [
            log.timestamp.toISOString(),
            log.userName,
            log.action,
            log.targetName || "",
            log.details || ""
        ]);

        const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <ActivityIcon size={20} className="text-primary" />
                        {language === 'th' ? 'บันทึกกิจกรรม' : 'Audit Log'}
                    </h2>
                    <p className="text-xs text-text-muted">
                        {language === 'th' ? `${filteredLogs.length} รายการ` : `${filteredLogs.length} entries`}
                    </p>
                </div>

                <button
                    onClick={exportToCSV}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
                >
                    <DownloadIcon size={14} />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder={language === 'th' ? 'ค้นหาผู้ใช้, เป้าหมาย...' : 'Search user, target...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full pl-9 text-sm"
                    />
                </div>

                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value as AuditActionType | "all")}
                    className="input-field text-sm min-w-[150px]"
                >
                    <option value="all">{language === 'th' ? 'ทุกการกระทำ' : 'All Actions'}</option>
                    {Object.entries(actionLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                            {language === 'th' ? label.th : label.en}
                        </option>
                    ))}
                </select>
            </div>

            {/* Log List */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-text-muted">
                        <ActivityIcon size={40} className="mx-auto mb-3 opacity-30" />
                        <p>{language === 'th' ? 'ไม่พบบันทึกกิจกรรม' : 'No audit logs found'}</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => {
                        const actionInfo = actionLabels[log.action] || { th: log.action, en: log.action, color: "text-text-muted" };
                        return (
                            <div
                                key={log.id}
                                className="card p-3 bg-bg-secondary/30 border-white/5 hover:border-white/10 transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                        <UserIcon size={14} className="text-text-muted" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-sm text-text-primary truncate">
                                                {log.userName}
                                            </span>
                                            <span className="text-[10px] text-text-muted shrink-0 flex items-center gap-1">
                                                <CalendarIcon size={10} />
                                                {log.timestamp.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs font-bold ${actionInfo.color}`}>
                                                {language === 'th' ? actionInfo.th : actionInfo.en}
                                            </span>
                                            {log.targetName && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                    <span className="text-xs text-text-muted truncate">
                                                        {log.targetName}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {log.details && (
                                            <p className="text-[10px] text-text-muted mt-1 line-clamp-1">
                                                {log.details}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
