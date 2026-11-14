import React,{useEffect,useMemo,useState} from 'react';
import {api,clearReadCache} from '../../services/api';
import {assertCityAdmin,validateKml} from '../../services/citySetup';
import {Modal} from '../../components/common/Modal';
import {CityMap} from '../../components/map/CityMap';

type Node={id:string;parentId:string|null;level:'ZONE'|'WARD';name:string;displayName?:string;boundaryName?:string;boundary:any};
type Row={sourceIndex:number;name:string;geometry:any;nodeId:string;zoneId:string;include:boolean;replace:boolean};
export function BoundaryUpload({cityId,onClose}:{cityId:string;onClose:()=>void}){
  const [nodes,setNodes]=useState<Node[]>([]),[rows,setRows]=useState<Row[]>([]),[file,setFile]=useState<File|null>(null);
  const [kind,setKind]=useState<'WARD'|'ZONE'>('WARD'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[focused,setFocused]=useState<number|null>(null),[removing,setRemoving]=useState<Node|null>(null);
  const refresh=async()=>{clearReadCache();const result=await api<{nodes:Node[]}>('/city/geo/boundaries');setNodes(result.nodes);};
  useEffect(()=>{let active=true;setBusy(true);api<{nodes:Node[]}>('/city/geo/boundaries').then(d=>{if(active)setNodes(d.nodes);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[cityId]);
  const patch=(index:number,value:Partial<Row>)=>setRows(current=>current.map((r,i)=>i===index?{...r,...value}:r));
  const destinations=nodes.filter(n=>n.level===kind),zones=nodes.filter(n=>n.level==='ZONE');
  const boundaries=useMemo(()=>rows.length?rows.filter(r=>focused===null?r.include:r.sourceIndex===focused).map(r=>({id:String(r.sourceIndex),name:`${r.sourceIndex}. ${r.name||'Unnamed boundary'}`,geometry:r.geometry})):nodes.filter(n=>n.level===kind&&n.boundary).map(n=>({id:n.id,name:n.boundaryName||n.name,geometry:n.boundary})),[rows,nodes,kind,focused]);
  const run=async(work:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setMessage('');try{assertCityAdmin(cityId);await work();}catch(e){setError(e instanceof Error?e.message:'Unable to save boundaries.');}finally{setBusy(false);}};
  const preview=()=>run(async()=>{
    if(!file)throw new Error('Choose a KML or KMZ file.');validateKml(file);
    const form=new FormData();form.set('kmlFile',file);
    const result=await api<{features:Row[]}>('/city/geo/boundaries/import-preview',{method:'POST',body:form});
    setRows(result.features.map(r=>{const matches=destinations.filter(n=>[n.name,n.displayName].some(name=>name?.trim().toLowerCase()===r.name.toLowerCase()));const node=matches.length===1?matches[0]:undefined;return {...r,nodeId:node?.id||'',zoneId:node?.parentId||'',include:true,replace:false};}));setFocused(null);
  });
  const save=()=>run(async()=>{
    const selected=rows.filter(r=>r.include);
    if(!file||!selected.length)throw new Error('Select at least one boundary.');
    if(selected.some(r=>!r.nodeId||!r.name.trim()))throw new Error('Give every selected boundary a name and destination.');
    if(new Set(selected.map(r=>r.nodeId)).size!==selected.length)throw new Error('Choose a different destination for each boundary.');
    if(selected.some(r=>nodes.find(n=>n.id===r.nodeId)?.boundary&&!r.replace))throw new Error('Confirm replacement for destinations with an existing boundary.');
    const form=new FormData();form.set('kmlFile',file);form.set('mappings',JSON.stringify(selected.map(({sourceIndex,nodeId,name,replace})=>({sourceIndex,nodeId,name,replace}))));
    const result=await api<{saved:number}>('/city/geo/boundaries/import',{method:'POST',body:form});setRows([]);setFocused(null);setMessage(`${result.saved} boundaries saved.`);
    await refresh().catch(()=>setError('Boundaries were saved, but the list could not refresh. Reopen this window to reload it.'));
  });
  return <Modal isOpen onClose={()=>{if(!busy)onClose();}} title="Zone & Ward Boundaries" maxWidth="4xl"><div className="space-y-4">
    <p className="text-sm text-slate-600">Upload one or all Ward boundaries together. Map each polygon to an existing Ward and its Zone. Zone boundaries are automatically combined from uploaded Wards. You can also upload Zone boundaries directly.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}{message&&<p role="status" className="text-green-700">{message}</p>}
    <fieldset disabled={busy} className="space-y-4">
      <label className="block">Boundary type<select className="workspace-input w-full" value={kind} onChange={e=>{setKind(e.target.value as 'WARD'|'ZONE');setRows([]);setFocused(null);setRemoving(null);}}><option value="WARD">Ward boundaries</option><option value="ZONE">Zone boundaries</option></select></label>
      <label className="block">KML / KMZ (up to 10 MB)<input aria-label="Boundary KML file" type="file" accept=".kml,.kmz" className="block mt-2" onChange={e=>{setFile(e.target.files?.[0]||null);setRows([]);setFocused(null);setError('');}}/></label>
      <button className="workspace-secondary-button" disabled={!file||busy} onClick={()=>void preview()}>Preview boundaries</button>
      {!!boundaries.length&&<div className="map-explorer"><CityMap assets={[]} onSelect={()=>{}} boundaries={boundaries}/></div>}
      {!!rows.length&&<><p className="text-sm">{rows.filter(r=>r.include).length} / {rows.length} boundaries selected. Names label boundaries; existing Ward and Zone names stay unchanged.</p><button className="workspace-secondary-button" onClick={()=>setFocused(null)}>Show all selected boundaries</button>
        <div className="space-y-3 max-h-96 overflow-y-auto">{rows.map((r,index)=>{const target=nodes.find(n=>n.id===r.nodeId);return <div key={r.sourceIndex} className="border rounded-lg p-3 space-y-2">
          <div className="flex gap-3 items-center"><label><input type="checkbox" checked={r.include} onChange={e=>patch(index,{include:e.target.checked})}/> Boundary {r.sourceIndex}</label><button className="workspace-secondary-button" onClick={()=>setFocused(r.sourceIndex)}>Locate on map</button></div>
          <label className="block">Boundary name<input aria-label={`Boundary ${r.sourceIndex} name`} className="workspace-input w-full" value={r.name} maxLength={200} placeholder="Enter boundary name" onChange={e=>patch(index,{name:e.target.value})}/></label>
          {kind==='WARD'&&<label className="block">Zone<select aria-label={`Boundary ${r.sourceIndex} zone`} className="workspace-input w-full" value={r.zoneId} onChange={e=>patch(index,{zoneId:e.target.value,nodeId:'',replace:false})}><option value="">Choose Zone</option>{zones.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>}
          <label className="block">{kind==='WARD'?'Ward':'Zone'} destination<select aria-label={`Boundary ${r.sourceIndex} destination`} className="workspace-input w-full" value={r.nodeId} onChange={e=>patch(index,{nodeId:e.target.value,replace:false})}><option value="">Choose {kind==='WARD'?'Ward':'Zone'}</option>{destinations.filter(n=>kind==='ZONE'||n.parentId===r.zoneId).map(n=><option key={n.id} value={n.id}>{n.name}{n.displayName?` - ${n.displayName}`:''}{n.boundary?' (boundary exists)':''}</option>)}</select></label>
          {target?.boundary&&<label className="block text-amber-800"><input type="checkbox" checked={r.replace} onChange={e=>patch(index,{replace:e.target.checked})}/> Replace this destination’s existing boundary</label>}
        </div>;})}</div><button className="workspace-primary-button" onClick={()=>void save()}>Save selected boundaries</button></>}
      <h3 className="font-semibold">Uploaded {kind==='WARD'?'Ward':'Zone'} boundaries</h3>
      <p className="text-sm text-slate-600">Deleting a boundary keeps the Ward, Zone, Beats, assignments and reports. Derived Zone boundaries update automatically.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">{destinations.filter(n=>n.boundary).map(n=><div key={n.id} className="flex justify-between items-center gap-3 border rounded p-2"><span>{n.name} · {n.boundaryName}</span><button className="workspace-secondary-button" onClick={()=>setRemoving(n)}>Delete boundary only</button></div>)}{!destinations.some(n=>n.boundary)&&<p className="text-sm text-slate-500">No uploaded boundaries.</p>}</div>
      {removing&&<div className="border border-amber-300 rounded p-3 space-y-3"><p>Delete only the boundary for {removing.name}?</p><button className="workspace-secondary-button" onClick={()=>setRemoving(null)}>Cancel</button> <button className="workspace-primary-button" onClick={()=>void run(async()=>{await api(`/city/geo/boundaries/${encodeURIComponent(removing.id)}`,{method:'DELETE'});setRemoving(null);setMessage('Boundary deleted. Geography and operational data are preserved.');await refresh().catch(()=>setError('The boundary was deleted, but the list could not refresh. Reopen this window to reload it.'));})}>Confirm delete boundary</button></div>}
    </fieldset>{busy&&<p role="status">Processing boundaries…</p>}
  </div></Modal>;
}
