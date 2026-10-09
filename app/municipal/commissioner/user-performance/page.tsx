'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import {
  Activity,
  ArrowLeft,
  BarChart3,
  Brush,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Droplet,
  Filter,
  MapPin,
  Recycle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Target,
  Trash2,
  TriangleAlert,
  Trophy,
  Users,
  UsersRound,
  Waves,
  X,
  XCircle,
} from 'lucide-react';

import { RoleGuard } from '@components/Guards';
import UniversalReportModal from '@components/UniversalReportModal';
import { BarComparisonChart, DonutDistributionChart } from '@components/ui/charts/ExecutiveCharts';

import { useAuth } from '@hooks/useAuth';
import {
  CityUserApi,
  GeoApi,
  ModuleRecordsApi,
  type IecPerformance,
  type SiPerformance,
  type DarogaPerformance,
  type UserWorkSummaryResponse,
} from '@lib/apiClient';

import {
  AttendanceApi,
  type AttendanceDashboardResponse,
  type AttendanceEmployeeSummary,
} from '@lib/attendanceApi';
import ModalPortal from "@components/ui/ModalPortal";
import {
  darogaAnalytics,
  darogaScore,
  siAnalytics,
  darogaTier,
  iecScore,
  performanceRangeParams,
  restrictDarogaModules,
  restrictIecModules,
  restrictSiModules,
  siScore,
} from '@lib/userPerformanceScores';


/* =========================================================
   TYPES
========================================================= */

type InspectionModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING' | 'NALA' | 'TASKFORCE';

type UserRoleKey = 'SUPERVISOR' | 'QC' | 'ULB_OFFICER' | 'ACTION_OFFICER' | 'EMPLOYEE';

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

type UserPerformanceRow = {
  key: string;
  id: string | null;
  label: string;

  total: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
  pending: number;

  performance: number | null;
  records: DashboardRecord[];

  attendance: number | null;
  attendanceEmployee: AttendanceEmployeeSummary | null;

  zones: string[];
  wards: string[];
  modules: string[];

  /** Daroga only: required vs completed inspections in the date range. */
  coverage?: DarogaCoverage | null;

  /** Sanitary Inspector only: scope totals and report ids by SI decision. */
  si?: SiPerformance | null;

  /** IEC Member only: action-cycle report ids in scope and who resolved them. */
  iec?: IecPerformance | null;
};


/* =========================================================
   CONFIG
========================================================= */

/*
 * Labels + ordering mirror the canonical role list on the Registered
 * Users Directory (app/portal-home/registered-users/page.tsx), minus
 * the admin-only roles (HMS Super Admin, City Admin, Commissioner)
 * that never act on inspection records and would always show empty.
 */
const ROLES: Array<{ key: UserRoleKey; label: string }> = [
  { key: 'QC', label: 'Sanitary Inspector (SI)' },
  { key: 'ACTION_OFFICER', label: 'IEC Member' },
  { key: 'SUPERVISOR', label: 'Daroga' },
];

const INSPECTION_MODULES: Array<{ key: InspectionModuleKey; label: string }> = [
  { key: 'TOILET', label: 'Cleanliness of Toilets' },
  { key: 'LITTERBINS', label: 'Litter Bins' },
  { key: 'SWEEPING', label: 'Sweeping' },
  { key: 'NALA', label: 'Nala Cleaning' },
  { key: 'TASKFORCE', label: 'GVP Transformation' },
];

const PAGE_SIZE = 10;


/* =========================================================
   PURE HELPERS
   (same formulas as the Executive Dashboard's Daroga
   Performance Directory, so numbers always agree across
   both pages)
========================================================= */

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function calendarMonthsInRange(fromStr: string, toStr: string, maxMonths = 6) {
  if (!fromStr || !toStr) return [];

  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];

  const months: { year: number; month: number }[] = [];
  const cursor = new Date(to.getFullYear(), to.getMonth(), 1);
  const floor = new Date(from.getFullYear(), from.getMonth(), 1);

  while (cursor >= floor && months.length < maxMonths) {
    months.unshift({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return months;
}

function daysInCalendarMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells: Array<{ dateStr: string; day: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ dateStr: toDateInput(new Date(year, month, day)), day });
  }
  return cells;
}

function defaultRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { from: toDateInput(start), to: toDateInput(today) };
}

function normalize(value: any) {
  return String(value || '').trim().toLowerCase();
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function percentText(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `${round1(value)}%`;
}

function positiveColor(value: number) {
  const score = clamp(value);
  const lightness = 96 - score * 0.55;
  return `hsl(239 84% ${lightness}%)`;
}

function averageApplicable(values: Array<number | null | undefined>): number | null {
  const valid = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function effectiveStatus(item: any) {
  if (item?.workspaceStatus) {
    return String(item.workspaceStatus).toUpperCase();
  }

  const actionStatus = String(item?.actionStatus || '').toUpperCase();
  if (actionStatus === 'ACTION_REQUIRED' || actionStatus === 'ACTION_TAKEN') {
    return actionStatus;
  }

  if (
    item?.actionOfficerRespondedAt &&
    String(item?.status || '').toUpperCase() === 'ACTION_REQUIRED'
  ) {
    return 'ACTION_TAKEN';
  }

  const status = String(item?.status || item?.reviewStatus || item?.qcStatus || '').toUpperCase();
  if (['PENDING_QC', 'SUBMITTED', 'IN_PROGRESS'].includes(status)) {
    return 'PENDING';
  }

  return status || 'PENDING';
}

function submittedDate(item: any) {
  return item?.submittedAt || item?.inspectionDate || item?.reportDate || item?.createdAt || item?.visitedAt || null;
}

/* -------- Inspection workflow (same cards as the Commissioner dashboard) -------- */

type WorkflowKey = 'ALL' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'ACTION_REQUIRED' | 'ACTION_TAKEN' | 'PENDING_ACTION';

const WORKFLOW_LABELS: Record<WorkflowKey, string> = {
  ALL: 'Completed Inspection',
  APPROVED: 'Cleaned',
  REJECTED: 'Not Cleaned',
  PENDING: 'Pending Review',
  ACTION_REQUIRED: 'Attention Required',
  ACTION_TAKEN: 'Resolved',
  PENDING_ACTION: 'Resolution Pending',
};

/*
 * The SI's own decision. `status` moves on to ACTION_REQUIRED /
 * ACTION_TAKEN once ULB escalates, so the permanent `qcDecision` wins.
 * Legacy escalated records without a stored decision return 'REVIEWED'.
 */
const DRAWER_PRESETS = [
  ['TODAY', 'Today'],
  ['7D', '7 Days'],
  ['30D', '30 Days'],
  ['MONTH', 'This Month'],
  ['ALL', 'All Time'],
] as const;

const WORKFLOW_CARDS: Array<[WorkflowKey, string]> = [
  ['ALL', 'border-blue-200 bg-blue-50 text-blue-700'],
  ['APPROVED', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
  ['REJECTED', 'border-rose-200 bg-rose-50 text-rose-700'],
  ['PENDING', 'border-amber-200 bg-amber-50 text-amber-700'],
  ['ACTION_REQUIRED', 'border-orange-200 bg-orange-50 text-orange-700'],
  ['ACTION_TAKEN', 'border-teal-200 bg-teal-50 text-teal-700'],
  ['PENDING_ACTION', 'border-cyan-200 bg-cyan-50 text-cyan-700'],
];

const STATUS_DISPLAY: Record<string, string> = {
  APPROVED: 'Cleaned',
  REJECTED: 'Not Cleaned',
  PENDING: 'Pending Review',
  PENDING_QC: 'Pending Review',
  SUBMITTED: 'Pending Review',
  IN_PROGRESS: 'Pending Review',
  ACTION_REQUIRED: 'Attention Required',
  ACTION_TAKEN: 'Resolved',
};

function statusDisplay(status: string) {
  return STATUS_DISPLAY[status] || status.replace(/_/g, ' ');
}

function siDecision(item: any): 'APPROVED' | 'REJECTED' | 'PENDING' | 'REVIEWED' {
  const decision = String(item?.qcDecision || '').toUpperCase();
  if (decision === 'APPROVED' || decision === 'REJECTED') return decision;
  const status = effectiveStatus(item);
  if (status === 'APPROVED' || status === 'REJECTED') return status;
  if (status === 'ACTION_REQUIRED' || status === 'ACTION_TAKEN' || status === 'REVIEWED') return 'REVIEWED';
  // PENDING_QC / SUBMITTED / IN_PROGRESS: not reviewed by the SI yet.
  return 'PENDING';
}

function matchesWorkflow(item: any, key: WorkflowKey) {
  const status = effectiveStatus(item);
  if (status === 'DRAFT') return false;
  switch (key) {
    case 'ALL':
      return true;
    case 'APPROVED':
    case 'REJECTED':
    case 'PENDING':
      return siDecision(item) === key;
    // Raised = everything ULB escalated, whether or not it's resolved yet.
    case 'ACTION_REQUIRED':
      return status === 'ACTION_REQUIRED' || status === 'ACTION_TAKEN';
    case 'ACTION_TAKEN':
      return status === 'ACTION_TAKEN';
    case 'PENDING_ACTION':
      return status === 'ACTION_REQUIRED';
  }
}

/* Daroga required vs completed inspections come from the backend (shared with the Team Leaderboard). */
type DarogaCoverage = DarogaPerformance;

/* -------- Sanitary Inspector (QC) scope and decisions -------- */

type SiBucketKey = 'reports' | 'cleaned' | 'notCleaned' | 'pendingReview' | 'carriedOverPending';

const SI_WORKFLOW_BUCKET: Partial<Record<WorkflowKey, SiBucketKey>> = {
  ALL: 'reports',
  APPROVED: 'cleaned',
  REJECTED: 'notCleaned',
  PENDING: 'pendingReview',
};

/** Report ids are only unique per module, so key them by module. */
function recordKey(record: DashboardRecord) {
  return `${record.dashboardModule}:${record.id}`;
}

function siBucketKeys(si: SiPerformance | null | undefined) {
  const keys: Record<SiBucketKey, Set<string>> = {
    reports: new Set(),
    cleaned: new Set(),
    notCleaned: new Set(),
    pendingReview: new Set(),
    carriedOverPending: new Set(),
  };
  if (!si) return keys;
  INSPECTION_MODULES.forEach(({ key: module }) => {
    (Object.keys(keys) as SiBucketKey[]).forEach((bucket) =>
      (si.modules[module]?.[bucket] || []).forEach((id) => keys[bucket].add(`${module}:${id}`))
    );
  });
  return keys;
}

/* -------- IEC Member (Action Officer) action cycle -------- */

type IecBucketKey = 'attentionRequired' | 'resolved' | 'resolutionPending' | 'carriedOverPending';

const IEC_WORKFLOW_BUCKET: Partial<Record<WorkflowKey, IecBucketKey>> = {
  ACTION_REQUIRED: 'attentionRequired',
  ACTION_TAKEN: 'resolved',
  PENDING_ACTION: 'resolutionPending',
};

function iecBucketKeys(iec: IecPerformance | null | undefined) {
  const keys: Record<IecBucketKey, Set<string>> = {
    attentionRequired: new Set(),
    resolved: new Set(),
    resolutionPending: new Set(),
    carriedOverPending: new Set(),
  };
  if (!iec) return keys;
  INSPECTION_MODULES.forEach(({ key: module }) => {
    (Object.keys(keys) as IecBucketKey[]).forEach((bucket) =>
      (iec.modules[module]?.[bucket] || []).forEach((id) => keys[bucket].add(`${module}:${id}`))
    );
  });
  return keys;
}

/* The API filters on exact timestamps, so send the full local day. */
function rangeStartIso(date?: string) {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}

function rangeEndIso(date?: string) {
  return date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;
}

function recordDate(item: any) {
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

function formatDate(value: any) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getRecordZone(item: any) {
  return String(
    item?.zoneName ||
    item?.bin?.zoneName ||
    item?.toilet?.zoneName ||
    item?.toilet?.ward?.parent?.name ||
    item?.zone?.name ||
    item?.bin?.zone?.name ||
    item?.beat?.zoneName ||
    item?.beat?.zone?.name ||
    ''
  ).trim();
}

function getRecordWard(item: any) {
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

function getRecordTitle(item: DashboardRecord) {
  if (item.dashboardModule === 'TOILET') {
    return item?.toilet?.name || item?.toiletName || item?.name || 'Cleanliness of Toilets';
  }
  if (item.dashboardModule === 'SWEEPING') {
    return item?.beatName || item?.beat?.beatName || item?.areaName || 'Sweeping';
  }
  if (item.dashboardModule === 'NALA') {
    return [item?.nalaName || item?.nala?.nalaName, item?.nalaPointName].filter(Boolean).join(' - ') || 'Nala Cleaning';
  }
  if (item.dashboardModule === 'TASKFORCE') {
    return item?.feederPointName || item?.feederPoint?.feederPointName || item?.areaName || 'GVP';
  }
  return item?.locationName || item?.bin?.locationName || item?.areaName || item?.bin?.areaName || 'Litter Bins';
}

function getRecordAssetId(item: any) {
  return (
    item?.toiletId ||
    item?.toilet?.id ||
    item?.binId ||
    item?.bin?.id ||
    item?.beatId ||
    item?.beat?.id ||
    item?.feederPointId ||
    null
  );
}

/*
 * A Daroga is credited with the reports they submitted. Submitter fields
 * come first: on Sweeping records `supervisor` is the beat segment's
 * current assignee, not the person who filed the report.
 */
function getDarogaName(item: any) {
  return (
    (typeof item?.createdBy === 'string' ? item.createdBy : '') ||
    item?.supervisor?.name ||
    item?.employee?.name ||
    item?.submittedBy?.name ||
    item?.submittedByName ||
    item?.createdBy?.name ||
    item?.payload?.submittedBy?.name ||
    item?.payload?.supervisor?.name ||
    ''
  );
}

function getDarogaId(item: any) {
  return (
    item?.createdById ||
    item?.submittedBy?.id ||
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

function getSiName(item: any) {
  return (
    item?.reviewedBy?.name ||
    item?.qcReviewer?.name ||
    item?.qc?.name ||
    item?.reviewedByName ||
    item?.qcReviewerName ||
    ''
  );
}

function getSiId(item: any) {
  return item?.reviewedBy?.id || item?.reviewedById || item?.qcReviewer?.id || item?.qcId || null;
}

function getIecName(item: any) {
  return (
    item?.actionTakenBy?.name ||
    item?.actionOfficer?.name ||
    item?.actionTakenByName ||
    item?.actionOfficerName ||
    ''
  );
}

function getIecId(item: any) {
  return (
    item?.actionTakenBy?.id ||
    item?.actionTakenById ||
    item?.actionOfficer?.id ||
    item?.actionOfficerId ||
    null
  );
}

function personForRole(item: DashboardRecord, role: UserRoleKey) {
  if (role === 'SUPERVISOR') return getDarogaName(item);
  if (role === 'QC') return getSiName(item);
  if (role === 'ACTION_OFFICER') return getIecName(item);
  return '';
}

function personIdForRole(item: DashboardRecord, role: UserRoleKey) {
  if (role === 'SUPERVISOR') return getDarogaId(item);
  if (role === 'QC') return getSiId(item);
  if (role === 'ACTION_OFFICER') return getIecId(item);
  return null;
}

function inspectionStats(records: DashboardRecord[]) {
  let approved = 0;
  let rejected = 0;
  let actionRequired = 0;
  let actionTaken = 0;
  let pending = 0;

  const applicableRecords = records.filter((item) => effectiveStatus(item) !== 'DRAFT');

  applicableRecords.forEach((item) => {
    const status = effectiveStatus(item);
    if (status === 'APPROVED') approved += 1;
    else if (status === 'REJECTED') rejected += 1;
    else if (status === 'ACTION_REQUIRED') actionRequired += 1;
    else if (status === 'ACTION_TAKEN') actionTaken += 1;
    else pending += 1;
  });

  const total = applicableRecords.length;

  const performance = total > 0 ? ((approved + actionTaken) / total) * 100 : null;

  return { total, approved, rejected, actionRequired, actionTaken, pending, performance };
}

async function loadAllModuleRecords(moduleKey: InspectionModuleKey, from?: string, to?: string): Promise<any[]> {
  if (moduleKey === 'TASKFORCE') {
    return loadAllModuleRecordsStrict(moduleKey, from, to)
      .then((rows) =>
        rows
          // GVP history also lists registrations; only inspection reports count here.
          .filter((row: any) => row.type !== 'FEEDER_POINT')
          // GVP reports carry the SI reviewer as reviewedByQc.
          .map((row: any) => (row.reviewedBy || !row.reviewedByQc ? row : { ...row, reviewedBy: row.reviewedByQc }))
      )
      .catch((err) => {
        console.warn('GVP reports unavailable', err);
        return [];
      });
  }
  if (moduleKey === 'NALA') {
    return loadAllModuleRecordsStrict(moduleKey, from, to).catch((err) => {
      console.warn('Nala reports unavailable', err);
      return [];
    });
  }
  return loadAllModuleRecordsStrict(moduleKey, from, to);
}

async function loadAllModuleRecordsStrict(moduleKey: InspectionModuleKey, from?: string, to?: string) {
  const limit = 1000;

  const first = await ModuleRecordsApi.getRecords(moduleKey, {
    page: 1,
    limit,
    tab: 'HISTORY',
    fromDate: rangeStartIso(from),
    toDate: rangeEndIso(to),
  });

  const firstRows = first.data || [];

  const totalPages = Math.max(
    1,
    first.meta?.totalPages || Math.ceil((first.meta?.total || firstRows.length) / limit)
  );

  if (totalPages <= 1) {
    return firstRows;
  }

  const rows = [...firstRows];
  const batchSize = 5;

  for (let start = 2; start <= totalPages; start += batchSize) {
    const pages = Array.from(
      { length: Math.min(batchSize, totalPages - start + 1) },
      (_, index) => start + index
    );

    const results = await Promise.all(
      pages.map((page) =>
        ModuleRecordsApi.getRecords(moduleKey, {
          page,
          limit,
          tab: 'HISTORY',
          fromDate: rangeStartIso(from),
          toDate: rangeEndIso(to),
        })
      )
    );

    results.forEach((result) => rows.push(...(result.data || [])));
  }

  return rows;
}


/* =========================================================
   RECORD DETAIL DRAWER
========================================================= */

const STATUS_COLORS: Record<string, string> = {
  Approved: '#10b981',
  Rejected: '#f43f5e',
  Cleaned: '#10b981',
  'Not Cleaned': '#f43f5e',
  'Attention Required': '#f59e0b',
  Resolved: '#6366f1',
  Pending: '#94a3b8',
  Present: '#10b981',
  Absent: '#f43f5e',
};

const MODULE_BAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'slate';
}) {
  const toneClass: Record<typeof tone, string> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-600',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    rose: 'border-rose-100 bg-rose-50 text-rose-600',
    amber: 'border-amber-100 bg-amber-50 text-amber-600',
    violet: 'border-violet-100 bg-violet-50 text-violet-600',
    sky: 'border-sky-100 bg-sky-50 text-sky-600',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.08em] opacity-80">{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

type ProcessStep = {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  ring: string;
  bar: string;
  text: string;
  onClick?: () => void;
  hint: string;
};

/** "Inspection Workflow" header + the step-by-step process status card. */
function ProcessStatus({ steps, subtitle, note }: { steps: ProcessStep[]; subtitle: string; note?: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ShieldCheck size={22} />
        </span>
        <div>
          <div className="text-lg font-black leading-tight text-slate-950">Inspection Workflow</div>
          <div className="text-[11px] font-bold text-slate-400">{subtitle}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Activity size={15} className="text-indigo-600" />
          Overall Process Status
        </div>
        <div className="text-[10px] font-bold text-slate-400">{subtitle}</div>

        <div className="mt-4 grid grid-cols-3 gap-y-5 sm:grid-cols-6">
          {steps.map((step, index) => {
            const content = (
              <>
                <span className={`flex h-14 w-14 items-center justify-center rounded-full ring-4 ${step.ring}`}>{step.icon}</span>
                <span className="mt-2 text-[11px] font-black text-slate-800">{step.label}</span>
                <span className={`mt-0.5 text-2xl font-black leading-none ${step.text}`}>{step.value}</span>
                <span className={`mt-1.5 h-1 w-14 rounded-full ${step.bar}`} />
              </>
            );
            return (
              <div key={step.label} className="relative flex items-start justify-center">
                {step.onClick ? (
                  <button
                    type="button"
                    title={step.hint}
                    onClick={step.onClick}
                    className="flex flex-col items-center rounded-xl px-1 transition hover:-translate-y-0.5"
                  >
                    {content}
                  </button>
                ) : (
                  <div title={step.hint} className="flex flex-col items-center px-1">
                    {content}
                  </div>
                )}
                {index < steps.length - 1 && (
                  <ChevronRight size={16} className="absolute -right-2 top-5 hidden text-slate-300 sm:block" />
                )}
              </div>
            );
          })}
        </div>
        {note ? <div className="mt-3 text-[9px] font-semibold text-slate-400">{note}</div> : null}
      </div>
    </section>
  );
}

function UserDetailDrawer({
  row: baseRow,
  roleLabel,
  roleKey,
  fromDate: pageFrom,
  toDate: pageTo,
  loadRowForRange,
  assetsStatus,
  siStatus,
  iecStatus,
  allRecords,
  onClose,
  onOpenRecord,
}: {
  row: UserPerformanceRow;
  roleLabel: string;
  roleKey: UserRoleKey;
  fromDate: string;
  toDate: string;
  loadRowForRange: (rowKey: string, from: string, to: string) => Promise<UserPerformanceRow | null>;
  assetsStatus: 'loading' | 'ready' | 'error';
  siStatus: 'loading' | 'ready' | 'error';
  iecStatus: 'loading' | 'ready' | 'error';
  allRecords: DashboardRecord[];
  onClose: () => void;
  onOpenRecord: (record: DashboardRecord) => void;
}) {
  /*
   * Drawer date filter. Starts on the page's range (reusing its row);
   * any other range reloads records and rebuilds this user's row, so
   * every card, chart, calendar and table below follows it.
   */
  const [draftFrom, setDraftFrom] = useState(pageFrom);
  const [draftTo, setDraftTo] = useState(pageTo);
  const [fromDate, setFromDate] = useState(pageFrom);
  const [toDate, setToDate] = useState(pageTo);
  const [rangeRow, setRangeRow] = useState<UserPerformanceRow | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState(false);
  const usingPageRange = fromDate === pageFrom && toDate === pageTo;

  useEffect(() => {
    setDraftFrom(pageFrom);
    setDraftTo(pageTo);
    setFromDate(pageFrom);
    setToDate(pageTo);
  }, [baseRow.key, pageFrom, pageTo]);

  useEffect(() => {
    setRangeRow(null);
    setRangeError(false);
    if (usingPageRange) {
      setRangeLoading(false);
      return;
    }

    let cancelled = false;
    setRangeLoading(true);
    loadRowForRange(baseRow.key, fromDate, toDate)
      .then((result) => {
        if (!cancelled) setRangeRow(result);
      })
      .catch((error) => {
        console.error('Failed to load records for the selected range', error);
        if (!cancelled) setRangeError(true);
      })
      .finally(() => {
        if (!cancelled) setRangeLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRow.key, fromDate, toDate, usingPageRange]);

  const row: UserPerformanceRow = useMemo(
    () =>
      usingPageRange
        ? baseRow
        : rangeRow || {
            ...baseRow,
            total: 0,
            approved: 0,
            rejected: 0,
            actionRequired: 0,
            actionTaken: 0,
            pending: 0,
            performance: null,
            records: [],
            zones: [],
            wards: [],
            modules: [],
            // Don't keep the previous range's numbers while the new range loads.
            coverage: null,
            si: null,
            iec: null,
          },
    [usingPageRange, baseRow, rangeRow]
  );

  function applyRange(nextFrom: string, nextTo: string) {
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setFromDate(nextFrom);
    setToDate(nextTo);
    setTableFilterDate(null);
  }

  function applyPreset(preset: 'TODAY' | '7D' | '30D' | 'MONTH' | 'ALL') {
    if (preset === 'ALL') {
      applyRange('', '');
      return;
    }
    const today = new Date();
    const start = new Date(today);
    if (preset === '7D') start.setDate(start.getDate() - 6);
    if (preset === '30D') start.setDate(start.getDate() - 29);
    if (preset === 'MONTH') start.setDate(1);
    applyRange(toDateInput(start), toDateInput(today));
  }

  const [tab, setTab] = useState<'charts' | 'calendar' | 'table'>('charts');
  const [workSummary, setWorkSummary] = useState<UserWorkSummaryResponse | null>(null);
  const [workSummaryLoading, setWorkSummaryLoading] = useState(false);
  const [workSummaryError, setWorkSummaryError] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const [tableFilterDate, setTableFilterDate] = useState<string | null>(null);
  const [tableFilterModule, setTableFilterModule] = useState<InspectionModuleKey | null>(null);
  const [tableWorkflowFilter, setTableWorkflowFilter] = useState<WorkflowKey | null>(null);
  const closeTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TOOLTIP_WIDTH = 176;
  const DAROGA_TOOLTIP_WIDTH = 264;
  const TOOLTIP_HEIGHT_ESTIMATE = 130;
  const VIEWPORT_MARGIN = 12;

  function clearCloseTimer() {
    if (closeTooltipTimer.current) {
      clearTimeout(closeTooltipTimer.current);
      closeTooltipTimer.current = null;
    }
  }

  function openTooltip(dateStr: string, target: HTMLElement) {
    clearCloseTimer();
    const rect = target.getBoundingClientRect();

    // A Daroga tooltip is wider and taller (one row per module with a bar).
    const darogaDay = roleKey === 'SUPERVISOR' ? darogaDays.get(dateStr) : isTimedRole ? siDays.get(dateStr) : undefined;
    const width = darogaDay ? DAROGA_TOOLTIP_WIDTH : TOOLTIP_WIDTH;
    const height = darogaDay ? 150 + 38 * Object.keys(darogaDay.modules).length : TOOLTIP_HEIGHT_ESTIMATE;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < height + VIEWPORT_MARGIN * 2 && rect.top > spaceBelow;
    const top = openUpward ? rect.top - VIEWPORT_MARGIN : rect.bottom + VIEWPORT_MARGIN;

    setTooltipPos({ top, left, openUpward });
    setHoverDate(dateStr);
  }

  function scheduleCloseTooltip() {
    clearCloseTimer();
    closeTooltipTimer.current = setTimeout(() => {
      setHoverDate(null);
      setTooltipPos(null);
    }, 150);
  }

  function toggleTooltip(dateStr: string, target: HTMLElement) {
    if (hoverDate === dateStr) {
      clearCloseTimer();
      setHoverDate(null);
      setTooltipPos(null);
    } else {
      openTooltip(dateStr, target);
    }
  }

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (tab !== 'calendar') {
      clearCloseTimer();
      setHoverDate(null);
      setTooltipPos(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    setWorkSummary(null);
    setWorkSummaryError(false);
    setTableFilterDate(null);
    setTableFilterModule(null);
    setTableWorkflowFilter(null);
    setHoverDate(null);
    setTab('charts');

    if (!row.id) return;

    setWorkSummaryLoading(true);
    CityUserApi.workSummary(row.id)
      .then((result) => {
        if (!cancelled) setWorkSummary(result);
      })
      .catch((error) => {
        console.error('Failed to load work summary', error);
        if (!cancelled) {
          setWorkSummary(null);
          setWorkSummaryError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setWorkSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [row.id]);

  const isEmployee = roleKey === 'EMPLOYEE';
  const approvedLabel = 'Cleaned';
  const rejectedLabel = 'Not Cleaned';
  const pendingLabel = 'Pending Review';

  const toiletsCount = workSummary?.assignments.toilets.length ?? null;
  const litterBinsCount = workSummary?.assignments.litterBins.length ?? null;

  const coverage = roleKey === 'SUPERVISOR' ? row.coverage ?? null : null;
  const darogaDays = useMemo(
    () => new Map((coverage?.daily || []).map((day) => [day.date, day])),
    [coverage]
  );
  const darogaStats = useMemo(() => darogaAnalytics(coverage?.daily), [coverage]);
  const darogaTierInfo = darogaTier(row.performance);

  const assignmentText = (count: number | null) =>
    workSummaryLoading ? '…' : workSummaryError ? '—' : (count ?? 0).toLocaleString('en-IN');

  /*
   * Employees aren't reviewers - their inspection-record trail only
   * exists if their name/id can be traced to an asset they clean
   * (a toilet or litter bin assigned to them via work-summary). Once
   * matched, "approved" = found clean, "rejected" = found unclean, so
   * the same STAT CARDS / charts / calendar / table used for reviewer
   * roles can display something meaningful for a field employee too.
   */
  const employeeAssetRecords = useMemo(() => {
    if (!isEmployee || !workSummary) return [];

    const assetIds = new Set<string>();
    const assetNames = new Set<string>();

    [...workSummary.assignments.toilets, ...workSummary.assignments.litterBins].forEach((asset) => {
      if (asset.id) assetIds.add(String(asset.id));
      if (asset.name) assetNames.add(normalize(asset.name));
    });

    if (!assetIds.size && !assetNames.size) return [];

    return allRecords.filter((record) => {
      if (record.dashboardModule !== 'TOILET' && record.dashboardModule !== 'LITTERBINS') return false;
      const assetId = getRecordAssetId(record);
      if (assetId && assetIds.has(String(assetId))) return true;
      const assetName = normalize(getRecordTitle(record));
      return Boolean(assetName) && assetNames.has(assetName);
    });
  }, [isEmployee, workSummary, allRecords]);

  const employeeAssetStats = useMemo(() => inspectionStats(employeeAssetRecords), [employeeAssetRecords]);

  const calendarSourceRecords = isEmployee ? employeeAssetRecords : row.records;
  // A Daroga's calendar tracks when reports were submitted, not when they
  // were last reviewed or actioned.
  const dateOf = (record: DashboardRecord) =>
    roleKey === 'SUPERVISOR' || roleKey === 'QC' || roleKey === 'ACTION_OFFICER'
      ? submittedDate(record)
      : recordDate(record);

  const recentRecords = useMemo(
    () =>
      [...calendarSourceRecords].sort(
        (a, b) => new Date(dateOf(b) || 0).getTime() - new Date(dateOf(a) || 0).getTime()
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendarSourceRecords, roleKey]
  );

  /* -------- Submission Calendar -------- */

  const recordsByDate = useMemo(() => {
    const map = new Map<string, Record<InspectionModuleKey, number> & { total: number }>();

    calendarSourceRecords.forEach((record) => {
      const raw = dateOf(record);
      if (!raw) return;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return;

      const key = toDateInput(parsed);
      const entry = map.get(key) || { TOILET: 0, LITTERBINS: 0, SWEEPING: 0, NALA: 0, TASKFORCE: 0, total: 0 };
      const moduleKey = record.dashboardModule as InspectionModuleKey;
      if (INSPECTION_MODULES.some((module) => module.key === moduleKey)) {
        entry[moduleKey] += 1;
      }
      entry.total += 1;
      map.set(key, entry);
    });

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarSourceRecords, roleKey]);

  const calendarRange = useMemo(() => {
    if (fromDate && toDate) return { from: fromDate, to: toDate };

    const knownDates = Array.from(recordsByDate.keys()).sort();
    if (knownDates.length > 0) {
      return { from: knownDates[0], to: knownDates[knownDates.length - 1] };
    }

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { from: toDateInput(start), to: toDateInput(today) };
  }, [fromDate, toDate, recordsByDate]);

  const calendarMonths = useMemo(
    () => calendarMonthsInRange(calendarRange.from, calendarRange.to),
    [calendarRange]
  );

  const todayStr = useMemo(() => toDateInput(new Date()), []);

  function goToDateTable(dateStr: string, moduleKey: InspectionModuleKey | null) {
    setTableFilterDate(dateStr);
    setTableFilterModule(moduleKey);
    setTableWorkflowFilter(null);
    clearCloseTimer();
    setHoverDate(null);
    setTooltipPos(null);
    setTab('table');
  }

  const tableFilterActive = Boolean(tableFilterDate || tableFilterModule || tableWorkflowFilter);

  const si = roleKey === 'QC' ? row.si ?? null : null;
  const siKeys = useMemo(() => siBucketKeys(si), [si]);
  const iec = roleKey === 'ACTION_OFFICER' ? row.iec ?? null : null;
  const iecKeys = useMemo(() => iecBucketKeys(iec), [iec]);

  // SI and IEC share the same on-time (deadline) model: calendar, module table and analytics.
  const timed = si ?? iec;
  const isTimedRole = roleKey === 'QC' || roleKey === 'ACTION_OFFICER';
  const timedVerb = roleKey === 'QC' ? 'reviewed' : 'resolved';
  const timedArrivedLabel = roleKey === 'QC' ? 'Arrived' : 'Sent to action';
  const timedAvgHours = si ? si.avgTurnaroundHours : iec ? iec.avgResolutionHours : null;
  const siDays = useMemo(() => new Map((timed?.daily || []).map((day) => [day.date, day])), [timed]);
  const siStats = useMemo(() => siAnalytics(timed?.daily), [timed]);
  const timedCountText = (value: number | null | undefined) => (roleKey === 'QC' ? siCountText(value) : iecCountText(value));
  const iecCountText = (value: number | null | undefined) =>
    iecStatus === 'loading' ? '…' : value === null || value === undefined ? '—' : value.toLocaleString('en-IN');

  /** Who resolved this member's reports (a zone can have several IEC members). */
  const iecResolvedBy = useMemo(() => {
    if (!iec) return [];
    const counts = new Map<string | null, number>();
    iecKeys.resolved.forEach((key) => {
      const resolverId = iec.resolvers[key] ?? null;
      counts.set(resolverId, (counts.get(resolverId) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        count,
        name: id ? iec.resolverNames[id] || 'Unknown user' : 'Not recorded',
        self: id === row.id,
      }))
      .sort((a, b) => Number(b.self) - Number(a.self) || b.count - a.count);
  }, [iec, iecKeys, row.id]);

  const siCountText = (value: number | null | undefined) =>
    siStatus === 'loading' ? '…' : value === null || value === undefined ? '—' : value.toLocaleString('en-IN');

  const filteredTableRecords = useMemo(() => {
    if (!tableFilterActive) return recentRecords;
    return recentRecords.filter((record) => {
      if (tableFilterDate) {
        const raw = dateOf(record);
        if (!raw) return false;
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return false;
        if (toDateInput(parsed) !== tableFilterDate) return false;
      }
      if (tableFilterModule && record.dashboardModule !== tableFilterModule) return false;
      if (tableWorkflowFilter) {
        const siBucket = roleKey === 'QC' ? SI_WORKFLOW_BUCKET[tableWorkflowFilter] : undefined;
        const iecBucket = roleKey === 'ACTION_OFFICER' ? IEC_WORKFLOW_BUCKET[tableWorkflowFilter] : undefined;
        if (iecBucket) {
          if (!iecKeys[iecBucket].has(recordKey(record))) return false;
        } else if (siBucket ? !siKeys[siBucket].has(recordKey(record)) : !matchesWorkflow(record, tableWorkflowFilter)) {
          return false;
        }
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentRecords, tableFilterActive, tableFilterDate, tableFilterModule, tableWorkflowFilter, siKeys, iecKeys]);

  /* -------- Inspection Workflow + Module Bifurcation (Daroga / SI) -------- */

  const showWorkflowPanel = roleKey === 'SUPERVISOR' || roleKey === 'QC' || roleKey === 'ACTION_OFFICER';

  const workflowCounts = useMemo(() => {
    const keys: WorkflowKey[] = ['ALL', 'APPROVED', 'REJECTED', 'PENDING', 'ACTION_REQUIRED', 'ACTION_TAKEN', 'PENDING_ACTION'];
    return Object.fromEntries(
      keys.map((key) => [key, row.records.filter((record) => matchesWorkflow(record, key)).length])
    ) as Record<WorkflowKey, number>;
  }, [row.records]);

  const legacyReviewedCount = useMemo(
    () => row.records.filter((record) => effectiveStatus(record) !== 'DRAFT' && siDecision(record) === 'REVIEWED').length,
    [row.records]
  );

  const moduleSummaries = useMemo(
    () =>
      INSPECTION_MODULES.map((module) => {
        const records = row.records.filter(
          (record) => record.dashboardModule === module.key && effectiveStatus(record) !== 'DRAFT'
        );
        const count = (key: WorkflowKey) => records.filter((record) => matchesWorkflow(record, key)).length;

        // Only a Daroga has assigned assets, so only a Daroga has a requirement.
        const moduleCoverage = coverage ? coverage.modules[module.key] || null : null;
        const required = moduleCoverage ? moduleCoverage.required : null;
        const completed = moduleCoverage ? moduleCoverage.completed : records.length;

        if (iec) {
          const buckets = iec.modules[module.key] || { attentionRequired: [], resolved: [], resolutionPending: [], carriedOverPending: [] };
          const stats = iec.moduleStats?.[module.key];
          const due = stats ? stats.onTime + stats.late + stats.overdue : 0;
          return {
            ...module,
            assigned: null,
            required: null,
            // Resolved = reports an IEC member has resolved (on time or late).
            completed: stats ? stats.onTime + stats.late : buckets.resolved.length,
            performance: stats && due ? (stats.onTime / due) * 100 : null,
            workload: due,
            pendingInspection: null,
            reports: stats ? stats.arrived : buckets.attentionRequired.length,
            approved: 0,
            rejected: 0,
            pending: buckets.resolutionPending.length,
            onTime: stats?.onTime ?? 0,
            overdue: stats?.overdue ?? 0,
          };
        }

        if (si) {
          const buckets = si.modules[module.key] || { reports: [], cleaned: [], notCleaned: [], pendingReview: [], carriedOverPending: [] };
          const stats = si.moduleStats?.[module.key];
          const due = stats ? stats.onTime + stats.late + stats.overdue : 0;
          return {
            ...module,
            assigned: null,
            required: null,
            // Reviewed = decisions this SI recorded (on time or late).
            completed: stats ? stats.onTime + stats.late : buckets.cleaned.length + buckets.notCleaned.length,
            performance: stats && due ? (stats.onTime / due) * 100 : null,
            workload: due,
            pendingInspection: null,
            reports: stats ? stats.arrived : buckets.reports.length,
            approved: buckets.cleaned.length,
            rejected: buckets.notCleaned.length,
            pending: buckets.pendingReview.length,
            onTime: stats?.onTime ?? 0,
            overdue: stats?.overdue ?? 0,
          };
        }

        return {
          ...module,
          assigned: moduleCoverage ? moduleCoverage.assigned : null,
          required,
          completed,
          performance: required ? clamp((completed / required) * 100) : null,
          pendingInspection: required !== null ? Math.max(required - completed, 0) : null,
          workload: null,
          reports: records.length,
          approved: count('APPROVED'),
          rejected: count('REJECTED'),
          pending: count('PENDING'),
          onTime: 0,
          overdue: 0,
        };
      }),
    [row.records, coverage, si, iec]
  );

  const assetCountText = (value: number | null | undefined) =>
    assetsStatus === 'loading' ? '…' : value === null || value === undefined ? '—' : value.toLocaleString('en-IN');

  function openWorkflowTable(key: WorkflowKey) {
    setTableFilterDate(null);
    setTableFilterModule(null);
    setTableWorkflowFilter(key);
    setTab('table');
  }

  function openModuleTable(moduleKey: InspectionModuleKey) {
    setTableFilterDate(null);
    setTableWorkflowFilter(null);
    setTableFilterModule(moduleKey);
    setTab('table');
  }

  const headerZones = row.zones.length ? row.zones : (workSummary?.scope.zones || []).map((zone) => zone.name);
  const headerWards = row.wards.length ? row.wards : (workSummary?.scope.wards || []).map((ward) => ward.name);

  const donutTitle =
    roleKey === 'SUPERVISOR'
      ? 'Target Achievement'
      : roleKey === 'ULB_OFFICER'
      ? 'Action Cycle · Raised vs Resolved'
      : roleKey === 'ACTION_OFFICER'
      ? 'On-Time Resolution'
      : roleKey === 'QC'
      ? 'On-Time Review'
      : isEmployee
      ? 'Attendance'
      : 'Status Distribution';

  const donutSegments = useMemo(() => {
    if (isEmployee) {
      return [
        { label: 'Present', value: row.approved, color: STATUS_COLORS.Present },
        { label: 'Absent', value: row.rejected, color: STATUS_COLORS.Absent },
      ];
    }

    if (roleKey === 'ACTION_OFFICER') {
      if (iec) {
        return [
          { label: 'Resolved On Time', value: iec.onTime, color: '#10b981' },
          { label: 'Resolved Late', value: iec.late, color: '#f59e0b' },
          { label: 'Overdue', value: iec.overdue, color: '#f43f5e' },
          { label: 'In Progress', value: iec.inProgress, color: '#94a3b8' },
        ];
      }
      return [
        { label: 'Resolved', value: row.actionTaken, color: STATUS_COLORS.Resolved },
        { label: 'Resolution Pending', value: row.actionRequired, color: STATUS_COLORS['Attention Required'] },
      ];
    }

    if (roleKey === 'ULB_OFFICER') {
      return [
        { label: 'Attention Required', value: row.actionRequired, color: STATUS_COLORS['Attention Required'] },
        { label: 'Resolved', value: row.actionTaken, color: STATUS_COLORS.Resolved },
      ];
    }

    if (roleKey === 'SUPERVISOR') {
      const completed = coverage?.completed ?? 0;
      const pending = Math.max((coverage?.required ?? 0) - completed, 0);
      return [
        { label: 'Target Achieved', value: Math.round(completed), color: STATUS_COLORS.Approved },
        { label: 'Target Missed', value: Math.round(pending), color: STATUS_COLORS.Pending },
      ];
    }

    if (roleKey === 'QC' && si) {
      return [
        { label: 'Reviewed On Time', value: si.onTime, color: '#10b981' },
        { label: 'Reviewed Late', value: si.late, color: '#f59e0b' },
        { label: 'Overdue', value: si.overdue, color: '#f43f5e' },
        { label: 'In Progress', value: si.inProgress, color: '#94a3b8' },
      ];
    }

    return [
      { label: approvedLabel, value: row.approved, color: STATUS_COLORS[approvedLabel] },
      { label: rejectedLabel, value: row.rejected, color: STATUS_COLORS[rejectedLabel] },
      { label: pendingLabel, value: row.pending, color: STATUS_COLORS.Pending },
    ];
  }, [isEmployee, roleKey, row, approvedLabel, rejectedLabel, pendingLabel, coverage, si, iec]);

  const assetCleanlinessSegments = useMemo(
    () => [
      { label: 'Cleaned', value: employeeAssetStats.approved, color: STATUS_COLORS.Approved },
      { label: 'Not Cleaned', value: employeeAssetStats.rejected, color: STATUS_COLORS.Rejected },
      { label: 'Pending Review', value: employeeAssetStats.pending, color: STATUS_COLORS.Pending },
    ],
    [employeeAssetStats]
  );

  const moduleBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    calendarSourceRecords.forEach((record) => {
      const label = record.dashboardModuleLabel || 'Other';
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, value], index) => ({
      label,
      value,
      color: MODULE_BAR_COLORS[index % MODULE_BAR_COLORS.length],
    }));
  }, [calendarSourceRecords]);

  return (
    <ModalPortal><div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[1120px] flex-col overflow-y-auto border-l border-slate-200 bg-[#f8fafc] shadow-[-30px_0_80px_-30px_rgba(15,23,42,.42)]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-600">
                {roleLabel}
              </div>
              <div className="mt-0.5 text-lg font-black tracking-tight text-slate-950">
                {row.label || 'Unnamed User'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-indigo-700">{percentText(row.performance)}</span>
                {roleKey === 'SUPERVISOR' && (
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black ${darogaTierInfo.tone}`}>
                    {darogaTierInfo.label}
                  </span>
                )}
              </div>
              {roleKey === 'SUPERVISOR' && (
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                  Target achievement: credit up to each day&apos;s target / target. Cleaned / Not Cleaned is not part of this score.
                </div>
              )}
              {roleKey === 'ACTION_OFFICER' && (
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                  On-time resolution: reports resolved by the end of the day after they were sent to action / reports whose deadline has
                  passed.
                </div>
              )}
              {roleKey === 'QC' && (
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                  On-time review: reports reviewed by the end of the day after they arrived / reports whose deadline has passed.
                  Cleaned / Not Cleaned does not change this score.
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

          {(headerZones.length > 0 || headerWards.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
              <MapPin size={11} />
              {[...headerZones, ...headerWards].join(', ')}
            </div>
          )}

          {/* STAT CARDS */}
          {!showWorkflowPanel && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {roleKey === 'ULB_OFFICER' && (
              <>
                <StatTile
                  label={roleKey === 'ULB_OFFICER' ? 'Total In Jurisdiction' : 'Total Action Items'}
                  value={row.total.toLocaleString('en-IN')}
                  icon={<Activity size={13} />}
                  tone="slate"
                />

                <div className="col-span-2 mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 sm:col-span-3">
                  Action Cycle
                </div>
                <StatTile
                  label={roleKey === 'ULB_OFFICER' ? 'Attention Required' : 'Resolution Pending'}
                  value={row.actionRequired.toLocaleString('en-IN')}
                  icon={<ShieldCheck size={13} />}
                  tone="amber"
                />
                <StatTile
                  label="Resolved"
                  value={row.actionTaken.toLocaleString('en-IN')}
                  icon={<CheckCircle2 size={13} />}
                  tone="violet"
                />
                <StatTile
                  label={roleKey === 'ULB_OFFICER' ? 'Flag Rate' : 'Resolution Rate'}
                  value={percentText(row.performance)}
                  icon={<Activity size={13} />}
                  tone="emerald"
                />
              </>
            )}

            {roleKey === 'EMPLOYEE' && (
              <>
                <StatTile label="Total Days" value={row.total.toLocaleString('en-IN')} icon={<Activity size={13} />} tone="slate" />
                <StatTile label="Present Days" value={row.approved.toLocaleString('en-IN')} icon={<CheckCircle2 size={13} />} tone="emerald" />
                <StatTile label="Absent Days" value={row.rejected.toLocaleString('en-IN')} icon={<XCircle size={13} />} tone="rose" />
                <StatTile
                  label="Assigned Toilets"
                  value={assignmentText(toiletsCount)}
                  icon={<Droplet size={13} />}
                  tone="sky"
                />
                <StatTile
                  label="Assigned Litter Bins"
                  value={assignmentText(litterBinsCount)}
                  icon={<Trash2 size={13} />}
                  tone="emerald"
                />

                {employeeAssetRecords.length > 0 && (
                  <>
                    <div className="col-span-2 mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 sm:col-span-3">
                      Asset Inspection Results
                    </div>
                    <StatTile
                      label="Cleaned"
                      value={employeeAssetStats.approved.toLocaleString('en-IN')}
                      icon={<CheckCircle2 size={13} />}
                      tone="emerald"
                    />
                    <StatTile
                      label="Not Cleaned"
                      value={employeeAssetStats.rejected.toLocaleString('en-IN')}
                      icon={<XCircle size={13} />}
                      tone="rose"
                    />
                  </>
                )}
              </>
            )}
          </div>
          )}
        </div>

        {showWorkflowPanel && (
          <div className="space-y-4 border-b border-slate-200 px-6 py-5">
            {/* DATE FILTER - applies to the whole drawer */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-end gap-2">
                <div className="mr-auto">
                  <div className="text-sm font-black text-slate-950">Date Range</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                    {fromDate && toDate ? `${formatDate(fromDate)} – ${formatDate(toDate)}` : 'All time'}
                    {rangeLoading && <span className="ml-2 text-indigo-600">Loading…</span>}
                    {rangeError && <span className="ml-2 text-rose-600">Couldn&apos;t load this range.</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {DRAWER_PRESETS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      disabled={rangeLoading}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">From</span>
                  <input
                    type="date"
                    value={draftFrom}
                    max={draftTo || undefined}
                    onChange={(event) => setDraftFrom(event.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">To</span>
                  <input
                    type="date"
                    value={draftTo}
                    min={draftFrom || undefined}
                    onChange={(event) => setDraftTo(event.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => applyRange(draftFrom, draftTo)}
                  disabled={rangeLoading || Boolean(draftFrom && draftTo && draftFrom > draftTo)}
                  className="h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 text-[10px] font-black text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  Apply
                </button>
                {!usingPageRange && (
                  <button
                    type="button"
                    onClick={() => applyRange(pageFrom, pageTo)}
                    disabled={rangeLoading}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </section>

            {/* INSPECTION WORKFLOW (Daroga) */}
            {roleKey === 'SUPERVISOR' && (() => {
              const assignedTotal = coverage
                ? Object.values(coverage.modules).reduce((sum, entry) => sum + (entry?.assigned ?? 0), 0)
                : null;
              const roundOrNull = (value: number | null | undefined) =>
                value === null || value === undefined ? value : Math.round(value);

              const steps: Array<{
                label: string;
                value: React.ReactNode;
                icon: React.ReactNode;
                ring: string;
                bar: string;
                text: string;
                onClick?: () => void;
                hint: string;
              }> = [
                {
                  label: 'Assigned',
                  value: assetCountText(assignedTotal),
                  icon: <ClipboardList size={22} />,
                  ring: 'bg-blue-50 text-blue-600 ring-blue-100',
                  bar: 'bg-blue-200',
                  text: 'text-blue-700',
                  hint: 'Assets assigned to this Daroga',
                },
                {
                  label: 'Target',
                  value: assetCountText(roundOrNull(coverage?.required)),
                  icon: <Target size={22} />,
                  ring: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
                  bar: 'bg-emerald-200',
                  text: 'text-emerald-700',
                  hint: 'Admin target; where none is set, every assigned asset every day',
                },
                {
                  label: 'Inspected',
                  value: assetCountText(coverage ? Math.round(coverage.completed) : null),
                  icon: <Search size={22} />,
                  ring: 'bg-violet-50 text-violet-600 ring-violet-100',
                  bar: 'bg-violet-200',
                  text: 'text-violet-700',
                  onClick: () => openWorkflowTable('ALL'),
                  hint: 'Inspections counted toward the target. Click to see records.',
                },
                {
                  label: 'Cleaned',
                  value: workflowCounts.APPROVED.toLocaleString('en-IN'),
                  icon: <Sparkles size={22} />,
                  ring: 'bg-sky-50 text-sky-600 ring-sky-100',
                  bar: 'bg-sky-200',
                  text: 'text-sky-700',
                  onClick: () => openWorkflowTable('APPROVED'),
                  hint: 'Reports the SI found clean',
                },
                {
                  label: 'Not Cleaned',
                  value: workflowCounts.REJECTED.toLocaleString('en-IN'),
                  icon: <TriangleAlert size={22} />,
                  ring: 'bg-orange-50 text-orange-500 ring-orange-100',
                  bar: 'bg-orange-200',
                  text: 'text-orange-600',
                  onClick: () => openWorkflowTable('REJECTED'),
                  hint: 'Reports the SI found not clean',
                },
                {
                  label: 'Pending Review',
                  value: workflowCounts.PENDING.toLocaleString('en-IN'),
                  icon: <Clock size={22} />,
                  ring: 'bg-rose-50 text-rose-500 ring-rose-100',
                  bar: 'bg-rose-200',
                  text: 'text-rose-600',
                  onClick: () => openWorkflowTable('PENDING'),
                  hint: 'Reports waiting for SI review',
                },
              ];

              return <ProcessStatus steps={steps} subtitle="From assignment to review status" />;
            })()}

            {/* INSPECTION WORKFLOW (SI) */}
            {roleKey === 'QC' && (() => {
              const cohortTotal = (key: 'arrived' | 'onTime' | 'late' | 'overdue' | 'inProgress') =>
                si ? Object.values(si.moduleStats || {}).reduce((sum, entry) => sum + (entry?.[key] ?? 0), 0) : null;
              const steps: ProcessStep[] = [
                {
                  label: 'Reports Received',
                  value: siCountText(cohortTotal('arrived')),
                  icon: <ClipboardList size={22} />,
                  ring: 'bg-blue-50 text-blue-600 ring-blue-100',
                  bar: 'bg-blue-200',
                  text: 'text-blue-700',
                  onClick: () => openWorkflowTable('ALL'),
                  hint: 'Reports that arrived in this SI scope during the range. Click to see records.',
                },
                {
                  label: 'Reviewed',
                  value: siCountText(si ? (cohortTotal('onTime') ?? 0) + (cohortTotal('late') ?? 0) : null),
                  icon: <Search size={22} />,
                  ring: 'bg-violet-50 text-violet-600 ring-violet-100',
                  bar: 'bg-violet-200',
                  text: 'text-violet-700',
                  hint: 'Reports this SI has reviewed (on time or late)',
                },
                {
                  label: 'On Time',
                  value: siCountText(si?.onTime),
                  icon: <CheckCircle2 size={22} />,
                  ring: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
                  bar: 'bg-emerald-200',
                  text: 'text-emerald-700',
                  hint: 'Reviewed by the end of the day after the report arrived',
                },
                {
                  label: 'Cleaned',
                  value: siCountText(si ? siKeys.cleaned.size : null),
                  icon: <Sparkles size={22} />,
                  ring: 'bg-sky-50 text-sky-600 ring-sky-100',
                  bar: 'bg-sky-200',
                  text: 'text-sky-700',
                  onClick: () => openWorkflowTable('APPROVED'),
                  hint: 'Reports this SI found clean',
                },
                {
                  label: 'Not Cleaned',
                  value: siCountText(si ? siKeys.notCleaned.size : null),
                  icon: <TriangleAlert size={22} />,
                  ring: 'bg-orange-50 text-orange-500 ring-orange-100',
                  bar: 'bg-orange-200',
                  text: 'text-orange-600',
                  onClick: () => openWorkflowTable('REJECTED'),
                  hint: 'Reports this SI found not clean',
                },
                {
                  label: 'Overdue',
                  value: siCountText(si?.overdue),
                  icon: <Clock size={22} />,
                  ring: 'bg-rose-50 text-rose-500 ring-rose-100',
                  bar: 'bg-rose-200',
                  text: 'text-rose-600',
                  onClick: () => openWorkflowTable('PENDING'),
                  hint: 'Past the review deadline and still waiting',
                },
              ];
              return (
                <ProcessStatus
                  steps={steps}
                  subtitle="From report arrival to review"
                  note={
                    si && si.backlogOverdue > 0
                      ? `${si.backlogOverdue.toLocaleString('en-IN')} overdue reports arrived before this date range (older backlog).`
                      : undefined
                  }
                />
              );
            })()}

            {/* INSPECTION WORKFLOW (IEC) */}
            {roleKey === 'ACTION_OFFICER' && (() => {
              const cohortTotal = (key: 'arrived' | 'onTime' | 'late' | 'overdue' | 'inProgress') =>
                iec ? Object.values(iec.moduleStats || {}).reduce((sum, entry) => sum + (entry?.[key] ?? 0), 0) : null;
              const steps: ProcessStep[] = [
                {
                  label: 'Sent To Action',
                  value: iecCountText(cohortTotal('arrived')),
                  icon: <ClipboardList size={22} />,
                  ring: 'bg-blue-50 text-blue-600 ring-blue-100',
                  bar: 'bg-blue-200',
                  text: 'text-blue-700',
                  onClick: () => openWorkflowTable('ACTION_REQUIRED'),
                  hint: 'Reports ULB sent to action in this IEC scope during the range. Click to see records.',
                },
                {
                  label: 'Resolved',
                  value: iecCountText(iec ? iecKeys.resolved.size : null),
                  icon: <CheckCircle2 size={22} />,
                  ring: 'bg-violet-50 text-violet-600 ring-violet-100',
                  bar: 'bg-violet-200',
                  text: 'text-violet-700',
                  onClick: () => openWorkflowTable('ACTION_TAKEN'),
                  hint: 'Reports already resolved (by any IEC member of the zone)',
                },
                {
                  label: 'On Time',
                  value: iecCountText(iec?.onTime),
                  icon: <Target size={22} />,
                  ring: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
                  bar: 'bg-emerald-200',
                  text: 'text-emerald-700',
                  hint: 'Resolved by the end of the day after the report was sent to action',
                },
                {
                  label: 'Resolved Late',
                  value: iecCountText(iec?.late),
                  icon: <TriangleAlert size={22} />,
                  ring: 'bg-orange-50 text-orange-500 ring-orange-100',
                  bar: 'bg-orange-200',
                  text: 'text-orange-600',
                  hint: 'Resolved, but after the deadline',
                },
                {
                  label: 'Overdue',
                  value: iecCountText(iec?.overdue),
                  icon: <Clock size={22} />,
                  ring: 'bg-rose-50 text-rose-500 ring-rose-100',
                  bar: 'bg-rose-200',
                  text: 'text-rose-600',
                  onClick: () => openWorkflowTable('PENDING_ACTION'),
                  hint: 'Past the deadline and still unresolved',
                },
                {
                  label: 'Inside Deadline',
                  value: iecCountText(iec?.inProgress),
                  icon: <Search size={22} />,
                  ring: 'bg-slate-50 text-slate-500 ring-slate-100',
                  bar: 'bg-slate-200',
                  text: 'text-slate-600',
                  hint: 'Not resolved yet but the deadline has not passed: not counted in the score',
                },
              ];
              return (
                <ProcessStatus
                  steps={steps}
                  subtitle="From action request to resolution"
                  note={
                    iec ? (
                      <div className="space-y-1.5">
                        <div>
                          Darogas in scope: <strong>{iecCountText(iec.darogas)}</strong>
                          {iec.backlogOverdue > 0
                            ? ` · ${iec.backlogOverdue.toLocaleString('en-IN')} overdue reports were sent before this date range (older backlog).`
                            : ''}
                          {iec.estimated > 0
                            ? ` · ${iec.estimated.toLocaleString('en-IN')} reports were sent to action before the time started being recorded, so their report time is used instead.`
                            : ''}
                        </div>
                        {iecResolvedBy.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-black uppercase tracking-wide">Resolved by</span>
                            {iecResolvedBy.map((resolver) => (
                              <span
                                key={resolver.id || 'unknown'}
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${
                                  resolver.self
                                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                                    : resolver.id
                                    ? 'border-slate-200 bg-white text-slate-700'
                                    : 'border-dashed border-slate-300 bg-white text-slate-400'
                                }`}
                              >
                                {resolver.name}
                                {resolver.self ? ' (self)' : ''} · {resolver.count.toLocaleString('en-IN')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : undefined
                  }
                />
              );
            })()}

            {/* MODULE BIFURCATION */}
            <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-black text-slate-950">Module Bifurcation</div>
              {roleKey === 'SUPERVISOR' && (
                <div className="mb-3 mt-1 text-[10px] font-bold leading-relaxed text-slate-500">
                  <strong className="text-blue-600">Total Target</strong> = assets assigned x days in the range (or the admin&apos;s daily target on days one is set).{' '}
                  <strong className="text-emerald-600">Inspections Done</strong> = assets inspected, counted once per day and never above that day&apos;s target.{' '}
                  <strong className="text-rose-600">Missed</strong> = Total Target - Inspections Done.
                </div>
              )}
              {roleKey === 'ACTION_OFFICER' && (
                <div className="mb-3 mt-1 text-[10px] font-bold leading-relaxed text-slate-500">
                  <strong className="text-blue-600">Sent To Action</strong> = reports ULB sent to action in this IEC scope.{' '}
                  <strong className="text-emerald-600">On Time</strong> = resolved by the end of the day after they were sent.{' '}
                  <strong className="text-rose-600">Overdue</strong> = deadline passed and still unresolved. Completion = On Time / (On Time + Late + Overdue).
                  Reports still inside the deadline are not counted yet.
                </div>
              )}
              {roleKey === 'QC' && (
                <div className="mb-3 mt-1 text-[10px] font-bold leading-relaxed text-slate-500">
                  <strong className="text-blue-600">Reports Received</strong> = reports that arrived in this SI&apos;s scope.{' '}
                  <strong className="text-emerald-600">On Time</strong> = reviewed by the end of the day after the report arrived.{' '}
                  <strong className="text-rose-600">Overdue</strong> = deadline passed and still waiting. Completion = On Time / (On Time + Late + Overdue).
                  Reports still inside the deadline are not counted yet.
                </div>
              )}
              {(roleKey === 'SUPERVISOR' || roleKey === 'QC' || roleKey === 'ACTION_OFFICER') && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-[minmax(150px,1.6fr)_minmax(120px,1.6fr)_repeat(4,minmax(64px,1fr))] items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[10px] font-black text-slate-500">
                    <div>Module</div>
                    <div>Completion</div>
                    {isTimedRole ? (
                      <>
                        <div className="text-center">{roleKey === 'QC' ? 'Reports Received' : 'Sent To Action'}</div>
                        <div className="text-center">{roleKey === 'QC' ? 'Reviewed' : 'Resolved'}</div>
                        <div className="text-center">On Time</div>
                        <div className="text-center">Overdue</div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">Assets Assigned</div>
                        <div className="text-center">
                          Total Target
                          {coverage?.days ? <span className="block text-[8px] font-bold text-slate-400">{coverage.days.toLocaleString('en-IN')} {coverage.days === 1 ? 'day' : 'days'}</span> : null}
                        </div>
                        <div className="text-center">Inspections Done</div>
                        <div className="text-center">Missed</div>
                      </>
                    )}
                  </div>

                  {moduleSummaries.map((module) => {
                    const visual: Record<InspectionModuleKey, { icon: React.ReactNode; tone: string }> = {
                      TOILET: { icon: <Droplet size={15} />, tone: 'bg-blue-50 text-blue-600' },
                      LITTERBINS: { icon: <Trash2 size={15} />, tone: 'bg-emerald-50 text-emerald-600' },
                      SWEEPING: { icon: <Brush size={15} />, tone: 'bg-orange-50 text-orange-500' },
                      NALA: { icon: <Waves size={15} />, tone: 'bg-sky-50 text-sky-600' },
                      TASKFORCE: { icon: <Recycle size={15} />, tone: 'bg-green-50 text-green-600' },
                    };
                    const percent = module.performance;
                    const barColor =
                      percent === null || percent === undefined
                        ? '#cbd5e1'
                        : percent >= 99.995
                        ? '#10b981'
                        : percent >= 50
                        ? '#6366f1'
                        : '#f43f5e';
                    const numberText = (value: number | null | undefined) =>
                      assetCountText(value === null || value === undefined ? value : Math.round(value));

                    return (
                      <button
                        key={module.key}
                        type="button"
                        onClick={() => openModuleTable(module.key)}
                        className={`grid w-full grid-cols-[minmax(150px,1.6fr)_minmax(120px,1.6fr)_repeat(4,minmax(64px,1fr))] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-indigo-50/40 ${
                          tab === 'table' && tableFilterModule === module.key && !tableFilterDate ? 'bg-indigo-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${visual[module.key].tone}`}>
                            {visual[module.key].icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-black text-slate-900">{module.label}</span>
                            {(() => {
                              if (isTimedRole) {
                                const stats = timed?.moduleStats?.[module.key];
                                return stats && stats.inProgress > 0 ? (
                                  <span className="block text-[9px] font-bold text-slate-400">
                                    {stats.inProgress.toLocaleString('en-IN')} still inside the deadline
                                  </span>
                                ) : null;
                              }
                              const days = coverage?.days;
                              if (!days || module.assigned === null || module.required === null || module.required === undefined) return null;
                              const expected = module.assigned * days;
                              const lowered = Math.round(expected - module.required);
                              return (
                                <span className="block text-[9px] font-bold text-slate-400">
                                  {module.assigned} x {days} = {expected}
                                  {lowered > 0 ? ` · admin target lowered by ${lowered}` : ''}
                                </span>
                              );
                            })()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${clamp(percent ?? 0)}%`, background: barColor }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-[10px] font-black text-slate-600">
                            {percent === null || percent === undefined ? '—' : `${Math.round(percent)}%`}
                          </span>
                        </div>

                        {isTimedRole ? (
                          <>
                            <div className="text-center text-xs font-black text-slate-700">{timedCountText(timed ? module.reports : null)}</div>
                            <div className="rounded-lg bg-blue-50 py-1.5 text-center text-sm font-black text-blue-600">
                              {timedCountText(timed ? module.completed : null)}
                            </div>
                            <div className="rounded-lg bg-emerald-50 py-1.5 text-center text-sm font-black text-emerald-600">
                              {timedCountText(timed ? module.onTime : null)}
                            </div>
                            <div className="rounded-lg bg-rose-50 py-1.5 text-center text-sm font-black text-rose-600">
                              {timedCountText(timed ? module.overdue : null)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center text-xs font-black text-slate-700">{numberText(module.assigned)}</div>
                            <div className="rounded-lg bg-blue-50 py-1.5 text-center text-sm font-black text-blue-600">
                              {numberText(module.required)}
                            </div>
                            <div className="rounded-lg bg-emerald-50 py-1.5 text-center text-sm font-black text-emerald-600">
                              {coverage ? numberText(module.completed) : assetCountText(null)}
                            </div>
                            <div className="rounded-lg bg-rose-50 py-1.5 text-center text-sm font-black text-rose-600">
                              {numberText(module.pendingInspection)}
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TABS */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setTab('charts')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-black transition sm:text-[11px] ${
              tab === 'charts'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={13} />
            Charts &amp; Breakdown
          </button>

          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-black transition sm:text-[11px] ${
              tab === 'calendar'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <CalendarDays size={13} />
            Calendar
          </button>

          <button
            type="button"
            onClick={() => setTab('table')}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-black transition sm:text-[11px] ${
              tab === 'table'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Table2 size={13} />
            Data Table
          </button>
        </div>

        <div className="px-6 py-5">
          {tab === 'charts' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {donutTitle}
                </div>
                {roleKey === 'SUPERVISOR' && assetsStatus === 'loading' ? (
                  <div className="flex h-32 items-center justify-center text-xs font-bold text-slate-400">
                    Loading assigned assets…
                  </div>
                ) : roleKey === 'SUPERVISOR' && (assetsStatus === 'error' || !coverage) ? (
                  <div className="flex h-32 items-center justify-center text-xs font-bold text-rose-500">
                    Couldn&apos;t load assigned assets for this Daroga.
                  </div>
                ) : roleKey === 'SUPERVISOR' && coverage?.days === null ? (
                  <div className="flex h-32 items-center justify-center text-xs font-bold text-slate-400">
                    Pick a date range to see required inspections.
                  </div>
                ) : roleKey === 'SUPERVISOR' && !coverage?.required ? (
                  <div className="flex h-32 items-center justify-center text-center text-xs font-bold text-slate-400">
                    No beats, toilets or litter bins are assigned to this Daroga,
                    <br />
                    so coverage can&apos;t be calculated.
                  </div>
                ) : donutSegments.every((segment) => segment.value === 0) ? (
                  <div className="flex h-32 items-center justify-center text-xs font-bold text-slate-400">
                    No records in the selected range.
                  </div>
                ) : (
                  <DonutDistributionChart segments={donutSegments} size={190} strokeWidth={20} />
                )}
              </div>

              {roleKey === 'SUPERVISOR' && coverage && coverage.days !== null && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatTile label="Days Target Met" value={`${darogaStats.daysMet}/${darogaStats.daysWithTarget}`} icon={<CheckCircle2 size={13} />} tone="emerald" />
                    <StatTile label="Consistency" value={percentText(darogaStats.consistency)} icon={<Activity size={13} />} tone="blue" />
                    <StatTile label="Current Streak" value={`${darogaStats.currentStreak} d`} icon={<Trophy size={13} />} tone="amber" />
                    <StatTile label="Longest Streak" value={`${darogaStats.longestStreak} d`} icon={<Trophy size={13} />} tone="violet" />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Weekday Pattern · Target achieved
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {WEEKDAY_LABELS.map((label, index) => {
                        const value = darogaStats.weekday[index];
                        return (
                          <div key={label} className="flex flex-col items-center gap-1">
                            <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                              <div
                                className="w-full rounded-lg"
                                style={{
                                  height: `${clamp(value ?? 0)}%`,
                                  background: value === null ? 'transparent' : value >= 99.995 ? '#10b981' : value >= 80 ? '#3b82f6' : '#f43f5e',
                                }}
                              />
                            </div>
                            <div className="text-[9px] font-black text-slate-700">{value === null ? '-' : `${Math.round(value)}%`}</div>
                            <div className="text-[8px] font-black uppercase text-slate-400">{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Ward &amp; Module Targets
                    </div>
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-slate-50 text-[8px] font-black uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-2">Module</th>
                          <th className="px-4 py-2">Ward</th>
                          <th className="px-4 py-2 text-right">Assigned</th>
                          <th className="px-4 py-2 text-right">Target</th>
                          <th className="px-4 py-2 text-right">Achieved</th>
                          <th className="px-4 py-2 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {coverage.rows.map((entry) => (
                          <tr key={`${entry.module}-${entry.wardId}`}>
                            <td className="px-4 py-2 font-black text-slate-800">
                              {INSPECTION_MODULES.find((module) => module.key === entry.module)?.label || entry.module}
                            </td>
                            <td className="px-4 py-2 font-bold text-slate-600">{entry.wardName}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-slate-600">{entry.assigned}</td>
                            <td className="px-4 py-2 text-right font-black text-slate-900">{Math.round(entry.target)}</td>
                            <td className="px-4 py-2 text-right font-black text-slate-900">{Math.round(entry.credit)}</td>
                            <td className="px-4 py-2 text-right font-black text-slate-900">
                              {entry.target > 0 ? percentText(clamp((entry.credit / entry.target) * 100)) : '-'}
                            </td>
                          </tr>
                        ))}
                        {coverage.rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center font-bold text-slate-400">
                              No assets assigned to this Daroga.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {isTimedRole && timed && (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatTile
                      label={roleKey === 'QC' ? 'Avg Turnaround' : 'Avg Resolution Time'}
                      value={timedAvgHours === null ? '—' : `${Math.round(timedAvgHours * 10) / 10} h`}
                      icon={<Clock size={13} />}
                      tone="blue"
                    />
                    <StatTile
                      label="Oldest Pending"
                      value={timed.oldestPendingDays === null ? '—' : `${timed.oldestPendingDays} d`}
                      icon={<TriangleAlert size={13} />}
                      tone="rose"
                    />
                    <StatTile
                      label="Days All On Time"
                      value={`${siStats.daysAllOnTime}/${siStats.daysTracked}`}
                      icon={<CheckCircle2 size={13} />}
                      tone="emerald"
                    />
                    <StatTile label="Current Streak" value={`${siStats.currentStreak} d`} icon={<Trophy size={13} />} tone="amber" />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Weekday Pattern · {roleKey === 'QC' ? 'Reviewed' : 'Resolved'} on time (by {roleKey === 'QC' ? 'arrival' : 'action'} day)
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {WEEKDAY_LABELS.map((label, index) => {
                        const value = siStats.weekday[index];
                        return (
                          <div key={label} className="flex flex-col items-center gap-1">
                            <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100">
                              <div
                                className="w-full rounded-lg"
                                style={{
                                  height: `${clamp(value ?? 0)}%`,
                                  background: value === null ? 'transparent' : value >= 99.995 ? '#10b981' : value >= 50 ? '#6366f1' : '#f43f5e',
                                }}
                              />
                            </div>
                            <div className="text-[9px] font-black text-slate-700">{value === null ? '-' : `${Math.round(value)}%`}</div>
                            <div className="text-[8px] font-black uppercase text-slate-400">{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {roleKey === 'QC' ? 'Pending Reviews' : 'Pending Resolutions'} · how long they have waited
                    </div>
                    {(() => {
                      const buckets: Array<[string, number, string]> = [
                        ['0-1 days', timed.backlogAging.d0to1, '#6366f1'],
                        ['2-3 days', timed.backlogAging.d2to3, '#f59e0b'],
                        ['4-7 days', timed.backlogAging.d4to7, '#f97316'],
                        ['8+ days', timed.backlogAging.d8plus, '#f43f5e'],
                      ];
                      const max = Math.max(...buckets.map(([, count]) => count), 1);
                      const total = buckets.reduce((sum, [, count]) => sum + count, 0);
                      if (total === 0) {
                        return <div className="py-3 text-xs font-bold text-emerald-600">Nothing is waiting for this {roleKey === 'QC' ? 'SI' : 'IEC member'}.</div>;
                      }
                      return (
                        <div className="space-y-2">
                          {buckets.map(([label, count, color]) => (
                            <div key={label} className="flex items-center gap-3">
                              <div className="w-16 shrink-0 text-[10px] font-black text-slate-500">{label}</div>
                              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: color }} />
                              </div>
                              <div className="w-8 shrink-0 text-right text-[11px] font-black text-slate-800">{count}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {!isEmployee && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Module Breakdown
                  </div>
                  {moduleBreakdown.length > 0 ? (
                    <BarComparisonChart items={moduleBreakdown} />
                  ) : (
                    <div className="flex h-20 items-center justify-center text-xs font-bold text-slate-400">
                      No module activity in the selected range.
                    </div>
                  )}
                </div>
              )}

              {isEmployee && employeeAssetRecords.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    Asset Cleanliness · Toilets &amp; Litter Bins
                  </div>
                  <DonutDistributionChart segments={assetCleanlinessSegments} size={190} strokeWidth={20} />
                </div>
              )}
            </div>
          )}

          {tab === 'calendar' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500">
                  {isTimedRole ? (
                    <>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> All {timedVerb} on time</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> 50-99% on time</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Under 50% on time</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border-2 border-indigo-600 bg-white" /> Still inside deadline</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-100" /> {roleKey === 'QC' ? 'No reports arrived' : 'Nothing sent to action'}</span>
                    </>
                  ) : roleKey === 'SUPERVISOR' ? (
                    <>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Target met</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> 50-99% done</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Under 50%</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border-2 border-indigo-600 bg-white" /> Today (in progress)</span>
                      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-100" /> Nothing assigned</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5">
                        <i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Report submitted
                      </span>
                      <span className="flex items-center gap-1.5">
                        <i className="h-2.5 w-2.5 rounded-sm border border-rose-200 bg-rose-100" /> No report
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-50" /> Outside range
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  {roleKey === 'SUPERVISOR' || isTimedRole ? 'Hover a date for the module split' : 'Hover a green date for the module breakdown'}
                </span>
              </div>

              {calendarMonths.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-400">
                  No date range available to build a calendar.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {calendarMonths.map(({ year, month }) => (
                    <div key={`${year}-${month}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700">
                        {new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black uppercase text-slate-400">
                        {WEEKDAY_LABELS.map((weekday) => (
                          <div key={weekday} className="py-1">
                            {weekday}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {daysInCalendarMonth(year, month).map((cell, index) => {
                          if (!cell) return <div key={`blank-${index}`} />;

                          const inRange = cell.dateStr >= calendarRange.from && cell.dateStr <= calendarRange.to;
                          const isFuture = cell.dateStr > todayStr;
                          const entry = recordsByDate.get(cell.dateStr);
                          const hasReports = Boolean(entry && entry.total > 0);
                          const active = inRange && !isFuture;

                          const darogaDay = roleKey === 'SUPERVISOR' ? darogaDays.get(cell.dateStr) : undefined;
                          const hasTarget = Boolean(darogaDay && darogaDay.target > 0);
                          const ratio = darogaDay && darogaDay.target > 0 ? darogaDay.credit / darogaDay.target : 0;
                          const siDay = isTimedRole ? siDays.get(cell.dateStr) : undefined;
                          const siClosed = siDay ? siDay.onTime + siDay.late + siDay.overdue : 0;
                          const siRatio = siDay && siClosed > 0 ? siDay.onTime / siClosed : 0;
                          const clickable =
                            roleKey === 'SUPERVISOR'
                              ? active && hasTarget
                              : isTimedRole
                              ? active && Boolean(siDay && siDay.arrived > 0)
                              : active && hasReports;

                          let cellStyle = !active
                            ? 'border-slate-100 bg-slate-50 text-slate-300'
                            : hasReports
                            ? 'border-emerald-500 bg-emerald-500 text-white cursor-pointer'
                            : 'border-rose-200 bg-rose-100 text-rose-500';
                          if (roleKey === 'SUPERVISOR') {
                            cellStyle = !active
                              ? 'border-slate-100 bg-slate-50 text-slate-300'
                              : !hasTarget
                              ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : ratio >= 0.9999
                              ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm cursor-pointer'
                              : cell.dateStr === todayStr
                              ? 'border-2 border-indigo-600 bg-white text-indigo-700 shadow-sm cursor-pointer'
                              : ratio >= 0.5
                              ? 'border-indigo-600 bg-indigo-500 text-white shadow-sm cursor-pointer'
                              : 'border-rose-600 bg-rose-500 text-white shadow-sm cursor-pointer';
                          }
                          if (isTimedRole) {
                            cellStyle = !active
                              ? 'border-slate-100 bg-slate-50 text-slate-300'
                              : !siDay || siDay.arrived === 0
                              ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : siClosed === 0
                              ? 'border-2 border-indigo-600 bg-white text-indigo-700 shadow-sm cursor-pointer'
                              : siRatio >= 0.9999
                              ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm cursor-pointer'
                              : siRatio >= 0.5
                              ? 'border-indigo-600 bg-indigo-500 text-white shadow-sm cursor-pointer'
                              : 'border-rose-600 bg-rose-500 text-white shadow-sm cursor-pointer';
                          }

                          return (
                            <div key={cell.dateStr} className="relative">
                              <button
                                type="button"
                                disabled={!clickable}
                                onMouseEnter={(event) => clickable && openTooltip(cell.dateStr, event.currentTarget)}
                                onMouseLeave={scheduleCloseTooltip}
                                onClick={(event) => clickable && toggleTooltip(cell.dateStr, event.currentTarget)}
                                className={`flex ${roleKey === 'SUPERVISOR' || isTimedRole ? 'h-10 flex-col' : 'h-8'} w-full items-center justify-center rounded-md border text-[9px] font-black transition ${cellStyle}`}
                              >
                                {cell.day}
                                {isTimedRole && active && siDay && siDay.arrived > 0 && (
                                  <span className="text-[7px] font-bold leading-none opacity-80">
                                    {siDay.onTime}/{siDay.arrived}
                                  </span>
                                )}
                                {roleKey === 'SUPERVISOR' && active && hasTarget && darogaDay && (
                                  <span className="text-[7px] font-bold leading-none opacity-80">
                                    {Math.round(darogaDay.credit)}/{Math.round(darogaDay.target)}
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hoverDate && tooltipPos && roleKey === 'SUPERVISOR' && darogaDays.get(hoverDate) && (
                <div
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleCloseTooltip}
                  style={{
                    position: 'fixed',
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                    width: DAROGA_TOOLTIP_WIDTH,
                    maxHeight: 'calc(100vh - 24px)',
                    transform: tooltipPos.openUpward ? 'translateY(-100%)' : 'none',
                  }}
                  className="z-[100] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-2xl"
                >
                  {(() => {
                    const day = darogaDays.get(hoverDate)!;
                    const ratio = day.target > 0 ? day.credit / day.target : 0;
                    const isToday = hoverDate === todayStr;
                    const met = ratio >= 0.9999;
                    const status = met
                      ? { label: 'Target met', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: '#10b981' }
                      : isToday
                      ? { label: 'In progress', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: '#4f46e5' }
                      : ratio >= 0.5
                      ? { label: 'Partly done', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: '#6366f1' }
                      : { label: 'Target missed', tone: 'bg-rose-50 text-rose-700 border-rose-200', bar: '#f43f5e' };
                    const left = Math.max(Math.round(day.target) - Math.round(day.credit), 0);
                    return (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            {new Date(`${hoverDate}T00:00:00`).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black ${status.tone}`}>{status.label}</span>
                        </div>

                        <div className="mt-2 flex items-end justify-between">
                          <div className="text-2xl font-black leading-none text-slate-950">
                            {Math.round(day.credit)}
                            <span className="text-sm font-bold text-slate-400"> / {Math.round(day.target)}</span>
                          </div>
                          <div className="text-[11px] font-black" style={{ color: status.bar }}>
                            {Math.round(ratio * 100)}%
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${clamp(ratio * 100)}%`, background: status.bar }} />
                        </div>
                        <div className="mt-1 text-[9px] font-bold text-slate-400">
                          {met ? 'All assigned inspections done' : `${left} inspection${left === 1 ? '' : 's'} left to reach target`}
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-2 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                          Module wise
                        </div>
                        <div className="mt-1 space-y-1.5">
                          {INSPECTION_MODULES.filter((module) => day.modules[module.key]).map((module) => {
                            const entry = day.modules[module.key]!;
                            const moduleRatio = entry.target > 0 ? entry.credit / entry.target : 0;
                            const moduleMet = moduleRatio >= 0.9999;
                            return (
                              <button
                                key={module.key}
                                type="button"
                                onClick={() => goToDateTable(hoverDate, module.key)}
                                className="block w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-indigo-50"
                              >
                                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-700">
                                  <span className="truncate">{module.label}</span>
                                  <span className={`shrink-0 font-black ${moduleMet ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {Math.round(entry.credit)}/{Math.round(entry.target)}
                                  </span>
                                </div>
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${clamp(moduleRatio * 100)}%`, background: moduleMet ? '#10b981' : moduleRatio >= 0.5 ? '#6366f1' : '#f43f5e' }}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => goToDateTable(hoverDate, null)}
                          className="mt-2 w-full rounded-lg border border-indigo-100 bg-indigo-50/60 py-1.5 text-[9px] font-black text-indigo-600 transition hover:bg-indigo-100"
                        >
                          View records of this day
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {hoverDate && tooltipPos && isTimedRole && siDays.get(hoverDate) && (
                <div
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleCloseTooltip}
                  style={{
                    position: 'fixed',
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                    width: DAROGA_TOOLTIP_WIDTH,
                    maxHeight: 'calc(100vh - 24px)',
                    transform: tooltipPos.openUpward ? 'translateY(-100%)' : 'none',
                  }}
                  className="z-[100] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-2xl"
                >
                  {(() => {
                    const day = siDays.get(hoverDate)!;
                    const closed = day.onTime + day.late + day.overdue;
                    const ratio = closed > 0 ? day.onTime / closed : 0;
                    const status =
                      closed === 0
                        ? { label: 'Inside deadline', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: '#4f46e5' }
                        : ratio >= 0.9999
                        ? { label: 'All on time', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: '#10b981' }
                        : ratio >= 0.5
                        ? { label: 'Partly on time', tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: '#6366f1' }
                        : { label: 'Mostly overdue', tone: 'bg-rose-50 text-rose-700 border-rose-200', bar: '#f43f5e' };
                    return (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            {new Date(`${hoverDate}T00:00:00`).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black ${status.tone}`}>{status.label}</span>
                        </div>

                        <div className="mt-2 flex items-end justify-between">
                          <div className="text-2xl font-black leading-none text-slate-950">
                            {day.onTime}
                            <span className="text-sm font-bold text-slate-400"> / {closed}</span>
                          </div>
                          <div className="text-[11px] font-black" style={{ color: status.bar }}>
                            {closed > 0 ? `${Math.round(ratio * 100)}%` : '—'}
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${clamp(ratio * 100)}%`, background: status.bar }} />
                        </div>
                        <div className="mt-1 text-[9px] font-bold text-slate-400">{timedVerb} on time of reports whose deadline has passed</div>

                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-bold text-slate-600">
                          <span>{timedArrivedLabel}: <strong className="text-slate-900">{day.arrived}</strong></span>
                          <span>On time: <strong className="text-emerald-600">{day.onTime}</strong></span>
                          <span>Late: <strong className="text-amber-600">{day.late}</strong></span>
                          <span>Overdue: <strong className="text-rose-600">{day.overdue}</strong></span>
                          <span className="col-span-2">Inside deadline: <strong className="text-indigo-600">{day.inProgress}</strong></span>
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-2 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                          Module wise
                        </div>
                        <div className="mt-1 space-y-1">
                          {INSPECTION_MODULES.filter((module) => day.modules[module.key]).map((module) => {
                            const entry = day.modules[module.key]!;
                            const moduleClosed = entry.onTime + entry.late + entry.overdue;
                            return (
                              <button
                                key={module.key}
                                type="button"
                                onClick={() => goToDateTable(hoverDate, module.key)}
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] font-bold text-slate-700 transition hover:bg-indigo-50"
                              >
                                <span className="truncate">{module.label}</span>
                                <span className={`shrink-0 font-black ${moduleClosed > 0 && entry.onTime < moduleClosed ? 'text-rose-500' : 'text-emerald-600'}`}>
                                  {entry.onTime}/{entry.arrived}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => goToDateTable(hoverDate, null)}
                          className="mt-2 w-full rounded-lg border border-indigo-100 bg-indigo-50/60 py-1.5 text-[9px] font-black text-indigo-600 transition hover:bg-indigo-100"
                        >
                          View records of this day
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              {hoverDate && tooltipPos && roleKey !== 'SUPERVISOR' && !isTimedRole && recordsByDate.get(hoverDate) && (
                <div
                  onMouseEnter={clearCloseTimer}
                  onMouseLeave={scheduleCloseTooltip}
                  style={{
                    position: 'fixed',
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                    width: TOOLTIP_WIDTH,
                    transform: tooltipPos.openUpward ? 'translateY(-100%)' : 'none',
                  }}
                  className="z-[100] rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-2xl"
                >
                  <div className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
                    {formatDate(hoverDate)}
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const entry = recordsByDate.get(hoverDate)!;
                      return (
                        [
                          ['TOILET', 'Toilet', entry.TOILET],
                          ['LITTERBINS', 'Litter Bin', entry.LITTERBINS],
                          ['SWEEPING', 'Beat (Sweeping)', entry.SWEEPING],
                          ['NALA', 'Nala Point', entry.NALA],
                          ['TASKFORCE', 'GVP', entry.TASKFORCE],
                        ] as Array<[InspectionModuleKey, string, number]>
                      ).map(([moduleKey, label, count]) => (
                        <button
                          key={moduleKey}
                          type="button"
                          disabled={count === 0}
                          onClick={() => goToDateTable(hoverDate, moduleKey)}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-bold transition ${
                            count > 0
                              ? 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                              : 'cursor-not-allowed text-slate-300'
                          }`}
                        >
                          <span>{label}</span>
                          <span className="font-black">{count}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'table' && (
            <>
              {tableFilterActive && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5">
                  <span className="text-[10px] font-bold text-indigo-700">
                    Showing{' '}
                    <strong>
                      {[
                        tableWorkflowFilter ? WORKFLOW_LABELS[tableWorkflowFilter] : null,
                        tableFilterModule
                          ? INSPECTION_MODULES.find((module) => module.key === tableFilterModule)?.label || tableFilterModule
                          : null,
                        tableFilterDate ? formatDate(tableFilterDate) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTableFilterDate(null);
                      setTableFilterModule(null);
                      setTableWorkflowFilter(null);
                    }}
                    className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[9px] font-black text-indigo-600 transition hover:bg-indigo-100"
                  >
                    Clear filter
                  </button>
                </div>
              )}

              {filteredTableRecords.length > 0 ? (
                <>
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {tableFilterActive ? 'Filtered Records' : 'All Records'} ({filteredTableRecords.length})
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50">
                        <tr className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          <th className="p-3">Report</th>
                          <th className="p-3">Module</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTableRecords.map((record, index) => {
                          const status = effectiveStatus(record);

                          const statusStyle =
                            status === 'APPROVED' || status === 'ACTION_TAKEN'
                              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                              : status === 'REJECTED'
                              ? 'border-rose-100 bg-rose-50 text-rose-700'
                              : status === 'ACTION_REQUIRED'
                              ? 'border-amber-100 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500';

                          return (
                            <tr key={record.id || `${record.dashboardModule}-${index}`} className="transition hover:bg-slate-50">
                              <td className="max-w-[220px] truncate p-3 font-black text-slate-800">
                                {getRecordTitle(record)}
                              </td>
                              <td className="p-3 text-[10px] font-bold uppercase text-slate-500">
                                {record.dashboardModuleLabel}
                              </td>
                              <td className="p-3 text-[10px] font-bold text-slate-500">
                                {formatDate(dateOf(record))}
                              </td>
                              <td className="p-3">
                                <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${statusStyle}`}>
                                  {statusDisplay(status)}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => onOpenRecord(record)}
                                  className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-1 text-[9px] font-black text-indigo-600 transition hover:bg-indigo-100"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex h-32 items-center justify-center text-xs font-bold text-slate-400">
                  {tableFilterDate
                    ? 'No reports for this date / module.'
                    : 'No inspection records in the selected range.'}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div></ModalPortal>
  );
}


/* =========================================================
   MAIN
========================================================= */

export default function UserPerformancePage() {
  const { user } = useAuth();

  const cityId = user?.city?.id || undefined;
  const cityName = user?.city?.name || 'Municipal Corporation';

  const initial = useMemo(() => defaultRange(), []);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [showFilters, setShowFilters] = useState(false);

  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [roleFilter, setRoleFilter] = useState<UserRoleKey>('SUPERVISOR');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | InspectionModuleKey>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [activeRow, setActiveRow] = useState<UserPerformanceRow | null>(null);
  const [proofRecord, setProofRecord] = useState<DashboardRecord | null>(null);

  /*
   * The full registered-user roster (same source as the Registered
   * Users Directory) so every registered SI/IEC/Daroga/Employee shows
   * up here even with zero activity in the selected date range -
   * building rows only from inspection records/attendance entries (the
   * old approach) silently dropped anyone with no matching record.
   */
  const [cityUsers, setCityUsers] = useState<CityUserSummary[]>([]);
  const [geoNameById, setGeoNameById] = useState<Map<string, string>>(new Map());
  // Daroga required vs completed inspections for the applied date range.
  const [darogaPerformance, setDarogaPerformance] = useState<Record<string, DarogaPerformance> | null>(null);
  const [darogaStatus, setDarogaStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Sanitary Inspector scope totals + decisions for the applied date range.
  const [siPerformance, setSiPerformance] = useState<Record<string, SiPerformance> | null>(null);
  const [siStatus, setSiStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // IEC Member action-cycle reports for the applied date range.
  const [iecPerformance, setIecPerformance] = useState<Record<string, IecPerformance> | null>(null);
  const [iecStatus, setIecStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [usersResult, zonesResult, wardsResult] = await Promise.allSettled([
        CityUserApi.list(),
        GeoApi.list('ZONE'),
        GeoApi.list('WARD'),
      ]);

      if (cancelled) return;

      if (usersResult.status === 'fulfilled') {
        setCityUsers(usersResult.value.users || []);
      }

      const nameMap = new Map<string, string>();
      if (zonesResult.status === 'fulfilled') {
        (zonesResult.value.nodes || []).forEach((node: any) => nameMap.set(node.id, node.name));
      }
      if (wardsResult.status === 'fulfilled') {
        (wardsResult.value.nodes || []).forEach((node: any) => nameMap.set(node.id, node.name));
      }
      setGeoNameById(nameMap);
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

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setLoadError(false);
      setSiStatus('loading');
      setIecStatus('loading');
      setDarogaStatus('loading');

      const [moduleResult, attendanceResult, siResult, iecResult, darogaResult] = await Promise.allSettled([
        Promise.all(
          INSPECTION_MODULES.map((module) =>
            loadAllModuleRecords(module.key, appliedFrom || undefined, appliedTo || undefined).then(
              (rows) =>
                rows.map((row: any) => ({
                  ...row,
                  dashboardModule: module.key,
                  dashboardModuleLabel: module.label,
                }))
            )
          )
        ),
        AttendanceApi.dashboard({
          cityId,
          from: appliedFrom || undefined,
          to: appliedTo || undefined,
          employeeGroup: 'HEALTH_WORKERS',
          page: 1,
          pageSize: 5000,
        }),
        CityUserApi.siPerformance({ startDate: rangeStartIso(appliedFrom), endDate: rangeEndIso(appliedTo) }),
        CityUserApi.iecPerformance({ startDate: rangeStartIso(appliedFrom), endDate: rangeEndIso(appliedTo) }),
        CityUserApi.darogaPerformance(performanceRangeParams(appliedFrom, appliedTo)),
      ]);

      if (darogaResult.status === 'fulfilled') {
        setDarogaPerformance(darogaResult.value.users || {});
        setDarogaStatus('ready');
      } else {
        console.error('Failed to load Daroga performance', darogaResult.reason);
        setDarogaPerformance(null);
        setDarogaStatus('error');
      }

      if (iecResult.status === 'fulfilled') {
        setIecPerformance(iecResult.value.users || {});
        setIecStatus('ready');
      } else {
        console.error('Failed to load IEC Member performance', iecResult.reason);
        setIecPerformance(null);
        setIecStatus('error');
      }

      if (siResult.status === 'fulfilled') {
        setSiPerformance(siResult.value.users || {});
        setSiStatus('ready');
      } else {
        console.error('Failed to load Sanitary Inspector performance', siResult.reason);
        setSiPerformance(null);
        setSiStatus('error');
      }

      if (moduleResult.status === 'fulfilled') {
        // LITTERBINS history also returns bin registration requests; those
        // are asset master rows, not inspection reports.
        setRecords(
          moduleResult.value.flat().filter((record: any) => record.type !== 'BIN_REGISTRATION')
        );
      } else {
        setRecords([]);
        setLoadError(true);
      }

      if (attendanceResult.status === 'fulfilled') {
        setAttendance(attendanceResult.value);
      } else {
        setAttendance(null);
        setLoadError(true);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [appliedFrom, appliedTo, cityId]
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFrom, appliedTo, cityId]);

  const moduleFilterApplicable = roleFilter !== 'EMPLOYEE';

  const filteredRecords = useMemo(() => {
    if (!moduleFilterApplicable || moduleFilter === 'ALL') return records;
    return records.filter((record) => record.dashboardModule === moduleFilter);
  }, [records, moduleFilter, moduleFilterApplicable]);

  /*
   * SI (QC) performance is judged on how many of their assigned reports
   * are still pending review, NOT on approval outcome - a high pending
   * count means the SI is behind on their own queue, so performance
   * drops as pending grows (unrelated to how ULB/IEC action cycles play
   * out downstream).
   */
  const buildInspectionRows = useCallback(
    (
      role: 'SUPERVISOR' | 'QC',
      sourceRecords: DashboardRecord[] = filteredRecords,
      siData: Record<string, SiPerformance> | null = siPerformance,
      darogaData: Record<string, DarogaPerformance> | null = darogaPerformance
    ): UserPerformanceRow[] => {
      const roster = cityUsersByRole.get(role) || [];

      return roster.map((person) => {
        // An SI owns the reports in their scope (from the backend), not the
        // ones they happen to have reviewed.
        const siFull = role === 'QC' ? siData?.[person.id] : undefined;
        const si = siFull ? restrictSiModules(siFull, moduleFilter) : null;
        const siKeys = siBucketKeys(si);

        const matchedRecords =
          role === 'QC'
            ? sourceRecords.filter((item) => siKeys.reports.has(recordKey(item)))
            : sourceRecords.filter((item) => {
                const id = personIdForRole(item, role);
                if (id) return String(id) === String(person.id);
                const name = personForRole(item, role);
                return Boolean(name) && normalize(name) === normalize(person.name);
              });

        const stats = inspectionStats(matchedRecords);

        const attendanceEmployee =
          attendance?.employees?.find(
            (employee) =>
              employee.matrixTrackUserId && String(employee.matrixTrackUserId) === String(person.id)
          ) || null;

        const zones = new Set<string>();
        const wards = new Set<string>();
        const modules = new Set<string>();

        matchedRecords.forEach((item) => {
          const zone = getRecordZone(item);
          const ward = getRecordWard(item);
          if (zone) zones.add(zone);
          if (ward) wards.add(ward);
          if (item.dashboardModuleLabel) modules.add(item.dashboardModuleLabel);
        });

        const darogaFull = role === 'SUPERVISOR' ? darogaData?.[person.id] : undefined;
        const coverage = darogaFull ? restrictDarogaModules(darogaFull, moduleFilter) : null;

        // A Daroga's zones / wards come from where their assigned assets are,
        // so they show even before any report is filed.
        (darogaFull?.rows || []).forEach((entry) => {
          if (entry.zoneName) zones.add(entry.zoneName);
          if (entry.wardId && entry.wardName) wards.add(entry.wardName);
        });

        // Shared with the Team Leaderboard (lib/userPerformanceScores).
        const performance = role === 'QC' ? siScore(si) : darogaScore(coverage);

        return {
          key: `${role}-${person.id}`,
          id: person.id,
          label: person.name,
          total: role === 'QC' ? siKeys.reports.size : stats.total,
          approved: role === 'QC' ? siKeys.cleaned.size : stats.approved,
          rejected: role === 'QC' ? siKeys.notCleaned.size : stats.rejected,
          actionRequired: stats.actionRequired,
          actionTaken: stats.actionTaken,
          pending: role === 'QC' ? siKeys.pendingReview.size : stats.pending,
          performance,
          records: matchedRecords,
          attendance: attendanceEmployee?.attendanceRate ?? null,
          attendanceEmployee,
          zones: Array.from(zones),
          wards: Array.from(wards),
          modules: Array.from(modules),
          coverage,
          si,
        };
      });
    },
    [cityUsersByRole, filteredRecords, attendance, darogaPerformance, siPerformance, moduleFilter]
  );

  const employeeRows = useMemo<UserPerformanceRow[]>(() => {
    const roster = cityUsersByRole.get('EMPLOYEE') || [];

    return roster.map((person) => {
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
        performance: attendanceEmployee?.attendanceRate ?? null,
        records: [],
        attendance: attendanceEmployee?.attendanceRate ?? null,
        attendanceEmployee,
        zones: attendanceEmployee?.zones || [],
        wards: attendanceEmployee?.wards || [],
        modules: [],
      };
    });
  }, [cityUsersByRole, attendance]);

  /*
   * ULB Officer records carry no reviewer/actor field (unlike Daroga's
   * supervisorId, SI's reviewedByQcId, IEC's actionTakenById), so a
   * ULB Officer's rows are matched by their assigned Zone/Ward scope
   * (the same scope the backend enforces when they mark a report
   * Action Required) rather than by a per-record person field.
   *
   * Performance is judged on how many reports in their jurisdiction
   * they've flagged into the Action Required cycle - the action cycle
   * itself (Required -> Taken) is what the drawer's stat card surfaces.
   */
  const buildUlbOfficerRows = useCallback((): UserPerformanceRow[] => {
    const roster = cityUsersByRole.get('ULB_OFFICER') || [];

    return roster.map((officer) => {
      const zoneNames = (officer.zoneIds || [])
        .map((id) => geoNameById.get(id))
        .filter((name): name is string => Boolean(name));
      const wardNames = (officer.wardIds || [])
        .map((id) => geoNameById.get(id))
        .filter((name): name is string => Boolean(name));

      const zoneSet = new Set(zoneNames.map(normalize));
      const wardSet = new Set(wardNames.map(normalize));

      const matchedRecords =
        zoneSet.size || wardSet.size
          ? filteredRecords.filter((item) => {
              const zone = normalize(getRecordZone(item));
              const ward = normalize(getRecordWard(item));
              return (zone && zoneSet.has(zone)) || (ward && wardSet.has(ward));
            })
          : [];

      const stats = inspectionStats(matchedRecords);

      const attendanceEmployee =
        attendance?.employees?.find(
          (employee) =>
            employee.matrixTrackUserId && String(employee.matrixTrackUserId) === String(officer.id)
        ) || null;

      const modules = new Set<string>();
      matchedRecords.forEach((item) => {
        if (item.dashboardModuleLabel) modules.add(item.dashboardModuleLabel);
      });

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
        performance: stats.total > 0 ? (stats.actionRequired / stats.total) * 100 : null,
        records: matchedRecords,
        attendance: attendanceEmployee?.attendanceRate ?? null,
        attendanceEmployee,
        zones: zoneNames,
        wards: wardNames,
        modules: Array.from(modules),
      };
    });
  }, [cityUsersByRole, geoNameById, filteredRecords, attendance]);

  /*
   * IEC Members own the reports that ULB sent to action inside their zone /
   * ward scope (computed by the backend with the same filter as their own
   * report queue). Performance = resolved / attention required; a report
   * resolved by another IEC member of the same zone still counts as resolved.
   */
  const buildActionOfficerRows = useCallback(
    (
      sourceRecords: DashboardRecord[] = filteredRecords,
      iecData: Record<string, IecPerformance> | null = iecPerformance
    ): UserPerformanceRow[] => {
      const roster = cityUsersByRole.get('ACTION_OFFICER') || [];

      return roster.map((officer) => {
        const zoneNames = (officer.zoneIds || [])
          .map((id) => geoNameById.get(id))
          .filter((name): name is string => Boolean(name));
        const wardNames = (officer.wardIds || [])
          .map((id) => geoNameById.get(id))
          .filter((name): name is string => Boolean(name));

        const iecFull = iecData?.[officer.id];
        const iec = iecFull ? restrictIecModules(iecFull, moduleFilter) : null;
        const keys = iecBucketKeys(iec);
        const matchedRecords = sourceRecords.filter((item) => keys.attentionRequired.has(recordKey(item)));
        const stats = inspectionStats(matchedRecords);

        const attendanceEmployee =
          attendance?.employees?.find(
            (employee) =>
              employee.matrixTrackUserId && String(employee.matrixTrackUserId) === String(officer.id)
          ) || null;

        const modules = new Set<string>();
        matchedRecords.forEach((item) => {
          if (item.dashboardModuleLabel) modules.add(item.dashboardModuleLabel);
        });

        const attention = keys.attentionRequired.size;

        return {
          key: `ACTION_OFFICER-${officer.id}`,
          id: officer.id,
          label: officer.name,
          total: attention,
          approved: stats.approved,
          rejected: stats.rejected,
          actionRequired: keys.resolutionPending.size,
          actionTaken: keys.resolved.size,
          pending: stats.pending,
          performance: iecScore(iec),
          records: matchedRecords,
          attendance: attendanceEmployee?.attendanceRate ?? null,
          attendanceEmployee,
          zones: zoneNames,
          wards: wardNames,
          modules: Array.from(modules),
          iec,
        };
      });
    },
    [cityUsersByRole, geoNameById, filteredRecords, attendance, iecPerformance, moduleFilter]
  );

  /*
   * Daroga performance is judged on submission volume against the rest
   * of the currently-viewed roster (count of reports submitted matters
   * more than SI approval outcome), so the base approve/actionTaken
   * score from buildInspectionRows is replaced with a relative score
   * once every Daroga's total is known. The drawer additionally shows
   * assets-assigned vs. reports-submitted coverage using work-summary
   * data fetched per user.
   */
  const activeRoleRows = useMemo(() => {
    let rows: UserPerformanceRow[];

    if (roleFilter === 'EMPLOYEE') {
      rows = employeeRows;
    } else if (roleFilter === 'ULB_OFFICER') {
      rows = buildUlbOfficerRows();
    } else if (roleFilter === 'ACTION_OFFICER') {
      rows = buildActionOfficerRows();
    } else {
      rows = buildInspectionRows(roleFilter as 'SUPERVISOR' | 'QC');
    }

    return [...rows].sort((a, b) => (b.performance ?? -1) - (a.performance ?? -1));
  }, [roleFilter, employeeRows, buildUlbOfficerRows, buildActionOfficerRows, buildInspectionRows]);

  /*
   * The drawer's own date filter: reload records for another range and
   * rebuild this user's row exactly as the table does (same module
   * filter, matching and Daroga relative score).
   */
  const loadRowForRange = useCallback(
    async (rowKey: string, rangeFrom: string, rangeTo: string) => {
      if (roleFilter !== 'SUPERVISOR' && roleFilter !== 'QC' && roleFilter !== 'ACTION_OFFICER') return null;

      const moduleRecords = await Promise.all(
        INSPECTION_MODULES.map((module) =>
          loadAllModuleRecords(module.key, rangeFrom || undefined, rangeTo || undefined).then((rows) =>
            rows.map((row: any) => ({ ...row, dashboardModule: module.key, dashboardModuleLabel: module.label }))
          )
        )
      );

      const rangeRecords = moduleRecords
        .flat()
        .filter((record: any) => record.type !== 'BIN_REGISTRATION')
        .filter((record: any) => moduleFilter === 'ALL' || record.dashboardModule === moduleFilter);

      if (roleFilter === 'ACTION_OFFICER') {
        const iecData = (
          await CityUserApi.iecPerformance({ startDate: rangeStartIso(rangeFrom), endDate: rangeEndIso(rangeTo) })
        ).users;
        return buildActionOfficerRows(rangeRecords, iecData).find((row) => row.key === rowKey) || null;
      }

      const siData =
        roleFilter === 'QC'
          ? (await CityUserApi.siPerformance({ startDate: rangeStartIso(rangeFrom), endDate: rangeEndIso(rangeTo) })).users
          : undefined;
      const darogaData =
        roleFilter === 'SUPERVISOR'
          ? (await CityUserApi.darogaPerformance(performanceRangeParams(rangeFrom, rangeTo))).users
          : undefined;

      const rows = buildInspectionRows(roleFilter, rangeRecords, siData, darogaData);
      return rows.find((row) => row.key === rowKey) || null;
    },
    [roleFilter, moduleFilter, buildInspectionRows, buildActionOfficerRows]
  );

  const filteredRows = useMemo(() => {
    const query = normalize(search);
    if (!query) return activeRoleRows;

    return activeRoleRows.filter((row) =>
      normalize([row.label, ...row.zones, ...row.wards, ...row.modules].join(' ')).includes(query)
    );
  }, [activeRoleRows, search]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, moduleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pagedRows = filteredRows.slice(pageStart, pageStart + PAGE_SIZE);

  const roleLabel = ROLES.find((role) => role.key === roleFilter)?.label || 'User';

  const avgPerformance = useMemo(
    () => averageApplicable(activeRoleRows.map((row) => row.performance)),
    [activeRoleRows]
  );

  const topPerformer = activeRoleRows[0] || null;

  const isDarogaView = roleFilter === 'SUPERVISOR';
  const isSiView = roleFilter === 'QC';
  const isIecView = roleFilter === 'ACTION_OFFICER';
  /** SI and IEC are both judged on meeting a deadline. */
  const isTimedView = isSiView || isIecView;
  const lowThreshold = isDarogaView ? 80 : 50;

  const belowHalf = useMemo(
    () => activeRoleRows.filter((row) => row.performance !== null && row.performance < lowThreshold).length,
    [activeRoleRows, lowThreshold]
  );

  /* SI KPI strip: on-time review across every SI in view. */
  const siKpis = useMemo(() => {
    if (!isTimedView) return null;
    const list = activeRoleRows
      .map((row) => row.si ?? row.iec)
      .filter((entry): entry is SiPerformance | IecPerformance => Boolean(entry));
    const hours = list
      .map((entry) => ('avgTurnaroundHours' in entry ? entry.avgTurnaroundHours : entry.avgResolutionHours))
      .filter((h): h is number => typeof h === 'number');
    return {
      due: list.reduce((sum, entry) => sum + entry.due, 0),
      onTime: list.reduce((sum, entry) => sum + entry.onTime, 0),
      overdue: list.reduce((sum, entry) => sum + entry.overdue, 0),
      avgHours: hours.length ? hours.reduce((sum, h) => sum + h, 0) / hours.length : null,
    };
  }, [isTimedView, activeRoleRows]);

  /* Daroga KPI strip: target achievement across every Daroga in view. */
  const darogaKpis = useMemo(() => {
    if (!isDarogaView) return null;
    const scored = activeRoleRows.filter((row) => row.performance !== null);
    return {
      targetMet: scored.filter((row) => (row.performance ?? 0) >= 99.995).length,
      required: activeRoleRows.reduce((sum, row) => sum + (row.coverage?.required ?? 0), 0),
      completed: activeRoleRows.reduce((sum, row) => sum + (row.coverage?.completed ?? 0), 0),
      defaultTarget: activeRoleRows.filter(
        (row) => row.coverage?.rows?.length && row.coverage.rows.every((entry) => entry.source === 'DEFAULT')
      ).length,
    };
  }, [isDarogaView, activeRoleRows]);

  function applyDates() {
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  function resetFilters() {
    const range = defaultRange();
    setFrom(range.from);
    setTo(range.to);
    setAppliedFrom(range.from);
    setAppliedTo(range.to);
    setModuleFilter('ALL');
    setSearch('');
  }

  function setPreset(preset: 'TODAY' | '7D' | '30D' | 'MONTH' | 'ALL') {
    if (preset === 'ALL') {
      setFrom('');
      setTo('');
      setAppliedFrom('');
      setAppliedTo('');
      return;
    }

    const today = new Date();
    const start = new Date(today);

    if (preset === '7D') start.setDate(start.getDate() - 6);
    if (preset === '30D') start.setDate(start.getDate() - 29);
    if (preset === 'MONTH') start.setDate(1);

    const nextFrom = toDateInput(start);
    const nextTo = toDateInput(today);

    setFrom(nextFrom);
    setTo(nextTo);
    setAppliedFrom(nextFrom);
    setAppliedTo(nextTo);
  }

  return (
    <RoleGuard roles={['COMMISSIONER', 'HMS_SUPER_ADMIN']}>
      <div className="min-h-full bg-[#f6f8fc] pb-12">
        {/* HEADER */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            color: 'white',
            borderRadius: '24px',
            padding: '26px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 12px 40px -10px rgba(15,23,42,0.6)',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.2), transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, minWidth: '280px' }}>
            <Link
              href="/municipal/commissioner"
              style={{
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: '#60a5fa',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                width: 'fit-content',
              }}
            >
              <ArrowLeft size={12} color="#60a5fa" /> Back to Executive Dashboard
            </Link>

            <h1
              style={{
                fontSize: '24px',
                fontWeight: 900,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              <UsersRound size={22} /> User Performance
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56,189,248,0.12)',
                  border: '1px solid rgba(56,189,248,0.25)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <MapPin size={12} color="#38bdf8" /> {cityName}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#818cf8',
                  background: 'rgba(129,140,248,0.12)',
                  border: '1px solid rgba(129,140,248,0.25)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                }}
              >
                Role-wise performance across every user
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                borderRadius: '12px',
                padding: '9px 14px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Filter size={14} />
              Filters
              {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: refreshing ? 'default' : 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </section>

        {/* FILTERS */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showFilters ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_14px_40px_-25px_rgba(15,23,42,.35)] backdrop-blur-xl">
            <div className="flex flex-wrap gap-2">
              {[
                ['TODAY', 'Today'],
                ['7D', '7D'],
                ['30D', '30D'],
                ['MONTH', 'This Month'],
                ['ALL', 'All Time'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key as 'TODAY' | '7D' | '30D' | 'MONTH' | 'ALL')}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <button
                type="button"
                onClick={applyDates}
                className="mt-auto h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-xs font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5"
              >
                Apply
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-auto h-10 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>
        </div>

        {loadError && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
            Some data failed to load. Numbers below may be incomplete — try Refresh.
          </div>
        )}

        {/* SUMMARY */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              <Users size={13} className="text-indigo-600" />
              {roleLabel}s Tracked
            </div>
            <div className="mt-1.5 text-2xl font-black text-slate-950">{activeRoleRows.length}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              <Activity size={13} className="text-violet-600" />
              {isDarogaView ? 'Average Target Achievement' : isSiView ? 'Average On-Time Review' : isIecView ? 'Average On-Time Resolution' : 'Average Performance'}
            </div>
            <div className="mt-1.5 text-2xl font-black text-slate-950">{percentText(avgPerformance)}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              <Trophy size={13} className="text-emerald-600" />
              Top Performer
            </div>
            <div className="mt-1.5 truncate text-lg font-black text-slate-950">
              {topPerformer?.label || '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-400">{percentText(topPerformer?.performance)}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
              <ShieldCheck size={13} className="text-rose-600" />
              {isDarogaView ? 'Needs Attention (<80%)' : isSiView ? 'Overdue Reviews' : isIecView ? 'Overdue Resolutions' : 'Below 50% Performance'}
            </div>
            <div className="mt-1.5 text-2xl font-black text-slate-950">{isTimedView ? siKpis?.overdue ?? 0 : belowHalf}</div>
          </div>
        </section>

        {siKpis && isTimedView && (
          <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">{isSiView ? 'Reviewed On Time' : 'Resolved On Time'}</div>
              <div className="mt-1.5 text-2xl font-black text-slate-950">
                {siKpis.onTime.toLocaleString('en-IN')}
                <span className="text-sm font-bold text-slate-400"> / {siKpis.due.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400">Reports whose deadline has passed</div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-rose-700">{isSiView ? 'Overdue Reviews' : 'Overdue Resolutions'}</div>
              <div className="mt-1.5 text-2xl font-black text-slate-950">{siKpis.overdue.toLocaleString('en-IN')}</div>
              <div className="text-[10px] font-bold text-slate-400">Still waiting after the next-day deadline</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{isSiView ? 'Avg Turnaround' : 'Avg Resolution Time'}</div>
              <div className="mt-1.5 text-2xl font-black text-slate-950">
                {siKpis.avgHours === null ? '—' : `${Math.round(siKpis.avgHours * 10) / 10} h`}
              </div>
              <div className="text-[10px] font-bold text-slate-400">{isSiView ? 'From report arrival to review' : 'From action request to resolution'}</div>
            </div>
          </section>
        )}

        {darogaKpis && (
          <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">Target Met (100%)</div>
              <div className="mt-1.5 text-2xl font-black text-slate-950">{darogaKpis.targetMet}</div>
              <div className="text-[10px] font-bold text-slate-400">Darogas who delivered their full target</div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-700">Inspections vs Target</div>
              <div className="mt-1.5 text-2xl font-black text-slate-950">
                {Math.round(darogaKpis.completed).toLocaleString('en-IN')}
                <span className="text-sm font-bold text-slate-400"> / {Math.round(darogaKpis.required).toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400">Counted up to each day&apos;s target</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">On Default Target</div>
              <div className="mt-1.5 text-2xl font-black text-slate-950">{darogaKpis.defaultTarget}</div>
              <div className="text-[10px] font-bold text-slate-400">No admin target set: judged on all assigned assets</div>
            </div>
          </section>
        )}

        {/* DIRECTORY */}
        <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersRound size={16} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-800">User Performance Directory</h3>
                <span className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[9px] font-black text-purple-700">
                  {filteredRows.length} {roleLabel}
                  {filteredRows.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setRoleFilter(role.key)}
                    className={`rounded-xl px-3 py-2 text-[10px] font-black transition ${
                      roleFilter === role.key
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {moduleFilterApplicable && (
                <select
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value as 'ALL' | InspectionModuleKey)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-[10px] font-black text-slate-600 outline-none transition focus:border-indigo-400 focus:bg-white"
                >
                  <option value="ALL">All Modules</option>
                  {INSPECTION_MODULES.map((module) => (
                    <option key={module.key} value={module.key}>
                      {module.label}
                    </option>
                  ))}
                </select>
              )}

              <div className="relative ml-auto">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${roleLabel.toLowerCase()} name, zone, ward...`}
                  className="h-9 w-64 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-8 text-[10px] font-bold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CalendarDays size={13} className="text-indigo-600" />
              {DRAWER_PRESETS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {label}
                </button>
              ))}
              <input
                type="date"
                value={appliedFrom}
                max={appliedTo || undefined}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setAppliedFrom(event.target.value);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400"
              />
              <span className="text-[10px] font-bold text-slate-400">to</span>
              <input
                type="date"
                value={appliedTo}
                min={appliedFrom || undefined}
                onChange={(event) => {
                  setTo(event.target.value);
                  setAppliedTo(event.target.value);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400"
              />
              <span className="text-[10px] font-bold text-slate-400">
                {appliedFrom && appliedTo
                  ? `${formatDate(appliedFrom)} - ${formatDate(appliedTo)}${isDarogaView ? ' · targets cover these days' : ''}`
                  : isDarogaView
                  ? 'Pick a date range: targets need a range'
                  : 'All time'}
              </span>
            </div>

            <div className="mt-3 text-[9px] font-bold text-slate-400">
              Showing {filteredRows.length > 0 ? pageStart + 1 : 0} -{' '}
              {Math.min(pageStart + PAGE_SIZE, filteredRows.length)} of {filteredRows.length} matching{' '}
              {roleLabel}s
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-white">
                <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="w-12 p-4 text-center">Rank</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Zone</th>
                  <th className="p-4">Ward</th>
                  {isTimedView ? (
                    <>
                      <th className="p-4">Reports Due</th>
                      <th className="p-4">On Time</th>
                      <th className="p-4">Overdue</th>
                    </>
                  ) : isDarogaView ? (
                    <>
                      <th className="p-4">Target</th>
                      <th className="p-4">Achieved</th>
                      <th className="p-4">Days Met</th>
                    </>
                  ) : (
                    <th className="p-4">Modules</th>
                  )}
                  <th className="p-4">{isDarogaView ? 'Achievement' : isSiView ? 'On-Time Review' : isIecView ? 'On-Time Resolution' : 'Performance'}</th>
                  {!isDarogaView && !isTimedView && <th className="p-4">Attendance</th>}
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((row, index) => (
                  <tr key={row.key} className="transition hover:bg-slate-50">
                    <td className="p-4 text-center font-black text-slate-400">#{pageStart + index + 1}</td>

                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => setActiveRow(row)}
                        className="text-left text-[11px] font-black text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {row.label || `Unnamed ${roleLabel}`}
                      </button>
                    </td>

                    {[row.zones, row.wards].map((names, columnIndex) => (
                      <td key={columnIndex} className="p-4">
                        {names.length ? (
                          <div className="flex items-start gap-1 text-[9px] font-bold uppercase text-slate-500">
                            <MapPin size={9} className="mt-0.5 shrink-0" />
                            <span>
                              {names.slice(0, 3).join(', ')}
                              {names.length > 3 ? ` +${names.length - 3}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">—</span>
                        )}
                      </td>
                    ))}

                    {isTimedView ? (
                      <>
                        <td className="p-4 text-[10px] font-black text-slate-900">{(row.si ?? row.iec) ? (row.si ?? row.iec)!.due.toLocaleString('en-IN') : '—'}</td>
                        <td className="p-4 text-[10px] font-black text-emerald-700">{(row.si ?? row.iec) ? (row.si ?? row.iec)!.onTime.toLocaleString('en-IN') : '—'}</td>
                        <td className="p-4 text-[10px] font-black text-rose-600">{(row.si ?? row.iec) ? (row.si ?? row.iec)!.overdue.toLocaleString('en-IN') : '—'}</td>
                      </>
                    ) : isDarogaView ? (
                      <>
                        <td className="p-4 text-[10px] font-black text-slate-900">
                          {row.coverage?.required != null ? Math.round(row.coverage.required).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-4 text-[10px] font-black text-slate-900">
                          {row.coverage ? Math.round(row.coverage.completed).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-4 text-[10px] font-black text-slate-900">
                          {row.coverage?.daysWithTarget ? `${row.coverage.daysMet}/${row.coverage.daysWithTarget}` : '—'}
                        </td>
                      </>
                    ) : (
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {row.modules.length ? (
                          row.modules.map((module) => (
                            <span
                              key={module}
                              className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[8px] font-black text-blue-700"
                            >
                              {module}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">
                            {roleFilter === 'EMPLOYEE' ? 'Not applicable' : 'No activity'}
                          </span>
                        )}
                      </div>
                    </td>
                    )}

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              width: `${clamp(row.performance || 0)}%`,
                              background: positiveColor(row.performance || 0),
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-900">
                          {percentText(row.performance)}
                        </span>
                        {isDarogaView && (
                          <span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black ${darogaTier(row.performance).tone}`}>
                            {darogaTier(row.performance).label}
                          </span>
                        )}
                      </div>
                    </td>

                    {!isDarogaView && !isTimedView && (
                      <td className="p-4 text-[10px] font-black text-slate-900">{percentText(row.attendance)}</td>
                    )}

                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveRow(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 text-[10px] font-black text-indigo-600 shadow-sm transition hover:bg-indigo-100"
                      >
                        <Activity size={12} />
                        Performance
                      </button>
                    </td>
                  </tr>
                ))}

                {pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={isDarogaView || isTimedView ? 9 : 8} className="py-14 text-center text-[10px] font-bold text-slate-400">
                      No {roleLabel.toLowerCase()}s match the selected search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <span className="text-[10px] font-bold text-slate-500">
                Page {page} of {totalPages} ({filteredRows.length} total records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {loading && (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 top-0 z-[70] bg-white/10 backdrop-blur-[1px]">
            <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          </div>
        )}

        {activeRow && (
          <UserDetailDrawer
            row={activeRow}
            roleLabel={roleLabel}
            roleKey={roleFilter}
            fromDate={appliedFrom}
            toDate={appliedTo}
            loadRowForRange={loadRowForRange}
            assetsStatus={darogaStatus}
            siStatus={siStatus}
            iecStatus={iecStatus}
            allRecords={filteredRecords}
            onClose={() => setActiveRow(null)}
            onOpenRecord={setProofRecord}
          />
        )}

        {proofRecord && (
          <UniversalReportModal
            moduleTitle={proofRecord.dashboardModuleLabel || 'Inspection Record'}
            moduleBadge="Commissioner"
            record={proofRecord}
            userRoles={['COMMISSIONER']}
            onClose={() => setProofRecord(null)}
          />
        )}
      </div>
    </RoleGuard>
  );
}
