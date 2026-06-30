import React, { forwardRef } from 'react';
import { MaintenanceRecord } from '../types';

interface ResolutionReportCardProps {
    record: MaintenanceRecord;
    machineCode: string;
}

export const ResolutionReportCard = forwardRef<HTMLDivElement, ResolutionReportCardProps>(({ record, machineCode }, ref) => {
    const dateStr = record.resolvedAt ? new Date(record.resolvedAt).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) : new Date().toLocaleDateString('th-TH');
    
    const timeStr = record.resolvedAt ? new Date(record.resolvedAt).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    }) : '-';

    const locationText = record.Location || record.location || 'ไม่ระบุ';

    const level = record.resolutionLevel || 1;
    let levelText = "ระดับ 1: ปรับตั้งค่า / ทำความสะอาด";
    let levelColor = "#00d4ff"; // Cyan
    let levelBg = "bg-[#00d4ff]/10 border-[#00d4ff]/20";
    let levelSub = "ขันแน่น, ทำความสะอาด, ปรับตั้งค่า (ไม่ต้องใช้เวลา/งบประมาณมาก)";
    
    if (level === 2) {
        levelText = "ระดับ 2: เปลี่ยนชิ้นส่วนย่อย / ดัดแปลง";
        levelColor = "#fbbf24"; // Yellow
        levelBg = "bg-[#fbbf24]/10 border-[#fbbf24]/20";
        levelSub = "เปลี่ยนอะไหล่สิ้นเปลือง, แก้ไขจุดเล็กน้อย (ไม่กระทบโครงสร้างหลัก)";
    } else if (level === 3) {
        levelText = "ระดับ 3: ซ่อมใหญ่ / Overhaul";
        levelColor = "#ef4444"; // Red
        levelBg = "bg-[#ef4444]/10 border-[#ef4444]/20";
        levelSub = "รื้อประกอบ, เปลี่ยนอะไหล่ชิ้นสำคัญ (จำเป็นต้องระบุรายละเอียด)";
    }

    return (
        <div 
            ref={ref}
            className={`w-[850px] bg-[#0F172A] text-white p-8 font-sans border-t-8 relative`}
            style={{ 
                fontFamily: "'Prompt', sans-serif",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                borderTopColor: levelColor
            }}
        >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-white/10">
                <div>
                    <div className="font-bold text-sm tracking-wider uppercase mb-1" style={{ color: levelColor }}>
                        AOB Resolution Report
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-baseline gap-3">
                        <span>{record.machineName}</span>
                        {machineCode && (
                            <span className="text-2xl font-medium opacity-90" style={{ color: levelColor }}>({machineCode})</span>
                        )}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-[#888888]">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                            <span className="text-orange-400">⚠️ ปัญหา:</span> {record.description || "พบปัญหา"}
                        </span>
                    </div>
                </div>
                
                {/* Level Circle (Middle-Right) */}
                <div className="flex flex-col items-center justify-center mr-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="relative w-16 h-16 mb-2 flex items-center justify-center rounded-full border-4" style={{ borderColor: levelColor, backgroundColor: `${levelColor}20` }}>
                        <span className="text-3xl font-black" style={{ color: levelColor }}>{level}</span>
                    </div>
                    <div className="text-xs text-[#888888] font-bold">ระดับการซ่อม</div>
                </div>

                <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-white mb-1">{dateStr} {timeStr}</div>
                    <div className="text-sm text-[#888888]">ผู้แก้ไข: <span style={{ color: levelColor }}>{record.technician || "-"}</span></div>
                    <div className="text-sm text-[#888888]">สถานที่: {locationText}</div>
                </div>
            </div>

            {/* Resolution Level Detail Section */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span style={{ color: levelColor }}>🔧</span> ข้อมูลการแก้ไขปัญหา
                </h2>
                
                <div className={`p-5 rounded-xl border ${levelBg} flex items-start gap-4`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1`} style={{ backgroundColor: levelColor }}>
                        <span className="text-black font-bold text-lg">{level}</span>
                    </div>
                    <div>
                        <div className="font-bold text-lg mb-1" style={{ color: levelColor }}>{levelText}</div>
                        <div className="text-sm text-white/80">{levelSub}</div>
                    </div>
                </div>
            </div>

            {/* Details Section */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-[#00d4ff]">📝</span> รายละเอียดการดำเนินการ / อะไหล่ที่เปลี่ยน
                </h2>
                <div className="bg-[#1E293B] p-5 rounded-lg border border-white/5 whitespace-pre-wrap text-white/90 text-sm leading-relaxed">
                    {record.details || "-"}
                </div>
            </div>

            {/* Footer Section */}
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
                        <span className="text-sm font-semibold">สถานะ: แก้ไขปัญหาเรียบร้อย</span>
                    </div>
                </div>
                <div className="text-xs text-[#888888] italic">
                    Generated automatically by AOB Maintenance System
                </div>
            </div>
        </div>
    );
});

ResolutionReportCard.displayName = 'ResolutionReportCard';
