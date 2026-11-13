import {targetReadState,reportTargetDelivery} from '../../services/targetDelivery';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { submittedBeatReportCount } from '../../services/beatReportCount';
import { ulbReportRegister } from '../../services/ulbReportRegister';
import { CardInfo } from '../../components/common/CardInfo';
import React from 'react';
import { ArrowUpRight, Brush, Building2, Flag, Trash2, Waves } from 'lucide-react';
import type { OperationalModuleId } from '../../types';
import type { CityPulse } from '../../services/commissioner';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { inspectionOutcomes } from '../../services/inspectionCoverage';
import { inspectionPeriod } from '../../services/inspectionPeriod';
import { MODULE_LABELS } from '../../services/presentation';
import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import { coverageNumber as number } from './CoverageOverview';

const icons={sweeping:Brush,toilets:Building2,litter_bins:Trash2,nala:Waves,ctu_gvp:Flag};
export function ModuleDelivery({modules,pulse,data,loading,zone,ward,onInspect,targetsReady=true,beatReports=false}:{modules:OperationalModuleId[];pulse:CityPulse;data:InspectionCoverage;loading:boolean;targetsReady?:boolean;beatReports?:boolean;zone:string;ward:string;onInspect:(module?:string,status?:string)=>void}) {
  if(beatReports)data=ulbReportRegister(data);
  return <section className="home-section service-delivery"><div className="home-section-heading"><div><span>SERVICE PERFORMANCE</span><h2>Every module. One view.</h2><p>Asset inventory, completed inspections and coverage for the selected dates.</p></div><button onClick={()=>onInspect()}>All inspections<ArrowUpRight size={16}/></button></div>
    <div className="inspection-module-cards">{modules.map(id=>{
      const source=pulse.official?.modules[id];
      const showBeatReports=beatReports&&id==='sweeping';
      const beatReportTotal=showBeatReports?submittedBeatReportCount(data,zone,ward):null;
      const metrics=inspectionMetrics(data,{module:id,zone,ward},source),scoring=targetReadState(metrics.delivery,targetsReady),delivery=reportTargetDelivery(scoring,metrics.achieved),Icon=icons[id];
      const period={...inspectionPeriod(metrics.completed,scoring,data.from,data.to),progress:`${number(metrics.achieved)} reports received / ${number(delivery.target)} inspection target`,rule:'Report target progress uses all submitted reports.Daroga scoring credit is shown separately.'};
      const count=(value:number|null)=>loading?'…':number(value);
      const queues=inspectionOutcomes(data,{module:id,zone,ward}).rows.map(row=>({label:row.label,value:row.value,status:row.id,tone:row.tone==='green'?'cleaned':row.tone==='red'?'attention':'pending'}));
      return <article key={id} className={`inspection-module-card module-${id}`} data-module={id}>
        <div className="inspection-card-header"><button className="inspection-card-heading" onClick={()=>onInspect(id)}><span><Icon size={21}/></span><h3>{MODULE_LABELS[id]}</h3><ArrowUpRight size={15}/></button><CardInfo title={`${MODULE_LABELS[id]} calculations`}><p>{loading?'Updating selected period...':period.range}</p><p data-metric="period-basis">{period.basis}</p><p data-metric="period-credit">{period.progress}</p><p>{period.rule}</p><p>{showBeatReports&&<>Total beat reports counts each submitted beat once per day. A report with 3, 4 or 5 point photos counts as one report.historical point records for the same beat and day are counted together. Status counts below use the same beat reports. </>}Achieved = completed inspections. Coverage = locations inspected out of all registered locations. Repeat visits to the same location are extra; same-day repeats do not add target credit.</p></CardInfo></div>
<div className="inspection-card-primary"><div><span>Total assets<small>Current inventory</small></span><strong data-metric="entities">{count(metrics.totalEntities)}</strong></div><div><span>Inspection target<small>{loading?'Updating':period.duration+' total'}</small></span><strong data-metric="target" data-state={delivery.fallback?'full_coverage':delivery.state}>{count(delivery.target)}</strong>{delivery.configuredPercent!=null&&<small>{number(delivery.configuredPercent)}% configured</small>}</div></div>
        <dl className="inspection-card-activity inspection-entity-metrics"><div><dt>Achieved <small>Inspections completed</small></dt><dd data-metric="achieved"><button className="inspection-metric-link" disabled={loading||metrics.achieved==null} onClick={()=>onInspect(id,'inspections_completed')} aria-label={`Open completed ${MODULE_LABELS[id]} inspections`}>{count(metrics.achieved)}</button></dd></div><div><dt>Coverage %</dt><dd data-metric="coverage">{count(metrics.coveragePercent)}{!loading&&metrics.coveragePercent!=null?'%':''}</dd></div><div><dt>Unique assets inspected</dt><dd data-metric="unique">{count(metrics.uniqueEntities)}</dd></div><div><dt>{showBeatReports?'Total beat reports':'Total inspection records'}</dt><dd data-metric="inspections">{count(showBeatReports?beatReportTotal:metrics.totalRecords)}</dd></div></dl>
        <div className="inspection-card-achievement"><div><span>Report target progress</span><strong data-metric="achievement" data-met={delivery.met}>{loading?'Updating':delivery.percent==null?'\u2014':`${number(delivery.percent)}%`}</strong></div><div className="delivery-meter"><i style={{width:`${Math.min(100,delivery.percent??0)}%`}}/></div></div>
        <div className="inspection-card-status">{queues.filter((item,i)=>i<3||item.value!==0).map(item=><button disabled={loading||item.value==null} key={item.status} data-tone={item.tone} onClick={()=>onInspect(id,item.status)}><i/><span>{item.label}</span><strong data-metric={item.status}>{loading?'\u2026':number(item.value)}</strong><ArrowUpRight size={12}/></button>)}</div>
        <details className="inspection-card-details"><summary>Target &amp; action details{!loading&&(queues.find(q=>q.status==='action_required')?.value??0)>0&&<span className="module-action-alert">{queues.find(q=>q.status==='action_required')?.value} action required</span>}</summary><dl><div><dt>Daroga scoring credit</dt><dd data-metric="completed">{count(scoring.completed)}</dd></div><div><dt>{terms.pending}</dt><dd data-metric="pending">{count(delivery.remaining)}</dd></div><div><dt>Repeat visits (completed)</dt><dd data-metric="repeated">{count(metrics.repeatInspections)}</dd></div></dl></details>
      </article>;
    })}</div><details className="inspection-card-definitions"><summary>How these counts are measured</summary><p>Total assets is current registered inventory and does not multiply with dates. Achieved counts all submitted field inspections in the selected range. Unique assets inspected counts each registered asset with a completed inspection once; Coverage % divides this count by total assets. {beatReports?'For Sweeping, Total beat reports counts submitted beat reports once per beat per day; point photos are not separate reports. Other modules show Total inspection records.':'Total inspection records reconciles with all status counts.'} When no configured target is confirmed, the inspection target assumes one completed inspection per registered asset per selected day. Target credit counts each asset once per day; configured targets retain the source credit rules. This planning assumption is explained in each card's information icon.</p></details>
  </section>;
}
