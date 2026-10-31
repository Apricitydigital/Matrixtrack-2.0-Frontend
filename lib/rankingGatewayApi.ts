import { apiFetch } from "./apiClient";

/**
 * Client of the backend ranking gateway (/ranking-gateway), which proxies the external
 * Swachhta Parv ranking API. The API key never reaches the browser; access is decided by the
 * signed-in role and the per-city SWACHH_RANKING module toggle (HMS super admin).
 */

const BASE = "/ranking-gateway";

type Envelope = {
  organization?: { code: string; name: string } | null;
  generatedAt?: string;
};

export type RankingCategorySummary = {
  key: string;
  label: string;
  participants: number;
  fieldAssessmentsCompleted: number;
  selfAssessmentsCompleted: number;
  completionRate: number;
};

export type RankingSummary = Envelope & {
  participants: { approved: number; registered: number; pending: number; rejected: number };
  wards: number;
  surveys: { fieldAssessmentsCompleted: number; selfAssessmentsCompleted: number; total: number };
  categories: RankingCategorySummary[];
};

export type RankingEntry = {
  rank: number;
  participantId: string;
  name: string | null;
  ward: string | null;
  score: number;
  maxScore: number;
  percentage: number;
};

export type RankingResponse = Envelope & {
  basis?: string;
  categories: { category: string; participantsRanked: number; data: RankingEntry[] }[];
};

export type RankingZone = { id: string; name: string; wards: { id: string; name: string }[] };
export type RankingWard = { id: string; name: string; zoneId: string | null; zoneName: string | null };

export type RankingParticipant = {
  id: string;
  name: string | null;
  category: string;
  ward: string | null;
  zone: string | null;
  registeredAt: string | null;
};

export type RankingParticipantPage = Envelope & {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: RankingParticipant[];
};

export type RankingRow = Record<string, any>;
export type RankingGenericPage = Envelope & {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  basis?: string;
  data: RankingRow[];
};
export type RankingDashboard = Envelope & {
  population?: string;
  stages: Record<string, number | { count: number; percent: number }>;
  categories: RankingRow[];
};

export type RankingGatewayHealth = {
  configured: boolean;
  connected: boolean;
  apiKeyHint?: string | null;
  error?: string;
  organization?: { code: string; name: string } | null;
  client?: {
    name: string;
    environment: string;
    scopes: string[];
    rateLimitPerMinute: number | null;
    usageThisMonth: number | null;
    monthlyQuota: number | null;
    expiresAt: string | null;
  } | null;
  rateLimit?: { limit: string | null; remaining: string | null; reset: string | null } | null;
};

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const RankingGatewayApi = {
  summary: () => apiFetch<RankingSummary>(`${BASE}/summary`),
  rankings: (category?: string, limit?: number) =>
    apiFetch<RankingResponse>(`${BASE}/rankings${qs({ category, limit })}`),
  zones: () => apiFetch<Envelope & { data: RankingZone[] }>(`${BASE}/zones`),
  wards: () => apiFetch<Envelope & { data: RankingWard[] }>(`${BASE}/wards`),
  participants: (category: string | undefined, page: number, pageSize: number) =>
    apiFetch<RankingParticipantPage>(`${BASE}/participants${qs({ category, page, pageSize })}`),
  dashboard: (category?: string) => apiFetch<RankingDashboard>(`${BASE}/dashboard${qs({ category })}`),
  assessments: (category: string | undefined, page: number, pageSize: number) =>
    apiFetch<RankingGenericPage>(`${BASE}/assessments${qs({ category, page, pageSize })}`),
  selfAssessments: (category: string | undefined, page: number, pageSize: number) =>
    apiFetch<RankingGenericPage>(`${BASE}/self-assessments${qs({ category, page, pageSize })}`),
  scores: (category: string | undefined, page: number, pageSize: number) =>
    apiFetch<RankingGenericPage>(`${BASE}/scores${qs({ category, page, pageSize })}`),
  reviewRecords: (category: string | undefined, page: number, pageSize: number) =>
    apiFetch<RankingGenericPage>(`${BASE}/reports/review-records${qs({ category, page, pageSize })}`),
  health: () => apiFetch<RankingGatewayHealth>(`${BASE}/health`),
  clearCache: () => apiFetch<{ ok: boolean }>(`${BASE}/cache/clear`, { method: "POST" }),
};
