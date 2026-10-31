import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React from 'react';
import { ArrowUpRight, Info, MapPin, Target } from 'lucide-react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { coverageCounts, zoneCoverage } from '../../services/inspectionCoverage';
import type { CityPulse } from '../../services/commissioner';
import { targetDelivery } from '../../services/targetDelivery';
import type { Zone } from '../../types';

export const coverageNumber=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:1});

export function CoverageOverview({data,loading,zone,ward,zones,rankings,official,from,to,onZone}:{data:InspectionCoverage;loading:boolean;zone:string;ward:string;zones:Zone[];rankings:any[];official?:CityPulse['official'];from:string;to:string;onZone:(id:string)=>void}) {
  const counts=coverageCounts(data,{zone,ward});
  const rows=zoneCoverage(data,zones.filter(z=>!zone||z.id===zone),rankings,ward);
  const number=(n:number|null)=>loading?'…':coverageNumber(n);
  const delivery=targetDelivery(official?.totals,counts);
  const period=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return <>
    <section className="home-section coverage-overview"><div className="home-section-heading"><div><span>INSPECTIONS & LOCATION COVERAGE</span><h2>How much of the city have we covered?</h2><p>{period(from)}{from!==to?` – ${period(to)}`:''} · {zone?'Selected zone':'All zones'}{ward?' · Selected ward':''}</p></div><span className="coverage-context"><MapPin size={16}/>{number(counts.percent)}{counts.percent!=null?'%':''} coverage</span></div>
      <div className="coverage-stat-grid">{[
        [terms.totalRequired,counts.total,'Full location coverage'],[terms.done,counts.inspections,'All inspections in this period'],[terms.unique,counts.unique,'Each location counted once'],[terms.repeated,counts.repeats,'Further visits to the same location'],['Not visited this period',counts.remaining,'Context beyond the assigned target']
      ].map(([label,value,note])=><article key={String(label)}><span>{label}</span><strong>{number(value as number|null)}</strong><p>{note}</p></article>)}</div>
      <div className="coverage-explainer"><Target size={17}/><p><strong>Target achievement and location coverage are separate.</strong> {delivery.available&&delivery.percent!=null?`${coverageNumber(delivery.completed)} of ${coverageNumber(delivery.target)} inspections counted toward target (${coverageNumber(delivery.percent)}% achievement). `:''}{counts.inspections!=null&&delivery.completed!=null&&counts.inspections!==delivery.completed?`${coverageNumber(counts.inspections)} inspection records are included in Inspections done. Target credit follows employee assignments, inspection completeness and daily or period limits. `:''}Configured targets can be achieved before full location coverage is reached.</p></div>
      <details className="coverage-method"><summary><Info size={15}/>How counts are measured</summary><p>A location inspected three times contributes one unique location and two repeat inspections. Target uses the configured count when available; otherwise it uses the total inspections required, with unique locations counted toward completion. Reports and unique coverage are shown separately; they may differ from the count credited toward the target. Registered-location coverage uses the returned city inventory.</p></details>
      {!loading&&(counts.unidentified>0||counts.outsideRegister>0)&&<p className="coverage-data-note">{counts.unidentified>0?`${counts.unidentified} reports lack a location ID; exact unique and repeat counts are unavailable. `:''}{counts.outsideRegister>0?`${counts.outsideRegister} inspected locations are outside the current register and excluded from registered-location coverage.`:''}</p>}
      {data.errors.length>0&&<div className="coverage-data-note" role="status">Some coverage figures are unavailable.<details><summary>View availability</summary>{data.errors.map(e=><p key={e}>{e}</p>)}</details></div>}
    </section>
    <section className="home-section zone-performance"><div className="home-section-heading"><div><span>ZONE PERFORMANCE</span><h2>Zone performance</h2><p>Compare targets, inspections, location coverage and pending review.</p></div>{zone&&<button onClick={()=>onZone('')}>All zones<ArrowUpRight size={15}/></button>}</div>
      <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Zone</th><th>{terms.achievement}</th><th>{terms.pending}</th><th>{terms.coverage}</th><th>{terms.pendingReview}</th><th>Ward score average</th></tr></thead><tbody>{rows.map(row=>{
        const source=official?.zones?.find(z=>z.id===row.id),target=targetDelivery(source?.totals,row);
        return <tr key={row.id}><td data-label="Zone"><button className="zone-select" onClick={()=>onZone(row.id)}><strong>{row.name}</strong><ArrowUpRight size={15}/></button></td>
          <td data-label="Target achievement"><div className="delivery-target"><div><strong>{target.available?coverageNumber(target.completed):target.stateLabel}{target.available&&<small> / {coverageNumber(target.target)}</small>}</strong><span className={target.met?'delivery-met':'delivery-progress'}>{target.available&&target.percent!=null?`${coverageNumber(target.percent)}%`:target.stateLabel}</span></div>{target.available&&<div className="delivery-meter"><i data-met={target.met} style={{width:`${Math.min(100,target.percent??0)}%`}}/></div>}</div></td>
          <td data-label={terms.pending}><strong className="delivery-count">{target.available?coverageNumber(target.remaining):'—'}</strong><small className="delivery-caption">{!target.available?target.stateLabel:target.met?'Target met':'to meet target'}</small></td>
          <td data-label={terms.coverage}><strong className="delivery-count">{number(row.unique)}<small> / {number(row.total)}</small></strong><small className="delivery-caption">{row.percent==null?'Coverage unavailable':`${coverageNumber(row.percent)}% of registered locations`}</small></td>
          <td data-label="Pending review"><span className="zone-pending">{coverageNumber(source?.totals.siPending)}</span></td>
          <td data-label="Ward score average"><strong className="delivery-count">{coverageNumber(row.wardAverage)}<small>{row.wardAverage!=null?' / 100':''}</small></strong><small className="delivery-caption">{row.assessed} assessed wards</small></td></tr>;
      })}</tbody></table></div>{!rows.length&&<div className="home-empty">No zones in the selected scope.</div>}<p className="delivery-note">Ward averages include assessed wards only. They are separate from official ward ranks and target achievement.</p>
    </section>
  </>;
}
