import { apiFetch } from "./apiClient";
import type { Photo, Person } from "./cleanlinessIssuesApi";
import { buildQuery, type FilterState } from "./cleanlinessIssuesLogic";

/**
 * Client of the ULB Officer endpoints of the Cleanliness Issue API (IEC-originated issues). The same endpoints the
 * mobile app uses, plus the read-only filters / summary / history added for the web portal.
 * The city, the officer and the role always come from the signed-in session; the request body never carries them.
 * NOTE: reopening endpoints are keyed by the reopen REQUEST id, not the issue id.
 */

const BASE = "/cleanliness-issues";

export type Named = { id: string; name: string | null };
export type Place = { zone: Named; ward: Named };
export type AssetInfo = { id: string; label: string | null } | null;

export type UlbFilterOptions = {
  zones: Array<{ id: string; name: string; wards: Array<{ id: string; name: string }> }>;
  modules: Array<{ id: string; label: string }>;
  decisions: Array<{ id: string; label: string }>;
};

export type UlbSummary = {
  pendingApprovals: number;
  pendingReopenRequests: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  basis: { decisions: string; pending: string };
};

export type QcDecisionBrief = { decision: string; remarks: string | null; reviewedAt: string };

export type PendingItem = Place & {
  id: string;
  issueNumber: string;
  status: string;
  module: string;
  moduleLabel: string;
  asset: AssetInfo;
  assetNotListed: boolean;
  otherIssueType: string | null;
  iecMember: { name: string | null };
  assignedDaroga: { id: string | null; name: string | null };
  reportedAt: string;
  currentCycleNumber: number;
  latestAttempt: { id: string; attemptNumber: number; submittedAt: string; distanceFromReportedMeters: number } | null;
  attemptsInCycle: number;
  previousRejection: { by: string; decision: string; remarks: string | null; reviewedAt: string } | null;
  qcDecision: QcDecisionBrief | null;
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
};

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export type DecisionInfo = {
  inspectionId: string;
  cycleNumber: number | null;
  reviewerRole: string;
  reviewer: { name: string | null };
  decision: string;
  remarks: string | null;
  reviewedAt: string;
};

export type SurveyAnswer = { code: string; section: string; question: string; type: string; answer: unknown; photoCount: number };
export type AfterPhoto = Photo & { questionCode: string | null };

export type PendingDetail = Place & {
  id: string;
  issueNumber: string;
  status: string;
  module: string;
  moduleLabel: string;
  asset: AssetInfo;
  assetNotListed: boolean;
  otherIssueType: string | null;
  remarks: string;
  iecMember: { name: string | null };
  assignedDaroga: { id: string | null; name: string | null };
  reportedAt: string;
  inspectionDueAt: string;
  currentCycleNumber: number;
  location: { latitude: number; longitude: number; accuracyMeters: number | null };
  beforePhotos: Photo[];
  inspection: {
    id: string;
    attemptNumber: number;
    daroga: { id: string; name: string | null };
    submittedAt: string;
    remarks: string | null;
    surveyKey: string | null;
    surveyTitle: string | null;
    location: { latitude: number; longitude: number; accuracyMeters: number | null; capturedAt: string };
    distanceFromReportedMeters: number;
    answers: SurveyAnswer[];
    afterPhotos: AfterPhoto[];
  };
  qcDecision: DecisionInfo | null;
  lastRejection: DecisionInfo | null;
  review: { role: string; inspectionId: string; attemptNumber: number; decisions: string[]; remarksRequiredFor: string[] };
  attempts: Array<{
    id: string;
    attemptNumber: number;
    daroga: { id: string; name: string | null };
    submittedAt: string;
    remarks: string | null;
    outcome: string;
    distanceFromReportedMeters: number;
    afterPhotos: AfterPhoto[];
    reviews: DecisionInfo[];
  }>;
  statusHistory: Array<{ event: string; fromStatus: string | null; toStatus: string; actorRole: string | null; reason: string | null; at: string }>;
  reopenRequests: Array<{
    id: string;
    cycleNumber: number | null;
    reason: string;
    requestedAt: string;
    requestedBy: { name: string | null };
    status: string;
    reviewer: { name: string | null } | null;
    decisionRemarks: string | null;
    decidedAt: string | null;
  }>;
};

export type UlbDecision = "APPROVE" | "REJECT" | "ACTION_REQUIRED";
/** The ONLY fields the web sends: never a reviewer, role, city, status or time. */
export type ReviewBody = { inspectionId: string; decision: UlbDecision; remarks?: string };

export type ReviewResult = {
  created: boolean;
  decision: string;
  review: { id: string; inspectionId: string; reviewerRole: string; decision: string; remarks: string | null; reviewedAt: string };
  issue: { id: string; issueNumber: string; status: string; closedAt: string | null; assignedDarogaId: string | null };
  returnedTo: { id: string; name: string | null } | null;
};

export type ReopenItem = Place & {
  requestId: string;
  issueId: string;
  issueNumber: string;
  module: string;
  moduleLabel: string;
  asset: AssetInfo;
  assetNotListed: boolean;
  otherIssueType: string | null;
  iecMember: { name: string | null };
  closedAt: string | null;
  requestedAt: string;
  reason: string;
  reopenPhotoCount: number;
  previous: { cycleNumber: number; attempts: number; approvedBy: string | null; approvedAt: string | null };
  reopenCount: number;
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
};

export type ReopenDetail = Place & {
  requestId: string;
  issueId: string;
  issueNumber: string;
  status: string;
  module: string;
  moduleLabel: string;
  asset: AssetInfo;
  assetNotListed: boolean;
  otherIssueType: string | null;
  remarks: string;
  iecMember: { name: string | null };
  location: { latitude: number; longitude: number; accuracyMeters: number | null };
  request: { id: string; reason: string; requestedAt: string; requestedBy: { name: string | null }; photos: Photo[] };
  closure: {
    closedAt: string | null;
    cycleNumber: number | null;
    approvedBy: { name: string | null; remarks: string | null; at: string } | null;
    attempts: number;
    lastInspection: { id: string; attemptNumber: number; daroga: { name: string | null }; submittedAt: string; remarks: string | null } | null;
  };
  beforePhotos: Photo[];
  latestAfterPhotos: AfterPhoto[];
  attempts: Array<{
    id: string;
    cycleNumber: number | null;
    attemptNumber: number;
    daroga: { name: string | null };
    submittedAt: string;
    remarks: string | null;
    outcome: string;
    afterPhotos: AfterPhoto[];
    reviews: DecisionInfo[];
  }>;
  previousRequests: Array<{ id: string; cycleNumber: number | null; reason: string; requestedAt: string; status: string; decisionRemarks: string | null; decidedAt: string | null; reviewer: { name: string | null }; photos: Photo[] }>;
  statusHistory: Array<{ event: string; fromStatus: string | null; toStatus: string; actorRole: string | null; reason: string | null; at: string }>;
  decision: { decisions: string[]; remarksRequiredFor: string[] };
};

export type ReopenDecision = "APPROVE" | "REJECT";
export type ReopenBody = { decision: ReopenDecision; remarks?: string };
export type ReopenResult = {
  created: boolean;
  decision: ReopenDecision;
  request: { id: string; status: string; decidedAt: string | null; decisionRemarks: string | null; newCycleId: string | null };
  issue: { id: string; issueNumber: string; status: string; currentCycleNumber: number; inspectionDueAt: string; closedAt: string | null; assignedDarogaId: string | null };
  assignedTo: Person | null;
};

export type HistoryItem = Place & {
  reviewId: string;
  issueId: string;
  issueNumber: string;
  module: string;
  moduleLabel: string;
  asset: AssetInfo;
  assetNotListed: boolean;
  otherIssueType: string | null;
  iecMember: { name: string | null };
  assignedDaroga: { name: string | null };
  reportedAt: string;
  decision: string;
  reviewer: { name: string | null; isYou: boolean };
  reviewedAt: string;
  remarks: string | null;
  attemptNumber: number | null;
  cycleNumber: number | null;
  inspectionDate: string | null;
  qcDecision: { decision: string; reviewer: string | null; remarks: string | null; reviewedAt: string } | null;
  currentStatus: string;
  closedAt: string | null;
};

export type HistoryDetail = Place & {
  readOnly: true;
  id: string;
  issueNumber: string;
  status: string;
  module: string;
  moduleLabel: string;
  asset: AssetInfo;
  assetNotListed: boolean;
  otherIssueType: string | null;
  remarks: string;
  iecMember: { name: string | null };
  assignedDaroga: { name: string | null };
  reportedAt: string;
  currentCycleNumber: number;
  location: { latitude: number; longitude: number; accuracyMeters: number | null; capturedAt: string };
  closedAt: string | null;
  beforePhotos: Photo[];
  latestUlbDecision: { reviewId: string; inspectionId: string; decision: string; reviewer: { name: string | null; isYou: boolean }; remarks: string | null; reviewedAt: string } | null;
  closure: { closedAt: string; approvedBy: string | null; remarks: string | null } | null;
  cycles: Array<{ cycleNumber: number; reason: string; startedAt: string; inspectionDueAt: string; closedAt: string | null }>;
  attempts: Array<{
    id: string;
    cycleNumber: number | null;
    attemptNumber: number;
    daroga: { name: string | null };
    submittedAt: string;
    remarks: string | null;
    outcome: string;
    surveyTitle: string | null;
    location: { latitude: number; longitude: number; accuracyMeters: number | null; capturedAt: string };
    distanceFromReportedMeters: number;
    answers: SurveyAnswer[];
    afterPhotos: AfterPhoto[];
    reviews: Array<{ reviewId: string; inspectionId: string; cycleNumber: number | null; reviewerRole: string; reviewer: { name: string | null; isYou: boolean }; decision: string; remarks: string | null; reviewedAt: string }>;
  }>;
  reopenRequests: Array<{
    id: string;
    cycleNumber: number | null;
    reason: string;
    requestedAt: string;
    requestedBy: { name: string | null };
    status: string;
    reviewer: { name: string | null; isYou: boolean } | null;
    decisionRemarks: string | null;
    decidedAt: string | null;
    newCycleNumber: number | null;
    photos: Photo[];
  }>;
  statusHistory: Array<{ event: string; fromStatus: string | null; toStatus: string; cycleNumber: number | null; actorRole: string | null; actorName: string | null; reason: string | null; at: string }>;
};

const q = (f: FilterState, extra: Record<string, string | number | boolean | undefined> = {}) =>
  buildQuery({ from: f.from, to: f.to, zoneId: f.zoneId, wardId: f.wardId, module: f.module, search: f.search, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v === undefined ? undefined : String(v)])) });

export const UlbCleanlinessApi = {
  filters: () => apiFetch<UlbFilterOptions>(`${BASE}/ulb/filters`),
  summary: (f: FilterState) => apiFetch<UlbSummary>(`${BASE}/ulb/summary${buildQuery({ from: f.from, to: f.to, zoneId: f.zoneId, wardId: f.wardId, module: f.module })}`),

  pending: (f: FilterState, page: number, pageSize: number) => apiFetch<Page<PendingItem>>(`${BASE}/ulb/pending${q(f, { page, pageSize })}`),
  pendingDetail: (issueId: string) => apiFetch<{ issue: PendingDetail }>(`${BASE}/ulb/${encodeURIComponent(issueId)}`).then((r) => r.issue),
  review: (issueId: string, body: ReviewBody) => apiFetch<ReviewResult>(`${BASE}/${encodeURIComponent(issueId)}/ulb/review`, { method: "POST", body: JSON.stringify(body) }),

  reopenPending: (f: FilterState, page: number, pageSize: number) => apiFetch<Page<ReopenItem>>(`${BASE}/ulb/reopen/pending${q(f, { page, pageSize })}`),
  reopenDetail: (requestId: string) => apiFetch<{ request: ReopenDetail }>(`${BASE}/ulb/reopen/${encodeURIComponent(requestId)}`).then((r) => r.request),
  reopenDecide: (requestId: string, body: ReopenBody) => apiFetch<ReopenResult>(`${BASE}/ulb/reopen/${encodeURIComponent(requestId)}/decision`, { method: "POST", body: JSON.stringify(body) }),

  history: (f: FilterState, opts: { decision?: string; mine?: boolean }, page: number, pageSize: number) =>
    apiFetch<Page<HistoryItem>>(`${BASE}/ulb/history${q(f, { page, pageSize, decision: opts.decision || undefined, mine: opts.mine ? "true" : undefined })}`),
  historyDetail: (issueId: string) => apiFetch<{ issue: HistoryDetail }>(`${BASE}/ulb/history/${encodeURIComponent(issueId)}`).then((r) => r.issue)
};
