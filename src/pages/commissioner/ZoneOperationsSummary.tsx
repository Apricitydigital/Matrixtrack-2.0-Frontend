import React from 'react';
import { Activity, CheckCircle2, ClipboardList, Clock3, MapPin, Target, Users, AlertTriangle } from 'lucide-react';
import { zoneOperationalStats, type ZoneOperations } from '../../services/zoneOperations';
import type { InspectionScope } from '../../services/inspectionMetrics';
import { MODULE_LABELS } from '../../services/presentation';
import { amount } from '../../services/insights';

const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? amount(value, 0) : '—';
const percentage = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? `${amount(value, 1)}%` : '—';
export function ZoneOperationsSummary({ source, scope, label }: { source: ZoneOperations; scope: InspectionScope; label: string }) {
  const stats = zoneOperationalStats(source, scope), loading = source.states.inspections === 'loading';
  const show = (value: unknown) => loading ? '…' : number(value);
  const attendance = source.states.attendance === 'ready' && source.attendance?.hasData ? source.attendance : null;
  const cards = [
    { label: 'Reports received', value: show(stats.achieved), note: `${show(stats.totalRecords)} total records · ${show(stats.drafts)} not yet submitted`, icon: ClipboardList, tone: 'blue' },
    { label: 'Inspection target', value: source.states.targets === 'loading' ? '…' : number(stats.target.target), note: stats.target.available ? `${number(stats.target.remaining)} more reports needed · ${stats.target.fallback ? 'Full coverage baseline' : 'Assigned targets'}` : 'Target source unavailable', icon: Target, tone: 'teal' },
    { label: 'Pending review', value: show(stats.pendingReview), note: 'Includes reports not yet submitted', icon: Clock3, tone: 'amber' },
    { label: 'SI reviewed clean', value: show(stats.clean?.siClean), note: `${show(stats.clean?.siNotClean)} reviewed not clean · ${percentage(stats.clean?.siPercent)} clean`, icon: CheckCircle2, tone: 'green' },
    { label: 'Asset coverage', value: loading ? '…' : percentage(stats.coveragePercent), note: `${show(stats.uniqueEntities)} inspected / ${show(stats.totalEntities)} registered assets`, icon: MapPin, tone: 'teal' },
    { label: 'Workforce present', value: source.states.attendance === 'loading' ? '…' : number(attendance?.present), note: attendance ? `${number(attendance.absent)} absent · ${number(attendance.totalRecords)} attendance records` : source.states.attendance === 'error' ? 'Attendance source unavailable' : 'No attendance sheet received for this period', icon: Users, tone: 'blue' },
    { label: 'Corrective actions pending', value: show(stats.actions.outstanding), note: `${show(stats.actions.totalRequired)} required · ${show(stats.actions.taken)} action taken`, icon: AlertTriangle, tone: 'red' },
    { label: source.issueLabel, value: source.states.issues === 'loading' ? '…' : number(source.issues?.count), note: source.issues ? 'IEC issue workflow' : source.states.issues === 'error' ? 'Issue source unavailable' : 'Area breakdown unavailable in this workflow', icon: Activity, tone: 'amber' },
  ];
  return <section aria-label={`${label} operational statistics`} className="zr-operations">
    <div className="zr-stats-title"><div><span className="zr-eyebrow">OPERATIONAL SNAPSHOT</span><h2>{label}</h2></div><span className="zr-chip">{Object.values(source.states).filter(state => state === 'ready').length}/4 sources loaded</span></div>
    <div className="zr-operational-grid">{cards.map(card => <article key={card.label} data-tone={card.tone}><span className="zr-metric-icon"><card.icon size={18}/></span><span>{card.label}</span><strong>{card.value}</strong><p>{card.note}</p></article>)}</div>
    {Object.keys(source.errors).length > 0 && <div className="zr-data-warning" role="status">Some sources are unavailable: {Object.keys(source.errors).join(', ')}. Loaded statistics remain visible.<details><summary>Source details</summary>{Object.entries(source.errors).map(([topic, error]) => <p key={topic}><b>{topic}:</b> {error}</p>)}</details></div>}
    {!loading && source.data.errors.length > 0 && <div className="zr-data-warning" role="status">Some module totals could not be verified.<details><summary>Inspection source details</summary>{source.data.errors.map((error, i) => <p key={i}>{error}</p>)}</details></div>}
  </section>;
}

export function ZoneModuleStats({ source, scope, label }: { source: ZoneOperations; scope: InspectionScope; label: string }) {
  const stats = zoneOperationalStats(source, scope), ready = source.states.inspections === 'ready';
  const show = (value: unknown) => source.states.inspections === 'loading' ? '…' : number(value);
  const daily = new Map<string, number>();
  if (source.data.from && source.data.to) for (let time = Date.parse(source.data.from); time <= Date.parse(source.data.to) && daily.size < 366; time += 86400000) daily.set(new Date(time).toISOString().slice(0, 10), 0);
  for (const visit of source.data.visits) {
    if ((scope.zone && visit.zoneId !== scope.zone) || (scope.ward && visit.wardId !== scope.ward) || !visit.submittedAt) continue;
    const time = Date.parse(visit.submittedAt); if (!Number.isFinite(time)) continue;
    const day = new Date(time + 330 * 60000).toISOString().slice(0, 10); if (daily.has(day)) daily.set(day, daily.get(day)! + 1);
  }
  const max = Math.max(1, ...daily.values());
  return <section className="zr-panel zr-module-panel" aria-label={`${label} module statistics`}>
    <div className="zr-section-heading"><div><span className="zr-eyebrow">WORK ON THE GROUND</span><h2>Module performance <span className="zr-chip">{label}</span></h2><p>Registered assets, assigned targets and the complete inspection register.</p></div></div>
    <div className="zr-table-scroll"><table className="zr-table zr-module-table"><thead><tr><th>Module</th><th>Assets</th><th>Target</th><th>Received</th><th>Still needed</th><th>Coverage</th><th>SI clean</th><th>SI not clean</th><th>Pending review</th></tr></thead><tbody>{source.data.modules.map(module => {
      const row = zoneOperationalStats(source, { ...scope, module });
      return <tr key={module}><td><strong>{MODULE_LABELS[module]}</strong><small>{row.target.available ? row.target.fallback ? 'Full coverage baseline' : 'Assigned targets' : 'Target loading / unavailable'}</small></td><td>{show(row.totalEntities)}</td><td>{source.states.targets === 'loading' ? '…' : number(row.target.target)}</td><td><strong>{show(row.achieved)}</strong></td><td>{source.states.targets === 'loading' ? '…' : number(row.target.remaining)}</td><td>{ready ? percentage(row.coveragePercent) : '…'}<small>{show(row.uniqueEntities)} assets inspected</small></td><td>{show(row.clean?.siClean)}</td><td>{show(row.clean?.siNotClean)}</td><td>{show(row.pendingReview)}</td></tr>;
    })}</tbody></table></div>
    {!source.data.modules.length && <p className="analytics-empty">{source.states.inspections === 'loading' ? 'Loading module statistics…' : source.states.inspections === 'error' ? 'Inspection source unavailable. Use Refresh to retry.' : 'No modules are enabled in this city.'}</p>}
    <div className="zr-evidence-grid"><div><h3>Inspection status</h3><div className="zr-status-grid">{stats.outcomes.rows.map(row => <div key={row.id}><span>{row.label}</span><strong>{show(row.value)}</strong></div>)}</div><p className="zr-score-note">Current status counts reconcile with total inspection records. AI suggestions remain separate from SI decisions.</p>{stats.clean && <p className="zr-score-note">AI suggestions on undecided reports: {number(stats.clean.aiClean)} clean · {number(stats.clean.aiNotClean)} not clean.</p>}</div><div><h3>Daily report activity</h3>{ready && stats.totalRecords !== null && daily.size <= 90 && daily.size > 0 ? <><div className="zr-activity-bars" role="img" aria-label={`Daily report records: ${[...daily].map(([day, count]) => `${day}: ${count}`).join('; ')}`}>{[...daily].map(([day, count]) => <div key={day} title={`${day}: ${count} records`}><span>{daily.size <= 14 ? count : ''}</span><i style={{ height: `${Math.max(2, count / max * 82)}px` }}/><small>{daily.size <= 14 ? day.slice(8) : ''}</small></div>)}</div><p className="zr-score-note">Daily records · IST dates · includes records not yet submitted.</p></> : <p className="zr-score-note">{!ready ? 'Waiting for inspection data.' : daily.size > 90 ? 'Choose a period of 90 days or fewer to view the daily chart.' : 'Daily activity is unavailable for this scope.'}</p>}</div></div>
    <details className="zr-formula"><summary>What these figures mean</summary><p>Received counts submitted inspections. Total records also includes work not yet submitted. Assets counts current registered locations; coverage counts each inspected location once across the period. With no configured assignment target, the full coverage baseline is registered assets × selected days. Attendance is counted as employee-day records across multiple days, not unique people. Corrective action lifecycle counts can overlap current report statuses.</p></details>
  </section>;
}
