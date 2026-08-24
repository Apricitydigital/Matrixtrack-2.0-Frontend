import { apiFetch } from '@lib/apiClient';

export type WardPerformanceBand =
  | 'GREEN'
  | 'AMBER'
  | 'RED';

export type WardRankingModule =
  | 'SWEEPING'
  | 'TOILET'
  | 'LITTERBINS';

export type WardRankingComponent =
  | 'WORKFORCE'
  | 'BEAT'
  | 'TOILET'
  | 'LITTERBIN'
  | 'SUPERVISOR'
  | 'QC'
  | 'ACTION_OFFICER';

export type WardOperationalStatus =
  | 'DUE'
  | 'SUBMITTED'
  | 'PENDING_QC'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESUBMITTED'
  | 'CHECKED'
  | 'NOT_CHECKED'
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CLOSURE_REJECTED'
  | 'CLOSED'
  | 'ACTION_REQUIRED'
  | 'ACTION_TAKEN'
  | 'REOPENED';

export type WardRankingPeriodType =
  | 'DAY'
  | 'WEEK'
  | 'MONTH'
  | 'CUSTOM';

export type ScoreResult = {
  score: number;
  maxScore: number;
  percentage: number;
  applicable: boolean;
};

export type WardComponentScore =
  ScoreResult & {
    metrics?: Record<string, any>;
    components?: Record<
      string,
      ScoreResult
    >;
  };

export type WardRankingRow = {
  cityId: string;

  zoneId: string | null;
  zoneName?: string | null;

  wardId: string;
  wardName?: string | null;

  scoreDate: string;

  finalScore: number;

  performanceBand:
    | WardPerformanceBand
    | null;

  applicableWeight: number;
  rankable: boolean;

  cityRank?: number | null;
  zoneRank?: number | null;

  components: {
    workforce: WardComponentScore;
    beat: WardComponentScore;
    toilet: WardComponentScore;
    litterBin: WardComponentScore;
    supervisor: WardComponentScore;
    qc: WardComponentScore;
    actionOfficer: WardComponentScore;
  };

  tieBreakers?: Record<string, any>;

  topExceptions?: Array<{
    module: string;
    severity: string;
    title: string;
    description: string;
    count?: number;
  }>;

  trend?: {
    direction:
      | 'UP'
      | 'DOWN'
      | 'STABLE';

    change: number;

    sevenDayAverage?: number;
    thirtyDayAverage?: number;
  };
};

export type WardRankingQuery = {
  from?: string;
  to?: string;

  zoneId?: string;
  wardId?: string;

  module?: WardRankingModule;

  status?:
    | WardPerformanceBand
    | WardPerformanceBand[];
};

export type WardRankingComponentQuery =
  Omit<WardRankingQuery, 'status'> & {
    status?:
      | WardOperationalStatus
      | WardOperationalStatus[];
  };

export type WardRankingListResponse = {
  period?: {
    from: string;
    to: string;
  };

  generatedAt?: string;

  configVersion?: number;

  rankings: WardRankingRow[];

  [key: string]: any;
};

export type WardRankingSummaryResponse = {
  period: {
    from: string;
    to: string;
  };

  generatedAt?: string;

  totalWards: number;

  green: number;
  amber: number;
  red: number;

  averageScore: number;

  topWards: WardRankingRow[];
  bottomWards: WardRankingRow[];

  [key: string]: any;
};

export type WardRankingComponentResponse = {
  ward: {
    id: string;
    name: string;
    zoneId?: string | null;
    zoneName?: string | null;
  };

  period: {
    from: string;
    to: string;
  };

  component: WardRankingComponent;

  filters: {
    statuses: string[];
  };

  qcReviewHistory: any[];

  score: WardComponentScore;

  data: any;
};

function buildQuery(
  params: WardRankingQuery | WardRankingComponentQuery = {}
) {
  const query =
    new URLSearchParams();

  if (params.from) {
    query.set(
      'from',
      params.from
    );
  }

  if (params.to) {
    query.set(
      'to',
      params.to
    );
  }

  if (params.zoneId) {
    query.set(
      'zoneId',
      params.zoneId
    );
  }

  if (params.wardId) {
    query.set(
      'wardId',
      params.wardId
    );
  }

  if (params.module) {
    query.set(
      'module',
      params.module
    );
  }

  if (params.status) {
    const statuses =
      Array.isArray(
        params.status
      )
        ? params.status
        : [params.status];

    statuses.forEach(
      (status) => {
        query.append(
          'status',
          status
        );
      }
    );
  }

  const value =
    query.toString();

  return value
    ? `?${value}`
    : '';
}

export const WardRankingApi = {
  list: (
    params: WardRankingQuery = {}
  ) =>
    apiFetch<WardRankingListResponse>(
      `/ward-ranking${buildQuery(params)}`
    ),

  summary: (
    params: WardRankingQuery = {}
  ) =>
    apiFetch<WardRankingSummaryResponse>(
      `/ward-ranking/summary${buildQuery(params)}`
    ),

  detail: (
    wardId: string,
    params: WardRankingQuery = {}
  ) =>
    apiFetch<{
      period: {
        from: string;
        to: string;
      };

      generatedAt?: string;
      configVersion?: number;

      ranking: WardRankingRow;
    }>(
      `/ward-ranking/${encodeURIComponent(
        wardId
      )}${buildQuery(params)}`
    ),

  trend: (
    wardId: string,
    params: WardRankingQuery = {}
  ) =>
    apiFetch<any>(
      `/ward-ranking/${encodeURIComponent(
        wardId
      )}/trend${buildQuery(params)}`
    ),

  component: (
    wardId: string,
    component: WardRankingComponent,
    params: WardRankingComponentQuery = {}
  ) =>
    apiFetch<WardRankingComponentResponse>(
      `/ward-ranking/${encodeURIComponent(
        wardId
      )}/component/${encodeURIComponent(
        component
      )}${buildQuery(params)}`
    ),
};