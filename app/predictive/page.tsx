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
import { subscribeToSensorData, startSimulation, SensorReading } from "../lib/sensorService";

// Simulated Predictive Data
const sensorData = [
    { time: "08:00", temp: 55, vibration: 1.2, current: 8.5 },
    { time: "09:00", temp: 58, vibration: 1.4, current: 8.7 },
    { time: "10:00", temp: 62, vibration: 1.8, current: 9.2 },
    { time: "11:00", temp: 65, vibration: 2.1, current: 9.8 },
    { time: "12:00", temp: 68, vibration: 2.5, current: 10.5 },
    { time: "13:00", temp: 72, vibration: 3.2, current: 11.2 },
    { time: "14:00", temp: 75, vibration: 3.8, current: 12.0 },
];

export default function PredictivePage() {
    const { t } = useLanguage();
    const [analyzing, setAnalyzing] = useState(true);
    const [liveData, setLiveData] = useState<any[]>(sensorData);

    useEffect(() => {
        const timer = setTimeout(() => setAnalyzing(false), 1500);

        // Start IoT Simulation for Mixer A-01
        const stopSim = startSimulation("Mixer A-01");

        // Subscribe to data
        const unsubscribe = subscribeToSensorData("Mixer A-01", (readings) => {
            if (readings.length > 0) {
                const formatted = readings.map(r => ({
                    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    temp: r.temperature,
                    vibration: r.vibration,
                    current: r.current
                }));
                // Keep the original simulated data as background and append/replace with live
                setLiveData(prev => {
                    const combined = [...prev, ...formatted].slice(-10); // Keep last 10 points
                    return combined;
                });
            }
        });

        return () => {
            clearTimeout(timer);
            stopSim();
            unsubscribe();
        };
    }, []);

    const predictions = [
        {
            id: 1,
            machine: "Mixer A-01",
            riskLabel: t("statusHighRisk"),
            riskLevel: 85,
            prediction: t("predBearingFailure"),
            timeframe: t("predictiveWithinHours", { hours: 48 }),
            status: "critical",
            metrics: { temp: "75°C (+15%)", vib: "3.8 mm/s (+45%)" }
        },
        {
            id: 2,
            machine: "Pie Line Folder",
            riskLabel: t("statusMonitoring"),
            riskLevel: 42,
            prediction: t("predBeltTension"),
            timeframe: t("predictiveWithinDays", { days: 7 }),
            status: "warning",
            metrics: { temp: "42°C (Normal)", vib: "1.2 mm/s (+10%)" }
        }
    ];

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

                {/* Predict Insight Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="card bg-bg-secondary border-l-4 border-l-accent-red">
                        <div className="flex justify-between items-start mb-2">
                            <AlertTriangleIcon className="text-accent-red" size={20} />
                            <span className="badge badge-error">{t("statusHighRisk")}</span>
                        </div>
                        <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">{t("predictiveCriticalTitle")}</h4>
                        <div className="text-2xl font-bold text-text-primary">{t("predictiveMachineCount", { count: 1 })}</div>
                    </div>
                    <div className="card bg-bg-secondary border-l-4 border-l-accent-yellow">
                        <div className="flex justify-between items-start mb-2">
                            <ZapIcon className="text-accent-yellow" size={20} />
                            <span className="badge badge-warning">{t("statusMonitoring")}</span>
                        </div>
                        <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">{t("predictiveUpcomingTitle")}</h4>
                        <div className="text-2xl font-bold text-text-primary">{t("predictiveAreaCount", { count: 3 })}</div>
                    </div>
                    <div className="card bg-bg-secondary border-l-4 border-l-accent-green">
                        <div className="flex justify-between items-start mb-2">
                            <TrendingUpIcon className="text-accent-green" size={20} />
                            <span className="badge badge-primary">{t("statusHealthy")}</span>
                        </div>
                        <h4 className="text-xs text-text-muted uppercase tracking-wider mb-1">{t("predictiveHealthTitle")}</h4>
                        <div className="text-2xl font-bold text-text-primary">92% {t("predictiveReliable")}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Prediction List */}
                    <div className="lg:col-span-1 space-y-4">
                        <h3 className="font-semibold text-text-primary flex items-center gap-2">
                            <ActivityIcon size={16} />
                            {t("predictiveRiskAnalysis")}
                        </h3>
                        {predictions.map((p) => (
                            <div key={p.id} className="card p-4 hover:border-primary/30 transition-all cursor-pointer group">
                                <div className="flex justify-between mb-3">
                                    <h4 className="font-bold text-text-primary">{p.machine}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'critical' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-yellow/20 text-accent-yellow'
                                        }`}>
                                        {p.riskLabel}
                                    </span>
                                </div>
                                <p className="text-sm text-text-secondary mb-2">{p.prediction}</p>
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
                        ))}
                    </div>

                    {/* Trend Chart */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-text-primary flex items-center gap-2">
                                <TrendingUpIcon size={16} />
                                {t("predictiveRealtimeLogic")}
                            </h3>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                                    <div className="w-2 h-2 rounded-full bg-accent-red" /> {t("temperature")}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                                    <div className="w-2 h-2 rounded-full bg-accent-cyan" /> {t("vibration")}
                                </span>
                            </div>
                        </div>

                        <div className="card h-[400px] flex flex-col p-6">
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={liveData}>
                                        <defs>
                                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="time" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                            itemStyle={{ fontSize: '12px' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="temp"
                                            stroke="#EF4444"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorTemp)"
                                            animationDuration={2000}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="vibration"
                                            stroke="#22D3EE"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorVib)"
                                            animationDuration={2500}
                                        />
                                        <ReferenceLine y={70} label={{ position: 'right', value: 'Threshold', fill: '#EF4444', fontSize: 10 }} stroke="#EF4444" strokeDasharray="3 3" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border-light flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-accent-red/10 rounded-lg text-accent-red">
                                        <ThermometerIcon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted leading-none">{t("predictiveAvgTemp")}</p>
                                        <p className="font-bold text-text-primary">66.4°C</p>
                                    </div>
                                    <ChevronRightIcon size={14} className="text-text-muted mx-2" />
                                    <div className="p-2 bg-accent-cyan/10 rounded-lg text-accent-cyan">
                                        <ActivityIcon size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted leading-none">{t("predictiveAvgVib")}</p>
                                        <p className="font-bold text-text-primary">2.34 mm/s</p>
                                    </div>
                                </div>
                                <button className="btn btn-outline text-xs py-2 px-4 border-white/10 hover:bg-primary/10 hover:text-primary transition-all">
                                    {t("predictiveViewReports")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    );
}
