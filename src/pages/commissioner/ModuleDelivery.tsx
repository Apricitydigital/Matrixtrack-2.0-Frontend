import {targetReadState,reportTargetDelivery} from '../../services/targetDelivery';
import { ModuleDetailBody } from './ModuleDetailBody';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { submittedBeatReportCount } from '../../services/beatReportCount';
import { ulbReportRegister } from '../../services/ulbReportRegister';
import { CardInfo } from '../../components/common/CardInfo';
import { useVisual } from '../../services/vizMode';
import { ProgressMeter } from '../../components/analytics/VisualCharts';
import React from 'react';
import { ArrowUpRight, Brush, Building2, Flag, Sparkles, Trash2, Waves } from 'lucide-react';
import { aiAnalysis, pendingLocations } from '../../services/cleanliness';
import { usePanel, PanelActions, PanelSection, PanelStats, fmtNum, fmtPct } from '../../components/dashboard/DetailPanel';
import { CleanlinessDetail, PendingList, CoverageDetail, type Scope } from '../../components/dashboard/panelBodies';
import type { OperationalModuleId } from '../../types';
import type { CityPulse } from '../../services/commissioner';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { inspectionActions, type InspectionVisit } from '../../services/inspectionCoverage';
import { inspectionDisplayStatus } from '../../services/inspectionStatus';
import { ReportListPanel } from '../../components/dashboard/ReportListPanel';
import { inspectionPeriod } from '../../services/inspectionPeriod';
import { MODULE_LABELS } from '../../services/presentation';
import { coverageNumber as number } from './CoverageOverview';

/** Modules in LAST_MODULES always come last, in this order; every other module keeps its original order. */
const LAST_MODULES:string[]=['ctu_gvp','nala'];
const icons={sweeping:Brush,toilets:Building2,litter_bins:Trash2,nala:Waves,ctu_gvp:Flag};
export function ModuleDelivery({modules,pulse,data,loading,zone,ward,onInspect,targetsReady=true,beatReports=false,wards,onCoverage,onViewReport,zoneOptions}:{zoneOptions?:{id:string;name:string}[];onViewReport?:(visit:InspectionVisit)=>void;modules:OperationalModuleId[];pulse:CityPulse;data:InspectionCoverage;loading:boolean;targetsReady?:boolean;beatReports?:boolean;zone:string;ward:string;onInspect:(module?:string,status?:string)=>void;wards?:{id:string;name:string;zoneId?:string}[];onCoverage?:(scope:Scope)=>void}) {
  const visual=useVisual();
  const panel=usePanel();
  const wardList=wards||[],wardName=(id:string,fallback?:string)=>fallback||wardList.find(w=>w.id===id)?.name||'Ward not recorded';
  if(beatReports)data=ulbReportRegister(data);
  return <section className="home-section service-delivery"><div className="home-section-heading"><div><h2>Every module. One view.</h2><p>Asset inventory, completed inspections and coverage for the selected dates.</p></div><button onClick={()=>onInspect()}>All inspections<ArrowUpRight size={16}/></button></div>
    <div className="inspection-module-cards">{[...modules].sort((x,y)=>LAST_MODULES.indexOf(x)-LAST_MODULES.indexOf(y)).map(id=>{
      const source=pulse.official?.modules[id];
      const showBeatReports=beatReports&&id==='sweeping';
      const beatReportTotal=showBeatReports?submittedBeatReportCount(data,zone,ward):null;
      const metrics=inspectionMetrics(data,{module:id,zone,ward},source),scoring=targetReadState(metrics.delivery,targetsReady),delivery=reportTargetDelivery(scoring,metrics.achieved),Icon=icons[id];
      const period={...inspectionPeriod(metrics.completed,scoring,data.from,data.to),progress:`${number(metrics.achieved)} reports received / ${number(delivery.target)} inspection target`,rule:'Report target progress uses all submitted reports.Daroga scoring credit is shown separately.'};
      const count=(value:number|null)=>loading?'…':number(value);
      const notInspected=metrics.totalEntities==null||metrics.uniqueEntities==null?null:Math.max(0,metrics.totalEntities-metrics.uniqueEntities);
      const moduleVisits=data.visits.filter(v=>v.module===id&&(!zone||v.zoneId===zone)&&(!ward||v.wardId===ward)),ai=aiAnalysis(moduleVisits);
      const pending=data.inventoryAvailable?pendingLocations(data,{module:id,zone,ward}):[];
      // Same SI-outcome model as the overview: Cleaned + Not cleaned + Pending review add up to every inspection. Action follow-up is tracked separately below.
      const known=metrics.totalRecords!=null;
      const siCount={approved:0,notCleaned:0,pending:0};
      for(const v of new Map(moduleVisits.map(x=>[x.id,x])).values()){const st=inspectionDisplayStatus(v.status);if(st==='approved')siCount.approved++;else if(st==='pending_review')siCount.pending++;else siCount.notCleaned++;}
      const acts=inspectionActions(data,{module:id,zone,ward}),actPending=acts.totalRequired==null||acts.taken==null?null:Math.max(0,acts.totalRequired-acts.taken);
      const queues=[{label:'Cleaned',value:known?siCount.approved:null,status:'approved',tone:'cleaned'},{label:'Not cleaned',value:known?siCount.notCleaned:null,status:'si_not_cleaned',tone:'attention'},{label:'Pending review',value:known?siCount.pending:null,status:'pending_review',tone:'pending'}];
      const actionTiles=[{label:'ULB action required',value:acts.totalRequired,status:'all_actions_required',tone:'attention'},{label:'IEC action pending',value:actPending,status:'actions_pending',tone:'pending'},{label:'IEC action taken',value:acts.taken,status:'all_actions_taken',tone:'cleaned'}];
      const pageStatus=(status:string)=>status==='si_not_cleaned'?'rejected':status==='actions_pending'?'all_actions_required':status;
      const openList=(status:string,label:string)=>panel?panel.open({title:`${MODULE_LABELS[id]} · ${label}`,subtitle:`${period.range} · ${fmtNum(moduleVisits.length)} inspections in this module`,width:'3xl',body:<ReportListPanel data={{...data,visits:moduleVisits}} filter={status} wards={wardList} zones={zoneOptions} onViewReport={onViewReport} onOpenAll={()=>onInspect(id,pageStatus(status))}/>}):onInspect(id,pageStatus(status));
      return <article key={id} className={`inspection-module-card module-${id}`} data-module={id}>
        <div className="inspection-card-header"><button className="inspection-card-heading" onClick={()=>panel?panel.open({title:MODULE_LABELS[id],subtitle:`${loading?'Updating':period.range} · module details`,width:'3xl',body:<ModuleDetailBody id={id} data={data} baseZone={zone} baseWard={ward} source={source} targetsReady={targetsReady} zoneOptions={zoneOptions} wardOptions={wardList} onInspect={onInspect}/>}):onInspect(id)}><span><Icon size={21}/></span><h3>{MODULE_LABELS[id]}</h3><ArrowUpRight size={15}/></button><CardInfo title={`${MODULE_LABELS[id]} calculations`}><p>{loading?'Updating selected period...':period.range}</p><p data-metric="period-basis">{period.basis}</p><p data-metric="period-credit">{period.progress}</p><p>{period.rule}</p><p>{showBeatReports&&<>Total beat reports counts each submitted beat once per day. A report with 3, 4 or 5 point photos counts as one report.historical point records for the same beat and day are counted together. Status counts below use the same beat reports. </>}Achieved = completed inspections. Coverage = locations inspected out of all registered locations. Repeat visits to the same location are extra; same-day repeats do not add target credit.</p></CardInfo></div>
<div className="inspection-card-primary"><div><span>Total assets</span><strong data-metric="entities">{count(metrics.totalEntities)}</strong></div><div><span>Inspection target<small>{loading?'Updating':period.duration+' total'}</small></span><strong data-metric="target" data-state={delivery.fallback?'full_coverage':delivery.state}>{count(delivery.target)}</strong>{delivery.configuredPercent!=null&&<small>{number(delivery.configuredPercent)}% configured</small>}</div></div>
        <dl className="inspection-card-activity inspection-entity-metrics"><div><dt>Inspections completed</dt><dd data-metric="achieved"><button className="inspection-metric-link" disabled={loading||metrics.achieved==null} onClick={()=>onInspect(id,'inspections_completed')} aria-label={`Open completed ${MODULE_LABELS[id]} inspections`}>{count(metrics.achieved)}</button></dd></div><div><dt>Assets inspected<small>{loading||metrics.coveragePercent==null?'unique assets':`${number(metrics.coveragePercent)}% coverage`}</small></dt><dd data-metric="unique"><button type="button" className="inspection-metric-link" aria-label={`Open ${MODULE_LABELS[id]} coverage`} onClick={()=>onCoverage?onCoverage({module:id,zone:zone||undefined,ward:ward||undefined}):panel?.open({title:`${MODULE_LABELS[id]} coverage`,body:<CoverageDetail data={data} modules={[id]} zones={[]} wards={wardList} scope={{module:id,zone,ward}} onOpen={(scope,status)=>onInspect(scope.module,status)}/>})}>{count(metrics.uniqueEntities)}</button></dd></div><div><dt>Not yet inspected</dt><dd data-metric="not-inspected"><button type="button" className="inspection-metric-link" disabled={loading||notInspected==null||!panel} aria-label={`Open ${MODULE_LABELS[id]} locations not yet inspected`} onClick={()=>panel?.open({title:`${MODULE_LABELS[id]} · not yet inspected`,subtitle:`${fmtNum(notInspected)} registered locations not yet inspected · ${period.range}`,width:'3xl',body:<PendingList data={data} scope={{module:id,zone,ward}} wards={wardList}/>})}>{count(notInspected)}</button></dd></div></dl>
        <div className="inspection-card-achievement"><div><span>Report target progress</span><strong data-metric="achievement" data-met={delivery.met}>{loading?'Updating':delivery.percent==null?'N/A':`${number(delivery.percent)}%`}</strong></div><ProgressMeter visual={visual} className="delivery-meter" percent={delivery.percent} met={delivery.met} variant="scale" label="Report target progress"/></div>
        <div className="inspection-card-status">{queues.map(item=><button disabled={loading||item.value==null} key={item.status} data-tone={item.tone} onClick={()=>openList(item.status,item.label)}><i/><span>{item.label}</span><strong data-metric={item.status}>{loading?'…':number(item.value)}</strong><ArrowUpRight size={12}/></button>)}</div>
        <div className="inspection-card-status inspection-card-actions">{actionTiles.map(item=><button disabled={loading||item.value==null} key={item.status} data-tone={item.tone} onClick={()=>openList(item.status,item.label)}><i/><span>{item.label}</span><strong data-metric={item.status}>{loading?'…':number(item.value)}</strong><ArrowUpRight size={12}/></button>)}</div>
        <div className="module-ai-strip" data-module-ai={id}><span><Sparkles size={13}/>AI analysis</span>{loading?<em>Updating…</em>:ai.analysed+ai.awaiting===0?<em>No inspections in these dates</em>:<><b data-tone="green" title="AI suggested clean">{fmtNum(ai.clean)}<small>clean</small></b><b data-tone="red" title="AI suggested not clean">{fmtNum(ai.notClean)}<small>not clean</small></b>{ai.awaiting>0&&<b title="Awaiting AI analysis">{fmtNum(ai.awaiting)}<small>awaiting</small></b>}{ai.agreement!=null&&<i>Agrees with SI on {fmtPct(ai.agreement)}</i>}</>}</div>
      </article>;
    })}</div>
  </section>;
}
