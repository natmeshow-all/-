"use client";

import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  SearchIcon,
  SettingsIcon,
  MapPinIcon,
  BoxIcon,
  ChevronDownIcon,
  RefreshIcon,
} from "../ui/Icons";
import { PartFilters } from "../../types";

interface PartsFilterProps {
  filters: PartFilters;
  onFilterChange: (key: keyof PartFilters, value: string) => void;
  onClearFilters: () => void;
  locationCounts: { ALL: number; FZ: number; RTE: number; UT: number };
  availableMachines: string[];
  availableLocations: string[];
  availablePartNames: string[];
  filteredCount: number;
  totalCount: number;
  partsLoading: boolean;
}

export default function PartsFilter({
  filters,
  onFilterChange,
  onClearFilters,
  locationCounts,
  availableMachines,
  availableLocations,
  availablePartNames,
  filteredCount,
  totalCount,
  partsLoading,
}: PartsFilterProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const areaButtons = [
    { id: "", label: t("labelAll"), color: "accent-purple" },
    { id: "FZ", label: "FZ", color: "accent-cyan" },
    { id: "RTE", label: "RTE", color: "green-500" },
    { id: "UT", label: "UT", color: "accent-yellow" },
  ];

  return (
    <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
      <div className="filter-section">
        {/* Toggle Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="filter-title mb-0 text-xs">
            <SearchIcon size={12} />
            {t("filterTitle")}
          </h3>
          <button
            className={`transition-all duration-300 p-1 rounded-full ${!isExpanded ? "bg-primary/20 text-primary" : "text-text-muted hover:text-primary hover:bg-white/5"}`}
          >
            <ChevronDownIcon size={12} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {isExpanded && (
          <div className="mt-2 animate-slide-down">
            {/* Area Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {areaButtons.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => onFilterChange("location", loc.id)}
                  className={`
                    relative px-3 py-1.5 rounded-lg transition-all duration-200
                    border flex items-center gap-1.5 active:scale-95
                    ${filters.location === loc.id
                      ? `bg-${loc.color}/20 border-${loc.color}/40 text-white`
                      : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"}
                  `}
                >
                  <span className="text-[10px] font-bold tracking-tight">{loc.label}</span>
                  <span className={`
                    px-1 py-0.5 rounded text-[8px] font-black
                    ${filters.location === loc.id
                      ? `bg-${loc.color} text-bg-primary`
                      : "bg-white/10 text-text-muted"}
                  `}>
                    {loc.id === "" ? locationCounts.ALL : (locationCounts as any)[loc.id]}
                  </span>
                </button>
              ))}
            </div>

            {/* Dropdowns Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {/* Machine Filter */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                  <SettingsIcon size={10} />
                  {t("filterMachine")}
                  <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{availableMachines.length}</span>
                </label>
                <select
                  value={filters.machineId}
                  onChange={(e) => onFilterChange("machineId", e.target.value)}
                  className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                >
                  <option value="">{t("filterAll")}</option>
                  {availableMachines.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                  <MapPinIcon size={10} />
                  {t("filterLocation")}
                  <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{availableLocations.length}</span>
                </label>
                <select
                  value={filters.Location}
                  onChange={(e) => onFilterChange("Location", e.target.value)}
                  className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                >
                  <option value="">{t("filterAll")}</option>
                  {availableLocations.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              {/* Part Name Filter */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                  <BoxIcon size={10} />
                  {t("filterPartName")}
                  <span className="badge badge-primary ml-auto text-[9px] py-0 px-1">{availablePartNames.length}</span>
                </label>
                <select
                  value={filters.partName}
                  onChange={(e) => onFilterChange("partName", e.target.value)}
                  className="input select text-[10px] py-0 px-2 h-[37px] leading-none"
                >
                  <option value="">{t("filterAll")}</option>
                  {availablePartNames.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
              <p className="text-[11px] text-text-muted">
                {t("filterShowResults")}{" "}
                <span className="text-primary-light font-semibold">{filteredCount}</span>
                {" "}{t("filterOf")}{" "}
                <span className="text-text-primary font-semibold">{partsLoading ? "..." : totalCount}</span>
                {" "}{t("filterRecords")}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFilters();
                }}
                className="btn btn-outline text-[10px] py-1 px-2 h-6"
              >
                <RefreshIcon size={10} />
                {t("actionClearFilters")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
