import { intelligenceSuggestion } from './intelligenceSuggestion';
import { inspectionStatus } from './inspectionStatus';
import type { InspectionCoverage, InspectionVisit } from './inspectionCoverage';
import type { MapAsset } from './operationsMap';

/**
 * Cleanliness of one inspection, using the same rule as Daroga scoring (darogaCleaned):
 * the SI decision where one was made, otherwise the saved AI suggestion. AI never overrides an SI decision.
 */
export type CleanSource = 'si' | 'ai' | null;
export function visitCleanliness(v: Pick<InspectionVisit, 'status' | 'raw'>): { verdict: 'clean' | 'not_clean' | 'unassessed'; source: CleanSource } {
  const decision = String(v.raw?.qcDecision || '').toUpperCase();
  if (decision === 'APPROVED' || decision === 'VERIFIED_CLEAN') return { verdict: 'clean', source: 'si' };
  if (decision === 'REJECTED' || decision === 'INCOMPLETE_WORK') return { verdict: 'not_clean', source: 'si' };
  const status = inspectionStatus(v.raw?.workspaceStatus || v.status);
  if (status === 'approved') return { verdict: 'clean', source: 'si' };
  if (status === 'rejected') return { verdict: 'not_clean', source: 'si' };
  const outcome = intelligenceSuggestion({ ...v.raw, status: v.raw?.workspaceStatus || v.status }).outcome;
  if (outcome === 'CLEAN') return { verdict: 'clean', source: 'ai' };
  if (outcome === 'NOT_CLEAN') return { verdict: 'not_clean', source: 'ai' };
  return { verdict: 'unassessed', source: null };
}

export interface CleanStats {
  inspections: number; clean: number; notClean: number; unassessed: number;
  siClean: number; siNotClean: number; aiClean: number; aiNotClean: number;
  /** Clean share of assessed inspections (SI + AI). */
  percent: number | null;
  /** Clean share of SI decisions only. */
  siPercent: number | null;
}
const empty = (): CleanStats => ({ inspections: 0, clean: 0, notClean: 0, unassessed: 0, siClean: 0, siNotClean: 0, aiClean: 0, aiNotClean: 0, percent: null, siPercent: null });
const finish = (s: CleanStats) => {
  const assessed = s.clean + s.notClean, si = s.siClean + s.siNotClean;
  s.percent = assessed ? s.clean / assessed * 100 : null;
  s.siPercent = si ? s.siClean / si * 100 : null;
  return s;
};
const unique = (visits: InspectionVisit[]) => [...new Map(visits.map(v => [v.id, v])).values()];

export function cleanlinessStats(visits: InspectionVisit[]): CleanStats {
  const s = empty();
  for (const v of unique(visits)) {
    s.inspections++;
    const { verdict, source } = visitCleanliness(v);
    if (verdict === 'clean') { s.clean++; if (source === 'si') s.siClean++; else s.aiClean++; }
    else if (verdict === 'not_clean') { s.notClean++; if (source === 'si') s.siNotClean++; else s.aiNotClean++; }
    else s.unassessed++;
  }
  return finish(s);
}

/** Classify each inspection once for the four dashboard breakdowns. */
export function cleanlinessOverview(visits: InspectionVisit[]) {
  const total=empty(), module=new Map<string,CleanStats>(), zoneId=new Map<string,CleanStats>(), wardId=new Map<string,CleanStats>();
  const groups={module,zoneId,wardId};
  for(const v of unique(visits)) {
    const result=visitCleanliness(v),targets=[total];
    for(const key of ['module','zoneId','wardId'] as const){const id=v[key];if(!id)continue;let s=groups[key].get(id);if(!s){s=empty();groups[key].set(id,s);}targets.push(s);}
    for(const s of targets){s.inspections++;if(result.verdict==='clean'){s.clean++;if(result.source==='si')s.siClean++;else s.aiClean++;}else if(result.verdict==='not_clean'){s.notClean++;if(result.source==='si')s.siNotClean++;else s.aiNotClean++;}else s.unassessed++;}
  }
  finish(total);for(const group of Object.values(groups))for(const s of group.values())finish(s);
  return {total,...groups};
}

/** Cleanliness grouped by module, zone or ward. Records without the grouping field are skipped. */
export function cleanlinessBy(visits: InspectionVisit[], key: 'module' | 'zoneId' | 'wardId'): Map<string, CleanStats> {
  const groups = new Map<string, InspectionVisit[]>();
  for (const v of unique(visits)) { const id = String(v[key] || ''); if (!id) continue; const list = groups.get(id) || []; list.push(v); groups.set(id, list); }
  return new Map([...groups].map(([id, list]) => [id, cleanlinessStats(list)]));
}

/** Locations most often found not clean, newest finding first. */
export function notCleanLocations(data: Pick<InspectionCoverage, 'assets' | 'visits'>, visits: InspectionVisit[], limit = 8) {
  const assets = new Map(data.assets.map(a => [`${a.module}:${a.id}`, a]));
  const rows = new Map<string, { key: string; name: string; module: string; wardId: string; zoneId: string; count: number; last: string; source: CleanSource }>();
  for (const v of unique(visits)) {
    const c = visitCleanliness(v);
    if (c.verdict !== 'not_clean') continue;
    const key = `${v.module}:${v.assetId || v.id}`, asset = assets.get(`${v.module}:${v.assetId}`);
    const row = rows.get(key) || { key, name: asset?.name || v.raw?.locationName || v.raw?.beatName || v.assetId || 'Location not recorded', module: v.module, wardId: v.wardId, zoneId: v.zoneId, count: 0, last: '', source: c.source };
    row.count++;
    if ((v.submittedAt || '') > row.last) { row.last = v.submittedAt || ''; row.source = c.source; }
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, limit);
}

/** Registered locations with no inspection in the selected dates (the coverage "remaining" set). */
export function pendingLocations(data: Pick<InspectionCoverage, 'assets' | 'visits'>, scope: { module?: string; zone?: string; ward?: string } = {}): MapAsset[] {
  const match = (r: { module: string; zoneId: string; wardId: string }) => (!scope.module || r.module === scope.module) && (!scope.zone || r.zoneId === scope.zone) && (!scope.ward || r.wardId === scope.ward);
  const visited = new Set(data.visits.filter(match).filter(v => v.assetId && inspectionStatus(v.status || 'SUBMITTED') !== 'unclassified').map(v => `${v.module}:${v.assetId}`));
  return data.assets.filter(match).filter(a => !visited.has(`${a.module}:${a.id}`))
    .sort((a, b) => (a.wardName || '').localeCompare(b.wardName || '', undefined, { numeric: true }) || (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
}

/** AI analysis across every inspection in scope, plus how often it agrees with the SI where both exist. */
export function aiAnalysis(visits: InspectionVisit[]) {
  const out = { analysed: 0, clean: 0, notClean: 0, unassessable: 0, awaiting: 0, compared: 0, agreed: 0, agreement: null as number | null };
  for (const v of unique(visits)) {
    const sug = intelligenceSuggestion({ ...v.raw, status: v.raw?.workspaceStatus || v.status }), outcome = sug.outcome;
    if (outcome === 'AWAITING_AI') { out.awaiting++; continue; }
    out.analysed++;
    if (outcome === 'CLEAN') out.clean++; else if (outcome === 'NOT_CLEAN') out.notClean++; else out.unassessable++;
    if (sug.unclear) out.unassessable++;
    const verdict = visitCleanliness(v), si = verdict.source !== 'si' ? '' : verdict.verdict === 'clean' ? 'CLEAN' : 'NOT_CLEAN';
    if (si && !sug.unclear) { out.compared++; if (si === outcome) out.agreed++; }
  }
  out.agreement = out.compared ? out.agreed / out.compared * 100 : null;
  return out;
}
