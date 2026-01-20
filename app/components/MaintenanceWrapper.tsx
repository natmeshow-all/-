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

    useEffect(() => {
        const checkMaintenanceMode = async () => {
            try {
                const settings = await getSystemSettings();
                setMaintenanceMode(settings?.maintenanceMode || false);
            } catch (error) {
                // If we can't fetch settings (permission denied for non-admin), 
                // we need to handle this gracefully
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

    // Show loading state briefly
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
