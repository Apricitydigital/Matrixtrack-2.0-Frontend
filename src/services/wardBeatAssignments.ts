import { api, writeApi, ApiError } from './api';
import { matrixStore } from './store';
import { assertCityAdmin, validateLocation } from './citySetup';

export interface WardDaroga {id:string;name:string;}
export interface WardAssignmentScope {cityId:string;zoneId:string;wardId:string;}
export interface WardSharedBeat {id:string;name:string;beatNumber?:string;sharedSupervisorIds:string[];supervisors:WardDaroga[];segmentCount:number;}
export interface WardAssignmentSnapshot extends WardAssignmentScope {zoneName:string;wardName:string;revision:string;beats:WardSharedBeat[];candidates:WardDaroga[];}
export type WardAssignmentMode='add'|'replace';
export interface WardAssignmentPlan {snapshot:WardAssignmentSnapshot;mode:WardAssignmentMode;selected:WardDaroga[];rows:{beatId:string;beatName:string;supervisors:WardDaroga[]}[];}

export async function loadWardAssignment(scope:WardAssignmentScope,signal?:AbortSignal):Promise<WardAssignmentSnapshot> {
 validateLocation(scope.cityId,scope.zoneId,scope.wardId);
 try {
  const response=await api<WardAssignmentSnapshot>(`/city/areas/ward-assignments?${new URLSearchParams({zoneId:scope.zoneId,wardId:scope.wardId})}`,{signal,cache:'no-store'});
  if(response?.cityId!==scope.cityId||response.zoneId!==scope.zoneId||response.wardId!==scope.wardId||!Array.isArray(response.beats)||!Array.isArray(response.candidates)||!/^[a-f0-9]{64}$/.test(response.revision||''))throw new Error('The complete Ward assignment preview could not be verified.');
  if(new Set(response.beats.map(b=>b.id)).size!==response.beats.length||response.beats.some(b=>!b.id||!Array.isArray(b.supervisors)))throw new Error('The Ward Beat list is incomplete. Reload the preview.');
  return response;
 }catch(error){if(error instanceof ApiError&&error.status===404)throw new Error('Shared Ward assignment requires the updated backend. Individual Beat assignment remains available.');throw error;}
}
export function planWardAssignment(snapshot:WardAssignmentSnapshot,selectedIds:string[],mode:WardAssignmentMode):WardAssignmentPlan {
 if(!['add','replace'].includes(mode))throw new Error('Choose Add or Replace for the shared team.');
 const selected=[...new Set(selectedIds)].sort().map(id=>{const user=snapshot.candidates.find(u=>u.id===id);if(!user)throw new Error('A selected Daroga is not eligible for this Ward.');return user;});
 if(!selected.length)throw new Error('Select at least one eligible Daroga.');
 if(!snapshot.beats.length)throw new Error('This Ward has no approved Beats to assign.');
 const rows=snapshot.beats.map(b=>({beatId:b.id,beatName:b.name||b.beatNumber||'Unnamed Beat',supervisors:[...new Map([...(mode==='add'?b.supervisors:[]),...selected].map(u=>[u.id,u])).values()]}));
 return {snapshot,mode,selected,rows};
}
export async function saveWardAssignment(plan:WardAssignmentPlan) {
 assertCityAdmin(plan.snapshot.cityId);
 const checked=planWardAssignment(plan.snapshot,plan.selected.map(u=>u.id),plan.mode);
 const response=await writeApi('/city/areas/ward-assignments','POST',{zoneId:plan.snapshot.zoneId,wardId:plan.snapshot.wardId,supervisorIds:checked.selected.map(u=>u.id),mode:plan.mode,expectedRevision:plan.snapshot.revision});
 if(response?.success!==true||response.beatCount!==plan.rows.length||response.darogaCount!==plan.selected.length)throw new Error('The save response could not be verified. Reload the Ward before retrying.');
 let refreshError='';
 try{assertCityAdmin(plan.snapshot.cityId);await matrixStore.refreshCollections(['beats']);}catch{refreshError='Assignments were saved, but the Beat list could not be refreshed. Reload the list.';}
 return {...response,refreshError};
}
