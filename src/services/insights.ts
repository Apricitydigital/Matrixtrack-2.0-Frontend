export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const amount = (value: unknown, digits = 1) => finite(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: digits }) : '—';
export const componentLabels: Record<string,string> = { workforce:'Workforce attendance',beat:'Sweeping',nala:'Nala',toilet:'Cleanliness of Toilet',litterBin:'Litter Bins',gvp:'CTU/GVP Transformation',supervisor:'Daroga',qc:'Sanitary Inspector',actionOfficer:'IEC Member' };
export const factorLabels: Record<string,string> = {deployment:'Employee deployment',shiftCompliance:'Shift compliance',supervisorAvailability:'Daroga availability',unmannedBeatControl:'Manned sweeping beats',inspectionCoverage:'Inspection coverage',qcApproval:'Review approval',completeBeatCoverage:'Complete beat coverage',completePointCoverage:'Complete photo coverage',compliance:'Compliance',quality:'Evidence quality',eliminationProgress:'Transformation progress',submissionCoverage:'Report submission coverage',timeliness:'Submission timeliness',completeness:'Report completeness',reviewCoverage:'Review coverage',acknowledgement:'Task acknowledgement',onTimeCompletion:'On-time completion',closureEvidence:'Closure evidence',firstTimeClosureAcceptance:'First review acceptance',overdueReopenedControl:'Overdue / reopened control',actionCompletion:'Action completion'};
export const humanLabel = (key:string) => factorLabels[key] || componentLabels[key] || key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
export function wardExplanation(row:any) {
  const components=Object.entries(row?.components || {}).map(([key,c]:[string,any])=>({key,label:componentLabels[key] || humanLabel(key),...c}));
  const applicable=components.filter(c=>c.applicable!==false&&finite(c.score)&&finite(c.maxScore)&&c.maxScore>0);
  const denominator=finite(row?.applicableWeight)?row.applicableWeight:applicable.reduce((n,c)=>n+c.maxScore,0);
  const earned=applicable.reduce((n,c)=>n+c.score,0);
  const ranked=row?.rankable!==false&&denominator>0&&finite(row?.finalScore);
  const gaps=applicable.map(c=>({...c,gap:Math.max(0,c.maxScore-c.score),normalizedGap:denominator>0?Math.max(0,c.maxScore-c.score)/denominator*100:0,percentage:c.score/c.maxScore*100})).sort((a,b)=>b.gap-a.gap);
  return {components,applicable,denominator,earned,ranked,gaps,excluded:components.filter(c=>c.applicable===false),calculated:ranked?earned/denominator*100:null};
}
export function officerSummary(rows:{user:any;stat:any}[],role:string) {
  const assessed=rows.filter(r=>finite(r.stat?.performance));
  const mean=assessed.length?assessed.reduce((n,r)=>n+r.stat.performance,0)/assessed.length:null;
  const first=role==='SUPERVISOR'?'required':'due',second=role==='SUPERVISOR'?'completed':'onTime';
  const denominator=(s:any)=>s?.scoreDenominator ?? s?.[first],numerator=(s:any)=>s?.scoreNumerator ?? s?.[second];
  const workload=rows.filter(r=>finite(denominator(r.stat))&&finite(numerator(r.stat)));
  const required=workload.length?workload.reduce((n,r)=>n+denominator(r.stat),0):null;
  const completed=workload.length?workload.reduce((n,r)=>n+numerator(r.stat),0):null;
  const sum=(key:string)=>{const known=rows.filter(r=>finite(r.stat?.[key]));return known.length?known.reduce((n,r)=>n+r.stat[key],0):null;};
  const buckets=[{id:'zero',label:'0%',min:0,max:0},{id:'low',label:'Above 0–49%',min:0,max:50},{id:'middle',label:'50–79%',min:50,max:80},{id:'high',label:'80–99%',min:80,max:100},{id:'complete',label:'100%+',min:100,max:Infinity}].map(b=>({...b,value:assessed.filter(r=>b.id==='zero'?r.stat.performance===0:b.id==='low'?r.stat.performance>0&&r.stat.performance<50:r.stat.performance>=b.min&&r.stat.performance<b.max).length}));
  return {assessed,mean,required,completed,weighted:required!=null&&required>0&&completed!=null?Math.min(100,completed/required*100):null,pending:required!=null&&completed!=null?Math.max(0,required-completed):null,late:sum('late'),overdue:sum('overdue'),buckets,unassessed:rows.length-assessed.length};
}
