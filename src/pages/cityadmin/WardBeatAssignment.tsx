import React,{useEffect,useState} from 'react';
import type {City,Zone,Ward} from '../../types';
import {Modal} from '../../components/common/Modal';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {geographyOrder} from '../../services/wardInspections';
import {loadWardAssignment,planWardAssignment,saveWardAssignment,type WardAssignmentSnapshot,type WardAssignmentMode} from '../../services/wardBeatAssignments';

export function WardBeatAssignment({city,zones,wards,initialZone='',initialWard='',onClose,onSaved}:{city:City;zones:Zone[];wards:Ward[];initialZone?:string;initialWard?:string;onClose:()=>void;onSaved:(message:string)=>void}) {
 const [zone,setZone]=useState(initialZone),[ward,setWard]=useState(initialWard),[revision,setRevision]=useState(0);
 const [snapshot,setSnapshot]=useState<WardAssignmentSnapshot|null>(null),[selected,setSelected]=useState<string[]>([]),[mode,setMode]=useState<WardAssignmentMode>('add'),[query,setQuery]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[review,setReview]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();setSnapshot(null);setSelected([]);setReview(false);setQuery('');setError('');
  if(!zone||!ward){setLoading(false);return()=>controller.abort();}
  setLoading(true);
  loadWardAssignment({cityId:city.id,zoneId:zone,wardId:ward},controller.signal).then(data=>{if(!controller.signal.aborted)setSnapshot(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[city.id,zone,ward,revision]);
 const plan=snapshot&&selected.length?planWardAssignmentSafe():null;
 function planWardAssignmentSafe(){try{return planWardAssignment(snapshot!,selected,mode);}catch{return null;}}
 const paging=usePagination(plan?.rows||[],JSON.stringify([zone,ward,selected,mode,revision]));
 const save=async()=>{
  if(saving||!review||!plan)return;
  setSaving(true);setError('');
  try{const result=await saveWardAssignment(plan);onSaved(`${result.darogaCount} Daroga${result.darogaCount===1?'':'s'} ${mode==='add'?'added':'assigned'} jointly to all ${result.beatCount} Beats in ${snapshot!.wardName}.${result.refreshError?' '+result.refreshError:''}`);}
  catch(e){setError(e instanceof Error?e.message:'The assignment could not be confirmed. Reload the Ward before retrying.');setReview(false);}
  finally{setSaving(false);}
 };
 return <Modal isOpen onClose={()=>!saving&&onClose()} title="Assign Darogas to entire Ward" description="Every selected Daroga will share every current approved Beat in this Ward." maxWidth="4xl"><div className="space-y-5" data-ward-assignment>
  <div className="grid sm:grid-cols-2 gap-4"><label>Zone<select aria-label="Assignment Zone" className="workspace-input w-full" value={zone} disabled={saving||review} onChange={e=>{setZone(e.target.value);setWard('');}}><option value="">Choose Zone</option>{zones.filter(z=>z.cityId===city.id).sort(geographyOrder).map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label><label>Ward<select aria-label="Assignment Ward" className="workspace-input w-full" value={ward} disabled={!zone||saving||review} onChange={e=>setWard(e.target.value)}><option value="">Choose Ward</option>{wards.filter(w=>w.cityId===city.id&&w.zoneId===zone).sort(geographyOrder).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>
  {loading&&<p role="status">Loading all Ward Beats and eligible Darogas...</p>}
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><p>{error}</p>{ward&&!saving&&<button className="workspace-secondary-button mt-3" onClick={()=>setRevision(v=>v+1)}>Reload Ward preview</button>}</div>}
  {snapshot&&<><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><strong>{snapshot.wardName}</strong><p className="text-sm mt-1">{snapshot.beats.length} current approved Beats across all Areas. Table search, assignment filters and pagination do not limit this selection.</p></div>
   {!snapshot.beats.length?<p>This Ward has no approved Beats. Import or register Beats first.</p>:<>
    {!review&&<><fieldset disabled={saving}><legend className="font-semibold mb-2">Select Darogas</legend><input aria-label="Search Ward Darogas" className="workspace-input w-full mb-3" placeholder="Search Daroga name" value={query} onChange={e=>setQuery(e.target.value)}/><div className="max-h-52 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">{snapshot.candidates.filter(u=>u.name.toLowerCase().includes(query.toLowerCase())).map(u=><label key={u.id} className="flex items-center gap-3 p-3 cursor-pointer"><input type="checkbox" aria-label={`Assign ${u.name} to entire Ward`} checked={selected.includes(u.id)} disabled={!selected.includes(u.id)&&selected.length>=100} onChange={e=>setSelected(ids=>e.target.checked?[...ids,u.id]:ids.filter(id=>id!==u.id))}/><span>{u.name}<small className="block text-slate-500">Currently on {snapshot.beats.filter(b=>b.supervisors.some(s=>s.id===u.id)).length} Ward Beats</small></span></label>)}</div>{!snapshot.candidates.length&&<p className="text-sm mt-2">No eligible Sweeping Darogas are mapped to this Ward. Check their Ward and module assignments in Municipal Users.</p>}<p className="text-sm mt-2">{selected.length} selected. Each selected Daroga will receive all {snapshot.beats.length} Beats.</p></fieldset>
    <label className="block">Existing assignments<select aria-label="Ward assignment mode" className="workspace-input w-full" value={mode} disabled={saving} onChange={e=>setMode(e.target.value as WardAssignmentMode)}><option value="add">Add selected Darogas; keep existing Darogas</option><option value="replace">Replace existing Darogas with the selected team</option></select></label></>}
    {review&&plan&&<><div className={`rounded-xl border p-4 ${mode==='replace'?'border-amber-200 bg-amber-50 text-amber-900':'border-teal-200 bg-teal-50 text-teal-900'}`}><strong>{plan.selected.map(u=>u.name).join(', ')}</strong><p className="mt-1">Each will share all {plan.rows.length} Beats in {snapshot.wardName}. {mode==='add'?'Existing Darogas will remain assigned.':'Existing whole-Beat and sub-beat Darogas will be replaced by this shared team.'} Employee assignments stay unchanged.</p></div><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead><tr><th>Beat</th><th>Darogas after saving</th></tr></thead><tbody>{paging.rows.map(row=><tr key={row.beatId}><td>{row.beatName}</td><td>{row.supervisors.map(u=>u.name).join(', ')}</td></tr>)}</tbody></table><Pagination {...paging} noun="Beats"/></div></>}
    <p className="text-sm text-slate-500">This applies to Beats registered now. If more Beats are imported later, run Ward assignment again to include them. Each Daroga can see and inspect the shared Beats in their app.</p>
   </>}
  </>}
  <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4"><button className="workspace-secondary-button" disabled={saving} onClick={onClose}>Cancel</button>{review?<><button className="workspace-secondary-button" disabled={saving} onClick={()=>setReview(false)}>Back</button><button className="workspace-primary-button" disabled={saving||!plan} onClick={()=>void save()}>{saving?'Saving shared assignments...':`Assign ${selected.length} Darogas to all ${snapshot?.beats.length||0} Beats`}</button></>:<button className="workspace-primary-button" disabled={loading||saving||!plan} onClick={()=>{setError('');setReview(true);}}>Review shared assignment</button>}</div>
 </div></Modal>;
}
