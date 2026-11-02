import type { OperationalReport, User } from '../types';
export const canViewUlbAi=(role:User['role'])=>['ULB_OFFICER','COMMISSIONER','CITY_ADMIN','HMS_SUPER_ADMIN'].includes(role);
export function ulbAiAvailability(report:OperationalReport) {
  if(report.moduleId==='litter_bins'&&report.backendType!=='CITIZEN_REPORT')return {eligible:false,title:'ULB AI is not available for this record type',detail:'ULB recommendations apply to litter-bin inspection reports, not registration records.'};
  const savedDecision=String(report.qcDecision||'').trim().toUpperCase();
  const decision=['APPROVED','REJECTED'].includes(savedDecision)?savedDecision:String(report.status).trim().toUpperCase();
  if(!['APPROVED','REJECTED'].includes(decision))return {eligible:false,title:'Waiting for SI review',detail:'The SI must record an approval or rejection before ULB AI can recommend operational follow-up. Pending review alone does not trigger a ULB recommendation.'};
  return {eligible:true,title:'ULB recommendation not generated yet',detail:'The SI decision is recorded. The assigned ULB Officer can request a recommendation from this report. Commissioner access displays saved recommendations; it does not generate or submit decisions.'};
}
