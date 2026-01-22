"use client";

import React, { useState } from "react";
import { UserProfile, PerformanceScore } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { submitEvaluation, getTechnicianWorkMetrics } from "../../lib/firebaseService";
import Modal from "../ui/Modal";
import { StarIcon, ActivityIcon } from "../ui/Icons";

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    technician: UserProfile;
    onSuccess: () => void;
}

export default function EvaluationModal({ isOpen, onClose, technician, onSuccess }: EvaluationModalProps) {
    const { t } = useLanguage();
    const { userProfile } = useAuth();
    const { success, error: showError } = useToast();

    const [scores, setScores] = useState<PerformanceScore>({
        quality: 5,
        speed: 5,
        reliability: 5,
        knowledge: 5
    });
    const [comments, setComments] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);

    const handleRating = (key: keyof PerformanceScore, val: number) => {
        setScores(prev => ({ ...prev, [key]: val }));
    };

    const handleAIAnalyze = async () => {
        setAnalyzing(true);
        try {
            const metrics = await getTechnicianWorkMetrics(technician.displayName, technician.uid);
            if (!metrics || metrics.totalTasks === 0) {
                showError("No work history found for AI analysis");
                return;
            }

            // Heuristic scoring logic
            const sQuality = Math.min(3 + (metrics.hasPhotoEvidence / metrics.totalTasks) * 2, 5);
            const sReliability = Math.min(2 + (metrics.preventiveCount / Math.max(metrics.totalTasks, 1)) * 4, 5);
            const sKnowledge = Math.min(2 + (metrics.avgNoteLength / 150) * 3, 5);
            const sSpeed = 4.0; // Assume baseline speed is good unless many overdue tasks (not yet tracked)

            const suggestedScores = {
                quality: Math.round(sQuality),
                reliability: Math.round(sReliability),
                knowledge: Math.round(sKnowledge),
                speed: Math.round(sSpeed)
            };

            setScores(suggestedScores);

            // Generate Reasoning text
            let reasoning = `Based on ${metrics.totalTasks} recorded tasks:\n`;
            reasoning += `- ${metrics.preventiveCount} PM tasks completed (${Math.round((metrics.preventiveCount / metrics.totalTasks) * 100)}% proactive).\n`;
            if (metrics.hasPhotoEvidence > 0) {
                reasoning += `- High accountability with ${metrics.hasPhotoEvidence} tasks having photo evidence.\n`;
            }
            if (metrics.avgNoteLength > 100) {
                reasoning += `- Detailed reporting style (avg ${Math.round(metrics.avgNoteLength)} chars per task) indicating strong technical documentation and knowledge.`;
            } else {
                reasoning += `- Brief reporting style; recommend more detail in maintenance logs.`;
            }

            setAiInsight(reasoning);
            setComments(reasoning); // Pre-fill comments with AI reasoning
            success(t("aiSuggestionTitle") + " Successfully Generated");
        } catch (err) {
            console.error("AI Analysis error:", err);
            showError("AI Analysis failed");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSubmit = async () => {
        if (!userProfile) return;

        setSubmitting(true);
        try {
            const avg = (scores.quality + scores.speed + scores.reliability + scores.knowledge) / 4;

            await submitEvaluation({
                technicianId: technician.uid,
                technicianName: technician.displayName,
                evaluatorId: userProfile.uid,
                evaluatorName: userProfile.displayName,
                date: new Date(),
                scores,
                averageScore: avg,
                comments
            });

            success("Performance evaluated successfully");
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Evaluation error:", err);
            showError("Failed to save evaluation");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Evaluate: ${technician.displayName}`}
        >
            <div className="space-y-6">
                {/* AI Suggestion Header */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-primary/10 border border-accent-purple/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center shadow-lg shadow-accent-purple/20 animate-pulse">
                            <ActivityIcon size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-accent-purple tracking-wider uppercase">{t("aiInsightTitle")}</p>
                            <p className="text-[10px] text-text-muted">Suggesting scores based on work history</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAIAnalyze}
                        disabled={analyzing}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all
                            ${analyzing
                                ? "bg-bg-tertiary text-text-muted"
                                : "bg-accent-purple text-white hover:shadow-lg hover:shadow-accent-purple/30 active:scale-95"}`}
                    >
                        {analyzing ? t("aiAnalyzing") : t("aiAnalyze")}
                    </button>
                </div>

                <div className="grid gap-6">
                    <RatingRow
                        label="Work Quality"
                        desc="ความเรียบร้อยและความถูกต้องของงาน"
                        value={scores.quality}
                        onChange={(v: number) => handleRating("quality", v)}
                    />
                    <RatingRow
                        label="Speed"
                        desc="ความรวดเร็วในการปฏิบัติหน้าที่"
                        value={scores.speed}
                        onChange={(v: number) => handleRating("speed", v)}
                    />
                    <RatingRow
                        label="Reliability"
                        desc="ความสม่ำเสมอและความรับผิดชอบ"
                        value={scores.reliability}
                        onChange={(v: number) => handleRating("reliability", v)}
                    />
                    <RatingRow
                        label="Technical Knowledge"
                        desc="ทักษะและความรู้ทางเทคนิค"
                        value={scores.knowledge}
                        onChange={(v: number) => handleRating("knowledge", v)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-widest mb-2 px-1">{t("labelAdditionalNotes")}</label>
                    <textarea
                        className="input min-h-[100px] resize-none py-3"
                        placeholder={t("placeholderAdditionalNotesHint")}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />
                    {aiInsight && (
                        <div className="mt-3 p-3 rounded-xl bg-accent-purple/5 border border-accent-purple/10">
                            <h5 className="text-[10px] font-bold text-accent-purple uppercase mb-1">{t("aiReasoning")}</h5>
                            <p className="text-[11px] text-text-muted leading-relaxed whitespace-pre-line">{aiInsight}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl bg-white/5 text-text-muted font-bold hover:bg-white/10 transition-all"
                    >
                        {t("actionCancel")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 h-12 rounded-xl bg-accent-purple text-white font-bold hover:shadow-lg hover:shadow-accent-purple/30 transition-all disabled:opacity-50"
                    >
                        {submitting ? t("msgSaving") : t("actionSave")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function RatingRow({ label, desc, value, onChange }: any) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <div>
                    <h4 className="text-sm font-bold text-text-primary">{label}</h4>
                    <p className="text-[10px] text-text-muted">{desc}</p>
                </div>
                <span className="text-lg font-bold text-primary">{value}</span>
            </div>
            <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        onClick={() => onChange(star)}
                        className={`flex-1 py-2 rounded-lg border transition-all flex items-center justify-center
                            ${value >= star
                                ? "bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow"
                                : "bg-white/5 border-white/5 text-text-muted/30 hover:border-white/10"}`}
                    >
                        <StarIcon size={16} className={value >= star ? "fill-accent-yellow" : ""} />
                    </button>
                ))}
            </div>
        </div>
    );
}
