import React from "react";
import {
    ImageIcon,
    TrashIcon
} from "../../ui/Icons";
import { TranslationKeys } from "../../../translations";

interface EvidenceImageSectionProps {
    imagePreview: string | null;
    uploadingImage: boolean;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
    t: (key: keyof TranslationKeys) => string;
}

const EvidenceImageSection: React.FC<EvidenceImageSectionProps> = ({
    imagePreview,
    uploadingImage,
    onImageChange,
    onRemoveImage,
    t
}) => {
    return (
        <div className="form-section">
            <h3 className="form-section-title">
                <ImageIcon size={16} />
                {t("labelEvidenceImage")}
            </h3>
            <div className="space-y-3">
                {/* Image Preview */}
                {imagePreview && (
                    <div className="relative w-full max-w-xs mx-auto">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-auto rounded-lg border border-border-light shadow-sm"
                        />
                        <button
                            type="button"
                            onClick={onRemoveImage}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-accent-red/80 text-white hover:bg-accent-red transition-colors shadow-md"
                            title={t("actionRemoveImage")}
                        >
                            <TrashIcon size={14} />
                        </button>
                    </div>
                )}

                {/* File Input */}
                {!imagePreview && (
                    <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border-light hover:border-primary/50 bg-bg-tertiary/30 hover:bg-bg-tertiary/50 cursor-pointer transition-all group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon size={32} className="text-text-muted group-hover:text-primary transition-colors mb-2" />
                            <p className="text-sm text-text-muted group-hover:text-text-primary">{t("placeholderChooseImage")}</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onImageChange}
                        />
                    </label>
                )}

                {uploadingImage && (
                    <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></span>
                        <span>กำลังอัปโหลดรูปภาพ...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvidenceImageSection;
