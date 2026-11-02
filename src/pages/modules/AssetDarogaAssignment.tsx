import React,{useEffect,useState} from 'react';
import {Modal} from '../../components/common/Modal';
import {api,writeApi} from '../../services/api';
import {assertCityAdmin} from '../../services/citySetup';
import {assignmentError} from '../../services/assignmentError';
import type {MapAsset} from '../../services/operationsMap';
export function AssetDarogaAssignment({cityId,asset,onClose,onSaved}:{cityId:string;asset:MapAsset;onClose:()=>void;onSaved:()=>void}){
 const [data,setData]=useState<any>(null),[ids,setIds]=useState<string[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();setError('');setData(null);assertCityAdmin(cityId);api(`/city/asset-assignments/${asset.module}/${asset.id}`,{signal:c.signal}).then(d=>{if(!c.signal.aborted){setData(d);setIds(d.supervisorIds.filter((id:string)=>d.candidates.some((u:any)=>u.id===id)));}}).catch(e=>{if(!c.signal.aborted)setError(assignmentError(e));});return()=>c.abort();},[cityId,asset.id,asset.module,retry]);
 return <Modal isOpen onClose={()=>!busy&&onClose()} title="Daroga assignment" description={`${asset.name} · ${asset.zoneName} · ${asset.wardName}`} maxWidth="xl"><form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(!data||busy)return;setBusy(true);setError('');try{assertCityAdmin(cityId);await writeApi(`/city/asset-assignments/${asset.module}/${asset.id}`,'PUT',{supervisorIds:ids,expectedRevision:data.revision});onSaved();}catch(e){setError(assignmentError(e));}finally{setBusy(false);}}}>
  {error&&<p role="alert">{error} <button type="button" className="underline" onClick={()=>setRetry(n=>n+1)}>Refresh assignment</button></p>}
  {!data&&!error&&<p role="status">Loading ward Darogas…</p>}
  {data&&<><p className="text-sm">Choose from Darogas assigned to this ward and module.</p>{data.supervisorIds.some((id:string)=>!data.candidates.some((u:any)=>u.id===id))&&<p role="status">A current assignment no longer matches this ward. Review the replacement before saving.</p>}
   {data.multiple?<fieldset className="space-y-2 max-h-64 overflow-auto"><legend className="font-semibold">Darogas</legend>{data.candidates.map((u:any)=><label key={u.id} className="flex gap-2 py-2"><input type="checkbox" checked={ids.includes(u.id)} onChange={e=>setIds(old=>e.target.checked?[...old,u.id]:old.filter(id=>id!==u.id))}/>{u.name}</label>)}</fieldset>:<label>Daroga<select aria-label="Nala Daroga" className="workspace-input w-full" value={ids[0]||''} onChange={e=>setIds(e.target.value?[e.target.value]:[])}><option value="">Not assigned</option>{data.candidates.map((u:any)=><option key={u.id} value={u.id}>{u.name}</option>)}</select><small>Applies to the complete Nala route.</small></label>}
   {!data.candidates.length&&<p>No eligible Daroga is assigned to this ward and module. Update the user’s assignments in Municipal Users first.</p>}
  </>}
  <div className="flex justify-end gap-3"><button type="button" className="workspace-secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="workspace-primary-button" disabled={!data||busy}>{busy?'Saving…':'Save assignment'}</button></div>
 </form></Modal>;
}
