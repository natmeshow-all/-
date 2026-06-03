"use client";

import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { BoxIcon, HistoryIcon } from "../ui/Icons";

export default function WelcomeGuide() {
    const { userProfile, dismissWelcome, loading } = useAuth();
    const { language } = useLanguage();
    const [dismissing, setDismissing] = useState(false);

    if (loading || !userProfile || userProfile.hasSeenWelcome || dismissing) {
        return null;
    }

    const handleDismiss = async () => {
        setDismissing(true);
        await dismissWelcome();
    };

    return (
        <div className="mb-6 bg-primary/10 border border-primary/20 rounded-2xl p-5 shadow-lg relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-text-primary mb-1">
                        {language === "th" 
                            ? "ยินดีต้อนรับสู่ Deep Analysis Engine" 
                            : "Welcome to the Deep Analysis Engine"}
                    </h2>
                    <p className="text-text-secondary text-sm">
                        {language === "th"
                            ? "ระบบนี้ช่วยให้คุณจัดการอะไหล่และบันทึกประวัติการซ่อมบำรุงได้อย่างรวดเร็ว ดูคู่มือฉบับเต็มได้ที่ปุ่ม Help ด้านบนขวา"
                            : "This system helps you manage spare parts and maintenance records quickly. See the full guide via the Help button on the top right."}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span className="p-1 bg-accent-green/20 text-accent-green rounded">
                                <BoxIcon size={12} />
                            </span>
                            {language === "th" ? "เช็คสต็อกอะไหล่" : "Check Inventory"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span className="p-1 bg-accent-yellow/20 text-accent-yellow rounded">
                                <HistoryIcon size={12} />
                            </span>
                            {language === "th" ? "บันทึกการซ่อมบำรุง" : "Log Maintenance"}
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 mt-3 sm:mt-0">
                    <button 
                        onClick={handleDismiss}
                        className="btn btn-primary text-xs h-8 px-4 font-bold shadow-md hover:shadow-primary/30"
                    >
                        {language === "th" ? "เริ่มต้นใช้งาน" : "Get Started"}
                    </button>
                </div>
            </div>
        </div>
    );
}
