import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyD1xGQ-nRWaea8nPdO_Uuc8mwFjHAi9BHA",
    authDomain: "real-time-spare-parts.firebaseapp.com",
    projectId: "real-time-spare-parts",
    storageBucket: "real-time-spare-parts.firebasestorage.app",
    messagingSenderId: "552329613791",
    appId: "1:552329613791:web:6d98ef84c513b51a84b46a",
    databaseURL: "https://real-time-spare-parts-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

async function run() {
    try {
        const userCred = await signInAnonymously(auth);
        
        const machSnap = await get(ref(db, "machines"));
        const planSnap = await get(ref(db, "pm_plans"));
        
        const machines = [];
        machSnap.forEach(c => { machines.push({...c.val(), id: c.key}); });
        
        const plans = [];
        planSnap.forEach(c => { plans.push({...c.val(), id: c.key}); });

        // Let's look at all Auto-Generated plans
        const autoPlans = plans.filter(p => p.taskName && p.taskName.includes("[Auto-Generated]"));
        
        console.log("Total Auto-Generated Plans:", autoPlans.length);
        
        autoPlans.forEach(p => {
            console.log(`- ${p.machineName} (${p.scheduleType}): nextDueDate=${p.nextDueDate}`);
        });

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

run();
