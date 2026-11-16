import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Award, Building2, ChevronRight, Download, Info, Search, Target } from 'lucide-react';
import type { ZoneWardDetailsProps } from './WardOperationalDetails';
import { api } from '../../services/api';
import { matrixStore } from '../../services/store';
import { buildZoneRankings, isAssessedWard, zoneHighlights, type ZoneWardScore } from '../../services/zoneRanking';
import { amount, wardExplanation } from '../../services/insights';
import { StatusBadge } from '../../components/common/Badge';
import { WardScoreBreakdown } from '../../components/analytics/WardScoreBreakdown';
import { downloadCsv, generateCsv } from '../../services/csv';
import { useZoneOperations } from '../../services/zoneOperations';
import { ZoneOperationsSummary, ZoneModuleStats } from './ZoneOperationsSummary';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { focusLabel, focusQuickSelection, wardFocusPreset } from '../../services/wardFocusPreset';
import { isAdministrativeWard } from '../../services/wardAvailability';

const WardOperations = lazy(() => import('./WardOperationalDetails').then(module => ({ default: module.WardOperationalDetails })));
const scoreText = (score: number | null) => score === null ? '—' : amount(score, 2);
const zoneStatus = (zone: { complete: boolean; assessed: number }) => zone.complete ? 'Ranked' : zone.assessed ? 'Provisional' : 'Not assessed';

export function ZoneWardDetails(props: ZoneWardDetailsProps) {
  const { city, zones, wards } = props;
  const [rows, setRows] = useState<ZoneWardScore[]>([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [selectedZone, setSelectedZone] = useState(''), [selectedWard, setSelectedWard] = useState('');
  const [component, setComponent] = useState(''), [tab, setTab] = useState<'score' | 'reports'>('score');
  const [zoneIds, setZoneIds] = useState<string[]>([]), [wardIds, setWardIds] = useState<string[]>([]);
  const detail = useRef<HTMLElement>(null), wardDetail = useRef<HTMLElement>(null);
  const range = matrixStore.getDateRange();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRows([]);
    if (matrixStore.currentUser?.cityId !== city.id) {
      setError('Sign in with this city account to load its rankings.'); setLoading(false); return;
    }
    api(`/ward-ranking?${new URLSearchParams({ from: range.from, to: range.to })}`, { signal: controller.signal })
      .then(data => {
        if (!Array.isArray(data.rankings)) throw new Error('The ranking response is incomplete.');
        if (!controller.signal.aborted) setRows(data.rankings);
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [city.id, range.from, range.to, matrixStore.loadRevision, retry]);
  useEffect(() => { setSelectedZone(''); setSelectedWard(''); setSearch(''); setFilter('all'); setZoneIds([]); setWardIds([]); }, [city.id]);
  const cityZones = zones.filter(zone => zone.cityId === city.id);
  const cityWards = wards.filter(ward => ward.cityId === city.id && isAdministrativeWard(ward));
  const focus = useMemo(() => wardFocusPreset(city.id, zones, wards), [city.id, zones, wards]);
  const wardOptions = cityWards.filter(ward => !zoneIds.length || zoneIds.includes(ward.zoneId));
  const comparedWards = wardOptions.filter(ward => !wardIds.length || wardIds.includes(ward.id));
  const comparedZones = cityZones.filter(zone => (!zoneIds.length || zoneIds.includes(zone.id)) && (!wardIds.length || comparedWards.some(ward => ward.zoneId === zone.id)));
  const filteredScope = zoneIds.length > 0 || wardIds.length > 0;
  const applyScope = (selectedZones: string[], selectedWards: string[]) => { setZoneIds(selectedZones); setWardIds(selectedWards); setSelectedZone(''); setSelectedWard(''); setSearch(''); setFilter('all'); };
  const rankings = useMemo(() => buildZoneRankings(comparedZones, comparedWards, rows), [city.id, zones, wards, rows, zoneIds, wardIds]);
  const highlights = zoneHighlights(rankings, true);
  const provisionalComparison = rankings.some(zone => !zone.complete);
  const visible = rankings.filter(item => (!search || `${item.zone.name} ${item.wards.map(ward => ward.wardName).join(' ')}`.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'all' || (filter === 'ranked' ? item.complete : !item.complete)));
  const current = rankings.find(item => item.zone.id === selectedZone);
  const ward = current?.wards.find(item => item.wardId === selectedWard);
  const explanation = wardExplanation(ward), assessedWard = isAssessedWard(ward);
  const factor = explanation.components.find(item => item.key === component) || explanation.gaps[0] || explanation.components[0];
  const assessedCount = rankings.reduce((sum, item) => sum + item.assessed, 0), totalCount = rankings.reduce((sum, item) => sum + item.total, 0);
  const orderedZones = [...rankings].sort((a,b)=>(b.score ?? -1)-(a.score ?? -1));
  const availableRanks = new Map<string,number>();
  let lastScore: number | null = null, lastRank = 0;
  orderedZones.filter(item=>item.score!==null).forEach((item,index)=>{const rounded=Math.round(item.score!*100);if(rounded!==lastScore)lastRank=index+1;availableRanks.set(item.zone.id,lastRank);lastScore=rounded;});
  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  const chooseZone = (id: string) => { setSelectedZone(id); setSelectedWard(''); setTab('score'); scrollTo(detail); };
  const chooseWard = (id: string) => { setSelectedWard(id); setComponent(''); setTab('score'); scrollTo(wardDetail); };
  const exportRows = () => downloadCsv(`zone-ranking-${range.from}-${range.to}.csv`, generateCsv(
    ['From','To','Rank basis','Rank','Zone','Zone score /100','Assessed wards','Selected wards','Ward','Ward score /100'],
    orderedZones.filter(item=>visible.includes(item)).flatMap(item=>(item.wards.length?item.wards:[null]).map(member=>[
      range.from,range.to,provisionalComparison?'Available scores, provisional':filteredScope?'Selected wards':'All city wards',availableRanks.get(item.zone.id)??'',item.zone.name,item.score===null?'':item.score.toFixed(2),item.assessed,item.total,member?.wardName||'',member&&isAssessedWard(member)?member.finalScore:'Not assessed'
    ]))
  ));

  return <section className="commissioner-workspace zone-ranking space-y-5">
    <header className="zr-heading">
      <div><span className="zr-eyebrow"><Building2 size={14} /> AREA PERFORMANCE · {city.name}</span><h1>Zone Ranking</h1><p>Compare zones. Explore every ward. Know where to act.</p></div>
      <button className="workspace-secondary-button" disabled={loading || !!error || !visible.length} onClick={exportRows}><Download size={15} /> Export rankings</button>
    </header>
    <div className="zr-period"><span><span className="zr-live-dot" />{range.from} → {range.to}</span><span>Same period · Equal weight for every ward</span></div>
    <section className="zr-scope-panel" aria-label="Comparison geography filters">
      <div className="zr-scope-heading"><div><span className="zr-eyebrow">CHOOSE YOUR COMPARISON</span><h2>Ward selection</h2></div>{focus && <button className="workspace-secondary-button" aria-pressed={focus.wardIds.length===wardIds.length&&focus.wardIds.every(id=>wardIds.includes(id))} onClick={()=>applyScope(focus.zoneIds,focus.wardIds)}>{focusLabel(focus)}</button>}</div>
      <div className="zr-scope-controls">
        <MultiSelectDropdown label="Zones" options={cityZones.map(zone=>[zone.id,zone.name])} selected={zoneIds} onChange={ids=>applyScope(ids,wardIds.filter(id=>cityWards.some(ward=>ward.id===id&&(!ids.length||ids.includes(ward.zoneId)))))} quickSelection={focusQuickSelection(focus,zoneIds,wardIds,preset=>applyScope(preset.zoneIds,preset.wardIds))}/>
        <MultiSelectDropdown label="Wards" options={wardOptions.map(ward=>[ward.id,ward.name])} selected={wardIds} onChange={ids=>applyScope(zoneIds,ids)}/>
        <button className="zr-back" onClick={()=>applyScope([],[])} disabled={!filteredScope}>Reset selection</button>
      </div>
      <details className="zr-scope-summary"><summary>{comparedWards.length} wards · {comparedZones.length} zones {filteredScope?'in this comparison':'across the city'}<span>View selected wards</span></summary><div>{comparedWards.map(ward=><span key={ward.id}>{cityZones.find(zone=>zone.id===ward.zoneId)?.name} · {ward.name}</span>)}</div></details>

    </section>
    {loading ? <div role="status" className="zr-loading"><div /><strong>Preparing zone rankings…</strong><p>Bringing ward performance together.</p></div> : error ?
      <div role="alert" className="compact-error">Zone rankings unavailable. <button onClick={() => setRetry(value => value + 1)}>Retry</button><details><summary>Details</summary>{error}</details></div> : <>
      {!current && <section className="zr-panel zr-ranking-board" aria-label="Zone leaderboard">
        <div className="zr-section-heading"><div><span className="zr-eyebrow">ZONE LEADERBOARD</span><h2>Zone Ranking</h2><p>{assessedCount} of {totalCount} selected wards assessed{provisionalComparison?' - Available-score comparison is provisional':''}</p></div><span className="zr-chip">{rankings.length} zones</span></div>
        <div className="zr-filters"><label><Search size={16}/><input aria-label="Search zones or wards" placeholder="Search zone or ward…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Zone assessment status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All zones</option><option value="ranked">Ranked zones</option><option value="provisional">Incomplete zones</option></select>{(search || filter !== 'all') && <button onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button>}</div>
        <div className="zr-zone-ranking-grid">{orderedZones.filter(item=>visible.includes(item)).map(item=>{
          const rank=availableRanks.get(item.zone.id), best=highlights.best.some(zone=>zone.zone.id===item.zone.id), attention=highlights.attention.some(zone=>zone.zone.id===item.zone.id);
          const assessed=item.wards.filter(isAssessedWard), strongest=assessed[0], weakest=assessed[assessed.length-1];
          return <button key={item.zone.id} className={`zr-ranked-zone ${best?'zr-ranked-best':attention?'zr-ranked-attention':''}`} aria-label={`View wards in ${item.zone.name}`} aria-expanded={false} onClick={()=>chooseZone(item.zone.id)}>
            <div className="zr-ranked-top"><span className="zr-ranked-number">{rank?`#${rank}`:'\u2014'}</span><span>{best?<><Award size={14}/>Best {provisionalComparison?'available ':''}zone</>:attention?<><Target size={14}/>Needs attention</>:item.score===null?'Not assessed':provisionalComparison?'Provisional comparison':'Ranked'}</span><ArrowUpRight size={18}/></div>
            <div className="zr-ranked-title"><div><h3>{item.zone.name}</h3><p>{item.total} {filteredScope?'selected ':''}wards</p></div><strong>{scoreText(item.score)}<small>/100</small></strong></div>
            <div className="zr-track"><i style={{width:`${item.score??0}%`}}/></div>
            <div className="zr-ranked-assessment"><span>{item.assessed}/{item.total} wards assessed</span><span>{item.complete?'Complete assessment':'Partial assessment'}</span></div>
            <div className="zr-ranked-ward-range"><div><span>Highest ward score</span><b>{strongest?scoreText(strongest.finalScore!):'\u2014'}</b><small>{strongest?.wardName||'Not assessed'}</small></div><div><span>Lowest ward score</span><b>{weakest?scoreText(weakest.finalScore!):'\u2014'}</b><small>{weakest?.wardName||'Not assessed'}</small></div></div>
            <footer>View {item.total} {filteredScope?'selected ':''}wards <ChevronRight size={16}/></footer>
          </button>;
        })}</div>
        {!visible.length && <div className="analytics-empty">{rankings.length ? 'No zones match your search.' : 'No zones are configured for this city.'}</div>}
        <details className="zr-formula"><summary><Info size={14}/> How ranking works</summary><p>Zone score = total assessed ward scores ÷ assessed wards within the current selection. Every ward has equal weight. Example: selected ward scores 80 and 60 give a zone score of 70. Full assessment requires every selected ward in that zone to be assessed. A filtered rank applies only to this selection; it is not the city-wide rank. Best available and Needs attention are provisional while any selected ward is unassessed. Assessed zeroes count. Ward marks remain unchanged.</p></details>
      </section>}
      {current && !ward && <section ref={detail} className="zr-panel zr-zone-detail" aria-label={`${current.zone.name} ward performance`}>
        <div className="zr-section-heading"><div><button className="zr-back" onClick={() => { setSelectedZone(''); setSelectedWard(''); }}><ArrowLeft size={14}/> Zone ranking</button><h2>{current.zone.name} <span className="zr-chip">{current.rank ? `${filteredScope?'Selection':'City'} rank #${current.rank}` : zoneStatus(current)}</span></h2><p>{current.assessed} of {current.total} selected wards assessed · Select a ward to explore its performance.</p></div><div className="zr-detail-score"><strong>{scoreText(current.score)}</strong><small>/100 {current.complete ? 'zone score' : 'provisional'}</small></div></div>
        <div className="zr-ward-grid">{current.wards.map(member => {
          const assessed = isAssessedWard(member), gaps = wardExplanation(member).gaps;
          return <button key={member.wardId} className={`zr-ward-card ${selectedWard === member.wardId ? 'zr-active' : ''}`} aria-pressed={selectedWard === member.wardId} onClick={() => chooseWard(member.wardId)}><span className="zr-card-label">{assessed ? `CITY WARD RANK ${member.cityRank ?? '—'}` : 'AWAITING ASSESSMENT'}<ArrowUpRight size={16}/></span><h3>{member.wardName}</h3><div className="zr-ward-score"><strong>{assessed ? scoreText(member.finalScore!) : '—'}<small>/100</small></strong><StatusBadge status={assessed ? member.performanceBand || 'not_assessed' : 'not_assessed'}/></div><div className="zr-track"><i style={{ width: `${assessed ? member.finalScore : 0}%` }}/></div><p>{!assessed ? 'No qualifying score activity; available reports are still accessible' : gaps[0]?.gap > 0 ? `Largest gap: ${gaps[0].label}` : 'All applicable points earned'}</p></button>;
        })}</div>{!current.total && <div className="analytics-empty">No wards are registered in this zone.</div>}
      </section>}
      {ward && <section ref={wardDetail} className="zr-panel zr-ward-detail" aria-label={`${ward.wardName} performance details`}>
        <div className="zr-section-heading"><div><button className="zr-back" onClick={() => { setSelectedWard(''); scrollTo(detail); }}><ArrowLeft size={14}/>{current.zone.name} wards</button><h2>{ward.wardName}</h2><p>{current.zone.name} <ChevronRight size={12}/> Ward performance</p></div><div className="zr-detail-score"><strong>{assessedWard ? scoreText(ward.finalScore!) : '—'}</strong><small>/100 ward score</small></div></div>
        <div className="zr-tabs" role="tablist" aria-label="Ward detail view"><button id="zr-score-tab" role="tab" aria-controls="zr-score-panel" aria-selected={tab === 'score'} onClick={() => setTab('score')}>Score breakdown</button><button id="zr-reports-tab" role="tab" aria-controls="zr-reports-panel" aria-selected={tab === 'reports'} onClick={() => setTab('reports')}>Inspections & reports</button></div>
        {tab === 'score' ? <div role="tabpanel" id="zr-score-panel" aria-labelledby="zr-score-tab">
          {!assessedWard ? <div className="analytics-empty">This ward has not been assessed for the selected dates. Available inspections can still be viewed under Inspections & reports.</div> : <>
            <p className="zr-score-note">Select a component to see actuals, requirements and the score calculation.</p>
            <div className="score-component-grid">{explanation.components.map(item => <button key={item.key} className={factor?.key === item.key ? 'selected' : ''} aria-pressed={factor?.key === item.key} onClick={() => setComponent(item.key)}><span>{item.label}</span><strong>{item.applicable === false ? 'N/A' : amount(item.score, 2)}{item.applicable !== false && <small>/ {amount(item.maxScore, 2)}</small>}</strong><span className="zr-track"><i style={{ width: `${item.applicable !== false && item.maxScore > 0 ? Math.min(100, item.score / item.maxScore * 100) : 0}%` }}/></span><small>{item.applicable === false ? 'Not applicable' : `${amount(Math.max(0, item.maxScore - item.score), 2)} points to improve`}</small></button>)}</div>
            {factor && <WardScoreBreakdown key={`${ward.wardId}:${factor.key}`} factor={factor} wardId={ward.wardId}/>}
          </>}
        </div> : <div role="tabpanel" id="zr-reports-panel" aria-labelledby="zr-reports-tab"><Suspense fallback={<div role="status" className="analytics-empty">Loading ward operations…</div>}><RankedWardReports key={ward.wardId} {...props} initialWardId={ward.wardId}/></Suspense></div>}
      </section>}
    </>}
  </section>;
}

function RankedWardReports(props: ZoneWardDetailsProps & {initialWardId:string}) {
  const ward=props.wards.find(ward=>ward.id===props.initialWardId),range=matrixStore.getDateRange();
  const source=useZoneOperations(props.city,range.from,range.to,matrixStore.loadRevision,ward?.zoneId||'',props.initialWardId);
  const scope={zone:ward?.zoneId,ward:props.initialWardId},label=ward?.name||'Selected ward';
  return <div className="space-y-5"><ZoneOperationsSummary source={source} scope={scope} label={label}/><ZoneModuleStats source={source} scope={scope} label={label}/><WardOperations {...props}/></div>;
}
