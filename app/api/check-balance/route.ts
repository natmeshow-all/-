import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
        const dbSecret = process.env.FIREBASE_DATABASE_SECRET;

        const plansRes = await fetch(`${dbUrl}/pm_plans.json?auth=${dbSecret}`);
        const plans = await plansRes.json();

        // Let's count jobs per day in Sept 2026
        const counts = Array(32).fill(0);
        let totalSep = 0;
        let nonMonthly = 0;

        for (const plan of Object.values(plans as Record<string, any>)) {
            if (plan.status !== 'active') continue;
            const date = new Date(plan.nextDueDate);
            if (date.getMonth() === 8 && date.getFullYear() === 2026) {
                counts[date.getDate()]++;
                totalSep++;
                if (plan.scheduleType !== 'monthly') {
                    nonMonthly++;
                }
            }
        }

        return NextResponse.json({ 
            totalSep,
            nonMonthly,
            counts: counts.slice(1) 
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
