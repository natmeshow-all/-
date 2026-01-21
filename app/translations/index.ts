export type Language = "th" | "en";

export interface TranslationKeys {
    // Common
    loading: string;
    actionLoadMore: string;
    appTitle: string;
    appSubtitle: string;
    machineDetailsSubtitle: string;

    // Navigation
    navDashboard: string;
    navMachines: string;
    navParts: string;
    navMaintenance: string;
    navSchedule: string;
    navAnalytics: string;
    navPredictive: string;
    navAudit: string;

    // Predictive Page
    predictiveSubtitle: string;
    predictiveAnalyzing: string;
    predictiveCriticalTitle: string;
    predictiveUpcomingTitle: string;
    predictiveHealthTitle: string;
    predictiveReliable: string;
    predictiveRiskAnalysis: string;
    predictiveRealtimeLogic: string;
    predictiveProb: string;
    predictivePredictedWithin: string;
    predictiveAvgTemp: string;
    predictiveAvgVib: string;
    predictiveViewReports: string;
    predictiveMachineCount: string;
    predictiveAreaCount: string;
    predictiveWithinHours: string;
    predictiveWithinDays: string;
    temperature: string;
    vibration: string;

    // Mock Predictions
    predBearingFailure: string;
    predBeltTension: string;
    predOverheating: string;

    statusHighRisk: string;
    statusMonitoring: string;
    statusHealthy: string;
    statusOverdue: string;
    statusOnTime: string;

    // Audit Page
    auditSubtitle: string;
    auditCompliance: string;
    auditTraceability: string;
    auditCriticalStock: string;
    auditReliability: string;
    auditPmCompletion: string;
    auditOnTimeRate: string;
    auditActiveIssues: string;
    auditAvailability: string;
    auditStatus: string;
    auditReady: string;
    auditTarget: string;
    auditMeasured: string;
    auditMachinesMonitorized: string;
    auditLowStock: string;
    auditInRepair: string;
    auditPartLocation: string;
    auditQtyMin: string;
    auditStockNormal: string;
    auditValidationActive: string;
    auditValidationDesc: string;

    // Stats
    statTotalParts: string;
    statMachines: string;
    statLocations: string;
    statMaintenanceRecords: string;
    statStockNormal: string;
    statStockLow: string;
    statTotalLocations: string;

    // Actions
    actionAddPart: string;
    actionAddMachine: string;
    actionRecordMaintenance: string;
    actionMaintenanceHistory: string;
    maintenancePageTitle: string;
    actionExport: string;
    actionClearFilters: string;
    actionSave: string;
    actionCancel: string;
    actionClose: string;
    actionEdit: string;
    actionDelete: string;
    actionRepair: string;
    actionSearch: string;
    placeholderSearchMachine: string;
    labelOther: string;
    placeholderOtherPartName: string;
    labelUsagePeriod: string;
    unitYear: string;
    unitMonth: string;
    unitDay: string;
    actionSaveChanges: string;
    placeholderMachineName: string;

    // Filters
    filterTitle: string;
    filterMachine: string;
    filterLocation: string;
    filterPartName: string;
    filterAll: string;
    filterShowResults: string;
    filterOf: string;
    filterRecords: string;
    machineCount: string;
    msgNoMachines: string;
    statusActive: string;
    statusInStock: string;
    statusLowStock: string;
    labelClass: string;
    historyItem: string;
    msgNoHistory: string;
    scheduleDescription: string;
    actionManagePM: string;
    msgOverdueAlert: string;
    msgActionRequired: string;
    msgLoadingPlans: string;
    labelDue: string;
    labelEveryDay: string;
    labelOverdueBy: string;
    labelToday: string;
    labelInDays: string;
    actionCloseWork: string;
    msgNoPlans: string;
    modalSelectMachinePM: string;
    msgNoMachineLocation: string;
    modalConfirmDeletePM: string;
    modalAreYouSure: string;
    modalDeletePMConfirm: string;
    statusOverdueLabel: string;
    statusTodayLabel: string;
    statusUpcomingLabel: string;
    statusOnTrackLabel: string;

    // Table Headers
    tableImage: string;
    tableMachine: string;
    tablePartName: string;
    tableModelSpec: string;
    tableBrand: string;
    tableLocationArea: string;
    tableStatus: string;
    tableDate: string;
    tableActions: string;
    tableQuantity: string;
    tableLocation: string;
    tableNotes: string;
    tableManagement: string;
    tableTitleParts: string;
    tableSupplier: string;
    tablePrice: string;

    // Add Part Modal
    addPartTitle: string;
    addPartMachine: string;
    addPartName: string;
    addPartSelectPart: string;
    addPartNewPart: string;
    addPartModelSpec: string;
    addPartLocationArea: string;
    addPartBrand: string;
    addPartQuantity: string;
    addPartUnit: string;
    addPartLocation: string;
    addPartImage: string;
    addPartChooseFile: string;
    addPartNoFile: string;
    addPartImageHint: string;
    labelCustomCategory: string;
    placeholderCustomCategory: string;
    labelParentPart: string;
    labelSubParts: string;
    labelNoSubParts: string;
    addPartCategory: string;
    addPartSelectCategory: string;
    addPartSelectMachine: string;
    addPartNotes: string;
    optionOther: string;

    // Machine Settings Labels
    labelFileSize: string;
    labelMachineName: string;
    labelMachineCode: string;
    labelMachineSettings: string;
    labelBrand: string;
    labelModel: string;
    labelBrandModel: string;
    labelSerialNumber: string;
    labelInstallationDate: string;
    labelOperatingHours: string;
    labelCapacity: string;
    labelPowerRating: string;
    labelPerformance: string;
    labelMaintenanceCycle: string;
    labelHours: string;
    labelPower: string;
    labelInstall: string;
    labelMonths: string;
    labelYears: string;
    labelDescription: string;
    labelRemark: string;

    // Maintenance Record Modal
    maintenanceTitle: string;
    maintenanceGeneralInfo: string;
    maintenanceMachine: string;
    maintenanceSelectMachine: string;
    maintenanceDescription: string;
    maintenanceType: string;
    maintenanceSelectType: string;
    maintenancePriority: string;
    maintenancePriorityNormal: string;
    maintenancePriorityHigh: string;
    maintenancePriorityUrgent: string;

    maintenanceOperationInfo: string;
    maintenanceDate: string;
    maintenanceDuration: string;
    maintenanceTechnician: string;
    maintenanceStatus: string;
    maintenanceStatusPending: string;
    maintenanceStatusInProgress: string;
    maintenanceStatusCompleted: string;

    maintenanceMotorGearInfo: string;
    maintenanceMotorSize: string;
    maintenanceMotorSizeHint: string;
    maintenanceVibration: string;
    maintenanceAxisX: string;
    maintenanceAxisY: string;
    maintenanceAxisZ: string;
    maintenanceVibrationValue: string;
    maintenanceVibrationNormal: string;
    maintenanceVibrationMedium: string;
    maintenanceVibrationAbnormal: string;

    maintenanceVoltage: string;
    maintenanceSelectVoltage: string;
    maintenanceCurrent: string;
    maintenanceCurrentIdle: string;
    maintenanceCurrentLoad: string;
    maintenanceTemperature: string;
    maintenanceTemperatureHint: string;

    // Shaft/Dial Gauge
    maintenanceShaftInfo: string;
    maintenanceShaftBend: string;
    maintenanceShaftBendValue: string;
    maintenanceDialGauge: string;
    maintenanceDialGaugeValue: string;

    maintenanceDetailsNotes: string;
    maintenanceDetailDescription: string;
    maintenanceAdditionalNotes: string;
    maintenanceSaveRecord: string;
    maintenanceHistoryTitle: string;

    // Advanced Tracking
    maintenanceMachineHours: string;
    maintenanceChangeReason: string;
    maintenancePartCondition: string;
    maintenanceReasonWorn: string;
    maintenanceReasonFailed: string;
    maintenanceReasonPlanned: string;
    maintenanceReasonImprovement: string;
    maintenanceConditionGood: string;
    maintenanceConditionFair: string;
    maintenanceConditionPoor: string;
    maintenanceConditionBroken: string;
    maintenanceAdvancedTracking: string;
    maintenanceOldPartStatus: string;

    // Maintenance Types
    typePreventive: string;
    typeCorrective: string;
    typeOilChange: string;
    typePartReplacement: string;
    typeInspection: string;

    // Categories
    categoryMotor: string;
    categoryGear: string;
    categoryBelt: string;
    categoryBearing: string;
    categoryPump: string;
    categoryValve: string;
    categoryElectrical: string;
    categoryOil: string;
    categoryPneumatic: string;
    categoryTool: string;
    categoryOther: string;

    // Zones
    locationTop: string;
    locationBottom: string;
    locationLeft: string;
    locationRight: string;
    locationFront: string;
    locationBack: string;
    locationInside: string;

    // Status Messages
    msgLoading: string;
    msgNoData: string;
    msgSaveSuccess: string;
    msgSaveError: string;
    msgConfirmDelete: string;
    msgSaving: string;
    msgDeleteSuccess: string;
    msgDeleteError: string;
    titleConfirmDelete: string;
    msgCurrentImagePreserved: string;
    msgDbConnected: string;
    msgDbReady: string;
    msgDbConnectError: string;
    msgDbErrorDetail: string;
    msgAddPartSuccess: string;
    msgEditPartSuccess: string;
    msgAddPartDetail: string;
    msgEditPartDetail: string;
    msgNoPermission: string;
    msgNoPermissionDetail: string;
    msgTimeout: string;
    msgTimeoutDetail: string;
    msgError: string;
    validateInput: string;
    validateSelectMachine: string;
    validateSelectPart: string;
    msgNoParts: string;
    msgNoEditPermission: string;
    msgPleaseLogin: string;
    stockWithdrawSuccess: string;
    stockReceiveSuccess: string;
    stockWithdrawError: string;
    stockReceiveError: string;

    // Additional Actions/Labels
    actionMaintenance: string;
    statusReadOnly: string;
    labelMachinePart: string;
    editPartTitle: string;
    confirmDeleteTitle: string;
    confirmDeleteMessage: string;
    confirmDeleteMessageDetail: string;

    // Placeholders
    placeholderMachine: string;
    placeholderLocationLong: string;
    placeholderBrand: string;
    placeholderLocation: string;
    placeholderNotes: string;
    placeholderTechnician: string;
    placeholderDuration: string;
    placeholderTemperature: string;
    placeholderCurrentIdle: string;
    placeholderCurrentLoad: string;
    placeholderVibration: string;
    placeholderDescription: string;
    placeholderAdditionalNotes: string;
    placeholderModelSpec: string;
    placeholderMotorSize: string;
    placeholderShaftBend: string;
    placeholderDialGauge: string;
    placeholderPartName: string;

    // Spare Parts Dashboard
    partsInventoryTitle: string;
    partsItemsCount: string;
    partsCategoriesCount: string;
    partsLowStockAlert: string;
    partsLowStockDesc: string;
    partsNoSpec: string;
    partsInStock: string;
    partsWithdraw: string;
    partsReceive: string;
    partsHistory: string;
    partsNoParts: string;
    partsNoPartsDesc: string;
    partsAddFirst: string;
    partsLoginToManage: string;

    // Stock Actions
    stockWithdrawTitle: string;
    stockReceiveTitle: string;
    stockQuantity: string;
    stockMachine: string;
    stockLocation: string;
    stockNotes: string;
    stockEvidence: string;
    stockEvidenceHint: string;
    stockSupplier: string;
    stockPrice: string;
    stockRefDoc: string;
    stockConfirmWithdraw: string;
    stockConfirmReceive: string;

    // Stock History
    historyTitle: string;
    historyNoData: string;
    historyPerformedBy: string;
    historyPerformedAt: string;
    historyClose: string;

    // Schedule & Calendar
    scheduleCalendarView: string;
    scheduleListView: string;
    calendarToday: string;
    calendarMon: string;
    calendarTue: string;
    calendarWed: string;
    calendarThu: string;
    calendarFri: string;
    calendarSat: string;
    calendarSun: string;
    calendarNoTasks: string;

    // Notifications
    notificationTitle: string;
    notificationEmpty: string;
    notificationLowStockMessage: string;
    notificationPmUpcomingTitle: string;
    notificationPmUpcomingMessage: string;
    notificationPmTodayTitle: string;
    notificationPmTodayMessage: string;
    notificationPmOverdueTitle: string;
    notificationPmOverdueMessage: string;
    notificationLowStock: string;
    notificationUpcomingPM: string;
    notificationDueToday: string;
    notificationRequestTitle: string;
    notificationRequestDesc: string;
    notificationEnable: string;

    // User Management
    userManageTitle: string;
    userTotalCount: string;
    userPendingCount: string;
    userTabAll: string;
    userTabPending: string;
    userRoleAdmin: string;
    userRoleSupervisor: string;
    userRoleTechnician: string;
    userRoleViewer: string;
    userStatusDeactivated: string;
    userActionApprove: string;
    userActionReject: string;
    userConfirmReject: string;
    userEditTitle: string;
    msgSuccess: string;
    navAdminDashboard: string;
    aiAnalyze: string;
    aiAnalyzing: string;
    aiSuggestionTitle: string;
    aiInsightTitle: string;
    aiApplySuggestion: string;
    aiReasoning: string;
    userApproveTitle: string;
    userLabelNickname: string;
    userLabelRole: string;
    userLabelDisplayName: string;
    userLabelDepartment: string;
    userRequestedAt: string;
    userNoPending: string;
    labelStartDate: string;
    labelEndDate: string;
    labelLocation: string;
    labelNormal: string;
    labelThreshold: string;
    adminDashboardTitle: string;
    adminDashboardSubtitle: string;
    adminStatTotalAccess: string;
    adminStatTotalAccessSub: string;
    adminStatDailyAvg: string;
    adminStatDailyAvgSub: string;
    adminStatTechnicians: string;
    adminStatTechniciansSub: string;
    adminStatAvgPerformance: string;
    adminStatAvgPerformanceSub: string;
    adminTabAnalytics: string;
    adminTabTechnicians: string;
    adminTabApprovals: string;
    adminTabAuditLog: string;
    adminTabSettings: string;
    adminTechniciansTitle: string;
    adminTechniciansLoading: string;
    adminTechnicalQuality: string;
    adminTechnicalRecords: string;
    adminActionEvaluate: string;
    adminUsageHistory: string;
    adminUsageSubtitle: string;
    adminUsageHits: string;
    adminUsageDailyActivity: string;
    adminUsageRecent: string;
    adminSystemHealth: string;
    adminDbResponse: string;
    adminStorageUsage: string;
    adminAuthSystem: string;
    adminStatusOnline: string;
    adminStatusNormal: string;
    adminQuickInsights: string;
    adminInsightPeak: string;
    adminInsightMobile: string;
    adminInsightStable: string;
    // Analytics Page
    analyticsSubtitle: string;
    analyticsMonthlyMaintenance: string;
    analyticsPartsByCategory: string;
    analyticsDowntimeHours: string;
    analyticsVibrationTrend: string;
    analyticsTemperatureTrend: string;
    analyticsMotorTemp: string;
    analyticsShouldCheck: string;
    analyticsTempRising: string;
    analyticsDowntimeTitle: string;
    analyticsEfficiencyTitle: string;
    analyticsEfficiencyROI: string;
    analyticsAdvancedCost: string;
    analyticsCostAnalysisDesc: string;
    analyticsAccumulatedCost: string;
    analyticsDowntimeLoss: string;
    analyticsAiInsight: string;
    analyticsEfficiencyOpt: string;
    analyticsDownloadSchedule: string;
    analyticsMonthlyReport: string;
    analyticsGenerateReport: string;
    analyticsGenerating: string;
    analyticsReportReady: string;
    analyticsReportDesc: string;
    analyticsPreventive: string;
    analyticsCorrective: string;
    analyticsOilChange: string;
    analyticsAxisX: string;
    analyticsAxisY: string;
    analyticsAxisZ: string;

    // Generic Actions/Labels
    language: string;
    actionSignOut: string;
    actionManageUsers: string;
    actionGoToDashboard: string;
    actionRegister: string;
    labelNoImage: string;
    labelEvidenceImage: string;
    placeholderChooseImage: string;
    actionRemoveImage: string;
    labelAll: string;
    predictiveMetricsNormal: string;
    userRegisterTitle: string;
    userRegisterSubtitle: string;
    userPendingApprovalTitle: string;
    userPendingApprovalDesc: string;
    msgWaitApproval: string;
    altUser: string;
    labelPartReplacement: string;
    maintenanceTitlePartChange: string;
    maintenanceTitleOverhaul: string;
    maintenanceTitlePartAndOverhaul: string;
    msgRequiredInfo: string;
    msgSelectMachine: string;
    msgSpecifyDetails: string;
    msgNoAccess: string;
    msgCheckRules: string;
    msgSavingData: string;
    msgMaintenanceDocHint: string;
    placeholderMaintenanceDetails: string;
    actionUploadPhoto: string;
    stockOtherGeneral: string;
    stockOptionalRecommended: string;
    actionPMSettings: string;
    pmConfigTitle: string;
    labelMaintenanceType: string;
    placeholderSelectMaintenanceType: string;
    labelOtherCustom: string;
    placeholderSpecifyMaintenanceName: string;
    labelChecklist: string;
    labelSelectPartTypeSuggestion: string;
    placeholderSelectPartType: string;
    labelSuggestedItems: string;
    placeholderAddSubItem: string;
    msgNoItems: string;
    labelTimeFormat: string;
    labelMonthly: string;
    labelWeekly: string;
    labelYearly?: string;
    labelEveryMonthly: string;
    labelEveryWeekly: string;
    labelEveryYearly?: string;
    labelFirstStartDate: string;
    labelWorkLocation: string;
    placeholderSelectLocation: string;
    placeholderSpecifyLocation: string;
    actionSavePlan: string;
    pmExecutionTitle: string;
    labelItemsCompleted: string;
    labelTechnician: string;
    placeholderSpecifyTechnician: string;
    placeholderChecklistValue: string;
    labelAdditionalNotes: string;
    labelMaintenanceDetails: string;
    placeholderAdditionalNotesHint: string;
    placeholderMaintenanceDetailsHint: string;
    labelEvidencePhoto: string;
    labelPhotoAmp: string;
    labelPhotoVibration: string;
    labelPhotoOther: string;
    actionTakePhoto: string;
    actionConfirmNextCycle: string;
    pmHistoryTitle: string;
    filterShow: string;
    filterHide: string;
    placeholderSearchHistory: string;
    filterAllLocations: string;
    filterAllMachines: string;
    filterAllTime: string;
    labelUrgentRepair: string;
    msgLoadingHistory: string;
    msgNoMatchingHistory: string;
    pmHistoryModalTitle: string;
    statPMCount: string;
    statOverhaulCount: string;

    // Period / Cycle
    labelPeriod: string;
    periodRoutine: string;
    period1Month: string;
    period3Months: string;
    period6Months: string;
    period1Year: string;
    msgNoHistoryForItem: string;
    labelWorkDetails: string;
    labelAuditChecklist: string;
    labelEvidencePhotoShort: string;
    actionCloseWindow: string;
    msgAddMachineSubtitle: string;
    labelNoAutoCycle: string;
    labelFirebaseStatus: string;
    statusConnected: string;
    statusOffline: string;
    labelProjectID: string;
    labelAuthDomain: string;
    labelAPIKey: string;
    labelModularSDK: string;
    statFoundHistoryPrefix: string;
    statFoundHistorySuffix: string;
    daySun: string;
    dayMon: string;
    dayTue: string;
    dayWed: string;
    dayThu: string;
    dayFri: string;
    daySat: string;
    textEveryMonths: string;
    msgAutoScheduleHint: string;
    msgEnterMachineName: string;
    actionConfirm: string;
    notificationAlerts: string;
    labelActionRequired: string;
    scannerTitle: string;
    scannerInitializing: string;
    scannerAccessDenied: string;
    scannerTryAgain: string;
    scannerInstructions: string;
    scannerScannedContent: string;
    labelViewFullscreen: string;
    altImage: string;
    statusCompleted: string;
    labelMin: string;
    analyticsPreventiveRate: string;
    analyticsTotalDowntime: string;
    analyticsCompletionRate: string;
    analyticsPartsTracked: string;
    labelHoursShort: string;
    placeholderDepartment: string;
    labelPreviousReplacementDate: string;
    labelPartLifespan: string;
    labelLifespanTracking: string;
    labelReading: string;
    labelExpectedLifespan: string;
    labelActualLifespan: string;
    labelSerialBatch: string;
    labelAnalysisContext: string;
    labelChangeFrequency: string;
    labelTimes: string;
    labelSize: string;
    labelTemp: string;
    labelIdleA: string;
    labelLoadA: string;
    labelVoltageL1L2L3: string;
    labelVibrationXYZ: string;
    labelAnalysisMode: string;
    placeholderAutoCalc: string;
    msgNotYetDue: string;
}

const th: TranslationKeys = {
    // Common
    loading: "กำลังโหลด...",
    actionLoadMore: "โหลดเพิ่มเติม",

    // App
    appTitle: "ระบบจัดการเครื่องจักร Art of Baking",
    appSubtitle: "PM TEAM REALTIME DATABASE",
    machineDetailsSubtitle: "รายละเอียดและอะไหล่ทั้งหมด",

    // Navigation
    navDashboard: "แดชบอร์ด",
    navMachines: "เครื่องจักร",
    navParts: "อะไหล่",
    navMaintenance: "ซ่อมบำรุง",
    navSchedule: "ตารางงาน",
    navAnalytics: "วิเคราะห์",
    navPredictive: "พยากรณ์",
    navAudit: "Audit",

    // Predictive Page
    predictiveSubtitle: "การพยากรณ์การซ่อมบำรุงด้วย AI",
    predictiveAnalyzing: "AI กำลังวิเคราะห์...",
    predictiveCriticalTitle: "การคาดการณ์วิกฤต",
    predictiveUpcomingTitle: "ปัญหาที่กำลังจะเกิดขึ้น",
    predictiveHealthTitle: "สุขภาพของระบบ",
    predictiveReliable: "เสถียรภาพ",
    predictiveRiskAnalysis: "การวิเคราะห์ความเสี่ยง",
    predictiveRealtimeLogic: "ข้อมูลเซนเซอร์ Real-time",
    predictiveProb: "ความน่าจะเป็น",
    predictivePredictedWithin: "คาดการณ์ภายใน",
    predictiveAvgTemp: "อุณหภูมิเฉลี่ย",
    predictiveAvgVib: "แรงสั่นสะเทือนเฉลี่ย",
    predictiveViewReports: "ดูรายงานเซนเซอร์",
    predictiveMachineCount: "{count} เครื่อง",
    predictiveAreaCount: "{count} จุด",
    predictiveWithinHours: "{hours} ชั่วโมง",
    predictiveWithinDays: "{days} วัน",
    temperature: "อุณหภูมิ",
    vibration: "แรงสั่นสะเทือน",

    // Mock Predictions
    predBearingFailure: "ลูกปืนมีโอกาสเสียหาย",
    predBeltTension: "แรงตึงสายพานลดลง",
    predOverheating: "มอเตอร์ร้อนเกินไป",

    statusHighRisk: "ความเสี่ยงสูง",
    statusMonitoring: "กำลังตรวจสอบ",
    statusHealthy: "ปกติ",
    statusOverdue: "เกินกำหนด",
    statusOnTime: "ตรงเวลา",

    // Audit Page
    auditSubtitle: "สรุปข้อมูลสำหรับการตรวจประเมิน (Audit Summary)",
    auditCompliance: "ความสอดคล้องของแผน PM",
    auditTraceability: "การตรวจสอบย้อนกลับ",
    auditCriticalStock: "อะไหล่สำรองที่สำคัญ",
    auditReliability: "ความเชื่อมั่นเครื่องจักร",
    auditPmCompletion: "อัตราการทำ PM สำเร็จ",
    auditOnTimeRate: "อัตราการทำตรงเวลา",
    auditActiveIssues: "ปัญหาที่ยังไม่แก้ไข",
    auditAvailability: "ความพร้อมใช้งาน",
    auditStatus: "สถานะการตรวจประเมิน",
    auditReady: "พร้อม / สอดคล้องตามเกณฑ์",
    auditTarget: "เป้าหมาย PM ประจำเดือน: {target}%",
    auditMeasured: "วัดผลเทียบกับวันที่ในแผนซ่อมบำรุง",
    auditMachinesMonitorized: "ติดตามเครื่องจักรแล้ว {count} เครื่อง",
    auditLowStock: "สต็อกต่ำ {count} รายการ",
    auditInRepair: "กำลังซ่อมแซม {count} เครื่อง",
    auditPartLocation: "ชื่ออะไหล่และสถานที่",
    auditQtyMin: "จำนวน / ขั้นต่ำ",
    auditStockNormal: "ระดับสต็อกปกติ",
    auditValidationActive: "ระบบตรวจสอบการตรวจประเมินอัตโนมัติทำงานอยู่",
    auditValidationDesc: "บันทึกการซ่อมบำรุงทั้งหมดจะถูกประทับเวลาและลงนามโดยช่างที่ได้รับมอบหมาย",

    // Stats
    statTotalParts: "จำนวนอะไหล่ทั้งหมด",
    statMachines: "จำนวนเครื่องจักร",
    statLocations: "จำนวน Zone",
    statMaintenanceRecords: "จำนวนซ่อมบำรุง/Overhaul",
    statStockNormal: "สต็อกปกติ",
    statStockLow: "สต็อกต่ำ (Low)",
    statTotalLocations: "Total Zones",

    // Actions
    actionAddPart: "เพิ่มอะไหล่",
    actionAddMachine: "เพิ่มเครื่องจักร",
    actionRecordMaintenance: "เปลี่ยนอะไหล่/Overhaul",
    actionMaintenanceHistory: "ประวัติอะไหล่/Overhaul",
    maintenancePageTitle: "ประวัติงานซ่อมบำรุง",
    actionExport: "ส่งออก",
    actionClearFilters: "ล้างตัวกรอง",
    actionSave: "บันทึก",
    actionCancel: "ยกเลิก",
    actionClose: "ปิด",
    actionEdit: "แก้ไข",
    actionDelete: "ลบ",
    actionRepair: "ซ่อมบำรุง/Overhaul",
    actionSearch: "ค้นหา",
    placeholderSearchMachine: "ค้นหาเครื่องจักร (ชื่อ/รหัส)",
    labelPartReplacement: "เปลี่ยนอะไหล่",
    maintenanceTitlePartChange: "บันทึกเปลี่ยนอะไหล่",
    maintenanceTitleOverhaul: "บันทึก Overhaul",
    maintenanceTitlePartAndOverhaul: "บันทึกเปลี่ยนอะไหล่และ Overhaul",
    actionSaveChanges: "บันทึกการเปลี่ยนแปลง",
    labelOther: "อื่นๆ (ระบุชื่อเอง)",
    placeholderOtherPartName: "กรุณาระบุชื่ออะไหล่...",
    labelUsagePeriod: "อายุการใช้งาน",
    unitYear: "ปี",
    unitMonth: "เดือน",
    unitDay: "วัน",
    placeholderMachineName: "-- เลือกเครื่องจักร --",

    // Filters
    filterTitle: "ค้นหาและกรองข้อมูล",
    filterMachine: "ชื่อเครื่องจักร",
    filterLocation: "Zone",
    filterPartName: "ชื่ออะไหล่",
    filterAll: "ทั้งหมด",
    filterShowResults: "แสดงผล:",
    filterOf: "จาก",
    filterRecords: "รายการ",
    machineCount: "{count} เครื่อง",
    msgNoMachines: "ไม่พบเครื่องจักร กรุณาเพิ่มข้อมูลอะไหล่เพื่อเริ่มใช้งาน",
    statusActive: "เปิดใช้งาน",
    statusInStock: "ปกติ",
    statusLowStock: "อะไหล่เหลือน้อย",
    labelClass: "คลาส",
    historyItem: "ประวัติรายการ",
    msgNoHistory: "ยังไม่มีประวัติการซ่อมบำรุง",
    scheduleDescription: "รายการแผนงานซ่อมบำรุงเชิงป้องกัน (PM)",
    actionManagePM: "จัดการแผน PM",
    msgOverdueAlert: "มีรายการที่ถึงกำหนดหรือเกินกำหนดซ่อมบำรุง!",
    msgActionRequired: "กรุณาดำเนินการและบันทึกผลการทำงาน",
    msgLoadingPlans: "กำลังโหลดแผนงาน...",
    labelDue: "กำหนด: {date}",
    labelEveryDay: "ทุกวัน{day}",
    labelOverdueBy: "เกินมา {days} วัน",
    labelToday: "วันนี้",
    labelInDays: "อีก {days} วัน",
    actionCloseWork: "ปิดงาน",
    msgNoPlans: "ไม่มีแผนงานซ่อมบำรุงในขณะนี้",
    modalSelectMachinePM: "เลือกเครื่องจักรสำหรับแผน PM",
    msgNoMachineLocation: "ไม่พบเครื่องจักรในสถานที่นี้",
    modalConfirmDeletePM: "ยืนยันการลบแผนงาน",
    modalAreYouSure: "คุณแน่ใจหรือไม่?",
    modalDeletePMConfirm: "คุณต้องการลบแผนงาน \"{name}\" ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้",
    statusOverdueLabel: "เกินกำหนด",
    statusTodayLabel: "วันนี้!",
    statusUpcomingLabel: "เร็วๆ นี้",
    statusOnTrackLabel: "ตามกำหนด",

    // Table Headers
    tableImage: "รูปภาพ",
    tableMachine: "เครื่องจักร",
    tablePartName: "ชื่ออะไหล่",
    tableModelSpec: "รุ่น/สเปค",
    tableBrand: "ยี่ห้อ",
    tableLocationArea: "Zone",
    tableStatus: "สถานะ",
    tableDate: "วันที่",
    tableActions: "จัดการ",
    tableQuantity: "จำนวน",
    tableLocation: "Zone",
    tableNotes: "หมายเหตุ",
    tableManagement: "การจัดการ",
    tableTitleParts: "รายการอะไหล่เครื่องจักร",
    tableSupplier: "ผู้จัดจำหน่าย",
    tablePrice: "ราคาต่อหน่วย",

    // Add Part Modal
    addPartTitle: "เพิ่มชื่ออะไหล่เครื่องจักร",
    addPartMachine: "เครื่องจักร",
    addPartName: "ชื่ออะไหล่",
    addPartSelectPart: "เลือกชื่ออะไหล่",
    addPartNewPart: "+ เพิ่มชื่ออะไหล่ใหม่",
    addPartModelSpec: "รุ่น/สเปค",
    addPartLocationArea: "Zone",
    addPartBrand: "ยี่ห้อ",
    addPartQuantity: "จำนวน",
    addPartUnit: "หน่วยนับ",
    addPartLocation: "สถานที่ (Location)",
    addPartImage: "รูปภาพอะไหล่",
    addPartChooseFile: "เลือกไฟล์/ถ่ายรูป",
    addPartNoFile: "ยังไม่ได้เลือกไฟล์",
    addPartImageHint: "รองรับไฟล์ JPG, PNG, GIF (ไม่เกิน 5MB)",
    labelParentPart: "อะไหล่หลัก (ถ้ามี)",
    labelCustomCategory: "หมวดหมู่เพิ่มเติม (Custom Category)",
    placeholderCustomCategory: "ระบุหมวดหมู่ เช่น สายไฟ, ท่อลม...",
    labelSubParts: "อะไหล่ย่อยภายใต้ชิ้นนี้",
    labelNoSubParts: "ไม่มีอะไหล่าย่อย",
    addPartCategory: "หมวดหมู่",
    addPartSelectCategory: "เลือกหมวดหมู่",
    addPartSelectMachine: "เลือกเครื่องจักร",
    addPartNotes: "หมายเหตุ",
    optionOther: "อื่นๆ (ระบุ)",

    // Machine Settings Labels
    labelFileSize: "ขนาดไฟล์",
    labelMachineName: "ชื่อเครื่องจักร",
    labelMachineCode: "รหัสเครื่องจักร",
    labelMachineSettings: "ตั้งค่าเครื่องจักร",
    labelBrand: "ยี่ห้อ",
    labelModel: "รุ่น",
    labelBrandModel: "ยี่ห้อและรุ่น",
    labelSerialNumber: "หมายเลขซีเรียล",
    labelInstallationDate: "วันที่ติดตั้ง",
    labelOperatingHours: "ชั่วโมงการทำงาน",
    labelCapacity: "กำลังการผลิต",
    labelPowerRating: "กำลังไฟฟ้า",
    labelPerformance: "ประสิทธิภาพ (Capacity/kW)",
    labelMaintenanceCycle: "รอบการเปลี่ยนตามแผน (ระบุข้อมูล เดือน,ปี)",
    labelHours: "ชั่วโมง",
    labelPower: "ไฟฟ้า",
    labelInstall: "ติดตั้ง",
    labelMonths: "เดือน",
    labelYears: "ปี",
    labelDescription: "คำอธิบายเพิ่มเติม",
    labelRemark: "หมายเหตุ (Class)",

    // Maintenance Record Modal
    maintenanceTitle: "บันทึกเปลี่ยนอะไหล่และ Overhaul",
    maintenanceGeneralInfo: "ข้อมูลทั่วไป",
    maintenanceMachine: "เครื่องจักร",
    maintenanceSelectMachine: "เลือกเครื่องจักร",
    maintenanceDescription: "รายการซ่อมบำรุง",
    maintenanceType: "ประเภทการซ่อมบำรุง",
    maintenanceSelectType: "เลือกประเภท",
    maintenancePriority: "ระดับความสำคัญ",
    maintenancePriorityNormal: "ปกติ",
    maintenancePriorityHigh: "สูง",
    maintenancePriorityUrgent: "เร่งด่วน",

    maintenanceOperationInfo: "ข้อมูลการดำเนินการ",
    maintenanceDate: "วันที่ซ่อมบำรุง",
    maintenanceDuration: "ระยะเวลาซ่อม (วัน)",
    maintenanceTechnician: "ช่างผู้รับผิดชอบ",
    maintenanceStatus: "สถานะ",
    maintenanceStatusPending: "รอดำเนินการ",
    maintenanceStatusInProgress: "กำลังดำเนินการ",
    maintenanceStatusCompleted: "เสร็จสิ้น",

    maintenanceMotorGearInfo: "ข้อมูลมอเตอร์และเกียร์",
    maintenanceMotorSize: "ขนาดมอเตอร์",
    maintenanceMotorSizeHint: "(บันทึกครั้งแรกเท่านั้น)",
    maintenanceVibration: "ค่าแรงสั่นสะเทือน",
    maintenanceAxisX: "แกน X",
    maintenanceAxisY: "แกน Y",
    maintenanceAxisZ: "แกน Z",
    maintenanceVibrationValue: "ค่าที่วัดได้ (mm/s)",
    maintenanceVibrationNormal: "ค่าปกติ",
    maintenanceVibrationMedium: "ค่าปานกลาง",
    maintenanceVibrationAbnormal: "ค่าผิดปกติ",

    maintenanceVoltage: "แรงดันไฟฟ้า (3 เฟส)",
    maintenanceSelectVoltage: "เลือกแรงดัน",
    maintenanceCurrent: "กระแสที่วัดได้ (A)",
    maintenanceCurrentIdle: "ขณะรันตัวเปล่า (A)",
    maintenanceCurrentLoad: "ขณะมีโหลด 100% (A)",
    maintenanceTemperature: "ค่าความร้อนที่วัดได้ (°C)",
    maintenanceTemperatureHint: "(สำหรับวิเคราะห์อายุการใช้งาน)",

    // Shaft/Dial Gauge (New)
    maintenanceShaftInfo: "ข้อมูลเพลาและไดอัลเกจ",
    maintenanceShaftBend: "ค่าเพลา (คด/งอ)",
    maintenanceShaftBendValue: "ค่าที่วัดได้",
    maintenanceDialGauge: "ค่าไดอัลเกจ",
    maintenanceDialGaugeValue: "ค่าที่วัดได้",

    maintenanceDetailsNotes: "รายละเอียดและหมายเหตุ",
    maintenanceDetailDescription: "รายละเอียดการซ่อมบำรุง",
    maintenanceAdditionalNotes: "หมายเหตุเพิ่มเติม",
    maintenanceSaveRecord: "บันทึกผลการเปลี่ยนอะไหล่",
    maintenanceHistoryTitle: "ประวัติการบำรุงรักษาเชิงป้องกัน (PM)",

    maintenanceMachineHours: "ชั่วโมงการทำงานของเครื่องจักร",
    maintenanceChangeReason: "เหตุผลที่เปลี่ยน",
    maintenancePartCondition: "สภาพอะไหล่เดิม",
    maintenanceReasonWorn: "สึกหรอตามช่วงเวลาปกติ",
    maintenanceReasonFailed: "เสียกะทันหัน",
    maintenanceReasonPlanned: "เปลี่ยนตามแผน",
    maintenanceReasonImprovement: "เปลี่ยนเพื่อปรับปรุงระบบ",
    maintenanceConditionGood: "ยังสามารถใช้งานได้",
    maintenanceConditionFair: "เริ่มสึกหรอ",
    maintenanceConditionPoor: "สึกหรอมาก",
    maintenanceConditionBroken: "แตกหัก/เสียหาย",
    maintenanceAdvancedTracking: "ข้อมูลการติดตามขั้นสูง (เพื่อการวิเคราะห์)",
    maintenanceOldPartStatus: "สถานะอะไหล่เดิม",

    // Maintenance Types
    typePreventive: "บำรุงรักษาเชิงป้องกัน",
    typeCorrective: "ซ่อมแก้ไข",
    typeOilChange: "เปลี่ยนถ่ายน้ำมัน",
    typePartReplacement: "เปลี่ยนอะไหล่",
    typeInspection: "ตรวจสอบ",

    // Categories
    categoryMotor: "มอเตอร์",
    categoryGear: "เกียร์",
    categoryBelt: "สายพาน",
    categoryBearing: "ลูกปืน/Bearing",
    categoryPump: "ปั๊ม",
    categoryValve: "วาล์ว",
    categoryElectrical: "ไฟฟ้า",
    categoryOil: "น้ำมัน/จารบี",
    categoryPneumatic: "ลม (Pneumatic)",
    categoryTool: "เครื่องมือ",
    categoryOther: "อื่นๆ",

    // Locations
    locationTop: "Top",
    locationBottom: "Bottom",
    locationLeft: "Left",
    locationRight: "Right",
    locationFront: "Front",
    locationBack: "Back",
    locationInside: "Inside",

    // Status Messages
    msgLoading: "กำลังโหลด...",
    msgNoData: "ไม่พบข้อมูล",
    msgSaveSuccess: "บันทึกข้อมูลสำเร็จ",
    msgSaveError: "เกิดข้อผิดพลาดในการบันทึก",
    msgConfirmDelete: "คุณแน่ใจหรือไม่ว่าต้องการลบ?",
    msgSuccess: "ดำเนินการสำเร็จ",
    userEditTitle: "แก้ไขข้อมูลผู้ใช้งาน",
    navAdminDashboard: "แดชบอร์ดผู้ดูแลระบบ",
    aiAnalyze: "วิเคราะห์ด้วย AI",
    aiAnalyzing: "AI กำลังวิเคราะห์...",
    aiSuggestionTitle: "ข้อแนะนำจาก AI",
    aiInsightTitle: "ข้อมูลเจาะลึกจาก AI",
    aiApplySuggestion: "ใช้การตั้งค่านี้",
    aiReasoning: "เหตุผลประกอบการประเมิน",
    msgSaving: "กำลังบันทึก...",
    msgDeleteSuccess: "ลบข้อมูลสำเร็จ",
    msgDeleteError: "เกิดข้อผิดพลาดในการลบ",
    titleConfirmDelete: "ยืนยันการลบ",
    msgCurrentImagePreserved: "ใช้รูปภาพเดิมที่มีอยู่",
    msgDbConnected: "เชื่อมต่อสำเร็จ!",
    msgDbReady: "ระบบฐานข้อมูลพร้อมใช้งานแล้ว",
    msgDbConnectError: "การเชื่อมต่อล้มเหลว!",
    msgDbErrorDetail: "ไม่สามารถเข้าถึงฐานข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อ",
    msgAddPartSuccess: "เพิ่มอะไหล่สำเร็จ!",
    msgEditPartSuccess: "แก้ไขอะไหล่สำเร็จ!",
    msgAddPartDetail: "เพิ่ม \"{name}\" เรียบร้อยแล้ว",
    msgEditPartDetail: "แก้ไข \"{name}\" เรียบร้อยแล้ว",
    msgNoPermission: "ไม่มีสิทธิ์เข้าถึง",
    msgNoPermissionDetail: "กรุณาตรวจสอบ Firestore security rules",
    msgTimeout: "หมดเวลาเชื่อมต่อ",
    msgTimeoutDetail: "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและ Firebase config",
    msgError: "เกิดข้อผิดพลาด",
    validateInput: "กรุณากรอกข้อมูล",
    validateSelectMachine: "กรุณาระบุชื่อเครื่องจักร",
    validateSelectPart: "กรุณาเลือกชื่ออะไหล่",
    msgNoParts: "ไม่พบรายการอะไหล่สำหรับเครื่องจักรนี้",
    msgNoEditPermission: "คุณไม่มีสิทธ์แก้ไข",
    msgPleaseLogin: "กรุณาล็อกอิน",
    stockWithdrawSuccess: "เบิกของสำเร็จ",
    stockReceiveSuccess: "รับของเข้าสำเร็จ",
    stockWithdrawError: "ไม่สามารถเบิกของได้",
    stockReceiveError: "ไม่สามารถรับของเข้าได้",

    // Additional Actions/Labels
    actionMaintenance: "ซ่อมบำรุง/Overhaul",
    statusReadOnly: "อ่านอย่างเดียว",
    labelMachinePart: "ข้อมูลเครื่องจักรและอะไหล่",
    editPartTitle: "แก้ไขข้อมูลอะไหล่",
    confirmDeleteTitle: "ยืนยันการลบ",
    confirmDeleteMessage: "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?",
    confirmDeleteMessageDetail: "การลบรายการ: {name} จะไม่สามารถย้อนกลับได้",

    // Placeholders
    placeholderMachine: "เช่น Pie Line",
    placeholderLocationLong: "เช่น Cross Roller",
    placeholderBrand: "เช่น SEW / NORD",
    placeholderLocation: "เช่น FZ",
    placeholderNotes: "เช่น มอเตอร์กับ CrossRoller สายพาน Timing [2] เปลี่ยนมีตที่รันชาร์ 220 0.29I",
    placeholderTechnician: "ชื่อช่างผู้ดำเนินการ",
    placeholderDuration: "เช่น 1",
    placeholderTemperature: "เช่น 65.5",
    placeholderCurrentIdle: "เช่น 1.05",
    placeholderCurrentLoad: "เช่น 2.50",
    placeholderVibration: "ค่าที่วัดได้ (mm/s)",
    placeholderDescription: "ระบุรายการที่ต้องซ่อมบำรุง",
    placeholderAdditionalNotes: "ข้อสังเกต คำแนะนำ หรือข้อมูลเพิ่มเติม",
    placeholderModelSpec: "เช่น SK71S/4 TF 0.37kw 105A • SK0721 XF-71 L/4 TF",
    placeholderMotorSize: "เช่น 0.37 kW, 1.5 HP",
    placeholderShaftBend: "เช่น 0.02 mm",
    placeholderDialGauge: "เช่น 0.05 mm",
    placeholderPartName: "เช่น ลูกปืน 6200, น้ำมัน CLP 220",

    // Spare Parts Dashboard
    partsInventoryTitle: "คลังอะไหล่ (Spare Parts)",
    partsItemsCount: "{count} รายการ",
    partsCategoriesCount: "{count} หมวดหมู่",
    partsLowStockAlert: "รายการอะไหล่เหลือน้อย ({count})",
    partsLowStockDesc: "รายการต่อไปนี้มีจำนวนคงเหลือน้อยกว่ากำหนด กรุณาเติมสต็อก (Restock Needed)",
    partsNoSpec: "ไม่มีรายละเอียดสเปค",
    partsInStock: "คงเหลือ",
    partsWithdraw: "เบิกของออก",
    partsReceive: "รับของเข้า",
    partsHistory: "ประวัติรายการ",
    partsNoParts: "ไม่พบรายการอะไหล่",
    partsNoPartsDesc: "เริ่มเพิ่มอะไหล่ที่ใช้บ่อย เช่น ลูกปืน น้ำมัน หรือสายพาน เพื่อติดตามสต็อก",
    partsAddFirst: "เพิ่มชิ้นแรก",
    partsLoginToManage: "เข้าสู่ระบบเพื่อจัดการ",

    // Stock Actions
    stockWithdrawTitle: "เบิกของออก (Withdraw)",
    stockReceiveTitle: "รับของเข้า (Receive Stock)",
    stockQuantity: "จำนวน",
    stockMachine: "ใช้กับเครื่องจักร",
    stockLocation: "ระบุตำแหน่ง (Location)",
    stockNotes: "หมายเหตุ (Notes)",
    stockEvidence: "รูปหลังเปลี่ยน (Proof of Change)",
    stockEvidenceHint: "ถ่ายรูปงานที่เปลี่ยนเสร็จแล้วเพื่อเป็นหลักฐาน",
    stockSupplier: "ผู้จัดจำหน่าย (Supplier)",
    stockPrice: "ราคาต่อหน่วย (Unit Price)",
    stockRefDoc: "เอกสารอ้างอิง (Ref. Doc)",
    stockConfirmWithdraw: "ยืนยันการเบิก",
    stockConfirmReceive: "ยืนยันการรับเข้า",

    // Stock History
    historyTitle: "ประวัติการทำรายการ",
    historyNoData: "ไม่พบประวัติการทำรายการ",
    historyPerformedBy: "ดำเนินการโดย",
    historyPerformedAt: "เมื่อเวลา",
    historyClose: "ปิดประวัติ",

    // Schedule & Calendar
    scheduleCalendarView: "มุมมองปฏิทิน",
    scheduleListView: "มุมมองรายการ",
    calendarToday: "วันนี้",
    calendarMon: "จ.",
    calendarTue: "อ.",
    calendarWed: "พ.",
    calendarThu: "พฤ.",
    calendarFri: "ศ.",
    calendarSat: "ส.",
    calendarSun: "อา.",
    calendarNoTasks: "ไม่มีรายการซ่อมบำรุง",

    // Notifications
    notificationTitle: "การแจ้งเตือน",
    notificationEmpty: "ไม่มีการแจ้งเตือนใหม่",
    notificationLowStockMessage: "{part} เหลือเพียง {qty} {unit}",
    notificationPmUpcomingTitle: "แผนซ่อมบำรุงที่กำลังจะมาถึง",
    notificationPmUpcomingMessage: "{machine} มีกำหนดซ่อมในอีก {days} วัน",
    notificationPmTodayTitle: "ถึงกำหนดซ่อมบำรุงวันนี้",
    notificationPmTodayMessage: "{machine} มีกำหนดซ่อมบำรุงวันนี้",
    notificationPmOverdueTitle: "แผนซ่อมบำรุงเกินกำหนด",
    notificationPmOverdueMessage: "{machine} เกินกำหนดซ่อมตั้งแต่วันที่ {date}",
    notificationLowStock: "อะไหล่เหลือน้อย: {name}",
    notificationUpcomingPM: "ซ่อมบำรุงใน {days} วัน: {name}",
    notificationDueToday: "ถึงกำหนดซ่อมวันนี้: {name}",
    notificationRequestTitle: "เปิดการแจ้งเตือน",
    notificationRequestDesc: "รับการแจ้งเตือนทันเมื่อมีอะไหล่ใกล้หมดหรือถึงกำหนดซ่อมบำรุง",
    notificationEnable: "เปิดใช้งาน",

    // User Management
    userManageTitle: "จัดการผู้ใช้งาน",
    userTotalCount: "{count} ผู้ใช้",
    userPendingCount: "{count} รออนุมัติ",
    userTabAll: "ผู้ใช้ทั้งหมด",
    userTabPending: "รออนุมัติ",
    userRoleAdmin: "ผู้ดูแลระบบ",
    userRoleSupervisor: "หัวหน้าช่าง",
    userRoleTechnician: "ช่างซ่อมบำรุง",
    userRoleViewer: "ผู้ดูอย่างเดียว",
    userStatusDeactivated: "ปิดใช้งาน",
    userActionApprove: "อนุมัติ",
    userActionReject: "ปฏิเสธ",
    userConfirmReject: "ต้องการปฏิเสธผู้ใช้นี้?",
    userApproveTitle: "อนุมัติผู้ใช้",
    userLabelNickname: "ชื่อเล่น",
    userLabelRole: "บทบาท",
    userLabelDisplayName: "ชื่อที่แสดง",
    userLabelDepartment: "แผนก",
    userRequestedAt: "ลงทะเบียนเมื่อ",
    userNoPending: "ไม่มีผู้ใช้รออนุมัติ",
    labelLocation: "สถานที่",
    labelNormal: "ปกติ",
    labelThreshold: "ค่าเกณฑ์",
    adminDashboardTitle: "แผงควบคุมผู้ดูแลระบบ",
    adminDashboardSubtitle: "การจัดการระบบขั้นสูงและการวิเคราะห์",
    adminStatTotalAccess: "การเข้าใช้งานทั้งหมด",
    adminStatTotalAccessSub: "จำนวนการเข้าสู่ระบบทั้งหมด",
    adminStatDailyAvg: "ค่าเฉลี่ยรายวัน",
    adminStatDailyAvgSub: "การเข้าสู่ระบบต่อวัน",
    adminStatTechnicians: "ช่างเทคนิค",
    adminStatTechniciansSub: "สมาชิกในทีมที่ใช้งานอยู่",
    adminStatAvgPerformance: "ประสิทธิภาพเฉลี่ย",
    adminStatAvgPerformanceSub: "คะแนนคุณภาพของทีม",
    adminTabAnalytics: "การวิเคราะห์",
    adminTabTechnicians: "ช่างเทคนิค",
    adminTabApprovals: "การอนุมัติผู้ใช้",
    adminTabAuditLog: "บันทึกกิจกรรม",
    adminTabSettings: "ตั้งค่าระบบ",
    adminTechniciansTitle: "ช่างเทคนิคของเรา",
    adminTechniciansLoading: "กำลังโหลดข้อมูลช่างเทคนิค...",
    adminTechnicalQuality: "คะแนนประสิทธิภาพ",
    adminTechnicalRecords: "รายการ",
    adminActionEvaluate: "ประเมินผล",
    adminUsageHistory: "ประวัติการใช้งาน",
    adminUsageSubtitle: "การเข้าถึงแอปพลิเคชันในช่วง 30 วันที่ผ่านมา",
    adminUsageHits: "การเข้าชม",
    adminUsageDailyActivity: "กิจกรรมรายวัน (ครั้ง/วัน)",
    adminUsageRecent: "ล่าสุด",
    adminSystemHealth: "สถานะของระบบ",
    adminDbResponse: "การตอบสนองของฐานข้อมูล",
    adminStorageUsage: "การใช้งานหน่วยความจำ",
    adminAuthSystem: "ระบบการยืนยันตัวตน",
    adminStatusOnline: "ออนไลน์",
    adminStatusNormal: "ปกติ",
    adminQuickInsights: "ข้อมูลสรุปอย่างรวดเร็ว",
    adminInsightPeak: "การใช้งานสูงสุดมักเกิดขึ้นในเช้าวันจันทร์",
    adminInsightMobile: "มีการเข้าใช้งานผ่านมือถือเพิ่มขึ้น 15% ในสัปดาห์ที่ผ่านมา",
    adminInsightStable: "ความเสถียรของระบบอยู่ที่ 100% ตั้งแต่การอัปเดตครั้งล่าสุด",
    // Analytics Page
    analyticsSubtitle: "วิเคราะห์ข้อมูลการซ่อมบำรุง",
    analyticsMonthlyMaintenance: "การซ่อมบำรุงรายเดือน",
    analyticsPartsByCategory: "อะไหล่ตามหมวดหมู่",
    analyticsDowntimeHours: "เวลาหยุดเครื่อง (ชม.)",
    analyticsVibrationTrend: "แนวโน้มค่าแรงสั่นสะเทือน (mm/s)",
    analyticsTemperatureTrend: "แนวโน้มอุณหภูมิมอเตอร์ (°C)",
    analyticsMotorTemp: "อุณหภูมิมอเตอร์",
    analyticsShouldCheck: "ควรตรวจสอบ",
    analyticsTempRising: "อุณหภูมิมีแนวโน้มสูงขึ้น - แนะนำให้ตรวจสอบระบบระบายความร้อน",
    analyticsDowntimeTitle: "ความสูญเสียจาก Downtime",
    analyticsEfficiencyTitle: "ประสิทธิภาพการทำงาน",
    analyticsEfficiencyROI: "ROI จากการทำ PM",
    analyticsAdvancedCost: "Advanced Cost Analysis (Phase 4)",
    analyticsCostAnalysisDesc: "การวิเคราะห์ต้นทุนอะไหล่เทียบกับเวลาหยุดเครื่อง",
    analyticsAccumulatedCost: "ค่าอะไหล่สะสม (เดือนนี้)",
    analyticsDowntimeLoss: "ความสูญเสียจาก Downtime",
    analyticsAiInsight: "AI Insight",
    analyticsEfficiencyOpt: "Efficiency Optimization",
    analyticsDownloadSchedule: "ตารางงาน (PDF)",
    analyticsMonthlyReport: "Monthly Report",
    analyticsGenerateReport: "สร้างรายงาน",
    analyticsGenerating: "กำลังสร้าง...",
    analyticsReportReady: "สร้างรายงานสำเร็จ",
    analyticsReportDesc: "รายงานประจำเดือนมกราคม 2026 พร้อมให้ดาวน์โหลดแล้ว",
    analyticsPreventive: "เชิงป้องกัน",
    analyticsCorrective: "แก้ไข",
    analyticsOilChange: "ถ่ายน้ำมัน",
    analyticsAxisX: "แกน X",
    analyticsAxisY: "แกน Y",
    analyticsAxisZ: "แกน Z",

    // Generic Actions/Labels
    language: "th",
    actionSignOut: "ออกจากระบบ",
    actionManageUsers: "จัดการผู้ใช้งาน",
    actionGoToDashboard: "กลับหน้าหลัก",
    actionRegister: "ส่งข้อมูลสมัครสมาชิก",
    labelNoImage: "ไม่มีรูปภาพ",
    labelEvidenceImage: "รูปภาพหลักฐาน",
    placeholderChooseImage: "เลือกรูปภาพ",
    actionRemoveImage: "ลบรูปภาพ",
    labelAll: "ทั้งหมด",
    predictiveMetricsNormal: "ปกติ",
    userRegisterTitle: "สมัครสมาชิก",
    userRegisterSubtitle: "ขอสิทธิ์เข้าใช้งานระบบจัดการอะไหล่",
    userPendingApprovalTitle: "บัญชีของคุณรอการอนุมัติ",
    userPendingApprovalDesc: "กรุณารอผู้ดูแลระบบตรวจสอบและอนุมัติการเข้าใช้งานของคุณ",
    msgWaitApproval: "รอการตรวจสอบสิทธิ์การใช้งาน",
    altUser: "ผู้ใช้งาน",
    msgRequiredInfo: "กรุณากรอกข้อมูล",
    msgSelectMachine: "กรุณาเลือกเครื่องจักร",
    msgSpecifyDetails: "กรุณาระบุรายละเอียดงานซ่อมบำรุง",
    msgNoAccess: "ไม่มีสิทธิ์เข้าถึง",
    msgCheckRules: "กรุณาตรวจสอบ Firestore security rules",
    msgSavingData: "กำลังบันทึกข้อมูล...",
    msgMaintenanceDocHint: "ข้อมูลจะถูกบันทึกเพื่อเปรียบเทียบและวิเคราะห์แนวโน้มในอนาคต",
    placeholderMaintenanceDetails: "อธิบายรายละเอียดการซ่อมบำรุง ปัญหาที่พบ และวิธีการแก้ไข",
    actionUploadPhoto: "อัปโหลดรูปภาพ",
    stockOtherGeneral: "อื่นๆ / ทั่วไป",
    stockOptionalRecommended: "(ไม่บังคับแต่แนะนำ)",
    actionPMSettings: "ตั้งค่า PM อัตโนมัติ",
    pmConfigTitle: "ตั้งค่าแผนซ่อมบำรุงเชิงป้องกัน (PM)",
    labelMaintenanceType: "การซ่อมบำรุง/Overhaul",
    placeholderSelectMaintenanceType: "-- เลือกประเภทการซ่อมบำรุง --",
    labelOtherCustom: "อื่นๆ (ระบุเอง)",
    placeholderSpecifyMaintenanceName: "ระบุชื่อการซ่อมบำรุง...",
    labelChecklist: "รายการที่ต้องทำ (Checklist)",
    labelSelectPartTypeSuggestion: "เลือกประเภทอะไหล่เพื่อดูรายการแนะนำ:",
    placeholderSelectPartType: "-- เลือกประเภทอะไหล่ --",
    labelSuggestedItems: "รายการแนะนำ (คลิกเพื่อเพิ่ม):",
    placeholderAddSubItem: "เพิ่มรายการย่อย...",
    msgNoItems: "- ยังไม่มีรายการ -",
    labelTimeFormat: "รูปแบบเวลา",
    labelMonthly: "รายเดือน",
    labelWeekly: "รายสัปดาห์",
    labelYearly: "รายปี",
    labelEveryMonthly: "รอบทุกๆ (เดือน)",
    labelEveryWeekly: "ทำทุกวัน",
    labelEveryYearly: "ทำทุกปี",
    labelFirstStartDate: "วันที่เริ่มรอบแรก",
    labelWorkLocation: "สถานที่ปฏิบัติงาน",
    placeholderSelectLocation: "-- เลือกตำแหน่ง/สถานที่ --",
    placeholderSpecifyLocation: "ระบุสถานที่...",
    actionSavePlan: "บันทึกแผนงาน",
    pmExecutionTitle: "บันทึกผลการซ่อมบำรุง (PM)",
    labelItemsCompleted: "รายการเสร็จ",
    labelTechnician: "ผู้ปฏิบัติงาน",
    placeholderSpecifyTechnician: "ระบุชื่อผู้ทำ",
    placeholderChecklistValue: "ใส่ค่า/รายละเอียด (เช่น 2.5A, ปกติ, เปลี่ยนแล้ว)",
    labelAdditionalNotes: "หมายเหตุเพิ่มเติม",
    labelMaintenanceDetails: "รายละเอียดการซ่อมบำรุง",
    placeholderAdditionalNotesHint: "หมายเหตุเพิ่มเติม (ถ้ามี)...",
    placeholderMaintenanceDetailsHint: "ระบุสิ่งที่ทำ เช่น ทำความสะอาด, เปลี่ยนอะไหล่ชิ้นไหน...",
    labelEvidencePhoto: "รูปถ่ายหลักฐาน",
    labelPhotoAmp: "ภาพถ่ายกระแสไฟฟ้า (Amp)",
    labelPhotoVibration: "ภาพถ่ายค่าความสั่นสะเทือน",
    labelPhotoOther: "จุดที่สำคัญอื่นๆ",
    actionTakePhoto: "ถ่ายภาพ",
    actionConfirmNextCycle: "ยืนยันและรันรอบถัดไป",
    pmHistoryTitle: "ประวัติการเปลี่ยนอะไหล่/Overhaul",
    filterShow: "แสดงตัวกรอง",
    filterHide: "ซ่อนตัวกรอง",
    placeholderSearchHistory: "ค้นหาช่าง, รายละเอียด...",
    filterAllLocations: "ทุกสถานที่",
    filterAllMachines: "ทุกเครื่องจักร",
    filterAllTime: "ทุกช่วงเวลา",
    labelUrgentRepair: "ซ่อมเร่งด่วน",
    msgLoadingHistory: "กำลังโหลดประวัติ...",
    msgNoMatchingHistory: "ไม่พบข้อมูลประวัติที่ตรงกับเงื่อนไข",
    pmHistoryModalTitle: "ประวัติการซ่อมบำรุงเชิงป้องกัน (PM)",
    statPMCount: "จำนวนงานซ่อมบำรุง (PM)",
    statOverhaulCount: "เปลี่ยนอะไหล่/Overhaul",
    msgNoHistoryForItem: "ยังไม่มีประวัติการซ่อมบำรุงสำหรับรายการนี้",
    labelWorkDetails: "รายละเอียดการทำงาน",
    labelAuditChecklist: "รายการตรวจเช็ค (Audit Checklist)",
    labelEvidencePhotoShort: "รูปถ่ายหลักฐาน",
    actionCloseWindow: "ปิดหน้าต่าง",
    msgAddMachineSubtitle: "กรอกข้อมูลเครื่องจักรใหม่",
    labelNoAutoCycle: "ไม่ใช้การตั้งรอบอัตโนมัติ",
    labelFirebaseStatus: "สถานะ Firebase",
    statusConnected: "เชื่อมต่อแล้ว",
    statusOffline: "ออฟไลน์",
    labelProjectID: "รหัสโปรเจกต์ (Project ID)",
    labelAuthDomain: "โดเมนรับรองสิทธิ์ (Auth Domain)",
    labelAPIKey: "รหัส API (API Key)",
    labelModularSDK: "v9.0.0 (Modular SDK)",
    statFoundHistoryPrefix: "พบประวัติทั้งหมด",
    statFoundHistorySuffix: "รายการ",
    daySun: "อา",
    dayMon: "จ",
    dayTue: "อ",
    dayWed: "พ",
    dayThu: "พฤ",
    dayFri: "ศ",
    daySat: "ส",
    textEveryMonths: "รอบทุก {count} เดือน",
    msgAutoScheduleHint: "ตารางเวลาจะถูกสร้างขึ้นอัตโนมัติเมื่อกดบันทึก",
    msgEnterMachineName: "กรุณาระบุชื่อเครื่องจักร",
    actionConfirm: "ยืนยัน",
    notificationAlerts: "การแจ้งเตือน",
    labelActionRequired: "ต้องดำเนินการ",
    scannerTitle: "เครื่องสแกน QR",
    scannerInitializing: "กำลังเริ่มต้นกล้อง...",
    scannerAccessDenied: "การเข้าถึงกล้องถูกปฏิเสธ",
    scannerTryAgain: "ลองอีกครั้งในภายหลัง",
    scannerInstructions: "หันกล้องไปที่รหัส QR ของเครื่องจักรหรืออะไหล่เพื่อดูรายละเอียดโดยอัตโนมัติ",
    scannerScannedContent: "เนื้อหาที่สแกน",
    labelViewFullscreen: "ดูภาพเต็มจอ",
    altImage: "รูปภาพ",
    statusCompleted: "เสร็จสิ้น",
    labelMin: "ขั้นต่ำ",
    analyticsPreventiveRate: "อัตราการซ่อมเชิงป้องกัน",
    analyticsTotalDowntime: "เวลารวมที่หยุดเครื่อง",
    analyticsCompletionRate: "อัตราการทำสำเร็จ",
    analyticsPartsTracked: "จำนวนอะไหล่ที่ติดตาม",
    labelHoursShort: "ชม.",
    placeholderDepartment: "เช่น Maintenance",
    labelStartDate: "วันที่เริ่ม",
    labelEndDate: "วันที่เสร็จ",
    labelPreviousReplacementDate: "วันที่เปลี่ยนครั้งก่อน",
    labelPartLifespan: "อายุการใช้งาน (วัน)",
    labelLifespanTracking: "การติดตามอายุการใช้งาน",
    labelReading: "เลขไมล์/ชั่วโมงการทำงาน (Reading)",
    labelExpectedLifespan: "อายุใช้งานที่คาดหมาย",
    labelActualLifespan: "อายุใช้งานจริง",
    labelSerialBatch: "หมายเลขซีเรียล/ล็อต",
    labelAnalysisContext: "ข้อมูลวิเคราะห์เพิ่มเติม",
    labelChangeFrequency: "ความถี่ในการเปลี่ยน",
    labelTimes: "ครั้ง",
    labelSize: "ขนาด (Size)",
    labelTemp: "อุณหภูมิ (Temp)",
    labelIdleA: "กระแสขณะตัวเปล่า (Idle A)",
    labelLoadA: "กระแสขณะมีโหลด (Load A)",
    labelVoltageL1L2L3: "แรงดันไฟฟ้า (L1/L2/L3)",
    labelVibrationXYZ: "ความสั่นสะเทือน (X/Y/Z)",
    labelAnalysisMode: "โหมดวิเคราะห์รายละเอียด",
    placeholderAutoCalc: "คำนวณอัตโนมัติ",

    // Period / Cycle
    labelPeriod: "รอบการบำรุงรักษา",
    periodRoutine: "ประจำวัน/สัปดาห์ (Routine)",
    period1Month: "1 เดือน",
    period3Months: "3 เดือน",
    period6Months: "6 เดือน",
    period1Year: "1 ปี",
    msgNotYetDue: "ยังไม่ถึงกำหนดเวลา",
};

const en: TranslationKeys = {
    // Common
    loading: "Loading...",
    actionLoadMore: "Load More",

    // App
    appTitle: "Machine Management - Art of Baking",
    appSubtitle: "PM TEAM REALTIME DATABASE",
    machineDetailsSubtitle: "Details and All Parts",

    // Navigation
    navDashboard: "Dashboard",
    navMachines: "Machines",
    navParts: "Parts",
    navMaintenance: "Maintenance",
    navSchedule: "Schedule",
    navAnalytics: "Analytics",
    navPredictive: "Forecasting",
    navAudit: "Audit",

    // Predictive Page
    predictiveSubtitle: "AI-Powered Maintenance Forecasting",
    predictiveAnalyzing: "AI Analyzing...",
    predictiveCriticalTitle: "Critical Predictions",
    predictiveUpcomingTitle: "Upcoming Issues",
    predictiveHealthTitle: "System Health",
    predictiveReliable: "Reliable",
    predictiveRiskAnalysis: "Risk Analysis",
    predictiveRealtimeLogic: "Real-time Sensor Logic",
    predictiveProb: "Probability",
    predictivePredictedWithin: "Predicted within",
    predictiveAvgTemp: "Avg. Temp",
    predictiveAvgVib: "Avg. Vibration",
    predictiveViewReports: "View Sensor Reports",
    predictiveMachineCount: "{count} Machine",
    predictiveAreaCount: "{count} Areas",
    predictiveWithinHours: "{hours} hours",
    predictiveWithinDays: "{days} days",
    temperature: "Temperature",
    vibration: "Vibration",

    // Mock Predictions
    predBearingFailure: "Bearing Failure Likely",
    predBeltTension: "Belt Tension Degradation",
    predOverheating: "Motor Overheating",

    statusHighRisk: "High Risk",
    statusMonitoring: "Monitoring",
    statusHealthy: "Healthy",
    statusOverdue: "Overdue",
    statusOnTime: "On-time",

    // Audit Page
    auditSubtitle: "Audit Summary & Compliance Dashboard",
    auditCompliance: "PM Compliance Tracker",
    auditTraceability: "Maintenance Traceability",
    auditCriticalStock: "Critical Spare Parts",
    auditReliability: "Machine Reliability",
    auditPmCompletion: "PM Completion Rate",
    auditOnTimeRate: "On-time Completion Rate",
    auditActiveIssues: "Active Issues",
    auditAvailability: "Availability",
    auditStatus: "Audit Status",
    auditReady: "READY / COMPLIANT",
    auditTarget: "Monthly PM Target: {target}%",
    auditMeasured: "Measured against PM scheduled dates",
    auditMachinesMonitorized: "{count} Machines Monitorized",
    auditLowStock: "{count} Low Stock",
    auditInRepair: "{count} In-Repair",
    auditPartLocation: "PART NAME & LOCATION",
    auditQtyMin: "QTY / MIN",
    auditStockNormal: "Stock Levels Normal",
    auditValidationActive: "Automated audit validation active.",
    auditValidationDesc: "All maintenance records are timestamped and signed by the assigned technician.",

    // Stats
    statTotalParts: "Part Names",
    statMachines: "Machines",
    statLocations: "Zones",
    statMaintenanceRecords: "Maintenance Records/Overhaul",
    statStockNormal: "In Stock",
    statStockLow: "Low Stock",
    statTotalLocations: "Total Zones",

    // Actions
    actionAddPart: "Add Part",
    actionAddMachine: "Add Machine",
    actionRecordMaintenance: "Part Change/Overhaul",
    actionMaintenanceHistory: "Overhaul History",
    maintenancePageTitle: "Maintenance History",
    actionExport: "Export",
    actionClearFilters: "Clear Filters",
    actionSave: "Save",
    actionCancel: "Cancel",
    actionClose: "Close",
    actionEdit: "Edit",
    actionDelete: "Delete",
    actionRepair: "Maintenance/Overhaul",
    actionSearch: "Search",
    placeholderSearchMachine: "Search Machine (Name/Code)",
    labelPartReplacement: "Part Replacement",
    maintenanceTitlePartChange: "Record Part Change",
    maintenanceTitleOverhaul: "Record Overhaul",
    maintenanceTitlePartAndOverhaul: "Record Part Change & Overhaul",
    actionSaveChanges: "Save Changes",
    labelParentPart: "Parent Part (Optional)",
    labelCustomCategory: "Custom Category",
    placeholderCustomCategory: "e.g., Electrical, Pneumatic...",
    labelSubParts: "Sub-Parts in this assembly",
    labelNoSubParts: "No sub-parts",
    labelOther: "Others (Custom Name)",
    placeholderOtherPartName: "Enter part name...",
    labelUsagePeriod: "Usage Period",
    unitYear: "Year(s)",
    unitMonth: "Month(s)",
    unitDay: "Day(s)",
    placeholderMachineName: "-- Select Machine --",

    // Filters
    filterTitle: "Search and Filter",
    filterMachine: "Machine Name",
    filterLocation: "Zone",
    filterPartName: "Part Name",
    filterAll: "All",
    filterShowResults: "Showing:",
    filterOf: "of",
    filterRecords: "records",
    machineCount: "{count} Machines",
    msgNoMachines: "No machines found. Add parts to see machines here.",
    statusActive: "Active",
    statusInStock: "In Stock",
    statusLowStock: "Low Stock",
    labelClass: "Class",
    historyItem: "Item History",
    msgNoHistory: "No maintenance history yet",
    scheduleDescription: "Preventive Maintenance (PM) Schedule",
    actionManagePM: "Manage PM Plans",
    msgOverdueAlert: "Items are due or overdue for maintenance!",
    msgActionRequired: "Please perform the tasks and record results.",
    msgLoadingPlans: "Loading plans...",
    labelDue: "Due: {date}",
    labelEveryDay: "Every {day}",
    labelOverdueBy: "Overdue by {days} days",
    labelToday: "Today",
    labelInDays: "In {days} days",
    actionCloseWork: "Close Work",
    msgNoPlans: "No maintenance plans at this time",
    modalSelectMachinePM: "Select Machine for PM Plan",
    msgNoMachineLocation: "No machines found in this location",
    modalConfirmDeletePM: "Confirm PM Plan Deletion",
    modalAreYouSure: "Are you sure?",
    modalDeletePMConfirm: "Are you sure you want to delete the plan \"{name}\"? This action cannot be undone.",
    statusOverdueLabel: "Overdue",
    statusTodayLabel: "Today!",
    statusUpcomingLabel: "Upcoming",
    statusOnTrackLabel: "On Track",

    // Table Headers
    tableImage: "IMAGE",
    tableMachine: "MACHINE",
    tablePartName: "PART NAME",
    tableModelSpec: "MODEL/SPEC",
    tableBrand: "BRAND",
    tableLocationArea: "ZONE",
    tableStatus: "STATUS",
    tableDate: "DATE",
    tableActions: "ACTIONS",
    tableQuantity: "Quantity",
    tableLocation: "Zone",
    tableNotes: "Notes",
    tableManagement: "Management",
    tableTitleParts: "Parts List",
    tableSupplier: "Supplier",
    tablePrice: "Price per Unit",

    // Add Part Modal
    addPartTitle: "Add Machine Part",
    addPartMachine: "Machine",
    addPartName: "Part Name",
    addPartSelectPart: "Select Part Name",
    addPartNewPart: "+ Add New Part Name",
    addPartModelSpec: "Model/Spec",
    addPartLocationArea: "Zone",
    addPartBrand: "Brand",
    addPartQuantity: "Quantity",
    addPartUnit: "Unit",
    addPartLocation: "Location",
    addPartImage: "Part Image",
    addPartChooseFile: "Choose File",
    addPartNoFile: "No file chosen",
    addPartImageHint: "Select image file (JPG, PNG, GIF) max 5MB",
    addPartCategory: "Category",
    addPartSelectCategory: "Select Category",
    addPartSelectMachine: "Select Machine",
    addPartNotes: "Notes",
    optionOther: "Other (Specify)",

    // Machine Settings Labels
    labelFileSize: "File Size",
    labelMachineName: "Machine Name",
    labelMachineCode: "Machine Code",
    labelMachineSettings: "Machine Settings",
    labelBrand: "Brand",
    labelModel: "Model",
    labelBrandModel: "Brand & Model",
    labelSerialNumber: "Serial Number",
    labelInstallationDate: "Installation Date",
    labelOperatingHours: "Operating Hours",
    labelCapacity: "Capacity",
    labelPowerRating: "Power Rating",
    labelPerformance: "Performance (Capacity/kW)",
    labelMaintenanceCycle: "Planned Replacement Cycle (Specify Month, Year)",
    labelHours: "Hours",
    labelPower: "Power",
    labelInstall: "Install",
    labelMonths: "Months",
    labelYears: "Years",
    labelDescription: "Additional Description",
    labelRemark: "Remark (Class)",

    // Maintenance Record Modal
    maintenanceTitle: "Part Change & Overhaul Record",
    maintenanceGeneralInfo: "General Information",
    maintenanceMachine: "Machine",
    maintenanceSelectMachine: "Select Machine",
    maintenanceDescription: "Maintenance Description",
    maintenanceType: "Maintenance Type",
    maintenanceSelectType: "Select Type",
    maintenancePriority: "Priority Level",
    maintenancePriorityNormal: "Normal",
    maintenancePriorityHigh: "High",
    maintenancePriorityUrgent: "Urgent",

    maintenanceOperationInfo: "Operation Details",
    maintenanceDate: "Maintenance Date",
    maintenanceDuration: "Duration (days)",
    maintenanceTechnician: "Technician",
    maintenanceStatus: "Status",
    maintenanceStatusPending: "Pending",
    maintenanceStatusInProgress: "In Progress",
    maintenanceStatusCompleted: "Completed",

    maintenanceMotorGearInfo: "Motor & Gear Information",
    maintenanceMotorSize: "Motor Size",
    maintenanceMotorSizeHint: "(First record only)",
    maintenanceVibration: "Vibration Values",
    maintenanceAxisX: "Axis X",
    maintenanceAxisY: "Axis Y",
    maintenanceAxisZ: "Axis Z",
    maintenanceVibrationValue: "Measured Value (mm/s)",
    maintenanceVibrationNormal: "Normal",
    maintenanceVibrationMedium: "Medium",
    maintenanceVibrationAbnormal: "Abnormal",

    maintenanceVoltage: "Voltage (3 Phase)",
    maintenanceSelectVoltage: "Select Voltage",
    maintenanceCurrent: "Current (A)",
    maintenanceCurrentIdle: "Idle Current (A)",
    maintenanceCurrentLoad: "Load 100% Current (A)",
    maintenanceTemperature: "Temperature (°C)",
    maintenanceTemperatureHint: "(For lifespan analysis)",

    // Shaft/Dial Gauge
    maintenanceShaftInfo: "Shaft & Dial Gauge Data",
    maintenanceShaftBend: "Shaft Bend/Crooked",
    maintenanceShaftBendValue: "Measured Value",
    maintenanceDialGauge: "Dial Gauge",
    maintenanceDialGaugeValue: "Measured Value",

    maintenanceDetailsNotes: "Details and Notes",
    maintenanceDetailDescription: "Maintenance Details",
    maintenanceAdditionalNotes: "Additional Notes",
    maintenanceSaveRecord: "Save Part Change Record",
    maintenanceHistoryTitle: "Preventive Maintenance History (PM)",

    maintenanceMachineHours: "Machine Operating Hours",
    maintenanceChangeReason: "Reason for Change",
    maintenancePartCondition: "Old Part Condition",
    maintenanceReasonWorn: "Normal Wear & Tear",
    maintenanceReasonFailed: "Sudden Failure",
    maintenanceReasonPlanned: "Planned Replacement",
    maintenanceReasonImprovement: "System Improvement",
    maintenanceConditionGood: "Still Good",
    maintenanceConditionFair: "Fair/Worn",
    maintenanceConditionPoor: "Critically Worn",
    maintenanceConditionBroken: "Broken/Damaged",
    maintenanceAdvancedTracking: "Advanced Tracking (for Analysis)",
    maintenanceOldPartStatus: "Old Part Status",

    // Maintenance Types
    typePreventive: "Preventive Maintenance",
    typeCorrective: "Corrective Repair",
    typeOilChange: "Oil Change",
    typePartReplacement: "Part Replacement",
    typeInspection: "Inspection",

    // Categories
    categoryMotor: "Motor",
    categoryGear: "Gear",
    categoryBelt: "Belt",
    categoryBearing: "Bearing",
    categoryPump: "Pump",
    categoryValve: "Valve",
    categoryElectrical: "Electrical",
    categoryOil: "Oil/Grease",
    categoryPneumatic: "Pneumatic",
    categoryTool: "Tool",
    categoryOther: "Other",

    // Locations
    locationTop: "Top",
    locationBottom: "Bottom",
    locationLeft: "Left",
    locationRight: "Right",
    locationFront: "Front",
    locationBack: "Back",
    locationInside: "Inside",

    // Status Messages
    msgLoading: "Loading...",
    msgNoData: "No data found",
    msgSaveSuccess: "Data saved successfully",
    msgSaveError: "Error saving data",
    msgConfirmDelete: "Are you sure you want to delete?",
    msgSuccess: "Action successful",
    userEditTitle: "Edit User",
    navAdminDashboard: "Admin Dashboard",
    aiAnalyze: "Analyze with AI",
    aiAnalyzing: "AI Analyzing...",
    aiSuggestionTitle: "AI Suggested Score",
    aiInsightTitle: "AI Performance Insights",
    aiApplySuggestion: "Apply AI Scores",
    aiReasoning: "AI Reasoning",
    msgSaving: "Saving...",
    msgDeleteSuccess: "Deleted successfully",
    msgDeleteError: "Error deleting data",
    titleConfirmDelete: "Confirm Delete",
    msgCurrentImagePreserved: "Current Image Preserved",
    msgDbConnected: "Successfully Connected!",
    msgDbReady: "Database system is ready for use",
    msgDbConnectError: "Connection Failed!",
    msgDbErrorDetail: "Unable to access database. Please check your connection.",
    msgAddPartSuccess: "Part added successfully!",
    msgEditPartSuccess: "Part edited successfully!",
    msgAddPartDetail: "Added \"{name}\" successfully.",
    msgEditPartDetail: "Edited \"{name}\" successfully.",
    msgNoPermission: "No permission",
    msgNoPermissionDetail: "Please check Firestore security rules",
    msgTimeout: "Connection timed out",
    msgTimeoutDetail: "Check internet connection and Firebase config",
    msgError: "An error occurred",
    validateInput: "Please fill in the information",
    validateSelectMachine: "Please specify machine name",
    validateSelectPart: "Please select part name",
    msgNoParts: "No parts found for this machine",
    msgNoEditPermission: "You don't have permission to edit",
    msgPleaseLogin: "Please log in",
    stockWithdrawSuccess: "Withdrawal successful",
    stockReceiveSuccess: "Stock reception successful",
    stockWithdrawError: "Failed to withdraw stock",
    stockReceiveError: "Failed to receive stock",

    // Additional Actions/Labels
    actionMaintenance: "Maintenance/Overhaul",
    statusReadOnly: "Read Only",
    labelMachinePart: "Machine & Part Information",
    editPartTitle: "Edit Part Details",
    confirmDeleteTitle: "Confirm Deletion",
    confirmDeleteMessage: "Are you sure you want to delete this item?",
    confirmDeleteMessageDetail: "Deleting: {name} cannot be undone.",

    // Placeholders
    placeholderMachine: "e.g. Pie Line",
    placeholderLocationLong: "e.g. Cross Roller",
    placeholderBrand: "e.g. SEW / NORD",
    placeholderLocation: "e.g. FZ",
    placeholderNotes: "e.g. Motor with CrossRoller timing belt [2] changed meter run char 220 0.29I",
    placeholderTechnician: "Assigned technician",
    placeholderDuration: "e.g. 1",
    placeholderTemperature: "e.g. 65.5",
    placeholderCurrentIdle: "e.g. 1.05",
    placeholderCurrentLoad: "e.g. 2.50",
    placeholderVibration: "Measured value (mm/s)",
    placeholderDescription: "Specify maintenance items",
    placeholderAdditionalNotes: "Observations, recommendations, or additional info",
    placeholderModelSpec: "e.g. SK71S/4 TF 0.37kw 105A • SK0721 XF-71 L/4 TF",
    placeholderMotorSize: "e.g. 0.37 kW, 1.5 HP",
    placeholderShaftBend: "e.g. 0.02 mm",
    placeholderDialGauge: "e.g. 0.05 mm",
    placeholderPartName: "e.g. Bearing 6200, Oil CLP 220",

    // Spare Parts Dashboard
    partsInventoryTitle: "Spare Parts Inventory",
    partsItemsCount: "{count} Items",
    partsCategoriesCount: "{count} Categories",
    partsLowStockAlert: "Low Stock Alert ({count})",
    partsLowStockDesc: "The following items are below threshold. Restock needed.",
    partsNoSpec: "No spec details",
    partsInStock: "In Stock",
    partsWithdraw: "Withdraw",
    partsReceive: "Receive",
    partsHistory: "History",
    partsNoParts: "No Parts Found",
    partsNoPartsDesc: "Start adding consumables like Bearings, Oil, or Filters to track your inventory.",
    partsAddFirst: "Add First Item",
    partsLoginToManage: "Login to Manage",

    // Stock Actions
    stockWithdrawTitle: "Withdraw Item",
    stockReceiveTitle: "Receive Stock",
    stockQuantity: "Quantity",
    stockMachine: "Select Machine",
    stockLocation: "Specify Location",
    stockNotes: "Notes",
    stockEvidence: "Proof of Change Image",
    stockEvidenceHint: "Upload a photo of the completed change for evidence",
    stockSupplier: "Supplier",
    stockPrice: "Unit Price",
    stockRefDoc: "Ref. Document",
    stockConfirmWithdraw: "Confirm Withdraw",
    stockConfirmReceive: "Confirm Receive",

    // Stock History
    historyTitle: "Transaction History",
    historyNoData: "No transactions found",
    historyPerformedBy: "Performed By",
    historyPerformedAt: "Performed At",
    historyClose: "Close History",

    // Schedule & Calendar
    scheduleCalendarView: "Calendar View",
    scheduleListView: "List View",
    calendarToday: "Today",
    calendarMon: "Mon",
    calendarTue: "Tue",
    calendarWed: "Wed",
    calendarThu: "Thu",
    calendarFri: "Fri",
    calendarSat: "Sat",
    calendarSun: "Sun",
    calendarNoTasks: "No maintenance tasks",

    // Notifications
    notificationTitle: "Notifications",
    notificationEmpty: "No new notifications",
    notificationLowStockMessage: "{part} only {qty} {unit} remaining",
    notificationPmUpcomingTitle: "Upcoming Maintenance",
    notificationPmUpcomingMessage: "{machine} is due in {days} days",
    notificationPmTodayTitle: "Maintenance Due Today",
    notificationPmTodayMessage: "{machine} is due today",
    notificationPmOverdueTitle: "Overdue Maintenance",
    notificationPmOverdueMessage: "{machine} is overdue since {date}",
    notificationLowStock: "Low Stock: {name}",
    notificationUpcomingPM: "Maintenance in {days} days: {name}",
    notificationDueToday: "Due Today: {name}",
    notificationRequestTitle: "Enable Notifications",
    notificationRequestDesc: "Get notified immediately when parts are low or maintenance is due.",
    notificationEnable: "Enable",

    // User Management
    userManageTitle: "User Management",
    userTotalCount: "{count} Users",
    userPendingCount: "{count} Pending",
    userTabAll: "All Users",
    userTabPending: "Pending Approval",
    userRoleAdmin: "Admin",
    userRoleSupervisor: "Supervisor",
    userRoleTechnician: "Technician",
    userRoleViewer: "Viewer",
    userStatusDeactivated: "Deactivated",
    userActionApprove: "Approve",
    userActionReject: "Reject",
    userConfirmReject: "Reject this user?",
    userApproveTitle: "Approve User",
    userLabelNickname: "Nickname",
    userLabelRole: "Role",
    userLabelDisplayName: "Display Name",
    userLabelDepartment: "Department",
    userRequestedAt: "Requested At",
    userNoPending: "No users pending approval",
    labelLocation: "Location",
    labelNormal: "Normal",
    labelThreshold: "Threshold",
    adminDashboardTitle: "Admin Dashboard",
    adminDashboardSubtitle: "Advanced System Management & Analytics",
    adminStatTotalAccess: "Total Access",
    adminStatTotalAccessSub: "All time logins",
    adminStatDailyAvg: "Daily Average",
    adminStatDailyAvgSub: "Logins per day",
    adminStatTechnicians: "Technicians",
    adminStatTechniciansSub: "Active team members",
    adminStatAvgPerformance: "Avg Performance",
    adminStatAvgPerformanceSub: "Team quality score",
    adminTabAnalytics: "Analytics",
    adminTabTechnicians: "Technicians",
    adminTabApprovals: "User Approvals",
    adminTabAuditLog: "Audit Log",
    adminTabSettings: "Settings",
    adminTechniciansTitle: "Our Technicians",
    adminTechniciansLoading: "Loading technician data...",
    adminTechnicalQuality: "Performance Score",
    adminTechnicalRecords: "members",
    adminActionEvaluate: "Evaluate",
    adminUsageHistory: "Usage History",
    adminUsageSubtitle: "Last 30 days of application access",
    adminUsageHits: "hits",
    adminUsageDailyActivity: "Daily Activity (Hits/Day)",
    adminUsageRecent: "Recent",
    adminSystemHealth: "System Health",
    adminDbResponse: "Database Response",
    adminStorageUsage: "Storage Usage",
    adminAuthSystem: "Auth System",
    adminStatusOnline: "Online",
    adminStatusNormal: "Normal",
    adminQuickInsights: "Quick Insights",
    adminInsightPeak: "Peak usage usually occurs on Monday mornings.",
    adminInsightMobile: "A 15% increase in mobile access over the last week.",
    adminInsightStable: "System stability has been 100% since last update.",
    // Analytics Page
    analyticsSubtitle: "Maintenance Data Analysis",
    analyticsMonthlyMaintenance: "Monthly Maintenance",
    analyticsPartsByCategory: "Parts by Category",
    analyticsDowntimeHours: "Downtime Hours",
    analyticsVibrationTrend: "Vibration Trend (mm/s)",
    analyticsTemperatureTrend: "Motor Temperature Trend (°C)",
    analyticsMotorTemp: "Motor Temperature",
    analyticsShouldCheck: "Should Check",
    analyticsTempRising: "Temperature is rising - Recommended to check cooling system",
    analyticsDowntimeTitle: "Downtime Loss",
    analyticsEfficiencyTitle: "Work Efficiency",
    analyticsEfficiencyROI: "ROI from PM",
    analyticsAdvancedCost: "Advanced Cost Analysis (Phase 4)",
    analyticsCostAnalysisDesc: "Analysis of spare parts cost vs. downtime",
    analyticsAccumulatedCost: "Accumulated Parts Cost (This Month)",
    analyticsDowntimeLoss: "Downtime Loss",
    analyticsAiInsight: "AI Insight",
    analyticsEfficiencyOpt: "Efficiency Optimization",
    analyticsDownloadSchedule: "Schedule (PDF)",
    analyticsMonthlyReport: "Monthly Report",
    analyticsGenerateReport: "Generate Report",
    analyticsGenerating: "Generating...",
    analyticsReportReady: "Report Generated",
    analyticsReportDesc: "Monthly Report for January 2026 has been generated and is ready for download.",
    analyticsPreventive: "Preventive",
    analyticsCorrective: "Corrective",
    analyticsOilChange: "Oil Change",
    analyticsAxisX: "Axis X",
    analyticsAxisY: "Axis Y",
    analyticsAxisZ: "Axis Z",

    // Generic Actions/Labels
    language: "en",
    actionSignOut: "Sign Out",
    actionManageUsers: "Manage Users",
    actionGoToDashboard: "Return to Dashboard",
    actionRegister: "Submit Registration",
    labelNoImage: "No Image",
    labelEvidenceImage: "Evidence Image",
    placeholderChooseImage: "Choose Image",
    actionRemoveImage: "Remove Image",
    labelAll: "All",
    labelMonthly: "Monthly",
    labelWeekly: "Weekly",
    predictiveMetricsNormal: "Normal",
    userRegisterTitle: "Registration",
    userRegisterSubtitle: "Request access to the Parts Management system",
    userPendingApprovalTitle: "Account Pending Approval",
    userPendingApprovalDesc: "Please wait for an administrator to review and approve your access.",
    msgWaitApproval: "Waiting for authorization review",
    altUser: "User",
    msgRequiredInfo: "Required Information",
    msgSelectMachine: "Please select a machine",
    msgSpecifyDetails: "Please specify maintenance details",
    msgNoAccess: "Access Denied",
    msgCheckRules: "Please check Firestore security rules",
    msgSavingData: "Saving data...",
    msgMaintenanceDocHint: "Data will be recorded for future comparison and trend analysis.",
    placeholderMaintenanceDetails: "Describe maintenance details, problems found, and solutions.",
    actionUploadPhoto: "Upload Photo",
    stockOtherGeneral: "Other / General Use",
    stockOptionalRecommended: "(Optional but recommended)",
    actionPMSettings: "Auto PM Settings",
    pmConfigTitle: "PM Plan Configuration",
    labelMaintenanceType: "Maintenance Type/Overhaul",
    placeholderSelectMaintenanceType: "-- Select Maintenance Type --",
    labelOtherCustom: "Other (Custom)",
    placeholderSpecifyMaintenanceName: "Specify maintenance name...",
    labelChecklist: "Checklist Items",
    labelSelectPartTypeSuggestion: "Select part type for suggestions:",
    placeholderSelectPartType: "-- Select Part Type --",
    labelSuggestedItems: "Suggested Items (Click to add):",
    placeholderAddSubItem: "Add sub-item...",
    msgNoItems: "- No items -",
    labelTimeFormat: "Time Format",
    labelYearly: "Yearly",
    labelEveryMonthly: "Every (Months)",
    labelEveryWeekly: "Every Day",
    labelEveryYearly: "Every Year",
    labelFirstStartDate: "First Cycle Start Date",
    labelWorkLocation: "Work Location",
    placeholderSelectLocation: "-- Select Location --",
    placeholderSpecifyLocation: "Specify location...",
    actionSavePlan: "Save Plan",
    pmExecutionTitle: "Record PM Result",
    labelItemsCompleted: "Items Completed",
    labelTechnician: "Technician",
    placeholderSpecifyTechnician: "Specify technician name...",
    placeholderChecklistValue: "Enter value/details (e.g. 2.5A, Normal, Replaced)",
    labelAdditionalNotes: "Additional Notes",
    labelMaintenanceDetails: "Maintenance Details",
    placeholderAdditionalNotesHint: "Additional notes (if any)...",
    placeholderMaintenanceDetailsHint: "Specify actions (e.g., cleaned, replaced parts)...",
    labelEvidencePhoto: "Proof Photo",
    labelPhotoAmp: "Electric Current (Amp) Photo",
    labelPhotoVibration: "Vibration Photo",
    labelPhotoOther: "Other Important Points",
    actionTakePhoto: "Take Photo",
    actionConfirmNextCycle: "Confirm and Start Next Cycle",
    pmHistoryTitle: "Part Change & Overhaul History",
    filterShow: "Show Filters",
    filterHide: "Hide Filters",
    placeholderSearchHistory: "Search technician, details...",
    filterAllLocations: "All Locations",
    filterAllMachines: "All Machines",
    filterAllTime: "All Time periods",
    labelUrgentRepair: "Urgent Repair",
    msgLoadingHistory: "Loading history...",
    msgNoMatchingHistory: "No history found matching the criteria.",
    pmHistoryModalTitle: "Preventive Maintenance (PM) History",
    statPMCount: "Preventive Maintenance (PM)",
    statOverhaulCount: "Part Change/Overhaul",
    msgNoHistoryForItem: "No maintenance history found for this item",
    labelWorkDetails: "Work Details",
    labelAuditChecklist: "Audit Checklist",
    labelEvidencePhotoShort: "Evidence Photo",
    actionCloseWindow: "Close Window",
    msgAddMachineSubtitle: "Enter new machine details",
    labelNoAutoCycle: "No automatic cycle",
    labelFirebaseStatus: "Firebase Status",
    statusConnected: "Connected",
    statusOffline: "Offline",
    labelProjectID: "Project ID",
    labelAuthDomain: "Auth Domain",
    labelAPIKey: "API Key",
    labelModularSDK: "v9.0.0 (Modular SDK)",
    statFoundHistoryPrefix: "Found total",
    statFoundHistorySuffix: "records",
    daySun: "Sun",
    dayMon: "Mon",
    dayTue: "Tue",
    dayWed: "Wed",
    dayThu: "Thu",
    dayFri: "Fri",
    daySat: "Sat",
    textEveryMonths: "Every {count} months",
    msgAutoScheduleHint: "Schedule will be generated automatically upon saving",
    msgEnterMachineName: "Please enter machine name",
    actionConfirm: "Confirm",
    labelStartDate: "Start Date",
    labelEndDate: "End Date",
    labelPreviousReplacementDate: "Previous Replacement",
    labelPartLifespan: "Lifespan (Days)",
    notificationAlerts: "Alerts",
    labelActionRequired: "Action Required",
    scannerTitle: "QR Scanner",
    scannerInitializing: "Initializing Camera...",
    scannerAccessDenied: "Camera Access Denied",
    scannerTryAgain: "Try Again Later",
    scannerInstructions: "Point your camera at a Machine or Part QR code to view details automatically.",
    scannerScannedContent: "Scanned Content",
    labelViewFullscreen: "View Fullscreen",
    altImage: "Image",
    statusCompleted: "Completed",
    labelMin: "Min",
    analyticsPreventiveRate: "Preventive Rate",
    analyticsTotalDowntime: "Total Downtime",
    analyticsCompletionRate: "Completion Rate",
    analyticsPartsTracked: "Parts Tracked",
    labelHoursShort: "hrs",
    placeholderDepartment: "e.g. Maintenance",
    labelLifespanTracking: "Lifespan & Tracking",
    labelReading: "Reading (Hr)",
    labelExpectedLifespan: "Expected Lifespan",
    labelActualLifespan: "Actual Lifespan",
    labelSerialBatch: "Serial/Batch",
    labelAnalysisContext: "Analysis Context",
    labelChangeFrequency: "Change Frequency",
    labelTimes: "times",
    labelSize: "Size",
    labelTemp: "Temp",
    labelIdleA: "Idle A",
    labelLoadA: "Load A",
    labelVoltageL1L2L3: "Voltage (L1/L2/L3)",
    labelVibrationXYZ: "Vibration (X/Y/Z)",
    labelAnalysisMode: "Analysis Mode",
    placeholderAutoCalc: "Auto-calc",

    // Period / Cycle
    labelPeriod: "Maintenance Period",
    periodRoutine: "Daily/Weekly (Routine)",
    period1Month: "1 Month",
    period3Months: "3 Months",
    period6Months: "6 Months",
    period1Year: "1 Year",
    msgNotYetDue: "Not yet due",
};

export const translations: Record<Language, TranslationKeys> = {
    th,
    en,
};

// Data-level translations for common terms found in the database
export const dataTranslations: Record<string, string> = {
    // Part Names
    "สายพาน": "Timing Belt",
    "Motor + Gear": "Motor + Gearbox",
    "ลูกปืน": "Bearing",
    "โซ่": "Chain",
    "เฟือง": "Sprocket / Gear",
    "ซีล": "Oil Seal",
    "น็อต": "Bolt / Nut",
    "ใบมีด": "Blade / Cutter",
    "เซนเซอร์": "Sensor",
    "สวิตซ์": "Switch",

    // Notes / Locations
    "ชุดรีดโดเข้า": "Dough Infeed Roller Set",
    "ชุดรีดโดออก": "Dough Outfeed Roller Set",
    "ฝั่ง": "Side",
    "ซ้าย": "Left",
    "ขวา": "Right",
    "หน้า": "Front",
    "หลัง": "Back",
    "ตัว": "Unit(s)",
    "เปลี่ยน": "Change / Replace",
    "ซ่อม": "Repair",
    "ตรวจเช็ค": "Inspect",
    "ปกติ": "Normal",
    "ชำรุด": "Damaged",
    "จุดอัดจาระบี": "Grease Point",
    "สายพานลำเลียง": "Conveyor Belt",
    "มอเตอร์": "Motor",
    "เฟรม": "Frame",
    "ใช้พ่นสายพาน": "Belt Spray Usage",
    "ตับ": "Set(s) / Segment(s)",
    "หัว": "Head / Unit",
};
