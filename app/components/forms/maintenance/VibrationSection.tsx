import React from "react";
import { TranslationKeys } from "../../../translations";
import { VibrationLevel } from "../../../types";

interface VibrationSectionProps {
    axis: string;
    axisLabel: string;
    value: string;
    level: VibrationLevel;
    onValueChange: (value: string) => void;
    onLevelChange: (level: VibrationLevel) => void;
    t: (key: keyof TranslationKeys) => string;
}

const VibrationSection: React.FC<VibrationSectionProps> = ({ 
    axis, 
    axisLabel, 
    value, 
    level, 
    onValueChange, 
    onLevelChange, 
    t 
}) => (
    <div className="bg-bg-primary/50 rounded-lg p-3 border border-border-light">
        <h4 className="text-sm font-medium text-text-primary mb-2">{axisLabel}</h4>
        <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={t("placeholderVibration")}
            className="input text-sm mb-2"
        />
        <div className="space-y-1">
            {(["normal", "medium", "abnormal"] as VibrationLevel[]).map((lvl) => (
                <label key={lvl} className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name={`vibration-${axis}`}
                        checked={level === lvl}
                        onChange={() => onLevelChange(lvl)}
                        className="w-3 h-3 accent-primary"
                    />
                    <span className={`text-xs ${lvl === "normal" ? "text-accent-green" :
                        lvl === "medium" ? "text-accent-yellow" :
                            "text-accent-red"
                        }`}>
                        {lvl === "normal" ? `✓ ${t("maintenanceVibrationNormal")}` :
                            lvl === "medium" ? `⚠ ${t("maintenanceVibrationMedium")}` :
                                `✕ ${t("maintenanceVibrationAbnormal")}`}
                    </span>
                </label>
            ))}
        </div>
    </div>
);

export default VibrationSection;
