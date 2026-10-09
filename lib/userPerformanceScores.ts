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

export type ScoreModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING' | 'NALA' | 'TASKFORCE';
export type ScoreModuleFilter = 'ALL' | ScoreModuleKey;

const SCORE_MODULES: ScoreModuleKey[] = ['TOILET', 'LITTERBINS', 'SWEEPING', 'NALA', 'TASKFORCE'];

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
  const kept = data.modules[module] || { assigned: 0, required: data.days === null ? null : 0, completed: 0 };
  const modules = Object.fromEntries(
    SCORE_MODULES.filter((key) => data.modules[key]).map((key) => [
      key,
      key === module ? kept : { assigned: data.modules[key]!.assigned, required: data.days === null ? null : 0, completed: 0 },
    ])
  ) as DarogaPerformance['modules'];
  const daily = (data.daily || []).map((day) => {
    const entry = day.modules[module];
    return { date: day.date, target: entry?.target ?? 0, credit: entry?.credit ?? 0, modules: entry ? { [module]: entry } : {} };
  });
  const withTarget = daily.filter((day) => day.target > 0);
  return {
    ...data,
    modules,
    required: kept.required,
    completed: kept.completed,
    performance: kept.required ? Math.min(100, (kept.completed / kept.required) * 100) : null,
    daily,
    rows: (data.rows || []).filter((row) => row.module === module),
    periods: (data.periods || []).filter((period) => period.module === module),
    daysMet: withTarget.filter((day) => day.credit >= day.target - 1e-9).length,
    daysWithTarget: withTarget.length,
  };
}

/** Achievement tier for a Daroga's target score (agreed labels). */
export function darogaTier(score: number | null | undefined): { label: string; tone: string } {
  if (score === null || score === undefined) return { label: 'No target', tone: 'border-slate-200 bg-slate-50 text-slate-500' };
  if (score >= 99.995) return { label: 'Target met', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  if (score >= 80) return { label: 'On track', tone: 'border-blue-200 bg-blue-50 text-blue-700' };
  return { label: 'Needs attention', tone: 'border-rose-200 bg-rose-50 text-rose-700' };
}

/** Calendar/analytics derived from the per-day target data. */
export function darogaAnalytics(daily: DarogaPerformance['daily'] | undefined) {
  const days = (daily || []).filter((day) => day.target > 0);
  const met = (day: { target: number; credit: number }) => day.credit >= day.target - 1e-9;

  let longest = 0;
  let run = 0;
  days.forEach((day) => {
    run = met(day) ? run + 1 : 0;
    longest = Math.max(longest, run);
  });
  // The current streak ignores today while it is still in progress.
  let current = 0;
  const todayKey = new Date();
  const todayStr = `${todayKey.getFullYear()}-${String(todayKey.getMonth() + 1).padStart(2, '0')}-${String(todayKey.getDate()).padStart(2, '0')}`;
  const settled = days.filter((day) => day.date < todayStr || met(day));
  for (let i = settled.length - 1; i >= 0 && met(settled[i]); i -= 1) current += 1;

  const weekday = Array.from({ length: 7 }, () => ({ target: 0, credit: 0 }));
  days.forEach((day) => {
    const index = new Date(`${day.date}T00:00:00`).getDay();
    weekday[index].target += day.target;
    weekday[index].credit += day.credit;
  });

  return {
    daysWithTarget: days.length,
    daysMet: days.filter(met).length,
    consistency: days.length ? (days.filter(met).length / days.length) * 100 : null,
    currentStreak: current,
    longestStreak: longest,
    weekday: weekday.map((entry) => (entry.target ? (entry.credit / entry.target) * 100 : null)),
  };
}

export function darogaScore(data: DarogaPerformance | null | undefined): number | null {
  return data?.performance ?? null;
}

/* ---------------------------------------------------------------- SI */

export function restrictSiModules(data: SiPerformance, module: ScoreModuleFilter): SiPerformance {
  if (module === 'ALL') return data;
  const empty = { reports: [], cleaned: [], notCleaned: [], pendingReview: [], carriedOverPending: [] };

  // On-time numbers: keep only the chosen module.
  const stats = data.moduleStats?.[module];
  const kept = stats ?? { arrived: 0, onTime: 0, late: 0, overdue: 0, inProgress: 0, backlogOverdue: 0 };
  const due = kept.onTime + kept.late + kept.overdue;
  const daily = (data.daily || []).map((day) => {
    const entry = day.modules[module];
    return {
      date: day.date,
      arrived: entry?.arrived ?? 0,
      onTime: entry?.onTime ?? 0,
      late: entry?.late ?? 0,
      overdue: entry?.overdue ?? 0,
      inProgress: entry?.inProgress ?? 0,
      modules: entry ? { [module]: entry } : {},
    };
  });
  return {
    ...data,
    performance: due > 0 ? (kept.onTime / due) * 100 : null,
    due,
    onTime: kept.onTime,
    late: kept.late,
    overdue: kept.overdue,
    inProgress: kept.inProgress,
    backlogOverdue: kept.backlogOverdue,
    moduleStats: stats ? { [module]: stats } : {},
    daily,
    modules: {
      TOILET: module === 'TOILET' ? data.modules.TOILET : empty,
      LITTERBINS: module === 'LITTERBINS' ? data.modules.LITTERBINS : empty,
      SWEEPING: module === 'SWEEPING' ? data.modules.SWEEPING : empty,
      NALA: module === 'NALA' ? data.modules.NALA || empty : empty,
      TASKFORCE: module === 'TASKFORCE' ? data.modules.TASKFORCE || empty : empty,
    },
  };
}

/** On-time review rate: reviewed inside the SLA / reports whose SLA has ended. */
export function siScore(data: SiPerformance | null | undefined): number | null {
  if (!data) return null;
  if (data.performance !== undefined) return data.performance;
  // Older backend without on-time data: reviewed / (reviewed + pending).
  let reviewed = 0;
  let pending = 0;
  SCORE_MODULES.forEach((module) => {
    const buckets = data.modules[module];
    if (!buckets) return;
    reviewed += buckets.cleaned.length + buckets.notCleaned.length;
    pending += buckets.pendingReview.length;
  });
  return reviewed + pending > 0 ? (reviewed / (reviewed + pending)) * 100 : null;
}

/* ---------------------------------------------------------------- IEC */

export function restrictIecModules(data: IecPerformance, module: ScoreModuleFilter): IecPerformance {
  if (module === 'ALL') return data;
  const empty = { attentionRequired: [], resolved: [], resolutionPending: [], carriedOverPending: [] };

  // On-time numbers: keep only the chosen module.
  const stats = data.moduleStats?.[module];
  const kept = stats ?? { arrived: 0, onTime: 0, late: 0, overdue: 0, inProgress: 0, backlogOverdue: 0 };
  const due = kept.onTime + kept.late + kept.overdue;
  const daily = (data.daily || []).map((day) => {
    const entry = day.modules[module];
    return {
      date: day.date,
      arrived: entry?.arrived ?? 0,
      onTime: entry?.onTime ?? 0,
      late: entry?.late ?? 0,
      overdue: entry?.overdue ?? 0,
      inProgress: entry?.inProgress ?? 0,
      modules: entry ? { [module]: entry } : {},
    };
  });
  return {
    ...data,
    performance: due > 0 ? (kept.onTime / due) * 100 : null,
    due,
    onTime: kept.onTime,
    late: kept.late,
    overdue: kept.overdue,
    inProgress: kept.inProgress,
    backlogOverdue: kept.backlogOverdue,
    moduleStats: stats ? { [module]: stats } : {},
    daily,
    modules: {
      TOILET: module === 'TOILET' ? data.modules.TOILET : empty,
      LITTERBINS: module === 'LITTERBINS' ? data.modules.LITTERBINS : empty,
      SWEEPING: module === 'SWEEPING' ? data.modules.SWEEPING : empty,
      NALA: module === 'NALA' ? data.modules.NALA || empty : empty,
      TASKFORCE: module === 'TASKFORCE' ? data.modules.TASKFORCE || empty : empty,
    },
  };
}

/** On-time resolution rate: resolved inside the deadline / reports whose deadline has passed. */
export function iecScore(data: IecPerformance | null | undefined): number | null {
  if (!data) return null;
  if (data.performance !== undefined) return data.performance;
  // Older backend without on-time data: resolved / attention required.
  let attention = 0;
  let resolved = 0;
  SCORE_MODULES.forEach((module) => {
    const buckets = data.modules[module];
    if (!buckets) return;
    attention += buckets.attentionRequired.length;
    resolved += buckets.resolved.length;
  });
  return attention > 0 ? (resolved / attention) * 100 : null;
}

/** Calendar / analytics derived from the SI's per-arrival-day data. */
export function siAnalytics(daily: SiPerformance['daily'] | undefined) {
  // A day counts once at least one of its reports has reached its SLA.
  const days = (daily || []).filter((day) => day.onTime + day.late + day.overdue > 0);
  const closed = (day: { onTime: number; late: number; overdue: number }) => day.onTime + day.late + day.overdue;
  const allOnTime = (day: { onTime: number; late: number; overdue: number }) => day.onTime === closed(day);

  let longest = 0;
  let run = 0;
  days.forEach((day) => {
    run = allOnTime(day) ? run + 1 : 0;
    longest = Math.max(longest, run);
  });
  let current = 0;
  for (let i = days.length - 1; i >= 0 && allOnTime(days[i]); i -= 1) current += 1;

  const weekday = Array.from({ length: 7 }, () => ({ onTime: 0, closed: 0 }));
  days.forEach((day) => {
    const index = new Date(`${day.date}T00:00:00`).getDay();
    weekday[index].onTime += day.onTime;
    weekday[index].closed += closed(day);
  });

  return {
    daysTracked: days.length,
    daysAllOnTime: days.filter(allOnTime).length,
    consistency: days.length ? (days.filter(allOnTime).length / days.length) * 100 : null,
    currentStreak: current,
    longestStreak: longest,
    weekday: weekday.map((entry) => (entry.closed ? (entry.onTime / entry.closed) * 100 : null)),
  };
}
