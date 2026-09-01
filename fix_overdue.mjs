import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, get, update } from "firebase/database";

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
        await signInAnonymously(auth);
        
        const planSnap = await get(ref(db, "pm_plans"));
        
        const plans = [];
        planSnap.forEach(c => { plans.push({...c.val(), id: c.key}); });

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let updates = {};
        let count = 0;

        plans.forEach(p => {
            if (p.status !== 'active') return;
            
            const dueDate = new Date(p.nextDueDate);
            // If the plan is in the past (before current month)
            if (dueDate.getFullYear() < currentYear || (dueDate.getFullYear() === currentYear && dueDate.getMonth() < currentMonth)) {
                // Move it to current month but keep the same day
                const newDueDate = new Date(currentYear, currentMonth, dueDate.getDate(), 0,0,0);
                
                // If the new due date is already past today, maybe it's fine, it will just show as overdue but in this month.
                // Or we can just set it exactly to this month so it appears in the chart.
                updates[`pm_plans/${p.id}/nextDueDate`] = newDueDate.toISOString();
                updates[`pm_plans/${p.id}/notes`] = (p.notes || "") + `\n[เลื่อนงานค้างเก่ามาแสดงผลในเดือนปัจจุบัน]`;
                count++;
            }
        });

        if (count > 0) {
            await update(ref(db), updates);
            console.log(`Successfully moved ${count} overdue plans to current month.`);
        } else {
            console.log("No overdue plans needed moving.");
        }

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit(0);
}

run();
