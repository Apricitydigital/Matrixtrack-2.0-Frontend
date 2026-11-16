import type { AttendanceStats } from './darogaBreakdown';
export const IEC_WEIGHTS = { actions: 80, attendance: 20 } as const;
const valid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function iecPerformance(stat: any, attendance: AttendanceStats | null, pending = false) {
  const due = [stat?.onTime,stat?.late,stat?.overdue].every(valid) ? stat.onTime + stat.late + stat.overdue : null;
  const actions = !stat?.availability && !(stat?.timingUnavailable > 0) && due != null && due > 0 ? Math.min(100,stat.onTime / due * 100) : null;
  const att = attendance && attendance.recordedDays > 0 && valid(attendance.score) ? attendance.score : null;
  const parts = {actions,attendance:att};
  let total = 0, weightUsed = 0;
  for (const key of Object.keys(IEC_WEIGHTS) as (keyof typeof IEC_WEIGHTS)[]) {
    if (parts[key] != null) { total += parts[key]! * IEC_WEIGHTS[key]; weightUsed += IEC_WEIGHTS[key]; }
  }
  return {...parts,due,weightUsed,score:pending || stat?.availability ? null : weightUsed ? total / weightUsed : null};
}
