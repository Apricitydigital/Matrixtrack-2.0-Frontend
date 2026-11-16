import React,{useEffect,useState} from 'react';
import {Modal} from '../common/Modal';
import {MultiSelectDropdown} from '../common/MultiSelectDropdown';
import {api} from '../../services/api';
import type {Ward,Zone} from '../../types';

type Level='city'|'zone'|'ward';
type TargetRole='SUPERVISOR'|'QC';
interface Props {isOpen:boolean;onClose:()=>void;onSaved:()=>void;zones:Zone[];wards:Ward[];cityId:string}
interface Summary {targets:number;percentTargets:number;percents:number[];defaultPercent?:number|null}
const ROLES:{id:TargetRole;label:string;hint:string}[]=[
  {id:'SUPERVISOR',label:'Daroga',hint:'Percentage of the locations assigned to each Daroga, every day.'},
  {id:'QC',label:'SI',hint:'Percentage of the reports waiting for review, every day.'}
];

/** ULB officer sets a percentage target for the whole city, chosen zones or chosen wards. */
export function UpdateTargetModal({isOpen,onClose,onSaved,zones,wards,cityId}:Props){
  const [role,setRole]=useState<TargetRole>('SUPERVISOR'),[level,setLevel]=useState<Level>('city'),[zoneIds,setZoneIds]=useState<string[]>([]),[wardIds,setWardIds]=useState<string[]>([]),[percent,setPercent]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(''),[summary,setSummary]=useState<Summary|null>(null);
  const area=level==='city'?{zoneIds:[] as string[],wardIds:[] as string[]}:level==='zone'?{zoneIds,wardIds:[] as string[]}:{zoneIds:[] as string[],wardIds};
  const needsArea=level!=='city'&&!(level==='zone'?zoneIds:wardIds).length;
  const [loadedKey,setLoadedKey]=useState(''),[loadError,setLoadError]=useState(''),[refresh,setRefresh]=useState(0);
  const key=`${cityId}|${role}|${level}|${area.zoneIds.join()}|${area.wardIds.join()}`;
  const ready=loadedKey===key&&summary!==null;
  useEffect(()=>{setError('');setDone('');},[isOpen,key]);
  useEffect(()=>{
    setSummary(null);setLoadedKey('');setLoadError('');setPercent('');
    if(!isOpen||needsArea)return;
    const c=new AbortController();
    api<Summary>(`/city/targets/percent-scope?role=${role}&zoneIds=${area.zoneIds.join(',')}&wardIds=${area.wardIds.join(',')}`,{signal:c.signal,headers:{'x-city-id':cityId},cache:'no-store'}).then(value=>{
      if(c.signal.aborted)return;
      if(!value||!Array.isArray(value.percents)||!Number.isInteger(value.targets)||!Number.isInteger(value.percentTargets))throw new Error('Invalid target settings response.');
      const current=value.targets===0&&role==='QC'?value.defaultPercent:value.percentTargets===value.targets&&value.percents.length===1?value.percents[0]:null;
      setSummary(value);setLoadedKey(key);setPercent(typeof current==='number'&&current>=1&&current<=100?String(current):'');
    }).catch(()=>{if(!c.signal.aborted)setLoadError('Unable to load the current target. Retry before saving.');});
    return ()=>c.abort();
  },[isOpen,key,refresh]);
  const value=Number(percent),valid=Number.isInteger(value)&&value>=1&&value<=100;
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy||!ready)return;setError('');setDone('');
    if(needsArea){setError(`Select at least one ${level}.`);return;}
    if(!valid){setError('Enter a whole percentage from 1 to 100.');return;}
    setBusy(true);
    try{
      const r:any=await api('/city/targets/percent-scope',{method:'POST',headers:{'x-city-id':cityId},body:JSON.stringify({role,percent:value,...area})});
      const skipped=Array.isArray(r?.skipped)?r.skipped.length:0;
      const changed=(r?.updated??0)+(r?.created??0);
      setDone(changed?`${ROLES.find(x=>x.id===role)!.label} target saved at ${value}%. ${r?.updated??0} updated, ${r?.created??0} created${skipped?`, ${skipped} skipped`:''}.`:'No targets changed. The selected officers may already have this setting, or no matching assignment was found.');
      if(skipped)setError(`Some targets were not saved: ${r.skipped.join('; ')}`);
      setRefresh(n=>n+1);onSaved();
    }catch(err){setError(err instanceof Error?err.message:'Unable to update the target.');}finally{setBusy(false);}
  };
  const current=!ready?null:summary.targets===0&&role==='QC'?(summary.defaultPercent!=null?`Current: ${summary.defaultPercent}% automatic daily target. No manual override.`:'Automatic SI target is unavailable.'):summary.percents.length?`Current saved: ${summary.percents.join('%, ')}% (${summary.percentTargets} of ${summary.targets} targets)${summary.percentTargets<summary.targets?'. Other targets use fixed counts.':''}`:summary.targets?'Current targets use fixed counts.':'No target set yet for this selection.';
  return <Modal isOpen={isOpen} onClose={onClose} title="Update target" description="Set the daily target as a percentage." maxWidth="md">
    <form className="update-target-form" onSubmit={save}>
      <div role="tablist" aria-label="Target for" className="update-target-tabs">{ROLES.map(r=><button type="button" role="tab" disabled={busy} aria-selected={role===r.id} className={role===r.id?'active':''} key={r.id} onClick={()=>{setRole(r.id);setDone('');}}>{r.label}</button>)}</div>
      <p className="update-target-hint">{ROLES.find(r=>r.id===role)!.hint}</p>
      <div role="tablist" aria-label="Area" className="update-target-tabs">{(['city','zone','ward'] as Level[]).map(l=><button type="button" role="tab" disabled={busy} aria-selected={level===l} className={level===l?'active':''} key={l} onClick={()=>{setLevel(l);setDone('');}}>{l==='city'?'Overall city':l==='zone'?'Zone':'Ward'}</button>)}</div>
      {level==='zone'&&<MultiSelectDropdown label="Zones" options={zones.map(z=>[z.id,z.name])} selected={zoneIds} onChange={setZoneIds}/>}
      {level==='ward'&&<MultiSelectDropdown label="Wards" options={wards.map(w=>[w.id,w.name])} selected={wardIds} onChange={setWardIds}/>}
      <p className="update-target-hint">{role==='QC'?`${level==='city'?'Applies to assigned SIs across this city.':'Applies to SIs covering the selected area, across their full module review scope.'} New SI overrides apply today; existing targets retain their end date.`:'Applies to assigned Darogas in the selected area until changed.'}</p>
      <label className="update-target-percent"><span>Target (%)</span><input type="number" inputMode="numeric" min={1} max={100} step={1} value={ready?percent:''} disabled={busy||!ready} onChange={e=>setPercent(e.target.value)} placeholder={ready?'Enter percentage':'Loading current target'} required/></label>
      {!needsArea&&!ready&&!loadError&&<p role="status" className="update-target-hint">Loading current target...</p>}
      {loadError&&<p role="alert" className="update-target-error">{loadError} <button type="button" onClick={()=>setRefresh(n=>n+1)}>Retry</button></p>}
      {current&&<p className="update-target-hint">{current}</p>}
      {error&&<p role="alert" className="update-target-error">{error}</p>}
      {done&&<p role="status" className="update-target-done">{done}</p>}
      <div className="update-target-actions"><button type="button" disabled={busy} onClick={onClose}>Close</button><button type="submit" disabled={busy||needsArea||!ready||!valid}>{busy?'Saving…':'Save target'}</button></div>
    </form>
  </Modal>;
}
