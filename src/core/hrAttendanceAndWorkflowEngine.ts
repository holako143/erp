import { Employee } from '../types/erp';

// ============================================================================
// 1. HR Geolocation Attendance Tracker & Daily Supervisor Dashboard Engine
// ============================================================================

export interface GeofenceHubLocation {
  hubId: string;
  nameAr: string;
  nameEn: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
}

export type AttendancePunctualityStatus = 'ON_TIME' | 'LATE_ARRIVAL' | 'EARLY_BIRD';
export type GeofenceVerificationStatus = 'WITHIN_GEOFENCE' | 'OUTSIDE_GEOFENCE';

export interface EmployeeAttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeNameAr: string;
  employeeNameEn: string;
  department: string;
  dateIso: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm
  clockOutTime: string | null; // HH:mm or null if still clocked in
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  hubId: string;
  hubNameAr: string;
  hubNameEn: string;
  distanceFromHubMeters: number;
  geofenceStatus: GeofenceVerificationStatus;
  punctuality: AttendancePunctualityStatus;
  workedHours: number;
  overtimeHours: number;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT';
  notes?: string;
}

export interface SupervisorAttendanceSummary {
  totalActiveEmployees: number;
  presentCount: number;
  clockedInNowCount: number;
  clockedOutCount: number;
  absentCount: number;
  onTimeCount: number;
  lateCount: number;
  withinGeofenceCount: number;
  outsideGeofenceCount: number;
  attendanceRatePct: number;
  avgWorkedHours: number;
}

export const DEFAULT_GEOFENCE_HUBS: GeofenceHubLocation[] = [
  {
    hubId: 'hub-hq-main',
    nameAr: 'المقر الرئيسي - الرياض (طريق الملك فهد)',
    nameEn: 'Riyadh HQ Main Campus',
    latitude: 24.7136,
    longitude: 46.6753,
    allowedRadiusMeters: 250,
  },
  {
    hubId: 'hub-wh-central',
    nameAr: 'المستودع المركزي واللوجستيات - السلي',
    nameEn: 'Central Logistics Warehouse',
    latitude: 24.6642,
    longitude: 46.8125,
    allowedRadiusMeters: 350,
  },
  {
    hubId: 'hub-branch-south',
    nameAr: 'الفرع الإقليمي الجنوبي - صنعاء / عدن',
    nameEn: 'Southern Regional Branch Hub',
    latitude: 15.3694,
    longitude: 44.191,
    allowedRadiusMeters: 300,
  },
];

/**
 * Computes the great-circle distance in meters between two GPS coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return Math.round(R * c);
}

function parseTimeMinutes(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '08:00').split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return h * 60 + m;
}

/**
 * Evaluates a Clock-In or Clock-Out action with GPS coordinates against the selected
 * branch geofence hub and updates the daily attendance log list.
 */
export function recordGeolocationAttendanceEvent(params: {
  existingRecords: EmployeeAttendanceRecord[];
  employee: Pick<Employee, 'id' | 'employeeCode' | 'fullName' | 'fullNameAr' | 'department'>;
  action: 'CLOCK_IN' | 'CLOCK_OUT';
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  hub: GeofenceHubLocation;
  timeHhMm: string;
  dateIso?: string;
  shiftStartHhMm?: string;
  notes?: string;
}): {
  updatedRecords: EmployeeAttendanceRecord[];
  activeRecord: EmployeeAttendanceRecord;
} {
  const {
    existingRecords,
    employee,
    action,
    latitude,
    longitude,
    accuracyMeters = 12,
    hub,
    timeHhMm,
    dateIso = new Date().toISOString().slice(0, 10),
    shiftStartHhMm = '08:30',
    notes,
  } = params;

  const distanceFromHubMeters = calculateHaversineDistanceMeters(
    latitude,
    longitude,
    hub.latitude,
    hub.longitude
  );

  const geofenceStatus: GeofenceVerificationStatus =
    distanceFromHubMeters <= hub.allowedRadiusMeters
      ? 'WITHIN_GEOFENCE'
      : 'OUTSIDE_GEOFENCE';

  const existingIdx = existingRecords.findIndex(
    (r) => r.employeeId === employee.id && r.dateIso === dateIso
  );

  if (action === 'CLOCK_OUT' && existingIdx >= 0) {
    const current = existingRecords[existingIdx];
    const inMins = parseTimeMinutes(current.clockInTime);
    const outMins = parseTimeMinutes(timeHhMm);
    const diffMins = outMins >= inMins ? outMins - inMins : 24 * 60 - inMins + outMins;
    const workedHours = Math.max(0.25, Math.round((diffMins / 60) * 100) / 100);
    const overtimeHours = Math.max(0, Math.round((workedHours - 8) * 100) / 100);

    const updatedRecord: EmployeeAttendanceRecord = {
      ...current,
      clockOutTime: timeHhMm,
      workedHours,
      overtimeHours,
      status: 'CLOCKED_OUT',
      notes: notes || current.notes,
    };

    const updatedRecords = existingRecords.map((r, idx) =>
      idx === existingIdx ? updatedRecord : r
    );
    return { updatedRecords, activeRecord: updatedRecord };
  }

  const clockInMins = parseTimeMinutes(timeHhMm);
  const shiftStartMins = parseTimeMinutes(shiftStartHhMm);
  const punctuality: AttendancePunctualityStatus =
    clockInMins < shiftStartMins - 10
      ? 'EARLY_BIRD'
      : clockInMins <= shiftStartMins + 10
      ? 'ON_TIME'
      : 'LATE_ARRIVAL';

  const newRecord: EmployeeAttendanceRecord = {
    id: `att-${employee.id}-${dateIso}`,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeNameAr: employee.fullNameAr || employee.fullName,
    employeeNameEn: employee.fullName || employee.fullNameAr,
    department: employee.department,
    dateIso,
    clockInTime: timeHhMm,
    clockOutTime: action === 'CLOCK_OUT' ? timeHhMm : null,
    latitude: Math.round(latitude * 100000) / 100000,
    longitude: Math.round(longitude * 100000) / 100000,
    accuracyMeters: Math.round(accuracyMeters),
    hubId: hub.hubId,
    hubNameAr: hub.nameAr,
    hubNameEn: hub.nameEn,
    distanceFromHubMeters,
    geofenceStatus,
    punctuality,
    workedHours: action === 'CLOCK_OUT' ? 8 : 0,
    overtimeHours: 0,
    status: action === 'CLOCK_OUT' ? 'CLOCKED_OUT' : 'CLOCKED_IN',
    notes,
  };

  if (existingIdx >= 0) {
    const updatedRecords = existingRecords.map((r, idx) =>
      idx === existingIdx ? newRecord : r
    );
    return { updatedRecords, activeRecord: newRecord };
  }

  return {
    updatedRecords: [newRecord, ...existingRecords],
    activeRecord: newRecord,
  };
}

/**
 * Aggregates daily attendance metrics for the Supervisor Attendance Dashboard.
 */
export function summarizeSupervisorDailyAttendance(
  records: EmployeeAttendanceRecord[],
  totalActiveEmployees: number
): SupervisorAttendanceSummary {
  const uniqueEmployeeIds = new Set(records.map((r) => r.employeeId));
  const presentCount = uniqueEmployeeIds.size;
  const effectiveTotal = Math.max(totalActiveEmployees, presentCount, 1);
  const clockedInNowCount = records.filter((r) => r.status === 'CLOCKED_IN').length;
  const clockedOutCount = records.filter((r) => r.status === 'CLOCKED_OUT').length;
  const absentCount = Math.max(0, effectiveTotal - presentCount);
  const onTimeCount = records.filter(
    (r) => r.punctuality === 'ON_TIME' || r.punctuality === 'EARLY_BIRD'
  ).length;
  const lateCount = records.filter((r) => r.punctuality === 'LATE_ARRIVAL').length;
  const withinGeofenceCount = records.filter(
    (r) => r.geofenceStatus === 'WITHIN_GEOFENCE'
  ).length;
  const outsideGeofenceCount = records.filter(
    (r) => r.geofenceStatus === 'OUTSIDE_GEOFENCE'
  ).length;

  const attendanceRatePct = Math.min(
    100,
    Math.round((presentCount / effectiveTotal) * 1000) / 10
  );

  const workedRecords = records.filter((r) => r.workedHours > 0);
  const avgWorkedHours =
    workedRecords.length > 0
      ? Math.round(
          (workedRecords.reduce((s, r) => s + r.workedHours, 0) / workedRecords.length) * 10
        ) / 10
      : 0;

  return {
    totalActiveEmployees: effectiveTotal,
    presentCount,
    clockedInNowCount,
    clockedOutCount,
    absentCount,
    onTimeCount,
    lateCount,
    withinGeofenceCount,
    outsideGeofenceCount,
    attendanceRatePct,
    avgWorkedHours,
  };
}

// ============================================================================
// 2. Visual Drag-and-Drop Conditional Approval Workflow Builder Engine
// ============================================================================

export type WorkflowNodeType = 'CONDITION' | 'APPROVER' | 'AUTOMATED_ACTION';
export type WorkflowConditionField = 'AMOUNT' | 'DISCOUNT_PCT' | 'URGENCY' | 'DEPARTMENT';
export type WorkflowConditionOperator = '>' | '>=' | '<=' | '==' | '!=';
export type WorkflowFalseBranchBehavior = 'SKIP_STEP' | 'AUTO_APPROVE_CHAIN' | 'ESCALATE_CFO' | 'REJECT_REQUEST';

export interface WorkflowStepNode {
  id: string;
  stepOrder: number;
  nodeType: WorkflowNodeType;
  titleAr: string;
  titleEn: string;
  approverRole: string;
  conditionField: WorkflowConditionField;
  conditionOperator: WorkflowConditionOperator;
  conditionValue: string | number;
  falseBranchBehavior: WorkflowFalseBranchBehavior;
  slaHours: number;
}

export interface CustomApprovalWorkflowBlueprint {
  workflowId: string;
  nameAr: string;
  nameEn: string;
  targetModule: 'PURCHASING' | 'ACCOUNTING' | 'HR_PAYROLL' | 'INVENTORY' | 'SALES';
  isActive: boolean;
  steps: WorkflowStepNode[];
  updatedAtIso: string;
}

export interface WorkflowSimulationTraceStep {
  stepId: string;
  stepOrder: number;
  nodeType: WorkflowNodeType;
  titleAr: string;
  titleEn: string;
  conditionExpression: string;
  conditionMatched: boolean;
  executionOutcome: 'EXECUTED_REQUIRED' | 'SKIPPED_BY_CONDITION' | 'AUTO_APPROVED' | 'ESCALATED_TO_CFO' | 'REJECTED';
  assignedApproverRole: string;
  slaHours: number;
}

export interface WorkflowSimulationResult {
  workflowId: string;
  finalDecisionStatus: 'REQUIRES_APPROVAL_CHAIN' | 'AUTO_APPROVED' | 'REJECTED';
  activeApproversChain: string[];
  totalExpectedSlaHours: number;
  traceSteps: WorkflowSimulationTraceStep[];
}

export const INITIAL_CUSTOM_WORKFLOW_BLUEPRINTS: CustomApprovalWorkflowBlueprint[] = [
  {
    workflowId: 'wf-bp-po-highval',
    nameAr: 'سلسلة اعتماد أوامر الشراء والصفقات الرأسمالية المشروطة',
    nameEn: 'Conditional Capital Purchase Order Approval Sequence',
    targetModule: 'PURCHASING',
    isActive: true,
    updatedAtIso: '2026-11-17T08:00:00.000Z',
    steps: [
      {
        id: 'step-1-dept',
        stepOrder: 1,
        nodeType: 'APPROVER',
        titleAr: 'مراجعة مدير المشتريات والمخزون',
        titleEn: 'Procurement & Warehouse Manager Review',
        approverRole: 'WAREHOUSE_MANAGER',
        conditionField: 'AMOUNT',
        conditionOperator: '>=',
        conditionValue: 1000,
        falseBranchBehavior: 'AUTO_APPROVE_CHAIN',
        slaHours: 4,
      },
      {
        id: 'step-2-cond-fin',
        stepOrder: 2,
        nodeType: 'CONDITION',
        titleAr: 'فحص سقف الميزانية المالية (> 15,000)',
        titleEn: 'Financial Budget Threshold Gate (> 15,000)',
        approverRole: 'ACCOUNTANT',
        conditionField: 'AMOUNT',
        conditionOperator: '>',
        conditionValue: 15000,
        falseBranchBehavior: 'SKIP_STEP',
        slaHours: 8,
      },
      {
        id: 'step-3-cfo',
        stepOrder: 3,
        nodeType: 'APPROVER',
        titleAr: 'اعتماد المدير التنفيذي / الإدارة العليا (> 50,000)',
        titleEn: 'Executive / Super Admin Final Sign-off (> 50,000)',
        approverRole: 'SUPER_ADMIN',
        conditionField: 'AMOUNT',
        conditionOperator: '>',
        conditionValue: 50000,
        falseBranchBehavior: 'SKIP_STEP',
        slaHours: 12,
      },
      {
        id: 'step-4-action',
        stepOrder: 4,
        nodeType: 'AUTOMATED_ACTION',
        titleAr: 'إصدار أمر الشراء وحجز المخصص المالي تلقائياً',
        titleEn: 'Auto-Dispatch PO & Reserve Cost Center Budget',
        approverRole: 'SYSTEM_AUTOMATION',
        conditionField: 'AMOUNT',
        conditionOperator: '>=',
        conditionValue: 0,
        falseBranchBehavior: 'SKIP_STEP',
        slaHours: 1,
      },
    ],
  },
];

/**
 * Pure drag-and-drop reordering function for workflow steps.
 * Moves the item at `sourceIndex` to `destinationIndex` and re-indexes `stepOrder` (1..N).
 */
export function reorderWorkflowStepsDragDrop(
  steps: WorkflowStepNode[],
  sourceIndex: number,
  destinationIndex: number
): WorkflowStepNode[] {
  if (
    !Array.isArray(steps) ||
    steps.length <= 1 ||
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= steps.length ||
    destinationIndex >= steps.length ||
    sourceIndex === destinationIndex
  ) {
    return steps.map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
  }

  const copy = [...steps];
  const [moved] = copy.splice(sourceIndex, 1);
  copy.splice(destinationIndex, 0, moved);

  return copy.map((step, idx) => ({
    ...step,
    stepOrder: idx + 1,
  }));
}

function evaluateStepCondition(
  step: WorkflowStepNode,
  payload: {
    amount: number;
    discountPct: number;
    urgency: string;
    department: string;
  }
): boolean {
  const lhs =
    step.conditionField === 'AMOUNT'
      ? Number(payload.amount) || 0
      : step.conditionField === 'DISCOUNT_PCT'
      ? Number(payload.discountPct) || 0
      : step.conditionField === 'URGENCY'
      ? String(payload.urgency || 'NORMAL').toUpperCase()
      : String(payload.department || '').toUpperCase();

  const rhs =
    step.conditionField === 'AMOUNT' || step.conditionField === 'DISCOUNT_PCT'
      ? Number(step.conditionValue) || 0
      : String(step.conditionValue || '').toUpperCase();

  switch (step.conditionOperator) {
    case '>':
      return Number(lhs) > Number(rhs);
    case '>=':
      return Number(lhs) >= Number(rhs);
    case '<=':
      return Number(lhs) <= Number(rhs);
    case '!=':
      return String(lhs) !== String(rhs);
    case '==':
    default:
      return String(lhs) === String(rhs);
  }
}

/**
 * Simulates executing a custom conditional workflow blueprint against a sample payload,
 * evaluating each conditional step in sequence and computing the approval routing path.
 */
export function simulateWorkflowExecutionTrace(
  blueprint: CustomApprovalWorkflowBlueprint,
  payload: {
    amount: number;
    discountPct?: number;
    urgency?: string;
    department?: string;
  }
): WorkflowSimulationResult {
  const normalizedPayload = {
    amount: Number(payload.amount) || 0,
    discountPct: Number(payload.discountPct) || 0,
    urgency: payload.urgency || 'NORMAL',
    department: payload.department || 'FINANCE',
  };

  const traceSteps: WorkflowSimulationTraceStep[] = [];
  const activeApproversChain: string[] = [];
  let totalExpectedSlaHours = 0;
  let finalDecisionStatus: WorkflowSimulationResult['finalDecisionStatus'] =
    'REQUIRES_APPROVAL_CHAIN';
  let chainHalted = false;

  for (const step of blueprint.steps || []) {
    const conditionExpression = `${step.conditionField} ${step.conditionOperator} ${step.conditionValue}`;
    if (chainHalted) {
      traceSteps.push({
        stepId: step.id,
        stepOrder: step.stepOrder,
        nodeType: step.nodeType,
        titleAr: step.titleAr,
        titleEn: step.titleEn,
        conditionExpression,
        conditionMatched: false,
        executionOutcome: 'SKIPPED_BY_CONDITION',
        assignedApproverRole: step.approverRole,
        slaHours: 0,
      });
      continue;
    }

    const matched = evaluateStepCondition(step, normalizedPayload);

    if (matched) {
      traceSteps.push({
        stepId: step.id,
        stepOrder: step.stepOrder,
        nodeType: step.nodeType,
        titleAr: step.titleAr,
        titleEn: step.titleEn,
        conditionExpression,
        conditionMatched: true,
        executionOutcome: 'EXECUTED_REQUIRED',
        assignedApproverRole: step.approverRole,
        slaHours: step.slaHours,
      });
      if (step.approverRole && step.approverRole !== 'SYSTEM_AUTOMATION') {
        activeApproversChain.push(step.approverRole);
      }
      totalExpectedSlaHours += Number(step.slaHours) || 0;
    } else {
      if (step.falseBranchBehavior === 'AUTO_APPROVE_CHAIN') {
        finalDecisionStatus = 'AUTO_APPROVED';
        chainHalted = true;
        traceSteps.push({
          stepId: step.id,
          stepOrder: step.stepOrder,
          nodeType: step.nodeType,
          titleAr: step.titleAr,
          titleEn: step.titleEn,
          conditionExpression,
          conditionMatched: false,
          executionOutcome: 'AUTO_APPROVED',
          assignedApproverRole: 'AUTO_SYSTEM',
          slaHours: 0,
        });
      } else if (step.falseBranchBehavior === 'REJECT_REQUEST') {
        finalDecisionStatus = 'REJECTED';
        chainHalted = true;
        traceSteps.push({
          stepId: step.id,
          stepOrder: step.stepOrder,
          nodeType: step.nodeType,
          titleAr: step.titleAr,
          titleEn: step.titleEn,
          conditionExpression,
          conditionMatched: false,
          executionOutcome: 'REJECTED',
          assignedApproverRole: step.approverRole,
          slaHours: 0,
        });
      } else if (step.falseBranchBehavior === 'ESCALATE_CFO') {
        activeApproversChain.push('SUPER_ADMIN');
        totalExpectedSlaHours += 6;
        traceSteps.push({
          stepId: step.id,
          stepOrder: step.stepOrder,
          nodeType: step.nodeType,
          titleAr: step.titleAr,
          titleEn: step.titleEn,
          conditionExpression,
          conditionMatched: false,
          executionOutcome: 'ESCALATED_TO_CFO',
          assignedApproverRole: 'SUPER_ADMIN',
          slaHours: 6,
        });
      } else {
        traceSteps.push({
          stepId: step.id,
          stepOrder: step.stepOrder,
          nodeType: step.nodeType,
          titleAr: step.titleAr,
          titleEn: step.titleEn,
          conditionExpression,
          conditionMatched: false,
          executionOutcome: 'SKIPPED_BY_CONDITION',
          assignedApproverRole: step.approverRole,
          slaHours: 0,
        });
      }
    }
  }

  if (finalDecisionStatus === 'REQUIRES_APPROVAL_CHAIN' && activeApproversChain.length === 0) {
    finalDecisionStatus = 'AUTO_APPROVED';
  }

  return {
    workflowId: blueprint.workflowId,
    finalDecisionStatus,
    activeApproversChain,
    totalExpectedSlaHours,
    traceSteps,
  };
}
