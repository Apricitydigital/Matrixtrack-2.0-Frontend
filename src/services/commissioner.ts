import { useEffect, useState } from 'react';
import { api } from './api';
import { moduleId, MODULE_KEYS } from './adapters';
import { normalizeDashboardPayload } from './plantAnalytics';
import {matrixStore} from './store';
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
export function performanceTargetRows(official:ReturnType<typeof summarizeZones>,users:Record<string,any>,wardId='') {
  const rows=Object.values(users||{}).flatMap(user=>Array.isArray(user?.rows)?user.rows:[]).filter(row=>row.wardId&&moduleId(row.module)&&(!wardId||row.wardId===wardId)&&['ADMIN','DEFAULT'].includes(row.source)&&Number.isFinite(row.target)&&row.target>=0&&Number.isFinite(row.credit)&&row.credit>=0);
  return rows.filter(row=>official.zones.some(zone=>zone.name===row.zoneName));
}
export function applyPerformanceTargets(official:ReturnType<typeof summarizeZones>,users:Record<string,any>,wardId='') {
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
export function useCityPulse(cityId:string,from:string,to:string,zoneIds:string[],wardId:string,revision:number,topics?:string[]) {
  const [pulse,setPulse]=useState<CityPulse>({pending:6,errors:{}});const zoneKey=zoneIds.join(','),topicKey=topics?.join(',')||'';
  useEffect(()=>{
    const c=new AbortController();setPulse({pending:6,errors:{}});
    const range=new URLSearchParams({from,to}),geo=new URLSearchParams({from,to,...(zoneKey?{zoneId:zoneKey}:{}),...(wardId?{wardId}:{})});
    const tasks:[string,()=>Promise<any>][]=[
      ['official',async()=>{if(matrixStore.currentUser?.role==='ULB_OFFICER')return undefined;if(!zoneKey)throw Error('Zone information unavailable.');const q=new URLSearchParams({from,to,zoneIds:zoneKey,...(wardId?{wardIds:wardId}:{})});return summarizeZones(await api(`/city/dashboard/zone-export?${q}`,{signal:c.signal}));}],
      ['attendance',async()=>{const d=await api(`/city/attendance/dashboard?${geo}&page=1&pageSize=1`,{signal:c.signal});return d.summary || null;}],
      ['rankings',async()=>(await api(`/ward-ranking?${range}`,{signal:c.signal})).rankings || []],
      ['plants',async()=>normalizeDashboardPayload(await api(`/modules/processing-plant/dashboard?${range}`,{signal:c.signal}))],
      ['iec',async()=>{if(matrixStore.currentUser?.role==='ULB_OFFICER'){const d=await api(`/cleanliness-issues/ulb/summary?${range}`,{signal:c.signal});return {pendingApprovals:d.pendingApprovals,pendingReopenRequests:d.pendingReopenRequests};}return (await api(`/cleanliness-issues/commissioner/summary?${range}${zoneIds.length===1?`&zoneId=${encodeURIComponent(zoneIds[0])}`:''}${wardId?`&wardId=${encodeURIComponent(wardId)}`:''}`,{signal:c.signal})).kpis || null;}],
      ['performance',async()=>{const q=new URLSearchParams({startDate:new Date(`${from}T00:00:00+05:30`).toISOString(),endDate:new Date(`${to}T23:59:59.999+05:30`).toISOString(),tzOffset:'-330'});const results=await Promise.allSettled([['SUPERVISOR','daroga'],['QC','si'],['ACTION_OFFICER','iec']].map(async([role,key])=>[role,(await api(`/city/users/${key}-performance?${q}`,{signal:c.signal})).users || {}] as const));if(results.every(r=>r.status==='rejected'))throw Error('Team performance unavailable.');return Object.fromEntries(results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]));}]
    ];
    const run=async([key,load]:[string,()=>Promise<any>])=>{if(c.signal.aborted)return;try{const value=await load();if(!c.signal.aborted)setPulse(p=>({...p,[key]:value,...(key==='performance'&&p.official&&value.SUPERVISOR?{official:applyPerformanceTargets(p.official,value.SUPERVISOR,wardId)}:{}),pending:p.pending-1}));}catch(e){if(!c.signal.aborted)setPulse(p=>({...p,errors:{...p.errors,[key]:e.message},pending:p.pending-1}));}};
    // Let inspection totals finish before starting the three detailed officer-performance queries.
    const active=topicKey?tasks.filter(([key])=>topicKey.split(',').includes(key)):tasks;setPulse({pending:active.length,errors:{}});
    const primary=active[0]?run(active[0]):Promise.resolve();for(const task of active.slice(1))if(task[0]==='performance')void primary.then(()=>run(task));else void run(task);
    return()=>c.abort();
  },[cityId,from,to,zoneKey,wardId,revision,topicKey]);
  return pulse;
}
export function briefingNotices(pulse:CityPulse):BriefingNotice[] {
  const notices:BriefingNotice[]=[],t=pulse.official?.totals;
  if(pulse.iec?.overdueInspections>0)notices.push({id:'overdue',title:'Overdue cleanliness inspections',detail:'Review outstanding IEC inspections.',count:pulse.iec.overdueInspections,tone:'red',page:'comm_iec_oversight'});
  if(t?.actionRequired>0)notices.push({id:'action',title:'Corrective action required',detail:'Open the inspection queue for responsible officers.',count:t.actionRequired,tone:'red',page:'comm_inspection_perf'});
  if(t?.siPending>0)notices.push({id:'reviews',title:'Inspections awaiting review',detail:'Pending Sanitary Inspector decisions.',count:t.siPending,tone:'yellow',page:'comm_inspection_perf'});
  if(pulse.plants){const missing=pulse.plants.plantPerformance.filter(p=>p.daysReported===0).length;if(missing>0)notices.push({id:'plants',title:'Plants yet to report',detail:'Check reporting for the selected period.',count:missing,tone:'yellow',page:'comm_plant'});}
  return notices;
}

/** ULB uses its authorized inspection register; Commissioner-only summaries are not requested. */
export function ulbInspectionSummary(data:InspectionCoverage,zones:{id:string;name:string}[],wardId='') {
  if(data.failedModules.length||!data.inventoryAvailable)return undefined;
  if(data.visits.some(v=>!v.zoneId || wardId&&!v.wardId))return undefined;
  return summarizeZones({zones:zones.map(zone=>({zoneId:zone.id,zoneName:zone.name,modules:data.modules.map(module=>{
    const visits=data.visits.filter(v=>v.module===module&&v.zoneId===zone.id&&(!wardId||v.wardId===wardId));
    const total=data.assets.filter(a=>a.module===module&&a.zoneId===zone.id&&(!wardId||a.wardId===wardId)).length;
    const count=(state:string)=>visits.filter(v=>v.status===state).length;
    return {module:MODULE_KEYS[module],target:total,targetState:'default',completed:visits.length,pending:Math.max(0,total-new Set(visits.map(v=>v.assetId).filter(Boolean)).size),cleaned:count('APPROVED'),notCleaned:count('REJECTED'),siPending:visits.filter(v=>!['APPROVED','REJECTED','ACTION_REQUIRED','ACTION_TAKEN','ESCALATED'].includes(v.status||'')).length,actionRequired:count('ACTION_REQUIRED'),actionPending:count('ACTION_REQUIRED'),actionTaken:count('ACTION_TAKEN')};
  })}))});
}
