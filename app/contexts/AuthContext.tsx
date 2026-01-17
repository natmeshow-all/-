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
    createInitialAdmin
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
    const { loginRequired } = useToast();
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
                        // Fetch the newly created admin profile
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
                    } else {
                        setUserProfile(null);

                        // 3. Check if already pending
                        const pending = await isPendingUser(firebaseUser.uid);

                        if (!pending && !profile) {
                            // 4. Create pending user request
                            await createPendingUser(
                                firebaseUser.uid,
                                firebaseUser.email || "",
                                firebaseUser.displayName || "Unknown",
                                firebaseUser.photoURL || undefined
                            );
                            setIsPending(true);
                        } else {
                            setIsPending(pending);
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
            await signInWithPopup(auth, googleProvider);
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

