// Service to handle IoT Sensor Data (Vibration, Temperature, Current)
import { ref, push, set, query, limitToLast, onValue, get, serverTimestamp } from "firebase/database";
import { database } from "./firebase";

export interface SensorReading {
    id?: string;
    machineId: string;
    temperature: number;
    vibration: number;
    current: number;
    timestamp: number;
}

const SENSOR_COLLECTION = "sensor_readings";

/**
 * Record a new sensor reading
 */
export async function recordSensorData(reading: Omit<SensorReading, "timestamp">) {
    const sensorRef = ref(database, SENSOR_COLLECTION);
    const newReadingRef = push(sensorRef);

    await set(newReadingRef, {
        ...reading,
        timestamp: serverTimestamp()
    });

    return newReadingRef.key;
}

/**
 * Get recent sensor readings for a machine
 */
export function subscribeToSensorData(machineId: string, callback: (readings: SensorReading[]) => void) {
    const sensorRef = ref(database, SENSOR_COLLECTION);
    // In a real scenario, we'd query by machineId and limit
    // For this prototype, we'll get the latest readings
    const q = query(sensorRef, limitToLast(20));

    return onValue(q, (snapshot) => {
        if (snapshot.exists()) {
            const data: SensorReading[] = [];
            snapshot.forEach((child) => {
                const val = child.val();
                if (val.machineId === machineId) {
                    data.push({ id: child.key!, ...val });
                }
            });
            callback(data);
        } else {
            callback([]);
        }
    });
}

/**
 * Simulate IoT data generation (for demo/Phase 4 prototype)
 */
export function startSimulation(machineId: string) {
    console.log(`Starting sensor simulation for ${machineId}...`);

    const interval = setInterval(async () => {
        // Generate random but realistic data
        const baseTemp = 60;
        const baseVib = 1.5;
        const baseCurrent = 8.0;

        const reading = {
            machineId,
            temperature: baseTemp + (Math.random() * 20),
            vibration: baseVib + (Math.random() * 3),
            current: baseCurrent + (Math.random() * 5),
        };

        try {
            await recordSensorData(reading);
        } catch (error) {
            console.error("Simulation error:", error);
        }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
}
