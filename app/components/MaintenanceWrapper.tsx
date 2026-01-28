"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getSystemSettings } from "../lib/firebaseService";
import { checkAndClearOldCache, isMemoryCritical, emergencyCleanup, APP_VERSION } from "../lib/cacheManager";
import MaintenanceModePage from "./MaintenanceModePage";
import GlobalLoadingSpinner from "./ui/GlobalLoadingSpinner";
import AIAssistant from "./ai/AIAssistant";
import { SystemSettings } from "../types";

interface MaintenanceWrapperProps {
    children: React.ReactNode;
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
    const { isAdmin, loading: authLoading } = useAuth();
    const { language } = useLanguage();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showReset, setShowReset] = useState(false);
    const [memoryWarning, setMemoryWarning] = useState(false);

    // Check cache version and clear if needed on mount
    useEffect(() => {
        const cacheCleared = checkAndClearOldCache();
        if (cacheCleared) {
            console.log(`[MaintenanceWrapper] Cache cleared for version ${APP_VERSION}`);
        }

        // Memory monitoring (every 30 seconds)
        const memoryCheck = setInterval(() => {
            if (isMemoryCritical(80)) {
                setMemoryWarning(true);
                // Try emergency cleanup if memory is very critical
                if (isMemoryCritical(90)) {
                    emergencyCleanup();
                }
            } else {
                setMemoryWarning(false);
            }
        }, 30000);

        return () => clearInterval(memoryCheck);
    }, []);

    useEffect(() => {
        // Subscribe to real-time updates for system settings using onValue from firebase/database directly in component
        // to avoid import issues or missing exports in services
        // Ideally this logic should be in a service, but for stability we'll do it here temporarily
        // Actually, let's try the fetch with polling or just simple fetch on mount for now to be safe
        // Reverting to the simple fetch logic that worked before is the safest bet for now
        const checkMaintenanceMode = async () => {
            try {
                // Add a timeout to prevent infinite loading
                const settingsPromise = getSystemSettings();
                const timeoutPromise = new Promise<null>((resolve) =>
                    setTimeout(() => resolve(null), 5000)
                );

                const fetchedSettings = await Promise.race([settingsPromise, timeoutPromise]);

                if (fetchedSettings) {
                    setSettings(fetchedSettings);
                    setMaintenanceMode(fetchedSettings.maintenanceMode || false);
                } else {
                    // Fallback if settings fail to load or timeout
                    console.warn("Could not load system settings or timed out");
                }
            } catch (error) {
                console.error("Error checking maintenance mode:", error);
                setMaintenanceMode(false);
            } finally {
                setLoading(false);
            }
        };

        // Only check after auth is loaded
        if (!authLoading) {
            checkMaintenanceMode();
        }
    }, [authLoading]);

    // Safety timeout for stuck loading states
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading || authLoading) {
            timer = setTimeout(() => {
                setShowReset(true);
            }, 8000); // Show reset option after 8 seconds of loading
        } else {
            setShowReset(false);
        }
        return () => clearTimeout(timer);
    }, [loading, authLoading]);

    const handleReset = async () => {
        if (confirm("This will clear your local cache and reload the page. Continue?")) {
            try {
                // Clear local storage
                localStorage.clear();
                sessionStorage.clear();

                // Attempt to clear Firebase Auth persistence
                if (window.indexedDB) {
                    const deleteRequest = window.indexedDB.deleteDatabase('firebaseLocalStorageDb');
                    deleteRequest.onsuccess = () => console.log("Auth DB deleted");
                    deleteRequest.onerror = () => console.log("Auth DB delete failed");
                }

                // Clear service workers if any
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                }
            } catch (e) {
                console.error("Error clearing cache:", e);
            }
            window.location.reload();
        }
    };

    // Show loading state briefly
    if (loading || authLoading) {
        return (
            <>
                <GlobalLoadingSpinner
                    status={language === 'th' ? 'กำลังเตรียมระบบ...' : 'Initializing System...'}
                    subStatus={authLoading ? (language === 'th' ? 'ตรวจสอบสถานะผู้ใช้' : 'Checking user session') : (language === 'th' ? 'กำลังโหลดการตั้งค่า' : 'Loading settings')}
                    variant={authLoading ? 'auth' : 'default'}
                />
                {showReset && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-red-400 text-sm">Taking longer than expected?</p>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm transition-colors"
                        >
                            Reset Application Data
                        </button>
                    </div>
                )}
            </>
        );
    }

    // If maintenance mode is on and user is NOT admin, show maintenance page
    if (maintenanceMode && !isAdmin) {
        return <MaintenanceModePage />;
    }

    // Otherwise, show normal content
    const announcementText = language === 'th'
        ? settings?.announcement?.message
        : (settings?.announcement?.messageEn || settings?.announcement?.message);

    return (
        <>
            {/* Memory Warning Banner */}
            {memoryWarning && (
                <div className="w-full py-2 px-4 bg-orange-500 text-white text-sm font-medium flex items-center justify-between z-50">
                    <span>⚠️ หน่วยความจำใกล้เต็ม กรุณารีเฟรชหน้าเว็บ</span>
                    <button
                        onClick={handleReset}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs transition-colors"
                    >
                        รีเซ็ต
                    </button>
                </div>
            )}
            {settings?.announcement?.enabled && announcementText && (
                <>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes marquee {
                            0% { transform: translateX(100%); }
                            100% { transform: translateX(-100%); }
                        }
                        .animate-marquee-custom {
                            animation: marquee ${Math.max(30, announcementText.length * 0.6)}s linear infinite;
                            display: inline-block;
                            white-space: nowrap;
                            padding-left: 100%; /* Start off-screen */
                        }
                        .animate-marquee-custom:hover {
                            animation-play-state: paused;
                        }
                    `}} />
                    <div className={`w-full py-2 text-sm font-bold z-50 relative overflow-hidden ${settings.announcement.level === 'urgent' ? 'bg-red-500 text-white' :
                        settings.announcement.level === 'warning' ? 'bg-yellow-500 text-black' :
                            'bg-blue-600 text-white'
                        }`}>
                        <div className="animate-marquee-custom">
                            <span>{announcementText}</span>
                        </div>
                    </div>
                </>
            )}
            {children}
            {/* AI Assistant Floating Button */}
            <AIAssistant />
        </>
    );
}
