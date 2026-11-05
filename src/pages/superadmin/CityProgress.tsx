import {useState} from 'react';
import type {City,User} from '../../types';
import {clearReadCache} from '../../services/api';
import {matrixStore} from '../../services/store';
import {AdminOperationsSummary} from '../cityadmin/AdminOperationsSummary';
import {PERSONNEL_MODULE_LABELS} from '../../services/personnel';
import {useCityPulse} from '../../services/commissioner';
import {useInspectionCoverage} from '../../services/useInspectionCoverage';
import {inspectionMetrics} from '../../services/inspectionMetrics';
import {inspectionOutcomes} from '../../services/inspectionCoverage';
import {CardInfo} from '../../components/common/CardInfo';

const format=(value:number|null|undefined)=>value==null?'—':value.toLocaleString('en-IN',{maximumFractionDigits:1});
export function CityProgress({city,users,onNavigate}:{city:City;users:User[];onNavigate:(page:string)=>void}){
 const [retry,setRetry]=useState(0),{from,to}=matrixStore.getDateRange();
 const revision=retry+matrixStore.loadRevision;
 const zones=matrixStore.getZones(city.id);
 const pulse=useCityPulse(city.id,from,to,zones.map(z=>z.id),'',revision,['official','performance']);
 const coverage=useInspectionCoverage(city,from,to,revision,true,true);
 const metrics=inspectionMetrics(coverage.data,{},pulse.official?.totals),outcomes=inspectionOutcomes(coverage.data);
 const targetLoading=coverage.loading||pulse.pending>0;
 const count=(id:string)=>outcomes.rows.find(row=>row.id===id)?.value;
 const cards=[
  {label:'Inspections completed',value:metrics.achieved,loading:coverage.loading,detail:format(metrics.totalRecords)+' total inspection records',info:'Completed inspections in the selected dates, excluding Draft. Repeat visits count as inspections; each report has one current status.'},
  {label:'Inspection target',value:metrics.delivery.target,loading:targetLoading,detail:metrics.delivery.fallback?'One inspection per asset per day':'Configured target',info:metrics.delivery.fallback?'Current registered assets × selected calendar days. Daily target credit counts each registered asset once per day, excluding Draft. '+format(metrics.delivery.completed)+' visits credited.':'Configured target and credited inspections use the same backend target windows as the Commissioner dashboard. '+format(metrics.delivery.completed)+' inspections credited.'},
  {label:'Pending review',value:count('pending_review'),loading:coverage.loading,detail:'Awaiting inspection review',info:'Reports currently awaiting review, submitted within the selected dates. This is separate from inspections still required to meet the target.'},
  {label:'Action required',value:count('action_required'),loading:coverage.loading,detail:'Current report status',info:'Reports submitted within the selected dates whose current status requires corrective action.'}
 ];
 const errors=[...coverage.data.errors,...Object.values(pulse.errors)];
 return <section className="space-y-5">
  <div className="workspace-hero"><div><span className="workspace-eyebrow">SUPER ADMIN · CITY PROGRESS</span><h1>{city.name}</h1><p>{from} to {to} · Follow inspection progress, assignment gaps, attendance and plant reporting.</p><div className="flex gap-3 mt-4 flex-wrap"><button className="workspace-secondary-button" onClick={()=>onNavigate('ca_inspections')}>Inspection reports</button><button className="workspace-secondary-button" onClick={()=>onNavigate('ca_map')}>City map</button><button className="workspace-secondary-button" onClick={()=>onNavigate('sa_users')}>City users</button><button className="workspace-secondary-button" onClick={()=>onNavigate('sa_audit_logs')}>City activity logs</button></div></div></div>
  <div className="workspace-panel p-5"><strong>Enabled modules</strong><p className="mt-2">{matrixStore.getCityModules(city.id).filter(m=>m.enabled).map(m=>PERSONNEL_MODULE_LABELS[m.key]||m.key).join(' · ')||'No modules enabled'}</p></div>
  {!!errors.length&&<p role="alert">Some progress data is unavailable. {errors.join(' ')} <button onClick={()=>{clearReadCache();setRetry(v=>v+1);}}>Retry</button></p>}
  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(card=><div className="workspace-panel p-5" key={card.label}><div className="flex items-center justify-between gap-2"><p>{card.label}</p><CardInfo title={card.label}>{card.info}</CardInfo></div><strong className="block text-3xl mt-3">{card.loading?'Loading…':format(card.value)}</strong><p className="text-sm text-slate-500 mt-3">{card.loading?'Updating…':card.detail}</p></div>)}</div>
  <AdminOperationsSummary city={city} users={users} onNavigate={page=>onNavigate(page==='ca_municipal_users'||page==='ca_employees'?'sa_users':page.startsWith('mod_')?'ca_map':page)}/>
 </section>;
}
