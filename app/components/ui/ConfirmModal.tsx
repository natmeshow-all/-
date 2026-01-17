import React from "react";
import Modal from "./Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { AlertTriangleIcon } from "./Icons";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
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
    const displayConfirmText = confirmText || t("actionConfirm");
    const displayCancelText = cancelText || t("actionCancel");

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            titleIcon={<AlertTriangleIcon size={24} className={isDestructive ? "text-accent-red" : "text-accent-yellow"} />}
            size="sm"
            footer={
                <>
                    <button onClick={onClose} className="btn btn-outline">
                        {displayCancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`btn ${isDestructive ? "btn-danger" : "btn-primary"}`}
                    >
                        {displayConfirmText}
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
