"use client";

import React, { useState, useEffect } from "react";
import { UserProfile, PerformanceEvaluation } from "../../types";
import { getAllUsers, getTechnicianEvaluations } from "../../lib/firebaseService";
import { UserIcon, StarIcon, EditIcon, PlusIcon } from "../ui/Icons";
import EvaluationModal from "../../components/admin/EvaluationModal";
import { useLanguage } from "../../contexts/LanguageContext";

export default function TechniciansTab() {
    const { t } = useLanguage();
    const [technicians, setTechnicians] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTech, setSelectedTech] = useState<UserProfile | null>(null);
    const [evalModalOpen, setEvalModalOpen] = useState(false);
    const [techEvaluations, setTechEvaluations] = useState<Record<string, number>>({});

    const fetchData = async () => {
        try {
            setLoading(true);
            const users = await getAllUsers();
            const techs = users.filter(u => u.role === "technician" || u.role === "supervisor");
            setTechnicians(techs);

            // Fetch average scores for each tech
            const scores: Record<string, number> = {};
            for (const tech of techs) {
                const evals = await getTechnicianEvaluations(tech.uid);
                if (evals.length > 0) {
                    const avg = evals.reduce((sum, e) => sum + e.averageScore, 0) / evals.length;
                    scores[tech.uid] = avg;
                }
            }
            setTechEvaluations(scores);
        } catch (err) {
            console.error("Error fetching technicians:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenEval = (tech: UserProfile) => {
        setSelectedTech(tech);
        setEvalModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-lg font-bold text-text-primary">{t("adminTechniciansTitle")}</h2>
                <span className="text-xs text-text-muted">{technicians.length} {t("adminTechnicalRecords")}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicians.map(tech => (
                    <div key={tech.uid} className="card p-4 bg-bg-secondary/30 border-white/5 hover:border-primary/30 hover:bg-bg-secondary/50 hover:scale-[1.02] shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col gap-4 group">
                        <div className="flex items-center gap-3">
                            {tech.photoURL ? (
                                <img src={tech.photoURL} alt={tech.displayName} className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-accent-blue/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <UserIcon size={24} className="text-accent-blue" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="font-bold text-text-primary truncate group-hover:text-primary transition-colors">{tech.displayName}</h3>
                                <p className="text-xs text-text-muted uppercase tracking-wider">{tech.role === 'admin' ? t("userRoleAdmin") :
                                    tech.role === 'supervisor' ? t("userRoleSupervisor") :
                                        tech.role === 'technician' ? t("userRoleTechnician") :
                                            tech.role === 'viewer' ? t("userRoleViewer") : tech.role}</p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between pt-2 border-t border-white/5">
                            <div>
                                <p className="text-[10px] text-text-muted mb-1">{t("adminTechnicalQuality")}</p>
                                <div className="flex items-center gap-1">
                                    <StarIcon size={16} className="text-accent-yellow fill-accent-yellow animate-pulse" />
                                    <span className="text-lg font-bold text-text-primary">
                                        {techEvaluations[tech.uid]?.toFixed(1) || "N/A"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleOpenEval(tech)}
                                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 active:scale-90"
                            >
                                <PlusIcon size={14} />
                                {t("adminActionEvaluate")}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedTech && (
                <EvaluationModal
                    isOpen={evalModalOpen}
                    onClose={() => setEvalModalOpen(false)}
                    technician={selectedTech}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
}
