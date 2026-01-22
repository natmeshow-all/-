"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { UserProfile, UserRole } from "../types";
import {
    getUserProfile,
    createPendingUser,
    isPendingUser,
    createInitialAdmin,
    logAppAccess,
    getSystemSettings,
    autoRegisterUser
} from "../lib/firebaseService";

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isPending: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUserProfile: () => Promise<void>;
    hasRole: (roles: UserRole | UserRole[]) => boolean;
    isAdmin: boolean;
    checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isPending: false,
    signInWithGoogle: async () => { },
    signOut: async () => { },
    refreshUserProfile: async () => { },
    hasRole: () => false,
    isAdmin: false,
    checkAuth: () => false,
});

export const useAuth = () => useContext(AuthContext);

import { useToast } from "./ToastContext";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { loginRequired, success, info } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, setIsPending] = useState(false);

    const refreshUserProfile = async () => {
        if (!user) return;

        try {
            const profile = await getUserProfile(user.uid);
            if (profile && profile.isApproved && profile.isActive) {
                setUserProfile(profile);
                setIsPending(false);
            } else {
                setUserProfile(null);
                const pending = await isPendingUser(user.uid);
                setIsPending(pending);
            }
        } catch (error) {
            console.error("Error refreshing user profile:", error);
        }
    };

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                try {
                    // 1. Check if this is the initial admin
                    const isNewAdmin = await createInitialAdmin(
                        firebaseUser.uid,
                        firebaseUser.email || "",
                        firebaseUser.displayName || "Admin",
                        firebaseUser.photoURL || undefined
                    );

                    if (isNewAdmin) {
                        const profile = await getUserProfile(firebaseUser.uid);
                        setUserProfile(profile);
                        setIsPending(false);
                        setLoading(false);
                        return;
                    }

                    // 2. Check if user exists in users collection
                    const profile = await getUserProfile(firebaseUser.uid);

                    if (profile && profile.isApproved && profile.isActive) {
                        setUserProfile(profile);
                        setIsPending(false);
                        logAppAccess();
                    } else {
                        // Profile missing or inactive
                        setUserProfile(null);

                        // 3. pending check
                        const pending = await isPendingUser(firebaseUser.uid);

                        if (pending) {
                            setIsPending(true);
                        } else if (!profile) {
                            // 4. NEW USER: Check System Settings
                            const settings = await getSystemSettings();

                            if (settings && !settings.allowNewRegistrations) {
                                await firebaseSignOut(auth);
                                alert("Registrations are disabled.");
                                return;
                            }

                            if (settings && !settings.requireApproval) {
                                // Auto-register
                                await autoRegisterUser(
                                    firebaseUser.uid,
                                    firebaseUser.email || "",
                                    firebaseUser.displayName || "User",
                                    firebaseUser.photoURL || undefined
                                );
                                // Login immediately
                                const newProfile = await getUserProfile(firebaseUser.uid);
                                if (newProfile) {
                                    setUserProfile(newProfile);
                                    setIsPending(false);
                                    logAppAccess();
                                }
                            } else {
                                // Default: Create Pending
                                await createPendingUser(
                                    firebaseUser.uid,
                                    firebaseUser.email || "",
                                    firebaseUser.displayName || "Unknown",
                                    firebaseUser.photoURL || undefined
                                );
                                setIsPending(true);
                            }
                        } else {
                            // Profile exists but inactive, and not pending
                            setIsPending(false);
                        }
                    }
                } catch (error) {
                    console.error("Error handling auth state:", error);
                }
            } else {
                setUser(null);
                setUserProfile(null);
                setIsPending(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userName = result.user.displayName || "User";
            success("Login Successful", `Welcome back, ${userName}!`);
        } catch (error) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUserProfile(null);
            setIsPending(false);
            info("Signed Out", "See you again soon!");
        } catch (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    };

    const hasRole = (roles: UserRole | UserRole[]): boolean => {
        if (!userProfile) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(userProfile.role);
    };

    const isAdmin = userProfile?.role === "admin";

    const checkAuth = (): boolean => {
        if (!user) {
            loginRequired();
            return false;
        }
        return true;
    };

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            isPending,
            signInWithGoogle,
            signOut,
            refreshUserProfile,
            hasRole,
            isAdmin,
            checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
};

