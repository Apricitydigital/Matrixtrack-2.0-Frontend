import type { OperationalModuleId } from '../types';
import {canonicalModuleKey} from './moduleKeys';
import {personnelAssignedToWard,personnelScope} from './personnelScope';
export interface MapAsset {key:string;id:string;module:OperationalModuleId;name:string;state:string;zoneId:string;wardId:string;zoneName:string;wardName:string;reportId?:string;coordinates?:[number,number];geometry?:any;actors:any[];supervisors:any[];employees:any[];workflow?:any;address?:string;reportedSegments?:number;totalSegments?:number;}
export const MODULE_COLORS:Record<OperationalModuleId,string>={sweeping:'#3a76b8',toilets:'#8a6cc0',litter_bins:'#d59348',nala:'#2b9aa4',ctu_gvp:'#55a581'};
const BOUNDARY_COLORS=['#4f46e5','#0891b2','#b45309','#7c3aed'];
export function boundaryColor(id:string):string {
  let hash=0;for(const char of id)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
  return BOUNDARY_COLORS[hash%BOUNDARY_COLORS.length];
}
export type MapTeamRole='EMPLOYEE'|'SUPERVISOR';
export interface MapTeamPerson {id:string;name:string;role:MapTeamRole;locationKeys:string[];modules:OperationalModuleId[];}
export interface MapPersonnel {id:string;cityId:string;name:string;role:MapTeamRole;zoneIds:string[];wardIds:string[];modules:{key:string;zoneIds:string[];wardIds:string[]}[];}
const MAP_MODULE_KEYS:Record<OperationalModuleId,string>={sweeping:'SWEEPING',toilets:'TOILET',litter_bins:'LITTERBINS',nala:'NALA',ctu_gvp:'TASKFORCE'};
/** Directory totals use exactly the personnel screen's scope rules, independently of asset links. */
export function mapPersonnelTeam(directory:MapPersonnel[],assets:MapAsset[],scope:{cityId:string;zone:string;ward:string;modules:string[];wards:{id:string;zoneId:string}[];wardIds?:string[]}):MapTeamPerson[]{
  const linked=new Map(mapAssignedPeople(assets).map(p=>[`${p.role}:${p.id}`,p]));
  const allModules=Object.keys(MAP_MODULE_KEYS).every(key=>scope.modules.includes(key));
  const chosenKeys=new Set(scope.modules.map(key=>MAP_MODULE_KEYS[key]));
  const people=new Map<string,MapTeamPerson>();
  for(const person of directory){
    if(person.cityId!==scope.cityId||!['EMPLOYEE','SUPERVISOR'].includes(person.role))continue;
    const modules=(person.modules||[]).filter(m=>allModules||chosenKeys.has(canonicalModuleKey(m.key)));
    if(!allModules&&!modules.length)continue;
    const user={assignedZoneIds:allModules?person.zoneIds:modules.flatMap(m=>m.zoneIds.length?m.zoneIds:person.zoneIds),assignedWardIds:allModules?person.wardIds:modules.flatMap(m=>m.wardIds.length?m.wardIds:person.wardIds),moduleAssignments:modules};
    const geography=personnelScope(user,scope.wards);
    if(scope.zone&&!geography.zoneIds.includes(scope.zone))continue;
    if(scope.wardIds&&!scope.ward&&!scope.wards.some(w=>scope.wardIds!.includes(w.id)&&personnelAssignedToWard(user,w)))continue;
    const ward=scope.wards.find(w=>w.id===scope.ward);
    if(scope.ward&&(!ward||!personnelAssignedToWard(user,ward)))continue;
    const key=`${person.role}:${person.id}`,assignment=linked.get(key);
    people.set(key,{id:person.id,name:person.name,role:person.role,locationKeys:assignment?.locationKeys||[],modules:(Object.keys(MAP_MODULE_KEYS) as OperationalModuleId[]).filter(key=>modules.some(m=>canonicalModuleKey(m.key)===MAP_MODULE_KEYS[key]))});
  }
  return [...people.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
/** Assignment arrays are authoritative; report actors may include former assignees and reviewers. */
export function mapAssignedPeople(assets:MapAsset[]):MapTeamPerson[]{
  const people=new Map<string,MapTeamPerson>();
  for(const asset of assets)for(const [role,assigned] of [['EMPLOYEE',asset.employees],['SUPERVISOR',asset.supervisors]] as const){
    for(const person of assigned||[]){
      if(!person?.id)continue;
      const key=`${role}:${person.id}`,existing=people.get(key)||{id:person.id,name:person.name||'Name unavailable',role,locationKeys:[],modules:[]};
      if(!existing.locationKeys.includes(asset.key))existing.locationKeys.push(asset.key);
      if(!existing.modules.includes(asset.module))existing.modules.push(asset.module);
      people.set(key,existing);
    }
  }
  return [...people.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export function mapAssetHasStaff(asset:MapAsset,id:string,role?:MapTeamRole|''):boolean {
  const people=role==='EMPLOYEE'?asset.employees:role==='SUPERVISOR'?asset.supervisors:[...asset.actors,...asset.supervisors,...asset.employees];
  return people.some(p=>p.id===id);
}
/** Keep both geographic levels visible, including the selected Ward's parent Zone. */
export function scopedMapBoundaries(data:any,zone:string,ward:string,focus?:{zoneIds:string[];wardIds:string[]}|null){
  const allWards=data?.boundaries?.wards||[];
  if(focus&&!ward)return [
    ...(data?.boundaries?.zones||[]).filter((b:any)=>focus.zoneIds.includes(b.id)).map((b:any)=>({...b,level:'zone'})),
    ...allWards.filter((b:any)=>focus.wardIds.includes(b.id)).map((b:any)=>({...b,level:'ward'})),
  ];
  const parentZone=zone||(ward?(data?.filters?.wards||[]).find((w:any)=>w.id===ward)?.zoneId||allWards.find((w:any)=>w.id===ward)?.zoneId:'');
  return [
    ...(data?.boundaries?.zones||[]).filter((b:any)=>!parentZone||b.id===parentZone).map((b:any)=>({...b,level:'zone'})),
    ...allWards.filter((b:any)=>(!parentZone||b.zoneId===parentZone)&&(!ward||b.id===ward)).map((b:any)=>({...b,level:'ward'})),
  ];
}
export function validCoordinates(lat:unknown,lng:unknown):[number,number]|undefined {
  if(lat===null||lng===null||lat===undefined||lng===undefined||lat===''||lng==='')return;
  const a=Number(lat),b=Number(lng);return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a)<=90&&Math.abs(b)<=180&&(a!==0||b!==0)?[a,b]:undefined;
}
export function geometryPoints(geometry:any):[number,number][] {
  if(typeof geometry==='string'){try{return geometryPoints(JSON.parse(geometry));}catch{return [];}}
  if(!geometry)return [];
  if(geometry.type==='Feature')return geometryPoints(geometry.geometry);
  if(geometry.type==='FeatureCollection')return (geometry.features || []).flatMap(geometryPoints);
  const walk=(coords:any):[number,number][]=>{if(!Array.isArray(coords))return [];if(typeof coords[0]==='number'){const p=validCoordinates(coords[1],coords[0]);return p?[p]:[];}return coords.flatMap(walk);};
  return walk(geometry.coordinates);
}
export function mapAssets(data:any):MapAsset[] {
  const groups:[string,OperationalModuleId][]=[['beats','sweeping'],['toilets','toilets'],['bins','litter_bins'],['nalas','nala'],['gvps','ctu_gvp']];
  return groups.flatMap(([group,module])=>(Array.isArray(data?.[group])?data[group]:[]).map((r:any)=>{let geometry=r.geometry;if(typeof geometry==='string'){try{geometry=JSON.parse(geometry);}catch{geometry=undefined;}}return {...r,key:`${module}:${r.id}`,module,state:r.state || 'NOT_REPORTED',zoneId:r.zoneId || '',wardId:r.wardId || '',coordinates:validCoordinates(r.latitude,r.longitude),geometry,actors:r.actors || [],supervisors:r.supervisors || [],employees:r.employees || []};}));
}
export function reportCoordinates(raw:any):[number,number] {
  const asset=raw.toilet || raw.bin || raw.beat || raw.nala || raw.feederPoint || {},p=raw.payload || {};
  const candidates=[raw,raw.location,raw.coordinates,asset,asset.location,p,p.location,p.coordinates,...(Array.isArray(p.points)?p.points:[])];
  for(const item of candidates){if(!item)continue;const pair=Array.isArray(item)?validCoordinates(item[0],item[1]):validCoordinates(item.latitude ?? item.lat,item.longitude ?? item.lng ?? item.lon);if(pair)return pair;}
  const points=geometryPoints(raw.geometry || asset.geometry);return points[0] || [0,0];
}
