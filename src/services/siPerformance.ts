import type { AttendanceStats } from './darogaBreakdown';

export const SI_WEIGHTS = { reviews: 50, timing: 30, attendance: 20 } as const;
const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const ratio = (n: unknown, d: unknown) => valid(n) && valid(d) && d > 0 ? Math.min(100, n / d * 100) : null;

/** Use the existing target-window credit and SLA cohort; asset condition earns no extra credit. */
export function siPerformance(stat: any, attendance: AttendanceStats | null, pending = false) {
  const reviews = ratio(stat?.targetReviews?.counted, stat?.targetReviews?.target);
  const due = valid(stat?.onTime) && valid(stat?.late) && valid(stat?.overdue) ? stat.onTime + stat.late + stat.overdue : null;
  const timing = stat?.timingUnavailable > 0 ? null : ratio(stat?.onTime, due);
  const parts = { reviews, timing, attendance: attendance && attendance.recordedDays > 0 ? ratio(attendance.presentDays, attendance.selectedDays) : null };
  let total = 0, weight = 0;
  for (const key of Object.keys(SI_WEIGHTS) as (keyof typeof SI_WEIGHTS)[]) {
    const score = parts[key];
    if (score != null) { total += score * SI_WEIGHTS[key]; weight += SI_WEIGHTS[key]; }
  }
  return { ...parts, due, weightUsed: weight, score: pending || stat?.availability ? null : weight ? total / weight : null };
}
