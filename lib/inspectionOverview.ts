import type { DarogaPerformance } from './apiClient';

export type InspectionInventoryRow = {
  module: 'TOILET' | 'LITTERBINS' | 'SWEEPING' | 'NALA' | 'TASKFORCE';
  wardId: string | null;
  zoneId: string | null;
  total: number;
};

export type PendingInspectionRow = Pick<InspectionInventoryRow, 'module' | 'wardId' | 'zoneId'> & { target: number; credit: number; pending: number };

/** Physical assets stay constant across dates; targets/credit are workload over the selected days. */
export function inspectionOverview({ inventory, users, module = 'ALL', zoneId = '', wardId = '', zoneName = '', days }: {
  inventory: InspectionInventoryRow[] | null;
  users: Record<string, DarogaPerformance> | null;
  module?: string;
  zoneId?: string;
  wardId?: string;
  zoneName?: string;
  days: number | null;
}) {
  const unavailable = { total: null, target: null, credit: null, pending: null, percent: null, percentTargets: [] as number[], pendingRows: [] as PendingInspectionRow[] };
  if (!inventory) return unavailable;
  const scoped = inventory.filter(row => (module === 'ALL' || row.module === module) && (!zoneId || row.zoneId === zoneId) && (!wardId || row.wardId === wardId));
  const total = scoped.reduce((sum, row) => sum + row.total, 0);
  if (!users || days === null) return { ...unavailable, total };

  const key = (module: string, ward: string | null) => `${module}|${ward ?? ''}`;
  const buckets = new Map<string, { module: InspectionInventoryRow['module']; wardId: string | null; zoneId: string | null; total: number; assigned: number; target: number; credit: number }>();
  scoped.forEach(row => {
    const id = key(row.module, row.wardId);
    const bucket = buckets.get(id) ?? { module: row.module, wardId: row.wardId, zoneId: row.zoneId, total: 0, assigned: 0, target: 0, credit: 0 };
    bucket.total += row.total;
    buckets.set(id, bucket);
  });
  const zoneOfWard = new Map(inventory.filter(row => row.wardId).map(row => [row.wardId!, row.zoneId]));
  const percents = new Set<number>();
  Object.values(users).forEach(user => (user.rows ?? []).forEach(row => {
    if (module !== 'ALL' && row.module !== module) return;
    if (wardId && row.wardId !== wardId) return;
    if (zoneId && zoneOfWard.get(row.wardId ?? '') !== zoneId && row.zoneName.trim().toLowerCase() !== zoneName.trim().toLowerCase()) return;
    const bucket = buckets.get(key(row.module, row.wardId));
    if (!bucket) return;
    bucket.assigned += row.assigned;
    bucket.target += row.target;
    bucket.credit += Math.min(row.credit, row.target);
    if (row.targetPercent != null) percents.add(row.targetPercent);
  }));
  let target = 0;
  let credit = 0;
  const round = (value: number) => Math.round(value * 100) / 100;
  const pendingRows: PendingInspectionRow[] = [];
  buckets.forEach(bucket => {
    // Inventory without an assigned Daroga still defaults to the full daily requirement.
    // A shared assignment must not make a city's physical asset due more than once per day.
    const scopeTarget = round(Math.min(bucket.total * days, bucket.target + Math.max(0, bucket.total - bucket.assigned) * days));
    const scopeCredit = round(Math.min(bucket.credit, scopeTarget));
    target += scopeTarget;
    credit += scopeCredit;
    const pending = round(Math.max(0, scopeTarget - scopeCredit));
    if (pending > 0) pendingRows.push({ module: bucket.module, wardId: bucket.wardId, zoneId: bucket.zoneId, target: scopeTarget, credit: scopeCredit, pending });
  });
  target = round(target);
  credit = round(Math.min(credit, target));
  return { total, target, credit, pending: round(Math.max(0, target - credit)), percent: target > 0 ? Math.min(100, credit / target * 100) : null, percentTargets: [...percents].sort((a, b) => a - b), pendingRows };
}

/** Same 800-day / future-day cap as Daroga performance; All Time has no target period. */
export function inspectionRangeDays(from: string, to: string, today: string): number | null {
  if (from === '2000-01-01') return null;
  const end = to < today ? to : today;
  return Math.max(0, Math.min(800, Math.round((Date.parse(end) - Date.parse(from)) / 86400000) + 1));
}

/** Inclusive local dates: a seven-day range is today plus the previous six dates. */
export function inspectionRollingRange(days: number, today = new Date()) {
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { start: format(start), end: format(today) };
}
