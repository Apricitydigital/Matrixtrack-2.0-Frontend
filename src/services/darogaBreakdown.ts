import { intelligenceSuggestion } from './intelligenceSuggestion';
import { inspectionStatus } from './inspectionStatus';

export const DAROGA_WEIGHTS = { inspection: 40, cleaned: 40, attendance: 20 } as const;
const finite = (n: any): n is number => typeof n === 'number' && Number.isFinite(n);
const key = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const nameKey = (v: any) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface CleanedStats { cleaned: number; notCleaned: number; siDecided: number; aiSuggested: number; unassessed: number; total: number; score: number | null }

/** Cleaned vs not cleaned for one Daroga's reports: the SI decision where made, the AI suggestion while the report awaits SI review. */
export function darogaCleaned(visits: any[], darogaId: string): CleanedStats {
  const out: CleanedStats = { cleaned: 0, notCleaned: 0, siDecided: 0, aiSuggested: 0, unassessed: 0, total: 0, score: null };
  const seen = new Set<string>();
  for (const v of visits) {
    if (seen.has(v.id) || v.raw?.submittedBy?.id !== darogaId) continue;
    seen.add(v.id); out.total++;
    const status = inspectionStatus(v.status);
    if (status === 'approved') { out.cleaned++; out.siDecided++; }
    else if (['rejected', 'action_required', 'action_taken', 'escalated'].includes(status)) { out.notCleaned++; out.siDecided++; }
    else if (status === 'pending_review') {
      const outcome = intelligenceSuggestion({ ...v.raw, status: v.raw?.workspaceStatus || v.status }).outcome;
      if (outcome === 'CLEAN') { out.cleaned++; out.aiSuggested++; }
      else if (outcome === 'NOT_CLEAN') { out.notCleaned++; out.aiSuggested++; }
      else out.unassessed++;
    } else out.unassessed++;
  }
  const d = out.cleaned + out.notCleaned;
  out.score = d > 0 ? out.cleaned / d * 100 : null;
  return out;
}

export interface AttendanceStats { presentDays: number; recordedDays: number; absentDays: number; score: number | null }

const loose = (v: any) => String(v || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\b(mr|mrs|ms|shri|smt|sh|dr)\b/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const digits = (v: any) => String(v || '').replace(/\D/g, '').replace(/^0+/, '');

/**
 * Finds this Daroga's attendance row. Tried in order: the server-side link (Aadhaar / name), employee ID,
 * phone or ID digits, exact name, then name ignoring order, titles and punctuation. A step is used only
 * when it points at exactly one attendance row, so two people are never merged.
 */
export function darogaAttendance(user: { id?: string; name: string; employeeId?: string; phone?: string; aadhaar?: string }, _daroga: { name: string }[], rows: any[]): AttendanceStats | null {
  const steps: ((r: any) => boolean)[] = [
    r => !!user.id && r.matrixTrackUserId === user.id,
    r => { const u = digits(user.aadhaar), a = digits(r.attendanceId); return u.length >= 8 && a.length >= 8 && (a.endsWith(u.slice(-8)) || u.endsWith(a)); },
    r => !!user.employeeId && key(r.attendanceId) === key(user.employeeId),
    r => { const a = digits(r.attendanceId), e = digits(user.employeeId), p = digits(user.phone).slice(-10); return a.length >= 6 && ((e.length >= 6 && (a.endsWith(e) || e.endsWith(a))) || (p.length === 10 && (a.includes(p) || p.endsWith(a)))); },
    r => nameKey(r.employeeName) === nameKey(user.name),
    r => loose(user.name) !== '' && loose(r.employeeName) === loose(user.name)
  ];
  let row: any[] = [];
  for (const step of steps) { const found = rows.filter(step); if (found.length === 1) { row = found; break; } }
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
