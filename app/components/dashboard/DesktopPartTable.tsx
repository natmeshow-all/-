"use client";

import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  EditIcon,
  SettingsIcon,
  BoxIcon,
} from "../ui/Icons";
import { Part } from "../../types";

/** Returns a solid color scheme for each part category. */
function getCategoryStyle(category: string): { bg: string; text: string; border: string } {
  const cat = category?.toLowerCase() || "";
  if (cat.includes("mech")) return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" };
  if (cat.includes("elect") || cat.includes("wire")) return { bg: "bg-accent-yellow/10", text: "text-accent-yellow", border: "border-accent-yellow/30" };
  if (cat.includes("hyd")) return { bg: "bg-accent-red/10", text: "text-accent-red", border: "border-accent-red/30" };
  if (cat.includes("pneu")) return { bg: "bg-accent-cyan/10", text: "text-accent-cyan", border: "border-accent-cyan/30" };
  if (cat.includes("con") || cat.includes("oil") || cat.includes("grease") || cat.includes("spare")) return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" };
  return { bg: "bg-primary/10", text: "text-primary-light", border: "border-white/10" };
}

interface DesktopPartTableProps {
  parts: Part[];
  partsLoading: boolean;
  isFullscreen: boolean;
  hasMore: boolean;
  showLoadMore: boolean;
  onLoadMore: () => void;
  onEditPart: (part: Part) => void;
  onMaintenancePart: (part: Part) => void;
  onDeletePart: (part: Part) => void;
  onOpenMachine: (part: Part) => void;
}

export default React.memo(function DesktopPartTable({
  parts,
  partsLoading,
  isFullscreen,
  hasMore,
  showLoadMore,
  onLoadMore,
  onEditPart,
  onMaintenancePart,
  onDeletePart,
  onOpenMachine,
}: DesktopPartTableProps) {
  const { t, tData, language } = useLanguage();
  const { permissions } = useAuth();

  const stickyClass = isFullscreen ? "sticky top-0 z-20 bg-bg-tertiary shadow-sm" : "";

  return (
    <div className={`hidden md:block w-full ${isFullscreen ? "flex-1 flex flex-col overflow-hidden" : ""}`}>
      <div className={`table-container ${isFullscreen ? "flex-1 overflow-auto bg-bg-secondary custom-scrollbar" : ""}`} style={isFullscreen ? { WebkitOverflowScrolling: "touch" } : {}}>
        <table className="table w-full">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{language === "th" ? "หมวดหมู่" : "Category"}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableMachine")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tablePartName")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableModelSpec")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableBrand")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableLocationArea")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableQuantity")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableLocation")}</th>
              <th className={`px-4 py-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableNotes")}</th>
              <th className={`px-4 py-4 text-right text-xs font-semibold text-text-muted uppercase tracking-wider ${stickyClass}`}>{t("tableManagement")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {!partsLoading && parts.map((part, index) => {
              const style = getCategoryStyle(part.category || "");
              return (
                <tr
                  key={part.id}
                  className="animate-fade-in hover:bg-bg-tertiary/30 transition-colors"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${style.bg} ${style.text} ${style.border}`}>
                      {part.category || "PART"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-text-primary">
                    <button
                      type="button"
                      className="cursor-pointer hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline text-left"
                      onClick={() => onOpenMachine(part)}
                    >
                      {part.machineName || "-"}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-text-secondary font-medium">
                    {tData(part.partName)}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-text-muted text-xs max-w-[150px] truncate" title={part.modelSpec}>
                    {part.modelSpec || "-"}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-text-secondary text-sm">
                    {part.brand || "-"}
                  </td>
                  <td className="py-3 px-4 text-text-secondary text-sm">
                    {tData(part.Location || "-")}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-semibold text-text-primary">{part.quantity || 0}</span>
                  </td>
                  <td className="py-3 px-4 hidden xl:table-cell text-text-secondary text-sm">
                    {part.location || "-"}
                  </td>
                  <td className="py-3 px-4 hidden 2xl:table-cell text-text-muted text-xs max-w-[200px] truncate" title={part.notes}>
                    {tData(part.notes || "-")}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {permissions.canManageParts && (
                        <button
                          onClick={() => onEditPart(part)}
                          className="p-1.5 rounded-lg text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                          title={t("actionEdit")}
                        >
                          <EditIcon size={16} />
                        </button>
                      )}
                      {permissions.canExecuteTask && (
                        <button
                          onClick={() => onMaintenancePart(part)}
                          className="p-1.5 rounded-lg text-accent-yellow hover:bg-accent-yellow/10 transition-colors"
                          title={t("actionMaintenance")}
                        >
                          <SettingsIcon size={16} />
                        </button>
                      )}
                      {(permissions.canDeleteData || permissions.canRequestDelete) && (
                        <button
                          onClick={() => onDeletePart(part)}
                          className="p-1.5 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                          title={t("actionDelete")}
                        >
                          <BoxIcon size={16} className="rotate-45" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {!partsLoading && parts.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <BoxIcon size={48} className="text-text-muted mb-3" />
                    <h3 className="text-white font-bold mb-1">
                      {language === "th" ? "ไม่พบข้อมูลอะไหล่" : "No parts found"}
                    </h3>
                    <p className="text-text-muted text-sm">
                      {language === "th" 
                        ? "ลองเปลี่ยนเงื่อนไขการค้นหา หรือกดปุ่ม Add Part เพื่อเพิ่มข้อมูลใหม่" 
                        : "Try changing your search filters or click Add Part to register a new one."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {showLoadMore && hasMore && (
          <div className="flex justify-center p-4 border-t border-border-light">
            <button
              onClick={onLoadMore}
              disabled={partsLoading}
              className="btn btn-sm btn-ghost text-primary hover:bg-primary/10"
            >
              {partsLoading ? "..." : t("actionLoadMore") || "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
