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
import { targetDelivery } from '../../services/targetDelivery';
import type { Zone } from '../../types';

export const coverageNumber=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:1});

export function CoverageOverview({data,loading,zone,ward,zones,rankings,official,from,to,onZone}:{data:InspectionCoverage;loading:boolean;zone:string;ward:string;zones:Zone[];rankings:any[];official?:CityPulse['official'];from:string;to:string;onZone:(id:string)=>void}) {
  const metrics=inspectionMetrics(data,{zone,ward},official?.totals),counts=metrics.completed;
  const rows=zoneCoverage(data,zones.filter(z=>!zone||z.id===zone),rankings,ward).map(row=>({...row,...inspectionMetrics(data,{zone:row.id,ward}).completed}));
  const number=(n:number|null)=>loading?'…':coverageNumber(n);
  const delivery=metrics.delivery;
  const period=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return <>
    <section className="home-section coverage-overview"><div className="home-section-heading"><div><span>INSPECTIONS & LOCATION COVERAGE</span><h2>How much of the city have we covered?</h2><p>{period(from)}{from!==to?` – ${period(to)}`:''} · {zone?'Selected zone':'All zones'}{ward?' · Selected ward':''}</p></div><span className="coverage-context"><MapPin size={16}/>{number(counts.percent)}{counts.percent!=null?'%':''} coverage</span></div>
      <StatusBreakdown label="Current registered entities: inspected versus not visited" loading={loading} items={[{id:'covered',label:'Unique entities inspected',value:counts.covered,tone:'green'},{id:'remaining',label:'Not visited in selected dates',value:counts.remaining,tone:'neutral'}]}/>

      <div className="chart-footnote"><CardInfo title="Coverage and inspection targets">Coverage measures unique registered entities inspected in the selected dates. Target achievement measures credited inspections against the inspection target.</CardInfo></div>

      {!loading&&(counts.unidentified>0||counts.outsideRegister>0)&&<p className="coverage-data-note">{counts.unidentified>0?`${counts.unidentified} reports lack a location ID; exact unique and repeat counts are unavailable. `:''}{counts.outsideRegister>0?`${counts.outsideRegister} inspected locations are outside the current register and excluded from registered-location coverage.`:''}</p>}
      {data.errors.length>0&&<div className="coverage-data-note" role="status">Some coverage figures are unavailable.<details><summary>View availability</summary>{data.errors.map(e=><p key={e}>{e}</p>)}</details></div>}
    </section>
    <section className="home-section zone-performance"><div className="home-section-heading"><div><span>ZONE PERFORMANCE</span><h2>Zone performance</h2><p>Compare targets, inspections, location coverage and pending review.</p></div>{zone&&<button onClick={()=>onZone('')}>All zones<ArrowUpRight size={15}/></button>}</div>
      <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Zone</th><th>Inspection target achievement</th><th>Inspections still needed</th><th>{terms.coverage}</th><th>{terms.pendingReview}</th><th>Ward score average<CardInfo title="Ward score average">Average of assessed wards in the selected area.</CardInfo></th></tr></thead><tbody>{rows.map(row=>{
        const source=official?.zones?.find(z=>z.id===row.id),target=targetDelivery(source?.totals,row);
        return <tr key={row.id}><td data-label="Zone"><button className="zone-select" onClick={()=>onZone(row.id)}><strong>{row.name}</strong><ArrowUpRight size={15}/></button></td>
          <td data-label="Inspection target achievement"><small className="delivery-caption">{inspectionPeriod(row,target).achievement}</small><div className="delivery-target"><div><strong>{target.available?coverageNumber(target.completed):target.stateLabel}{target.available&&<small> / {coverageNumber(target.target)}</small>}</strong><span className={target.met?'delivery-met':'delivery-progress'}>{target.available?(target.percent!=null?`${coverageNumber(target.percent)}%`:'\u2014'):target.stateLabel}</span></div>{target.available&&<div className="delivery-meter"><i data-met={target.met} style={{width:`${Math.min(100,target.percent??0)}%`}}/></div>}</div></td>
          <td data-label={terms.pending}><strong className="delivery-count">{target.available?coverageNumber(target.remaining):'—'}</strong><small className="delivery-caption">{!target.available?target.stateLabel:target.met?'Requirement met':target.fallback?'to meet inspection target':'to meet target'}</small></td>
          <td data-label={terms.coverage}><strong className="delivery-count">{number(row.covered)}<small> / {number(row.total)}</small></strong><small className="delivery-caption">{row.percent==null?'Coverage unavailable':`${coverageNumber(row.percent)}% of registered locations`}</small></td>
          <td data-label="Pending review"><span className="zone-pending">{number(inspectionOutcomes(data,{zone:row.id,ward}).rows.find(r=>r.id==='pending_review')?.value??null)}</span></td>
          <td data-label="Ward score average"><strong className="delivery-count">{coverageNumber(row.wardAverage)}<small>{row.wardAverage!=null?' / 100':''}</small></strong><small className="delivery-caption">{row.assessed} assessed wards</small></td></tr>;
      })}</tbody></table></div>{!rows.length&&<div className="home-empty">No zones in the selected scope.</div>}
    </section>
  </>;
}
