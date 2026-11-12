import { actionLifecycle } from './actionLifecycle';
import { inspectionStatus, type InspectionCoverage, type InspectionVisit } from './inspectionCoverage';

// A grouped report retains unresolved findings rather than presenting a partly
// reviewed beat as cleaned. Draft evidence never overrides submitted evidence.
const priority = ['action_required', 'escalated', 'rejected', 'pending_review', 'action_taken', 'approved', 'unclassified'];

export function mergeBeatReport(visits: InspectionVisit[]): InspectionVisit {
  const ordered = [...visits].sort((a, b) =>
    priority.indexOf(inspectionStatus(a.status)) - priority.indexOf(inspectionStatus(b.status)) ||
    (b.submittedAt || '').localeCompare(a.submittedAt || '') || a.id.localeCompare(b.id));
  const canonical = ordered[0];
  if (visits.length === 1) return canonical;
  const flags = visits.map(actionLifecycle);
  const actionRequired = flags.some(f => f.required), actionTaken = flags.some(f => f.taken);
  const points = new Map<number, any>();
  for (const visit of [...visits].sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || '') || a.id.localeCompare(b.id))) {
    const payload = visit.raw?.payload || {};
    const evidence = Array.isArray(payload.points) ? payload.points : payload.pointIndex != null
      ? [{...payload, photo: payload.photo || payload.photos?.[0]}] : [];
    for (const point of evidence) {
      const index = Number(point.pointIndex);
      if (Number.isInteger(index) && index >= 0 && index <= 4 && point.photo) points.set(index, point);
    }
  }
  const sourceReportIds = [...new Set(visits.flatMap(v => v.sourceReportIds || [v.id]))].sort();
  return {...canonical, sourceReportIds, actionRequired, actionTaken,
    raw: {...canonical.raw, status: canonical.status, workspaceStatus: canonical.status, actionRequired, actionTaken,
      ...(points.size ? {payload: {...canonical.raw?.payload, points: [...points.values()].sort((a,b) => a.pointIndex-b.pointIndex), submittedPointCount: points.size}} : {})}};
}

/** One read-only report register feeds every ULB total, status, scope and drill. */
export function ulbReportRegister(data: InspectionCoverage): InspectionCoverage {
  const groups = new Map<string, InspectionVisit[]>();
  const visits: InspectionVisit[] = [], uncertain = new Set(data.failedModules);
  const unique = [...new Map(data.visits.map(v => [v.id, v])).values()];
  for (const visit of unique) {
    if (visit.module !== 'sweeping') { visits.push(visit); continue; }
    const at = Date.parse(visit.submittedAt || '');
    if (!visit.assetId || !Number.isFinite(at)) {
      // Do not invent beat/day identity or publish a partial report total.
      uncertain.add('sweeping'); visits.push(visit); continue;
    }
    const day = new Date(at + 330 * 60000).toISOString().slice(0, 10);
    const key = `${visit.assetId}:${day}`;
    const group = groups.get(key) || [];
    group.push(visit); groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (new Set(group.map(v => `${v.zoneId}:${v.wardId}`)).size > 1) uncertain.add('sweeping');
    visits.push(mergeBeatReport(group));
  }
  return {...data, visits, failedModules: [...uncertain], errors: uncertain.size > data.failedModules.length
    ? [...data.errors, 'Some Sweeping reports lack consistent beat, date or area identifiers; report totals are unavailable.'] : data.errors};
}
