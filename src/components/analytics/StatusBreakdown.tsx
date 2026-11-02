import React from 'react';
import {ArrowUpRight} from 'lucide-react';
import {breakdownData,RAG_COLORS} from '../../services/chartData';
import type {RygTone} from '../../services/presentation';
import {amount} from '../../services/insights';
export interface BreakdownItem {id:string;label:string;value:number|null|undefined;tone:RygTone;attributes?:Record<string,string>;detail?:string;}
/** One distribution replaces repeated numeric cards; legend buttons open the source records. */
export function StatusBreakdown({items,label,loading=false,onSelect}:{items:BreakdownItem[];label:string;loading?:boolean;onSelect?:(id:string)=>void}) {
 const data=breakdownData(items),ready=!loading&&data.available;
 return <div className="status-breakdown" aria-label={label} aria-busy={loading}>
  <div className="status-breakdown-track" role="img" aria-label={loading?'Updating selected scope':!data.available?'Complete distribution unavailable':`${label}: ${items.map(i=>`${i.label} ${amount(i.value,0)}`).join(', ')}`}>
   {ready&&data.total!>0?items.map((item,i)=>item.value!>0&&<span key={item.id} style={{width:`${data.shares[i]}%`,background:RAG_COLORS[item.tone]}} title={`${item.label}: ${amount(item.value,0)} (${amount(data.shares[i],1)}%)`}/>):<span className="status-breakdown-empty">{loading?'Updating…':data.total===0?'No records in this selection':'Data unavailable'}</span>}
  </div>
  <div className="status-breakdown-legend">{items.map((item,i)=><button key={item.id} {...item.attributes} data-tone={item.tone} disabled={!onSelect||!ready||item.value==null} onClick={()=>onSelect?.(item.id)} title={item.detail||`${item.label}: ${ready?amount(item.value,0):'Unavailable'}`} aria-label={`${item.label}: ${ready?amount(item.value,0):'Unavailable'}. ${onSelect?'Open source records.':''}`}><i style={{background:RAG_COLORS[item.tone]}}/><span>{item.label}<small>{item.detail}</small></span><strong>{loading?'…':data.available?amount(item.value,0):'—'}</strong><small>{ready&&data.total!>0?`${amount(data.shares[i],1)}%`:''}</small>{onSelect&&<ArrowUpRight size={14}/>}</button>)}</div>
 </div>;
}
