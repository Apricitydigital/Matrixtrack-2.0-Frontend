import { apiFetch } from "./apiClient";
import { getStoredToken } from "./auth";
import { buildQuery, type FilterState, type IssueStatus, type OverdueInfo, type PhotoLike } from "./cleanlinessIssuesLogic";

/**
 * Client of the IEC-originated Cleanliness Issues monitoring API (Phase 7).
 * City Admin: /cleanliness-issues/admin/...   Commissioner: /cleanliness-issues/commissioner/... (read-only).
 * The city always comes from the signed-in session; it is never sent as a parameter.
 */

export type Photo = PhotoLike & { id: string; url: string; questionCode?: string | null };
export type Person = { id: string; name: string | null };
export type Named = { id: string; name: string | null };

export type RequestBreakdown = { total: number; approved: number; rejected: number; pending: number };

export type Aggregate = {
  key: string;
  total: number;
  open: number;
  closed: number;
  pendingDaroga: number;
  reinspection: number;
  qcPending: number;
  ulbPending: number;
  reopenRequested: number;
  overdue: number;
  unassigned: number;
  reopened: number;
  initialInspectionCycles: number;
  avgInitialInspectionHours: number | null;
  closedCycles: number;
  avgResolutionHours: number | null;
  attempts: number;
  rejectedAttempts: number;
  issuesWithRejection: number;
  rejectionRate: number | null;
  reopenRequests: RequestBreakdown;
  closurePercent: number | null;
};

export type SummaryResponse = { filters: Record<string, unknown>; kpis: Aggregate; generatedAt: string };

export type GroupRow = Aggregate & { id: string; name: string | null; zoneId?: string | null; zoneName?: string | null };
export type AnalyticsResponse = { zones: GroupRow[]; wards: GroupRow[]; modules: GroupRow[] };

export type IssueRow = {
  id: string;
  issueNumber: string;
  reportedAt: string;
  iecMember: Person;
  module: string;
  moduleLabel: string;
  zone: Named;
  ward: Named;
  asset: Named | { id: string; label: string | null } | null;
  assetNotListed: boolean;
  otherIssueType: string | null;
  assignedDaroga: Person | null;
  status: IssueStatus;
  currentCycleNumber: number;
  inspectionDueAt: string;
  overdue: OverdueInfo;
  needsDaroga: boolean;
  updatedAt: string;
};

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };
export type IssuePage = Page<IssueRow> & { filters: Record<string, unknown> };

export type UnassignedRow = IssueRow & {
  unassigned: { cause: "NEVER_ASSIGNED" | "REOPENED_CYCLE" | "DAROGA_INELIGIBLE"; causeLabel: string; eligibleCount: number; noEligibleDaroga: boolean; reason: string };
  timeRemainingMs: number;
};

export type FilterOptions = {
  zones: Array<{ id: string; name: string; wards: Array<{ id: string; name: string }> }>;
  modules: Array<{ id: string; label: string }>;
  statuses: string[];
  overdue: string[];
  darogas: Array<{ id: string; name: string | null }>;
};

export type DarogaPerformanceRow = {
  daroga: Person;
  assignedIssues: number;
  openIssues: number;
  closedIssues: number;
  overdueInitialInspections: number;
  overdueOutstanding: number;
  submittedLate: number;
  initialWithin24h: number;
  initialInspections: number;
  avgInitialInspectionHours: number | null;
  reinspections: number;
  qcRejections: number;
  ulbRejections: number;
  ulbActionRequired: number;
};

export type Decision = { id: string; inspectionId: string; cycleNumber: number | null; reviewerRole: string; reviewer: Person; decision: string; remarks: string | null; reviewedAt: string };

export type IssueDetail = {
  id: string;
  issueNumber: string;
  status: IssueStatus;
  module: string;
  moduleLabel: string;
  zone: Named;
  ward: Named;
  asset: { id: string; label: string | null } | null;
  assetNotListed: boolean;
  otherIssueType: string | null;
  remarks: string;
  iecMember: Person;
  location: { latitude: number; longitude: number; accuracyMeters: number | null; capturedAt: string };
  reportedAt: string;
  currentCycleNumber: number;
  inspectionDueAt: string;
  overdue: OverdueInfo;
  assignedDaroga: Person | null;
  assignedAt: string | null;
  needsDaroga: boolean;
  closedAt: string | null;
  updatedAt: string;
  beforePhotos: Photo[];
  cycles: Array<{ cycleNumber: number; reason: string; startedAt: string; inspectionDueAt: string; firstInspectionSubmittedAt: string | null; closedAt: string | null; reopenRequestId: string | null }>;
  assignments: Array<{
    id: string;
    cycleNumber: number | null;
    assignedTo: Person;
    previousAssignee: Person | null;
    assignedBy: Person | null;
    automatic: boolean;
    reason: string;
    assignedAt: string;
    endedAt: string | null;
    endReason: string | null;
  }>;
  inspections: Array<{
    id: string;
    cycleNumber: number | null;
    attemptNumber: number;
    daroga: Person;
    remarks: string | null;
    surveyKey: string | null;
    location: { latitude: number; longitude: number; accuracyMeters: number | null; capturedAt: string };
    distanceFromReportedMeters: number;
    outcome: string;
    submittedAt: string;
    afterPhotos: Photo[];
    reviews: Decision[];
  }>;
  reviews: Decision[];
  reopenRequests: Array<{
    id: string;
    cycleNumber: number | null;
    reason: string;
    requestedAt: string;
    requestedBy: Person;
    status: string;
    reviewer: Person | null;
    decisionRemarks: string | null;
    decidedAt: string | null;
    newCycleNumber: number | null;
    photos: Photo[];
  }>;
  closure: { closedAt: string; cycleNumber: number; approvedBy: Person | null; remarks: string | null } | null;
  statusHistory: Array<{ event: string; fromStatus: string | null; toStatus: string; cycleNumber: number | null; actor: { id: string | null; role: string | null; name: string | null }; reason: string | null; metadata: Record<string, unknown> | null; at: string }>;
};

export type EligibleDarogas = {
  issueId: string;
  issueNumber: string;
  status: IssueStatus;
  module: string;
  ward: Named;
  canAssign: boolean;
  blockReason: string | null;
  currentAssignee: { id: string; name: string | null; eligible: boolean } | null;
  inspectionDueAt: string;
  eligible: Array<{ id: string; name: string | null; openIssues: number; isCurrent: boolean }>;
  message: string | null;
};

export type AssignResult = {
  changed: boolean;
  issue: { id: string; issueNumber: string; status: string; assignedDarogaId: string | null; assignedAt: string | null; inspectionDueAt: string };
  assignee: Person;
  previousAssigneeId: string | null;
};

export type CommissionerSummary = {
  readOnly: true;
  kpis: {
    totalReported: number;
    totalClosed: number;
    openIssues: number;
    closurePercent: number | null;
    overdueInspections: number;
    avgResolutionHours: number | null;
    reopenedIssues: number;
    reopenRequests: RequestBreakdown;
    inspectionAttempts: number;
    rejectedAttempts: number;
    repeatRejectionRate: number | null;
    issuesWithRejection: number;
  };
  zones: GroupRow[];
  wards: GroupRow[];
  modules: GroupRow[];
  statusDistribution: Array<{ status: string; count: number }>;
  trend: { granularity: "DAY" | "MONTH"; from: string; to: string; points: Array<{ bucket: string; reported: number; closed: number }> };
  generatedAt: string;
};

export type SortState = { sort: string; order: "asc" | "desc" };

const BASE = "/cleanliness-issues";
const q = (filters: FilterState, extra: Record<string, string | number | undefined> = {}) => buildQuery({ ...filters, ...extra });

export const CleanlinessIssuesAdminApi = {
  filters: () => apiFetch<FilterOptions>(`${BASE}/admin/filters`),
  summary: (f: FilterState) => apiFetch<SummaryResponse>(`${BASE}/admin/summary${q(f)}`),
  issues: (f: FilterState, page: number, pageSize: number, sort: SortState) => apiFetch<IssuePage>(`${BASE}/admin/issues${q(f, { page, pageSize, ...sort })}`),
  issue: (id: string) => apiFetch<{ issue: IssueDetail }>(`${BASE}/admin/issues/${encodeURIComponent(id)}`).then((r) => r.issue),
  unassigned: (f: FilterState, page: number, pageSize: number) => apiFetch<Page<UnassignedRow>>(`${BASE}/admin/unassigned${q({ zoneId: f.zoneId, wardId: f.wardId, module: f.module }, { page, pageSize })}`),
  eligible: (id: string) => apiFetch<EligibleDarogas>(`${BASE}/admin/issues/${encodeURIComponent(id)}/eligible-darogas`),
  assign: (id: string, body: { assigneeId: string; remarks?: string }) =>
    apiFetch<AssignResult>(`${BASE}/admin/issues/${encodeURIComponent(id)}/assign`, { method: "POST", body: JSON.stringify(body) }),
  analytics: (f: FilterState) => apiFetch<AnalyticsResponse>(`${BASE}/admin/analytics${q({ from: f.from, to: f.to, zoneId: f.zoneId, wardId: f.wardId, module: f.module })}`),
  performance: (f: FilterState) => apiFetch<{ items: DarogaPerformanceRow[] }>(`${BASE}/admin/daroga-performance${q({ from: f.from, to: f.to, zoneId: f.zoneId, wardId: f.wardId, module: f.module })}`),

  /** The filtered table as a CSV file (server-side, capped); returns false when the browser could not save it. */
  async exportCsv(f: FilterState, sort: SortState): Promise<{ rows: number; truncated: boolean }> {
    const token = getStoredToken();
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}${BASE}/admin/issues/export${q(f, { ...sort })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = JSON.parse(await res.text()).error ?? message;
      } catch {
        /* keep status text */
      }
      throw new Error(message || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleanliness-issues_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    return { rows: Number(res.headers.get("x-export-rows") ?? 0), truncated: res.headers.get("x-export-truncated") === "true" };
  }
};

export const CleanlinessIssuesCommissionerApi = {
  filters: () => apiFetch<Pick<FilterOptions, "zones" | "modules">>(`${BASE}/commissioner/filters`),
  summary: (f: FilterState) => apiFetch<CommissionerSummary>(`${BASE}/commissioner/summary${q({ from: f.from, to: f.to, zoneId: f.zoneId, wardId: f.wardId, module: f.module })}`)
};
