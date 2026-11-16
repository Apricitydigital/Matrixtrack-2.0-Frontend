import { darogaCleaned } from './darogaBreakdown';
import { performanceForRole } from './performanceModel';
import { intelligenceSuggestion } from './intelligenceSuggestion';
import { visitCleanliness } from './cleanliness';
import type { InspectionVisit } from './inspectionCoverage';
import type { MapAsset } from './operationsMap';

/**
 * Intelligence suggestions: rule-based coaching drawn only from recorded figures
 * (target credit, SI decisions, saved AI analysis, location assignments). Nothing is estimated or invented;
 * a rule fires only when its evidence exists.
 */
export type AdviceRole = 'SUPERVISOR' | 'QC' | 'ACTION_OFFICER';
export type AdviceSeverity = 'critical' | 'warning' | 'good';
export interface Advice { title: string; detail: string; evidence?: string[] }
export interface OfficerAdvice {
  id: string; name: string; role: AdviceRole; score: number | null; severity: AdviceSeverity;
  metrics: { label: string; value: string }[]; suggestions: Advice[]; strengths: string[];
}
interface Person { id: string; name?: string; role?: string; assignedWardIds?: string[]; assignedZoneIds?: string[]; moduleAssignments?: { wardIds: string[]; zoneIds: string[] }[] }
interface Input {
  visits: InspectionVisit[]; assets: MapAsset[]; performance?: Record<string, any>; users: Person[];
  wards: { id: string; name: string; zoneId: string }[]; zoneIds?: string[]; wardIds?: string[]; from?: string; to?: string;
}

const pct = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? '—' : `${Math.round(n * 10) / 10}%`;
const fmt = (n: number) => n.toLocaleString('en-IN');
const finite = (n: any): n is number => typeof n === 'number' && Number.isFinite(n);
const severityOf = (score: number | null): AdviceSeverity => score == null ? 'warning' : score < 40 ? 'critical' : score < 60 ? 'warning' : 'good';

function inScope(user: Person | undefined, rows: any[] | undefined, visits: InspectionVisit[], input: Input, wardZone: Map<string, string>) {
  const zones = input.zoneIds || [], wards = input.wardIds || [];
  if (!zones.length && !wards.length) return true;
  if (visits.length) return true;
  const ok = (wardId: string) => (!wards.length || wards.includes(wardId)) && (!zones.length || zones.includes(wardZone.get(wardId) || ''));
  if (rows?.some(r => r.wardId && ok(r.wardId))) return true;
  const assigned = [...(user?.assignedWardIds || []), ...(user?.moduleAssignments || []).flatMap(m => m.wardIds || [])];
  if (assigned.some(ok)) return true;
  const assignedZones = [...(user?.assignedZoneIds || []), ...(user?.moduleAssignments || []).flatMap(m => m.zoneIds || [])];
  return !wards.length && assignedZones.some(z => zones.includes(z));
}

function darogaAdvice(id: string, input: Input, wardName: (id: string) => string, days: number): OfficerAdvice | null {
  const stat = performanceForRole(input.performance?.[id], 'SUPERVISOR');
  const mine = input.visits.filter(v => v.raw?.submittedBy?.id === id);
  if (!stat && !mine.length) return null;
  const user = input.users.find(u => u.id === id);
  const name = user?.name || mine.find(v => v.raw?.submittedBy?.name)?.raw?.submittedBy?.name || stat?.name || 'Daroga';
  const target = finite(stat?.performance) ? stat.performance : null;
  const clean = darogaCleaned(mine, id);
  const parts = [target, clean.score].filter(finite);
  const score = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
  const suggestions: Advice[] = [], strengths: string[] = [];

  // 1. Target pace.
  if (target != null && finite(stat?.required) && stat.required > 0) {
    const gap = Math.max(0, stat.required - (stat.completed || 0));
    if (target < 60 && gap > 0) suggestions.push({ title: 'Raise the daily inspection count',
      detail: `Completed ${fmt(stat.completed || 0)} of ${fmt(stat.required)} target inspections (${pct(target)}). ${fmt(gap)} more were needed${days > 1 ? ` — about ${fmt(Math.ceil(gap / days))} extra per day over ${days} days` : ''}. Plan a fixed daily beat route that reaches every assigned location before the day ends.` });
    else if (target >= 90) strengths.push(`Meets the inspection target (${pct(target)}).`);
    const missed = (stat.daily || []).filter((d: any) => finite(d.target) && d.target > 0 && !(d.credit > 0)).length;
    if (missed >= 2) suggestions.push({ title: 'Avoid days with no inspections',
      detail: `${missed} days had a target but no credited inspection. Even on short-staffed days, inspect the highest-footfall locations first so the day is not lost.` });
  }

  // 2. Assigned locations never visited, and repeat visits that could have gone there.
  const assigned = input.assets.filter(a => (a.supervisors || []).some((s: any) => s?.id === id));
  if (assigned.length) {
    const visited = new Set(input.visits.filter(v => v.assetId).map(v => `${v.module}:${v.assetId}`));
    const missing = assigned.filter(a => !visited.has(`${a.module}:${a.id}`));
    const unique = new Set(mine.filter(v => v.assetId).map(v => `${v.module}:${v.assetId}`)).size;
    const repeats = mine.filter(v => v.assetId).length - unique;
    if (missing.length) suggestions.push({ title: 'Cover the locations that were skipped',
      detail: `${fmt(missing.length)} of ${fmt(assigned.length)} assigned locations had no inspection in these dates.${repeats > missing.length / 2 && repeats > 2 ? ` Meanwhile ${fmt(repeats)} visits were repeats of already-inspected locations — redirect those visits to the skipped ones.` : ''}`,
      evidence: missing.slice(0, 5).map(a => `${a.name || a.id}${a.wardId ? ` · ${wardName(a.wardId)}` : ''}`) });
    else strengths.push(`Inspected all ${fmt(assigned.length)} assigned locations.`);
  }

  // 3. Cleanliness of the locations this officer inspects (SI decision, else AI suggestion).
  const assessed = clean.cleaned + clean.notCleaned;
  if (clean.score != null && assessed >= 3 && clean.score < 60) {
    const byWard = new Map<string, number>();
    for (const v of mine) if (visitCleanliness(v).verdict === 'not_clean') byWard.set(v.wardId, (byWard.get(v.wardId) || 0) + 1);
    const worst = [...byWard].sort((a, b) => b[1] - a[1]).slice(0, 3);
    suggestions.push({ title: 'Fix cleanliness at problem locations',
      detail: `${fmt(clean.notCleaned)} of ${fmt(assessed)} assessed inspections were not clean (${pct(100 - clean.score)}).${worst.length ? ` Most were in ${worst.map(([w, n]) => `${wardName(w)} (${n})`).join(', ')}.` : ''} Brief the sweeping staff for these areas, confirm the work, then re-inspect.` });
  } else if (clean.score != null && assessed >= 3 && clean.score >= 85) strengths.push(`${pct(clean.score)} of assessed inspections were clean.`);

  // 4. Saved AI analysis on this officer's reports.
  let analysed = 0, unclear = 0, aiFlagged = 0;
  for (const v of mine) {
    const sug = intelligenceSuggestion({ ...v.raw, status: v.raw?.workspaceStatus || v.status }), outcome = sug.outcome;
    if (outcome === 'AWAITING_AI') continue;
    analysed++;
    if (sug.unclear) unclear++;
    if (outcome === 'NOT_CLEAN' && visitCleanliness(v).source === 'ai') aiFlagged++;
  }
  if (aiFlagged >= 2) suggestions.push({ title: 'Act on AI-flagged reports before SI review',
    detail: `AI analysis marks ${fmt(aiFlagged)} of this officer's reports that are still awaiting SI review as not clean. Get those locations cleaned now so the SI review finds them clean.` });
  if (analysed >= 5 && unclear / analysed > 0.3) suggestions.push({ title: 'Take clearer inspection photos',
    detail: `AI could not judge ${fmt(unclear)} of ${fmt(analysed)} photo sets (${pct(unclear / analysed * 100)}). Photograph the whole area in daylight, hold the phone steady and keep people and vehicles out of the frame.` });

  return { id, name, role: 'SUPERVISOR', score, severity: severityOf(score), suggestions, strengths,
    metrics: [{ label: 'Target achievement', value: pct(target) }, { label: 'Clean inspections', value: pct(clean.score) }, { label: 'Reports in period', value: fmt(mine.length) }] };
}

function reviewerAdvice(id: string, role: 'QC' | 'ACTION_OFFICER', input: Input): OfficerAdvice | null {
  const stat = performanceForRole(input.performance?.[id], role);
  if (!stat) return null;
  const user = input.users.find(u => u.id === id);
  const name = user?.name || stat.name || (role === 'QC' ? 'SI' : 'IEC');
  const score = finite(stat.performance) ? stat.performance : null;
  const suggestions: Advice[] = [], strengths: string[] = [];
  const due = finite(stat.due) ? stat.due : null, late = finite(stat.late) ? stat.late : 0, overdue = finite(stat.overdue) ? stat.overdue : 0;
  const what = role === 'QC' ? 'reviews' : 'corrective actions';
  if (score != null && score < 60) suggestions.push({ title: role === 'QC' ? 'Clear the review backlog daily' : 'Close corrective actions on time',
    detail: `${role === 'QC' ? 'Review' : 'Action'} performance is ${pct(score)}.${due != null ? ` Of ${fmt(due)} ${what} due, ${fmt(late)} were late and ${fmt(overdue)} are overdue.` : ''} Set a fixed daily slot and finish everything received the previous day first.` });
  else if (score != null && score >= 90) strengths.push(`${role === 'QC' ? 'Reviews' : 'Actions'} are on track (${pct(score)}).`);
  if (finite(stat.oldestPendingDays) && stat.oldestPendingDays > 2) suggestions.push({ title: 'Start with the oldest items',
    detail: `The oldest pending item has waited ${fmt(Math.round(stat.oldestPendingDays))} days. Work oldest-first so nothing ages past the deadline.` });
  if (role === 'QC' && finite(stat.inProgress) && stat.inProgress > 20) suggestions.push({ title: 'Use AI suggestions to prioritise',
    detail: `${fmt(stat.inProgress)} reports are waiting. Open the reports AI marks as not clean first; they are the most likely to need corrective action.` });
  return { id, name, role, score, severity: severityOf(score), suggestions, strengths,
    metrics: [{ label: role === 'QC' ? 'Review performance' : 'Action performance', value: pct(score) }, ...(due != null ? [{ label: 'Due', value: fmt(due) }, { label: 'Late / overdue', value: `${fmt(late)} / ${fmt(overdue)}` }] : [])] };
}

/** Officers in scope with suggestions, weakest first. Officers without evidence are left out. */
export function officerAdvice(input: Input, roles: AdviceRole[] = ['SUPERVISOR', 'QC', 'ACTION_OFFICER'], performanceByRole: Record<string, Record<string, any> | undefined> = {}): OfficerAdvice[] {
  const wardZone = new Map(input.wards.map(w => [w.id, w.zoneId])), wardNames = new Map(input.wards.map(w => [w.id, w.name]));
  const wardName = (id: string) => wardNames.get(id) || 'Ward not recorded';
  const days = input.from && input.to ? Math.max(1, Math.round((Date.parse(input.to) - Date.parse(input.from)) / 86400000) + 1) : 1;
  const out: OfficerAdvice[] = [];
  for (const role of roles) {
    const performance = performanceByRole[role];
    const ids = new Set(Object.keys(performance || {}));
    if (role === 'SUPERVISOR') for (const v of input.visits) if (v.raw?.submittedBy?.id && (!v.raw?.submittedBy?.role || v.raw.submittedBy.role === 'SUPERVISOR')) ids.add(v.raw.submittedBy.id);
    for (const id of ids) {
      const user = input.users.find(u => u.id === id);
      if (user?.role && user.role !== role) continue;
      const mine = role === 'SUPERVISOR' ? input.visits.filter(v => v.raw?.submittedBy?.id === id) : [];
      if (!inScope(user, performance?.[id]?.rows, mine, input, wardZone)) continue;
      const advice = role === 'SUPERVISOR' ? darogaAdvice(id, { ...input, performance }, wardName, days) : reviewerAdvice(id, role, { ...input, performance });
      if (advice) out.push(advice);
    }
  }
  const rank = { critical: 0, warning: 1, good: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.score ?? 101) - (b.score ?? 101) || a.name.localeCompare(b.name));
}
