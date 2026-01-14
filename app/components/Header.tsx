"use client";

import React from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { FlaskIcon } from "./ui/Icons";
import FirebaseStatus from "./ui/FirebaseStatus";

import { useAuth } from "../contexts/AuthContext";
import LoginButton from "./auth/LoginButton";
import NotificationBell from "./ui/NotificationBell";
import { CameraIcon } from "./ui/Icons";
import ScannerModal from "./ui/ScannerModal";

interface HeaderProps {
    className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
    const { language, setLanguage, t } = useLanguage();
    const { user, signOut } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = React.useState(false);
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);

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
                            <h1 className="text-[11px] sm:text-lg font-extrabold gradient-text leading-tight tracking-tight whitespace-nowrap sm:whitespace-normal">
                                {t("appTitle")}
                            </h1>
                            <p className="text-[8px] sm:text-xs text-text-muted mt-0.5 sm:mt-0 font-medium line-clamp-1 sm:line-clamp-none">
                                {t("appSubtitle")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-3">
                        {/* Firebase Status - Hidden on mobile */}
                        <div className="hidden sm:block">
                            <FirebaseStatus />
                        </div>

                        {/* Notifications & Scanner */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            <NotificationBell />

                            {/* Scanner Button (Phase 4) */}
                            <button
                                onClick={() => setIsScannerOpen(true)}
                                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                                title="Scan QR Code"
                            >
                                <CameraIcon size={16} className="sm:w-5 sm:h-5" />
                            </button>
                        </div>

                        {/* Language Switcher */}
                        <div className="lang-switcher scale-75 sm:scale-100 origin-right ml-[-4px] sm:ml-0">
                            <button
                                onClick={() => setLanguage("th")}
                                className={`lang-btn ${language === "th" ? "active" : ""}`}
                            >
                                <span className="flex items-center gap-0.5 sm:gap-1">
                                    <span className="text-xs">🇹🇭</span>
                                    <span className="text-xs sm:text-sm">TH</span>
                                </span>
                            </button>
                            <button
                                onClick={() => setLanguage("en")}
                                className={`lang-btn ${language === "en" ? "active" : ""}`}
                            >
                                <span className="flex items-center gap-0.5 sm:gap-1">
                                    <span className="text-xs">🇬🇧</span>
                                    <span className="text-xs sm:text-sm">EN</span>
                                </span>
                            </button>
                        </div>

                        {/* Authentication */}
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="relative group p-1"
                                >
                                    <div className="user-avatar-glow">
                                        <img
                                            src={user.photoURL || "https://ui-avatars.com/api/?name=" + user.displayName}
                                            alt={user.displayName || "User"}
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
                                        <div className="absolute right-0 top-full mt-2 w-48 py-1 bg-bg-secondary rounded-xl border border-border-light shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                                            <div className="px-4 py-2 border-b border-border-light/50">
                                                <p className="text-sm font-semibold text-text-primary truncate">
                                                    {user.displayName}
                                                </p>
                                                <p className="text-xs text-text-muted truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    signOut();
                                                    setShowProfileMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-bg-tertiary transition-colors"
                                            >
                                                Sign out
                                            </button>
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

            {/* QR Scanner Modal */}
            <ScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
            />
        </header>
    );
}
