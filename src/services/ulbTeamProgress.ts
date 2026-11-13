import {actionIsPending, actionLifecycle} from './actionLifecycle';
import type {InspectionCoverage} from './inspectionCoverage';
import {inspectionStatus} from './inspectionStatus';
import {siReviewSummary} from './siReviewSummary';

const progress=(completed:number|null,target:number|null)=>({completed,target,percent:completed!=null&&target!=null&&target>0?completed/target*100:null});
/** Selected submission-period workflow progress, distinct from individual timing scores. */
export function ulbTeamProgress(data:InspectionCoverage) {
  const si=siReviewSummary(data,null);
  if(data.failedModules.length)return {si:progress(null,null),iec:progress(null,null)};
  const requests=data.visits.filter(v=>inspectionStatus(v.status||'SUBMITTED')!=='unclassified'&&actionLifecycle(v).required);
  const completed=requests.filter(v=>!actionIsPending(v)).length;
  return {si:progress(si.reviewed,si.received),iec:progress(completed,requests.length)};
}
