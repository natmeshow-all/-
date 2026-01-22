import React from "react";
import {
    RulerIcon,
    TargetIcon
} from "../../ui/Icons";
import { TranslationKeys } from "../../../translations";

interface ShaftDataSectionProps {
    shaftBend: string;
    dialGauge: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    t: (key: keyof TranslationKeys) => string;
}

const ShaftDataSection: React.FC<ShaftDataSectionProps> = ({
    shaftBend,
    dialGauge,
    onInputChange,
    t
}) => {
    return (
        <div className="form-section animate-fade-in">
            <h3 className="form-section-title">
                <RulerIcon size={16} />
                {t("maintenanceShaftInfo")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">
                        <TargetIcon size={14} />
                        {t("maintenanceShaftBend")}
                    </label>
                    <input
                        type="text"
                        name="shaftBend"
                        value={shaftBend}
                        onChange={onInputChange}
                        placeholder={t("placeholderShaftBend")}
                        className="input"
                    />
                </div>
                <div>
                    <label className="label">
                        <RulerIcon size={14} />
                        {t("maintenanceDialGauge")}
                    </label>
                    <input
                        type="text"
                        name="dialGauge"
                        value={dialGauge}
                        onChange={onInputChange}
                        placeholder={t("placeholderDialGauge")}
                        className="input"
                    />
                </div>
            </div>
        </div>
    );
};

export default ShaftDataSection;
