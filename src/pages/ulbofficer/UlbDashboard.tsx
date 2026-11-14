import {ulbReportRegister} from '../../services/ulbReportRegister';
import {ulbTeamProgress} from '../../services/ulbTeamProgress';
import {darogaReportProgress} from '../../services/darogaReportProgress';
import {coverageReportDetail} from '../../services/coverageReportDetail';
import {siReviewSummary} from '../../services/siReviewSummary';
import {SiReviewOverview} from '../../components/analytics/SiReviewOverview';
import {IntelligenceSummary} from '../../components/reports/IntelligenceSuggestion';
import {InspectionTargetProgress} from '../../components/analytics/InspectionTargetProgress';
import {MultiSelectDropdown} from '../../components/common/MultiSelectDropdown';
import {wardFocusPreset} from '../../services/wardFocusPreset';
import {CardInfo} from '../../components/common/CardInfo';
import {StatusBreakdown} from '../../components/analytics/StatusBreakdown';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,CheckCircle2,Clock3,Flag,MapPin,Repeat2,ShieldCheck,XCircle} from 'lucide-react';
import type {City,User,Ward,Zone} from '../../types';
import {matrixStore} from '../../services/store';
import {applyPerformanceTargets,performanceTargetRows,ulbInspectionSummary,useCityPulse} from '../../services/commissioner';
import {moduleId} from '../../services/adapters';
import {useInspectionCoverage} from '../../services/useInspectionCoverage';
import {targetDelivery,targetReadState,reportTargetDelivery} from '../../services/targetDelivery';
import {ulbDrillLabels,ulbDrillVisits,ulbScopeData,ulbVisitStatus,inspectionDateTime,matchesUlbScope,ulbSelectedWards,type UlbDrill,type UlbScope} from '../../services/ulbDashboard';
import {MODULE_LABELS,ROLE_LABELS} from '../../services/presentation';
import {amount} from '../../services/insights';
import {api} from '../../services/api';
import {Drawer} from '../../components/common/Drawer';
import {StatusBadge} from '../../components/common/Badge';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {CityBriefing} from '../commissioner/CityBriefing';
import {selectInspectionCoverage} from '../../services/inspectionCoverage';
import {ZoneOverviewCards} from '../commissioner/ZoneOverviewCards';
import {ModuleDelivery} from '../commissioner/ModuleDelivery';
import {useVisual} from '../../services/vizMode';
import {RingMeter} from '../../components/analytics/VisualCharts';
import {UpdateTargetModal} from '../../components/analytics/UpdateTargetModal';
interface Props {onInspectZone:(zone:string|string[],ward?:string|string[],module?:string,status?:string)=>void;city:City;zones:Zone[];wards:Ward[];currentUser:User;onNavigate:(id:string)=>void;onSelectReport:(id:string)=>void;noticeRequest:number;onNoticeCount:(count:number)=>void;onNoticeHandled:()=>void}
const scopeNames=(rows:{id:string;name:string}[],single:string|undefined,ids:string[]|undefined,all:string)=>!single&&!ids?.length?all:rows.filter(row=>(!single||row.id===single)&&(!ids?.length||ids.includes(row.id))).map(row=>row.name).join(', ')||all;
export function UlbDashboard({onInspectZone,city,zones,wards,currentUser,onNavigate,onSelectReport,noticeRequest,onNoticeCount,onNoticeHandled}:Props){
  const [zoneIds,setZoneIds]=useState<string[]>([]),[wardIds,setWardIds]=useState<string[]>([]),[revision,setRevision]=useState(0),[briefing,setBriefing]=useState(false),[drill,setDrill]=useState<{kind:UlbDrill;scope:UlbScope}|null>(null),[opening,setOpening]=useState(''),[error,setError]=useState(''),[drillZones,setDrillZones]=useState<string[]>([]),[drillWards,setDrillWards]=useState<string[]>([]),[moduleIds,setModuleIds]=useState<string[]>([]),[targetModal,setTargetModal]=useState(false),[pctRules,setPctRules]=useState<Record<string,{targets:number;percentTargets:number;percents:number[]}|null>>({});
  const [drillModules,setDrillModules]=useState<string[]>([]);
  const visual=useVisual();
  const autoOpened=useRef(false),range=matrixStore.getDateRange(),cityZones=zones.filter(z=>z.cityId===city.id),cityWards=wards.filter(w=>w.cityId===city.id);
  const focusPreset=useMemo(()=>wardFocusPreset(city.id,zones,wards),[city.id,zones,wards]);
  const quickSelection=focusPreset?{label:'15 wards · 6 zones',active:zoneIds.length===focusPreset.zoneIds.length&&wardIds.length===focusPreset.wardIds.length&&focusPreset.zoneIds.every(id=>zoneIds.includes(id))&&focusPreset.wardIds.every(id=>wardIds.includes(id)),onSelect:()=>{setZoneIds(focusPreset.zoneIds);setWardIds(focusPreset.wardIds);}}:undefined;
  const coverage=useInspectionCoverage(city,range.from,range.to,revision+matrixStore.loadRevision,true,true);
  const pulse=useCityPulse(city.id,range.from,range.to,[],'',revision+matrixStore.loadRevision,['official','performance']);
  const zoneKey=zoneIds.join(','),wardKey=wardIds.join(','),moduleKey=moduleIds.join(','),scope={zoneIds,wardIds},moduleFiltered=moduleIds.length>0;
  const cov=useMemo(()=>{const registered=ulbReportRegister(coverage.data);if(!moduleIds.length)return registered;const keep=(row:{module:string})=>moduleIds.includes(row.module);return {...registered,assets:registered.assets.filter(keep),visits:registered.visits.filter(keep),modules:registered.modules.filter(m=>moduleIds.includes(m)),failedModules:registered.failedModules.filter(m=>moduleIds.includes(m))};},[coverage.data,moduleKey]);
  const shownModules=useMemo(()=>city.enabledModules.filter(m=>!moduleIds.length||moduleIds.includes(m)),[city.enabledModules,moduleKey]);
  const data=useMemo(()=>ulbScopeData(cov,scope),[cov,zoneKey,wardKey,moduleKey]);
  const official=useMemo(()=>{const summary=ulbInspectionSummary(cov,cityZones.filter(z=>!zoneIds.length||zoneIds.includes(z.id)),wardIds);return summary&&pulse.performance?.SUPERVISOR?applyPerformanceTargets(summary,pulse.performance.SUPERVISOR,wardIds,moduleIds):summary;},[cov,pulse.performance,zones,zoneKey,wardKey,moduleKey]);
  const sourceDelivery=targetReadState(targetDelivery(official?.totals,data.completedCounts),Boolean(official&&pulse.performance?.SUPERVISOR));
  const targetScopeMismatch=sourceDelivery.completed!=null&&data.completedCounts.inspections!=null&&sourceDelivery.completed>data.completedCounts.inspections;
  const delivery=targetScopeMismatch?{...sourceDelivery,available:false,completed:null,percent:null,remaining:null,stateLabel:'Target scope needs verification'}:sourceDelivery;
  const reportProgress=reportTargetDelivery(delivery,data.completedCounts.inspections);
  const selectedCoverage=selectInspectionCoverage(cov,zoneIds,wardIds);
  const darogaProgress=darogaReportProgress(selectedCoverage,delivery),teamProgress=ulbTeamProgress(selectedCoverage);
  const targetRows=official?performanceTargetRows(official,pulse.performance?.SUPERVISOR||{},wardIds,moduleIds):[];
  const completionDifference=data.counts.inspections!=null&&delivery.completed!=null?data.counts.inspections-delivery.completed:null;
  const configuredRows=targetRows.filter(row=>row.source==='ADMIN').length;
  const number=(value:number|null|undefined)=>coverage.loading?'…':amount(value,0);
  // The percentage target currently set for the selected area, so the officer can see what the progress is measured against.
  useEffect(()=>{
    const c=new AbortController(),q=`zoneIds=${zoneIds.join(',')}&wardIds=${wardIds.join(',')}`;
    api(`/city/targets/percent-scope?role=SUPERVISOR&${q}`,{signal:c.signal}).catch(()=>null).then(d=>{if(!c.signal.aborted)setPctRules({SUPERVISOR:d});});
    return()=>c.abort();
  },[zoneKey,wardKey,revision]);
  const describeRule=(rule:{targets:number;percentTargets:number;percents:number[]}|null|undefined,what:string,none:string)=>{
    if(!rule)return null;
    if(!rule.targets)return none;
    if(!rule.percents.length)return 'fixed numbers set by City Admin';
    if(rule.percents.length>1)return `mixed (${rule.percents.map(n=>n+'%').join(', ')}) of ${what}`;
    return `${rule.percents[0]}% of ${what}${rule.percentTargets<rule.targets?' (some targets are fixed numbers)':''}`;
  };
  const darogaRule=moduleFiltered?null:describeRule(pctRules.SUPERVISOR,'assigned locations per day','default (every assigned location, every day)');

  // SI workload: reports that reached SI review, the SI target, what is decided and what still waits.
  const siMetrics=siReviewSummary(selectInspectionCoverage(cov,zoneIds,wardIds),null);
  const siPending=siMetrics.pending,siDone=siMetrics.reviewed,siReceived=siMetrics.received,siTarget=siMetrics.target;
  const siSummary=siReceived==null?'Awaiting SI decision':`${amount(siReceived,0)} received · SI review · ${amount(siDone,0)} reviewed · ${amount(siPending,0)} pending`;
  const open=(kind:UlbDrill,selected:UlbScope=scope)=>{if(coverage.loading)return;const selectedData=ulbScopeData(cov,selected),counts=['not_inspected','repeats'].includes(kind)?selectedData.completedCounts:selectedData.counts;if((kind==='not_inspected'?counts.remaining:kind==='repeats'?counts.repeats:counts.inspections)==null)return;setError('');setDrillZones([]);setDrillWards([]);setDrillModules([]);setDrill({kind,scope:{...selected}});};
  const metrics=[
    {kind:'approved',value:data.statusCount('approved'),tone:'green',Icon:CheckCircle2,note:'SI approved'},
    {kind:'rejected',value:data.statusCount('rejected'),tone:'red',Icon:XCircle,note:'Review findings and request corrective action'},
    {kind:'pending_review',value:data.statusCount('pending_review'),tone:'yellow',Icon:Clock3,note:siSummary},
    {kind:'action_required',value:data.actionRequiredTotal,tone:'red',Icon:Flag,note:`Total requests · ${number(data.statusCount('action_required'))} pending · ${number(data.statusCount('action_taken'))} action taken`},
    {kind:'action_taken',value:data.statusCount('action_taken'),tone:'yellow',Icon:ShieldCheck,note:'Check submitted corrective evidence'},
    {kind:'repeats',value:data.completedCounts.repeats,tone:'neutral',Icon:Repeat2,note:'Additional visits to the same location'},
    {kind:'not_inspected',value:data.completedCounts.remaining,tone:'neutral',Icon:MapPin,note:`Of ${amount(data.completedCounts.total,0)} registered locations`}
  ] as const;
  const notices=metrics.filter(m=>['pending_review','action_required','action_taken'].includes(m.kind)).map(m=>({id:m.kind==='action_required'?'action_pending':m.kind,title:m.kind==='action_required'?'ULB Action required (pending)':ulbDrillLabels[m.kind],detail:m.kind==='action_required'?'Follow up with the assigned IEC.':m.note,count:m.kind==='action_required'?data.statusCount('action_required'):m.value,tone:m.tone==='red'?'red' as const:'yellow' as const,page:'ulb_dashboard'})).filter(n=>n.count!=null&&n.count>0).map(n=>({...n,count:n.count!}));
  useEffect(()=>{onNoticeCount(notices.length);},[notices.length,onNoticeCount]);
  useEffect(()=>{if(noticeRequest>0){setBriefing(true);onNoticeHandled();}},[noticeRequest]);
  useEffect(()=>{if(coverage.loading||autoOpened.current)return;autoOpened.current=true;if(sessionStorage.getItem('matrixtrack_ulb_briefing_seen')!==`${currentUser.id}:${city.id}`)setBriefing(true);},[coverage.loading]);
  const closeBriefing=()=>{sessionStorage.setItem('matrixtrack_ulb_briefing_seen',`${currentUser.id}:${city.id}`);setBriefing(false);};
  const drillData=useMemo(()=>ulbScopeData(cov,drill?.scope||scope),[cov,drill,zoneKey,wardKey,moduleKey]);
  const allDetailRows=drill?.kind==='not_inspected'?drillData.notInspected.map(a=>({key:a.key,module:a.module,name:a.name,zoneId:a.zoneId,wardId:a.wardId,visit:undefined as typeof data.visits[number]|undefined})):ulbDrillVisits(drillData,drill?.kind||'all').map(v=>({key:v.id,module:v.module,name:cov.assets.find(a=>a.id===v.assetId&&a.module===v.module)?.name||v.assetId||'Location not recorded',zoneId:v.zoneId,wardId:v.wardId,visit:v}));
  const detailRows=allDetailRows.filter(r=>(!drillZones.length||drillZones.includes(r.zoneId||''))&&(!drillWards.length||drillWards.includes(r.wardId||''))&&(!drillModules.length||drillModules.includes(r.module)));
  const details=usePagination(detailRows,JSON.stringify(drill)+range.from+range.to+drillZones.join()+drillWards.join()+drillModules.join());
  useEffect(()=>{setDrillZones([]);setDrillWards([]);setDrillModules([]);},[drill?.kind,JSON.stringify(drill?.scope)]);
  useEffect(()=>{setDrill(null);setError('');},[zoneKey,wardKey,moduleKey,range.from,range.to]);
  const wardRows=useMemo(()=>cityWards.filter(w=>matchesUlbScope({zoneId:w.zoneId,wardId:w.id},scope)).map(w=>({ward:w,stats:ulbScopeData(cov,{zone:w.zoneId,ward:w.id})})).sort((a,b)=>(b.stats.statusCount('action_required')||0)-(a.stats.statusCount('action_required')||0)||(b.stats.statusCount('pending_review')||0)-(a.stats.statusCount('pending_review')||0)||(a.stats.completedCounts.percent??Infinity)-(b.stats.counts.percent??Infinity)||a.ward.name.localeCompare(b.ward.name)),[cov,wards,zoneKey,wardKey,moduleKey]);
  const wardPaging=usePagination(wardRows,zoneKey+wardKey+range.from+range.to);
  // Inspection target per area, from the Daroga target rows (set targets, or every assigned location when none is set).
  const scopedTargetRows=moduleFiltered?targetRows.filter(row=>moduleIds.includes(moduleId(row.module))):targetRows;
  const targetCells=(pick:(row:any)=>boolean)=>{if(!official||!pulse.performance?.SUPERVISOR)return null;const rows=scopedTargetRows.filter(pick);if(!rows.length)return null;const target=rows.reduce((n,row)=>n+row.target,0),done=rows.reduce((n,row)=>n+row.credit,0);return {target,done,pending:Math.max(0,target-done)};};
  const performanceRow=(name:string,selected:UlbScope,stats:ReturnType<typeof ulbScopeData>,isZone=false,t:{target:number;done:number;pending:number}|null=null)=>{
    const received=stats.completedCounts.inspections,count=(kind:UlbDrill,value:number|null,tone='')=><button className={tone?`ulb-count ${tone}`:''} onClick={()=>open(kind,selected)}>{number(value)}</button>;
    // Target pending = target - reports received (never below zero); unavailable when no target is known for the area.
    const pending=t&&received!=null?Math.max(0,t.target-received):null;
    return <tr key={name}><td><button className="ulb-scope-name" onClick={()=>{setZoneIds(selected.zone?[selected.zone]:[]);setWardIds(!isZone&&selected.ward?[selected.ward]:[]);}}>{name}<ArrowUpRight size={13}/></button></td>
      <td>{number(stats.completedCounts.total)}</td>
      <td>{t?number(t.target):'—'}</td>
      <td>{count('inspections_completed',received)}</td>
      <td>{pending==null?'—':number(pending)}</td>
      <td>{count('pending_review',stats.statusCount('pending_review'),'yellow')}</td>
      <td>{count('approved',stats.statusCount('approved'),'green')}</td>
      <td>{count('rejected',stats.statusCount('rejected'),'red')}</td>
      <td>{stats.completedCounts.percent==null?'—':`${amount(stats.completedCounts.percent)}%`}</td>
      <td>{count('action_required',stats.actionRequiredTotal,'red')}</td>
      <td>{count('action_taken',stats.actionTakenTotal,'yellow')}</td>
      <td>{count('action_pending',stats.statusCount('action_required'),'red')}</td></tr>;
  };
  const columns=<tr><th>Area</th><th>Total assets</th><th>Target</th><th>Reports received</th><th>Reports still needed</th><th>Pending review</th><th>Cleaned</th><th>Not cleaned</th><th>Coverage</th><th>Action requests raised</th><th>IEC Action taken</th><th>Action pending</th></tr>;
  return <div className="ulb-dashboard commissioner-home" data-role-dashboard="ULB_OFFICER">
    <section className="city-welcome"><div><span><ShieldCheck size={15}/>ULB OPERATIONS · {city.name}</span><h1>Inspection decisions & follow-up</h1><p>{range.from} to {range.to} · Review reports, track corrective work and close coverage gaps.</p></div></section>
    <div className="home-scope dashboard-multi-scope"><div><MapPin size={16}/><MultiSelectDropdown label="Zones" quickSelection={quickSelection} options={cityZones.map(z=>[z.id,z.name])} selected={zoneIds} onChange={ids=>{setZoneIds(ids);setWardIds(selected=>ulbSelectedWards(selected,ids,cityWards));}}/><MultiSelectDropdown label="Wards" options={cityWards.filter(w=>!zoneIds.length||zoneIds.includes(w.zoneId)).map(w=>[w.id,w.name])} selected={wardIds} onChange={setWardIds}/><MultiSelectDropdown label="Modules" options={city.enabledModules.map(m=>[m,MODULE_LABELS[m]||m])} selected={moduleIds} onChange={setModuleIds}/>{(zoneIds.length>0||wardIds.length>0||moduleIds.length>0)&&<button onClick={()=>{setZoneIds([]);setWardIds([]);setModuleIds([]);}}>Clear filters</button>}</div><button onClick={()=>open('all')}>All inspection reports<ArrowUpRight size={15}/></button></div>
    <InspectionTargetProgress showScoringCredit={false} receivedLabel="Submitted reports" from={range.from} to={range.to} delivery={delivery} fullTarget={data.completedCounts.required??null} received={data.completedCounts.inspections} loading={coverage.loading} onInspect={()=>open('inspections_completed')} onUpdate={()=>setTargetModal(true)}/>
    <UpdateTargetModal isOpen={targetModal} onClose={()=>setTargetModal(false)} onSaved={()=>setRevision(n=>n+1)} zones={cityZones} wards={cityWards}/>
    <ZoneOverviewCards loading={coverage.loading} onSelect={id=>open('all',{zone:id,wardIds})} cards={cityZones.filter(z=>(!zoneIds.length||zoneIds.includes(z.id))&&(!wardIds.length||cityWards.some(w=>w.zoneId===z.id&&wardIds.includes(w.id)))).map(z=>{const s=ulbScopeData(cov,{zone:z.id,wardIds}),t=reportTargetDelivery(targetReadState(targetDelivery(official?.zones?.find(o=>o.id===z.id)?.totals,s.completedCounts),Boolean(official&&pulse.performance?.SUPERVISOR)),s.completedCounts.inspections);return {id:z.id,name:z.name,wards:cityWards.filter(w=>w.zoneId===z.id&&(!wardIds.length||wardIds.includes(w.id))).length,percent:t.available?t.percent:null,totalAssets:s.completedCounts.total,fullTarget:s.completedCounts.required??null,target:t.available?t.target:null,completed:t.available?t.completed:null,pending:t.available?t.remaining:null};})}/>
    <div className="ulb-activity-heading"><div><span className="page-eyebrow">REPORT STATUS & FOLLOW-UP</span><h2>Inspection activity</h2></div><button disabled={coverage.loading||data.counts.inspections==null} onClick={()=>open('all')}><span>All records</span><strong data-metric="ulb-total-inspections">{number(data.counts.inspections)}</strong><ArrowUpRight size={17}/></button></div>
    <section className="home-section"><div className="home-section-heading"><div><h2>Current report status</h2>{!coverage.loading&&data.counts.inspections!=null&&<p>{number(data.counts.inspections)} total records.</p>}</div></div><StatusBreakdown label="ULB inspection workflow" loading={coverage.loading} items={[
      {id:'approved',label:'Cleaned',value:data.statusCount('approved'),tone:'green'},
      {id:'rejected',label:'Not cleaned',value:data.statusCount('rejected'),tone:'red'},
      {id:'pending_review',label:'Pending review',value:data.statusCount('pending_review'),tone:'yellow'},
      {id:'action_pending',label:'ULB Action required',value:data.statusCount('action_required'),tone:'red'},
      {id:'action_taken',label:'IEC Action taken',value:data.statusCount('action_taken'),tone:'yellow'},
      {id:'escalated',label:'Escalated',value:data.statusCount('escalated'),tone:'red'}
    ].map(item=>({...item,attributes:{'data-ulb-metric':item.id},tone:item.tone as 'green'|'yellow'|'red'|'neutral'}))} onSelect={id=>open(id as UlbDrill)}/>
    <div className="ulb-followup-tiles">
      <div className="ulb-followup-tile red"><button data-ulb-metric="action_required" disabled={coverage.loading||data.actionRequiredTotal==null} onClick={()=>open('action_required')}><span>Action requests raised</span><strong>{number(data.actionRequiredTotal)}</strong></button></div>
      <div className="ulb-followup-tile yellow"><button data-ulb-metric="all_actions_taken" disabled={coverage.loading||data.actionTakenTotal==null} onClick={()=>open('action_taken')}><span>IEC Action taken</span><strong>{number(data.actionTakenTotal)}</strong></button></div>
      <div className="ulb-followup-tile neutral"><button data-ulb-metric="repeats" disabled={coverage.loading||data.completedCounts.repeats==null} onClick={()=>open('repeats')}><span>Repeat visits</span><strong>{number(data.completedCounts.repeats)}</strong></button><CardInfo title="Repeat visits"><p>Same location inspected again in the selected dates. The first visit is not counted here.</p><p>Example: 3 inspections at one toilet = 2 repeat visits.</p><p>Click the number to see the reports.</p></CardInfo></div>
      <div className="ulb-followup-tile neutral"><button data-ulb-metric="not_inspected" disabled={coverage.loading||data.completedCounts.remaining==null} onClick={()=>open('not_inspected')}><span>Locations not inspected yet</span><strong>{number(data.completedCounts.remaining)}</strong></button><CardInfo title="Locations not inspected yet"><p>Registered locations that were not inspected in the selected dates.</p><p>A submitted report waiting for review counts as inspected.</p><p>Click the number to see the locations.</p></CardInfo></div>
    </div></section>
    <SiReviewOverview cityId={city.id} data={selectInspectionCoverage(cov,zoneIds,wardIds)} loading={coverage.loading} zoneIds={zoneIds} wardIds={wardIds} revision={revision} onPending={()=>open("pending_review")}/>
    <section className="home-section"><IntelligenceSummary reports={data.visits.map(v=>({...v.raw,status:v.raw?.workspaceStatus||v.status}))} loading={coverage.loading} unavailable={cov.failedModules.length>0||data.counts.inspections==null}/></section>
    {targetScopeMismatch&&<p role="status" className="coverage-data-note">Target credit exceeds the completed inspections visible in this register. Target achievement is withheld until assignment and report scopes reconcile; no value has been capped or invented.</p>}
    <section className="home-section ulb-target-panel"><div className="home-section-heading"><div><span>INSPECTIONS</span><h2>Inspection target & coverage</h2></div><CardInfo title="Inspection target & coverage">Achieved = submitted inspections. Coverage = locations inspected out of all registered locations.</CardInfo></div><div className="ulb-target-stats">{[['Total assets',data.completedCounts.total],['Inspection target',delivery.target],['Achieved',data.completedCounts.inspections],['Coverage %',data.completedCounts.percent==null?null:amount(data.completedCounts.percent)+'%'],['Unique assets inspected',data.completedCounts.covered],['Report target progress',reportProgress.percent==null?null:amount(reportProgress.percent)+'%']].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{coverage.loading?'Updating':typeof value==='string'?value:number(value as number|null)}</strong></div>)}</div>{!coverage.loading&&<div className="ulb-target-explanation"><p>{darogaRule?<>Daroga target set: <strong>{darogaRule}</strong>.</>:'Target setting unavailable.'}{delivery.target!=null&&delivery.completed!=null||reportProgress.percent!=null?` ${number(data.completedCounts.inspections)} of ${number(delivery.target)} target reports received.`:''}</p></div>}</section>
    <ModuleDelivery beatReports targetsReady={Boolean(official&&pulse.performance?.SUPERVISOR)} modules={shownModules} pulse={{...pulse,official}} data={selectInspectionCoverage(cov,zoneIds,wardIds)} loading={coverage.loading} zone="" ward="" onInspect={(module,status)=>open((status||'all') as UlbDrill,{...scope,module:shownModules.find(id=>id===module)})}/>
    <section className="home-section ulb-attention"><div className="home-section-heading"><div><span>YOUR NEXT DECISIONS</span><h2>Needs your attention</h2></div><span>{number(data.completedCounts.inspections)} reports received · {number(data.completedCounts.covered)} registered locations inspected</span></div><div className="ulb-attention-list">{[
      ['rejected','Review rejected reports','Check SI findings and mark ULB Action Required when needed.'],['action_pending','Follow up on corrective work','Review pending IEC work and the responsible officers.'],['action_taken','Review corrective evidence','Open submitted actions and check their verification stage.'],['not_inspected','Prioritize coverage gaps','See registered locations without an inspection during these dates.']
    ].map(([kind,title,note])=><button key={kind} onClick={()=>open(kind as UlbDrill)}><div><strong>{title}</strong><small>{note}</small></div><ArrowUpRight size={18}/></button>)}</div></section>
    <section className="home-section zone-performance"><div className="home-section-heading"><div><span>AREA FOLLOW-UP</span><h2>Zone performance</h2></div></div><div className="ulb-table-scroll"><table><thead>{columns}</thead><tbody>{cityZones.filter(z=>(!zoneIds.length||zoneIds.includes(z.id))&&(!wardIds.length||cityWards.some(w=>w.zoneId===z.id&&wardIds.includes(w.id)))).map(z=>performanceRow(z.name,{zone:z.id,wardIds},ulbScopeData(cov,{zone:z.id,wardIds}),true,targetCells(row=>row.zoneName===z.name)))}</tbody></table></div></section>
    <section className="home-section ward-overview"><div className="home-section-heading"><div><span>WARD FOLLOW-UP</span><h2>Ward performance</h2></div></div><div className="ulb-table-scroll"><table><thead>{columns}</thead><tbody>{wardPaging.rows.map(({ward:w,stats})=>performanceRow(w.name,{zone:w.zoneId,ward:w.id},stats,false,targetCells(row=>row.wardId===w.id)))}</tbody></table></div><Pagination {...wardPaging} noun="wards"/></section>
    <section className="home-section team-overview"><div className="home-section-heading"><div><span>FIELD TEAMS</span><h2>User performance</h2></div><button onClick={()=>onNavigate('ulb_user_perf')}>View users<ArrowUpRight size={15}/></button></div><div className="ulb-team-summary">{['SUPERVISOR','QC','ACTION_OFFICER'].map(role=>{const progress=role==='SUPERVISOR'?darogaProgress:role==='QC'?teamProgress.si:teamProgress.iec;const label=role==='SUPERVISOR'?'target reports':role==='QC'?'reports reviewed':'actions completed';return <button key={role} onClick={()=>onNavigate('ulb_user_perf')}><span>{ROLE_LABELS[role]}</span><strong>{coverage.loading?'Updating':progress.percent==null?'\u2014':`${amount(progress.percent)}%`}</strong>{visual&&!coverage.loading&&progress.percent!=null&&<RingMeter percent={progress.percent} met={progress.percent>=100} label={`${ROLE_LABELS[role]} progress`}/>}<small>{`${number(progress.completed)} / ${number(progress.target)} ${label} - selected area & dates`}</small><small>{role==='SUPERVISOR'?`Report target progress${delivery.configuredPercent!=null?` (${amount(delivery.configuredPercent)}% configured)`:''}`:role==='QC'?'Review completion':'Action completion - reopened requests stay pending'}</small></button>;})}</div></section>
    {(cov.errors.length>0||Object.keys(pulse.errors).length>0)&&<div className="compact-error" role="status">Some figures are unavailable. They are shown as —.<button onClick={()=>setRevision(n=>n+1)}>Refresh dashboard</button></div>}
    <CityBriefing open={briefing} onClose={closeBriefing} cityName={city.name} roleLabel="ULB Officer" period={range} notices={notices} pending={coverage.loading} onNavigate={onNavigate} onNotice={n=>open(n.id as UlbDrill)} snapshot={<section className="briefing-snapshot"><h3>Inspection decisions & follow-up</h3><p>Review approved and rejected reports, pending decisions, corrective evidence and locations not inspected.</p><p>{number(data.completedCounts.inspections)} reports received in the selected period.</p><p>SI review: {siSummary}.</p></section>}/>
    <Drawer isOpen={Boolean(drill)} onClose={()=>setDrill(null)} title={drill?ulbDrillLabels[drill.kind]:''} subtitle={`${range.from} to ${range.to} · ${scopeNames(cityZones,drill?.scope.zone,drill?.scope.zoneIds,'All zones')} · ${scopeNames(cityWards,drill?.scope.ward,drill?.scope.wardIds,'All wards')}`} width="4xl"><div className="ulb-detail-register"><div className="ops-filter-grid"><MultiSelectDropdown label="Zones" options={cityZones.filter(z=>(!drill?.scope.zone||z.id===drill.scope.zone)&&(!drill?.scope.zoneIds?.length||drill.scope.zoneIds.includes(z.id))).map(z=>[z.id,z.name] as [string,string])} selected={drillZones} onChange={ids=>{setDrillZones(ids);setDrillWards(w=>w.filter(id=>!ids.length||cityWards.some(x=>x.id===id&&ids.includes(x.zoneId))));}}/><MultiSelectDropdown label="Wards" options={cityWards.filter(w=>matchesUlbScope({zoneId:w.zoneId,wardId:w.id},drill?.scope)&&(!drillZones.length||drillZones.includes(w.zoneId))).map(w=>[w.id,w.name] as [string,string])} selected={drillWards} onChange={setDrillWards}/><MultiSelectDropdown label="Modules" options={shownModules.filter(id=>!drill?.scope.module||id===drill.scope.module).map(id=>[id,MODULE_LABELS[id]])} selected={drillModules} onChange={setDrillModules}/></div><p>{detailRows.length} {drill?.kind==='not_inspected'?'registered locations without an inspection':drill?.kind==='repeats'?'additional inspection records':'inspection records'} for this scope.</p>{error&&<p role="alert">{error}</p>}<div className="ulb-table-scroll"><table><thead><tr><th>Location</th><th>Module</th><th>Ward</th><th>Inspection date & time (IST)</th><th>Status</th><th>Report</th></tr></thead><tbody>{details.rows.map(row=><tr key={row.key}><td>{row.name}</td><td>{MODULE_LABELS[row.module]}</td><td>{wards.find(w=>w.id===row.wardId)?.name||'Not recorded'}</td><td>{row.visit?inspectionDateTime(row.visit.submittedAt):'No inspection in this period'}</td><td>{row.visit?<StatusBadge status={ulbVisitStatus(row.visit)}/>:<span>Not inspected</span>}</td><td>{row.visit?<button disabled={Boolean(opening)} onClick={async()=>{setOpening(row.key);setError('');try{const raw=await coverageReportDetail(city,cov,row.visit!,new AbortController().signal);const id=await matrixStore.loadOperationalReport(row.module,row.visit!.id.slice(row.module.length+1),{name:row.name,zoneId:row.zoneId,wardId:row.wardId},raw);setDrill(null);onSelectReport(id);}catch(e){setError(e instanceof Error?e.message:'Unable to open this report.');}finally{setOpening('');}}}>{opening===row.key?'Opening…':'View report'}<ArrowUpRight size={13}/></button>:'No report in this period'}</td></tr>)}</tbody></table></div>{!detailRows.length&&<p className="home-empty">No matching records for this period and area.</p>}<Pagination {...details} noun={drill?.kind==='not_inspected'?'locations':'inspections'}/></div></Drawer>
  </div>;
}
