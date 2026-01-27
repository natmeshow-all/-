/**
 * @fileoverview AI Assistant Service using Google Gemini API
 * 
 * Provides AI-powered Q&A functionality for the maintenance system.
 * Uses native fetch API to call Gemini API directly.
 * 
 * Security: Blocks questions about admin/user info and security topics.
 * Languages: Supports Thai and English.
 * 
 * @module aiService
 */

// Import from firebaseService barrel file to ensure all exports are available
import {
    getMachines,
    getParts,
    getSpareParts,
    getMaintenanceRecords,
    getPMPlans,
    getRecentChatHistory,
    saveChatLog
} from "../lib/firebaseService";

// Blocked topics for security
const BLOCKED_TOPICS = [
    "user", "users", "admin", "password", "รหัสผ่าน", "ผู้ใช้", "ผู้ดูแล",
    "api key", "apikey", "secret", "token", "firebase", "database rule",
    "permission", "security", "authentication", "login", "credentials",
    "pending_users", "system_settings", "audit", "role", "สิทธิ์"
];

// System prompt for the AI
const SYSTEM_PROMPT = `คุณเป็น AI ผู้เชี่ยวชาญด้านการวิเคราะห์และซ่อมบำรุงประจำระบบ "AOB Maintenance Dashboard"
หน้าที่ของคุณคือการช่วยเหลือทีมช่างและผู้ดูแลระบบในการวิเคราะห์ปัญหาและจัดการงานซ่อมบำรุง

ขอบเขตข้อมูลที่เรียนรู้ (Context):
- คุณรู้จักเฉพาะ "เครื่องจักร (Machines)", "อะไหล่ (Parts)", "ประวัติการซ่อม (Maintenance History)" และ "แผน PM" ที่อยู่ในระบบนี้เท่านั้น
- ห้ามตอบคำถามที่ไม่เกี่ยวข้องกับระบบนี้ เช่น ข่าวสารบ้านเมือง, การเขียนโค้ดทั่วไป, หรือเรื่องบันเทิง

รูปแบบการทำงานและวิเคราะห์ปัญหา:
1. **วิเคราะห์ปัญหา:** เมื่อผู้ใช้แจ้งอาการเสีย ให้วิเคราะห์สาเหตุที่เป็นไปได้ โดยอ้างอิงจาก "ประวัติการซ่อมบำรุง" ของเครื่องนั้นๆ ว่าเคยเสียด้วยอาการนี้ไหม หรือเพิ่งซ่อมงานอะไรไป
2. **วิธีแก้ไข Step-by-Step:** ให้คำแนะนำเป็นขั้นตอน 1, 2, 3 ที่ชัดเจน เข้าใจง่าย
3. **ตรวจสอบอะไหล่:** ก่อนแนะนำให้เปลี่ยนอะไหล่ ให้ตรวจสอบในข้อมูล "Parts" หรือ "Spare Parts" ก่อนว่ามีของในสต็อกไหม หรือใกล้หมดหรือเปล่า
4. **แจ้งเตือนความปลอดภัย:** หากเป็นงานที่อันตราย ให้เตือนเรื่อง Safety First เสมอ

กฎการตอบ:
- ตอบ "ภาษาไทย" เป็นหลัก (ยกเว้นศัพท์เทคนิคทับศัพท์ได้)
- ถ้าข้อมูลใน Context ไม่เพียงพอ ให้บอกว่า "ไม่มีข้อมูลในระบบ" อย่ามั่วข้อมูลขึ้นมาเอง
- ห้ามตอบเรื่อง User/Admin/Password/Security เด็ดขาด ให้ตอบเลี่ยงว่า "ไม่สามารถเข้าถึงข้อมูลส่วนบุคคลได้"`;

export interface AIMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export interface AIContext {
    machines: any[];
    parts: any[];
    spareParts: any[];
    maintenanceRecords: any[];
    pmPlans: any[];
}

/**
 * Check if the question contains blocked topics
 */
function isBlockedQuestion(question: string): boolean {
    const lowerQuestion = question.toLowerCase();
    return BLOCKED_TOPICS.some(topic => lowerQuestion.includes(topic.toLowerCase()));
}

/**
 * Fetch context data from Firebase for AI
 */
export async function fetchAIContext(): Promise<AIContext> {
    try {
        const [machines, parts, spareParts, maintenanceRecords, pmPlans] = await Promise.all([
            getMachines().catch(() => []),
            getParts(100).catch(() => []),
            getSpareParts().catch(() => []),
            getMaintenanceRecords(100).catch(() => []),
            getPMPlans().catch(() => [])
        ]);

        return {
            machines,
            parts,
            spareParts,
            maintenanceRecords,
            pmPlans
        };
    } catch (error) {
        console.error("[AIService] Error fetching context:", error);
        return {
            machines: [],
            parts: [],
            spareParts: [],
            maintenanceRecords: [],
            pmPlans: []
        };
    }
}

/**
 * Format context data for AI prompt
 */
function formatContextForAI(context: AIContext): string {
    const summaries: string[] = [];

    // Machines summary
    if (context.machines.length > 0) {
        summaries.push(`## เครื่องจักร (${context.machines.length} เครื่อง)`);
        context.machines.slice(0, 20).forEach(m => {
            summaries.push(`- ${m.name}: ${m.location || "N/A"}, Status: ${m.status || "active"}`);
        });
    }

    // Parts summary
    if (context.parts.length > 0) {
        summaries.push(`\n## อะไหล่ (${context.parts.length} รายการ)`);
        context.parts.slice(0, 30).forEach(p => {
            summaries.push(`- ${p.partName}: เครื่อง ${p.machineName || "N/A"}, จำนวน ${p.quantity || 0}`);
        });
    }

    // Spare parts summary
    if (context.spareParts.length > 0) {
        summaries.push(`\n## วัสดุสิ้นเปลือง (${context.spareParts.length} รายการ)`);
        context.spareParts.slice(0, 20).forEach(sp => {
            const lowStock = (sp.quantity || 0) <= (sp.minStockThreshold || 0);
            summaries.push(`- ${sp.name}: จำนวน ${sp.quantity || 0}${lowStock ? " ⚠️ใกล้หมด" : ""}`);
        });
    }

    // Maintenance records summary
    if (context.maintenanceRecords.length > 0) {
        summaries.push(`\n## ประวัติซ่อมบำรุง (${context.maintenanceRecords.length} รายการล่าสุด)`);
        context.maintenanceRecords.slice(0, 20).forEach(r => {
            summaries.push(`- ${r.date || "N/A"}: ${r.machineName || "N/A"} - ${r.maintenanceType || "N/A"} (${r.description || "N/A"})`);
        });
    }

    // PM Plans summary
    if (context.pmPlans.length > 0) {
        summaries.push(`\n## แผน PM (${context.pmPlans.length} แผน)`);
        context.pmPlans.slice(0, 15).forEach(pm => {
            summaries.push(`- ${pm.machineName || "N/A"}: ${pm.taskName || "N/A"}, ความถี่ ${pm.frequency || "N/A"}`);
        });
    }

    return summaries.join("\n");
}

/**
 * Send a question to the AI via local API proxy
 */
export async function askAI(
    question: string,
    context: AIContext,
    conversationHistory: AIMessage[] = [],
    userId?: string
): Promise<string> {
    // Check for blocked topics locally first
    if (isBlockedQuestion(question)) {
        return "🔒 ขออภัย ฉันไม่สามารถตอบคำถามเกี่ยวกับข้อมูลผู้ใช้หรือความปลอดภัยของระบบได้ครับ\n\nSorry, I cannot answer questions about user data or system security.";
    }

    try {
        // Save User question to history
        if (userId) {
            saveChatLog(userId, "user", question);
        }

        // Fetch long-term history if user exists
        let longTermHistory = "";
        if (userId) {
            const historyLogs = await getRecentChatHistory(userId);
            if (historyLogs.length > 0) {
                longTermHistory = historyLogs
                    .map(log => `${log.role === "user" ? "User" : "AI"} (${new Date(log.timestamp).toLocaleDateString()}): ${log.content}`)
                    .join("\n");
            }
        }

        // Format context
        const contextText = formatContextForAI(context);

        // Build conversation history for context (Session based)
        const historyText = conversationHistory.slice(-6).map(msg =>
            `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`
        ).join("\n");

        // Build the full prompt
        const fullPrompt = `${SYSTEM_PROMPT}

=== ข้อมูลระบบปัจจุบัน ===
${contextText}

=== ประวัติการสนทนาในอดีต (1 เดือนล่าสุด) ===
${longTermHistory}

=== ประวัติการสนทนาปัจจุบัน ===
${historyText}

=== คำถามใหม่ ===
User: ${question}

AI:`;

        // Call Local API Route instead of Google directly
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                prompt: fullPrompt
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const data = await response.json();

        // Save AI response to history
        if (userId) {
            saveChatLog(userId, "assistant", data.response);
        }

        return data.response;

    } catch (error: any) {
        console.error("[AIService] Error:", error);
        return `❌ เกิดข้อผิดพลาด: ${error.message || "ไม่สามารถเชื่อมต่อ AI ได้"}\n\nError: ${error.message || "Could not connect to AI"}`;
    }
}
