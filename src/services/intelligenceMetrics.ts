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
