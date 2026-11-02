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
      <div className="coverage-stat-grid">{[
        ['Total entities',counts.total,'Current registered inventory, independent of date range'],['Achieved (inspections completed)',metrics.achieved,'Completed field visits, excluding Draft'],[terms.unique,counts.covered,'Completed visits in selected dates; each entity counted once'],[terms.repeated,counts.repeats,'Further visits to the same location'],['Not visited this period',counts.remaining,'Context beyond the assigned target']
      ].map(([label,value,note])=><article key={String(label)}><span>{label}</span><strong>{number(value as number|null)}</strong><p>{note}</p></article>)}</div>
      <div className="coverage-explainer"><Target size={17}/><p><strong>Target achievement and location coverage are separate.</strong> {!loading&&delivery.fallback&&counts.total!=null?`${coverageNumber(counts.total)} registered locations are counted once across this period. The inspection target for this selected range is ${coverageNumber(counts.total)} locations \u00d7 ${counts.days??1} day${counts.days===1?'':'s'} = ${coverageNumber(counts.required??counts.total)} inspection opportunities. `:''} {delivery.available&&delivery.percent!=null?`${coverageNumber(delivery.completed)} of ${coverageNumber(delivery.target)} inspections counted toward target (${coverageNumber(delivery.percent)}% achievement). `:''}{counts.inspections!=null&&delivery.completed!=null&&counts.inspections!==delivery.completed?`${coverageNumber(counts.inspections)} inspection records are included in Inspections done. ${delivery.fallback?'Same-day repeat visits do not add target credit.':'Target credit follows employee assignments, inspection completeness and daily or period limits.'} `:''}Configured targets can be achieved before full location coverage is reached.</p></div>
      <details className="coverage-method"><summary><Info size={15}/>How counts are measured</summary><p>A location inspected three times contributes one unique location and two repeat inspections. Target uses the configured count when available; otherwise it uses current registered locations multiplied by selected days, counting each registered location once per day. This target assumes one inspection per registered location per day, not a confirmed schedule. Draft is excluded from Achieved, target planning credit and entity coverage. Reports and unique coverage are shown separately; they may differ from the count credited toward the target. Registered-location coverage uses the returned city inventory.</p></details>
      {!loading&&(counts.unidentified>0||counts.outsideRegister>0)&&<p className="coverage-data-note">{counts.unidentified>0?`${counts.unidentified} reports lack a location ID; exact unique and repeat counts are unavailable. `:''}{counts.outsideRegister>0?`${counts.outsideRegister} inspected locations are outside the current register and excluded from registered-location coverage.`:''}</p>}
      {data.errors.length>0&&<div className="coverage-data-note" role="status">Some coverage figures are unavailable.<details><summary>View availability</summary>{data.errors.map(e=><p key={e}>{e}</p>)}</details></div>}
    </section>
    <section className="home-section zone-performance"><div className="home-section-heading"><div><span>ZONE PERFORMANCE</span><h2>Zone performance</h2><p>Compare targets, inspections, location coverage and pending review.</p></div>{zone&&<button onClick={()=>onZone('')}>All zones<ArrowUpRight size={15}/></button>}</div>
      <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Zone</th><th>Inspection target achievement</th><th>Inspections still needed</th><th>{terms.coverage}</th><th>{terms.pendingReview}</th><th>Ward score average</th></tr></thead><tbody>{rows.map(row=>{
        const source=official?.zones?.find(z=>z.id===row.id),target=targetDelivery(source?.totals,row);
        return <tr key={row.id}><td data-label="Zone"><button className="zone-select" onClick={()=>onZone(row.id)}><strong>{row.name}</strong><ArrowUpRight size={15}/></button></td>
          <td data-label="Inspection target achievement"><small className="delivery-caption">{inspectionPeriod(row,target).achievement}</small><div className="delivery-target"><div><strong>{target.available?coverageNumber(target.completed):target.stateLabel}{target.available&&<small> / {coverageNumber(target.target)}</small>}</strong><span className={target.met?'delivery-met':'delivery-progress'}>{target.available?(target.percent!=null?`${coverageNumber(target.percent)}%`:'\u2014'):target.stateLabel}</span></div>{target.available&&<div className="delivery-meter"><i data-met={target.met} style={{width:`${Math.min(100,target.percent??0)}%`}}/></div>}</div></td>
          <td data-label={terms.pending}><strong className="delivery-count">{target.available?coverageNumber(target.remaining):'—'}</strong><small className="delivery-caption">{!target.available?target.stateLabel:target.met?'Requirement met':target.fallback?'to meet inspection target':'to meet target'}</small></td>
          <td data-label={terms.coverage}><strong className="delivery-count">{number(row.covered)}<small> / {number(row.total)}</small></strong><small className="delivery-caption">{row.percent==null?'Coverage unavailable':`${coverageNumber(row.percent)}% of registered locations`}</small></td>
          <td data-label="Pending review"><span className="zone-pending">{number(inspectionOutcomes(data,{zone:row.id,ward}).rows.find(r=>r.id==='pending_review')?.value??null)}</span></td>
          <td data-label="Ward score average"><strong className="delivery-count">{coverageNumber(row.wardAverage)}<small>{row.wardAverage!=null?' / 100':''}</small></strong><small className="delivery-caption">{row.assessed} assessed wards</small></td></tr>;
      })}</tbody></table></div>{!rows.length&&<div className="home-empty">No zones in the selected scope.</div>}<p className="delivery-note">Ward averages include assessed wards only. They are separate from official ward ranks and target achievement.</p>
    </section>
  </>;
}
