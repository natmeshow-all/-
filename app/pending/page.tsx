"use client";

import React from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useAuth } from "../contexts/AuthContext";
import { ClockIcon, UserIcon } from "../components/ui/Icons";

export default function PendingApprovalPage() {
    const { user, isPending, signOut } = useAuth();

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 flex items-center justify-center min-h-[70vh]">
                <div className="card p-8 max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-accent-yellow/20 flex items-center justify-center">
                        <ClockIcon size={40} className="text-accent-yellow" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">
                            รอการอนุมัติ
                        </h1>
                        <p className="text-text-muted">
                            บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
                        </p>
                    </div>

                    {user && (
                        <div className="flex items-center gap-3 p-4 bg-bg-tertiary rounded-xl">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || "User"}
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

                    <div className="p-4 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
                        <p className="text-sm text-accent-blue">
                            💡 กรุณารอสักครู่ ผู้ดูแลระบบจะตรวจสอบและอนุมัติบัญชีของคุณโดยเร็ว
                        </p>
                    </div>

                    <button
                        onClick={signOut}
                        className="w-full py-3 rounded-xl bg-white/5 text-text-primary font-bold hover:bg-white/10 transition-colors"
                    >
                        ออกจากระบบ
                    </button>
                </div>
            </main>

            <MobileNav />
        </div>
    );
}
