"use client";

import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "../../types";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirect?: boolean;
    redirectTo?: string;
    fallback?: React.ReactNode;
}

/**
 * RoleGuard Component
 * 
 * Used to protect UI elements based on user role.
 * 
 * Usage:
 * ```tsx
 * // Hide button for non-admins
 * <RoleGuard allowedRoles={['admin']}>
 *   <DeleteButton />
 * </RoleGuard>
 * 
 * // Redirect if not authorized
 * <RoleGuard allowedRoles={['admin', 'supervisor']} redirect>
 *   <PMConfigModal />
 * </RoleGuard>
 * 
 * // Show fallback for unauthorized
 * <RoleGuard allowedRoles={['admin']} fallback={<p>Access denied</p>}>
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */
export default function RoleGuard({
    children,
    allowedRoles,
    redirect = false,
    redirectTo = "/",
    fallback = null
}: RoleGuardProps) {
    const { userProfile, loading, hasRole } = useAuth();
    const router = useRouter();

    // Still loading
    if (loading) {
        return null;
    }

    // Not logged in or no profile
    if (!userProfile) {
        if (redirect) {
            router.push(redirectTo);
        }
        return <>{fallback}</>;
    }

    // Check if user has required role
    if (hasRole(allowedRoles)) {
        return <>{children}</>;
    }

    // Not authorized
    if (redirect) {
        router.push(redirectTo);
    }

    return <>{fallback}</>;
}

/**
 * Hook to check role permission
 */
export function useRoleCheck(allowedRoles: UserRole[]): boolean {
    const { hasRole } = useAuth();
    return hasRole(allowedRoles);
}

/**
 * Admin-only guard - convenience component
 */
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={["admin"]} fallback={fallback}>
            {children}
        </RoleGuard>
    );
}

/**
 * Editor roles (can edit machines, PM plans)
 */
export function EditorOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={["admin", "supervisor"]} fallback={fallback}>
            {children}
        </RoleGuard>
    );
}

/**
 * Worker roles (can do PM tasks, add maintenance records)
 */
export function WorkerOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
    return (
        <RoleGuard allowedRoles={["admin", "supervisor", "technician"]} fallback={fallback}>
            {children}
        </RoleGuard>
    );
}
