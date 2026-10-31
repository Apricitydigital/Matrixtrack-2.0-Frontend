import type { RoleType, OperationalModuleId } from '../types';

// Display names match MatrixTrack 2.0 Frontend/lib/labels.ts. API identifiers stay unchanged.
export const ROLE_LABELS: Record<RoleType | string, string> = { HMS_SUPER_ADMIN: 'HMS Super Admin', SUPER_ADMIN: 'Super Admin', DIVISION_ADMIN: 'Division Admin', CITY_ADMIN: 'City Admin', CITY_ADMINISTRATOR: 'City Admin', ULB_OFFICER: 'ULB Officer', COMMISSIONER: 'Commissioner', SUPERVISOR: 'Daroga', QC: 'Sanitary Inspector', ACTION_OFFICER: 'IEC Member', EMPLOYEE: 'Employee', ADMIN: 'Admin', ADMINISTRATOR: 'Admin' };
export const MODULE_LABELS: Record<OperationalModuleId, string> = { sweeping: 'Sweeping', toilets: 'Cleanliness of Toilet', litter_bins: 'Litter Bins', nala: 'Nala', ctu_gvp: 'CTU/GVP Transformation' };
// IEC issues use different API keys from operational inspection modules.
export const ISSUE_MODULE_LABELS: Record<string,string> = { BEAT:'Beat', TOILET:'Toilet', LITTERBIN:'Litterbin', NALA:'Nala', GVP:'GVP', OTHER:'Other' };
export type RygTone = 'red' | 'yellow' | 'green' | 'neutral';
export const RYG_LABELS: Record<RygTone, string> = { red: 'Action needed', yellow: 'Attention / pending', green: 'Approved / on track', neutral: 'Not assessed' };
export function normalizeStatus(status: string) { return String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); }
export function statusTone(status: string): RygTone {
  const key = normalizeStatus(status);
  if (['red','rejected','action_required','escalated','overdue','absent','missed','lagging','reopened','incomplete_work','false_report','ulb_rejected'].includes(key)) return 'red';
  if (['yellow','amber','pending','pending_review','pending_approval','pending_qc','submitted','under_review','action_taken','late','needs_correction','reopen_requested','qc_pending','ulb_pending','reinspection','maintenance'].includes(key)) return 'yellow';
  if (['green','approved','approved_closed','closed','active','present','achieved','on_track','verified_clean','operating','completed','certified'].includes(key)) return 'green';
  return 'neutral';
}
const STATUS_LABELS: Record<string, string> = { action_taken: 'Action taken · awaiting verification', action_required: 'Action required', pending_qc: 'Pending Sanitary Inspector review', pending_approval: 'Pending approval', approved_closed: 'Approved & closed', needs_correction: 'Correction requested', verified_clean: 'Verified clean', unmarked: 'Not recorded', not_assessed: 'Not assessed', neutral: 'Not assessed', amber: 'Attention', green: 'On track', red: 'Action needed' };
export function statusLabel(status: string) { const key = normalizeStatus(status); return STATUS_LABELS[key] || key.replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase()); }
export function issueIsOverdue(issue: { status: string; deadlineTimestamp: string }, now = Date.now()) {
  const deadline = Date.parse(issue.deadlineTimestamp);
  return issue.status !== 'approved_closed' && Number.isFinite(deadline) && deadline < now;
}

export interface OperationalFilters { query: string; zoneId: string; wardId: string; moduleId: string; staffId: string; status: string; ryg: string; }
export const emptyFilters = (): OperationalFilters => ({ query: '', zoneId: 'all', wardId: 'all', moduleId: 'all', staffId: 'all', status: 'all', ryg: 'all' });
export function matchesFilters(record: { zoneId?: string; wardId?: string; moduleId?: string; status?: string; submittedByUserId?: string; assignedDarogaId?: string; reviewerId?: string }, filters: OperationalFilters, searchable: string[]): boolean {
  return (filters.zoneId === 'all' || record.zoneId === filters.zoneId)
    && (filters.wardId === 'all' || record.wardId === filters.wardId)
    && (filters.moduleId === 'all' || record.moduleId === filters.moduleId)
    && (filters.status === 'all' || record.status === filters.status)
    && (filters.ryg === 'all' || statusTone(record.status || '') === filters.ryg)
    && (filters.staffId === 'all' || [record.submittedByUserId, record.assignedDarogaId, record.reviewerId].includes(filters.staffId))
    && (!filters.query.trim() || searchable.join(' ').toLowerCase().includes(filters.query.trim().toLowerCase()));
}

export function datePreset(preset: string, today: string): { from: string; to: string } {
  const day = new Date(`${today}T12:00:00Z`), key = (date: Date) => date.toISOString().slice(0, 10);
  if (preset === 'yesterday') { day.setUTCDate(day.getUTCDate() - 1); return { from: key(day), to: key(day) }; }
  if (preset === 'last_7_days' || preset === 'last_30_days') { day.setUTCDate(day.getUTCDate() - (preset === 'last_7_days' ? 6 : 29)); return { from: key(day), to: today }; }
  if (preset === 'this_month') return { from: `${today.slice(0,7)}-01`, to: today };
  if (preset === 'previous_month') return { from: key(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1))), to: key(new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 0))) };
  return { from: today, to: today };
}
