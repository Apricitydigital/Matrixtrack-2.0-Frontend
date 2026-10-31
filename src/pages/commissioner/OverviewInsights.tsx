import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { amount } from '../../services/insights';
import type { CityPulse } from '../../services/commissioner';
export function OverviewInsights({pulse,onInspect}:{pulse:CityPulse;onInspect:(module?:string,status?:string)=>void}) {
  const t=pulse.official?.totals;
  const outcomes=[
    {id:'approved',label:terms.cleaned,value:t?.cleaned,tone:'green',Icon:CheckCircle2,note:'Reviewed as cleaned'},
    {id:'pending_review',label:terms.pendingReview,value:t?.siPending,tone:'yellow',Icon:Clock3,note:'Awaiting Sanitary Inspector decision'},
    {id:'rejected',label:terms.notCleaned,value:t?.notCleaned,tone:'red',Icon:XCircle,note:'Reviewed as not cleaned'},
  ];
  const known=outcomes.every(row=>typeof row.value==='number'&&Number.isFinite(row.value));
  return <section className="home-section overview-outcomes"><div className="home-section-heading"><div><span>INSPECTION OUTCOMES</span><h2>What is waiting for a decision?</h2></div><span className="outcome-total">{known?amount(outcomes.reduce((sum,row)=>sum+row.value!,0),0):'—'} reported outcomes</span></div>
    <div className="outcome-summary-cards">{outcomes.map(({id,label,value,tone,Icon,note})=><button key={id} data-outcome={id} data-tone={tone} onClick={()=>onInspect(undefined,id)} aria-label={`${label}: ${amount(value,0)}. Open inspections.`}><div><Icon size={21}/><span>{label}</span><ArrowUpRight size={16}/></div><strong>{amount(value,0)}</strong><small>{note}</small></button>)}</div>
  </section>;
}
