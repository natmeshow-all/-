import { MaintenanceRecord } from "../types";
import { getSystemSettings } from "../lib/firebaseService";
import { decodeSecret } from "../lib/obfuscate";

/**
 * Line Service for sending notifications via Line OA
 */
export const lineService = {
    /**
     * Send a Line Flex Message Card when a PM task is completed
     */
    async sendPMCompletionNotification(record: MaintenanceRecord) {
        try {
            // Get settings for dynamic tokens if available
            const settings = await getSystemSettings();
            let channelAccessToken = undefined;
            let targetId = undefined;
            
            if (settings && settings.lineChannelAccessToken && settings.lineTargetId) {
                channelAccessToken = decodeSecret(settings.lineChannelAccessToken);
                targetId = decodeSecret(settings.lineTargetId);
            }

            const flexMessage = this.createPMFlexMessage(record);

            const response = await fetch('/api/line', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [flexMessage],
                    channelAccessToken,
                    targetId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 500 && errorData.error === 'Messaging API setup incomplete') {
                    console.warn('Line OA setup incomplete: Please add LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID to your .env.local file.');
                } else {
                    console.error('Failed to send Line notification:', errorData);
                }
            } else {
                console.log('✅ Line notification sent successfully!');
            }
        } catch (error) {
            console.error('Error in sendPMCompletionNotification:', error);
        }
    },

    /**
     * Test LINE Connection
     */
    async testConnection(channelAccessToken: string, targetId: string, message: string = "🧪 ทดสอบระบบแจ้งเตือนผ่าน LINE\nการเชื่อมต่อสำเร็จ!") {
        try {
            const textMessage = {
                type: "text",
                text: message
            };

            const response = await fetch('/api/line', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [textMessage],
                    channelAccessToken,
                    targetId
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Failed to send test message');
            }
            return true;
        } catch (error) {
            console.error('Error testing LINE connection:', error);
            throw error;
        }
    },

    /**
     * Create a beautiful Flex Message Card for PM completion
     * Matches the dark theme design with Thai text
     */
    createPMFlexMessage(record: MaintenanceRecord) {
        const dateStr = record.date ? new Date(record.date).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : '-';

        // Build checklist text
        let checklistText = 'ไม่มีรายการตรวจสอบ';
        if (record.checklist && record.checklist.length > 0) {
            checklistText = record.checklist
                .map(item => `${item.completed ? '✓' : '○'} ${item.item}${item.value ? ': ' + item.value : ''}`)
                .join('\n');
        }

        // Determine maintenance type label
        const maintenanceType = record.type === 'preventive' ? 'บำรุงรักษาเชิงป้องกัน' :
            record.type === 'corrective' ? 'ซ่อมบำรุงแก้ไข' :
                'การบำรุงรักษา';

        // Build the bubble contents
        const bubble: Record<string, unknown> = {
            type: "bubble",
            size: "mega",
            header: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#1a1f2e",
                paddingAll: "15px",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "box",
                                layout: "vertical",
                                flex: 1,
                                contents: [
                                    {
                                        type: "text",
                                        text: record.machineName,
                                        weight: "bold",
                                        size: "lg",
                                        color: "#00d4ff",
                                        wrap: true
                                    },
                                    {
                                        type: "text",
                                        text: record.description || "PM Maintenance",
                                        size: "sm",
                                        color: "#aaaaaa",
                                        margin: "sm",
                                        wrap: true
                                    },
                                    {
                                        type: "text",
                                        text: "👤 " + record.technician,
                                        size: "sm",
                                        color: "#888888",
                                        margin: "sm"
                                    }
                                ]
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: "เสร็จสิ้น",
                                        size: "sm",
                                        color: "#00d4ff",
                                        align: "end"
                                    },
                                    {
                                        type: "text",
                                        text: "📅 " + dateStr,
                                        size: "xs",
                                        color: "#888888",
                                        align: "end",
                                        margin: "sm"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            body: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#1e2433",
                paddingAll: "15px",
                contents: [
                    {
                        type: "text",
                        text: "📋 ข้อมูลทั่วไป",
                        weight: "bold",
                        size: "sm",
                        color: "#00d4ff"
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "md",
                        contents: [
                            {
                                type: "text",
                                text: "ประเภท:",
                                size: "sm",
                                color: "#888888",
                                flex: 2
                            },
                            {
                                type: "text",
                                text: maintenanceType,
                                size: "sm",
                                color: "#00d4ff",
                                flex: 5,
                                wrap: true
                            }
                        ]
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "sm",
                        contents: [
                            {
                                type: "text",
                                text: "ช่าง:",
                                size: "sm",
                                color: "#888888",
                                flex: 2
                            },
                            {
                                type: "text",
                                text: record.technician,
                                size: "sm",
                                color: "#ffffff",
                                flex: 5
                            }
                        ]
                    },
                    {
                        type: "separator",
                        margin: "lg",
                        color: "#333344"
                    },
                    {
                        type: "text",
                        text: "✓ รายการตรวจสอบ",
                        weight: "bold",
                        size: "sm",
                        color: "#00ff88",
                        margin: "lg"
                    },
                    // Dynamic Checklist Items
                    ...(record.checklist && record.checklist.length > 0
                        ? record.checklist.map((item) => {
                            // Determine value color based on content
                            let valueColor = "#ffcc00"; // Default Yellow for values
                            const val = (item.value || "").toLowerCase();

                            if (val.includes("ปกติ") || val.includes("normal") || val.includes("ok") || val.includes("pass")) {
                                valueColor = "#00ff88"; // Green for good
                            } else if (val.includes("ผิดปกติ") || val.includes("abnormal") || val.includes("fail") || val === "-") {
                                valueColor = "#ff4444"; // Red for bad
                            } else if (!isNaN(Number(val)) || val.match(/[\d.]+ [a-zA-Z%]+/)) {
                                valueColor = "#00d4ff"; // Blue for numbers/measurements
                            }

                            return {
                                type: "box",
                                layout: "horizontal",
                                margin: "sm",
                                contents: [
                                    {
                                        type: "text",
                                        text: item.completed ? "✓" : "○",
                                        size: "xs",
                                        color: item.completed ? "#00ff88" : "#666666",
                                        flex: 1,
                                        align: "start"
                                    },
                                    {
                                        type: "text",
                                        text: item.item,
                                        size: "xs",
                                        color: "#cccccc",
                                        flex: 7,
                                        wrap: true
                                    },
                                    {
                                        type: "text",
                                        text: item.value || "-",
                                        size: "xs",
                                        color: valueColor,
                                        flex: 4,
                                        align: "end",
                                        weight: item.value ? "bold" : "regular",
                                        wrap: true
                                    }
                                ]
                            };
                        })
                        : [{
                            type: "text",
                            text: "ไม่มีรายการตรวจสอบ",
                            size: "sm",
                            color: "#666666",
                            margin: "md",
                            style: "italic"
                        }]
                    )
                ]
            }
        };



        return {
            type: "flex",
            altText: `PM เสร็จสิ้น: ${record.machineName}`,
            contents: bubble
        };
    }
};
