import { MaintenanceRecord } from "../types";

/**
 * Line Service for sending notifications via Line OA
 */
export const lineService = {
    /**
     * Send a Line Flex Message Card when a PM task is completed
     */
    async sendPMCompletionNotification(record: MaintenanceRecord) {
        try {
            const flexMessage = this.createPMFlexMessage(record);

            const response = await fetch('/api/line', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [flexMessage]
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
                    {
                        type: "text",
                        text: checklistText,
                        size: "sm",
                        color: "#cccccc",
                        margin: "md",
                        wrap: true
                    }
                ]
            }
        };

        // Add footer with image if evidence image exists
        if (record.evidenceImageUrl) {
            bubble.footer = {
                type: "box",
                layout: "vertical",
                backgroundColor: "#1e2433",
                paddingAll: "10px",
                contents: [
                    {
                        type: "text",
                        text: "📷 รูปภาพหลักฐาน",
                        weight: "bold",
                        size: "sm",
                        color: "#00d4ff"
                    },
                    {
                        type: "image",
                        url: record.evidenceImageUrl,
                        size: "full",
                        aspectRatio: "16:9",
                        aspectMode: "cover",
                        margin: "md"
                    }
                ]
            };
        }

        return {
            type: "flex",
            altText: `PM เสร็จสิ้น: ${record.machineName}`,
            contents: bubble
        };
    }
};
