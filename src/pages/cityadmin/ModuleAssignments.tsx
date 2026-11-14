import React,{useState} from 'react';
import type {Beat,City,OperationalModuleId,User,Ward,Zone} from '../../types';
import {MODULE_LABELS} from '../../services/presentation';
import {AreasBeats} from './AreasBeats';
import {AssetRegistry} from '../modules/AssetRegistry';

const ORDER:OperationalModuleId[]=['sweeping','toilets','litter_bins','nala','ctu_gvp'];

// Staff & Daroga Assignments: one tab per enabled module (Sweeping Beats, Toilets, Litter Bins, Nala, CTU/GVP).
export function ModuleAssignments(props:{city:City;beats:Beat[];zones:Zone[];wards:Ward[];users:User[];currentUser:User;onOpenImport:()=>void;onRefresh:()=>void}){
 const {city,zones,wards}=props;
 const enabled=city.enabledModules?.length?city.enabledModules:ORDER;
 const modules=ORDER.filter(m=>enabled.includes(m));
 const [active,setActive]=useState<OperationalModuleId>(modules[0]||'sweeping');
 const current=modules.includes(active)?active:modules[0]||'sweeping';
 return <section className="space-y-4">
  <div className="flex gap-2 flex-wrap items-center" role="tablist" aria-label="Module">{modules.map(m=><button key={m} role="tab" aria-selected={current===m} className={current===m?'workspace-primary-button':'workspace-secondary-button'} onClick={()=>setActive(m)}>{MODULE_LABELS[m]}</button>)}</div>
  {current==='sweeping'?<AreasBeats {...props}/>:<AssetRegistry key={current} module={current} city={city} zones={zones} wards={wards}/>}
 </section>;
}
