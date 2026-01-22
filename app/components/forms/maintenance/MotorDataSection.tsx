import React from "react";
import { TranslationKeys } from "../../../translations";
import { SettingsIcon, ThermometerIcon } from "../../ui/Icons";

interface MotorDataSectionProps {
    motorSize: string;
    temperature: string;
    onMotorSizeChange: (value: string) => void;
    onTemperatureChange: (value: string) => void;
    t: (key: keyof TranslationKeys) => string;
}

const MotorDataSection: React.FC<MotorDataSectionProps> = ({
    motorSize,
    temperature,
    onMotorSizeChange,
    onTemperatureChange,
    t
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Motor Size */}
            <div className="mb-4">
                <label className="label">
                    <SettingsIcon size={14} />
                    {t("maintenanceMotorSize")}
                    <span className="text-text-muted font-normal ml-1">
                        {t("maintenanceMotorSizeHint")}
                    </span>
                </label>
                <input
                    type="text"
                    value={motorSize}
                    onChange={(e) => onMotorSizeChange(e.target.value)}
                    placeholder={t("placeholderMotorSize")}
                    className="input"
                />
            </div>

            {/* Temperature */}
            <div className="mb-4 text-left">
                <label className="label">
                    <ThermometerIcon size={14} />
                    {t("maintenanceTemperature")}
                    <span className="text-text-muted font-normal ml-1">
                        {t("maintenanceTemperatureHint")}
                    </span>
                </label>
                <input
                    type="text"
                    value={temperature}
                    onChange={(e) => onTemperatureChange(e.target.value)}
                    placeholder={t("placeholderTemperature")}
                    className="input"
                />
            </div>
        </div>
    );
};

export default MotorDataSection;
