"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../contexts/LanguageContext";
import { getPMPlans } from "../../lib/firebaseService";
import { PMPlan } from "../../types";
import { AlertTriangleIcon, CheckIcon, CalendarIcon } from "./Icons";

export default function PriorityPMAlert() {
    const { t, language } = useLanguage();
    const [overduePlans, setOverduePlans] = useState<PMPlan[]>([]);
    const [dueTodayPlans, setDueTodayPlans] = useState<PMPlan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const plans = await getPMPlans();
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                const overdue: PMPlan[] = [];
                const dueToday: PMPlan[] = [];

                plans.forEach(plan => {
                    if (plan.status !== 'active') return;

                    const dueDate = new Date(plan.nextDueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    const diffTime = dueDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        overdue.push(plan);
                    } else if (diffDays === 0) {
                        dueToday.push(plan);
                    }
                });

                setOverduePlans(overdue);
                setDueTodayPlans(dueToday);
            } catch (error) {
                console.error("Error fetching PM plans:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, []);

    if (loading) return null;
    
    const totalUrgent = overduePlans.length + dueTodayPlans.length;
    
    if (totalUrgent === 0) return null;

    return (
        <div className="w-full mb-6 animate-in slide-in-from-top-4 duration-700 fade-in">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                {/* Animated Background Pulse */}
                <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
                
                <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Icon Animation Section */}
                    <div className="flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <div className="relative bg-gradient-to-br from-red-500 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                            <div className="animate-[wiggle_1s_ease-in-out_infinite]">
                                <AlertTriangleIcon size={32} className="text-white" />
                            </div>
                        </div>
                        {/* Notification Badge */}
                        <div className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full border-2 border-red-500 shadow-sm z-10 animate-bounce">
                            {totalUrgent}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h2 className="text-xl md:text-2xl font-bold text-white flex flex-col md:flex-row items-center md:items-start gap-2">
                            <span className="text-red-400">
                                {language === 'th' ? 'แจ้งเตือนด่วน!' : 'URGENT ALERT!'}
                            </span>
                            <span className="text-white/90">
                                {language === 'th' ? 'มีงานซ่อมบำรุงที่ต้องทำทันที' : 'Immediate Maintenance Required'}
                            </span>
                        </h2>
                        <p className="text-text-secondary text-sm md:text-base max-w-2xl">
                            {language === 'th' 
                                ? `พบรายการ PM ที่ถึงกำหนด ${dueTodayPlans.length} รายการ และเกินกำหนด ${overduePlans.length} รายการ กรุณาดำเนินการเป็นลำดับแรกก่อนเริ่มงานอื่น`
                                : `Found ${dueTodayPlans.length} due today and ${overduePlans.length} overdue PM tasks. Please prioritize these tasks immediately.`}
                        </p>
                        
                        {/* Quick List Preview (Max 3 items) */}
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
                            {[...overduePlans, ...dueTodayPlans].slice(0, 3).map((plan, idx) => (
                                <span key={plan.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-secondary/80 border border-white/10 text-xs text-text-primary">
                                    <span className={`w-2 h-2 rounded-full ${overduePlans.includes(plan) ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}></span>
                                    {plan.machineName}
                                </span>
                            ))}
                            {totalUrgent > 3 && (
                                <span className="inline-flex items-center px-2 py-1 text-xs text-text-muted">
                                    +{totalUrgent - 3} more...
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0">
                        <Link href="/schedule">
                            <button className="group relative px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center gap-2 overflow-hidden">
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                <span className="relative flex items-center gap-2">
                                    {language === 'th' ? 'ไปที่ตารางงาน PM' : 'Go to PM Schedule'}
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </span>
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(-3deg); }
                    50% { transform: rotate(3deg); }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
