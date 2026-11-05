import { concurrentReads } from './concurrentReads';
import { inspectionOutcomes } from './inspectionCoverage';
import { inspectionMetrics } from './inspectionMetrics';
import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { moduleId, MODULE_KEYS } from './adapters';
import { normalizeDashboardPayload } from './plantAnalytics';
import {matrixStore} from './store';
import {useOperationalRefresh} from './useOperationalRefresh';
import type {InspectionCoverage} from './inspectionCoverage';
import type { OperationalModuleId } from '../types';
import { aggregateTargetState, verifyTargetFigures, type TargetEvidence, type TargetConfiguration } from './targetConfiguration';
export interface BriefingNotice {id:string;title:string;detail:string;count:number;tone:'red'|'yellow';page:string;}
export const INSPECTION_KEYS=['target','completed','pending','cleaned','notCleaned','siPending','actionRequired','actionPending','actionTaken'] as const;
export type InspectionFigures=Record<typeof INSPECTION_KEYS[number],number>&{targetPercent?:number}&TargetEvidence;
const emptyFigures=():InspectionFigures=>({target:0,completed:0,pending:0,cleaned:0,notCleaned:0,siPending:0,actionRequired:0,actionPending:0,actionTaken:0});
export function summarizeZones(data:any) {
  const totals=emptyFigures(),modules:Partial<Record<OperationalModuleId,InspectionFigures>>={};
  const zones:{id:string;name:string;totals:InspectionFigures}[]=[];
  const moduleTargets:Partial<Record<OperationalModuleId,any[]>>={};
  const totalRows:any[]=[];
  for(const zone of data.zones || []){
    const rows=zone.total?[zone.total]:(zone.modules || []);
    totalRows.push(...rows);
    const zoneTotals=emptyFigures();
    for(const row of rows)for(const key of INSPECTION_KEYS)zoneTotals[key]+=Number(row[key]) || 0;
    zoneTotals.targetState=aggregateTargetState(rows);
    zones.push({id:zone.zoneId || zone.id || '',name:zone.zoneName || zone.name || '',totals:zoneTotals});
    for(const row of rows)for(const key of INSPECTION_KEYS)totals[key]+=Number(row[key]) || 0;
    for(const row of zone.modules || []){const id=moduleId(String(row.module || row.key || ''));if(!id)continue;const figures=modules[id] ||= emptyFigures();for(const key of INSPECTION_KEYS)figures[key]+=Number(row[key]) || 0;(moduleTargets[id] ||= []).push(row);}
  }
  // Preserve a configured percentage only when every contributing scope explicitly agrees.
  // Never infer the setting from rounded target count / current inventory.
  for(const [id,rows] of Object.entries(moduleTargets)){
    modules[id].targetState=aggregateTargetState(rows);
    const values=rows.map(row=>row.targetPercent==null||row.targetPercent===''?null:Number(row.targetPercent));
    if(values.length&&values.every(value=>value!=null&&Number.isFinite(value)&&value>=0&&value<=100&&value===values[0]))modules[id].targetPercent=values[0];
  }
  totals.targetState=aggregateTargetState(totalRows);
  return {totals,modules,zones};
}
export function applyTargetConfiguration(official:ReturnType<typeof summarizeZones>,configuration:TargetConfiguration) {
  return {...official,totals:verifyTargetFigures(official.totals,configuration),modules:Object.fromEntries(Object.entries(official.modules).map(([id,value])=>[id,verifyTargetFigures(value,configuration)])),zones:official.zones.map(zone=>({...zone,totals:verifyTargetFigures(zone.totals,configuration)}))};
}
/** The zone export omits source metadata. Daroga rows expose the same target/credit calculation with ADMIN/DEFAULT evidence. */
export function performanceTargetRows(official:ReturnType<typeof summarizeZones>,users:Record<string,any>,wardId:string|string[]='') {
  const wardIds=Array.isArray(wardId)?wardId:wardId?[wardId]:[];
  const rows=Object.values(users||{}).flatMap(user=>Array.isArray(user?.rows)?user.rows:[]).filter(row=>row.wardId&&moduleId(row.module)&&(!wardIds.length||wardIds.includes(row.wardId))&&['ADMIN','DEFAULT'].includes(row.source)&&Number.isFinite(row.target)&&row.target>=0&&Number.isFinite(row.credit)&&row.credit>=0);
  return rows.filter(row=>official.zones.some(zone=>zone.name===row.zoneName));
}
export function unmappedTargetUnits(users:Record<string,any>,zoneNames:string[]) {
  return Object.values(users||{}).flatMap(user=>Array.isArray(user?.rows)?user.rows:[]).filter(row=>!zoneNames.includes(row.zoneName)&&Number.isFinite(row.target)&&row.target>0).reduce((total,row)=>total+row.target,0);
}
export function applyPerformanceTargets(official:ReturnType<typeof summarizeZones>,users:Record<string,any>,wardId:string|string[]='') {
  const selected=performanceTargetRows(official,users,wardId);
  const resolve=(figures:InspectionFigures,scope:any[])=>{
    if(!scope.length)return figures;
    if(!scope.some(row=>row.source==='ADMIN'))return {...figures,targetState:'default' as const};
    const target=scope.reduce((n,row)=>n+row.target,0),completed=scope.reduce((n,row)=>n+row.credit,0);
    const percentages=scope.map(row=>row.source==='ADMIN'?row.targetPercent:null);
    const percentage=percentages.every(value=>typeof value==='number'&&value>=1&&value<=100&&value===percentages[0])?percentages[0]:undefined;
    return {...figures,target,completed,pending:Math.max(0,target-completed),targetState:'configured' as const,targetPercent:percentage};
  };
  return {...official,totals:resolve(official.totals,selected),modules:Object.fromEntries(Object.entries(official.modules).map(([id,value])=>[id,resolve(value,selected.filter(row=>moduleId(row.module)===id))])),zones:official.zones.map(zone=>({...zone,totals:resolve(zone.totals,selected.filter(row=>row.zoneName===zone.name))}))};
}
export interface CityPulse {official?:ReturnType<typeof summarizeZones>;attendance?:any;rankings?:any[];plants?:ReturnType<typeof normalizeDashboardPayload>;iec?:any;performance?:Record<string,any>;pending:number;errors:Record<string,string>;}
export function cityPulseQueries(from:string,to:string,zoneIds:string[],wardId:string|string[],geoZoneIds=zoneIds.length===1?zoneIds:[]) {
  const wardKey=(Array.isArray(wardId)?wardId:wardId?[wardId]:[]).join(',');
  return {range:new URLSearchParams({from,to}),geo:new URLSearchParams({from,to,...(geoZoneIds.length?{zoneId:geoZoneIds.join(',')}:{}),...(wardKey?{wardId:wardKey}:{})}),official:new URLSearchParams({from,to,zoneIds:zoneIds.join(','),...(wardKey?{wardIds:wardKey}:{})})};
}
/** The IEC endpoint supplies complete, disjoint zone/ward breakdowns. Never sum percentages. */
export function scopedIecSummary(response:any,zoneIds:string[],wardIds:string[]) {
  if(!zoneIds.length&&!wardIds.length)return response?.kpis||null;
  const source=wardIds.length?response?.wards:response?.zones;
  if(!Array.isArray(source))return null;
  const rows=source.filter(row=>wardIds.length?wardIds.includes(row.id)&&(!zoneIds.length||zoneIds.includes(row.zoneId)):zoneIds.includes(row.id));
  const sum=(key:string)=>rows.every(row=>typeof row[key]==='number'&&Number.isFinite(row[key]))?rows.reduce((total,row)=>total+row[key],0):null;
  return {totalReported:sum('total'),totalClosed:sum('closed'),openIssues:sum('open'),overdueInspections:sum('overdue')};
}
export function useCityPulse(cityId:string,from:string,to:string,zoneIds:string[],wardId:string|string[],revision:number,topics?:string[],geoZoneIds?:string[]):CityPulse {
  const [pulse,setPulse]=useState<CityPulse & {scopeKey:string}>({scopeKey:'',pending:6,errors:{}});const zoneKey=zoneIds.join(','),wardKey=Array.isArray(wardId)?wardId.join(','):wardId,geoZoneKey=geoZoneIds?.join(','),topicKey=topics?.join(',')||'';
  const liveRevision=useOperationalRefresh(cityId,pulse.pending===0);
  const scopeKey=JSON.stringify([cityId,from,to,zoneKey,wardKey,geoZoneKey,revision,topicKey]);
  const loadedKey=useRef('');
  useEffect(()=>{
    const c=new AbortController(),background=loadedKey.current===scopeKey,step=background?0:1;if(!background)setPulse({scopeKey,pending:6,errors:{}});
    const {range,geo,official}=cityPulseQueries(from,to,zoneIds,wardId,geoZoneIds);
    const tasks:[string,()=>Promise<any>][]=[
      ['official',async()=>{if(matrixStore.currentUser?.role==='ULB_OFFICER')return undefined;if(!zoneKey)throw Error('Zone information unavailable.');return summarizeZones(await api(`/city/dashboard/zone-export?${official}`,{signal:c.signal}));}],
      ['attendance',async()=>{const d=await api(`/city/attendance/dashboard?${geo}&page=1&pageSize=1`,{signal:c.signal});return d.summary || null;}],
      ['rankings',async()=>(await api(`/ward-ranking?${range}`,{signal:c.signal})).rankings || []],
      ['plants',async()=>normalizeDashboardPayload(await api(`/modules/processing-plant/dashboard?${range}`,{signal:c.signal}))],
      ['iec',async()=>{if(matrixStore.currentUser?.role==='ULB_OFFICER'){const d=await api(`/cleanliness-issues/ulb/summary?${range}`,{signal:c.signal});return {pendingApprovals:d.pendingApprovals,pendingReopenRequests:d.pendingReopenRequests};}const selectedZones=geoZoneIds??(zoneIds.length===1?zoneIds:[]),selectedWards=Array.isArray(wardId)?wardId:wardId?[wardId]:[];if(selectedZones.length<=1&&selectedWards.length<=1)return (await api(`/cleanliness-issues/commissioner/summary?${geo}`,{signal:c.signal})).kpis||null;const d=await api(`/cleanliness-issues/commissioner/summary?${range}`,{signal:c.signal});return scopedIecSummary(d,selectedZones,selectedWards);}],
      ['performance',async()=>{
        const q=new URLSearchParams({startDate:new Date(`${from}T00:00:00+05:30`).toISOString(),endDate:new Date(`${to}T23:59:59.999+05:30`).toISOString(),tzOffset:'-330',view:'score'});
        const results=await concurrentReads([['SUPERVISOR','daroga'],['QC','si'],['ACTION_OFFICER','iec']].map(([role,key])=>async()=>{
          const response=await api(`/city/users/${key}-performance?${q}`,{signal:c.signal,cache:'no-store'}),users=response.users||{};
          if(!c.signal.aborted)setPulse(p=>({...p,performance:{...p.performance,[role]:users},...(role==='SUPERVISOR'&&p.official?{official:applyPerformanceTargets(p.official,users,wardId)}:{})}));
          return [role,users] as const;
        }),2);
        if(results.every(r=>r.status==='rejected'))throw Error('Team performance unavailable.');
        return Object.fromEntries(results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]));
      }]

    ];
    const run=async([key,load]:[string,()=>Promise<any>])=>{if(c.signal.aborted)return;try{const value=await load();if(!c.signal.aborted)setPulse(p=>({...p,[key]:value,...(key==='performance'&&p.official&&value?.SUPERVISOR?{official:applyPerformanceTargets(p.official,value.SUPERVISOR,wardId)}:{}),...(key==='official'&&value&&p.performance?.SUPERVISOR?{official:applyPerformanceTargets(value,p.performance.SUPERVISOR,wardId)}:{}),pending:p.pending-step}));}catch(e){if(!c.signal.aborted&&!background)setPulse(p=>({...p,errors:{...p.errors,[key]:e.message},pending:p.pending-step}));}};
    // Target credit and attendance need not wait for the zone-export report.
    const active=topicKey?tasks.filter(([key])=>topicKey.split(',').includes(key)):tasks;if(!background)setPulse({scopeKey,pending:active.length,errors:{}});
    for(const task of active)void run(task);
    return()=>c.abort();
  },[cityId,from,to,zoneKey,wardKey,geoZoneKey,revision,topicKey,liveRevision]);
  useEffect(()=>{if(pulse.pending===0&&pulse.scopeKey===scopeKey)loadedKey.current=scopeKey;},[pulse.pending,pulse.scopeKey,scopeKey]);
  return pulse.scopeKey===scopeKey?pulse:{pending:topics?.length||6,errors:{}};
}
export function briefingNotices(pulse:CityPulse):BriefingNotice[] {
  const notices:BriefingNotice[]=[],t=pulse.official?.totals;
  if(pulse.iec?.overdueInspections>0)notices.push({id:'overdue',title:'Overdue cleanliness inspections',detail:'Review outstanding IEC inspections.',count:pulse.iec.overdueInspections,tone:'red',page:'comm_iec_oversight'});
  if(t?.actionRequired>0)notices.push({id:'action',title:'Corrective action required',detail:'Open the inspection queue for responsible officers.',count:t.actionRequired,tone:'red',page:'comm_inspection_perf'});
  if(t?.siPending>0)notices.push({id:'reviews',title:'Inspections awaiting review',detail:'Pending SI decisions.',count:t.siPending,tone:'yellow',page:'comm_inspection_perf'});
  if(pulse.plants){const missing=pulse.plants.plantPerformance.filter(p=>p.daysReported===0).length;if(missing>0)notices.push({id:'plants',title:'Plants yet to report',detail:'Check reporting for the selected period.',count:missing,tone:'yellow',page:'comm_plant'});}
  return notices;
}

/** ULB uses its authorized inspection register; Commissioner-only summaries are not requested. */
export function ulbInspectionSummary(data:InspectionCoverage,zones:{id:string;name:string}[],wardId:string|string[]='') {
  const wardIds=Array.isArray(wardId)?wardId:wardId?[wardId]:[];
  if(data.failedModules.length||!data.inventoryAvailable)return undefined;
  if(data.visits.some(v=>!v.zoneId || wardIds.length&&!v.wardId))return undefined;
  return summarizeZones({zones:zones.map(zone=>({zoneId:zone.id,zoneName:zone.name,modules:data.modules.map(module=>{
    const visits=data.visits.filter(v=>v.module===module&&v.zoneId===zone.id&&(!wardIds.length||wardIds.includes(v.wardId)));
    const total=data.assets.filter(a=>a.module===module&&a.zoneId===zone.id&&(!wardIds.length||wardIds.includes(a.wardId))).length;
    const count=(state:string)=>visits.filter(v=>v.status===state).length;
    return {module:MODULE_KEYS[module],target:total,targetState:'default',completed:visits.length,pending:Math.max(0,total-new Set(visits.map(v=>v.assetId).filter(Boolean)).size),cleaned:count('APPROVED'),notCleaned:count('REJECTED'),siPending:visits.filter(v=>!['APPROVED','REJECTED','ACTION_REQUIRED','ACTION_TAKEN','ESCALATED'].includes(v.status||'')).length,actionRequired:count('ACTION_REQUIRED'),actionPending:count('ACTION_REQUIRED'),actionTaken:count('ACTION_TAKEN')};
  })}))});
}

/** Preserve backend target credit while sourcing all current statuses from the full report register. */
export function reconcileZoneExport(report:any,coverage:InspectionCoverage,wardIds:string[]=[],performance?:Record<string,any>) {
  const data=wardIds.length?{...coverage,failedModules:[...new Set([...coverage.failedModules,...coverage.visits.filter(v=>!v.wardId).map(v=>v.module)])],assets:coverage.assets.filter(a=>wardIds.includes(a.wardId)),visits:coverage.visits.filter(v=>!v.wardId||wardIds.includes(v.wardId))}:coverage;
  const row=(value:any,zone:string,module?:OperationalModuleId)=>{
    const outcomes=inspectionOutcomes(data,{zone,module});
    const count=(id:string)=>outcomes.rows.find(r=>r.id===id)?.value??null;
    const zoneSummary=summarizeZones({zones:(report.zones||[]).filter(z=>(z.zoneId||z.id)===zone)});
    const official=performance?applyPerformanceTargets(zoneSummary,performance):zoneSummary;
    const metrics=inspectionMetrics(data,{zone,module},module?official.modules[module]:official.totals);
    return {...value,intelligenceSuggestedClean:metrics.intelligence?.CLEAN??null,intelligenceSuggestedNotCleaned:metrics.intelligence?.NOT_CLEAN??null,intelligenceUnableToAssess:metrics.intelligence?.UNASSESSABLE??null,awaitingIntelligence:metrics.intelligence?.AWAITING_AI??null,totalEntities:metrics.totalEntities,inspectionTarget:metrics.delivery.target,achieved:metrics.achieved,uniqueEntities:metrics.uniqueEntities,coveragePercent:metrics.coveragePercent,targetCredit:metrics.delivery.completed,targetAchievement:metrics.delivery.percent,targetMethod:metrics.delivery.fallback?'One completed visit per entity per selected day':'Configured target',inspections:outcomes.total,cleaned:count('approved'),siPending:count('pending_review'),notCleaned:count('rejected'),actionRequired:count('action_required'),actionPending:count('action_required'),actionTaken:count('action_taken'),escalated:count('escalated'),unclassified:count('unclassified')};
  };
  const wardRow=(value:any,zone:string)=>{
    const outcomes=inspectionOutcomes(data,{zone,ward:value.wardId});
    const metrics=inspectionMetrics(data,{zone,ward:value.wardId});
    return {...value,intelligenceSuggestedClean:metrics.intelligence?.CLEAN??null,intelligenceSuggestedNotCleaned:metrics.intelligence?.NOT_CLEAN??null,completed:metrics.achieved,cleaned:outcomes.rows.find(r=>r.id==='approved')?.value??null,notCleaned:outcomes.rows.find(r=>r.id==='rejected')?.value??null};
  };
  return {...report,zones:(report.zones||[]).map((z:any)=>({...z,bestWards:(z.bestWards||[]).map((w:any)=>wardRow(w,z.zoneId||z.id)),worstWards:(z.worstWards||[]).map((w:any)=>wardRow(w,z.zoneId||z.id)),modules:(z.modules||[]).map((m:any)=>{const id=moduleId(m.module||m.key||'');return id?row(m,z.zoneId||z.id,id):m;}),...(z.total?{total:row(z.total,z.zoneId||z.id)}:{})}))};
}
