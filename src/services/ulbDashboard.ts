import type {InspectionCoverage,InspectionVisit} from './inspectionCoverage';
import {coverageCounts} from './inspectionCoverage';
export type UlbDrill='all'|'approved'|'rejected'|'pending_review'|'action_required'|'action_pending'|'action_taken'|'repeats'|'not_inspected';
export interface UlbScope {zone?:string;ward?:string}
export const ulbDrillLabels:Record<UlbDrill,string>={all:'Inspection reports',approved:'Approved reports',rejected:'Rejected reports',pending_review:'Pending Sanitary Inspector review',action_required:'Action required',action_pending:'Corrective work pending',action_taken:'Action taken awaiting verification',repeats:'Repeat inspections',not_inspected:'Locations not inspected'};
export function ulbActionWasRequired(visit:InspectionVisit){return visit.actionRequired===true||['action_required','action_taken'].includes(ulbVisitStatus(visit));}
export function inspectionDateTime(value?:string){const time=value?Date.parse(value):NaN;return Number.isFinite(time)?new Date(time).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Not recorded';}
export function ulbVisitStatus(visit:InspectionVisit){const s=String(visit.status||'').toLowerCase();return ['approved','rejected','action_required','action_taken','escalated'].includes(s)?s:'pending_review';}
export function ulbScopeData(data:InspectionCoverage,scope:UlbScope={}){
  const matches=(r:{zoneId:string;wardId:string})=>(!scope.zone||r.zoneId===scope.zone)&&(!scope.ward||r.wardId===scope.ward);
  const visits=data.visits.filter(matches),assets=data.assets.filter(matches),counts=coverageCounts(data,scope);
  const known=counts.inspections!=null;
  const statusCount=(status:string)=>known?visits.filter(v=>ulbVisitStatus(v)===status).length:null;
  const seen=new Set<string>(),repeatIds=new Set<string>();
  // Keep the first recorded visit for each module/location; every later visit is a repeat.
  for(const v of [...visits].sort((a,b)=>(a.submittedAt||'').localeCompare(b.submittedAt||'')||a.id.localeCompare(b.id))){if(!v.assetId)continue;const key=`${v.module}:${v.assetId}`;if(seen.has(key))repeatIds.add(v.id);else seen.add(key);}
  const notInspected=assets.filter(a=>!seen.has(`${a.module}:${a.id}`));
  const actionRequiredTotal=known?visits.filter(ulbActionWasRequired).length:null;
  return {visits,assets,counts,repeatIds,notInspected,statusCount,actionRequiredTotal};
}
export function ulbDrillVisits(data:ReturnType<typeof ulbScopeData>,kind:UlbDrill){
  if(kind==='not_inspected')return [];
  if(kind==='all')return data.visits;
  if(kind==='repeats')return data.visits.filter(v=>data.repeatIds.has(v.id));
  if(kind==='action_required')return data.visits.filter(ulbActionWasRequired);
  if(kind==='action_pending')return data.visits.filter(v=>ulbVisitStatus(v)==='action_required');
  return data.visits.filter(v=>ulbVisitStatus(v)===kind);
}
