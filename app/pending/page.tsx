"use client";

import React from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useAuth } from "../contexts/AuthContext";
import { ClockIcon, UserIcon } from "../components/ui/Icons";
import { useLanguage } from "../contexts/LanguageContext";

export default function PendingApprovalPage() {
    const { user, isPending, signOut } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 flex items-center justify-center min-h-[70vh]">
                <div className="card p-8 max-w-md w-full text-center space-y-6 overflow-hidden">
                    <div className="w-20 h-20 mx-auto rounded-full bg-accent-yellow/20 flex items-center justify-center animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                        <ClockIcon size={40} className="text-accent-yellow animate-pulse" />
                    </div>

                    <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">{t("userPendingApprovalTitle")}</h1>
                        <p className="text-text-muted mb-8">{t("userPendingApprovalDesc")}</p>
                    </div>

                    {user && (
                        <div className="flex items-center gap-3 p-4 bg-bg-tertiary rounded-xl animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || "User"}
                                    className="w-12 h-12 rounded-full ring-2 ring-accent-yellow/20"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-accent-purple/20 flex items-center justify-center ring-2 ring-accent-purple/20">
                                    <UserIcon size={24} className="text-accent-purple" />
                                </div>
                            )}
                            <div className="text-left">
                                <p className="font-bold text-text-primary">{user.displayName}</p>
                                <p className="text-xs text-text-muted">{user.email}</p>
                            </div>
                        </div>
                    )}

                    <div className="p-4 bg-accent-blue/10 rounded-xl border border-accent-blue/20 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                        <p className="text-sm text-accent-blue flex items-center justify-center gap-2">
                            <span className="animate-pulse">💡</span> {t("msgWaitApproval")}
                        </p>
                    </div>

                    <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                        <button
                            onClick={signOut}
                            className="w-full py-3 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 active:scale-[0.98] transition-all"
                        >
                            {t("actionSignOut")}
                        </button>
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    );
}
