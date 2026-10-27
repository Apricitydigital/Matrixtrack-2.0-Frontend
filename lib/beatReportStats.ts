export const BEAT_REPORT_CARDS = [
  { key: 'submitted', label: 'Submitted Reports', formula: 'Distinct beats with at least one submitted report', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'draft', label: 'Draft', formula: 'Distinct beats with at least one draft', color: 'text-slate-600', bg: 'bg-slate-100' },
  { key: 'pendingReview', label: 'Pending Review', formula: 'Distinct beats with a report awaiting SI review', color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'cleaned', label: 'Cleaned', formula: 'Distinct beats with an SI-approved report', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'notCleaned', label: 'Not Cleaned', formula: 'Distinct beats with an SI-rejected report', color: 'text-rose-600', bg: 'bg-rose-50' },
  { key: 'attentionRequired', label: 'Attention Required', formula: 'Distinct beats sent for action, including resolved', color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'resolutionPending', label: 'Resolution Pending', formula: 'Distinct beats with an action still pending', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { key: 'resolved', label: 'Resolved', formula: 'Distinct beats with a completed action', color: 'text-indigo-600', bg: 'bg-indigo-50' },
] as const;
export type BeatReportStatus = typeof BEAT_REPORT_CARDS[number]['key'];
export type BeatFilter = 'total' | 'covered' | 'pending' | BeatReportStatus;
export type BeatReportCounts = Record<BeatReportStatus, number>;

export function reportStatusForBeatFilter(filter: BeatFilter): BeatReportStatus | undefined {
  return BEAT_REPORT_CARDS.some(card => card.key === filter) ? filter as BeatReportStatus : undefined;
}
export function matchesBeatFilter(beat: { covered: boolean; reportCounts?: Partial<BeatReportCounts> }, filter: BeatFilter) {
  if (filter === 'total') return true;
  if (filter === 'covered') return beat.covered;
  if (filter === 'pending') return !beat.covered;
  return (beat.reportCounts?.[filter] ?? 0) > 0;
}
