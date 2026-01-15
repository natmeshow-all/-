// TypeScript types for the Maintenance Dashboard

export interface Machine {
    id: string;
    code?: string;
    name: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    performance?: string;
    location?: string;
    zone: string;
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
    zone: string;
    quantity: number;
    minStockThreshold: number; // Low stock alert level
    location?: string;
    category: PartCategory;
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
    notes?: string;
    evidenceImageUrl?: string; // Photo after work completion
    pmPlanId?: string; // Reference to the PMPlan if this was a PM task
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
    scheduleType?: "monthly" | "weekly";
    weeklyDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

    startDate: Date;
    nextDueDate: Date;
    lastCompletedDate?: Date;

    status: "active" | "paused";
    priority?: "normal" | "high" | "urgent";

    // Location/Context
    locationType?: "machine_zone" | "custom";
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
    totalZones: number;
    maintenanceRecords: number;
    pendingMaintenance: number;
    upcomingSchedule: number;
}

// Form types
export interface AddPartFormData {
    machineId: string;
    machineName: string;
    partName: string;
    modelSpec: string;
    zone: string;
    brand: string;
    quantity: number;
    minStockThreshold: number;
    location: string;
    category: PartCategory;
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
    zone?: string; // Where it's being used
    evidenceImageUrl?: string; // Proof of change (Withdrawal)
}

export interface PartFilters {
    machineId: string;
    zone: string;
    partName: string;
    location: string;
}
