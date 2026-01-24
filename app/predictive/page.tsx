"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import {
    ActivityIcon,
    AlertTriangleIcon,
    ThermometerIcon,
    TrendingUpIcon,
    SettingsIcon,
    ZapIcon,
    ChevronRightIcon,
    BoxIcon,
} from "../components/ui/Icons";
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { getMachines, getMaintenanceRecords, getPMPlans } from "../lib/firebaseService";
import { Machine, MaintenanceRecord, PMPlan } from "../types";

export default function PredictivePage() {
    const { t, tData } = useLanguage();
    const [analyzing, setAnalyzing] = useState(true);
    const [loading, setLoading] = useState(true);
    
    // Real Data State
    const [predictions, setPredictions] = useState<any[]>([]);
    const [stats, setStats] = useState({
        highRisk: 0,
        monitoring: 0,
        healthy: 0,
        reliability: 100
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setAnalyzing(true);
                const [machines, records, pmPlans] = await Promise.all([
                    getMachines(),
                    getMaintenanceRecords(100), // Get last 100 records for analysis
                    getPMPlans()
                ]);

                analyzeData(machines, records, pmPlans);
            } catch (error) {
                console.error("Error fetching predictive data:", error);
            } finally {
                setLoading(false);
                setTimeout(() => setAnalyzing(false), 1000);
            }
        };

        fetchData();
    }, []);

    const analyzeData = (machines: Machine[], records: MaintenanceRecord[], pmPlans: PMPlan[]) => {
        const riskList: any[] = [];
        let highRiskCount = 0;
        let monitoringCount = 0;
        let healthyCount = 0;

        // Group records by machine for faster lookup
        const recordsByMachine = records.reduce((acc, r) => {
            const key = r.machineId || r.machineName; // Prefer ID but fallback to name
            if (!acc[key]) acc[key] = [];
            acc[key].push(r);
            return acc;
        }, {} as Record<string, MaintenanceRecord[]>);

        machines.forEach(machine => {
            let riskScore = 0;
            let reasons: string[] = [];
            const machineRecords = recordsByMachine[machine.id] || recordsByMachine[machine.name] || [];

            // 1. Check Overdue PMs
            const machinePlans = pmPlans.filter(p => p.machineId === machine.id || p.machineName === machine.name);
            const overduePlans = machinePlans.filter(p => new Date(p.nextDueDate) < new Date());
            
            if (overduePlans.length > 0) {
                riskScore += 40 * overduePlans.length;
                reasons.push(t("predOverduePM") || "Overdue PM");
            }

            // 2. Check Recent Corrective Maintenance (Last 30 days)
            const recentFailures = machineRecords.filter(r => 
                r.type === 'corrective' &&
                new Date(r.date).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)
            );

            if (recentFailures.length > 0) {
                riskScore += 30 * recentFailures.length;
                reasons.push(t("predRecentFailures") || "Recent Breakdowns");
            }

            // 3. MTBF Analysis (Mean Time Between Failures)
            // Calculate average time between 'corrective' records
            const correctiveRecords = machineRecords
                .filter(r => r.type === 'corrective')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (correctiveRecords.length >= 2) {
                let totalDiff = 0;
                for (let i = 1; i < correctiveRecords.length; i++) {
                    totalDiff += new Date(correctiveRecords[i].date).getTime() - new Date(correctiveRecords[i-1].date).getTime();
                }
                const avgFailTime = totalDiff / (correctiveRecords.length - 1);
                const lastFailTime = new Date(correctiveRecords[correctiveRecords.length - 1].date).getTime();
                const timeSinceLastFail = Date.now() - lastFailTime;

                // If time since last failure is approaching the average failure time (> 80%)
                if (timeSinceLastFail > avgFailTime * 0.8) {
                    riskScore += 25;
                    reasons.push(t("predMTBFWarning") || "Approaching MTBF");
                }
            } else {
                 // Define variables with default values if not enough records to prevent reference error
                 // These variables are scoped inside the loop in original code, but used outside?
                 // Wait, the variables 'avgFailTime' and 'timeSinceLastFail' are block scoped inside the 'if' block
                 // But they are used later in the code. This is the cause of the ReferenceError.
            }

            // We need to declare these variables outside the if block scope or handle the logic differently
            let avgFailTime = 0;
            let timeSinceLastFail = 0;
            let hasMTBFData = false;

            if (correctiveRecords.length >= 2) {
                let totalDiff = 0;
                for (let i = 1; i < correctiveRecords.length; i++) {
                    totalDiff += new Date(correctiveRecords[i].date).getTime() - new Date(correctiveRecords[i-1].date).getTime();
                }
                avgFailTime = totalDiff / (correctiveRecords.length - 1);
                const lastFailTime = new Date(correctiveRecords[correctiveRecords.length - 1].date).getTime();
                timeSinceLastFail = Date.now() - lastFailTime;
                hasMTBFData = true;

                // If time since last failure is approaching the average failure time (> 80%)
                if (timeSinceLastFail > avgFailTime * 0.8) {
                    riskScore += 25;
                    reasons.push(t("predMTBFWarning") || "Approaching MTBF");
                }
            }

            // 4. Recurring Failure Pattern (Chronic Issues)
            // Check if same part/description appears frequently in corrective maintenance
            const failureCounts: Record<string, number> = {};
            correctiveRecords.forEach(r => {
                // Use part name or first 20 chars of description as key
                const key = r.partName || (r.description ? r.description.substring(0, 20) : "Unknown");
                failureCounts[key] = (failureCounts[key] || 0) + 1;
            });

            const chronicIssues = Object.entries(failureCounts).filter(([_, count]) => count >= 3);
            if (chronicIssues.length > 0) {
                riskScore += 35;
                const issues = chronicIssues.map(([issue]) => issue).join(", ");
                reasons.push(`${t("predChronicIssue") || "Chronic Issue"}: ${issues}`);
            }

            let potentialImpact = "";
            let recommendedAction = "";

            if (riskScore >= 70) {
                 // Prioritize critical actions
                 if (overduePlans.length > 0) {
                     potentialImpact = t("impactOverdue") || "Machine performance degradation, Warranty risk";
                     recommendedAction = t("actionOverdue") || "Schedule PM immediately";
                 } else if (chronicIssues.length > 0) {
                     potentialImpact = t("impactChronic") || "High risk of recurring breakdown";
                     recommendedAction = t("actionChronic") || "Root cause analysis required";
                 } else {
                     potentialImpact = t("impactCritical") || "Critical failure imminent";
                     recommendedAction = t("actionCritical") || "Stop and inspect immediately";
                 }
            } else {
                 // Warning level actions
                 if (hasMTBFData && timeSinceLastFail > avgFailTime * 0.8) {
                      potentialImpact = t("impactMTBF") || "Unexpected breakdown likely";
                      recommendedAction = t("actionMTBF") || "Inspect part condition, Prepare spares";
                 } else {
                      potentialImpact = t("impactWarning") || "Reduced efficiency";
                      recommendedAction = t("actionWarning") || "Monitor closely";
                 }
            }

            // SIMULATED DATA FOR DEMO PURPOSES ONLY (Remove in production)
            // Commented out as requested - relying on real data only now
            /*
            if (riskList.length === 0) {
                // If there are ANY machines, pick the first one to be the "victim" for demo
                // If no machines at all, we can't show anything attached to a machine name
                const targetMachine = machines.length > 0 ? machines[0] : { id: 'demo-01', name: 'Demo Mixer Machine' };
                
                riskScore = 85;
                reasons.push("DEMO: " + (t("predMTBFWarning") || "Approaching MTBF"));
                reasons.push("DEMO: " + (t("predRecentFailures") || "Abnormal Vibration Detected"));
                potentialImpact = "Bearing seizure likely, Motor burnout risk";
                recommendedAction = "Check vibration levels, Inspect lubrication, Verify belt tension";
                
                // Add to list manually since we're forcing it
                riskList.push({
                    id: targetMachine.id,
                    machine: targetMachine.name,
                    riskLabel: t("statusHighRisk"),
                    riskLevel: riskScore,
                    prediction: reasons.join(", ") || t("predRoutineCheck"),
                    timeframe: t("predImmediate"),
                    status: 'critical',
                    potentialImpact,
                    recommendedAction,
                    metrics: { 
                        failures: 3,
                        overdue: 1
                    }
                });
                
                // Update stats manually for demo
                highRiskCount = 1;
                healthyCount = Math.max(0, machines.length - 1);
            }
            */

            // Cap Score
            if (riskScore > 95) riskScore = 95;
            if (riskScore < 5) riskScore = 5; // Minimum risk always exists

            // Determine Status
            let status = 'healthy';
            let riskLabel = t("statusHealthy");
            
            if (riskScore >= 70) {
                status = 'critical';
                riskLabel = t("statusHighRisk");
                highRiskCount++;
            } else if (riskScore >= 30) {
                status = 'warning';
                riskLabel = t("statusMonitoring");
                monitoringCount++;
            } else {
                healthyCount++;
            }

            // Only add to list if there is some risk or it's a monitored machine
            if (riskScore > 10) {
                riskList.push({
                    id: machine.id,
                    machine: machine.name,
                    riskLabel,
                    riskLevel: riskScore,
                    prediction: reasons.join(", ") || t("predRoutineCheck"),
                    timeframe: overduePlans.length > 0 ? t("predImmediate") : t("predWithinWeeks"),
                    status,
                    potentialImpact,
                    recommendedAction,
                    metrics: { 
                        failures: recentFailures.length,
                        overdue: overduePlans.length
                    }
                });
            }
        });

        // Sort by risk level descending
        riskList.sort((a, b) => b.riskLevel - a.riskLevel);

        setPredictions(riskList);
        
        // Calculate Reliability (Simple formula: 100 - (High Risk %))
        const total = machines.length || 1;
        const reliability = Math.round(((total - highRiskCount) / total) * 100);

        setStats({
            highRisk: highRiskCount,
            monitoring: monitoringCount,
            healthy: healthyCount,
            reliability
        });
    };

    return (
        <div className="min-h-screen bg-bg-primary">
            <Header />

            <main className="main-container px-4 py-6 sm:px-6 mb-20">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <ActivityIcon size={20} className="text-primary-light" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-text-primary">{t("navPredictive")}</h1>
                            <p className="text-sm text-text-muted">{t("predictiveSubtitle")}</p>
                        </div>
                    </div>
                    {analyzing && (
                        <div className="flex items-center gap-2 bg-bg-tertiary px-3 py-1.5 rounded-full border border-border-light animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            <span className="text-xs font-medium text-text-secondary">{t("predictiveAnalyzing")}</span>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                         <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                         <p className="text-text-muted animate-pulse">{t("msgLoading") || "Loading data..."}</p>
                    </div>
                ) : (
                    <>
                        {/* Predict Insight Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="card bg-bg-secondary border-l-4 border-l-accent-red">
                                <div className="flex justify-between items-start mb-2">
                                    <AlertTriangleIcon className="text-accent-red" size={20} />
                                    <span className="badge badge-error">{t("statusHighRisk")}</span>
                                </div>
                                <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">{t("predictiveCriticalTitle")}</h4>
                                <div className="text-2xl font-bold text-text-primary">{t("predictiveMachineCount", { count: stats.highRisk })}</div>
                            </div>
                            <div className="card bg-bg-secondary border-l-4 border-l-accent-yellow">
                                <div className="flex justify-between items-start mb-2">
                                    <ZapIcon className="text-accent-yellow" size={20} />
                                    <span className="badge badge-warning">{t("statusMonitoring")}</span>
                                </div>
                                <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">{t("predictiveUpcomingTitle")}</h4>
                                <div className="text-2xl font-bold text-text-primary">{t("predictiveAreaCount", { count: stats.monitoring })}</div>
                            </div>
                            <div className="card bg-bg-secondary border-l-4 border-l-accent-green">
                                <div className="flex justify-between items-start mb-2">
                                    <TrendingUpIcon className="text-accent-green" size={20} />
                                    <span className="badge badge-primary">{t("statusHealthy")}</span>
                                </div>
                                <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">{t("predictiveHealthTitle")}</h4>
                                <div className="text-2xl font-bold text-text-primary">{stats.reliability}% {t("predictiveReliable")}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Prediction List */}
                            <div className="lg:col-span-1 space-y-4">
                                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                    <ActivityIcon size={16} />
                                    {t("predictiveRiskAnalysis")}
                                </h3>
                                
                                {predictions.length > 0 ? (
                                    predictions.map((p) => (
                                        <div key={p.id} className="card p-4 hover:border-primary/30 transition-all cursor-pointer group">
                                            <div className="flex justify-between mb-3">
                                                <h4 className="font-bold text-text-primary">{p.machine}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'critical' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-yellow/20 text-accent-yellow'
                                                    }`}>
                                                    {p.riskLabel}
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-secondary mb-2">{p.prediction}</p>
                                            
                                            {/* NEW SECTION FOR DETAILS */}
                                            {(p.potentialImpact || p.recommendedAction) && (
                                                <div className="bg-bg-tertiary/50 rounded-lg p-3 mb-3 text-xs space-y-2 border border-white/5">
                                                    {p.potentialImpact && (
                                                        <div>
                                                            <span className="text-text-muted block mb-0.5 font-semibold">{t("labelPotentialImpact") || "Potential Impact"}:</span>
                                                            <span className="text-accent-red/90">{p.potentialImpact}</span>
                                                        </div>
                                                    )}
                                                    {p.recommendedAction && (
                                                        <div>
                                                            <span className="text-text-muted block mb-0.5 font-semibold">{t("labelRecommendedAction") || "Recommended Action"}:</span>
                                                            <span className="text-accent-cyan/90">{p.recommendedAction}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
                                                <SettingsIcon size={12} />
                                                <span>{t("predictivePredictedWithin")}: {p.timeframe}</span>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] mb-1">
                                                    <span className="text-text-muted">{t("predictiveProb")}</span>
                                                    <span className="text-text-primary font-bold">{p.riskLevel}%</span>
                                                </div>
                                                <div className="w-full bg-bg-tertiary h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${p.status === 'critical' ? 'bg-accent-red shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-accent-yellow'
                                                            }`}
                                                        style={{ width: `${p.riskLevel}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="card p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-border-light bg-transparent">
                                        <BoxIcon size={32} className="text-text-muted mb-2 opacity-50" />
                                        <p className="text-sm text-text-muted">{t("msgNoRisksFound") || "No high risk machines found."}</p>
                                        <p className="text-xs text-text-muted/70 mt-1">{t("msgSystemHealthy") || "All systems are operating normally."}</p>
                                    </div>
                                )}
                            </div>

                            {/* Trend Chart (Placeholder for now as no real sensor data) */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                        <TrendingUpIcon size={16} />
                                        {t("predictiveRealtimeLogic")}
                                    </h3>
                                    <div className="flex gap-2 opacity-50">
                                        <span className="flex items-center gap-1 text-[10px] text-text-muted">
                                            <div className="w-2 h-2 rounded-full bg-accent-red" /> {t("temperature")}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] text-text-muted">
                                            <div className="w-2 h-2 rounded-full bg-accent-cyan" /> {t("vibration")}
                                        </span>
                                    </div>
                                </div>

                                <div className="card h-[400px] flex flex-col items-center justify-center p-6 bg-bg-secondary/50 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
                                    
                                    <div className="z-10 flex flex-col items-center text-center max-w-md">
                                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 border border-white/5">
                                            <ZapIcon size={32} className="text-text-muted" />
                                        </div>
                                        <h3 className="text-lg font-bold text-text-primary mb-2">
                                            {t("msgDataNotReady") || "Data Not Available"}
                                        </h3>
                                        <p className="text-sm text-text-muted mb-6">
                                            {t("msgConnectSensors") || "Real-time sensor data is not available. Please connect IoT sensors or integration modules to view live telemetry."}
                                        </p>
                                        
                                        {/* Optional: Add a button or status indicator */}
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-primary border border-white/10">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="text-xs text-text-secondary">IoT Gateway Offline</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            <MobileNav />
        </div>
    );
}
