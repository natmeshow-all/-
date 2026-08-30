import React, { useMemo, useState } from 'react';
import { PMPlan } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { CalendarIcon, AlertTriangleIcon, SettingsIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { updatePMPlan } from '../../services/maintenanceService';
import { useAuth } from '../../contexts/AuthContext';

interface WeeklyWorkloadChartProps {
    plans: PMPlan[];
    onRefresh?: () => void;
}

const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function WeeklyWorkloadChart({ plans, onRefresh }: WeeklyWorkloadChartProps) {
    const { t } = useLanguage();
    const { permissions } = useAuth();
    const [isBalancing, setIsBalancing] = useState(false);
    const [targetDate, setTargetDate] = useState(() => new Date());

    const monthData = useMemo(() => {
        const currentMonth = targetDate.getMonth();
        const currentYear = targetDate.getFullYear();
        const monthName = `${THAI_MONTHS[currentMonth]} ${currentYear + 543}`;
        const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

        // Initialize weeks array (Week 1 to Week 5)
        const weeks = [
            { week: 1, count: 0, label: 'W1 (1-7)', color: 'bg-accent-blue' },
            { week: 2, count: 0, label: 'W2 (8-14)', color: 'bg-accent-green' },
            { week: 3, count: 0, label: 'W3 (15-21)', color: 'bg-accent-yellow' },
            { week: 4, count: 0, label: 'W4 (22-28)', color: 'bg-accent-orange' },
            { week: 5, count: 0, label: 'W5 (29+)', color: 'bg-accent-purple' },
        ];

        let totalThisMonth = 0;

        plans.forEach(plan => {
            const dueDate = new Date(plan.nextDueDate);
            if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
                totalThisMonth++;
                const day = dueDate.getDate();
                if (day >= 1 && day <= 7) weeks[0].count++;
                else if (day >= 8 && day <= 14) weeks[1].count++;
                else if (day >= 15 && day <= 21) weeks[2].count++;
                else if (day >= 22 && day <= 28) weeks[3].count++;
                else if (day >= 29) weeks[4].count++;
            }
        });

        return { weeks, totalThisMonth, currentMonth, currentYear, monthName, isCurrentMonth };
    }, [plans, targetDate]);

    // Calculate plan counts for current month (ส.ค.) vs next month (ก.ย.) for quick switching
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
            const d = new Date(p.nextDueDate);
            if (d.getMonth() === thisMonthIdx && d.getFullYear() === thisYear) thisCount++;
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

    const maxCount = Math.max(...monthData.weeks.map(w => w.count), 1);

    // Calculate variance to warn about imbalance
    const counts = monthData.weeks.map(w => w.count);
    const avg = monthData.totalThisMonth / 5;
    const maxDiff = Math.max(...counts) - Math.min(...counts);
    const isUnbalanced = monthData.totalThisMonth > 5 && maxDiff > (avg * 1.5);

    const handleAutoBalance = async () => {
        if (!permissions.canManagePM) return;
        if (!confirm(`ระบบจะทำการกระจายงาน PM ของเดือน ${monthData.monthName} ออกเป็น 4 สัปดาห์อัตโนมัติ โดยจะเปลี่ยนวันที่ Next Due Date และบันทึกหมายเหตุไว้ ยืนยันหรือไม่?`)) return;
        
        setIsBalancing(true);
        try {
            const currentMonthPlans = plans.filter(p => {
                const dueDate = new Date(p.nextDueDate);
                return dueDate.getMonth() === monthData.currentMonth && dueDate.getFullYear() === monthData.currentYear;
            });

            // Sort them by existing date to minimize wild jumps
            currentMonthPlans.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

            const targetPerWeek = Math.ceil(currentMonthPlans.length / 4);
            const updates = [];

            for (let i = 0; i < currentMonthPlans.length; i++) {
                const plan = currentMonthPlans[i];
                const weekIndex = Math.floor(i / targetPerWeek);
                
                const targetDay = Math.min(4 + (weekIndex * 7), 28);
                const newDate = new Date(monthData.currentYear, monthData.currentMonth, targetDay);
                
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
        <div className="bg-bg-secondary/40 border border-white/5 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                        <CalendarIcon size={20} className="text-accent-blue" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-text-primary">สมดุลงาน PM: {monthData.monthName}</h2>
                            {monthData.isCurrentMonth && (
                                <span className="px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue text-[10px] font-bold">
                                    เดือนปัจจุบัน
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-text-muted">
                            แผนบำรุงรักษาทั้งหมด <strong className="text-text-primary font-bold">{monthData.totalThisMonth} งาน</strong> ในเดือนนี้
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Month Picker / Switcher */}
                    <div className="flex items-center gap-1 bg-bg-tertiary px-2 py-1 rounded-xl border border-white/10 shadow-inner">
                        <button
                            onClick={() => {
                                const d = new Date(targetDate);
                                d.setMonth(d.getMonth() - 1);
                                setTargetDate(d);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-all active:scale-95"
                            title="เดือนก่อนหน้า"
                        >
                            <ChevronLeftIcon size={16} />
                        </button>
                        <span className="text-xs font-bold text-text-primary px-2 min-w-[100px] text-center select-none">
                            {monthData.monthName}
                        </span>
                        <button
                            onClick={() => {
                                const d = new Date(targetDate);
                                d.setMonth(d.getMonth() + 1);
                                setTargetDate(d);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-all active:scale-95"
                            title="เดือนถัดไป"
                        >
                            <ChevronRightIcon size={16} />
                        </button>
                    </div>

                    {/* Quick Month Jump Chips */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setTargetDate(new Date())}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${monthData.isCurrentMonth ? 'bg-accent-blue text-white border-accent-blue shadow-md' : 'bg-bg-tertiary text-text-muted border-white/5 hover:text-text-primary'}`}
                        >
                            {monthCounts.thisMonthLabel} ({monthCounts.thisMonthCount})
                        </button>
                        <button
                            onClick={() => setTargetDate(monthCounts.nextMonthDate)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${!monthData.isCurrentMonth && targetDate.getMonth() === monthCounts.nextMonthDate.getMonth() ? 'bg-accent-cyan text-bg-primary border-accent-cyan shadow-md' : 'bg-bg-tertiary text-text-muted border-white/5 hover:text-text-primary'}`}
                        >
                            {monthCounts.nextMonthLabel} ({monthCounts.nextMonthCount})
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
                                    onClick={handleAutoBalance}
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
                {monthData.weeks.map((week, index) => {
                    const percentage = (week.count / maxCount) * 100;
                    return (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-16 sm:w-24 text-xs font-medium text-text-muted text-right whitespace-nowrap">
                                {week.label}
                            </div>
                            <div className="flex-1 h-8 sm:h-10 bg-bg-tertiary rounded-lg overflow-hidden relative border border-white/5 flex items-center">
                                <div 
                                    className={`h-full ${week.color} transition-all duration-1000 ease-out flex items-center px-3`}
                                    style={{ width: `${Math.max(percentage, 2)}%`, opacity: week.count === 0 ? 0.3 : 1 }}
                                >
                                </div>
                                <span className={`absolute left-3 text-xs font-bold z-10 ${week.count > 0 ? 'text-bg-primary' : 'text-text-muted'}`}>
                                    {week.count > 0 ? `${week.count} งาน` : '-'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4 text-[10px] sm:text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-blue"></div> W1 (วันที่ 1-7)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-green"></div> W2 (วันที่ 8-14)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-yellow"></div> W3 (วันที่ 15-21)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-orange"></div> W4 (วันที่ 22-28)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-purple"></div> W5 (วันที่ 29 เป็นต้นไป)
                </div>
            </div>
        </div>
    );
}
