"use client";

import React, { useState, useEffect } from "react";
import { SystemSettings } from "../../types";
import { subscribeToSystemSettings, updateSystemSettings, logAuditEvent } from "../../lib/firebaseService";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { BellIcon, CheckCircleIcon, ShieldCheckIcon } from "../ui/Icons";

// Custom Brand Icons
export const LineIcon: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.084.495.234l2.467 3.348V8.108c0-.345.28-.63.628-.63.349 0 .63.285.63.63v4.771h-.014zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
);

export const TelegramIcon: React.FC<{ className?: string; size?: number }> = ({ className = "", size = 20 }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
);

interface AdminNotificationControlProps {
    variant?: "full" | "compact";
    className?: string;
}

export default function AdminNotificationControl({
    variant = "full",
    className = ""
}: AdminNotificationControlProps) {
    const { isAdmin, userProfile } = useAuth();
    const { showToast } = useToast();
    const { language } = useLanguage();

    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToSystemSettings((data) => {
            setSettings(data);
        });
        return () => unsubscribe();
    }, []);

    if (!isAdmin) return null;

    const lineEnabled = settings?.lineNotificationsEnabled ?? true;
    const telegramEnabled = settings?.telegramNotificationsEnabled ?? false;

    const toggleNotification = async (channel: "line" | "telegram") => {
        if (!settings) return;

        const key = channel === "line" ? "lineNotificationsEnabled" : "telegramNotificationsEnabled";
        const currentVal = channel === "line" ? lineEnabled : telegramEnabled;
        const nextVal = !currentVal;

        try {
            setSavingKey(key);
            await updateSystemSettings({ [key]: nextVal });

            if (userProfile) {
                await logAuditEvent(
                    "settings_change",
                    userProfile.uid,
                    userProfile.displayName || "Admin",
                    userProfile.role,
                    undefined,
                    key,
                    `Admin ${nextVal ? "enabled" : "disabled"} ${channel.toUpperCase()} notifications`
                );
            }

            const channelName = channel === "line" ? "LINE" : "Telegram";
            const statusText = nextVal 
                ? (language === "th" ? `เปิดการส่งแจ้งเตือน ${channelName} แล้ว` : `${channelName} notifications enabled`)
                : (language === "th" ? `ปิดการส่งแจ้งเตือน ${channelName} แล้ว (งดส่งข้อความ)` : `${channelName} notifications muted/disabled`);

            showToast(nextVal ? "success" : "info", statusText);
        } catch (error) {
            console.error(`Error toggling ${channel} notification:`, error);
            showToast("error", language === "th" ? "เกิดข้อผิดพลาดในการบันทึก" : "Failed to update notification setting");
        } finally {
            setSavingKey(null);
        }
    };

    const toggleAll = async (targetState: boolean) => {
        if (!settings) return;

        try {
            setSavingKey("all");
            await updateSystemSettings({
                lineNotificationsEnabled: targetState,
                telegramNotificationsEnabled: targetState
            });

            if (userProfile) {
                await logAuditEvent(
                    "settings_change",
                    userProfile.uid,
                    userProfile.displayName || "Admin",
                    userProfile.role,
                    undefined,
                    "all_notifications",
                    `Admin ${targetState ? "enabled" : "muted"} all LINE and Telegram notifications`
                );
            }

            const msg = targetState
                ? (language === "th" ? "เปิดการแจ้งเตือนทั้งหมดแล้ว (LINE + Telegram)" : "All notifications enabled (LINE + Telegram)")
                : (language === "th" ? "ปิดการแจ้งเตือนทั้งหมดแล้ว (งดส่งข้อความใน LINE และ Telegram)" : "All notifications muted (No LINE or Telegram messages will be sent)");

            showToast(targetState ? "success" : "info", msg);
        } catch (error) {
            console.error("Error updating all notifications:", error);
            showToast("error", language === "th" ? "เกิดข้อผิดพลาด" : "Error updating settings");
        } finally {
            setSavingKey(null);
        }
    };

    // --- COMPACT VARIANT (for Schedule Page / Top Bars) ---
    if (variant === "compact") {
        return (
            <div className={`flex items-center gap-1.5 p-1 bg-bg-secondary/70 backdrop-blur-md border border-white/10 rounded-xl shadow-sm ${className}`}>
                <div className="flex items-center gap-1 px-2 text-[11px] font-bold text-text-muted select-none">
                    <BellIcon size={13} className={lineEnabled || telegramEnabled ? "text-accent-yellow animate-pulse" : "text-text-muted"} />
                    <span className="hidden sm:inline">แจ้งเตือน:</span>
                </div>

                {/* LINE Toggle Button */}
                <button
                    type="button"
                    onClick={() => toggleNotification("line")}
                    disabled={savingKey !== null}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:scale-95 disabled:opacity-50 ${
                        lineEnabled
                            ? "bg-[#06C755]/15 border-[#06C755]/40 text-[#06C755] hover:bg-[#06C755]/25 shadow-[0_0_10px_rgba(6,199,85,0.15)]"
                            : "bg-bg-tertiary border-white/10 text-text-muted hover:text-text-primary line-through opacity-70"
                    }`}
                    title={lineEnabled ? "คลิกเพื่อปิดแจ้งเตือน LINE" : "คลิกเพื่อเปิดแจ้งเตือน LINE"}
                >
                    <LineIcon size={14} className={lineEnabled ? "text-[#06C755]" : "text-text-muted"} />
                    <span>LINE {lineEnabled ? "เปิด" : "ปิด"}</span>
                </button>

                {/* Telegram Toggle Button */}
                <button
                    type="button"
                    onClick={() => toggleNotification("telegram")}
                    disabled={savingKey !== null}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border active:scale-95 disabled:opacity-50 ${
                        telegramEnabled
                            ? "bg-[#229ED9]/15 border-[#229ED9]/40 text-[#229ED9] hover:bg-[#229ED9]/25 shadow-[0_0_10px_rgba(34,158,217,0.15)]"
                            : "bg-bg-tertiary border-white/10 text-text-muted hover:text-text-primary line-through opacity-70"
                    }`}
                    title={telegramEnabled ? "คลิกเพื่อปิดแจ้งเตือน Telegram" : "คลิกเพื่อเปิดแจ้งเตือน Telegram"}
                >
                    <TelegramIcon size={14} className={telegramEnabled ? "text-[#229ED9]" : "text-text-muted"} />
                    <span>Telegram {telegramEnabled ? "เปิด" : "ปิด"}</span>
                </button>
            </div>
        );
    }

    // --- FULL VARIANT (for Admin Dashboard) ---
    const allMuted = !lineEnabled && !telegramEnabled;

    return (
        <div className={`card p-5 bg-gradient-to-br from-bg-secondary/70 via-bg-secondary/40 to-bg-tertiary/30 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl relative overflow-hidden ${className}`}>
            {/* Top Accent Glow */}
            <div className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                allMuted 
                    ? "bg-accent-orange/60 shadow-[0_0_12px_rgba(245,158,11,0.5)]" 
                    : "bg-gradient-to-r from-[#06C755] to-[#229ED9]"
            }`} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                        allMuted 
                            ? "bg-accent-orange/15 border-accent-orange/30 text-accent-orange" 
                            : "bg-accent-blue/15 border-accent-blue/30 text-accent-blue"
                    }`}>
                        <BellIcon size={20} className={allMuted ? "" : "animate-bounce"} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-text-primary">
                                {language === "th" ? "ควบคุมการแจ้งเตือนภายนอก" : "External Notifications Control"}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                                Admin Only
                            </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                            {language === "th"
                                ? "เปิด/ปิด การส่งข้อความแจ้งเตือนอัตโนมัติไปยังกลุ่ม LINE OA และ Telegram (เช่น ตอนปิดงาน PM หรือแจ้งซ่อม)"
                                : "Toggle automated notification delivery to LINE OA and Telegram channels"}
                        </p>
                    </div>
                </div>

                {/* Master Mute / Unmute Action */}
                <div className="flex items-center gap-2 shrink-0">
                    {allMuted ? (
                        <button
                            type="button"
                            onClick={() => toggleAll(true)}
                            disabled={savingKey !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/15 hover:bg-accent-green/25 text-accent-green border border-accent-green/30 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CheckCircleIcon size={14} />
                            <span>{language === "th" ? "เปิดแจ้งเตือนทั้งหมด" : "Unmute All"}</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => toggleAll(false)}
                            disabled={savingKey !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-orange/15 hover:bg-accent-orange/25 text-accent-orange border border-accent-orange/30 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                            <span>🔕 {language === "th" ? "ปิดแจ้งเตือนทั้งหมดชั่วคราว" : "Mute All"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Channel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* LINE Channel Control */}
                <div className={`p-4 rounded-xl border transition-all ${
                    lineEnabled
                        ? "bg-[#06C755]/5 border-[#06C755]/30 shadow-[0_0_20px_rgba(6,199,85,0.08)]"
                        : "bg-bg-tertiary/40 border-white/5 opacity-80"
                }`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                                lineEnabled
                                    ? "bg-[#06C755]/20 border-[#06C755]/40 text-[#06C755]"
                                    : "bg-white/5 border-white/10 text-text-muted"
                            }`}>
                                <LineIcon size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-text-primary">LINE Official Account</h4>
                                    <span className={`w-2 h-2 rounded-full ${lineEnabled ? "bg-[#06C755] animate-ping" : "bg-text-muted"}`} />
                                </div>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {lineEnabled
                                        ? (language === "th" ? "สถานะ: ส่งแจ้งเตือนปกติ" : "Status: Active & Sending")
                                        : (language === "th" ? "สถานะ: ปิดอยู่ (ไม่มีข้อความส่งเข้า LINE)" : "Status: Muted / Disabled")}
                                </p>
                            </div>
                        </div>

                        {/* Switch Button */}
                        <button
                            type="button"
                            onClick={() => toggleNotification("line")}
                            disabled={savingKey !== null}
                            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                lineEnabled ? "bg-[#06C755] border-[#06C755]" : "bg-bg-tertiary border-white/20"
                            }`}
                            style={{ width: "52px" }}
                            aria-label="Toggle LINE Notification"
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    lineEnabled ? "translate-x-6" : "translate-x-0.5"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Telegram Channel Control */}
                <div className={`p-4 rounded-xl border transition-all ${
                    telegramEnabled
                        ? "bg-[#229ED9]/5 border-[#229ED9]/30 shadow-[0_0_20px_rgba(34,158,217,0.08)]"
                        : "bg-bg-tertiary/40 border-white/5 opacity-80"
                }`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                                telegramEnabled
                                    ? "bg-[#229ED9]/20 border-[#229ED9]/40 text-[#229ED9]"
                                    : "bg-white/5 border-white/10 text-text-muted"
                            }`}>
                                <TelegramIcon size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-text-primary">Telegram Bot</h4>
                                    <span className={`w-2 h-2 rounded-full ${telegramEnabled ? "bg-[#229ED9] animate-ping" : "bg-text-muted"}`} />
                                </div>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {telegramEnabled
                                        ? (language === "th" ? "สถานะ: ส่งแจ้งเตือนปกติ" : "Status: Active & Sending")
                                        : (language === "th" ? "สถานะ: ปิดอยู่ (ไม่มีข้อความส่งเข้า Telegram)" : "Status: Muted / Disabled")}
                                </p>
                            </div>
                        </div>

                        {/* Switch Button */}
                        <button
                            type="button"
                            onClick={() => toggleNotification("telegram")}
                            disabled={savingKey !== null}
                            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                                telegramEnabled ? "bg-[#229ED9] border-[#229ED9]" : "bg-bg-tertiary border-white/20"
                            }`}
                            style={{ width: "52px" }}
                            aria-label="Toggle Telegram Notification"
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    telegramEnabled ? "translate-x-6" : "translate-x-0.5"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Helper notice */}
            {allMuted && (
                <div className="mt-3.5 p-2.5 rounded-lg bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs flex items-center gap-2">
                    <span className="font-bold">⚠️ ข้อควรทราบ:</span>
                    <span>ระบบถูกปิดการแจ้งเตือนทั้งหมดอยู่ การปิดงาน PM หรือบันทึกแจ้งซ่อมจะไม่ส่งข้อความเข้ากลุ่มใดๆ ทั้งสิ้น</span>
                </div>
            )}
        </div>
    );
}
