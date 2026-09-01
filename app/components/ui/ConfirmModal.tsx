import React, { useState } from "react";
import Modal from "./Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { AlertTriangleIcon } from "./Icons";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    isDestructive = false,
}: ConfirmModalProps) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    
    const displayConfirmText = confirmText || t("actionConfirm");
    const displayCancelText = cancelText || t("actionCancel");

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={loading ? () => {} : onClose}
            title={title}
            titleIcon={<AlertTriangleIcon size={24} className={isDestructive ? "text-accent-red" : "text-accent-yellow"} />}
            size="sm"
            footer={
                <>
                    <button onClick={onClose} className="btn btn-outline" disabled={loading}>
                        {displayCancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`btn ${isDestructive ? "btn-danger" : "btn-primary"} ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>กำลังทำงาน...</span>
                            </div>
                        ) : displayConfirmText}
                    </button>
                </>
            }
        >
            <div className="text-center py-4">
                <p className="text-text-secondary text-lg">{message}</p>
            </div>
        </Modal>
    );
}
