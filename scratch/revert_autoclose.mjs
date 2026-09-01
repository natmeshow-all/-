import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update, remove } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

async function revertAutoClose() {
    try {
        await signInWithEmailAndPassword(auth, 'admin@aob.com', '123456');
        
        console.log("Fetching PM Plans...");
        const plansRef = ref(database, 'pm_plans');
        const plansSnapshot = await get(plansRef);
        const plans = plansSnapshot.val();

        console.log("Fetching Maintenance Records...");
        const recordsRef = ref(database, 'maintenance_records');
        const recordsSnapshot = await get(recordsRef);
        const records = recordsSnapshot.val();

        let revertedCount = 0;

        for (const [recordId, record] of Object.entries(records)) {
            // Find records created by the Auto-Close script
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
                    console.log(`Reverting plan ${planId} (${plan.taskName}). Original due: ${originalNextDue.toISOString()}`);
                    
                    // 1. Revert PM Plan
                    const planUpdate = {
                        nextDueDate: originalNextDue.toISOString(),
                        completedCount: Math.max(0, (plan.completedCount || 1) - 1)
                    };
                    await update(ref(database, `pm_plans/${planId}`), planUpdate);
                    
                    // 2. Delete Maintenance Record
                    await remove(ref(database, `maintenance_records/${recordId}`));
                    
                    revertedCount++;
                }
            }
        }
        
        console.log(`Successfully reverted ${revertedCount} plans!`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

revertAutoClose();
