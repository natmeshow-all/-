import { MaintenanceRecord } from "../types";

/**
 * Line Service for sending notifications via Line OA
 */
export const lineService = {
    /**
     * Send a Line Flex Message when a PM task is completed
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
                const error = await response.json();
                console.error('Failed to send Line notification:', error);
            }
        } catch (error) {
            console.error('Error in sendPMCompletionNotification:', error);
        }
    },

    /**
     * Create a Flex Message for PM completion
     */
    createPMFlexMessage(record: MaintenanceRecord) {
        const dateStr = record.date ? new Date(record.date).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }) : '-';

        const checklistContent = record.checklist
            ? record.checklist.map(item => ({
                type: "box",
                layout: "horizontal",
                contents: [
                    {
                        type: "text",
                        text: item.completed ? "✓" : "○",
                        size: "sm",
                        color: item.completed ? "#00b900" : "#aaaaaa",
                        flex: 1
                    },
                    {
                        type: "text",
                        text: item.item + (item.value ? `: ${item.value}` : ""),
                        size: "sm",
                        color: "#666666",
                        flex: 9,
                        wrap: true
                    }
                ]
            }))
            : [];

        const mainImageUrl = record.evidenceImageUrl || "https://scdn.line-apps.com/n/channel_devcenter/img/flex_sample_banner.png";

        return {
            type: "flex",
            altText: `🛠️ ปรับปรุงงาน PM สำเร็จ: ${record.machineName}`,
            contents: {
                type: "bubble",
                direction: "ltr",
                header: {
                    type: "box",
                    layout: "vertical",
                    backgroundColor: "#272c33",
                    contents: [
                        {
                            type: "text",
                            text: "PM COMPLETED",
                            weight: "bold",
                            color: "#ff9f0a",
                            size: "xs",
                            letterSpacing: "2px"
                        },
                        {
                            type: "text",
                            text: record.machineName,
                            weight: "bold",
                            size: "lg",
                            color: "#ffffff"
                        }
                    ]
                },
                hero: {
                    type: "image",
                    url: mainImageUrl,
                    size: "full",
                    aspectRatio: "20:13",
                    aspectMode: "cover"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: record.description,
                            weight: "bold",
                            size: "md",
                            color: "#111111",
                            wrap: true
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "lg",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "box",
                                    layout: "baseline",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "ช่างเทคนิค",
                                            color: "#aaaaaa",
                                            size: "sm",
                                            flex: 3
                                        },
                                        {
                                            type: "text",
                                            text: record.technician,
                                            wrap: true,
                                            color: "#333333",
                                            size: "sm",
                                            flex: 7,
                                            weight: "bold"
                                        }
                                    ]
                                },
                                {
                                    type: "box",
                                    layout: "baseline",
                                    spacing: "sm",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "วันที่เสร็จ",
                                            color: "#aaaaaa",
                                            size: "sm",
                                            flex: 3
                                        },
                                        {
                                            type: "text",
                                            text: dateStr,
                                            wrap: true,
                                            color: "#333333",
                                            size: "sm",
                                            flex: 7
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "separator",
                            margin: "lg"
                        },
                        {
                            type: "text",
                            text: "รายการตรวจสอบ (Checklist)",
                            weight: "bold",
                            size: "sm",
                            margin: "lg",
                            color: "#111111"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "md",
                            spacing: "xs",
                            contents: checklistContent.length > 0 ? checklistContent : [{ type: "text", text: "ไม่มีรายการตรวจสอบ", size: "sm", color: "#999999" }]
                        }
                    ]
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    spacing: "sm",
                    contents: [
                        {
                            type: "button",
                            style: "link",
                            height: "sm",
                            action: {
                                type: "uri",
                                label: "ดูประวัติทั้งหมด",
                                uri: "https://maintenance-team-aob.vercel.app/history"
                            }
                        }
                    ],
                    flex: 0
                }
            }
        };
    }
};
