"use client";

import React from "react";
import Modal from "./Modal";
import { useLanguage } from "../../contexts/LanguageContext";
import { BoxIcon, HistoryIcon, SettingsIcon, AlertTriangleIcon } from "./Icons";

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
    const { language } = useLanguage();

    const content = language === "th" ? (
        <div className="space-y-6 text-sm text-text-secondary">
            <div>
                <h3 className="text-white font-bold text-base mb-2">ภาพรวมระบบ (Deep Analysis Engine)</h3>
                <p>ระบบถูกออกแบบมาเพื่อให้ช่างซ่อมบำรุงสามารถค้นหาอะไหล่, จัดการสต็อก, และบันทึกประวัติการทำงานได้อย่างรวดเร็ว</p>
            </div>
            
            <div className="space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-2">ความหมายของสัญลักษณ์ต่างๆ</h3>
                
                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-accent-green/20 text-accent-green rounded shrink-0">
                        <BoxIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">อะไหล่ทั้งหมด (Inventory)</strong>
                        <p>จำนวนอะไหล่และเครื่องจักรที่มีในระบบ คุณสามารถกดปุ่ม "Add Part" เพื่อลงทะเบียนอะไหล่ใหม่ได้</p>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-accent-yellow/20 text-accent-yellow rounded shrink-0">
                        <HistoryIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">ประวัติซ่อมบำรุง (Maintenance History)</strong>
                        <p>แยกเป็น PM (Preventive - การบำรุงรักษาตามรอบ) และ Overhaul (การซ่อมใหญ่) คุณสามารถคลิกที่ประวัติเพื่อดูรายละเอียดเพิ่มเติม</p>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-accent-red/20 text-accent-red rounded shrink-0 animate-pulse">
                        <AlertTriangleIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">แผนงานด่วน (Urgent Tasks)</strong>
                        <p>หากสัญลักษณ์นี้กะพริบแปลว่ามีงานหรืออะไหล่ที่ต้องจัดการด่วน (เช่น อะไหล่ต่ำกว่า Stock ขั้นต่ำ)</p>
                    </div>
                </div>
                
                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-primary/20 text-primary rounded shrink-0">
                        <SettingsIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">ฟิลเตอร์ค้นหา (Search & Filter)</strong>
                        <p>กดปุ่มนี้เพื่อค้นหาอะไหล่ตามโซนเครื่องจักร หรือค้นหาด้วยชื่อโดยตรง</p>
                    </div>
                </div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <strong className="text-white block mb-1">ต้องการความช่วยเหลือเพิ่มเติม?</strong>
                <p>หากมีข้อสงสัยในการใช้งานหรือพบปัญหาระบบ กรุณาติดต่อทีม Admin ประจำแผนกของคุณ</p>
            </div>
        </div>
    ) : (
        <div className="space-y-6 text-sm text-text-secondary">
            <div>
                <h3 className="text-white font-bold text-base mb-2">System Overview</h3>
                <p>Designed for technicians to quickly find parts, manage inventory, and log maintenance history.</p>
            </div>
            
            <div className="space-y-4">
                <h3 className="text-white font-bold text-base border-b border-white/10 pb-2">Icons & Meanings</h3>
                
                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-accent-green/20 text-accent-green rounded shrink-0">
                        <BoxIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">Inventory Overview</strong>
                        <p>Total active parts and machines. Use "Add Part" to register new inventory.</p>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-accent-yellow/20 text-accent-yellow rounded shrink-0">
                        <HistoryIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">Maintenance History</strong>
                        <p>Track Preventive Maintenance (PM) vs Overhauls.</p>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                    <span className="p-1.5 bg-accent-red/20 text-accent-red rounded shrink-0 animate-pulse">
                        <AlertTriangleIcon size={16} />
                    </span>
                    <div>
                        <strong className="text-white block">Urgent Alerts</strong>
                        <p>Pulsing indicates immediate attention required (e.g., low stock parts).</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={language === "th" ? "คู่มือการใช้งาน (Help)" : "User Guide (Help)"}>
            {content}
            <div className="mt-6 flex justify-end">
                <button onClick={onClose} className="btn btn-primary">
                    {language === "th" ? "เข้าใจแล้ว" : "Got it"}
                </button>
            </div>
        </Modal>
    );
}
