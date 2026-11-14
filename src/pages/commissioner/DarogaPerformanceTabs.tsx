import React, { useEffect, useMemo, useState } from 'react';
import type { City, User } from '../../types';
import { api } from '../../services/api';
import { matrixStore } from '../../services/store';
import { useInspectionCoverage } from '../../services/useInspectionCoverage';
import { darogaAttendance, darogaCleaned, darogaOverall, DAROGA_WEIGHTS } from '../../services/darogaBreakdown';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { canonicalModuleKey } from '../../services/moduleKeys';

type Officer = { user: User; stat: any };
export type DarogaTab = 'overall' | 'inspection' | 'attendance' | 'cleaned';
export const DAROGA_TABS: [DarogaTab, string][] = [['overall', 'Overall'], ['inspection', 'Inspection performance'], ['attendance', 'Attendance'], ['cleaned', 'Cleaned vs Not cleaned']];
const pct = (v: number | null | undefined) => v == null ? 'Not assessed' : `${v.toFixed(1)}%`;

export function DarogaPerformanceTabs({ city, module, rows, tab, onTab }: { city: City; module: string; rows: Officer[]; tab: DarogaTab; onTab: (t: DarogaTab) => void }) {
  const { from, to } = matrixStore.getDateRange();
  const scopeCity = { ...city, enabledModules: city.enabledModules.filter(id => module === 'ALL' || canonicalModuleKey(id) === canonicalModuleKey(module)) };
  const coverage = useInspectionCoverage(scopeCity, from, to, matrixStore.loadRevision, true, true);
  const [attendance, setAttendance] = useState<{ rows: any[]; status: 'loading' | 'ready' | 'error' }>({ rows: [], status: 'loading' });
  useEffect(() => {
    const c = new AbortController(); setAttendance({ rows: [], status: 'loading' });
    api(`/city/attendance/dashboard?${new URLSearchParams({ from, to, page: '1', pageSize: '1' })}`, { signal: c.signal, cache: 'no-store' })
      .then(d => { if (!c.signal.aborted) setAttendance({ rows: Array.isArray(d?.allEmployees) ? d.allEmployees : [], status: 'ready' }); })
      .catch(() => { if (!c.signal.aborted) setAttendance({ rows: [], status: 'error' }); });
    return () => c.abort();
  }, [city.id, from, to]);

  const data = useMemo(() => {
    const people = rows.map(r => r.user);
    return rows.map(({ user, stat }) => {
      const cleaned = darogaCleaned(coverage.data.visits, user.id, module), att = darogaAttendance(user, people, attendance.rows);
      const inspection = typeof stat?.performance === 'number' ? stat.performance : null;
      return { user, stat, cleaned, att, inspection, overall: darogaOverall({ inspection, cleaned: cleaned.score, attendance: att?.score ?? null }) };
    }).sort((a, b) => (b.overall.score ?? -1) - (a.overall.score ?? -1) || a.user.name.localeCompare(b.user.name));
  }, [rows, coverage.data, attendance.rows, module]);
  const paging = usePagination(data, tab + data.map(d => d.user.id).join(','));
  const covLoading = coverage.loading, attLoading = attendance.status === 'loading';

  const head: Record<DarogaTab, string[]> = {
    overall: ['Overall score', 'Inspection (40%)', 'Cleaned (40%)', 'Attendance (20%)'],
    inspection: ['Score', 'Credited', 'Target'],
    attendance: ['Score', 'Present days', 'Recorded days', 'Absent days'],
    cleaned: ['Score', 'Cleaned', 'Not cleaned', 'By SI decision', 'By AI suggestion', 'Not assessable']
  };
  const cells = (d: typeof data[number]): React.ReactNode[] => {
    const att = d.att, c = d.cleaned;
    if (tab === 'overall') return [<b key="o">{pct(d.overall.score)}</b>, pct(d.inspection), covLoading ? '…' : pct(c.score), attLoading ? '…' : pct(att?.score)];
    if (tab === 'inspection') return [<b key="s">{pct(d.inspection)}</b>, d.stat?.completed ?? '—', d.stat?.required ?? '—'];
    if (tab === 'attendance') return att ? [<b key="s">{pct(att.score)}</b>, att.presentDays, att.recordedDays, att.absentDays] : [<b key="s">{attLoading ? '…' : 'Not matched'}</b>, '—', '—', '—'];
    return covLoading ? [<b key="s">…</b>, '…', '…', '…', '…', '…'] : [<b key="s">{pct(c.score)}</b>, c.cleaned, c.notCleaned, c.siDecided, c.aiSuggested, c.unassessed];
  };
  const note: Record<DarogaTab, string> = {
    overall: `Overall = Inspection ${DAROGA_WEIGHTS.inspection}% + Cleaned ${DAROGA_WEIGHTS.cleaned}% + Attendance ${DAROGA_WEIGHTS.attendance}%. A part with no score is left out and the remaining weights are rescaled.`,
    inspection: 'Credited inspections ÷ assigned inspection target, capped at 100%.',
    attendance: 'Present days ÷ days with an uploaded attendance record in the selected dates. Matched by employee ID, else by a unique name; unmatched users show Not matched.',
    cleaned: 'Cleaned ÷ (Cleaned + Not cleaned), for the selected module. Uses the saved SI decision (Approved = cleaned; Rejected = not cleaned), even after corrective action. Reports without an SI decision use the AI suggestion. Reports without an assessable result are excluded.'
  };
  return <section className="workspace-panel daroga-performance-tabs">
    <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">DAROGA</span><h2>Performance by parameter</h2></div>
      <div className="view-switch no-print" role="tablist" aria-label="Daroga performance parameter">{DAROGA_TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => onTab(id)}>{label}</button>)}</div></div>
    <p className="score-context-note">{note[tab]}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Daroga</th>{head[tab].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
      {paging.rows.map(d => <tr key={d.user.id}><td>{d.user.name}</td>{cells(d).map((c, i) => <td key={i}>{c}</td>)}</tr>)}
    </tbody></table></div>
    {!data.length && <p className="analytics-empty">No Darogas match this selection.</p>}
    <Pagination {...paging} noun="Darogas" />
  </section>;
}
