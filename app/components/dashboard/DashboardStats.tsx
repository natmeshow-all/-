"use client";

import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  BoxIcon,
  HistoryIcon,
  AlertTriangleIcon,
} from "../ui/Icons";
import { DashboardStats } from "../../types";

interface DashboardStatsProps {
  stats: DashboardStats;
  statsLoading: boolean;
}

export default function DashboardStatsSection({ stats, statsLoading }: DashboardStatsProps) {
  const { language } = useLanguage();

  return (
    <section className="mb-6 mt-2 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">

        {/* Inventory Overview (Present) */}
        <div className="glass-card overflow-hidden relative group p-0 border-white/10 hover:border-primary/50 transition-all duration-300 shadow-lg shadow-black/20 animate-fade-in-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-bg-tertiary/40 to-transparent flex items-center justify-between relative z-10">
            <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
              <span className="p-1.5 rounded-lg bg-primary/20 text-primary-light border border-primary/20">
                <BoxIcon size={14} />
              </span>
              {language === "th" ? "ภาพรวมสินทรัพย์" : "Inventory Overview"}
            </h3>
            <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-white/5 text-text-muted rounded-full border border-white/10 shadow-sm">Present</span>
          </div>

          <div className="p-5 grid grid-cols-3 gap-2 relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "อะไหล่ทั้งหมด" : "Total Parts"}</span>
              <span className="text-2xl font-bold text-text-primary leading-none">{statsLoading ? "..." : stats.totalParts}</span>
            </div>
            <div className="flex flex-col border-l border-white/5 pl-3">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "เครื่องจักร" : "Machines"}</span>
              <span className="text-2xl font-bold text-text-primary leading-none">{statsLoading ? "..." : stats.totalMachines}</span>
            </div>
            <div className="flex flex-col border-l border-white/5 pl-3">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "สถานที่" : "Locations"}</span>
              <span className="text-2xl font-bold text-text-primary leading-none">{statsLoading ? "..." : stats.totalLocations}</span>
            </div>
          </div>
        </div>

        {/* Historical Maintenance (Past) */}
        <div className="glass-card overflow-hidden relative group p-0 border-white/10 hover:border-accent-green/50 transition-all duration-300 shadow-lg shadow-black/20 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-bg-tertiary/40 to-transparent flex items-center justify-between relative z-10">
            <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
              <span className="p-1.5 rounded-lg bg-accent-green/20 text-accent-green border border-accent-green/20">
                <HistoryIcon size={14} />
              </span>
              {language === "th" ? "ประวัติการซ่อมบำรุง" : "Maintenance History"}
            </h3>
            <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-white/5 text-text-muted rounded-full border border-white/10 shadow-sm">Past</span>
          </div>

          <div className="p-5 grid grid-cols-2 gap-2 relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "PM ทั้งหมด" : "Total PM"}</span>
              <span className="text-2xl font-bold text-text-primary leading-none">{statsLoading ? "..." : stats.totalPM}</span>
            </div>
            <div className="flex flex-col border-l border-white/5 pl-3">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "Overhaul ทั้งหมด" : "Total Overhaul"}</span>
              <span className="text-2xl font-bold text-text-primary leading-none">{statsLoading ? "..." : stats.totalOverhaul}</span>
            </div>
          </div>
        </div>

        {/* Upcoming & Pending (Future) */}
        <div className={`glass-card overflow-hidden relative group p-0 border-white/10 transition-all duration-300 shadow-lg shadow-black/20 animate-fade-in-up ${!statsLoading && stats.pendingMaintenance > 0 ? "border-accent-yellow/40 hover:border-accent-yellow/70" : "hover:border-accent-yellow/50"}`} style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-bg-tertiary/40 to-transparent flex items-center justify-between relative z-10">
            <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
              <span className={`p-1.5 rounded-lg border ${!statsLoading && stats.pendingMaintenance > 0 ? "bg-accent-red/20 text-accent-red border-accent-red/30 animate-pulse" : "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/20"}`}>
                <AlertTriangleIcon size={14} />
              </span>
              {language === "th" ? "แผนงานอนาคต" : "Pending & Upcoming"}
            </h3>
            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-sm ${!statsLoading && stats.pendingMaintenance > 0 ? "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30" : "bg-white/5 text-text-muted border-white/10"}`}>Future</span>
          </div>

          <div className="p-5 grid grid-cols-2 gap-2 relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "งานรอดำเนินการ" : "Pending Tasks"}</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold leading-none ${!statsLoading && stats.pendingMaintenance > 0 ? "text-accent-red" : "text-text-primary"}`}>
                  {statsLoading ? "..." : stats.pendingMaintenance}
                </span>
                {!statsLoading && stats.pendingMaintenance > 0 && (
                  <span className="text-[9px] bg-accent-red/20 text-accent-red px-1.5 py-0.5 rounded font-bold animate-pulse border border-accent-red/20 shadow-sm">{language === "th" ? "ด่วน" : "Urgent"}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col border-l border-white/5 pl-3">
              <span className="text-[10px] text-text-muted mb-1 truncate font-medium">{language === "th" ? "กำหนดการเร็วๆนี้" : "Upcoming Schedule"}</span>
              <span className="text-2xl font-bold text-text-primary leading-none">{statsLoading ? "..." : stats.upcomingSchedule}</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
