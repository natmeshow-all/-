import React from "react";
import {
    ClockIcon,
    RefreshCwIcon
} from "../../ui/Icons";
import { TranslationKeys } from "../../../translations";

interface PeriodSelectorSectionProps {
    period: string;
    onInputChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    t: (key: keyof TranslationKeys) => string;
}

const PeriodSelectorSection: React.FC<PeriodSelectorSectionProps> = ({
    period,
    onInputChange,
    t
}) => {
    return (
        <div className="form-section animate-fade-in mt-4">
            <h3 className="form-section-title">
                <ClockIcon size={16} />
                {t("labelPeriod")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">
                        <RefreshCwIcon size={14} />
                        {t("labelPeriod")}
                    </label>
                    <select
                        name="period"
                        value={period || "routine"}
                        onChange={onInputChange}
                        className="input select"
                    >
                        <option value="routine">{t("periodRoutine")}</option>
                        <option value="1month">{t("period1Month")}</option>
                        <option value="3months">{t("period3Months")}</option>
                        <option value="6months">{t("period6Months")}</option>
                        <option value="1year">{t("period1Year")}</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default PeriodSelectorSection;
