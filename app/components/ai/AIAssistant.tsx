"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import {
    askAI,
    fetchAIContext,
    AIMessage,
    AIContext,
    AIActionProposal,
    CreatePMData,
    CopyPMData
} from "../../services/aiService";
import { addPMPlan, copyPMPlans } from "../../services/maintenanceService"; // Ensure this is exported from firebaseService barrel if preferred, or direct
import { usePathname } from "next/navigation";

// Sparkle icon for AI button
const SparkleIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
            d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"
            fill="currentColor"
        />
    </svg>
);

const SendIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
);

const CloseIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6L18 18" />
    </svg>
);

// --- Action Cards Components ---

const CreatePMProposalCard = ({ data, onConfirm, onCancel }: { data: CreatePMData, onConfirm: () => void, onCancel: () => void }) => {
    return (
        <div className="bg-bg-secondary p-4 rounded-lg border border-accent-blue/30 mt-2">
            <div className="flex items-center gap-2 mb-3 text-accent-blue">
                <SparkleIcon size={18} />
                <span className="font-semibold text-sm">ข้อเสนอสร้างแผน PM</span>
            </div>

            <div className="space-y-2 text-sm text-text-secondary mb-4">
                <div className="flex justify-between">
                    <span className="text-text-muted">เครื่องจักร:</span>
                    <span className="font-medium text-text-primary">{data.machineName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-muted">ชื่องาน:</span>
                    <span className="font-medium text-text-primary">{data.taskName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text-muted">ความถี่:</span>
                    <span className="font-medium text-text-primary uppercase">{data.scheduleType}</span>
                </div>
                {data.description && (
                    <div className="text-xs italic bg-bg-tertiary p-2 rounded">{data.description}</div>
                )}
                <div className="mt-2">
                    <span className="text-text-muted block mb-1">Checklist:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                        {data.checklistItems.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 py-1.5 px-3 rounded bg-bg-tertiary hover:bg-bg-primary text-text-secondary text-xs transition-colors">
                    ยกเลิก
                </button>
                <button onClick={onConfirm} className="flex-1 py-1.5 px-3 rounded bg-accent-blue hover:bg-accent-blue/80 text-white text-xs font-medium transition-colors shadow-lg shadow-accent-blue/20">
                    อนุมัติแผนงาน
                </button>
            </div>
        </div>
    );
};

const CopyPMProposalCard = ({ data, onConfirm, onCancel }: { data: CopyPMData, onConfirm: () => void, onCancel: () => void }) => {
    return (
        <div className="bg-bg-secondary p-4 rounded-lg border border-accent-purple/30 mt-2">
            <div className="flex items-center gap-2 mb-3 text-accent-purple">
                <SparkleIcon size={18} />
                <span className="font-semibold text-sm">ข้อเสนอคัดลอกแผน PM</span>
            </div>

            <div className="space-y-2 text-sm text-text-secondary mb-4">
                <div className="p-2 bg-bg-tertiary rounded flex flex-col gap-1">
                    <span className="text-xs text-text-muted">ต้นทาง:</span>
                    <span className="font-medium text-text-primary">{data.sourceMachineName}</span>
                </div>

                <div className="flex justify-center text-text-muted">⬇️ คัดลอกไปยัง ⬇️</div>

                <div className="p-2 bg-bg-tertiary rounded flex flex-col gap-1">
                    <span className="text-xs text-text-muted">ปลายทาง ({data.targetMachineNames.length} เครื่อง):</span>
                    <ul className="list-disc pl-4">
                        {data.targetMachineNames.map((name, i) => (
                            <li key={i} className="text-text-primary">{name}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 py-1.5 px-3 rounded bg-bg-tertiary hover:bg-bg-primary text-text-secondary text-xs transition-colors">
                    ยกเลิก
                </button>
                <button onClick={onConfirm} className="flex-1 py-1.5 px-3 rounded bg-accent-purple hover:bg-accent-purple/80 text-white text-xs font-medium transition-colors shadow-lg shadow-accent-purple/20">
                    ยืนยันการคัดลอก
                </button>
            </div>
        </div>
    );
};


export default function AIAssistant() {
    const { t, language } = useLanguage();
    const { user, userProfile } = useAuth();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState<AIContext | null>(null);
    const [isLoadingContext, setIsLoadingContext] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check if should render (must be AFTER all hooks)
    const isAdminPage = pathname?.startsWith("/users") || pathname?.startsWith("/admin");
    // Show for approved, logged-in users only, and hide on admin pages
    const shouldRender = !!userProfile && userProfile?.isApproved && !isAdminPage;

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (shouldRender) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, shouldRender]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && shouldRender) {
            inputRef.current?.focus();
            // Load context when opening
            if (!context && !isLoadingContext) {
                loadContext();
            }
        }
    }, [isOpen, shouldRender]);

    const loadContext = async () => {
        setIsLoadingContext(true);
        try {
            const ctx = await fetchAIContext();
            setContext(ctx);
        } catch (error) {
            console.error("Error loading AI context:", error);
        } finally {
            setIsLoadingContext(false);
        }
    };

    const handleConfirmAction = async (proposal: AIActionProposal) => {
        // Optimistic update: show processing message
        const processingMsg: AIMessage = {
            role: "assistant",
            content: "🔄 กำลังดำเนินการ...",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, processingMsg]);

        try {
            if (proposal.action === "CREATE_PM_PLAN") {
                const d = proposal.data as CreatePMData;
                await addPMPlan({
                    machineId: d.machineId,
                    machineName: d.machineName,
                    taskName: d.taskName,
                    notes: d.description,
                    checklistItems: d.checklistItems,
                    scheduleType: d.scheduleType,
                    cycleMonths: d.months || 1, // Default fallback
                    // TODO: Calculate real start/next due dates logic properly
                    startDate: new Date(),
                    nextDueDate: new Date(),
                    status: "active",
                });
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: "✅ สร้างแผน PM เรียบร้อยแล้วครับ!",
                    timestamp: new Date()
                }]);
            } else if (proposal.action === "COPY_PM_PLAN") {
                const d = proposal.data as CopyPMData;
                const result = await copyPMPlans(d.sourceMachineId, d.targetMachineIds);

                if (result.success === 0 && result.failed === 0) {
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `⚠️ ไม่พบแผน PM ในเครื่องจักรต้นทาง "${d.sourceMachineName}" ที่สามารถคัดลอกได้ (0 รายการ)`,
                        timestamp: new Date()
                    }]);
                } else if (result.failed > 0) {
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `⚠️ คัดลอกเสร็จสิ้นบางส่วน: สำเร็จ ${result.success} รายการ, ล้มเหลว ${result.failed} รายการ`,
                        timestamp: new Date()
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `✅ คัดลอกแผนสำเร็จทั้งหมด (${result.success} รายการ) ไปยัง ${d.targetMachineNames.length} เครื่องจักรปลายทาง`,
                        timestamp: new Date()
                    }]);
                }
            }
        } catch (error) {
            console.error("Action Failed:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล",
                timestamp: new Date()
            }]);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: AIMessage = {
            role: "user",
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Ensure context is loaded
            let currentContext = context;
            if (!currentContext) {
                currentContext = await fetchAIContext();
                setContext(currentContext);
            }

            // Pass userRole to AI
            const response = await askAI(
                userMessage.content as string,
                currentContext,
                messages,
                user?.uid,
                userProfile?.role
            );

            const aiMessage: AIMessage = {
                role: "assistant",
                content: response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: AIMessage = {
                role: "assistant",
                content: language === "th"
                    ? "❌ เกิดข้อผิดพลาด ไม่สามารถเชื่อมต่อ AI ได้"
                    : "❌ Error: Could not connect to AI",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    const renderMessageContent = (content: string | AIActionProposal) => {
        if (typeof content === 'string') {
            return content;
        }

        // It's an Action Proposal
        if (content.type === "ACTION_PROPOSAL") {
            if (content.action === "CREATE_PM_PLAN") {
                return (
                    <CreatePMProposalCard
                        data={content.data as CreatePMData}
                        onConfirm={() => handleConfirmAction(content)}
                        onCancel={() => setMessages(prev => [...prev, { role: "assistant", content: "ยกเลิกคำสั่งแล้วครับ", timestamp: new Date() }])}
                    />
                );
            }
            if (content.action === "COPY_PM_PLAN") {
                return (
                    <CopyPMProposalCard
                        data={content.data as CopyPMData}
                        onConfirm={() => handleConfirmAction(content)}
                        onCancel={() => setMessages(prev => [...prev, { role: "assistant", content: "ยกเลิกคำสั่งแล้วครับ", timestamp: new Date() }])}
                    />
                );
            }
        }
        return "Unrecognized Action";
    };

    if (!shouldRender) return null;

    return (
        <>
            {/* Floating AI Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={userProfile?.role === 'admin' ? "ai-floating-button-admin" : "ai-floating-button-v2"}
                aria-label="Open PM Team AOB Assistant"
            >
                <SparkleIcon size={24} />
                <span className="ai-button-label">AI</span>
            </button>

            {/* Chat Modal */}
            {isOpen && (
                <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
                    <div
                        className={userProfile?.role === 'admin' ? "ai-modal-container border-amber-500/30" : "ai-modal-container"}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="ai-modal-header">
                            <div className="flex items-center gap-2">
                                <SparkleIcon size={20} className={userProfile?.role === 'admin' ? "text-amber-400" : "text-accent-purple"} />
                                <h3 className={userProfile?.role === 'admin' ? "font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300" : "font-semibold text-text-primary"}>
                                    {userProfile?.role === 'admin' ? "Admin Co-Pilot" : "Pm Team AOB"}
                                </h3>
                                {isLoadingContext && (
                                    <span className="text-[10px] text-text-muted animate-pulse">
                                        {language === "th" ? "กำลังโหลด..." : "Loading..."}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearChat}
                                    className="text-xs text-text-muted hover:text-text-primary transition-colors"
                                >
                                    {language === "th" ? "ล้าง" : "Clear"}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 rounded-lg hover:bg-bg-tertiary transition-colors"
                                >
                                    <CloseIcon size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="ai-messages-container">
                            {messages.length === 0 ? (
                                <div className="ai-welcome-message">
                                    <SparkleIcon size={40} className={userProfile?.role === 'admin' ? "text-amber-400 mb-3" : "text-accent-purple/50 mb-3"} />

                                    {userProfile?.role === 'admin' ? (
                                        <>
                                            <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-300 mb-2">
                                                Admin Co-Pilot Mode
                                            </h3>
                                            <p className="text-text-secondary text-xs mb-3 text-center">
                                                {language === "th"
                                                    ? "พร้อมช่วยจัดการแผน PM และวิเคราะห์เชิงลึกครับ"
                                                    : "Ready to manage PM plans and provide deep insights."}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-text-secondary text-sm mb-2">
                                                {language === "th"
                                                    ? "สวัสดีครับ! ผมคือ AI ผู้ช่วยของระบบ"
                                                    : "Hello! I'm the system's AI assistant"}
                                            </p>
                                            <p className="text-text-muted text-xs">
                                                {language === "th"
                                                    ? "ผมพร้อมช่วยวิเคราะห์ปัญหา แนะนำวิธีซ่อม และตรวจสอบข้อมูลในระบบซ่อมบำรุงทั้งหมดครับ"
                                                    : "I can help analyze problems, suggest repairs, and check all maintenance system data."}
                                            </p>
                                        </>
                                    )}

                                    <div className="ai-suggestions">
                                        {userProfile?.role === 'admin' ? (
                                            <>
                                                <button
                                                    className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 text-amber-500"
                                                    onClick={() => setInput(language === "th" ? "ช่วยวิเคราะห์รายการอะไหล่ที่เป็น Dead Stock (มีของแต่ไม่ได้ใช้นานๆ)" : "Analyze inventory for dead stock")}
                                                >
                                                    {language === "th" ? "📊 วิเคราะห์ Dead Stock" : "📊 Dead Stock Analysis"}
                                                </button>
                                                <button
                                                    className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 text-amber-500"
                                                    onClick={() => setInput(language === "th" ? "ช่วยวิเคราะห์ประวัติซ่อมบำรุงเพื่อหาแนวโน้มเครื่องจักรที่เสียบ่อย (Predictive)" : "Analyze maintenance history for recurring issues")}
                                                >
                                                    {language === "th" ? "🔮 วิเคราะห์ความเสี่ยง (Predictive)" : "🔮 Predictive Analysis"}
                                                </button>
                                                <button
                                                    className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 text-amber-500"
                                                    onClick={() => setInput(language === "th" ? "สรุปภาพรวมแผน PM และงานที่ค้างอยู่" : "Summarize PM plans and pending tasks")}
                                                >
                                                    {language === "th" ? "📋 สรุปสถานะแผน PM" : "📋 PM Status Summary"}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setInput(language === "th" ? "ช่วยวิเคราะห์อาการผิดปกติของเครื่องจักรจากประวัติซ่อม" : "Analyze machine abnormalities from maintenance history")}>
                                                    {language === "th" ? "🔍 วิเคราะห์อาการเสีย" : "🔍 Analyze Issues"}
                                                </button>
                                                <button onClick={() => setInput(language === "th" ? "ตรวจสอบอะไหล่ที่ใกล้หมดและต้องสั่งซื้อ" : "Check for low stock parts")}>
                                                    {language === "th" ? "📦 เช็คสต็อกอะไหล่" : "📦 Check Stock"}
                                                </button>
                                                <button onClick={() => setInput(language === "th" ? "ขอคำแนะนำการแก้ปัญหาเบื้องต้นสำหรับเครื่องจักร" : "Get basic troubleshooting advice")}>
                                                    {language === "th" ? "🛠️ วิธีแก้ไขเบื้องต้น" : "🛠️ Troubleshooting"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}
                                    >
                                        <div className="ai-message-content">
                                            {renderMessageContent(msg.content)}
                                        </div>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className="ai-message ai-message-assistant">
                                    <div className="ai-typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="ai-input-container">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={language === "th" ? "ถามคำถาม..." : "Ask a question..."}
                                className="ai-input"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                className="ai-send-button"
                            >
                                <SendIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
