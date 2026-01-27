"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { askAI, fetchAIContext, AIMessage, AIContext } from "../../services/aiService";
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

    // Temporarily disabled for debugging - always show the button
    // if (!shouldRender) {
    //     return null;
    // }

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

            const response = await askAI(userMessage.content, currentContext, messages, user?.uid);

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

    return (
        <>
            {/* Floating AI Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="ai-floating-button-v2"
                aria-label="Open PM Team AOB Assistant"
            >
                <SparkleIcon size={24} />
                <span className="ai-button-label">AI</span>
            </button>

            {/* Chat Modal */}
            {isOpen && (
                <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
                    <div
                        className="ai-modal-container"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="ai-modal-header">
                            <div className="flex items-center gap-2">
                                <SparkleIcon size={20} className="text-accent-purple" />
                                <h3 className="font-semibold text-text-primary">
                                    Pm Team AOB
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
                                    <SparkleIcon size={40} className="text-accent-purple/50 mb-3" />
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
                                    <div className="ai-suggestions">
                                        <button onClick={() => setInput(language === "th" ? "ช่วยวิเคราะห์อาการผิดปกติของเครื่องจักรจากประวัติซ่อม" : "Analyze machine abnormalities from maintenance history")}>
                                            {language === "th" ? "🔍 วิเคราะห์อาการเสีย" : "🔍 Analyze Issues"}
                                        </button>
                                        <button onClick={() => setInput(language === "th" ? "ตรวจสอบอะไหล่ที่ใกล้หมดและต้องสั่งซื้อ" : "Check for low stock parts")}>
                                            {language === "th" ? "📦 เช็คสต็อกอะไหล่" : "📦 Check Stock"}
                                        </button>
                                        <button onClick={() => setInput(language === "th" ? "ขอคำแนะนำการแก้ปัญหาเบื้องต้นสำหรับเครื่องจักร" : "Get basic troubleshooting advice")}>
                                            {language === "th" ? "🛠️ วิธีแก้ไขเบื้องต้น" : "🛠️ Troubleshooting"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}
                                    >
                                        <div className="ai-message-content">
                                            {msg.content}
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
