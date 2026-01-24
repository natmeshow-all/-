"use client";

import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { FlaskIcon, ShieldCheckIcon, UserIcon } from "./ui/Icons";
import Link from "next/link";
import VersionDisplay from "./ui/VersionDisplay";

import { useAuth } from "../contexts/AuthContext";
import LoginButton from "./auth/LoginButton";
import NotificationBell from "./ui/NotificationBell";

interface HeaderProps {
    className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
    const { language, setLanguage, t } = useLanguage();
    const { user, userProfile, signOut, isAdmin, isPending } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = React.useState(false);

    // Get display name from userProfile first, fallback to user
    const displayName = userProfile?.displayName || userProfile?.nickname || user?.displayName || "User";
    const roleLabel = userProfile?.role === "admin" ? t("userRoleAdmin") :
        userProfile?.role === "supervisor" ? t("userRoleSupervisor") :
            userProfile?.role === "technician" ? t("userRoleTechnician") :
                userProfile?.role === "viewer" ? t("userRoleViewer") : "";

    return (
        <header className={`sticky top-0 z-30 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-light ${className}`}>
            <div className="px-3 py-2 sm:px-6 sm:py-3">
                <div className="flex items-center justify-between">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="relative shrink-0">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg">
                                <FlaskIcon className="text-white" size={18} />
                            </div>
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-primary/30 blur-lg -z-10" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-sm sm:text-lg font-extrabold gradient-text leading-tight tracking-tight whitespace-nowrap sm:whitespace-normal">
                                {t("appTitle")}
                            </h1>
                            <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 sm:mt-0 font-medium line-clamp-1 sm:line-clamp-none">
                                {t("appSubtitle")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Notifications */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <NotificationBell />
                        </div>

                        {/* Language Switcher - Single Toggle Button */}
                        <button
                            onClick={() => setLanguage(language === "th" ? "en" : "th")}
                            className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-bg-tertiary/40 hover:bg-bg-tertiary border border-border-light rounded-md transition-all active:scale-95 ml-1 sm:ml-0 min-w-[32px] flex items-center justify-center group"
                            title={language === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
                        >
                            <span className="text-[10px] sm:text-xs font-bold text-text-primary uppercase transition-colors group-hover:text-primary">
                                {language}
                            </span>
                        </button>

                        {/* Authentication */}
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="relative group p-1"
                                >
                                    <div className="user-avatar-glow">
                                        <img
                                            src={user.photoURL || "https://ui-avatars.com/api/?name=" + displayName}
                                            alt={displayName}
                                            referrerPolicy="no-referrer"
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-transform group-hover:scale-95 cursor-pointer"
                                        />
                                    </div>
                                    <div className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-accent-green border-2 border-bg-secondary rounded-full z-20"></div>
                                </button>

                                {showProfileMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40 bg-transparent"
                                            onClick={() => setShowProfileMenu(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-56 py-1 bg-bg-secondary rounded-xl border border-border-light shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                                            <div className="px-4 py-3 border-b border-border-light/50">
                                                <p className="text-sm font-semibold text-text-primary truncate">
                                                    {displayName}
                                                </p>
                                                {userProfile?.nickname && userProfile.nickname !== displayName && (
                                                    <p className="text-xs text-text-muted">({userProfile.nickname})</p>
                                                )}
                                                <p className="text-xs text-text-muted truncate mt-1">
                                                    {user.email}
                                                </p>
                                                {roleLabel && (
                                                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold
                                                        ${userProfile?.role === 'admin' ? 'bg-accent-red/20 text-accent-red' :
                                                            userProfile?.role === 'supervisor' ? 'bg-accent-yellow/20 text-accent-yellow' :
                                                                userProfile?.role === 'technician' ? 'bg-accent-blue/20 text-accent-blue' :
                                                                    'bg-white/10 text-white/60'}`}>
                                                        {roleLabel}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Admin Dashboard */}
                                            {isAdmin && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() => setShowProfileMenu(false)}
                                                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-accent-purple hover:bg-bg-tertiary transition-colors"
                                                >
                                                    <ShieldCheckIcon size={16} />
                                                    {t("navAdminDashboard")}
                                                </Link>
                                            )}

                                            <button
                                                onClick={() => {
                                                    signOut();
                                                    setShowProfileMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-accent-red hover:bg-bg-tertiary transition-colors"
                                            >
                                                {t("actionSignOut")}
                                            </button>

                                            <VersionDisplay />
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <LoginButton />
                        )}
                    </div>
                </div>
            </div>


        </header>
    );
}

