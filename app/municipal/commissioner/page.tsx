'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@components/Guards';
import { useAuth } from '@hooks/useAuth';
import { ModuleRecordsApi } from '@lib/apiClient';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileBarChart,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RangeKey = '7D' | '30D' | 'ALL';
type ModuleKey = 'SWEEPING' | 'TOILET' | 'TWINBIN' | 'TASKFORCE';

type ModuleSummary = {
  key: ModuleKey;
  label: string;
  total: number;
  approved: number;
  pending: number;
  actionRequired: number;
  actionTaken: number;
  rejected: number;
  records: any[];
};

const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'SWEEPING', label: 'Sweeping' },
  { key: 'TOILET', label: 'Cleanliness of Toilets' },
  { key: 'TWINBIN', label: 'Litter Bins / Twinbin' },
  { key: 'TASKFORCE', label: 'CTU / GVP' },
];

const PIE_COLORS = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b'];

const normalizeStatus = (value: unknown) => String(value || '').trim().toUpperCase();

const getRecordDate = (record: any) => {
  const raw =
    record?.submittedAt ||
    record?.inspectionDate ||
    record?.reportDate ||
    record?.createdAt ||
    record?.updatedAt ||
    record?.date;

  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const countDerivedStatuses = (records: any[]) => {
  let approved = 0;
  let pending = 0;
  let actionRequired = 0;
  let actionTaken = 0;
  let rejected = 0;

  records.forEach((record) => {
    const status = normalizeStatus(record?.status || record?.reviewStatus || record?.qcStatus);

    if (['APPROVED', 'RESOLVED', 'COMPLETED'].includes(status)) approved += 1;
    else if (status === 'ACTION_TAKEN') actionTaken += 1;
    else if (status === 'ACTION_REQUIRED') actionRequired += 1;
    else if (status === 'REJECTED') rejected += 1;
    else if (['PENDING', 'PENDING_QC', 'SUBMITTED', 'IN_PROGRESS'].includes(status)) pending += 1;
  });

  return { approved, pending, actionRequired, actionTaken, rejected };
};

export default function CommissionerDashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<RangeKey>('7D');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [modules, setModules] = useState<ModuleSummary[]>([]);

  const cityName = user?.city?.name || 'Municipal Corporation';

  const dateFilters = useMemo(() => {
    if (range === 'ALL') return {};

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (range === '7D' ? 6 : 29));

    return {
      fromDate: toDateInput(start),
      toDate: toDateInput(end),
    };
  }, [range]);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const responses = await Promise.all(
        MODULES.map(async (module) => {
          const response = await ModuleRecordsApi.getRecords(module.key, {
            limit: 1000,
            ...dateFilters,
          });

          const records = response.data || [];
          const derived = countDerivedStatuses(records);
          const stats = response.stats;

          return {
            key: module.key,
            label: module.label,
            total: response.meta?.total ?? stats?.total ?? records.length,
            approved: stats?.approved ?? derived.approved,
            pending: stats?.pending ?? derived.pending,
            actionRequired: stats?.actionRequired ?? derived.actionRequired,
            actionTaken: stats?.actionTaken ?? derived.actionTaken,
            rejected: derived.rejected,
            records,
          } satisfies ModuleSummary;
        }),
      );

      setModules(responses);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Commissioner dashboard load failed:', err);
      setError('Unable to load executive analytics. Please refresh the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totals = useMemo(() => {
    return modules.reduce(
      (acc, module) => {
        acc.total += module.total;
        acc.approved += module.approved + module.actionTaken;
        acc.pending += module.pending;
        acc.actionRequired += module.actionRequired;
        acc.rejected += module.rejected;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, actionRequired: 0, rejected: 0 },
    );
  }, [modules]);

  const complianceRate = totals.total > 0 ? Math.round((totals.approved / totals.total) * 100) : 0;
  const closureRate = totals.total > 0
    ? Math.max(0, Math.round(((totals.total - totals.pending - totals.actionRequired) / totals.total) * 100))
    : 0;

  const moduleChartData = useMemo(
    () => modules.map((module) => ({
      name: module.label,
      Approved: module.approved + module.actionTaken,
      Pending: module.pending,
      'Action Required': module.actionRequired,
    })),
    [modules],
  );

  const issueMix = useMemo(
    () => modules
      .map((module) => ({ name: module.label, value: module.actionRequired }))
      .filter((item) => item.value > 0),
    [modules],
  );

  const trendData = useMemo(() => {
    const days = range === '30D' ? 30 : 7;
    if (range === 'ALL') return [];

    const rows = Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      return {
        key: toDateInput(date),
        label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        inspections: 0,
        approved: 0,
        issues: 0,
      };
    });

    const byDate = new Map(rows.map((row) => [row.key, row]));

    modules.forEach((module) => {
      module.records.forEach((record) => {
        const date = getRecordDate(record);
        if (!date) return;

        const row = byDate.get(toDateInput(date));
        if (!row) return;

        row.inspections += 1;
        const status = normalizeStatus(record?.status || record?.reviewStatus || record?.qcStatus);
        if (['APPROVED', 'RESOLVED', 'COMPLETED', 'ACTION_TAKEN'].includes(status)) row.approved += 1;
        if (status === 'ACTION_REQUIRED') row.issues += 1;
      });
    });

    return rows;
  }, [modules, range]);

  const attentionItems = useMemo(() => {
    const items: { title: string; detail: string; tone: string }[] = [];
    const topIssueModule = [...modules].sort((a, b) => b.actionRequired - a.actionRequired)[0];

    if (topIssueModule?.actionRequired) {
      items.push({
        title: `${topIssueModule.actionRequired} action-required records`,
        detail: `${topIssueModule.label} currently has the highest unresolved exception load.`,
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
      });
    }

    if (totals.pending > 0) {
      items.push({
        title: `${totals.pending} inspections awaiting review`,
        detail: 'Pending QC / review workload across the active inspection modules.',
        tone: 'border-blue-200 bg-blue-50 text-blue-900',
      });
    }

    if (items.length === 0 && !loading) {
      items.push({
        title: 'No critical exceptions in this period',
        detail: 'No action-required, pending, or rejected records were returned for the selected period.',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      });
    }

    return items.slice(0, 3);
  }, [modules, totals.pending, loading]);

  const kpis = [
    {
      label: 'Total Inspections',
      value: totals.total.toLocaleString('en-IN'),
      helper: range === 'ALL' ? 'All available records' : `Selected ${range === '7D' ? '7' : '30'} day period`,
      icon: <FileBarChart size={18} />,
      accent: 'from-blue-600 to-indigo-600',
    },
    {
      label: 'Approved / Closed',
      value: totals.approved.toLocaleString('en-IN'),
      helper: `${complianceRate}% of submitted records`,
      icon: <CheckCircle2 size={18} />,
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Compliance Rate',
      value: `${complianceRate}%`,
      helper: 'Approved + resolved operational records',
      icon: <TrendingUp size={18} />,
      accent: 'from-violet-600 to-purple-600',
    },
    {
      label: 'Action Required',
      value: totals.actionRequired.toLocaleString('en-IN'),
      helper: 'Open operational exceptions',
      icon: <AlertTriangle size={18} />,
      accent: 'from-amber-500 to-orange-600',
    },
    {
      label: 'Pending Review',
      value: totals.pending.toLocaleString('en-IN'),
      helper: 'Awaiting QC / workflow decision',
      icon: <Clock3 size={18} />,
      accent: 'from-sky-500 to-blue-600',
    },
    {
      label: 'Workflow Closure',
      value: `${closureRate}%`,
      helper: 'Closed decisions across returned records',
      icon: <TimerReset size={18} />,
      accent: 'from-fuchsia-600 to-violet-700',
    },
  ];

  return (
    <RoleGuard roles={['COMMISSIONER', 'HMS_SUPER_ADMIN']}>
      <div className="min-h-full space-y-5 pb-10">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-6 text-white shadow-[0_24px_70px_-32px_rgba(15,23,42,0.9)] sm:px-8 lg:px-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-80 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                <ShieldCheck size={14} /> Commissioner Command Center
                <span className="h-1 w-1 rounded-full bg-blue-300/60" />
                <span>Read-only executive intelligence</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-[34px]">
                {cityName} Executive Operations
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                One decision layer for city-wide inspections, compliance, unresolved exceptions and module performance.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200">
                  <MapPin size={12} className="text-blue-300" /> {cityName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" /> LIVE DATA
                </span>
                {lastUpdated && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl">
              {(['7D', '30D', 'ALL'] as RangeKey[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${range === item
                    ? 'bg-white text-slate-950 shadow-lg'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {item === 'ALL' ? 'All Time' : item}
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="ml-1 inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/15 px-4 py-2 text-xs font-extrabold text-blue-100 transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <span className="flex items-center gap-2"><AlertTriangle size={17} /> {error}</span>
            <button type="button" onClick={() => loadDashboard(true)} className="font-black text-rose-700 hover:text-rose-900">Retry</button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.accent}`} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{kpi.label}</div>
                  <div className="mt-2 text-[28px] font-black tracking-tight text-slate-950">
                    {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded-lg bg-slate-100" /> : kpi.value}
                  </div>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.accent} text-white shadow-sm`}>
                  {kpi.icon}
                </div>
              </div>
              <div className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">{kpi.helper}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                  <Activity size={18} className="text-blue-600" /> City Performance Trend
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Submitted activity, approved/closed records and action-required exceptions.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {range === 'ALL' ? 'Choose 7D or 30D for trend' : `${range} trend`}
              </span>
            </div>

            <div className="h-[310px]">
              {range === 'ALL' ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
                  <div>
                    <BarChart3 size={30} className="mx-auto text-slate-300" />
                    <div className="mt-2 text-sm font-black text-slate-700">Trend view uses a fixed time window</div>
                    <div className="mt-1 text-xs font-semibold text-slate-400">Select 7D or 30D to inspect movement over time.</div>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="commissionerInspectionArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15,23,42,.12)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    <Area type="monotone" dataKey="inspections" name="Inspections" stroke="#2563eb" strokeWidth={2.5} fill="url(#commissionerInspectionArea)" />
                    <Area type="monotone" dataKey="approved" name="Approved / Closed" stroke="#10b981" strokeWidth={2.2} fillOpacity={0} />
                    <Area type="monotone" dataKey="issues" name="Action Required" stroke="#f59e0b" strokeWidth={2.2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Target size={18} className="text-violet-600" /> Exception Distribution
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">Where current action-required workload is concentrated.</p>
            </div>

            <div className="grid min-h-[310px] grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_0.9fr] xl:grid-cols-1 2xl:grid-cols-[1fr_0.9fr]">
              <div className="h-[220px]">
                {issueMix.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={issueMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={4} stroke="none">
                        {issueMix.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-emerald-50 text-center">
                    <div>
                      <CheckCircle2 size={30} className="mx-auto text-emerald-500" />
                      <div className="mt-2 text-sm font-black text-emerald-800">No open action-required records</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {modules.map((module, index) => (
                  <div key={module.key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="truncate text-[11px] font-bold text-slate-600">{module.label}</span>
                    </div>
                    <span className="text-sm font-black text-slate-950">{module.actionRequired}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Sparkles size={18} className="text-indigo-600" /> Module Health Matrix
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">Side-by-side operational status across the Commissioner&apos;s core inspection systems.</p>
            </div>
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
              Live comparison
            </span>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleChartData} layout="vertical" margin={{ top: 4, right: 10, left: 34, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={118} tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="Approved" stackId="status" fill="#10b981" radius={[5, 0, 0, 5]} />
                <Bar dataKey="Pending" stackId="status" fill="#3b82f6" />
                <Bar dataKey="Action Required" stackId="status" fill="#f59e0b" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {modules.map((module) => {
              const closed = module.approved + module.actionTaken;
              const rate = module.total > 0 ? Math.round((closed / module.total) * 100) : 0;
              return (
                <div key={module.key} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-slate-900">{module.label}</div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Operational closure</div>
                    </div>
                    <div className="text-xl font-black text-slate-950">{rate}%</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-700" style={{ width: `${Math.min(rate, 100)}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-sm font-black text-slate-900">{module.total}</div><div className="text-[9px] font-bold uppercase text-slate-400">Total</div></div>
                    <div><div className="text-sm font-black text-emerald-600">{closed}</div><div className="text-[9px] font-bold uppercase text-slate-400">Closed</div></div>
                    <div><div className="text-sm font-black text-amber-600">{module.actionRequired}</div><div className="text-[9px] font-bold uppercase text-slate-400">Action</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-950"><AlertTriangle size={18} className="text-amber-500" /> Executive Attention</div>
                <p className="mt-1 text-xs font-semibold text-slate-500">Exceptions that deserve review before routine operational detail.</p>
              </div>
            </div>

            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item.title} className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 ${item.tone}`}>
                  <div>
                    <div className="text-sm font-black">{item.title}</div>
                    <div className="mt-0.5 text-[11px] font-semibold opacity-75">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-5 text-white shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={18} className="text-blue-300" /> Decision Queue</div>
            <p className="mt-1 text-xs font-semibold text-slate-400">Current workload that can affect city-level operational closure.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Open Exceptions', value: totals.actionRequired, helper: 'Action required', className: 'text-amber-300' },
                { label: 'Pending Review', value: totals.pending, helper: 'QC / workflow', className: 'text-blue-300' },
                { label: 'Closed Records', value: totals.approved, helper: 'Approved / resolved', className: 'text-emerald-300' },
                { label: 'Active Modules', value: modules.length, helper: 'Reporting now', className: 'text-violet-300' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className={`text-2xl font-black ${item.className}`}>{loading ? '—' : item.value}</div>
                  <div className="mt-1 text-[11px] font-black text-white">{item.label}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-slate-500">{item.helper}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}
