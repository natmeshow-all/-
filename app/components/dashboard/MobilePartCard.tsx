"use client";

import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  EditIcon,
  SettingsIcon,
  BoxIcon,
  AlertTriangleIcon,
} from "../ui/Icons";
import { Part } from "../../types";

/** Returns a solid color for category badges. No gradients. */
function getCategoryColor(category: string): string {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("mech")) return "text-blue-400";
  if (cat.includes("elect") || cat.includes("wire")) return "text-accent-yellow";
  if (cat.includes("hyd")) return "text-accent-red";
  if (cat.includes("pneu")) return "text-accent-cyan";
  if (cat.includes("con") || cat.includes("oil") || cat.includes("grease") || cat.includes("spare")) return "text-green-400";
  return "text-primary-light";
}

interface MobilePartCardProps {
  parts: Part[];
  partsLoading: boolean;
  onEditPart: (part: Part) => void;
  onMaintenancePart: (part: Part) => void;
  onDeletePart: (part: Part) => void;
}

export default function MobilePartCards({
  parts,
  partsLoading,
  onEditPart,
  onMaintenancePart,
  onDeletePart,
}: MobilePartCardProps) {
  const { t, tData, language } = useLanguage();

  if (partsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="empty-state py-12 flex flex-col items-center text-center px-4">
        <BoxIcon size={48} className="text-text-muted mb-3" />
        <h3 className="text-white font-bold mb-1">
          {language === "th" ? "ไม่พบอะไหล่" : "No parts found"}
        </h3>
        <p className="text-text-muted text-xs mb-4">
          {language === "th" 
            ? "ลองเปลี่ยนเงื่อนไขการค้นหา หรือกดเพิ่มอะไหล่ใหม่เข้าระบบ" 
            : "Try changing your search filters or add a new part to the system."}
        </p>
      </div>
    );
  }

  return (
    <>
      {parts.map((part, index) => {
        const categoryColor = getCategoryColor(part.category || "");
        const percentage = Math.min(100, Math.max(0, (part.quantity / (part.minStockThreshold || 5)) * 100));
        const isLowStock = part.quantity <= part.minStockThreshold;
        const barColor = isLowStock ? "bg-accent-red" : "bg-accent-green";

        return (
          <div
            key={part.id}
            className="relative w-full rounded-2xl bg-bg-secondary p-5 border border-white/10 shadow-lg animate-fade-in flex flex-col justify-between overflow-hidden gap-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Upper row: Category & Badges */}
            <div className="flex items-start justify-between">
              <span className={`px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-widest uppercase ${categoryColor}`}>
                {part.category || "PART"}
              </span>

              <div className="flex items-center gap-2">
                {/* Quantity badge */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                  <span className="text-[10px] font-bold text-white">x{part.quantity}</span>
                </div>
                {/* Location area */}
                {part.location && (
                  <span className="px-1.5 py-0.5 rounded bg-accent-cyan/20 border border-accent-cyan/30 text-[9px] font-bold text-accent-cyan">
                    {part.location}
                  </span>
                )}
                {/* Delete action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePart(part);
                  }}
                  className="w-6 h-6 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20 flex items-center justify-center hover:bg-accent-red hover:text-white transition-all active:scale-90"
                  title={t("actionDelete")}
                >
                  <BoxIcon size={12} className="rotate-45" />
                </button>
              </div>
            </div>

            {/* Middle Row: Main Spec Info */}
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-white tracking-tight">{tData(part.partName)}</h3>
              <div className="flex items-center gap-1.5 text-xs text-primary-light">
                <SettingsIcon size={12} />
                <span className="font-semibold">{part.machineName}</span>
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableBrand")}</span>
                <span className="text-white font-medium truncate">{part.brand || "-"}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableModelSpec")}</span>
                <span className="text-white font-medium truncate" title={part.modelSpec}>{part.modelSpec || "-"}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded p-1.5 flex flex-col">
                <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableLocationArea")}</span>
                <span className="text-white font-medium truncate">{tData(part.Location || "-")}</span>
              </div>
            </div>

            {/* Stock level bar */}
            <div className="w-full bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-text-muted uppercase tracking-wider font-bold">STOCK LEVEL</span>
                <span className={isLowStock ? "text-accent-red font-black flex items-center gap-1" : "text-accent-green font-black"}>
                  {isLowStock ? "⚠️ LOW" : "✅ OK"}
                </span>
              </div>
              <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
                <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
              </div>
            </div>

            {/* Notes block */}
            {part.notes && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex gap-1.5 items-start text-[10px]">
                <AlertTriangleIcon size={10} className="text-accent-yellow shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[8px] text-white/40 uppercase font-bold">{t("tableNotes")}</span>
                  <span className="text-white/80 italic line-clamp-1">"{tData(part.notes)}"</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1.5 border-t border-white/5">
              <button
                onClick={() => onEditPart(part)}
                className="flex-1 btn bg-white/5 border border-white/10 hover:bg-primary transition-all text-[11px] h-8 text-white rounded-lg px-2"
              >
                <EditIcon size={12} className="mr-1" />
                {t("actionEdit")}
              </button>
              <button
                onClick={() => onMaintenancePart(part)}
                className="flex-1 btn bg-white/5 border border-white/10 hover:bg-accent-yellow hover:text-black transition-all text-[11px] h-8 text-white rounded-lg px-2"
              >
                <SettingsIcon size={12} className="mr-1" />
                {t("actionMaintenance")}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
