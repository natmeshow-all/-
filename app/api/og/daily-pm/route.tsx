import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { plans, dateText } = body;

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#0f172a', // Tailwind bg-slate-900
                        color: 'white',
                        padding: '40px',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ fontSize: '48px', color: '#38bdf8' }}>🔧</div>
                            <h1 style={{ fontSize: '42px', fontWeight: 'bold', margin: 0, color: '#f8fafc' }}>
                                แผนบำรุงรักษาเครื่องจักร (PM) ประจำวัน
                            </h1>
                        </div>
                        <p style={{ fontSize: '24px', color: '#94a3b8', marginTop: '10px' }}>
                            ประจำวันที่ {dateText || new Date().toLocaleDateString('th-TH')}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                        {plans && plans.length > 0 ? (
                            plans.map((plan: any, i: number) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        backgroundColor: '#1e293b', // Tailwind bg-slate-800
                                        borderRadius: '16px',
                                        padding: '24px',
                                        borderLeft: '8px solid #38bdf8',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <span style={{ fontSize: '32px' }}>⚙️</span>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc' }}>
                                                    {plan.machineName}
                                                </span>
                                                <span style={{ fontSize: '20px', color: '#38bdf8', marginTop: '4px' }}>
                                                    รหัส: {plan.machineCode || plan.machineId || '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', padding: '8px 16px', backgroundColor: '#0284c7', borderRadius: '20px' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                                                {plan.taskName || 'PM / ตรวจเช็คตามวาระ'}
                                            </span>
                                        </div>
                                    </div>
                                    {plan.checklistItems && plan.checklistItems.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                                            {plan.checklistItems.slice(0, 5).map((item: string, j: number) => (
                                                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '6px', height: '6px', backgroundColor: '#cbd5e1', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '18px', color: '#cbd5e1' }}>{item}</span>
                                                </div>
                                            ))}
                                            {plan.checklistItems.length > 5 && (
                                                <span style={{ fontSize: '18px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    และอีก {plan.checklistItems.length - 5} รายการ...
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                                <span style={{ fontSize: '28px', color: '#94a3b8' }}>✅ ไม่มีแผนบำรุงรักษาสำหรับวันนี้</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                        <span style={{ fontSize: '16px', color: '#64748b' }}>
                            Created by Maintenance System (Auto-generated)
                        </span>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: Math.max(630, (plans?.length || 0) * 200 + 250), // Auto-scale height based on items
            }
        );
    } catch (e: any) {
        console.error(`[OG Image API Error]`, e);
        return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
    }
}
