import { MaintenanceRecord } from "../types";
import { getSystemSettings } from "./systemService";
import { decodeSecret } from "../lib/obfuscate";

/**
 * Telegram Service for sending notifications via Telegram Bot API
 */
export const telegramService = {
    /**
     * Send a beautiful HTML formatted message or Image when a PM task is completed
     */
    async sendPMCompletionNotification(record: MaintenanceRecord, imageBase64?: string) {
        try {
            const settings = await getSystemSettings();
            const botToken = decodeSecret(settings?.telegramBotToken || "");
            const chatId = decodeSecret(settings?.telegramChatId || "");

            // If image is provided, we send a short caption instead of the full HTML
            const htmlMessage = imageBase64 
                ? `<b>🔹 รหัสเครื่อง:</b> ${record.machineCode || '-'}\n<b>🔹 ชื่อเครื่องจักร:</b> ${record.machineName}` 
                : this.createPMHtmlMessage(record);

            const response = await fetch('/api/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: htmlMessage,
                    image: imageBase64,
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

        // Filter only completed items (checked)
        const completedChecklist = record.checklist?.filter(item => item.completed) || [];
        
        let checklistText = '<i>ไม่มีรายการตรวจสอบที่ดำเนินการ</i>';
        if (completedChecklist.length > 0) {
            checklistText = completedChecklist
                .map(item => `✓ <b>${item.item}</b>${item.value ? ' 👉 <i>' + item.value + '</i>' : ''}`)
                .join('\n');
        }

        const maintenanceType = record.type === 'preventive' ? 'บำรุงรักษาเชิงป้องกัน' :
            record.type === 'corrective' ? 'ซ่อมบำรุงแก้ไข' : 'การบำรุงรักษา';

        const locationText = record.Location || record.location || 'ไม่ระบุ';
        const machineCodeText = record.machineCode || '-';

        // Build the modern LINE-style HTML message (using standard fonts instead of monospace)
        return `
<b>🔹 รหัสเครื่อง:</b> ${machineCodeText}
<b>🔹 ชื่อเครื่องจักร:</b> ${record.machineName}
<b>📝 ชื่องาน:</b> <i>${record.description || "PM: Motor"}</i>
<b>👤 ช่าง:</b> <i>${record.technician}</i>

━━━━━━━━━━━━━━━━━━━

📋 <b>ข้อมูลทั่วไป</b>
<blockquote><b>ประเภท:</b> <i>${maintenanceType}</i>
<b>วันที่:</b> <i>${dateStr}</i>
<b>สถานที่:</b> <i>${locationText}</i></blockquote>

✓ <b>รายการตรวจสอบ</b>
<blockquote>${checklistText}</blockquote>

━━━━━━━━━━━━━━━━━━━
✅ <b>สถานะ:</b> เสร็จสิ้น
        `.trim();
    }
};
