import React, { useState } from "react";
import Modal from "./Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { TrashIcon } from "./Icons";

interface RequestDeletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title: string;
    itemName: string;
}

export default function RequestDeletionModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName
}: RequestDeletionModalProps) {
    const { t } = useLanguage();
    const [reason, setReason] = useState("");

    const handleConfirm = () => {
        if (!reason.trim()) return;
        onConfirm(reason);
        setReason("");
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            titleIcon={<TrashIcon size={24} className="text-accent-red" />}
            size="md"
            footer={
                <>
                    <button onClick={onClose} className="btn btn-outline">
                        {t("actionCancel") || "Cancel"}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!reason.trim()}
                        className="btn btn-danger"
                    >
                        {t("actionConfirm") || "Confirm"}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-text-muted">
                    คุณไม่มีสิทธิ์ในการลบข้อมูล <strong>{itemName}</strong> โดยตรง กรุณาระบุเหตุผลในการขอลบข้อมูล เพื่อให้ผู้ดูแลระบบ (Admin) อนุมัติ
                </p>
                <div>
                    <label className="block text-sm font-medium text-text-muted mb-1">เหตุผลในการขอลบ <span className="text-accent-red">*</span></label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="input h-24 resize-none w-full"
                        placeholder="ระบุเหตุผล..."
                        required
                    />
                </div>
            </div>
        </Modal>
    );
}
