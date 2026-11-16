import React from 'react';
import { ArrowUpRight, Factory, Recycle } from 'lucide-react';
import { CardInfo } from '../../components/common/CardInfo';
import { computeUnitTotals } from '../../services/plantAnalytics';
type ProcessingUnitTotals = ReturnType<typeof computeUnitTotals>[number];

const num = (n: number | null | undefined, d = 1) => n == null || !Number.isFinite(n) ? 'N/A' : n.toLocaleString('en-IN', { maximumFractionDigits: d });
const FLOW = [
  { id: 'received', label: 'Received', color: '#2a78d6', note: 'Material that reached the plants' },
  { id: 'processed', label: 'Processed', color: '#8a63d2', note: 'Material put through processing' },
  { id: 'recovered', label: 'Recovered', color: '#0ca30c', note: 'Useful material recovered' },
  { id: 'reject', label: 'Reject / residual', color: '#d03b3b', note: 'Material that could not be recovered' },
  { id: 'processLoss', label: 'Process loss', color: '#eda100', note: 'Loss during processing' },
] as const;

/** City-wide plant summary: recovery rate, how the material flows through the plants, and which plants recover most / least. */
export function PlantOverview({ plants, totals, primary, loading = false, onOpen, onNavigate }: {
  plants?: any; totals: ProcessingUnitTotals[]; primary?: ProcessingUnitTotals; loading?: boolean; onOpen: () => void; onNavigate: () => void;
}) {
  const reporting = plants?.reportingPlants ?? plants?.activePlants, total = plants?.totalPlants;
  const reportPct = typeof reporting === 'number' && typeof total === 'number' && total > 0 ? Math.min(100, reporting / total * 100) : null;
  const unit = primary?.unit || '';
  const received = primary?.available.received ? primary.received : null;
  const share = (v: number | null) => received && v != null ? v / received * 100 : null;
  const flow = FLOW.filter(f => f.id === 'processLoss' ? primary?.hasProcessLoss : true).map(f => {
    const value = primary && primary.available[f.id as keyof typeof primary.available] ? (primary as any)[f.id] as number : null;
    return { ...f, value, share: f.id === 'received' ? (value == null ? null : 100) : share(value) };
  });
  const rows = ((plants?.plantPerformance || []) as any[]).filter(p => p.efficiencyAvailable && (p.unit || 'MT') === (unit || 'MT'));
  const best = [...rows].sort((a, b) => b.efficiency - a.efficiency).slice(0, 2);
  const bestIds = new Set(best.map(p => p.plantId || p.plantName));
  const lowest = [...rows].sort((a, b) => a.efficiency - b.efficiency).filter(p => !bestIds.has(p.plantId || p.plantName)).slice(0, 2);
  const recovery = primary?.hasEfficiency ? primary.efficiency : null;
  const list = (title: string, items: any[], tone: string) => <div className="pl-list" data-tone={tone}>
    <h4>{title}</h4>
    {items.length ? <ol>{items.map(p => <li key={p.plantId || p.plantName}><span>{p.plantName}</span><i aria-hidden="true"><u style={{ width: `${Math.min(100, p.efficiency)}%` }} /></i><b>{num(p.efficiency, 1)}%</b></li>)}</ol> : <p>Not enough plants reporting.</p>}
  </div>;

  return <section className="home-section plant-overview pl" aria-label="Plant and processing">
    <div className="home-section-heading"><div><span><Recycle size={14} /> CITY-WIDE RECOVERY</span><h2>Plant &amp; Processing</h2><p>How much material the plants received, processed and recovered in the selected dates.</p></div>
      <CardInfo title="How recovery is measured"><p>Recovery rate = material recovered ÷ material received, using plants that report both. Each line below shows its share of material received.</p><p>Plants that have not reported both figures are left out of the rate rather than counted as zero.</p></CardInfo>
      <button type="button" className="pl-link" onClick={onNavigate}>Plant performance &amp; reporting <ArrowUpRight size={14} /></button></div>

    <div className="pl-top">
      <div className="pl-hero" role="button" tabIndex={0} data-click="true" aria-label="Open plant details" onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}>
        <span className="pl-eyebrow">Recovery rate</span>
        <strong className="pl-pct">{loading ? '…' : recovery == null ? 'N/A' : `${num(recovery, 1)}%`}</strong>
        <div className="pl-track" role="img" aria-label="Recovery rate"><i style={{ width: `${Math.min(100, recovery ?? 0)}%` }} /></div>
        <p>{primary ? `${num(primary.recovered)} ${unit} recovered of ${num(primary.received)} ${unit} received` : 'No plant figures recorded for these dates.'}</p>
        <div className="pl-reporting"><Factory size={14} /><span><b>{num(reporting, 0)}</b> of <b>{num(total, 0)}</b> plants reporting</span>{reportPct != null && <i aria-hidden="true"><u style={{ width: `${reportPct}%` }} /></i>}</div>
        {totals.length > 1 && <small>Other units are in the details view.</small>}
      </div>

      <div className="pl-flow" aria-label="Material flow">
        <h3>Material flow<small>{unit ? `in ${unit}` : ''}</small></h3>
        <div className="status-breakdown-legend viz-status-legend pl-lines">
          {flow.map(f => <button key={f.id} type="button" disabled={!primary} onClick={onOpen} title={f.note} aria-label={`${f.label}: ${num(f.value)} ${unit}. Open plant details.`}>
            <i style={{ background: f.color }} /><span>{f.label}</span><strong>{loading ? '…' : num(f.value)}<small> {unit}</small></strong><small>{loading || f.share == null || f.id === 'received' ? '' : `${num(f.share, 1)}%`}</small>
            {!loading && f.share != null && <u className="viz-mini-track" aria-hidden="true"><u style={{ width: `${Math.min(100, f.share)}%`, background: f.color }} /></u>}
            <ArrowUpRight size={14} />
          </button>)}
        </div>
      </div>
    </div>

    {(best.length > 0 || lowest.length > 0) && <div className="pl-plants">
      {list('Highest recovery', best, 'good')}
      {lowest.length > 0 && list('Lowest recovery', lowest, 'low')}
    </div>}
  </section>;
}
