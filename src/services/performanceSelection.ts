import type { User,Ward } from '../types';
import { performanceForRole } from './performanceModel';
export const PERFORMANCE_ROLES=['SUPERVISOR','QC','ACTION_OFFICER'] as const;
export type PerformanceLoad={status:'loading'|'ready'|'error';message?:string;refreshError?:string;officerErrors?:Record<string,string>};
export function officerGeography(user:User,wards:Ward[],module='ALL'){
  const modules=(user.moduleAssignments||[]).filter(m=>module==='ALL'||m.key===module);
  const custom=module!=='ALL'&&modules.some(m=>m.zoneIds.length||m.wardIds.length);
  const wardIds=[...new Set([...(custom?[]:user.assignedWardIds||[]),...modules.flatMap(m=>m.wardIds)])];
  const zoneIds=[...new Set([...(custom?[]:user.assignedZoneIds||[]),...modules.flatMap(m=>m.zoneIds),...wards.filter(w=>wardIds.includes(w.id)).map(w=>w.zoneId)])];
  return {zoneIds,wardIds};
}
export function performanceGroups(users:User[],stats:Record<string,any>,loads:Record<string,PerformanceLoad>,cityId:string,wards:Ward[],filters:{zone:string;ward:string;module:string;query:string;focus?:{zoneIds:string[];wardIds:string[]}|null}){
 const query=filters.query.trim().toLowerCase();
 return Object.fromEntries(PERFORMANCE_ROLES.map(role=>[role,[...new Map(users.filter(u=>u.cityId===cityId&&u.role===role&&!u.isDeleted&&u.status!=='pending_approval'&&u.status!=='rejected').map(u=>[u.id,u])).values()].filter(u=>{
   const scope=officerGeography(u,wards,filters.module);
   return (filters.module==='ALL'||(u.moduleAssignments||[]).some(m=>m.key===filters.module))&&(filters.zone==='all'||(filters.focus?(scope.wardIds.length?scope.wardIds.some(id=>filters.focus!.wardIds.includes(id)):scope.zoneIds.some(id=>filters.focus!.zoneIds.includes(id))):scope.zoneIds.includes(filters.zone)))&&(filters.ward==='all'||scope.wardIds.includes(filters.ward))&&(!query||`${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(query));
 }).map(user=>{
   const state=loads[role],error=state?.officerErrors?.[user.id];
   const availability=state?.status==='loading'?'loading':state?.status==='error'||error?'error':undefined;
   const stat=availability?{availability,availabilityReason:error||state?.message,performance:null,scoreBasis:role==='SUPERVISOR'?'target':'on_time'}:performanceForRole(stats[role]?.[user.id],role,filters.module);
   return {user,stat};
 }).sort((a,b)=>(b.stat?.performance??-1)-(a.stat?.performance??-1)||a.user.name.localeCompare(b.user.name))]));
}
