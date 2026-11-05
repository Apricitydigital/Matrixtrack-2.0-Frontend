import React from 'react';
import { ArrowUpRight, Target } from 'lucide-react';
import type { TargetDelivery } from '../../services/targetDelivery';
import { CardInfo } from '../common/CardInfo';

interface Props {from:string;to:string;delivery:TargetDelivery;received:number|null;loading:boolean;onInspect:()=>void;}
const count=(value:number|null)=>value==null?'—':value.toLocaleString('en-IN',{maximumFractionDigits:1});

/** The same date and geography scope as the dashboard's inspection register. */
export function InspectionTargetProgress({from,to,delivery,received,loading,onInspect}:Props) {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const title=from===to?(from===today?"Today's inspection target":'Daily inspection target'):'Inspection target for selected dates';
  const target=!loading&&delivery.available?delivery.target:null;
  const credit=!loading&&delivery.available?delivery.completed:null;
  const remaining=target!=null&&credit!=null?delivery.remaining:null;
  const submitted=loading?null:received;
  const percent=target!=null&&target>0&&credit!=null?credit/target*100:null;
  return <section className="inspection-target-progress" aria-label={title} aria-busy={loading}>
    <header><div><span><Target size={16}/>{title}</span><small>{from}{from!==to?` to ${to}`:''} · IST</small></div><CardInfo title="Target and reports received"><p>Targets and submitted inspections use the selected dates and zone/ward filters. Draft reports are excluded. Reports awaiting SI review are included.</p><p>Remaining target uses credited inspections under the target rules. Extra visits may increase reports received without reducing the remaining target. When configured targets are unavailable, a labelled baseline requires one visit per registered location per day.</p></CardInfo></header>
    <dl><div><dt>Inspection target</dt><dd data-target-progress="target">{loading?'…':count(target)}</dd></div><div><dt>Reports received</dt><dd><button type="button" disabled={loading||submitted==null} onClick={onInspect} data-target-progress="received">{loading?'…':count(submitted)}<ArrowUpRight size={16}/></button></dd></div><div><dt>Remaining target</dt><dd data-target-progress="remaining">{loading?'…':count(remaining)}</dd></div></dl>
    {percent!=null&&<div className="inspection-target-progress-meter" role="progressbar" aria-label="Inspection target achieved" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,percent)} aria-valuetext={`${count(credit)} of ${count(target)} target inspections credited`}><span style={{width:`${Math.min(100,percent)}%`}}/></div>}
    <footer>{loading?'Updating target progress…':target==null?'Inspection target unavailable':`${delivery.fallback?'Baseline target':'Configured target'}${credit==null?' · Target credit unavailable':` · ${count(credit)} credited${percent==null?'':` · ${count(percent)}% achieved`}`}`}</footer>
  </section>;
}
