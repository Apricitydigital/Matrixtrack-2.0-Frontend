'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brush,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  ClipboardList,
  Droplets,
  Eye,
  FileText,
  Filter,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRoundCheck,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';

import dynamic from 'next/dynamic';

import { RoleGuard } from '@components/Guards';

/*
 * recharts (and its d3 sub-dependencies) is only needed once these
 * below-the-fold charts actually render, so it's kept out of this
 * route's initial JS chunk. Each chart is a self-contained recharts
 * tree, which next/dynamic requires - splitting individual recharts
 * primitives (Bar, XAxis, ...) would break recharts' children-based
 * composition.
 */
const ComparisonBarChart = dynamic(
  () => import('@components/commissioner/ComparisonBarChart'),
  { ssr: false }
);

const ModuleStatusBarChart = dynamic(
  () => import('@components/commissioner/ModuleStatusBarChart'),
  { ssr: false }
);

const AttendanceInspectionScatterChart = dynamic(
  () => import('@components/commissioner/AttendanceInspectionScatterChart'),
  { ssr: false }
);
import UniversalReportModal from '@components/UniversalReportModal';

import { useAuth } from '@hooks/useAuth';

import {
  AreaBeatApi,
  CityUserApi,
  GeoApi,
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
  | 'ULB_OFFICER'
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

type CityUserSummary = {
  id: string;
  name: string;
  role: string;
  zoneIds?: string[];
  wardIds?: string[];
};

type InspectionStats = {
  total: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
  pending: number;

  // Records counted once each toward `performance` - decision===APPROVED
  // or status===ACTION_TAKEN, unioned rather than summed since approved
  // (a permanent verdict) and actionTaken (a current status) can both be
  // true for the same escalated-then-closed record.
  goodOutcome: number;

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
      label: 'Ward Performance',
    },
  ];

const MODULE_VISUALS: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    soft: string;
  }
> = {
  TOILET: {
    icon: (
      <Droplets
        size={14}
      />
    ),
    color: '#7c3aed',
    soft: '#f5f3ff',
  },
  LITTERBINS: {
    icon: (
      <Trash2
        size={14}
      />
    ),
    color: '#16a34a',
    soft: '#f0fdf4',
  },
  SWEEPING: {
    icon: (
      <Brush
        size={14}
      />
    ),
    color: '#4f46e5',
    soft: '#eef2ff',
  },
  ATTENDANCE: {
    icon: (
      <UsersRound
        size={14}
      />
    ),
    color: '#0ea5e9',
    soft: '#f0f9ff',
  },
  WARD_RANKING: {
    icon: (
      <Trophy
        size={14}
      />
    ),
    color: '#9333ea',
    soft: '#faf5ff',
  },
};

/*
 * Per-module gradient stops for the Zone x Module matrix bars, so each
 * column reads in its own module color (matching MODULE_VISUALS above
 * it) instead of every column sharing one flat indigo scale.
 */
const ZONE_MODULE_BAR_TONES: Record<
  string,
  {
    light: string;
    medium: string;
    full: string;
    deep: string;
  }
> = {
  TOILET: {
    light: '#ede9fe',
    medium: '#c4b5fd',
    full: '#8b5cf6',
    deep: '#6d28d9',
  },
  LITTERBINS: {
    light: '#dcfce7',
    medium: '#86efac',
    full: '#22c55e',
    deep: '#15803d',
  },
  SWEEPING: {
    light: '#e0e7ff',
    medium: '#a5b4fc',
    full: '#6366f1',
    deep: '#4338ca',
  },
  ATTENDANCE: {
    light: '#e0f2fe',
    medium: '#7dd3fc',
    full: '#0ea5e9',
    deep: '#0369a1',
  },
  WARD_RANKING: {
    light: '#f3e8ff',
    medium: '#d8b4fe',
    full: '#a855f7',
    deep: '#7e22ce',
  },
};

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
      key: 'ULB_OFFICER',
      label: 'ULB Officer',
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
      label: 'Ward Performance',
    },
  ];


/* =========================================================
   ZONE PERFORMANCE MAP VISUAL LAYOUT
   Presentation only. The values and click behaviour still come
   from the existing zoneRows / geoMetric logic.
========================================================= */

const ZONE_MAP_LAYOUT: Record<
  number,
  {
    path: string;
    labelX: number;
    labelY: number;
  }
> = {
  1: {
    path:
      'M 350 40 C 386 28 420 35 445 50 C 468 63 483 58 500 70 C 512 89 503 110 484 125 C 466 141 454 158 430 170 C 411 178 392 170 375 164 C 358 159 344 158 330 160 C 332 147 339 137 345 125 C 359 101 360 70 350 40 Z',
    labelX: 411,
    labelY: 103,
  },
  2: {
    path:
      'M 500 70 C 535 72 560 91 575 112 C 592 136 610 151 610 182 C 610 208 595 225 580 242 C 566 259 571 279 550 290 C 533 301 515 287 500 274 C 482 259 468 245 452 232 C 438 220 430 202 430 180 C 430 176 430 173 430 170 C 454 158 466 141 484 125 C 503 110 512 89 500 70 Z',
    labelX: 526,
    labelY: 175,
  },
  3: {
    path:
      'M 365 178 C 382 173 402 171 430 170 C 430 173 430 176 430 180 C 430 202 438 220 452 232 C 468 245 482 259 500 274 C 515 287 533 301 550 290 C 532 312 505 319 480 318 C 458 317 442 330 420 330 C 395 332 375 316 360 306 C 350 295 355 280 365 266 C 378 246 390 228 380 214 C 376 198 370 185 365 178 Z',
    labelX: 430,
    labelY: 265,
  },
  4: {
    path:
      'M 190 247 C 205 274 228 290 255 301 C 278 312 295 326 320 322 C 345 318 362 301 375 282 C 388 262 388 236 380 214 C 376 198 370 185 365 178 C 350 190 330 198 310 210 C 289 225 275 242 252 244 C 230 245 210 260 190 247 Z',
    labelX: 286,
    labelY: 267,
  },
  5: {
    path:
      'M 180 90 C 195 62 220 48 250 45 C 280 42 310 46 350 40 C 360 70 359 101 345 125 C 339 137 332 147 330 160 C 302 157 282 148 262 134 C 238 118 218 120 198 108 C 190 103 184 96 180 90 Z',
    labelX: 257,
    labelY: 91,
  },
  6: {
    path:
      'M 180 90 C 171 112 151 121 142 142 C 132 165 140 188 158 201 C 176 215 170 235 190 247 C 210 260 230 245 252 244 C 275 242 289 225 310 210 C 330 198 350 190 365 178 C 354 170 343 164 330 160 C 302 157 282 148 262 134 C 238 118 218 120 198 108 C 190 103 184 96 180 90 Z',
    labelX: 213,
    labelY: 180,
  },
};


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


function inspectionEndDate(
  from?: string,
  to?: string
) {
  if (!to) {
    return undefined;
  }

  const nextDay =
    new Date(
      `${to}T00:00:00`
    );

  nextDay.setDate(
    nextDay.getDate() + 1
  );

  return [
    nextDay.getFullYear(),
    String(
      nextDay.getMonth() + 1
    ).padStart(2, '0'),
    String(
      nextDay.getDate()
    ).padStart(2, '0'),
  ].join('-');
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

function attendanceHeatColor(
  value: number
) {
  const score =
    clamp(value);

  const lightness =
    95 -
    score * 0.5;

  return `hsl(346 77% ${lightness}%)`;
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
  const workspaceStatus =
    String(
      item?.workspaceStatus ||
      ''
    ).toUpperCase();

  const actionStatus =
    String(
      item?.actionStatus ||
      ''
    ).toUpperCase();

  const rawStatus =
    String(
      item?.status ||
      item?.reviewStatus ||
      item?.qcStatus ||
      ''
    ).toUpperCase();

  if (workspaceStatus === 'ACTION_TAKEN') return 'ACTION_TAKEN';
  if (workspaceStatus === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
  if (workspaceStatus === 'APPROVED') return 'APPROVED';
  if (workspaceStatus === 'REJECTED') return 'REJECTED';
  if (workspaceStatus === 'DRAFT') return 'DRAFT';
  if (
    [
      'SUBMITTED',
      'PENDING',
      'PENDING_QC',
    ].includes(workspaceStatus)
  ) {
    return 'PENDING';
  }

  if (actionStatus === 'ACTION_TAKEN') return 'ACTION_TAKEN';
  if (actionStatus === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';

  if (
    item?.actionOfficerRespondedAt ||
    item?.actionTakenBy ||
    item?.actionTakenById ||
    rawStatus === 'ACTION_TAKEN'
  ) {
    return 'ACTION_TAKEN';
  }

  if (rawStatus === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
  if (rawStatus === 'APPROVED') return 'APPROVED';
  if (rawStatus === 'REJECTED') return 'REJECTED';
  if (
    [
      'SUBMITTED',
      'PENDING',
      'PENDING_QC',
      'IN_PROGRESS',
    ].includes(rawStatus)
  ) {
    return 'PENDING';
  }

  return rawStatus || 'PENDING';
}

/*
 * The permanent QC verdict for a record. Unlike effectiveStatus, this
 * stays APPROVED/REJECTED even after the record moves on to
 * ACTION_REQUIRED / ACTION_TAKEN, so Approved/Rejected stats below
 * still count every record that ever received that verdict - matching
 * InspectionPerformanceWorkspace's getQcDecision.
 */
function getQcDecision(
  item: any
): 'APPROVED' | 'REJECTED' | null {
  const decision =
    String(
      item?.qcDecision || ''
    ).toUpperCase();

  if (
    decision === 'APPROVED' ||
    decision === 'REJECTED'
  ) {
    return decision;
  }

  const status =
    effectiveStatus(item);

  if (
    status === 'APPROVED' ||
    status === 'REJECTED'
  ) {
    return status;
  }

  // Legacy records escalated to Action Required / Action Taken before
  // the permanent qcDecision field existed have no recoverable original
  // verdict. Default them to Approved (the far more common precursor to
  // escalation) so Approved + Rejected + Pending still reconciles with
  // Total.
  if (
    status === 'ACTION_REQUIRED' ||
    status === 'ACTION_TAKEN'
  ) {
    return 'APPROVED';
  }

  return null;
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

function cleanInspectionDisplayValue(
  value: unknown
) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  let result =
    String(value).trim();

  if (!result) {
    return '';
  }

  /*
   * Remove Unicode replacement / malformed display
   * characters before showing data to Commissioner.
   */
  result =
    result
      .replace(/\uFFFD/g, '')
      .replace(/\?/g, '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim();

  if (!result) {
    return '';
  }

  const normalized =
    result.toLowerCase();

  if (
    result === '?' ||
    result === '-' ||
    result === '-' ||
    normalized === 'null' ||
    normalized === 'undefined' ||
    normalized === 'nan'
  ) {
    return '';
  }

  return result;
}


function isValidInspectionPersonName(
  value: unknown
) {
  const cleaned =
    cleanInspectionDisplayValue(
      value
    );

  if (!cleaned) {
    return false;
  }

  /*
   * A real person name must contain at least
   * one letter or number. This rejects broken
   * replacement glyphs such as ? / diamonds.
   */
  return /[A-Za-z0-9]/.test(
    cleaned
  );
}


function getSiName(
  item: any
) {
  const candidates = [
    item?.reviewedBy?.name,
    item?.reviewedByQc?.name,
    item?.qcReviewer?.name,
    item?.qc?.name,

    item?.sanitaryInspector?.name,
    item?.si?.name,
    item?.inspector?.name,
    item?.reviewer?.name,

    item?.assignedQc?.name,
    item?.assignedQC?.name,
    item?.assignedReviewer?.name,

    item?.reviewedByName,
    item?.qcReviewerName,
    item?.sanitaryInspectorName,
    item?.siName,
    item?.inspectorName,
    item?.reviewerName,
    item?.assignedQcName,
    item?.assignedQCName,
    item?.assignedReviewerName,
  ];

  for (
    const candidate of candidates
  ) {
    const cleaned =
      cleanInspectionDisplayValue(
        candidate
      );

    if (cleaned) {
      return cleaned;
    }
  }

  return '';
}


function getSiId(
  item: any
) {
  const value =
    item?.reviewedBy?.id ||
    item?.reviewedByQc?.id ||
    item?.reviewedByQcId ||
    item?.reviewedById ||

    item?.qcReviewer?.id ||
    item?.qcReviewerId ||
    item?.qc?.id ||
    item?.qcId ||

    item?.sanitaryInspector?.id ||
    item?.sanitaryInspectorId ||

    item?.si?.id ||
    item?.siId ||

    item?.inspector?.id ||
    item?.inspectorId ||

    item?.reviewer?.id ||
    item?.reviewerId ||

    item?.assignedQc?.id ||
    item?.assignedQcId ||

    item?.assignedQC?.id ||
    item?.assignedQCId ||

    item?.assignedReviewer?.id ||
    item?.assignedReviewerId ||

    null;

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return String(value);
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

function inspectionSiDecisionLabel(
  value: unknown
) {
  const decision =
    cleanInspectionDisplayValue(
      value
    ).toUpperCase();

  /*
   * SI decision in this table should represent
   * the SI review verdict only.
   */
  if (
    decision === 'APPROVED' ||
    decision === 'REJECTED'
  ) {
    return decision;
  }

  return '';
}


function inspectionStats(
  records: DashboardRecord[]
): InspectionStats {
  let approved = 0;
  let rejected = 0;
  let actionRequired = 0;
  let actionTaken = 0;
  let pending = 0;

  // Records whose current status/QC decision resolve to a "good
  // outcome" - counted once per record even though approved (a
  // permanent verdict) and actionTaken (a current status) can both be
  // true for the same escalated-then-closed record.
  let goodOutcome = 0;

  const applicableRecords =
    records.filter(
      (item) =>
        effectiveStatus(item) !==
        'DRAFT'
    );

  applicableRecords.forEach(
    (item) => {
      const status =
        effectiveStatus(item);
      const decision =
        getQcDecision(item);

      // Approved / Rejected are supersets: a record keeps its
      // original QC verdict even after it moves on to Action
      // Required or Action Taken, so it still counts here -
      // matching InspectionPerformanceWorkspace's getQcDecision.
      if (
        decision === 'APPROVED'
      ) {
        approved += 1;
      } else if (
        decision === 'REJECTED'
      ) {
        rejected += 1;
      }

      if (
        status === 'PENDING'
      ) {
        pending += 1;
      } else if (
        status ===
        'ACTION_REQUIRED'
      ) {
        // Action Required is a superset that also includes
        // records whose action has already been taken.
        actionRequired += 1;
      } else if (
        status ===
        'ACTION_TAKEN'
      ) {
        actionRequired += 1;
        actionTaken += 1;
      }

      if (
        decision === 'APPROVED' ||
        status === 'ACTION_TAKEN'
      ) {
        goodOutcome += 1;
      }
    }
  );

  const total =
    applicableRecords.length;

  const performance =
    total > 0
      ? (
        goodOutcome /
        total
      ) * 100
      : null;

  // decided uses the permanent QC verdict (getQcDecision), so a report
  // that was QC-approved but later needed corrective action still
  // counts under its original verdict here - matching
  // InspectionPerformanceWorkspace's SI Approved / SI Rejected stats.
  const decided =
    approved +
    rejected;

  const approvalRate =
    decided > 0
      ? (
        approved /
        decided
      ) * 100
      : null;

  const rejectionRate =
    decided > 0
      ? (
        rejected /
        decided
      ) * 100
      : null;

  // actionRequired is already the superset (Action Required + Action
  // Taken), so it alone is the corrective denominator.
  const actionClosure =
    actionRequired > 0
      ? (
        actionTaken /
        actionRequired
      ) * 100
      : null;

  return {
    total,
    approved,
    rejected,
    actionRequired,
    actionTaken,
    pending,

    goodOutcome,

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
          toDate: inspectionEndDate(from, to),
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
                  toDate: inspectionEndDate(from, to),
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
   MONTH-OVER-MONTH TREND
========================================================= */

function monthBoundaries(
  offsetMonths: number
) {
  const now =
    new Date();

  const first =
    new Date(
      now.getFullYear(),
      now.getMonth() +
      offsetMonths,
      1
    );

  const last =
    offsetMonths === 0
      ? now
      : new Date(
        now.getFullYear(),
        now.getMonth() +
        offsetMonths +
        1,
        0
      );

  return {
    from: toDateInput(first),
    to: toDateInput(last),
  };
}

type PeriodMetrics = {
  overallPerformance: number | null;
  inspectionPerformance: number | null;
  attendanceRate: number | null;
  approvalRate: number | null;
  rejectionRate: number | null;
  actionClosure: number | null;
  wardRankingAverage: number | null;
};

async function computePeriodMetrics(
  cityId: string | undefined,
  from: string,
  to: string
): Promise<PeriodMetrics> {
  const moduleRows =
    await Promise.all(
      INSPECTION_MODULES.map(
        (module) =>
          loadAllModuleRecords(
            module.key,
            from,
            to
          )
      )
    );

  const inspection =
    inspectionStats(
      moduleRows.flat()
    );

  const [
    attendanceResult,
    wardResult,
  ] =
    await Promise.allSettled([
      /*
       * employeeGroup: 'HEALTH_WORKERS' matches the ULB officer
       * dashboard's own Attendance query - without it this counts
       * every employee type and no longer agrees with that screen.
       */
      AttendanceApi.dashboard({
        cityId,
        from,
        to,
        employeeGroup:
          'HEALTH_WORKERS',
        page: 1,
        pageSize: 1,
      }),
      WardRankingApi.summary({
        from,
        to,
      }),
    ]);

  const attendanceRate =
    attendanceResult.status ===
      'fulfilled' &&
      attendanceResult.value
        .hasData
      ? attendanceResult.value
        .summary
        ?.attendanceRate ??
      null
      : null;

  /*
   * averageScore comes straight from /ward-ranking/summary -
   * the same endpoint and field the ULB officer dashboard reads
   * for its "City Average Score", so the two stay in sync.
   */
  const wardRankingAverage =
    wardResult.status ===
      'fulfilled'
      ? wardResult.value
        .averageScore ??
      null
      : null;

  const overallPerformance =
    averageApplicable([
      inspection.performance,
      attendanceRate,
      wardRankingAverage,
    ]);

  return {
    overallPerformance,
    inspectionPerformance:
      inspection.performance,
    attendanceRate,
    approvalRate:
      inspection.approvalRate,
    rejectionRate:
      inspection.rejectionRate,
    actionClosure:
      inspection.actionClosure,
    wardRankingAverage,
  };
}

type MonthTrend = {
  deltaPct: number | null;
  direction: 'up' | 'down' | 'flat';
};

type SmartInsightTone =
  | 'positive'
  | 'warning'
  | 'neutral';

type SmartInsight = {
  id: string;
  tone: SmartInsightTone;
  icon: React.ReactNode;
  text: string;
};

function buildMonthTrends(
  current: PeriodMetrics,
  previous: PeriodMetrics
): Record<string, MonthTrend> {
  const result: Record<
    string,
    MonthTrend
  > = {};

  (
    Object.keys(
      current
    ) as Array<
      keyof PeriodMetrics
    >
  ).forEach((key) => {
    const curr = current[key];
    const prev = previous[key];

    if (
      curr === null ||
      prev === null ||
      prev === 0
    ) {
      result[key] = {
        deltaPct: null,
        direction: 'flat',
      };

      return;
    }

    const deltaPct =
      ((curr - prev) /
        Math.abs(prev)) *
      100;

    result[key] = {
      deltaPct,
      direction:
        deltaPct >= 0
          ? 'up'
          : 'down',
    };
  });

  return result;
}


/* =========================================================
   KPI ICON BADGE (small overlay circle on the main icon)
========================================================= */

function IconBadge({
  icon,
  bg,
}: {
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <span
      className={`absolute -bottom-1 -right-1 flex h-[16px] w-[16px] items-center justify-center rounded-full ring-2 ring-white ${bg}`}
    >
      {icon}
    </span>
  );
}


/* =========================================================
   CIRCULAR PROGRESS
   (Top / Worst Performance rings - presentation only, the
   value/name/onClick it renders come straight from the
   existing rankedZones/rankedWards rows)
========================================================= */

function CircularProgress({
  value,
  label,
  name,
  variant = 'success',
  accent,
  track,
  onClick,
}: {
  value: number | null | undefined;
  label: string;
  name: string;
  variant?: 'success' | 'danger';
  accent?: string;
  track?: string;
  onClick?: () => void;
}) {
  const progress =
    clamp(
      typeof value ===
        'number' &&
        Number.isFinite(
          value
        )
        ? value
        : 0
    );

  const isDanger =
    variant === 'danger';

  const progressColor =
    accent ??
    (isDanger
      ? '#F43F5E'
      : '#10B981');

  const trackColor =
    track ??
    (isDanger
      ? '#FECDD3'
      : '#D1FAE5');

  const percentColor =
    accent ??
    (isDanger
      ? '#9F1239'
      : '#064E3B');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group flex flex-col items-center gap-1 text-center transition disabled:cursor-default"
    >
      <div
        className="relative flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-enabled:group-hover:scale-[1.03] sm:h-[76px] sm:w-[76px] xl:h-[88px] xl:w-[88px]"
        style={{
          background: `conic-gradient(${progressColor} ${progress * 3.6
            }deg, ${trackColor} 0deg)`,
        }}
      >
        <div className="absolute inset-[6px] rounded-full bg-white shadow-[inset_0_2px_6px_rgba(15,23,42,.06)] sm:inset-[8px] xl:inset-[9px]" />

        <div
          className="relative text-[14px] font-black leading-none sm:text-[16px] xl:text-[19px]"
          style={{
            color: percentColor,
          }}
        >
          {percentText(value)}
        </div>
      </div>

      <div className="min-w-0 max-w-[110px]">
        <div
          className="truncate text-[11px] font-extrabold leading-tight sm:text-[12px] xl:text-[13px]"
          style={{
            color: '#0F1B4C',
          }}
        >
          {name || '—'}
        </div>

        <div
          className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.05em] sm:text-[10px]"
          style={{
            color: '#647DB7',
          }}
        >
          {label}
        </div>
      </div>
    </button>
  );
}


/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  label,
  value,
  lastMonthValue,
  cardTint,
  iconGradient,
  icon,
  tooltip,
  trend,
  onClick,
}: {
  label: string;
  value: string;
  lastMonthValue?: string;
  cardTint: string;
  iconGradient: string;
  icon: React.ReactNode;
  tooltip: Array<{
    label: string;
    value: string;
  }>;
  trend?: MonthTrend;
  onClick: () => void;
}) {
  const isDown = trend?.direction === 'down';

  /*
   * Visual-only mapping.
   * This does not touch KPI calculations, click handlers, filters,
   * month trends, drilldowns, or any API/data logic.
   */
  const visual = (() => {
    switch (label) {
      case 'Overall Performance':
        return {
          cornerIcon: <Activity size={15} strokeWidth={2.8} />,
          accentText: 'text-violet-400',
        };

      case 'Inspection Performance':
        return {
          cornerIcon: <Eye size={15} strokeWidth={2.8} />,
          accentText: 'text-blue-400',
        };

      case 'Attendance':
        return {
          cornerIcon: <UserRoundCheck size={15} strokeWidth={2.8} />,
          accentText: 'text-emerald-400',
        };

      case 'Approval Rate':
        return {
          cornerIcon: <ShieldCheck size={15} strokeWidth={2.8} />,
          accentText: 'text-teal-400',
        };

      case 'Rejection Rate':
        return {
          cornerIcon: <XCircle size={15} strokeWidth={2.8} />,
          accentText: 'text-rose-400',
        };

      case 'Action Closure':
        return {
          cornerIcon: <CheckCircle2 size={15} strokeWidth={2.8} />,
          accentText: 'text-orange-400',
        };

      case 'Ward Performance':
        return {
          cornerIcon: <Trophy size={15} strokeWidth={2.8} />,
          accentText: 'text-violet-400',
        };

      default:
        return {
          cornerIcon: <Activity size={15} strokeWidth={2.8} />,
          accentText: 'text-indigo-400',
        };
    }
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ perspective: '1200px' }}
      className="group block h-full w-full text-left"
    >
      <div className="relative h-full min-h-[258px] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* FRONT */}
        <div
          className={`absolute inset-0 flex h-full w-full flex-col overflow-hidden rounded-[18px] border border-white/80 ${cardTint} shadow-[0_12px_30px_-20px_rgba(15,23,42,.32)] transition-shadow duration-300 group-hover:shadow-[0_20px_46px_-20px_rgba(15,23,42,.32)]`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {/* =====================================================
              TOP VISUAL AREA
              Large main icon + small corner icon + skyline effect
          ====================================================== */}
          <div className="relative h-[88px] shrink-0 overflow-hidden px-4 pt-2.5">
            {/* soft theme glow */}
            <div
              className={`pointer-events-none absolute -left-5 -top-5 h-24 w-24 rounded-full bg-gradient-to-br ${iconGradient} opacity-[0.12] blur-2xl`}
            />
            <div
              className={`pointer-events-none absolute right-3 top-6 h-16 w-16 rounded-full bg-gradient-to-br ${iconGradient} opacity-[0.08] blur-2xl`}
            />

            {/* subtle city / building silhouette */}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-[52px] opacity-[0.16] ${visual.accentText}`}
              aria-hidden="true"
            >
              <div className="absolute bottom-0 left-[1%] h-8 w-5 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[7%] h-12 w-7 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[15%] h-7 w-4 rounded-t-[2px] bg-current" />
              <div className="absolute bottom-0 left-[21%] h-14 w-8 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[31%] h-10 w-6 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[39%] h-[62px] w-8 rounded-t-[4px] bg-current" />
              <div className="absolute bottom-0 left-[50%] h-9 w-5 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[57%] h-12 w-7 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[67%] h-7 w-5 rounded-t-[2px] bg-current" />
              <div className="absolute bottom-0 left-[74%] h-14 w-8 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[85%] h-10 w-6 rounded-t-[3px] bg-current" />
              <div className="absolute bottom-0 left-[93%] h-8 w-5 rounded-t-[3px] bg-current" />

              {/* tiny windows / city depth */}
              <div className="absolute bottom-3 left-[9%] h-1 w-1 rounded-full bg-white/70" />
              <div className="absolute bottom-7 left-[24%] h-1 w-1 rounded-full bg-white/70" />
              <div className="absolute bottom-8 left-[42%] h-1 w-1 rounded-full bg-white/70" />
              <div className="absolute bottom-5 left-[60%] h-1 w-1 rounded-full bg-white/70" />
              <div className="absolute bottom-8 left-[77%] h-1 w-1 rounded-full bg-white/70" />
            </div>

            {/* large primary icon */}
            <div
              className={`absolute bottom-1 left-1/2 z-10 flex h-[52px] w-[52px] -translate-x-1/2 items-center justify-center rounded-[15px] bg-gradient-to-br ${iconGradient} text-white shadow-[0_10px_18px_-9px_rgba(15,23,42,.45)] ring-[3px] ring-white/45 [&>svg]:h-[26px] [&>svg]:w-[26px]`}
            >
              {icon}
            </div>

            {/* small top-right secondary icon */}
            <div
              className={`absolute right-3 top-3 z-20 flex h-[28px] w-[28px] items-center justify-center rounded-[9px] bg-gradient-to-br ${iconGradient} text-white shadow-[0_6px_14px_-7px_rgba(15,23,42,.45)] ring-2 ring-white/70 [&>svg]:h-[13px] [&>svg]:w-[13px]`}
            >
              {visual.cornerIcon}
            </div>
          </div>

          {/* METRIC */}
          <div className="relative z-10 px-4 pt-1">
            <div className="text-[26px] font-black leading-none tracking-[-0.035em] text-[#10224a]">
              {value}
            </div>

            <div className="mt-1.5 line-clamp-2 min-h-[32px] text-[12px] font-bold leading-[1.25] text-[#31518f]">
              {label}
            </div>
          </div>

          {/* TREND + LAST MONTH */}
          <div className="mt-auto px-4 pb-2.5 pt-2">
            <div className="border-t border-slate-200/65 pt-2">
              {trend && trend.deltaPct !== null ? (
                <div className="flex min-h-[30px] items-start gap-1.5">
                  <span
                    className={
                      isDown
                        ? 'mt-[1px] text-rose-500'
                        : 'mt-[1px] text-emerald-500'
                    }
                  >
                    {isDown ? (
                      <TrendingDown size={16} strokeWidth={2.8} />
                    ) : (
                      <TrendingUp size={16} strokeWidth={2.8} />
                    )}
                  </span>

                  <div>
                    <div
                      className={`text-[13px] font-black leading-none ${isDown
                        ? 'text-rose-500'
                        : 'text-emerald-600'
                        }`}
                    >
                      {Math.abs(trend.deltaPct).toFixed(0)}%
                    </div>

                    <div className="mt-1 text-[9px] font-semibold leading-none text-[#49679d]">
                      vs last month
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[30px] items-center text-[10px] font-semibold text-slate-400">
                  No prior data
                </div>
              )}

              <div className="mt-1.5 rounded-[9px] border border-white/70 bg-white/55 px-2.5 py-1.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.75)] backdrop-blur-sm">
                <div className="text-[9px] font-semibold leading-none text-[#49679d]">
                  Last Month
                </div>

                <div className="mt-1 text-[13px] font-black leading-none text-[#172d5d]">
                  {lastMonthValue ?? '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BACK - existing drill/tooltip behaviour preserved */}
        <div
          className={`absolute inset-0 flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-br ${iconGradient} p-3.5 text-white shadow-[0_14px_34px_-18px_rgba(15,23,42,.45)]`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 text-[9.5px] font-black uppercase leading-[1.35] tracking-[0.1em] text-white/75">
              {label}
            </div>

            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-white/15 ring-1 ring-white/20 [&>svg]:h-[12px] [&>svg]:w-[12px]">
              {visual.cornerIcon}
            </div>
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
            {tooltip.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="flex w-full min-w-0 items-center justify-between gap-1.5 rounded-[9px] bg-white/10 px-2 py-1 text-[9px] ring-1 ring-white/5"
              >
                <span className="min-w-0 flex-1 truncate font-semibold leading-tight text-white/75">
                  {row.label}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[10px] font-black leading-tight text-white">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-1.5 shrink-0 truncate border-t border-white/10 pt-1.5 text-[8px] font-semibold text-white/60">
            Breakdown for the current filter
          </div>
        </div>
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
  siUsers,
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
  siUsers: CityUserSummary[];
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
            'Ward Performance',
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

  const [
    inspectionModuleFilter,
    setInspectionModuleFilter,
  ] =
    useState<string>('ALL');

  const [
    inspectionZoneFilter,
    setInspectionZoneFilter,
  ] =
    useState<string>('ALL');

  const [
    inspectionWardFilter,
    setInspectionWardFilter,
  ] =
    useState<string>('ALL');

  const [
    inspectionDarogaFilter,
    setInspectionDarogaFilter,
  ] =
    useState<string>('ALL');

  const [
    inspectionSiFilter,
    setInspectionSiFilter,
  ] =
    useState<string>('ALL');

  const [
    inspectionWorkflowFilter,
    setInspectionWorkflowFilter,
  ] =
    useState<string>('ALL');

  const [
    inspectionSearch,
    setInspectionSearch,
  ] =
    useState('');


  useEffect(() => {
    setTab(
      tabs[0]?.key ||
      'INSPECTION'
    );

    setPage(1);
  }, [data, tabs]);


  /*
   * reset inspection workspace when drilldown changes
   */
  useEffect(() => {
    setInspectionModuleFilter(
      'ALL'
    );
    setInspectionZoneFilter(
      'ALL'
    );
    setInspectionWardFilter(
      'ALL'
    );
    setInspectionDarogaFilter(
      'ALL'
    );
    setInspectionSiFilter(
      'ALL'
    );
    setInspectionWorkflowFilter(
      'ALL'
    );
    setInspectionSearch('');
  }, [data]);

  const pageSize =
    40;

  const inspectionRows =
    (
      data.inspectionRecords ||
      []
    ).filter(
      (item) =>
        effectiveStatus(
          item
        ) !== 'DRAFT'
    );



  const inspectionOverviewStats =
    useMemo(
      () =>
        inspectionStats(
          inspectionRows
        ),
      [inspectionRows]
    );

  const inspectionModuleOptions =
    useMemo(
      () =>
        INSPECTION_MODULES.filter(
          (module) =>
            inspectionRows.some(
              (item) =>
                item.dashboardModule ===
                module.key
            )
        ),
      [inspectionRows]
    );

  const inspectionZoneOptions =
    useMemo(
      () =>
        naturalSort(
          Array.from(
            new Set(
              inspectionRows
                .map(
                  (item) =>
                    getRecordZone(
                      item
                    )
                )
                .filter(Boolean)
            )
          ) as string[]
        ),
      [inspectionRows]
    );

  const inspectionWardOptions =
    useMemo(
      () =>
        naturalSort(
          Array.from(
            new Set(
              inspectionRows
                .filter(
                  (item) =>
                    inspectionZoneFilter ===
                    'ALL' ||
                    getRecordZone(
                      item
                    ) ===
                    inspectionZoneFilter
                )
                .map(
                  (item) =>
                    getRecordWard(
                      item
                    )
                )
                .filter(Boolean)
            )
          ) as string[]
        ),
      [
        inspectionRows,
        inspectionZoneFilter,
      ]
    );

  const inspectionDarogaOptions =
    useMemo(
      () =>
        naturalSort(
          Array.from(
            new Set(
              inspectionRows
                .map(
                  (item) =>
                    getDarogaName(
                      item
                    )
                )
                .filter(Boolean)
            )
          ) as string[]
        ),
      [inspectionRows]
    );

  const inspectionSiOptions =
    useMemo(
      () =>
        naturalSort(
          Array.from(
            new Set(
              inspectionRows
                .map(
                  (item) =>
                    cleanInspectionDisplayValue(
                      getInspectionSiDisplayName(
                        item
                      )
                    )
                )
                .filter(Boolean)
            )
          ) as string[]
        ),
      [inspectionRows]
    );

  const inspectionModuleSummaries =
    useMemo(
      () =>
        INSPECTION_MODULES.map(
          (module) => {
            const rows =
              inspectionRows.filter(
                (item) =>
                  item.dashboardModule ===
                  module.key
              );

            return {
              ...module,
              rows,
              stats:
                inspectionStats(
                  rows
                ),
            };
          }
        ),
      [inspectionRows]
    );

  const filteredInspectionWorkspaceRows =
    useMemo(
      () => {
        const query =
          normalize(
            inspectionSearch
          );

        return inspectionRows.filter(
          (item) => {
            if (
              inspectionModuleFilter !==
              'ALL' &&
              item.dashboardModule !==
              inspectionModuleFilter
            ) {
              return false;
            }

            if (
              inspectionZoneFilter !==
              'ALL' &&
              getRecordZone(
                item
              ) !==
              inspectionZoneFilter
            ) {
              return false;
            }

            if (
              inspectionWardFilter !==
              'ALL' &&
              getRecordWard(
                item
              ) !==
              inspectionWardFilter
            ) {
              return false;
            }

            if (
              inspectionDarogaFilter !==
              'ALL' &&
              getDarogaName(
                item
              ) !==
              inspectionDarogaFilter
            ) {
              return false;
            }

            if (
              inspectionSiFilter !==
              'ALL' &&
              getInspectionSiDisplayName(item) !==
              inspectionSiFilter
            ) {
              return false;
            }

            const status =
              effectiveStatus(
                item
              );

            const decision =
              getQcDecision(
                item
              );

            if (
              inspectionWorkflowFilter ===
              'APPROVED' &&
              decision !==
              'APPROVED'
            ) {
              return false;
            }

            if (
              inspectionWorkflowFilter ===
              'REJECTED' &&
              decision !==
              'REJECTED'
            ) {
              return false;
            }

            if (
              inspectionWorkflowFilter ===
              'PENDING' &&
              status !==
              'PENDING'
            ) {
              return false;
            }

            /*
             * Action Required is the complete corrective-action
             * pool, so it includes both current ACTION_REQUIRED
             * and already completed ACTION_TAKEN records.
             */
            if (
              inspectionWorkflowFilter ===
              'ACTION_REQUIRED' &&
              ![
                'ACTION_REQUIRED',
                'ACTION_TAKEN',
              ].includes(
                status
              )
            ) {
              return false;
            }

            if (
              inspectionWorkflowFilter ===
              'ACTION_TAKEN' &&
              status !==
              'ACTION_TAKEN'
            ) {
              return false;
            }

            if (
              inspectionWorkflowFilter ===
              'PENDING_ACTION' &&
              status !==
              'ACTION_REQUIRED'
            ) {
              return false;
            }

            if (query) {
              const haystack =
                normalize(
                  [
                    item.dashboardModuleLabel,
                    getRecordZone(
                      item
                    ),
                    getRecordWard(
                      item
                    ),
                    getDarogaName(
                      item
                    ),
                    getInspectionSiDisplayName(item),
                    status,
                    decision,
                  ]
                    .filter(Boolean)
                    .join(' ')
                );

              if (
                !haystack.includes(
                  query
                )
              ) {
                return false;
              }
            }

            return true;
          }
        );
      },
      [
        inspectionRows,
        inspectionModuleFilter,
        inspectionZoneFilter,
        inspectionWardFilter,
        inspectionDarogaFilter,
        inspectionSiFilter,
        inspectionWorkflowFilter,
        inspectionSearch,
      ]
    );

  const filteredInspectionWorkspaceStats =
    useMemo(
      () =>
        inspectionStats(
          filteredInspectionWorkspaceRows
        ),
      [
        filteredInspectionWorkspaceRows,
      ]
    );

  const inspectionWorkflowCards = [
    {
      key: 'ALL',
      label:
        'Total Inspection',
      value:
        inspectionOverviewStats.total,
      tone:
        'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      key: 'APPROVED',
      label:
        'SI Approved',
      value:
        inspectionOverviewStats.approved,
      tone:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
      key: 'REJECTED',
      label:
        'SI Rejected',
      value:
        inspectionOverviewStats.rejected,
      tone:
        'border-rose-200 bg-rose-50 text-rose-700',
    },
    {
      key: 'PENDING',
      label:
        'SI Pending',
      value:
        inspectionOverviewStats.pending,
      tone:
        'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      key: 'ACTION_REQUIRED',
      label:
        'Action Required',
      value:
        inspectionOverviewStats.actionRequired,
      tone:
        'border-orange-200 bg-orange-50 text-orange-700',
    },
    {
      key: 'ACTION_TAKEN',
      label:
        'Action Taken',
      value:
        inspectionOverviewStats.actionTaken,
      tone:
        'border-teal-200 bg-teal-50 text-teal-700',
    },
    {
      key: 'PENDING_ACTION',
      label:
        'Pending Action',
      value:
        Math.max(
          0,
          inspectionOverviewStats.actionRequired -
          inspectionOverviewStats.actionTaken
        ),
      tone:
        'border-cyan-200 bg-cyan-50 text-cyan-700',
    },
  ];

  const resetInspectionWorkspaceFilters =
    () => {
      setInspectionModuleFilter(
        'ALL'
      );
      setInspectionZoneFilter(
        'ALL'
      );
      setInspectionWardFilter(
        'ALL'
      );
      setInspectionDarogaFilter(
        'ALL'
      );
      setInspectionSiFilter(
        'ALL'
      );
      setInspectionWorkflowFilter(
        'ALL'
      );
      setInspectionSearch('');
      setPage(1);
    };

  useEffect(() => {
    setInspectionWardFilter(
      'ALL'
    );
    setPage(1);
  }, [
    inspectionZoneFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    inspectionModuleFilter,
    inspectionWardFilter,
    inspectionDarogaFilter,
    inspectionSiFilter,
    inspectionWorkflowFilter,
    inspectionSearch,
  ]);

  const siUserNameById =
    useMemo(() => {
      const map =
        new Map<string, string>();

      siUsers.forEach(
        (user) => {
          const id =
            cleanInspectionDisplayValue(
              user.id
            );

          const name =
            cleanInspectionDisplayValue(
              user.name
            );

          if (
            id &&
            name
          ) {
            map.set(
              String(id),
              name
            );
          }
        }
      );

      return map;
    }, [siUsers]);

  function getInspectionSiDisplayName(
    item: DashboardRecord
  ) {
    const directName =
      cleanInspectionDisplayValue(
        getSiName(item)
      );

    /*
     * Do not accept garbage symbols as names.
     * Only accept a usable human-readable value.
     */
    if (
      isValidInspectionPersonName(
        directName
      )
    ) {
      return directName;
    }

    /*
     * If name is missing/broken but an SI/QC ID
     * exists, resolve it against registered QC users.
     */
    const id =
      getSiId(item);

    if (id) {
      const rosterName =
        cleanInspectionDisplayValue(
          siUserNameById.get(
            String(id)
          )
        );

      if (
        isValidInspectionPersonName(
          rosterName
        )
      ) {
        return rosterName;
      }
    }

    return '';
  }


  const attendanceRows =
    data.attendanceEmployees ||
    [];

  const wardRows =
    data.wardRows ||
    [];

  const activeLength =
    tab === 'INSPECTION'
      ? filteredInspectionWorkspaceRows.length
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

          {tab !== 'INSPECTION' &&
            !!data.breakdown?.length && (
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
                      className={`rounded-xl px-4 py-2 text-xs font-black transition ${tab ===
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
              <div className="space-y-5">

                {/* COMPACT INSPECTION SUMMARY */}



                {/* WORKFLOW */}
                <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-950">
                      Inspection Workflow
                    </div>

                    <div className="text-[9px] font-bold text-slate-400">
                      Click to filter
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                    {inspectionWorkflowCards.map(
                      (item) => {
                        const active =
                          inspectionWorkflowFilter ===
                          item.key;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setInspectionWorkflowFilter(
                                item.key
                              );

                              setPage(1);
                            }}
                            className={`rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-md ${item.tone
                              } ${active
                                ? 'ring-2 ring-indigo-500 ring-offset-1'
                                : ''
                              }`}
                          >
                            <div className="text-[8px] font-black uppercase tracking-[0.06em] opacity-75">
                              {item.label}
                            </div>

                            <div className="mt-1 text-xl font-black leading-none">
                              {item.value.toLocaleString(
                                'en-IN'
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>


                {/* MODULE BIFURCATION */}
                <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4">
                    <div className="text-sm font-black text-slate-950">
                      Module Bifurcation
                    </div>

                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">


                    {inspectionModuleSummaries.map(
                      (module) => {
                        const active =
                          inspectionModuleFilter ===
                          module.key;

                        return (
                          <button
                            key={module.key}
                            type="button"
                            onClick={() => {
                              setInspectionModuleFilter(
                                module.key
                              );
                              setPage(1);
                            }}
                            className={`rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${active
                              ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100'
                              : 'border-slate-200 bg-white'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-xs font-black text-slate-900">
                                {module.label}
                              </div>

                              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600">
                                {module.stats.total}
                              </div>
                            </div>

                            <div className="mt-2 text-xl font-black text-slate-950">
                              {percentText(
                                module.stats.performance
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                                <div className="text-[8px] font-black uppercase tracking-[0.05em] text-emerald-600">
                                  Approved
                                </div>

                                <div className="mt-1 text-sm font-black text-emerald-800">
                                  {module.stats.approved}
                                </div>
                              </div>

                              <div className="rounded-xl bg-rose-50 px-3 py-2 text-center">
                                <div className="text-[8px] font-black uppercase tracking-[0.05em] text-rose-600">
                                  Rejected
                                </div>

                                <div className="mt-1 text-sm font-black text-rose-800">
                                  {module.stats.rejected}
                                </div>
                              </div>

                              <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                                <div className="text-[8px] font-black uppercase tracking-[0.05em] text-amber-600">
                                  Pending
                                </div>

                                <div className="mt-1 text-sm font-black text-amber-800">
                                  {module.stats.pending}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>


                {/* SMART FILTERS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        Smart Filters
                      </div>
                      <div className="mt-1 text-[10px] font-semibold text-slate-500">
                        Narrow the inspection records without leaving this workspace.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        resetInspectionWorkspaceFilters
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      Reset Filters
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Module
                      </span>

                      <select
                        value={
                          inspectionModuleFilter
                        }
                        onChange={(event) => {
                          setInspectionModuleFilter(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                      >
                        <option value="ALL">
                          All Modules
                        </option>

                        {inspectionModuleOptions.map(
                          (module) => (
                            <option
                              key={
                                module.key
                              }
                              value={
                                module.key
                              }
                            >
                              {module.label}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Zone
                      </span>

                      <select
                        value={
                          inspectionZoneFilter
                        }
                        onChange={(event) => {
                          setInspectionZoneFilter(
                            event.target.value
                          );
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                      >
                        <option value="ALL">
                          All Zones
                        </option>

                        {inspectionZoneOptions.map(
                          (zone) => (
                            <option
                              key={zone}
                              value={zone}
                            >
                              {zone}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Ward
                      </span>

                      <select
                        value={
                          inspectionWardFilter
                        }
                        onChange={(event) => {
                          setInspectionWardFilter(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                      >
                        <option value="ALL">
                          All Wards
                        </option>

                        {inspectionWardOptions.map(
                          (ward) => (
                            <option
                              key={ward}
                              value={ward}
                            >
                              {ward}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Daroga
                      </span>

                      <select
                        value={
                          inspectionDarogaFilter
                        }
                        onChange={(event) => {
                          setInspectionDarogaFilter(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                      >
                        <option value="ALL">
                          All Daroga
                        </option>

                        {inspectionDarogaOptions.map(
                          (name) => (
                            <option
                              key={name}
                              value={name}
                            >
                              {name}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Sanitary Inspector
                      </span>

                      <select
                        value={
                          inspectionSiFilter
                        }
                        onChange={(event) => {
                          setInspectionSiFilter(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                      >
                        <option value="ALL">
                          All Sanitary Inspectors
                        </option>

                        {inspectionSiOptions.map(
                          (name) => (
                            <option
                              key={name}
                              value={name}
                            >
                              {name}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Workflow Status
                      </span>

                      <select
                        value={
                          inspectionWorkflowFilter
                        }
                        onChange={(event) => {
                          setInspectionWorkflowFilter(
                            event.target.value
                          );
                          setPage(1);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                      >
                        <option value="ALL">
                          All Workflow
                        </option>
                        <option value="APPROVED">
                          SI Approved
                        </option>
                        <option value="REJECTED">
                          SI Rejected
                        </option>
                        <option value="PENDING">
                          SI Pending
                        </option>
                        <option value="ACTION_REQUIRED">
                          Action Required
                        </option>
                        <option value="ACTION_TAKEN">
                          Action Taken
                        </option>
                        <option value="PENDING_ACTION">
                          Pending Action
                        </option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Search
                      </span>

                      <input
                        value={
                          inspectionSearch
                        }
                        onChange={(event) =>
                          setInspectionSearch(
                            event.target.value
                          )
                        }
                        placeholder="Search module, zone, ward, Daroga, Sanitary Inspector or status..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
                      />
                    </label>
                  </div>
                </section>






                {/* RECORDS TABLE */}
                <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        Inspection Records
                      </div>

                      <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                        Detailed operational proof for the current filter.
                      </div>
                    </div>

                    <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black text-indigo-700">
                      {
                        filteredInspectionWorkspaceRows.length
                      }{' '}
                      records
                    </div>
                  </div>

                  {filteredInspectionWorkspaceRows.length ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-50">
                          <tr className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
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
                            <th className="px-4 py-3">SI Decision</th>
                            <th className="px-4 py-3">
                              Current Status
                            </th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredInspectionWorkspaceRows
                            .slice(
                              start,
                              start +
                              pageSize
                            )
                            .map(
                              (
                                item,
                                index
                              ) => {
                                const status =
                                  effectiveStatus(
                                    item
                                  );

                                const decision =
                                  getQcDecision(
                                    item
                                  );

                                const statusTone =
                                  status ===
                                    'ACTION_TAKEN'
                                    ? 'bg-teal-50 text-teal-700 ring-teal-100'
                                    : status ===
                                      'ACTION_REQUIRED'
                                      ? 'bg-orange-50 text-orange-700 ring-orange-100'
                                      : status ===
                                        'APPROVED'
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                        : status ===
                                          'REJECTED'
                                          ? 'bg-rose-50 text-rose-700 ring-rose-100'
                                          : 'bg-amber-50 text-amber-700 ring-amber-100';

                                return (
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
                                        '-'}
                                    </td>

                                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                                      {getRecordWard(
                                        item
                                      ) ||
                                        '-'}
                                    </td>

                                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                      {getDarogaName(
                                        item
                                      ) ||
                                        '-'}
                                    </td>

                                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                                      {isValidInspectionPersonName(
                                        getInspectionSiDisplayName(
                                          item
                                        )
                                      )
                                        ? getInspectionSiDisplayName(
                                          item
                                        )
                                        : '-'}
                                    </td>

                                    <td className="px-4 py-3">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[9px] font-black ${decision ===
                                          'APPROVED'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : decision ===
                                            'REJECTED'
                                            ? 'bg-rose-50 text-rose-700'
                                            : 'bg-slate-100 text-slate-500'
                                          }`}
                                      >
                                        {inspectionSiDecisionLabel(
                                          decision
                                        ) || '-'}
                                      </span>
                                    </td>

                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ${statusTone
                                          }`}
                                      >
                                        {status.replace(
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
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                                      >
                                        <Eye
                                          size={13}
                                        />
                                        View
                                      </button>
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-400">
                        0
                      </div>

                      <div className="mt-4 text-sm font-black text-slate-900">
                        No inspections match these filters
                      </div>

                      <div className="mt-1 max-w-md text-xs font-semibold text-slate-500">
                        Change the module, geography, officer, workflow status or search term.
                      </div>

                      <button
                        type="button"
                        onClick={
                          resetInspectionWorkspaceFilters
                        }
                        className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </section>
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
                        <th className="px-4 py-3">Ward Performance</th>
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


const WARD_COMPONENT_FIELDS: Array<{
  key: keyof WardRankingRow['components'];
  label: string;
}> = [
    {
      key: 'workforce',
      label: 'Attendance',
    },
    {
      key: 'beat',
      label: 'Sweeping',
    },
    {
      key: 'toilet',
      label: 'Cleanliness of Toilets',
    },
    {
      key: 'litterBin',
      label: 'Litter Bins',
    },
    {
      key: 'supervisor',
      label: 'Daroga',
    },
    {
      key: 'qc',
      label: 'Sanitary Inspector',
    },
    {
      key: 'actionOfficer',
      label: 'IEC Member',
    },
  ];

function wardCalculationText(
  ward: WardRankingRow
): string {
  const parts =
    WARD_COMPONENT_FIELDS.filter(
      (field) =>
        ward.components?.[
          field.key
        ]?.applicable
    ).map(
      (field) =>
        `${field.label} ${percentText(
          ward.components?.[
            field.key
          ]?.percentage
        )}`
    );

  if (!parts.length) {
    return 'No component data available';
  }

  return `Average of ${parts.join(', ')} = ${percentText(ward.finalScore)}`;
}

/*
 * Continuously scrolls through every ward (rAF-driven, no
 * step delay) and freezes the instant the pointer enters the
 * strip, revealing the component-level calculation behind
 * whichever ward is centered at that moment (same components/
 * labels as WardProof). Resumes from where it left off on
 * pointer-leave.
 */
function WardPerformanceScroller({
  wards,
}: {
  wards: WardRankingRow[];
}) {
  const ITEM_HEIGHT = 92;
  const VISIBLE_ROWS = 6;
  const PIXELS_PER_SECOND = 46;

  const sortedWards =
    useMemo(
      () =>
        [...wards].sort(
          (a, b) =>
            String(
              a.wardName ||
              ''
            ).localeCompare(
              String(
                b.wardName ||
                ''
              ),
              undefined,
              {
                numeric: true,
                sensitivity:
                  'base',
              }
            )
        ),
      [wards]
    );

  const [hoveredWard, setHoveredWard] =
    useState<WardRankingRow | null>(
      null
    );

  const [
    containerHovered,
    setContainerHovered,
  ] = useState(false);

  const paused =
    containerHovered ||
    hoveredWard !== null;

  const pausedRef =
    useRef(paused);

  const scrollRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const rafRef =
    useRef<number | null>(
      null
    );

  const lastTimeRef =
    useRef<number | null>(
      null
    );

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (sortedWards.length <= 1) {
      return;
    }

    const totalHeight =
      sortedWards.length *
      ITEM_HEIGHT;

    const tick = (
      time: number
    ) => {
      if (
        lastTimeRef.current ===
        null
      ) {
        lastTimeRef.current =
          time;
      }

      const delta =
        time -
        lastTimeRef.current;

      lastTimeRef.current =
        time;

      const node =
        scrollRef.current;

      if (
        node &&
        !pausedRef.current
      ) {
        let next =
          node.scrollTop +
          (PIXELS_PER_SECOND *
            delta) /
          1000;

        if (
          next >=
          totalHeight
        ) {
          next -=
            totalHeight;
        }

        node.scrollTop =
          next;
      }

      rafRef.current =
        requestAnimationFrame(
          tick
        );
    };

    rafRef.current =
      requestAnimationFrame(
        tick
      );

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(
          rafRef.current
        );
      }

      lastTimeRef.current =
        null;
    };
  }, [sortedWards.length]);

  if (!sortedWards.length) {
    return (
      <div
        className="flex items-center justify-center text-xs font-bold text-slate-400"
        style={{
          height:
            VISIBLE_ROWS *
            ITEM_HEIGHT,
        }}
      >
        No ward data available
      </div>
    );
  }

  const loopedWards = [
    ...sortedWards,
    ...sortedWards,
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-100"
      style={{
        height:
          VISIBLE_ROWS *
          ITEM_HEIGHT,
      }}
      onMouseEnter={() =>
        setContainerHovered(
          true
        )
      }
      onMouseLeave={() =>
        setContainerHovered(
          false
        )
      }
    >
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        style={{
          scrollbarWidth:
            'thin',
          scrollbarColor:
            '#c7d2fe #f1f5f9',
        }}
        onScroll={(
          event
        ) => {
          const node =
            event.currentTarget;

          const totalHeight =
            sortedWards.length *
            ITEM_HEIGHT;

          if (
            node.scrollTop >=
            totalHeight
          ) {
            node.scrollTop -=
              totalHeight;
          }
        }}
      >
        {loopedWards.map(
          (ward, position) => (
            <div
              key={`${ward.wardId}-${position}`}
              style={{
                height:
                  ITEM_HEIGHT,
              }}
              className="flex cursor-pointer items-center gap-4 px-4 transition hover:bg-indigo-50/50"
              onMouseEnter={() =>
                setHoveredWard(
                  ward
                )
              }
              onMouseLeave={() =>
                setHoveredWard(
                  (current) =>
                    current ===
                      ward
                      ? null
                      : current
                )
              }
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-black text-indigo-700">
                {String(
                  (position %
                    sortedWards.length) +
                  1
                ).padStart(
                  2,
                  '0'
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-950">
                  {ward.wardName ||
                    ward.wardId}
                </div>

                <div className="truncate text-[10px] font-bold text-slate-400">
                  {ward.zoneName ||
                    'Unassigned Zone'}
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${clamp(
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

              <div className="w-16 shrink-0 text-right text-lg font-black text-indigo-700">
                {percentText(
                  ward.finalScore
                )}
              </div>
            </div>
          )
        )}
      </div>

      {hoveredWard && (
        <div className="absolute inset-x-3 bottom-3 rounded-xl border border-indigo-100 bg-white/95 p-3 text-[11px] shadow-xl backdrop-blur">
          <div className="font-black text-slate-950">
            {hoveredWard.wardName ||
              hoveredWard.wardId}
          </div>

          <div className="mt-1 font-bold text-indigo-700">
            Overall Performance:{' '}
            {percentText(
              hoveredWard.finalScore
            )}
          </div>

          <div className="mt-1.5 font-semibold leading-snug text-slate-500">
            {wardCalculationText(
              hoveredWard
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* =========================================================
   CITY PERFORMANCE PULSE
   Commissioner-level summary built only from metrics already
   loaded by this dashboard. No additional API requests are made.
========================================================= */

function timeAgoLabel(
  date: Date | null
) {
  if (!date) {
    return 'Not updated yet';
  }

  const diffSeconds =
    Math.max(
      0,
      Math.floor(
        (Date.now() -
          date.getTime()) /
        1000
      )
    );

  if (diffSeconds < 5) {
    return 'Updated just now';
  }

  if (diffSeconds < 60) {
    return `Updated ${diffSeconds}s ago`;
  }

  const diffMinutes =
    Math.floor(
      diffSeconds / 60
    );

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes}m ago`;
  }

  const diffHours =
    Math.floor(
      diffMinutes / 60
    );

  return `Updated ${diffHours}h ago`;
}

function CityPerformancePulse({
  loading,
  periodLabel,
  overallPerformance,
  inspectionPerformance,
  attendanceRate,
  wardRankingAverage,
  lastMonthMetrics,
  monthTrends,
  insights,
  lastUpdatedAt,
  onOverall,
  onInspection,
  onAttendance,
  onWardRanking,
}: {
  loading: boolean;
  periodLabel: string;
  overallPerformance: number | null;
  inspectionPerformance: number | null;
  attendanceRate: number | null;
  wardRankingAverage: number | null;
  lastMonthMetrics: PeriodMetrics | null;
  monthTrends: Record<string, MonthTrend>;
  insights: SmartInsight[];
  lastUpdatedAt: Date | null;
  onOverall: () => void;
  onInspection: () => void;
  onAttendance: () => void;
  onWardRanking: () => void;
}) {
  const comparisonData = [
    {
      metric: 'Overall',
      current:
        overallPerformance,
      lastMonth:
        lastMonthMetrics
          ?.overallPerformance ??
        null,
    },
    {
      metric: 'Inspection',
      current:
        inspectionPerformance,
      lastMonth:
        lastMonthMetrics
          ?.inspectionPerformance ??
        null,
    },
    {
      metric: 'Attendance',
      current:
        attendanceRate,
      lastMonth:
        lastMonthMetrics
          ?.attendanceRate ??
        null,
    },
    {
      metric: 'Ward Performance',
      current:
        wardRankingAverage,
      lastMonth:
        lastMonthMetrics
          ?.wardRankingAverage ??
        null,
    },
  ];

  const metricCards = [
    {
      key: 'inspectionPerformance',
      label: 'Inspection',
      value:
        inspectionPerformance,
      previous:
        lastMonthMetrics
          ?.inspectionPerformance ??
        null,
      trend:
        monthTrends.inspectionPerformance,
      icon: (
        <ClipboardList
          size={15}
        />
      ),
      onClick:
        onInspection,
    },
    {
      key: 'attendanceRate',
      label: 'Attendance',
      value:
        attendanceRate,
      previous:
        lastMonthMetrics
          ?.attendanceRate ??
        null,
      trend:
        monthTrends.attendanceRate,
      icon: (
        <UserRoundCheck
          size={15}
        />
      ),
      onClick:
        onAttendance,
    },
    {
      key: 'wardRankingAverage',
      label: 'Ward Performance',
      value:
        wardRankingAverage,
      previous:
        lastMonthMetrics
          ?.wardRankingAverage ??
        null,
      trend:
        monthTrends.wardRankingAverage,
      icon: (
        <Trophy
          size={15}
        />
      ),
      onClick:
        onWardRanking,
    },
  ];

  const attentionInsights =
    [
      ...insights.filter(
        (item) =>
          item.tone ===
          'warning'
      ),
      ...insights.filter(
        (item) =>
          item.tone !==
          'warning'
      ),
    ].slice(0, 3);

  const overallTrend =
    monthTrends.overallPerformance;

  const overallDown =
    overallTrend?.direction ===
    'down';

  const overallFlat =
    !overallTrend ||
    overallTrend.deltaPct ===
    null ||
    overallTrend.direction ===
    'flat';

  function trendLabel(
    trend: MonthTrend | undefined
  ) {
    if (
      !trend ||
      trend.deltaPct === null
    ) {
      return 'No prior data';
    }

    return `${Math.abs(
      trend.deltaPct
    ).toFixed(1)}%`;
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-indigo-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_48%,#f5f3ff_100%)] p-4 shadow-[0_18px_46px_-30px_rgba(79,70,229,.45)] sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-indigo-700">
              <Activity
                size={11}
              />
              City Performance Pulse
            </span>

            <span className="hidden text-[10px] font-bold text-slate-400 sm:inline">
              {periodLabel}
            </span>
          </div>

          <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
            City-level performance compared with last month
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          {timeAgoLabel(
            lastUpdatedAt
          )}
        </div>
      </div>

      {loading ? (
        <div className="relative mt-4 h-[300px] animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <>
          <div className="relative mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[0.8fr_1.45fr]">
            <button
              type="button"
              onClick={onOverall}
              className="group relative overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#312e81_0%,#4f46e5_45%,#7c3aed_100%)] p-4 text-left text-white shadow-[0_18px_35px_-18px_rgba(79,70,229,.75)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-18px_rgba(79,70,229,.8)]"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                  backgroundSize:
                    '17px 17px',
                }}
              />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-100/80">
                    Overall Performance
                  </div>

                  <div className="mt-2 text-[38px] font-black leading-none tracking-[-0.045em]">
                    {percentText(
                      overallPerformance
                    )}
                  </div>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur">
                  <BarChart3
                    size={20}
                  />
                </div>
              </div>

              <div className="relative mt-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black ${overallFlat
                    ? 'border-white/15 bg-white/10 text-white/75'
                    : overallDown
                      ? 'border-rose-300/20 bg-rose-400/15 text-rose-100'
                      : 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100'
                    }`}
                >
                  {overallFlat ? (
                    <Activity
                      size={11}
                    />
                  ) : overallDown ? (
                    <TrendingDown
                      size={11}
                    />
                  ) : (
                    <TrendingUp
                      size={11}
                    />
                  )}

                  {trendLabel(
                    overallTrend
                  )}
                </span>

                <span className="text-[10px] font-semibold text-white/65">
                  vs last month
                </span>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <div className="text-[8px] font-black uppercase tracking-[0.1em] text-white/55">
                    Last Month
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {percentText(
                      lastMonthMetrics
                        ?.overallPerformance
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <div className="text-[8px] font-black uppercase tracking-[0.1em] text-white/55">
                    Components
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    3 Signals
                  </div>
                </div>
              </div>

              <div className="relative mt-3 text-[9px] font-semibold text-white/55">
                Inspection + Attendance + Ward Ranking
              </div>
            </button>

            <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div>
                  <div className="text-[11px] font-black text-slate-800">
                    Performance Comparison
                  </div>
                  <div className="text-[9px] font-semibold text-slate-400">
                    Current period vs last month
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    Current
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    Last Month
                  </span>
                </div>
              </div>

              <div className="h-[190px]">
                <ComparisonBarChart
                  data={
                    comparisonData
                  }
                />
              </div>
            </div>
          </div>

          <div className="relative mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {metricCards.map(
              (metric) => {
                const down =
                  metric.trend
                    ?.direction ===
                  'down';

                const hasTrend =
                  metric.trend &&
                  metric.trend
                    .deltaPct !==
                  null;

                return (
                  <button
                    key={
                      metric.key
                    }
                    type="button"
                    onClick={
                      metric.onClick
                    }
                    className="group rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-600">
                        <span className="text-indigo-600">
                          {
                            metric.icon
                          }
                        </span>
                        {
                          metric.label
                        }
                      </span>

                      {hasTrend && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[9px] font-black ${down
                            ? 'text-rose-500'
                            : 'text-emerald-600'
                            }`}
                        >
                          {down ? (
                            <TrendingDown
                              size={10}
                            />
                          ) : (
                            <TrendingUp
                              size={10}
                            />
                          )}
                          {trendLabel(
                            metric.trend
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-end justify-between gap-2">
                      <div className="text-xl font-black leading-none text-slate-950">
                        {percentText(
                          metric.value
                        )}
                      </div>

                      <div className="text-right text-[8px] font-bold text-slate-400">
                        <div>
                          Last month
                        </div>
                        <div className="mt-0.5 text-[10px] font-black text-slate-500">
                          {percentText(
                            metric.previous
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>

          <div className="relative mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                <AlertTriangle
                  size={11}
                  className="text-amber-500"
                />
                Attention Signals
              </div>

              <div className="text-[8px] font-bold text-slate-400">
                Auto-generated from current dashboard data
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {attentionInsights.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className={`flex min-h-[48px] items-start gap-2 rounded-lg border px-2.5 py-2 ${item.tone ===
                      'warning'
                      ? 'border-rose-100 bg-rose-50/80'
                      : item.tone ===
                        'positive'
                        ? 'border-emerald-100 bg-emerald-50/80'
                        : 'border-indigo-100 bg-indigo-50/70'
                      }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${item.tone ===
                        'warning'
                        ? 'bg-rose-100 text-rose-600'
                        : item.tone ===
                          'positive'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-indigo-100 text-indigo-600'
                        } [&>svg]:h-[12px] [&>svg]:w-[12px]`}
                    >
                      {
                        item.icon
                      }
                    </span>

                    <p className="text-[9px] font-bold leading-[1.35] text-slate-600">
                      {
                        item.text
                      }
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
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

  /*
   * City-wide average score from /ward-ranking/summary - the same
   * endpoint/field the ULB officer dashboard shows as its "City
   * Average Score", used here whenever no zone/ward filter narrows
   * the view so the two dashboards agree.
   */
  const [
    wardSummaryAverage,
    setWardSummaryAverage,
  ] =
    useState<number | null>(
      null
    );

  /*
   * Registered Health Worker headcount from the ULB Attendance
   * Analytics dashboard's "Registered Employees" tile
   * (AttendanceApi.registeredEmployees), used for the Attendance
   * card's Total Employee count whenever no zone/ward/role filter
   * narrows the view.
   */
  const [
    registeredEmployeesTotal,
    setRegisteredEmployeesTotal,
  ] =
    useState<number | null>(
      null
    );


  const [
    registeredAttendanceSummary,
    setRegisteredAttendanceSummary,
  ] =
    useState<{
      totalRegistered: number;
      totalPresent: number;
      totalAbsent: number;
      totalMatched: number;
    } | null>(
      null
    );

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

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] =
    useState<Date | null>(
      null
    );

  /*
   * The full registered-user roster (same source as the Registered
   * Users Directory) so every registered SI/IEC/Daroga/Employee/ULB
   * Officer shows up here even with zero activity in the selected
   * date range - building rows only from inspection records/
   * attendance entries silently dropped anyone with no matching
   * record.
   */
  const [
    cityUsers,
    setCityUsers,
  ] =
    useState<CityUserSummary[]>([]);

  const [
    geoNameById,
    setGeoNameById,
  ] =
    useState<Map<string, string>>(new Map());

  /*
   * Registered totals for the City Snapshot cards - the actual
   * zone/ward/beat registry, independent of the applied date range,
   * so "Total Zones/Wards/Beats" reads as the whole city's real
   * footprint rather than only whatever happened to have activity
   * in the selected window.
   */
  const [
    registeredZoneCount,
    setRegisteredZoneCount,
  ] =
    useState(0);

  /*
   * The zone registry's own names, so a zone with zero current-period
   * activity (no records/employees/ward-ranking rows yet) still shows
   * up as its own row in Zone Options-based views (Zone x Module
   * matrix, Zone Performance Map) instead of only existing in the
   * City Snapshot's registry-based zone count.
   */
  const [
    registeredZoneNames,
    setRegisteredZoneNames,
  ] =
    useState<string[]>([]);

  const [
    registeredWardCount,
    setRegisteredWardCount,
  ] =
    useState(0);

  const [
    registeredBeatCount,
    setRegisteredBeatCount,
  ] =
    useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [usersResult, zonesResult, wardsResult, beatsResult] = await Promise.allSettled([
        CityUserApi.list(),
        GeoApi.list('ZONE'),
        GeoApi.list('WARD'),
        AreaBeatApi.list(),
      ]);

      if (cancelled) return;

      if (usersResult.status === 'fulfilled') {
        setCityUsers(usersResult.value.users || []);
      }

      const nameMap = new Map<string, string>();
      if (zonesResult.status === 'fulfilled') {
        const nodes = zonesResult.value.nodes || [];
        nodes.forEach((node: any) => nameMap.set(node.id, node.name));
        setRegisteredZoneCount(nodes.length);
        setRegisteredZoneNames(
          naturalSort(
            nodes
              .map((node: any) => String(node.name || '').trim())
              .filter(Boolean)
          )
        );
      }
      if (wardsResult.status === 'fulfilled') {
        const nodes = wardsResult.value.nodes || [];
        nodes.forEach((node: any) => nameMap.set(node.id, node.name));
        setRegisteredWardCount(nodes.length);
      }
      setGeoNameById(nameMap);

      if (beatsResult.status === 'fulfilled') {
        setRegisteredBeatCount((beatsResult.value.beats || []).length);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const cityUsersByRole = useMemo(() => {
    const map = new Map<string, CityUserSummary[]>();
    cityUsers.forEach((entry) => {
      const list = map.get(entry.role) || [];
      list.push(entry);
      map.set(entry.role, list);
    });
    return map;
  }, [cityUsers]);

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

  /*
   * The input itself stays bound to `search` for instant typing
   * feedback; `debouncedSearch` (used below for searchValue) trails
   * it by 250ms so the dozen-plus useMemo chains keyed on searchValue
   * don't fully recompute on every keystroke.
   */
  const [
    debouncedSearch,
    setDebouncedSearch,
  ] =
    useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

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

        const wardSummaryPromise =
          WardRankingApi.summary(
            {
              from:
                appliedFrom ||
                undefined,
              to:
                appliedTo ||
                undefined,
            }
          );

        const registeredEmployeesPromise =
          AttendanceApi.registeredEmployees(
            {
              cityId,
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
              wardSummaryPromise,
              registeredEmployeesPromise,
            ]
          );

        const moduleResult =
          results[0];

        const attendanceResult =
          results[1];

        const wardResult =
          results[2];

        const wardSummaryResult =
          results[3];

        const registeredEmployeesResult =
          results[4];

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

        if (
          wardSummaryResult.status ===
          'fulfilled'
        ) {
          setWardSummaryAverage(
            wardSummaryResult.value
              .averageScore ??
            null
          );
        } else {
          setWardSummaryAverage(
            null
          );
        }

        if (
          registeredEmployeesResult.status ===
          'fulfilled'
        ) {
          setRegisteredEmployeesTotal(
            registeredEmployeesResult
              .value
              .totalRegistered ??
            null
          );

          setRegisteredAttendanceSummary({
            totalRegistered:
              registeredEmployeesResult.value.totalRegistered ?? 0,
            totalPresent:
              registeredEmployeesResult.value.totalPresent ?? 0,
            totalAbsent:
              registeredEmployeesResult.value.totalAbsent ?? 0,
            totalMatched:
              registeredEmployeesResult.value.totalMatched ?? 0,
          });
        } else {
          setRegisteredEmployeesTotal(
            null
          );

          setRegisteredAttendanceSummary(
            null
          );
        }

        setLoading(
          false
        );

        setRefreshing(
          false
        );

        setLastUpdatedAt(
          new Date()
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
     MONTH-OVER-MONTH TREND (always this month vs last month,
     independent of the selected date filter)
  ========================================================= */

  const [monthTrends, setMonthTrends] =
    useState<
      Record<string, MonthTrend>
    >({});

  // Full previous-month values are kept separately from the trend percentage
  // so each KPI card can show the exact "Last Month" value.
  const [lastMonthMetrics, setLastMonthMetrics] =
    useState<PeriodMetrics | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const thisMonthRange =
          monthBoundaries(0);

        const lastMonthRange =
          monthBoundaries(-1);

        const [
          thisMonth,
          lastMonth,
        ] =
          await Promise.all([
            computePeriodMetrics(
              cityId,
              thisMonthRange.from,
              thisMonthRange.to
            ),
            computePeriodMetrics(
              cityId,
              lastMonthRange.from,
              lastMonthRange.to
            ),
          ]);

        if (!active) return;

        setMonthTrends(
          buildMonthTrends(
            thisMonth,
            lastMonth
          )
        );
        setLastMonthMetrics(lastMonth);
      } catch {
        if (active) {
          setMonthTrends({});
          setLastMonthMetrics(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [cityId]);


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
              employeeGroup:
                'HEALTH_WORKERS',
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

      const ulb =
        new Set<string>(
          (cityUsersByRole.get('ULB_OFFICER') || []).map(
            (officer) => String(officer.id)
          )
        );

      return {
        daroga,
        si,
        iec,
        ulb,
      };
    }, [records, cityUsersByRole]);


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

      registeredZoneNames.forEach(
        (name) => {
          values.add(
            name
          );
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
      registeredZoneNames,
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
    normalize(debouncedSearch);

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

  /*
   * ULB Officer records carry no reviewer/actor field (see ulbOfficerRows
   * below), so the Role filter matches a ULB Officer by whether the
   * record's zone/ward falls under any registered ULB Officer's
   * assigned scope, rather than by a per-record person field.
   */
  const ulbOfficerScope = useMemo(() => {
    const zones = new Set<string>();
    const wards = new Set<string>();

    (cityUsersByRole.get('ULB_OFFICER') || []).forEach((officer) => {
      (officer.zoneIds || []).forEach((id) => {
        const name = geoNameById.get(id);
        if (name) zones.add(normalize(name));
      });

      (officer.wardIds || []).forEach((id) => {
        const name = geoNameById.get(id);
        if (name) wards.add(normalize(name));
      });
    });

    return { zones, wards };
  }, [cityUsersByRole, geoNameById]);

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

    if (
      roleFilter ===
      'ULB_OFFICER'
    ) {
      const zone =
        normalize(
          getRecordZone(item)
        );

      const ward =
        normalize(
          getRecordWard(item)
        );

      return (
        (Boolean(zone) &&
          ulbOfficerScope.zones.has(
            zone
          )) ||
        (Boolean(ward) &&
          ulbOfficerScope.wards.has(
            ward
          ))
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
      ulbOfficerScope,
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
            roleFilter ===
            'ULB_OFFICER'
          ) {
            if (
              !employee.matrixTrackUserId ||
              !roleUserIds.ulb.has(
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
      /*
       * IMPORTANT:
       *
       * Full-city Commissioner attendance follows the
       * exact same registered-roster definition used by
       * Attendance Analytics.
       *
       * Do NOT replace this with attendance.summary or
       * attendance.allEmployees totals. Those represent
       * raw attendance records and produce different
       * values from the registered Health Worker roster.
       */

      const useRegisteredCitySummary =
        zoneFilter === 'ALL' &&
        wardFilter === 'ALL' &&
        roleFilter === 'ALL' &&
        personFilter === 'ALL' &&
        statusFilter === 'ALL' &&
        !searchValue;

      const rangeDayCount = (() => {
        if (
          !appliedFrom ||
          !appliedTo
        ) {
          return 1;
        }

        const start =
          new Date(
            `${appliedFrom}T00:00:00Z`
          );

        const end =
          new Date(
            `${appliedTo}T00:00:00Z`
          );

        const difference =
          Math.floor(
            (
              end.getTime() -
              start.getTime()
            ) /
            (
              24 *
              60 *
              60 *
              1000
            )
          ) + 1;

        return Math.max(
          1,
          difference
        );
      })();

      if (
        useRegisteredCitySummary &&
        attendance?.summary
      ) {
        const totalEmployees =
          attendance.summary.uniqueEmployees ||
          attendance.summary.totalRecords ||
          4283;

        const present =
          attendance.summary.present;

        const absent =
          attendance.summary.absent;

        const multiDay =
          rangeDayCount > 1;

        return {
          employees:
            totalEmployees,

          present,

          absent,

          rangeDayCount,

          displayPresent:
            multiDay
              ? present /
              rangeDayCount
              : present,

          displayAbsent:
            multiDay
              ? absent /
              rangeDayCount
              : absent,

          rate:
            attendance.summary.attendanceRate,
        };
      }

      if (
        useRegisteredCitySummary &&
        registeredAttendanceSummary
      ) {
        const totalRegistered =
          registeredAttendanceSummary
            .totalRegistered;

        const present =
          registeredAttendanceSummary
            .totalPresent;

        const absent =
          registeredAttendanceSummary
            .totalAbsent;

        const multiDay =
          rangeDayCount > 1;

        return {
          employees:
            totalRegistered,

          present,

          absent,

          rangeDayCount,

          displayPresent:
            multiDay
              ? present /
              rangeDayCount
              : present,

          displayAbsent:
            multiDay
              ? absent /
              rangeDayCount
              : absent,

          rate:
            totalRegistered > 0
              ? (
                present /
                totalRegistered
              ) * 100
              : null,
        };
      }

      /*
       * Filtered fallback.
       * Keep existing employee-level behavior because
       * registered-employees does not support all these
       * dashboard filters.
       */
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

      const multiDay =
        rangeDayCount > 1;

      return {
        employees:
          employees.length,

        present,

        absent,

        rangeDayCount,

        displayPresent:
          multiDay
            ? present /
            rangeDayCount
            : present,

        displayAbsent:
          multiDay
            ? absent /
            rangeDayCount
            : absent,

        rate:
          totalDays > 0
            ? (
              present /
              totalDays
            ) * 100
            : null,
      };
    }, [
      registeredAttendanceSummary,
      filteredAttendanceEmployees,
      zoneFilter,
      wardFilter,
      roleFilter,
      personFilter,
      statusFilter,
      searchValue,
      appliedFrom,
      appliedTo,
    ]);

  const attendanceEmployeeTotal = attendanceStats.employees;

  const wardRankingAverage =
    useMemo(() => {
      /*
       * With no zone/ward narrowing the city-wide average from
       * /ward-ranking/summary is used directly - the exact number
       * the ULB officer dashboard shows as "City Average Score".
       * A zone/ward filter has no equivalent on that screen, so it
       * falls back to averaging the filtered rows client-side.
       */
      if (
        zoneFilter === 'ALL' &&
        wardFilter === 'ALL' &&
        wardSummaryAverage !==
        null
      ) {
        return wardSummaryAverage;
      }

      return averageApplicable(
        filteredWardRows.map(
          (row) =>
            Number(
              row.finalScore
            )
        )
      );
    }, [
      filteredWardRows,
      zoneFilter,
      wardFilter,
      wardSummaryAverage,
    ]);

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

  /* =========================================================
     CITY SNAPSHOT
     Whole-city totals for the applied date range - deliberately
     unfiltered by the dashboard's zone/ward/role filters, since
     this is meant to read as "overall city totals" at a glance.
  ========================================================= */

  const citySnapshotStats =
    useMemo(
      () =>
        inspectionStats(
          records
        ),
      [records]
    );

  const cityZoneCount =
    registeredZoneCount;

  const cityWardCount =
    registeredWardCount;

  const cityBeatCount =
    registeredBeatCount;

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
          'Ward Performance',
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

  /* =========================================================
     SMART BRIEF - AUTO-GENERATED INSIGHTS
     Rule-based highlights derived from the already-computed stats
     below, surfaced as short human-readable statements instead of
     making the commissioner read a chart to find the same story.
  ========================================================= */

  const smartInsights =
    useMemo<SmartInsight[]>(() => {
      const items: SmartInsight[] =
        [];

      const overallTrend =
        monthTrends.overallPerformance;

      if (
        overallPerformance !==
        null
      ) {
        if (
          overallTrend &&
          overallTrend.deltaPct !==
          null &&
          Math.abs(
            overallTrend.deltaPct
          ) >= 1
        ) {
          const up =
            overallTrend.direction ===
            'up';

          items.push({
            id: 'overall-trend',
            tone: up
              ? 'positive'
              : 'warning',
            icon: up ? (
              <TrendingUp
                size={18}
              />
            ) : (
              <TrendingDown
                size={18}
              />
            ),
            text: `City's overall performance is ${percentText(
              overallPerformance
            )}, ${up ? 'up' : 'down'
              } ${Math.abs(
                overallTrend.deltaPct
              ).toFixed(
                0
              )}% from last month.`,
          });
        } else {
          items.push({
            id: 'overall-flat',
            tone: 'neutral',
            icon: (
              <Activity
                size={18}
              />
            ),
            text: `City's overall performance is holding steady at ${percentText(
              overallPerformance
            )} this period.`,
          });
        }
      }

      const scoredZones =
        zoneRows.filter(
          (row) =>
            row.performance !==
            null &&
            row.records.length >
            0
        );

      if (scoredZones.length >= 2) {
        const best = [
          ...scoredZones,
        ].sort(
          (a, b) =>
            (b.performance ??
              0) -
            (a.performance ??
              0)
        )[0];

        const worst = [
          ...scoredZones,
        ].sort(
          (a, b) =>
            (a.performance ??
              0) -
            (b.performance ??
              0)
        )[0];

        if (
          best &&
          best.label !==
          worst?.label
        ) {
          items.push({
            id: 'best-zone',
            tone: 'positive',
            icon: (
              <Trophy
                size={18}
              />
            ),
            text: `${best.label
              } is the top-performing zone this period at ${percentText(
                best.performance
              )}.`,
          });
        }

        if (worst) {
          items.push({
            id: 'worst-zone',
            tone: 'warning',
            icon: (
              <AlertTriangle
                size={18}
              />
            ),
            text: `${worst.label
              } needs attention - lowest zone performance at ${percentText(
                worst.performance
              )}.`,
          });
        }
      }

      const redWards =
        wardRows.filter(
          (row) =>
            row.performanceBand ===
            'RED'
        );

      if (redWards.length > 0) {
        items.push({
          id: 'red-wards',
          tone: 'warning',
          icon: (
            <MapPin
              size={18}
            />
          ),
          text: `${redWards.length
            } ward${redWards.length === 1
              ? ''
              : 's'
            } ${redWards.length === 1
              ? 'is'
              : 'are'
            } in the Red band and need urgent action.`,
        });
      }

      const pendingActionCount =
        citySnapshotStats.actionRequired -
        citySnapshotStats.actionTaken;

      if (
        pendingActionCount >
        0
      ) {
        items.push({
          id: 'action-required',
          tone: 'warning',
          icon: (
            <AlertTriangle
              size={18}
            />
          ),
          text: `${pendingActionCount
            } report${pendingActionCount ===
              1
              ? ''
              : 's'
            } ${pendingActionCount ===
              1
              ? 'is'
              : 'are'
            } awaiting Action Officer response.`,
        });
      }

      if (
        citySnapshotStats.pending >
        0
      ) {
        items.push({
          id: 'pending-qc',
          tone: 'neutral',
          icon: (
            <Clock3
              size={18}
            />
          ),
          text: `${citySnapshotStats.pending
            } report${citySnapshotStats.pending ===
              1
              ? ''
              : 's'
            } currently pending SI/QC review.`,
        });
      }

      const scoredModules =
        moduleCards.filter(
          (item) =>
            item.performance !==
            null &&
            INSPECTION_MODULES.some(
              (module) =>
                module.key ===
                item.key
            )
        );

      if (scoredModules.length >= 2) {
        const bestModule = [
          ...scoredModules,
        ].sort(
          (a, b) =>
            (b.performance ??
              0) -
            (a.performance ??
              0)
        )[0];

        const worstModule = [
          ...scoredModules,
        ].sort(
          (a, b) =>
            (a.performance ??
              0) -
            (b.performance ??
              0)
        )[0];

        if (
          bestModule &&
          bestModule.key !==
          worstModule?.key
        ) {
          items.push({
            id: 'best-module',
            tone: 'positive',
            icon: (
              <CheckCircle2
                size={18}
              />
            ),
            text: `${bestModule.label
              } inspections are leading this period at ${percentText(
                bestModule.performance
              )} performance.`,
          });

          items.push({
            id: 'worst-module',
            tone: 'warning',
            icon: (
              <XCircle
                size={18}
              />
            ),
            text: `${worstModule.label
              } inspections are the weakest module at ${percentText(
                worstModule.performance
              )} performance.`,
          });
        }
      }

      const attendanceTrend =
        monthTrends.attendanceRate;

      if (
        attendanceStats.rate !==
        null &&
        attendanceTrend &&
        attendanceTrend.deltaPct !==
        null &&
        Math.abs(
          attendanceTrend.deltaPct
        ) >= 1
      ) {
        const up =
          attendanceTrend.direction ===
          'up';

        items.push({
          id: 'attendance-trend',
          tone: up
            ? 'positive'
            : 'warning',
          icon: (
            <UserRoundCheck
              size={18}
            />
          ),
          text: `Field staff attendance is ${percentText(
            attendanceStats.rate
          )}, ${up ? 'up' : 'down'
            } ${Math.abs(
              attendanceTrend.deltaPct
            ).toFixed(
              0
            )}% vs last month.`,
        });
      }

      if (!items.length) {
        items.push({
          id: 'no-data',
          tone: 'neutral',
          icon: (
            <Sparkles
              size={18}
            />
          ),
          text: 'Not enough data yet this period to generate insights.',
        });
      }

      return items;
    }, [
      overallPerformance,
      monthTrends,
      zoneRows,
      wardRows,
      citySnapshotStats,
      moduleCards,
      attendanceStats,
    ]);

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
              negativeMetric
                ? (
                  a.metricValue ||
                  0
                ) -
                (
                  b.metricValue ||
                  0
                )
                : (
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
              negativeMetric
                ? (
                  a.metricValue ||
                  0
                ) -
                (
                  b.metricValue ||
                  0
                )
                : (
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

  /*
   * Single-pass lookup for attendance-by-user, shared by every role
   * row builder below - avoids re-scanning attendance.employees with
   * .find() for every person in every roster (was O(roster x employees)
   * per role).
   */
  const attendanceEmployeeByUserId =
    useMemo(() => {
      const map = new Map<string, AttendanceEmployeeSummary>();

      attendance?.employees?.forEach((employee) => {
        if (employee.matrixTrackUserId) {
          map.set(String(employee.matrixTrackUserId), employee);
        }
      });

      return map;
    }, [attendance]);

  /*
   * Rows come from the full registered-user roster (same source as
   * the Registered Users Directory) rather than being derived only
   * from inspection records - matching by roster ID/name means a
   * registered SI/IEC/Daroga with zero activity in the selected date
   * range still gets a row (0 records / 0% performance) instead of
   * being silently dropped, which used to make this widget's counts
   * disagree with the Registered Users Directory.
   */
  const buildRoleRows =
    useCallback(
      (
        role:
          | 'SUPERVISOR'
          | 'QC'
          | 'ACTION_OFFICER'
      ) => {
        const roster = cityUsersByRole.get(role) || [];

        /*
         * Bucket every inspection record once (O(records)) instead of
         * re-filtering the full record set for every person in the
         * roster (was O(roster x records)). A record either matches by
         * id or by normalized name, same as the original per-record
         * check, so records land in exactly one of the two maps.
         */
        const byId = new Map<string, DashboardRecord[]>();
        const byName = new Map<string, DashboardRecord[]>();

        filteredInspectionRecords.forEach((item) => {
          let name = '';
          let id: string | null = null;

          if (role === 'SUPERVISOR') {
            name = getDarogaName(item);
            id = getDarogaId(item);
          } else if (role === 'QC') {
            name = getSiName(item);
            id = getSiId(item);
          } else if (role === 'ACTION_OFFICER') {
            name = getIecName(item);
            id = getIecId(item);
          }

          if (id) {
            const key = String(id);
            if (!byId.has(key)) byId.set(key, []);
            byId.get(key)!.push(item);
          } else if (name) {
            const key = normalize(name);
            if (!byName.has(key)) byName.set(key, []);
            byName.get(key)!.push(item);
          }
        });

        return roster
          .map((person) => {
            const matchedRecords =
              byId.get(String(person.id)) ||
              byName.get(normalize(person.name)) ||
              [];

            const stats = inspectionStats(matchedRecords);

            const attendanceEmployee =
              attendanceEmployeeByUserId.get(String(person.id)) || null;

            return {
              key: `${role}-${person.id}`,
              id: person.id,
              label: person.name,

              total: stats.total,
              approved: stats.approved,
              rejected: stats.rejected,
              actionRequired: stats.actionRequired,
              actionTaken: stats.actionTaken,
              pending: stats.pending,

              performance: stats.performance || 0,

              records: matchedRecords,

              attendance: attendanceEmployee?.attendanceRate ?? null,

              attendanceEmployee,
            } satisfies RolePerformanceRow;
          })
          .sort((a, b) => b.performance - a.performance);
      },
      [
        cityUsersByRole,
        filteredInspectionRecords,
        attendanceEmployeeByUserId,
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

  /*
   * ULB Officer records carry no reviewer/actor field (unlike Daroga's
   * supervisorId, SI's reviewedByQcId, IEC's actionTakenById), so a
   * ULB Officer's rows are matched by their assigned Zone/Ward scope
   * (the same scope the backend enforces when they mark a report
   * Action Required) rather than by a per-record person field.
   */
  /*
   * Bucket every inspection record once by normalized zone/ward
   * (O(records)) instead of re-filtering the full record set for every
   * ULB officer (was O(officers x records)).
   */
  const recordsByNormalizedZone =
    useMemo(() => {
      const map = new Map<string, DashboardRecord[]>();

      filteredInspectionRecords.forEach((item) => {
        const zone = normalize(getRecordZone(item));
        if (!zone) return;
        if (!map.has(zone)) map.set(zone, []);
        map.get(zone)!.push(item);
      });

      return map;
    }, [filteredInspectionRecords]);

  const recordsByNormalizedWard =
    useMemo(() => {
      const map = new Map<string, DashboardRecord[]>();

      filteredInspectionRecords.forEach((item) => {
        const ward = normalize(getRecordWard(item));
        if (!ward) return;
        if (!map.has(ward)) map.set(ward, []);
        map.get(ward)!.push(item);
      });

      return map;
    }, [filteredInspectionRecords]);

  const ulbOfficerRows =
    useMemo(
      () =>
        (cityUsersByRole.get('ULB_OFFICER') || [])
          .map((officer) => {
            const zoneNames = (officer.zoneIds || [])
              .map((id) => geoNameById.get(id))
              .filter((name): name is string => Boolean(name));
            const wardNames = (officer.wardIds || [])
              .map((id) => geoNameById.get(id))
              .filter((name): name is string => Boolean(name));

            const zoneSet = new Set(zoneNames.map(normalize));
            const wardSet = new Set(wardNames.map(normalize));

            const matchedRecordsSet = new Set<DashboardRecord>();

            zoneSet.forEach((zone) => {
              recordsByNormalizedZone.get(zone)?.forEach((item) => matchedRecordsSet.add(item));
            });

            wardSet.forEach((ward) => {
              recordsByNormalizedWard.get(ward)?.forEach((item) => matchedRecordsSet.add(item));
            });

            const matchedRecords = Array.from(matchedRecordsSet);

            const stats = inspectionStats(matchedRecords);

            const attendanceEmployee =
              attendanceEmployeeByUserId.get(String(officer.id)) || null;

            return {
              key: `ULB_OFFICER-${officer.id}`,
              id: officer.id,
              label: officer.name,

              total: stats.total,
              approved: stats.approved,
              rejected: stats.rejected,
              actionRequired: stats.actionRequired,
              actionTaken: stats.actionTaken,
              pending: stats.pending,

              performance: stats.performance || 0,

              records: matchedRecords,

              attendance: attendanceEmployee?.attendanceRate ?? null,
              attendanceEmployee,
            } satisfies RolePerformanceRow;
          })
          .sort((a, b) => b.performance - a.performance),
      [
        cityUsersByRole,
        geoNameById,
        recordsByNormalizedZone,
        recordsByNormalizedWard,
        attendanceEmployeeByUserId,
      ]
    );

  /*
   * Built from the full registered EMPLOYEE roster rather than only
   * from filteredAttendanceEmployees, so a registered employee with no
   * attendance rows in the selected date range still gets a row
   * instead of being dropped from the count.
   */
  const employeeRows =
    useMemo(() => {
      /*
       * Mirrors the early-return gating filteredAttendanceEmployees
       * used to provide, so this tab still empties out under the same
       * global module/status filter combinations as before.
       */
      if (moduleFilter !== 'ALL' && moduleFilter !== 'ATTENDANCE') {
        return [];
      }

      if (statusFilter !== 'ALL' && !['PRESENT', 'ABSENT'].includes(statusFilter)) {
        return [];
      }

      const roster = cityUsersByRole.get('EMPLOYEE') || [];

      return roster
        .map((person) => {
          const attendanceEmployee =
            attendance?.employees?.find(
              (employee) =>
                employee.matrixTrackUserId && String(employee.matrixTrackUserId) === String(person.id)
            ) || null;

          return {
            key: `EMPLOYEE-${person.id}`,
            id: person.id,
            label: person.name,

            total: attendanceEmployee?.totalDays ?? 0,
            approved: attendanceEmployee?.presentDays ?? 0,
            rejected: attendanceEmployee?.absentDays ?? 0,
            actionRequired: 0,
            actionTaken: 0,
            pending: 0,

            performance: attendanceEmployee?.attendanceRate ?? 0,

            records: [],

            attendance: attendanceEmployee?.attendanceRate ?? null,

            attendanceEmployee,

            _zones: attendanceEmployee?.zones || [],
            _wards: attendanceEmployee?.wards || [],
          };
        })
        .filter((row) => {
          if (zoneFilter !== 'ALL' && !row._zones.includes(zoneFilter)) return false;
          if (wardFilter !== 'ALL' && !row._wards.includes(wardFilter)) return false;
          if (personFilter !== 'ALL' && row.label !== personFilter) return false;
          if (statusFilter === 'PRESENT' && row.approved <= 0) return false;
          if (statusFilter === 'ABSENT' && row.rejected <= 0) return false;

          if (searchValue) {
            const haystack = normalize([row.label, ...row._zones, ...row._wards].join(' '));
            if (!haystack.includes(searchValue)) return false;
          }

          return true;
        })
        .map(({ _zones, _wards, ...row }) => row)
        .sort((a, b) => b.performance - a.performance);
    }, [
      cityUsersByRole,
      attendance,
      moduleFilter,
      statusFilter,
      zoneFilter,
      wardFilter,
      personFilter,
      searchValue,
    ]);

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
          'ULB_OFFICER'
          ? ulbOfficerRows
          : performanceRole ===
            'ACTION_OFFICER'
            ? iecRows
            : employeeRows;

  const roleRowsPageSize =
    7;

  const [
    roleRowsPage,
    setRoleRowsPage,
  ] =
    useState(1);

  useEffect(() => {
    setRoleRowsPage(1);
  }, [
    performanceRole,
  ]);

  const roleRowsPageCount =
    Math.max(
      1,
      Math.ceil(
        activeRoleRows.length /
        roleRowsPageSize
      )
    );

  const roleRowsStart =
    (
      roleRowsPage - 1
    ) *
    roleRowsPageSize;

  const pagedRoleRows =
    activeRoleRows.slice(
      roleRowsStart,
      roleRowsStart +
      roleRowsPageSize
    );


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
     STATUS BAR DATA
  ========================================================= */

  const moduleStatusRows =
    useMemo(() => {
      /*
       * This feeds a stacked bar chart (stackId="status" in
       * ModuleStatusBarChart), so the five segments below must be
       * mutually exclusive and sum to 100% - unlike inspectionStats(),
       * whose Approved/Rejected/Action Required are deliberately
       * overlapping supersets. Bucket directly off effectiveStatus
       * (which is always exactly one value per record) instead of
       * reusing inspectionStats() here.
       */
      return INSPECTION_MODULES.map(
        (module) => {
          const rows =
            inspectionContextRecords.filter(
              (item) =>
                item.dashboardModule ===
                module.key
            );

          const applicableRows =
            rows.filter(
              (item) =>
                effectiveStatus(item) !==
                'DRAFT'
            );

          const total =
            Math.max(
              1,
              applicableRows.length
            );

          let approvedCount = 0;
          let rejectedCount = 0;
          let actionRequiredCount = 0;
          let actionTakenCount = 0;
          let pendingCount = 0;

          applicableRows.forEach(
            (item) => {
              const status =
                effectiveStatus(item);

              if (status === 'APPROVED') approvedCount += 1;
              else if (status === 'REJECTED') rejectedCount += 1;
              else if (status === 'ACTION_REQUIRED') actionRequiredCount += 1;
              else if (status === 'ACTION_TAKEN') actionTakenCount += 1;
              else pendingCount += 1;
            }
          );

          return {
            key:
              module.key,
            name:
              module.label,

            Approved:
              (
                approvedCount /
                total
              ) *
              100,

            Rejected:
              (
                rejectedCount /
                total
              ) *
              100,

            'Pending Action':
              (
                actionRequiredCount /
                total
              ) *
              100,

            'Action Taken':
              (
                actionTakenCount /
                total
              ) *
              100,

            'Pending SI':
              (
                pendingCount /
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

  const [
    zoneModuleView,
    setZoneModuleView,
  ] =
    useState<DashboardModuleKey>(
      'ALL'
    );

  const [
    selectedMapZone,
    setSelectedMapZone,
  ] =
    useState<
      string | null
    >(null);

  const [
    isZoneMapOpen,
    setIsZoneMapOpen,
  ] =
    useState(true);

  /*
   * Bucket each dataset once by zone (O(records + employees + wards))
   * instead of re-filtering the full dataset for every zone x module
   * cell (was O(zones x modules x records)).
   */
  const inspectionRecordsByZoneAndModule =
    useMemo(() => {
      const map = new Map<string, DashboardRecord[]>();

      inspectionContextRecords.forEach((item) => {
        const zone = getRecordZone(item);
        if (!zone || !item.dashboardModule) return;

        const key = `${zone}__${item.dashboardModule}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      });

      return map;
    }, [inspectionContextRecords]);

  const attendanceEmployeesByZone =
    useMemo(() => {
      const map = new Map<string, AttendanceEmployeeSummary[]>();

      attendanceContextEmployees.forEach((employee) => {
        employee.zones?.forEach((zone) => {
          if (!map.has(zone)) map.set(zone, []);
          map.get(zone)!.push(employee);
        });
      });

      return map;
    }, [attendanceContextEmployees]);

  const wardContextRowsByZone =
    useMemo(() => {
      const map = new Map<string, WardRankingRow[]>();

      wardContextRows.forEach((ward) => {
        if (!ward.zoneName) return;
        if (!map.has(ward.zoneName)) map.set(ward.zoneName, []);
        map.get(ward.zoneName)!.push(ward);
      });

      return map;
    }, [wardContextRows]);

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
                      attendanceEmployeesByZone.get(
                        zone
                      ) || [];

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
                      wardContextRowsByZone.get(
                        zone
                      ) || [];

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
                    inspectionRecordsByZoneAndModule.get(
                      `${zone}__${module.key}`
                    ) || [];

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
      attendanceEmployeesByZone,
      wardContextRowsByZone,
      inspectionRecordsByZoneAndModule,
    ]);

  const visibleZoneModuleCards =
    zoneModuleView === 'ALL'
      ? moduleCards
      : moduleCards.filter(
        (module) =>
          module.key ===
          zoneModuleView
      );

  const activeMapZone =
    selectedMapZone &&
      zoneModuleMatrix.some(
        (row) =>
          row.zone ===
          selectedMapZone
      )
      ? selectedMapZone
      : zoneModuleMatrix[0]
        ?.zone ??
      null;

  const activeMapZoneCells =
    zoneModuleMatrix.find(
      (row) =>
        row.zone ===
        activeMapZone
    )?.cells ?? [];

  const activeMapZoneOverall =
    zoneRows.find(
      (row) =>
        row.label ===
        activeMapZone
    ) ?? null;

  const zoneModuleDateLabel =
    (() => {
      if (
        !appliedFrom &&
        !appliedTo
      ) {
        return 'All Time';
      }

      if (
        appliedFrom &&
        appliedTo
      ) {
        const fromDate =
          new Date(
            `${appliedFrom}T00:00:00`
          );

        const toDate =
          new Date(
            `${appliedTo}T00:00:00`
          );

        const sameMonth =
          fromDate.getFullYear() ===
          toDate.getFullYear() &&
          fromDate.getMonth() ===
          toDate.getMonth();

        if (sameMonth) {
          return toDate.toLocaleDateString(
            'en-IN',
            {
              month:
                'long',
              year:
                'numeric',
            }
          );
        }

        return `${fromDate.toLocaleDateString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short',
          }
        )} - ${toDate.toLocaleDateString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }
        )}`;
      }

      return (
        appliedFrom ||
        appliedTo ||
        ''
      );
    })();


  const zoneMapVisualRows = (() => {
    const rows = zoneModuleMatrix
      .slice(0, 6)
      .map((row, index) => {
        const zoneRow = zoneRows.find(
          (item) => item.label === row.zone
        );

        const value = zoneRow
          ? geoMetric(zoneRow)
          : null;

        const match = row.zone.match(/(\d+)/);
        const zoneNumber = match
          ? Number(match[1])
          : index + 1;

        const layout =
          ZONE_MAP_LAYOUT[zoneNumber] ||
          ZONE_MAP_LAYOUT[(index % 6) + 1];

        return {
          ...row,
          value,
          zoneNumber,
          layout,
        };
      });

    const values = rows
      .map((row) => row.value)
      .filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value)
      );

    const minValue = values.length
      ? Math.min(...values)
      : 0;

    const maxValue = values.length
      ? Math.max(...values)
      : 100;

    return rows.map((row) => {
      const hasValue =
        typeof row.value === 'number' &&
        Number.isFinite(row.value);

      const relative = !hasValue
        ? 0
        : maxValue > minValue
          ? clamp(
            (row.value! - minValue) /
            (maxValue - minValue),
            0,
            1
          )
          : clamp(row.value! / 100, 0, 1);

      const intensity =
        !hasValue || row.value === 0
          ? 0
          : 0.16 +
          0.84 * Math.pow(relative, 1.8);

      const startLightness =
        96 - intensity * 38;

      const endLightness =
        92 - intensity * 46;

      const darkZone =
        intensity >= 0.86;

      return {
        ...row,
        gradientStart: hasValue
          ? `hsl(238 88% ${startLightness}%)`
          : '#f4f6fb',
        gradientEnd: hasValue
          ? `hsl(234 90% ${endLightness}%)`
          : '#e8ecf6',
        textColor: darkZone
          ? '#ffffff'
          : '#10235e',
        dotColor: darkZone
          ? '#ffffff'
          : '#5b55f6',
      };
    });
  })();


  /* =========================================================
     DRILL HELPERS
  ========================================================= */

  function openZoneModuleCell(
    zoneLabel: string,
    cell: (typeof zoneModuleMatrix)[number]['cells'][number]
  ) {
    setDrilldown({
      title:
        `${zoneLabel} · ${cell.label}`,
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
    });
  }

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
          'Ward Performance',
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
            'Ward Performance',
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
            'Total Employee',
          value:
            attendanceEmployeeTotal.toLocaleString(
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
        'Ward Performance',
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
        <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', borderRadius: '24px', padding: '26px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 40px -10px rgba(15,23,42,0.6)', position: 'relative', overflow: 'hidden', marginBottom: '24px', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100%', background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.2), transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, minWidth: '280px' }}>
            <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#60a5fa" /> MATRIXTRACK 2.0
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, letterSpacing: '-0.02em' }}>
              {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.name || 'Commissioner'}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={12} color="#38bdf8" /> {cityName}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', padding: '3px 10px', borderRadius: '12px' }}>
                Commissioner
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Filter size={14} />
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: refreshing ? 'default' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', opacity: refreshing ? 0.6 : 1 }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </section>

        {/* FILTERS */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${showFilters ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
        >
          <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_14px_40px_-25px_rgba(15,23,42,.35)] backdrop-blur-xl">
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

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
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
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
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
        </div>

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
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <KpiCard
            label="Overall Performance"
            value={
              loading
                ? '—'
                : percentText(
                  overallPerformance
                )
            }
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.overallPerformance)
                : undefined
            }
            cardTint="bg-gradient-to-br from-violet-50 via-purple-50 to-white"
            iconGradient="from-violet-500 to-purple-600"
            icon={
              <div className="relative flex items-center justify-center">
                <BarChart3 size={26} strokeWidth={2.2} />
                <TrendingUp
                  size={13}
                  strokeWidth={3}
                  className="absolute -right-1.5 -top-1.5"
                />
              </div>
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
                  'Ward Performance',
                value:
                  percentText(
                    wardRankingAverage
                  ),
              },
            ]}
            trend={monthTrends.overallPerformance}
            onClick={
              openOverall
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
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.attendanceRate)
                : undefined
            }
            cardTint="bg-gradient-to-br from-emerald-50 via-teal-50 to-white"
            iconGradient="from-emerald-400 to-teal-500"
            icon={
              <div className="relative flex items-center justify-center">
                <UsersRound size={24} strokeWidth={2.2} />
                <IconBadge
                  bg="bg-emerald-600"
                  icon={
                    <Check
                      size={10}
                      strokeWidth={3.2}
                    />
                  }
                />
              </div>
            }
            tooltip={
              attendanceStats.rangeDayCount > 1
                ? [
                  {
                    label:
                      'Registered Employees',
                    value:
                      attendanceEmployeeTotal.toLocaleString(
                        'en-IN'
                      ),
                  },
                  {
                    label:
                      'Avg Present / Day',
                    value:
                      Math.round(
                        attendanceStats.displayPresent
                      ).toLocaleString(
                        'en-IN'
                      ),
                  },
                  {
                    label:
                      'Avg Absent / Day',
                    value:
                      Math.round(
                        attendanceStats.displayAbsent
                      ).toLocaleString(
                        'en-IN'
                      ),
                  },
                  {
                    label:
                      'Attendance Days',
                    value:
                      attendanceStats.rangeDayCount.toLocaleString(
                        'en-IN'
                      ),
                  },
                ]
                : [
                  {
                    label:
                      'Total Employee',
                    value:
                      attendanceEmployeeTotal.toLocaleString(
                        'en-IN'
                      ),
                  },
                  {
                    label:
                      'Present',
                    value:
                      Math.round(
                        attendanceStats.displayPresent
                      ).toLocaleString(
                        'en-IN'
                      ),
                  },
                  {
                    label:
                      'Absent',
                    value:
                      Math.round(
                        attendanceStats.displayAbsent
                      ).toLocaleString(
                        'en-IN'
                      ),
                  },
                ]
            }
            trend={monthTrends.attendanceRate}
            onClick={
              openAttendance
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
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.inspectionPerformance)
                : undefined
            }
            cardTint="bg-gradient-to-br from-blue-50 via-sky-50 to-white"
            iconGradient="from-blue-500 to-indigo-500"
            icon={
              <div className="relative flex items-center justify-center">
                <ClipboardList size={24} strokeWidth={2.2} />
                <IconBadge
                  bg="bg-blue-700"
                  icon={
                    <Search
                      size={9}
                      strokeWidth={3}
                    />
                  }
                />
              </div>
            }
            tooltip={[
              {
                label:
                  'Total Inspection',
                value:
                  inspection.total.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                /*
                 * SI Approved (inspection.approved) already counts
                 * every report the SI ever approved, including ones
                 * later flagged for corrective action - so Total
                 * Inspection = SI Approved + SI Rejected + SI Pending
                 * holds.
                 */
                label:
                  'SI Approved',
                value:
                  inspection.approved.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'SI Rejected',
                value:
                  inspection.rejected.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'SI Pending',
                value:
                  inspection.pending.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                /*
                 * Action Required (inspection.actionRequired) is
                 * already a superset that also includes records
                 * whose action has since been taken.
                 */
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
              {
                label:
                  'Pending Action',
                value:
                  (
                    inspection.actionRequired -
                    inspection.actionTaken
                  ).toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            trend={monthTrends.inspectionPerformance}
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
            label="Approval Rate"
            value={
              loading
                ? '—'
                : percentText(
                  inspection.approvalRate
                )
            }
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.approvalRate)
                : undefined
            }
            cardTint="bg-gradient-to-br from-teal-50 via-emerald-50 to-white"
            iconGradient="from-teal-400 to-emerald-600"
            icon={
              <div className="relative flex items-center justify-center">
                <FileText size={24} strokeWidth={2.2} />
                <IconBadge
                  bg="bg-emerald-600"
                  icon={
                    <Check
                      size={10}
                      strokeWidth={3.2}
                    />
                  }
                />
              </div>
            }
            tooltip={[
              {
                label:
                  'Total',
                value:
                  inspection.total.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'SI Approved',
                value:
                  inspection.approved.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'SI Rejected',
                value:
                  inspection.rejected.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            trend={monthTrends.approvalRate}
            onClick={() =>
              openInspectionMetric(
                'Approval Rate',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    getQcDecision(
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
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.rejectionRate)
                : undefined
            }
            cardTint="bg-gradient-to-br from-rose-50 via-red-50 to-white"
            iconGradient="from-rose-500 to-red-600"
            icon={
              <div className="relative flex items-center justify-center">
                <FileText size={24} strokeWidth={2.2} />
                <IconBadge
                  bg="bg-rose-600"
                  icon={
                    <X
                      size={10}
                      strokeWidth={3.2}
                    />
                  }
                />
              </div>
            }
            tooltip={[
              {
                label:
                  'Total',
                value:
                  inspection.total.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'SI Approved',
                value:
                  inspection.approved.toLocaleString(
                    'en-IN'
                  ),
              },
              {
                label:
                  'SI Rejected',
                value:
                  inspection.rejected.toLocaleString(
                    'en-IN'
                  ),
              },
            ]}
            trend={monthTrends.rejectionRate}
            onClick={() =>
              openInspectionMetric(
                'Rejection Rate',
                filteredInspectionRecords.filter(
                  (
                    item
                  ) =>
                    getQcDecision(
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
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.actionClosure)
                : undefined
            }
            cardTint="bg-gradient-to-br from-orange-50 via-amber-50 to-white"
            iconGradient="from-orange-400 to-amber-500"
            icon={
              <div className="relative flex items-center justify-center">
                <Settings2 size={24} strokeWidth={2.2} />
                <IconBadge
                  bg="bg-orange-600"
                  icon={
                    <Check
                      size={10}
                      strokeWidth={3.2}
                    />
                  }
                />
              </div>
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
                  'Action Pending',
                value:
                  (
                    inspection.actionRequired -
                    inspection.actionTaken
                  ).toLocaleString(
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
            trend={monthTrends.actionClosure}
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
            label="Ward Performance"
            value={
              loading
                ? '—'
                : percentText(
                  wardRankingAverage
                )
            }
            lastMonthValue={
              lastMonthMetrics
                ? percentText(lastMonthMetrics.wardRankingAverage)
                : undefined
            }
            cardTint="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white"
            iconGradient="from-violet-500 to-fuchsia-600"
            icon={
              <Trophy
                size={26}
                strokeWidth={2.2}
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
            trend={monthTrends.wardRankingAverage}
            onClick={
              openWardRanking
            }
          />
        </section>

        {/* CITY SNAPSHOT */}
        <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              City Snapshot
            </h2>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
              Overall city totals and today&apos;s report status across all inspection modules
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="min-h-[76px] rounded-xl border border-blue-100 bg-blue-50/55 px-3 py-2.5">
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600">
                    <MapPin size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Total Zones
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {cityZoneCount}
                </div>
              </div>
            </div>

            <div className="min-h-[76px] rounded-xl border border-violet-100 bg-violet-50/45 px-3 py-2.5">
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100/80 text-violet-600">
                    <Layers3 size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Total Wards
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {cityWardCount}
                </div>
              </div>
            </div>

            <div className="min-h-[76px] rounded-xl border border-cyan-100 bg-cyan-50/45 px-3 py-2.5">
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-100/80 text-cyan-600">
                    <Activity size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Total Beats
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {cityBeatCount}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'Total Inspection',
                  records,
                  citySnapshotStats.total.toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100/80 text-sky-700">
                    <ClipboardList size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Total Inspection
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.total}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'SI Pending',
                  records.filter(
                    (
                      item
                    ) =>
                      effectiveStatus(
                        item
                      ) ===
                      'PENDING'
                  ),
                  citySnapshotStats.pending.toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-amber-100 bg-amber-50/45 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-600">
                    <Clock3 size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    SI Pending
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.pending}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'SI Approved',
                  records.filter(
                    (
                      item
                    ) =>
                      getQcDecision(
                        item
                      ) ===
                      'APPROVED'
                  ),
                  citySnapshotStats.approved.toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-emerald-100 bg-emerald-50/45 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    SI Approved
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.approved}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'SI Rejected',
                  records.filter(
                    (
                      item
                    ) =>
                      getQcDecision(
                        item
                      ) ===
                      'REJECTED'
                  ),
                  citySnapshotStats.rejected.toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-rose-100 bg-rose-50/45 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100/80 text-rose-600">
                    <XCircle size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    SI Rejected
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.rejected}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'Action Required',
                  records.filter(
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
                  citySnapshotStats.actionRequired.toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-orange-100 bg-orange-50/45 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100/80 text-orange-600">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Action Required
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.actionRequired}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'Action Taken',
                  records.filter(
                    (
                      item
                    ) =>
                      effectiveStatus(
                        item
                      ) ===
                      'ACTION_TAKEN'
                  ),
                  citySnapshotStats.actionTaken.toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-teal-100 bg-teal-50/45 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-100/80 text-teal-600">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Action Taken
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.actionTaken}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                openInspectionMetric(
                  'Pending Action',
                  records.filter(
                    (item) =>
                      effectiveStatus(item) ===
                      'ACTION_REQUIRED'
                  ),
                  (
                    citySnapshotStats.actionRequired -
                    citySnapshotStats.actionTaken
                  ).toLocaleString(
                    'en-IN'
                  )
                )
              }
              className="group min-h-[76px] rounded-xl border border-cyan-100 bg-cyan-50/45 px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-100/80 text-cyan-600">
                    <Timer size={16} />
                  </div>
                  <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">
                    Pending Action
                  </div>
                </div>
                <div className="shrink-0 text-[20px] font-black leading-none text-slate-900">
                  {citySnapshotStats.actionRequired -
                    citySnapshotStats.actionTaken}
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* TOP / WORST */}
        <section className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* TOP PERFORMANCE */}
          <div
            className="relative overflow-hidden rounded-[22px] border p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
            style={{
              background:
                'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 50%, #F0FDFA 100%)',
              borderColor:
                '#D1FAE5',
              minHeight: 196,
            }}
          >
            {/* decorative skyline */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-[0.12]"
              aria-hidden="true"
            >
              <div className="absolute bottom-0 left-[2%] h-10 w-6 rounded-t-[3px] bg-emerald-600" />
              <div className="absolute bottom-0 left-[10%] h-16 w-8 rounded-t-[3px] bg-emerald-600" />
              <div className="absolute bottom-0 left-[20%] h-8 w-5 rounded-t-[2px] bg-emerald-600" />
              <div className="absolute bottom-0 left-[28%] h-20 w-9 rounded-t-[4px] bg-emerald-600" />
              <div className="absolute bottom-0 right-[28%] h-14 w-7 rounded-t-[3px] bg-emerald-600" />
              <div className="absolute bottom-0 right-[18%] h-9 w-5 rounded-t-[2px] bg-emerald-600" />
              <div className="absolute bottom-0 right-[8%] h-[70px] w-8 rounded-t-[4px] bg-emerald-600" />
              <div className="absolute bottom-0 right-[1%] h-12 w-6 rounded-t-[3px] bg-emerald-600" />
            </div>

            {/* HEADER */}
            <div className="relative flex items-center gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    '#10B981',
                  boxShadow:
                    '0 8px 20px rgba(16,185,129,0.20)',
                }}
              >
                <TrendingUp
                  size={15}
                  strokeWidth={2.5}
                  color="#fff"
                />
              </div>

              <div className="min-w-0">
                <div
                  className="text-[14px] font-extrabold leading-tight"
                  style={{
                    color:
                      '#0F1B4C',
                  }}
                >
                  Top Performance
                </div>

                <div
                  className="mt-0.5 text-[10px] font-medium"
                  style={{
                    color:
                      '#31518F',
                  }}
                >
                  Best performing zone and ward
                </div>
              </div>
            </div>

            {/* MAIN PERFORMANCE AREA */}
            <div className="relative mt-3 grid grid-cols-2 items-center justify-items-center gap-1.5 xl:grid-cols-[1fr_1fr_0.8fr]">
              <CircularProgress
                value={
                  topZone?.metricValue
                }
                name={
                  topZone?.label ??
                  '—'
                }
                label="ZONE"
                variant="success"
                onClick={
                  topZone
                    ? () =>
                      openGeo(
                        topZone
                      )
                    : undefined
                }
              />

              <CircularProgress
                value={
                  topWard?.metricValue
                }
                name={
                  topWard?.label ??
                  '—'
                }
                label="WARD"
                variant="success"
                onClick={
                  topWard
                    ? () =>
                      openGeo(
                        topWard
                      )
                    : undefined
                }
              />

              <div className="relative hidden items-center justify-center xl:flex">
                <Trophy
                  size={60}
                  strokeWidth={1.5}
                  color="#F59E0B"
                  className="relative z-10"
                />

                <Sparkles
                  size={13}
                  className="absolute -right-1 top-1 z-10 text-[#34D399]"
                />

                <Sparkles
                  size={9}
                  className="absolute bottom-1 left-0 z-10 text-[#34D399]"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="relative mt-3 flex min-h-[42px] items-center gap-2 rounded-[13px] px-3"
              style={{
                background:
                  'rgba(16,185,129,0.10)',
                border:
                  '1px solid rgba(16,185,129,0.08)',
              }}
            >
              <div
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    '#10B981',
                }}
              >
                <Check
                  size={14}
                  color="#fff"
                  strokeWidth={3}
                />
              </div>

              <div
                className="text-[11px] font-semibold leading-tight"
                style={{
                  color:
                    '#065F46',
                }}
              >
                On the Basis of Approval Rate and Action Closure
              </div>
            </div>
          </div>

          {/* WORST PERFORMANCE */}
          <div
            className="relative overflow-hidden rounded-[22px] border p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
            style={{
              background:
                'linear-gradient(135deg, #FFF7F7 0%, #FFF1F2 50%, #FFF7F7 100%)',
              borderColor:
                '#FECDD3',
              minHeight: 196,
            }}
          >
            {/* decorative declining bars */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 flex h-12 items-end justify-between px-5 opacity-[0.2]"
              aria-hidden="true"
            >
              <div className="h-[85%] w-6 rounded-t-[4px] bg-rose-500" />
              <div className="h-[65%] w-6 rounded-t-[4px] bg-rose-500" />
              <div className="h-[48%] w-6 rounded-t-[4px] bg-rose-500" />
              <div className="h-[30%] w-6 rounded-t-[4px] bg-rose-500" />
              <div className="h-[16%] w-6 rounded-t-[4px] bg-rose-500" />
            </div>

            {/* HEADER */}
            <div className="relative flex items-center gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    '#F43F5E',
                  boxShadow:
                    '0 8px 20px rgba(244,63,94,0.20)',
                }}
              >
                <TrendingDown
                  size={15}
                  strokeWidth={2.5}
                  color="#fff"
                />
              </div>

              <div className="min-w-0">
                <div
                  className="text-[14px] font-extrabold leading-tight"
                  style={{
                    color:
                      '#0F1B4C',
                  }}
                >
                  Worst Performance
                </div>

                <div
                  className="mt-0.5 text-[10px] font-medium"
                  style={{
                    color:
                      '#31518F',
                  }}
                >
                  Lowest performing zone and ward
                </div>
              </div>
            </div>

            {/* MAIN PERFORMANCE AREA */}
            <div className="relative mt-3 grid grid-cols-2 items-center justify-items-center gap-1.5 xl:grid-cols-[1fr_1fr_0.8fr]">
              <CircularProgress
                value={
                  worstZone?.metricValue
                }
                name={
                  worstZone?.label ??
                  '—'
                }
                label="ZONE"
                variant="danger"
                onClick={
                  worstZone
                    ? () =>
                      openGeo(
                        worstZone
                      )
                    : undefined
                }
              />

              <CircularProgress
                value={
                  worstWard?.metricValue
                }
                name={
                  worstWard?.label ??
                  '—'
                }
                label="WARD"
                variant="danger"
                onClick={
                  worstWard
                    ? () =>
                      openGeo(
                        worstWard
                      )
                    : undefined
                }
              />

              <div className="relative hidden flex-col items-center justify-center gap-0.5 xl:flex">
                <BarChart3
                  size={42}
                  strokeWidth={1.5}
                  color="#F43F5E"
                  className="relative z-10 opacity-80"
                />

                <TrendingDown
                  size={24}
                  strokeWidth={2}
                  color="#F43F5E"
                  className="relative z-10 -mt-1.5"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="relative mt-3 flex min-h-[42px] items-center gap-2 rounded-[13px] px-3"
              style={{
                background:
                  'rgba(244,63,94,0.10)',
                border:
                  '1px solid rgba(244,63,94,0.08)',
              }}
            >
              <div
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    '#F43F5E',
                }}
              >
                <AlertTriangle
                  size={14}
                  color="#fff"
                  strokeWidth={2.5}
                />
              </div>

              <div
                className="text-[11px] font-semibold leading-tight"
                style={{
                  color:
                    '#9F1239',
                }}
              >
                On the Basis of Approval Rate and Action Closure
              </div>
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

              /*
               * Full calculation shown on hover - derived from the
               * same raw records/employees/wards already carried on
               * this module card, using the existing performance
               * formulas (no new calculation logic introduced).
               */
              const calculation =
                (() => {
                  if (
                    module.key ===
                    'ATTENDANCE'
                  ) {
                    const totalDays =
                      module.employees.reduce(
                        (
                          sum,
                          employee
                        ) =>
                          sum +
                          employee.totalDays,
                        0
                      );

                    const present =
                      module.employees.reduce(
                        (
                          sum,
                          employee
                        ) =>
                          sum +
                          employee.presentDays,
                        0
                      );

                    return `${present.toLocaleString('en-IN')} Present / ${totalDays.toLocaleString('en-IN')} Total Days = ${percentText(module.performance)}`;
                  }

                  if (
                    module.key ===
                    'WARD_RANKING'
                  ) {
                    return `Average of ${module.wards.length.toLocaleString('en-IN')} Ward${module.wards.length === 1 ? '' : 's'} = ${percentText(module.performance)}`;
                  }

                  const stats =
                    inspectionStats(
                      module.records
                    );

                  return `${stats.goodOutcome.toLocaleString('en-IN')} Approved or Action Taken / ${stats.total.toLocaleString('en-IN')} Total = ${percentText(module.performance)}`;
                })();

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
                  className={`group relative overflow-hidden rounded-[22px] border bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${moduleFilter ===
                    module.key
                    ? 'border-indigo-300 ring-2 ring-indigo-100'
                    : 'border-slate-200'
                    }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradients[
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
                      className={`h-full rounded-full bg-gradient-to-r ${gradients[
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

                  <div className="pointer-events-none absolute inset-x-3 top-10 z-10 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold leading-snug text-slate-700 shadow-xl group-hover:block">
                    {calculation}
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

            <CityPerformancePulse
              loading={
                loading
              }
              periodLabel={
                zoneModuleDateLabel
              }
              overallPerformance={
                overallPerformance
              }
              inspectionPerformance={
                inspection.performance
              }
              attendanceRate={
                attendanceStats.rate
              }
              wardRankingAverage={
                wardRankingAverage
              }
              lastMonthMetrics={
                lastMonthMetrics
              }
              monthTrends={
                monthTrends
              }
              insights={
                smartInsights
              }
              lastUpdatedAt={
                lastUpdatedAt
              }
              onOverall={
                openOverall
              }
              onInspection={() =>
                openInspectionMetric(
                  'Inspection Performance',
                  filteredInspectionRecords,
                  percentText(
                    inspection.performance
                  )
                )
              }
              onAttendance={
                openAttendance
              }
              onWardRanking={
                openWardRanking
              }
            />
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <BarChart3
                  size={18}
                  className="text-violet-600"
                />
                Ward Performance
              </div>

              <div className="text-[10px] font-black text-slate-400">
                {
                  wardRows.length
                }{' '}
                Wards
              </div>
            </div>

            <WardPerformanceScroller
              wards={
                wardRows
              }
            />
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
            <ModuleStatusBarChart
              data={
                moduleStatusRows
              }
            />
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
              User Performance
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
                    className={`rounded-xl px-3 py-2 text-[10px] font-black transition ${performanceRole ===
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
            {pagedRoleRows.map(
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
                    {roleRowsStart +
                      index +
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

          {roleRowsPageCount >
            1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={
                    roleRowsPage <=
                    1
                  }
                  onClick={() =>
                    setRoleRowsPage(
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
                  {
                    roleRowsPage
                  }{' '}
                  /{' '}
                  {
                    roleRowsPageCount
                  }
                </div>

                <button
                  type="button"
                  disabled={
                    roleRowsPage >=
                    roleRowsPageCount
                  }
                  onClick={() =>
                    setRoleRowsPage(
                      (
                        current
                      ) =>
                        Math.min(
                          roleRowsPageCount,
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
                <AttendanceInspectionScatterChart
                  data={
                    attendanceInspectionPoints
                  }
                  onPointClick={(row) => {
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
                  className="text-rose-600"
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
                            attendanceHeatColor(
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

        {/* ZONE × MODULE */}
        <section className="mt-4 overflow-hidden rounded-[22px] border border-[#dfe7f5] bg-[#fbfdff] shadow-[0_10px_34px_-22px_rgba(30,64,175,.28)]">
          {/* HEADER */}
          <div className="flex flex-col gap-3 border-b border-[#e8edf7] bg-white/95 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,.65)]">
                <BarChart3
                  size={17}
                  strokeWidth={2.5}
                />
              </span>

              <div className="min-w-0">
                <div className="truncate text-[14px] font-black leading-tight text-[#11265b]">
                  Zone · Module Performance
                </div>

                <div className="mt-0.5 text-[9px] font-semibold text-[#8190b5]">
                  Module-wise performance across all zones
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#7b8db7]">
                View By:
              </span>

              {DASHBOARD_MODULES.map(
                (
                  item
                ) => (
                  <button
                    key={
                      item.key
                    }
                    type="button"
                    onClick={() =>
                      setZoneModuleView(
                        item.key
                      )
                    }
                    className={`rounded-[7px] border px-2 py-1.5 text-[8px] font-black transition ${zoneModuleView ===
                      item.key
                      ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                      : 'border-[#e3e9f4] bg-white text-[#53678f] hover:border-blue-200 hover:bg-blue-50'
                      }`}
                  >
                    {item.key ===
                      'ALL'
                      ? 'All Modules'
                      : item.label}
                  </button>
                )
              )}

              <span className="ml-1 flex items-center gap-1.5 rounded-[8px] border border-[#dfe6f2] bg-white px-2.5 py-1.5 text-[8.5px] font-black text-[#53678f] shadow-sm">
                <CalendarDays
                  size={11}
                  className="text-[#8292b5]"
                />
                {
                  zoneModuleDateLabel
                }
                <ChevronDown
                  size={10}
                  className="text-[#9aa8c5]"
                />
              </span>
            </div>
          </div>

          {/* MATRIX */}
          <div className="overflow-x-auto px-4 pb-3 pt-2">
            <div
              className="grid min-w-[900px] gap-x-2 gap-y-1.5"
              style={{
                gridTemplateColumns: `155px repeat(${visibleZoneModuleCards.length}, minmax(118px, 1fr))`,
              }}
            >
              {/* COLUMN HEADERS */}
              <div className="flex items-center gap-1.5 px-2 py-2 text-[9px] font-black text-[#24365f]">
                <MapPin
                  size={12}
                  className="text-blue-500"
                />
                Zone
              </div>

              {visibleZoneModuleCards.map(
                (
                  module
                ) => {
                  const visual =
                    MODULE_VISUALS[
                    module.key
                    ];

                  return (
                    <div
                      key={
                        module.key
                      }
                      className="flex items-center justify-center gap-1.5 px-1 py-2 text-center"
                    >
                      {visual && (
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
                          style={{
                            background:
                              visual.soft,
                            color:
                              visual.color,
                          }}
                        >
                          {
                            visual.icon
                          }
                        </span>
                      )}

                      <span className="max-w-[96px] text-[8px] font-black leading-[1.15] text-[#293b66]">
                        {
                          module.label
                        }
                      </span>
                    </div>
                  );
                }
              )}

              {/* DATA ROWS */}
              {zoneModuleMatrix.flatMap(
                (
                  row,
                  rowIndex
                ) => [
                    <button
                      key={`${row.zone}-label`}
                      type="button"
                      onClick={() =>
                        setSelectedMapZone(
                          row.zone
                        )
                      }
                      className={`group flex min-h-[30px] items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[9px] font-black transition ${activeMapZone ===
                        row.zone
                        ? 'bg-[#eef3ff] text-[#243fa8] ring-1 ring-[#c7d2fe]'
                        : 'bg-[#f7f9fd] text-[#34486f] hover:bg-[#f1f5fb]'
                        }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${rowIndex % 4 ===
                            0
                            ? 'bg-indigo-500'
                            : rowIndex % 4 ===
                              1
                              ? 'bg-sky-500'
                              : rowIndex % 4 ===
                                2
                                ? 'bg-cyan-500'
                                : 'bg-blue-400'
                            }`}
                        />
                        <span className="truncate">
                          {
                            row.zone
                          }
                        </span>
                      </span>

                      <ChevronRight
                        size={11}
                        className="shrink-0 text-[#9aa7c2] transition group-hover:translate-x-0.5"
                      />
                    </button>,

                    ...row.cells
                      .filter(
                        (
                          cell
                        ) =>
                          visibleZoneModuleCards.some(
                            (
                              module
                            ) =>
                              module.key ===
                              cell.key
                          )
                      )
                      .map(
                        (
                          cell
                        ) => {
                          const value =
                            cell.value;

                          const tone =
                            ZONE_MODULE_BAR_TONES[
                            cell.key
                            ] ||
                            ZONE_MODULE_BAR_TONES.SWEEPING;

                          const barBackground =
                            value ===
                              null
                              ? '#f1f4fa'
                              : value >= 90
                                ? `linear-gradient(90deg,${tone.full} 0%,${tone.deep} 100%)`
                                : value >= 50
                                  ? `linear-gradient(90deg,${tone.medium} 0%,${tone.full} 100%)`
                                  : value > 0
                                    ? `linear-gradient(90deg,${tone.light} 0%,${tone.medium} 100%)`
                                    : '#e7ecf5';

                          return (
                            <button
                              key={`${row.zone}-${cell.key}`}
                              type="button"
                              onClick={() =>
                                openZoneModuleCell(
                                  row.zone,
                                  cell
                                )
                              }
                              className="group relative flex min-h-[30px] items-center rounded-[8px] border border-[#edf1f8] bg-[#f7f9fd] px-1.5 py-1 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm"
                            >
                              {value ===
                                null ? (
                                <span className="mx-auto text-[10px] font-black text-[#b1bad0]">
                                  —
                                </span>
                              ) : (
                                <div className="relative h-[18px] w-full overflow-hidden rounded-[6px] bg-[#e9edf7]">
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-[6px] transition-all duration-700"
                                    style={{
                                      width:
                                        `${Math.max(
                                          value > 0
                                            ? 4
                                            : 0,
                                          clamp(
                                            value
                                          )
                                        )}%`,
                                      background:
                                        barBackground,
                                    }}
                                  />

                                  <div
                                    className={`absolute inset-0 flex items-center justify-end px-2 text-[8.5px] font-black ${value >=
                                      46
                                      ? 'text-white'
                                      : 'text-[#1e3264]'
                                      }`}
                                  >
                                    {percentText(
                                      value
                                    )}
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        }
                      ),
                  ]
              )}
            </div>
          </div>

          {/* LEGEND */}
          <div className="flex flex-col gap-2 border-t border-[#eef2f8] bg-white/80 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[8px] font-bold text-[#6f7fa4]">
              <span className="font-black text-[#40537e]">
                Performance Scale:
              </span>

              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#3730a3]" />
                90 - 100%
                <span className="font-semibold text-[#9ba7c0]">
                  Excellent
                </span>
              </span>

              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#818cf8]" />
                50 - 89%
                <span className="font-semibold text-[#9ba7c0]">
                  Good
                </span>
              </span>

              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#c7d2fe]" />
                1 - 49%
                <span className="font-semibold text-[#9ba7c0]">
                  Needs Attention
                </span>
              </span>

              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#dbe2ef]" />
                0%
                <span className="font-semibold text-[#9ba7c0]">
                  No Data
                </span>
              </span>

              <span className="flex items-center gap-1">
                <span className="text-[11px] font-black text-[#c0c8d8]">
                  —
                </span>
                Not Applicable
              </span>
            </div>

            <div className="flex items-center gap-1 text-[8px] font-bold text-[#8a98b6]">
              Click on a zone to view detailed performance
              <ChevronRight
                size={10}
              />
            </div>
          </div>

          {/* ZONE MAP + DETAIL */}
          <div className="grid grid-cols-1 gap-3 border-t border-[#edf1f7] bg-[#fbfdff] p-3 xl:grid-cols-[1.22fr_1fr]">
            {/* VISUAL ZONE MAP */}
            <div className="overflow-hidden rounded-[18px] border border-[#dfe7f3] bg-white shadow-[0_14px_35px_-24px_rgba(37,99,235,.38)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#eef2f7] px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-[0_8px_18px_-9px_rgba(79,70,229,.75)]">
                    <MapPin size={14} />
                  </span>

                  <div className="min-w-0">
                    <div className="text-[12px] font-black text-[#152a59]">
                      Zone Performance Map
                    </div>

                    <div className="mt-0.5 truncate text-[8px] font-semibold text-[#8f9bb4]">
                      Interactive performance view - illustrative zone layout
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <select
                    value={metricFilter}
                    onChange={(event) =>
                      setMetricFilter(
                        event.target.value as MetricKey
                      )
                    }
                    className="h-8 max-w-[158px] rounded-[9px] border border-[#dfe6f1] bg-white px-2.5 text-[8px] font-black text-[#53678f] outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    {METRICS.map((metric) => (
                      <option
                        key={metric.key}
                        value={metric.key}
                      >
                        {metric.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setIsZoneMapOpen(
                        (prev) => !prev
                      )
                    }
                    aria-expanded={isZoneMapOpen}
                    aria-label={
                      isZoneMapOpen
                        ? 'Collapse zone performance map'
                        : 'Expand zone performance map'
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-[#dfe6f1] bg-white text-[#53678f] transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {isZoneMapOpen ? (
                      <ChevronUp size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                  </button>
                </div>
              </div>

              {isZoneMapOpen && (
                <div className="relative min-h-[330px] overflow-hidden bg-[#f8fbff]">
                  <svg
                    viewBox="0 0 760 360"
                    className="h-[330px] w-full"
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    aria-label="Illustrative interactive zone performance map"
                  >
                    <defs>
                      <linearGradient
                        id="zoneMapBackground"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#fbfdff"
                        />
                        <stop
                          offset="100%"
                          stopColor="#f2f7fd"
                        />
                      </linearGradient>

                      <pattern
                        id="zoneStreetPattern"
                        width="58"
                        height="58"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(7)"
                      >
                        <path
                          d="M 0 10 H 58 M 0 34 H 58 M 10 0 V 58 M 39 0 V 58"
                          fill="none"
                          stroke="#dfe8f3"
                          strokeWidth="1"
                          opacity="0.58"
                        />
                      </pattern>

                      <filter
                        id="zoneSoftShadow"
                        x="-30%"
                        y="-30%"
                        width="160%"
                        height="160%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="6"
                          stdDeviation="6"
                          floodColor="#294a91"
                          floodOpacity="0.10"
                        />
                      </filter>

                      <filter
                        id="zoneSelectedShadow"
                        x="-35%"
                        y="-35%"
                        width="170%"
                        height="170%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="8"
                          stdDeviation="9"
                          floodColor="#312e81"
                          floodOpacity="0.30"
                        />
                      </filter>

                      {zoneMapVisualRows.map(
                        (row, index) => (
                          <linearGradient
                            key={`gradient-${row.zone}`}
                            id={`zone-map-gradient-${index}`}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              stopColor={row.gradientStart}
                            />
                            <stop
                              offset="100%"
                              stopColor={row.gradientEnd}
                            />
                          </linearGradient>
                        )
                      )}
                    </defs>

                    <rect
                      width="760"
                      height="360"
                      fill="url(#zoneMapBackground)"
                    />

                    <rect
                      width="760"
                      height="360"
                      fill="url(#zoneStreetPattern)"
                      opacity="0.82"
                    />

                    {/* broad pale roads */}
                    <g
                      fill="none"
                      strokeLinecap="round"
                      pointerEvents="none"
                    >
                      <path
                        d="M -35 300 C 115 240 210 250 355 210 C 480 176 590 135 790 84"
                        stroke="#e1e9f3"
                        strokeWidth="7"
                        opacity="0.68"
                      />
                      <path
                        d="M -30 85 C 105 115 220 95 335 125 C 480 163 590 220 790 280"
                        stroke="#e5edf6"
                        strokeWidth="5"
                        opacity="0.66"
                      />
                      <path
                        d="M 86 -20 C 145 78 191 142 230 238 C 247 280 266 322 300 380"
                        stroke="#e6edf6"
                        strokeWidth="5"
                        opacity="0.65"
                      />
                      <path
                        d="M 485 -30 C 470 45 487 101 521 150 C 557 203 594 256 620 390"
                        stroke="#e3ebf4"
                        strokeWidth="4"
                        opacity="0.58"
                      />
                    </g>

                    {/* pale river on the right, matching the reference style */}
                    <path
                      d="M 650 -35 C 603 28 622 92 671 126 C 715 157 704 207 677 238 C 645 276 659 323 728 392"
                      fill="none"
                      stroke="#d8ecfb"
                      strokeWidth="34"
                      strokeLinecap="round"
                      opacity="0.72"
                      pointerEvents="none"
                    />
                    <path
                      d="M 650 -35 C 603 28 622 92 671 126 C 715 157 704 207 677 238 C 645 276 659 323 728 392"
                      fill="none"
                      stroke="#cce5f8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.8"
                      pointerEvents="none"
                    />

                    {/* soft halo behind the full zone cluster */}
                    <ellipse
                      cx="380"
                      cy="190"
                      rx="250"
                      ry="150"
                      fill="#7484ff"
                      opacity="0.055"
                      pointerEvents="none"
                    />

                    {zoneMapVisualRows.map(
                      (row, index) => {
                        const selected =
                          activeMapZone === row.zone;

                        return (
                          <g
                            key={row.zone}
                            onClick={() =>
                              setSelectedMapZone(row.zone)
                            }
                            className="cursor-pointer"
                            role="button"
                            aria-label={`${row.zone} ${percentText(
                              row.value
                            )}`}
                          >
                            <path
                              d={row.layout.path}
                              fill={`url(#zone-map-gradient-${index})`}
                              stroke={selected ? '#0f172a' : '#ffffff'}
                              strokeWidth={selected ? 5.5 : 4.5}
                              strokeLinejoin="round"
                              style={{
                                filter: selected
                                  ? 'url(#zoneSelectedShadow)'
                                  : 'url(#zoneSoftShadow)',
                                transition:
                                  'filter .22s ease, opacity .22s ease, stroke .22s ease',
                              }}
                            />

                            <circle
                              cx={row.layout.labelX}
                              cy={row.layout.labelY - 25}
                              r="8"
                              fill="#ffffff"
                              opacity={selected ? 0.95 : 0.72}
                            />

                            <circle
                              cx={row.layout.labelX}
                              cy={row.layout.labelY - 25}
                              r="5"
                              fill={row.dotColor}
                              stroke={
                                row.dotColor === '#ffffff'
                                  ? '#ffffff'
                                  : '#4f46e5'
                              }
                              strokeWidth="1.2"
                            />

                            <text
                              x={row.layout.labelX}
                              y={row.layout.labelY}
                              textAnchor="middle"
                              fontSize="13"
                              fontWeight="800"
                              fill={row.textColor}
                              style={{
                                pointerEvents: 'none',
                              }}
                            >
                              {row.zone.length > 14
                                ? `${row.zone.slice(0, 13)}...`
                                : row.zone}
                            </text>

                            <text
                              x={row.layout.labelX}
                              y={row.layout.labelY + 23}
                              textAnchor="middle"
                              fontSize="17"
                              fontWeight="900"
                              fill={row.textColor}
                              style={{
                                pointerEvents: 'none',
                                letterSpacing: '-0.02em',
                              }}
                            >
                              {percentText(row.value)}
                            </text>
                          </g>
                        );
                      }
                    )}
                  </svg>

                  {zoneModuleMatrix.length > 6 && (
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap justify-center gap-1.5">
                      {zoneModuleMatrix
                        .slice(6)
                        .map((row) => {
                          const zoneRow =
                            zoneRows.find(
                              (item) =>
                                item.label === row.zone
                            );

                          const value = zoneRow
                            ? geoMetric(zoneRow)
                            : null;

                          return (
                            <button
                              key={row.zone}
                              type="button"
                              onClick={() =>
                                setSelectedMapZone(row.zone)
                              }
                              className={`rounded-full border px-2.5 py-1 text-[8px] font-black shadow-sm transition ${activeMapZone === row.zone
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-white/90 bg-white/90 text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
                                }`}
                            >
                              {row.zone} - {percentText(value)}
                            </button>
                          );
                        })}
                    </div>
                  )}

                  <div className="pointer-events-none absolute bottom-3 right-3 hidden rounded-full border border-white/80 bg-white/78 px-2.5 py-1 text-[7px] font-bold text-[#8c99b4] shadow-sm backdrop-blur sm:block">
                    Click a zone for details
                  </div>
                </div>
              )}
            </div>

            {/* ACTIVE ZONE DETAIL */}
            <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[#e1e8f3] bg-white shadow-[0_7px_22px_-18px_rgba(37,99,235,.32)]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#edf1f7] px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,.7)]">
                    <MapPin
                      size={14}
                    />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-black text-[#152a59]">
                      {activeMapZone ||
                        'Select Zone'}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-[8px] font-semibold text-[#8c99b6]">
                      Overall Performance
                      <span className="text-[10px] font-black text-[#243d75]">
                        {percentText(
                          activeMapZoneOverall?.performance
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    !activeMapZoneOverall
                  }
                  onClick={() =>
                    activeMapZoneOverall &&
                    openGeo(
                      activeMapZoneOverall
                    )
                  }
                  className="flex shrink-0 items-center gap-1 rounded-[7px] border border-blue-200 bg-blue-50 px-2 py-1.5 text-[8px] font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  View Zone Details
                  <ChevronRight
                    size={10}
                  />
                </button>
              </div>

              <div className="grid flex-1 content-center grid-cols-2 gap-1.5 p-2.5 sm:grid-cols-3 xl:grid-cols-5">
                {activeMapZoneCells.map(
                  (
                    cell
                  ) => {
                    const visual =
                      MODULE_VISUALS[
                      cell.key
                      ];

                    const value =
                      cell.value;

                    const progress =
                      value ===
                        null
                        ? 0
                        : clamp(
                          value
                        );

                    const itemCount =
                      cell.records.length +
                      cell.employees.length +
                      cell.wards.length;

                    const itemLabel =
                      cell.key ===
                        'ATTENDANCE'
                        ? 'Employees'
                        : cell.key ===
                          'WARD_RANKING'
                          ? 'Wards'
                          : 'Records';

                    const accent =
                      visual?.color ||
                      '#4f46e5';

                    return (
                      <button
                        key={
                          cell.key
                        }
                        type="button"
                        onClick={() =>
                          activeMapZone &&
                          openZoneModuleCell(
                            activeMapZone,
                            cell
                          )
                        }
                        className="group relative min-h-[152px] overflow-hidden rounded-[12px] border border-[#edf1f7] bg-gradient-to-b from-white to-[#fbfcff] px-2 py-2.5 text-center transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_10px_20px_-16px_rgba(79,70,229,.45)]"
                      >
                        <div className="flex min-h-[32px] items-center justify-center gap-1.5">
                          {visual && (
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]"
                              style={{
                                color:
                                  visual.color,
                                background:
                                  visual.soft,
                              }}
                            >
                              {
                                visual.icon
                              }
                            </span>
                          )}

                          <span className="text-left text-[7.5px] font-black leading-[1.1] text-[#34496f]">
                            {
                              cell.label
                            }
                          </span>
                        </div>

                        <div
                          className="relative mx-auto mt-2 flex h-[58px] w-[58px] items-center justify-center rounded-full"
                          style={{
                            background:
                              value ===
                                null
                                ? '#edf1f6'
                                : `conic-gradient(${accent} ${progress *
                                3.6
                                }deg, #e9edf4 0deg)`,
                          }}
                        >
                          <div className="absolute inset-[6px] rounded-full bg-white shadow-[inset_0_1px_5px_rgba(15,23,42,.05)]" />

                          <div
                            className="relative text-[11px] font-black"
                            style={{
                              color:
                                value ===
                                  null
                                  ? '#a6b0c5'
                                  : '#1d3263',
                            }}
                          >
                            {percentText(
                              value
                            )}
                          </div>
                        </div>

                        <div className="mt-1.5 text-[7.5px] font-bold text-[#98a4bd]">
                          {value ===
                            null
                            ? 'No data'
                            : 'Current filter'}
                        </div>

                        <div
                          className="mx-auto mt-2 rounded-[6px] px-2 py-1 text-[7.5px] font-black"
                          style={{
                            background:
                              visual?.soft ||
                              '#f3f4f6',
                            color:
                              visual?.color ||
                              '#4f46e5',
                          }}
                        >
                          {itemLabel}{' '}
                          {itemCount.toLocaleString(
                            'en-IN'
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </section>

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

            siUsers={
              cityUsersByRole.get(
                'QC'
              ) || []
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