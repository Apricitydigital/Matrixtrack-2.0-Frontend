import {CardInfo} from '../../components/common/CardInfo';
import {StatusBreakdown} from '../../components/analytics/StatusBreakdown';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { inspectionPeriod } from '../../services/inspectionPeriod';
import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React from 'react';
import { ArrowUpRight, Info, MapPin, Target } from 'lucide-react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { coverageCounts, zoneCoverage, inspectionOutcomes } from '../../services/inspectionCoverage';
import type { CityPulse } from '../../services/commissioner';
import { targetDelivery, targetReadState, reportTargetDelivery } from '../../services/targetDelivery';
import { scopedIntelligence } from '../../services/intelligenceMetrics';
import type { Zone } from '../../types';

export const coverageNumber=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:1});

export function CoverageOverview({data,loading,zone,ward,zones,rankings,official,from,to,onZone,scopeLabel,targetsReady=true}:{data:InspectionCoverage;loading:boolean;zone:string;ward:string;zones:Zone[];rankings:any[];official?:CityPulse['official'];from:string;to:string;onZone:(id:string)=>void;scopeLabel?:string;targetsReady?:boolean}) {
  const metrics=inspectionMetrics(data,{zone,ward},official?.totals),counts=metrics.completed;
  const rows=zoneCoverage(data,zones.filter(z=>!zone||z.id===zone),rankings,ward).map(row=>({...row,...inspectionMetrics(data,{zone:row.id,ward}).completed}));
  const number=(n:number|null)=>loading?'…':coverageNumber(n);
  const delivery=metrics.delivery;
  const period=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return <>
    <section className="home-section coverage-overview"><div className="home-section-heading"><div><span>INSPECTIONS & LOCATION COVERAGE</span><h2>How much of the city have we covered?</h2><p>{period(from)}{from!==to?` – ${period(to)}`:''} · {scopeLabel||(zone?'Selected zone':'All zones')}{!scopeLabel&&ward?' · Selected ward':''}</p></div><span className="coverage-context"><MapPin size={16}/>{number(counts.percent)}{counts.percent!=null?'%':''} coverage</span></div>
      <StatusBreakdown label="Current registered assets: inspected versus not visited" loading={loading} items={[{id:'covered',label:'Unique assets inspected',value:counts.covered,tone:'green'},{id:'remaining',label:'Not visited in selected dates',value:counts.remaining,tone:'neutral'}]}/>

      <div className="chart-footnote"><CardInfo title="Coverage and inspection targets">Coverage measures unique registered assets inspected in the selected dates. Report target progress compares submitted reports with the inspection target. Daroga scoring credit is separate.</CardInfo></div>

      {!loading&&(counts.unidentified>0||counts.outsideRegister>0)&&<p className="coverage-data-note">{counts.unidentified>0?`${counts.unidentified} reports lack a location ID; exact unique and repeat counts are unavailable. `:''}{counts.outsideRegister>0?`${counts.outsideRegister} inspected locations are outside the current register and excluded from registered-location coverage.`:''}</p>}
      {data.errors.length>0&&<div className="coverage-data-note" role="status">Some coverage figures are unavailable.<details><summary>View availability</summary>{data.errors.map(e=><p key={e}>{e}</p>)}</details></div>}
    </section>
    <section className="home-section zone-performance"><div className="home-section-heading"><div><span>ZONE PERFORMANCE</span><h2>Zone performance</h2><p>Compare targets, inspections, location coverage and pending review.</p></div>{(zone||scopeLabel&&scopeLabel!=='All zones and wards')&&<button onClick={()=>onZone('')}>All zones<ArrowUpRight size={15}/></button>}</div>
      <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Zone</th><th>Inspection target achievement</th><th>Inspections still needed</th><th>{terms.coverage}</th><th>{terms.pendingReview}</th><th>SI cleaned</th><th>SI not cleaned</th><th>AI suggests clean</th><th>AI suggests not clean</th><th>Ward score average<CardInfo title="Ward score average">Average of assessed wards in the selected area.</CardInfo></th></tr></thead><tbody>{rows.map(row=>{
        const source=official?.zones?.find(z=>z.id===row.id),target=reportTargetDelivery(targetReadState(targetDelivery(source?.totals,row),targetsReady),row.inspections);
        return <tr key={row.id}><td data-label="Zone"><button className="zone-select" onClick={()=>onZone(row.id)}><strong>{row.name}</strong><ArrowUpRight size={15}/></button></td>
          <td data-label="Inspection target achievement"><small className="delivery-caption">{'Reports received / target'}</small><div className="delivery-target"><div><strong>{target.available?coverageNumber(target.completed):target.stateLabel}{target.available&&<small> / {coverageNumber(target.target)}</small>}</strong><span className={target.met?'delivery-met':'delivery-progress'}>{target.available?(target.percent!=null?`${coverageNumber(target.percent)}%`:'\u2014'):target.stateLabel}</span></div>{target.available&&<div className="delivery-meter"><i data-met={target.met} style={{width:`${Math.min(100,target.percent??0)}%`}}/></div>}</div></td>
          <td data-label={terms.pending}><strong className="delivery-count">{target.available?coverageNumber(target.remaining):'—'}</strong><small className="delivery-caption">{!target.available?target.stateLabel:target.met?'Requirement met':target.fallback?'to meet inspection target':'to meet target'}</small></td>
          <td data-label={terms.coverage}><strong className="delivery-count">{number(row.covered)}<small> / {number(row.total)}</small></strong><small className="delivery-caption">{row.percent==null?'Coverage unavailable':`${coverageNumber(row.percent)}% of registered locations`}</small></td>
          <td data-label="Pending review"><span className="zone-pending">{number(inspectionOutcomes(data,{zone:row.id,ward}).rows.find(r=>r.id==='pending_review')?.value??null)}</span></td>
          {(()=>{const o=inspectionOutcomes(data,{zone:row.id,ward}),val=(id:string)=>o.rows.find(r=>r.id===id)?.value??null,ai=scopedIntelligence(data,{zone:row.id,ward},o.total!=null);return <>
            <td data-label="SI cleaned">{number(val('approved'))}</td><td data-label="SI not cleaned">{number(val('rejected'))}</td>
            <td data-label="AI suggests clean" title="AI suggestion on reports awaiting SI review; not an official decision">{number(ai?ai.clean:null)}</td><td data-label="AI suggests not clean" title="AI suggestion on reports awaiting SI review; not an official decision">{number(ai?ai.notClean:null)}</td></>;})()}
          <td data-label="Ward score average"><strong className="delivery-count">{coverageNumber(row.wardAverage)}<small>{row.wardAverage!=null?' / 100':''}</small></strong><small className="delivery-caption">{row.assessed} assessed wards</small></td></tr>;
      })}</tbody></table></div>{!rows.length&&<div className="home-empty">No zones in the selected scope.</div>}
    </section>
  </>;
}
