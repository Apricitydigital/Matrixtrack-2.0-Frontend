import React,{useEffect,useState} from 'react';
import {Modal} from '../common/Modal';
import {MultiSelectDropdown} from '../common/MultiSelectDropdown';
import {api,writeApi} from '../../services/api';
import type {Ward,Zone} from '../../types';

type Level='city'|'zone'|'ward';
type TargetRole='SUPERVISOR'|'QC';
interface Props {isOpen:boolean;onClose:()=>void;onSaved:()=>void;zones:Zone[];wards:Ward[]}
interface Summary {targets:number;percentTargets:number;percents:number[]}
const ROLES:{id:TargetRole;label:string;hint:string}[]=[
  {id:'SUPERVISOR',label:'Daroga',hint:'Percentage of the locations assigned to each Daroga, every day.'},
  {id:'QC',label:'SI',hint:'Percentage of the reports waiting for review, every day.'}
];

/** ULB officer sets a percentage target for the whole city, chosen zones or chosen wards. */
export function UpdateTargetModal({isOpen,onClose,onSaved,zones,wards}:Props){
  const [role,setRole]=useState<TargetRole>('SUPERVISOR'),[level,setLevel]=useState<Level>('city'),[zoneIds,setZoneIds]=useState<string[]>([]),[wardIds,setWardIds]=useState<string[]>([]),[percent,setPercent]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(''),[summary,setSummary]=useState<Summary|null>(null);
  const area=level==='city'?{zoneIds:[] as string[],wardIds:[] as string[]}:level==='zone'?{zoneIds,wardIds:[] as string[]}:{zoneIds:[] as string[],wardIds};
  const needsArea=level!=='city'&&!(level==='zone'?zoneIds:wardIds).length;
  const key=`${role}|${level}|${area.zoneIds.join()}|${area.wardIds.join()}`;
  useEffect(()=>{if(isOpen){setError('');setDone('');}},[isOpen]);
  useEffect(()=>{
    if(!isOpen||needsArea){setSummary(null);return;}
    const c=new AbortController();
    api(`/city/targets/percent-scope?role=${role}&zoneIds=${area.zoneIds.join(',')}&wardIds=${area.wardIds.join(',')}`,{signal:c.signal}).then(setSummary).catch(()=>{if(!c.signal.aborted)setSummary(null);});
    return ()=>c.abort();
  },[isOpen,key,done]);
  const value=Number(percent),valid=Number.isInteger(value)&&value>=1&&value<=100;
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;setError('');setDone('');
    if(needsArea){setError(`Select at least one ${level}.`);return;}
    if(!valid){setError('Enter a whole percentage from 1 to 100.');return;}
    setBusy(true);
    try{
      const r:any=await writeApi('/city/targets/percent-scope','POST',{role,percent:value,...area});
      const skipped=Array.isArray(r?.skipped)?r.skipped.length:0;
      setDone(`${ROLES.find(x=>x.id===role)!.label} target set to ${value}%. ${r?.updated??0} updated, ${r?.created??0} created${skipped?`, ${skipped} skipped`:''}.`);
      onSaved();
    }catch(err){setError(err instanceof Error?err.message:'Unable to update the target.');}finally{setBusy(false);}
  };
  const current=summary==null?null:summary.percents.length?`Current: ${summary.percents.join('%, ')}% (${summary.percentTargets} of ${summary.targets} targets)`:summary.targets?'Current targets are fixed numbers, not percentages.':'No target set yet for this selection.';
  return <Modal isOpen={isOpen} onClose={onClose} title="Update target" description="Set the daily target as a percentage." maxWidth="md">
    <form className="update-target-form" onSubmit={save}>
      <div role="tablist" aria-label="Target for" className="update-target-tabs">{ROLES.map(r=><button type="button" role="tab" aria-selected={role===r.id} className={role===r.id?'active':''} key={r.id} onClick={()=>{setRole(r.id);setDone('');}}>{r.label}</button>)}</div>
      <p className="update-target-hint">{ROLES.find(r=>r.id===role)!.hint}</p>
      <div role="tablist" aria-label="Area" className="update-target-tabs">{(['city','zone','ward'] as Level[]).map(l=><button type="button" role="tab" aria-selected={level===l} className={level===l?'active':''} key={l} onClick={()=>{setLevel(l);setDone('');}}>{l==='city'?'Overall city':l==='zone'?'Zone':'Ward'}</button>)}</div>
      {level==='zone'&&<MultiSelectDropdown label="Zones" options={zones.map(z=>[z.id,z.name])} selected={zoneIds} onChange={setZoneIds}/>}
      {level==='ward'&&<MultiSelectDropdown label="Wards" options={wards.map(w=>[w.id,w.name])} selected={wardIds} onChange={setWardIds}/>}
      <label className="update-target-percent"><span>Target (%)</span><input type="number" inputMode="numeric" min={1} max={100} step={1} value={percent} onChange={e=>setPercent(e.target.value)} placeholder="e.g. 80" required/></label>
      {current&&<p className="update-target-hint">{current}</p>}
      {error&&<p role="alert" className="update-target-error">{error}</p>}
      {done&&<p role="status" className="update-target-done">{done}</p>}
      <div className="update-target-actions"><button type="button" onClick={onClose}>Close</button><button type="submit" disabled={busy||needsArea||!valid}>{busy?'Saving…':'Save target'}</button></div>
    </form>
  </Modal>;
}
