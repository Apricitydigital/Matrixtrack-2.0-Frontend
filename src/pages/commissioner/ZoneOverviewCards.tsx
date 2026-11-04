import React from 'react';
import {ChevronRight,Layers,MapPin} from 'lucide-react';

export interface ZoneOverviewCard {id:string;name:string;wards:number;percent:number|null;received:number|null;pending:number|null}
const fmt=(n:number|null|undefined,decimals=0)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:decimals});

/** Clickable zone cards: selecting a card opens Inspection Performance filtered to that zone. */
export function ZoneOverviewCards({cards,loading,onSelect}:{cards:ZoneOverviewCard[];loading:boolean;onSelect:(zoneId:string)=>void}) {
  return <section className="home-section zone-overview-cards">
    <div className="home-section-heading"><div><span><MapPin size={14}/> ZONE PERFORMANCE & WARD INSPECTION OVERVIEW</span><h2>Zone performance & ward inspection overview</h2><p>Select a zone card to open Inspection Performance filtered to that zone.</p></div><span className="zone-overview-count"><Layers size={14}/>{cards.length} {cards.length===1?'Zone':'Zones'} Active</span></div>
    <div className="zone-overview-grid">{[...cards].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(c=><button key={c.id} className="zone-overview-card" onClick={()=>onSelect(c.id)} aria-label={`Open inspection performance for ${c.name}`}>
      <div className="zone-overview-top"><span className="zone-overview-name"><MapPin size={12}/>{c.name}</span><small>{c.wards} WARDS</small></div>
      <div className="zone-overview-score"><div><strong>{loading?'…':c.percent==null?'—':`${fmt(c.percent)}%`}</strong><small>COVERAGE</small></div><div><b>{loading?'…':fmt(c.received)}</b><small>Reports Received</small></div></div>
      <div className="zone-overview-meter"><i style={{width:`${Math.min(100,Math.max(0,c.percent??0))}%`}}/></div>
      <div className="zone-overview-foot"><span className="zone-overview-pending">{loading?'…':fmt(c.pending)} Pending</span><span className="zone-overview-details">Details<ChevronRight size={13}/></span></div>
    </button>)}</div>
    {!cards.length&&<div className="home-empty">No zones in the selected scope.</div>}
  </section>;
}
