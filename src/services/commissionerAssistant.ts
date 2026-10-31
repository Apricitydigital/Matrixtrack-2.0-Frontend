import { COMMISSIONER_TERMS as terms } from './commissionerTerms';
import { api } from './api';
import { summarizeZones, applyPerformanceTargets, type CityPulse } from './commissioner';
import { computeUnitTotals } from './plantAnalytics';
import { normalizeDashboardPayload } from './plantAnalytics';
import { coverageCounts, emptyCoverage, loadInspectionCoverage, zoneCoverage, type InspectionCoverage } from './inspectionCoverage';
import { MODULE_LABELS } from './presentation';
import { targetDelivery } from './targetDelivery';
import { normalizeInsightQuestion, resolveInsightScope } from './insightQuestion';
import type { City, User, Ward, Zone, OperationalModuleId } from '../types';

export interface InsightContext {city:City;from:string;to:string;zones:Zone[];wards:Ward[];coverage:InspectionCoverage;pulse:CityPulse;}
export interface InsightAnswer {text:string;source:string;page?:string;label?:string;}
const number=(n:number|null|undefined)=>n==null?'unavailable':n.toLocaleString('en-IN',{maximumFractionDigits:1});
export function insightModule(question:string):OperationalModuleId|undefined {
  const q=normalizeInsightQuestion(question);
  return (Object.entries({sweeping:/sweep|beat/,toilets:/toilet/,litter_bins:/litter|\bbins?\b/,nala:/nala|drain/,ctu_gvp:/ctu|gvp/}) as [OperationalModuleId,RegExp][]).find(([,pattern])=>pattern.test(q))?.[0];
}

/** Fixed GET-only readers. Questions never become URLs, SQL, commands or API arguments. */
export async function loadInsightContext(user:Pick<User,'role'|'cityId'>,city:City,zones:Zone[],wards:Ward[],from:string,to:string,signal:AbortSignal,question?:string):Promise<InsightContext> {
  if(user.role!=='COMMISSIONER'||user.cityId!==city.id)throw new Error('Nagar Insight is available only for the Commissioner’s assigned city.');
  const range=new URLSearchParams({from,to});
  const topic=question?insightTopic(question):'all';
  const needed=topic==='target'?['official','performance']:topic==='inspection'?[]:topic==='zone'?['official','performance','rankings']:topic==='ward'?['rankings']:topic==='attendance'?['attendance']:topic==='plant'?['plants']:topic==='priority'?['official','iec']:['official','performance','rankings','attendance','plants','iec'];
  const needsCoverage=['all','target','inspection','zone'].includes(topic);
  const requestedModule=question?insightModule(question):undefined;
  const coverageCity=requestedModule&&city.enabledModules.includes(requestedModule)?{...city,enabledModules:[requestedModule]}:city;
  const cityWards=wards.filter(w=>w.cityId===city.id),cityZones=zones.filter(z=>z.cityId===city.id);
  const requested=resolveInsightScope(question||'',cityZones,cityWards);
  if(requested.issue)throw Object.assign(Error(requested.issue),{name:'InsightScopeError'});
  const requestedWard=requested.ward;
  const requestedZone=requested.zones.length===1?requested.zones[0]:requestedWard?cityZones.find(z=>z.id===requestedWard.zoneId):undefined;
  const selectedZones=cityZones.filter(z=>requested.zones.length?requested.zones.some(selected=>selected.id===z.id):!requestedZone||z.id===requestedZone.id);
  const queries=[
    ['official',async()=>{return summarizeZones(await api(`/city/dashboard/zone-export?${new URLSearchParams({from,to,zoneIds:selectedZones.map(z=>z.id).join(','),...(requestedWard?{wardIds:requestedWard.id}:{})})}`,{signal}));}],
    ['rankings',()=>api(`/ward-ranking?${range}`,{signal}).then(d=>d.rankings || [])],
    ['attendance',()=>api(`/city/attendance/dashboard?${range}${requestedZone?`&zoneId=${encodeURIComponent(requestedZone.id)}`:''}${requestedWard?`&wardId=${encodeURIComponent(requestedWard.id)}`:''}&page=1&pageSize=1`,{signal}).then(d=>d.summary || null)],
    ['plants',()=>api(`/modules/processing-plant/dashboard?${range}`,{signal}).then(normalizeDashboardPayload)],
    ['iec',()=>api(`/cleanliness-issues/commissioner/summary?${range}${requestedZone?`&zoneId=${encodeURIComponent(requestedZone.id)}`:''}${requestedWard?`&wardId=${encodeURIComponent(requestedWard.id)}`:''}`,{signal}).then(d=>d.kpis || null)],
    ['performance',()=>api(`/city/users/daroga-performance?${new URLSearchParams({startDate:new Date(`${from}T00:00:00+05:30`).toISOString(),endDate:new Date(`${to}T23:59:59.999+05:30`).toISOString(),tzOffset:'-330'})}`,{signal}).then(d=>({SUPERVISOR:d.users||{}}))],
  ].filter(([key])=>needed.includes(key as string)) as [string,()=>Promise<any>][];
  // Attach rejection handling immediately, including when another summary is slow.
  const coverageJob=(needsCoverage?loadInspectionCoverage(coverageCity,from,to,signal):Promise.resolve(emptyCoverage())).catch(error=>{if(signal.aborted)return null;return {...emptyCoverage(),failedModules:coverageCity.enabledModules,errors:['Coverage unavailable.']};});
  const results=await Promise.allSettled(queries.map(([,read])=>read()));
  const pulse:CityPulse={pending:0,errors:{}};
  results.forEach((result,i)=>{const key=queries[i][0];if(result.status==='fulfilled')(pulse as any)[key]=result.value;else pulse.errors[key]='This summary is unavailable.';});
  if(pulse.official&&pulse.performance?.SUPERVISOR)pulse.official=applyPerformanceTargets(pulse.official,pulse.performance.SUPERVISOR,requestedWard?.id);
  const coverage=await coverageJob;
  signal.throwIfAborted();return {city,from,to,zones:zones.filter(z=>z.cityId===city.id),wards:wards.filter(w=>w.cityId===city.id),coverage:coverage!,pulse};
}

const refused:InsightAnswer={text:'I would be happy to help with your city operations. Please ask about inspections, targets, wards, attendance, plants or pending work.',source:'Nagar Insight'};
const mutation:InsightAnswer={text:'Please use the relevant operational page to make this change. I can help explain the figures or the next steps.',source:'Nagar Insight'};
export function insightTopic(question:string):string {
 const q=normalizeInsightQuestion(question);
 if(/\b(targets?|achievement|achieving|meeting|shortfall|delivery|assigned)\b/.test(q))return 'target';
 if(/\b(pending|review|backlog|action|priority|cleanliness|iec|grievance|overdue|cleaned)\b/.test(q))return 'priority';
 if(/\b(attendance|present|absent|workforce|employee|staff)\b/.test(q))return 'attendance';
 if(/\b(plant|processing|recovery|recovered|waste|received|material)\b/.test(q))return 'plant';
 if(/\b(zones|zone performance|compare zones|best zone|worst zone)\b/.test(q))return 'zone';
 if(/\b(unique|repeat|coverage|cover|locations?|inspections?|visited|visits|reach|sweeping|sweep|beat|toilets?|litter|bins?|nala|drain|ctu|gvp)\b/.test(q))return 'inspection';
 if(/\bzone\b/.test(q)&&!/\bwards?\b/.test(q))return 'zone';
 if(/\b(wards?|ranking|rank|score)\b/.test(q))return 'ward';
 if(/\bzone\b/.test(q))return 'zone';
 return 'help';
}
export function instantInsight(question:string):InsightAnswer|null {
 const q=normalizeInsightQuestion(question);
 if(/\b(ignore|override|bypass|system prompt|api key|password|token|sql|database access)\b/.test(q))return {text:'Please ask about the city information you would like to review, such as inspections, coverage or ward performance.',source:'Nagar Insight'};
 if(/^(?:(?:please|can you|could you)\s+)?(?:set|delete|remove|insert|update|modify|change|edit|approve|reject|assign|reassign|upload|create|send|execute|mark|restore|reopen)\b/.test(q))return mutation;
 if(/^(hi|hello|hey|namaste)[!.\s]*$/.test(q))return {text:'Hello. How can I help you review your city today?',source:'Nagar Insight'};
 if(/\b(weather|cricket|movie|recipe|stock|bitcoin|politics|election|joke|poem|code|javascript|python|travel|news)\b/.test(q))return refused;
 if(/\b(performance|score|ranking)\b/.test(q)&&/\b(employee|staff|daroga|sanitary inspector|si|iec member)\b/.test(q)&&!/\b(zone|ward|target|attendance)\b/.test(q))return {text:'For individual employee performance, please open User Performance to see the officer’s score and breakdown. I can also help with zone performance, ward scores, target achievement or attendance.',source:'Nagar Insight',page:'comm_user_perf',label:'Open User Performance'};
 if(insightTopic(q)==='help'&&/\b(performance|progress|statistics|summary)\b/.test(q))return {text:'Which figures would you like to review? You can ask about Zone 1 performance, a ward score, inspections, target achievement or attendance.',source:'Nagar Insight'};
 if(insightTopic(q)==='help')return refused;
 return null;
}


export function answerInsight(question:string,context:InsightContext):InsightAnswer {
  const q=normalizeInsightQuestion(question),topic=insightTopic(question);
  const instant=instantInsight(question);if(instant)return instant;
  const module=insightModule(question);
  if(module&&context.city.enabledModules&&!context.city.enabledModules.includes(module))return {text:'This module is not enabled for your city. Please choose an enabled module to review its figures.',source:'Nagar Insight'};
  const requested=resolveInsightScope(q,context.zones,context.wards);
  if(requested.issue)return {text:requested.issue,source:'Nagar Insight'};
  const zone=requested.zones.length===1?requested.zones[0]:undefined,ward=requested.ward;
  const selectedIds=new Set(requested.zones.map(z=>z.id));
  const unknownModules=requested.zones.length>1?context.coverage.visits.filter(v=>!v.zoneId).map(v=>v.module):[];
  const scopedCoverage=requested.zones.length>1?{...context.coverage,assets:context.coverage.assets.filter(a=>selectedIds.has(a.zoneId)),visits:context.coverage.visits.filter(v=>!v.zoneId||selectedIds.has(v.zoneId)),failedModules:[...new Set([...context.coverage.failedModules,...unknownModules])]}:context.coverage;
  const counts=coverageCounts(scopedCoverage,{module,zone:zone?.id,ward:ward?.id});
  const scope=[module?MODULE_LABELS[module]:requested.zones.length||ward?'':'City-wide',requested.zones.map(z=>z.name).join(' & '),ward?.name].filter(Boolean).join(' · ');
  const period=`${context.from} to ${context.to}`;
  if(topic==='target'){
    const selectedZone=zone?.id||context.wards.find(w=>w.id===ward?.id)?.zoneId;
    const official=context.pulse.official;
    const scoped=official&&context.pulse.performance?.SUPERVISOR?applyPerformanceTargets({...official,zones:official.zones.filter(z=>!selectedZone||z.id===selectedZone)},context.pulse.performance.SUPERVISOR,ward?.id):undefined;
    const figures=ward||zone&&module?module?scoped?.modules[module]:scoped?.totals:zone?official?.zones?.find(z=>z.id===zone.id)?.totals:module?official?.modules[module]:official?.totals;
    const delivery=targetDelivery(figures,counts);
    return {text:`${scope} · ${period}\n\n${terms.totalRequired} (full location coverage): ${number(counts.total)}\n${terms.target}: ${delivery.available?number(delivery.target):delivery.stateLabel}${delivery.available&&delivery.configuredPercent!=null?` (${number(delivery.configuredPercent)}% configured target)`:''}\n${terms.credited}: ${number(delivery.completed)}\nTarget achievement: ${delivery.available&&delivery.percent!=null?number(delivery.percent)+'%':'unavailable'}\n${terms.pending}: ${delivery.available?number(delivery.remaining):'not applicable'}${delivery.available&&delivery.met?' — target achieved':''}\n${delivery.fallback?'\nTarget uses total inspections required because no configured target is available.\n':''}\nInspections done: ${number(counts.inspections)}\n${terms.unique}: ${number(counts.unique)} / ${number(counts.total)} registered locations\n${terms.coverage}: ${counts.percent==null?'unavailable':number(counts.percent)+'%'}\n\nA configured 5% or 10% target can be fully achieved without inspecting every registered location. Target credit follows employee assignments, inspection completeness and daily or period limits; it can differ from the number of inspection records. Location coverage is separate.${(ward||zone&&module)&&!scoped?' A configured target breakdown for this scope is unavailable; full coverage is used.':''}`,source:'Target configuration check, backend summary and location coverage',page:'comm_dashboard',label:'Open City Overview'};
  }
  if(topic==='inspection'){
    const rule=/\b(meaning|difference|explain|count|calculated|target)\b/.test(q)?'A unique location is counted once over the entire selected period. Every additional inspection there is a repeat inspection. Three visits to one location = one unique location + two repeats. Assigned targets measure expected workload; they are not the number of registered locations.\n\n':'';
    return {text:`${rule}${scope} · ${period}\n\n${terms.totalRequired} (full location coverage): ${number(counts.total)}\nInspections done: ${number(counts.inspections)}\n${terms.unique}: ${number(counts.unique)}\n${terms.repeated}: ${number(counts.repeats)}\nLocations with repeat visits: ${number(counts.repeatedLocations)}\nRegistered locations not visited: ${number(counts.remaining)}\nRegistered-location coverage: ${counts.percent==null?'unavailable':`${number(counts.percent)}%`}\n\n${counts.unidentified?'Some reports have no location ID, so exact unique/repeat counts cannot be verified. ':''}${context.coverage.errors.length?'Some source data is unavailable. Missing figures are not zero. ':''}Location coverage measures reach. Unvisited locations are not automatically a target shortfall.`,source:'Location register + period inspection reports',page:'comm_dashboard',label:'Open City Overview'};
  }
  if(topic==='zone'){
    const coverage=module?{...context.coverage,assets:context.coverage.assets.filter(a=>a.module===module),visits:context.coverage.visits.filter(v=>v.module===module),failedModules:context.coverage.failedModules.filter(id=>id===module)}:context.coverage;
    const rows=zoneCoverage(coverage,context.zones.filter(z=>!requested.zones.length||requested.zones.some(selected=>selected.id===z.id)),context.pulse.rankings||[]).sort((a,b)=>(b.percent??-1)-(a.percent??-1));
    const summaries=rows.map(row=>{
      const official=context.pulse.official,source=official?.zones?.find(z=>z.id===row.id);
      const scoped=official&&context.pulse.performance?.SUPERVISOR?applyPerformanceTargets({...official,zones:source?[source]:[]},context.pulse.performance.SUPERVISOR):undefined;
      const figures=module?scoped?.modules[module]:source?.totals,target=targetDelivery(figures,row);
      return `${row.name}${module?' / '+MODULE_LABELS[module]:''}\n${terms.done}: ${number(row.inspections)}\n${terms.target}: ${number(target.target)}\n${terms.credited}: ${number(target.completed)}\n${terms.achievement}: ${target.percent==null?'unavailable':number(target.percent)+'%'}\n${terms.coverage}: ${row.percent==null?'unavailable':number(row.percent)+'%'} (${number(row.unique)} / ${number(row.total)} unique locations)\n${terms.repeated}: ${number(row.repeats)}\n${terms.pendingReview}: ${number(figures?.siPending)}\n${terms.actionRequired}: ${number(figures?.actionRequired)}\nAverage assessed ward score: ${row.wardAverage==null?'unavailable':number(row.wardAverage)+'/100'} (${row.assessed} wards)`;
    });
    return {text:`Zone performance / ${period}\n\n${summaries.join('\n\n')||'No zones are available for this selection.'}\n\nWithout a configured target, Target uses total inspections required. Ward averages include assessed wards only.`,source:'Zone summaries, inspection history and assessed ward scores',page:'comm_zone_ward',label:'Open Zone Details'};
  }
  if(topic==='ward'){
    const rows=(context.pulse.rankings||[]).filter(r=>(!ward||r.wardId===ward.id)&&(!requested.zones.length||requested.zones.some(z=>z.id===r.zoneId))&&r.rankable!==false&&typeof r.finalScore==='number').sort((a,b)=>(a.cityRank??Infinity)-(b.cityRank??Infinity));
    return {text:`${scope} ward performance · ${period}\n\n${rows.slice(0,5).map(r=>`${r.wardName}: ${number(r.finalScore)}/100; city rank ${number(r.cityRank)}${r.zoneName?'; '+r.zoneName:''}.`).join('\n')||'No assessed ward scores are available for this selection.'}\n\nThe ward score combines applicable components and is normalized to 100. Non-applicable components are excluded. Open Ward Ranking for the official breakdown and evidence.`,source:'Official ward-ranking summary',page:'comm_ward_ranking',label:'Open Ward Ranking'};
  }
  if(topic==='attendance'){
    const a=context.pulse.attendance;return {text:`${scope} attendance · ${period}\n\nPresent: ${number(a?.present)}\nAbsent: ${number(a?.absent)}\nAttendance rate: ${a?.attendanceRate==null?'unavailable':number(a.attendanceRate)+'%'}\n\nThese are the server’s period aggregates. They may count attendance records across multiple days; they do not establish the number of unique employees.`,source:'Attendance dashboard summary',page:'comm_attendance',label:'Open Attendance'};
  }
  if(topic==='plant'){
    const p=context.pulse.plants;const totals=p?computeUnitTotals(p.plantPerformance):[];
    return {text:`Plant & Processing · ${period}\n\nPlants reporting: ${number(p?.reportingPlants)} / ${number(p?.totalPlants)}\n${totals.map(t=>`${t.unit}: received ${number(t.received)}, material recovered ${number(t.recovered)}. Recovery ${t.hasEfficiency?number(t.efficiency)+'%':'not comparable'}.`).join('\n')||'Plant quantities are unavailable.'}\n\nDifferent unit families are kept separate. Recovery depends on comparable input and output quantities.`,source:'Processing-plant period dashboard',page:'comm_plant',label:'Open Plant & Processing'};
  }
  if(topic==='priority'){
    const t=module?context.pulse.official?.modules[module]:context.pulse.official?.totals,i=context.pulse.iec;return {text:`${scope} priority desk · ${period}\n\n${terms.pendingReview}: ${number(t?.siPending)}\n${terms.actionRequired}: ${number(t?.actionRequired)}\n${terms.actionTaken}: ${number(t?.actionTaken)}\n${terms.cleaned}: ${number(t?.cleaned)}\n${terms.notCleaned}: ${number(t?.notCleaned)}\nOpen IEC issues: ${number(i?.openIssues)}\nOverdue IEC inspections: ${number(i?.overdueInspections)}\n\nPending review and corrective action are separate workflow stages.`,source:'Official inspection totals + IEC summary',page:'comm_inspection_perf',label:'Open Inspection Performance'};
  }
  if(/\b(matrixtrack|help|can you|what can|how to|read.only|database)\b/.test(q))return {text:'Ask me about your city’s target achievement, inspections, unique coverage, zone performance, ward scores, attendance, plants or pending work. Answers follow the selected review dates and identify their source. To review another period, use the page’s date controls.',source:'MatrixTrack 2.0 help'};
  return refused;
}
