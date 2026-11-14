import { intelligenceSuggestion } from './intelligenceSuggestion';
import { inspectionStatus } from './inspectionStatus';
export const INTELLIGENCE_LABELS: Record<string,string> = {
  CLEAN: 'Intelligence suggested clean', NOT_CLEAN: 'Intelligence suggested not cleaned',
  UNASSESSABLE: 'Intelligence unable to assess', AWAITING_AI: 'Awaiting intelligence analysis',
};
export const intelligenceFilter = (outcome:string) => 'intelligence_' + outcome.toLowerCase();
export function awaitingSi(record:any) {
  return !!record && !record.qcDecision && inspectionStatus(record.workspaceStatus || record.status || '') === 'pending_review';
}
export function matchesIntelligence(record:any,filter:string) {
  return awaitingSi(record) && intelligenceFilter(intelligenceSuggestion(record).outcome) === filter;
}
export function intelligenceCounts(records:any[]) {
  const counts = {CLEAN:0,NOT_CLEAN:0,UNASSESSABLE:0,AWAITING_AI:0};
  for(const record of records) if(awaitingSi(record)) counts[intelligenceSuggestion(record).outcome]++;
  return counts;
}

/** AI suggestion counts for reports still awaiting SI review, within a zone/ward scope. Null while inspections are unknown. */
export function scopedIntelligence(data:{visits:any[]},scope:{zone?:string;ward?:string}={},known=true) {
  if(!known) return null;
  const seen=new Map(data.visits.filter(v=>(!scope.zone||v.zoneId===scope.zone)&&(!scope.ward||v.wardId===scope.ward)).map(v=>[v.id,v]));
  const c=intelligenceCounts([...seen.values()].map(v=>({...v.raw,status:v.raw?.workspaceStatus||v.status})));
  return {clean:c.CLEAN,notClean:c.NOT_CLEAN,other:c.UNASSESSABLE+c.AWAITING_AI};
}
