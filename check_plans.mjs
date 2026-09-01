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
        const planSnap = await get(ref(db, "pm_plans"));
        const plans = [];
        planSnap.forEach(c => { plans.push({...c.val(), id: c.key}); });

        let otherPlans = plans.filter(p => {
            const date = new Date(p.nextDueDate);
            return !(date.getMonth() === 8 && date.getFullYear() === 2026);
        });

        console.log(`Found ${otherPlans.length} plans NOT in Sep 2026.`);
        
        let byType = {};
        otherPlans.forEach(p => {
            byType[p.scheduleType] = (byType[p.scheduleType] || 0) + 1;
        });
        console.log("By scheduleType:", byType);

        let byMonth = {};
        otherPlans.forEach(p => {
            const date = new Date(p.nextDueDate);
            const m = `${date.getFullYear()}-${date.getMonth()+1}`;
            byMonth[m] = (byMonth[m] || 0) + 1;
        });
        console.log("By Month:", byMonth);

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

run();
