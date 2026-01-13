import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "../ui/Icons";

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: string;
    status: "upcoming" | "due" | "scheduled";
}

interface CalendarGridProps {
    events: CalendarEvent[];
}

export default function CalendarGrid({ events }: CalendarGridProps) {
    const { t, language } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());

    // Calendar logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust to start Monday (0 = Mon, 6 = Sun)
    };

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    // Generate calendar cells
    const days = [];
    // Previous month filler
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-24 sm:h-32 bg-bg-tertiary/20 opacity-50 border border-white/5" />);
    }
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const currentLoopDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayEvents = events.filter(e =>
            e.date.getDate() === day &&
            e.date.getMonth() === currentDate.getMonth() &&
            e.date.getFullYear() === currentDate.getFullYear()
        );

        const isToday = new Date().toDateString() === currentLoopDate.toDateString();

        days.push(
            <div
                key={day}
                className={`h-24 sm:h-32 border border-white/5 p-2 relative group hover:bg-bg-tertiary/50 transition-colors ${isToday ? "bg-primary/5" : "bg-bg-secondary"
                    }`}
            >
                <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-white" : "text-text-secondary"
                        }`}>
                        {day}
                    </span>
                    {dayEvents.length > 0 && (
                        <span className="text-[10px] text-text-muted hidden sm:block">
                            {dayEvents.length} items
                        </span>
                    )}
                </div>

                <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-24px)] custom-scrollbar">
                    {dayEvents.map(event => (
                        <div
                            key={event.id}
                            className={`text-[10px] truncate px-1.5 py-0.5 rounded border-l-2 ${event.status === 'due' ? 'bg-error/10 border-error text-error' :
                                event.status === 'upcoming' ? 'bg-warning/10 border-warning text-warning' :
                                    'bg-success/10 border-success text-success'
                                }`}
                            title={event.title}
                        >
                            {event.title}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const weekDays = [
        "calendarMon", "calendarTue", "calendarWed", "calendarThu", "calendarFri", "calendarSat", "calendarSun"
    ];

    return (
        <div className="bg-bg-secondary rounded-xl border border-border-light shadow-xl overflow-hidden animate-fade-in-up">
            {/* Calendar Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-bg-tertiary/30">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-text-primary capitalize">
                        {currentDate.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center bg-bg-primary rounded-lg p-0.5 border border-white/10">
                        <button onClick={prevMonth} className="p-1 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary">
                            <ChevronLeftIcon size={18} />
                        </button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-text-primary hover:bg-white/5 rounded-md">
                            {t("calendarToday")}
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary">
                            <ChevronRightIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-white/5 bg-bg-tertiary/10">
                {weekDays.map(dayKey => (
                    <div key={dayKey} className="py-2 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                        {t(dayKey as any)}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-bg-primary">
                {days}
            </div>
        </div>
    );
}


