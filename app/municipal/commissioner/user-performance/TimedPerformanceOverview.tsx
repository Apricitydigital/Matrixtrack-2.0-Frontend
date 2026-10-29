'use client';

import { useMemo, type ReactNode } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Clock, Info, ShieldCheck, Sparkles, TriangleAlert, Trophy, Users } from 'lucide-react';
import type { IecPerformance, SiPerformance } from '@lib/apiClient';
import type { PerformanceFocus } from '@lib/userPerformanceDirectory';
import { timedPerformanceSummary } from '@lib/timedPerformanceSummary';

type Row = { key: string; label: string; performance: number | null; si?: SiPerformance | null; iec?: IecPerformance | null };
const number = (value: number) => value.toLocaleString('en-IN');
const percent = (value: number | null) => value === null ? 'Not scored' : `${Math.round(value * 10) / 10}%`;
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function ActionCard({ label, value, unit, note, action, icon, onClick, alert = false }: { label: string; value: ReactNode; unit?: string; note: string; action: string; icon: ReactNode; onClick: () => void; alert?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-5 text-left shadow-[0_4px_20px_-14px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-400 ${alert ? 'border-rose-100 bg-gradient-to-br from-rose-50/70 to-white hover:border-rose-200' : 'border-slate-200/80 bg-white hover:border-indigo-200'}`}>
    <div className="flex items-center justify-between gap-2"><span className={`text-xs font-semibold ${alert ? 'text-rose-800' : 'text-slate-600'}`}>{label}</span><span className={`rounded-lg p-2 ${alert ? 'bg-rose-100/70 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>{icon}</span></div>
    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}{unit && <span className="ml-2 text-xs font-normal text-slate-400">{unit}</span>}</div>
    <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
    <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${alert ? 'text-rose-700' : 'text-indigo-600'}`}>{action}<ChevronRight size={13} /></span>
  </button>;
}

export default function TimedPerformanceOverview({ role, rows, moduleFilter, fromDate, toDate, onReview, onOpen }: {
  role: 'QC' | 'ACTION_OFFICER'; rows: Row[]; moduleFilter: string; fromDate: string; toDate: string;
  onReview: (focus: PerformanceFocus) => void; onOpen: (key: string) => void;
}) {
  const isSi = role === 'QC';
  const allModules = moduleFilter === 'ALL';
  const stats = useMemo(() => timedPerformanceSummary(rows, allModules), [rows, allModules]);
  const staff = isSi ? 'inspectors' : 'members';
  const verb = isSi ? 'reviewed' : 'resolved';
  const top = [...rows].filter(row => row.performance !== null).sort((a, b) => (b.performance ?? 0) - (a.performance ?? 0))[0];
  const topHasOverdue = ((top?.si ?? top?.iec)?.overdue ?? 0) > 0;
  const topWarning = topHasOverdue || (top?.performance ?? 100) < 50;
  const denominator = stats.due || 1;
  const statusCards: { label: string; value: number; note: string; focus: PerformanceFocus; color: string }[] = [
    { label: isSi ? 'Reviewed on time' : 'Resolved on time', value: stats.onTime, note: 'Completed before the deadline. Included in the score.', focus: 'onTime', color: 'text-emerald-700 bg-emerald-50' },
    { label: isSi ? 'Reviewed late' : 'Resolved late', value: stats.late, note: 'Completed after the deadline. Reduces the on-time rate.', focus: 'late', color: 'text-amber-700 bg-amber-50' },
    { label: isSi ? 'Overdue reviews' : 'Overdue resolutions', value: stats.overdue, note: 'Still pending after the deadline. Includes older backlog.', focus: 'overdue', color: 'text-rose-700 bg-rose-50' },
    { label: 'Pending within deadline', value: stats.inProgress, note: 'Still pending, with time remaining. Excluded from the score.', focus: 'pending', color: 'text-indigo-700 bg-indigo-50' },
  ];

  return <section aria-label={isSi ? 'Sanitary Inspector review performance' : 'IEC resolution performance'} className="mt-7">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
      <div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">{isSi ? 'Review performance' : 'Resolution performance'}</div><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{isSi ? 'Are inspections being reviewed on time?' : 'Are cleanliness issues being resolved on time?'}</h2></div>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"><CalendarDays size={13} />{fromDate && toDate ? `${date(fromDate)} to ${date(toDate)}` : 'All time'}</div>
    </div>
    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.4fr)]">
      <div className="relative overflow-hidden rounded-3xl bg-[#111c3a] p-6 text-white shadow-[0_16px_40px_-20px_rgba(17,28,58,0.5)] lg:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-100">{isSi ? <ShieldCheck size={17} /> : <Sparkles size={17} />}Combined on-time {isSi ? 'review' : 'resolution'} rate</div>
          <div className="mt-5 text-6xl font-semibold tracking-[-0.05em]">{percent(stats.rate)}</div>
          <p className="mt-2 text-sm text-slate-300">{number(stats.onTime)} of {number(stats.due)} scored reports {verb} on time</p>
          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${stats.onTime} on time, ${stats.late} late, ${stats.overdue} overdue`}>
            <span className="h-full bg-emerald-400" style={{ width: `${stats.onTime / denominator * 100}%` }} /><span className="h-full bg-amber-400" style={{ width: `${stats.late / denominator * 100}%` }} /><span className="h-full bg-rose-400" style={{ width: `${stats.overdue / denominator * 100}%` }} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            {[[isSi ? 'Reviewed on time' : 'Resolved on time', stats.onTime, 'text-emerald-300'], ['Completed late', stats.late, 'text-amber-300'], ['Still overdue', stats.overdue, 'text-rose-300']].map(([label, value, color]) => <div key={String(label)}><p className="text-[11px] text-slate-300">{label}</p><p className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{number(Number(value))}</p><p className="mt-1 text-[10px] text-slate-400">reports</p></div>)}
          </div>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-300">On-time reports / (on-time + late + overdue reports) x 100. Pending reports still within their deadline are excluded.</p>
          <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs leading-5 text-indigo-200"><span className="font-semibold">Deadline: </span>{isSi ? 'Review by 11:59 PM on the day after report submission.' : 'Resolve by 11:59 PM on the day after the report was sent for action.'} Local time.</div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard label={isSi ? 'Sanitary Inspectors in review' : 'IEC members in review'} value={stats.users} unit={staff} note={`${stats.scoredUsers} with scored reports; ${stats.available - stats.scoredUsers} with nothing scored yet${stats.unavailable ? `; ${stats.unavailable} not calculated` : ''}.`} action="View everyone" icon={<Users size={16} />} onClick={() => onReview('all')} />
        <ActionCard label={isSi ? 'Inspectors with overdue reviews' : 'Members with overdue resolutions'} value={stats.overdueUsers} unit={staff} note={`${number(stats.overdue)} reports remain pending after their deadline. Open these users to review the overdue work.`} action={isSi ? 'Review overdue queues' : 'Review unresolved issues'} icon={<TriangleAlert size={16} />} onClick={() => onReview('overdue')} alert />
        <ActionCard label={isSi ? 'Reviews still within deadline' : 'Resolutions still within deadline'} value={number(stats.inProgress)} unit="reports" note="Pending work with time remaining. Complete it before it becomes overdue; it is not in the score yet." action="View users with pending work" icon={<Clock size={16} />} onClick={() => onReview('pending')} />
        <button type="button" disabled={!top} onClick={() => top && onOpen(top.key)} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_4px_20px_-14px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:border-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-600">Highest individual on-time rate</span><span className="rounded-lg bg-violet-50 p-2 text-violet-600"><Trophy size={16} /></span></div>
          <p className="mt-3 truncate text-lg font-semibold text-slate-950">{top?.label || 'No eligible user'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xl font-semibold tabular-nums text-slate-900">{percent(top?.performance ?? null)}</span>{top && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${topWarning ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{topHasOverdue ? 'Has overdue work' : (top.performance ?? 0) < 50 ? 'Below 50%' : (top.performance ?? 0) >= 99.995 ? 'All scored work on time' : 'Some work completed late'}</span>}</div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Ranking first does not mean every pending report has been completed.</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">Open performance<ChevronRight size={13} /></span>
        </button>
      </div>
    </div>

    {(stats.unavailable > 0 || !stats.consistent) && <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">{stats.unavailable > 0 ? `${stats.unavailable} users have missing performance counters. Totals are incomplete; refresh before comparing users.` : 'The scored-report total does not match on-time, late and overdue reports. Refresh to reconcile the totals.'}</div>}

    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{isSi ? 'Review queue breakdown' : 'Resolution queue breakdown'}</h3><p className="mt-1 text-xs text-slate-500">These are report counts. Select a category to see users with that work.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{statusCards.map(item => <button key={item.label} type="button" onClick={() => onReview(item.focus)} className="rounded-xl border border-slate-100 p-4 text-left transition hover:border-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-400"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${item.color}`}>{item.label}</span><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{number(item.value)}<span className="ml-1.5 text-xs font-normal text-slate-400">reports</span></p><p className="mt-2 text-xs leading-5 text-slate-500">{item.note}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">View users<ChevronRight size={12} /></span></button>)}</div>
    </div>

    <div className="mt-4 grid gap-4 md:grid-cols-3">
      <button type="button" onClick={() => onReview('backlog')} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left transition hover:border-rose-200"><p className="text-xs font-semibold text-slate-600">Older overdue backlog</p><p className="mt-3 text-2xl font-semibold text-slate-950">{number(stats.backlogOverdue)}<span className="ml-2 text-xs font-normal text-slate-400">reports</span></p><p className="mt-2 text-xs leading-5 text-slate-500">From before the selected period. Already included in overdue reports above; do not add it again.</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">Review backlog<ChevronRight size={12} /></span></button>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5"><p className="text-xs font-semibold text-slate-600">Oldest pending {isSi ? 'review' : 'resolution'}</p><p className="mt-3 text-2xl font-semibold text-slate-950">{stats.oldestDays === null ? allModules ? stats.overdue + stats.inProgress === 0 && stats.unavailable === 0 ? 'No pending work' : 'Not recorded' : 'All modules only' : `${number(stats.oldestDays)} days`}</p><p className="mt-2 text-xs leading-5 text-slate-500">{allModules ? 'Age of the longest-waiting pending report across these users. Includes work still within its deadline.' : 'The API supplies age across all modules. Select All Modules to see it.'}</p></div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5"><p className="text-xs font-semibold text-slate-600">Average {isSi ? 'review turnaround' : 'resolution time'}</p><p className="mt-3 text-2xl font-semibold text-slate-950">{stats.avgHours === null ? allModules ? stats.onTime + stats.late === 0 && stats.unavailable === 0 ? 'No completed work' : 'Not recorded' : 'All modules only' : `${Math.round(stats.avgHours * 10) / 10} h`}</p><p className="mt-2 text-xs leading-5 text-slate-500">{allModules ? `Mean of available user averages, from ${isSi ? 'submission to review' : 'action request to resolution'}. Pending reports are excluded.` : 'The API does not provide module-specific averages. Select All Modules to see this value.'}</p></div>
    </div>

    <details className="group mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><Info size={16} className="text-indigo-500" />How {isSi ? 'review' : 'resolution'} performance is measured</span><ChevronDown size={14} className="shrink-0 transition group-open:rotate-180" /></summary>
      <div className="grid gap-5 border-t border-slate-100 px-5 py-5 text-xs leading-5 text-slate-500 md:grid-cols-3">
        <div><h4 className="font-semibold text-slate-800">What counts in the score?</h4><p className="mt-1">Completed reports count as on time or late. Unfinished reports enter the score when their deadline passes. Older pending backlog is included. No scored reports means no percentage, rather than a zero score.</p></div>
        <div><h4 className="font-semibold text-slate-800">Whose work is counted?</h4><p className="mt-1">{isSi ? 'Completed reviews are attributed to the SI; pending reports follow assigned scope.' : 'Issues follow the IEC member\'s assigned scope. Resolution by another IEC member in that scope can count as completed; open the detail view to see who resolved it.'} Area filters select users; each score covers the selected module and dates across their full assigned area. Totals add user queues; shared reports may appear for more than one user.</p></div>
        <div><h4 className="font-semibold text-slate-800">How should I act on a flag?</h4><p className="mt-1">Prioritize overdue work and older backlog. Complete pending work before its deadline. A rate below 50% is flagged even with no current overdue work because past completions were late. Missing data is shown separately.</p></div>
      </div>
      {!isSi && <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-xs leading-5 text-slate-500">{allModules ? `${number(stats.estimated ?? 0)} report timestamps use a fallback action-request time. For older records, the original creation time may be used. Resolved reports without a recorded resolution time are classified as on time by the backend.` : 'Timestamp-quality counts are available for All Modules only. Older reports can use an estimated action-request time.'}</div>}
      {isSi && <p className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-xs leading-5 text-slate-500">Legacy reviews without a recorded review time are classified as on time by the backend. The score measures review timeliness; approval or rejection does not improve the score by itself.</p>}
    </details>
  </section>;
}
