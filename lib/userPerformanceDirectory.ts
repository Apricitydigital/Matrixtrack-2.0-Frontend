export type DirectorySort = 'performance' | 'name' | 'zone' | 'ward' | 'target' | 'achieved' | 'shortfall' | 'due' | 'onTime' | 'overdue' | 'late' | 'inProgress' | 'backlog' | 'oldestPending';
type DirectoryRow = {
  key: string;
  label: string;
  zones: string[];
  wards: string[];
  modules: string[];
  performance: number | null;
  coverage?: { required: number | null; completed: number } | null;
  si?: { due: number; onTime: number; overdue: number; late?: number; inProgress?: number; backlogOverdue?: number; oldestPendingDays?: number | null } | null;
  iec?: { due: number; onTime: number; overdue: number; late?: number; inProgress?: number; backlogOverdue?: number; oldestPendingDays?: number | null } | null;
};
export type PerformanceFocus = 'all' | 'attention' | 'zero' | 'met' | 'onTrack' | 'noTarget' | 'unavailable' | 'overdue' | 'pending' | 'late' | 'backlog' | 'onTime';

export function performanceAssessment(row: DirectoryRow, role: string) {
  const missing = { status: 'unavailable' as const, label: 'Not calculated', reason: 'Performance information is missing.', nextStep: 'Check the date range and refresh.', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  if (role === 'SUPERVISOR') {
    if (!row.coverage || row.coverage.required === null) return missing;
    if (row.coverage.required === 0) return { status: 'noTarget' as const, label: 'No requirement', reason: 'No inspections required for these dates and module.', nextStep: 'Check asset assignments and target settings.', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
    if (row.performance === null) return missing;
    if (row.coverage.completed === 0) return { status: 'attention' as const, label: 'No inspections counted', reason: 'A target is assigned, with no inspections counted yet.', nextStep: 'Review assigned work and inspection records.', tone: 'border-rose-100 bg-rose-50 text-rose-700' };
  } else if (role === 'QC' || role === 'ACTION_OFFICER') {
    const timed = row.si ?? row.iec;
    if (!timed) return missing;
    if (timed.due === 0) return { status: 'noTarget' as const, label: 'Nothing scored yet', reason: (timed.inProgress ?? 0) > 0 ? 'Pending reports are still within their deadline and are not scored.' : 'No completed or overdue reports to score in this period.', nextStep: (timed.inProgress ?? 0) > 0 ? 'Complete pending work before its deadline.' : 'Check the assigned queue for new work.', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
    if (timed.overdue > 0) return { status: 'attention' as const, label: 'Overdue work', reason: `${timed.overdue.toLocaleString('en-IN')} reports are still pending after their deadline.`, nextStep: role === 'QC' ? 'Review the overdue inspection reports.' : 'Review the unresolved reports.', tone: 'border-rose-100 bg-rose-50 text-rose-700' };
    if (row.performance === null) return missing;
    if (row.performance >= 99.995) return { status: 'met' as const, label: 'All scored work on time', reason: 'All scored reports were completed within their deadline. Pending work within its deadline is excluded.', nextStep: (timed.inProgress ?? 0) > 0 ? 'Complete the remaining reports before their deadline.' : 'Monitor the queue for new reports.', tone: 'border-emerald-100 bg-emerald-50 text-emerald-700' };
    const low = row.performance < 50;
    return { status: low ? 'attention' as const : 'onTrack' as const, label: low ? 'On-time rate below 50%' : 'Some work completed late', reason: 'Completed late reports reduce the on-time rate even when no work remains overdue.', nextStep: 'Review the reasons for delayed completion and prevent repeats.', tone: low ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-amber-100 bg-amber-50 text-amber-700' };
  }
  if (row.performance === null) return missing;
  if (row.performance >= 99.995) return { status: 'met' as const, label: role === 'SUPERVISOR' ? 'Target completed' : 'All work on time', reason: role === 'SUPERVISOR' ? 'Completed the full assigned inspection target.' : 'All scored reports were completed within the deadline.', nextStep: 'Open the record breakdown to verify performance.', tone: 'border-emerald-100 bg-emerald-50 text-emerald-700' };
  const threshold = role === 'SUPERVISOR' ? 80 : 50;
  if (row.performance < threshold) return { status: 'attention' as const, label: 'Below expected level', reason: `Achievement is below the ${threshold}% attention threshold.`, nextStep: 'Review the work that remains incomplete.', tone: 'border-rose-100 bg-rose-50 text-rose-700' };
  return { status: 'onTrack' as const, label: 'Target partly completed', reason: `Achievement is ${threshold}% or more, but below 100%.`, nextStep: 'Review the remaining work.', tone: 'border-blue-100 bg-blue-50 text-blue-700' };
}

export function matchesPerformanceFocus(row: DirectoryRow, focus: PerformanceFocus, role: string) {
  if (focus === 'all') return true;
  const timed = row.si ?? row.iec;
  if (focus === 'onTime') return (timed?.onTime ?? 0) > 0;
  if (focus === 'overdue') return (timed?.overdue ?? 0) > 0;
  if (focus === 'pending') return (timed?.inProgress ?? 0) > 0;
  if (focus === 'late') return (timed?.late ?? 0) > 0;
  if (focus === 'backlog') return (timed?.backlogOverdue ?? 0) > 0;
  if (focus === 'zero') return role === 'SUPERVISOR' && (row.coverage?.required ?? 0) > 0 && row.coverage?.completed === 0 && row.performance !== null;
  return performanceAssessment(row, role).status === focus;
}
const normalize = (value: string) => value.trim().toLocaleLowerCase();
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function filterPerformanceRows<T extends DirectoryRow>(rows: T[], zone: string, ward: string, search: string): T[] {
  const query = normalize(search);
  return rows.filter((row) =>
    (!zone || row.zones.some((name) => normalize(name) === normalize(zone))) &&
    (!ward || row.wards.some((name) => normalize(name) === normalize(ward))) &&
    (!query || normalize([row.label, ...row.zones, ...row.wards, ...row.modules].join(' ')).includes(query))
  );
}

export function sortPerformanceRows<T extends DirectoryRow>(rows: T[], field: DirectorySort, direction: 'asc' | 'desc'): T[] {
  const value = (row: T): string | number | null => {
    const timed = row.si ?? row.iec;
    switch (field) {
      case 'name': return row.label;
      case 'zone': return [...row.zones].sort(collator.compare).join(', ') || null;
      case 'ward': return [...row.wards].sort(collator.compare).join(', ') || null;
      case 'target': return row.coverage?.required ?? null;
      case 'achieved': return row.coverage?.completed ?? null;
      case 'shortfall': return row.coverage?.required != null ? Math.max(0, row.coverage.required - row.coverage.completed) : null;
      case 'due': return timed?.due ?? null;
      case 'onTime': return timed?.onTime ?? null;
      case 'overdue': return timed?.overdue ?? null;
      case 'late': return timed?.late ?? null;
      case 'inProgress': return timed?.inProgress ?? null;
      case 'backlog': return timed?.backlogOverdue ?? null;
      case 'oldestPending': return timed?.oldestPendingDays ?? null;
      default: return row.performance;
    }
  };
  return [...rows].sort((a, b) => {
    const av = value(a), bv = value(b);
    // Missing data stays last in either direction; zero is a valid score.
    if (av == null && bv != null) return 1;
    if (bv == null && av != null) return -1;
    const compared = av == null || bv == null ? 0 : typeof av === 'number' && typeof bv === 'number' ? av - bv : collator.compare(String(av), String(bv));
    return compared * (direction === 'asc' ? 1 : -1) || collator.compare(a.label, b.label) || a.key.localeCompare(b.key);
  });
}

export function directoryNames(names: string[]) {
  return [...new Map(names.filter(Boolean).map((name) => [normalize(name), name])).values()].sort(collator.compare);
}

/** Include child wards for zone-wide staff, and parent zones for ward-only staff. */
export function directoryScope(person: { zoneIds?: string[]; wardIds?: string[] }, names: Map<string, string>, wardZones: Map<string, string>) {
  const zones = (person.zoneIds || []).map((id) => names.get(id)).filter((name): name is string => Boolean(name));
  const wards = (person.wardIds || []).map((id) => names.get(id)).filter((name): name is string => Boolean(name));
  const displayNames = new Map([...names.values()].map((name) => [normalize(name), name]));
  const assignedZones = new Set(zones.map(normalize));
  wardZones.forEach((zone, ward) => {
    if (assignedZones.has(normalize(zone))) wards.push(displayNames.get(ward) || ward);
  });
  wards.forEach((ward) => {
    const zone = wardZones.get(normalize(ward));
    if (zone) zones.push(zone);
  });
  return { zones: directoryNames(zones), wards: directoryNames(wards) };
}
