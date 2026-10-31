import React from 'react';
import { ArrowUpRight, Brush, Building2, Flag, Trash2, Waves } from 'lucide-react';
import type { OperationalModuleId } from '../../types';
import type { CityPulse } from '../../services/commissioner';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { coverageCounts } from '../../services/inspectionCoverage';
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
      const queues=[
        {label:terms.cleaned,value:source?.cleaned,status:'approved',tone:'cleaned'},
        {label:terms.pendingReview,value:source?.siPending,status:'pending_review',tone:'pending'},
        {label:terms.notCleaned,value:source?.notCleaned,status:'rejected',tone:'attention'},
        {label:terms.actionRequired,value:source?.actionRequired,status:'action_required',tone:'attention'},
        {label:terms.actionTaken,value:source?.actionTaken,status:'action_taken',tone:'pending'},
      ];
      return <article key={id} className={`inspection-module-card module-${id}`} data-module={id}>
        <button className="inspection-card-heading" onClick={()=>onInspect(id)}><span><Icon size={21}/></span><h3>{MODULE_LABELS[id]}</h3><ArrowUpRight size={15}/></button>
        <div className="inspection-card-primary"><div><span>{terms.totalRequired}</span><strong data-metric="required">{count(totalRequired)}</strong></div><div><span>{terms.target}</span><strong data-metric="target" data-state={delivery.fallback?"full_coverage":delivery.state}>{loading?'\u2026':number(delivery.target)}</strong>{delivery.configuredPercent!=null&&<small>{number(delivery.configuredPercent)}% configured</small>}</div></div>
        {delivery.available&&<div className="inspection-card-achievement"><div><span>{delivery.fallback?terms.coverage:terms.achievement}</span><strong data-metric="achievement" data-met={delivery.met}>{delivery.percent==null?'—':`${number(delivery.percent)}%`}</strong></div><div className="delivery-meter"><i data-met={delivery.met} style={{width:`${Math.min(100,delivery.percent??0)}%`}}/></div></div>}
        <dl className="inspection-card-activity inspection-card-activity-compact"><div><dt>{terms.done}</dt><dd data-metric="inspections">{count(counts.inspections)}</dd></div><div><dt>{terms.unique}</dt><dd data-metric="unique">{count(counts.unique)}</dd></div><div><dt>{terms.repeated}</dt><dd data-metric="repeated">{count(counts.repeats)}</dd></div></dl>
        <div className="inspection-card-status">{queues.slice(0,3).map(item=><button key={item.status} data-tone={item.tone} onClick={()=>onInspect(id,item.status)}><i/><span>{item.label}</span><strong data-metric={item.status}>{number(item.value)}</strong><ArrowUpRight size={12}/></button>)}</div>
        <details className="inspection-card-details"><summary>Target &amp; action details{source?.actionRequired>0&&<span className="module-action-alert">{source.actionRequired} action required</span>}</summary><dl><div><dt>{terms.credited}</dt><dd data-metric="completed">{count(delivery.completed)}</dd></div><div><dt>{terms.pending}</dt><dd data-metric="pending">{count(delivery.remaining)}</dd></div><div><dt>{terms.coverage}</dt><dd data-metric="coverage">{count(counts.percent)}{counts.percent!=null?'%':''}</dd></div></dl><div className="inspection-card-actions">{queues.slice(3).map(item=><button key={item.status} data-tone={item.tone} onClick={()=>onInspect(id,item.status)}><span>{item.label}</span><strong data-metric={item.status}>{number(item.value)}</strong><ArrowUpRight size={12}/></button>)}</div></details>
      </article>;
    })}</div><details className="inspection-card-definitions"><summary>How these counts are measured</summary><p><strong>Total inspections required</strong> is the full-coverage baseline: one inspection per registered location. It is not the backend’s inspection schedule. When no configured target is available, Target uses the total inspections required and achievement counts each inspected location once. When a target is configured, its assigned count and credited completions are used. <strong>Unique inspections</strong> count each location once; <strong>repeat inspections</strong> count additional visits. <strong>Coverage</strong> is the percentage of registered locations inspected.</p></details>
  </section>;
}
