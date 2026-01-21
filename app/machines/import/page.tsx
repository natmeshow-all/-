"use client";

import React, { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { addMachine } from "../../lib/firebaseService";
import machinesData from "../../../scripts/import/machines_import_7.json";
import Header from "../../components/Header";
import MobileNav from "../../components/MobileNav";

export default function ImportPage() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [log, setLog] = useState<string[]>([]);

    const handleImport = async () => {
        if (!confirm(`Are you sure you want to import ${machinesData.length} NEW machines (Batch 7 - UT)?`)) return;

        setLoading(true);
        setLog([]);
        let successCount = 0;

        for (let i = 0; i < machinesData.length; i++) {
            const machine = machinesData[i];
            try {
                // @ts-ignore
                await addMachine(machine);
                successCount++;
                setLog(prev => [...prev, `✅ Imported: ${machine.name}`]);
            } catch (error) {
                console.error(`Failed to import ${machine.name}`, error);
                setLog(prev => [...prev, `❌ Failed: ${machine.name}`]);
            }
            setProgress(Math.round(((i + 1) / machinesData.length) * 100));
        }

        setLoading(false);
        setLog(prev => [...prev, `\nFinished! Successfully imported ${successCount} machines.`]);
    };

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <Header />
            <main className="main-container px-4 py-12">
                <div className="max-w-2xl mx-auto bg-bg-secondary rounded-2xl p-8 border border-white/10 shadow-xl">
                    <h1 className="text-2xl font-bold mb-2">Machine Data Import (Batch 7)</h1>
                    <p className="text-text-muted mb-6">Import {machinesData.length} machines from machines_import_7.json (UT)</p>

                    <div className="mb-8">
                        <div className="flex justify-between mb-2 text-sm font-medium">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    <button
                        onClick={handleImport}
                        disabled={loading}
                        className={`btn btn-primary w-full h-12 text-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Importing...' : 'Start Batch Import'}
                    </button>

                    {log.length > 0 && (
                        <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-sm h-64 overflow-y-auto custom-scrollbar">
                            {log.map((line, i) => (
                                <div key={i} className="mb-1">{line}</div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <MobileNav />
        </div>
    );
}
