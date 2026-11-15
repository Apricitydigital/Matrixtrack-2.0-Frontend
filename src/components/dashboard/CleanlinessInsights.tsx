import React, { useMemo } from 'react';
import { ArrowUpRight, Sparkles, Sprout } from 'lucide-react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { cleanlinessBy, cleanlinessStats, type CleanStats } from '../../services/cleanliness';
import { MODULE_LABELS } from '../../services/presentation';
import type { OperationalModuleId } from '../../types';
import { CardInfo } from '../common/CardInfo';
import { CLEAN_COLORS, PanelTable, fmtNum, fmtPct, usePanel } from './DetailPanel';
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

export function CleanlinessInsights({ data, loading, modules, zones, wards, onOpen }: { data: InspectionCoverage; loading: boolean; modules: OperationalModuleId[]; zones: Named[]; wards: Named[]; onOpen?: OpenReports }) {
  const panel = usePanel();
  const city = useMemo(() => cleanlinessStats(data.visits), [data]);
  const byModule = useMemo(() => cleanlinessBy(data.visits, 'module'), [data]);
  const byZone = useMemo(() => cleanlinessBy(data.visits, 'zoneId'), [data]);
  const byWard = useMemo(() => cleanlinessBy(data.visits, 'wardId'), [data]);
  const unavailable = !loading && (data.failedModules.length > 0);
  const wardRows = wards.map(w => ({ ward: w, stats: byWard.get(w.id) })).filter(r => r.stats && r.stats.clean + r.stats.notClean > 0)
    .sort((a, b) => (a.stats!.percent ?? 101) - (b.stats!.percent ?? 101) || b.stats!.notClean - a.stats!.notClean || a.ward.name.localeCompare(b.ward.name, undefined, { numeric: true }));
  const show = (title: string, subtitle: string, scope: Scope) => panel?.open({ title, subtitle, body: <CleanlinessDetail data={data} scope={scope} wards={wards} onOpen={onOpen} /> });
  const showAllWards = () => panel?.open({ title: 'Ward-wise cleanliness', subtitle: `${wardRows.length} wards with assessed inspections · lowest first`, width: '3xl', body: <PanelTable head={['Ward', 'Zone', 'Inspections', 'Clean', 'Not clean', 'Cleanliness']}
    rows={wardRows.map(({ ward, stats }) => ({ key: ward.id, onClick: () => show(ward.name, 'Ward cleanliness', { ward: ward.id }), cells: [ward.name, zones.find(z => z.id === ward.zoneId)?.name || '—', fmtNum(stats!.inspections), fmtNum(stats!.clean), fmtNum(stats!.notClean), <b data-band={band(stats!.percent)} className="di-pct">{fmtPct(stats!.percent)}</b>] }))} /> });
  const row = (id: string, label: string, s: CleanStats | undefined, scope: Scope) => <button key={id} type="button" className="di-row" disabled={loading || !s} onClick={() => s && show(label, scope.module ? 'Module cleanliness' : 'Zone cleanliness', scope)}>
    <span className="di-row-label">{label}</span>{s ? <Bar s={s} /> : <span className="di-bar" data-empty="true" />}<b data-band={band(s?.percent ?? null)}>{loading ? '…' : fmtPct(s?.percent)}</b>
  </button>;

  return <section className="home-section di-clean" aria-label="Cleanliness insights">
    <div className="home-section-heading"><div><span><Sprout size={14} /> CLEANLINESS INSIGHTS</span><h2>How clean is the city?</h2><p>SI decisions, with AI analysis for reports still awaiting SI review. Select any figure for details.</p></div>
      <CardInfo title="How cleanliness is measured"><p>Each inspection counts once. Where the SI has decided, the SI decision is used (Cleaned or Not cleaned).</p><p>For reports still awaiting SI review, the saved AI analysis is used when it reached a clear result. AI never overrides an SI decision.</p><p>Cleanliness % = clean ÷ (clean + not clean). Inspections with neither an SI decision nor a usable AI result are shown as not assessed and left out of the percentage.</p></CardInfo></div>
    {unavailable && <p className="coverage-data-note" role="status">Some modules could not be loaded, so cleanliness figures are incomplete.</p>}
    <div className="di-clean-grid">
      <button type="button" className="di-city" disabled={loading} onClick={() => show('City cleanliness', 'All inspections in the selected area and dates', {})}>
        <span className="di-eyebrow">Overall</span>
        <div className="di-city-ring"><Ring percent={loading ? null : city.percent} /><strong data-metric="city-cleanliness">{loading ? '…' : fmtPct(city.percent)}</strong><small>clean</small></div>
        <dl>
          <div><dt><i style={{ background: CLEAN_COLORS.clean }} />Clean</dt><dd>{loading ? '…' : fmtNum(city.clean)}<small>SI {fmtNum(city.siClean)} · AI {fmtNum(city.aiClean)}</small></dd></div>
          <div><dt><i style={{ background: CLEAN_COLORS.notClean }} />Not clean</dt><dd>{loading ? '…' : fmtNum(city.notClean)}<small>SI {fmtNum(city.siNotClean)} · AI {fmtNum(city.aiNotClean)}</small></dd></div>
          <div><dt><i style={{ background: CLEAN_COLORS.unassessed }} />Not assessed</dt><dd>{loading ? '…' : fmtNum(city.unassessed)}</dd></div>
        </dl>
        <span className="di-more">View details<ArrowUpRight size={13} /></span>
      </button>
      <div className="di-col"><h3>By module</h3>{modules.map(m => row(m, MODULE_LABELS[m] || m, byModule.get(m), { module: m }))}</div>
      <div className="di-col"><h3>By zone</h3>{zones.length ? zones.map(z => row(z.id, z.name, byZone.get(z.id), { zone: z.id })) : <p className="di-empty">No zones in this selection.</p>}</div>
    </div>
    <div className="di-wards"><div className="di-wards-head"><h3>By ward <small>lowest cleanliness first</small></h3>{wardRows.length > 0 && <button type="button" onClick={showAllWards} disabled={!panel}>All {wardRows.length} wards<ArrowUpRight size={13} /></button>}</div>
      {loading ? <p className="di-empty">Loading…</p> : wardRows.length ? <div className="di-ward-grid">{wardRows.slice(0, 12).map(({ ward, stats }) => <button key={ward.id} type="button" data-band={band(stats!.percent)} onClick={() => show(ward.name, 'Ward cleanliness', { ward: ward.id })}>
        <span>{ward.name}</span><strong>{fmtPct(stats!.percent)}</strong><small>{fmtNum(stats!.notClean)} not clean · {fmtNum(stats!.inspections)} inspections</small></button>)}</div>
        : <p className="di-empty">No assessed inspections in this selection.</p>}
    </div>
    <p className="di-legend"><Sparkles size={12} /> <span><i style={{ background: CLEAN_COLORS.clean }} />Clean</span><span><i style={{ background: CLEAN_COLORS.notClean }} />Not clean</span><span><i style={{ background: CLEAN_COLORS.unassessed }} />Not assessed</span><span>80%+ good · 60–80% fair · below 60% poor</span></p>
  </section>;
}
