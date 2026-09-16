'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  UsersRound,
  X,
} from 'lucide-react';

import { RoleGuard } from '@components/Guards';
import UniversalReportModal from '@components/UniversalReportModal';

import { useAuth } from '@hooks/useAuth';
import { ModuleRecordsApi } from '@lib/apiClient';

import {
  AttendanceApi,
  type AttendanceDashboardResponse,
  type AttendanceEmployeeSummary,
} from '@lib/attendanceApi';


/* =========================================================
   TYPES
========================================================= */

type InspectionModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING';

type UserRoleKey = 'SUPERVISOR' | 'QC' | 'ACTION_OFFICER' | 'EMPLOYEE';

type DashboardRecord = any & {
  dashboardModule: InspectionModuleKey;
  dashboardModuleLabel: string;
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

const ROLES: Array<{ key: UserRoleKey; label: string }> = [
  { key: 'SUPERVISOR', label: 'Daroga' },
  { key: 'QC', label: 'Sanitary Inspector' },
  { key: 'ACTION_OFFICER', label: 'IEC Member' },
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

function UserDetailDrawer({
  row,
  roleLabel,
  onClose,
  onOpenRecord,
}: {
  row: UserPerformanceRow;
  roleLabel: string;
  onClose: () => void;
  onOpenRecord: (record: DashboardRecord) => void;
}) {
  const recentRecords = useMemo(
    () =>
      [...row.records]
        .sort((a, b) => new Date(recordDate(b) || 0).getTime() - new Date(recordDate(a) || 0).getTime())
        .slice(0, 25),
    [row.records]
  );

  const breakdown =
    row.attendanceEmployee && !row.records.length
      ? [
          { label: 'Total Days', value: row.total.toLocaleString('en-IN') },
          { label: 'Present Days', value: row.approved.toLocaleString('en-IN') },
          { label: 'Absent Days', value: row.rejected.toLocaleString('en-IN') },
          { label: 'Attendance', value: percentText(row.attendance) },
        ]
      : [
          { label: 'Records', value: row.total.toLocaleString('en-IN') },
          { label: 'Approved', value: row.approved.toLocaleString('en-IN') },
          { label: 'Rejected', value: row.rejected.toLocaleString('en-IN') },
          { label: 'Action Required', value: row.actionRequired.toLocaleString('en-IN') },
          { label: 'Action Taken', value: row.actionTaken.toLocaleString('en-IN') },
          { label: 'Attendance', value: percentText(row.attendance) },
        ];

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
      />

      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[720px] flex-col border-l border-slate-200 bg-[#f8fafc] shadow-[-30px_0_80px_-30px_rgba(15,23,42,.42)]">
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

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {breakdown.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-black text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {recentRecords.length > 0 ? (
            <>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Recent Records ({recentRecords.length} of {row.records.length})
              </div>

              <div className="space-y-2">
                {recentRecords.map((record, index) => {
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
                    <button
                      key={record.id || `${record.dashboardModule}-${index}`}
                      type="button"
                      onClick={() => onOpenRecord(record)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-slate-800">
                          {getRecordTitle(record)}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase text-slate-400">
                          <span>{record.dashboardModuleLabel}</span>
                          <span>·</span>
                          <span>{formatDate(recordDate(record))}</span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-black uppercase ${statusStyle}`}
                      >
                        {status.replace(/_/g, ' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
              No inspection records in the selected range.
            </div>
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

  const buildInspectionRows = useCallback(
    (role: 'SUPERVISOR' | 'QC' | 'ACTION_OFFICER'): UserPerformanceRow[] => {
      const map = new Map<string, { id: string | null; records: DashboardRecord[] }>();

      filteredRecords.forEach((item) => {
        const name = personForRole(item, role);
        if (!name) return;

        const id = personIdForRole(item, role);
        const current = map.get(name) || { id, records: [] as DashboardRecord[] };
        current.records.push(item);
        if (!current.id && id) current.id = id;
        map.set(name, current);
      });

      return Array.from(map.entries()).map(([label, data]) => {
        const stats = inspectionStats(data.records);

        const attendanceEmployee = data.id
          ? attendance?.employees?.find(
              (employee) =>
                employee.matrixTrackUserId && String(employee.matrixTrackUserId) === String(data.id)
            ) || null
          : null;

        const zones = new Set<string>();
        const wards = new Set<string>();
        const modules = new Set<string>();

        data.records.forEach((item) => {
          const zone = getRecordZone(item);
          const ward = getRecordWard(item);
          if (zone) zones.add(zone);
          if (ward) wards.add(ward);
          if (item.dashboardModuleLabel) modules.add(item.dashboardModuleLabel);
        });

        return {
          key: `${role}-${label}`,
          id: data.id,
          label,
          total: stats.total,
          approved: stats.approved,
          rejected: stats.rejected,
          actionRequired: stats.actionRequired,
          actionTaken: stats.actionTaken,
          pending: stats.pending,
          performance: stats.performance,
          records: data.records,
          attendance: attendanceEmployee?.attendanceRate ?? null,
          attendanceEmployee,
          zones: Array.from(zones),
          wards: Array.from(wards),
          modules: Array.from(modules),
        };
      });
    },
    [filteredRecords, attendance]
  );

  const employeeRows = useMemo<UserPerformanceRow[]>(() => {
    const employees = attendance?.employees || [];

    return employees.map((employee) => ({
      key: `EMPLOYEE-${employee.attendanceId}`,
      id: employee.matrixTrackUserId,
      label: employee.employeeName,
      total: employee.totalDays,
      approved: employee.presentDays,
      rejected: employee.absentDays,
      actionRequired: 0,
      actionTaken: 0,
      pending: 0,
      performance: employee.attendanceRate,
      records: [],
      attendance: employee.attendanceRate,
      attendanceEmployee: employee,
      zones: employee.zones || [],
      wards: employee.wards || [],
      modules: [],
    }));
  }, [attendance]);

  const activeRoleRows = useMemo(() => {
    const rows =
      roleFilter === 'EMPLOYEE'
        ? employeeRows
        : buildInspectionRows(roleFilter as 'SUPERVISOR' | 'QC' | 'ACTION_OFFICER');

    return [...rows].sort((a, b) => (b.performance ?? -1) - (a.performance ?? -1));
  }, [roleFilter, employeeRows, buildInspectionRows]);

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
