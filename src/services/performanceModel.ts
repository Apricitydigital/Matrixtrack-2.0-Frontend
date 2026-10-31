const finite=(n:any):n is number=>typeof n==='number'&&Number.isFinite(n);
const ratio=(n:any,d:any,cap=false)=>finite(n)&&finite(d)&&d>0?(cap?Math.min(100,n/d*100):n/d*100):null;
export type PerformanceBasis='target'|'on_time'|'review_coverage'|'resolution_coverage'|'reported';
// Preserve official scores; explain their basis using matching counts rather than unrelated ratios.
export function performanceForRole(data:any,role:string,module='ALL'):any{
  if(!data)return undefined;
  let result={...data};
  if(module!=='ALL'){
    // These diagnostics describe the whole officer scope; the API does not split them by module.
    result.avgTurnaroundHours=undefined;result.avgResolutionHours=undefined;result.oldestPendingDays=undefined;result.backlogAging=undefined;result.estimated=undefined;
    result.daily=(data.daily || []).map((day:any)=>{const m=day.modules?.[module];return {...day,...(role==='SUPERVISOR'?{target:m?.target ?? 0,credit:m?.credit ?? 0}:{arrived:m?.arrived ?? 0,onTime:m?.onTime ?? 0,late:m?.late ?? 0,overdue:m?.overdue ?? 0,inProgress:m?.inProgress ?? 0}),modules:m?{[module]:{...m}}:{}};});
    result.rows=(data.rows || []).filter((r:any)=>r.module===module);result.periods=(data.periods || []).filter((r:any)=>r.module===module);
    if(role==='SUPERVISOR'){const m=data.modules?.[module] || {required:data.days===null?null:0,completed:0};result={...result,required:m.required,completed:m.completed,performance:ratio(m.completed,m.required,true)};}
    else if(data.moduleStats){const m=data.moduleStats[module] || {onTime:0,late:0,overdue:0,inProgress:0,backlogOverdue:0},due=m.onTime+m.late+m.overdue;result={...result,backlogOverdue:undefined,inProgress:undefined,...m,due,performance:ratio(m.onTime,due)};}
    else{result.modules=data.modules?.[module]?{[module]:data.modules[module]}:{};delete result.performance;delete result.due;delete result.onTime;delete result.late;delete result.overdue;delete result.inProgress;delete result.backlogOverdue;}
  }
  if(role==='SUPERVISOR')return {...result,scoreBasis:'target',scoreNumerator:result.completed,scoreDenominator:result.required,performance:result.performance!==undefined?result.performance:ratio(result.completed,result.required,true)};
  if(finite(result.due)&&finite(result.onTime))return {...result,scoreBasis:'on_time',scoreNumerator:result.onTime,scoreDenominator:result.due,performance:result.performance!==undefined?result.performance:ratio(result.onTime,result.due)};
  if(result.performance!==undefined)return {...result,scoreBasis:'reported'};
  const buckets=Object.values(result.modules || {}) as any[];
  if(!buckets.length)return {...result,scoreBasis:'reported',performance:null};
  if(role==='QC'){const n=buckets.reduce((n,b)=>n+(b.cleaned?.length || 0)+(b.notCleaned?.length || 0),0),pending=buckets.reduce((n,b)=>n+(b.pendingReview?.length || 0),0);return {...result,scoreBasis:'review_coverage',scoreNumerator:n,scoreDenominator:n+pending,performance:ratio(n,n+pending)};}
  const n=buckets.reduce((n,b)=>n+(b.resolved?.length || 0),0),d=buckets.reduce((n,b)=>n+(b.attentionRequired?.length || 0),0);return {...result,scoreBasis:'resolution_coverage',scoreNumerator:n,scoreDenominator:d,performance:ratio(n,d)};
}
export function performanceBasis(stat:any,role:string){
  const basis:PerformanceBasis=stat?.scoreBasis || (role==='SUPERVISOR'?'target':finite(stat?.due)&&finite(stat?.onTime)?'on_time':'reported');
  const numerator=stat?.scoreNumerator ?? (role==='SUPERVISOR'?stat?.completed:stat?.onTime),denominator=stat?.scoreDenominator ?? (role==='SUPERVISOR'?stat?.required:stat?.due);
  const labels={target:{title:'Inspection target achievement',numerator:'Credited inspections',denominator:'Assigned inspection target',rule:'Credited inspections ÷ assigned target × 100. Score is capped at 100%.'},on_time:{title:role==='QC'?'On-time review rate':'On-time resolution rate',numerator:role==='QC'?'Reviews completed on time':'Actions completed on time',denominator:'On-time + late + overdue',rule:'On-time work ÷ (on-time + late + overdue) × 100. Work still within its deadline is excluded.'},review_coverage:{title:'Review coverage',numerator:'Completed SI reviews',denominator:'Reviewed + pending reports',rule:'Reviewed reports ÷ (reviewed + pending review) × 100. Timing counts were not supplied for this response.'},resolution_coverage:{title:'Resolution coverage',numerator:'Resolved reports',denominator:'Reports requiring action',rule:'Resolved reports ÷ reports requiring action × 100. This is coverage, not an on-time score.'},reported:{title:'Reported officer score',numerator:'Numerator not supplied',denominator:'Denominator not supplied',rule:'The source returned a score without matching calculation counts. Detailed calculation cannot be verified from this response.'}}[basis];
  const calculated=ratio(numerator,denominator,basis==='target'),mismatch=finite(calculated)&&finite(stat?.performance)&&Math.abs(calculated-stat.performance)>.2;
  return {...labels,basis,numerator:finite(numerator)?numerator:null,denominator:finite(denominator)?denominator:null,calculated,mismatch,unassessedReason:!stat?'No performance record returned for this officer.':!finite(stat.performance)?denominator===0?(basis==='target'?'No assigned target in this selection.':'No eligible work has reached the scoring stage.'):'A score was not supplied for this selection.':''};
}
export function durationHours(hours:any){if(!finite(hours))return 'Not recorded';const minutes=Math.round(hours*60),days=Math.floor(minutes/1440),h=Math.floor(minutes%1440/60),m=minutes%60;return [days?`${days}d`:'',h?`${h}h`:'',m?`${m}m`:''].filter(Boolean).join(' ') || '0m';}
