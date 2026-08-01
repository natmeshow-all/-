import React, { useMemo } from 'react';
import { PMPlan } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { CalendarIcon, AlertTriangleIcon } from '../ui/Icons';

interface WeeklyWorkloadChartProps {
    plans: PMPlan[];
}

export default function WeeklyWorkloadChart({ plans }: WeeklyWorkloadChartProps) {
    const { t } = useLanguage();

    const currentMonthData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

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
            // Check if due date is in the current month and year
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

        return { weeks, totalThisMonth, currentMonth, currentYear };
    }, [plans]);

    const maxCount = Math.max(...currentMonthData.weeks.map(w => w.count), 1); // Avoid division by zero

    // Calculate variance to warn about imbalance
    const counts = currentMonthData.weeks.map(w => w.count);
    const avg = currentMonthData.totalThisMonth / 5;
    const maxDiff = Math.max(...counts) - Math.min(...counts);
    const isUnbalanced = currentMonthData.totalThisMonth > 5 && maxDiff > (avg * 1.5); // Arbitrary threshold for warning

    return (
        <div className="bg-bg-secondary/40 border border-white/5 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                        <CalendarIcon size={20} className="text-accent-blue" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">สมดุลงาน PM เดือนปัจจุบัน</h2>
                        <p className="text-xs text-text-muted">
                            แผนบำรุงรักษาทั้งหมด {currentMonthData.totalThisMonth} งาน ในเดือนนี้
                        </p>
                    </div>
                </div>
                {isUnbalanced && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-orange/10 border border-accent-orange/20 rounded-lg text-accent-orange text-xs font-semibold animate-pulse-glow">
                        <AlertTriangleIcon size={14} />
                        <span>งานบางสัปดาห์กระจุกตัว! ควรปรับสมดุล</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3">
                {currentMonthData.weeks.map((week, index) => {
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
