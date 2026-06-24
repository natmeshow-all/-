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

            if (!botToken || !chatId) {
                console.warn('Telegram API keys not configured in System Settings.');
                return;
            }

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
                .map(item => `${item.completed ? '✅' : '❌'} ${item.item}${item.value ? ': <code>' + item.value + '</code>' : ''}`)
                .join('\n');
        }

        // Determine maintenance type label
        const maintenanceType = record.type === 'preventive' ? 'บำรุงรักษาเชิงป้องกัน' :
            record.type === 'corrective' ? 'ซ่อมบำรุงแก้ไข' :
                'การบำรุงรักษา';

        const locationText = record.Location || record.location || 'ไม่ระบุ';

        // Build the HTML message
        return `
<b>🔧 แจ้งเตือนปิดงาน PM 🔧</b>

<b>🏭 เครื่องจักร:</b> <code>${record.machineName}</code>
<b>📝 ชื่องาน:</b> ${record.description || "PM Maintenance"}
<b>👤 ช่าง:</b> ${record.technician}
<b>📅 วันที่:</b> ${dateStr}

<b>📋 รายการตรวจสอบ:</b>
${checklistText}

📍 <b>Location:</b> ${locationText}
        `.trim();
    }
};
