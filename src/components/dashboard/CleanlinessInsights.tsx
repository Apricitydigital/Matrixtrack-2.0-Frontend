import React, { useMemo, useState } from 'react';
import { Sparkles, Sprout, Trophy } from 'lucide-react';
import type { InspectionCoverage, InspectionVisit } from '../../services/inspectionCoverage';
import { cleanlinessBy, cleanlinessOverview, cleanlinessStats, type CleanStats } from '../../services/cleanliness';
import { MODULE_LABELS } from '../../services/presentation';
import type { OperationalModuleId } from '../../types';
import { CardInfo } from '../common/CardInfo';
import { CLEAN_COLORS, fmtNum, fmtPct, usePanel } from './DetailPanel';
import { CleanlinessDetail, type OpenReports, type Scope } from './panelBodies';

type Named = { id: string; name: string; zoneId?: string };
const band = (p: number | null) => p == null ? 'none' : p >= 80 ? 'good' : p >= 60 ? 'fair' : 'poor';

function Ring({ percent }: { percent: number | null }) {
  const r = 42, c = 2 * Math.PI * r, v = percent == null ? 0 : Math.max(0, Math.min(100, percent)) / 100;
  const color = percent == null ? CLEAN_COLORS.unassessed : percent >= 80 ? CLEAN_COLORS.clean : percent >= 60 ? '#e09a00' : CLEAN_COLORS.notClean;
  return <svg viewBox="0 0 100 100" className="di-ring" aria-hidden="true">
    <circle cx="50" cy="50" r={r} fill="none" stroke="var(--viz-track)" strokeWidth="10" />
    <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${v * c} ${c}`} transform="rotate(-90 50 50)" />
  </svg>;
}
function Bar({ s }: { s: CleanStats }) {
  const t = s.clean + s.notClean + s.unassessed;
  if (!t) return <span className="di-bar" data-empty="true" />;
  return <span className="di-bar">{[[s.clean, CLEAN_COLORS.clean], [s.notClean, CLEAN_COLORS.notClean], [s.unassessed, CLEAN_COLORS.unassessed]].map(([v, color], i) => (v as number) > 0 && <i key={i} style={{ width: `${(v as number) / t * 100}%`, background: color as string }} />)}</span>;
}

/** Inspection summary: Cleaned vs Not cleaned from SI decisions, with the AI-inclusive figure alongside. */
export function CleanedSummary({ data, loading, fallback, onSelect }: { data?: InspectionCoverage; loading: boolean; fallback?: { cleaned?: number | null; notCleaned?: number | null }; onSelect?: (id: 'approved' | 'rejected') => void }) {
  const s = useMemo(() => data ? cleanlinessStats(data.visits) : null, [data]);
  const cleaned = s ? s.siClean : fallback?.cleaned ?? null, notCleaned = s ? s.siNotClean : fallback?.notCleaned ?? null;
  const decided = cleaned != null && notCleaned != null ? cleaned + notCleaned : null;
  const share = (n: number | null) => decided && n != null ? n / decided * 100 : null;
  const v = (n: number | null) => loading ? '…' : fmtNum(n);
  return <div className="di-cleaned" aria-label="Cleaned and not cleaned">
    <button type="button" data-tone="green" disabled={loading || !onSelect} onClick={() => onSelect?.('approved')}><span>Cleaned</span><strong data-metric="summary-cleaned">{v(cleaned)}</strong><small>{loading ? '' : `${fmtPct(share(cleaned))} of SI decisions`}</small></button>
    <button type="button" data-tone="red" disabled={loading || !onSelect} onClick={() => onSelect?.('rejected')}><span>Not cleaned</span><strong data-metric="summary-not-cleaned">{v(notCleaned)}</strong><small>{loading ? '' : `${fmtPct(share(notCleaned))} of SI decisions`}</small></button>
    <div className="di-cleaned-bar"><span className="di-bar">{decided ? <><i style={{ width: `${(cleaned || 0) / decided * 100}%`, background: CLEAN_COLORS.clean }} /><i style={{ width: `${(notCleaned || 0) / decided * 100}%`, background: CLEAN_COLORS.notClean }} /></> : null}</span>
      <small>{loading ? 'Updating…' : s ? `Including AI analysis of reports awaiting SI review: ${fmtPct(s.percent)} clean (${fmtNum(s.clean)} clean · ${fmtNum(s.notClean)} not clean)` : `${fmtNum(decided)} SI decisions`}</small></div>
  </div>;
}

type Dim = 'ward' | 'zone' | 'module';
const DIMS: { id: Dim; label: string }[] = [{ id: 'ward', label: 'Wards' }, { id: 'zone', label: 'Zones' }, { id: 'module', label: 'Modules' }];
const VERDICT: Record<string, string> = { good: 'Good', fair: 'Fair', poor: 'Needs attention', none: 'Not enough data' };
const bandColor = (p: number | null) => p == null ? CLEAN_COLORS.unassessed : p >= 80 ? CLEAN_COLORS.clean : p >= 60 ? '#e09a00' : CLEAN_COLORS.notClean;

/** Half-circle gauge with the 60% and 80% band marks. */
function Gauge({ percent }: { percent: number | null }) {
  const R = 80, L = Math.PI * R, v = percent == null ? 0 : Math.max(0, Math.min(100, percent)) / 100;
  const tick = (p: number) => { const a = Math.PI * (1 - p / 100), c = Math.cos(a), s = Math.sin(a); return <line key={p} x1={100 + c * 68} y1={100 - s * 68} x2={100 + c * 94} y2={100 - s * 94} stroke="var(--surface)" strokeWidth="3" />; };
  const arc = 'M20 100A80 80 0 0 1 180 100';
  return <svg viewBox="0 0 200 108" className="cz-gauge-svg" aria-hidden="true">
    <path d={arc} fill="none" stroke="var(--viz-track)" strokeWidth="16" strokeLinecap="round" />
    {v > 0 && <path d={arc} fill="none" stroke={percent == null ? CLEAN_COLORS.unassessed : CLEAN_COLORS.clean} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${v * L} ${L}`} />}
    {[60, 80].map(tick)}
  </svg>;
}

type Item = { id: string; label: string; sub?: string; s?: CleanStats; scope: Scope; kind: string };

export function CleanlinessInsights({ data, loading, modules, zones, wards, onOpen, onViewReport }: { data: InspectionCoverage; loading: boolean; modules: OperationalModuleId[]; zones: Named[]; wards: Named[]; onOpen?: OpenReports; onViewReport?: (visit: InspectionVisit) => void }) {
  const panel = usePanel();
  const [dim, setDim] = useState<Dim>('ward');
  const [order, setOrder] = useState<'worst' | 'best'>('best');
  const [mod, setMod] = useState('');
  const [all, setAll] = useState(false);
  const { total: city, module: byModule } = useMemo(() => cleanlinessOverview(data.visits), [data.visits]);
  const scoped = useMemo(() => mod ? data.visits.filter(v => v.module === mod) : data.visits, [data.visits, mod]);
  const byZone = useMemo(() => cleanlinessBy(scoped, 'zoneId'), [scoped]);
  const byWard = useMemo(() => cleanlinessBy(scoped, 'wardId'), [scoped]);
  const unavailable = !loading && data.failedModules.length > 0;
  const assessed = city.clean + city.notClean, cityBand = band(city.percent);
  const extra = mod ? { module: mod } : {};

  const items: Item[] = dim === 'module' ? modules.map(m => ({ id: m, label: MODULE_LABELS[m] || m, s: byModule.get(m), scope: { module: m }, kind: 'Module cleanliness' }))
    : dim === 'zone' ? zones.map(z => ({ id: z.id, label: z.name, s: byZone.get(z.id), scope: { zone: z.id, ...extra }, kind: 'Zone cleanliness' }))
    : wards.map(w => ({ id: w.id, label: w.name, sub: zones.find(z => z.id === w.zoneId)?.name, s: byWard.get(w.id), scope: { ward: w.id, ...extra }, kind: 'Ward cleanliness' })).filter(r => r.s && r.s.inspections > 0);
  const ranked = [...items].sort((a, b) => {
    const pa = a.s?.percent ?? null, pb = b.s?.percent ?? null;
    if (pa == null || pb == null) return pa == null && pb == null ? 0 : pa == null ? 1 : -1;
    const n = (s: CleanStats) => s.clean + s.notClean;
    return order === 'worst' ? pa - pb || b.s!.notClean - a.s!.notClean : pb - pa || n(b.s!) - n(a.s!);
  });
  const shown = all ? ranked : ranked.slice(0, 7);

  const strongest = (rows: { label: string; s?: CleanStats }[]) => rows.filter(r => r.s && r.s.percent != null).sort((a, b) => b.s!.percent! - a.s!.percent! || (b.s!.clean + b.s!.notClean) - (a.s!.clean + a.s!.notClean))[0];
  const bestModule = strongest(modules.map(m => ({ label: MODULE_LABELS[m] || m, s: byModule.get(m) })));
  const allZones = useMemo(() => cleanlinessBy(data.visits, 'zoneId'), [data.visits]);
  const bestZone = strongest(zones.map(z => ({ label: z.name, s: allZones.get(z.id) })));


  const show = (title: string, subtitle: string, scope: Scope) => panel?.open({ title, subtitle, body: <CleanlinessDetail data={data} scope={scope} wards={wards} onOpen={onOpen} onViewReport={onViewReport} /> });
  const headline = loading ? 'Loading…' : city.percent == null ? 'No clean / not clean result yet' : `${fmtPct(city.percent)} of inspected places are clean`;

  return <section className="home-section cz" aria-label="Cleanliness insights">
    <div className="home-section-heading"><div><span><Sprout size={14} /> CLEANLINESS INSIGHTS</span><h2>How clean is the city?</h2><p>Every inspected place is marked Clean or Not clean, by the SI decision or, while SI review is pending, by the AI check.</p></div>
      <CardInfo title="How cleanliness is measured"><p>Each inspection counts once. Where the SI has decided, the SI decision is used (Cleaned or Not cleaned).</p><p>For reports still awaiting SI review, the saved AI analysis is used when it reached a clear result. AI never overrides an SI decision.</p><p>Cleanliness % = clean ÷ (clean + not clean). Reports submitted within the last hour with no SI decision yet are shown as AI analysing, because the AI needs some time to assess them; they are left out of the percentage until the result arrives. Blurred or unclear photos are counted as not clean. Drafts are not counted.</p></CardInfo></div>
    {unavailable && <p className="coverage-data-note" role="status">Some modules could not be loaded, so cleanliness figures are incomplete.</p>}

    <div className="cz-verdict">
      <button type="button" className="cz-gauge" disabled={loading} onClick={() => show('City cleanliness', 'All inspections in the selected area and dates', {})} aria-label="Open city cleanliness details">
        <Gauge percent={loading ? null : city.percent} />
        <strong data-metric="city-cleanliness">{loading ? '…' : fmtPct(city.percent)}</strong>
        <span className="cz-tag">{loading ? '…' : city.percent == null ? 'No result yet' : 'clean'}</span>
      </button>
      <div className="cz-summary">
        <h3>{headline}</h3>
        <p>{loading ? '' : assessed ? `Out of ${fmtNum(city.inspections)} inspections, ${fmtNum(assessed)} have a result.` : `${fmtNum(city.inspections)} inspections found, none assessed yet.`}</p>
        <div className="cz-split" role="img" aria-label="Clean, not clean and AI analysing">
          <Bar s={city} />
          <ul>
            <li data-tone="green"><i /><b>{loading ? '…' : fmtNum(city.clean)}</b> Clean<small>SI {fmtNum(city.siClean)} · AI {fmtNum(city.aiClean)}</small></li>
            <li data-tone="red"><i /><b>{loading ? '…' : fmtNum(city.notClean)}</b> Not clean<small>SI {fmtNum(city.siNotClean)} · AI {fmtNum(city.aiNotClean)}</small></li>
            <li data-tone="grey"><i /><b>{loading ? '…' : fmtNum(city.unassessed)}</b> AI analysing<small>AI needs some time to assess</small></li>
          </ul>
        </div>
        {!loading && (bestModule || bestZone) && <p className="cz-focus"><Trophy size={14} />Cleanest so far{bestModule && <span>{bestModule.label} <b>{fmtPct(bestModule.s!.percent)}</b></span>}{bestModule && bestZone && ' and '}{bestZone && <span>{bestZone.label} <b>{fmtPct(bestZone.s!.percent)}</b></span>}</p>}
      </div>
    </div>

    <div className="cz-main">
      <div className="cz-explore">
        <div className="cz-bar-head">
          <div className="cz-seg" role="tablist" aria-label="Group cleanliness by">{DIMS.map(d => <button key={d.id} type="button" role="tab" aria-selected={dim === d.id} data-on={dim === d.id} onClick={() => { setDim(d.id); setAll(false); }}>{d.label}</button>)}</div>
          <div className="cz-seg" role="tablist" aria-label="Order">{(['best', 'worst'] as const).map(o => <button key={o} type="button" role="tab" aria-selected={order === o} data-on={order === o} data-order={o} onClick={() => setOrder(o)}>{o === 'worst' ? 'Worst first' : 'Best first'}</button>)}</div>
          {dim !== 'module' && modules.length > 1 && <select aria-label="Filter by module" value={mod} onChange={e => { setMod(e.target.value); setAll(false); }}><option value="">All modules</option>{modules.map(m => <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>)}</select>}
        </div>
        {loading ? <p className="di-empty">Loading…</p> : shown.length ? <ol className="cz-list">{shown.map((r, i) => {
          const p = r.s?.percent ?? null, assessedN = r.s ? r.s.clean + r.s.notClean : 0;
          return <li key={r.id}><button type="button" data-band={band(p)} disabled={!r.s} onClick={() => r.s && show(r.label, r.kind, r.scope)}>
            <span className="cz-rank">{i + 1}</span>
            <span className="cz-name"><b>{r.label}</b><small>{r.sub ? `${r.sub} · ` : ''}{p == null ? `${fmtNum(r.s?.inspections ?? 0)} reports · result awaited` : `${fmtNum(r.s!.notClean)} not clean of ${fmtNum(assessedN)} checked`}</small></span>
            <span className="cz-meter">{r.s ? <Bar s={r.s} /> : <span className="di-bar" data-empty="true" />}</span>
            <em>{p == null ? 'No result' : fmtPct(p)}</em>
          </button></li>;
        })}</ol> : <p className="di-empty">No assessed inspections in this selection.</p>}
        {ranked.length > 7 && <button type="button" className="cz-more" onClick={() => setAll(a => !a)}>{all ? 'Show fewer' : `Show all ${ranked.length}`}</button>}
      </div>

    </div>
    <p className="di-legend"><Sparkles size={12} /> <span><i style={{ background: CLEAN_COLORS.clean }} />Clean</span><span><i style={{ background: CLEAN_COLORS.notClean }} />Not clean</span><span><i style={{ background: CLEAN_COLORS.unassessed }} />AI analysing</span><span>80%+ good · 60–80% fair · below 60% needs attention</span></p>
  </section>;
}
