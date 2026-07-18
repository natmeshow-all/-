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
        const details: any = {};
        Object.keys(pmPlansData).forEach(id => {
            const plan = pmPlansData[id];
            
            // Fix dates if the plan is stuck in the past or its nextDue is before or equal to lastCompleted
            if (plan.lastCompletedDate) {
                const nextDue = new Date(plan.nextDueDate);
                const lastComp = new Date(plan.lastCompletedDate);
                
                // If it is in the past, or if we need to advance it past lastCompleted
                if (nextDue <= lastComp || nextDue <= new Date(plan.startDate)) {
                    details[id] = plan;
                    
                    let newDueDate = new Date(plan.startDate);
                    let lastCompleted = plan.lastCompletedDate ? new Date(plan.lastCompletedDate) : new Date(plan.startDate);
                    
                    if (plan.scheduleType === 'monthly') {
                        const cycle = plan.cycleMonths || 1;
                        while (newDueDate <= lastCompleted) {
                            newDueDate.setMonth(newDueDate.getMonth() + cycle);
                        }
                    } else if (plan.scheduleType === 'weekly') {
                        while (newDueDate <= lastCompleted) {
                            newDueDate.setDate(newDueDate.getDate() + 7);
                        }
                    } else if (plan.scheduleType === 'yearly') {
                        while (newDueDate <= lastCompleted) {
                            newDueDate.setFullYear(newDueDate.getFullYear() + 1);
                        }
                    }
                    
                    updates[`${id}/nextDueDate`] = newDueDate.toISOString();
                    logs.push(`-> Set newDueDate to ${newDueDate.toISOString()} for ${plan.machineName}`);
                }
            }
        });

        if (Object.keys(updates).length > 0) {
            const patchRes = await fetch(`${dbUrl}/pm_plans.json?auth=${dbSecret}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            await patchRes.json();
            return NextResponse.json({ message: "Fixed dates", details, logs });
        }

        return NextResponse.json({ message: "No updates needed", details, logs });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
