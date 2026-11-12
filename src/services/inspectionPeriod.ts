import type { CoverageCounts } from './inspectionCoverage';
import type { TargetDelivery } from './targetDelivery';

const number=(value:number|null|undefined)=>value==null?'Unavailable':value.toLocaleString('en-IN',{maximumFractionDigits:1});
/** Shared labels describe the entire selected period, including single-day selections. */
export function inspectionPeriod(counts:CoverageCounts,delivery:TargetDelivery,from?:string,to?:string) {
  const days=counts.days??1;
  const duration=`${days} ${days===1?'day':'days'}`;
  const date=(value:string)=>new Date(`${value}T12:00:00Z`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return {
    duration,
    range:from&&to?`${date(from)}${from!==to?` – ${date(to)}`:''} · ${duration} · IST`:duration,
    achievement:'Inspection target achievement',
    requirement:'Inspection target',
    basis:counts.total==null||counts.required==null?'Location inventory is unavailable, so the inspection target cannot be calculated.':`${number(counts.total)} registered locations × ${duration} = ${number(counts.required)} inspection opportunities`,
    progress:delivery.target==null?'Inspection target unavailable':delivery.completed==null?'Inspection credit unavailable':`${number(delivery.completed)} ${delivery.fallback?'inspections done':'credited inspections'} / ${number(delivery.target)} inspection target`,
    rule:delivery.fallback?'One credit per registered location per day. Same-day repeat visits add no credit. Draft reports are excluded. Pending review reports are completed field visits awaiting a decision.':'Credit follows the configured target rules returned by the backend.',
  };
}

/** Date range is shared by the app; carry geography and the clicked queue into the register. */
export function inspectionDrillFilters(zone:string|string[]='',ward:string|string[]='',moduleId:string|string[]='all',status='all') {
  return {zoneId:typeof zone==='string'?zone||'all':'all',wardId:typeof ward==='string'?ward||'all':'all',zoneIds:Array.isArray(zone)?zone:[],wardIds:Array.isArray(ward)?ward:[],moduleId:typeof moduleId==='string'?moduleId||'all':'all',moduleIds:Array.isArray(moduleId)?moduleId:[],status:status||'all'};
}
