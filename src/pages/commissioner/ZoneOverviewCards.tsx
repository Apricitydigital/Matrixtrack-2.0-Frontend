import React,{useState} from 'react';
import {ChevronRight,Layers,MapPin} from 'lucide-react';
import {useVisual} from '../../services/vizMode';
import {ZoneColumns} from '../../components/analytics/VisualCharts';
import type {InspectionCoverage,InspectionVisit} from '../../services/inspectionCoverage';
import {coverageCounts} from '../../services/inspectionCoverage';
import {cleanlinessStats} from '../../services/cleanliness';
import type {OperationalModuleId} from '../../types';
import {usePanel,PanelActions,PanelSection,PanelStats,PanelTable,fmtPct} from '../../components/dashboard/DetailPanel';
import {MODULE_LABELS} from '../../services/presentation';
import {CleanlinessDetail,CoverageDetail,type OpenReports} from '../../components/dashboard/panelBodies';

export interface ZoneDetailSource {onViewReport?:(visit:InspectionVisit)=>void;data:InspectionCoverage;wards:{id:string;name:string;zoneId:string}[];modules:OperationalModuleId[];onOpen?:OpenReports}

export interface ZoneOverviewCard {id:string;name:string;wards:number;percent:number|null;totalAssets:number|null;fullTarget?:number|null;target:number|null;completed:number|null;pending:number|null}
const fmt=(n:number|null|undefined,decimals=0)=>n==null?'—':n.toLocaleString('en-IN',{maximumFractionDigits:decimals});

/** Zone detail panel. Its ward and module filters are local to the panel and never change the dashboard filters. */
function ZoneDetailBody({c,detail,panel,onSelect}:{c:ZoneOverviewCard;detail:ZoneDetailSource;panel:NonNullable<ReturnType<typeof usePanel>>;onSelect:(zoneId:string)=>void}) {
  const [ward,setWard]=useState(''),[module,setModule]=useState('');
  const zoneWards=detail.wards.filter(w=>w.zoneId===c.id);
  const filtered=Boolean(ward||module);
  const scope={zone:c.id,...(ward?{ward}:{}),...(module?{module}:{})};
  const rows=ward?zoneWards.filter(w=>w.id===ward):zoneWards;
  const withModule=(id:string)=>({ward:id,...(module?{module}:{})});
  const wardTable=<PanelSection title="Wards" note="Select a ward for its cleanliness and coverage details."><PanelTable head={['Ward','Registered','Inspected','Not yet inspected','Coverage','Cleanliness']} empty="No ward matches these filters." rows={rows.map(w=>{const k=coverageCounts(detail.data,withModule(w.id) as any),cl=cleanlinessStats(detail.data.visits.filter(v=>v.wardId===w.id&&(!module||v.module===module)));return {key:w.id,onClick:()=>panel.open({title:w.name,subtitle:`${c.name} · ward details${module?` · ${MODULE_LABELS[module as keyof typeof MODULE_LABELS]}`:''}`,width:'3xl',body:<><PanelSection title="Cleanliness"><CleanlinessDetail data={detail.data} scope={withModule(w.id)} wards={detail.wards} onOpen={detail.onOpen} onViewReport={detail.onViewReport}/></PanelSection><PanelSection title="Coverage"><CoverageDetail data={detail.data} modules={detail.modules} zones={[]} wards={detail.wards} scope={withModule(w.id)} onOpen={detail.onOpen}/></PanelSection></>}),cells:[w.name,fmt(k.total),fmt(k.covered),fmt(k.remaining),fmtPct(k.percent),fmtPct(cl.percent)]};})}/></PanelSection>;
  return <>
    <div className="zd-filters" role="group" aria-label="Filters for this panel only">
      <label>Ward<select value={ward} onChange={e=>setWard(e.target.value)}><option value="">All wards</option>{zoneWards.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label>Module<select value={module} onChange={e=>setModule(e.target.value)}><option value="">All modules</option>{detail.modules.map(m=><option key={m} value={m}>{MODULE_LABELS[m]||m}</option>)}</select></label>
      {filtered&&<button type="button" onClick={()=>{setWard('');setModule('');}}>Clear filters</button>}
      <small>These filters apply only inside this panel.</small>
    </div>
    <PanelSection title="Cleanliness"><CleanlinessDetail data={detail.data} scope={scope} wards={detail.wards} onOpen={detail.onOpen} onViewReport={detail.onViewReport}/></PanelSection>
    <PanelSection title="Coverage"><CoverageDetail data={detail.data} modules={detail.modules} zones={[]} wards={detail.wards} scope={scope} onOpen={detail.onOpen} between={<>
      {!filtered&&<PanelSection title="Inspection target"><PanelStats items={[{label:'Target progress',value:c.percent==null?'—':`${fmt(c.percent,1)}%`,tone:c.percent!=null&&c.percent>=100?'green':'amber'},{label:'Inspection target',value:fmt(c.target),note:`Full target ${fmt(c.fullTarget)} at 100%`},{label:'Reports received',value:fmt(c.completed),tone:'blue'},{label:'Reports still needed',value:fmt(c.pending),tone:'amber'}]}/></PanelSection>}
      {wardTable}</>}/></PanelSection>
    <PanelActions actions={[{label:'Open inspection performance for this zone',primary:true,onClick:()=>onSelect(c.id)}]}/>
  </>;
}

/** Clickable zone cards: selecting a card opens Inspection Performance filtered to that zone. */
export function ZoneOverviewCards({cards,loading,onSelect,detail}:{cards:ZoneOverviewCard[];loading:boolean;onSelect:(zoneId:string)=>void;detail?:ZoneDetailSource}) {
  const visual=useVisual();
  const panel=usePanel();
  const select=(c:ZoneOverviewCard)=>{
    if(!panel||!detail||loading){onSelect(c.id);return;}
    panel.open({title:c.name,subtitle:`${c.wards} wards · zone details`,width:'3xl',body:<ZoneDetailBody c={c} detail={detail} panel={panel} onSelect={onSelect}/>});
  };
  return <section className="home-section zone-overview-cards">
    <div className="home-section-heading"><div><h2>Zone performance & ward inspection overview</h2></div><span className="zone-overview-count"><Layers size={14}/>{cards.length} {cards.length===1?'Zone':'Zones'} Active</span></div>
    {visual&&!loading&&cards.length>1&&<ZoneColumns zones={[...cards].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(c=>({id:c.id,name:c.name,target:c.target,received:c.completed,percent:c.percent}))} onSelect={id=>{const c=cards.find(x=>x.id===id);if(c)select(c);else onSelect(id);}}/>}
    <div className="zone-overview-grid">{[...cards].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(c=>{
      const state=c.percent==null?'none':c.percent>=100?'met':c.percent>=40?'mid':'low';
      return <button key={c.id} className="zone-overview-card zc" data-state={state} onClick={()=>select(c)} aria-label={detail?`Open details for ${c.name}`:`Open inspection performance for ${c.name}`}>
        <div className="zc-head"><b><MapPin size={13}/>{c.name}</b><span>{c.wards} {c.wards===1?'ward':'wards'}</span></div>
        <div className="zc-progress">
          <div><span>Progress</span><strong>{loading?'…':c.percent==null?'—':`${fmt(c.percent,1)}%`}</strong></div>
          <div className="zc-bar" role="img" aria-label={`${c.name} target progress`}><i style={{width:`${loading?0:Math.min(100,c.percent??0)}%`}}/></div>
          <small>{loading?'':`${fmt(c.completed)} of ${fmt(c.target)} reports`}</small>
        </div>
        <dl className="zc-grid">
          <div><dt>Assets</dt><dd>{loading?'…':fmt(c.totalAssets)}</dd></div>
          <div><dt>Target</dt><dd>{loading?'…':fmt(c.target)}</dd></div>
          <div><dt>Received</dt><dd>{loading?'…':fmt(c.completed)}</dd></div>
          <div data-met={!loading&&c.pending===0}><dt>Still needed</dt><dd>{loading?'…':fmt(c.pending)}</dd></div>
        </dl>
        <div className="zc-foot"><span title="Registered assets multiplied by selected days; one report per asset per day.">At 100%: <b data-zone-full-target={c.id}>{loading?'…':fmt(c.fullTarget)}</b></span><span className="zc-details">Details<ChevronRight size={13}/></span></div>
      </button>;})}</div>
    {!cards.length&&<div className="home-empty">No zones in the selected scope.</div>}
  </section>;
}
