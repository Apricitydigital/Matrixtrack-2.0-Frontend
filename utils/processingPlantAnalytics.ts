import type {
  ProcessingUnitTotals,
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
  const totalProcessLoss = n(pick(summary, ['totalProcessLoss', 'processLoss']));

  const efficiencyFromApi = n(pick(summary, ['efficiency', 'processingEfficiency', 'processingRate']));
  // the API value is authoritative (0 is a real value); only guess when it is absent
  const efficiency = summary?.efficiency !== undefined || summary?.processingEfficiency !== undefined
    ? efficiencyFromApi
    : (totalReceived > 0 ? (totalRecovered / totalReceived) * 100 : 0);

  const trendRaw = source.trend ?? source.dailyTrend ?? source.series ?? source.timeline ?? [];
  const trend: ProcessingPlantTrendPoint[] = Array.isArray(trendRaw)
    ? trendRaw.map((row: any) => ({
        date: String(pick(row, ['date', 'day', 'label'], '')),
        received: n(pick(row, ['received', 'totalReceived', 'input'])),
        processed: n(pick(row, ['processed', 'totalProcessed', 'output'])),
        recovered: n(pick(row, ['recovered', 'totalRecovered'])),
        reject: n(pick(row, ['reject', 'totalReject', 'residual'])),
        efficiency: n(pick(row, ['efficiency', 'processingEfficiency'])),
        units: row?.units && typeof row.units === 'object'
          ? Object.fromEntries(
              Object.entries(row.units as Record<string, any>).map(([unit, q]) => [
                unit,
                {
                  received: n(q?.received),
                  processed: n(q?.processed),
                  recovered: n(q?.recovered),
                  reject: n(q?.reject),
                  processLoss: n(q?.processLoss),
                },
              ]),
            )
          : undefined,
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
          processLoss: n(pick(row, ['processLoss'])),
          efficiency: row?.efficiency !== undefined || row?.processingEfficiency !== undefined
            ? n(pick(row, ['efficiency', 'processingEfficiency']))
            : (received > 0 ? (n(pick(row, ['recovered', 'totalRecovered'])) / received) * 100 : 0),
          efficiencyAvailable: row?.efficiencyAvailable !== false,
          reportingGranularity: row?.reportingGranularity === 'MONTHLY' ? 'MONTHLY' : 'DAILY',
          monthly: Array.isArray(row?.monthly)
            ? row.monthly.map((m: any) => ({
                month: String(m?.month ?? ''),
                days: n(m?.days),
                received: n(m?.received),
                processed: n(m?.processed),
                recovered: n(m?.recovered),
                reject: n(m?.reject),
                processLoss: n(m?.processLoss),
              }))
            : undefined,
          capacity: capacity === null ? null : n(capacity),
          utilization:
            'utilization' in row || 'capacityUtilization' in row
              ? (() => {
                  const value = pick<number | null>(row, ['utilization', 'capacityUtilization'], null);
                  return value === null ? null : n(value);
                })()
              : n(pick(row, ['utilization', 'capacityUtilization'])) ||
                (capacity && n(capacity) > 0 ? (received / n(capacity)) * 100 : null),
          reportingStatus: String(pick(row, ['reportingStatus', 'status'], '')),
          lastSubmissionAt: pick(row, ['lastSubmissionAt', 'lastReportedAt', 'updatedAt'], null) as string | null,
          unit: row?.unit ? String(row.unit) : undefined,
          daysReported: row?.daysReported !== undefined ? n(row.daysReported) : undefined,
          daysInRange: row?.daysInRange !== undefined ? n(row.daysInRange) : undefined,
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

  const byUnitRaw = source.materialRecoveryByUnit && typeof source.materialRecoveryByUnit === 'object' ? source.materialRecoveryByUnit : {};
  const materialRecoveryByUnit = Object.fromEntries(
    Object.entries(byUnitRaw as Record<string, any>).map(([unit, list]) => [
      unit,
      Array.isArray(list)
        ? list.map((row: any) => ({
            name: String(pick(row, ['name', 'material', 'label'], 'Other')),
            quantity: n(pick(row, ['quantity', 'value'])),
            percentage: n(pick(row, ['percentage', 'share'])),
          }))
        : [],
    ]),
  );

  const otherOutputsRaw = source.otherOutputs ?? [];
  const otherOutputs = Array.isArray(otherOutputsRaw)
    ? otherOutputsRaw.map((row: any) => ({
        name: String(pick(row, ['name', 'label'], 'Other output')),
        unit: String(pick(row, ['unit'], '')),
        quantity: n(pick(row, ['quantity', 'value'])),
      }))
    : [];

  return {
    totalReceived,
    totalProcessed,
    totalRecovered,
    totalReject,
    totalProcessLoss,
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
    materialRecoveryByUnit,
    otherOutputs,
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


/**
 * Totals per unit family (MT for solid waste, KL / ML for liquid plants), built from the
 * plant rows. Quantities in different units cannot be added, so every family is separate.
 * Only families that have some data are returned, MT first.
 */
export function computeUnitTotals(rows: ProcessingPlantPerformanceRow[]): ProcessingUnitTotals[] {
  const map = new Map<string, ProcessingUnitTotals & { comparableReceived: number; comparableRecovered: number }>();

  for (const row of rows) {
    const unit = row.unit || 'MT';
    const current = map.get(unit) ?? {
      unit,
      received: 0,
      processed: 0,
      recovered: 0,
      reject: 0,
      processLoss: 0,
      efficiency: 0,
      hasEfficiency: false,
      plants: 0,
      comparableReceived: 0,
      comparableRecovered: 0,
    };

    current.received += row.received;
    current.processed += row.processed;
    current.recovered += row.recovered;
    current.reject += row.reject;
    current.processLoss += row.processLoss || 0;
    if (row.received > 0 || row.recovered > 0 || row.reject > 0 || (row.processLoss || 0) > 0) current.plants += 1;

    if (row.efficiencyAvailable !== false && row.received > 0) {
      current.comparableReceived += row.received;
      current.comparableRecovered += row.recovered;
    }

    map.set(unit, current);
  }

  return Array.from(map.values())
    .filter((totals) => totals.plants > 0)
    .map(({ comparableReceived, comparableRecovered, ...totals }) => ({
      ...totals,
      efficiency: comparableReceived > 0 ? (comparableRecovered / comparableReceived) * 100 : 0,
      hasEfficiency: comparableReceived > 0,
    }))
    .sort((a, b) => (a.unit === 'MT' ? -1 : b.unit === 'MT' ? 1 : a.unit.localeCompare(b.unit)));
}
