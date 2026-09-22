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

export interface ProcessingPlantTrendPoint {
  date: string;
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

export interface ProcessingPlantPerformanceRow {
  plantId: string;
  plantName: string;
  plantType?: string;
  received: number;
  processed: number;
  recovered: number;
  reject: number;
  efficiency: number;
  capacity?: number | null;
  utilization?: number | null;
  reportingStatus?: string;
  lastSubmissionAt?: string | null;
}

export interface ProcessingPlantDashboardData {
  totalReceived: number;
  totalProcessed: number;
  totalRecovered: number;
  totalReject: number;
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
