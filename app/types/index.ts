// TypeScript types for the Maintenance Dashboard

// ===== User Management Types =====
export type UserRole = "admin" | "supervisor" | "technician" | "viewer";

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    nickname?: string;
    role: UserRole;
    department?: string;
    isApproved: boolean;
    isActive: boolean;
    photoURL?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PendingUser {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    requestedAt: string;
}

export interface Machine {
    id: string;
    code?: string;
    name: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    performance?: string;
    location?: string;
    Location: string;
    remark?: string;
    description?: string;
    status: "active" | "maintenance" | "inactive";
    imageUrl?: string;
    installationDate?: string;
    brandModel?: string; // Legacy field, keeping for compatibility
    operatingHours?: number;
    capacity?: string; // Legacy field, keeping for compatibility
    powerRating?: string; // Legacy field, keeping for compatibility
    maintenanceCycle?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Part {
    id: string;
    machineId: string;
    machineName: string;
    partName: string;
    modelSpec: string;
    brand: string;
    Location: string;
    quantity: number;
    minStockThreshold: number; // Low stock alert level
    location?: string;
    category: PartCategory;
    parentId?: string; // For sub-parts (e.g. bearing inside a motor)
    hasSubParts?: boolean; // If this is an assembly (e.g. a motor)
    imageUrl?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type PartCategory =
    | "motor"
    | "gear"
    | "belt"
    | "bearing"
    | "pump"
    | "valve"
    | "electrical"
    | "other";

export type MaintenanceType =
    | "preventive"
    | "corrective"
    | "oilChange"
    | "partReplacement"
    | "inspection";

export type MaintenancePriority = "normal" | "high" | "urgent";

export type MaintenanceStatus = "pending" | "inProgress" | "completed";

export type VibrationLevel = "normal" | "medium" | "abnormal";

export interface VibrationData {
    value: string;
    level: VibrationLevel;
}

export interface ShaftDialGaugeData {
    shaftBend: string; // ค่าเพลา (คด/งอ)
    dialGauge: string; // ค่าไดอัลเกจ
}

export interface MotorGearData {
    motorSize?: string;
    vibrationX?: VibrationData;
    vibrationY?: VibrationData;
    vibrationZ?: VibrationData;
    voltageL1?: string;
    voltageL2?: string;
    voltageL3?: string;
    currentIdle?: string;
    currentLoad?: string;
    temperature?: string;
    shaftData?: ShaftDialGaugeData;
}

export interface ChecklistItemResult {
    item: string;
    completed: boolean;
    value?: string;
}

export interface MaintenanceRecord {
    id: string;
    machineId: string;
    machineName: string;
    description: string;
    type: MaintenanceType;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    date: Date;
    duration?: number; // in minutes
    technician: string;
    motorGearData?: MotorGearData;
    details?: string;
    checklist?: ChecklistItemResult[];
    Location?: string; // Location of the machine 
    location?: string; // FZ/RTE/UT 
    notes?: string;
    evidenceImageUrl?: string; // Photo after work completion (Legacy/Primary)
    additionalEvidence?: { label: string; url: string; }[]; // Additional photos (e.g., Vibration, Amp)
    pmPlanId?: string; // Reference to the PMPlan if this was a PM task
    startTime?: Date;
    endTime?: Date;
    period?: string;

    // Part specific fields
    partId?: string;
    partName?: string;
    isOverhaul?: boolean;
    lifespanValue?: number;
    lifespanUnit?: 'hours' | 'days' | 'months';
    serialNumber?: string;
    previousReplacementDate?: string;
    partLifespan?: string;
    previousChangeId?: string;

    // Advanced Analysis Fields
    machineHours?: number; // Reading at time of change
    changeReason?: string; // e.g., 'worn', 'failed', 'planned'
    partCondition?: string; // condition of old part
    cost?: number;
    supplier?: string;

    createdAt: Date;
    updatedAt: Date;
}

export interface PMPlan {
    id: string;
    machineId: string;
    machineName: string;
    taskName: string; // Creates the main header/description
    checklistItems?: string[]; // Flexible sub-tasks

    // Scheduling
    cycleMonths?: number; // kept for backward compatibility or monthly usage
    scheduleType?: "monthly" | "weekly" | "yearly" | "custom";
    weeklyDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

    startDate: Date;
    nextDueDate: Date;
    lastCompletedDate?: Date;

    status: "active" | "paused";
    priority?: "normal" | "high" | "urgent";

    // Location/Context
    locationType?: "machine_Location" | "custom";
    customLocation?: string;

    completedCount?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MaintenanceSchedule {
    id: string;
    machineId: string;
    machineName: string;
    type: MaintenanceType;
    scheduledDate: Date;
    intervalDays: number;
    lastCompleted?: Date;
    nextDue: Date;
    notes?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "technician" | "viewer";
    createdAt: Date;
}

export interface DashboardStats {
    totalParts: number;
    totalMachines: number;
    totalLocations: number;
    maintenanceRecords: number;
    totalPM: number;
    totalOverhaul: number;
    pendingMaintenance: number;
    upcomingSchedule: number;
}

// Form types
export interface AddPartFormData {
    machineId: string;
    machineName: string;
    partName: string;
    modelSpec: string;
    Location: string;
    brand: string;
    quantity: number;
    minStockThreshold: number;
    location: string;
    category: PartCategory;
    parentId?: string; // For hierarchical association
    imageFile?: File;
    notes: string;
}

export interface MaintenanceRecordFormData {
    machineId: string;
    description: string;
    type: MaintenanceType;
    priority: MaintenancePriority;
    date: string;
    duration: string;
    technician: string;
    status: MaintenanceStatus;
    startTime: string;
    endTime: string;
    period?: string; // e.g. routine, 1month, 3months, etc.

    // Part specific
    partId?: string;
    manualPartName: string;
    isOverhaul?: boolean;
    lifespanValue: string;
    lifespanUnit: 'hours' | 'days' | 'months' | 'years';
    previousReplacementDate?: string;
    partLifespan?: string;
    serialNumber: string;

    // Advanced
    machineHours: string;
    changeReason: string;
    partCondition: string;

    motorSize: string;
    vibrationXValue: string;
    vibrationXLevel: VibrationLevel;
    vibrationYValue: string;
    vibrationYLevel: VibrationLevel;
    vibrationZValue: string;
    vibrationZLevel: VibrationLevel;
    voltageL1: string;
    voltageL2: string;
    voltageL3: string;
    currentIdle: string;
    currentLoad: string;
    temperature: string;
    shaftBend: string;
    dialGauge: string;
    details: string;
    notes: string;
}

// Spare Parts & Inventory Types
export interface SparePart {
    id: string;
    name: string;
    description?: string; // Spec details
    category: string; // bearing, oil, etc.
    brand?: string; // Brand name (e.g. SKF, NSK)
    notes?: string; // Additional notes
    quantity: number;
    unit: string; // pcs, liters, etc.
    minStockThreshold: number; // Low stock alert level
    location?: string; // Shelf A1, Cabinet 3
    supplier?: string;
    pricePerUnit?: number; // Cost tracking
    imageUrl?: string;
    lastUpdatedBy?: string;
    parentId?: string; // For nested spare parts
    hasSubParts?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TransactionType = "restock" | "withdraw";

export interface StockTransaction {
    id: string;
    partId: string;
    partName: string;
    type: TransactionType;
    quantity: number;
    machineId?: string; // For withdrawal: which machine used it
    machineName?: string;
    performedBy: string; // User display name
    performedByEmail?: string;
    userId: string; // Firebase uid
    performedAt: Date;
    notes?: string;
    pricePerUnit?: number; // Captured at time of transaction
    totalValue?: number;
    supplier?: string; // For restock
    refDocument?: string; // PO/Invoice number
    Location?: string; // Where it's being used
    evidenceImageUrl?: string; // Proof of change (Withdrawal)
}

export interface PartFilters {
    machineId: string;
    Location: string;
    partName: string;
    location: string;
}

// ===== Admin & Analytics Types =====
export interface UsageLog {
    date: string; // YYYY-MM-DD
    count: number;
}

export interface PerformanceScore {
    quality: number; // 1-5
    speed: number;   // 1-5
    reliability: number; // 1-5
    knowledge: number; // 1-5
}

export interface PerformanceEvaluation {
    id: string;
    technicianId: string;
    evaluatorId: string;
    evaluatorName: string;
    date: Date;
    scores: PerformanceScore;
    averageScore: number;
    comments: string;
}

export interface AdminStats {
    totalLogins: number;
    avgLoginsPerDay: number;
    usageHistory: { date: string; count: number }[];
    technicianCount: number;
    avgPerformance: number;
}

// ===== Audit Log Types =====
export type AuditActionType =
    | "login" | "logout"
    | "pm_complete" | "pm_create" | "pm_edit" | "pm_delete"
    | "maintenance_create" | "maintenance_edit"
    | "user_approve" | "user_reject" | "user_role_change"
    | "part_add" | "part_edit" | "part_delete" | "stock_change"
    | "machine_add" | "machine_edit" | "machine_delete"
    | "settings_change" | "data_export";

export interface AuditLog {
    id: string;
    action: AuditActionType;
    userId: string;
    userName: string;
    userRole: UserRole;
    targetId?: string;       // ID of affected entity (PM plan, user, etc.)
    targetName?: string;     // Name of affected entity
    details?: string;        // Additional details or JSON data
    ipAddress?: string;      // Client IP if available
    userAgent?: string;      // Browser info
    timestamp: Date;
}

// ===== System Settings Types =====
export interface SystemSettings {
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    requireApproval: boolean;
    dataRetentionDays: number;
    notificationsEnabled: boolean;
    lastBackupDate?: string;
}
