"use client";

import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { UserIcon, ClockIcon } from "../components/ui/Icons";
import { useLanguage } from "../contexts/LanguageContext";

export default function RegisterPage() {
    const { user, userProfile, isPending, loading } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push("/"); // Redirect if not logged in
        } else if (userProfile && userProfile.isApproved) {
            router.push("/"); // Redirect if already approved
        }
    }, [user, userProfile, loading, router]);

    // Show pending approval page
    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
                <div className="w-full max-w-md bg-bg-secondary p-6 sm:p-8 rounded-2xl border border-border-light shadow-2xl relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-yellow/10 rounded-full blur-3xl -z-10 -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 -ml-16 -mb-16" />

                    <div className="text-center">
                        <div className="w-20 h-20 bg-accent-yellow/20 rounded-full mx-auto flex items-center justify-center mb-6">
                            <ClockIcon size={40} className="text-accent-yellow" />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">{t("userRegisterTitle")}</h1>
                        <p className="text-text-muted text-sm mb-6">
                            {t("userRegisterSubtitle")}
                        </p>

                        {user && (
                            <div className="flex items-center gap-3 p-4 bg-bg-tertiary rounded-xl mb-6">
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || t("altUser")}
                                        className="w-12 h-12 rounded-full"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center">
                                        <UserIcon size={24} className="text-accent-purple" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <p className="font-bold text-text-primary">{user.displayName}</p>
                                    <p className="text-xs text-text-muted">{user.email}</p>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-accent-blue/10 rounded-xl border border-accent-blue/20 mb-6">
                            <p className="text-sm text-accent-blue">
                                💡 {t("msgWaitApproval")}
                            </p>
                        </div>

                        <button
                            onClick={() => router.push("/")}
                            className="w-full py-3 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 transition-colors"
                        >
                            {t("actionGoToDashboard")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return null; // Prevent flash while redirecting
}

