"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useRouter } from "next/navigation";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User as UserIcon, CheckIcon } from "../components/ui/Icons";

export default function RegisterPage() {
    const { user, userData } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        position: "",
        role: "technician", // Default role
    });

    useEffect(() => {
        if (!user) {
            router.push("/"); // Redirect if not logged in
        } else if (userData) {
            router.push("/"); // Redirect if already registered
        } else if (user.displayName) {
            setFormData(prev => ({ ...prev, name: user.displayName || "" }));
        }
    }, [user, userData, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setIsSubmitting(true);
            await setDoc(doc(db, "users", user.uid), {
                id: user.uid,
                name: formData.name,
                email: user.email,
                role: formData.role,
                phoneNumber: formData.phoneNumber,
                position: formData.position,
                photoURL: user.photoURL,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            // Force reload to update context or just redirect
            window.location.href = "/";
        } catch (error) {
            console.error("Error registering:", error);
            alert("Failed to register. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user || userData) return null; // Prevent flash

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
            <div className="w-full max-w-md bg-bg-secondary p-6 sm:p-8 rounded-2xl border border-border-light shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/10 rounded-full blur-3xl -z-10 -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 -ml-16 -mb-16" />

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-bg-tertiary rounded-full mx-auto flex items-center justify-center mb-4 relative">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <UserIcon size={40} className="text-primary" />
                        )}
                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-accent-green rounded-full border-4 border-bg-secondary flex items-center justify-center">
                            <CheckIcon size={12} className="text-bg-secondary" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary">Welcome, {user.displayName?.split(" ")[0]}!</h1>
                    <p className="text-text-muted mt-2 text-sm">Please complete your registration to continue.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Full Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="label">Position / Job Title</label>
                        <input
                            type="text"
                            required
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            className="input"
                            placeholder="e.g. Senior Technician"
                        />
                    </div>

                    <div>
                        <label className="label">Phone Number (Optional)</label>
                        <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="input"
                            placeholder="08X-XXX-XXXX"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full btn btn-primary py-3 text-base flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                            ) : (
                                "Complete Registration"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
