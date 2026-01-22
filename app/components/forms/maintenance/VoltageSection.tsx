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
                <label className="label">
                    <ZapIcon size={14} />
                    {t("maintenanceVoltage")}
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {["L1", "L2", "L3"].map((phase) => (
                        <div key={phase}>
                            <span className="text-xs text-text-muted mb-1 block">{phase} (V)</span>
                            <input
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
                <label className="label">
                    <ZapIcon size={14} />
                    {t("maintenanceCurrent")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <span className="text-xs text-text-muted mb-1 block">
                            {t("maintenanceCurrentIdle")}
                        </span>
                        <input
                            type="text"
                            value={currentIdle}
                            onChange={(e) => onCurrentChange('idle', e.target.value)}
                            placeholder={t("placeholderCurrentIdle")}
                            className="input"
                        />
                    </div>
                    <div>
                        <span className="text-xs text-text-muted mb-1 block">
                            {t("maintenanceCurrentLoad")}
                        </span>
                        <input
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
