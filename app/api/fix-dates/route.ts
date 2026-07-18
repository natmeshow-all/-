import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
        const dbSecret = process.env.FIREBASE_DATABASE_SECRET;

        if (!dbUrl || !dbSecret) {
            return NextResponse.json({ error: "Missing DB secret" }, { status: 500 });
        }

        // Fetch PM Plans
        const plansRes = await fetch(`${dbUrl}/pm_plans.json?auth=${dbSecret}`);
        const pmPlansData = await plansRes.json();

        if (!pmPlansData) {
            return NextResponse.json({ message: "No plans found" });
        }

        const updates: any = {};
        const logs: any[] = [];

        Object.keys(pmPlansData).forEach(id => {
            const plan = pmPlansData[id];
            const mName = (plan.machineName || "").toLowerCase();

            if (mName.includes("fm05") || mName.includes("dt18") || mName.includes("rondo") || mName.includes("metal")) {
                logs.push(`Found plan: ${plan.machineName} (lastCompleted: ${plan.lastCompletedDate}, nextDue: ${plan.nextDueDate})`);
                
                // If it has a lastCompletedDate, or if the nextDueDate is <= startDate (meaning it was reset)
                if (plan.lastCompletedDate) {
                    let newDueDate = new Date(plan.startDate);
                    if (plan.scheduleType === 'monthly') {
                        newDueDate = new Date(plan.lastCompletedDate);
                        newDueDate.setMonth(newDueDate.getMonth() + (plan.cycleMonths || 1));
                    } else if (plan.scheduleType === 'weekly') {
                        newDueDate = new Date(plan.lastCompletedDate);
                        newDueDate.setDate(newDueDate.getDate() + 7);
                    }
                    
                    updates[`${id}/nextDueDate`] = newDueDate.toISOString();
                    logs.push(`-> Set newDueDate to ${newDueDate.toISOString()}`);
                }
            }
        });

        if (Object.keys(updates).length > 0) {
            const patchRes = await fetch(`${dbUrl}/pm_plans.json?auth=${dbSecret}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const patchResult = await patchRes.json();
            return NextResponse.json({ message: "Fixed dates", updates, result: patchResult, logs });
        }

        return NextResponse.json({ message: "No updates needed", logs });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
