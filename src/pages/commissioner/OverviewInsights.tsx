import {IntelligenceSummary} from '../../components/reports/IntelligenceSuggestion';
import { CardInfo } from '../../components/common/CardInfo';
import React from 'react';
import {StatusBreakdown} from '../../components/analytics/StatusBreakdown';
import { ArrowUpRight, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { amount } from '../../services/insights';
import type { CityPulse } from '../../services/commissioner';
import { inspectionActions, inspectionOutcomes, type InspectionCoverage } from '../../services/inspectionCoverage';
export function OverviewInsights({pulse,data,loading=false,zone='',ward='',onInspect}:{pulse:CityPulse;data?:InspectionCoverage;loading?:boolean;zone?:string;ward?:string;onInspect:(module?:string,status?:string)=>void}) {
  const t=pulse.official?.totals;
  const outcomes=data?inspectionOutcomes(data,{zone,ward}):{total:t?t.cleaned+t.siPending+t.notCleaned:null,rows:[
    {id:'approved',label:'Cleaned',value:t?.cleaned,tone:'green'},
    {id:'pending_review',label:'Pending review',value:t?.siPending,tone:'yellow'},
    {id:'rejected',label:'Not cleaned',value:t?.notCleaned,tone:'red'},
  ]};
  const actions=data?inspectionActions(data,{zone,ward}):{totalRequired:null,taken:null,outstanding:null};
  return <section className="home-section overview-outcomes"><div className="home-section-heading"><div><span>INSPECTION STATUS</span><h2>Every inspection accounted for</h2><p>Inspection outcomes for the selected dates.</p></div><span className="outcome-total">{loading?'\u2026':amount(outcomes.total,0)} {data?'total inspection records':'reported outcomes'}</span></div>
    <StatusBreakdown label="Current inspection statuses" loading={loading} items={outcomes.rows.filter((row,i)=>i<3||row.id==='unclassified'||row.value!==0).map(row=>({...row,tone:row.tone as 'red'|'yellow'|'green'|'neutral',attributes:{'data-outcome':row.id}}))} onSelect={id=>onInspect(undefined,id)}/>
    <IntelligenceSummary reports={data?.visits.filter(v=>(!zone||v.zoneId===zone)&&(!ward||v.wardId===ward)).map(v=>({...v.raw,status:v.raw?.workspaceStatus||v.status}))||[]} loading={loading} unavailable={!data||data.failedModules.length>0} onSelect={status=>onInspect(undefined,status)}/>
    <div className="home-section-heading"><div><span>ACTION FOLLOW-UP</span><h2>Action required &amp; Action taken</h2></div><CardInfo title="Action counts"><p>Action required: reports flagged for follow-up. Action taken: reports with recorded IEC action evidence. Uses the selected dates and area.</p></CardInfo></div>
    <div className="action-count-basis">
      <button data-action-summary="all_actions_required" disabled={loading||actions.totalRequired==null} onClick={()=>onInspect(undefined,'all_actions_required')}><span>Action required</span><strong>{loading?'?':amount(actions.totalRequired,0)}</strong></button>
      <button data-action-summary="action_taken" disabled={loading||actions.taken==null} onClick={()=>onInspect(undefined,'all_actions_taken')}><span>Action taken</span><strong>{loading?'?':amount(actions.taken,0)}</strong></button>
    </div>
  </section>;
}
