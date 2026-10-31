import type {User,Zone,Ward} from '../types';
import {api,writeApi} from './api';
import {matrixStore} from './store';
import {assertCityAdmin} from './citySetup';
import {MODULE_KEYS} from './adapters';

export const PERSONNEL_ROLES:Record<string,string>={CITY_ADMIN:'City Admin',SUPERVISOR:'Daroga',QC:'Sanitary Inspector',ACTION_OFFICER:'IEC Member',EMPLOYEE:'Employee',ULB_OFFICER:'ULB Officer',COMMISSIONER:'Commissioner'};
export const PERSONNEL_MODULE_LABELS:Record<string,string>={SWEEPING:'Sweeping',TOILET:'Cleanliness of Toilet',LITTERBINS:'Litter Bins',NALA:'Nala',TASKFORCE:'CTU/GVP Transformation',WORKFORCE_MONITORING:'Workforce Monitoring',SWACHH_RANKING:'Swachh Ward Ranking',MRF:'Processing & MRF',PROCESSING_PLANT:'Plant & Processing'};
export const enabledPersonnelKeys=(cityId:string)=>matrixStore.getCityModules(cityId).filter(m=>m.enabled&&PERSONNEL_MODULE_LABELS[m.key]).map(m=>m.key);
export const PERSONNEL_HEADERS=['Name','Email','Phone','Password','Role','Zone','Ward','Modules'];
export function personnelScope(user:User,wards:Ward[]){
 const wardIds=[...new Set([...(user.assignedWardIds||[]),...(user.moduleAssignments||[]).flatMap(m=>m.wardIds)])];
 const zoneIds=[...new Set([...(user.assignedZoneIds||[]),...(user.moduleAssignments||[]).flatMap(m=>m.zoneIds),...wards.filter(w=>wardIds.includes(w.id)).map(w=>w.zoneId)])];return {zoneIds,wardIds};
}
export function scopeNames(ids:string[],nodes:{id:string;name:string}[]){return ids.map(id=>nodes.find(n=>n.id===id)?.name||'Unavailable geography').join(', ')||'Not assigned';}
export function personnelAssignedToWard(user:User,ward:Ward){
 const matches=(z:string[],w:string[])=>!!(z.length||w.length)&&(!z.length||z.includes(ward.zoneId))&&(!w.length||w.includes(ward.id));
 const z=user.assignedZoneIds||[],w=user.assignedWardIds||[],scopedModules=(user.moduleAssignments||[]).filter(m=>m.zoneIds.length||m.wardIds.length);
 if(z.length||w.length)return matches(z,w)&&(!scopedModules.length||scopedModules.some(m=>matches(m.zoneIds,m.wardIds)));
 return scopedModules.some(m=>matches(m.zoneIds,m.wardIds));
}
export async function personnelModules(cityId:string){assertCityAdmin(cityId);const rows=await api('/city/modules');if(!Array.isArray(rows))throw new Error('Module directory is unavailable.');return rows.filter(m=>m.enabled!==false&&!!PERSONNEL_MODULE_LABELS[m.key||m.name]).map(m=>({id:m.id,key:m.key||m.name,name:m.name||m.key}));}
export function validatePersonnelScope(cityId:string,zoneIds:string[],wardIds:string[],role:string){
 assertCityAdmin(cityId);const {zones,wards}=matrixStore.getData();if(!PERSONNEL_ROLES[role])throw new Error('Select a municipal staff role.');
 if(zoneIds.some(id=>!zones.some(z=>z.id===id&&z.cityId===cityId))||wardIds.some(id=>!wards.some(w=>w.id===id&&w.cityId===cityId&&zoneIds.includes(w.zoneId))))throw new Error('Each Ward must belong to a selected Zone in this city.');
 if(['QC','ULB_OFFICER'].includes(role)&&(!zoneIds.length||!wardIds.length))throw new Error('Sanitary Inspectors and ULB Officers require a Zone and Ward.');
}
export async function createPersonnel(cityId:string,input:{name:string;email:string;phone:string;password:string;role:string;zoneIds:string[];wardIds:string[];moduleKeys:string[]}){
 validatePersonnelScope(cityId,input.zoneIds,input.wardIds,input.role);
 if(!input.name.trim()||!/^\S+@\S+\.\S+$/.test(input.email)||!/^\d{10}$/.test(input.phone)||input.password.length<6)throw new Error('Enter a name, valid email, 10-digit phone and password of at least 6 characters.');
 if(input.zoneIds.length>1||input.wardIds.length>1)throw new Error('Choose one Zone and Ward for registration. Additional scopes can be assigned after creation.');
 if(matrixStore.getUsers(cityId).some(u=>u.email.toLowerCase()===input.email.trim().toLowerCase()))throw new Error('This email is already registered. Use Edit user.');
 const enabled=await personnelModules(cityId);if(!input.moduleKeys.length||input.moduleKeys.some(key=>!enabled.some(m=>m.key===key)))throw new Error('Choose enabled city modules.');assertCityAdmin(cityId);
 const result=await writeApi('/common-registration/register','POST',{cityId,name:input.name.trim(),email:input.email.trim().toLowerCase(),phone:input.phone,password:input.password,zoneId:input.zoneIds[0],wardId:input.wardIds[0],targetSystems:['TASKFORCE_20'],taskforceConfig:{role:input.role,moduleKeys:input.moduleKeys}});
 if(result.success===false)throw new Error(result.message||'Registration was not accepted.');await matrixStore.refreshPersonnel();return result;
}
export async function editPersonnel(cityId:string,user:User,updates:{name?:string;phone?:string;employeeId?:string;zoneIds?:string[];wardIds?:string[];modules?:{moduleId:string;canWrite:boolean;zoneIds:string[];wardIds:string[]}[]}){
 assertCityAdmin(cityId);if(user.cityId!==cityId||!matrixStore.getUsers(cityId).some(u=>u.id===user.id))throw new Error('This user is outside your city.');
 if(new Set(matrixStore.getUsers(cityId).filter(u=>u.id===user.id).map(u=>u.role)).size>1)throw new Error('This user has multiple city roles. The current edit endpoint cannot preserve those roles safely.');
 const scoped=updates.zoneIds!==undefined||updates.wardIds!==undefined||updates.modules!==undefined;
 if(scoped)validatePersonnelScope(cityId,updates.zoneIds??user.assignedZoneIds??[],updates.wardIds??user.assignedWardIds??[],user.role);
 if(updates.name!==undefined&&!updates.name.trim())throw new Error('Enter a name.');
 if(updates.phone&&!/^\d{10}$/.test(updates.phone))throw new Error('Phone must contain 10 digits.');
 if(updates.employeeId&&!/^[\w-]{3,50}$/.test(updates.employeeId))throw new Error('Employee ID must be 3–50 letters, numbers, hyphens or underscores.');
 if(updates.modules&&!['QC','ULB_OFFICER'].includes(user.role)){
   const same=(a:string[],b:string[])=>a.length===b.length&&a.every(id=>b.includes(id));
   const custom=(user.moduleAssignments||[]).some(m=>(m.zoneIds.length&&!same(m.zoneIds,user.assignedZoneIds||[]))||(m.wardIds.length&&!same(m.wardIds,user.assignedWardIds||[])));
   if(custom)throw new Error('This user has a custom module scope that the current edit endpoint cannot preserve. Profile editing remains available.');
 }
 if(updates.modules){const enabled=await personnelModules(cityId);for(const m of updates.modules){if(!enabled.some(e=>e.id===m.moduleId))throw new Error('A selected module is not enabled.');const z=m.zoneIds.length?m.zoneIds:updates.zoneIds??user.assignedZoneIds??[],w=m.wardIds.length?m.wardIds:updates.wardIds??user.assignedWardIds??[];validatePersonnelScope(cityId,z,w,user.role);if(['QC','ULB_OFFICER'].includes(user.role)&&(z.some(id=>!updates.zoneIds?.includes(id))||w.some(id=>!updates.wardIds?.includes(id))))throw new Error('Module scopes must stay within the city assignment.');if(user.role==='COMMISSIONER'&&m.canWrite)throw new Error('Commissioner module access must be view-only.');}if(user.role==='ACTION_OFFICER'&&!updates.modules.length)throw new Error('IEC Members require at least one module.');}
 assertCityAdmin(cityId);const result=await writeApi(`/city/users/${encodeURIComponent(user.id)}`,'PATCH',updates);await matrixStore.refreshPersonnel();return result;
}
export function personnelImportRows(cityId:string,rows:string[][]){
 assertCityAdmin(cityId);if(rows.length<2||PERSONNEL_HEADERS.some((h,i)=>rows[0]?.[i]?.trim().toLowerCase()!==h.toLowerCase()))throw new Error('Use the provided personnel import template.');
 const {zones,wards}=matrixStore.getData();const emails=new Set<string>();const existing=new Set(matrixStore.getUsers(cityId).map(u=>u.email.toLowerCase()));
 return rows.slice(1).filter(r=>r.some(Boolean)).map((r,i)=>{const fail=(message:string):never=>{throw new Error(`Row ${i+2}: ${message}`);};const [name,emailRaw,phone,password,roleRaw,zoneName,wardName,modulesRaw]=r.map(v=>String(v||'').trim());const email=emailRaw?.toLowerCase(),role=Object.keys(PERSONNEL_ROLES).find(key=>key===roleRaw?.toUpperCase()||PERSONNEL_ROLES[key].toLowerCase()===roleRaw?.toLowerCase());
 if(!name||!/^\S+@\S+\.\S+$/.test(email)||!/^\d{10}$/.test(phone)||password?.length<6||!role)fail('Check name, email, phone, password and role.');if(emails.has(email)||existing.has(email))fail('Email is duplicated or already registered.');emails.add(email);
 const match=(node:{name:string;backendName?:string},text:string)=>[node.name,node.backendName].some(n=>n?.toLowerCase()===text?.toLowerCase());const zone=zones.find(z=>z.cityId===cityId&&match(z,zoneName)),ward=wards.find(w=>w.cityId===cityId&&w.zoneId===zone?.id&&match(w,wardName));
 if(zoneName&&!zone||wardName&&!ward)fail('Zone or Ward does not match the city hierarchy.');validatePersonnelScope(cityId,zone?[zone.id]:[],ward?[ward.id]:[],role!);
 const keys=modulesRaw?.split(';').map(v=>v.trim()).filter(Boolean).map(v=>Object.keys(PERSONNEL_MODULE_LABELS).find(key=>key===v.toUpperCase()||PERSONNEL_MODULE_LABELS[key].toLowerCase()===v.toLowerCase())||fail('Unknown module.'))||[];
 const enabled=enabledPersonnelKeys(cityId);if(!keys.length||keys.some(key=>!enabled.includes(key)))fail('Choose enabled modules, separated by semicolons.');
 return {name,email,phone,password,cityId,zoneId:zone?.id,wardId:ward?.id,targetSystems:['TASKFORCE_20'],taskforceConfig:{role,moduleKeys:keys}};});
}
export async function importPersonnel(cityId:string,rows:string[][]){const employees=personnelImportRows(cityId,rows);if(!employees.length)throw new Error('The file contains no personnel.');const result=await writeApi('/common-registration/bulk-import','POST',{employees});await matrixStore.refreshPersonnel();return result;}
export async function approvePersonnelRegistration(cityId:string,request:User,moduleKeys:string[],zoneIds:string[],wardIds:string[]){
 assertCityAdmin(cityId);if(request.cityId!==cityId||request.status!=='pending_approval')throw new Error('This registration is outside the city or has already been processed.');
 validatePersonnelScope(cityId,zoneIds,wardIds,request.role);
 const enabled=enabledPersonnelKeys(cityId);if(!moduleKeys.length||moduleKeys.some(key=>!enabled.includes(key)))throw new Error('Choose enabled modules before approving.');
 const result=await writeApi(`/city/registration-requests/${encodeURIComponent(request.id)}/approve`,'POST',{role:request.role,moduleKeys,zoneIds,wardIds});await matrixStore.refreshPersonnel();return result;
}
