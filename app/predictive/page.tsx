"use client";

import React, { useState, useEffect, useMemo } from "react";
import Header from "../components/Header";
import MobileNav from "../components/MobileNav";
import { useLanguage } from "../contexts/LanguageContext";
import {
    ActivityIcon,
    AlertTriangleIcon,
    TrendingUpIcon,
    SettingsIcon,
    ZapIcon,
    BoxIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    WrenchIcon,
    HistoryIcon,
} from "../components/ui/Icons";
import { getMachines, getMaintenanceRecords, getPMPlans, getParts } from "../lib/firebaseService";
import { Machine, MaintenanceRecord, PMPlan, Part } from "../types";

// ==================== TYPES ====================

interface AnalysisDimension {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    score: number;      // 0-100 raw score for this dimension
    weight: number;      // 0-1 weight factor
    weighted: number;    // score * weight
    color: string;
    details: string[];   // Human-readable explanations
    methodology: string; // How we calculated it
}

interface MachinePrediction {
    id: string;
    machine: Machine;
    riskScore: number;         // 0-100 final weighted score
    riskLevel: 'critical' | 'high' | 'warning' | 'healthy';
    riskLabel: string;
    dimensions: AnalysisDimension[];
    topIssues: string[];
    recommendedActions: string[];
    potentialImpact: string;
    dataQuality: number;        // 0-100 how much data we have to make this prediction
    recordCount: number;        // total records analyzed
    pmPlanCount: number;        // PM plans for this machine
    partCount: number;          // parts associated
    lastMaintenance?: Date;
    nextDuePM?: Date;
}

interface PredictiveStats {
    critical: number;
    high: number;
    warning: number;
    healthy: number;
    totalMachines: number;
    systemReliability: number;
    avgDataQuality: number;
    totalRecordsAnalyzed: number;
}

// ==================== ANALYSIS ENGINE ====================

function analyzeMachine(
    machine: Machine,
    allRecords: MaintenanceRecord[],
    allPlans: PMPlan[],
    allParts: Part[],
): MachinePrediction {

    const machineRecords = allRecords.filter(r =>
        r.machineId === machine.id || r.machineName === machine.name
    );

    const machinePlans = allPlans.filter(p =>
        p.machineId === machine.id || p.machineName === machine.name
    );

    const machineParts = allParts.filter(p =>
        p.machineId === machine.id || p.machineName === machine.name
    );

    const now = new Date();
    const dimensions: AnalysisDimension[] = [];

    // ─── Dimension 1: PM Overdue Score (25%) ───
    const dim1 = analyzePMOverdue(machinePlans, now);
    dimensions.push(dim1);

    // ─── Dimension 2: PM Compliance Score (15%) ───
    const dim2 = analyzePMCompliance(machinePlans, machineRecords);
    dimensions.push(dim2);

    // ─── Dimension 3: Corrective Frequency + MTBF (20%) ───
    const dim3 = analyzeCorrectiveFrequency(machineRecords, now);
    dimensions.push(dim3);

    // ─── Dimension 4: Part Lifecycle Analysis (15%) ───
    const dim4 = analyzePartLifecycle(machineParts, machineRecords, now);
    dimensions.push(dim4);

    // ─── Dimension 5: Checklist Trend Analysis (10%) ───
    const dim5 = analyzeChecklistTrends(machineRecords);
    dimensions.push(dim5);

    // ─── Dimension 6: Chronic Issue Detection (10%) ───
    const dim6 = analyzeChronicIssues(machineRecords);
    dimensions.push(dim6);

    // ─── Dimension 7: Machine Age & Hours (5%) ───
    const dim7 = analyzeMachineAge(machine);
    dimensions.push(dim7);

    // ─── Calculate Final Weighted Score ───
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const weightedScore = dimensions.reduce((sum, d) => sum + d.weighted, 0) / (totalWeight || 1);
    const riskScore = Math.min(95, Math.max(5, Math.round(weightedScore)));

    // ─── Data Quality ───
    let dataQuality = 0;
    if (machineRecords.length > 0) dataQuality += 30;
    if (machineRecords.length > 5) dataQuality += 15;
    if (machineRecords.length > 20) dataQuality += 10;
    if (machinePlans.length > 0) dataQuality += 20;
    if (machineParts.length > 0) dataQuality += 15;
    const hasChecklist = machineRecords.some(r => r.checklist && r.checklist.length > 0);
    if (hasChecklist) dataQuality += 10;
    dataQuality = Math.min(100, dataQuality);

    // ─── Risk Level ───
    let riskLevel: MachinePrediction['riskLevel'] = 'healthy';
    let riskLabel = '✅ ปกติ';
    if (riskScore >= 71) { riskLevel = 'critical'; riskLabel = '🔴 วิกฤต'; }
    else if (riskScore >= 46) { riskLevel = 'high'; riskLabel = '🟠 ความเสี่ยงสูง'; }
    else if (riskScore >= 21) { riskLevel = 'warning'; riskLabel = '🟡 เฝ้าระวัง'; }

    // ─── Top Issues ───
    const topIssues = dimensions
        .filter(d => d.score > 20)
        .sort((a, b) => b.weighted - a.weighted)
        .flatMap(d => d.details.slice(0, 2));

    // ─── Recommended Actions ───
    const recommendedActions = generateRecommendations(dimensions, machine, machinePlans, machineParts);

    // ─── Potential Impact ───
    const potentialImpact = generateImpactAssessment(dimensions, riskLevel, machine);

    // ─── Last Maintenance ───
    const sortedRecords = [...machineRecords].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastMaintenance = sortedRecords.length > 0 ? new Date(sortedRecords[0].date) : undefined;

    // ─── Next Due PM ───
    const upcomingPMs = machinePlans
        .filter(p => p.nextDueDate)
        .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
    const nextDuePM = upcomingPMs.length > 0 ? new Date(upcomingPMs[0].nextDueDate) : undefined;

    return {
        id: machine.id,
        machine,
        riskScore,
        riskLevel,
        riskLabel,
        dimensions,
        topIssues,
        recommendedActions,
        potentialImpact,
        dataQuality,
        recordCount: machineRecords.length,
        pmPlanCount: machinePlans.length,
        partCount: machineParts.length,
        lastMaintenance,
        nextDuePM,
    };
}

// ─── Dimension 1: PM Overdue ───
function analyzePMOverdue(plans: PMPlan[], now: Date): AnalysisDimension {
    let score = 0;
    const details: string[] = [];
    const methodParts: string[] = [];

    const overduePlans = plans.filter(p => {
        if (!p.nextDueDate) return false;
        return new Date(p.nextDueDate) < now && p.status === 'active';
    });

    if (overduePlans.length === 0) {
        details.push('ไม่มีแผน PM ที่ค้างเกินกำหนด');
        methodParts.push('ตรวจสอบแผน PM ทั้งหมด → ไม่พบแผนที่เกินกำหนด → คะแนน 0');
    } else {
        overduePlans.forEach(p => {
            const delayMs = now.getTime() - new Date(p.nextDueDate).getTime();
            const delayDays = Math.floor(delayMs / (1000 * 3600 * 24));

            if (delayDays > 30) {
                score += 40;
                details.push(`⚠️ "${p.taskName}" ล่าช้า ${delayDays} วัน (วิกฤต: +40)`);
            } else if (delayDays > 7) {
                score += 25;
                details.push(`⚠ "${p.taskName}" ล่าช้า ${delayDays} วัน (สูง: +25)`);
            } else {
                score += 15;
                details.push(`📋 "${p.taskName}" ล่าช้า ${delayDays} วัน (ปานกลาง: +15)`);
            }
        });
        methodParts.push(`พบ ${overduePlans.length} แผน PM เกินกำหนด → คะแนนตามระดับความล่าช้า`);
    }

    score = Math.min(100, score);

    return {
        id: 'pm_overdue',
        name: 'แผน PM ค้าง',
        nameEn: 'PM Overdue',
        icon: '📋',
        score,
        weight: 0.25,
        weighted: score * 0.25,
        color: score > 50 ? '#ef4444' : score > 20 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `ตรวจสอบแผน PM ที่ nextDueDate < วันนี้\n• ล่าช้า 1-7 วัน → +15\n• ล่าช้า 8-30 วัน → +25\n• ล่าช้า >30 วัน → +40\n${methodParts.join('\n')}`,
    };
}

// ─── Dimension 2: PM Compliance ───
function analyzePMCompliance(plans: PMPlan[], records: MaintenanceRecord[]): AnalysisDimension {
    let score = 0;
    const details: string[] = [];

    const pmRecords = records.filter(r =>
        r.type === 'preventive' || r.type === 'oilChange' || r.type === 'inspection'
    );

    const activePlans = plans.filter(p => p.status === 'active');

    if (activePlans.length === 0) {
        details.push('ไม่มีแผน PM → ไม่สามารถวัด Compliance ได้');
        return {
            id: 'pm_compliance', name: 'ความตรงเวลา PM', nameEn: 'PM Compliance',
            icon: '📊', score: 0, weight: 0.15, weighted: 0,
            color: '#6b7280', details,
            methodology: 'ไม่มีแผน PM จึงไม่มีข้อมูล Compliance',
        };
    }

    // Calculate compliance: plans with completedCount > 0 vs total
    const completedPlans = activePlans.filter(p => (p.completedCount || 0) > 0);
    const complianceRate = (completedPlans.length / activePlans.length) * 100;

    if (complianceRate >= 90) {
        score = 0;
        details.push(`✅ Compliance ${complianceRate.toFixed(0)}% (ดีเยี่ยม)`);
    } else if (complianceRate >= 70) {
        score = 10;
        details.push(`📊 Compliance ${complianceRate.toFixed(0)}% (ดี แต่ยังปรับปรุงได้)`);
    } else if (complianceRate >= 50) {
        score = 20;
        details.push(`⚠ Compliance ${complianceRate.toFixed(0)}% (ต้องปรับปรุง)`);
    } else {
        score = 30;
        details.push(`🔴 Compliance ${complianceRate.toFixed(0)}% (ต่ำมาก)`);
    }

    details.push(`มีแผน PM ${activePlans.length} แผน, ทำแล้ว ${completedPlans.length} แผน`);
    details.push(`ทำ PM ทั้งหมด ${pmRecords.length} ครั้ง`);

    return {
        id: 'pm_compliance', name: 'ความตรงเวลา PM', nameEn: 'PM Compliance',
        icon: '📊', score, weight: 0.15, weighted: score * 0.15,
        color: score > 20 ? '#ef4444' : score > 10 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `Compliance = (แผนที่ทำแล้ว / แผนทั้งหมด) × 100\n= (${completedPlans.length} / ${activePlans.length}) × 100 = ${complianceRate.toFixed(1)}%\n• ≥90% → 0 | 70-89% → 10 | 50-69% → 20 | <50% → 30`,
    };
}

// ─── Dimension 3: Corrective Frequency + MTBF ───
function analyzeCorrectiveFrequency(records: MaintenanceRecord[], now: Date): AnalysisDimension {
    let score = 0;
    const details: string[] = [];
    const methodParts: string[] = [];

    const correctiveRecords = records
        .filter(r => r.type === 'corrective')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recent failures (90 days)
    const ninetyDaysAgo = now.getTime() - (90 * 24 * 60 * 60 * 1000);
    const recentFailures = correctiveRecords.filter(r =>
        new Date(r.date).getTime() > ninetyDaysAgo
    );

    if (recentFailures.length === 0) {
        details.push('✅ ไม่มีงานซ่อมฉุกเฉินใน 90 วันที่ผ่านมา');
        methodParts.push('งานซ่อมฉุกเฉิน 90 วัน = 0 → +0');
    } else if (recentFailures.length <= 2) {
        score += 10;
        details.push(`📋 งานซ่อมฉุกเฉิน ${recentFailures.length} ครั้งใน 90 วัน (+10)`);
        methodParts.push(`งานซ่อมฉุกเฉิน 90 วัน = ${recentFailures.length} → +10`);
    } else if (recentFailures.length <= 5) {
        score += 25;
        details.push(`⚠ งานซ่อมฉุกเฉิน ${recentFailures.length} ครั้งใน 90 วัน (+25)`);
        methodParts.push(`งานซ่อมฉุกเฉิน 90 วัน = ${recentFailures.length} → +25`);
    } else {
        score += 40;
        details.push(`🔴 งานซ่อมฉุกเฉิน ${recentFailures.length} ครั้งใน 90 วัน! (+40)`);
        methodParts.push(`งานซ่อมฉุกเฉิน 90 วัน = ${recentFailures.length} → +40`);
    }

    // MTBF Analysis
    if (correctiveRecords.length >= 2) {
        let totalDiff = 0;
        for (let i = 1; i < correctiveRecords.length; i++) {
            totalDiff += new Date(correctiveRecords[i].date).getTime() - new Date(correctiveRecords[i - 1].date).getTime();
        }
        const avgFailTime = totalDiff / (correctiveRecords.length - 1);
        const avgDays = Math.floor(avgFailTime / (1000 * 3600 * 24));
        const lastFailTime = new Date(correctiveRecords[correctiveRecords.length - 1].date).getTime();
        const timeSinceLastFail = now.getTime() - lastFailTime;
        const daysSinceLastFail = Math.floor(timeSinceLastFail / (1000 * 3600 * 24));
        const ratio = timeSinceLastFail / avgFailTime;

        if (ratio > 1.0) {
            score += 35;
            details.push(`🔴 MTBF เกิน 100%: ผ่านมา ${daysSinceLastFail} วัน (เฉลี่ยเสีย ${avgDays} วัน) (+35)`);
        } else if (ratio > 0.8) {
            score += 20;
            details.push(`⚠ MTBF ใกล้ถึง: ผ่านมา ${daysSinceLastFail} วัน จากเฉลี่ย ${avgDays} วัน (+20)`);
        } else {
            details.push(`📊 MTBF ปกติ: ผ่านมา ${daysSinceLastFail} วัน จากเฉลี่ย ${avgDays} วัน`);
        }
        methodParts.push(`MTBF = ระยะเวลาเฉลี่ยระหว่างการเสีย = ${avgDays} วัน (จาก ${correctiveRecords.length} ครั้ง)\nเวลาที่ผ่านมาตั้งแต่เสียครั้งสุดท้าย = ${daysSinceLastFail} วัน (${(ratio * 100).toFixed(0)}% ของ MTBF)`);
    } else if (correctiveRecords.length === 1) {
        details.push(`📋 มีประวัติซ่อมฉุกเฉิน 1 ครั้ง (ยังไม่พอคำนวณ MTBF)`);
        methodParts.push('ต้องมีข้อมูลอย่างน้อย 2 ครั้งเพื่อคำนวณ MTBF');
    } else {
        details.push('✅ ไม่เคยมีงานซ่อมฉุกเฉิน');
        methodParts.push('ไม่มีข้อมูลงานซ่อมฉุกเฉิน');
    }

    score = Math.min(100, score);

    return {
        id: 'corrective_freq', name: 'ความถี่ซ่อมฉุกเฉิน + MTBF', nameEn: 'Corrective Freq & MTBF',
        icon: '🔧', score, weight: 0.20, weighted: score * 0.20,
        color: score > 50 ? '#ef4444' : score > 20 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `ส่วนที่ 1: นับงานซ่อมฉุกเฉิน 90 วัน\n• 0 → +0 | 1-2 → +10 | 3-5 → +25 | >5 → +40\n\nส่วนที่ 2: MTBF (Mean Time Between Failures)\n• วิธีคำนวณ: ผลรวมระยะห่างเวลา / (จำนวนครั้ง - 1)\n• ถ้าเวลาที่ผ่านมา > 80% MTBF → +20\n• ถ้าเวลาที่ผ่านมา > 100% MTBF → +35\n\n${methodParts.join('\n')}`,
    };
}

// ─── Dimension 4: Part Lifecycle ───
function analyzePartLifecycle(parts: Part[], records: MaintenanceRecord[], now: Date): AnalysisDimension {
    let score = 0;
    const details: string[] = [];
    const methodParts: string[] = [];

    // Check parts with expectedLifespanDays
    const partsWithLifespan = parts.filter(p => p.expectedLifespanDays && p.expectedLifespanDays > 0);

    if (partsWithLifespan.length === 0) {
        // Check from replacement records
        const replacementRecords = records.filter(r => r.type === 'partReplacement');
        if (replacementRecords.length > 0) {
            details.push(`📋 มีประวัติเปลี่ยนอะไหล่ ${replacementRecords.length} ครั้ง`);

            // Group by partName to detect repeat replacements
            const partReplacements: Record<string, { count: number, dates: Date[] }> = {};
            replacementRecords.forEach(r => {
                const key = r.partName || r.description?.substring(0, 30) || 'Unknown';
                if (!partReplacements[key]) partReplacements[key] = { count: 0, dates: [] };
                partReplacements[key].count++;
                partReplacements[key].dates.push(new Date(r.date));
            });

            Object.entries(partReplacements).forEach(([name, data]) => {
                if (data.count >= 2) {
                    // Calculate average replacement interval
                    data.dates.sort((a, b) => a.getTime() - b.getTime());
                    let totalInterval = 0;
                    for (let i = 1; i < data.dates.length; i++) {
                        totalInterval += data.dates[i].getTime() - data.dates[i - 1].getTime();
                    }
                    const avgInterval = totalInterval / (data.dates.length - 1);
                    const avgDays = Math.floor(avgInterval / (1000 * 3600 * 24));
                    const lastDate = data.dates[data.dates.length - 1];
                    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
                    const remainingRatio = 1 - (daysSince / avgDays);

                    if (remainingRatio < 0) {
                        score += 40;
                        details.push(`🔴 "${name}" เกินรอบเปลี่ยน (เปลี่ยนทุก ~${avgDays} วัน, ผ่านมา ${daysSince} วัน) (+40)`);
                    } else if (remainingRatio < 0.1) {
                        score += 30;
                        details.push(`⚠ "${name}" ใกล้ครบรอบเปลี่ยน (เหลือ <10%) (+30)`);
                    } else if (remainingRatio < 0.3) {
                        score += 15;
                        details.push(`📊 "${name}" เหลืออายุ ~${Math.round(remainingRatio * 100)}% (เปลี่ยนทุก ~${avgDays} วัน) (+15)`);
                    }

                    methodParts.push(`"${name}": เปลี่ยน ${data.count} ครั้ง → เฉลี่ย ${avgDays} วัน/รอบ → ผ่านมา ${daysSince} วัน`);
                }
            });
        } else {
            details.push('ไม่มีข้อมูลอายุอะไหล่หรือประวัติเปลี่ยน');
        }
    } else {
        partsWithLifespan.forEach(p => {
            const lastReplaced = p.lastReplacedDate ? new Date(p.lastReplacedDate) : (p.createdAt ? new Date(p.createdAt) : null);
            if (!lastReplaced) return;

            const daysSince = Math.floor((now.getTime() - lastReplaced.getTime()) / (1000 * 3600 * 24));
            const remaining = (p.expectedLifespanDays || 0) - daysSince;
            const remainingRatio = remaining / (p.expectedLifespanDays || 1);

            if (remainingRatio < 0) {
                score += 40;
                details.push(`🔴 "${p.partName}" เกินอายุการใช้งาน (${Math.abs(remaining)} วัน) (+40)`);
            } else if (remainingRatio < 0.1) {
                score += 30;
                details.push(`⚠ "${p.partName}" เหลืออายุ ${remaining} วัน (${(remainingRatio * 100).toFixed(0)}%) (+30)`);
            } else if (remainingRatio < 0.3) {
                score += 15;
                details.push(`📊 "${p.partName}" เหลืออายุ ${remaining} วัน (${(remainingRatio * 100).toFixed(0)}%) (+15)`);
            } else {
                details.push(`✅ "${p.partName}" เหลืออายุ ${remaining} วัน (${(remainingRatio * 100).toFixed(0)}%)`);
            }
        });
    }

    if (details.length === 0) {
        details.push('ไม่มีข้อมูลอะไหล่เพียงพอสำหรับวิเคราะห์');
    }

    score = Math.min(100, score);

    return {
        id: 'part_lifecycle', name: 'อายุอะไหล่', nameEn: 'Part Lifecycle',
        icon: '⚙️', score, weight: 0.15, weighted: score * 0.15,
        color: score > 50 ? '#ef4444' : score > 20 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `วิเคราะห์จาก:\n1. expectedLifespanDays ของอะไหล่ vs วันที่ใช้งานจริง\n2. ประวัติเปลี่ยนอะไหล่ → คำนวณรอบเฉลี่ย\n• เหลือ >30% → ปกติ\n• เหลือ 10-30% → +15 (เฝ้าระวัง)\n• เหลือ <10% → +30 (ใกล้ครบ)\n• เกินอายุ → +40 (อันตราย)\n${methodParts.join('\n')}`,
    };
}

// ─── Dimension 5: Checklist Trends ───
function analyzeChecklistTrends(records: MaintenanceRecord[]): AnalysisDimension {
    let score = 0;
    const details: string[] = [];

    const recordsWithChecklist = records.filter(r => r.checklist && r.checklist.length > 0);

    if (recordsWithChecklist.length === 0) {
        details.push('ไม่มีข้อมูล checklist สำหรับวิเคราะห์');
        return {
            id: 'checklist_trends', name: 'แนวโน้มจาก Checklist', nameEn: 'Checklist Trends',
            icon: '📈', score: 0, weight: 0.10, weighted: 0,
            color: '#6b7280', details,
            methodology: 'ไม่มีข้อมูล checklist',
        };
    }

    // Count items with "ถึงกำหนดเปลี่ยน" or "ผิดปกติ"
    let dueChangeCount = 0;
    let abnormalCount = 0;
    let fairConditionCount = 0;

    recordsWithChecklist.forEach(r => {
        r.checklist?.forEach(item => {
            const val = item.value?.toLowerCase() || '';
            if (val.includes('ถึงกำหนดเปลี่ยน')) dueChangeCount++;
            if (val.includes('ผิดปกติ') || val.includes('abnormal')) abnormalCount++;
            if (val.includes('พอใช้')) fairConditionCount++;

            // Check numeric values against standard
            if (item.standard && item.value) {
                const numVal = parseFloat(item.value);
                if (!isNaN(numVal)) {
                    if (item.standard.min !== undefined && numVal < item.standard.min) {
                        abnormalCount++;
                    }
                    if (item.standard.max !== undefined && numVal > item.standard.max) {
                        abnormalCount++;
                    }
                }
            }
        });
    });

    if (dueChangeCount > 0) {
        score += 20 * Math.min(3, dueChangeCount);
        details.push(`🔴 พบ ${dueChangeCount} รายการ "ถึงกำหนดเปลี่ยน" (+${20 * Math.min(3, dueChangeCount)})`);
    }
    if (abnormalCount > 0) {
        score += 10 * Math.min(3, abnormalCount);
        details.push(`⚠ พบ ${abnormalCount} รายการค่าผิดปกติ/เกินมาตรฐาน (+${10 * Math.min(3, abnormalCount)})`);
    }
    if (fairConditionCount >= 3) {
        score += 10;
        details.push(`📊 พบ "พอใช้" ซ้ำ ${fairConditionCount} ครั้ง (แนวโน้มเสื่อม) (+10)`);
    }
    if (score === 0) {
        details.push(`✅ Checklist ทั้งหมดปกติ (${recordsWithChecklist.length} ครั้ง)`);
    }

    details.push(`วิเคราะห์จาก ${recordsWithChecklist.length} ใบงาน PM`);

    score = Math.min(100, score);

    return {
        id: 'checklist_trends', name: 'แนวโน้มจาก Checklist', nameEn: 'Checklist Trends',
        icon: '📈', score, weight: 0.10, weighted: score * 0.10,
        color: score > 50 ? '#ef4444' : score > 20 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `วิเคราะห์ค่าจาก checklist ย้อนหลัง ${recordsWithChecklist.length} ครั้ง:\n• "ถึงกำหนดเปลี่ยน" → +20 ต่อรายการ\n• ค่าเกินมาตรฐาน/ผิดปกติ → +10 ต่อรายการ\n• "พอใช้" ซ้ำ ≥3 ครั้ง → +10 (แนวโน้มเสื่อม)`,
    };
}

// ─── Dimension 6: Chronic Issues ───
function analyzeChronicIssues(records: MaintenanceRecord[]): AnalysisDimension {
    let score = 0;
    const details: string[] = [];

    const correctiveRecords = records.filter(r => r.type === 'corrective');
    const failureCounts: Record<string, number> = {};

    correctiveRecords.forEach(r => {
        const key = r.partName || (r.description ? r.description.substring(0, 30) : 'Unknown');
        failureCounts[key] = (failureCounts[key] || 0) + 1;
    });

    const chronicIssues = Object.entries(failureCounts)
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1]);

    if (chronicIssues.length === 0) {
        details.push('✅ ไม่พบปัญหาซ้ำซาก (ปัญหาเดิมเกิดน้อยกว่า 3 ครั้ง)');
    } else {
        chronicIssues.forEach(([issue, count]) => {
            if (count >= 5) {
                score += 45;
                details.push(`🔴 "${issue}" เสียซ้ำ ${count} ครั้ง (วิกฤต: +45)`);
            } else {
                score += 30;
                details.push(`⚠ "${issue}" เสียซ้ำ ${count} ครั้ง (ต้องหาสาเหตุ: +30)`);
            }
        });
    }

    // Also check for repeat part replacements
    const partReplacements = records.filter(r => r.type === 'partReplacement');
    const partCounts: Record<string, number> = {};
    partReplacements.forEach(r => {
        const key = r.partName || r.description?.substring(0, 30) || 'Unknown';
        partCounts[key] = (partCounts[key] || 0) + 1;
    });

    const repeatParts = Object.entries(partCounts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]);

    if (repeatParts.length > 0) {
        repeatParts.forEach(([part, count]) => {
            details.push(`🔩 เปลี่ยน "${part}" ซ้ำ ${count} ครั้ง`);
        });
    }

    score = Math.min(100, score);

    return {
        id: 'chronic_issues', name: 'ปัญหาซ้ำซาก', nameEn: 'Chronic Issues',
        icon: '🔄', score, weight: 0.10, weighted: score * 0.10,
        color: score > 30 ? '#ef4444' : score > 0 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `วิเคราะห์จากประวัติซ่อม (corrective) ทั้งหมด:\n• จับกลุ่มตาม partName / description\n• ปัญหาเดิมเกิด ≥3 ครั้ง → +30 (Chronic)\n• ปัญหาเดิมเกิด ≥5 ครั้ง → +45 (Critical Chronic)\n• ตรวจสอบการเปลี่ยนอะไหล่ซ้ำด้วย\n\nพบ corrective ทั้งหมด ${correctiveRecords.length} ครั้ง`,
    };
}

// ─── Dimension 7: Machine Age & Hours ───
function analyzeMachineAge(machine: Machine): AnalysisDimension {
    let score = 0;
    const details: string[] = [];

    const hours = machine.operatingHours || 0;

    if (hours > 50000) {
        score += 20;
        details.push(`🔴 ชั่วโมงทำงาน ${hours.toLocaleString()} ชม. (สูงมาก: +20)`);
    } else if (hours > 20000) {
        score += 10;
        details.push(`⚠ ชั่วโมงทำงาน ${hours.toLocaleString()} ชม. (สูง: +10)`);
    } else if (hours > 10000) {
        score += 5;
        details.push(`📊 ชั่วโมงทำงาน ${hours.toLocaleString()} ชม. (+5)`);
    } else if (hours > 0) {
        details.push(`✅ ชั่วโมงทำงาน ${hours.toLocaleString()} ชม. (ปกติ)`);
    } else {
        details.push('ไม่มีข้อมูลชั่วโมงทำงาน');
    }

    // Installation date analysis
    if (machine.installationDate) {
        const installDate = new Date(machine.installationDate);
        const ageYears = Math.floor((Date.now() - installDate.getTime()) / (1000 * 3600 * 24 * 365));
        if (ageYears > 10) {
            score += 10;
            details.push(`📅 อายุเครื่องจักร ${ageYears} ปี (เก่า: +10)`);
        } else if (ageYears > 5) {
            score += 5;
            details.push(`📅 อายุเครื่องจักร ${ageYears} ปี (+5)`);
        } else if (ageYears > 0) {
            details.push(`📅 อายุเครื่องจักร ${ageYears} ปี (ปกติ)`);
        }
    }

    score = Math.min(100, score);

    return {
        id: 'machine_age', name: 'อายุเครื่องจักร', nameEn: 'Machine Age & Hours',
        icon: '🏭', score, weight: 0.05, weighted: score * 0.05,
        color: score > 15 ? '#f59e0b' : '#22c55e',
        details,
        methodology: `ชั่วโมงทำงาน:\n• >10,000 → +5\n• >20,000 → +10\n• >50,000 → +20\n\nอายุเครื่อง:\n• >5 ปี → +5\n• >10 ปี → +10`,
    };
}

// ─── Recommendation Generator ───
function generateRecommendations(dims: AnalysisDimension[], machine: Machine, plans: PMPlan[], parts: Part[]): string[] {
    const actions: string[] = [];

    dims.sort((a, b) => b.weighted - a.weighted);

    dims.forEach(d => {
        if (d.id === 'pm_overdue' && d.score > 0) {
            actions.push('🔧 ดำเนินการตามแผน PM ที่ค้างทันที');
        }
        if (d.id === 'pm_compliance' && d.score > 20) {
            actions.push('📋 ปรับปรุงการทำ PM ให้ตรงเวลามากขึ้น');
        }
        if (d.id === 'corrective_freq' && d.score > 30) {
            actions.push('🔍 วิเคราะห์หาสาเหตุที่แท้จริง (Root Cause Analysis)');
        }
        if (d.id === 'part_lifecycle' && d.score > 20) {
            actions.push('⚙️ เตรียมเบิกอะไหล่ล่วงหน้าสำหรับชิ้นส่วนที่ใกล้ครบอายุ');
        }
        if (d.id === 'checklist_trends' && d.score > 20) {
            actions.push('📈 ตรวจสอบชิ้นส่วนที่มีค่าผิดปกติอย่างละเอียด');
        }
        if (d.id === 'chronic_issues' && d.score > 0) {
            actions.push('🔄 พิจารณา Overhaul หรือเปลี่ยนชิ้นส่วนที่เสียซ้ำ');
        }
        if (d.id === 'machine_age' && d.score > 10) {
            actions.push('🏭 วางแผนบำรุงรักษาเชิงลึกสำหรับเครื่องจักรอายุมาก');
        }
    });

    if (actions.length === 0) {
        actions.push('✅ ดำเนินการบำรุงรักษาตามปกติ');
    }

    return actions;
}

// ─── Impact Assessment ───
function generateImpactAssessment(dims: AnalysisDimension[], riskLevel: string, machine: Machine): string {
    const topDim = dims.reduce((max, d) => d.weighted > max.weighted ? d : max, dims[0]);

    if (riskLevel === 'critical') {
        return `⚠️ เครื่อง "${machine.name}" มีความเสี่ยงวิกฤต ปัจจัยหลักคือ ${topDim.name} (คะแนน ${topDim.score}/100) อาจเกิดการหยุดทำงานกะทันหัน หรือเสื่อมสภาพรุนแรงถ้าไม่ดำเนินการ`;
    } else if (riskLevel === 'high') {
        return `เครื่อง "${machine.name}" มีความเสี่ยงสูง จาก ${topDim.name} ควรวางแผนดำเนินการภายใน 1-2 สัปดาห์`;
    } else if (riskLevel === 'warning') {
        return `เครื่อง "${machine.name}" มีจุดที่ต้องเฝ้าระวัง: ${topDim.name} ควรติดตามอย่างใกล้ชิด`;
    }
    return `เครื่อง "${machine.name}" ทำงานปกติ ไม่พบความเสี่ยงที่สำคัญ`;
}

// ==================== COMPONENT ====================

export default function PredictivePage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(true);
    const [predictions, setPredictions] = useState<MachinePrediction[]>([]);
    const [stats, setStats] = useState<PredictiveStats>({
        critical: 0, high: 0, warning: 0, healthy: 0,
        totalMachines: 0, systemReliability: 100, avgDataQuality: 0, totalRecordsAnalyzed: 0,
    });
    const [expandedMachine, setExpandedMachine] = useState<string | null>(null);
    const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
    const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'high' | 'warning' | 'healthy'>('all');
    const [selectedPrediction, setSelectedPrediction] = useState<MachinePrediction | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setAnalyzing(true);
                const [machines, records, pmPlans, parts] = await Promise.all([
                    getMachines(),
                    getMaintenanceRecords(),  // Fetch ALL records
                    getPMPlans(),
                    getParts(),
                ]);

                // Deduplicate machines by code and name
                const uniqueMachinesMap = new Map();
                machines.forEach(m => {
                    const key = `${m.code || ''}-${m.name}`;
                    if (!uniqueMachinesMap.has(key)) {
                        uniqueMachinesMap.set(key, m);
                    }
                });
                const uniqueMachines = Array.from(uniqueMachinesMap.values());

                // Analyze each machine
                const allPredictions = uniqueMachines.map(m =>
                    analyzeMachine(m, records, pmPlans, parts)
                );

                // Sort by risk score descending
                allPredictions.sort((a, b) => b.riskScore - a.riskScore);

                setPredictions(allPredictions);

                // Auto-select first risky machine
                const firstRisky = allPredictions.find(p => p.riskLevel !== 'healthy');
                if (firstRisky) setSelectedPrediction(firstRisky);

                // Calculate stats
                const critical = allPredictions.filter(p => p.riskLevel === 'critical').length;
                const high = allPredictions.filter(p => p.riskLevel === 'high').length;
                const warning = allPredictions.filter(p => p.riskLevel === 'warning').length;
                const healthy = allPredictions.filter(p => p.riskLevel === 'healthy').length;
                const total = machines.length || 1;
                const reliability = Math.round(((total - critical - high) / total) * 100);
                const avgDQ = allPredictions.length > 0
                    ? Math.round(allPredictions.reduce((s, p) => s + p.dataQuality, 0) / allPredictions.length)
                    : 0;

                setStats({
                    critical, high, warning, healthy,
                    totalMachines: machines.length,
                    systemReliability: reliability,
                    avgDataQuality: avgDQ,
                    totalRecordsAnalyzed: records.length,
                });

            } catch (error) {
                console.error("Error fetching predictive data:", error);
            } finally {
                setLoading(false);
                setTimeout(() => setAnalyzing(false), 800);
            }
        };

        fetchData();
    }, []);

    const filteredPredictions = useMemo(() => {
        if (filterLevel === 'all') return predictions;
        return predictions.filter(p => p.riskLevel === filterLevel);
    }, [predictions, filterLevel]);

    const getRiskColors = (level: string) => {
        switch (level) {
            case 'critical': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' };
            case 'high': return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'bg-orange-500' };
            case 'warning': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', bar: 'bg-yellow-500' };
            default: return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', bar: 'bg-green-500' };
        }
    };

    const formatDate = (d?: Date) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
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
                            <p className="text-sm text-text-muted">AI วิเคราะห์ 7 มิติ • เรียนรู้จากข้อมูลจริงทุกครั้งที่โหลด</p>
                        </div>
                    </div>
                    {analyzing && (
                        <div className="flex items-center gap-2 bg-bg-tertiary px-3 py-1.5 rounded-full border border-border-light animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            <span className="text-xs font-medium text-text-secondary">กำลังวิเคราะห์...</span>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-text-muted animate-pulse">กำลังดึงข้อมูลทั้งหมดจากระบบ...</p>
                    </div>
                ) : (
                    <>
                        {/* ─── Summary Cards ─── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="card bg-red-500/5 border border-red-500/20 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <AlertTriangleIcon className="text-red-400" size={18} />
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">วิกฤต + สูง</span>
                                </div>
                                <div className="text-2xl font-bold text-text-primary">{stats.critical + stats.high}</div>
                                <p className="text-[10px] text-text-muted mt-1">เครื่อง ({stats.critical} วิกฤต, {stats.high} สูง)</p>
                            </div>
                            <div className="card bg-yellow-500/5 border border-yellow-500/20 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <ZapIcon className="text-yellow-400" size={18} />
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">เฝ้าระวัง</span>
                                </div>
                                <div className="text-2xl font-bold text-text-primary">{stats.warning}</div>
                                <p className="text-[10px] text-text-muted mt-1">เครื่องที่ต้องจับตา</p>
                            </div>
                            <div className="card bg-green-500/5 border border-green-500/20 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <TrendingUpIcon className="text-green-400" size={18} />
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">ปกติ</span>
                                </div>
                                <div className="text-2xl font-bold text-text-primary">{stats.systemReliability}%</div>
                                <p className="text-[10px] text-text-muted mt-1">ความเสถียรของระบบ</p>
                            </div>
                            <div className="card bg-blue-500/5 border border-blue-500/20 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <SettingsIcon className="text-blue-400" size={18} />
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">ข้อมูล</span>
                                </div>
                                <div className="text-2xl font-bold text-text-primary">{stats.totalRecordsAnalyzed}</div>
                                <p className="text-[10px] text-text-muted mt-1">ใบงานที่นำมาวิเคราะห์</p>
                            </div>
                        </div>

                        {/* ─── Filter Buttons ─── */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            {[
                                { id: 'all', label: `ทั้งหมด (${predictions.length})`, color: 'accent-blue' },
                                { id: 'critical', label: `วิกฤต (${stats.critical})`, color: 'accent-red' },
                                { id: 'high', label: `สูง (${stats.high})`, color: 'accent-yellow' },
                                { id: 'warning', label: `เฝ้าระวัง (${stats.warning})`, color: 'accent-cyan' },
                                { id: 'healthy', label: `ปกติ (${stats.healthy})`, color: 'accent-green' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilterLevel(f.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border
                                        ${filterLevel === f.id
                                            ? `bg-${f.color}/20 border-${f.color}/40 text-white shadow-lg`
                                            : 'bg-bg-secondary/40 border-border-light/30 text-text-muted hover:text-text-primary'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* ─── Main Content ─── */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                            {/* Left: Machine Risk List */}
                            <div className="lg:col-span-2 space-y-3">
                                <h3 className="font-semibold text-text-primary flex items-center gap-2 text-sm">
                                    <ActivityIcon size={16} />
                                    การวิเคราะห์ความเสี่ยง ({filteredPredictions.length} เครื่อง)
                                </h3>

                                {filteredPredictions.length > 0 ? (
                                    <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                                        {filteredPredictions.map(p => {
                                            const colors = getRiskColors(p.riskLevel);
                                            const isExpanded = expandedMachine === p.id;
                                            const isSelected = selectedPrediction?.id === p.id;

                                            return (
                                                <div
                                                    key={p.id}
                                                    className={`card p-4 transition-all cursor-pointer border ${isSelected ? `${colors.border} shadow-lg` : 'border-white/5 hover:border-white/10'}`}
                                                    onClick={() => setSelectedPrediction(p)}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-text-primary text-sm truncate">{p.machine.code ? `[${p.machine.code}] ` : ''}{p.machine.name}</h4>
                                                            <p className="text-[10px] text-text-muted">{p.machine.location || p.machine.Location || '-'} • {p.recordCount} ใบงาน • {p.pmPlanCount} แผน PM</p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${colors.bg} ${colors.text}`}>
                                                            {p.riskLabel}
                                                        </span>
                                                    </div>

                                                    {/* Risk Bar */}
                                                    <div className="mb-2">
                                                        <div className="flex justify-between text-[10px] mb-1">
                                                            <span className="text-text-muted">ความเสี่ยง</span>
                                                            <span className={`font-bold ${colors.text}`}>{p.riskScore}%</span>
                                                        </div>
                                                        <div className="w-full bg-bg-tertiary h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`}
                                                                style={{ width: `${p.riskScore}%` }} />
                                                        </div>
                                                    </div>

                                                    {/* Top Issues Preview */}
                                                    {p.topIssues.length > 0 && (
                                                        <div className="text-[10px] text-text-secondary space-y-0.5">
                                                            {p.topIssues.slice(0, 2).map((issue, i) => (
                                                                <p key={i} className="truncate">{issue}</p>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Expand toggle */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setExpandedMachine(isExpanded ? null : p.id); }}
                                                        className="w-full flex items-center justify-center gap-1 text-[10px] text-text-muted hover:text-text-primary mt-2 pt-2 border-t border-white/5"
                                                    >
                                                        <span>{isExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด 7 มิติ'}</span>
                                                        <ChevronDownIcon size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {/* Expanded Dimensions */}
                                                    {isExpanded && (
                                                        <div className="mt-3 space-y-2 animate-fade-in">
                                                            {p.dimensions.map(dim => (
                                                                <div key={dim.id} className="bg-bg-tertiary/50 rounded-lg p-2.5 border border-white/5">
                                                                    <div
                                                                        className="flex items-center justify-between cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedDimension(expandedDimension === `${p.id}-${dim.id}` ? null : `${p.id}-${dim.id}`);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm">{dim.icon}</span>
                                                                            <span className="text-[11px] font-semibold text-text-primary">{dim.name}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[10px] font-bold" style={{ color: dim.color }}>{dim.score}</span>
                                                                            <div className="w-12 bg-bg-primary h-1 rounded-full overflow-hidden">
                                                                                <div className="h-full rounded-full" style={{ width: `${dim.score}%`, backgroundColor: dim.color }} />
                                                                            </div>
                                                                            <ChevronRightIcon size={10} className={`text-text-muted transition-transform ${expandedDimension === `${p.id}-${dim.id}` ? 'rotate-90' : ''}`} />
                                                                        </div>
                                                                    </div>

                                                                    {expandedDimension === `${p.id}-${dim.id}` && (
                                                                        <div className="mt-2 pt-2 border-t border-white/5 animate-fade-in">
                                                                            <div className="space-y-1 mb-2">
                                                                                {dim.details.map((d, i) => (
                                                                                    <p key={i} className="text-[10px] text-text-secondary">{d}</p>
                                                                                ))}
                                                                            </div>
                                                                            <details className="group">
                                                                                <summary className="text-[9px] text-text-muted cursor-pointer hover:text-text-primary">📐 วิธีคำนวณ (Methodology)</summary>
                                                                                <pre className="text-[9px] text-text-muted mt-1 whitespace-pre-wrap bg-bg-primary/50 rounded p-2 border border-white/5">{dim.methodology}</pre>
                                                                            </details>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            {/* Data Quality */}
                                                            <div className="flex items-center justify-between text-[10px] text-text-muted pt-1">
                                                                <span>📊 คุณภาพข้อมูล: {p.dataQuality}%</span>
                                                                <span>🧠 ยิ่งข้อมูลเยอะ ยิ่งแม่นยำ</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="card p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-border-light bg-transparent">
                                        <BoxIcon size={32} className="text-text-muted mb-2 opacity-50" />
                                        <p className="text-sm text-text-muted">ไม่พบเครื่องจักรในระดับนี้</p>
                                    </div>
                                )}
                            </div>

                            {/* Right: Detail Panel */}
                            <div className="lg:col-span-3 space-y-4">
                                {selectedPrediction ? (
                                    <>
                                        {/* Selected Machine Header */}
                                        <div className={`card p-5 border ${getRiskColors(selectedPrediction.riskLevel).border}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-text-primary">
                                                        {selectedPrediction.machine.code ? `[${selectedPrediction.machine.code}] ` : ''}
                                                        {selectedPrediction.machine.name}
                                                    </h3>
                                                    <p className="text-xs text-text-muted">
                                                        {selectedPrediction.machine.location || selectedPrediction.machine.Location} •
                                                        วิเคราะห์จาก {selectedPrediction.recordCount} ใบงาน, {selectedPrediction.pmPlanCount} แผน PM, {selectedPrediction.partCount} อะไหล่
                                                    </p>
                                                </div>
                                                <div className={`text-center px-4 py-2 rounded-xl ${getRiskColors(selectedPrediction.riskLevel).bg} ${getRiskColors(selectedPrediction.riskLevel).border} border`}>
                                                    <div className={`text-2xl font-black ${getRiskColors(selectedPrediction.riskLevel).text}`}>{selectedPrediction.riskScore}%</div>
                                                    <div className="text-[9px] text-text-muted">ความเสี่ยง</div>
                                                </div>
                                            </div>

                                            {/* Quick Info */}
                                            <div className="grid grid-cols-3 gap-3 text-center">
                                                <div className="bg-bg-tertiary/50 rounded-lg p-2 border border-white/5">
                                                    <div className="text-[10px] text-text-muted">ซ่อมล่าสุด</div>
                                                    <div className="text-xs font-bold text-text-primary">{formatDate(selectedPrediction.lastMaintenance)}</div>
                                                </div>
                                                <div className="bg-bg-tertiary/50 rounded-lg p-2 border border-white/5">
                                                    <div className="text-[10px] text-text-muted">PM ถัดไป</div>
                                                    <div className="text-xs font-bold text-text-primary">{formatDate(selectedPrediction.nextDuePM)}</div>
                                                </div>
                                                <div className="bg-bg-tertiary/50 rounded-lg p-2 border border-white/5">
                                                    <div className="text-[10px] text-text-muted">คุณภาพข้อมูล</div>
                                                    <div className="text-xs font-bold text-text-primary">{selectedPrediction.dataQuality}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dimension Score Chart */}
                                        <div className="card p-5">
                                            <h4 className="font-semibold text-text-primary text-sm mb-4 flex items-center gap-2">
                                                <TrendingUpIcon size={16} />
                                                คะแนนวิเคราะห์ 7 มิติ
                                            </h4>
                                            <div className="space-y-3">
                                                {selectedPrediction.dimensions.map(dim => (
                                                    <div key={dim.id} className="flex items-center gap-3">
                                                        <span className="text-sm w-5 text-center">{dim.icon}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between text-[10px] mb-1">
                                                                <span className="text-text-secondary truncate">{dim.name} <span className="text-text-muted">(×{(dim.weight * 100).toFixed(0)}%)</span></span>
                                                                <span className="font-bold" style={{ color: dim.color }}>{dim.score}</span>
                                                            </div>
                                                            <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full transition-all duration-700"
                                                                    style={{ width: `${dim.score}%`, backgroundColor: dim.color }} />
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] text-text-muted w-8 text-right">{dim.weighted.toFixed(1)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                                                    <span className="text-sm w-5 text-center">🎯</span>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="font-bold text-text-primary">คะแนนรวม (Weighted)</span>
                                                            <span className={`font-black text-sm ${getRiskColors(selectedPrediction.riskLevel).text}`}>{selectedPrediction.riskScore}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Impact & Actions */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Impact */}
                                            <div className="card p-4">
                                                <h4 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                                                    <AlertTriangleIcon size={14} className="text-accent-red" />
                                                    ผลกระทบที่อาจเกิดขึ้น
                                                </h4>
                                                <p className="text-[11px] text-text-secondary leading-relaxed">{selectedPrediction.potentialImpact}</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="card p-4">
                                                <h4 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                                                    <WrenchIcon size={14} className="text-accent-cyan" />
                                                    คำแนะนำ
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {selectedPrediction.recommendedActions.map((action, i) => (
                                                        <p key={i} className="text-[11px] text-text-secondary">{action}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Analysis Methodology */}
                                        <div className="card p-4 bg-bg-secondary/30">
                                            <details>
                                                <summary className="text-xs font-bold text-text-primary cursor-pointer hover:text-accent-blue flex items-center gap-1.5">
                                                    <SettingsIcon size={14} />
                                                    📐 แนวคิดและตรรกะการวิเคราะห์ (Methodology)
                                                </summary>
                                                <div className="mt-3 space-y-3 text-[10px] text-text-secondary">
                                                    <p className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-3">
                                                        💡 <strong>ระบบเรียนรู้จากข้อมูลจริง:</strong> ทุกครั้งที่โหลดหน้านี้ ระบบจะดึงข้อมูลทั้งหมดจากฐานข้อมูล ({stats.totalRecordsAnalyzed} ใบงาน)
                                                        มาคำนวณใหม่ ยิ่งมีข้อมูลเยอะขึ้น การพยากรณ์ก็ยิ่งแม่นยำ เช่น MTBF จะแม่นขึ้นเมื่อมีประวัติซ่อมมากขึ้น
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {selectedPrediction.dimensions.map(dim => (
                                                            <div key={dim.id} className="bg-bg-tertiary/50 rounded-lg p-2.5 border border-white/5">
                                                                <div className="font-bold text-text-primary mb-1">{dim.icon} {dim.name} (น้ำหนัก {(dim.weight * 100).toFixed(0)}%)</div>
                                                                <pre className="whitespace-pre-wrap text-[9px] text-text-muted">{dim.methodology}</pre>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    </>
                                ) : (
                                    <div className="card p-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 border border-white/5">
                                            <ActivityIcon size={32} className="text-text-muted" />
                                        </div>
                                        <h3 className="text-lg font-bold text-text-primary mb-2">เลือกเครื่องจักรเพื่อดูรายละเอียด</h3>
                                        <p className="text-sm text-text-muted">คลิกที่เครื่องจักรทางซ้ายเพื่อดูผลการวิเคราะห์ 7 มิติแบบละเอียด</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </main>

            <MobileNav />
        </div>
    );
}
