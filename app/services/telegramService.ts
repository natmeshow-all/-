import { MaintenanceRecord } from "../types";
import { getSystemSettings } from "./systemService";
import { decodeSecret } from "../lib/obfuscate";

/**
 * Telegram Service for sending notifications via Telegram Bot API
 */
export const telegramService = {
    /**
     * Send a beautiful HTML formatted message when a PM task is completed
     */
    async sendPMCompletionNotification(record: MaintenanceRecord) {
        try {
            const settings = await getSystemSettings();
            const botToken = decodeSecret(settings?.telegramBotToken || "");
            const chatId = decodeSecret(settings?.telegramChatId || "");

            const htmlMessage = this.createPMHtmlMessage(record);

            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: htmlMessage,
                    parseMode: 'HTML',
                    botToken,
                    chatId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 500 && errorData.error === 'Telegram API setup incomplete') {
                    console.warn('Telegram setup incomplete: Please add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to your .env.local file.');
                } else {
                    console.error('Failed to send Telegram notification:', errorData);
                }
            } else {
                console.log('✅ Telegram notification sent successfully!');
            }
        } catch (error) {
            console.error('Error in Telegram sendPMCompletionNotification:', error);
        }
    },

    /**
     * Create an HTML formatted string for PM completion
     */
    createPMHtmlMessage(record: MaintenanceRecord): string {
        const dateStr = record.date ? new Date(record.date).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : '-';

        // Build checklist text
        let checklistText = '<i>ไม่มีรายการตรวจสอบ</i>';
        if (record.checklist && record.checklist.length > 0) {
            checklistText = record.checklist
                .map(item => `${item.completed ? '✅' : '❌'} <b>${item.item}</b>${item.value ? ': <code>' + item.value + '</code>' : ''}`)
                .join('\n');
        }

        const locationText = record.Location || record.location || 'ไม่ระบุ';

        // Build the modern HTML message
        return `
✨ <b>รายงานผลการปิดงาน PM</b>
━━━━━━━━━━━━━━━━━━━━

<b>🏢 ข้อมูลเครื่องจักร:</b>
<blockquote><b>รหัส/ชื่อ:</b> <code>${record.machineName}</code>
<b>ชื่องาน:</b> ${record.description || "PM Maintenance"}
<b>สถานที่:</b> ${locationText}</blockquote>

<b>👨‍🔧 ข้อมูลการปฏิบัติงาน:</b>
<blockquote><b>ผู้ตรวจสอบ:</b> ${record.technician}
<b>วันที่ดำเนินการ:</b> ${dateStr}</blockquote>

<b>📝 สรุปรายการตรวจสอบ:</b>
<blockquote>${checklistText}</blockquote>

━━━━━━━━━━━━━━━━━━━━
✅ <b>สถานะ:</b> บันทึกข้อมูลเข้าระบบเรียบร้อย
        `.trim();
    }
};
