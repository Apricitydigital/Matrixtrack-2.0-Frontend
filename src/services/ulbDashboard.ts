import { actionLifecycle } from './actionLifecycle';
import type {InspectionCoverage,InspectionVisit} from './inspectionCoverage';
import {coverageCounts,inspectionStatus} from './inspectionCoverage';
export type UlbDrill='all'|'inspections_completed'|'approved'|'rejected'|'pending_review'|'action_required'|'action_pending'|'action_taken'|'repeats'|'not_inspected'|'unclassified'|'escalated';
export interface UlbScope {zone?:string;ward?:string;zoneIds?:string[];wardIds?:string[]}
export function matchesUlbScope(row:{zoneId:string;wardId:string},scope:UlbScope={}) {
  return (!scope.zone||row.zoneId===scope.zone)&&(!scope.ward||row.wardId===scope.ward)&&(!scope.zoneIds?.length||scope.zoneIds.includes(row.zoneId))&&(!scope.wardIds?.length||scope.wardIds.includes(row.wardId));
}
/** Retain only wards belonging to a selected zone; empty zones means all zones. */
export function ulbSelectedWards(selected:string[],zoneIds:string[],wards:{id:string;zoneId:string}[]) {
  return selected.filter(id=>wards.some(ward=>ward.id===id&&(!zoneIds.length||zoneIds.includes(ward.zoneId))));
}
export const ulbDrillLabels:Record<UlbDrill,string>={all:'Inspection reports',inspections_completed:'Reports received · submitted inspections',unclassified:'Draft reports',escalated:'Escalated reports',approved:'Approved reports',rejected:'Rejected reports',pending_review:'Pending SI review',action_required:'Action required',action_pending:'Action required (pending)',action_taken:'Action taken',repeats:'Repeat inspections',not_inspected:'Locations not inspected'};
export function ulbActionWasRequired(visit:InspectionVisit){return actionLifecycle(visit).required;}
export function inspectionDateTime(value?:string){const time=value?Date.parse(value):NaN;return Number.isFinite(time)?new Date(time).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Not recorded';}
export function ulbVisitStatus(visit:InspectionVisit){return inspectionStatus(visit.status);}
export function ulbScopeData(data:InspectionCoverage,scope:UlbScope={}){
  const matches=(r:{zoneId:string;wardId:string})=>matchesUlbScope(r,scope);
  const visits=data.visits.filter(matches),assets=data.assets.filter(matches),counts=coverageCounts(data,scope);
  const completedVisits=visits.filter(v=>ulbVisitStatus(v)!=='unclassified');
  const completedCounts=coverageCounts({...data,visits:data.visits.filter(v=>ulbVisitStatus(v)!=='unclassified')},scope);
  const known=counts.inspections!=null;
  const statusCount=(status:string)=>known?visits.filter(v=>ulbVisitStatus(v)===status).length:null;
  const seen=new Set<string>(),repeatIds=new Set<string>();
  // Keep the first recorded visit for each module/location; every later visit is a repeat.
  for(const v of [...completedVisits].sort((a,b)=>(a.submittedAt||'').localeCompare(b.submittedAt||'')||a.id.localeCompare(b.id))){if(!v.assetId)continue;const key=`${v.module}:${v.assetId}`;if(seen.has(key))repeatIds.add(v.id);else seen.add(key);}
  const notInspected=assets.filter(a=>!seen.has(`${a.module}:${a.id}`));
  const actionRequiredTotal=known?visits.filter(ulbActionWasRequired).length:null;
  const actionTakenTotal=known?visits.filter(v=>actionLifecycle(v).taken).length:null;
  return {visits,assets,counts,completedCounts,repeatIds,notInspected,statusCount,actionRequiredTotal,actionTakenTotal};
}
export function ulbDrillVisits(data:ReturnType<typeof ulbScopeData>,kind:UlbDrill){
  if(kind==='not_inspected')return [];
  if(kind==='all')return data.visits;
  if(kind==='inspections_completed')return data.visits.filter(v=>ulbVisitStatus(v)!=='unclassified');
  if(kind==='repeats')return data.visits.filter(v=>data.repeatIds.has(v.id));
  if(kind==='action_required')return data.visits.filter(ulbActionWasRequired);
  if(kind==='action_taken')return data.visits.filter(v=>actionLifecycle(v).taken);
  if(kind==='action_pending')return data.visits.filter(v=>ulbVisitStatus(v)==='action_required');
  return data.visits.filter(v=>ulbVisitStatus(v)===kind);
}
