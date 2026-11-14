import React, { useEffect, useMemo, useState } from 'react';
import { officerGeography } from '../../services/performanceSelection';
import type { City, User, Ward, Zone } from '../../types';
import { api } from '../../services/api';
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
const pct = (v: number | null | undefined) => v == null ? 'Not assessed' : `${v.toFixed(1)}%`;

export function DarogaPerformanceTabs({ city, module, rows, tab, onTab, rawStats, wards, zones = [] }: { city: City; module: string; rows: Officer[]; tab: DarogaTab; onTab: (t: DarogaTab) => void; rawStats?: Record<string, any>; wards: Ward[]; zones?: Zone[] }) {
  const { from, to } = matrixStore.getDateRange();
  const scopeCity = { ...city, enabledModules: city.enabledModules.filter(id => module === 'ALL' || canonicalModuleKey(id) === canonicalModuleKey(module)) };
  const coverage = useInspectionCoverage(scopeCity, from, to, matrixStore.loadRevision, true, true);
  const [selectedId, setSelectedId] = useState('');
  const [attendance, setAttendance] = useState<{ rows: any[]; status: 'loading' | 'ready' | 'error'; period: string; fallback: boolean }>({ rows: [], status: 'loading', period: '', fallback: false });
  useEffect(() => {
    const c = new AbortController(); setAttendance({ rows: [], status: 'loading', period: '', fallback: false });
    const read = (q: Record<string, string>) => api(`/city/attendance/dashboard?${new URLSearchParams({ cityId: city.id, ...q, page: '1', pageSize: '1' })}`, { signal: c.signal, cache: 'no-store' });
    const label = (d: any, f: string, t: string) => { const a = String(d?.range?.from || f).slice(0, 10), b = String(d?.range?.to || t).slice(0, 10); return a === b ? a : `${a} to ${b}`; };
    (async () => {
      try {
        let d = await read({ from, to }), fallback = false;
        // Attendance is uploaded per day. If nothing was uploaded in the selected dates, use the latest uploaded day instead.
        if (!(Array.isArray(d?.allEmployees) && d.allEmployees.length)) { d = await read({}); fallback = true; }
        if (!c.signal.aborted) setAttendance({ rows: Array.isArray(d?.allEmployees) ? d.allEmployees : [], status: 'ready', period: label(d, from, to), fallback });
      } catch { if (!c.signal.aborted) setAttendance({ rows: [], status: 'error', period: '', fallback: false }); }
    })();
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
    attendance: ['Score', 'Present days', 'Recorded days', 'Absent days'],
    cleaned: ['Score', 'Cleaned', 'Not cleaned', 'By SI decision', 'By AI suggestion', 'Not assessable']
  };
  const cells = (d: typeof data[number]): React.ReactNode[] => {
    const att = d.att, c = d.cleaned;
    if (tab === 'overall') return [<b key="o">{pct(d.overall.score)}</b>, pct(d.inspection), covLoading ? '…' : pct(c.score), attLoading ? '…' : pct(att?.score)];
    if (tab === 'inspection') return [<b key="s">{pct(d.inspection)}</b>, d.stat?.completed ?? '—', d.stat?.required ?? '—'];
    if (tab === 'attendance') return att ? [<b key="s">{pct(att.score)}</b>, att.presentDays, att.recordedDays, att.absentDays] : [<b key="s">{attLoading ? '…' : 'Not matched'}</b>, <span key="g" title={attendanceGap(d.user, attendance.rows)}>—</span>, '—', '—'];
    return covLoading ? [<b key="s">…</b>, '…', '…', '…', '…', '…'] : [<b key="s">{pct(c.score)}</b>, c.cleaned, c.notCleaned, c.siDecided, c.aiSuggested, c.unassessed];
  };
  const note: Record<DarogaTab, string> = {
    overall: `Overall = Inspection ${DAROGA_WEIGHTS.inspection}% + Cleaned ${DAROGA_WEIGHTS.cleaned}% + Attendance ${DAROGA_WEIGHTS.attendance}%. A part with no score is left out and the remaining weights are rescaled.`,
    inspection: 'Credited inspections ÷ assigned inspection target, capped at 100%.',
    attendance: 'Present days ÷ days with an uploaded attendance record in the selected dates. Matched by the system link (Aadhaar or name), employee ID or phone, then name; unmatched users show Not matched.',
    cleaned: 'Cleaned ÷ (Cleaned + Not cleaned), for the selected module. Uses the saved SI decision (Approved = cleaned; Rejected = not cleaned), even after corrective action. Reports without an SI decision use the AI suggestion. Reports without an assessable result are excluded.'
  };
  return <section className="workspace-panel daroga-performance-tabs">
    <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">DAROGA</span><h2>Performance by parameter</h2></div>
      <div className="view-switch no-print" role="tablist" aria-label="Daroga performance parameter">{DAROGA_TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => onTab(id)}>{label}</button>)}</div></div>
    <p className="score-context-note">{note[tab]}{tab === 'attendance' && attendance.status === 'ready' ? ` Attendance for ${attendance.period || 'the selected dates'}${attendance.fallback ? ' (latest uploaded day; nothing was uploaded in the selected dates)' : ''}. Matched ${data.filter(d => d.att).length} of ${data.length} Darogas from ${attendance.rows.length} attendance rows.` : ''}{attendance.status === 'error' && tab === 'attendance' ? ' Attendance data could not be loaded.' : ''}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Daroga</th><th>Zone</th><th>Ward</th>{head[tab].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>
      {paging.rows.map(d => <tr key={d.user.id} tabIndex={0} role="button" style={{cursor:'pointer'}} aria-label={`Open performance details for ${d.user.name}`} onClick={() => setSelectedId(d.user.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(d.user.id); } }}><td>{d.user.name}</td><td>{place(d.user).zone}</td><td>{place(d.user).ward}</td>{cells(d).map((c, i) => <td key={i}>{c}</td>)}</tr>)}
    </tbody></table></div>
    {!data.length && <p className="analytics-empty">No Darogas match this selection.</p>}
    <Pagination {...paging} noun="Darogas" />
    <Drawer isOpen={Boolean(selected)} onClose={() => setSelectedId('')} title={selected?.user.name || 'Daroga performance'} subtitle="Daroga" width="4xl">{selected && <>
      <div className="analytics-kpis" style={{ marginBottom: 16 }}>
        {([['Overall', selected.overall.score], ['Inspection (40%)', selected.inspection], ['Cleaned (40%)', selected.cleaned.score], ['Attendance (20%)', selected.att?.score ?? null]] as [string, number | null][]).map(([l, v]) => <article key={l}><span>{l}</span><strong>{pct(v)}</strong></article>)}
      </div>
      <p className="score-context-note" style={{ marginBottom: 8 }}><b>Aadhaar:</b> {selected.user.aadhaar ? selected.user.aadhaar.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ') : 'Not recorded'}{selected.user.employeeId ? <> · <b>Employee ID:</b> {selected.user.employeeId}</> : null}</p>
      <p className="score-context-note" style={{ marginBottom: 16 }}>Cleaned {selected.cleaned.cleaned} · Not cleaned {selected.cleaned.notCleaned} ({selected.cleaned.siDecided} by SI decision, {selected.cleaned.aiSuggested} by AI suggestion, {selected.cleaned.unassessed} not assessable). Attendance: {selected.att ? `${selected.att.presentDays} present of ${selected.att.recordedDays} recorded days` : attendanceGap(selected.user, attendance.rows)}.</p>
      <OfficerPerformanceDetail key={selected.user.id + module} user={selected.user} raw={rawStats?.[selected.user.id]} role="SUPERVISOR" module={module} wards={wards} period={matrixStore.getDateRange()} />
    </>}</Drawer>
  </section>;
}
