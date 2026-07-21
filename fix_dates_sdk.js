require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');

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

async function fix() {
    const plansRef = ref(database, 'pm_plans');
    const snapshot = await get(plansRef);
    if (!snapshot.exists()) return console.log("No plans");
    
    const updates = {};
    snapshot.forEach(child => {
        const id = child.key;
        const plan = child.val();
        
        console.log(`Plan ID: ${id}, MachineName: ${plan.machineName}`);
        
        const mName = (plan.machineName || "").toLowerCase();
        if (mName.includes("fm05") || mName.includes("dt18") || mName.includes("rondo") || mName.includes("metal")) {
            console.log("Found plan:", plan.machineName);
            
            // The problem: nextDueDate was overwritten to startDate!
            // If they are equal, it's wrong (because it was completed once).
            // Actually, if lastCompletedDate exists, nextDueDate MUST be > lastCompletedDate.
            if (plan.lastCompletedDate) {
                let newDueDate = new Date(plan.startDate);
                if (plan.scheduleType === 'monthly') {
                    newDueDate = new Date(plan.lastCompletedDate);
                    newDueDate.setMonth(newDueDate.getMonth() + (plan.cycleMonths || 1));
                } else if (plan.scheduleType === 'weekly') {
                    newDueDate = new Date(plan.lastCompletedDate);
                    newDueDate.setDate(newDueDate.getDate() + 7);
                }
                
                console.log(`Calculated newDueDate: ${newDueDate.toISOString()} from ${plan.lastCompletedDate}`);
                updates[`${id}/nextDueDate`] = newDueDate.toISOString();
            }
        }
    });
    
    if (Object.keys(updates).length > 0) {
        await update(plansRef, updates);
        console.log("Updated", updates);
    } else {
        console.log("No updates needed");
    }
    
    process.exit(0);
}

fix().catch(console.error);
