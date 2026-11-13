import type { InspectionCoverage } from './inspectionCoverage';
import { inspectionStatus } from './inspectionStatus';

export interface SiReviewRule {targets:number;percentTargets:number;percents:number[];defaultPercent?:number|null}
export function siReviewPercent(rule:SiReviewRule|null|undefined):number|null {
  if(!rule)return null;
  const percent=!rule.targets?(rule.defaultPercent??10):rule.percentTargets===rule.targets&&rule.percents.length===1?rule.percents[0]:null;
  return typeof percent==='number'&&Number.isFinite(percent)&&percent>=1&&percent<=100?percent:null;
}

/** Date-range sample comparison, separate from persisted officer queues and scoring credit. */
export function siReviewSummary(data:InspectionCoverage,percent:number|null) {
  if(data.failedModules.length)return {received:null,reviewed:null,pending:null,other:null,target:null,days:0};
  const visits=[...new Map(data.visits.map(v=>[v.id,v])).values()].filter(v=>inspectionStatus(v.status||'SUBMITTED')!=='unclassified');
  const daily=new Map<string,number>();let datesComplete=true;
  for(const visit of visits){
    const at=Date.parse(visit.submittedAt||'');
    if(!Number.isFinite(at)){datesComplete=false;continue;}
    const day=new Date(at+330*60000).toISOString().slice(0,10);
    daily.set(day,(daily.get(day)||0)+1);
  }
  const reviewed=visits.filter(v=>['approved','rejected','action_required','action_taken'].includes(inspectionStatus(v.status))).length;
  const pending=visits.filter(v=>inspectionStatus(v.status)==='pending_review').length;
  const target=percent!=null&&datesComplete?[...daily.values()].reduce((n,count)=>n+Math.ceil(count*percent/100),0):null;
  return {received:visits.length,reviewed,pending,other:visits.length-reviewed-pending,target,days:daily.size};
}
