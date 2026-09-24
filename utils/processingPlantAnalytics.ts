import type {
  ProcessingPlantDashboardData,
  ProcessingPlantPerformanceRow,
  ProcessingPlantTrendPoint,
} from '../types/processingPlant';

const n = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pick = <T = number>(
  obj: any,
  keys: string[],
  fallback: T = 0 as T
): T => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key] as T;
    }
  }
  return fallback;
};

export function normalizeDashboardPayload(payload: any): ProcessingPlantDashboardData {
  const source = payload?.data ?? payload ?? {};
  const summary = source.summary ?? source.kpis ?? source.overview ?? source;

  const totalReceived = n(pick(summary, ['totalReceived', 'received', 'receivedQuantity', 'totalInput']));
  const totalProcessed = n(pick(summary, ['totalProcessed', 'processed', 'processedQuantity', 'totalProcessedQuantity']));
  const totalRecovered = n(pick(summary, ['totalRecovered', 'recovered', 'recoveredQuantity', 'materialRecovered']));
  const totalReject = n(pick(summary, ['totalReject', 'reject', 'rejectQuantity', 'residual', 'residualQuantity']));

  const efficiencyFromApi = n(pick(summary, ['efficiency', 'processingEfficiency', 'processingRate']));
  const efficiency = efficiencyFromApi || (totalReceived > 0 ? (totalProcessed / totalReceived) * 100 : 0);

  const trendRaw = source.trend ?? source.dailyTrend ?? source.series ?? source.timeline ?? [];
  const trend: ProcessingPlantTrendPoint[] = Array.isArray(trendRaw)
    ? trendRaw.map((row: any) => ({
        date: String(pick(row, ['date', 'day', 'label'], '')),
        received: n(pick(row, ['received', 'totalReceived', 'input'])),
        processed: n(pick(row, ['processed', 'totalProcessed', 'output'])),
        recovered: n(pick(row, ['recovered', 'totalRecovered'])),
        reject: n(pick(row, ['reject', 'totalReject', 'residual'])),
        efficiency: n(pick(row, ['efficiency', 'processingEfficiency'])),
      }))
    : [];

  const plantRaw = source.plantPerformance ?? source.plants ?? source.plantWise ?? source.byPlant ?? [];
  const plantPerformance: ProcessingPlantPerformanceRow[] = Array.isArray(plantRaw)
    ? plantRaw.map((row: any) => {
        const received = n(pick(row, ['received', 'totalReceived', 'input']));
        const processed = n(pick(row, ['processed', 'totalProcessed', 'output']));
        const capacity = pick(row, ['capacity', 'installedCapacity'], null);
        return {
          plantId: String(pick(row, ['plantId', 'id'], '')),
          plantName: String(pick(row, ['plantName', 'name'], 'Unnamed Plant')),
          plantType: String(pick(row, ['plantType', 'type'], '')),
          received,
          processed,
          recovered: n(pick(row, ['recovered', 'totalRecovered'])),
          reject: n(pick(row, ['reject', 'totalReject', 'residual'])),
          efficiency: n(pick(row, ['efficiency', 'processingEfficiency'])) || (received > 0 ? (processed / received) * 100 : 0),
          capacity: capacity === null ? null : n(capacity),
          utilization:
            n(pick(row, ['utilization', 'capacityUtilization'])) ||
            (capacity && n(capacity) > 0 ? (received / n(capacity)) * 100 : null),
          reportingStatus: String(pick(row, ['reportingStatus', 'status'], '')),
          lastSubmissionAt: pick(row, ['lastSubmissionAt', 'lastReportedAt', 'updatedAt'], null) as string | null,
        };
      })
    : [];

  const materialRaw = source.materialRecovery ?? source.recoveryMix ?? source.materials ?? source.byMaterial ?? [];
  const materialRecovery = Array.isArray(materialRaw)
    ? materialRaw.map((row: any) => ({
        name: String(pick(row, ['name', 'material', 'label', 'type'], 'Other')),
        quantity: n(pick(row, ['quantity', 'value', 'recovered'])),
        percentage: n(pick(row, ['percentage', 'share', 'percent'])),
      }))
    : [];

  return {
    totalReceived,
    totalProcessed,
    totalRecovered,
    totalReject,
    efficiency,
    activePlants: n(pick(summary, ['activePlants', 'reportingPlants', 'plantsReporting'])),
    totalPlants: n(pick(summary, ['totalPlants', 'plantCount'])),
    reportingPlants: n(pick(summary, ['reportingPlants', 'plantsReporting'])),
    failedEntries: n(pick(summary, ['failedEntries', 'failedSubmissions', 'failed'])),
    receivedEntries: n(pick(summary, ['receivedEntries', 'receivedSubmissions'])),
    processedEntries: n(pick(summary, ['processedEntries', 'processedSubmissions'])),
    lastSubmissionAt: pick(summary, ['lastSubmissionAt', 'lastReportedAt'], null) as string | null,
    trend,
    materialRecovery,
    plantPerformance,
    raw: payload,
  };
}

export function formatMetric(value: number, suffix = ' MT') {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value || 0)}${suffix}`;
}

export function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function lastNDaysRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - Math.max(days - 1, 0));
  return { from: dateInputValue(from), to: dateInputValue(to) };
}

