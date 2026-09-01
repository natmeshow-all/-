import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { ZapIcon, CheckCircleIcon, CalendarIcon, AlertTriangleIcon, WrenchIcon } from '../ui/Icons';
import { addPMPlan, updatePMPlan } from '../../services/maintenanceService';
import { useToast } from '../../contexts/ToastContext';
import { Machine, PMPlan } from '../../types';

interface AutoGeneratePMModalProps {
    isOpen: boolean;
    onClose: () => void;
    machines: Machine[];
    existingPlans: PMPlan[];
    onSuccess: () => void;
}

const TEMPLATES: Record<string, string[]> = {
    FM: [
        "สายพาน: ตรวจสภาพสายพานลำเลียง",
        "สายพาน: ปรับความตึงสายพาน",
        "สายพาน: ตรวจสอบรอยแตกลายงา",
        "Motor + Gear: ตรวจระดับน้ำมันเกียร์",
        "Motor + Gear: ตรวจเสียงผิดปกติ",
        "Motor + Gear: ตรวจการรั่วซึมน้ำมัน",
        "Bearing: ตรวจเช็คสภาพแบริ่ง",
        "Bearing: เติมจาระบี",
        "โซ่ขับ: ตรวจความตึงโซ่และหล่อลื่น",
        "Roller: ตรวจการหมุนคล่องตัว",
        "Electrical: ทำความสะอาดตู้คอนโทรล",
        "Electrical: ขันแน่นขั้วสายไฟ",
        "Safety: ตรวจสอบปุ่มฉุกเฉิน (Emergency Stop)",
        "Safety: ตรวจสอบ Safety Guard / Cover"
    ],
    HT: [
        "ระบบทำความร้อน: ตรวจเช็คสภาพฮีตเตอร์ / หัวเผา",
        "ระบบควบคุม: ตรวจสอบ Temperature Controller",
        "ระบบควบคุม: ตรวจวัดอุณหภูมิตู้เปรียบเทียบเซนเซอร์",
        "พัดลมหมุนเวียน: ตรวจเช็คพัดลมระบายความร้อนและมอเตอร์",
        "Bearing: อัดจาระบีตลับลูกปืนทนความร้อน",
        "Motor + Gear: ตรวจระดับน้ำมันเกียร์ขับหมุน",
        "Motor + Gear: ตรวจเช็คเสียงและกระแสไฟฟ้า",
        "ระบบล็อกประตู: ตรวจเช็คยางขอบเตาและซีลกันความร้อน",
        "ระบบล็อกประตู: ปรับตั้งกลอนล็อกประตู",
        "ระบบหมุน Rack: ตรวจเช็คชุดเฟืองและโซ่ขับหมุน",
        "Electrical: ทำความสะอาดตู้ควบคุม",
        "Electrical: ตรวจสอบเบรกเกอร์และขั้วต่อสายไฟ",
        "Electrical: ตรวจเช็คกระแสไฟฟ้าขณะทำงาน",
        "Safety: ตรวจสอบระบบ Overheat Protection",
        "Safety: ตรวจสอบปุ่ม Emergency Stop"
    ],
    LF: [
        "ระบบยก: ตรวจสภาพโซ่ยก / สลิงยก",
        "ระบบยก: ปรับตั้งความตึงโซ่ยกและหล่อลื่น",
        "Motor + Gear: ตรวจเช็คระดับน้ำมันเกียร์มอเตอร์ยก",
        "Motor + Gear: ตรวจเสียงและการสั่นสะเทือน",
        "Bearing: อัดจาระบีลูกปืนเสายกและลูกล้อนำทาง",
        "ลูกล้อ/เสาประคอง: ตรวจสภาพรางสไลด์และทาจาระบี",
        "ระบบล็อกนิรภัย: ตรวจสอบ Safety Latch / สลักล็อกนิรภัย",
        "สวิตช์จำกัดระยะ: ตรวจสอบ Limit Switch ด้านบนและล่าง",
        "Electrical: ตรวจเช็คสายไฟและสายคอนโทรล",
        "Electrical: ขันแน่นขั้วต่อในตู้ไฟ",
        "Electrical: ตรวจวัดกระแสไฟฟ้าขณะยกโหลด",
        "Safety: ตรวจสอบปุ่ม Emergency Stop",
        "โครงสร้าง: ตรวจเช็คจุดยึดฐานและโครงสร้างรับแรง"
    ],
    CV: [
        "สายพาน: ตรวจสภาพสายพานลำเลียงและรอยต่อ",
        "สายพาน: ปรับความตึงและการเลี้ยวแนวสายพาน",
        "ลูกกลิ้ง/Roller: ตรวจการหมุนคล่องตัวของลูกกลิ้ง",
        "Motor + Gear: ตรวจระดับน้ำมันเกียร์",
        "Motor + Gear: ตรวจสอบเสียงและความร้อนมอเตอร์",
        "โซ่ขับ/คัปปลิ้ง: ตรวจความตึงโซ่และทาจาระบี",
        "Bearing: เติมจาระบีตลับลูกปืนเพลาหัว-ท้าย",
        "Electrical: ตรวจสอบสายไฟและกล่องควบคุม",
        "Safety: ตรวจสอบปุ่ม Emergency Stop",
        "โครงสร้าง: ตรวจเช็คขาตั้งและตัวกั้นข้าง (Guide Rail)"
    ],
    MX: [
        "ชุดกวน/ใบพัด: ตรวจสภาพใบกวนและข้อต่อเพลา",
        "Motor + Gear: ตรวจระดับน้ำมันเกียร์หลัก",
        "Motor + Gear: ตรวจสอบเสียงและการสั่นสะเทือน",
        "Motor + Gear: ตรวจวัดกระแสไฟฟ้าขณะหมุน",
        "สายพานขับ: ตรวจความตึงสายพาน V-Belt",
        "Bearing: อัดจาระบีตลับลูกปืนแกนหมุน",
        "ซีลกันรั่ว: ตรวจเช็คซีลเพลา (Shaft Seal)",
        "ฝาครอบ Safety: ตรวจสอบ Safety Interlock Switch",
        "Electrical: ทำความสะอาดตู้ไฟและเป่าฝุ่น Inverter",
        "Safety: ตรวจสอบปุ่ม Emergency Stop"
    ],
    PK: [
        "ระบบซีล: ตรวจสภาพแผ่นความร้อน (Heating Element)",
        "ระบบซีล: ตรวจสภาพเทปทนความร้อน (Teflon Tape)",
        "ระบบกด/ใบมีด: ตรวจสภาพใบมีดตัดและสปริงคืนตัว",
        "Motor: ตรวจเช็คมอเตอร์สายพานขับกล่อง",
        "Safety: ตรวจสอบฝาครอบนิรภัยและปุ่มหยุดฉุกเฉิน"
    ],
    CT: [
        "ใบมีดตัด: ตรวจสอบความคมและสภาพใบมีด",
        "ใบมีดตัด: ตรวจสอบความตึงของชุดใบมีด",
        "Motor: ตรวจเช็คมอเตอร์และสายพานขับใบมีด",
        "ลูกปืนเพลา: อัดจาระบีตลับลูกปืน",
        "Safety: ตรวจสอบ Safety Switch ฝาครอบและ Emergency Stop"
    ],
    DP: [
        "หัวหยอด/ปั๊ม: ตรวจสภาพหัวจ่ายและลูกสูบปั๊ม",
        "ซีล/โอริง: ตรวจสอบโอริงและซีลกันรั่ว",
        "Motor/กระบอกสูบ: ตรวจสอบมอเตอร์ขับและระบบนิวแมติกส์",
        "Safety: ตรวจสอบปุ่ม Emergency Stop"
    ],
    CN: [
        "ระบบฉีดล้าง: ตรวจเช็คหัวฉีดน้ำแรงดันและท่อจ่าย",
        "ปั๊มน้ำ: ตรวจสอบการทำงานของปั๊มน้ำและแรงดัน",
        "สายพานลำเลียง: ตรวจสอบโซ่ขับและสายพานลำเลียงตะกร้า",
        "ระบบทำความร้อน: ตรวจสอบฮีตเตอร์ต้มน้ำและเซนเซอร์อุณหภูมิ",
        "Safety: ตรวจสอบสวิตช์หยุดฉุกเฉิน"
    ],
    VC: [
        "Vacuum Pump: ตรวจสอบระดับน้ำมันปั๊มสุญญากาศ",
        "Vacuum Pump: ตรวจเช็คแรงดูดสุญญากาศและเสียง",
        "ห้องสูญญากาศ: ตรวจสอบซีลยางขอบประตูและรอยรั่ว",
        "ระบบวาล์ว: ตรวจเช็ค Solenoid Valve และวาล์วระบาย",
        "Safety: ตรวจสอบปุ่ม Emergency Stop"
    ],
    AT: [
        "มอเตอร์ขับประตู: ตรวจเช็คมอเตอร์และชุดเกียร์ขับ",
        "เซนเซอร์ตรวจจับ: ตรวจสอบเรดาร์เซนเซอร์และเซนเซอร์กันหนีบ",
        "สายพานขับ: ตรวจสอบความตึงสายพานและลูกล้อรางแขวน",
        "บานประตู/ซีล: ตรวจเช็คสภาพบานประตูและยางกันกระแทก",
        "สวิตช์ฉุกเฉิน: ตรวจสอบระบบเปิดประตูแบบ Manual / Emergency"
    ]
};

export default function AutoGeneratePMModal({
    isOpen,
    onClose,
    machines,
    existingPlans,
    onSuccess
}: AutoGeneratePMModalProps) {
    const { success, error: showError } = useToast();
    const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'congestion'>('weekly');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    // Saturday target codes
    const saturdayCodes = ['HT02', 'HT03', 'HT04', 'HT09', 'SL01'];
    // Sunday target codes
    const sundayCodes = ['FM02', 'FM03', 'FM04'];

    // Monthly groups by day distributed across every day starting Sept 1
    const monthlyGroups = [
        { day: 1, label: "วันที่ 1 (FZ)", zone: "FZ", codes: ['MX01', 'FM01'], date: new Date("2026-09-01T00:00:00.000Z") },
        { day: 2, label: "วันที่ 2 (FZ)", zone: "FZ", codes: ['FM02'], date: new Date("2026-09-02T00:00:00.000Z") },
        { day: 3, label: "วันที่ 3 (FZ)", zone: "FZ", codes: ['FM03'], date: new Date("2026-09-03T00:00:00.000Z") },
        { day: 4, label: "วันที่ 4 (FZ)", zone: "FZ", codes: ['FM04'], date: new Date("2026-09-04T00:00:00.000Z") },
        { day: 5, label: "วันที่ 5 (FZ)", zone: "FZ", codes: ['FM08'], date: new Date("2026-09-05T00:00:00.000Z") },
        { day: 6, label: "วันที่ 6 (FZ)", zone: "FZ", codes: ['CV01'], date: new Date("2026-09-06T00:00:00.000Z") },
        { day: 7, label: "วันที่ 7 (FZ)", zone: "FZ", codes: ['CV14'], date: new Date("2026-09-07T00:00:00.000Z") },
        { day: 8, label: "วันที่ 8 (FZ)", zone: "FZ", codes: ['CV19'], date: new Date("2026-09-08T00:00:00.000Z") },
        { day: 9, label: "วันที่ 9 (FZ)", zone: "FZ", codes: ['LF01'], date: new Date("2026-09-09T00:00:00.000Z") },
        { day: 10, label: "วันที่ 10 (FZ)", zone: "FZ", codes: ['LF03'], date: new Date("2026-09-10T00:00:00.000Z") },
        { day: 11, label: "วันที่ 11 (FZ)", zone: "FZ", codes: ['LF06'], date: new Date("2026-09-11T00:00:00.000Z") },
        { day: 12, label: "วันที่ 12 (FZ)", zone: "FZ", codes: ['LF10'], date: new Date("2026-09-12T00:00:00.000Z") },
        { day: 13, label: "วันที่ 13 (FZ)", zone: "FZ", codes: ['LF13'], date: new Date("2026-09-13T00:00:00.000Z") },
        { day: 14, label: "วันที่ 14 (FZ)", zone: "FZ", codes: ['LF14'], date: new Date("2026-09-14T00:00:00.000Z") },
        { day: 15, label: "วันที่ 15 (RTE)", zone: "RTE", codes: ['HT05', 'HT08'], date: new Date("2026-09-15T00:00:00.000Z") },
        { day: 16, label: "วันที่ 16 (RTE)", zone: "RTE", codes: ['HT10'], date: new Date("2026-09-16T00:00:00.000Z") },
        { day: 17, label: "วันที่ 17 (RTE)", zone: "RTE", codes: ['HT17'], date: new Date("2026-09-17T00:00:00.000Z") },
        { day: 18, label: "วันที่ 18 (RTE)", zone: "RTE", codes: ['HT19'], date: new Date("2026-09-18T00:00:00.000Z") },
        { day: 19, label: "วันที่ 19 (RTE)", zone: "RTE", codes: ['HT23'], date: new Date("2026-09-19T00:00:00.000Z") },
        { day: 20, label: "วันที่ 20 (RTE)", zone: "RTE", codes: ['CT01'], date: new Date("2026-09-20T00:00:00.000Z") },
        { day: 21, label: "วันที่ 21 (RTE)", zone: "RTE", codes: ['CT13'], date: new Date("2026-09-21T00:00:00.000Z") },
        { day: 22, label: "วันที่ 22 (RTE)", zone: "RTE", codes: ['FM07'], date: new Date("2026-09-22T00:00:00.000Z") },
        { day: 23, label: "วันที่ 23 (RTE)", zone: "RTE", codes: ['MX04'], date: new Date("2026-09-23T00:00:00.000Z") },
        { day: 24, label: "วันที่ 24 (RTE)", zone: "RTE", codes: ['DP02'], date: new Date("2026-09-24T00:00:00.000Z") },
        { day: 25, label: "วันที่ 25 (RTE)", zone: "RTE", codes: ['LF11'], date: new Date("2026-09-25T00:00:00.000Z") },
        { day: 26, label: "วันที่ 26 (RTE)", zone: "RTE", codes: ['CV23', 'PK10'], date: new Date("2026-09-26T00:00:00.000Z") },
        { day: 27, label: "วันที่ 27 (RTE)", zone: "RTE", codes: ['PK18'], date: new Date("2026-09-27T00:00:00.000Z") },
        { day: 28, label: "วันที่ 28 (RTE)", zone: "RTE", codes: ['CN01'], date: new Date("2026-09-28T00:00:00.000Z") },
        { day: 29, label: "วันที่ 29 (RTE)", zone: "RTE", codes: ['VC01'], date: new Date("2026-09-29T00:00:00.000Z") },
        { day: 30, label: "วันที่ 30 (RTE)", zone: "RTE", codes: ['AT01'], date: new Date("2026-09-30T00:00:00.000Z") }
    ];

    const stats = React.useMemo(() => {
        let toCreate = 0;
        let toUpdate = 0;

        // 1. Weekly Updates
        const sfSpCodes = ['SF01', 'SF02', 'SP01'];
        for (const p of existingPlans) {
            const pMach = machines.find(m => m.id === p.machineId);
            const code = (pMach?.code || '').trim().toUpperCase();
            if (sfSpCodes.includes(code) && p.scheduleType === 'weekly') {
                // If it doesn't have the updated checklist, count it.
                // Assuming we can't easily check checklist items without deep equal, 
                // but we know we always update if it's there. Just for button text, 
                // we only care if they are missing or need balance. Let's not overcount updates for SF/SP.
            }
        }

        // 2. Saturday Weekly
        for (const code of saturdayCodes) {
            const mach = machines.find(m => (m.code || '').trim().toUpperCase() === code);
            if (mach) {
                const hasWeekly = existingPlans.some(p => p.machineId === mach.id && p.scheduleType === 'weekly');
                if (!hasWeekly) toCreate++;
            }
        }

        // 3. Sunday Weekly
        for (const code of sundayCodes) {
            const matchingMachines = machines.filter(m => (m.code || '').trim().toUpperCase() === code && !m.name?.toLowerCase().includes('pizza'));
            for (const mach of matchingMachines) {
                const hasWeekly = existingPlans.some(p => p.machineId === mach.id && p.scheduleType === 'weekly');
                if (!hasWeekly) toCreate++;
            }
        }

        // 4. Monthly Plans
        for (const group of monthlyGroups) {
            for (const code of group.codes) {
                const matchingMachines = machines.filter(m => (m.code || '').trim().toUpperCase() === code && !m.name?.toLowerCase().includes('pizza'));
                for (const mach of matchingMachines) {
                    const existingPlan = existingPlans.find(p => p.machineId === mach.id && p.scheduleType === 'monthly');
                    if (!existingPlan) {
                        toCreate++;
                    } else if (existingPlan.taskName?.includes('[Auto-Generated]')) {
                        const currDate = new Date(existingPlan.nextDueDate);
                        if (currDate.getDate() !== group.day) {
                            toUpdate++;
                        }
                    }
                }
            }
        }
        return { toCreate, toUpdate };
    }, [machines, existingPlans, saturdayCodes, sundayCodes, monthlyGroups]);

    const handleRunAutoGenerate = async () => {
        setIsGenerating(true);
        setProgress(5);
        setStatusText("กำลังเริ่มต้นสร้างและปรับสมดุลแผนงาน...");

        try {
            let createdCount = 0;
            let updatedCount = 0;

            // 1. Update SF01, SF02, SP01 Checklist
            setStatusText("กำลังปรับปรุง Checklist รายสัปดาห์ (SF01, SF02, SP01)...");
            const sfSpCodes = ['SF01', 'SF02', 'SP01'];
            const sfSpChecklist = [
                "Bearing & Pivot Points: อัดจาระบีตลับลูกปืนและจุดหมุน",
                "Gears & Sprockets: เช็ดทำความสะอาดและตรวจเช็คฟันเฟือง"
            ];

            for (const p of existingPlans) {
                const pMach = machines.find(m => m.id === p.machineId);
                const code = (pMach?.code || '').trim().toUpperCase();
                if (sfSpCodes.includes(code) && p.scheduleType === 'weekly') {
                    await updatePMPlan(p.id, {
                        checklistItems: sfSpChecklist,
                        notes: (p.notes || "") + "\n[ปรับปรุง Checklist อัดจาระบี + เช็ดเฟือง ตามคำสั่ง]"
                    });
                    updatedCount++;
                }
            }

            setProgress(20);

            // 2. Create Saturday Weekly Plans (HT02, HT03, HT04, HT09, SL01)
            setStatusText("กำลังสร้างแผนรายสัปดาห์วันเสาร์ (HT02-HT04, HT09, SL01)...");
            const saturdayOvenChecklist = [
                "ตู้คอนโทรล: ทำความสะอาดและตรวจเช็คพัดลมระบายความร้อน",
                "ประตูเตา: ตรวจเช็คระบบล็อกประตู ซีลยางขอบเตา และลูกล้อแขวน",
                "หัวเผา/ฮีตเตอร์: ตรวจเช็คหัวเผา/ฮีตเตอร์ และกลไกการหมุนของ Rack",
                "Electrical: ตรวจเช็คกระแสและแรงดันไฟฟ้า"
            ];
            const saturdaySiloChecklist = [
                "Vacuum Filter: เป่ากรองเครื่องแว็คคัม 2 จุด และบริเวณชั้น 4 อีก 2 จุด"
            ];
            const saturdayStartDate = new Date("2026-09-05T00:00:00.000Z");

            for (const code of saturdayCodes) {
                const mach = machines.find(m => (m.code || '').trim().toUpperCase() === code);
                if (mach) {
                    const hasWeekly = existingPlans.some(p => p.machineId === mach.id && p.scheduleType === 'weekly');
                    if (!hasWeekly) {
                        const isSilo = code === 'SL01';
                        await addPMPlan({
                            machineId: mach.id,
                            machineName: mach.name,
                            taskName: "PM รายสัปดาห์ (ส) [Auto-Generated]",
                            scheduleType: "weekly",
                            weeklyDay: 6,
                            startDate: saturdayStartDate,
                            nextDueDate: saturdayStartDate,
                            checklistItems: isSilo ? saturdaySiloChecklist : saturdayOvenChecklist,
                            locationType: "machine_Location",
                            customLocation: mach.Location || mach.location || (isSilo ? "FZ" : "RTE"),
                            status: "active",
                            completedCount: 0,
                            notes: isSilo ? "สร้างแผนรายสัปดาห์ Silo (ส) เป่ากรองแว็คคัม - รอ Admin ตรวจสอบ" : "สร้างแผนรายสัปดาห์ (ส) อัตโนมัติ - รอ Admin ตรวจสอบ"
                        });
                        createdCount++;
                    }
                }
            }

            setProgress(40);

            // 3. Create Sunday Weekly Plans (FM02, FM03, FM04 - excluding Pizza Line)
            setStatusText("กำลังสร้างแผนรายสัปดาห์วันอาทิตย์ (FM02, FM03, FM04 Mlc)...");
            const sundayFmChecklist = [
                "Inverter Cabinet: เป่าฝุ่นตู้ inverter",
                "Cross Roller & Chain: อัดจาระบีชุด Cross Roller + เช็คความตึงโซ่",
                "Satellite Unit: ขันแน่นชุด Satellite"
            ];
            const sundayStartDate = new Date("2026-09-06T00:00:00.000Z");

            for (const code of sundayCodes) {
                const matchingMachines = machines.filter(m => (m.code || '').trim().toUpperCase() === code && !m.name?.toLowerCase().includes('pizza'));
                for (const mach of matchingMachines) {
                    const hasWeekly = existingPlans.some(p => p.machineId === mach.id && p.scheduleType === 'weekly');
                    if (!hasWeekly) {
                        await addPMPlan({
                            machineId: mach.id,
                            machineName: mach.name,
                            taskName: "PM รายสัปดาห์ (อา) [Auto-Generated]",
                            scheduleType: "weekly",
                            weeklyDay: 0,
                            startDate: sundayStartDate,
                            nextDueDate: sundayStartDate,
                            checklistItems: sundayFmChecklist,
                            locationType: "machine_Location",
                            customLocation: mach.Location || mach.location || "FZ",
                            status: "active",
                            completedCount: 0,
                            notes: "สร้างแผนรายสัปดาห์ (อา) อัตโนมัติ - รอ Admin ตรวจสอบ"
                        });
                        createdCount++;
                    }
                }
            }

            setProgress(60);

            // 4. Create Monthly PM Plans & Balance across every day
            setStatusText("กำลังจัดแผนรายเดือนกระจายทุกวันตั้งแต่วันที่ 1 ถึง 30...");
            let processedMonthly = 0;
            const totalMonthlyTarget = 33;

            for (const group of monthlyGroups) {
                for (const code of group.codes) {
                    const matchingMachines = machines.filter(m => (m.code || '').trim().toUpperCase() === code && !m.name?.toLowerCase().includes('pizza'));
                    for (const mach of matchingMachines) {
                        const existingPlan = existingPlans.find(p => p.machineId === mach.id && p.scheduleType === 'monthly');
                        if (!existingPlan) {
                            const prefix = code.match(/^([A-Z]+)/)?.[1] || 'CV';
                            const checklist = TEMPLATES[prefix] || TEMPLATES.CV;

                            await addPMPlan({
                                machineId: mach.id,
                                machineName: mach.name,
                                taskName: "PM ประจำเดือน [Auto-Generated]",
                                scheduleType: "monthly",
                                cycleMonths: 1,
                                startDate: group.date,
                                nextDueDate: group.date,
                                checklistItems: checklist,
                                locationType: "machine_Location",
                                customLocation: mach.Location || mach.location || "FZ",
                                status: "active",
                                completedCount: 0,
                                notes: `สร้างแผนรายเดือนอัตโนมัติจากกลุ่มซีรีส์ ${prefix} - รอ Admin ตรวจสอบ`
                            });
                            createdCount++;
                        } else if (existingPlan.taskName?.includes('[Auto-Generated]')) {
                            // Update existing auto-generated monthly plans to balanced week dates
                            const currDate = new Date(existingPlan.nextDueDate);
                            if (currDate.getDate() !== group.day) {
                                await updatePMPlan(existingPlan.id, {
                                    nextDueDate: group.date,
                                    startDate: group.date,
                                    notes: (existingPlan.notes || "") + `\n[ปรับวันทำ PM ให้สมดุลสัปดาห์ เป็นวันที่ ${group.day}]`
                                });
                                updatedCount++;
                            }
                        }
                        processedMonthly++;
                        setProgress(60 + Math.floor((processedMonthly / totalMonthlyTarget) * 35));
                    }
                }
            }

            setProgress(100);
            setStatusText("สร้างและปรับปรุงแผนงานสำเร็จสมบูรณ์!");
            success(`สร้างแผน PM ${createdCount} แผน และปรับสมดุล ${updatedCount} แผน สำเร็จเรียบร้อย`);

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);

        } catch (error: any) {
            console.error("Error auto-generating PM plans:", error);
            showError("เกิดข้อผิดพลาดในการสร้างแผน", error.message || "Failed");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="สร้างแผน PM อัตโนมัติ (Auto-Generate PM Plans)">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
                {/* Intro Banner */}
                <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-blue/20 flex items-center justify-center flex-shrink-0 text-accent-blue mt-0.5">
                        <ZapIcon size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-text-primary">ระบบสร้างแผน PM อัจฉริยะ (เฉพาะโซนการผลิต)</h4>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            ระบบจะช่วยคัดลอก Checklist จากเครื่องจักรในซีรีส์เดียวกัน และสร้างแผนงานรายสัปดาห์ (ส/อา) + แผนรายเดือนโดยไม่ขยับแผนเดิม และลงในวันที่มีแผนงานน้อย
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex bg-bg-tertiary p-1 rounded-xl border border-white/5 gap-1">
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'weekly' ? 'bg-accent-purple text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        แผนรายสัปดาห์ (8 แผน)
                    </button>
                    <button
                        onClick={() => setActiveTab('monthly')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'monthly' ? 'bg-accent-blue text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        แผนรายเดือน (33 แผน)
                    </button>
                    <button
                        onClick={() => setActiveTab('congestion')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'congestion' ? 'bg-accent-orange text-white shadow' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        วิเคราะห์แผนเดิม (กระจุกตัว)
                    </button>
                </div>

                {/* Tab Content: Weekly */}
                {activeTab === 'weekly' && (
                    <div className="space-y-4">
                        {/* Saturday */}
                        <div className="card-glass p-4 rounded-xl border border-accent-blue/20">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarIcon size={16} className="text-accent-blue" />
                                <h5 className="text-xs font-bold text-accent-blue">วันเสาร์: เพิ่มแผนรายสัปดาห์ (HT02-HT04, HT09, SL01)</h5>
                            </div>
                            <p className="text-[11px] text-text-muted mb-2">
                                เตาอบ Rack Oven No.1-4 (ตรวจพัดลม, ประตู, ฮีตเตอร์, ไฟฟ้า) + SL01 Silo (เป่ากรองเครื่องแว็คคัม 2 จุด และบริเวณชั้น 4 อีก 2 จุด)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {saturdayCodes.map(code => (
                                    <span key={code} className="px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue text-[10px] font-mono font-bold">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Sunday */}
                        <div className="card-glass p-4 rounded-xl border border-accent-purple/20">
                            <div className="flex items-center gap-2 mb-2">
                                <CalendarIcon size={16} className="text-accent-purple" />
                                <h5 className="text-xs font-bold text-accent-purple">วันอาทิตย์: เพิ่มแผนรายสัปดาห์ (FM02, FM03, FM04 Mlc)</h5>
                            </div>
                            <div className="text-[11px] text-text-muted mb-2 space-y-1">
                                <p className="font-semibold text-text-primary">Pie Line, Croissant Line, Mlc Line (Checklist 3 รายการ):</p>
                                <p>1. Inverter Cabinet: เป่าฝุ่นตู้ inverter</p>
                                <p>2. Cross Roller & Chain: อัดจาระบีชุด Cross Roller + เช็คความตึงโซ่</p>
                                <p>3. Satellite Unit: ขันแน่นชุด Satellite</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {sundayCodes.map(code => (
                                    <span key={code} className="px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple text-[10px] font-mono font-bold">
                                        {code}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Sunday SF/SP Update */}
                        <div className="card-glass p-4 rounded-xl border border-accent-green/20">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircleIcon size={16} className="text-accent-green" />
                                <h5 className="text-xs font-bold text-accent-green">วันอาทิตย์: ปรับปรุง Checklist (SF01, SF02, SP01)</h5>
                            </div>
                            <p className="text-[11px] text-text-muted">
                                ปรับลดเหลือเฉพาะ: 1. อัดจาระบีตลับลูกปืนและจุดหมุน, 2. เช็ดทำความสะอาดและตรวจเช็คฟันเฟือง
                            </p>
                        </div>
                    </div>
                )}

                {/* Tab Content: Monthly */}
                {activeTab === 'monthly' && (
                    <div className="space-y-3">
                        <p className="text-xs text-text-muted">
                            จัดสรรกระจายสมดุลออกเป็น **ทุกวัน (ตั้งแต่วันที่ 1 ถึง 30 ของเดือน)** และจัดกลุ่มตามห้อง/โซน:
                        </p>
                        {monthlyGroups.map(grp => (
                            <div key={grp.day} className="card-glass p-3.5 rounded-xl border border-white/10">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-xs font-bold text-accent-cyan">{grp.label}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan font-semibold">{grp.zone}</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {grp.codes.map(c => (
                                        <span key={c} className="px-2 py-0.5 rounded bg-white/5 text-text-primary text-[10px] font-mono border border-white/5">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab Content: Congestion */}
                {activeTab === 'congestion' && (
                    <div className="space-y-3">
                        <div className="bg-accent-orange/10 border border-accent-orange/20 rounded-xl p-3 text-xs text-accent-orange flex items-center gap-2">
                            <AlertTriangleIcon size={16} className="shrink-0" />
                            <span>รายงานการกระจุกตัวของแผนงานเดิม (สำหรับให้ Admin พิจารณาปรับวัน):</span>
                        </div>

                        <div className="card-glass p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-accent-red">
                                <span>วันที่ 16 ของเดือน (8 แผนงาน - กระจุกตัวมาก)</span>
                            </div>
                            <p className="text-text-muted text-[11px]">
                                • มีเครื่องวาฟเฟิล RTE 6 เครื่อง (HT11-HT16) + Pizza Conveyor (CV02) + Silo (SL01)<br />
                                💡 <strong>ข้อเสนอแนะ:</strong> ควรเก็บ HT11-HT16 ไว้ทำพร้อมกันในวันที่ 16 ตามเดิม แต่ย้าย <span className="text-accent-cyan">CV02 (ห้องพิซซ่า FZ)</span> ไปวันที่ 4 (มีแค่ 1 แผน) เพื่อไม่ให้ช่างต้องข้ามโซนไปมา
                            </p>
                        </div>

                        <div className="card-glass p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-accent-orange">
                                <span>วันที่ 22 ของเดือน (6 แผนงาน)</span>
                            </div>
                            <p className="text-text-muted text-[11px]">
                                • มีเครื่อง Packing RTE 4 เครื่อง + เครื่องห้องแซนวิช RTE 2 เครื่อง (CT09, CV13)<br />
                                💡 <strong>ข้อเสนอแนะ:</strong> ย้าย <span className="text-accent-cyan">CT09, CV13 (ห้องแซนวิช)</span> ไปวันที่ 23 ซึ่งเป็นวันทำ PM ห้องแซนวิชอยู่แล้ว
                            </p>
                        </div>

                        <div className="card-glass p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                            <div className="flex justify-between font-bold text-accent-yellow">
                                <span>วันที่ 29 ของเดือน (6 แผนงาน)</span>
                            </div>
                            <p className="text-text-muted text-[11px]">
                                • มีเครื่องห้องเตรียม 2 เครื่อง (CT03, CT07) + MakeUp 2 เครื่อง + แซนวิช 2 เครื่อง<br />
                                💡 <strong>ข้อเสนอแนะ:</strong> ย้าย <span className="text-accent-cyan">CT03, CT07 (ห้องเตรียม)</span> ไปวันที่ 28 ซึ่งปัจจุบันเป็นวันที่ว่าง (0 แผน)
                            </p>
                        </div>
                    </div>
                )}

                {/* Progress Indicator */}
                {isGenerating && (
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs text-text-muted font-semibold">
                            <span>{statusText}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-accent-blue transition-all duration-300 rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="btn-ghost text-xs px-4 py-2"
                    >
                        ปิดหน้าต่าง
                    </button>
                    <button
                        onClick={handleRunAutoGenerate}
                        disabled={isGenerating || (stats.toCreate === 0 && stats.toUpdate === 0)}
                        className="btn-primary text-xs px-5 py-2 flex items-center gap-2 shadow-lg shadow-accent-blue/20 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <WrenchIcon size={14} className="animate-spin" />
                                <span>กำลังดำเนินการ...</span>
                            </>
                        ) : (
                            <>
                                <ZapIcon size={14} />
                                <span>
                                    {stats.toCreate > 0 
                                        ? `เริ่มสร้างแผนงานใหม่ (${stats.toCreate} แผน)` 
                                        : stats.toUpdate > 0 
                                            ? `ปรับสมดุลแผนงาน (${stats.toUpdate} แผน)` 
                                            : `ไม่มีแผนที่ต้องจัดการ`}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
