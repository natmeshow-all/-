import React, { forwardRef } from 'react';
import { MaintenanceRecord, ChecklistItemResult } from '../../types';

interface PMReportCardProps {
    record: MaintenanceRecord;
    completedChecklist: ChecklistItemResult[];
    machineCode: string;
    efficiencyPct?: number;
    trend?: number | null;
    scheduleText?: string;
    issuesFound?: {description: string}[];
}

export const PMReportCard = forwardRef<HTMLDivElement, PMReportCardProps>(({ record, completedChecklist, machineCode, efficiencyPct = 100, trend = null, scheduleText, issuesFound = [] }, ref) => {
    const dateStr = record.date ? new Date(record.date).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) : '-';

    const maintenanceType = record.type === 'preventive' ? 'บำรุงรักษาเชิงป้องกัน' :
        record.type === 'corrective' ? 'ซ่อมบำรุงแก้ไข' : 'การบำรุงรักษา';

    const locationText = record.Location || record.location || 'ไม่ระบุ';

    // Efficiency ring logic
    const radius = 26;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, efficiencyPct));
    const strokeDashoffset = circ * (1 - pct / 100);
    const ringColor = pct >= 80 ? '#10b981' : pct >= 55 ? '#fbbf24' : '#ef4444';

    return (
        <div 
            ref={ref}
            className="w-[850px] bg-[#0F172A] text-white p-8 font-sans border-t-8 border-t-[#00d4ff] relative"
            style={{ 
                fontFamily: "'Prompt', sans-serif",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
        >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-white/10">
                <div>
                    <div className="text-[#00d4ff] font-bold text-sm tracking-wider uppercase mb-1">
                        AOB Maintenance Report
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-baseline gap-3">
                        <span>{record.machineName}</span>
                        {machineCode && (
                            <span className="text-2xl text-[#00d4ff] font-medium opacity-90">({machineCode})</span>
                        )}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-[#888888]">
                        {scheduleText && (
                            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                                <span className="text-[#a855f7]">รอบ:</span> {scheduleText}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Efficiency Circle (Middle-Right) */}
                <div className="flex flex-col items-center justify-center mr-8 bg-white/5 p-3 rounded-2xl border border-white/10">
                    <div className="relative w-16 h-16 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" className="absolute top-0 left-0">
                            <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                            <circle
                                cx="32" cy="32" r={radius}
                                fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={circ} strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 32 32)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold" style={{color: ringColor}}>{efficiencyPct}%</span>
                        </div>
                    </div>
                    <div className="text-xs text-[#888888] font-bold">ประสิทธิภาพ</div>
                    {trend !== null ? (
                        <div className={`text-[10px] font-bold mt-0.5 px-1.5 rounded-full ${trend >= 0 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                            {trend > 0 ? `▲ +${trend}%` : trend < 0 ? `▼ ${trend}%` : `= 0%`}
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold mt-0.5 px-1.5 rounded-full bg-white/10 text-white/50">
                            (ไม่มีข้อมูลรอบก่อน)
                        </div>
                    )}
                </div>

                <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-white mb-1">{dateStr}</div>
                    <div className="text-sm text-[#888888]">ผู้ดำเนินการ: <span className="text-[#00d4ff]">{record.technician}</span></div>
                    <div className="text-sm text-[#888888]">สถานที่: {locationText}</div>
                </div>
            </div>

            {/* Checklist Section */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-[#00d4ff]">📋</span> รายการตรวจสอบ ({completedChecklist.length} รายการ)
                </h2>
                
                {completedChecklist.length === 0 ? (
                    <div className="text-[#888888] italic bg-white/5 p-4 rounded-lg">ไม่มีรายการตรวจสอบที่ดำเนินการ</div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {completedChecklist.map((item, idx) => {
                            // Extract color mapping based on common value keywords
                            let valueColor = "text-[#00d4ff] font-semibold";
                            let bgColor = "bg-[#00d4ff]/10 border-[#00d4ff]/20";
                            
                            if (item.value?.includes("สมบูรณ์") || item.value?.includes("ปกติ") || item.value?.includes("เรียบร้อย") || item.value?.includes("ไม่มี")) {
                                valueColor = "text-[#10b981] font-bold";
                                bgColor = "bg-[#10b981]/10 border-[#10b981]/20";
                            } else if (item.value?.includes("พอใช้") || item.value?.includes("เฝ้าระวัง") || item.value?.includes("ต่ำ") || item.value?.includes("เติมเพิ่ม")) {
                                valueColor = "text-[#fbbf24] font-bold";
                                bgColor = "bg-[#fbbf24]/10 border-[#fbbf24]/20";
                            } else if (item.value?.includes("เปลี่ยน") || item.value?.includes("ผิดปกติ") || item.value?.includes("ต้องเติม")) {
                                valueColor = "text-[#f87171] font-bold";
                                bgColor = "bg-[#f87171]/10 border-[#f87171]/20";
                            }

                            return (
                                <div key={idx} className="flex flex-col bg-[#1E293B] p-3 rounded-lg border border-white/5">
                                    <div className="text-xs text-[#888888] mb-1 font-semibold">{item.item}</div>
                                    <div className={`text-sm px-2 py-1 rounded border ${bgColor} ${valueColor} w-fit`}>
                                        {item.value || "-"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Issues Found Section */}
            {issuesFound.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-[#f87171]">⚠️</span> ปัญหาที่พบ ({issuesFound.length} รายการ)
                    </h2>
                    <div className="space-y-2">
                        {issuesFound.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-[#1E293B] p-3 rounded-lg border border-[#f87171]/20">
                                <span className="text-[#f87171] font-bold text-sm min-w-[20px]">{idx + 1}.</span>
                                <span className="text-sm text-white/90">{issue.description}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 text-xs text-[#f87171]/70 italic">
                        รายการเหล่านี้ถูกบันทึกเป็น "สิ่งที่ต้องแก้ไขในอนาคต" แล้ว
                    </div>
                </div>
            )}

            {/* Footer Section */}
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
                        <span className="text-sm font-semibold">สถานะ: เสร็จสิ้น</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#00d4ff]"></span>
                        <span className="text-sm font-semibold">ประเภท: {maintenanceType}</span>
                    </div>
                </div>
                <div className="text-xs text-[#888888] italic">
                    Generated automatically by AOB Maintenance System
                </div>
            </div>
        </div>
    );
});

PMReportCard.displayName = 'PMReportCard';
