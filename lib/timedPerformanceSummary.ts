type TimedCounters = {
  due: number; onTime: number; late: number; overdue: number; inProgress: number; backlogOverdue: number;
  avgTurnaroundHours?: number | null; avgResolutionHours?: number | null;
  oldestPendingDays?: number | null; estimated?: number;
};
export type TimedSummaryRow = {
  performance: number | null;
  si?: TimedCounters | null;
  iec?: TimedCounters | null;
};

/** User-scope totals. Backlog is already included in overdue, never added twice. */
export function timedPerformanceSummary(rows: TimedSummaryRow[], allModules: boolean) {
  const available = rows.map(row => row.si ?? row.iec).filter((entry): entry is TimedCounters => Boolean(entry) && ['due', 'onTime', 'late', 'overdue', 'inProgress', 'backlogOverdue'].every(key => Number.isFinite(entry?.[key as keyof TimedCounters])));
  const sum = (key: 'due' | 'onTime' | 'late' | 'overdue' | 'inProgress' | 'backlogOverdue') => available.reduce((total, entry) => total + entry[key], 0);
  const due = sum('due'), onTime = sum('onTime'), late = sum('late'), overdue = sum('overdue');
  const hours = available.map(entry => entry.avgTurnaroundHours ?? entry.avgResolutionHours).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const ages = available.map(entry => entry.oldestPendingDays).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return {
    users: rows.length, available: available.length, unavailable: rows.length - available.length,
    scoredUsers: available.filter(entry => entry.due > 0).length,
    overdueUsers: available.filter(entry => entry.overdue > 0).length,
    due, onTime, late, overdue, inProgress: sum('inProgress'), backlogOverdue: sum('backlogOverdue'),
    rate: due > 0 ? onTime / due * 100 : null,
    consistent: due === onTime + late + overdue,
    avgHours: allModules && hours.length ? hours.reduce((total, hours) => total + hours, 0) / hours.length : null,
    oldestDays: allModules && ages.length ? Math.max(...ages) : null,
    estimated: allModules ? available.reduce((total, entry) => total + (entry.estimated ?? 0), 0) : null,
  };
}
