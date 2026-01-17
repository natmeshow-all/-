"use client";

import React, { useState, useEffect } from "react";
import { UserProfile, PendingUser, UserRole } from "../../types";
import { getPendingUsers, getAllUsers, approveUser, rejectPendingUser } from "../../lib/firebaseService";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { UserIcon, CheckIcon, XIcon } from "../ui/Icons";
import Modal from "../ui/Modal";

export default function UserApprovalTab() {
    const { t } = useLanguage();
    const { success, error: showError } = useToast();

    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvalModal, setApprovalModal] = useState<PendingUser | null>(null);
    const [approvalRole, setApprovalRole] = useState<UserRole>("technician");
    const [approvalNickname, setApprovalNickname] = useState("");

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getPendingUsers();
            setPendingUsers(data);
        } catch (err) {
            console.error("Error fetching pending users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async () => {
        if (!approvalModal) return;

        try {
            await approveUser(
                approvalModal.uid,
                approvalRole,
                approvalModal.displayName,
                approvalNickname
            );
            success(t("msgSuccess") || "Approved successfully");
            setApprovalModal(null);
            setApprovalNickname("");
            setApprovalRole("technician");
            fetchData();
        } catch (error: any) {
            console.error("Error approving user:", error);
            showError(t("msgError"), error.message);
        }
    };

    const handleReject = async (uid: string) => {
        if (!confirm(t("userConfirmReject") || "Reject this user?")) return;

        try {
            await rejectPendingUser(uid);
            success("Rejected successfully");
            fetchData();
        } catch (error) {
            console.error("Error rejecting user:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-text-primary">{t("userTabPending")}</h2>
                <span className="text-xs text-text-muted">{pendingUsers.length} {t("userTabPending")}</span>
            </div>

            {pendingUsers.length === 0 ? (
                <div className="card p-12 bg-bg-secondary/20 border-white/5 flex flex-col items-center justify-center text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
                        <CheckIcon size={32} className="text-accent-green opacity-40" />
                    </div>
                    <p className="text-text-muted italic">{t("userNoPending")}</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {pendingUsers.map((user, idx) => (
                        <div key={user.uid}
                            className="card p-4 border-l-4 border-accent-yellow bg-bg-secondary/30 hover:bg-bg-secondary/50 hover:scale-[1.01] hover:shadow-lg hover:shadow-accent-yellow/5 transition-all duration-300 group"
                            style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-accent-yellow transition-all duration-300" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-accent-yellow/10 flex items-center justify-center text-accent-yellow transition-transform group-hover:scale-110">
                                            <UserIcon size={24} />
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent-yellow border-2 border-bg-secondary animate-pulse" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-text-primary truncate group-hover:text-accent-yellow transition-colors">{user.displayName}</h3>
                                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                                    <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                                        <span className="opacity-60">{t("userRequestedAt")}:</span>
                                        <span className="font-medium text-text-secondary">{new Date(user.requestedAt).toLocaleDateString()}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setApprovalModal(user)}
                                        className="px-4 py-2 rounded-xl bg-accent-green/20 hover:bg-accent-green text-accent-green hover:text-white text-xs font-bold transition-all shadow-sm hover:shadow-accent-green/20 active:scale-90"
                                    >
                                        {t("userActionApprove")}
                                    </button>
                                    <button
                                        onClick={() => handleReject(user.uid)}
                                        className="p-2.5 rounded-xl bg-accent-red/10 hover:bg-accent-red text-accent-red hover:text-white transition-all shadow-sm hover:shadow-accent-red/20 active:scale-90"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Approval Modal */}
            <Modal
                isOpen={!!approvalModal}
                onClose={() => setApprovalModal(null)}
                title={t("userApproveTitle")}
            >
                {approvalModal && (
                    <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 bg-bg-tertiary rounded-2xl flex items-center gap-4">
                            {approvalModal.photoURL && <img src={approvalModal.photoURL} className="w-12 h-12 rounded-full shadow-lg" alt="" />}
                            <div>
                                <p className="font-bold text-text-primary leading-tight">{approvalModal.displayName}</p>
                                <p className="text-xs text-text-muted">{approvalModal.email}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-1">{t("userLabelNickname")}</label>
                            <input
                                type="text"
                                className="input h-12"
                                placeholder="E.g. Chief, Mechanic A"
                                value={approvalNickname}
                                onChange={(e) => setApprovalNickname(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-1">{t("userLabelRole")}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <RoleOption selected={approvalRole === "technician"} onClick={() => setApprovalRole("technician")} label={t("userRoleTechnician")} />
                                <RoleOption selected={approvalRole === "supervisor"} onClick={() => setApprovalRole("supervisor")} label={t("userRoleSupervisor")} />
                                <RoleOption selected={approvalRole === "viewer"} onClick={() => setApprovalRole("viewer")} label={t("userRoleViewer")} />
                                <RoleOption selected={approvalRole === "admin"} onClick={() => setApprovalRole("admin")} label={t("userRoleAdmin")} />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setApprovalModal(null)}
                                className="flex-1 h-12 rounded-xl bg-white/5 text-text-muted font-bold hover:bg-white/10 transition-all border border-white/5"
                            >
                                {t("actionCancel")}
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-1 h-12 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all"
                            >
                                {t("userActionApprove")}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function RoleOption({ selected, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`py-3 rounded-xl border text-xs font-bold transition-all
                ${selected
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-white/5 border-white/5 text-text-muted hover:bg-white/10"}`}
        >
            {label}
        </button>
    );
}
