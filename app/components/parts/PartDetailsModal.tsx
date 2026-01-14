"use client";

import React, { useState } from "react";
import Modal from "../ui/Modal";
import { SparePart } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { EditIcon, TrashIcon, BoxIcon, WrenchIcon, XIcon } from "../ui/Icons";

interface PartDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    part: SparePart | null;
    onEdit: (part: SparePart) => void;
    onDelete: (part: SparePart) => void;
    onRepair: (part: SparePart) => void; // Added Repair handler
}

export default function PartDetailsModal({
    isOpen,
    onClose,
    part,
    onEdit,
    onDelete,
    onRepair
}: PartDetailsModalProps) {
    const { t } = useLanguage();
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (!part) return null;

    // Lightbox Component
    const Lightbox = () => {
        if (!lightboxOpen || !part.imageUrl) return null;

        return (
            <div
                className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
                onClick={() => setLightboxOpen(false)}
            >
                <button
                    onClick={() => setLightboxOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                    <XIcon size={24} />
                </button>
                <img
                    src={part.imageUrl}
                    alt={part.name}
                    className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl animate-scale-in"
                    onClick={(e) => e.stopPropagation()} // Prevent close on image click
                />
            </div>
        );
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={part.name}
                titleIcon={<BoxIcon size={24} className="text-primary" />}
                size="lg"
            >
                <div className="flex flex-col gap-6">
                    {/* Image Section */}
                    <div className="w-full h-64 sm:h-80 rounded-xl bg-bg-tertiary overflow-hidden border border-white/5 relative group">
                        {part.imageUrl ? (
                            <>
                                <img
                                    src={part.imageUrl}
                                    alt={part.name}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-500"
                                    onClick={() => setLightboxOpen(true)}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium backdrop-blur-sm">
                                        View Fullscreen
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted/30">
                                <BoxIcon size={64} />
                            </div>
                        )}

                        {/* Status Badge Overlay */}
                        <div className="absolute top-4 right-4">
                            {part.quantity <= part.minStockThreshold ? (
                                <span className="px-3 py-1 rounded-full bg-error text-white text-xs font-bold shadow-lg">
                                    Low Stock
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full bg-success text-white text-xs font-bold shadow-lg">
                                    In Stock
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-bg-secondary/50 border border-white/5">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableModelSpec") || "Specification"}</h3>
                                <p className="text-base text-text-primary">{part.description || "-"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableBrand") || "Brand"}</h3>
                                <p className="text-base text-text-primary">{part.brand || "-"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableLocation") || "Location"}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent-cyan"></span>
                                    <p className="text-base text-text-primary">{part.location || "-"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("addPartCategory") || "Category"}</h3>
                                <p className="text-base text-text-primary capitalize">{part.category || "-"}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableQuantity") || "Quantity"}</h3>
                                <div className="flex items-end gap-2">
                                    <span className={`text-2xl font-bold ${part.quantity <= part.minStockThreshold ? 'text-error' : 'text-primary'}`}>
                                        {part.quantity}
                                    </span>
                                    <span className="text-sm text-text-muted mb-1">{part.unit}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-text-muted mb-1">{t("tableNotes") || "Notes"}</h3>
                                <p className="text-sm text-text-secondary italic">{part.notes || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <button
                            onClick={() => onEdit(part)}
                            className="btn btn-secondary flex items-center justify-center gap-2 h-12 text-sm"
                        >
                            <EditIcon size={18} />
                            {t("actionEdit") || "Edit"}
                        </button>
                        <button
                            onClick={() => onRepair(part)}
                            className="btn bg-accent-orange/10 text-accent-orange hover:bg-accent-orange/20 border-accent-orange/20 flex items-center justify-center gap-2 h-12 text-sm rounded-xl font-medium transition-all"
                        >
                            <WrenchIcon size={18} />
                            {t("actionRepair") || "Repair"}
                        </button>
                        <button
                            onClick={() => onDelete(part)}
                            className="btn bg-error/10 text-error hover:bg-error/20 border-error/20 flex items-center justify-center gap-2 h-12 text-sm rounded-xl font-medium transition-all"
                        >
                            <TrashIcon size={18} />
                            {t("actionDelete") || "Delete"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Render Lightbox outside Modal to ensure it's on top */}
            <Lightbox />
        </>
    );
}
