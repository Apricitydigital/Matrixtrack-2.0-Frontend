import React,{useState} from 'react';
import {Modal} from '../../components/common/Modal';
import {writeApi} from '../../services/api';
import {assertCityAdmin,AREA_TYPES} from '../../services/citySetup';
import type {MapAsset} from '../../services/operationsMap';
import type {Zone,Ward} from '../../types';

type EditableModule='toilets'|'litter_bins'|'ctu_gvp';
export const canEditAsset=(module:string)=>module==='toilets'||module==='litter_bins'||module==='ctu_gvp';
const ENDPOINT:Record<EditableModule,(id:string)=>string>={
  ctu_gvp:id=>`/modules/taskforce/feeder-points/${id}`,
  litter_bins:id=>`/modules/twinbin/bins/${id}`,
  toilets:id=>`/modules/toilet/${id}/master`
};

export function AssetEditModal({cityId,module,asset,zones,wards,onClose,onSaved}:{cityId:string;module:EditableModule;asset:MapAsset;zones:Zone[];wards:Ward[];onClose:()=>void;onSaved:()=>void}){
 const raw=asset as any;
 const [name,setName]=useState(asset.name||''),[zone,setZone]=useState(asset.zoneId||''),[ward,setWard]=useState(asset.wardId||''),
  [areaName,setAreaName]=useState(raw.areaName||''),[areaType,setAreaType]=useState(String(raw.areaType||'RESIDENTIAL')),
  [address,setAddress]=useState(module==='toilets'?(raw.address||''):''),
  [lat,setLat]=useState(asset.coordinates?String(asset.coordinates[0]):''),[lng,setLng]=useState(asset.coordinates?String(asset.coordinates[1]):''),
  [busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy)return;setError('');
  const la=Number(lat),ln=Number(lng);
  if(!name.trim())return setError('Location name is required.');
  if(!zone||!ward)return setError('Choose a Zone and Ward.');
  if(lat.trim()===''||lng.trim()===''||!Number.isFinite(la)||!Number.isFinite(ln)||Math.abs(la)>90||Math.abs(ln)>180||(la===0&&ln===0))return setError('Enter valid Latitude and Longitude.');
  const body:Record<string,unknown>={name:name.trim(),zoneId:zone,wardId:ward,latitude:la,longitude:ln};
  if(module!=='toilets'&&areaName.trim())body.areaName=areaName.trim();
  if(module==='ctu_gvp')body.areaType=areaType;
  if(module==='toilets'&&address.trim()!==(raw.address||'').trim())body.address=address.trim();
  setBusy(true);
  try{assertCityAdmin(cityId);await writeApi(ENDPOINT[module](asset.id),'PATCH',body);onSaved();}
  catch(err){setError(err instanceof Error?err.message:'Unable to save changes.');}
  finally{setBusy(false);}
 };
 return <Modal isOpen onClose={()=>!busy&&onClose()} title="Edit location" description={asset.name} maxWidth="2xl"><form onSubmit={submit} className="space-y-4">
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  <div className="grid sm:grid-cols-2 gap-4">
   <label className="sm:col-span-2">Location name<input required className="workspace-input w-full" value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Zone<select required aria-label="Edit Zone" className="workspace-input w-full" value={zone} onChange={e=>{setZone(e.target.value);setWard('');}}><option value="">Choose Zone</option>{zones.filter(z=>z.cityId===cityId).map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
   <label>Ward<select required aria-label="Edit Ward" className="workspace-input w-full" value={ward} onChange={e=>setWard(e.target.value)}><option value="">Choose Ward</option>{wards.filter(w=>w.cityId===cityId&&w.zoneId===zone).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
   {module!=='toilets'&&<label>Area name<input className="workspace-input w-full" value={areaName} onChange={e=>setAreaName(e.target.value)}/></label>}
   {module==='ctu_gvp'&&<label>Area type<select className="workspace-input w-full" value={areaType} onChange={e=>setAreaType(e.target.value)}>{AREA_TYPES.map(t=><option key={t} value={t}>{t.replaceAll('_',' ')}</option>)}</select></label>}
   {module==='toilets'&&<label className="sm:col-span-2">Address<input className="workspace-input w-full" value={address} onChange={e=>setAddress(e.target.value)}/></label>}
   <label>Latitude<input required type="number" step="any" min="-90" max="90" className="workspace-input w-full" value={lat} onChange={e=>setLat(e.target.value)}/></label>
   <label>Longitude<input required type="number" step="any" min="-180" max="180" className="workspace-input w-full" value={lng} onChange={e=>setLng(e.target.value)}/></label>
  </div>
  <div className="flex justify-end gap-3"><button type="button" className="workspace-secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="workspace-primary-button" disabled={busy}>{busy?'Saving…':'Save changes'}</button></div>
 </form></Modal>;
}
