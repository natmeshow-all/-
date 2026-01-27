/**
 * @fileoverview Browser Cache and Memory Management Utility
 * 
 * Handles:
 * - Version-based cache clearing on app updates
 * - IndexedDB cleanup for Firebase persistence
 * - Service Worker management
 * - Memory usage monitoring
 * 
 * @module cacheManager
 */

// App version - MUST be synced with package.json
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.2.1-dev";

// Storage keys
const VERSION_KEY = "app_version";
const LAST_CLEANUP_KEY = "last_cache_cleanup";
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// IndexedDB databases to clear on version change
const INDEXED_DB_TO_CLEAR = [
    "firebaseLocalStorageDb",
    "firebase-heartbeat-database",
    "firebase-installations-database",
];

/**
 * Check app version and clear caches if version changed
 * @returns true if cache was cleared due to version mismatch
 */
export function checkAndClearOldCache(): boolean {
    if (typeof window === "undefined") return false;

    try {
        const storedVersion = localStorage.getItem(VERSION_KEY);

        // First time user or version mismatch
        if (storedVersion !== APP_VERSION) {
            console.log(`[CacheManager] Version changed: ${storedVersion} → ${APP_VERSION}. Clearing caches...`);
            clearAllCaches();
            localStorage.setItem(VERSION_KEY, APP_VERSION);
            localStorage.setItem(LAST_CLEANUP_KEY, Date.now().toString());
            return true;
        }

        // Periodic cleanup (every 24 hours)
        const lastCleanup = parseInt(localStorage.getItem(LAST_CLEANUP_KEY) || "0", 10);
        if (Date.now() - lastCleanup > CLEANUP_INTERVAL_MS) {
            console.log("[CacheManager] Performing periodic cleanup...");
            cleanupStaleData();
            localStorage.setItem(LAST_CLEANUP_KEY, Date.now().toString());
        }

        return false;
    } catch (error) {
        console.error("[CacheManager] Error checking cache version:", error);
        return false;
    }
}

/**
 * Clear all browser caches and IndexedDB
 */
export async function clearAllCaches(): Promise<void> {
    if (typeof window === "undefined") return;

    console.log("[CacheManager] Clearing all caches...");

    // 1. Clear sessionStorage completely
    try {
        sessionStorage.clear();
        console.log("[CacheManager] ✓ sessionStorage cleared");
    } catch (e) {
        console.warn("[CacheManager] Failed to clear sessionStorage:", e);
    }

    // 2. Clear localStorage EXCEPT essential keys
    try {
        const keysToKeep = [VERSION_KEY, LAST_CLEANUP_KEY, "language"];
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !keysToKeep.includes(key)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`[CacheManager] ✓ localStorage cleared (${keysToRemove.length} items)`);
    } catch (e) {
        console.warn("[CacheManager] Failed to clear localStorage:", e);
    }

    // 3. Clear IndexedDB databases (Firebase persistence)
    if (window.indexedDB) {
        for (const dbName of INDEXED_DB_TO_CLEAR) {
            try {
                const request = window.indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => console.log(`[CacheManager] ✓ IndexedDB "${dbName}" deleted`);
                request.onerror = () => console.warn(`[CacheManager] Failed to delete IndexedDB "${dbName}"`);
            } catch (e) {
                console.warn(`[CacheManager] Error deleting IndexedDB "${dbName}":`, e);
            }
        }
    }

    // 4. Unregister Service Workers
    if ("serviceWorker" in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log("[CacheManager] ✓ Service Worker unregistered");
            }
        } catch (e) {
            console.warn("[CacheManager] Failed to unregister Service Workers:", e);
        }
    }

    // 5. Clear Cache Storage (used by Service Workers)
    if ("caches" in window) {
        try {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log(`[CacheManager] ✓ Cache "${cacheName}" deleted`);
            }
        } catch (e) {
            console.warn("[CacheManager] Failed to clear Cache Storage:", e);
        }
    }

    console.log("[CacheManager] Cache clearing complete!");
}

/**
 * Cleanup stale data without clearing essential caches
 */
function cleanupStaleData(): void {
    if (typeof window === "undefined") return;

    // Remove old notification flags
    const staleKeys = ["db_notification_shown"];
    staleKeys.forEach(key => {
        try {
            sessionStorage.removeItem(key);
        } catch {
            // Ignore
        }
    });
}

/**
 * Get memory usage information (Chrome only)
 * @returns Memory usage percentage (0-100) or null if not available
 */
export function getMemoryUsage(): { percentage: number; usedMB: number; totalMB: number } | null {
    if (typeof window === "undefined") return null;

    // performance.memory is Chrome-only and non-standard
    const perf = performance as any;
    if (!perf.memory) return null;

    try {
        const usedBytes = perf.memory.usedJSHeapSize;
        const totalBytes = perf.memory.jsHeapSizeLimit;

        const usedMB = Math.round(usedBytes / (1024 * 1024));
        const totalMB = Math.round(totalBytes / (1024 * 1024));
        const percentage = Math.round((usedBytes / totalBytes) * 100);

        return { percentage, usedMB, totalMB };
    } catch {
        return null;
    }
}

/**
 * Check if memory usage is critical
 * @param threshold Percentage threshold (default 80)
 */
export function isMemoryCritical(threshold: number = 80): boolean {
    const usage = getMemoryUsage();
    if (!usage) return false;
    return usage.percentage >= threshold;
}

/**
 * Get storage usage information
 * @returns Storage usage in KB
 */
export function getStorageUsage(): { localStorage: number; sessionStorage: number } {
    let localStorageSize = 0;
    let sessionStorageSize = 0;

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                localStorageSize += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
            }
        }
    } catch {
        // Ignore
    }

    try {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) {
                sessionStorageSize += (key.length + (sessionStorage.getItem(key)?.length || 0)) * 2;
            }
        }
    } catch {
        // Ignore
    }

    return {
        localStorage: Math.round(localStorageSize / 1024),
        sessionStorage: Math.round(sessionStorageSize / 1024)
    };
}

/**
 * Perform emergency cleanup when memory is critical
 */
export async function emergencyCleanup(): Promise<void> {
    console.warn("[CacheManager] 🚨 Performing emergency cleanup due to high memory usage...");

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear non-essential localStorage
    const keysToKeep = [VERSION_KEY, LAST_CLEANUP_KEY, "language", "app_version"];
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log("[CacheManager] Emergency cleanup complete");
}
