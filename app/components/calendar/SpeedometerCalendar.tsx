import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation, PanInfo, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../contexts/LanguageContext";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { th, enUS } from "date-fns/locale";

interface SpeedometerCalendarProps {
    onDateSelect: (date: Date) => void;
    selectedDate: Date;
    events: { date: Date; status: string; machine?: string; type?: string }[];
}

export default function SpeedometerCalendar({ onDateSelect, selectedDate, events }: SpeedometerCalendarProps) {
    const { t, language } = useLanguage();
    const [dates, setDates] = useState<Date[]>([]);
    const controls = useAnimation();
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize dates (range of +/- 30 days for demo, likely needs infinite query in prod)
    useEffect(() => {
        const tempDates = [];
        for (let i = -15; i <= 15; i++) {
            tempDates.push(addDays(selectedDate, i));
        }
        setDates(tempDates);
    }, []); // Only init on mount for now to keep it simple

    // Update dates when selectedDate changes significantly? 
    // For this simplified version, we just let users scroll the generated range.

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50; // Drag distance to trigger change
        if (info.offset.y > threshold) {
            // Dragged down -> Prev Day
            onDateSelect(subDays(selectedDate, 1));
        } else if (info.offset.y < -threshold) {
            // Dragged up -> Next Day
            onDateSelect(addDays(selectedDate, 1));
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.deltaY > 0) {
            onDateSelect(addDays(selectedDate, 1));
        } else {
            onDateSelect(subDays(selectedDate, 1));
        }
    };

    // Helper to get formatted date parts
    const getDateParts = (date: Date) => {
        const locale = language === 'th' ? th : enUS;
        return {
            day: format(date, "d", { locale }),
            month: format(date, "MMM", { locale }),
            year: format(date, "yyyy", { locale }),
            weekday: format(date, "EEEE", { locale }),
        };
    };

    const getEventStatus = (date: Date) => {
        return events.find(e => isSameDay(e.date, date))?.status;
    };

    return (
        <div className="relative w-full h-[85vh] overflow-hidden flex items-center justify-center bg-transparent select-none" onWheel={handleWheel}>
            {/* Dashboard Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-b from-bg-primary via-bg-secondary to-bg-primary opacity-80 z-0"></div>

            {/* Central Glow / Focus Area */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-[120px] bg-primary/5 border-y border-primary/30 z-0 shadow-[0_0_30px_rgba(59,130,246,0.2)]"></div>

            {/* Decorative Side Elements (Brackets) */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 h-[160px] w-2 bg-gradient-to-b from-transparent via-primary to-transparent opacity-50 rounded-full"></div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-[160px] w-2 bg-gradient-to-b from-transparent via-primary to-transparent opacity-50 rounded-full"></div>

            {/* Scrollable List */}
            <div
                ref={containerRef}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center"
            >
                <div className="relative h-[85vh] w-full flex flex-col items-center justify-center perspective-1000">
                    <AnimatePresence initial={false}>
                        {/* We render a window of dates around the selected date */}
                        {[-2, -1, 0, 1, 2].map((offset) => {
                            const date = addDays(selectedDate, offset);
                            const parts = getDateParts(date);
                            const status = getEventStatus(date);
                            const isSelected = offset === 0;

                            return (
                                <motion.div
                                    key={date.toISOString()}
                                    initial={{ opacity: 0, y: offset * 80, scale: 0.8, rotateX: -20 }}
                                    animate={{
                                        opacity: isSelected ? 1 : Math.max(0.1, 1 - Math.abs(offset) * 0.4),
                                        y: offset * (isSelected ? 110 : 85), // Increase spacing around selected item
                                        scale: isSelected ? 1 : 0.9,
                                        rotateX: offset * -10,
                                        filter: isSelected ? 'blur(0px)' : 'blur(2px)',
                                        zIndex: isSelected ? 50 : 10 - Math.abs(offset)
                                    }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className={`absolute flex items-center justify-center cursor-pointer ${isSelected ? 'w-full' : 'w-64'}`}
                                    onClick={() => onDateSelect(date)}
                                    drag="y"
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    onDragEnd={handleDragEnd}
                                >
                                    {/* Selected State: Large Detail Card */}
                                    {isSelected ? (
                                        <div className="w-[95vw] max-w-[1600px] h-[75vh] bg-bg-secondary/95 backdrop-blur-xl border border-primary/50 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(59,130,246,0.5)] flex flex-row gap-10 relative overflow-hidden transition-all duration-300 z-50">
                                            {/* Decorative glow */}
                                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-primary to-transparent" />

                                            {/* Left Column: Date & High Level Info */}
                                            <div className="w-1/3 flex flex-col justify-between border-r border-white/10 pr-10">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-baseline gap-3">
                                                        <span className="text-xl text-text-muted uppercase tracking-widest font-light">{parts.month}</span>
                                                        <span className="text-sm text-text-muted opacity-50">{parts.year}</span>
                                                    </div>
                                                    <span className="text-7xl font-black text-white leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{parts.day}</span>
                                                    <span className="text-3xl font-bold text-primary mt-1">{parts.weekday}</span>
                                                </div>

                                                {/* Status Badge Large */}
                                                {status && (
                                                    <div className={`self-start px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${status === 'due' ? 'bg-error/20 text-error animate-pulse border border-error/50' :
                                                            status === 'upcoming' ? 'bg-warning/20 text-warning border border-warning/50' :
                                                                'bg-success/20 text-success border border-success/50'
                                                        }`}>
                                                        {status === 'due' ? 'Overdue' : status === 'upcoming' ? 'Upcoming' : 'Normal'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column: Event Details List */}
                                            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                                <h3 className="text-lg font-bold text-text-muted uppercase tracking-widest border-b border-white/10 pb-2">Maintenance Schedule</h3>

                                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
                                                    {/* Filter events for this specific date */}
                                                    {events.filter(e => isSameDay(e.date, date)).length > 0 ? (
                                                        events.filter(e => isSameDay(e.date, date)).map((e, i) => (
                                                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-bg-primary/50 hover:bg-bg-primary transition-all border border-white/5 hover:border-primary/30 group cursor-pointer hover:shadow-lg">
                                                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${e.status === 'due' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
                                                                    } group-hover:scale-110 transition-transform`}>
                                                                    <div className={`w-4 h-4 rounded-full ${e.status === 'due' ? 'bg-error' : 'bg-success'}`} />
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                                                    <h4 className="text-xl font-bold text-text-primary truncate">{e.machine || "Machine"}</h4>
                                                                    <p className="text-sm text-text-muted truncate">{e.type || "Maintenance Task"}</p>
                                                                </div>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="m9 18 6-6-6-6" /></svg>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-30 space-y-3">
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                            <p className="text-xl font-light">No tasks scheduled</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Normal State: Simple Date Row */
                                        <div className="flex items-center justify-between w-64 opacity-50 scale-90">
                                            {/* Left Side: Weekday */}
                                            <div className="text-right w-20 text-xs font-medium uppercase tracking-wider text-text-muted">
                                                {parts.weekday}
                                            </div>

                                            {/* Center: Date Number */}
                                            <div className="flex flex-col items-center justify-center w-16 h-16 mx-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
                                                <span className="text-2xl font-bold font-mono text-text-secondary">
                                                    {parts.day}
                                                </span>
                                            </div>

                                            {/* Right Side: Status Indicator */}
                                            <div className="w-20 text-left">
                                                {status && (
                                                    <div className={`w-2 h-2 rounded-full ${status === 'due' ? 'bg-error' :
                                                        status === 'upcoming' ? 'bg-warning' :
                                                            'bg-success'
                                                        }`} />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50">
                <button
                    onClick={() => onDateSelect(addDays(selectedDate, 1))}
                    className="p-6 bg-bg-tertiary/80 hover:bg-primary/50 rounded-full text-text-muted hover:text-white transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 hover:border-white/50 hover:scale-110 active:scale-95"
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                </button>
                <button
                    onClick={() => onDateSelect(subDays(selectedDate, 1))}
                    className="p-6 bg-bg-tertiary/80 hover:bg-primary/50 rounded-full text-text-muted hover:text-white transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 hover:border-white/50 hover:scale-110 active:scale-95 rotate-180"
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                </button>
            </div>
        </div>
    );
}
