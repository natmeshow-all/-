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

export default React.memo(function MobilePartCards({
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
        const isLowStock = part.quantity <= (part.minStockThreshold || 5);

        return (
          <div
            key={part.id}
            className="relative w-full rounded-xl bg-bg-secondary p-3 border border-white/5 shadow-sm flex flex-col gap-2 overflow-hidden animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Left Edge Indicator */}
            <div className={`absolute top-0 left-0 w-1 h-full ${isLowStock ? 'bg-accent-red' : 'bg-accent-green'}`} />
            
            <div className="flex items-start justify-between pl-2">
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                {/* Category & Title */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase whitespace-nowrap shrink-0 ${categoryColor}`}>
                    {part.category || "PART"}
                  </span>
                  <h3 className="text-sm font-bold text-white truncate">{tData(part.partName)}</h3>
                </div>
                
                {/* Machine Name */}
                <div className="text-[10px] text-text-muted mb-1 truncate flex items-center gap-1">
                   <SettingsIcon size={10} className="shrink-0" />
                   {part.machineName}
                </div>
                
                {/* Specs Row */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/70 mt-0.5">
                   <span className={`font-bold px-1.5 py-0.5 rounded ${isLowStock ? 'bg-accent-red/20 text-accent-red' : 'bg-white/10 text-white'}`}>
                     x{part.quantity}
                   </span>
                   {(part.brand || part.modelSpec) && (
                     <span className="truncate max-w-[120px]">{part.brand} {part.modelSpec}</span>
                   )}
                   {part.location && (
                     <span className="truncate text-accent-cyan bg-accent-cyan/10 px-1 rounded">{tData(part.Location || part.location)}</span>
                   )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 mt-1">
                  <button 
                    onClick={() => onMaintenancePart(part)} 
                    className="w-8 h-8 rounded-lg bg-accent-yellow/10 text-accent-yellow flex items-center justify-center hover:bg-accent-yellow hover:text-black transition-colors"
                    title={t("actionMaintenance")}
                  >
                    <SettingsIcon size={14} />
                  </button>
                  <button 
                    onClick={() => onEditPart(part)} 
                    className="w-8 h-8 rounded-lg bg-white/5 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    title={t("actionEdit")}
                  >
                    <EditIcon size={14} />
                  </button>
                  <button 
                    onClick={() => onDeletePart(part)} 
                    className="w-8 h-8 rounded-lg bg-accent-red/10 text-accent-red flex items-center justify-center hover:bg-accent-red hover:text-white transition-colors"
                    title={t("actionDelete")}
                  >
                    <BoxIcon size={14} className="rotate-45" />
                  </button>
              </div>
            </div>
            
            {/* Notes Section (Only if exists) */}
            {part.notes && (
              <div className="pl-2 mt-0.5">
                <div className="text-[9px] text-accent-yellow italic truncate bg-accent-yellow/5 px-2 py-1 rounded border border-accent-yellow/10 flex items-center gap-1">
                  <AlertTriangleIcon size={10} className="shrink-0" />
                  {tData(part.notes)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});
