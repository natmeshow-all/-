"use client";

import React, { useState, useEffect } from "react";
import { SystemSettings } from "../../types";
import { getSystemSettings, updateSystemSettings, exportDataForBackup, logAuditEvent } from "../../lib/firebaseService";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
    SettingsIcon,
    DownloadIcon,
    BellIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
    BoxIcon,
    InfoIcon
} from "../ui/Icons";
import { encodeSecret, decodeSecret } from "../../lib/obfuscate";

export default function SystemSettingsTab() {
    const { language } = useLanguage();
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [testingTelegram, setTestingTelegram] = useState(false);
    const [testingLine, setTestingLine] = useState(false);

    // Local state for text inputs to avoid too many writes
    const [announcementMsg, setAnnouncementMsg] = useState("");
    const [announcementMsgEn, setAnnouncementMsgEn] = useState("");
    const [retentionDays, setRetentionDays] = useState(365);
    const [telegramBotToken, setTelegramBotToken] = useState("");
    const [telegramChatId, setTelegramChatId] = useState("");
    const [lineChannelAccessToken, setLineChannelAccessToken] = useState("");
    const [lineTargetId, setLineTargetId] = useState("");

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings) {
            setAnnouncementMsg(settings.announcement?.message || "");
            setAnnouncementMsgEn(settings.announcement?.messageEn || "");
            setRetentionDays(settings.dataRetentionDays || 365);
            setTelegramBotToken(decodeSecret(settings.telegramBotToken || ""));
            setTelegramChatId(decodeSecret(settings.telegramChatId || ""));
            setLineChannelAccessToken(decodeSecret(settings.lineChannelAccessToken || ""));
            setLineTargetId(decodeSecret(settings.lineTargetId || ""));
        }
    }, [settings]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await getSystemSettings();
            setSettings(data);
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key: keyof SystemSettings) => {
        if (!settings) return;

        try {
            setSaving(true);
            const newValue = !settings[key];
            await updateSystemSettings({ [key]: newValue });
            setSettings(prev => prev ? { ...prev, [key]: newValue } : prev);

            // Log the change
            if (userProfile) {
                await logAuditEvent(
                    "settings_change",
                    userProfile.uid,
                    userProfile.displayName,
                    userProfile.role,
                    undefined,
                    key,
                    `Changed ${key} to ${newValue}`
                );
            }

            showToast('success', language === 'th' ? 'บันทึกการตั้งค่าแล้ว' : 'Settings saved');
        } catch (error) {
            console.error("Error updating settings:", error);
            showToast('error', language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleExportData = async () => {
        try {
            setExporting(true);
            const data = await exportDataForBackup();

            // Log the export
            if (userProfile) {
                await logAuditEvent(
                    "data_export",
                    userProfile.uid,
                    userProfile.displayName,
                    userProfile.role,
                    undefined,
                    "Full Backup",
                    `Exported ${data.machines.length} machines, ${data.parts.length} parts, ${data.maintenanceRecords.length} records`
                );
            }

            // Download as JSON
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `backup_${data.exportDate.split('T')[0]}.json`;
            a.click();

            showToast('success', language === 'th' ? 'Export สำเร็จ' : 'Export completed');
        } catch (error) {
            console.error("Error exporting data:", error);
            showToast('error', language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred');
        } finally {
            setExporting(false);
        }
    };

    const handleSaveAnnouncement = async () => {
        if (!settings) return;
        try {
            setSaving(true);

            const newAnnouncement = {
                enabled: settings.announcement?.enabled || false,
                message: announcementMsg,
                messageEn: announcementMsgEn, // Use manual input only
                level: settings.announcement?.level || 'info'
            };
            
            // @ts-ignore - Partial update
            await updateSystemSettings({ announcement: newAnnouncement });
            setSettings(prev => prev ? { ...prev, announcement: newAnnouncement } : prev);
            
            showToast('success', language === 'th' ? 'บันทึกประกาศแล้ว' : 'Announcement saved');
        } catch (error) {
            console.error("Error saving announcement:", error);
            showToast('error', language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveRetention = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await updateSystemSettings({ dataRetentionDays: retentionDays });
            setSettings(prev => prev ? { ...prev, dataRetentionDays: retentionDays } : prev);
            showToast('success', language === 'th' ? 'บันทึกการตั้งค่าแล้ว' : 'Settings saved');
        } catch (error) {
            console.error("Error saving retention:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveTelegramKeys = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            const obfuscatedToken = encodeSecret(telegramBotToken);
            const obfuscatedChatId = encodeSecret(telegramChatId);
            
            await updateSystemSettings({ 
                telegramBotToken: obfuscatedToken,
                telegramChatId: obfuscatedChatId
            });
            
            setSettings(prev => prev ? { ...prev, telegramBotToken: obfuscatedToken, telegramChatId: obfuscatedChatId } : prev);
            showToast('success', language === 'th' ? 'บันทึกข้อมูล Telegram แล้ว' : 'Telegram keys saved');
        } catch (error) {
            console.error("Error saving Telegram keys:", error);
            showToast('error', language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleTestTelegram = async () => {
        if (!telegramBotToken || !telegramChatId) {
            showToast('error', language === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนทดสอบ' : 'Please fill in all API keys before testing');
            return;
        }
        
        try {
            setTestingTelegram(true);
            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "🧪 <b>ทดสอบระบบแจ้งเตือน</b>\n\nการเชื่อมต่อ Telegram API สำเร็จ!",
                    parseMode: 'HTML',
                    botToken: telegramBotToken,
                    chatId: telegramChatId
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Test Telegram failed:", data);
                showToast('error', `Error: ${data.description || data.error || 'Failed to send'}`);
            } else {
                showToast('success', language === 'th' ? 'ส่งข้อความทดสอบสำเร็จ!' : 'Test message sent successfully!');
            }
        } catch (error: any) {
            console.error("Error testing Telegram:", error);
            showToast('error', `Error: ${error.message || 'Unknown error'}`);
        } finally {
            setTestingTelegram(false);
        }
    };

    const handleSaveLineKeys = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            const obfuscatedToken = encodeSecret(lineChannelAccessToken);
            const obfuscatedTargetId = encodeSecret(lineTargetId);
            
            await updateSystemSettings({ 
                lineChannelAccessToken: obfuscatedToken,
                lineTargetId: obfuscatedTargetId
            });
            
            setSettings(prev => prev ? { ...prev, lineChannelAccessToken: obfuscatedToken, lineTargetId: obfuscatedTargetId } : prev);
            showToast('success', language === 'th' ? 'บันทึกข้อมูล LINE แล้ว' : 'LINE keys saved');
        } catch (error) {
            console.error("Error saving LINE keys:", error);
            showToast('error', language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleTestLine = async () => {
        if (!lineChannelAccessToken || !lineTargetId) {
            showToast('error', language === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนทดสอบ' : 'Please fill in all API keys before testing');
            return;
        }
        
        try {
            setTestingLine(true);
            const response = await fetch('/api/line', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ type: "text", text: "🧪 ทดสอบระบบแจ้งเตือนผ่าน LINE\nการเชื่อมต่อสำเร็จ!" }],
                    channelAccessToken: lineChannelAccessToken,
                    targetId: lineTargetId
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Test LINE failed:", data);
                showToast('error', `Error: ${data.message || data.error || 'Failed to send'}`);
            } else {
                showToast('success', language === 'th' ? 'ส่งข้อความทดสอบสำเร็จ!' : 'Test message sent successfully!');
            }
        } catch (error: any) {
            console.error("Error testing LINE:", error);
            showToast('error', `Error: ${error.message || 'Unknown error'}`);
        } finally {
            setTestingLine(false);
        }
    };

    const handleAnnouncementToggle = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            const current = settings.announcement || { enabled: false, message: "", level: 'info' };
            const newAnnouncement = { ...current, enabled: !current.enabled };
            
            // @ts-ignore
            await updateSystemSettings({ announcement: newAnnouncement });
            setSettings(prev => prev ? { ...prev, announcement: newAnnouncement } : prev);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <SettingsIcon size={20} className="text-primary" />
                    {language === 'th' ? 'ตั้งค่าระบบ' : 'System Settings'}
                </h2>
                <p className="text-xs text-text-muted">
                    {language === 'th' ? 'จัดการการตั้งค่าและสำรองข้อมูล' : 'Manage settings and backups'}
                </p>
            </div>

            {/* Settings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Security Settings */}
                <div className="card p-5 bg-bg-secondary/30 border-white/5 space-y-4">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <ShieldCheckIcon size={16} className="text-accent-blue" />
                        {language === 'th' ? 'ความปลอดภัย' : 'Security'}
                    </h3>

                    <SettingToggle
                        label={language === 'th' ? 'โหมดซ่อมบำรุง' : 'Maintenance Mode'}
                        description={language === 'th' ? 'ปิดการเข้าถึงระบบชั่วคราว' : 'Temporarily disable system access'}
                        checked={settings?.maintenanceMode || false}
                        onChange={() => handleToggle('maintenanceMode')}
                        disabled={saving}
                    />

                    <SettingToggle
                        label={language === 'th' ? 'อนุญาตลงทะเบียนใหม่' : 'Allow New Registrations'}
                        description={language === 'th' ? 'เปิด/ปิดการลงทะเบียนผู้ใช้ใหม่' : 'Enable/disable new user signups'}
                        checked={settings?.allowNewRegistrations || false}
                        onChange={() => handleToggle('allowNewRegistrations')}
                        disabled={saving}
                    />

                    <SettingToggle
                        label={language === 'th' ? 'ต้องอนุมัติผู้ใช้ใหม่' : 'Require User Approval'}
                        description={language === 'th' ? 'ผู้ใช้ใหม่ต้องได้รับอนุมัติก่อนใช้งาน' : 'New users must be approved first'}
                        checked={settings?.requireApproval || false}
                        onChange={() => handleToggle('requireApproval')}
                        disabled={saving}
                    />
                </div>

                {/* Notification Settings */}
                <div className="card p-5 bg-bg-secondary/30 border-white/5 space-y-4">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <BellIcon size={16} className="text-accent-yellow" />
                        {language === 'th' ? 'การแจ้งเตือน & ข้อมูล' : 'Notifications & Data'}
                    </h3>

                    <SettingToggle
                        label={language === 'th' ? 'ซ่อนข้อมูลแผนก UT' : 'Hide UT Data'}
                        description={language === 'th' ? 'ซ่อนข้อมูลเครื่องจักร อะไหล่ และงาน PM ของแผนก UT ทั้งหมด' : 'Hide all machines, parts, and PM tasks related to UT'}
                        checked={settings?.hideUtData || false}
                        onChange={() => handleToggle('hideUtData')}
                        disabled={saving}
                    />

                    <SettingToggle
                        label={language === 'th' ? 'เปิดการแจ้งเตือน' : 'Enable Notifications'}
                        description={language === 'th' ? 'แจ้งเตือนเมื่อมีงาน PM ถึงกำหนด' : 'Notify when PM tasks are due'}
                        checked={settings?.notificationsEnabled || false}
                        onChange={() => handleToggle('notificationsEnabled')}
                        disabled={saving}
                    />

                    <SettingToggle
                        label={language === 'th' ? 'เปิดการแจ้งเตือน LINE' : 'Enable LINE Notifications'}
                        description={language === 'th' ? 'แจ้งเตือนเมื่อปิดงาน PM ผ่าน LINE OA' : 'Notify via LINE OA on PM completion'}
                        checked={settings?.lineNotificationsEnabled ?? true}
                        onChange={() => handleToggle('lineNotificationsEnabled')}
                        disabled={saving}
                    />

                    {/* LINE API Settings */}
                    <div className="pt-2 pb-4 border-b border-white/5 space-y-3">
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-1">
                                {language === 'th' ? 'LINE Channel Access Token' : 'LINE Channel Access Token'}
                            </label>
                            <input
                                type="password"
                                value={lineChannelAccessToken}
                                onChange={(e) => setLineChannelAccessToken(e.target.value)}
                                placeholder="Long-lived channel access token"
                                className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-1">
                                {language === 'th' ? 'LINE Target ID (Group ID หรือ User ID)' : 'LINE Target ID (Group or User ID)'}
                            </label>
                            <input
                                type="password"
                                value={lineTargetId}
                                onChange={(e) => setLineTargetId(e.target.value)}
                                placeholder="e.g. C1234567890abcdef..."
                                className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-green"
                            />
                        </div>
                        <div className="flex justify-end pt-1 gap-2">
                            <button
                                onClick={handleTestLine}
                                disabled={saving || testingLine}
                                className="px-4 py-1.5 bg-bg-tertiary hover:bg-white/5 text-text-secondary rounded-md text-sm font-medium transition-colors border border-white/10 disabled:opacity-50"
                            >
                                {testingLine ? (language === 'th' ? 'กำลังทดสอบ...' : 'Testing...') : (language === 'th' ? 'ทดสอบส่งข้อความ' : 'Test Connection')}
                            </button>
                            <button
                                onClick={handleSaveLineKeys}
                                disabled={saving || testingLine}
                                className="px-4 py-1.5 bg-accent-green/10 hover:bg-accent-green/20 text-accent-green rounded-md text-sm font-medium transition-colors border border-accent-green/20 disabled:opacity-50"
                            >
                                {language === 'th' ? 'บันทึกข้อมูล LINE' : 'Save LINE Keys'}
                            </button>
                        </div>
                    </div>

                    <SettingToggle
                        label={language === 'th' ? 'เปิดการแจ้งเตือน Telegram' : 'Enable Telegram Notifications'}
                        description={language === 'th' ? 'แจ้งเตือนเมื่อปิดงาน PM ผ่าน Telegram' : 'Notify via Telegram on PM completion'}
                        checked={settings?.telegramNotificationsEnabled ?? false}
                        onChange={() => handleToggle('telegramNotificationsEnabled')}
                        disabled={saving}
                    />

                    {/* Telegram API Settings */}
                    <div className="pt-2 border-t border-white/5 space-y-3">
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-1">
                                {language === 'th' ? 'Telegram Bot Token' : 'Telegram Bot Token'}
                            </label>
                            <input
                                type="password"
                                value={telegramBotToken}
                                onChange={(e) => setTelegramBotToken(e.target.value)}
                                placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                                className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-text-primary block mb-1">
                                {language === 'th' ? 'Telegram Chat ID' : 'Telegram Chat ID'}
                            </label>
                            <input
                                type="password"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder="e.g. -100123456789"
                                className="w-full bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
                            />
                        </div>
                        <div className="flex justify-end pt-1 gap-2">
                            <button
                                onClick={handleTestTelegram}
                                disabled={saving || testingTelegram}
                                className="px-4 py-1.5 bg-bg-tertiary hover:bg-white/5 text-text-secondary rounded-md text-sm font-medium transition-colors border border-white/10 disabled:opacity-50"
                            >
                                {testingTelegram ? (language === 'th' ? 'กำลังทดสอบ...' : 'Testing...') : (language === 'th' ? 'ทดสอบส่งข้อความ' : 'Test Connection')}
                            </button>
                            <button
                                onClick={handleSaveTelegramKeys}
                                disabled={saving || testingTelegram}
                                className="px-4 py-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan rounded-md text-sm font-medium transition-colors border border-accent-cyan/20 disabled:opacity-50"
                            >
                                {language === 'th' ? 'บันทึกข้อมูล API' : 'Save API Keys'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-2">
                        <label className="text-sm font-medium text-text-primary block">
                            {language === 'th' ? 'เก็บข้อมูลย้อนหลัง (วัน)' : 'Data Retention (Days)'}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={retentionDays}
                                onChange={(e) => setRetentionDays(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                            />
                            <button
                                onClick={handleSaveRetention}
                                disabled={saving || retentionDays === settings?.dataRetentionDays}
                                className="px-3 py-2 bg-primary/20 text-primary rounded-lg text-xs font-bold hover:bg-primary/30 disabled:opacity-50"
                            >
                                {language === 'th' ? 'บันทึก' : 'Save'}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                        <p className="text-xs text-text-muted">
                            {language === 'th' ? 'สำรองข้อมูลล่าสุด:' : 'Last Backup:'}
                            {settings?.lastBackupDate ? (
                                <span className="text-text-primary ml-1">
                                    {new Date(settings.lastBackupDate).toLocaleDateString()}
                                </span>
                            ) : (
                                <span className="text-text-muted ml-1">-</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={handleExportData}
                        disabled={exporting}
                        className="w-full px-4 py-2 rounded-lg bg-accent-green text-white text-sm font-bold hover:bg-accent-green/80 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {exporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {language === 'th' ? 'กำลัง Export...' : 'Exporting...'}
                            </>
                        ) : (
                            <>
                                <DownloadIcon size={16} />
                                {language === 'th' ? 'Export ข้อมูลทั้งหมด' : 'Export All Data'}
                            </>
                        )}
                    </button>
                </div>

                {/* Announcement Settings */}
                <div className="card p-5 bg-bg-secondary/30 border-white/5 space-y-4 md:col-span-2">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <InfoIcon size={16} className="text-accent-blue" />
                        {language === 'th' ? 'ประกาศระบบ (Announcement)' : 'System Announcement'}
                    </h3>

                    <SettingToggle
                        label={language === 'th' ? 'เปิดใช้งานประกาศ' : 'Enable Announcement'}
                        description={language === 'th' ? 'แสดงแถบข้อความประกาศที่ด้านบนของทุกหน้า' : 'Show announcement banner on top of all pages'}
                        checked={settings?.announcement?.enabled || false}
                        onChange={handleAnnouncementToggle}
                        disabled={saving}
                    />

                    {settings?.announcement?.enabled && (
                        <div className="space-y-3 pl-4 border-l-2 border-white/10 ml-1">
                            <div>
                                <label className="text-xs text-text-muted block mb-1">
                                    {language === 'th' ? 'ข้อความประกาศ (TH)' : 'Message (TH)'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={announcementMsg}
                                        onChange={(e) => setAnnouncementMsg(e.target.value)}
                                        placeholder={language === 'th' ? 'ใส่ข้อความประกาศที่นี่...' : 'Enter announcement message...'}
                                        className="flex-1 bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-text-muted block mb-1">
                                    {language === 'th' ? 'ข้อความประกาศ (EN)' : 'Message (EN)'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={announcementMsgEn}
                                        onChange={(e) => setAnnouncementMsgEn(e.target.value)}
                                        placeholder={language === 'th' ? 'คำแปลภาษาอังกฤษ (เว้นว่างเพื่อแปลอัตโนมัติ)' : 'English translation (leave empty to auto-translate)'}
                                        className="flex-1 bg-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                                    />
                                    <button
                                        onClick={handleSaveAnnouncement}
                                        disabled={saving || (announcementMsg === settings?.announcement?.message && announcementMsgEn === settings?.announcement?.messageEn)}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/80 disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {language === 'th' ? 'บันทึกข้อความ' : 'Save Message'}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs text-text-muted block mb-1">
                                    {language === 'th' ? 'ระดับความสำคัญ' : 'Level'}
                                </label>
                                <div className="flex gap-2">
                                    {(['info', 'warning', 'urgent'] as const).map((level) => (
                                        <button
                                            key={level}
                                            onClick={async () => {
                                                if (!settings) return;
                                                const newAnnouncement = { ...settings.announcement, enabled: true, message: announcementMsg, level };
                                                // @ts-ignore
                                                await updateSystemSettings({ announcement: newAnnouncement });
                                                setSettings(prev => prev ? { ...prev, announcement: newAnnouncement } : prev);
                                            }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                                                settings?.announcement?.level === level 
                                                    ? level === 'urgent' ? 'bg-red-500/20 border-red-500 text-red-500' 
                                                    : level === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                                    : 'bg-blue-500/20 border-blue-500 text-blue-500'
                                                    : 'bg-transparent border-white/10 text-text-muted hover:bg-white/5'
                                            }`}
                                        >
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SettingToggle({
    label,
    description,
    checked,
    onChange,
    disabled
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
    disabled: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-medium text-text-primary">{label}</p>
                <p className="text-[10px] text-text-muted">{description}</p>
            </div>
            <button
                onClick={onChange}
                disabled={disabled}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-accent-green' : 'bg-white/10'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${checked ? 'left-6' : 'left-1'
                        }`}
                />
            </button>
        </div>
    );
}
