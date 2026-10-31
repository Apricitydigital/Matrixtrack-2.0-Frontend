import type {User,City,Zone,Ward} from '../types';
import {api,writeApi} from './api';
import {matrixStore} from './store';
import {downloadWorkbook} from './spreadsheets';
import {personnelScope,scopeNames,PERSONNEL_MODULE_LABELS} from './personnel';

export function assertSuperAdmin(cityId?:string){
 if(matrixStore.currentUser?.role!=='HMS_SUPER_ADMIN')throw new Error('Super Admin access is required.');
 if(cityId&&!matrixStore.getCities().some(c=>c.id===cityId))throw new Error('Choose an authorized city.');
}
export async function saveCityAdministrator(cityId:string,input:{name:string;email:string;password?:string},id?:string){
 assertSuperAdmin(cityId);
 if(!input.name.trim()||!/^\S+@\S+\.\S+$/.test(input.email))throw new Error('Enter the administrator name and a valid email.');
 if((!id||input.password)&&(!input.password||input.password.length<6))throw new Error('Use a password of at least six characters.');
 const body={name:input.name.trim(),email:input.email.trim().toLowerCase(),...(input.password?{password:input.password}:{})};
 const result=await writeApi(`/hms/cities/${encodeURIComponent(cityId)}/admins${id?`/${encodeURIComponent(id)}`:''}`,id?'PATCH':'POST',body);
 try{await matrixStore.refreshCityCatalog();}catch(e){return {...result,refreshWarning:'Administrator saved. Refresh the city directory to see the latest details.'};}return result;
}
export function credentialPassword(raw:any):string{
 const value=raw.plainPassword||raw.password;
 return typeof value==='string'&&value&&!/^\$(?:2[aby]\$|argon2)|^(?:scrypt|pbkdf2)[:$]/i.test(value)?value:'Not available';
}
export function credentialRows(raw:any[],city:City,selected:User[],zones:Zone[],wards:Ward[]){
 const allowed=new Set(selected.filter(u=>u.cityId===city.id).map(u=>`${u.id}:${u.role}`));
 return raw.filter(u=>u.cityId===city.id&&allowed.has(`${u.id}:${u.role}`)).map(u=>{
  const current=selected.find(p=>p.id===u.id&&p.role===u.role)!;const scope=personnelScope(current,wards);
  return [u.name||current.name,u.email||'',u.phone||'',city.name,scopeNames(scope.zoneIds,zones),scopeNames(scope.wardIds,wards),(u.modules||[]).map((m:any)=>PERSONNEL_MODULE_LABELS[m.key||m.name]||m.key||m.name).join('; '),credentialPassword(u)];
 });
}
export async function downloadPersonnelCredentials(city:City,selected:User[],zones:Zone[],wards:Ward[]){
 const user=matrixStore.currentUser;
 if(!user||user.role!=='CITY_ADMIN'||user.cityId!==city.id)throw new Error('Use this city administrator account to download its users.');
 if(!selected.some(u=>u.cityId===city.id))throw new Error('No matching users to download.');
 const result=await writeApi('/city/users/credentials-export','POST',{userIds:[...new Set(selected.filter(u=>u.cityId===city.id).map(u=>u.id))]});
 if(matrixStore.currentUser?.id!==user.id||matrixStore.currentUser?.cityId!==city.id||matrixStore.currentUser?.role!=='CITY_ADMIN')throw new Error('Your account changed. Download cancelled.');
 if(!Array.isArray(result.users))throw new Error('The user directory could not be loaded.');
 const rows=credentialRows(result.users,city,selected,zones,wards);
 if(!rows.length)throw new Error('No matching users to download.');
 await downloadWorkbook('user-credentials.xlsx',['Name','Email','Mobile','City','Zones','Wards','Assigned modules','Password'],rows,'User credentials');
}
export function platformCounts(cities:City[],users:User[]){
 const people=users.filter(u=>!u.isDeleted&&['active','inactive'].includes(u.status)&&u.cityId);
 return {cities:cities.length,active:cities.filter(c=>c.status==='active').length,people:new Set(people.map(u=>u.id)).size,admins:new Set(people.filter(u=>u.role==='CITY_ADMIN').map(u=>`${u.id}:${u.cityId}`)).size,pending:new Set(users.filter(u=>u.status==='pending_approval').map(u=>u.id)).size,withoutAdmin:cities.filter(c=>!c.adminIds.length&&!people.some(u=>u.role==='CITY_ADMIN'&&u.cityId===c.id)).length,withoutModules:cities.filter(c=>!c.enabledModules.length&&!c.enabledProducts.some(p=>p!=='municipal_operations')).length};
}
