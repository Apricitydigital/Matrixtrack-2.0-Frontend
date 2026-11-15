import React from 'react';
import {ChevronRight,Layers,MapPin} from 'lucide-react';
import {useVisual} from '../../services/vizMode';
import {ProgressMeter, ZoneColumns} from '../../components/analytics/VisualCharts';
import type {InspectionCoverage} from '../../services/inspectionCoverage';
import {coverageCounts} from '../../services/inspectionCoverage';
import {cleanlinessStats} from '../../services/cleanliness';
import type {OperationalModuleId} from '../../types';
import {usePanel,PanelActions,PanelSection,PanelStats,PanelTable,fmtPct} from '../../components/dashboard/DetailPanel';
import {CleanlinessDetail,CoverageDetail,type OpenReports} from '../../components/dashboard/panelBodies';

export interface ZoneDetailSource {data:InspectionCoverage;wards:{id:string;name:string;zoneId:string}[];modules:OperationalModuleId[];onOpen?:OpenReports}

export interface ZoneOverviewCard {id:string;name:string;wards:number;percent:number|null;totalAssets:number|null;fullTarget?:number|null;target:number|null;completed:number|null;pending:number|null}
const fmt=(n:number|null|undefined,decimals=0)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:decimals});

/** Clickable zone cards: selecting a card opens Inspection Performance filtered to that zone. */
export function ZoneOverviewCards({cards,loading,onSelect,detail}:{cards:ZoneOverviewCard[];loading:boolean;onSelect:(zoneId:string)=>void;detail?:ZoneDetailSource}) {
  const visual=useVisual();
  const panel=usePanel();
  const select=(c:ZoneOverviewCard)=>{
    if(!panel||!detail||loading){onSelect(c.id);return;}
    const zoneWards=detail.wards.filter(w=>w.zoneId===c.id);
    panel.open({title:c.name,subtitle:`${c.wards} wards · zone details`,width:'3xl',body:<>
      <PanelStats items={[{label:'Assets',value:fmt(c.totalAssets)},{label:'Inspection target',value:fmt(c.target)},{label:'Reports received',value:fmt(c.completed),tone:'blue'},{label:'Target progress',value:c.percent==null?'—':`${fmt(c.percent,1)}%`,tone:c.percent!=null&&c.percent>=100?'green':'amber'},{label:'Reports still needed',value:fmt(c.pending),tone:'amber'},{label:'Total inspections required',value:fmt(c.fullTarget),note:'At 100% target'}]}/>
      <PanelSection title="Wards" note="Select a ward for its cleanliness details."><PanelTable head={['Ward','Registered','Inspected','Not yet inspected','Coverage','Cleanliness']} rows={zoneWards.map(w=>{const k=coverageCounts(detail.data,{ward:w.id}),cl=cleanlinessStats(detail.data.visits.filter(v=>v.wardId===w.id));return {key:w.id,onClick:()=>panel.open({title:w.name,subtitle:`${c.name} · ward details`,width:'3xl',body:<><CoverageDetail data={detail.data} modules={detail.modules} zones={[]} wards={detail.wards} scope={{ward:w.id}} onOpen={detail.onOpen}/><PanelSection title="Cleanliness"><CleanlinessDetail data={detail.data} scope={{ward:w.id}} wards={detail.wards} onOpen={detail.onOpen}/></PanelSection></>}),cells:[w.name,fmt(k.total),fmt(k.covered),fmt(k.remaining),fmtPct(k.percent),fmtPct(cl.percent)]};})}/></PanelSection>
      <PanelSection title="Cleanliness"><CleanlinessDetail data={detail.data} scope={{zone:c.id}} wards={detail.wards}/></PanelSection>
      <PanelSection title="Coverage"><CoverageDetail data={detail.data} modules={detail.modules} zones={[]} wards={detail.wards} scope={{zone:c.id}}/></PanelSection>
      <PanelActions actions={[{label:'Open inspection performance for this zone',primary:true,onClick:()=>onSelect(c.id)}]}/>
    </>});
  };
  return <section className="home-section zone-overview-cards">
    <div className="home-section-heading"><div><h2>Zone performance & ward inspection overview</h2></div><span className="zone-overview-count"><Layers size={14}/>{cards.length} {cards.length===1?'Zone':'Zones'} Active</span></div>
    {visual&&!loading&&cards.length>1&&<ZoneColumns zones={[...cards].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(c=>({id:c.id,name:c.name,target:c.target,received:c.completed,percent:c.percent}))} onSelect={id=>{const c=cards.find(x=>x.id===id);if(c)select(c);else onSelect(id);}}/>}
    <div className="zone-overview-grid">{[...cards].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(c=><button key={c.id} className="zone-overview-card" onClick={()=>select(c)} aria-label={detail?`Open details for ${c.name}`:`Open inspection performance for ${c.name}`}>
      <div className="zone-overview-top"><span className="zone-overview-name"><MapPin size={12}/>{c.name}</span><small>{c.wards} WARDS</small></div>
      <span className="zone-overview-full-target" title="Registered assets multiplied by selected days; one report per asset per day."><span>Total inspections required<small>At 100% target</small></span><b data-zone-full-target={c.id}>{loading?'\u2026':fmt(c.fullTarget)}</b></span>
      <div className="zone-overview-stats"><div><b>{loading?'…':fmt(c.totalAssets)}</b><small>Assets</small></div><div><b>{loading?'…':fmt(c.target)}</b><small>Target</small></div><div><b>{loading?'…':fmt(c.completed)}</b><small>Reports received</small></div></div>
      <div className="zone-overview-progress"><span>Target progress</span><strong>{loading?'…':c.percent==null?'—':`${fmt(c.percent,1)}%`}</strong></div>
      <ProgressMeter visual={visual} variant="ring" className="zone-overview-meter" percent={c.percent} label={`${c.name} target progress`}/>
      <div className="zone-overview-foot"><span className="zone-overview-pending">{loading?'…':fmt(c.pending)} Reports needed</span><span className="zone-overview-details">Details<ChevronRight size={13}/></span></div>
    </button>)}</div>
    {!cards.length&&<div className="home-empty">No zones in the selected scope.</div>}
  </section>;
}
