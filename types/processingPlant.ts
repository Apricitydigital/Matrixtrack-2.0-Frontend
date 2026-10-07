export type ProcessingPlantFormStatus = 'RECEIVED' | 'PROCESSED' | 'FAILED' | string;

export interface ProcessingPlantFiltersState {
  from: string;
  to: string;
  plantType: string;
  plantId: string;
}

export interface ProcessingPlant {
  id: string;
  name: string;
  plantType?: string;
  type?: string;
  capacity?: number | null;
  capacityUnit?: string | null;
  isActive?: boolean;
  lastSubmissionAt?: string | null;
  [key: string]: unknown;
}

/** Quantities of one unit family (MT / KL / ML). */
export interface ProcessingPlantUnitQuantities {
  received: number;
  processed: number;
  recovered: number;
  reject: number;
  processLoss: number;
}

export interface ProcessingPlantTrendPoint {
  date: string;
  /** The same day split by unit family, so liquid plants get their own trend. */
  units?: Record<string, ProcessingPlantUnitQuantities>;
  received: number;
  processed: number;
  recovered?: number;
  reject?: number;
  efficiency?: number;
}

export interface ProcessingPlantMaterialPoint {
  name: string;
  quantity: number;
  percentage?: number;
}

export interface ProcessingPlantMonthlyFigures {
  /** YYYY-MM */
  month: string;
  /** days of this month inside the selected period */
  days: number;
  received: number;
  processed: number;
  recovered: number;
  reject: number;
  processLoss: number;
}

export interface ProcessingPlantPerformanceRow {
  plantId: string;
  plantName: string;
  plantType?: string;
  received: number;
  processed: number;
  recovered: number;
  reject: number;
  /** Process Loss / Moisture reported by the plant (same unit as received). */
  processLoss: number;
  efficiency: number;
  /** false when the plant's output is not a quantity comparable with its input (e.g. electricity in kWh). */
  efficiencyAvailable?: boolean;
  /** MONTHLY when the plant only reports one total per month (its daily values are that total spread over the month). */
  reportingGranularity?: 'DAILY' | 'MONTHLY';
  /** Month-by-month figures of a monthly-reporting plant. */
  monthly?: ProcessingPlantMonthlyFigures[];
  capacity?: number | null;
  utilization?: number | null;
  reportingStatus?: string;
  lastSubmissionAt?: string | null;
  /** Unit of received / processed / recovered / reject (MT for solid plants, KL / ML for liquid plants). */
  unit?: string;
  daysReported?: number;
  daysInRange?: number;
}

export interface ProcessingPlantDashboardData {
  totalReceived: number;
  totalProcessed: number;
  totalRecovered: number;
  totalReject: number;
  totalProcessLoss: number;
  efficiency: number;
  activePlants: number;
  totalPlants: number;
  reportingPlants?: number;
  failedEntries?: number;
  receivedEntries?: number;
  processedEntries?: number;
  lastSubmissionAt?: string | null;
  trend: ProcessingPlantTrendPoint[];
  materialRecovery: ProcessingPlantMaterialPoint[];
  /** Recovery mix per unit family (MT / KL / ML). */
  materialRecoveryByUnit: Record<string, ProcessingPlantMaterialPoint[]>;
  /** Outputs that are not a waste quantity (e.g. electricity in kWh). */
  otherOutputs: { name: string; unit: string; quantity: number }[];
  plantPerformance: ProcessingPlantPerformanceRow[];
  raw?: unknown;
}

export interface ProcessingPlantEntry {
  id: string;
  plantId: string;
  plantName?: string;
  plantType?: string;
  submittedAt?: string;
  status?: ProcessingPlantFormStatus;
  received?: number;
  processed?: number;
  recovered?: number;
  reject?: number;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProcessingPlantEntriesResponse {
  items: ProcessingPlantEntry[];
  page: number;
  limit: number;
  total: number;
}

export type ProcessingPlantUploadSheetStatus =
  | 'IMPORTED'
  | 'IMPORTED_WITH_WARNINGS'
  | 'NO_DATA'
  | 'FAILED';

export interface ProcessingPlantUploadIssue {
  severity: 'error' | 'warning';
  sheet: string;
  row?: number;
  date?: string;
  message: string;
}

export interface ProcessingPlantUploadSheetResult {
  sheetName: string;
  plantId: string | null;
  plantCode: string | null;
  plantName: string | null;
  status: ProcessingPlantUploadSheetStatus;
  rowsFound: number;
  rowsImported: number;
  rowsSkipped: number;
  valuesImported: number;
  fromDate: string | null;
  toDate: string | null;
  missingRequired: { code: string; label: string; days: number; dates: string[] }[];
  issues: ProcessingPlantUploadIssue[];
}

export interface ProcessingPlantUploadResult {
  fileName: string;
  summary: {
    sheetsFound: number;
    sheetsImported: number;
    plantsImported: number;
    rowsImported: number;
    rowsSkipped: number;
    valuesImported: number;
    errors: number;
    warnings: number;
  };
  dateRange: { from: string; to: string } | null;
  sheets: ProcessingPlantUploadSheetResult[];
  plantsWithoutData: { id: string; code: string; name: string }[];
  ignoredSheets: string[];
}

/** Dashboard stat cards that open a plant-wise drill-down list. */
export type ProcessingMetricKey =
  | 'received'
  | 'processed'
  | 'recovered'
  | 'reject'
  | 'loss'
  | 'efficiency'
  | 'reporting';

/** Totals of the plants in one unit family - the numbers behind the stat cards and the flow graph. */
export interface ProcessingUnitTotals {
  unit: string;
  received: number;
  processed: number;
  recovered: number;
  reject: number;
  processLoss: number;
  /** Recovered / received over the plants whose output can be compared with their input. */
  efficiency: number;
  hasEfficiency: boolean;
  plants: number;
}
