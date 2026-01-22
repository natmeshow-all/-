import React from "react";
import {
    TrendingUpIcon,
    ClockIcon,
    CalendarIcon,
    AlertTriangleIcon,
    InfoIcon,
    RefreshCwIcon
} from "../../ui/Icons";
import { TranslationKeys } from "../../../translations";

interface AdvancedTrackingSectionProps {
    machineHours: string;
    previousReplacementDate: string | null;
    partLifespan: string | null;
    changeReason: string;
    partCondition: string;
    lifespanValue: string;
    lifespanUnit: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onReasonChange: (value: string) => void;
    onConditionChange: (value: string) => void;
    t: (key: keyof TranslationKeys) => string;
}

const AdvancedTrackingSection: React.FC<AdvancedTrackingSectionProps> = ({
    machineHours,
    previousReplacementDate,
    partLifespan,
    changeReason,
    partCondition,
    lifespanValue,
    lifespanUnit,
    onInputChange,
    onReasonChange,
    onConditionChange,
    t
}) => {
    return (
        <div className="form-section animate-fade-in border-l-2 border-l-primary/50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="form-section-title !mb-0 text-primary-light">
                    <TrendingUpIcon size={16} />
                    {t("maintenanceAdvancedTracking")}
                </h3>
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                    {t("labelAnalysisMode")}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Hours and Dates */}
                <div className="space-y-4">
                    {/* Machine Hours Reading */}
                    <div>
                        <label className="label">
                            <ClockIcon size={14} />
                            {t("maintenanceMachineHours")}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                name="machineHours"
                                value={machineHours}
                                onChange={onInputChange}
                                placeholder="0.00"
                                className="input pl-9"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                <TrendingUpIcon size={16} />
                            </div>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                                {t("labelHoursShort")}
                            </div>
                        </div>
                    </div>

                    {/* Previous Replacement Date & Lifespan */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">
                                <CalendarIcon size={14} />
                                {t("labelPreviousReplacementDate")}
                            </label>
                            <input
                                type="date"
                                name="previousReplacementDate"
                                value={previousReplacementDate || ""}
                                onChange={onInputChange}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <ClockIcon size={14} />
                                {t("labelUsagePeriod") || t("labelPartLifespan")}
                            </label>
                            <input
                                type="text"
                                name="partLifespan"
                                value={partLifespan || ""}
                                readOnly
                                placeholder={t("placeholderAutoCalc")}
                                className="input bg-bg-tertiary/50 text-text-muted cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Analysis (Reason & Condition) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-light/50">
                        <label className="label">
                            <AlertTriangleIcon size={14} className="text-accent-yellow" />
                            {t("maintenanceChangeReason")}
                        </label>
                        <div className="grid grid-cols-1 gap-1.5 mt-2">
                            {[
                                { val: "worn", label: "maintenanceReasonWorn" },
                                { val: "failed", label: "maintenanceReasonFailed" },
                                { val: "planned", label: "maintenanceReasonPlanned" },
                                { val: "improvement", label: "maintenanceReasonImprovement" }
                            ].map((reason) => (
                                <label key={reason.val} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-bg-tertiary transition-colors group">
                                    <input
                                        type="radio"
                                        name="changeReason"
                                        checked={changeReason === reason.val}
                                        onChange={() => onReasonChange(reason.val)}
                                        className="w-3 h-3 accent-primary"
                                    />
                                    <span className={`text-[11px] ${changeReason === reason.val ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                        {t(reason.label as keyof TranslationKeys)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-bg-primary/30 p-3 rounded-lg border border-border-light/50">
                        <label className="label">
                            <InfoIcon size={14} className="text-accent-cyan" />
                            {t("maintenanceOldPartStatus")}
                        </label>
                        <div className="grid grid-cols-1 gap-1.5 mt-2">
                            {[
                                { val: "good", label: "maintenanceConditionGood" },
                                { val: "fair", label: "maintenanceConditionFair" },
                                { val: "poor", label: "maintenanceConditionPoor" },
                                { val: "broken", label: "maintenanceConditionBroken" }
                            ].map((cond) => (
                                <label key={cond.val} className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-bg-tertiary transition-colors group">
                                    <input
                                        type="radio"
                                        name="partCondition"
                                        checked={partCondition === cond.val}
                                        onChange={() => onConditionChange(cond.val)}
                                        className="w-3 h-3 accent-primary"
                                    />
                                    <span className={`text-[11px] ${partCondition === cond.val ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                        {t(cond.label as keyof TranslationKeys)}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Predicted Lifespan setting */}
            <div className="mt-4 pt-4 border-t border-border-light/50">
                <label className="label">
                    <RefreshCwIcon size={14} />
                    {t("labelMaintenanceCycle")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="number"
                        name="lifespanValue"
                        value={lifespanValue}
                        onChange={onInputChange}
                        placeholder="0"
                        className="input"
                    />
                    <select
                        name="lifespanUnit"
                        value={lifespanUnit}
                        onChange={onInputChange}
                        className="input select"
                    >
                        <option value="months">{t("labelMonths")}</option>
                        <option value="years">{t("labelYears")}</option>
                    </select>
                </div>
                <p className="text-[10px] text-text-muted mt-2 pl-1">
                    * {t("msgMaintenanceDocHint")}
                </p>
            </div>
        </div>
    );
};

export default AdvancedTrackingSection;
