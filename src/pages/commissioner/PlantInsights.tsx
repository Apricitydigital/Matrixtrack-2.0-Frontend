import React from 'react';
import { ArrowUpRight, ChartNoAxesCombined, Scale, Network, CalendarCheck2 } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { ChartCard } from '../../components/analytics/Analytics';
import { amount } from '../../services/insights';
import { buildPlantInsights } from '../../services/plantInsights';

const colors = ['#2864d7', '#138c80', '#8b67cc', '#d99a26', '#6e91ad', '#a7b6c7'];
const percent = (value: number) => `${amount(value)}%`;

export function PlantInsights({ rows, unit, onSelect }: { rows: ProcessingPlantPerformanceRow[]; unit: string; onSelect: (row: ProcessingPlantPerformanceRow) => void }) {
  const { recovery, input, reporting, balance, plants } = buildPlantInsights(rows, unit);
  const [reportingFilter, setReportingFilter] = React.useState('gaps');
  const reportingRows = reportingFilter === 'all' ? reporting.rows : reporting.rows.filter(r => r.missing > 0);
  return <div className="plant-insights plant-insight-grid">
    <ChartCard className="plant-insight-card recovery-insight" eyebrow="01 / RECOVERY BENCHMARK" title="How much input becomes recovered material?" action={<ChartNoAxesCombined size={19} aria-hidden="true" />}>
      <div className="plant-insight-lead"><strong>{recovery.spread == null ? '—' : amount(recovery.spread)}<small>pp</small></strong><div><b>Recovery spread</b><span>Percentage-point difference between highest and lowest rates</span></div></div>
      {recovery.rows.length ? <><div className="plant-chart-axis"><span>Lowest recovery first</span><span>Recovery rate</span></div><div className="plant-recovery-bars">{recovery.rows.map(r => <button key={r.plantId} onClick={() => onSelect(r)} className="plant-chart-row">
        <span className="plant-row-heading"><span>{r.plantName}</span><b>{percent(r.efficiency)} <ArrowUpRight size={13} /></b></span>
        <span className="plant-meter"><i style={{ width: `${Math.min(100, Math.max(0, r.efficiency) / recovery.scale * 100)}%` }} /></span>
      </button>)}</div><div className="plant-chart-axis"><span>0%</span><span>{percent(recovery.scale)}</span></div></> : <div className="plant-chart-empty">Comparable input and recovered quantities are unavailable.</div>}
      <p className="plant-insight-note">{recovery.count} comparable plants{recovery.count > 6 ? ' · Showing the 6 lowest rates' : ''}. Different feedstocks and plant types affect recovery; this is a review aid, not a compliance score. Select a plant for its source quantities.</p>
    </ChartCard>
    <ChartCard className="plant-insight-card concentration-insight" eyebrow="02 / INPUT DEPENDENCY" title="How concentrated is the incoming workload?" action={<Network size={19} aria-hidden="true" />}>
      <div className="plant-insight-lead"><strong>{input.topShare == null ? '—' : percent(input.topShare)}</strong><div><b>Handled by the top two plants</b><span>Share of known incoming {unit} in this selection</span></div></div>
      {input.total > 0 ? <><div className="plant-share-strip" role="img" aria-label={input.segments.map(s => `${s.label}: ${percent(s.value / input.total * 100)}`).join(', ')}>{input.segments.map((s, i) => <span key={s.id} style={{ width: `${s.value / input.total * 100}%`, background: colors[i] }} title={`${s.label}: ${percent(s.value / input.total * 100)}`} />)}</div>
        <div className="plant-input-list">{input.segments.map((s, i) => <button key={s.id} disabled={!s.row} onClick={() => s.row && onSelect(s.row)}><i style={{ background: colors[i] }} /><span>{s.label}</span><b>{percent(s.value / input.total * 100)}</b>{s.row && <ArrowUpRight size={13} />}</button>)}</div>
        <div className="plant-insight-context"><b>{input.contributors} plants receive material</b><span>{input.contributors > 1 ? `${percent(100 - (input.topShare ?? 0))} of known input is handled outside the top two.` : 'One plant accounts for all known incoming material.'}</span></div></> : <div className="plant-chart-empty">No positive received quantities are available to calculate input shares.</div>}
      <p className="plant-insight-note">Use concentration to plan continuity and distribute incoming loads.{input.unknown > 0 ? ` ${input.unknown} plants have no received measurement; their share is unknown.` : ' Shares use supplied input quantities only.'}</p>
    </ChartCard>
    <ChartCard className="plant-insight-card reporting-insight" eyebrow="03 / REPORTING GAPS" title="Where is reporting evidence missing?" action={<CalendarCheck2 size={19} aria-hidden="true" />}>
      <div className="plant-insight-lead"><strong>{reporting.expected > 0 ? amount(reporting.missing, 0) : '—'}<small>plant-days</small></strong><div><b>Uncovered in the selected period</b><span>{reporting.expected > 0 ? `${percent(reporting.reported / reporting.expected * 100)} of expected plant-days covered` : 'Reporting-day counts are unavailable'}</span></div></div>
      <div className="plant-coverage-summary">{[{ label: 'Complete', value: reporting.complete, tone: 'complete' }, { label: 'Gaps', value: reporting.gaps, tone: 'gaps' }, { label: 'Unknown', value: reporting.unknown, tone: 'unknown' }].map(s => <div key={s.label} className={s.tone}><b>{s.value}</b><span>{s.label}</span></div>)}</div>
      <div className="plant-reporting-toolbar"><b>{reportingFilter === 'all' ? 'Reporting by plant' : 'Follow-up queue'}</b><div role="group" aria-label="Reporting plants"><button aria-pressed={reportingFilter === 'gaps'} onClick={() => setReportingFilter('gaps')}>Gaps only</button><button aria-pressed={reportingFilter === 'all'} onClick={() => setReportingFilter('all')}>All known</button></div></div>
      <div className="plant-reporting-list">{reportingRows.length ? reportingRows.map(r => <button className="plant-chart-row" key={r.row.plantId} onClick={() => onSelect(r.row)}><span className="plant-row-heading"><span>{r.row.plantName}</span><b>{r.missing ? `${amount(r.missing, 0)} missing` : 'Covered'} <ArrowUpRight size={13} /></b></span><span className="plant-reporting-track"><i style={{ width: `${r.reported / r.expected * 100}%` }} /></span><small>{amount(r.reported, 0)} / {amount(r.expected, 0)} days covered{r.row.reportingGranularity === 'MONTHLY' ? ' · Monthly source, apportioned by day' : ' · Daily source'}</small></button>) : <div className="plant-chart-empty">{reporting.expected > 0 ? 'No reporting gaps among plants with known counts.' : 'No valid reporting-day counts supplied.'}</div>}</div>
      <p className="plant-insight-note">Coverage describes available reporting evidence, not daily operating activity. Unknown counts are excluded from the denominator.</p>
    </ChartCard>
    <ChartCard className="plant-insight-card balance-insight" eyebrow="04 / RECONCILIATION" title="Which plants have an unexplained balance?" action={<Scale size={19} aria-hidden="true" />}>
      <div className="plant-insight-lead"><strong>{balance.checked ? amount(balance.absolute) : '—'}<small>{unit}</small></strong><div><b>Total absolute discrepancy</b><span>Plant differences are added without cancelling each other</span></div></div>
      {balance.rows.length ? <><div className="plant-balance-key"><span><i />Output exceeds input</span><span><i />Input outside outputs</span></div><div className="plant-balance-list">{balance.rows.map(r => <button className="plant-chart-row" key={r.row.plantId} onClick={() => onSelect(r.row)}><span className="plant-row-heading"><span>{r.row.plantName}</span><b>{r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}{amount(Math.abs(r.delta))} {unit} <ArrowUpRight size={13} /></b></span><span className="plant-balance-track"><i className={r.delta < 0 ? 'is-negative' : ''} style={{ width: `${Math.abs(r.delta) / balance.scale * 50}%`, left: `${r.delta < 0 ? 50 - Math.abs(r.delta) / balance.scale * 50 : 50}%` }} /><em /></span></button>)}</div><div className="plant-chart-axis"><span>−{amount(balance.scale)} {unit}</span><span>0</span><span>+{amount(balance.scale)} {unit}</span></div></> : <div className="plant-chart-empty">{balance.checked ? 'All fully measured plants have matching input and outputs.' : 'No plant has all comparable measurements needed for reconciliation.'}</div>}
      <div className="plant-insight-context"><b>{balance.checked} / {plants} plants can be reconciled</b><span>{balance.excluded ? `${balance.excluded} excluded: incomplete measurements or outputs in a different unit.` : plants ? 'All selected plants have complete, comparable measurements.' : 'No plants in this selection.'}{balance.discrepancies > 6 ? ' Showing the 6 largest differences.' : ''}</span></div>
      <p className="plant-insight-note">Difference = received − recovered − reject − recorded loss. Missing loss is not assumed to be zero. Review stock movements and reporting dates before assigning a cause; a difference is not assumed to be moisture.</p>
    </ChartCard>
  </div>;
}
