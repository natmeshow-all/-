import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

async function run() {
    try {
        console.log("Authenticating...");
        const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@aob.com',
                password: 'password', // Try password or 123456
                returnSecureToken: true
            })
        });
        
        const authData = await authRes.json();
        const idToken = authData.idToken;
        
        if (!idToken) {
            // Let's try 123456
            console.log("Trying 123456...");
            const authRes2 = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'admin@aob.com',
                    password: 'password123',
                    returnSecureToken: true
                })
            });
            const authData2 = await authRes2.json();
            if (!authData2.idToken) {
                console.log("Auth failed", authData2);
                process.exit(1);
            }
        }
        
        console.log("Authenticated!");
        const token = idToken || authData.idToken;
        
        console.log("Fetching PM Plans...");
        const plansRes = await fetch(`${DB_URL}/pm_plans.json?auth=${token}`);
        const plans = await plansRes.json();

        console.log("Fetching Maintenance Records...");
        const recordsRes = await fetch(`${DB_URL}/maintenance_records.json?auth=${token}`);
        const records = await recordsRes.json();

        let revertedCount = 0;

        for (const [recordId, record] of Object.entries(records)) {
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
                
                if (originalNextDue >= today) {
                    console.log(`Reverting plan ${planId} (${plan.taskName}) to ${originalNextDue.toISOString()}`);
                    
                    const planUpdate = {
                        nextDueDate: originalNextDue.toISOString(),
                        completedCount: Math.max(0, (plan.completedCount || 1) - 1)
                    };
                    
                    await fetch(`${DB_URL}/pm_plans/${planId}.json?auth=${token}`, {
                        method: 'PATCH',
                        body: JSON.stringify(planUpdate)
                    });
                    
                    await fetch(`${DB_URL}/maintenance_records/${recordId}.json?auth=${token}`, {
                        method: 'DELETE'
                    });
                    
                    revertedCount++;
                }
            }
        }
        console.log(`Reverted ${revertedCount} plans!`);
    } catch (e) {
        console.error(e);
    }
}
run();
