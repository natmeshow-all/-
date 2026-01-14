"use client";

import React from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import { PlusIcon, SettingsIcon, TrashIcon } from "../components/ui/Icons";
import MachineSettingsModal from "../components/forms/MachineSettingsModal";
import AddMachineModal from "../components/forms/AddMachineModal";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function MachinesPage() {
    const { t } = useLanguage();
    const [machines, setMachines] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
    const [addModalOpen, setAddModalOpen] = React.useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [selectedMachine, setSelectedMachine] = React.useState<any>(null);
    const [machineToDelete, setMachineToDelete] = React.useState<any>(null);

    const fetchMachines = async () => {
        try {
            setLoading(true);
            const { getMachines } = await import("../lib/firebaseService");
            const data = await getMachines();
            setMachines(data);
        } catch (error) {
            console.error("Failed to fetch machines:", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchMachines();
    }, []);

    const handleOpenSettings = (machine: any) => {
        setSelectedMachine(machine);
        setSettingsModalOpen(true);
    };

    const handleOpenDelete = (machine: any) => {
        setMachineToDelete(machine);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteMachine = async () => {
        if (!machineToDelete) return;
        try {
            const { deleteMachine } = await import("../lib/firebaseService");
            await deleteMachine(machineToDelete.id);
            fetchMachines();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete machine");
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-yellow/20 flex items-center justify-center">
                            <SettingsIcon size={20} className="text-accent-yellow" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navMachines")}</h1>
                            <p className="text-sm text-text-muted">
                                {loading ? "Loading..." : `${machines.length} เครื่อง`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setAddModalOpen(true)}
                        className="btn btn-primary h-8"
                    >
                        <PlusIcon size={16} />
                        {t("actionAddMachine") || "เพิ่มเครื่องจักร"}
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {/* Machine Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {machines.map((machine, index) => (
                            <MachineCard
                                key={machine.id || index}
                                machine={machine}
                                index={index}
                                onRefresh={fetchMachines}
                                onOpenSettings={() => handleOpenSettings(machine)}
                                onOpenDelete={() => handleOpenDelete(machine)}
                            />
                        ))}
                    </div>
                )}

                {!loading && machines.length === 0 && (
                    <div className="text-center py-12 text-text-muted">
                        No machines found. Add parts to see machines here.
                    </div>
                )}
            </main>

            <MobileNav />

            {selectedMachine && (
                <MachineSettingsModal
                    isOpen={settingsModalOpen}
                    onClose={() => setSettingsModalOpen(false)}
                    machine={selectedMachine}
                    onSuccess={fetchMachines}
                />
            )}

            <AddMachineModal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSuccess={fetchMachines}
            />

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={handleDeleteMachine}
                title={t("confirmDeleteTitle") || "Confirm Delete"}
                message={(t("confirmDeleteMessageDetail") || "Are you sure you want to delete {name}?").replace("{name}", machineToDelete?.name || "")}
                confirmText={t("actionDelete") || "Delete"}
                cancelText={t("actionCancel") || "Cancel"}
                isDestructive={true}
            />
        </div>
    );
}

// Sub-component for Machine Card
function MachineCard({ machine, index, onRefresh, onOpenSettings, onOpenDelete }: { machine: any, index: number, onRefresh: () => void, onOpenSettings: () => void, onOpenDelete: () => void }) {
    const { t } = useLanguage();
    const [uploading, setUploading] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);
        try {
            const { updateMachineImage } = await import("../lib/firebaseService");
            await updateMachineImage(machine.name, file, machine.id);
            onRefresh();
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = () => {
        onOpenDelete();
    };

    return (
        <div
            className="group relative h-80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 animate-fade-in-up border border-white/5"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Full Background Image */}
            <div className="absolute inset-0 bg-bg-tertiary">
                {machine.imageUrl ? (
                    <img
                        src={machine.imageUrl}
                        alt={machine.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-tertiary">
                        <SettingsIcon size={48} className="text-text-muted/20" />
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
            </div>

            {/* Content Content - Positioned at bottom */}
            <div className="absolute inset-x-0 bottom-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">{machine.name}</h3>
                    <span className="badge badge-success shadow-lg backdrop-blur-md bg-green-500/20 border-green-500/30 text-green-400">
                        Active
                    </span>
                </div>

                {machine.brandModel && (
                    <p className="text-sm text-white/70 mb-3 font-medium">{machine.brandModel}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    {machine.location && (
                        <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90">
                            {machine.location}
                        </span>
                    )}
                    {machine.serialNumber && (
                        <span className="px-2.5 py-1 rounded-lg bg-accent-purple/20 backdrop-blur-md border border-accent-purple/30 text-xs font-medium text-accent-purple">
                            {t("labelSerialNumber")}: {machine.serialNumber}
                        </span>
                    )}
                    {machine.operatingHours > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-primary/20 backdrop-blur-md border border-primary/30 text-xs font-medium text-primary-light">
                            {t("labelOperatingHours")}: {machine.operatingHours} {t("labelHours")}
                        </span>
                    )}
                    {machine.powerRating && (
                        <span className="px-2.5 py-1 rounded-lg bg-accent-yellow/20 backdrop-blur-md border border-accent-yellow/30 text-xs font-medium text-accent-yellow">
                            {t("labelPowerRating")}: {machine.powerRating}
                        </span>
                    )}
                    {machine.installationDate && (
                        <span className="px-2.5 py-1 rounded-lg bg-accent-cyan/20 backdrop-blur-md border border-accent-cyan/30 text-xs font-medium text-accent-cyan">
                            {t("labelInstall")}: {machine.installationDate}
                        </span>
                    )}
                    {machine.maintenanceCycle > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-accent-green/20 backdrop-blur-md border border-accent-green/30 text-xs font-medium text-accent-green">
                            {t("labelMaintenanceCycle")}: {machine.maintenanceCycle} {t("labelMonths")}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Buttons - Top Right */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                {/* Settings Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenSettings();
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-primary hover:border-primary hover:scale-105 transition-all duration-300 shadow-lg"
                    title={t("labelMachineSettings")}
                >
                    <SettingsIcon size={20} />
                </button>

                {/* Upload Button */}
                <label className={`
                    relative cursor-pointer 
                    w-10 h-10 rounded-full 
                    bg-white/10 backdrop-blur-md border border-white/20 
                    flex items-center justify-center 
                    text-white hover:bg-primary hover:border-primary hover:scale-105 
                    transition-all duration-300 shadow-lg
                    ${uploading ? 'pointer-events-none opacity-70' : ''}
                `}>
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    {uploading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    )}
                </label>

                {/* Delete Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-accent-red hover:border-accent-red hover:scale-105 transition-all duration-300 shadow-lg"
                    title={t("actionDelete")}
                >
                    <TrashIcon size={20} />
                </button>
            </div>
        </div>
    );
}
