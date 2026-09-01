import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
        const dbSecret = process.env.FIREBASE_DATABASE_SECRET;

        if (!dbUrl || !dbSecret) {
            return NextResponse.json({ error: "Missing DB secret" }, { status: 500 });
        }

        console.log("Fetching PM Plans...");
        const plansRes = await fetch(`${dbUrl}/pm_plans.json?auth=${dbSecret}`);
        const plans = await plansRes.json();

        console.log("Fetching Maintenance Records...");
        const recordsRes = await fetch(`${dbUrl}/maintenance_records.json?auth=${dbSecret}`);
        const records = await recordsRes.json();

        let revertedCount = 0;

        for (const [recordId, record] of Object.entries(records as Record<string, any>)) {
            if (record.notes === "ปิดงานอัตโนมัติตามมาตรฐาน" && record.type === "preventive") {
                const planId = record.pmPlanId;
                if (!planId || !plans[planId]) continue;

                const plan = plans[planId];
                
                const currentNextDue = new Date(plan.nextDueDate);
                const originalNextDue = new Date(currentNextDue);
                
                if (plan.scheduleType === 'weekly') {
                    originalNextDue.setDate(originalNextDue.getDate() - 7);
                } else if (plan.scheduleType === 'yearly') {
                    originalNextDue.setFullYear(originalNextDue.getFullYear() - 1);
                } else {
                    const cycle = plan.cycleMonths || 1;
                    originalNextDue.setMonth(originalNextDue.getMonth() - cycle);
                }

                const today = new Date();
                today.setHours(0,0,0,0);
                
                // If it was originally scheduled for today or later
                if (originalNextDue >= today) {
                    console.log(`Reverting plan ${planId} (${plan.taskName}) to ${originalNextDue.toISOString()}`);
                    // 1. Revert PM Plan
                    const planUpdate = {
                        nextDueDate: originalNextDue.toISOString(),
                        completedCount: Math.max(0, (plan.completedCount || 1) - 1)
                    };
                    await fetch(`${dbUrl}/pm_plans/${planId}.json?auth=${dbSecret}`, {
                        method: 'PATCH',
                        body: JSON.stringify(planUpdate)
                    });
                    
                    // 2. Delete Maintenance Record
                    await fetch(`${dbUrl}/maintenance_records/${recordId}.json?auth=${dbSecret}`, {
                        method: 'DELETE'
                    });
                    
                    revertedCount++;
                }
            }
        }

        return NextResponse.json({ success: true, count: revertedCount });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
