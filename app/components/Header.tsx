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
            <div className="px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                    {/* Logo & Title */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg">
                                <FlaskIcon className="text-white" size={24} />
                            </div>
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-xl bg-primary/30 blur-lg -z-10" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-base sm:text-lg font-bold gradient-text leading-tight">
                                {t("appTitle")}
                            </h1>
                            <p className="text-[10px] sm:text-xs text-text-muted hidden sm:block">
                                {t("appSubtitle")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Firebase Status */}
                        <FirebaseStatus />

                        {/* Notifications */}
                        <NotificationBell />

                        {/* Scanner Button (Phase 4) */}
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                            title="Scan QR Code"
                        >
                            <CameraIcon size={20} />
                        </button>

                        {/* Language Switcher */}
                        <div className="lang-switcher">
                            <button
                                onClick={() => setLanguage("th")}
                                className={`lang-btn ${language === "th" ? "active" : ""}`}
                            >
                                <span className="flex items-center gap-1">
                                    <span className="text-xs">🇹🇭</span>
                                    <span>TH</span>
                                </span>
                            </button>
                            <button
                                onClick={() => setLanguage("en")}
                                className={`lang-btn ${language === "en" ? "active" : ""}`}
                            >
                                <span className="flex items-center gap-1">
                                    <span className="text-xs">🇬🇧</span>
                                    <span>EN</span>
                                </span>
                            </button>
                        </div>

                        {/* Authentication */}
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className="relative"
                                >
                                    <img
                                        src={user.photoURL || "https://ui-avatars.com/api/?name=" + user.displayName}
                                        alt={user.displayName || "User"}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-primary/50 hover:border-primary transition-colors cursor-pointer"
                                    />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-green border-2 border-bg-secondary rounded-full"></div>
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
