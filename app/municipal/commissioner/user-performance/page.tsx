'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplet,
  Filter,
  MapPin,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  Trophy,
  Users,
  UsersRound,
  X,
  XCircle,
} from 'lucide-react';

import { RoleGuard } from '@components/Guards';
import UniversalReportModal from '@components/UniversalReportModal';
import { BarComparisonChart, DonutDistributionChart } from '@components/ui/charts/ExecutiveCharts';

import { useAuth } from '@hooks/useAuth';
import { CityUserApi, GeoApi, ModuleRecordsApi, type UserWorkSummaryResponse } from '@lib/apiClient';

import {
  AttendanceApi,
  type AttendanceDashboardResponse,
  type AttendanceEmployeeSummary,
} from '@lib/attendanceApi';


/* =========================================================
   TYPES
========================================================= */

type InspectionModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING';

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
  { key: 'ULB_OFFICER', label: 'ULB Officer' },
  { key: 'QC', label: 'Sanitary Inspector (SI)' },
  { key: 'ACTION_OFFICER', label: 'IEC Member' },
  { key: 'SUPERVISOR', label: 'Daroga' },
  { key: 'EMPLOYEE', label: 'Employee' },
];

const INSPECTION_MODULES: Array<{ key: InspectionModuleKey; label: string }> = [
  { key: 'TOILET', label: 'Cleanliness of Toilets' },
  { key: 'LITTERBINS', label: 'Litter Bins' },
  { key: 'SWEEPING', label: 'Sweeping' },
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
    null
  );
}

function getDarogaName(item: any) {
  return (
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

async function loadAllModuleRecords(moduleKey: InspectionModuleKey, from?: string, to?: string) {
  const limit = 1000;

  const first = await ModuleRecordsApi.getRecords(moduleKey, {
    page: 1,
    limit,
    tab: 'HISTORY',
    fromDate: from || undefined,
    toDate: to || undefined,
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
          fromDate: from || undefined,
          toDate: to || undefined,
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
  'SI Approved': '#10b981',
  Rejected: '#f43f5e',
  'SI Rejected': '#f43f5e',
  'Action Required': '#f59e0b',
  'Action Taken': '#6366f1',
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

function UserDetailDrawer({
  row,
  roleLabel,
  roleKey,
  fromDate,
  toDate,
  allRecords,
  onClose,
  onOpenRecord,
}: {
  row: UserPerformanceRow;
  roleLabel: string;
  roleKey: UserRoleKey;
  fromDate: string;
  toDate: string;
  allRecords: DashboardRecord[];
  onClose: () => void;
  onOpenRecord: (record: DashboardRecord) => void;
}) {
  const [tab, setTab] = useState<'charts' | 'calendar' | 'table'>('charts');
  const [workSummary, setWorkSummary] = useState<UserWorkSummaryResponse | null>(null);
  const [workSummaryLoading, setWorkSummaryLoading] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const [tableFilterDate, setTableFilterDate] = useState<string | null>(null);
  const [tableFilterModule, setTableFilterModule] = useState<InspectionModuleKey | null>(null);
  const closeTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TOOLTIP_WIDTH = 176;
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

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN);

    const openUpward = rect.bottom + TOOLTIP_HEIGHT_ESTIMATE + VIEWPORT_MARGIN > window.innerHeight;
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
    setTableFilterDate(null);
    setTableFilterModule(null);
    setHoverDate(null);
    setTab('charts');

    if (!row.id) return;

    setWorkSummaryLoading(true);
    CityUserApi.workSummary(row.id)
      .then((result) => {
        if (!cancelled) setWorkSummary(result);
      })
      .catch(() => {
        if (!cancelled) setWorkSummary(null);
      })
      .finally(() => {
        if (!cancelled) setWorkSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [row.id]);

  const isEmployee = roleKey === 'EMPLOYEE';
  const approvedLabel = 'SI Approved';
  const rejectedLabel = 'SI Rejected';
  const pendingLabel = 'SI Pending';

  const beatsCount = workSummary?.assignments.beats.length ?? null;
  const toiletsCount = workSummary?.assignments.toilets.length ?? null;
  const litterBinsCount = workSummary?.assignments.litterBins.length ?? null;
  const assetsTotal = (beatsCount ?? 0) + (toiletsCount ?? 0) + (litterBinsCount ?? 0);
  const coveragePct = assetsTotal > 0 ? clamp((row.total / assetsTotal) * 100) : null;

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

  const coveredAssetsCount = useMemo(() => {
    if (roleKey !== 'SUPERVISOR') return 0;
    const keys = new Set<string>();
    row.records.forEach((record) => {
      const key = getRecordAssetId(record) || normalize(getRecordTitle(record));
      if (key) keys.add(String(key));
    });
    return keys.size;
  }, [roleKey, row.records]);

  const calendarSourceRecords = isEmployee ? employeeAssetRecords : row.records;

  const recentRecords = useMemo(
    () =>
      [...calendarSourceRecords].sort(
        (a, b) => new Date(recordDate(b) || 0).getTime() - new Date(recordDate(a) || 0).getTime()
      ),
    [calendarSourceRecords]
  );

  /* -------- Submission Calendar -------- */

  const recordsByDate = useMemo(() => {
    const map = new Map<string, Record<InspectionModuleKey, number> & { total: number }>();

    calendarSourceRecords.forEach((record) => {
      const raw = recordDate(record);
      if (!raw) return;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return;

      const key = toDateInput(parsed);
      const entry = map.get(key) || { TOILET: 0, LITTERBINS: 0, SWEEPING: 0, total: 0 };
      const moduleKey = record.dashboardModule as InspectionModuleKey;
      if (moduleKey === 'TOILET' || moduleKey === 'LITTERBINS' || moduleKey === 'SWEEPING') {
        entry[moduleKey] += 1;
      }
      entry.total += 1;
      map.set(key, entry);
    });

    return map;
  }, [calendarSourceRecords]);

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
    clearCloseTimer();
    setHoverDate(null);
    setTooltipPos(null);
    setTab('table');
  }

  const filteredTableRecords = useMemo(() => {
    if (!tableFilterDate) return recentRecords;
    return recentRecords.filter((record) => {
      const raw = recordDate(record);
      if (!raw) return false;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return false;
      if (toDateInput(parsed) !== tableFilterDate) return false;
      if (tableFilterModule && record.dashboardModule !== tableFilterModule) return false;
      return true;
    });
  }, [recentRecords, tableFilterDate, tableFilterModule]);

  const donutTitle =
    roleKey === 'SUPERVISOR'
      ? 'Asset Coverage'
      : roleKey === 'ULB_OFFICER'
      ? 'Action Cycle · Raised vs Resolved'
      : roleKey === 'ACTION_OFFICER'
      ? 'Action Cycle · Pending vs Resolved'
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

    if (roleKey === 'ULB_OFFICER' || roleKey === 'ACTION_OFFICER') {
      return [
        { label: 'Action Required', value: row.actionRequired, color: STATUS_COLORS['Action Required'] },
        { label: 'Action Taken', value: row.actionTaken, color: STATUS_COLORS['Action Taken'] },
      ];
    }

    if (roleKey === 'SUPERVISOR') {
      const covered = Math.min(coveredAssetsCount, assetsTotal || coveredAssetsCount);
      const notCovered = Math.max(assetsTotal - coveredAssetsCount, 0);
      return [
        { label: 'Assets Covered', value: covered, color: STATUS_COLORS.Approved },
        { label: 'Assets Not Covered', value: notCovered, color: STATUS_COLORS.Pending },
      ];
    }

    return [
      { label: approvedLabel, value: row.approved, color: STATUS_COLORS[approvedLabel] },
      { label: rejectedLabel, value: row.rejected, color: STATUS_COLORS[rejectedLabel] },
      { label: pendingLabel, value: row.pending, color: STATUS_COLORS.Pending },
    ];
  }, [isEmployee, roleKey, row, approvedLabel, rejectedLabel, pendingLabel, coveredAssetsCount, assetsTotal]);

  const assetCleanlinessSegments = useMemo(
    () => [
      { label: 'Approved (Clean)', value: employeeAssetStats.approved, color: STATUS_COLORS.Approved },
      { label: 'Rejected (Unclean)', value: employeeAssetStats.rejected, color: STATUS_COLORS.Rejected },
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
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[760px] flex-col overflow-y-auto border-l border-slate-200 bg-[#f8fafc] shadow-[-30px_0_80px_-30px_rgba(15,23,42,.42)]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-600">
                {roleLabel}
              </div>
              <div className="mt-0.5 text-lg font-black tracking-tight text-slate-950">
                {row.label || 'Unnamed User'}
              </div>
              <div className="mt-1 text-2xl font-black tracking-tight text-indigo-700">
                {percentText(row.performance)}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <X size={18} />
            </button>
          </div>

          {(row.zones.length > 0 || row.wards.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
              <MapPin size={11} />
              {[...row.zones, ...row.wards].join(', ')}
            </div>
          )}

          {row.modules.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.modules.map((module) => (
                <span
                  key={module}
                  className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700"
                >
                  {module}
                </span>
              ))}
            </div>
          )}

          {/* STAT CARDS */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {roleKey === 'SUPERVISOR' && (
              <>
                <StatTile label="Reports Submitted" value={row.total.toLocaleString('en-IN')} icon={<Activity size={13} />} tone="slate" />
                <StatTile
                  label="Assigned Beats"
                  value={workSummaryLoading ? '…' : (beatsCount ?? 0).toLocaleString('en-IN')}
                  icon={<Route size={13} />}
                  tone="violet"
                />
                <StatTile
                  label="Assigned Toilets"
                  value={workSummaryLoading ? '…' : (toiletsCount ?? 0).toLocaleString('en-IN')}
                  icon={<Droplet size={13} />}
                  tone="sky"
                />
                <StatTile
                  label="Assigned Litter Bins"
                  value={workSummaryLoading ? '…' : (litterBinsCount ?? 0).toLocaleString('en-IN')}
                  icon={<Trash2 size={13} />}
                  tone="emerald"
                />
                <StatTile
                  label="Coverage"
                  value={workSummaryLoading ? '…' : percentText(coveragePct)}
                  icon={<ShieldCheck size={13} />}
                  tone="amber"
                />
                <StatTile label="Attendance" value={percentText(row.attendance)} icon={<Activity size={13} />} tone="blue" />
              </>
            )}

            {roleKey === 'QC' && (
              <>
                <StatTile label="Total Reports" value={row.total.toLocaleString('en-IN')} icon={<Activity size={13} />} tone="slate" />
                <StatTile label={approvedLabel} value={row.approved.toLocaleString('en-IN')} icon={<CheckCircle2 size={13} />} tone="emerald" />
                <StatTile label={rejectedLabel} value={row.rejected.toLocaleString('en-IN')} icon={<XCircle size={13} />} tone="rose" />
                <StatTile label={pendingLabel} value={row.pending.toLocaleString('en-IN')} icon={<ShieldCheck size={13} />} tone="amber" />
                <StatTile label="Attendance" value={percentText(row.attendance)} icon={<Activity size={13} />} tone="blue" />
              </>
            )}

            {(roleKey === 'ULB_OFFICER' || roleKey === 'ACTION_OFFICER') && (
              <>
                <StatTile
                  label={roleKey === 'ULB_OFFICER' ? 'Total In Jurisdiction' : 'Total Action Items'}
                  value={row.total.toLocaleString('en-IN')}
                  icon={<Activity size={13} />}
                  tone="slate"
                />
                <StatTile label="Attendance" value={percentText(row.attendance)} icon={<Activity size={13} />} tone="blue" />

                <div className="col-span-2 mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 sm:col-span-3">
                  Action Cycle
                </div>
                <StatTile
                  label={roleKey === 'ULB_OFFICER' ? 'Action Required (Raised)' : 'Pending Action'}
                  value={row.actionRequired.toLocaleString('en-IN')}
                  icon={<ShieldCheck size={13} />}
                  tone="amber"
                />
                <StatTile
                  label="Action Taken (Resolved)"
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
                <StatTile label="Attendance" value={percentText(row.attendance)} icon={<Activity size={13} />} tone="blue" />
                <StatTile
                  label="Assigned Toilets"
                  value={workSummaryLoading ? '…' : (toiletsCount ?? 0).toLocaleString('en-IN')}
                  icon={<Droplet size={13} />}
                  tone="sky"
                />
                <StatTile
                  label="Assigned Litter Bins"
                  value={workSummaryLoading ? '…' : (litterBinsCount ?? 0).toLocaleString('en-IN')}
                  icon={<Trash2 size={13} />}
                  tone="emerald"
                />

                {employeeAssetRecords.length > 0 && (
                  <>
                    <div className="col-span-2 mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 sm:col-span-3">
                      Asset Inspection Results
                    </div>
                    <StatTile
                      label="Approved (Clean)"
                      value={employeeAssetStats.approved.toLocaleString('en-IN')}
                      icon={<CheckCircle2 size={13} />}
                      tone="emerald"
                    />
                    <StatTile
                      label="Rejected (Unclean)"
                      value={employeeAssetStats.rejected.toLocaleString('en-IN')}
                      icon={<XCircle size={13} />}
                      tone="rose"
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>

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
                {donutSegments.every((segment) => segment.value === 0) ? (
                  <div className="flex h-32 items-center justify-center text-xs font-bold text-slate-400">
                    No records in the selected range.
                  </div>
                ) : (
                  <DonutDistributionChart segments={donutSegments} size={190} strokeWidth={20} />
                )}
              </div>

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
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Report submitted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-sm border border-rose-200 bg-rose-100" /> No report
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-50" /> Outside range
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Hover a green date for the module breakdown
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

                          const cellStyle = !active
                            ? 'border-slate-100 bg-slate-50 text-slate-300'
                            : hasReports
                            ? 'border-emerald-500 bg-emerald-500 text-white cursor-pointer'
                            : 'border-rose-200 bg-rose-100 text-rose-500';

                          return (
                            <div key={cell.dateStr} className="relative">
                              <button
                                type="button"
                                disabled={!active || !hasReports}
                                onMouseEnter={(event) => active && hasReports && openTooltip(cell.dateStr, event.currentTarget)}
                                onMouseLeave={scheduleCloseTooltip}
                                onClick={(event) => active && hasReports && toggleTooltip(cell.dateStr, event.currentTarget)}
                                className={`flex h-8 w-full items-center justify-center rounded-md border text-[9px] font-black transition ${cellStyle}`}
                              >
                                {cell.day}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hoverDate && tooltipPos && recordsByDate.get(hoverDate) && (
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
              {tableFilterDate && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5">
                  <span className="text-[10px] font-bold text-indigo-700">
                    Showing reports for <strong>{formatDate(tableFilterDate)}</strong>
                    {tableFilterModule
                      ? ` · ${INSPECTION_MODULES.find((module) => module.key === tableFilterModule)?.label || tableFilterModule}`
                      : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTableFilterDate(null);
                      setTableFilterModule(null);
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
                    {tableFilterDate ? 'Filtered Records' : 'All Records'} ({filteredTableRecords.length})
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
                                {formatDate(recordDate(record))}
                              </td>
                              <td className="p-3">
                                <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase ${statusStyle}`}>
                                  {status.replace(/_/g, ' ')}
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
    </div>
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

      const [moduleResult, attendanceResult] = await Promise.allSettled([
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
      ]);

      if (moduleResult.status === 'fulfilled') {
        setRecords(moduleResult.value.flat());
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
    (role: 'SUPERVISOR' | 'QC'): UserPerformanceRow[] => {
      const roster = cityUsersByRole.get(role) || [];

      return roster.map((person) => {
        const matchedRecords = filteredRecords.filter((item) => {
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

        const performance =
          role === 'QC'
            ? stats.total > 0
              ? ((stats.total - stats.pending) / stats.total) * 100
              : null
            : stats.performance;

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
          performance,
          records: matchedRecords,
          attendance: attendanceEmployee?.attendanceRate ?? null,
          attendanceEmployee,
          zones: Array.from(zones),
          wards: Array.from(wards),
          modules: Array.from(modules),
        };
      });
    },
    [cityUsersByRole, filteredRecords, attendance]
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
   * IEC (Action Officer) records are matched two ways: records they've
   * already resolved (actionTakenBy = them) PLUS records still sitting
   * in Action Required within their own zone/ward scope - those are the
   * items still "pending action" on their side. Performance is the
   * resolution rate of that action cycle (Taken / (Required + Taken)),
   * so a growing pending pile drags performance down.
   */
  const buildActionOfficerRows = useCallback((): UserPerformanceRow[] => {
    const roster = cityUsersByRole.get('ACTION_OFFICER') || [];

    return roster.map((officer) => {
      const zoneNames = (officer.zoneIds || [])
        .map((id) => geoNameById.get(id))
        .filter((name): name is string => Boolean(name));
      const wardNames = (officer.wardIds || [])
        .map((id) => geoNameById.get(id))
        .filter((name): name is string => Boolean(name));

      const zoneSet = new Set(zoneNames.map(normalize));
      const wardSet = new Set(wardNames.map(normalize));

      const matchedRecords = filteredRecords.filter((item) => {
        const iecId = getIecId(item);
        const iecName = getIecName(item);
        const resolvedByOfficer = iecId
          ? String(iecId) === String(officer.id)
          : Boolean(iecName) && normalize(iecName) === normalize(officer.name);
        if (resolvedByOfficer) return true;

        if (effectiveStatus(item) !== 'ACTION_REQUIRED') return false;
        if (!(zoneSet.size || wardSet.size)) return false;
        const zone = normalize(getRecordZone(item));
        const ward = normalize(getRecordWard(item));
        return (zone && zoneSet.has(zone)) || (ward && wardSet.has(ward));
      });

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

      const actionable = stats.actionRequired + stats.actionTaken;

      return {
        key: `ACTION_OFFICER-${officer.id}`,
        id: officer.id,
        label: officer.name,
        total: stats.total,
        approved: stats.approved,
        rejected: stats.rejected,
        actionRequired: stats.actionRequired,
        actionTaken: stats.actionTaken,
        pending: stats.pending,
        performance: actionable > 0 ? (stats.actionTaken / actionable) * 100 : null,
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

    if (roleFilter === 'SUPERVISOR') {
      const maxTotal = Math.max(0, ...rows.map((row) => row.total));
      rows = rows.map((row) => ({
        ...row,
        performance: maxTotal > 0 ? (row.total / maxTotal) * 100 : null,
      }));
    }

    return [...rows].sort((a, b) => (b.performance ?? -1) - (a.performance ?? -1));
  }, [roleFilter, employeeRows, buildUlbOfficerRows, buildActionOfficerRows, buildInspectionRows]);

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

  const belowHalf = useMemo(
    () => activeRoleRows.filter((row) => row.performance !== null && row.performance < 50).length,
    [activeRoleRows]
  );

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
              Average Performance
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
              Below 50% Performance
            </div>
            <div className="mt-1.5 text-2xl font-black text-slate-950">{belowHalf}</div>
          </div>
        </section>

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
                  <th className="p-4">Zone / Ward</th>
                  <th className="p-4">Modules</th>
                  <th className="p-4">Performance</th>
                  <th className="p-4">Attendance</th>
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

                    <td className="p-4">
                      {row.zones.length || row.wards.length ? (
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500">
                          <MapPin size={9} />
                          {[...row.zones, ...row.wards].slice(0, 3).join(', ')}
                          {row.zones.length + row.wards.length > 3
                            ? ` +${row.zones.length + row.wards.length - 3}`
                            : ''}
                        </div>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400">No location on record</span>
                      )}
                    </td>

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
                      </div>
                    </td>

                    <td className="p-4 text-[10px] font-black text-slate-900">{percentText(row.attendance)}</td>

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
                    <td colSpan={7} className="py-14 text-center text-[10px] font-bold text-slate-400">
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
