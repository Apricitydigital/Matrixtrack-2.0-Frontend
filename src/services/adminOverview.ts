import type {User,OperationalModuleId} from '../types';

export const ADMIN_ASSET_KEYS:Record<OperationalModuleId,string>={sweeping:'beats',toilets:'toilets',litter_bins:'litterBins',nala:'nalas',ctu_gvp:'gvp'};
export function overviewNumber(value:unknown):number|null{return typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;}
export function adminModuleCounts(registry:any,assignments:any,module:OperationalModuleId,key:string){
  return {registered:overviewNumber(registry?.summary?.[ADMIN_ASSET_KEYS[module]]?.registered),pending:overviewNumber(assignments?.modules?.[key]?.unassignedAssets)};
}
export function adminStaffCounts(users:User[],cityId:string,role:string){
  const active=users.filter(u=>u.cityId===cityId&&!u.isDeleted&&u.status==='active'&&u.role===role);
  const ids=new Set(active.map(u=>u.id));
  const scoped=new Set(active.filter(u=>u.assignedWardIds?.length||u.assignedZoneIds?.length||u.moduleAssignments?.some(m=>m.wardIds.length||m.zoneIds.length)).map(u=>u.id));
  return {total:ids.size,withoutScope:[...ids].filter(id=>!scoped.has(id)).length};
}
export function activeDarogasWithoutAssignments(assignments:any,users:User[],cityId:string):number|null{
  if(!Array.isArray(assignments?.supervisors?.unassignedItems))return null;
  const activeIds=new Set(users.filter(u=>u.cityId===cityId&&u.role==='SUPERVISOR'&&u.status==='active'&&!u.isDeleted).map(u=>u.id));
  return new Set(assignments.supervisors.unassignedItems.filter((u:any)=>activeIds.has(u.id)).map((u:any)=>u.id)).size;
}
