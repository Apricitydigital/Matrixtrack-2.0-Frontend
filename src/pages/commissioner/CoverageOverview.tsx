import {CardInfo} from '../../components/common/CardInfo';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { inspectionPeriod } from '../../services/inspectionPeriod';
import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React from 'react';
import { ArrowUpRight, Info, Target } from 'lucide-react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { coverageCounts, zoneCoverage, inspectionOutcomes } from '../../services/inspectionCoverage';
import type { CityPulse } from '../../services/commissioner';
import { targetDelivery, targetReadState, reportTargetDelivery } from '../../services/targetDelivery';
import { scopedIntelligence } from '../../services/intelligenceMetrics';
import { buildZoneRankings } from '../../services/zoneRanking';
import { ZoneScoreDetail } from './ZoneScoreDetail';
import { isAdministrativeWard } from '../../services/wardAvailability';
import { amount } from '../../services/insights';
import type { Zone } from '../../types';
import { usePanel } from '../../components/dashboard/DetailPanel';
import { CoverageDetail, type OpenReports } from '../../components/dashboard/panelBodies';

export const coverageNumber=(n:number|null|undefined)=>n==null?'N/A':n.toLocaleString('en-IN',{maximumFractionDigits:1});

export function CoverageOverview({data,loading,zone,ward,zones,rankings,official,from,to,onZone,scopeLabel,targetsReady=true,wards=[],onOpen,onCoverage,part='all',rankingsLoading=false,zoneDetail=false}:{zoneDetail?:boolean;rankingsLoading?:boolean;part?:'all'|'coverage'|'zones';onCoverage?:(scope:{module?:string;zone?:string;ward?:string})=>void;wards?:{id:string;name:string;zoneId?:string}[];onOpen?:OpenReports;data:InspectionCoverage;loading:boolean;zone:string;ward:string;zones:Zone[];rankings:any[];official?:CityPulse['official'];from:string;to:string;onZone:(id:string)=>void;scopeLabel?:string;targetsReady?:boolean}) {
  const metrics=inspectionMetrics(data,{zone,ward},official?.totals),counts=metrics.completed;
  const rows=zoneCoverage(data,zones.filter(z=>!zone||z.id===zone),rankings,ward).map(row=>({...row,...inspectionMetrics(data,{zone:row.id,ward}).completed}));
  // Same zone score and rank as the Zone Ranking page: zone score = average of assessed ward scores; only fully assessed zones receive a rank.
  const ranking=React.useMemo(()=>new Map(buildZoneRankings(zones.filter(z=>!zone||z.id===zone),(wards as any[]).filter(w=>isAdministrativeWard(w)&&(!ward||w.id===ward)),rankings).map(item=>[item.zone.id,item])),[zones,wards,rankings,zone,ward]);
  rows.sort((a,b)=>{const ra=ranking.get(a.id)?.rank??null,rb=ranking.get(b.id)?.rank??null;return ra==null||rb==null?(ra==null&&rb==null?(ranking.get(b.id)?.score??-1)-(ranking.get(a.id)?.score??-1):ra==null?1:-1):ra-rb;});
  // Colour scale across the zones shown: best score green, fading through amber to a light amber for the lowest.
  const scored=[...ranking.values()].map(r=>r.score).filter((v):v is number=>v!=null),lo=scored.length?Math.min(...scored):0,hi=scored.length?Math.max(...scored):0;
  const scale=(score:number|null)=>score==null?0:hi===lo?1:(score-lo)/(hi-lo);
  const targetOf=(row:any)=>reportTargetDelivery(targetReadState(targetDelivery(official?.zones?.find(z=>z.id===row.id)?.totals,row),targetsReady),row.inspections);
  const number=(n:number|null)=>loading?'…':coverageNumber(n);
  /** Zone row click: with zoneDetail the zone opens in a side panel and no dashboard filter changes; otherwise the old filter behaviour. */
  const openZone=(row:any)=>{
    if(!zoneDetail||!panel||loading){onZone(row.id);return;}
    const target=targetOf(row),o=inspectionOutcomes(data,{zone:row.id,ward}),val=(id:string)=>number(o.rows.find(x=>x.id===id)?.value??null),ai=scopedIntelligence(data,{zone:row.id,ward},o.total!=null);
    panel.open({title:row.name,subtitle:`Zone performance · ${scopeLabel||'selected area'}`,width:'3xl',body:<ZoneScoreDetail name={row.name} ranking={ranking.get(row.id)} data={data} figures={{received:target.available?coverageNumber(target.completed):'N/A',target:target.available?coverageNumber(target.target):'N/A',percent:target.available&&target.percent!=null?`${coverageNumber(target.percent)}% of target`:target.stateLabel||'',needed:target.available?coverageNumber(target.remaining):'N/A',coverage:`${number(row.covered)} / ${number(row.total)}`,coveragePercent:row.percent==null?'Coverage unavailable':`${coverageNumber(row.percent)}% of registered locations`,pending:val('pending_review'),siCleaned:val('approved'),siNotCleaned:val('rejected'),aiClean:number(ai?ai.clean:null),aiNotClean:number(ai?ai.notClean:null)}}/>});
  };
  const panel=usePanel();
  const details=()=>onCoverage?onCoverage({zone:zone||undefined,ward:ward||undefined}):panel?.open({title:'City coverage',subtitle:`${scopeLabel||(zone?'Selected zone':'All zones')} · registered locations inspected in the selected dates`,width:'3xl',body:<CoverageDetail data={data} modules={data.modules} zones={zones.filter(z=>!zone||z.id===zone)} wards={wards} scope={{zone:zone||undefined,ward:ward||undefined}} onOpen={onOpen}/>});
  const delivery=metrics.delivery;
  const period=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return <>
    {part!=='zones'&&<section className="home-section coverage-overview cv"><div className="home-section-heading"><div><span>INSPECTIONS & LOCATION COVERAGE</span><h2>How much of the city have we covered?</h2><p>{period(from)}{from!==to?` – ${period(to)}`:''} · {scopeLabel||(zone?'Selected zone':'All zones')}{!scopeLabel&&ward?' · Selected ward':''}</p></div><CardInfo title="Coverage and inspection targets">Coverage measures unique registered assets inspected in the selected dates. Report target progress compares submitted reports with the inspection target. Daroga scoring credit is separate.</CardInfo>{panel&&<button type="button" className="coverage-details-button" disabled={loading} onClick={details}>View coverage details<ArrowUpRight size={15}/></button>}</div>
      <div className="cv-body">
        <div className="cv-main" data-click={panel?'true':undefined} {...(panel?{role:'button',tabIndex:0,'aria-label':'Open asset coverage details',onClick:()=>{if(!loading)details();},onKeyDown:(e:React.KeyboardEvent)=>{if(!loading&&(e.key==='Enter'||e.key===' ')){e.preventDefault();details();}}}:{})}>
          <span className="cv-eyebrow">Overall coverage</span>
          <div className="cv-chart">
            <div className="cv-donut" role="img" aria-label={`${number(counts.covered)} covered, ${number(counts.remaining)} not covered`}>
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="#eda100" strokeOpacity=".35" strokeWidth="16"/>{!loading&&(counts.percent??0)>0&&<circle cx="60" cy="60" r="48" fill="none" stroke="#2a78d6" strokeWidth="16" strokeLinecap={(counts.percent??0)>=100?'butt':'round'} strokeDasharray={`${Math.min(100,counts.percent??0)/100*301.6} 301.6`} transform="rotate(-90 60 60)"/>}</svg>
              <strong className="cv-pct">{number(counts.percent)}{counts.percent!=null&&!loading?'%':''}</strong><small>covered</small>
            </div>
            <ul className="cv-legend"><li><i data-t="done"/>Covered</li><li><i data-t="rest"/>Not covered</li></ul>
          </div>
          <p>of registered locations are covered, meaning inspected at least once in the selected dates.</p>
        </div>
        <dl className="cv-stats">
          <div><dt>Registered locations</dt><dd>{number(counts.total)}</dd><small>Current location register</small></div>
          <div data-t="done"><dt>Covered</dt><dd>{number(counts.covered)}</dd><small>{counts.percent==null?'Unique locations':`${number(counts.percent)}% of registered locations`}</small></div>
          <div data-t="rest"><dt>Not covered</dt><dd>{number(counts.remaining)}</dd><small>Not inspected in these dates</small></div>
          <div data-t={counts.outsideRegister?'warn':undefined}><dt>Not in register</dt><dd>{number(counts.outsideRegister)}</dd><small>Inspected but missing from the register</small></div>
        </dl>
      </div>
      {!loading&&(counts.unidentified>0||counts.outsideRegister>0)&&<p className="coverage-data-note">{counts.unidentified>0?`${counts.unidentified} reports lack a location ID; exact unique and repeat counts are unavailable. `:''}{counts.outsideRegister>0?`${counts.outsideRegister} inspected locations are outside the current register and excluded from registered-location coverage.`:''}</p>}
      {data.errors.length>0&&<div className="coverage-data-note" role="status">Some coverage figures are unavailable.<details><summary>View availability</summary>{data.errors.map(e=><p key={e}>{e}</p>)}</details></div>}
    </section>}
    {part!=='coverage'&&<section className="home-section zone-performance"><div className="home-section-heading"><div><span>ZONE PERFORMANCE</span><h2>Zone performance</h2><p>Zones ranked by zone score, with targets, inspections, location coverage and pending review.</p></div>{!zoneDetail&&(zone||scopeLabel&&scopeLabel!=='All zones and wards')&&<button onClick={()=>onZone('')}>All zones<ArrowUpRight size={15}/></button>}</div>
      <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Zone</th><th>Zone score &amp; rank<CardInfo title="How the zone score and rank are calculated"><p><b>Step 1 · Ward score (out of 100).</b> Workforce attendance carries 30 marks. The other 70 marks are shared equally by the components that apply to the ward: Sweeping beats, Nala, Toilets, Litter bins, CTU/GVP, Daroga, SI and IEC (8 components, 8.75 marks each). A module that is switched off, or has no assets in the ward, releases its marks to the others. A component with no activity earns zero. It does not release its marks.</p><p>Each component earns its marks multiplied by its performance %. Ward score = marks earned ÷ marks that apply × 100.</p><p><b>Step 2 · Zone score.</b> The simple average of the assessed ward scores in the zone. Every ward has equal weight. Example: wards scoring 80 and 60 give a zone score of 70.</p><p><b>Step 3 · Rank.</b> Zones are ordered by zone score, highest first. A zone gets a rank only when every ward in it is assessed. Otherwise it shows a provisional score from the wards assessed so far, with no rank. Equal scores (to 2 decimals) share a rank.</p><p>This is the same calculation as the Zone Ranking page, for the zones and wards in the current dashboard filter.</p></CardInfo></th><th>Inspection target achievement</th><th>Inspections still needed</th><th>{terms.coverage}</th><th>{terms.pendingReview}</th><th>SI cleaned</th><th>SI not cleaned</th><th>AI suggests clean</th><th>AI suggests not clean</th></tr></thead><tbody>{rows.map(row=>{
        const target=targetOf(row);
        return <tr key={row.id}><td data-label="Zone"><button className="zone-select" onClick={()=>openZone(row)}><strong>{row.name}</strong><ArrowUpRight size={15}/></button></td>
          {(()=>{const zr=ranking.get(row.id);return <td data-label="Zone score & rank"><div className="zp-score" data-empty={zr?.score==null||undefined} style={{'--zt':scale(zr?.score??null)} as React.CSSProperties}><strong>{loading||rankingsLoading?'…':zr?.score==null?'N/A':amount(zr.score,2)}<small>{!loading&&!rankingsLoading&&zr?.score!=null?' / 100':''}</small></strong><span className="zp-rank" data-rank={zr?.rank??undefined} title={zr?.rank?`Rank ${zr.rank} of ${ranking.size}`:'Not ranked until every ward is assessed'}>{loading||rankingsLoading?'…':zr?.rank?`#${zr.rank}`:'—'}</span><small>{rankingsLoading?'Updating scores…':zr?`${zr.assessed}/${zr.total} wards assessed${zr.score!=null&&!zr.complete?' · provisional':''}`:'No wards in scope'}</small></div></td>;})()}
          <td data-label="Inspection target achievement"><small className="delivery-caption">{'Reports received / target'}</small><div className="delivery-target"><div><strong>{target.available?coverageNumber(target.completed):target.stateLabel}{target.available&&<small> / {coverageNumber(target.target)}</small>}</strong><span className={target.met?'delivery-met':'delivery-progress'}>{target.available?(target.percent!=null?`${coverageNumber(target.percent)}%`:'\u2014'):target.stateLabel}</span></div>{target.available&&<div className="delivery-meter"><i data-met={target.met} style={{width:`${Math.min(100,target.percent??0)}%`}}/></div>}</div></td>
          <td data-label={terms.pending}><strong className="delivery-count">{target.available?coverageNumber(target.remaining):'N/A'}</strong><small className="delivery-caption">{!target.available?target.stateLabel:target.met?'Requirement met':target.fallback?'to meet inspection target':'to meet target'}</small></td>
          <td data-label={terms.coverage}><strong className="delivery-count">{number(row.covered)}<small> / {number(row.total)}</small></strong><small className="delivery-caption">{row.percent==null?'Coverage unavailable':`${coverageNumber(row.percent)}% of registered locations`}</small></td>
          <td data-label="Pending review"><span className="zone-pending">{number(inspectionOutcomes(data,{zone:row.id,ward}).rows.find(r=>r.id==='pending_review')?.value??null)}</span></td>
          {(()=>{const o=inspectionOutcomes(data,{zone:row.id,ward}),val=(id:string)=>o.rows.find(r=>r.id===id)?.value??null,ai=scopedIntelligence(data,{zone:row.id,ward},o.total!=null);return <>
            <td data-label="SI cleaned">{number(val('approved'))}</td><td data-label="SI not cleaned">{number(val('rejected'))}</td>
            <td data-label="AI suggests clean" title="AI suggestion on reports awaiting SI review; not an official decision">{number(ai?ai.clean:null)}</td><td data-label="AI suggests not clean" title="AI suggestion on reports awaiting SI review; not an official decision">{number(ai?ai.notClean:null)}</td></>;})()}
</tr>;
      })}</tbody></table></div>{!rows.length&&<div className="home-empty">No zones in the selected scope.</div>}
    </section>}
  </>;
}
