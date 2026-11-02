import React from 'react';
import { ArrowUpRight, Brush, Building2, Flag, Trash2, Waves } from 'lucide-react';
import type { OperationalModuleId } from '../../types';
import type { CityPulse } from '../../services/commissioner';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { coverageCounts, inspectionOutcomes } from '../../services/inspectionCoverage';
import { inspectionCard } from '../../services/inspectionCard';
import { MODULE_LABELS } from '../../services/presentation';
import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import { coverageNumber as number } from './CoverageOverview';

const icons={sweeping:Brush,toilets:Building2,litter_bins:Trash2,nala:Waves,ctu_gvp:Flag};
export function ModuleDelivery({modules,pulse,data,loading,zone,ward,onInspect}:{modules:OperationalModuleId[];pulse:CityPulse;data:InspectionCoverage;loading:boolean;zone:string;ward:string;onInspect:(module?:string,status?:string)=>void}) {
  return <section className="home-section service-delivery"><div className="home-section-heading"><div><span>SERVICE PERFORMANCE</span><h2>Every module. One view.</h2><p>Total inspections required, targets, inspection status and coverage for the selected dates.</p></div><button onClick={()=>onInspect()}>All inspections<ArrowUpRight size={16}/></button></div>
    <div className="inspection-module-cards">{modules.map(id=>{
      const source=pulse.official?.modules[id],counts=coverageCounts(data,{module:id,zone,ward});
      const {totalRequired,delivery}=inspectionCard(counts,source),Icon=icons[id];
      const count=(value:number|null)=>loading?'…':number(value);
      const queues=inspectionOutcomes(data,{module:id,zone,ward}).rows.map(row=>({label:row.label,value:row.value,status:row.id,tone:row.tone==='green'?'cleaned':row.tone==='red'?'attention':'pending'}));
      return <article key={id} className={`inspection-module-card module-${id}`} data-module={id}>
        <button className="inspection-card-heading" onClick={()=>onInspect(id)}><span><Icon size={21}/></span><h3>{MODULE_LABELS[id]}</h3><ArrowUpRight size={15}/></button>
        <div className="inspection-card-primary"><div><span>{terms.totalRequired}<small>{loading?'Updating period':`${counts.days??1} day${counts.days===1?'':'s'} baseline`}</small></span><strong data-metric="required">{count(totalRequired)}</strong></div><div><span>{terms.target}</span><strong data-metric="target" data-state={delivery.fallback?"full_coverage":delivery.state}>{loading?'\u2026':number(delivery.target)}</strong><small>{delivery.fallback?'Daily coverage baseline':delivery.configuredPercent!=null?`${number(delivery.configuredPercent)}% configured`:'Configured target'}</small></div></div>
        {delivery.available&&<div className="inspection-card-achievement"><div><span>{delivery.fallback?'Daily baseline achievement':terms.achievement}</span><strong data-metric="achievement" data-met={delivery.met}>{delivery.percent==null?'—':`${number(delivery.percent)}%`}</strong></div><div className="delivery-meter"><i data-met={delivery.met} style={{width:`${Math.min(100,delivery.percent??0)}%`}}/></div></div>}
        <dl className="inspection-card-activity inspection-card-activity-compact"><div><dt>{terms.done}</dt><dd data-metric="inspections">{count(counts.inspections)}</dd></div><div><dt>{terms.unique}</dt><dd data-metric="unique">{count(counts.unique)}</dd></div><div><dt>{terms.repeated}</dt><dd data-metric="repeated">{count(counts.repeats)}</dd></div></dl>
        <div className="inspection-card-status">{queues.filter((item,i)=>i<3||item.value!==0).map(item=><button disabled={loading||item.value==null} key={item.status} data-tone={item.tone} onClick={()=>onInspect(id,item.status)}><i/><span>{item.label}</span><strong data-metric={item.status}>{loading?'\u2026':number(item.value)}</strong><ArrowUpRight size={12}/></button>)}</div>
        <details className="inspection-card-details"><summary>Target &amp; action details{!loading&&(queues.find(q=>q.status==='action_required')?.value??0)>0&&<span className="module-action-alert">{queues.find(q=>q.status==='action_required')?.value} action required</span>}</summary><dl><div><dt>{terms.credited}</dt><dd data-metric="completed">{count(delivery.completed)}</dd></div><div><dt>{terms.pending}</dt><dd data-metric="pending">{count(delivery.remaining)}</dd></div><div><dt>{terms.coverage}</dt><dd data-metric="coverage">{count(counts.percent)}{counts.percent!=null?'%':''}</dd></div></dl></details>
      </article>;
    })}</div><details className="inspection-card-definitions"><summary>How these counts are measured</summary><p><strong>Total inspections required</strong> is a daily full-coverage baseline: current registered locations multiplied by selected calendar days. It is not a confirmed inspection schedule and does not reconstruct historical inventory. Without a confirmed configured target, Target uses this baseline and counts each registered location once per day. Configured targets use assigned counts and credited completions. <strong>Unique inspections</strong> count each location once across the period; <strong>repeat inspections</strong> count additional visits. <strong>Coverage</strong> measures registered locations visited at least once across the period. Status counts cover all inspection records and add up to Inspections done.</p></details>
  </section>;
}
