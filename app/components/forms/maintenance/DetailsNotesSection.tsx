import React from "react";
import {
    FileTextIcon,
    EditIcon
} from "../../ui/Icons";
import { TranslationKeys } from "../../../translations";

interface DetailsNotesSectionProps {
    details: string;
    notes: string;
    onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    t: (key: keyof TranslationKeys) => string;
}

const DetailsNotesSection: React.FC<DetailsNotesSectionProps> = ({
    details,
    notes,
    onInputChange,
    t
}) => {
    return (
        <div className="form-section">
            <h3 className="form-section-title">
                <FileTextIcon size={16} />
                {t("maintenanceDetailsNotes")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">
                        <FileTextIcon size={14} />
                        {t("maintenanceDetailDescription")}
                    </label>
                    <textarea
                        name="details"
                        value={details}
                        onChange={onInputChange}
                        placeholder={t("placeholderMaintenanceDetails")}
                        rows={4}
                        className="input resize-none"
                    />
                </div>
                <div>
                    <label className="label">
                        <EditIcon size={14} />
                        {t("maintenanceAdditionalNotes")}
                    </label>
                    <textarea
                        name="notes"
                        value={notes}
                        onChange={onInputChange}
                        placeholder={t("placeholderAdditionalNotes")}
                        rows={4}
                        className="input resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default DetailsNotesSection;
