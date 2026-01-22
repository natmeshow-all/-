/**
 * @fileoverview Firebase Realtime Database service layer for the Maintenance Dashboard.
 * 
 * This module acts as a facade (barrel file) for all data access functions.
 * The actual implementations have been refactored into modular services in the /services directory.
 * 
 * Services:
 * - machineService: Machines (equipment registry)
 * - partService: Parts, Spare Parts, Stock Transactions
 * - maintenanceService: Maintenance Records, PM Plans, Schedules
 * - userService: User profiles and permissions
 * - analyticsService: Dashboard statistics and reports
 * - systemService: Audit logs and system settings
 * 
 * @module firebaseService
 */

// Re-export translation services
export { 
    translateToEnglish, 
    syncTranslation, 
    getDynamicTranslations 
} from "../services/translationService";

// Re-export all sub-services
export * from "../services/machineService";
export * from "../services/partService";
export * from "../services/maintenanceService";
export * from "../services/userService";
export * from "../services/analyticsService";
export * from "../services/systemService";
