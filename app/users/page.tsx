"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../contexts/ToastContext";
import {
    UserIcon,
    CheckIcon,
    XIcon,
    EditIcon,
    SettingsIcon,
    ShieldCheckIcon
} from "../components/ui/Icons";
import {
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectPendingUser,
    updateUserProfile,
    deactivateUser,
    reactivateUser
} from "../lib/firebaseService";
import { UserProfile, PendingUser, UserRole } from "../types";
import Modal from "../components/ui/Modal";
import { useRouter } from "next/navigation";
import FirebaseStatus from "../components/ui/FirebaseStatus";

export default function UsersPage() {
    const { t, language } = useLanguage();
    const { userProfile, isAdmin, loading: authLoading } = useAuth();
    const { success, error: showError } = useToast();
    const router = useRouter();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"users" | "pending">("users");
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [approvalModal, setApprovalModal] = useState<PendingUser | null>(null);
    const [approvalRole, setApprovalRole] = useState<UserRole>("technician");
    const [approvalNickname, setApprovalNickname] = useState("");

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push("/");
        }
    }, [authLoading, isAdmin, router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, pendingData] = await Promise.all([
                getAllUsers(),
                getPendingUsers()
            ]);
            setUsers(usersData);
            setPendingUsers(pendingData);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin]);

    const handleApprove = async () => {
        if (!approvalModal) return;

        try {
            await approveUser(
                approvalModal.uid,
                approvalRole,
                approvalModal.displayName,
                approvalNickname
            );
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
        if (!confirm(t("userConfirmReject"))) return;

        try {
            await rejectPendingUser(uid);
            fetchData();
        } catch (error) {
            console.error("Error rejecting user:", error);
        }
    };

    const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
        try {
            await updateUserProfile(uid, updates);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            console.error("Error updating user:", error);
        }
    };

    const handleToggleActive = async (user: UserProfile) => {
        try {
            if (user.isActive) {
                await deactivateUser(user.uid);
            } else {
                await reactivateUser(user.uid);
            }
            fetchData();
        } catch (error) {
            console.error("Error toggling user status:", error);
        }
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case "admin": return "bg-accent-red/20 text-accent-red border-accent-red/30";
            case "supervisor": return "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30";
            case "technician": return "bg-accent-blue/20 text-accent-blue border-accent-blue/30";
            case "viewer": return "bg-white/10 text-white/60 border-white/20";
        }
    };

    const getRoleLabel = (role: UserRole) => {
        switch (role) {
            case "admin": return t("userRoleAdmin");
            case "supervisor": return t("userRoleSupervisor");
            case "technician": return t("userRoleTechnician");
            case "viewer": return t("userRoleViewer");
        }
    };

    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
                            <ShieldCheckIcon size={20} className="text-accent-purple" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("userManageTitle")}</h1>
                            <p className="text-sm text-text-muted">
                                {t("userTotalCount", { count: users.length })} | {t("userPendingCount", { count: pendingUsers.length })}
                            </p>
                        </div>
                    </div>

                    {/* Firebase Status - Admin Only - Right Aligned */}
                    {isAdmin && (
                        <div>
                            <FirebaseStatus />
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border
                            ${activeTab === "users"
                                ? "bg-accent-blue/20 border-accent-blue/40 text-white"
                                : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"}`}
                    >
                        {t("userTabAll")} ({users.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("pending")}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border relative
                            ${activeTab === "pending"
                                ? "bg-accent-yellow/20 border-accent-yellow/40 text-white"
                                : "bg-white/5 border-white/10 text-text-muted hover:bg-white/10"}`}
                    >
                        {t("userTabPending")} ({pendingUsers.length})
                        {pendingUsers.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-yellow rounded-full animate-pulse" />
                        )}
                    </button>
                </div>

                {
                    loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : activeTab === "users" ? (
                        /* Users List */
                        <div className="grid gap-4">
                            {users.map((user) => (
                                <div
                                    key={user.uid}
                                    className={`card p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-primary/20 cursor-default ${!user.isActive ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center">
                                                <UserIcon size={24} className="text-accent-purple" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-text-primary truncate">
                                                    {user.displayName}
                                                </h3>
                                                {user.nickname && (
                                                    <span className="text-xs text-text-muted">({user.nickname})</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted truncate">{user.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleBadgeColor(user.role)}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                                {!user.isActive && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-red/20 text-accent-red border border-accent-red/30">
                                                        {t("userStatusDeactivated")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                                title="แก้ไข"
                                            >
                                                <EditIcon size={16} className="text-text-muted" />
                                            </button>
                                            {user.uid !== userProfile?.uid && (
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    className={`p-2 rounded-lg transition-colors ${user.isActive
                                                        ? 'bg-accent-red/10 hover:bg-accent-red/20 text-accent-red'
                                                        : 'bg-accent-green/10 hover:bg-accent-green/20 text-accent-green'
                                                        }`}
                                                    title={user.isActive ? t("statusReadOnly") : t("actionMaintenance")}
                                                >
                                                    {user.isActive ? <XIcon size={16} /> : <CheckIcon size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Pending Users List */
                        <div className="grid gap-4">
                            {pendingUsers.length === 0 ? (
                                <div className="text-center py-12 text-text-muted">
                                    <UserIcon size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>{t("userNoPending")}</p>
                                </div>
                            ) : (
                                pendingUsers.map((user) => (
                                    <div key={user.uid} className="card p-4 border-l-4 border-l-accent-yellow hover:scale-[1.01] hover:shadow-lg transition-all duration-300">
                                        <div className="flex items-center gap-4">
                                            {user.photoURL ? (
                                                <img
                                                    src={user.photoURL}
                                                    alt={user.displayName}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-accent-yellow/20 flex items-center justify-center">
                                                    <UserIcon size={24} className="text-accent-yellow" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-text-primary truncate">
                                                    {user.displayName}
                                                </h3>
                                                <p className="text-xs text-text-muted truncate">{user.email}</p>
                                                <p className="text-[10px] text-text-muted mt-1">
                                                    {t("userRequestedAt")}: {new Date(user.requestedAt).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setApprovalModal(user);
                                                        setApprovalRole("technician");
                                                        setApprovalNickname("");
                                                    }}
                                                    className="px-3 py-2 rounded-lg bg-accent-green/20 hover:bg-accent-green/30 text-accent-green text-sm font-bold transition-colors"
                                                >
                                                    <CheckIcon size={16} className="inline mr-1" />
                                                    {t("userActionApprove")}
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.uid)}
                                                    className="px-3 py-2 rounded-lg bg-accent-red/20 hover:bg-accent-red/30 text-accent-red text-sm font-bold transition-colors"
                                                >
                                                    <XIcon size={16} className="inline mr-1" />
                                                    {t("userActionReject")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )
                }
            </main >

            <MobileNav />

            {/* Approval Modal */}
            <Modal
                isOpen={!!approvalModal}
                onClose={() => setApprovalModal(null)}
                title={t("userApproveTitle")}
            >
                {approvalModal && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                            {approvalModal.photoURL ? (
                                <img src={approvalModal.photoURL} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-accent-yellow/20 flex items-center justify-center">
                                    <UserIcon size={20} className="text-accent-yellow" />
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-text-primary">{approvalModal.displayName}</p>
                                <p className="text-xs text-text-muted">{approvalModal.email}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">{t("userLabelNickname")}</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                placeholder={t("placeholderTechnician")}
                                value={approvalNickname}
                                onChange={(e) => setApprovalNickname(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-muted mb-2">{t("userLabelRole")}</label>
                            <select
                                className="input-field w-full"
                                value={approvalRole}
                                onChange={(e) => setApprovalRole(e.target.value as UserRole)}
                            >
                                <option value="technician">{t("userRoleTechnician")}</option>
                                <option value="supervisor">{t("userRoleSupervisor")}</option>
                                <option value="viewer">{t("userRoleViewer")}</option>
                                <option value="admin">{t("userRoleAdmin")}</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setApprovalModal(null)}
                                className="flex-1 py-3 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 transition-colors"
                            >
                                {t("actionCancel")}
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-1 py-3 rounded-xl bg-accent-green text-bg-primary font-bold hover:bg-accent-green/80 transition-colors"
                            >
                                {t("userActionApprove")}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit User Modal */}
            <Modal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title={t("userEditTitle")}
            >
                {editingUser && (
                    <EditUserForm
                        user={editingUser}
                        onSave={(updates) => handleUpdateUser(editingUser.uid, updates)}
                        onCancel={() => setEditingUser(null)}
                        getRoleLabel={getRoleLabel}
                    />
                )}
            </Modal>
        </div >
    );
}

// Edit User Form Component
function EditUserForm({
    user,
    onSave,
    onCancel,
    getRoleLabel
}: {
    user: UserProfile;
    onSave: (updates: Partial<UserProfile>) => void;
    onCancel: () => void;
    getRoleLabel: (role: UserRole) => string;
}) {
    const { t } = useLanguage();
    const [displayName, setDisplayName] = useState(user.displayName);
    const [nickname, setNickname] = useState(user.nickname || "");
    const [role, setRole] = useState<UserRole>(user.role);
    const [department, setDepartment] = useState(user.department || "");

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
                        <UserIcon size={20} className="text-accent-purple" />
                    </div>
                )}
                <div>
                    <p className="text-xs text-text-muted">{user.email}</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-text-muted mb-2">{t("userLabelDisplayName")}</label>
                <input
                    type="text"
                    className="input-field w-full"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-muted mb-2">{t("userLabelNickname")}</label>
                <input
                    type="text"
                    className="input-field w-full"
                    placeholder={t("placeholderTechnician")}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-muted mb-2">{t("userLabelDepartment")}</label>
                <input
                    type="text"
                    className="input-field w-full"
                    placeholder={t("placeholderDepartment")}
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-muted mb-2">{t("userLabelRole")}</label>
                <select
                    className="input-field w-full"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                >
                    <option value="technician">{getRoleLabel("technician")}</option>
                    <option value="supervisor">{getRoleLabel("supervisor")}</option>
                    <option value="viewer">{getRoleLabel("viewer")}</option>
                    <option value="admin">{getRoleLabel("admin")}</option>
                </select>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 transition-colors"
                >
                    {t("actionCancel")}
                </button>
                <button
                    onClick={() => onSave({ displayName, nickname, role, department })}
                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
                >
                    {t("actionSave")}
                </button>
            </div>
        </div>
    );
}
