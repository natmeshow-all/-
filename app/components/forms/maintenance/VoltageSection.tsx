import React from "react";
import { TranslationKeys } from "../../../translations";
import { ZapIcon } from "../../ui/Icons";

interface VoltageSectionProps {
    voltageL1: string;
    voltageL2: string;
    voltageL3: string;
    currentIdle: string;
    currentLoad: string;
    onVoltageChange: (phase: 'L1' | 'L2' | 'L3', value: string) => void;
    onCurrentChange: (type: 'idle' | 'load', value: string) => void;
    t: (key: keyof TranslationKeys) => string;
}

const VoltageSection: React.FC<VoltageSectionProps> = ({
    voltageL1,
    voltageL2,
    voltageL3,
    currentIdle,
    currentLoad,
    onVoltageChange,
    onCurrentChange,
    t
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voltage */}
            <div className="mb-4">
                <span className="label flex items-center gap-1 font-semibold text-text-secondary">
                    <ZapIcon size={14} />
                    {t("maintenanceVoltage")}
                </span>
                <div className="grid grid-cols-3 gap-3">
                    {["L1", "L2", "L3"].map((phase) => (
                        <div key={phase}>
                            <label htmlFor={`voltage-input-${phase}`} className="text-xs text-text-muted mb-1 block cursor-pointer">
                                {phase} (V)
                            </label>
                            <input
                                id={`voltage-input-${phase}`}
                                type="text"
                                value={phase === 'L1' ? voltageL1 : phase === 'L2' ? voltageL2 : voltageL3}
                                onChange={(e) => onVoltageChange(phase as 'L1' | 'L2' | 'L3', e.target.value)}
                                placeholder="e.g. 380"
                                className="input text-sm px-2"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Current */}
            <div className="mb-4">
                <span className="label flex items-center gap-1 font-semibold text-text-secondary">
                    <ZapIcon size={14} />
                    {t("maintenanceCurrent")}
                </span>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="current-idle-input" className="text-xs text-text-muted mb-1 block cursor-pointer">
                            {t("maintenanceCurrentIdle")}
                        </label>
                        <input
                            id="current-idle-input"
                            type="text"
                            value={currentIdle}
                            onChange={(e) => onCurrentChange('idle', e.target.value)}
                            placeholder={t("placeholderCurrentIdle")}
                            className="input"
                        />
                    </div>
                    <div>
                        <label htmlFor="current-load-input" className="text-xs text-text-muted mb-1 block cursor-pointer">
                            {t("maintenanceCurrentLoad")}
                        </label>
                        <input
                            id="current-load-input"
                            type="text"
                            value={currentLoad}
                            onChange={(e) => onCurrentChange('load', e.target.value)}
                            placeholder={t("placeholderCurrentLoad")}
                            className="input"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoltageSection;
