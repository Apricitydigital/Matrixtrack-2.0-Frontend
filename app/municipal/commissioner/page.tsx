'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import { RoleGuard } from '@components/Guards';
import UniversalReportModal from '@components/UniversalReportModal';

import { useAuth } from '@hooks/useAuth';

import {
  ModuleRecordsApi,
} from '@lib/apiClient';

import {
  AttendanceApi,
  type AttendanceDashboardResponse,
  type AttendanceEmployeeSummary,
  type AttendanceRecord,
} from '@lib/attendanceApi';

import {
  WardRankingApi,
  type WardRankingRow,
} from '@lib/wardRankingApi';


/* =========================================================
   TYPES
========================================================= */

type InspectionModuleKey =
  | 'TOILET'
  | 'LITTERBINS'
  | 'SWEEPING';

type DashboardModuleKey =
  | 'ALL'
  | InspectionModuleKey
  | 'ATTENDANCE'
  | 'WARD_RANKING';

type RoleKey =
  | 'ALL'
  | 'SUPERVISOR'
  | 'QC'
  | 'ACTION_OFFICER'
  | 'EMPLOYEE';

type MetricKey =
  | 'OVERALL'
  | 'INSPECTION'
  | 'ATTENDANCE'
  | 'APPROVAL'
  | 'REJECTION'
  | 'ACTION_CLOSURE'
  | 'WARD_RANKING';

type DashboardRecord = any & {
  dashboardModule: InspectionModuleKey;
  dashboardModuleLabel: string;
};

type InspectionStats = {
  total: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
  pending: number;

  qcApproved: number;
  qcRejected: number;

  performance: number | null;
  approvalRate: number | null;
  rejectionRate: number | null;
  actionClosure: number | null;
};

type RolePerformanceRow = {
  key: string;
  id?: string | null;
  label: string;

  total: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
  pending: number;

  performance: number;
  records: DashboardRecord[];

  attendance?: number | null;
  attendanceEmployee?: AttendanceEmployeeSummary | null;
};

type GeoPerformanceRow = {
  label: string;

  performance: number | null;
  inspection: number | null;
  attendance: number | null;
  approval: number | null;
  rejection: number | null;
  actionClosure: number | null;
  wardRanking: number | null;

  records: DashboardRecord[];
  employees: AttendanceEmployeeSummary[];
  wards: WardRankingRow[];

  inspectionStats: InspectionStats;
};

type DrilldownState = {
  title: string;
  value?: string;

  breakdown?: Array<{
    label: string;
    value: string;
  }>;

  inspectionRecords?: DashboardRecord[];
  attendanceEmployees?: AttendanceEmployeeSummary[];
  wardRows?: WardRankingRow[];
};


/* =========================================================
   PROJECT LABELS
========================================================= */

const INSPECTION_MODULES: Array<{
  key: InspectionModuleKey;
  label: string;
}> = [
  {
    key: 'TOILET',
    label: 'Cleanliness of Toilets',
  },
  {
    key: 'LITTERBINS',
    label: 'Litter Bins',
  },
  {
    key: 'SWEEPING',
    label: 'Sweeping',
  },
];

const DASHBOARD_MODULES: Array<{
  key: DashboardModuleKey;
  label: string;
}> = [
  {
    key: 'ALL',
    label: 'All',
  },
  {
    key: 'TOILET',
    label: 'Cleanliness of Toilets',
  },
  {
    key: 'LITTERBINS',
    label: 'Litter Bins',
  },
  {
    key: 'SWEEPING',
    label: 'Sweeping',
  },
  {
    key: 'ATTENDANCE',
    label: 'Attendance',
  },
  {
    key: 'WARD_RANKING',
    label: 'Ward Ranking',
  },
];

const ROLES: Array<{
  key: RoleKey;
  label: string;
}> = [
  {
    key: 'ALL',
    label: 'All',
  },
  {
    key: 'SUPERVISOR',
    label: 'Daroga',
  },
  {
    key: 'QC',
    label: 'Sanitary Inspector',
  },
  {
    key: 'ACTION_OFFICER',
    label: 'IEC Member',
  },
  {
    key: 'EMPLOYEE',
    label: 'Employee',
  },
];

const METRICS: Array<{
  key: MetricKey;
  label: string;
}> = [
  {
    key: 'OVERALL',
    label: 'Overall Performance',
  },
  {
    key: 'INSPECTION',
    label: 'Inspection Performance',
  },
  {
    key: 'ATTENDANCE',
    label: 'Attendance',
  },
  {
    key: 'APPROVAL',
    label: 'Approval Rate',
  },
  {
    key: 'REJECTION',
    label: 'Rejection Rate',
  },
  {
    key: 'ACTION_CLOSURE',
    label: 'Action Closure',
  },
  {
    key: 'WARD_RANKING',
    label: 'Ward Ranking',
  },
];


/* =========================================================
   BASIC HELPERS
========================================================= */

function clamp(
  value: number,
  min = 0,
  max = 100
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function round1(
  value: number
) {
  return Math.round(
    value * 10
  ) / 10;
}

function percentText(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return `${round1(value)}%`;
}

function averageText(
  value: number
) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (value >= 100) {
    return Math.round(value)
      .toLocaleString('en-IN');
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1);
}

function averageApplicable(
  values: Array<number | null | undefined>
): number | null {
  const valid =
    values.filter(
      (
        value
      ): value is number =>
        typeof value === 'number' &&
        Number.isFinite(value)
    );

  if (!valid.length) {
    return null;
  }

  return (
    valid.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / valid.length
  );
}

function toDateInput(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function defaultRange() {
  const today =
    new Date();

  const start =
    new Date(today);

  start.setDate(
    start.getDate() - 29
  );

  return {
    from: toDateInput(start),
    to: toDateInput(today),
  };
}

function dateRangeDays(
  from: string,
  to: string
) {
  if (!from || !to) {
    return 1;
  }

  const start =
    new Date(
      `${from}T00:00:00`
    );

  const end =
    new Date(
      `${to}T00:00:00`
    );

  const diff =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
      86400000
    ) + 1;

  return Math.max(
    1,
    diff
  );
}

function formatDate(
  value: any
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function formatMinutes(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  const hours =
    Math.floor(
      value / 60
    );

  const mins =
    Math.round(
      value % 60
    );

  return `${hours}h ${mins}m`;
}

function naturalSort(
  values: string[]
) {
  return values.sort(
    (a, b) =>
      a.localeCompare(
        b,
        undefined,
        {
          numeric: true,
          sensitivity: 'base',
        }
      )
  );
}

function normalize(
  value: any
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   GRADIENT / INTENSITY
========================================================= */

function positiveColor(
  value: number
) {
  const score =
    clamp(value);

  const lightness =
    96 -
    score * 0.55;

  return `hsl(239 84% ${lightness}%)`;
}

function negativeColor(
  value: number
) {
  const score =
    clamp(value);

  const lightness =
    97 -
    score * 0.52;

  return `hsl(347 78% ${lightness}%)`;
}

function heatTextClass(
  value: number
) {
  return value >= 66
    ? 'text-white'
    : 'text-slate-950';
}


/* =========================================================
   RECORD HELPERS
========================================================= */

function moduleLabel(
  moduleKey: InspectionModuleKey
) {
  return (
    INSPECTION_MODULES.find(
      (item) =>
        item.key === moduleKey
    )?.label ||
    moduleKey
  );
}

function recordDate(
  item: any
) {
  return (
    item?.actionTakenAt ||
    item?.actionOfficerRespondedAt ||
    item?.updatedAt ||
    item?.reviewedAt ||
    item?.qcReviewedAt ||
    item?.submittedAt ||
    item?.inspectionDate ||
    item?.reportDate ||
    item?.createdAt ||
    item?.visitedAt ||
    null
  );
}

function effectiveStatus(
  item: any
) {
  if (
    item?.workspaceStatus
  ) {
    return String(
      item.workspaceStatus
    ).toUpperCase();
  }

  const actionStatus =
    String(
      item?.actionStatus ||
      ''
    ).toUpperCase();

  if (
    actionStatus ===
      'ACTION_REQUIRED' ||
    actionStatus ===
      'ACTION_TAKEN'
  ) {
    return actionStatus;
  }

  if (
    item?.actionOfficerRespondedAt &&
    String(
      item?.status || ''
    ).toUpperCase() ===
      'ACTION_REQUIRED'
  ) {
    return 'ACTION_TAKEN';
  }

  const status =
    String(
      item?.status ||
      item?.reviewStatus ||
      item?.qcStatus ||
      ''
    ).toUpperCase();

  if (
    [
      'PENDING_QC',
      'SUBMITTED',
      'IN_PROGRESS',
      'DRAFT',
    ].includes(status)
  ) {
    return 'PENDING';
  }

  return status || 'PENDING';
}

function qcDecision(
  item: any
) {
  const explicit =
    String(
      item?.qcDecision ||
      ''
    ).toUpperCase();

  if (
    explicit ===
      'APPROVED' ||
    explicit ===
      'REJECTED'
  ) {
    return explicit;
  }

  const status =
    effectiveStatus(item);

  if (
    status ===
      'APPROVED' ||
    status ===
      'REJECTED'
  ) {
    return status;
  }

  return '';
}

function getRecordZone(
  item: any
) {
  return String(
    item?.zoneName ||
    item?.bin?.zoneName ||
    item?.toilet?.zoneName ||
    item?.toilet?.ward?.parent
      ?.name ||
    item?.zone?.name ||
    item?.bin?.zone?.name ||
    item?.beat?.zoneName ||
    item?.beat?.zone?.name ||
    ''
  ).trim();
}

function getRecordWard(
  item: any
) {
  return String(
    item?.wardName ||
    item?.bin?.wardName ||
    item?.toilet?.wardName ||
    item?.toilet?.ward?.name ||
    item?.ward?.name ||
    item?.bin?.ward?.name ||
    item?.beat?.wardName ||
    item?.beat?.ward?.name ||
    ''
  ).trim();
}

function getDarogaName(
  item: any
) {
  return (
    item?.supervisor?.name ||
    item?.employee?.name ||
    item?.submittedBy?.name ||
    item?.submittedByName ||
    item?.createdBy?.name ||
    item?.payload?.submittedBy
      ?.name ||
    item?.payload?.supervisor
      ?.name ||
    ''
  );
}

function getDarogaId(
  item: any
) {
  return (
    item?.supervisor?.id ||
    item?.supervisorId ||
    item?.employee?.id ||
    item?.employeeId ||
    item?.submittedBy?.id ||
    item?.createdBy?.id ||
    item?.createdById ||
    null
  );
}

function getSiName(
  item: any
) {
  return (
    item?.reviewedBy?.name ||
    item?.qcReviewer?.name ||
    item?.qc?.name ||
    item?.reviewedByName ||
    item?.qcReviewerName ||
    ''
  );
}

function getSiId(
  item: any
) {
  return (
    item?.reviewedBy?.id ||
    item?.reviewedById ||
    item?.qcReviewer?.id ||
    item?.qcId ||
    null
  );
}

function getIecName(
  item: any
) {
  return (
    item?.actionTakenBy?.name ||
    item?.actionOfficer?.name ||
    item?.actionTakenByName ||
    item?.actionOfficerName ||
    ''
  );
}

function getIecId(
  item: any
) {
  return (
    item?.actionTakenBy?.id ||
    item?.actionTakenById ||
    item?.actionOfficer?.id ||
    item?.actionOfficerId ||
    null
  );
}

function getRecordTitle(
  item: DashboardRecord
) {
  if (
    item.dashboardModule ===
    'TOILET'
  ) {
    return (
      item?.toilet?.name ||
      item?.toiletName ||
      item?.name ||
      'Cleanliness of Toilets'
    );
  }

  if (
    item.dashboardModule ===
    'SWEEPING'
  ) {
    return (
      item?.beatName ||
      item?.beat?.beatName ||
      item?.areaName ||
      'Sweeping'
    );
  }

  return (
    item?.locationName ||
    item?.bin?.locationName ||
    item?.areaName ||
    item?.bin?.areaName ||
    'Litter Bins'
  );
}

function personForRole(
  item: DashboardRecord,
  role: RoleKey
) {
  if (
    role === 'SUPERVISOR'
  ) {
    return getDarogaName(item);
  }

  if (
    role === 'QC'
  ) {
    return getSiName(item);
  }

  if (
    role === 'ACTION_OFFICER'
  ) {
    return getIecName(item);
  }

  return '';
}

function userIdsForRecord(
  item: DashboardRecord
) {
  return [
    getDarogaId(item),
    getSiId(item),
    getIecId(item),
  ]
    .filter(Boolean)
    .map(String);
}


/* =========================================================
   INSPECTION STATS
========================================================= */

function inspectionStats(
  records: DashboardRecord[]
): InspectionStats {
  let approved = 0;
  let rejected = 0;
  let actionRequired = 0;
  let actionTaken = 0;
  let pending = 0;

  let qcApproved = 0;
  let qcRejected = 0;

  records.forEach(
    (item) => {
      const status =
        effectiveStatus(item);

      if (
        status === 'APPROVED'
      ) {
        approved += 1;
      } else if (
        status === 'REJECTED'
      ) {
        rejected += 1;
      } else if (
        status ===
        'ACTION_REQUIRED'
      ) {
        actionRequired += 1;
      } else if (
        status ===
        'ACTION_TAKEN'
      ) {
        actionTaken += 1;
      } else {
        pending += 1;
      }

      const decision =
        qcDecision(item);

      if (
        decision === 'APPROVED'
      ) {
        qcApproved += 1;
      } else if (
        decision === 'REJECTED'
      ) {
        qcRejected += 1;
      }
    }
  );

  const total =
    records.length;

  const performance =
    total > 0
      ? (
          (
            approved +
            actionTaken
          ) /
          total
        ) * 100
      : null;

  const decided =
    qcApproved +
    qcRejected;

  const approvalRate =
    decided > 0
      ? (
          qcApproved /
          decided
        ) * 100
      : null;

  const rejectionRate =
    decided > 0
      ? (
          qcRejected /
          decided
        ) * 100
      : null;

  const corrective =
    actionRequired +
    actionTaken;

  const actionClosure =
    corrective > 0
      ? (
          actionTaken /
          corrective
        ) * 100
      : null;

  return {
    total,
    approved,
    rejected,
    actionRequired,
    actionTaken,
    pending,

    qcApproved,
    qcRejected,

    performance,
    approvalRate,
    rejectionRate,
    actionClosure,
  };
}


/* =========================================================
   LOAD ALL INSPECTION PAGES
========================================================= */

async function loadAllModuleRecords(
  moduleKey: InspectionModuleKey,
  from?: string,
  to?: string
) {
  const limit =
    1000;

  const first =
    await ModuleRecordsApi
      .getRecords(
        moduleKey,
        {
          page: 1,
          limit,
          tab: 'HISTORY',
          fromDate:
            from || undefined,
          toDate:
            to || undefined,
        }
      );

  const firstRows =
    first.data || [];

  const totalPages =
    Math.max(
      1,
      first.meta?.totalPages ||
        Math.ceil(
          (
            first.meta?.total ||
            firstRows.length
          ) / limit
        )
    );

  if (
    totalPages <= 1
  ) {
    return firstRows;
  }

  const rows =
    [...firstRows];

  const batchSize =
    5;

  for (
    let start = 2;
    start <= totalPages;
    start += batchSize
  ) {
    const pages =
      Array.from(
        {
          length:
            Math.min(
              batchSize,
              totalPages -
                start +
                1
            ),
        },
        (
          _,
          index
        ) =>
          start + index
      );

    const results =
      await Promise.all(
        pages.map(
          (page) =>
            ModuleRecordsApi
              .getRecords(
                moduleKey,
                {
                  page,
                  limit,
                  tab:
                    'HISTORY',
                  fromDate:
                    from ||
                    undefined,
                  toDate:
                    to ||
                    undefined,
                }
              )
        )
      );

    results.forEach(
      (result) => {
        rows.push(
          ...(
            result.data ||
            []
          )
        );
      }
    );
  }

  return rows;
}


/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  label,
  value,
  gradient,
  icon,
  tooltip,
  onClick,
}: {
  label: string;
  value: string;
  gradient: string;
  icon: React.ReactNode;
  tooltip: Array<{
    label: string;
    value: string;
  }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[138px] overflow-hidden rounded-[24px] border border-white/70 bg-white p-4 text-left shadow-[0_12px_36px_-22px_rgba(15,23,42,.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-26px_rgba(79,70,229,.38)]"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${gradient}`}
      />

      <div
        className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.10] blur-2xl transition duration-300 group-hover:opacity-[0.20]`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            {label}
          </div>

          <div className="mt-3 text-[30px] font-black tracking-tight text-slate-950">
            {value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-20 hidden rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl group-hover:block">
        <div className="space-y-1.5">
          {tooltip.map(
            (row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="flex items-center justify-between gap-4 text-[11px]"
              >
                <span className="font-semibold text-slate-500">
                  {row.label}
                </span>

                <span className="font-black text-slate-950">
                  {row.value}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </button>
  );
}


/* =========================================================
   STATUS AVERAGE CARD
========================================================= */

function StatusAverageCard({
  label,
  count,
  days,
  gradient,
  onClick,
}: {
  label: string;
  count: number;
  days: number;
  gradient: string;
  onClick: () => void;
}) {
  const average =
    count / Math.max(
      1,
      days
    );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${gradient}`}
      />

      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-2xl font-black text-slate-950">
        {averageText(
          average
        )}
      </div>

      <div className="mt-1 text-[10px] font-bold text-slate-400">
        Average / Day
      </div>

      <div className="absolute right-3 top-3 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-900 shadow-xl group-hover:block">
        {count.toLocaleString(
          'en-IN'
        )}
      </div>
    </button>
  );
}


/* =========================================================
   DRILLDOWN DRAWER
========================================================= */

function DrilldownDrawer({
  data,
  onClose,
  onReport,
  onEmployee,
  onWard,
}: {
  data: DrilldownState;
  onClose: () => void;
  onReport: (
    item: DashboardRecord
  ) => void;
  onEmployee: (
    item: AttendanceEmployeeSummary
  ) => void;
  onWard: (
    item: WardRankingRow
  ) => void;
}) {
  type Tab =
    | 'INSPECTION'
    | 'ATTENDANCE'
    | 'WARD_RANKING';

  const tabs =
    useMemo(() => {
      const list: Array<{
        key: Tab;
        label: string;
      }> = [];

      if (
        data.inspectionRecords
          ?.length
      ) {
        list.push({
          key:
            'INSPECTION',
          label:
            'Inspection & Performance',
        });
      }

      if (
        data.attendanceEmployees
          ?.length
      ) {
        list.push({
          key:
            'ATTENDANCE',
          label:
            'Attendance',
        });
      }

      if (
        data.wardRows?.length
      ) {
        list.push({
          key:
            'WARD_RANKING',
          label:
            'Ward Ranking',
        });
      }

      return list;
    }, [data]);

  const [tab, setTab] =
    useState<Tab>(
      tabs[0]?.key ||
        'INSPECTION'
    );

  const [page, setPage] =
    useState(1);

  useEffect(() => {
    setTab(
      tabs[0]?.key ||
        'INSPECTION'
    );

    setPage(1);
  }, [data, tabs]);

  const pageSize =
    40;

  const inspectionRows =
    data.inspectionRecords ||
    [];

  const attendanceRows =
    data.attendanceEmployees ||
    [];

  const wardRows =
    data.wardRows ||
    [];

  const activeLength =
    tab === 'INSPECTION'
      ? inspectionRows.length
      : tab ===
        'ATTENDANCE'
      ? attendanceRows.length
      : wardRows.length;

  const pages =
    Math.max(
      1,
      Math.ceil(
        activeLength /
          pageSize
      )
    );

  const start =
    (page - 1) *
    pageSize;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[1120px] flex-col border-l border-slate-200 bg-[#f8fafc] shadow-[-30px_0_80px_-30px_rgba(15,23,42,.42)]">
        <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="text-lg font-black tracking-tight text-slate-950">
                {data.title}
              </div>

              {data.value && (
                <div className="mt-1 text-3xl font-black tracking-tight text-indigo-700">
                  {data.value}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <X size={18} />
            </button>
          </div>

          {!!data.breakdown
            ?.length && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {data.breakdown.map(
                (row) => (
                  <div
                    key={row.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                      {row.label}
                    </div>

                    <div className="mt-1 text-sm font-black text-slate-950">
                      {row.value}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {tabs.length >
            1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tabs.map(
                (item) => (
                  <button
                    key={
                      item.key
                    }
                    type="button"
                    onClick={() => {
                      setTab(
                        item.key
                      );
                      setPage(
                        1
                      );
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                      tab ===
                      item.key
                        ? 'bg-slate-950 text-white shadow-lg'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {
                      item.label
                    }
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {tab ===
            'INSPECTION' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                      <th className="px-4 py-3">
                        Date
                      </th>
                      <th className="px-4 py-3">
                        Module
                      </th>
                      <th className="px-4 py-3">
                        Zone
                      </th>
                      <th className="px-4 py-3">
                        Ward
                      </th>
                      <th className="px-4 py-3">
                        Daroga
                      </th>
                      <th className="px-4 py-3">
                        Sanitary Inspector
                      </th>
                      <th className="px-4 py-3">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {inspectionRows
                      .slice(
                        start,
                        start +
                          pageSize
                      )
                      .map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item.id ||
                              `${start}-${index}`
                            }
                            className="transition hover:bg-indigo-50/40"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600">
                              {formatDate(
                                recordDate(
                                  item
                                )
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-slate-900">
                              {
                                item.dashboardModuleLabel
                              }
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                              {getRecordZone(
                                item
                              ) ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                              {getRecordWard(
                                item
                              ) ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                              {getDarogaName(
                                item
                              ) ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                              {getSiName(
                                item
                              ) ||
                                '—'}
                            </td>

                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">
                                {effectiveStatus(
                                  item
                                ).replace(
                                  /_/g,
                                  ' '
                                )}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  onReport(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <Eye
                                  size={
                                    13
                                  }
                                />
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab ===
            'ATTENDANCE' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                      <th className="px-4 py-3">
                        Employee
                      </th>
                      <th className="px-4 py-3">
                        Zone
                      </th>
                      <th className="px-4 py-3">
                        Ward
                      </th>
                      <th className="px-4 py-3">
                        Present
                      </th>
                      <th className="px-4 py-3">
                        Absent
                      </th>
                      <th className="px-4 py-3">
                        Attendance
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {attendanceRows
                      .slice(
                        start,
                        start +
                          pageSize
                      )
                      .map(
                        (
                          item
                        ) => (
                          <tr
                            key={
                              item.attendanceId
                            }
                            className="transition hover:bg-cyan-50/50"
                          >
                            <td className="px-4 py-3 text-xs font-black text-slate-950">
                              {
                                item.employeeName
                              }
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                              {item.zones?.join(
                                ', '
                              ) ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                              {item.wards?.join(
                                ', '
                              ) ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-emerald-700">
                              {
                                item.presentDays
                              }
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-rose-700">
                              {
                                item.absentDays
                              }
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-slate-950">
                              {percentText(
                                item.attendanceRate
                              )}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  onEmployee(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
                              >
                                <Eye
                                  size={
                                    13
                                  }
                                />
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab ===
            'WARD_RANKING' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                      <th className="px-4 py-3">
                        Ward
                      </th>
                      <th className="px-4 py-3">
                        Zone
                      </th>
                      <th className="px-4 py-3">
                        Ward Ranking
                      </th>
                      <th className="px-4 py-3">
                        City Rank
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {wardRows
                      .slice(
                        start,
                        start +
                          pageSize
                      )
                      .map(
                        (item) => (
                          <tr
                            key={
                              item.wardId
                            }
                            className="transition hover:bg-violet-50/50"
                          >
                            <td className="px-4 py-3 text-xs font-black text-slate-950">
                              {item.wardName ||
                                item.wardId}
                            </td>

                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                              {item.zoneName ||
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-violet-700">
                              {percentText(
                                item.finalScore
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs font-black text-slate-700">
                              {item.cityRank ??
                                '—'}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  onWard(
                                    item
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <Eye
                                  size={
                                    13
                                  }
                                />
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
            <button
              type="button"
              disabled={
                page <= 1
              }
              onClick={() =>
                setPage(
                  (
                    current
                  ) =>
                    Math.max(
                      1,
                      current -
                        1
                    )
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>

            <div className="text-xs font-black text-slate-500">
              {page} / {pages}
            </div>

            <button
              type="button"
              disabled={
                page >= pages
              }
              onClick={() =>
                setPage(
                  (
                    current
                  ) =>
                    Math.min(
                      pages,
                      current +
                        1
                    )
                )
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}


/* =========================================================
   ATTENDANCE PROOF
========================================================= */

function AttendanceProof({
  employee,
  records,
  loading,
  onClose,
}: {
  employee: AttendanceEmployeeSummary;
  records: AttendanceRecord[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <div className="absolute bottom-0 right-0 top-0 w-full max-w-[760px] overflow-auto border-l border-slate-200 bg-white shadow-[-30px_0_80px_-30px_rgba(15,23,42,.55)]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700">
              Attendance
            </div>

            <div className="mt-1 text-xl font-black text-slate-950">
              {
                employee.employeeName
              }
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              {
                label:
                  'Attendance',
                value:
                  percentText(
                    employee.attendanceRate
                  ),
              },
              {
                label:
                  'Present',
                value:
                  String(
                    employee.presentDays
                  ),
              },
              {
                label:
                  'Absent',
                value:
                  String(
                    employee.absentDays
                  ),
              },
              {
                label:
                  'Working Hours',
                value:
                  formatMinutes(
                    employee.avgWorkMinutes
                  ),
              },
              {
                label:
                  'Zone',
                value:
                  employee.zones?.join(
                    ', '
                  ) ||
                  '—',
              },
              {
                label:
                  'Ward',
                value:
                  employee.wards?.join(
                    ', '
                  ) ||
                  '—',
              },
            ].map(
              (item) => (
                <div
                  key={
                    item.label
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {
                      item.label
                    }
                  </div>

                  <div className="mt-1 text-base font-black text-slate-950">
                    {
                      item.value
                    }
                  </div>
                </div>
              )
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-950">
              Attendance
            </div>

            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({
                  length: 6,
                }).map(
                  (
                    _,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="h-12 animate-pulse rounded-xl bg-slate-100"
                    />
                  )
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {records.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="grid grid-cols-4 gap-2 px-4 py-3 text-xs"
                    >
                      <div className="font-bold text-slate-700">
                        {formatDate(
                          item.attendanceDate
                        )}
                      </div>

                      <div className="font-black text-slate-950">
                        {
                          item.status
                        }
                      </div>

                      <div className="font-semibold text-slate-500">
                        {item.inTime ||
                          '—'}
                      </div>

                      <div className="font-semibold text-slate-500">
                        {item.outTime ||
                          '—'}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   WARD PROOF
========================================================= */

function WardProof({
  ward,
  onClose,
}: {
  ward: WardRankingRow;
  onClose: () => void;
}) {
  const components =
    [
      {
        label:
          'Attendance',
        value:
          ward.components
            ?.workforce
            ?.percentage,
      },
      {
        label:
          'Sweeping',
        value:
          ward.components
            ?.beat
            ?.percentage,
      },
      {
        label:
          'Cleanliness of Toilets',
        value:
          ward.components
            ?.toilet
            ?.percentage,
      },
      {
        label:
          'Litter Bins',
        value:
          ward.components
            ?.litterBin
            ?.percentage,
      },
      {
        label:
          'Daroga',
        value:
          ward.components
            ?.supervisor
            ?.percentage,
      },
      {
        label:
          'Sanitary Inspector',
        value:
          ward.components
            ?.qc
            ?.percentage,
      },
      {
        label:
          'IEC Member',
        value:
          ward.components
            ?.actionOfficer
            ?.percentage,
      },
    ];

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <div className="absolute bottom-0 right-0 top-0 w-full max-w-[720px] overflow-auto border-l border-slate-200 bg-white shadow-[-30px_0_80px_-30px_rgba(15,23,42,.55)]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">
              Ward Ranking
            </div>

            <div className="mt-1 text-xl font-black text-slate-950">
              {ward.wardName ||
                ward.wardId}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-violet-500">
                Ward Ranking
              </div>

              <div className="mt-1 text-2xl font-black text-violet-900">
                {percentText(
                  ward.finalScore
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                City Rank
              </div>

              <div className="mt-1 text-2xl font-black text-slate-950">
                {ward.cityRank ??
                  '—'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Zone
              </div>

              <div className="mt-1 text-base font-black text-slate-950">
                {ward.zoneName ||
                  '—'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {components.map(
              (component) => {
                const value =
                  Number(
                    component.value
                  ) || 0;

                return (
                  <div
                    key={
                      component.label
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-black text-slate-700">
                        {
                          component.label
                        }
                      </span>

                      <span className="text-sm font-black text-slate-950">
                        {percentText(
                          component.value
                        )}
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width:
                            `${clamp(
                              value
                            )}%`,
                          background:
                            positiveColor(
                              value
                            ),
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   MAIN
========================================================= */

export default function CommissionerDashboard() {
  const { user } =
    useAuth();

  const initial =
    useMemo(
      () => defaultRange(),
      []
    );

  const cityId =
    user?.city?.id ||
    undefined;

  const cityName =
    user?.city?.name ||
    'Municipal Corporation';

  /* =========================
     DATA
  ========================= */

  const [
    records,
    setRecords,
  ] =
    useState<
      DashboardRecord[]
    >([]);

  const [
    attendance,
    setAttendance,
  ] =
    useState<AttendanceDashboardResponse | null>(
      null
    );

  const [
    wardRows,
    setWardRows,
  ] =
    useState<
      WardRankingRow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    loadError,
    setLoadError,
  ] =
    useState(false);

  /* =========================
     DATE
  ========================= */

  const [
    from,
    setFrom,
  ] =
    useState(
      initial.from
    );

  const [
    to,
    setTo,
  ] =
    useState(
      initial.to
    );

  const [
    appliedFrom,
    setAppliedFrom,
  ] =
    useState(
      initial.from
    );

  const [
    appliedTo,
    setAppliedTo,
  ] =
    useState(
      initial.to
    );

  /* =========================
     FILTERS
  ========================= */

  const [
    moduleFilter,
    setModuleFilter,
  ] =
    useState<DashboardModuleKey>(
      'ALL'
    );

  const [
    zoneFilter,
    setZoneFilter,
  ] =
    useState('ALL');

  const [
    wardFilter,
    setWardFilter,
  ] =
    useState('ALL');

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<RoleKey>(
      'ALL'
    );

  const [
    personFilter,
    setPersonFilter,
  ] =
    useState('ALL');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('ALL');

  const [
    metricFilter,
    setMetricFilter,
  ] =
    useState<MetricKey>(
      'OVERALL'
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(true);

  /* =========================
     DRILLDOWN / PROOF
  ========================= */

  const [
    drilldown,
    setDrilldown,
  ] =
    useState<DrilldownState | null>(
      null
    );

  const [
    proofReport,
    setProofReport,
  ] =
    useState<DashboardRecord | null>(
      null
    );

  const [
    proofAttendance,
    setProofAttendance,
  ] =
    useState<AttendanceEmployeeSummary | null>(
      null
    );

  const [
    proofAttendanceRecords,
    setProofAttendanceRecords,
  ] =
    useState<
      AttendanceRecord[]
    >([]);

  const [
    proofAttendanceLoading,
    setProofAttendanceLoading,
  ] =
    useState(false);

  const [
    proofWard,
    setProofWard,
  ] =
    useState<WardRankingRow | null>(
      null
    );


  /* =========================================================
     LOAD
  ========================================================= */

  const loadDashboard =
    useCallback(
      async (
        refresh = false
      ) => {
        if (refresh) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        setLoadError(
          false
        );

        const modulePromise =
          Promise.all(
            INSPECTION_MODULES.map(
              async (
                module
              ) => {
                const data =
                  await loadAllModuleRecords(
                    module.key,
                    appliedFrom ||
                      undefined,
                    appliedTo ||
                      undefined
                  );

                return data.map(
                  (
                    item
                  ) => ({
                    ...item,
                    dashboardModule:
                      module.key,
                    dashboardModuleLabel:
                      module.label,
                  })
                );
              }
            )
          );

        const attendancePromise =
          AttendanceApi.dashboard(
            {
              cityId,
              from:
                appliedFrom ||
                undefined,
              to:
                appliedTo ||
                undefined,
              page: 1,
              pageSize:
                5000,
            }
          );

        const wardPromise =
          WardRankingApi.list(
            {
              from:
                appliedFrom ||
                undefined,
              to:
                appliedTo ||
                undefined,
            }
          );

        const results =
          await Promise.allSettled(
            [
              modulePromise,
              attendancePromise,
              wardPromise,
            ]
          );

        const moduleResult =
          results[0];

        const attendanceResult =
          results[1];

        const wardResult =
          results[2];

        if (
          moduleResult.status ===
          'fulfilled'
        ) {
          setRecords(
            moduleResult.value.flat()
          );
        } else {
          setRecords([]);
          setLoadError(
            true
          );
        }

        if (
          attendanceResult.status ===
          'fulfilled'
        ) {
          setAttendance(
            attendanceResult.value
          );
        } else {
          setAttendance(
            null
          );
          setLoadError(
            true
          );
        }

        if (
          wardResult.status ===
          'fulfilled'
        ) {
          setWardRows(
            wardResult.value
              .rankings ||
              []
          );
        } else {
          setWardRows(
            []
          );
          setLoadError(
            true
          );
        }

        setLoading(
          false
        );

        setRefreshing(
          false
        );
      },
      [
        appliedFrom,
        appliedTo,
        cityId,
      ]
    );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  /* =========================================================
     ATTENDANCE PROOF
  ========================================================= */

  useEffect(() => {
    if (!proofAttendance) {
      setProofAttendanceRecords(
        []
      );
      return;
    }

    let active =
      true;

    async function load() {
      setProofAttendanceLoading(
        true
      );

      try {
        const result =
          await AttendanceApi.dashboard(
            {
              cityId,
              from:
                appliedFrom ||
                undefined,
              to:
                appliedTo ||
                undefined,
              employeeId:
                proofAttendance!
                  .attendanceId,
              page: 1,
              pageSize:
                500,
            }
          );

        if (active) {
          setProofAttendanceRecords(
            result.records ||
              []
          );
        }
      } catch {
        if (active) {
          setProofAttendanceRecords(
            []
          );
        }
      } finally {
        if (active) {
          setProofAttendanceLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      active =
        false;
    };
  }, [
    proofAttendance,
    cityId,
    appliedFrom,
    appliedTo,
  ]);


  /* =========================================================
     ROLE USER IDS FOR ATTENDANCE MAPPING
  ========================================================= */

  const roleUserIds =
    useMemo(() => {
      const daroga =
        new Set<string>();

      const si =
        new Set<string>();

      const iec =
        new Set<string>();

      records.forEach(
        (item) => {
          const d =
            getDarogaId(
              item
            );

          const q =
            getSiId(item);

          const a =
            getIecId(item);

          if (d) {
            daroga.add(
              String(d)
            );
          }

          if (q) {
            si.add(
              String(q)
            );
          }

          if (a) {
            iec.add(
              String(a)
            );
          }
        }
      );

      return {
        daroga,
        si,
        iec,
      };
    }, [records]);


  /* =========================================================
     OPTIONS
  ========================================================= */

  const zoneOptions =
    useMemo(() => {
      const values =
        new Set<string>();

      records.forEach(
        (item) => {
          const value =
            getRecordZone(
              item
            );

          if (value) {
            values.add(
              value
            );
          }
        }
      );

      attendance?.employees
        ?.forEach(
          (employee) => {
            employee.zones
              ?.forEach(
                (zone) => {
                  if (zone) {
                    values.add(
                      zone
                    );
                  }
                }
              );
          }
        );

      wardRows.forEach(
        (ward) => {
          if (
            ward.zoneName
          ) {
            values.add(
              ward.zoneName
            );
          }
        }
      );

      return naturalSort(
        Array.from(
          values
        )
      );
    }, [
      records,
      attendance,
      wardRows,
    ]);

  const wardOptions =
    useMemo(() => {
      const values =
        new Set<string>();

      records.forEach(
        (item) => {
          const zone =
            getRecordZone(
              item
            );

          const ward =
            getRecordWard(
              item
            );

          if (
            ward &&
            (
              zoneFilter ===
                'ALL' ||
              zone ===
                zoneFilter
            )
          ) {
            values.add(
              ward
            );
          }
        }
      );

      attendance?.employees
        ?.forEach(
          (employee) => {
            const matchesZone =
              zoneFilter ===
                'ALL' ||
              employee.zones
                ?.includes(
                  zoneFilter
                );

            if (
              matchesZone
            ) {
              employee.wards
                ?.forEach(
                  (ward) => {
                    if (ward) {
                      values.add(
                        ward
                      );
                    }
                  }
                );
            }
          }
        );

      wardRows.forEach(
        (ward) => {
          if (
            ward.wardName &&
            (
              zoneFilter ===
                'ALL' ||
              ward.zoneName ===
                zoneFilter
            )
          ) {
            values.add(
              ward.wardName
            );
          }
        }
      );

      return naturalSort(
        Array.from(
          values
        )
      );
    }, [
      records,
      attendance,
      wardRows,
      zoneFilter,
    ]);

  const personOptions =
    useMemo(() => {
      const values =
        new Set<string>();

      if (
        roleFilter ===
          'ALL' ||
        roleFilter ===
          'SUPERVISOR'
      ) {
        records.forEach(
          (item) => {
            const name =
              getDarogaName(
                item
              );

            if (name) {
              values.add(
                name
              );
            }
          }
        );
      }

      if (
        roleFilter ===
          'ALL' ||
        roleFilter ===
          'QC'
      ) {
        records.forEach(
          (item) => {
            const name =
              getSiName(
                item
              );

            if (name) {
              values.add(
                name
              );
            }
          }
        );
      }

      if (
        roleFilter ===
          'ALL' ||
        roleFilter ===
          'ACTION_OFFICER'
      ) {
        records.forEach(
          (item) => {
            const name =
              getIecName(
                item
              );

            if (name) {
              values.add(
                name
              );
            }
          }
        );
      }

      if (
        roleFilter ===
          'ALL' ||
        roleFilter ===
          'EMPLOYEE'
      ) {
        attendance?.employees
          ?.forEach(
            (
              employee
            ) => {
              if (
                employee.employeeName
              ) {
                values.add(
                  employee.employeeName
                );
              }
            }
          );
      }

      return naturalSort(
        Array.from(
          values
        )
      );
    }, [
      records,
      attendance,
      roleFilter,
    ]);

  const statusOptions =
    useMemo(() => {
      if (
        moduleFilter ===
        'ATTENDANCE'
      ) {
        return [
          'ALL',
          'PRESENT',
          'ABSENT',
        ];
      }

      if (
        moduleFilter ===
        'WARD_RANKING'
      ) {
        return [
          'ALL',
          'GREEN',
          'AMBER',
          'RED',
        ];
      }

      return [
        'ALL',
        'APPROVED',
        'REJECTED',
        'ACTION_REQUIRED',
        'ACTION_TAKEN',
        'PENDING',
      ];
    }, [
      moduleFilter,
    ]);

  useEffect(() => {
    if (
      !statusOptions.includes(
        statusFilter
      )
    ) {
      setStatusFilter(
        'ALL'
      );
    }
  }, [
    statusOptions,
    statusFilter,
  ]);

  useEffect(() => {
    setWardFilter(
      'ALL'
    );
  }, [zoneFilter]);

  useEffect(() => {
    setPersonFilter(
      'ALL'
    );
  }, [roleFilter]);


  /* =========================================================
     FILTER HELPERS
  ========================================================= */

  const searchValue =
    normalize(search);

  const selectedAttendanceEmployee =
    useMemo(
      () =>
        attendance?.employees
          ?.find(
            (employee) =>
              employee.employeeName ===
              personFilter
          ) ||
        null,
      [
        attendance,
        personFilter,
      ]
    );

  function recordMatchesRole(
    item: DashboardRecord
  ) {
    if (
      roleFilter ===
      'ALL'
    ) {
      if (
        personFilter ===
        'ALL'
      ) {
        return true;
      }

      const names =
        [
          getDarogaName(
            item
          ),
          getSiName(item),
          getIecName(item),
        ];

      if (
        names.includes(
          personFilter
        )
      ) {
        return true;
      }

      const mappedId =
        selectedAttendanceEmployee
          ?.matrixTrackUserId;

      return Boolean(
        mappedId &&
          userIdsForRecord(
            item
          ).includes(
            String(
              mappedId
            )
          )
      );
    }

    if (
      roleFilter ===
      'EMPLOYEE'
    ) {
      if (
        !selectedAttendanceEmployee
          ?.matrixTrackUserId
      ) {
        return false;
      }

      return userIdsForRecord(
        item
      ).includes(
        String(
          selectedAttendanceEmployee
            .matrixTrackUserId
        )
      );
    }

    const name =
      personForRole(
        item,
        roleFilter
      );

    if (!name) {
      return false;
    }

    if (
      personFilter ===
      'ALL'
    ) {
      return true;
    }

    return (
      name ===
      personFilter
    );
  }


  /* =========================================================
     INSPECTION CONTEXT
  ========================================================= */

  const inspectionContextRecords =
    useMemo(() => {
      return records.filter(
        (item) => {
          const zone =
            getRecordZone(
              item
            );

          const ward =
            getRecordWard(
              item
            );

          if (
            zoneFilter !==
              'ALL' &&
            zone !==
              zoneFilter
          ) {
            return false;
          }

          if (
            wardFilter !==
              'ALL' &&
            ward !==
              wardFilter
          ) {
            return false;
          }

          if (
            !recordMatchesRole(
              item
            )
          ) {
            return false;
          }

          if (
            statusFilter !==
              'ALL' &&
            [
              'APPROVED',
              'REJECTED',
              'ACTION_REQUIRED',
              'ACTION_TAKEN',
              'PENDING',
            ].includes(
              statusFilter
            ) &&
            effectiveStatus(
              item
            ) !==
              statusFilter
          ) {
            return false;
          }

          if (
            searchValue
          ) {
            const haystack =
              normalize(
                [
                  getRecordTitle(
                    item
                  ),
                  zone,
                  ward,
                  getDarogaName(
                    item
                  ),
                  getSiName(
                    item
                  ),
                  getIecName(
                    item
                  ),
                  item.dashboardModuleLabel,
                  effectiveStatus(
                    item
                  ),
                ].join(
                  ' '
                )
              );

            if (
              !haystack.includes(
                searchValue
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      records,
      zoneFilter,
      wardFilter,
      roleFilter,
      personFilter,
      statusFilter,
      searchValue,
      selectedAttendanceEmployee,
    ]);

  const filteredInspectionRecords =
    useMemo(() => {
      if (
        moduleFilter ===
          'ATTENDANCE' ||
        moduleFilter ===
          'WARD_RANKING'
      ) {
        return [];
      }

      if (
        moduleFilter ===
        'ALL'
      ) {
        return inspectionContextRecords;
      }

      return inspectionContextRecords.filter(
        (item) =>
          item.dashboardModule ===
          moduleFilter
      );
    }, [
      inspectionContextRecords,
      moduleFilter,
    ]);


  /* =========================================================
     ATTENDANCE CONTEXT
  ========================================================= */

  const attendanceContextEmployees =
    useMemo(() => {
      const employees =
        attendance?.employees ||
        [];

      return employees.filter(
        (employee) => {
          if (
            zoneFilter !==
              'ALL' &&
            !employee.zones
              ?.includes(
                zoneFilter
              )
          ) {
            return false;
          }

          if (
            wardFilter !==
              'ALL' &&
            !employee.wards
              ?.includes(
                wardFilter
              )
          ) {
            return false;
          }

          if (
            roleFilter ===
            'SUPERVISOR'
          ) {
            if (
              !employee.matrixTrackUserId ||
              !roleUserIds.daroga.has(
                String(
                  employee.matrixTrackUserId
                )
              )
            ) {
              return false;
            }
          }

          if (
            roleFilter ===
            'QC'
          ) {
            if (
              !employee.matrixTrackUserId ||
              !roleUserIds.si.has(
                String(
                  employee.matrixTrackUserId
                )
              )
            ) {
              return false;
            }
          }

          if (
            roleFilter ===
            'ACTION_OFFICER'
          ) {
            if (
              !employee.matrixTrackUserId ||
              !roleUserIds.iec.has(
                String(
                  employee.matrixTrackUserId
                )
              )
            ) {
              return false;
            }
          }

          if (
            personFilter !==
              'ALL' &&
            employee.employeeName !==
              personFilter
          ) {
            return false;
          }

          if (
            statusFilter ===
              'PRESENT' &&
            employee.presentDays <=
              0
          ) {
            return false;
          }

          if (
            statusFilter ===
              'ABSENT' &&
            employee.absentDays <=
              0
          ) {
            return false;
          }

          if (
            searchValue
          ) {
            const haystack =
              normalize(
                [
                  employee.employeeName,
                  employee.designation,
                  ...(employee.zones ||
                    []),
                  ...(employee.wards ||
                    []),
                ].join(
                  ' '
                )
              );

            if (
              !haystack.includes(
                searchValue
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      attendance,
      zoneFilter,
      wardFilter,
      roleFilter,
      personFilter,
      statusFilter,
      searchValue,
      roleUserIds,
    ]);

  const filteredAttendanceEmployees =
    useMemo(() => {
      if (
        moduleFilter !==
          'ALL' &&
        moduleFilter !==
          'ATTENDANCE'
      ) {
        return [];
      }

      if (
        statusFilter !==
          'ALL' &&
        ![
          'PRESENT',
          'ABSENT',
        ].includes(
          statusFilter
        )
      ) {
        return [];
      }

      return attendanceContextEmployees;
    }, [
      attendanceContextEmployees,
      moduleFilter,
      statusFilter,
    ]);


  /* =========================================================
     WARD RANKING CONTEXT
  ========================================================= */

  const wardContextRows =
    useMemo(() => {
      if (
        roleFilter !==
          'ALL' ||
        personFilter !==
          'ALL'
      ) {
        return [];
      }

      return wardRows.filter(
        (row) => {
          if (
            zoneFilter !==
              'ALL' &&
            row.zoneName !==
              zoneFilter
          ) {
            return false;
          }

          if (
            wardFilter !==
              'ALL' &&
            row.wardName !==
              wardFilter
          ) {
            return false;
          }

          if (
            [
              'GREEN',
              'AMBER',
              'RED',
            ].includes(
              statusFilter
            ) &&
            row.performanceBand !==
              statusFilter
          ) {
            return false;
          }

          if (
            searchValue
          ) {
            const haystack =
              normalize(
                [
                  row.zoneName,
                  row.wardName,
                  row.performanceBand,
                ].join(
                  ' '
                )
              );

            if (
              !haystack.includes(
                searchValue
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      wardRows,
      zoneFilter,
      wardFilter,
      roleFilter,
      personFilter,
      statusFilter,
      searchValue,
    ]);

  const filteredWardRows =
    useMemo(() => {
      if (
        moduleFilter !==
          'ALL' &&
        moduleFilter !==
          'WARD_RANKING'
      ) {
        return [];
      }

      if (
        statusFilter !==
          'ALL' &&
        ![
          'GREEN',
          'AMBER',
          'RED',
        ].includes(
          statusFilter
        )
      ) {
        return [];
      }

      return wardContextRows;
    }, [
      wardContextRows,
      moduleFilter,
      statusFilter,
    ]);


  /* =========================================================
     PRIMARY STATS
  ========================================================= */

  const days =
    dateRangeDays(
      appliedFrom,
      appliedTo
    );

  const inspection =
    useMemo(
      () =>
        inspectionStats(
          filteredInspectionRecords
        ),
      [
        filteredInspectionRecords,
      ]
    );

  const attendanceStats =
    useMemo(() => {
      const employees =
        filteredAttendanceEmployees;

      const totalDays =
        employees.reduce(
          (
            total,
            employee
          ) =>
            total +
            employee.totalDays,
          0
        );

      const present =
        employees.reduce(
          (
            total,
            employee
          ) =>
            total +
            employee.presentDays,
          0
        );

      const absent =
        employees.reduce(
          (
            total,
            employee
          ) =>
            total +
            employee.absentDays,
          0
        );

      return {
        employees:
          employees.length,
        totalDays,
        present,
        absent,
        rate:
          totalDays > 0
            ? (
                present /
                totalDays
              ) *
              100
            : null,
      };
    }, [
      filteredAttendanceEmployees,
    ]);

  const wardRankingAverage =
    useMemo(
      () =>
        averageApplicable(
          filteredWardRows.map(
            (row) =>
              Number(
                row.finalScore
              )
          )
        ),
      [filteredWardRows]
    );

  const overallPerformance =
    useMemo(
      () =>
        averageApplicable(
          [
            inspection.performance,
            attendanceStats.rate,
            wardRankingAverage,
          ]
        ),
      [
        inspection,
        attendanceStats,
        wardRankingAverage,
      ]
    );

  const averageReportsPerDay =
    inspection.total /
    Math.max(
      1,
      days
    );


  /* =========================================================
     MODULE PERFORMANCE
  ========================================================= */

  const moduleCards =
    useMemo(() => {
      const rows =
        INSPECTION_MODULES.map(
          (module) => {
            const moduleRecords =
              inspectionContextRecords.filter(
                (item) =>
                  item.dashboardModule ===
                  module.key
              );

            const stats =
              inspectionStats(
                moduleRecords
              );

            return {
              key:
                module.key as DashboardModuleKey,
              label:
                module.label,
              performance:
                stats.performance,
              count:
                stats.total,
              records:
                moduleRecords,
              employees:
                [] as AttendanceEmployeeSummary[],
              wards:
                [] as WardRankingRow[],
            };
          }
        );

      const attendanceTotalDays =
        attendanceContextEmployees.reduce(
          (
            total,
            employee
          ) =>
            total +
            employee.totalDays,
          0
        );

      const attendancePresent =
        attendanceContextEmployees.reduce(
          (
            total,
            employee
          ) =>
            total +
            employee.presentDays,
          0
        );

      rows.push({
        key:
          'ATTENDANCE',
        label:
          'Attendance',
        performance:
          attendanceTotalDays >
          0
            ? (
                attendancePresent /
                attendanceTotalDays
              ) *
              100
            : null,
        count:
          attendanceContextEmployees.length,
        records: [],
        employees:
          attendanceContextEmployees,
        wards: [],
      });

      rows.push({
        key:
          'WARD_RANKING',
        label:
          'Ward Ranking',
        performance:
          averageApplicable(
            wardContextRows.map(
              (row) =>
                row.finalScore
            )
          ),
        count:
          wardContextRows.length,
        records: [],
        employees: [],
        wards:
          wardContextRows,
      });

      return rows;
    }, [
      inspectionContextRecords,
      attendanceContextEmployees,
      wardContextRows,
    ]);


  /* =========================================================
     GEO PERFORMANCE
  ========================================================= */

  const buildGeoRows =
    useCallback(
      (
        level:
          | 'ZONE'
          | 'WARD'
      ): GeoPerformanceRow[] => {
        type Bucket = {
          records: DashboardRecord[];
          employees: AttendanceEmployeeSummary[];
          wards: WardRankingRow[];
        };

        const map =
          new Map<
            string,
            Bucket
          >();

        function bucket(
          key: string
        ) {
          if (!map.has(key)) {
            map.set(key, {
              records: [],
              employees: [],
              wards: [],
            });
          }

          return map.get(
            key
          )!;
        }

        filteredInspectionRecords.forEach(
          (item) => {
            const key =
              level ===
              'ZONE'
                ? getRecordZone(
                    item
                  )
                : getRecordWard(
                    item
                  );

            if (key) {
              bucket(
                key
              ).records.push(
                item
              );
            }
          }
        );

        filteredAttendanceEmployees.forEach(
          (employee) => {
            const values =
              level ===
              'ZONE'
                ? employee.zones
                : employee.wards;

            values?.forEach(
              (value) => {
                if (value) {
                  bucket(
                    value
                  ).employees.push(
                    employee
                  );
                }
              }
            );
          }
        );

        filteredWardRows.forEach(
          (row) => {
            const key =
              level ===
              'ZONE'
                ? row.zoneName
                : row.wardName;

            if (key) {
              bucket(
                key
              ).wards.push(
                row
              );
            }
          }
        );

        return Array.from(
          map.entries()
        ).map(
          ([
            label,
            values,
          ]) => {
            const stats =
              inspectionStats(
                values.records
              );

            const attendanceDays =
              values.employees.reduce(
                (
                  total,
                  employee
                ) =>
                  total +
                  employee.totalDays,
                0
              );

            const attendancePresent =
              values.employees.reduce(
                (
                  total,
                  employee
                ) =>
                  total +
                  employee.presentDays,
                0
              );

            const attendanceRate =
              attendanceDays >
              0
                ? (
                    attendancePresent /
                    attendanceDays
                  ) *
                  100
                : null;

            const wardScore =
              averageApplicable(
                values.wards.map(
                  (row) =>
                    Number(
                      row.finalScore
                    )
                )
              );

            const performance =
              averageApplicable(
                [
                  stats.performance,
                  attendanceRate,
                  wardScore,
                ]
              );

            return {
              label,
              performance,
              inspection:
                stats.performance,
              attendance:
                attendanceRate,
              approval:
                stats.approvalRate,
              rejection:
                stats.rejectionRate,
              actionClosure:
                stats.actionClosure,
              wardRanking:
                wardScore,

              records:
                values.records,
              employees:
                values.employees,
              wards:
                values.wards,

              inspectionStats:
                stats,
            };
          }
        );
      },
      [
        filteredInspectionRecords,
        filteredAttendanceEmployees,
        filteredWardRows,
      ]
    );

  const zoneRows =
    useMemo(
      () =>
        buildGeoRows(
          'ZONE'
        ),
      [buildGeoRows]
    );

  const wardPerformanceRows =
    useMemo(
      () =>
        buildGeoRows(
          'WARD'
        ),
      [buildGeoRows]
    );

  function geoMetric(
    row: GeoPerformanceRow
  ): number | null {
    if (
      metricFilter ===
      'INSPECTION'
    ) {
      return row.inspection;
    }

    if (
      metricFilter ===
      'ATTENDANCE'
    ) {
      return row.attendance;
    }

    if (
      metricFilter ===
      'APPROVAL'
    ) {
      return row.approval;
    }

    if (
      metricFilter ===
      'REJECTION'
    ) {
      return row.rejection;
    }

    if (
      metricFilter ===
      'ACTION_CLOSURE'
    ) {
      return row.actionClosure;
    }

    if (
      metricFilter ===
      'WARD_RANKING'
    ) {
      return row.wardRanking;
    }

    return row.performance;
  }

  const metricLabel =
    METRICS.find(
      (item) =>
        item.key ===
        metricFilter
    )?.label ||
    'Overall Performance';

  const negativeMetric =
    metricFilter ===
    'REJECTION';

  const rankedZones =
    useMemo(
      () =>
        zoneRows
          .map(
            (row) => ({
              ...row,
              metricValue:
                geoMetric(
                  row
                ),
            })
          )
          .filter(
            (row) =>
              row.metricValue !==
              null
          )
          .sort(
            (a, b) =>
              (
                b.metricValue ||
                0
              ) -
              (
                a.metricValue ||
                0
              )
          ),
      [
        zoneRows,
        metricFilter,
      ]
    );

  const rankedWards =
    useMemo(
      () =>
        wardPerformanceRows
          .map(
            (row) => ({
              ...row,
              metricValue:
                geoMetric(
                  row
                ),
            })
          )
          .filter(
            (row) =>
              row.metricValue !==
              null
          )
          .sort(
            (a, b) =>
              (
                b.metricValue ||
                0
              ) -
              (
                a.metricValue ||
                0
              )
          ),
      [
        wardPerformanceRows,
        metricFilter,
      ]
    );

  const topZone =
    rankedZones[0] ||
    null;

  const worstZone =
    rankedZones.length
      ? rankedZones[
          rankedZones.length -
            1
        ]
      : null;

  const topWard =
    rankedWards[0] ||
    null;

  const worstWard =
    rankedWards.length
      ? rankedWards[
          rankedWards.length -
            1
        ]
      : null;


  /* =========================================================
     ROLE PERFORMANCE
  ========================================================= */

  const buildRoleRows =
    useCallback(
      (
        role:
          | 'SUPERVISOR'
          | 'QC'
          | 'ACTION_OFFICER'
      ) => {
        const map =
          new Map<
            string,
            {
              id?: string | null;
              records: DashboardRecord[];
            }
          >();

        filteredInspectionRecords.forEach(
          (item) => {
            let name =
              '';

            let id:
              | string
              | null =
              null;

            if (
              role ===
              'SUPERVISOR'
            ) {
              name =
                getDarogaName(
                  item
                );

              id =
                getDarogaId(
                  item
                );
            }

            if (
              role ===
              'QC'
            ) {
              name =
                getSiName(
                  item
                );

              id =
                getSiId(
                  item
                );
            }

            if (
              role ===
              'ACTION_OFFICER'
            ) {
              name =
                getIecName(
                  item
                );

              id =
                getIecId(
                  item
                );
            }

            if (!name) {
              return;
            }

            const current =
              map.get(
                name
              ) || {
                id,
                records:
                  [],
              };

            current.records.push(
              item
            );

            if (
              !current.id &&
              id
            ) {
              current.id =
                id;
            }

            map.set(
              name,
              current
            );
          }
        );

        return Array.from(
          map.entries()
        )
          .map(
            ([
              label,
              data,
            ]) => {
              const stats =
                inspectionStats(
                  data.records
                );

              const attendanceEmployee =
                data.id
                  ? attendance?.employees?.find(
                      (
                        employee
                      ) =>
                        employee.matrixTrackUserId &&
                        String(
                          employee.matrixTrackUserId
                        ) ===
                          String(
                            data.id
                          )
                    ) ||
                    null
                  : null;

              return {
                key:
                  `${role}-${label}`,
                id:
                  data.id,
                label,

                total:
                  stats.total,
                approved:
                  stats.approved,
                rejected:
                  stats.rejected,
                actionRequired:
                  stats.actionRequired,
                actionTaken:
                  stats.actionTaken,
                pending:
                  stats.pending,

                performance:
                  stats.performance ||
                  0,

                records:
                  data.records,

                attendance:
                  attendanceEmployee
                    ?.attendanceRate ??
                  null,

                attendanceEmployee,
              } satisfies RolePerformanceRow;
            }
          )
          .sort(
            (a, b) =>
              b.performance -
              a.performance
          );
      },
      [
        filteredInspectionRecords,
        attendance,
      ]
    );

  const darogaRows =
    useMemo(
      () =>
        buildRoleRows(
          'SUPERVISOR'
        ),
      [buildRoleRows]
    );

  const siRows =
    useMemo(
      () =>
        buildRoleRows(
          'QC'
        ),
      [buildRoleRows]
    );

  const iecRows =
    useMemo(
      () =>
        buildRoleRows(
          'ACTION_OFFICER'
        ),
      [buildRoleRows]
    );

  const employeeRows =
    useMemo(
      () =>
        filteredAttendanceEmployees
          .map(
            (
              employee
            ) => ({
              key:
                `EMPLOYEE-${employee.attendanceId}`,
              id:
                employee.matrixTrackUserId,
              label:
                employee.employeeName,

              total:
                employee.totalDays,
              approved:
                employee.presentDays,
              rejected:
                employee.absentDays,
              actionRequired:
                0,
              actionTaken:
                0,
              pending:
                0,

              performance:
                employee.attendanceRate,

              records:
                [],

              attendance:
                employee.attendanceRate,

              attendanceEmployee:
                employee,
            })
          )
          .sort(
            (a, b) =>
              b.performance -
              a.performance
          ),
      [
        filteredAttendanceEmployees,
      ]
    );

  const [
    performanceRole,
    setPerformanceRole,
  ] =
    useState<
      Exclude<
        RoleKey,
        'ALL'
      >
    >(
      'SUPERVISOR'
    );

  const activeRoleRows =
    performanceRole ===
    'SUPERVISOR'
      ? darogaRows
      : performanceRole ===
        'QC'
      ? siRows
      : performanceRole ===
        'ACTION_OFFICER'
      ? iecRows
      : employeeRows;


  /* =========================================================
     ATTENDANCE × INSPECTION
  ========================================================= */

  const attendanceInspectionPoints =
    useMemo(() => {
      const byUser =
        new Map<
          string,
          DashboardRecord[]
        >();

      inspectionContextRecords.forEach(
        (item) => {
          userIdsForRecord(
            item
          ).forEach(
            (id) => {
              const list =
                byUser.get(
                  id
                ) || [];

              list.push(
                item
              );

              byUser.set(
                id,
                list
              );
            }
          );
        }
      );

      return attendanceContextEmployees
        .filter(
          (
            employee
          ) =>
            Boolean(
              employee.matrixTrackUserId
            )
        )
        .map(
          (
            employee
          ) => {
            const linked =
              byUser.get(
                String(
                  employee.matrixTrackUserId
                )
              ) ||
              [];

            if (
              !linked.length
            ) {
              return null;
            }

            const stats =
              inspectionStats(
                linked
              );

            return {
              name:
                employee.employeeName,
              attendance:
                employee.attendanceRate,
              inspection:
                stats.performance ||
                0,
              reports:
                stats.total,
              employee,
              records:
                linked,
            };
          }
        )
        .filter(Boolean) as Array<{
          name: string;
          attendance: number;
          inspection: number;
          reports: number;
          employee: AttendanceEmployeeSummary;
          records: DashboardRecord[];
        }>;
    }, [
      attendanceContextEmployees,
      inspectionContextRecords,
    ]);


  /* =========================================================
     DAILY TREND
  ========================================================= */

  const trendRows =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            date: string;
            inspectionRecords: DashboardRecord[];
            attendancePresent: number;
            attendanceTotal: number;
            wardScores: number[];
          }
        >();

      function row(
        date: string
      ) {
        if (!map.has(date)) {
          map.set(date, {
            date,
            inspectionRecords:
              [],
            attendancePresent:
              0,
            attendanceTotal:
              0,
            wardScores:
              [],
          });
        }

        return map.get(
          date
        )!;
      }

      filteredInspectionRecords.forEach(
        (item) => {
          const raw =
            recordDate(item);

          if (!raw) {
            return;
          }

          const date =
            new Date(raw)
              .toISOString()
              .slice(
                0,
                10
              );

          row(
            date
          ).inspectionRecords.push(
            item
          );
        }
      );

      if (
        zoneFilter ===
          'ALL' &&
        wardFilter ===
          'ALL' &&
        personFilter ===
          'ALL'
      ) {
        attendance?.dailyTrend
          ?.forEach(
            (item) => {
              const date =
                item.date.slice(
                  0,
                  10
                );

              const target =
                row(date);

              target.attendancePresent =
                item.present;

              target.attendanceTotal =
                item.total;
            }
          );
      }

      filteredWardRows.forEach(
        (ward) => {
          if (
            !ward.scoreDate
          ) {
            return;
          }

          const date =
            String(
              ward.scoreDate
            ).slice(
              0,
              10
            );

          row(
            date
          ).wardScores.push(
            Number(
              ward.finalScore
            )
          );
        }
      );

      return Array.from(
        map.values()
      )
        .sort(
          (a, b) =>
            a.date.localeCompare(
              b.date
            )
        )
        .map(
          (item) => {
            const inspection =
              inspectionStats(
                item.inspectionRecords
              ).performance;

            const attendanceRate =
              item.attendanceTotal >
              0
                ? (
                    item.attendancePresent /
                    item.attendanceTotal
                  ) *
                  100
                : null;

            const wardRanking =
              averageApplicable(
                item.wardScores
              );

            return {
              date:
                item.date,
              label:
                new Date(
                  `${item.date}T00:00:00`
                ).toLocaleDateString(
                  'en-IN',
                  {
                    day:
                      '2-digit',
                    month:
                      'short',
                  }
                ),
              inspection,
              attendance:
                attendanceRate,
              wardRanking,
              overall:
                averageApplicable(
                  [
                    inspection,
                    attendanceRate,
                    wardRanking,
                  ]
                ),
              records:
                item.inspectionRecords,
            };
          }
        );
    }, [
      filteredInspectionRecords,
      filteredWardRows,
      attendance,
      zoneFilter,
      wardFilter,
      personFilter,
    ]);


  /* =========================================================
     STATUS BAR DATA
  ========================================================= */

  const moduleStatusRows =
    useMemo(() => {
      return INSPECTION_MODULES.map(
        (module) => {
          const rows =
            inspectionContextRecords.filter(
              (item) =>
                item.dashboardModule ===
                module.key
            );

          const stats =
            inspectionStats(
              rows
            );

          const total =
            Math.max(
              1,
              stats.total
            );

          return {
            key:
              module.key,
            name:
              module.label,

            Approved:
              (
                stats.approved /
                total
              ) *
              100,

            Rejected:
              (
                stats.rejected /
                total
              ) *
              100,

            'Action Required':
              (
                stats.actionRequired /
                total
              ) *
              100,

            'Action Taken':
              (
                stats.actionTaken /
                total
              ) *
              100,

            Pending:
              (
                stats.pending /
                total
              ) *
              100,

            records:
              rows,
          };
        }
      );
    }, [
      inspectionContextRecords,
    ]);


  /* =========================================================
     ZONE × MODULE
  ========================================================= */

  const zoneModuleMatrix =
    useMemo(() => {
      return zoneOptions
        .filter(
          (zone) =>
            zoneFilter ===
              'ALL' ||
            zone ===
              zoneFilter
        )
        .map(
          (zone) => {
            const cells =
              moduleCards.map(
                (module) => {
                  if (
                    module.key ===
                    'ATTENDANCE'
                  ) {
                    const employees =
                      attendanceContextEmployees.filter(
                        (
                          employee
                        ) =>
                          employee.zones
                            ?.includes(
                              zone
                            )
                      );

                    const total =
                      employees.reduce(
                        (
                          sum,
                          employee
                        ) =>
                          sum +
                          employee.totalDays,
                        0
                      );

                    const present =
                      employees.reduce(
                        (
                          sum,
                          employee
                        ) =>
                          sum +
                          employee.presentDays,
                        0
                      );

                    return {
                      key:
                        module.key,
                      label:
                        module.label,
                      value:
                        total >
                        0
                          ? (
                              present /
                              total
                            ) *
                            100
                          : null,
                      employees,
                      records:
                        [] as DashboardRecord[],
                      wards:
                        [] as WardRankingRow[],
                    };
                  }

                  if (
                    module.key ===
                    'WARD_RANKING'
                  ) {
                    const wards =
                      wardContextRows.filter(
                        (
                          ward
                        ) =>
                          ward.zoneName ===
                          zone
                      );

                    return {
                      key:
                        module.key,
                      label:
                        module.label,
                      value:
                        averageApplicable(
                          wards.map(
                            (
                              ward
                            ) =>
                              ward.finalScore
                          )
                        ),
                      employees:
                        [] as AttendanceEmployeeSummary[],
                      records:
                        [] as DashboardRecord[],
                      wards,
                    };
                  }

                  const recordsForCell =
                    inspectionContextRecords.filter(
                      (
                        item
                      ) =>
                        item.dashboardModule ===
                          module.key &&
                        getRecordZone(
                          item
                        ) ===
                          zone
                    );

                  return {
                    key:
                      module.key,
                    label:
                      module.label,
                    value:
                      inspectionStats(
                        recordsForCell
                      )
                        .performance,
                    employees:
                      [] as AttendanceEmployeeSummary[],
                    records:
                      recordsForCell,
                    wards:
                      [] as WardRankingRow[],
                  };
                }
              );

            return {
              zone,
              cells,
            };
          }
        );
    }, [
      zoneOptions,
      zoneFilter,
      moduleCards,
      attendanceContextEmployees,
      wardContextRows,
      inspectionContextRecords,
    ]);


  /* =========================================================
     DRILL HELPERS
  ========================================================= */

  function breakdownForGeo(
    row: GeoPerformanceRow
  ) {
    return [
      {
        label:
          'Overall Performance',
        value:
          percentText(
            row.performance
          ),
      },
      {
        label:
          'Inspection Performance',
        value:
          percentText(
            row.inspection
          ),
      },
      {
        label:
          'Attendance',
        value:
          percentText(
            row.attendance
          ),
      },
      {
        label:
          'Approval Rate',
        value:
          percentText(
            row.approval
          ),
      },
      {
        label:
          'Action Closure',
        value:
          percentText(
            row.actionClosure
          ),
      },
      {
        label:
          'Ward Ranking',
        value:
          percentText(
            row.wardRanking
          ),
      },
    ];
  }

  function openGeo(
    row:
      | GeoPerformanceRow
      | (
          GeoPerformanceRow & {
            metricValue:
              number | null;
          }
        )
  ) {
    setDrilldown({
      title:
        row.label,
      value:
        percentText(
          geoMetric(
            row
          )
        ),
      breakdown:
        breakdownForGeo(
          row
        ),
      inspectionRecords:
        row.records,
      attendanceEmployees:
        row.employees,
      wardRows:
        row.wards,
    });
  }

  function openInspectionMetric(
    title: string,
    recordsForDrill:
      DashboardRecord[],
    value: string
  ) {
    const stats =
      inspectionStats(
        recordsForDrill
      );

    setDrilldown({
      title,
      value,
      breakdown: [
        {
          label:
            'Approved',
          value:
            stats.approved.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Rejected',
          value:
            stats.rejected.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Action Required',
          value:
            stats.actionRequired.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Action Taken',
          value:
            stats.actionTaken.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Pending',
          value:
            stats.pending.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Records',
          value:
            stats.total.toLocaleString(
              'en-IN'
            ),
        },
      ],
      inspectionRecords:
        recordsForDrill,
    });
  }

  function openOverall() {
    setDrilldown({
      title:
        'Overall Performance',
      value:
        percentText(
          overallPerformance
        ),
      breakdown: [
        {
          label:
            'Inspection Performance',
          value:
            percentText(
              inspection.performance
            ),
        },
        {
          label:
            'Attendance',
          value:
            percentText(
              attendanceStats.rate
            ),
        },
        {
          label:
            'Ward Ranking',
          value:
            percentText(
              wardRankingAverage
            ),
        },
      ],
      inspectionRecords:
        filteredInspectionRecords,
      attendanceEmployees:
        filteredAttendanceEmployees,
      wardRows:
        filteredWardRows,
    });
  }

  function openAttendance() {
    setDrilldown({
      title:
        'Attendance',
      value:
        percentText(
          attendanceStats.rate
        ),
      breakdown: [
        {
          label:
            'Employee',
          value:
            attendanceStats.employees.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Present',
          value:
            attendanceStats.present.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Absent',
          value:
            attendanceStats.absent.toLocaleString(
              'en-IN'
            ),
        },
      ],
      attendanceEmployees:
        filteredAttendanceEmployees,
    });
  }

  function openWardRanking() {
    setDrilldown({
      title:
        'Ward Ranking',
      value:
        percentText(
          wardRankingAverage
        ),
      breakdown: [
        {
          label:
            'Ward',
          value:
            String(
              filteredWardRows.length
            ),
        },
      ],
      wardRows:
        filteredWardRows,
    });
  }

  function openModule(
    module:
      (typeof moduleCards)[number]
  ) {
    setDrilldown({
      title:
        module.label,
      value:
        percentText(
          module.performance
        ),
      inspectionRecords:
        module.records,
      attendanceEmployees:
        module.employees,
      wardRows:
        module.wards,
    });
  }

  function openRoleRow(
    row: RolePerformanceRow
  ) {
    setDrilldown({
      title:
        row.label,
      value:
        percentText(
          row.performance
        ),
      breakdown: [
        {
          label:
            'Records',
          value:
            row.total.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Approved',
          value:
            row.approved.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Rejected',
          value:
            row.rejected.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Action Required',
          value:
            row.actionRequired.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Action Taken',
          value:
            row.actionTaken.toLocaleString(
              'en-IN'
            ),
        },
        {
          label:
            'Attendance',
          value:
            percentText(
              row.attendance
            ),
        },
      ],
      inspectionRecords:
        row.records,
      attendanceEmployees:
        row.attendanceEmployee
          ? [
              row.attendanceEmployee,
            ]
          : [],
    });
  }


  /* =========================================================
     FILTER ACTIONS
  ========================================================= */

  function applyDates() {
    setAppliedFrom(
      from
    );

    setAppliedTo(to);
  }

  function setPreset(
    preset:
      | 'TODAY'
      | '7D'
      | '30D'
      | 'MONTH'
      | 'ALL'
  ) {
    if (
      preset === 'ALL'
    ) {
      setFrom('');
      setTo('');
      setAppliedFrom(
        ''
      );
      setAppliedTo(
        ''
      );
      return;
    }

    const today =
      new Date();

    const start =
      new Date(today);

    if (
      preset === '7D'
    ) {
      start.setDate(
        start.getDate() -
          6
      );
    }

    if (
      preset === '30D'
    ) {
      start.setDate(
        start.getDate() -
          29
      );
    }

    if (
      preset === 'MONTH'
    ) {
      start.setDate(
        1
      );
    }

    const nextFrom =
      toDateInput(
        start
      );

    const nextTo =
      toDateInput(
        today
      );

    setFrom(
      nextFrom
    );

    setTo(
      nextTo
    );

    setAppliedFrom(
      nextFrom
    );

    setAppliedTo(
      nextTo
    );
  }

  function resetFilters() {
    const range =
      defaultRange();

    setFrom(
      range.from
    );

    setTo(
      range.to
    );

    setAppliedFrom(
      range.from
    );

    setAppliedTo(
      range.to
    );

    setModuleFilter(
      'ALL'
    );

    setZoneFilter(
      'ALL'
    );

    setWardFilter(
      'ALL'
    );

    setRoleFilter(
      'ALL'
    );

    setPersonFilter(
      'ALL'
    );

    setStatusFilter(
      'ALL'
    );

    setMetricFilter(
      'OVERALL'
    );

    setSearch('');
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <RoleGuard
      roles={[
        'COMMISSIONER',
        'HMS_SUPER_ADMIN',
      ]}
    >
      <div className="min-h-full bg-[#f6f8fc] pb-12">
        {/* HEADER */}
        <section className="relative overflow-hidden rounded-[28px] border border-indigo-950/10 bg-gradient-to-br from-[#111827] via-[#1e1b4b] to-[#312e81] px-5 py-5 text-white shadow-[0_25px_80px_-35px_rgba(49,46,129,.85)] sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">
                <ShieldCheck
                  size={15}
                />
                Commissioner
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Commissioner Dashboard
              </h1>

              <div className="mt-2 text-sm font-bold text-indigo-100/80">
                {cityName}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (
                      value
                    ) =>
                      !value
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-black text-white backdrop-blur-xl transition hover:bg-white/15"
              >
                <Filter
                  size={15}
                />
                Filters
              </button>

              <button
                type="button"
                onClick={() =>
                  loadDashboard(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-indigo-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        {showFilters && (
          <section className="sticky top-0 z-40 mt-4 rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_14px_40px_-25px_rgba(15,23,42,.35)] backdrop-blur-xl">
            <div className="flex flex-wrap gap-2">
              {[
                [
                  'TODAY',
                  'Today',
                ],
                [
                  '7D',
                  '7D',
                ],
                [
                  '30D',
                  '30D',
                ],
                [
                  'MONTH',
                  'This Month',
                ],
                [
                  'ALL',
                  'All Time',
                ],
              ].map(
                ([
                  key,
                  label,
                ]) => (
                  <button
                    key={
                      key
                    }
                    type="button"
                    onClick={() =>
                      setPreset(
                        key as
                          | 'TODAY'
                          | '7D'
                          | '30D'
                          | 'MONTH'
                          | 'ALL'
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {
                      label
                    }
                  </button>
                )
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  From
                </span>

                <input
                  type="date"
                  value={
                    from
                  }
                  onChange={(
                    event
                  ) =>
                    setFrom(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  To
                </span>

                <input
                  type="date"
                  value={
                    to
                  }
                  onChange={(
                    event
                  ) =>
                    setTo(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Zone
                </span>

                <select
                  value={
                    zoneFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setZoneFilter(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  <option value="ALL">
                    All
                  </option>

                  {zoneOptions.map(
                    (zone) => (
                      <option
                        key={
                          zone
                        }
                        value={
                          zone
                        }
                      >
                        {
                          zone
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Ward
                </span>

                <select
                  value={
                    wardFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setWardFilter(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  <option value="ALL">
                    All
                  </option>

                  {wardOptions.map(
                    (ward) => (
                      <option
                        key={
                          ward
                        }
                        value={
                          ward
                        }
                      >
                        {
                          ward
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Module
                </span>

                <select
                  value={
                    moduleFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setModuleFilter(
                      event
                        .target
                        .value as DashboardModuleKey
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  {DASHBOARD_MODULES.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.key
                        }
                        value={
                          item.key
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Role
                </span>

                <select
                  value={
                    roleFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setRoleFilter(
                      event
                        .target
                        .value as RoleKey
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  {ROLES.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.key
                        }
                        value={
                          item.key
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Person
                </span>

                <select
                  value={
                    personFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setPersonFilter(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  <option value="ALL">
                    All
                  </option>

                  {personOptions.map(
                    (
                      person
                    ) => (
                      <option
                        key={
                          person
                        }
                        value={
                          person
                        }
                      >
                        {
                          person
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Status
                </span>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  {statusOptions.map(
                    (
                      status
                    ) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {status.replace(
                          /_/g,
                          ' '
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto_auto]">
              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Metric
                </span>

                <select
                  value={
                    metricFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setMetricFilter(
                      event
                        .target
                        .value as MetricKey
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                >
                  {METRICS.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.key
                        }
                        value={
                          item.key
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Search
                </span>

                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={
                  applyDates
                }
                className="mt-auto h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5"
              >
                Apply
              </button>

              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="mt-auto h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>
        )}

        {loadError && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <AlertTriangle
              size={17}
              className="text-rose-600"
            />

            <button
              type="button"
              onClick={() =>
                loadDashboard(
                  true
                )
              }
              className="text-xs font-black text-rose-700"
            >
              Refresh
            </button>
          </div>
        )}

        {/* KPI */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <KpiCard
            label="Overall Performance"
            value={
              loading
                ? '—'
                : percentText(
                    overallPerformance
                  )
            }
            gradient="from-indigo-500 via-violet-500 to-purple-600"
            icon={
              <Activity
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Inspection Performance',
                value:
                  percentText(
                    inspection.performance
                  ),
              },
              {
                label:
                  'Attendance',
                value:
                  percentText(
                    attendanceStats.rate
                  ),
              },
              {
                label:
                  'Ward Ranking',
                value:
                  percentText(
                    wardRankingAverage
                  ),
              },
            ]}
            onClick={
              openOverall
            }
          />

          <KpiCard
            label="Inspection Performance"
            value={
              loading
                ? '—'
                : percentText(
                    inspection.performance
                  )
            }
            gradient="from-blue-500 via-indigo-500 to-violet-600"
            icon={
              <Target
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Records',
                value:
                  inspection.total.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Approved',
                value:
                  inspection.approved.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Action Taken',
                value:
                  inspection.actionTaken.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            onClick={() =>
              openInspectionMetric(
                'Inspection Performance',
                filteredInspectionRecords,
                percentText(
                  inspection.performance
                )
              )
            }
          />

          <KpiCard
            label="Attendance"
            value={
              loading
                ? '—'
                : percentText(
                    attendanceStats.rate
                  )
            }
            gradient="from-emerald-400 via-teal-500 to-cyan-600"
            icon={
              <UserRoundCheck
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Employee',
                value:
                  attendanceStats.employees.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Present',
                value:
                  attendanceStats.present.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Absent',
                value:
                  attendanceStats.absent.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            onClick={
              openAttendance
            }
          />

          <KpiCard
            label="Approval Rate"
            value={
              loading
                ? '—'
                : percentText(
                    inspection.approvalRate
                  )
            }
            gradient="from-emerald-400 via-emerald-500 to-teal-600"
            icon={
              <CheckCircle2
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Approved',
                value:
                  inspection.qcApproved.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Rejected',
                value:
                  inspection.qcRejected.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            onClick={() =>
              openInspectionMetric(
                'Approval Rate',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    qcDecision(
                      item
                    ) ===
                    'APPROVED'
                ),
                percentText(
                  inspection.approvalRate
                )
              )
            }
          />

          <KpiCard
            label="Rejection Rate"
            value={
              loading
                ? '—'
                : percentText(
                    inspection.rejectionRate
                  )
            }
            gradient="from-rose-400 via-rose-500 to-red-700"
            icon={
              <XCircle
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Rejected',
                value:
                  inspection.qcRejected.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Approved',
                value:
                  inspection.qcApproved.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            onClick={() =>
              openInspectionMetric(
                'Rejection Rate',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    qcDecision(
                      item
                    ) ===
                    'REJECTED'
                ),
                percentText(
                  inspection.rejectionRate
                )
              )
            }
          />

          <KpiCard
            label="Action Closure"
            value={
              loading
                ? '—'
                : percentText(
                    inspection.actionClosure
                  )
            }
            gradient="from-amber-400 via-orange-500 to-rose-500"
            icon={
              <CheckCircle2
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Action Required',
                value:
                  inspection.actionRequired.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Action Taken',
                value:
                  inspection.actionTaken.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            onClick={() =>
              openInspectionMetric(
                'Action Closure',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    [
                      'ACTION_REQUIRED',
                      'ACTION_TAKEN',
                    ].includes(
                      effectiveStatus(
                        item
                      )
                    )
                ),
                percentText(
                  inspection.actionClosure
                )
              )
            }
          />

          <KpiCard
            label="Ward Ranking"
            value={
              loading
                ? '—'
                : percentText(
                    wardRankingAverage
                  )
            }
            gradient="from-violet-400 via-purple-500 to-fuchsia-600"
            icon={
              <Trophy
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Ward',
                value:
                  filteredWardRows.length.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            onClick={
              openWardRanking
            }
          />

          <KpiCard
            label="Average Reports / Day"
            value={
              loading
                ? '—'
                : averageText(
                    averageReportsPerDay
                  )
            }
            gradient="from-sky-400 via-blue-500 to-indigo-600"
            icon={
              <BarChart3
                size={18}
              />
            }
            tooltip={[
              {
                label:
                  'Records',
                value:
                  inspection.total.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'Days',
                value:
                  String(
                    days
                  ),
              },
            ]}
            onClick={() =>
              openInspectionMetric(
                'Average Reports / Day',
                filteredInspectionRecords,
                averageText(
                  averageReportsPerDay
                )
              )
            }
          />
        </section>

        {/* STATUS AVERAGES */}
        <section className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatusAverageCard
            label="Approved"
            count={
              inspection.approved
            }
            days={days}
            gradient="from-emerald-400 to-teal-600"
            onClick={() =>
              openInspectionMetric(
                'Approved',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    effectiveStatus(
                      item
                    ) ===
                    'APPROVED'
                ),
                averageText(
                  inspection.approved /
                    days
                )
              )
            }
          />

          <StatusAverageCard
            label="Rejected"
            count={
              inspection.rejected
            }
            days={days}
            gradient="from-rose-400 to-red-700"
            onClick={() =>
              openInspectionMetric(
                'Rejected',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    effectiveStatus(
                      item
                    ) ===
                    'REJECTED'
                ),
                averageText(
                  inspection.rejected /
                    days
                )
              )
            }
          />

          <StatusAverageCard
            label="Action Required"
            count={
              inspection.actionRequired
            }
            days={days}
            gradient="from-amber-400 to-orange-600"
            onClick={() =>
              openInspectionMetric(
                'Action Required',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    effectiveStatus(
                      item
                    ) ===
                    'ACTION_REQUIRED'
                ),
                averageText(
                  inspection.actionRequired /
                    days
                )
              )
            }
          />

          <StatusAverageCard
            label="Action Taken"
            count={
              inspection.actionTaken
            }
            days={days}
            gradient="from-blue-400 to-indigo-600"
            onClick={() =>
              openInspectionMetric(
                'Action Taken',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    effectiveStatus(
                      item
                    ) ===
                    'ACTION_TAKEN'
                ),
                averageText(
                  inspection.actionTaken /
                    days
                )
              )
            }
          />

          <StatusAverageCard
            label="Pending"
            count={
              inspection.pending
            }
            days={days}
            gradient="from-slate-300 to-slate-600"
            onClick={() =>
              openInspectionMetric(
                'Pending',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    effectiveStatus(
                      item
                    ) ===
                    'PENDING'
                ),
                averageText(
                  inspection.pending /
                    days
                )
              )
            }
          />
        </section>

        {/* TOP / WORST */}
        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="relative overflow-hidden rounded-[26px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
              <TrendingUp
                size={18}
                className="text-emerald-600"
              />
              Top Performance
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[topZone, topWard].map(
                (
                  row,
                  index
                ) =>
                  row ? (
                    <button
                      key={`${row.label}-${index}`}
                      type="button"
                      onClick={() =>
                        openGeo(
                          row
                        )
                      }
                      className="group rounded-2xl border border-white bg-white/90 p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {index ===
                        0
                          ? 'Zone'
                          : 'Ward'}
                      </div>

                      <div className="mt-1 truncate text-sm font-black text-slate-950">
                        {
                          row.label
                        }
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div className="text-3xl font-black tracking-tight text-emerald-700">
                          {percentText(
                            row.metricValue
                          )}
                        </div>

                        <ChevronRight
                          size={18}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                        />
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-700 transition-all duration-700"
                          style={{
                            width:
                              `${clamp(
                                row.metricValue ||
                                  0
                              )}%`,
                          }}
                        />
                      </div>
                    </button>
                  ) : null
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[26px] border border-rose-100 bg-gradient-to-br from-white via-rose-50/50 to-orange-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
              <TrendingDown
                size={18}
                className="text-rose-600"
              />
              Worst Performance
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[worstZone, worstWard].map(
                (
                  row,
                  index
                ) =>
                  row ? (
                    <button
                      key={`${row.label}-${index}`}
                      type="button"
                      onClick={() =>
                        openGeo(
                          row
                        )
                      }
                      className="group rounded-2xl border border-white bg-white/90 p-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {index ===
                        0
                          ? 'Zone'
                          : 'Ward'}
                      </div>

                      <div className="mt-1 truncate text-sm font-black text-slate-950">
                        {
                          row.label
                        }
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div className="text-3xl font-black tracking-tight text-rose-700">
                          {percentText(
                            row.metricValue
                          )}
                        </div>

                        <ChevronRight
                          size={18}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-rose-600"
                        />
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-rose-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-300 via-rose-500 to-red-800 transition-all duration-700"
                          style={{
                            width:
                              `${clamp(
                                row.metricValue ||
                                  0
                              )}%`,
                          }}
                        />
                      </div>
                    </button>
                  ) : null
              )}
            </div>
          </div>
        </section>

        {/* MODULES */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {moduleCards.map(
            (
              module,
              index
            ) => {
              const gradients =
                [
                  'from-violet-500 via-indigo-500 to-blue-600',
                  'from-cyan-400 via-teal-500 to-emerald-600',
                  'from-blue-400 via-indigo-500 to-violet-600',
                  'from-emerald-400 via-teal-500 to-cyan-600',
                  'from-violet-400 via-purple-500 to-fuchsia-600',
                ];

              return (
                <button
                  key={
                    module.key
                  }
                  type="button"
                  onClick={() =>
                    openModule(
                      module
                    )
                  }
                  className={`group relative overflow-hidden rounded-[22px] border bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    moduleFilter ===
                    module.key
                      ? 'border-indigo-300 ring-2 ring-indigo-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                      gradients[
                        index %
                          gradients.length
                      ]
                    }`}
                  />

                  <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                    {
                      module.label
                    }
                  </div>

                  <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                    {percentText(
                      module.performance
                    )}
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        gradients[
                          index %
                            gradients.length
                        ]
                      } transition-all duration-700`}
                      style={{
                        width:
                          `${clamp(
                            module.performance ||
                              0
                          )}%`,
                      }}
                    />
                  </div>

                  <div className="absolute right-3 top-10 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black shadow-xl group-hover:block">
                    {module.count.toLocaleString(
                      'en-IN'
                    )}
                  </div>
                </button>
              );
            }
          )}
        </section>

        {/* TREND + ZONE */}
        <section className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-sm font-black text-slate-950">
              <Activity
                size={18}
                className="text-indigo-600"
              />
              Overall Performance
            </div>

            <div className="h-[340px]">
              {loading ? (
                <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={
                      trendRows
                    }
                    margin={{
                      top: 10,
                      right: 12,
                      left: -18,
                      bottom: 0,
                    }}
                    onClick={(
                      state: any
                    ) => {
                      const row =
                        state
                          ?.activePayload?.[0]
                          ?.payload;

                      if (!row) {
                        return;
                      }

                      setDrilldown({
                        title:
                          formatDate(
                            row.date
                          ),
                        value:
                          percentText(
                            row.overall
                          ),
                        inspectionRecords:
                          row.records,
                      });
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="overallArea"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#4f46e5"
                          stopOpacity={
                            0.42
                          }
                        />

                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={
                            0
                          }
                        />
                      </linearGradient>

                      <linearGradient
                        id="inspectionArea"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#2563eb"
                          stopOpacity={
                            0.18
                          }
                        />

                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={
                            0
                          }
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="4 5"
                      stroke="#e2e8f0"
                      vertical={
                        false
                      }
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                      minTickGap={
                        25
                      }
                      tick={{
                        fontSize:
                          10,
                        fill:
                          '#64748b',
                      }}
                    />

                    <YAxis
                      domain={[
                        0,
                        100,
                      ]}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                      tick={{
                        fontSize:
                          10,
                        fill:
                          '#94a3b8',
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius:
                          16,
                        border:
                          '1px solid #e2e8f0',
                        boxShadow:
                          '0 18px 45px rgba(15,23,42,.16)',
                        fontSize:
                          11,
                        fontWeight:
                          700,
                      }}
                    />

                    <Legend
                      wrapperStyle={{
                        fontSize:
                          10,
                        fontWeight:
                          800,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="overall"
                      name="Overall Performance"
                      stroke="#4f46e5"
                      strokeWidth={
                        3
                      }
                      fill="url(#overallArea)"
                      connectNulls
                      isAnimationActive
                      animationDuration={
                        750
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="inspection"
                      name="Inspection Performance"
                      stroke="#2563eb"
                      strokeWidth={
                        2
                      }
                      fill="url(#inspectionArea)"
                      connectNulls
                      isAnimationActive
                      animationDuration={
                        800
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="attendance"
                      name="Attendance"
                      stroke="#059669"
                      strokeWidth={
                        2
                      }
                      fillOpacity={
                        0
                      }
                      connectNulls
                      isAnimationActive
                      animationDuration={
                        850
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="wardRanking"
                      name="Ward Ranking"
                      stroke="#9333ea"
                      strokeWidth={
                        2
                      }
                      fillOpacity={
                        0
                      }
                      connectNulls
                      isAnimationActive
                      animationDuration={
                        900
                      }
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <BarChart3
                  size={18}
                  className="text-violet-600"
                />
                Zone Performance
              </div>

              <div className="text-[10px] font-black text-slate-400">
                {metricLabel}
              </div>
            </div>

            <div className="h-[340px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    rankedZones
                  }
                  layout="vertical"
                  margin={{
                    left: 8,
                    right: 24,
                    top: 4,
                    bottom: 4,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 5"
                    stroke="#e2e8f0"
                    horizontal={
                      false
                    }
                  />

                  <XAxis
                    type="number"
                    domain={[
                      0,
                      100,
                    ]}
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    tick={{
                      fontSize:
                        10,
                      fill:
                        '#94a3b8',
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                    width={78}
                    tick={{
                      fontSize:
                        10,
                      fill:
                        '#475569',
                      fontWeight:
                        700,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value: any
                    ) => [
                      percentText(
                        Number(
                          value
                        )
                      ),
                      metricLabel,
                    ]}
                    contentStyle={{
                      borderRadius:
                        14,
                      border:
                        '1px solid #e2e8f0',
                      fontSize:
                        11,
                    }}
                  />

                  <Bar
                    dataKey="metricValue"
                    radius={[
                      0,
                      10,
                      10,
                      0,
                    ]}
                    barSize={22}
                    cursor="pointer"
                    isAnimationActive
                    animationDuration={
                      700
                    }
                    onClick={(
                      data: any
                    ) => {
                      const row =
                        data?.payload ||
                        data;

                      if (row) {
                        openGeo(
                          row
                        );
                      }
                    }}
                  >
                    {rankedZones.map(
                      (
                        row
                      ) => (
                        <Cell
                          key={
                            row.label
                          }
                          fill={
                            negativeMetric
                              ? negativeColor(
                                  row.metricValue ||
                                    0
                                )
                              : positiveColor(
                                  row.metricValue ||
                                    0
                                )
                          }
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ZONE × MODULE */}
        <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 text-sm font-black text-slate-950">
            Zone · Module
          </div>

          <div className="overflow-x-auto p-5">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[150px_repeat(5,minmax(145px,1fr))] gap-2">
                <div />

                {moduleCards.map(
                  (
                    module
                  ) => (
                    <div
                      key={
                        module.key
                      }
                      className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"
                    >
                      {
                        module.label
                      }
                    </div>
                  )
                )}

                {zoneModuleMatrix.flatMap(
                  (
                    row
                  ) => [
                    <div
                      key={`${row.zone}-label`}
                      className="flex items-center rounded-xl bg-slate-50 px-3 text-xs font-black text-slate-700"
                    >
                      {
                        row.zone
                      }
                    </div>,

                    ...row.cells.map(
                      (
                        cell
                      ) => {
                        const value =
                          cell.value ||
                          0;

                        return (
                          <button
                            key={`${row.zone}-${cell.key}`}
                            type="button"
                            onClick={() =>
                              setDrilldown(
                                {
                                  title:
                                    `${row.zone} · ${cell.label}`,
                                  value:
                                    percentText(
                                      cell.value
                                    ),
                                  inspectionRecords:
                                    cell.records,
                                  attendanceEmployees:
                                    cell.employees,
                                  wardRows:
                                    cell.wards,
                                }
                              )
                            }
                            className={`group relative min-h-[66px] overflow-hidden rounded-xl border border-white/60 p-3 text-center transition duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg ${heatTextClass(
                              value
                            )}`}
                            style={{
                              background:
                                positiveColor(
                                  value
                                ),
                            }}
                          >
                            <div className="text-lg font-black">
                              {percentText(
                                cell.value
                              )}
                            </div>

                            <div className="absolute inset-x-2 bottom-1 hidden rounded-lg bg-white/95 px-2 py-1 text-[9px] font-black text-slate-900 shadow-lg group-hover:block">
                              {cell.records.length +
                                cell.employees.length +
                                cell.wards.length}
                            </div>
                          </button>
                        );
                      }
                    ),
                  ]
                )}
              </div>
            </div>
          </div>
        </section>

        {/* WARD HEATMAP */}
        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <Trophy
                size={18}
                className="text-indigo-600"
              />
              Ward Performance
            </div>

            <div className="text-[10px] font-black text-slate-400">
              {metricLabel}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-9">
            {rankedWards.map(
              (row) => {
                const value =
                  row.metricValue ||
                  0;

                return (
                  <button
                    key={
                      row.label
                    }
                    type="button"
                    onClick={() =>
                      openGeo(
                        row
                      )
                    }
                    className={`group relative min-h-[78px] overflow-hidden rounded-2xl border border-white/50 p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl ${heatTextClass(
                      value
                    )}`}
                    style={{
                      background:
                        negativeMetric
                          ? negativeColor(
                              value
                            )
                          : positiveColor(
                              value
                            ),
                    }}
                  >
                    <div className="truncate text-[10px] font-black">
                      {
                        row.label
                      }
                    </div>

                    <div className="mt-2 text-xl font-black">
                      {percentText(
                        row.metricValue
                      )}
                    </div>

                    <div className="absolute inset-x-2 bottom-1 hidden rounded-lg bg-white/95 px-2 py-1 text-center text-[9px] font-black text-slate-950 shadow-lg group-hover:block">
                      {row.records.length +
                        row.employees.length +
                        row.wards.length}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* STATUS GRAPH */}
        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 text-sm font-black text-slate-950">
            <Activity
              size={18}
              className="text-blue-600"
            />
            Inspection & Performance
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  moduleStatusRows
                }
                layout="vertical"
                margin={{
                  left: 32,
                  right: 14,
                  top: 4,
                  bottom: 4,
                }}
              >
                <defs>
                  <linearGradient
                    id="approvedGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="#34d399"
                    />
                    <stop
                      offset="100%"
                      stopColor="#047857"
                    />
                  </linearGradient>

                  <linearGradient
                    id="rejectedGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="#fb7185"
                    />
                    <stop
                      offset="100%"
                      stopColor="#be123c"
                    />
                  </linearGradient>

                  <linearGradient
                    id="actionRequiredGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="#fbbf24"
                    />
                    <stop
                      offset="100%"
                      stopColor="#d97706"
                    />
                  </linearGradient>

                  <linearGradient
                    id="actionTakenGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop
                      offset="0%"
                      stopColor="#60a5fa"
                    />
                    <stop
                      offset="100%"
                      stopColor="#4338ca"
                    />
                  </linearGradient>
                </defs>

                <XAxis
                  type="number"
                  domain={[
                    0,
                    100,
                  ]}
                  axisLine={
                    false
                  }
                  tickLine={
                    false
                  }
                  tick={{
                    fontSize:
                      10,
                    fill:
                      '#94a3b8',
                  }}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={145}
                  axisLine={
                    false
                  }
                  tickLine={
                    false
                  }
                  tick={{
                    fontSize:
                      10,
                    fill:
                      '#475569',
                    fontWeight:
                      700,
                  }}
                />

                <Tooltip
                  formatter={(
                    value: any
                  ) =>
                    percentText(
                      Number(
                        value
                      )
                    )
                  }
                  contentStyle={{
                    borderRadius:
                      14,
                    border:
                      '1px solid #e2e8f0',
                    fontSize:
                      11,
                  }}
                />

                <Legend
                  wrapperStyle={{
                    fontSize:
                      10,
                    fontWeight:
                      800,
                  }}
                />

                <Bar
                  dataKey="Approved"
                  stackId="status"
                  fill="url(#approvedGradient)"
                  isAnimationActive
                  animationDuration={
                    650
                  }
                />

                <Bar
                  dataKey="Rejected"
                  stackId="status"
                  fill="url(#rejectedGradient)"
                  isAnimationActive
                  animationDuration={
                    700
                  }
                />

                <Bar
                  dataKey="Action Required"
                  stackId="status"
                  fill="url(#actionRequiredGradient)"
                  isAnimationActive
                  animationDuration={
                    750
                  }
                />

                <Bar
                  dataKey="Action Taken"
                  stackId="status"
                  fill="url(#actionTakenGradient)"
                  isAnimationActive
                  animationDuration={
                    800
                  }
                />

                <Bar
                  dataKey="Pending"
                  stackId="status"
                  fill="#cbd5e1"
                  radius={[
                    0,
                    10,
                    10,
                    0,
                  ]}
                  isAnimationActive
                  animationDuration={
                    850
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ROLE PERFORMANCE */}
        <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <UsersRound
                size={18}
                className="text-violet-600"
              />
              Performance
            </div>

            <div className="flex flex-wrap gap-2">
              {ROLES.filter(
                (item) =>
                  item.key !==
                  'ALL'
              ).map(
                (role) => (
                  <button
                    key={
                      role.key
                    }
                    type="button"
                    onClick={() =>
                      setPerformanceRole(
                        role.key as Exclude<
                          RoleKey,
                          'ALL'
                        >
                      )
                    }
                    className={`rounded-xl px-3 py-2 text-[10px] font-black transition ${
                      performanceRole ===
                      role.key
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {
                      role.label
                    }
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {activeRoleRows
              .slice(
                0,
                15
              )
              .map(
                (
                  row,
                  index
                ) => (
                  <button
                    key={
                      row.key
                    }
                    type="button"
                    onClick={() =>
                      openRoleRow(
                        row
                      )
                    }
                    className="group grid w-full grid-cols-[32px_minmax(120px,220px)_1fr_70px] items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-indigo-100 hover:bg-indigo-50/50"
                  >
                    <div className="text-center text-[10px] font-black text-slate-400">
                      {index +
                        1}
                    </div>

                    <div className="truncate text-xs font-black text-slate-800">
                      {
                        row.label
                      }
                    </div>

                    <div className="relative h-2 rounded-full bg-slate-100">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width:
                            `${clamp(
                              row.performance
                            )}%`,
                          background:
                            `linear-gradient(90deg,#c7d2fe,${positiveColor(
                              row.performance
                            )})`,
                        }}
                      />

                      <span
                        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-all duration-700"
                        style={{
                          left:
                            `calc(${clamp(
                              row.performance
                            )}% - 8px)`,
                          background:
                            positiveColor(
                              row.performance
                            ),
                        }}
                      />
                    </div>

                    <div className="text-right text-xs font-black text-slate-950">
                      {percentText(
                        row.performance
                      )}
                    </div>
                  </button>
                )
              )}
          </div>
        </section>

        {/* ATTENDANCE × INSPECTION */}
        {attendanceInspectionPoints.length >
          0 && (
          <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-sm font-black text-slate-950">
              <UserRoundCheck
                size={18}
                className="text-cyan-600"
              />
              Attendance · Inspection Performance
            </div>

            <div className="h-[390px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <ScatterChart
                  margin={{
                    top: 20,
                    right: 25,
                    bottom: 20,
                    left: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 5"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    type="number"
                    dataKey="attendance"
                    name="Attendance"
                    domain={[
                      0,
                      100,
                    ]}
                    tick={{
                      fontSize:
                        10,
                      fill:
                        '#64748b',
                    }}
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                  />

                  <YAxis
                    type="number"
                    dataKey="inspection"
                    name="Inspection Performance"
                    domain={[
                      0,
                      100,
                    ]}
                    tick={{
                      fontSize:
                        10,
                      fill:
                        '#64748b',
                    }}
                    axisLine={
                      false
                    }
                    tickLine={
                      false
                    }
                  />

                  <ZAxis
                    type="number"
                    dataKey="reports"
                    range={[
                      70,
                      440,
                    ]}
                  />

                  <Tooltip
                    cursor={{
                      strokeDasharray:
                        '4 4',
                    }}
                    content={({
                      active,
                      payload,
                    }: any) => {
                      if (
                        !active ||
                        !payload?.length
                      ) {
                        return null;
                      }

                      const row =
                        payload[0]
                          .payload;

                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] shadow-xl">
                          <div className="font-black text-slate-950">
                            {
                              row.name
                            }
                          </div>

                          <div className="mt-2 flex justify-between gap-5">
                            <span className="font-semibold text-slate-500">
                              Attendance
                            </span>

                            <span className="font-black text-slate-950">
                              {percentText(
                                row.attendance
                              )}
                            </span>
                          </div>

                          <div className="mt-1 flex justify-between gap-5">
                            <span className="font-semibold text-slate-500">
                              Inspection Performance
                            </span>

                            <span className="font-black text-slate-950">
                              {percentText(
                                row.inspection
                              )}
                            </span>
                          </div>

                          <div className="mt-1 flex justify-between gap-5">
                            <span className="font-semibold text-slate-500">
                              Records
                            </span>

                            <span className="font-black text-slate-950">
                              {
                                row.reports
                              }
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Scatter
                    data={
                      attendanceInspectionPoints
                    }
                    fill="#4f46e5"
                    cursor="pointer"
                    isAnimationActive
                    animationDuration={
                      800
                    }
                    onClick={(
                      data: any
                    ) => {
                      const row =
                        data?.payload ||
                        data;

                      if (!row) {
                        return;
                      }

                      setDrilldown({
                        title:
                          row.name,
                        value:
                          percentText(
                            row.inspection
                          ),
                        breakdown: [
                          {
                            label:
                              'Attendance',
                            value:
                              percentText(
                                row.attendance
                              ),
                          },
                          {
                            label:
                              'Inspection Performance',
                            value:
                              percentText(
                                row.inspection
                              ),
                          },
                          {
                            label:
                              'Records',
                            value:
                              String(
                                row.reports
                              ),
                          },
                        ],
                        inspectionRecords:
                          row.records,
                        attendanceEmployees:
                          [
                            row.employee,
                          ],
                      });
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ATTENDANCE CALENDAR */}
        {(
          moduleFilter ===
            'ALL' ||
          moduleFilter ===
            'ATTENDANCE'
        ) &&
          zoneFilter ===
            'ALL' &&
          wardFilter ===
            'ALL' &&
          personFilter ===
            'ALL' &&
          !!attendance
            ?.dailyTrend
            ?.length && (
            <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950">
                <CalendarDays
                  size={18}
                  className="text-emerald-600"
                />
                Attendance
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-10 xl:grid-cols-14">
                {attendance.dailyTrend.map(
                  (
                    item
                  ) => {
                    const value =
                      item.rate ||
                      0;

                    return (
                      <button
                        key={
                          item.date
                        }
                        type="button"
                        onClick={() =>
                          setDrilldown(
                            {
                              title:
                                formatDate(
                                  item.date
                                ),
                              value:
                                percentText(
                                  value
                                ),
                              breakdown: [
                                {
                                  label:
                                    'Present',
                                  value:
                                    item.present.toLocaleString(
                                      'en-IN'
                                    ),
                                },
                                {
                                  label:
                                    'Absent',
                                  value:
                                    item.absent.toLocaleString(
                                      'en-IN'
                                    ),
                                },
                              ],
                              attendanceEmployees:
                                filteredAttendanceEmployees,
                            }
                          )
                        }
                        className={`group relative min-h-[64px] rounded-xl border border-white/50 p-2 text-center transition duration-300 hover:-translate-y-1 hover:shadow-lg ${heatTextClass(
                          value
                        )}`}
                        style={{
                          background:
                            positiveColor(
                              value
                            ),
                        }}
                      >
                        <div className="text-[9px] font-black">
                          {new Date(
                            item.date
                          ).toLocaleDateString(
                            'en-IN',
                            {
                              day:
                                '2-digit',
                              month:
                                'short',
                            }
                          )}
                        </div>

                        <div className="mt-1 text-sm font-black">
                          {percentText(
                            value
                          )}
                        </div>

                        <div className="absolute inset-x-1 bottom-1 hidden rounded-md bg-white/95 px-1 py-0.5 text-[8px] font-black text-slate-950 group-hover:block">
                          {
                            item.total
                          }
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          )}

        {/* WARD RANKING */}
        {(
          moduleFilter ===
            'ALL' ||
          moduleFilter ===
            'WARD_RANKING'
        ) &&
          filteredWardRows.length >
            0 && (
            <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2 text-sm font-black text-slate-950">
                <Trophy
                  size={18}
                  className="text-violet-600"
                />
                Ward Ranking
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="space-y-2">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                    Top Performance
                  </div>

                  {[...filteredWardRows]
                    .sort(
                      (
                        a,
                        b
                      ) =>
                        b.finalScore -
                        a.finalScore
                    )
                    .slice(
                      0,
                      10
                    )
                    .map(
                      (
                        ward,
                        index
                      ) => (
                        <button
                          key={
                            ward.wardId
                          }
                          type="button"
                          onClick={() =>
                            setProofWard(
                              ward
                            )
                          }
                          className="grid w-full grid-cols-[28px_1fr_70px] items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-emerald-50"
                        >
                          <span className="text-[10px] font-black text-slate-400">
                            {index +
                              1}
                          </span>

                          <div>
                            <div className="text-xs font-black text-slate-800">
                              {ward.wardName ||
                                ward.wardId}
                            </div>

                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width:
                                    `${clamp(
                                      ward.finalScore
                                    )}%`,
                                  background:
                                    positiveColor(
                                      ward.finalScore
                                    ),
                                }}
                              />
                            </div>
                          </div>

                          <span className="text-right text-xs font-black text-emerald-700">
                            {percentText(
                              ward.finalScore
                            )}
                          </span>
                        </button>
                      )
                    )}
                </div>

                <div className="space-y-2">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">
                    Worst Performance
                  </div>

                  {[...filteredWardRows]
                    .sort(
                      (
                        a,
                        b
                      ) =>
                        a.finalScore -
                        b.finalScore
                    )
                    .slice(
                      0,
                      10
                    )
                    .map(
                      (
                        ward,
                        index
                      ) => (
                        <button
                          key={
                            ward.wardId
                          }
                          type="button"
                          onClick={() =>
                            setProofWard(
                              ward
                            )
                          }
                          className="grid w-full grid-cols-[28px_1fr_70px] items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-rose-50"
                        >
                          <span className="text-[10px] font-black text-slate-400">
                            {index +
                              1}
                          </span>

                          <div>
                            <div className="text-xs font-black text-slate-800">
                              {ward.wardName ||
                                ward.wardId}
                            </div>

                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width:
                                    `${clamp(
                                      ward.finalScore
                                    )}%`,
                                  background:
                                    positiveColor(
                                      ward.finalScore
                                    ),
                                }}
                              />
                            </div>
                          </div>

                          <span className="text-right text-xs font-black text-rose-700">
                            {percentText(
                              ward.finalScore
                            )}
                          </span>
                        </button>
                      )
                    )}
                </div>
              </div>
            </section>
          )}

        {loading && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 top-0 z-[70] bg-white/10 backdrop-blur-[1px]">
            <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          </div>
        )}

        {/* DRILLDOWN */}
        {drilldown && (
          <DrilldownDrawer
            data={
              drilldown
            }
            onClose={() =>
              setDrilldown(
                null
              )
            }
            onReport={
              setProofReport
            }
            onEmployee={
              setProofAttendance
            }
            onWard={
              setProofWard
            }
          />
        )}

        {/* REPORT PROOF */}
        {proofReport && (
          <UniversalReportModal
            moduleTitle={
              proofReport.dashboardModuleLabel ||
              moduleLabel(
                proofReport.dashboardModule
              )
            }
            moduleBadge="Commissioner"
            record={
              proofReport
            }
            userRoles={[
              'COMMISSIONER',
            ]}
            onClose={() =>
              setProofReport(
                null
              )
            }
          />
        )}

        {/* ATTENDANCE PROOF */}
        {proofAttendance && (
          <AttendanceProof
            employee={
              proofAttendance
            }
            records={
              proofAttendanceRecords
            }
            loading={
              proofAttendanceLoading
            }
            onClose={() =>
              setProofAttendance(
                null
              )
            }
          />
        )}

        {/* WARD PROOF */}
        {proofWard && (
          <WardProof
            ward={
              proofWard
            }
            onClose={() =>
              setProofWard(
                null
              )
            }
          />
        )}
      </div>
    </RoleGuard>
  );
}