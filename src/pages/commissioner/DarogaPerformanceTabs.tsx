import React, { useEffect, useMemo, useState } from 'react';
import { officerGeography } from '../../services/performanceSelection';
import type { City, User, Ward, Zone } from '../../types';
import { loadDarogaAttendance } from '../../services/darogaAttendance';
import { matrixStore } from '../../services/store';
import { useInspectionCoverage } from '../../services/useInspectionCoverage';
import { attendanceGap, darogaAttendance, darogaCleaned, darogaOverall, DAROGA_WEIGHTS } from '../../services/darogaBreakdown';
import { Drawer } from '../../components/common/Drawer';
import { OfficerPerformanceDetail } from './OfficerPerformanceDetail';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { canonicalModuleKey } from '../../services/moduleKeys';

type Officer = { user: User; stat: any };
export type DarogaTab = 'overall' | 'inspection' | 'attendance' | 'cleaned';
export const DAROGA_TABS: [DarogaTab, string][] = [['overall', 'Overall'], ['inspection', 'Inspection performance'], ['attendance', 'Attendance'], ['cleaned', 'Cleaned vs Not cleaned']];
const Score = ({value, pending = false}: {value: number | null | undefined; pending?: boolean}) => <span className="officer-score" data-tone={value == null || pending ? 'muted' : value >= 75 ? 'good' : value >= 40 ? 'fair' : 'low'}><strong>{pending ? 'Loading...' : pct(value)}</strong>{value != null && !pending && <span className="officer-score-track" aria-hidden="true"><i style={{width: `${Math.min(100, Math.max(0, value))}%`}}/></span>}</span>;
const pct = (v: number | null | undefined) => v == null ? 'Not assessed' : `${v.toFixed(1)}%`;

export function DarogaPerformanceTabs({ city, module, rows, tab, onTab, rawStats, wards, zones = [] }: { city: City; module: string; rows: Officer[]; tab: DarogaTab; onTab: (t: DarogaTab) => void; rawStats?: Record<string, any>; wards: Ward[]; zones?: Zone[] }) {
  const { from, to } = matrixStore.getDateRange();
  const scopeCity = { ...city, enabledModules: city.enabledModules.filter(id => module === 'ALL' || canonicalModuleKey(id) === canonicalModuleKey(module)) };
  const coverage = useInspectionCoverage(scopeCity, from, to, matrixStore.loadRevision, true, true);
  const [selectedId, setSelectedId] = useState('');
  const attendanceKey = JSON.stringify([city.id, from, to, matrixStore.loadRevision]);
  const [attendanceRead, setAttendance] = useState<{rows:any[];status:'loading'|'ready'|'no_data'|'error';period:string;key:string}>({rows:[],status:'loading',period:'',key:''});
  const attendance = attendanceRead.key === attendanceKey ? attendanceRead : {rows:[],status:'loading' as const,period:'',key:attendanceKey};
  useEffect(() => {
    const c = new AbortController(); setAttendance({ rows: [], status: 'loading', period: '', key: attendanceKey });
    loadDarogaAttendance(city.id, from, to, c.signal).then(result => {
      if (!c.signal.aborted) setAttendance({...result,key:attendanceKey});
    }).catch(() => { if (!c.signal.aborted) setAttendance({rows:[],status:'error',period:'',key:attendanceKey}); });
    return () => c.abort();
  }, [attendanceKey]);
  const attendanceLabel = attendance.status === 'loading' ? 'Loading...' : attendance.status === 'error' ? 'Unavailable' : attendance.status === 'no_data' ? 'No attendance data' : 'Not matched';

  const data = useMemo(() => {
    const people = rows.map(r => r.user);
    return rows.map(({ user, stat }) => {
      const cleaned = darogaCleaned(coverage.data.visits, user.id, module), att = darogaAttendance(user, people, attendance.rows, { from, to });
      const inspection = typeof stat?.performance === 'number' ? stat.performance : null;
      return { user, stat, cleaned, att, inspection, overall: darogaOverall({ inspection, cleaned: cleaned.score, attendance: att?.score ?? null }) };
    }).sort((a, b) => (b.overall.score ?? -1) - (a.overall.score ?? -1) || a.user.name.localeCompare(b.user.name));
  }, [rows, coverage.data, attendance.rows, module, from, to]);
  const paging = usePagination(data, tab + data.map(d => d.user.id).join(','));
  const selected = data.find(d => d.user.id === selectedId);
  const place = (u: User) => {
    const g = officerGeography(u, wards, module);
    const list = (ids: string[], src: { id: string; name: string }[]) => ids.map(id => src.find(x => x.id === id)?.name).filter(Boolean).join(', ') || '—';
    return { zone: list(g.zoneIds, zones), ward: list(g.wardIds, wards) };
  };
  const covLoading = coverage.loading, attLoading = attendance.status === 'loading';

  const head: Record<DarogaTab, string[]> = {
    overall: ['Overall score', 'Inspection (40%)', 'Cleaned (40%)', 'Attendance (20%)'],
    inspection: ['Score', 'Credited', 'Target'],
    attendance: ['Score', 'Present days', 'Selected days', 'Recorded days', 'Absent days', 'Missing days'],
    cleaned: ['Score', 'Cleaned', 'Not cleaned', 'By SI decision', 'By AI suggestion', 'Not assessable']
  };
  const cells = (d: typeof data[number]): React.ReactNode[] => {
    const att = d.att, c = d.cleaned;
    if (tab === 'overall') return [<Score key="o" value={d.overall.score} pending={covLoading || attLoading}/>, <Score key="i" value={d.inspection}/>, <Score key="c" value={c.score} pending={covLoading}/>, att?.score != null ? <span key="a"><Score value={att.score}/><small className="officer-data-label">{att.presentDays} / {att.selectedDays} days; {att.missingDays} missing</small></span> : <span className="officer-data-label">{attendanceLabel}</span>];
    if (tab === 'inspection') return [<Score key="s" value={d.inspection}/>, d.stat?.completed ?? '—', d.stat?.required ?? '—'];
    if (tab === 'attendance') return att ? [<Score key="s" value={att.score}/>, att.presentDays, att.selectedDays, att.recordedDays, att.absentDays, att.missingDays] : [<b key="s">{attLoading ? '…' : 'Not matched'}</b>, <span key="g" title={attendanceGap(d.user, attendance.rows)}>—</span>, ...head.attendance.slice(2).map(() => '—')];
    return covLoading ? [<b key="s">…</b>, '…', '…', '…', '…', '…'] : [<Score key="s" value={c.score}/>, c.cleaned, c.notCleaned, c.siDecided, c.aiSuggested, c.unassessed];
  };
  const note: Record<DarogaTab, string> = {
    overall: `Overall = Inspection ${DAROGA_WEIGHTS.inspection}% + Cleaned ${DAROGA_WEIGHTS.cleaned}% + Attendance ${DAROGA_WEIGHTS.attendance}%. A part with no score is left out and the remaining weights are rescaled.`,
    inspection: 'Credited inspections ÷ assigned inspection target, capped at 100%.',
    attendance: 'Present days ÷ all calendar days in the selected dates (inclusive). Missing records earn no attendance credit and are shown separately from recorded absences. Matched by the system link (Aadhaar or name), employee ID or phone, then name; unmatched users show Not matched.',
    cleaned: 'Cleaned ÷ (Cleaned + Not cleaned), for the selected module. Uses the saved SI decision (Approved = cleaned; Rejected = not cleaned), even after corrective action. Reports without an SI decision use the AI suggestion. Reports without an assessable result are excluded.'
  };
  const assessed = data.filter(d => d.overall.score != null);
  const average = assessed.length ? assessed.reduce((sum,d) => sum + d.overall.score!,0) / assessed.length : null;
  const summaryPending = covLoading || attLoading || data.some(d => d.stat?.availability === 'loading');
  return <section className="daroga-performance-view">
    <div className="officer-overview" aria-label="Selected Daroga summary">
      <article><span>Officers in view</span><strong>{data.length}</strong><p>Within your current filters</p></article>
      <article className="officer-overview-primary"><span>Average overall score</span><strong>{summaryPending ? 'Loading...' : pct(average)}</strong><p>{summaryPending ? 'Reading selected-period data' : `${assessed.length} officers with an assessed score`}</p></article>
      <article><span>Cleanliness results</span><strong>{covLoading ? 'Loading...' : data.reduce((n,d) => n+d.cleaned.cleaned,0)}<small> cleaned</small></strong><p>{covLoading ? 'Reading SI and AI results' : `${data.reduce((n,d) => n+d.cleaned.notCleaned,0)} not cleaned · SI decisions + AI suggestions`}</p></article>
      <article><span>Attendance availability</span><strong>{attLoading ? 'Loading...' : attendance.status === 'error' ? 'Unavailable' : `${data.filter(d => d.att?.score != null).length} / ${data.length}`}</strong><p>{attendance.status === 'no_data' ? 'No upload for the selected dates' : 'Officers matched to attendance records'}</p></article>
    </div>
    <section className="workspace-panel daroga-performance-tabs">
    <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">DAROGA</span><h2>Team performance</h2><p className="officer-table-hint">Select an officer to explore their score breakdown</p></div>
      <div className="view-switch no-print" role="tablist" aria-label="Daroga performance parameter">{DAROGA_TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => onTab(id)}>{label}</button>)}</div></div>
    <details className="officer-score-guide"><summary>How this score is calculated</summary><p className="score-context-note">{note[tab]}{tab === 'attendance' && ['ready','no_data'].includes(attendance.status) ? ` Attendance for ${attendance.period || 'the selected dates'}. Matched ${data.filter(d => d.att).length} of ${data.length} Darogas from ${attendance.rows.length} attendance rows.` : ''}{attendance.status === 'no_data' ? ' No attendance uploaded for the selected dates. Attendance contributes no marks; the overall uses the remaining assessed parameters.' : attendance.status === 'error' ? ' Attendance unavailable; it contributes no marks to the overall.' : ''}</p></details>
    {attendance.status === 'no_data' && <div className="officer-attendance-notice" role="status"><i/>No attendance uploaded for these dates. No attendance marks awarded.</div>}
    {attendance.status === 'error' && <div className="officer-attendance-notice" role="status">Attendance could not be loaded. No attendance marks awarded.</div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Daroga</th><th>Zone</th><th>Ward</th>{head[tab].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
      {paging.rows.map(d => <tr key={d.user.id} tabIndex={0} role="button" style={{cursor:'pointer'}} aria-label={`Open performance details for ${d.user.name}`} onClick={() => setSelectedId(d.user.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(d.user.id); } }}><td><span className="officer-identity"><span className="officer-avatar" aria-hidden="true">{d.user.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('')}</span><span><strong>{d.user.name}</strong><small>View breakdown <span aria-hidden="true">↗</span></small></span></span></td><td>{place(d.user).zone}</td><td>{place(d.user).ward}</td>{cells(d).map((c, i) => <td key={i}>{c}</td>)}</tr>)}
    </tbody></table></div>
    {!data.length && <p className="analytics-empty">No Darogas match this selection.</p>}
    <Pagination {...paging} noun="Darogas" />
    <Drawer isOpen={Boolean(selected)} onClose={() => setSelectedId('')} title={selected?.user.name || 'Daroga performance'} subtitle="Daroga" width="4xl">{selected && <>
      <div className="analytics-kpis" style={{ marginBottom: 16 }}>
        {([['Overall', selected.overall.score], ['Inspection (40%)', selected.inspection], ['Cleaned (40%)', selected.cleaned.score], ['Attendance (20%)', selected.att?.score ?? null]] as [string, number | null][]).map(([l, v]) => <article key={l}><span>{l}</span><strong>{l === 'Attendance (20%)' && v == null ? attendanceLabel : l === 'Overall' && (covLoading || attLoading) ? 'Loading...' : pct(v)}</strong></article>)}
      </div>
      <p className="score-context-note" style={{ marginBottom: 8 }}><b>Aadhaar:</b> {selected.user.aadhaar ? selected.user.aadhaar.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : 'Not recorded'}{selected.user.employeeId ? <> · <b>Employee ID:</b> {selected.user.employeeId}</> : null}</p>
      <p className="score-context-note" style={{ marginBottom: 16 }}>Cleaned {selected.cleaned.cleaned} · Not cleaned {selected.cleaned.notCleaned} ({selected.cleaned.siDecided} by SI decision, {selected.cleaned.aiSuggested} by AI suggestion, {selected.cleaned.unassessed} not assessable). Attendance: {selected.att ? `${selected.att.presentDays} present / ${selected.att.selectedDays} selected days; ${selected.att.recordedDays} recorded, ${selected.att.absentDays} absent, ${selected.att.missingDays} missing` : attendance.status === 'ready' ? attendanceGap(selected.user, attendance.rows) : attendanceLabel}.</p>
      <OfficerPerformanceDetail key={selected.user.id + module} user={selected.user} raw={rawStats?.[selected.user.id]} role="SUPERVISOR" module={module} wards={wards} period={matrixStore.getDateRange()} />
    </>}</Drawer>
  </section></section>;
}
