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
} from "../lib/firebaseService";
import { getRecentChatHistory, saveChatLog } from "./chatHistoryService";

// Blocked topics for security (Non-Admin only)
const BLOCKED_TOPICS = [
    "user", "users", "admin", "password", "รหัสผ่าน", "ผู้ใช้", "ผู้ดูแล",
    "api key", "apikey", "secret", "token", "firebase", "database rule",
    "permission", "security", "authentication", "login", "credentials",
    "pending_users", "system_settings", "audit", "role", "สิทธิ์"
];

export interface CreatePMData {
    machineId: string;
    machineName: string;
    taskName: string;
    description?: string;
    scheduleType: "monthly" | "weekly" | "yearly";
    weeks?: number; // for weekly
    months?: number; // for monthly
    checklistItems: string[];
}

export interface CopyPMData {
    sourceMachineId: string;
    sourceMachineName: string;
    targetMachineIds: string[];
    targetMachineNames: string[];
}

export interface AIActionProposal {
    type: "ACTION_PROPOSAL";
    action: "CREATE_PM_PLAN" | "COPY_PM_PLAN";
    data: CreatePMData | CopyPMData;
    summary: string; // Human readable summary of what will happen
}

// System prompt for the AI
const SYSTEM_PROMPT = `คุณเป็น AI ผู้เชี่ยวชาญด้านการวิเคราะห์และซ่อมบำรุงประจำระบบ "AOB Maintenance Dashboard"
หน้าที่ของคุณคือการช่วยเหลือทีมช่างและผู้ดูแลระบบในการวิเคราะห์ปัญหาและจัดการงานซ่อมบำรุง

ขอบเขตข้อมูลที่เรียนรู้ (Context):
- คุณรู้จักเฉพาะ "เครื่องจักร (Machines)", "อะไหล่ (Parts)", "ประวัติการซ่อม (Maintenance History)" และ "แผน PM" ที่อยู่ในระบบนี้เท่านั้น
- ห้ามตอบคำถามที่ไม่เกี่ยวข้องกับระบบนี้ เช่น ข่าวสารบ้านเมือง, การเขียนโค้ดทั่วไป, หรือเรื่องบันเทิง

รูปแบบการทำงานและวิเคราะห์ปัญหา:
1. **วิเคราะห์ปัญหา:** เมื่อผู้ใช้แจ้งอาการเสีย ให้วิเคราะห์สาเหตุที่เป็นไปได้ โดยอ้างอิงจาก "ประวัติการซ่อมบำรุง" ของเครื่องนั้นๆ
2. **วิธีแก้ไข Step-by-Step:** ให้คำแนะนำเป็นขั้นตอน 1, 2, 3 ที่ชัดเจน เข้าใจง่าย
3. **ตรวจสอบอะไหล่:** ก่อนแนะนำให้เปลี่ยนอะไหล่ ให้ตรวจสอบในข้อมูล "Parts" หรือ "Spare Parts" ก่อนว่ามีของในสต็อกไหม
4. **แจ้งเตือนความปลอดภัย:** หากเป็นงานที่อันตราย ให้เตือนเรื่อง Safety First เสมอ

**สำหรับ Admin Only (AI Co-Pilot Mode):**
หากผู้ใช้เป็น **Admin** และต้องการ **สร้าง** หรือ **คัดลอก** แผน PM (PM Plan) ให้คุณตอบกลับเป็น **JSON Format** เท่านั้น ดังนี้:

**กรณีสร้างแผน PM (Create PM):**
\`\`\`json
{
  "type": "ACTION_PROPOSAL",
  "action": "CREATE_PM_PLAN",
  "summary": "สร้างแผน PM เปลี่ยนถ่ายน้ำมันเครื่องสำหรับ Mixer 1",
  "data": {
    "machineId": "MACHINE_ID",
    "machineName": "Machine Name",
    "taskName": "ชื่องาน PM",
    "description": "รายละเอียดงาน",
    "scheduleType": "monthly", // monthly, weekly, yearly
    "months": 1, // ความถี่เดือน
    "checklistItems": ["เช็คระดับน้ำมัน", "เปลี่ยนกรอง", "ทำความสะอาด"]
  }
}
\`\`\`

**กรณีคัดลอกแผน PM (Copy PM):**
\`\`\`json
{
  "type": "ACTION_PROPOSAL",
  "action": "COPY_PM_PLAN",
  "summary": "คัดลอกแผน PM ทั้งหมดจาก Mixer 1 ไปยัง Mixer 2 และ 3",
  "data": {
    "sourceMachineId": "SOURCE_ID",
    "sourceMachineName": "Source Name",
    "targetMachineIds": ["TARGET_ID_1", "TARGET_ID_2"],
    "targetMachineNames": ["Target 1", "Target 2"]
  }
}
\`\`\`

กฎการตอบ:
- ตอบ "ภาษาไทย" เป็นหลัก (ยกเว้นศัพท์เทคนิคทับศัพท์ได้)
- ถ้าข้อมูลใน Context ไม่เพียงพอ ให้บอกว่า "ไม่มีข้อมูลในระบบ" อย่ามั่วข้อมูลขึ้นมาเอง
- ห้ามตอบเรื่อง User/Admin/Password/Security เด็ดขาด
- หากต้องตอบเป็น JSON ห้ามมีข้อความอื่นนำหน้าหรือต่อท้าย ให้มีแค่ JSON Block เท่านั้น`;

export interface AIMessage {
    role: "user" | "assistant";
    content: string | AIActionProposal;
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
    userId?: string,
    userRole: string = "viewer" // Add user role
): Promise<string | AIActionProposal> {
    const isAdmin = userRole === "admin" || userRole === "supervisor";

    // Check for blocked topics locally first (SKIP if Admin)
    if (!isAdmin && isBlockedQuestion(question)) {
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
        const historyText = conversationHistory.slice(-6).map(msg => {
            const contentStr = typeof msg.content === 'string'
                ? msg.content
                : `[Action Proposal: ${msg.content.summary}]`;
            return `${msg.role === "user" ? "User" : "AI"}: ${contentStr}`;
        }).join("\n");

        // Build the full prompt
        const fullPrompt = `${SYSTEM_PROMPT}

=== ข้อมูลผู้ใช้ ===
User Role: ${userRole} ${isAdmin ? "(Can execute Admin Actions)" : "(Standard User)"}

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
        let aiResponse = data.response;

        // Try to parse JSON if it looks like a proposal
        if (aiResponse.includes("ACTION_PROPOSAL") || aiResponse.includes('"type"')) {
            try {
                // Try multiple extraction methods
                let cleanJson = aiResponse;

                // Method 1: Extract from markdown code blocks
                const codeBlockMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (codeBlockMatch) {
                    cleanJson = codeBlockMatch[1].trim();
                }

                // Method 2: If no code block, try to find JSON object directly
                if (!codeBlockMatch) {
                    const jsonMatch = aiResponse.match(/\{[\s\S]*"type"\s*:\s*"ACTION_PROPOSAL"[\s\S]*\}/);
                    if (jsonMatch) {
                        cleanJson = jsonMatch[0];
                    }
                }

                // Method 3: Fallback - strip common prefixes/suffixes
                cleanJson = cleanJson
                    .replace(/^[^{]*/, '')  // Remove anything before first {
                    .replace(/}[^}]*$/, '}') // Remove anything after last }
                    .trim();

                const proposal = JSON.parse(cleanJson);

                // If it's a valid proposal, return the object
                if (proposal.type === "ACTION_PROPOSAL") {
                    console.log("[AIService] Parsed ACTION_PROPOSAL successfully:", proposal.action);
                    return proposal as AIActionProposal;
                }
            } catch (e) {
                console.warn("[AIService] Failed to parse AI JSON action:", e, "Raw:", aiResponse.substring(0, 200));
                // Fallback to text
            }
        }

        // Save AI response to history
        if (userId) {
            saveChatLog(userId, "assistant", aiResponse);
        }

        return aiResponse;

    } catch (error: any) {
        console.error("[AIService] Error:", error);
        return `❌ เกิดข้อผิดพลาด: ${error.message || "ไม่สามารถเชื่อมต่อ AI ได้"}\n\nError: ${error.message || "Could not connect to AI"}`;
    }
}
