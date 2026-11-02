import React,{useEffect,useState} from 'react';
import type {City,User} from '../../types';
import {api} from '../../services/api';
import {mapGeography,mapUser} from '../../services/adapters';
import {PERSONNEL_MODULE_LABELS} from '../../services/personnel';
import {Modal} from '../../components/common/Modal';

export function PlatformUserEditor({user,city,onClose,onSaved}:{user:User;city:City;onClose:()=>void;onSaved:()=>void}){
 const [name,setName]=useState(user.name),[phone,setPhone]=useState(user.phone),[zones,setZones]=useState<any[]>([]),[wards,setWards]=useState<any[]>([]),[catalog,setCatalog]=useState<any[]>([]);
 const [zoneIds,setZoneIds]=useState<string[]>([]),[wardIds,setWardIds]=useState<string[]>([]),[access,setAccess]=useState<{moduleId:string;canWrite:boolean;zoneIds:string[];wardIds:string[]}[]>([]);
 const [loading,setLoading]=useState(true),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const headers={'x-city-id':city.id};
 useEffect(()=>{const c=new AbortController();Promise.all([api('/city/geo',{headers,signal:c.signal}),api('/city/modules',{headers,signal:c.signal}),api('/city/users',{headers,signal:c.signal})]).then(([geo,modules,people])=>{
  if(c.signal.aborted)return;const current=(people.users||[]).find((u:any)=>u.id===user.id&&u.role===user.role);if(!current)throw Error('This city role is no longer available. Refresh the directory.');
  const saved=mapUser(current,city.id),nodes=mapGeography(geo.nodes,city.id);setZones(nodes.zones.sort((a,b)=>a.zoneNumber-b.zoneNumber));setWards(nodes.wards.sort((a,b)=>a.wardNumber-b.wardNumber));setCatalog(modules.filter((m:any)=>m.enabled));
  setName(saved.name);setPhone(saved.phone);setZoneIds(saved.assignedZoneIds||[]);setWardIds(saved.assignedWardIds||[]);
  setAccess((saved.moduleAssignments||[]).filter(m=>modules.some((x:any)=>x.enabled&&x.id===m.id)).map(m=>({moduleId:m.id!,canWrite:user.role==='COMMISSIONER'?false:['SUPERVISOR','EMPLOYEE','QC'].includes(user.role)?!!m.canWrite:true,zoneIds:m.zoneIds,wardIds:m.wardIds})));setLoaded(true);setLoading(false);
 }).catch(e=>{if(!c.signal.aborted){setError(e.message);setLoading(false);}});return()=>c.abort();},[city.id,user.id,user.role]);
 const toggle=(ids:string[],id:string)=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
 const scope=(label:string,z:string[],w:string[],change:(z:string[],w:string[])=>void)=><div className="grid sm:grid-cols-2 gap-3"><fieldset className="border rounded-lg p-3 max-h-44 overflow-auto"><legend>{label} Zones</legend>{zones.map(zone=><label className="flex gap-2 py-1" key={zone.id}><input type="checkbox" aria-label={`${label} ${zone.name}`} checked={z.includes(zone.id)} onChange={()=>{const next=toggle(z,zone.id);change(next,w.filter(id=>wards.some(ward=>ward.id===id&&next.includes(ward.zoneId))));}}/>{zone.name}</label>)}</fieldset><fieldset className="border rounded-lg p-3 max-h-44 overflow-auto"><legend>{label} Wards</legend>{wards.filter(ward=>z.includes(ward.zoneId)).map(ward=><label className="flex gap-2 py-1" key={ward.id}><input type="checkbox" aria-label={`${label} ${ward.name}`} checked={w.includes(ward.id)} onChange={()=>change(z,toggle(w,ward.id))}/>{ward.name}</label>)}</fieldset></div>;
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(loading||busy)return;setBusy(true);setError('');try{
  if(!name.trim())throw Error('Enter a name.');
  if(phone&&!/^\d{10}$/.test(phone))throw Error('Phone must contain 10 digits.');
  if(['QC','ULB_OFFICER'].includes(user.role)&&(!zoneIds.length||!wardIds.length))throw Error('Select a Zone and Ward.');
  if(user.role==='ACTION_OFFICER'&&!access.length)throw Error('IEC users require at least one module.');
  if(access.some(m=>m.zoneIds.some(id=>!zoneIds.includes(id))||m.wardIds.some(id=>!wardIds.includes(id))))throw Error('Module scopes must stay inside the selected city assignment.');
  await api(`/city/users/${encodeURIComponent(user.id)}`,{method:'PATCH',headers,body:JSON.stringify({assignmentRole:user.role,name:name.trim(),phone,zoneIds,wardIds,modules:access})});
  const saved=await api('/city/users',{headers,cache:'no-store'}),actual=(saved.users||[]).find((u:any)=>u.id===user.id&&u.role===user.role);
  if(!actual||actual.name.trim().toLowerCase()!==name.trim().replace(/\s+/g,' ').toLowerCase()||JSON.stringify([...(actual.zoneIds||[])].sort())!==JSON.stringify([...zoneIds].sort())||JSON.stringify([...(actual.wardIds||[])].sort())!==JSON.stringify([...wardIds].sort()))throw Error('The saved assignment did not match. Refresh and review the user.');
  const scopeRole=['QC','ULB_OFFICER'].includes(user.role);
  const expected=access.map(m=>[m.moduleId,m.canWrite,scopeRole?[...m.zoneIds].sort():[],scopeRole?[...m.wardIds].sort():[]]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  const returned=(actual.modules||[]).filter((m:any)=>catalog.some(c=>c.id===m.id)).map((m:any)=>[m.id,m.canWrite,scopeRole?[...(m.zoneIds||[])].sort():[],scopeRole?[...(m.wardIds||[])].sort():[]]).sort((a:any[],b:any[])=>String(a[0]).localeCompare(String(b[0])));
  if(JSON.stringify(expected)!==JSON.stringify(returned))throw Error('Saved module permissions did not match. Refresh and review the user.');
  onSaved();
 }catch(e){setError(e instanceof Error?e.message:'Unable to save user.');}finally{setBusy(false);}};
 return <Modal isOpen onClose={()=>!busy&&onClose()} title="Edit user and assignments" description={`${user.name} · ${city.name}`} maxWidth="4xl"><form onSubmit={submit} className="space-y-4">
  {error&&<p role="alert" className="text-red-700">{error}</p>}{loading?<p>Loading saved assignments…</p>:<>
  <div className="grid sm:grid-cols-2 gap-3"><label>Name<input aria-label="Edit personnel name" required className="workspace-input w-full" value={name} onChange={e=>setName(e.target.value)}/></label><label>Phone<input aria-label="Edit personnel phone" type="tel" className="workspace-input w-full" value={phone} onChange={e=>setPhone(e.target.value)}/></label></div>
  {scope('City assignment',zoneIds,wardIds,(z,w)=>{setZoneIds(z);setWardIds(w);setAccess(prev=>prev.map(m=>({...m,zoneIds:[...z],wardIds:[...w]})));})}
  <h3>Assigned modules</h3>{catalog.map(m=>{const row=access.find(x=>x.moduleId===m.id);return <div className="border rounded-lg p-3 space-y-3" key={m.id}><div className="flex justify-between gap-3"><label className="flex gap-2"><input aria-label={`Edit assign ${m.key}`} type="checkbox" checked={!!row} onChange={e=>setAccess(prev=>e.target.checked?[...prev,{moduleId:m.id,canWrite:user.role!=='COMMISSIONER',zoneIds:[...zoneIds],wardIds:[...wardIds]}]:prev.filter(x=>x.moduleId!==m.id))}/>{PERSONNEL_MODULE_LABELS[m.key]||m.name}</label>{row&&<label className="flex gap-2"><input type="checkbox" disabled={!['SUPERVISOR','EMPLOYEE','QC'].includes(user.role)} checked={row.canWrite} onChange={e=>setAccess(prev=>prev.map(x=>x.moduleId===m.id?{...x,canWrite:e.target.checked}:x))}/>Allow work submission</label>}</div>{row&&['QC','ULB_OFFICER'].includes(user.role)&&scope(m.key,row.zoneIds,row.wardIds,(z,w)=>setAccess(prev=>prev.map(x=>x.moduleId===m.id?{...x,zoneIds:z,wardIds:w}:x)))}</div>;})}</>}
  <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="workspace-primary-button" disabled={loading||busy||!loaded}>{busy?'Saving…':'Save changes'}</button></div>
 </form></Modal>;
}
