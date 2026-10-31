import { api, writeApi } from './api';
import { matrixStore } from './store';

export const AREA_TYPES=['RESIDENTIAL','COMMERCIAL','SLUM','RELIGIOUS_PLACE','TOURIST_AREA','TRANSPORT_HUB','PARKS_AND_GARDENS','MARKET_AREA','PARKING'];
export function assertCityAdmin(cityId:string){
  const user=matrixStore.currentUser;
  if(!user || user.role!=='CITY_ADMIN' || user.cityId!==cityId)throw new Error('City Admin access is required for this city.');
}
export function validateLocation(cityId:string,zoneId:string,wardId:string,areaId?:string){
  assertCityAdmin(cityId);
  const data=matrixStore.getData();
  if(!data.zones.some(z=>z.id===zoneId&&z.cityId===cityId)||!data.wards.some(w=>w.id===wardId&&w.zoneId===zoneId&&w.cityId===cityId))throw new Error('Select a Ward belonging to the selected Zone.');
  if(areaId!==undefined&&!data.areas.some(a=>a.id===areaId&&a.wardId===wardId&&a.cityId===cityId))throw new Error('Select an Area belonging to the selected Ward.');
}
export async function createArea(cityId:string,zoneId:string,wardId:string,name:string,areaType:string){
  validateLocation(cityId,zoneId,wardId);
  if(!name.trim()||!AREA_TYPES.includes(areaType))throw new Error('Enter an Area name and valid Area type.');
  const result=await writeApi('/city/geo','POST',{name:name.trim(),parentId:wardId,level:'AREA',areaType});
  await matrixStore.refreshCollections(['geography']);return result;
}
export function validateKml(file:File){if(!/\.(kml|kmz)$/i.test(file.name)||file.size===0||file.size>10*1024*1024)throw new Error('Choose a non-empty KML or KMZ file up to 10 MB.');}
export async function registerNala(cityId:string,zoneId:string,wardId:string,areaId:string,name:string,coordinates:string){
  validateLocation(cityId,zoneId,wardId,areaId);if(!name.trim())throw new Error('Enter a Nala name.');
  const lines=coordinates.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length<1||lines.length>50)throw new Error('Enter between 1 and 50 route points, one Latitude, Longitude pair per line.');
  const points=lines.map((line,i)=>{const pair=line.split(',').map(v=>v.trim());const [lat,lng]=pair.map(Number);if(pair.length!==2||pair.some(v=>!v)||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||(lat===0&&lng===0))throw new Error(`Point ${i+1}: enter valid Latitude and Longitude.`);return {lat,lng};});
  const result=await writeApi('/city/nalas','POST',{zoneId,wardId,areaId,nalaName:name.trim(),points});await matrixStore.refreshCollections(['geography']);return result;
}
export async function createKmlBeat(cityId:string,zoneId:string,wardId:string,areaId:string,name:string,file?:File){
  validateLocation(cityId,zoneId,wardId,areaId);if(!name.trim())throw new Error('Enter a Beat name.');if(file)validateKml(file);
  const form=new FormData();Object.entries({zoneId,wardId,areaId,beatName:name.trim()}).forEach(([k,v])=>form.set(k,v));if(file)form.set('kmlFile',file);
  const result=await api('/city/areas',{method:'POST',body:form});await matrixStore.refreshCollections(['beats']);return result;
}
export async function previewGeographicImport(cityId:string,kind:'beats'|'nalas',zoneId:string,wardId:string,areaId:string,file:File){
  validateLocation(cityId,zoneId,wardId,areaId);validateKml(file);
  const form=new FormData();Object.entries({zoneId,wardId,areaId}).forEach(([k,v])=>form.set(k,v));form.set('kmlFile',file);
  const result=await api(`/city/${kind==='beats'?'areas':'nalas'}/import-preview`,{method:'POST',body:form});
  if(!Array.isArray(result.preview?.[kind]))throw new Error('The import preview is incomplete. Please retry.');
  return {...result.preview,[kind]:result.preview[kind].map((item:any)=>({...item,beatName:item.beatName||item.suggestedBeatName,nalaName:item.nalaName||item.suggestedNalaName}))};
}
export async function commitGeographicImport(cityId:string,kind:'beats'|'nalas',zoneId:string,wardId:string,areaId:string,items:any[]){
  validateLocation(cityId,zoneId,wardId,areaId);if(!items.length)throw new Error('Select at least one new location to import.');
  const result=await writeApi(`/city/${kind==='beats'?'areas':'nalas'}/import-commit`,'POST',{zoneId,wardId,areaId,[kind]:items});await matrixStore.refreshCollections(kind==='beats'?['beats']:['geography']);return result;
}
export async function beatAssignees(cityId:string,id:string){assertCityAdmin(cityId);return api<any[]>(`/city/areas/${encodeURIComponent(id)}/potential-assignees?role=SUPERVISOR`);}
export async function assignBeat(cityId:string,id:string,userId:string|null){
  assertCityAdmin(cityId);if(!matrixStore.getBeats(cityId).some(b=>b.id===id))throw new Error('Beat is outside this city.');
  if(userId){const candidates=await beatAssignees(cityId,id);if(!candidates.some(u=>u.id===userId&&u.matchesContext!==false))throw new Error('Select an eligible Daroga for this Beat.');}
  assertCityAdmin(cityId);
  const result=await writeApi(`/city/areas/${encodeURIComponent(id)}/assign`,'POST',{userId,targetRole:'SUPERVISOR'});await matrixStore.refreshCollections(['beats']);return result;
}

export function validateBeatPoints(points:import('../types').BeatPoint[]) {
 if(points.length!==5)throw new Error('Exactly five inspection points are required.');
 if(points.some(p=>!p.label.trim()||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180||(p.lat===0&&p.lng===0)))throw new Error('Enter a label and valid Latitude and Longitude for each point.');
}
export async function updateBeatPoints(cityId:string,id:string,points:import('../types').BeatPoint[]){
 assertCityAdmin(cityId);if(!matrixStore.getBeats(cityId).some(b=>b.id===id))throw new Error('Beat is outside this city.');validateBeatPoints(points);
 const result=await writeApi(`/city/areas/${encodeURIComponent(id)}/points`,'PUT',{points:points.map(p=>({lat:p.lat,lng:p.lng,label:p.label.trim()}))});await matrixStore.refreshCollections(['beats']);return result;
}
export async function updateBeat(cityId:string,id:string,zoneId:string,wardId:string,areaId:string,name:string,file?:File){
 validateLocation(cityId,zoneId,wardId,areaId);if(!matrixStore.getBeats(cityId).some(b=>b.id===id))throw new Error('Beat is outside this city.');if(!name.trim())throw new Error('Enter a Beat name.');if(file)validateKml(file);
 const form=new FormData();Object.entries({zoneId,wardId,areaId,beatName:name.trim()}).forEach(([k,v])=>form.set(k,v));if(file)form.set('kmlFile',file);
 const result=await api(`/city/areas/${encodeURIComponent(id)}`,{method:'PUT',body:form});await matrixStore.refreshCollections(['beats']);return result;
}
export async function assignBeatMember(cityId:string,id:string,userId:string|null,role:'SUPERVISOR'|'EMPLOYEE',segmentIds:string[]=[]){
 assertCityAdmin(cityId);const beat=matrixStore.getBeats(cityId).find(b=>b.id===id);if(!beat)throw new Error('Beat is outside this city.');
 if(segmentIds.some(id=>!beat.segments?.some(s=>s.id===id)))throw new Error('Select sub-beats belonging to this Beat.');
 if(userId){const candidates=await api<any[]>(`/city/areas/${encodeURIComponent(id)}/potential-assignees?role=${role}`);if(!candidates.some(u=>u.id===userId&&u.matchesContext!==false))throw new Error('Select an eligible team member for this Beat.');}
 assertCityAdmin(cityId);const result=await writeApi(`/city/areas/${encodeURIComponent(id)}/assign`,'POST',{userId,targetRole:role,...(segmentIds.length?{segmentIds}:{})});await matrixStore.refreshCollections(['beats']);return result;
}
