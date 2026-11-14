import { intelligenceSuggestion } from './intelligenceSuggestion';
import { canonicalModuleKey } from './moduleKeys';

export const DAROGA_WEIGHTS = { inspection: 40, cleaned: 40, attendance: 20 } as const;
const finite = (n: any): n is number => typeof n === 'number' && Number.isFinite(n);
const key = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const nameKey = (v: any) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface CleanedStats { cleaned: number; notCleaned: number; siDecided: number; aiSuggested: number; unassessed: number; total: number; score: number | null }

/** Cleaned vs not cleaned for one Daroga's reports: the SI decision where made, the AI suggestion while the report awaits SI review. */
export function darogaCleaned(visits: any[], darogaId: string, module = 'ALL'): CleanedStats {
  const out: CleanedStats = { cleaned: 0, notCleaned: 0, siDecided: 0, aiSuggested: 0, unassessed: 0, total: 0, score: null };
  const seen = new Set<string>();
  for (const v of visits) {
    if (seen.has(v.id) || v.raw?.submittedBy?.id !== darogaId || (module !== 'ALL' && canonicalModuleKey(v.module) !== canonicalModuleKey(module))) continue;
    seen.add(v.id); out.total++;
    // Corrective workflow status does not replace the permanent SI decision.
    const decision = String(v.raw?.qcDecision || '').toUpperCase();
    if (decision === 'APPROVED') { out.cleaned++; out.siDecided++; }
    else if (decision === 'REJECTED') { out.notCleaned++; out.siDecided++; }
    else {
      const outcome = intelligenceSuggestion({ ...v.raw, status: v.raw?.workspaceStatus || v.status }).outcome;
      if (outcome === 'CLEAN') { out.cleaned++; out.aiSuggested++; }
      else if (outcome === 'NOT_CLEAN') { out.notCleaned++; out.aiSuggested++; }
      else out.unassessed++;
    }
  }
  const d = out.cleaned + out.notCleaned;
  out.score = d > 0 ? out.cleaned / d * 100 : null;
  return out;
}

export interface AttendanceStats { presentDays: number; recordedDays: number; absentDays: number; score: number | null }

/** Match by employee ID first, then by a name that is unique among both users and attendance rows. Never guesses. */
export function darogaAttendance(user: { name: string; employeeId?: string }, daroga: { name: string }[], rows: any[]): AttendanceStats | null {
  let row = user.employeeId ? rows.filter(r => key(r.attendanceId) === key(user.employeeId)) : [];
  if (row.length !== 1) {
    const sameUsers = daroga.filter(d => nameKey(d.name) === nameKey(user.name));
    row = sameUsers.length === 1 ? rows.filter(r => nameKey(r.employeeName) === nameKey(user.name)) : [];
  }
  if (row.length !== 1) return null;
  const r = row[0], recorded = Number(r.totalDays), present = Number(r.presentDays);
  return { presentDays: present, recordedDays: recorded, absentDays: Number(r.absentDays) || 0, score: recorded > 0 ? present / recorded * 100 : null };
}

/** 40% inspection + 40% cleaned + 20% attendance; a part with no score is left out and the remaining weights are rescaled. */
export function darogaOverall(parts: { inspection: number | null | undefined; cleaned: number | null; attendance: number | null }) {
  let sum = 0, weight = 0;
  for (const k of Object.keys(DAROGA_WEIGHTS) as (keyof typeof DAROGA_WEIGHTS)[]) {
    const v = parts[k];
    if (finite(v)) { sum += v * DAROGA_WEIGHTS[k]; weight += DAROGA_WEIGHTS[k]; }
  }
  return weight ? { score: sum / weight, weightUsed: weight } : { score: null, weightUsed: 0 };
}
