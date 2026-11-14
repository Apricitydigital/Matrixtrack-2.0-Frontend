import React from 'react';
import {ChevronRight,Layers,MapPin} from 'lucide-react';

export interface ZoneOverviewCard {id:string;name:string;wards:number;percent:number|null;totalAssets:number|null;fullTarget?:number|null;target:number|null;completed:number|null;pending:number|null}
const fmt=(n:number|null|undefined,decimals=0)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:decimals});

/** Clickable zone cards: selecting a card opens Inspection Performance filtered to that zone. */
export function ZoneOverviewCards({cards,loading,onSelect}:{cards:ZoneOverviewCard[];loading:boolean;onSelect:(zoneId:string)=>void}) {
  return <section className="home-section zone-overview-cards">
    <div className="home-section-heading"><div><h2>Zone performance & ward inspection overview</h2></div><span className="zone-overview-count"><Layers size={14}/>{cards.length} {cards.length===1?'Zone':'Zones'} Active</span></div>
    <div className="zone-overview-grid">{[...cards].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(c=><button key={c.id} className="zone-overview-card" onClick={()=>onSelect(c.id)} aria-label={`Open inspection performance for ${c.name}`}>
      <div className="zone-overview-top"><span className="zone-overview-name"><MapPin size={12}/>{c.name}</span><small>{c.wards} WARDS</small></div>
      <span className="zone-overview-full-target" title="Registered assets multiplied by selected days; one report per asset per day."><span>Total inspections required<small>At 100% target</small></span><b data-zone-full-target={c.id}>{loading?'\u2026':fmt(c.fullTarget)}</b></span>
      <div className="zone-overview-stats"><div><b>{loading?'…':fmt(c.totalAssets)}</b><small>Assets</small></div><div><b>{loading?'…':fmt(c.target)}</b><small>Target</small></div><div><b>{loading?'…':fmt(c.completed)}</b><small>Reports received</small></div></div>
      <div className="zone-overview-progress"><span>Target progress</span><strong>{loading?'…':c.percent==null?'—':`${fmt(c.percent,1)}%`}</strong></div>
      <div className="zone-overview-meter"><i style={{width:`${Math.min(100,Math.max(0,c.percent??0))}%`}}/></div>
      <div className="zone-overview-foot"><span className="zone-overview-pending">{loading?'…':fmt(c.pending)} Reports needed</span><span className="zone-overview-details">Details<ChevronRight size={13}/></span></div>
    </button>)}</div>
    {!cards.length&&<div className="home-empty">No zones in the selected scope.</div>}
  </section>;
}
