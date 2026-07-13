import { NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import { getPMPlans, getSystemSettings } from '../../../lib/firebaseService';
import { PMPlan } from '../../../types';
import { decodeSecret } from '../../../lib/obfuscate';

// Must use edge runtime for ImageResponse to work easily without extra configuration in some cases,
// but we need node runtime to use some fetch features, let's stick to default (nodejs) or edge.
// Actually, ImageResponse works in both now.
// Let's use edge if possible, or just default.

export async function GET(request: Request) {
    try {
        // 1. Fetch PM Plans and Settings
        const allPlans = await getPMPlans();
        const settings = await getSystemSettings();
        
        // 2. Filter for today
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

        const plansToday = allPlans.filter(plan => {
            if (plan.status !== 'active') return false;
            const dueDate = new Date(plan.nextDueDate).getTime();
            return dueDate >= startOfToday && dueDate <= endOfToday;
        });

        // if (plansToday.length === 0) {
        //     return NextResponse.json({ message: "No PM plans scheduled for today." });
        // }

        // Format Date Thai
        const dateText = today.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        // 3. Generate Image using next/og
        const imageRes = new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#0f172a',
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
                            ประจำวันที่ {dateText}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
                        {plansToday.length > 0 ? (
                            plansToday.map((plan, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        backgroundColor: '#1e293b',
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
                                                    รหัส: {plan.machineId || '-'}
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
                                            {plan.checklistItems.slice(0, 5).map((item, j) => (
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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, backgroundColor: '#1e293b', borderRadius: '16px', padding: '40px' }}>
                                <span style={{ fontSize: '32px', color: '#34d399', fontWeight: 'bold' }}>✅ ไม่มีแผนบำรุงรักษาสำหรับวันนี้</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                        <span style={{ fontSize: '16px', color: '#64748b' }}>
                            ระบบจัดการงานซ่อมบำรุง (Automated Daily Notification)
                        </span>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: Math.max(630, plansToday.length * 200 + 250),
            }
        );

        // Convert Response to Buffer
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let publicImageUrl = "";

        // 4. Upload to temporary image host (uguu.se) for LINE
        try {
            const formData = new FormData();
            formData.append('files[]', new Blob([buffer], { type: 'image/png' }), 'daily-pm.png');
            
            const uploadRes = await fetch('https://uguu.se/upload.php', {
                method: 'POST',
                body: formData,
            });
            
            const data = await uploadRes.json();
            if (data && data.success && data.files && data.files.length > 0) {
                publicImageUrl = data.files[0].url;
            }
        } catch (err) {
            console.error("Failed to upload image to uguu.se:", err);
        }

        const messageText = `แจ้งเตือนแผน PM ประจำวันที่ ${dateText}\nมีแผนที่ต้องดำเนินการทั้งหมด ${plansToday.length} รายการ`;

        let telegramStatus: any = "Not configured";
        // 5. Send to Telegram
        try {
            const telegramBotToken = settings ? decodeSecret(settings.telegramBotToken || "") : "";
            const telegramChatId = settings ? decodeSecret(settings.telegramChatId || "") : "";
            const isTelegramEnabled = settings ? settings.telegramNotificationsEnabled : false;
            
            if (telegramBotToken && telegramChatId && isTelegramEnabled) {
                const tgFormData = new FormData();
                tgFormData.append('chat_id', telegramChatId);
                tgFormData.append('caption', messageText);
                tgFormData.append('photo', new Blob([buffer], { type: 'image/png' }), 'report.png');

                const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
                    method: 'POST',
                    body: tgFormData,
                });
                telegramStatus = await tgRes.json();
            } else {
                telegramStatus = "Not configured or disabled in settings";
            }
        } catch (err: any) {
            console.error("Failed to send to Telegram:", err);
            telegramStatus = { error: err.message };
        }

        let lineStatus: any = "Not configured or no image URL";
        // 6. Send to LINE
        if (publicImageUrl) {
            try {
                const lineAccessToken = settings ? decodeSecret(settings.lineChannelAccessToken || "") : "";
                const lineUserId = settings ? decodeSecret(settings.lineTargetId || "") : "";
                
                if (lineAccessToken && lineUserId) {
                    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineAccessToken}`,
                        },
                        body: JSON.stringify({
                            to: lineUserId,
                            messages: [
                                {
                                    type: "image",
                                    originalContentUrl: publicImageUrl,
                                    previewImageUrl: publicImageUrl
                                }
                            ],
                        }),
                    });
                    
                    const resText = await lineRes.text();
                    lineStatus = { status: lineRes.status, response: resText || 'OK' };
                } else {
                    lineStatus = "Line credentials missing in system settings";
                }
            } catch (err: any) {
                console.error("Failed to send to LINE:", err);
                lineStatus = { error: err.message };
            }
        }

        return NextResponse.json({ 
            success: true, 
            plansCount: plansToday.length, 
            imageUrl: publicImageUrl,
            telegram: telegramStatus,
            line: lineStatus
        });

    } catch (error: any) {
        console.error("Daily PM Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
