"use client";

import React, { useState, useEffect } from "react";
import { app } from "../../lib/firebase";
import { useLanguage } from "../../contexts/LanguageContext";

export default function FirebaseStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsOnline(navigator.onLine);
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);
            window.addEventListener("online", handleOnline);
            window.addEventListener("offline", handleOffline);
            return () => {
                window.removeEventListener("online", handleOnline);
                window.removeEventListener("offline", handleOffline);
            };
        }
    }, []);

    if (!app) return null;

    const options = app.options;

    // Mask API Key
    const maskedApiKey = options.apiKey
        ? `${options.apiKey.toString().substring(0, 4)}...${options.apiKey.toString().substring(options.apiKey.toString().length - 4)}`
        : "Not set";

    return (
        <div className="relative">
            <button
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium border transition-colors duration-300 ${isOnline
                    ? "bg-accent-green/10 text-accent-green border-accent-green/20 hover:bg-accent-green/20"
                    : "bg-accent-red/10 text-accent-red border-accent-red/20 hover:bg-accent-red/20"
                    }`}
                title={isOnline ? t("statusConnected") : t("statusOffline")}
            >
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isOnline ? "bg-accent-green animate-pulse" : "bg-accent-red"}`} />
                <span className="hidden sm:inline">
                    {isOnline ? t("statusConnected") : t("statusOffline")}
                </span>
            </button>

            {/* Connection Details Popover */}
            {showDetails && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setShowDetails(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-bg-secondary rounded-xl border border-border-light shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                            <span className="text-accent-purple">🔥</span> {t("labelFirebaseStatus")}
                        </h3>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-border-light/50">
                                <span className="text-text-muted">{t("maintenanceStatus")}</span>
                                <span className={isOnline ? "text-accent-green font-medium" : "text-accent-red font-medium"}>
                                    {isOnline ? t("statusConnected") : t("statusOffline")}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <span className="text-text-muted block text-[10px] uppercase tracking-wider">{t("labelProjectID")}</span>
                                <span className="text-text-primary font-mono bg-bg-tertiary px-2 py-1 rounded block truncate">
                                    {options.projectId || "Not set"}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <span className="text-text-muted block text-[10px] uppercase tracking-wider">{t("labelAuthDomain")}</span>
                                <span className="text-text-primary font-mono bg-bg-tertiary px-2 py-1 rounded block truncate">
                                    {options.authDomain || "Not set"}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <span className="text-text-muted block text-[10px] uppercase tracking-wider">{t("labelAPIKey")}</span>
                                <span className="text-text-primary font-mono bg-bg-tertiary px-2 py-1 rounded block truncate">
                                    {maskedApiKey}
                                </span>
                            </div>

                            <div className="pt-2 text-[10px] text-text-muted text-center">
                                {t("labelModularSDK")}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
