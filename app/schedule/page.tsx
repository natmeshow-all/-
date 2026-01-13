"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { CalendarIcon, ClockIcon, SettingsIcon, AlertTriangleIcon, BoxIcon, FolderIcon, ActivityIcon } from "../components/ui/Icons";
import CalendarGrid from "../components/calendar/CalendarGrid";
import SpeedometerCalendar from "../components/calendar/SpeedometerCalendar";

// Sample schedule data - using string dates to avoid hydration issues
const scheduleData = [
    {
        id: "s1",
        machine: "Mix 2",
        type: "เปลี่ยนน้ำมันเกียร์",
        dueDateStr: "15 มกราคม 2569",
        daysUntil: 3,
        status: "upcoming",
    },
    {
        id: "s2",
        machine: "Oven 1",
        type: "ตรวจสอบ Bearing",
        dueDateStr: "20 มกราคม 2569",
        daysUntil: 8,
        status: "upcoming",
    },
    {
        id: "s3",
        machine: "Cooling Tunnel",
        type: "บำรุงรักษาคอมเพรสเซอร์",
        dueDateStr: "12 มกราคม 2569",
        daysUntil: 0,
        status: "due",
    },
    {
        id: "s4",
        machine: "Packaging Line",
        type: "เปลี่ยนสายพาน",
        dueDateStr: "25 มกราคม 2569",
        daysUntil: 13,
        status: "upcoming",
    },
    {
        id: "s5",
        machine: "Pie Line",
        type: "ตรวจสอบมอเตอร์",
        dueDateStr: "1 กุมภาพันธ์ 2569",
        daysUntil: 20,
        status: "scheduled",
    },
];

export default function SchedulePage() {
    const { t } = useLanguage();
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "calendar" | "speedometer">("speedometer");
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Transform scheduleData to Calendar Events

    // Transform scheduleData to Calendar Events
    const calendarEvents = scheduleData.map(item => {
        // Parse "15 มกราคม 2569" to Date object carefully for demo (In real app, data should be Date objects)
        // For this demo, let's just generate dates based on 'daysUntil' from today to ensure they show up in current view
        const date = new Date();
        date.setDate(date.getDate() + item.daysUntil);

        return {
            id: item.id,
            title: `${item.machine} - ${item.type}`,
            date: date,
            type: item.type,
            status: item.status as "upcoming" | "due" | "scheduled"
        };
    });

    // Filter events for the selected date in Speedometer view
    const selectedDateEvents = scheduleData.filter(item => {
        // Mock logic: check against the mock dates we generated
        // In reality, match item.dueDateStr or real Date objects
        const itemDate = new Date();
        itemDate.setDate(itemDate.getDate() + item.daysUntil);
        return itemDate.toDateString() === selectedDate.toDateString();
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const getStatusBadge = (status: string, daysUntil: number) => {
        if (status === "due" || daysUntil <= 0) {
            return <span className="badge badge-danger">วันนี้!</span>;
        } else if (daysUntil <= 7) {
            return <span className="badge badge-warning">ใกล้ถึงกำหนด</span>;
        } else {
            return <span className="badge badge-success">กำหนดไว้</span>;
        }
    };

    const getDaysText = (daysUntil: number) => {
        if (daysUntil <= 0) return "วันนี้";
        if (daysUntil === 1) return "พรุ่งนี้";
        return `อีก ${daysUntil} วัน`;
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 pb-40">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
                            <CalendarIcon size={20} className="text-accent-purple" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navSchedule")}</h1>
                            <p className="text-sm text-text-muted">{t("appSubtitle")}</p>
                        </div>
                    </div>

                    {/* View Switcher */}
                    <div className="flex bg-bg-tertiary p-1 rounded-lg border border-white/10 self-start sm:self-auto overflow-x-auto max-w-full">
                        <button
                            onClick={() => setViewMode("speedometer")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === "speedometer"
                                ? "bg-bg-primary text-text-primary shadow-sm"
                                : "text-text-muted hover:text-text-primary"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <ActivityIcon size={14} />
                                <span>3D View</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === "calendar"
                                ? "bg-bg-primary text-text-primary shadow-sm"
                                : "text-text-muted hover:text-text-primary"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <CalendarIcon size={14} />
                                {t("scheduleCalendarView")}
                            </div>
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === "list"
                                ? "bg-bg-primary text-text-primary shadow-sm"
                                : "text-text-muted hover:text-text-primary"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <FolderIcon size={14} />
                                {t("scheduleListView")}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Alert for due items */}
                {scheduleData.some(s => s.daysUntil <= 0) && (
                    <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl flex items-center gap-3 animate-pulse-glow">
                        <AlertTriangleIcon size={24} className="text-accent-red shrink-0" />
                        <div>
                            <p className="font-semibold text-accent-red">มีการบำรุงรักษาที่ถึงกำหนดแล้ว!</p>
                            <p className="text-sm text-text-muted">กรุณาดำเนินการตามกำหนด</p>
                        </div>
                    </div>
                )}

                {/* Schedule Timeline */}
                {/* Content based on View Mode */}
                {viewMode === "speedometer" ? (
                    <div className="space-y-6">
                        <SpeedometerCalendar
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                            events={calendarEvents}
                        />

                        {/* Event Details for Selected Day - HIDDEN in Speedometer View as it's integrated */}
                        {/* <div className="bg-bg-secondary/50 rounded-xl border border-white/5 p-4 min-h-[200px]">
                            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                                <CalendarIcon size={18} className="text-primary" />
                                {selectedDate.toLocaleDateString('th-TH', { dateStyle: 'full' })}
                            </h3>

                            {selectedDateEvents.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedDateEvents.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`card animate-fade-in-up ${item.daysUntil <= 0 ? "border-accent-red/50" : ""}`}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.daysUntil <= 0 ? "bg-accent-red/20" : "bg-accent-green/20"}`}>
                                                        <SettingsIcon size={24} className={item.daysUntil <= 0 ? "text-accent-red" : "text-accent-green"} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-text-primary">{item.machine}</h3>
                                                        <p className="text-sm text-text-muted">{item.type}</p>
                                                    </div>
                                                </div>
                                                {getStatusBadge(item.status, item.daysUntil)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[120px] text-text-muted opacity-50">
                                    <ClockIcon size={32} className="mb-2" />
                                    <p>ไม่มีรายการบำรุงรักษา</p>
                                </div>
                            )}
                        </div> */}
                    </div>
                ) : viewMode === "calendar" ? (
                    <CalendarGrid events={calendarEvents} />
                ) : (
                    <div className="space-y-4">
                        {scheduleData
                            .sort((a, b) => a.daysUntil - b.daysUntil)
                            .map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`card hover-lift animate-fade-in-up ${item.daysUntil <= 0 ? "border-accent-red/50" : ""
                                        }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.daysUntil <= 0 ? "bg-accent-red/20" :
                                                item.daysUntil <= 7 ? "bg-accent-yellow/20" :
                                                    "bg-accent-green/20"
                                                }`}>
                                                <SettingsIcon size={24} className={
                                                    item.daysUntil <= 0 ? "text-accent-red" :
                                                        item.daysUntil <= 7 ? "text-accent-yellow" :
                                                            "text-accent-green"
                                                } />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-text-primary">{item.machine}</h3>
                                                <p className="text-sm text-text-muted">{item.type}</p>
                                            </div>
                                        </div>
                                        {getStatusBadge(item.status, item.daysUntil)}
                                    </div>

                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-light text-sm">
                                        <div className="flex items-center gap-2 text-text-muted">
                                            <CalendarIcon size={14} />
                                            <span>{item.dueDateStr}</span>
                                        </div>
                                        {mounted && (
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <ClockIcon size={14} />
                                                <span className={
                                                    item.daysUntil <= 0 ? "text-accent-red font-semibold" :
                                                        item.daysUntil <= 7 ? "text-accent-yellow" :
                                                            "text-text-muted"
                                                }>
                                                    {getDaysText(item.daysUntil)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* Coming Soon Notice */}

            </main>

            <MobileNav />
        </div>
    );
}
