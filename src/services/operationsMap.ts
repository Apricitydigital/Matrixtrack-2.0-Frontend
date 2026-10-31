import type { OperationalModuleId } from '../types';
export interface MapAsset {key:string;id:string;module:OperationalModuleId;name:string;state:string;zoneId:string;wardId:string;zoneName:string;wardName:string;reportId?:string;coordinates?:[number,number];geometry?:any;actors:any[];supervisors:any[];employees:any[];workflow?:any;address?:string;reportedSegments?:number;totalSegments?:number;}
export const MODULE_COLORS:Record<OperationalModuleId,string>={sweeping:'#3a76b8',toilets:'#8a6cc0',litter_bins:'#d59348',nala:'#2b9aa4',ctu_gvp:'#55a581'};
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
