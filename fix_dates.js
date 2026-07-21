const https = require('https');

const DB_URL = "https://real-time-spare-parts-default-rtdb.asia-southeast1.firebasedatabase.app";

async function fixPlans() {
    return new Promise((resolve, reject) => {
        https.get(`${DB_URL}/pm_plans.json`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const plans = JSON.parse(data);
                if (!plans) return resolve();
                
                const updates = {};
                for (const [id, plan] of Object.entries(plans)) {
                    console.log(`Plan ID: ${id}, MachineName: ${plan.machineName}`);
                    
                    // The screenshot says "METAL DETECTOR DT18" and "Rondo Flattening Machine FM05"
                    // So maybe they don't contain exactly those strings? Or uppercase/lowercase?
                    const mName = (plan.machineName || "").toLowerCase();
                    if (mName.includes("fm05") || mName.includes("dt18") || mName.includes("rondo") || mName.includes("metal")) {
                        console.log("Found plan:", plan.machineName);
                        console.log(`Current nextDueDate: ${plan.nextDueDate}, startDate: ${plan.startDate}, lastCompleted: ${plan.lastCompletedDate}`);
                        
                        if (plan.lastCompletedDate || new Date(plan.nextDueDate) <= new Date(plan.startDate)) {
                            // Needs fix!
                            let newDueDate = new Date(plan.startDate);
                            if (plan.scheduleType === 'monthly') {
                                newDueDate = new Date(plan.lastCompletedDate || plan.startDate);
                                newDueDate.setMonth(newDueDate.getMonth() + (plan.cycleMonths || 1));
                            } else if (plan.scheduleType === 'weekly') {
                                newDueDate = new Date(plan.lastCompletedDate || plan.startDate);
                                newDueDate.setDate(newDueDate.getDate() + 7);
                            }
                            
                            console.log(`Calculated newDueDate: ${newDueDate.toISOString()}`);
                            updates[`${id}/nextDueDate`] = newDueDate.toISOString();
                        }
                    }
                }
                
                if (Object.keys(updates).length > 0) {
                    const req = https.request(`${DB_URL}/pm_plans.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' }
                    }, (patchRes) => {
                        let patchData = '';
                        patchRes.on('data', chunk => patchData += chunk);
                        patchRes.on('end', () => {
                            console.log("Patch complete:", patchData);
                            resolve();
                        });
                    });
                    req.write(JSON.stringify(updates));
                    req.end();
                } else {
                    console.log("No updates needed");
                    resolve();
                }
            });
        }).on('error', reject);
    });
}

fixPlans().catch(console.error);
