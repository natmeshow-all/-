"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getSystemSettings } from "../lib/firebaseService";
import MaintenanceModePage from "./MaintenanceModePage";

interface MaintenanceWrapperProps {
    children: React.ReactNode;
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
    const { isAdmin, loading: authLoading } = useAuth();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showReset, setShowReset] = useState(false);

    useEffect(() => {
        const checkMaintenanceMode = async () => {
            try {
                // Add a timeout to prevent infinite loading
                const settingsPromise = getSystemSettings();
                const timeoutPromise = new Promise<null>((resolve) => 
                    setTimeout(() => resolve(null), 5000)
                );
                
                const settings = await Promise.race([settingsPromise, timeoutPromise]);
                
                if (settings) {
                    setMaintenanceMode(settings.maintenanceMode || false);
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
            <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-text-secondary animate-pulse">Loading system...</p>
                
                {showReset && (
                    <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-red-400 text-sm">Taking longer than expected?</p>
                        <button 
                            onClick={handleReset}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg text-sm transition-colors"
                        >
                            Reset Application Data
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // If maintenance mode is on and user is NOT admin, show maintenance page
    if (maintenanceMode && !isAdmin) {
        return <MaintenanceModePage />;
    }

    // Otherwise, show normal content
    return <>{children}</>;
}
