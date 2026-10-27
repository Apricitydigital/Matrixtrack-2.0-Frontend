'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Clock3, FileText, MapPin, X, XCircle } from 'lucide-react';
import { apiFetch, ModuleRecordsApi } from '@lib/apiClient';
import { performanceRangeParams } from '@lib/userPerformanceScores';
import { BEAT_REPORT_CARDS, matchesBeatFilter, reportStatusForBeatFilter, type BeatFilter, type BeatReportCounts } from '@lib/beatReportStats';

type Beat = { id: string; beatName: string; beatCode: string | null; zoneName: string; wardName: string; covered: boolean; reportCount: number; reportCounts?: BeatReportCounts };
type Coverage = { beats: Beat[]; summary: { total: number; covered: number; pending: number }; reportStats?: BeatReportCounts };
export default function BeatCoverageWorkspace({ from, to, zoneId, wardId, search, refresh, overlayOpen, renderReport, targetProgress }: {
  from: string; to: string; zoneId: string; wardId: string; search: string; refresh: number;
  overlayOpen: boolean;
  renderReport: (report: any) => ReactNode;
  targetProgress?: { target: number | null; credit: number | null; pending: number | null; percent: number | null };
}) {
  const [data, setData] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<BeatFilter>('total');
  const [beat, setBeat] = useState<Beat | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [reportRetry, setReportRetry] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const focusBefore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setData(null); setBeat(null); setFilter('total');
    const params = new URLSearchParams();
    const range = performanceRangeParams(from, to);
    params.set('startDate', range.startDate!); params.set('endDate', range.endDate!);
    params.set('tzOffset', String(range.tzOffset));
    if (zoneId) params.set('zoneId', zoneId);
    if (wardId) params.set('wardId', wardId);
    apiFetch<Coverage>(`/city/dashboard/beat-coverage?${params}`)
      .then(response => { if (!cancelled) setData(response); })
      .catch(() => { if (!cancelled) setError('Unable to load beat coverage. Please retry.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, zoneId, wardId, refresh, retry]);

  useEffect(() => {
    if (!beat) return;
    let cancelled = false;
    setReportsLoading(true); setReportsError('');
    if (reportPage === 1) setReports([]);
    const range = performanceRangeParams(from, to);
    ModuleRecordsApi.getRecords('SWEEPING', { beatId: beat.id, beatReportStatus: reportStatusForBeatFilter(filter), fromDate: range.startDate, toDate: range.endDate, tab: 'HISTORY', page: reportPage, limit: 20 })
      .then(response => {
        if (cancelled) return;
        const rows = response.data.map(report => ({ ...report, dashboardModule: 'SWEEPING', dashboardModuleLabel: 'Sweeping' }));
        setReports(current => reportPage === 1 ? rows : [...current, ...rows]);
        setReportTotal(response.meta.total);
      })
      .catch(() => { if (!cancelled) setReportsError('Unable to load submitted reports. Please retry.'); })
      .finally(() => { if (!cancelled) setReportsLoading(false); });
    return () => { cancelled = true; };
  }, [beat, from, to, reportPage, reportRetry, refresh, filter]);

  useEffect(() => {
    if (!beat) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    focusBefore.current = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => { document.body.style.overflow = previous; focusBefore.current?.focus(); };
  }, [beat]);

  useEffect(() => {
    if (!beat || overlayOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopImmediatePropagation(); setBeat(null); }
      if (event.key === 'Tab') {
        const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
        if (!elements?.length) return;
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [beat, overlayOpen]);

  const query = search.trim().toLowerCase();
  const reportStatus = reportStatusForBeatFilter(filter);
  const reportLabel = (BEAT_REPORT_CARDS.find(card => card.key === reportStatus)?.label ?? 'Submitted').replace(/ Reports$/, '');
  const selectFilter = (next: BeatFilter) => { setBeat(null); setReportPage(1); setFilter(next); };
  const visible = (data?.beats ?? []).filter(row =>
    matchesBeatFilter(row, filter) &&
    (!query || [row.beatName, row.beatCode, row.zoneName, row.wardName].join(' ').toLowerCase().includes(query))
  );
  return <div className="space-y-4 p-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Beat coverage" aria-busy={loading}>
      {([
        { key: 'total', label: 'Total Beats', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        { key: 'covered', label: 'Covered Beats', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { key: 'pending', label: 'Pending Beats', icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
      ] as const).map(card => {
        const Icon = card.icon;
        return <button key={card.key} type="button" aria-pressed={filter === card.key} onClick={() => selectFilter(card.key)} className={`rounded-2xl border p-4 text-left ${filter === card.key ? `${card.bg} border-current ${card.color}` : 'border-slate-200 bg-white'}`}>
          <Icon className={`mb-3 h-6 w-6 ${card.color}`} />
          <div className={`text-2xl font-black ${card.color}`}>{data ? data.summary[card.key].toLocaleString() : '\u2014'}</div>
          <div className="mt-1 text-xs font-bold uppercase text-slate-600">{card.label}</div>
        </button>;
      })}
    </div>
    {targetProgress && <div className="rounded-2xl border border-slate-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600"><span>Inspection Target Progress</span><span>{targetProgress.credit == null || targetProgress.target == null ? 'Choose a date range or wait for targets' : `${targetProgress.credit.toLocaleString()} / ${targetProgress.target.toLocaleString()} (${Math.round(targetProgress.percent ?? 0)}%)`}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${targetProgress.percent ?? 0}%` }} /></div>
      {targetProgress.pending != null && <p className="mt-2 text-[11px] text-slate-500">Targeted inspections minus completed inspections = {targetProgress.pending.toLocaleString()} pending inspections.</p>}
    </div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8" aria-label="Beat report status">
      {BEAT_REPORT_CARDS.map(card => {
        const Icon = card.key === 'notCleaned' ? XCircle : card.key === 'attentionRequired' ? AlertTriangle : card.key === 'cleaned' || card.key === 'resolved' ? CheckCircle2 : card.key === 'pendingReview' || card.key === 'resolutionPending' ? Clock3 : FileText;
        return <button key={card.key} type="button" disabled={!data?.reportStats} aria-pressed={filter === card.key} onClick={() => selectFilter(card.key)} className={`rounded-2xl border p-3 text-left transition disabled:opacity-50 ${filter === card.key ? `${card.bg} border-current ${card.color}` : 'border-slate-200 bg-white hover:border-slate-400'}`}>
          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}><Icon className={`h-5 w-5 ${card.color}`} /></div>
          <div className={`text-2xl font-black ${card.color}`}>{data?.reportStats ? data.reportStats[card.key].toLocaleString() : '\u2014'}</div>
          <div className="mt-2 text-[10px] font-black uppercase text-slate-600">{card.label}</div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{card.formula}</p>
        </button>;
      })}
    </div>
    <p className="text-xs text-slate-500">Status counts use distinct beats in the selected period. A beat can appear in multiple statuses when its reports have different outcomes.</p>
    {loading ? <p role="status" className="py-8 text-center text-sm text-slate-500">Loading beats...</p> : error ? <div role="alert" className="py-6 text-center text-sm text-rose-600">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 font-bold underline">Retry</button></div> : <>
      <p className="text-xs text-slate-500">Showing {visible.length.toLocaleString()} beats{reportStatus ? ` · ${reportLabel}` : ''}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map(row => <button type="button" key={row.id} onClick={() => { setReportPage(1); setReportTotal(0); setReports([]); setReportsLoading(true); setBeat(row); }} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-sm">
          <div className="flex items-start justify-between gap-2"><span className="font-black text-slate-800">{row.beatName || row.beatCode || 'Beat'}</span><span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${row.covered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.covered ? 'Covered' : 'Pending'}</span></div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{[row.zoneName, row.wardName].filter(Boolean).join(' / ') || 'Location unavailable'}</div>
          <div className="mt-4 text-xs font-bold text-blue-600">{reportStatus ? `${row.reportCounts?.[reportStatus] ?? 0} ${reportLabel.toLowerCase()} reports` : `${row.reportCount} submitted reports`} &middot; View reports</div>
        </button>)}
      </div>
      {!visible.length && <p className="py-8 text-center text-sm text-slate-500">No beats match the selected filters.</p>}
    </>}
    {beat && typeof document !== 'undefined' && createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setBeat(null)}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${beat.beatName} ${reportLabel.toLowerCase()} reports`} onClick={event => event.stopPropagation()} className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl outline-none">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="font-black text-slate-800">{beat.beatName}</h2><p className="mt-1 text-xs text-slate-500">{reportLabel} inspection reports &middot; {from} to {to}</p></div><button type="button" aria-label="Close beat reports" onClick={() => setBeat(null)} className="rounded-lg bg-slate-100 p-2"><X className="h-5 w-5" /></button></div>
        <div className="overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{reports.map(report => <div key={report.id}>{renderReport(report)}</div>)}</div>
          {reportsLoading && <p role="status" className="py-6 text-center text-sm text-slate-500">Loading reports...</p>}
          {reportsError && <p role="alert" className="py-6 text-center text-sm text-rose-600">{reportsError} <button type="button" onClick={() => setReportRetry(value => value + 1)} className="font-bold underline">Retry</button></p>}
          {!reportsLoading && !reportsError && !reports.length && <p className="py-10 text-center text-sm text-slate-500">No matching {reportLabel.toLowerCase()} reports for this beat in the selected period.</p>}
          {!reportsLoading && !reportsError && reports.length < reportTotal && <div className="mt-4 text-center"><button type="button" onClick={() => setReportPage(value => value + 1)} className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">Load more reports ({reportTotal - reports.length} remaining)</button></div>}
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
