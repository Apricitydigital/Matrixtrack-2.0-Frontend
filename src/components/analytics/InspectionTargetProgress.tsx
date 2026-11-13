import React from 'react';
import { ArrowUpRight, Target } from 'lucide-react';
import {reportTargetDelivery,type TargetDelivery} from '../../services/targetDelivery';
import { CardInfo } from '../common/CardInfo';

interface Props {from:string;to:string;delivery:TargetDelivery;received:number|null;loading:boolean;onInspect:()=>void;onUpdate?:()=>void;receivedLabel?:string;showScoringCredit?:boolean;}
const count=(value:number|null)=>value==null?'—':value.toLocaleString('en-IN',{maximumFractionDigits:1});

/** The same date and geography scope as the dashboard's inspection register. */
export function InspectionTargetProgress({from,to,delivery,received,loading,onInspect,onUpdate,receivedLabel='Reports received',showScoringCredit=true}:Props) {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const title=from===to?(from===today?"Today's inspection target":'Daily inspection target'):'Inspection target for selected dates';
  const target=!loading&&delivery.available?delivery.target:null;
  const progress=reportTargetDelivery(delivery,loading?null:received);
  const credit=progress.completed;
  const remaining=target!=null&&credit!=null?progress.remaining:null;
  const submitted=loading?null:received;
  const percent=target!=null&&target>0&&credit!=null?credit/target*100:null;
  const days=Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000)+1;
  const basis=delivery.targetBasis==='current'&&delivery.configuredPercent!=null?`Current ${delivery.configuredPercent}% daily target applied to all ${days} selected ${days===1?'day':'days'}. Daily quotas are rounded up per Daroga, ward and module.`:delivery.targetBasis==='historical'?'Includes historical or default rules where no current daily percentage is configured.':null;
  return <section className="inspection-target-progress" aria-label={title} aria-busy={loading}>
    <header><div><span><Target size={16}/>{title}</span><small>{from}{from!==to?` to ${to}`:''} · IST</small></div><div className="inspection-target-actions">{onUpdate&&<button type="button" className="inspection-target-update" onClick={onUpdate}>Update target</button>}<CardInfo title="Target and reports received"><p>Shows the target and the reports received for the selected dates and filters.reports waiting for SI review are counted.</p><p>Reports still needed = target minus reports received.</p><p>Daroga scoring is separate: each location counts once a day. Sweeping counts submitted beats; Nala needs its photo points completed.</p></CardInfo></div></header>
    <dl><div><dt>Inspection target</dt><dd data-target-progress="target">{loading?'…':count(target)}</dd></div><div><dt>{receivedLabel}</dt><dd><button type="button" disabled={loading||submitted==null} onClick={onInspect} data-target-progress="received">{loading?'…':count(submitted)}<ArrowUpRight size={16}/></button></dd></div><div><dt>Reports still needed</dt><dd data-target-progress="remaining">{loading?'…':count(remaining)}</dd></div></dl>
    {percent!=null&&<div className="inspection-target-progress-meter" role="progressbar" aria-label="Report target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,percent)} aria-valuetext={`${count(credit)} of ${count(target)} target reports received`}><span style={{width:`${Math.min(100,percent)}%`}}/></div>}
    <footer>{loading?'Updating target progress…':target==null?'Inspection target unavailable':`${delivery.fallback?'Baseline target':'Configured target'}${credit==null?' · Reports unavailable':` · ${credit>target?`Target reached; ${count(credit-target)} additional reports`:`${count(target)} - ${count(credit)} = ${count(remaining)} reports still needed`}${percent==null?'':` · ${count(percent)}% received`}`}`}</footer>
    {!loading&&target!=null&&basis&&<p className="inspection-scoring-note">{basis}</p>}
    {showScoringCredit&&!loading&&target!=null&&!delivery.fallback&&delivery.completed!=null&&<p className="inspection-scoring-note">Daroga scoring credit: {count(delivery.completed)} / {count(target)}{delivery.percent==null?'':` (${count(delivery.percent)}%)`}. Scoring follows assigned location, photo-point and per-target limits.</p>}
  </section>;
}
