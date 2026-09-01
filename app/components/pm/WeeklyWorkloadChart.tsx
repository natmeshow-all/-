import React, { useMemo, useState } from 'react';
import { PMPlan } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { CalendarIcon, AlertTriangleIcon, SettingsIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { updatePMPlan } from '../../services/maintenanceService';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../ui/ConfirmModal';

interface WeeklyWorkloadChartProps {
    plans: PMPlan[];
    onRefresh?: () => void;
    getMachineName?: (machineId?: string, machineName?: string) => string;
}

const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function WeeklyWorkloadChart({ plans, onRefresh, getMachineName }: WeeklyWorkloadChartProps) {
    const { t } = useLanguage();
    const { permissions } = useAuth();
    const [isBalancing, setIsBalancing] = useState(false);
    const [targetDate, setTargetDate] = useState(() => new Date());
    const [showConfirm, setShowConfirm] = useState(false);

    const weekData = useMemo(() => {
        // Calculate Monday of the targetDate's week
        const dayOfWeek = targetDate.getDay();
        const diffToMonday = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(targetDate.getFullYear(), targetDate.getMonth(), diffToMonday);
        startOfWeek.setHours(0,0,0,0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);

        const isCurrentWeek = new Date() >= startOfWeek && new Date() <= endOfWeek;

        const dateRangeStr = `${startOfWeek.getDate()} ${THAI_MONTHS[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${THAI_MONTHS[endOfWeek.getMonth()]} ${endOfWeek.getFullYear() + 543}`;

        const THAI_DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
        const COLORS = ['bg-accent-yellow', 'bg-accent-purple', 'bg-accent-green', 'bg-accent-orange', 'bg-accent-blue', 'bg-accent-purple', 'bg-accent-red'];

        const days = Array.from({length: 7}).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return {
                dayIndex: i,
                date: d,
                label: `${THAI_DAYS[i]} (${d.getDate()})`,
                color: COLORS[i % COLORS.length],
                count: 0,
                plans: [] as PMPlan[]
            };
        });

        let totalThisWeek = 0;

        plans.forEach(plan => {
            if (plan.status !== 'active') return;
            const dueDate = new Date(plan.nextDueDate);
            dueDate.setHours(0,0,0,0);

            // Check if it falls exactly in this week
            if (dueDate >= startOfWeek && dueDate <= endOfWeek) {
                totalThisWeek++;
                // Find which day
                const diffDays = Math.floor((dueDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays < 7) {
                    days[diffDays].count++;
                    days[diffDays].plans.push(plan);
                }
            }
        });

        return { days, totalThisWeek, dateRangeStr, isCurrentWeek, startOfWeek };
    }, [plans, targetDate]);

    // Calculate plan counts for current month vs next month for quick switching (keeping this logic for now but might rename)
    const monthCounts = useMemo(() => {
        const now = new Date();
        const thisMonthIdx = now.getMonth();
        const thisYear = now.getFullYear();
        const nextMonthDate = new Date(thisYear, thisMonthIdx + 1, 1);
        const nextMonthIdx = nextMonthDate.getMonth();
        const nextYear = nextMonthDate.getFullYear();

        let thisCount = 0;
        let nextCount = 0;

        plans.forEach(p => {
            if (p.status !== 'active') return;
            const d = new Date(p.nextDueDate);
            const isThisMonth = d.getMonth() === thisMonthIdx && d.getFullYear() === thisYear;
            const isOverdue = d.getTime() < new Date(thisYear, thisMonthIdx, 1).getTime();
            
            if (isThisMonth || isOverdue) thisCount++;
            if (d.getMonth() === nextMonthIdx && d.getFullYear() === nextYear) nextCount++;
        });

        return {
            thisMonthLabel: `${THAI_MONTHS[thisMonthIdx]} ${thisYear + 543}`,
            thisMonthCount: thisCount,
            nextMonthLabel: `${THAI_MONTHS[nextMonthIdx]} ${nextYear + 543}`,
            nextMonthCount: nextCount,
            nextMonthDate
        };
    }, [plans]);

    const maxCount = Math.max(...weekData.days.map(w => w.count), 1);

    // Calculate variance to warn about imbalance
    const counts = weekData.days.map(w => w.count);
    const avg = weekData.totalThisWeek / 7;
    const maxDiff = Math.max(...counts) - Math.min(...counts);
    const isUnbalanced = weekData.totalThisWeek > 10 && maxDiff > (avg * 1.5);

    const handleAutoBalance = async () => {
        setIsBalancing(true);
        try {
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();
            
            const currentMonthPlans = plans.filter(p => {
                const dueDate = new Date(p.nextDueDate);
                const isThisMonth = dueDate.getMonth() === targetMonth && dueDate.getFullYear() === targetYear;
                const isOverdue = dueDate.getTime() < new Date(targetYear, targetMonth, 1).getTime();
                
                return p.scheduleType === 'monthly' && p.status === 'active' && (isThisMonth || isOverdue);
            });

            // Sort them by existing date to minimize wild jumps
            currentMonthPlans.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

            const startDay = 1;
            const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
            const endDay = Math.min(30, daysInMonth);
            const availableDays = endDay - startDay + 1;
            const plansPerDay = Math.max(1, Math.ceil(currentMonthPlans.length / availableDays));

            const updates = [];

            for (let i = 0; i < currentMonthPlans.length; i++) {
                const plan = currentMonthPlans[i];
                const dayOffset = Math.floor(i / plansPerDay);
                const targetDay = Math.min(startDay + dayOffset, endDay);
                const newDate = new Date(targetYear, targetMonth, targetDay);
                
                const oldDate = new Date(plan.nextDueDate);
                if (oldDate.getDate() === targetDay) continue;

                const oldDateStr = oldDate.toLocaleDateString('th-TH');
                const appendNote = `\n[เลื่อนปรับสมดุลอัตโนมัติ จากวันที่ ${oldDateStr}]`;
                const newNotes = (plan.notes || "") + appendNote;

                updates.push(updatePMPlan(plan.id, {
                    nextDueDate: newDate,
                    notes: newNotes.trim()
                }));
            }

            if (updates.length > 0) {
                await Promise.all(updates);
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            console.error("Auto balance failed", error);
            alert("เกิดข้อผิดพลาดในการปรับสมดุล");
        } finally {
            setIsBalancing(false);
        }
    };

    return (
        <>
            <div className="bg-bg-secondary/40 border border-white/5 rounded-2xl p-4 sm:p-6 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                            <CalendarIcon size={20} className="text-accent-blue" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-text-primary">สมดุลงาน PM: {weekData.dateRangeStr}</h2>
                                {weekData.isCurrentWeek && (
                                    <span className="px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue text-[10px] font-bold">
                                        สัปดาห์นี้
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">
                                แผนบำรุงรักษาทั้งหมด <strong className="text-text-primary font-bold">{weekData.totalThisWeek} งาน</strong> ในสัปดาห์นี้
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Week Picker / Switcher */}
                        <div className="flex items-center gap-1 bg-bg-tertiary px-2 py-1 rounded-xl border border-white/10 shadow-inner">
                            <button
                                onClick={() => {
                                    const d = new Date(targetDate);
                                    d.setDate(d.getDate() - 7);
                                    setTargetDate(d);
                                }}
                                className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-all active:scale-95"
                                title="สัปดาห์ก่อนหน้า"
                            >
                                <ChevronLeftIcon size={16} />
                            </button>
                            <span className="text-xs font-bold text-text-primary px-2 min-w-[150px] text-center select-none">
                                {weekData.dateRangeStr}
                            </span>
                            <button
                                onClick={() => {
                                    const d = new Date(targetDate);
                                    d.setDate(d.getDate() + 7);
                                    setTargetDate(d);
                                }}
                                className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-all active:scale-95"
                                title="สัปดาห์ถัดไป"
                            >
                                <ChevronRightIcon size={16} />
                            </button>
                        </div>

                        {/* Quick Month Jump Chips */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setTargetDate(new Date())}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${weekData.isCurrentWeek ? 'bg-accent-blue text-white border-accent-blue shadow-md' : 'bg-bg-tertiary text-text-muted border-white/5 hover:text-text-primary'}`}
                            >
                                สัปดาห์นี้ ({weekData.totalThisWeek})
                            </button>
                        </div>

                        {isUnbalanced && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-orange/10 border border-accent-orange/20 rounded-lg text-accent-orange text-xs font-semibold animate-pulse-glow">
                                    <AlertTriangleIcon size={14} />
                                    <span>งานบางสัปดาห์กระจุกตัว!</span>
                                </div>
                                {permissions.canManagePM && (
                                    <button
                                        onClick={() => setShowConfirm(true)}
                                        disabled={isBalancing}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50"
                                    >
                                        <SettingsIcon size={14} className={isBalancing ? "animate-spin" : ""} />
                                        {isBalancing ? "กำลังปรับสมดุล..." : "ปรับสมดุลอัตโนมัติ"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {weekData.days.map((day, index) => {
                        return (
                            <div key={index} className="flex items-start sm:items-center gap-3 bg-bg-tertiary p-3 rounded-xl border border-white/5">
                                <div className="w-20 sm:w-28 text-[11px] sm:text-xs font-bold text-text-muted text-right whitespace-nowrap shrink-0 mt-1 sm:mt-0">
                                    {day.label}
                                </div>
                                <div className="flex-1 flex flex-wrap gap-2 items-center">
                                    {day.plans.length > 0 ? (
                                        <>
                                            {day.plans.map(p => {
                                                const mName = getMachineName ? getMachineName(p.machineId, p.machineName) : (p.machineName || p.taskName?.replace(/\[.*?\]\s*/, "") || "ไม่ระบุ");
                                                const finalName = mName === "ไม่ระบุ" && p.taskName ? p.taskName : mName;
                                                return (
                                                    <span 
                                                        key={p.id} 
                                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md bg-white/5 border border-white/10 text-white truncate max-w-[200px]`}
                                                        title={finalName}
                                                    >
                                                        {finalName}
                                                    </span>
                                                )
                                            })}
                                            <span className="text-[10px] text-text-muted font-semibold ml-auto px-2 bg-white/5 rounded-full">
                                                รวม {day.count} งาน
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-white/20 italic font-medium px-2 py-0.5">ไม่มีแผนงาน</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleAutoBalance}
                title="ยืนยันการปรับสมดุลงาน"
                message={`ระบบจะทำการกระจายงาน PM ของเดือนนี้ออกเป็นรายวันตลอดทั้งเดือน (วันที่ 1 ถึง 30) โดยอัตโนมัติ โดยจะเปลี่ยนวันที่ และบันทึกหมายเหตุไว้ ยืนยันหรือไม่?`}
                confirmText="ยืนยันการปรับสมดุล"
                cancelText="ยกเลิก"
            />
        </>
    );
}
