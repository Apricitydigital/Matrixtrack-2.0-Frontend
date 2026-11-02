import React from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { amount } from '../../services/insights';
import type { CityPulse } from '../../services/commissioner';
import { inspectionOutcomes, type InspectionCoverage } from '../../services/inspectionCoverage';
export function OverviewInsights({pulse,data,loading=false,zone='',ward='',onInspect}:{pulse:CityPulse;data?:InspectionCoverage;loading?:boolean;zone?:string;ward?:string;onInspect:(module?:string,status?:string)=>void}) {
  const t=pulse.official?.totals;
  const outcomes=data?inspectionOutcomes(data,{zone,ward}):{total:t?t.cleaned+t.siPending+t.notCleaned:null,rows:[
    {id:'approved',label:'Cleaned',value:t?.cleaned,tone:'green'},
    {id:'pending_review',label:'Pending review',value:t?.siPending,tone:'yellow'},
    {id:'rejected',label:'Not cleaned',value:t?.notCleaned,tone:'red'},
  ]};
  return <section className="home-section overview-outcomes"><div className="home-section-heading"><div><span>INSPECTION STATUS</span><h2>Every inspection accounted for</h2><p>Current status of reports submitted in the selected period. Each report is counted once.</p></div><span className="outcome-total">{loading?'\u2026':amount(outcomes.total,0)} {data?'inspections / all statuses':'reported outcomes'}</span></div>
    <div className="outcome-summary-cards">{outcomes.rows.filter((row,i)=>i<3||row.id==='unclassified'||row.value!==0).map(({id,label,value,tone})=>{const Icon=tone==='green'?CheckCircle2:tone==='red'?XCircle:Clock3;return <button key={id} disabled={loading||value==null} data-outcome={id} data-tone={tone} onClick={()=>onInspect(undefined,id)} aria-label={`${label}: ${amount(value,0)}. Open inspections.`}><div><Icon size={21}/><span>{label}</span><ArrowUpRight size={16}/></div><strong>{loading?'\u2026':amount(value,0)}</strong><small>{id==='pending_review'?'Awaiting Sanitary Inspector decision':id==='unclassified'?'Draft report':'Current report status'}</small></button>;})}</div>
  </section>;
}
