/*
 * Role performance formulas shared by the Commissioner "User Performance"
 * page and the dashboard's Team Leaderboard, so both always show the same %.
 * All inputs come from the backend (/city/users/{daroga,si,iec}-performance).
 *
 *   Daroga : assigned asset-days inspected / assigned assets x days
 *   SI     : reviewed / (reviewed + pending review, incl. older backlog)
 *   IEC    : resolved / attention required (incl. older unresolved backlog)
 */
import type { DarogaPerformance, IecPerformance, SiPerformance } from './apiClient';

export type ScoreModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING';
export type ScoreModuleFilter = 'ALL' | ScoreModuleKey;

const SCORE_MODULES: ScoreModuleKey[] = ['TOILET', 'LITTERBINS', 'SWEEPING'];

/** A dashboard module filter mapped to one of the scored modules ('ALL' otherwise). */
export function scoreModuleFilter(value: string | null | undefined): ScoreModuleFilter {
  return SCORE_MODULES.includes(value as ScoreModuleKey) ? (value as ScoreModuleKey) : 'ALL';
}

/** Query params for the performance endpoints: the full local days of the range. */
export function performanceRangeParams(from?: string, to?: string) {
  return {
    startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    endDate: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    tzOffset: new Date().getTimezoneOffset(),
  };
}

/* ---------------------------------------------------------------- Daroga */

export function restrictDarogaModules(data: DarogaPerformance, module: ScoreModuleFilter): DarogaPerformance {
  if (module === 'ALL') return data;
  const kept = data.modules[module];
  const modules = Object.fromEntries(
    SCORE_MODULES.map((key) => [
      key,
      key === module ? kept : { assigned: data.modules[key].assigned, required: data.days === null ? null : 0, completed: 0 },
    ])
  ) as DarogaPerformance['modules'];
  return {
    ...data,
    modules,
    required: kept.required,
    completed: kept.completed,
    performance: kept.required ? Math.min(100, (kept.completed / kept.required) * 100) : null,
  };
}

export function darogaScore(data: DarogaPerformance | null | undefined): number | null {
  return data?.performance ?? null;
}

/* ---------------------------------------------------------------- SI */

export function restrictSiModules(data: SiPerformance, module: ScoreModuleFilter): SiPerformance {
  if (module === 'ALL') return data;
  const empty = { reports: [], cleaned: [], notCleaned: [], pendingReview: [], carriedOverPending: [] };
  return {
    ...data,
    modules: {
      TOILET: module === 'TOILET' ? data.modules.TOILET : empty,
      LITTERBINS: module === 'LITTERBINS' ? data.modules.LITTERBINS : empty,
      SWEEPING: module === 'SWEEPING' ? data.modules.SWEEPING : empty,
    },
  };
}

export function siScore(data: SiPerformance | null | undefined): number | null {
  if (!data) return null;
  let reviewed = 0;
  let pending = 0;
  SCORE_MODULES.forEach((module) => {
    reviewed += data.modules[module].cleaned.length + data.modules[module].notCleaned.length;
    pending += data.modules[module].pendingReview.length;
  });
  return reviewed + pending > 0 ? (reviewed / (reviewed + pending)) * 100 : null;
}

/* ---------------------------------------------------------------- IEC */

export function restrictIecModules(data: IecPerformance, module: ScoreModuleFilter): IecPerformance {
  if (module === 'ALL') return data;
  const empty = { attentionRequired: [], resolved: [], resolutionPending: [], carriedOverPending: [] };
  return {
    ...data,
    modules: {
      TOILET: module === 'TOILET' ? data.modules.TOILET : empty,
      LITTERBINS: module === 'LITTERBINS' ? data.modules.LITTERBINS : empty,
      SWEEPING: module === 'SWEEPING' ? data.modules.SWEEPING : empty,
    },
  };
}

export function iecScore(data: IecPerformance | null | undefined): number | null {
  if (!data) return null;
  let attention = 0;
  let resolved = 0;
  SCORE_MODULES.forEach((module) => {
    attention += data.modules[module].attentionRequired.length;
    resolved += data.modules[module].resolved.length;
  });
  return attention > 0 ? (resolved / attention) * 100 : null;
}
