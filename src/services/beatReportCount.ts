import { inspectionStatus, type InspectionCoverage } from './inspectionCoverage';

/** Sweeping submits one beat report per IST day; its point photos are evidence. */
export function submittedBeatReportCount(data: InspectionCoverage, zone = '', ward = ''): number | null {
  if (data.failedModules.includes('sweeping')) return null;
  const reports = new Set<string>();
  for (const visit of data.visits) {
    if (visit.module !== 'sweeping') continue;
    if (zone && !visit.zoneId || ward && !visit.wardId) return null;
    if (zone && visit.zoneId !== zone || ward && visit.wardId !== ward) continue;
    if (inspectionStatus(visit.status || 'SUBMITTED') === 'unclassified') continue;
    if (!visit.assetId || !visit.submittedAt || !Number.isFinite(Date.parse(visit.submittedAt))) return null;
    const day = new Date(Date.parse(visit.submittedAt) + 330 * 60000).toISOString().slice(0, 10);
    // Also collapses historical point-per-row submissions for the same beat/day.
    reports.add(`${visit.assetId}:${day}`);
  }
  return reports.size;
}
