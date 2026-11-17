import {CommissionerToolbar} from '../../components/layout/CommissionerToolbar';
import { ScopedPanel } from '../../components/dashboard/ScopedPanel';
import { CoverageFilterPanel } from '../../components/dashboard/CoverageFilterPanel';
import { usePersistedState } from '../../services/persistedFilters';
import { PlantOverview } from './PlantOverview';
import { InspectionReviewOverview } from './InspectionReviewOverview';
import {WardReportProgress} from './WardReportProgress';
import {wardFocusPreset} from '../../services/wardFocusPreset';
import {ulbReportRegister} from '../../services/ulbReportRegister';
import {ulbTeamProgress} from '../../services/ulbTeamProgress';
import {SiReviewOverview} from '../../components/analytics/SiReviewOverview';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { PanelScope, usePanelState, PanelActions, PanelSection, PanelStats, PanelTable, fmtNum, fmtPct } from '../../components/dashboard/DetailPanel';
import { CleanlinessInsights } from '../../components/dashboard/CleanlinessInsights';
import { AdviceDetail, useOfficerAdvice } from '../../components/dashboard/IntelligenceSuggestions';
import { CleanlinessDetail, CoverageDetail, type Scope } from '../../components/dashboard/panelBodies';
import { MultiSelectDropdown } from '../../components/common/MultiSelectDropdown';
import { matchesUlbScope, ulbSelectedWards } from '../../services/ulbDashboard';
import { InfoCard } from '../../components/common/CardInfo';
import { useVisual } from '../../services/vizMode';
import { Pictogram, ProgressMeter, Sparkbars, Waffle } from '../../components/analytics/VisualCharts';
import { dailyInspectionTrend } from '../../services/vizData';
import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Award, Brush, Building2, CheckCheck, Factory, Flag, Image as ImageIcon, MapPin, Printer, ShieldCheck, Target, Users } from 'lucide-react';
import type { City, OperationalReport, User, Ward, Zone } from '../../types';
import { matrixStore } from '../../services/store';
import { MODULE_LABELS, ROLE_LABELS, statusTone } from '../../services/presentation';
import { briefingNotices, useCityPulse, ulbInspectionSummary, applyPerformanceTargets, performanceTargetRows } from '../../services/commissioner';
import { computeUnitTotals } from '../../services/plantAnalytics';
import { printElement } from '../../services/print';
import { StatusBadge } from '../../components/common/Badge';
import { ImageLightbox } from '../../components/reports/ImageLightbox';
import { CityBriefing } from './CityBriefing';
import { OverviewInsights } from './OverviewInsights';
import { useInspectionCoverage } from '../../services/useInspectionCoverage';
import { CoverageOverview } from './CoverageOverview';
import { ZoneOverviewCards } from './ZoneOverviewCards';
import { ModuleDelivery } from './ModuleDelivery';
import { type InspectionVisit, coverageCounts, inspectionOutcomes, selectInspectionCoverage } from '../../services/inspectionCoverage';
import { inspectionPeriod } from '../../services/inspectionPeriod';
import { targetDelivery, targetReadState, reportTargetDelivery } from '../../services/targetDelivery';
interface Props {city:City;zones:Zone[];wards:Ward[];reports:OperationalReport[];users?:User[];currentUser:User;onNavigate:(page:string)=>void;onSelectReport:(id:string)=>void;onInspect:(module?:string|string[],status?:string,zone?:string|string[],ward?:string|string[])=>void;noticeRequest:number;onNoticeCount:(count:number)=>void;onNoticeHandled?:()=>void;}
const format=(n:number|undefined|null,decimals=0)=>n==null?'N/A':n.toLocaleString('en-IN',{maximumFractionDigits:decimals});
export function CommissionerHome({city,zones,wards,reports,users=[],currentUser,onNavigate,onSelectReport,onInspect:inspectReports,noticeRequest,onNoticeCount,onNoticeHandled}:Props) {
  const fk=(name:string)=>`home:${currentUser.id}:${city.id}:${name}`;
  const [zoneIds,setZoneIds]=usePersistedState<string[]>(fk('zones'),[]),[wardIds,setWardIds]=usePersistedState<string[]>(fk('wards'),[]),[revision,setRevision]=useState(0),[briefing,setBriefing]=useState(false),[photo,setPhoto]=useState<{report:OperationalReport;index:number}|null>(null),[moduleIds,setModuleIds]=usePersistedState<string[]>(fk('modules'),[]);
  const visual=useVisual();
  const root=useRef<HTMLDivElement>(null),evidenceRef=useRef<HTMLDivElement>(null),autoOpened=useRef(false);const range=matrixStore.getDateRange();
  const [evidenceScope,setEvidenceScope]=useState(''),evidenceKey=JSON.stringify([city.id,range.from,range.to]);
  const {api:panel,panel:panelContent}=usePanelState();
  useEffect(()=>{
    if(!evidenceRef.current)return;
    if(typeof IntersectionObserver==='undefined'){setEvidenceScope(evidenceKey);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setEvidenceScope(evidenceKey);observer.disconnect();}},{rootMargin:'100px'});observer.observe(evidenceRef.current);return()=>observer.disconnect();
  },[evidenceKey]);
  const zoneKey=zoneIds.join(','),wardKey=wardIds.join(','),moduleKey=moduleIds.join(','),scope={zoneIds,wardIds};
  const cityZones=zones.filter(z=>z.cityId===city.id),cityWards=wards.filter(w=>w.cityId===city.id);
  const focusPreset=useMemo(()=>wardFocusPreset(city.id,zones,wards),[city.id,zones,wards]);
  const quickSelection=focusPreset?{label:'15 wards \u00b7 6 zones',active:zoneIds.length===focusPreset.zoneIds.length&&wardIds.length===focusPreset.wardIds.length&&focusPreset.zoneIds.every(id=>zoneIds.includes(id))&&focusPreset.wardIds.every(id=>wardIds.includes(id)),onSelect:()=>{setZoneIds(focusPreset.zoneIds);setWardIds(focusPreset.wardIds);}}:undefined;
  const onInspect=(module?:string,status?:string)=>inspectReports(module||moduleIds,status,zoneIds,wardIds);
  const scopeZones=cityZones.filter(z=>(!zoneIds.length||zoneIds.includes(z.id))&&(!wardIds.length||cityWards.some(w=>w.zoneId===z.id&&wardIds.includes(w.id))));
  const loadedPulse=useCityPulse(city.id,range.from,range.to,scopeZones.map(z=>z.id),wardIds,revision+matrixStore.loadRevision,['attendance','rankings','plants','iec','performance'],zoneIds);
  const rawCoverage=useInspectionCoverage(city,range.from,range.to,revision+matrixStore.loadRevision,true,true);
  const coverageState=useMemo(()=>{
    const registered=ulbReportRegister(rawCoverage.data),keep=(row:{module:string})=>!moduleIds.length||moduleIds.includes(row.module);
    const selected={...registered,assets:registered.assets.filter(keep),visits:registered.visits.filter(keep),modules:registered.modules.filter(m=>!moduleIds.length||moduleIds.includes(m)),failedModules:registered.failedModules.filter(m=>!moduleIds.length||moduleIds.includes(m))};
    return {...rawCoverage,data:selectInspectionCoverage(selected,zoneIds,wardIds)};
  },[rawCoverage.data,rawCoverage.loading,zoneKey,wardKey,moduleKey]);
  const pulse=useMemo(()=>{
    const summary=ulbInspectionSummary(coverageState.data,scopeZones,wardIds);
    const official=summary&&loadedPulse.performance?.SUPERVISOR?applyPerformanceTargets(summary,loadedPulse.performance.SUPERVISOR,wardIds,moduleIds):summary;
    return {...loadedPulse,official,rankings:loadedPulse.rankings?.filter(row=>matchesUlbScope(row,scope))};
  },[loadedPulse,coverageState,zoneKey,wardKey,moduleKey,zones]);
  const notices=useMemo(()=>{
    const inspection=inspectionOutcomes(coverageState.data);
    const summary=coverageState.loading?undefined:{...pulse.official?.totals,siPending:inspection.rows.find(r=>r.id==='pending_review')?.value??0,actionRequired:inspection.rows.find(r=>r.id==='action_required')?.value??0};
    return briefingNotices({...pulse,official:summary?{...pulse.official,totals:summary} as typeof pulse.official:undefined});
  },[pulse,coverageState]),totals=pulse.official?.totals;
  const closeBriefing=useCallback(()=>{sessionStorage.setItem('matrixtrack_briefing_seen',`${currentUser.id}:${city.id}`);setBriefing(false);},[currentUser.id,city.id]);
  useEffect(()=>{onNoticeCount(notices.length);},[notices.length,onNoticeCount]);
  useEffect(()=>{if(autoOpened.current||(!pulse.official&&pulse.pending>0))return;autoOpened.current=true;if(sessionStorage.getItem('matrixtrack_briefing_seen')!==`${currentUser.id}:${city.id}`)setBriefing(true);},[pulse.official,pulse.pending,currentUser.id,city.id]);
  useEffect(()=>{if(noticeRequest>0){setBriefing(true);onNoticeHandled?.();}},[noticeRequest]);
  useEffect(()=>{if(evidenceScope===evidenceKey&&matrixStore.getCollection('reports').status==='idle')void matrixStore.loadCollection('reports');},[evidenceScope,evidenceKey]);
  const ranking=(pulse.rankings || []).filter(r=>r.rankable!==false).sort((a,b)=>(a.cityRank??9999)-(b.cityRank??9999));
  const plantTotals=pulse.plants?computeUnitTotals(pulse.plants.plantPerformance):[];const primaryPlant=plantTotals.find(t=>t.unit==='MT') || plantTotals[0];
  const recent=reports.filter(r=>r.cityId===city.id&&r.inspectionDate>=range.from&&r.inspectionDate<=range.to&&(!moduleIds.length||moduleIds.includes(r.moduleId))&&matchesUlbScope(r,scope)).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)).slice(0,5);
  const cityModules=city.enabledModules.filter(m=>!moduleIds.length||moduleIds.includes(m));


  const inspectionCounts=coverageCounts(coverageState.data);
  const metrics=inspectionMetrics(coverageState.data,{},totals);
  const targetsReady=Boolean(pulse.official&&pulse.performance?.SUPERVISOR);
  const delivery=targetReadState(metrics.delivery,targetsReady);
  const reportProgress=reportTargetDelivery(delivery,metrics.achieved);
  const teamProgress=ulbTeamProgress(coverageState.data);
  const targetRows=pulse.official?performanceTargetRows(pulse.official,pulse.performance?.SUPERVISOR||{},wardIds,moduleIds):[];
  const reportPeriod=inspectionPeriod(metrics.completed,reportProgress,range.from,range.to);
  const period={...reportPeriod,achievement:'Report target progress',progress:`${format(metrics.achieved)} reports received / ${format(delivery.target)} target`,rule:'Reports still needed = target minus submitted reports, minimum zero.Daroga performance uses its own scoring credit rules.'};
  const outcomes=inspectionOutcomes(coverageState.data);
  const actionRequired=coverageState.loading?null:outcomes.rows.find(r=>r.id==='action_required')?.value;
  const attendance=pulse.attendance;
  const trend=useMemo(()=>visual?dailyInspectionTrend(coverageState.data):[],[visual,coverageState.data]);
  const scopeWards=cityWards.filter(w=>matchesUlbScope({zoneId:w.zoneId,wardId:w.id},scope));
  const openReports=(target:Scope,status?:string)=>{const ward=target.ward?cityWards.find(w=>w.id===target.ward):undefined;inspectReports(target.module?[target.module]:moduleIds,status,ward?[ward.zoneId]:target.zone?[target.zone]:zoneIds,ward?[ward.id]:wardIds);};
  const openCoverage=(target:Scope)=>panel.open({title:target.module?`${MODULE_LABELS[target.module as keyof typeof MODULE_LABELS]||target.module} coverage`:'Inspection coverage',subtitle:`${range.from} to ${range.to} · ${scopeText}`,width:'3xl',body:<CoverageFilterPanel data={coverageState.data} modules={cityModules} zones={scopeZones} wards={scopeWards} initial={target} onOpen={openReports}/>});
  const viewReport=async(v:InspectionVisit)=>{try{const id=await matrixStore.loadOperationalReport(v.module,String(v.raw?.id||v.id.split(":")[1]),{name:v.raw?.locationName,zoneId:v.zoneId,wardId:v.wardId});panel.close();onSelectReport(id);}catch{window.alert('This report could not be opened right now. Please try again.');}};
  const zoneCards=scopeZones.map(z=>{const m=inspectionMetrics(coverageState.data,{zone:z.id}),t=reportTargetDelivery(targetReadState(targetDelivery(pulse.official?.zones?.find(s=>s.id===z.id)?.totals,m.completed),targetsReady),m.achieved);return {id:z.id,name:z.name,wards:cityWards.filter(w=>w.zoneId===z.id&&(!wardIds.length||wardIds.includes(w.id))).length,percent:t.available?t.percent:null,totalAssets:m.completed.total,fullTarget:m.completed.required??null,target:t.available?t.target:null,completed:t.available?t.completed:null,pending:t.available?t.remaining:null};});
  const directory=users.length?users:matrixStore.getUsers(city.id);
  const advice=useOfficerAdvice({data:coverageState.data,performance:pulse.performance,users:directory,wards:scopeWards,zoneIds,wardIds});
  const scopeText=`${period.range} · ${wardIds.length?`${wardIds.length} wards`:zoneIds.length?`${zoneIds.length} zones`:'All zones and wards'}`;
  const moduleRows=(pick:(id:typeof cityModules[number])=>React.ReactNode[])=>cityModules.map(id=>({key:id,cells:[MODULE_LABELS[id],...pick(id)]}));
  const openKpi=(kind:'inspections'|'target'|'coverage'|'attendance')=>{
    if(coverageState.loading&&kind!=='attendance'&&kind!=='coverage')return;
    if(kind==='inspections')panel.open({title:'Inspections completed',subtitle:scopeText,width:'3xl',body:<ScopedPanel zones={scopeZones} wards={scopeWards} modules={cityModules}>{f=>{
      const sc={zone:f.zone,ward:f.ward,module:f.module as any},m0=inspectionMetrics(coverageState.data,sc,f.zone||f.ward||f.module?undefined:pulse.official?.totals);
      return <>
      <PanelStats items={[{label:'Inspections completed',value:fmtNum(m0.achieved),tone:'blue'},{label:'Total inspection records',value:fmtNum(m0.totalRecords),note:'All statuses'},{label:'Unique assets inspected',value:fmtNum(m0.uniqueEntities)},{label:'Registered assets',value:fmtNum(m0.totalEntities),note:'Current inventory'}]}/>
      {!f.module&&<PanelSection title="By module"><PanelTable head={['Module','Completed','Unique assets','Coverage']} rows={moduleRows(id=>{const m=inspectionMetrics(coverageState.data,{module:id,zone:f.zone,ward:f.ward});return [fmtNum(m.achieved),fmtNum(m.uniqueEntities),fmtPct(m.coveragePercent)];})}/></PanelSection>}
      {!f.ward&&!f.zone&&<PanelSection title="By zone"><PanelTable head={['Zone','Completed','Unique assets','Coverage']} rows={scopeZones.map(z=>{const m=inspectionMetrics(coverageState.data,{zone:z.id,module:f.module as any});return {key:z.id,cells:[z.name,fmtNum(m.achieved),fmtNum(m.uniqueEntities),fmtPct(m.coveragePercent)]};})}/></PanelSection>}
      <PanelActions actions={[{label:'Open completed inspections',primary:true,onClick:()=>onInspect(f.module,'inspections_completed')}]}/></>;}}</ScopedPanel>});
    if(kind==='target')panel.open({title:period.achievement,subtitle:scopeText,width:'3xl',body:<>
      <PanelStats items={[{label:'Total inspections required',value:<span data-target-progress="full-target">{fmtNum(metrics.completed.required)}</span>,note:'Every registered asset, every selected day (100% target)'},{label:'Inspection target',value:<span data-target-progress="target">{fmtNum(delivery.target)}</span>},{label:'Reports received',value:<span data-target-progress="received">{fmtNum(metrics.achieved)}</span>,tone:'blue'},{label:'Reports still needed',value:<span data-target-progress="remaining">{fmtNum(reportProgress.remaining)}</span>,tone:'amber'},{label:'Progress',value:reportProgress.available?fmtPct(reportProgress.percent):'N/A',tone:reportProgress.met?'green':'amber'}]}/>
      <p className="dp-note">{period.basis} {period.rule}</p>
      <PanelSection title="By module"><PanelTable head={['Module','Target','Received','Progress']} rows={moduleRows(id=>{const m=inspectionMetrics(coverageState.data,{module:id},pulse.official?.modules[id]),d=reportTargetDelivery(targetReadState(m.delivery,targetsReady),m.achieved);return [fmtNum(d.target),fmtNum(m.achieved),fmtPct(d.percent)];})}/></PanelSection>
      <PanelSection title="By zone"><PanelTable head={['Zone','Target','Received','Still needed','Progress']} rows={zoneCards.map(c=>({key:c.id,cells:[c.name,fmtNum(c.target),fmtNum(c.completed),fmtNum(c.pending),fmtPct(c.percent)]}))}/></PanelSection>
      <PanelActions actions={[{label:'Open inspection register',primary:true,onClick:()=>onInspect()}]}/></>});
    if(kind==='coverage')openCoverage({});
    if(kind==='attendance')panel.open({title:'Attendance',subtitle:scopeText,body:<>
      <PanelStats items={[{label:'Attendance rate',value:attendance?.attendanceRate==null?'N/A':fmtPct(attendance.attendanceRate),tone:'blue'},{label:'Present',value:fmtNum(attendance?.present),tone:'green'},{label:'Absent',value:fmtNum(attendance?.absent),tone:'red'}]}/>
      <p className="dp-note">Present attendance records divided by present plus absent records for the selected dates and area. Across several days the same employee appears once per day.{pulse.errors.attendance?` ${pulse.errors.attendance}`:''}</p>
      <PanelActions actions={[{label:'Open attendance',primary:true,onClick:()=>onNavigate('comm_attendance')}]}/></>});
  };
  const openTeam=(role:string,label:string,progress:{completed:number|null;target:number|null;percent:number|null})=>{
    const people=advice.filter(a=>a.role===role&&a.severity!=='good'&&a.suggestions.length);
    panel.open({title:ROLE_LABELS[role],subtitle:`${label} · ${scopeText}`,body:<>
      <PanelStats items={[{label,value:fmtPct(progress.percent),tone:'blue'},{label:'Completed',value:fmtNum(progress.completed)},{label:'Target',value:fmtNum(progress.target)}]}/>
      <PanelSection title="Officers needing support" note="From intelligence suggestions. Select an officer for specific steps."><PanelTable head={['Officer','Score','Top suggestion']} empty="No officer in this role needs improvement on the recorded evidence." rows={people.map(a=>({key:a.id,onClick:()=>panel.open({title:a.name,subtitle:`${ROLE_LABELS[a.role]} · intelligence suggestions`,body:<AdviceDetail advice={a} onNavigate={()=>onNavigate('comm_user_perf')}/>}),cells:[a.name,a.score==null?'N/A':`${Math.round(a.score)}%`,a.suggestions[0]?.title||'N/A']}))}/></PanelSection>
      <PanelActions actions={[{label:'Open user performance',primary:true,onClick:()=>onNavigate('comm_user_perf')}]}/></>});
  };
  const openWard=(r:any)=>panel.open({title:r.wardName,subtitle:`${r.zoneName||'Ward'} · rank ${r.cityRank??'N/A'}`,width:'3xl',body:<>
    <PanelStats items={[{label:'Ward score',value:`${fmtNum(r.finalScore,1)} / 100`,tone:'blue'},{label:'City rank',value:fmtNum(r.cityRank)},{label:'Performance band',value:String(r.performanceBand||'N/A').replace(/_/g,' ')}]}/>
    <PanelSection title="Cleanliness"><CleanlinessDetail data={coverageState.data} scope={{ward:r.wardId}} wards={cityWards} onOpen={openReports} onViewReport={viewReport}/></PanelSection>
    <PanelActions actions={[{label:'Open ward ranking',onClick:()=>onNavigate('comm_ward_ranking')}]}/></>});
  const openPlants=()=>panel.open({title:'Plant & Processing',subtitle:scopeText,body:<>
    <PanelStats items={[{label:'Plants reporting',value:`${fmtNum(pulse.plants?.reportingPlants ?? pulse.plants?.activePlants)} / ${fmtNum(pulse.plants?.totalPlants)}`}]}/>
    <PanelTable head={['Unit','Received','Recovered','Recovery']} empty="No plant figures recorded for these dates." rows={plantTotals.map(t=>({key:t.unit,cells:[t.unit,fmtNum(t.received,1),fmtNum(t.recovered,1),t.hasEfficiency?fmtPct(t.efficiency):'N/A']}))}/>
    <PanelActions actions={[{label:'Open plant performance',primary:true,onClick:()=>onNavigate('comm_plant')}]}/></>});
  const openNotice=(n:typeof notices[number])=>{if(n.id==='reviews')onInspect(undefined,'pending_review');else if(n.id==='action')onInspect(undefined,'action_required');else onNavigate(n.page);};
  return <PanelScope api={panel} panel={panelContent}><div ref={root} className="commissioner-home" data-role-dashboard={currentUser.role}>
    <section className="city-welcome"><div><span><ShieldCheck size={14}/>CITY OPERATIONS</span><h1>{city.name.replace(/\s+municipal corporation$/i, '')} Municipal Corporation at a glance</h1><p>Inspections. People. City performance.</p></div><div className="welcome-actions"><button aria-label="Print city overview" onClick={()=>printElement(`${city.name} · City Overview`,root.current,`${range.from} to ${range.to}`)}><Printer size={17}/></button></div><div className="welcome-watermark" aria-hidden="true"><Building2 size={148} strokeWidth={.55}/></div></section>
    <div className="home-scope dashboard-multi-scope"><div><MapPin size={15}/><MultiSelectDropdown label="Zones" quickSelection={quickSelection} options={cityZones.map(z=>[z.id,z.name])} selected={zoneIds} onChange={ids=>{setZoneIds(ids);setWardIds(selected=>ulbSelectedWards(selected,ids,cityWards));}}/><MultiSelectDropdown label="Wards" options={cityWards.filter(w=>!zoneIds.length||zoneIds.includes(w.zoneId)).map(w=>[w.id,w.name])} selected={wardIds} onChange={setWardIds}/><MultiSelectDropdown label="Modules" options={city.enabledModules.map(m=>[m,MODULE_LABELS[m]])} selected={moduleIds} onChange={setModuleIds}/><CommissionerToolbar embedded pageId="comm_dashboard" title="City Overview" cityName={city.name}/>{(zoneIds.length>0||wardIds.length>0||moduleIds.length>0)&&<button onClick={()=>{setZoneIds([]);setWardIds([]);setModuleIds([]);}}>Clear filters</button>}</div><button onClick={()=>onNavigate('comm_map')}>Explore city map <ArrowUpRight size={14}/></button></div>
    <div className="home-kpis"><InfoCard title="Inspections completed" info={<><p>{period.range}</p><p>Achieved counts completed field inspections. Total inspection records includes all statuses. Each report is counted once.</p><p>Unique assets inspected counts registered assets with a completed field visit once across the selected dates. Total assets is current inventory, counted once regardless of the date range. Open this card to review completed inspections.</p></>}><button className="target-kpi" data-met={reportProgress.met} onClick={()=>openKpi('inspections')}><span><CheckCheck size={17}/>Inspections completed</span><strong data-metric="overview-inspections">{coverageState.loading?'\u2026':format(metrics.achieved)}</strong>{visual&&!coverageState.loading&&<Sparkbars points={trend} label="Completed inspections per day"/>}<footer><span className="inspection-kpi-context"><span>{coverageState.loading?'Updating...':`${format(metrics.totalRecords)} records in ${period.duration}`}</span><span>{format(metrics.totalEntities)} registered assets <small>(current inventory)</small></span></span><ArrowUpRight size={13}/></footer></button></InfoCard><InfoCard title={period.achievement} info={<><p>{period.range}</p><p>{period.basis}</p><p>{period.progress}</p><p>{period.rule}</p><p>Inspection activity and cleanliness outcomes are separate measures.</p></>}><button className="target-kpi" data-met={reportProgress.met} onClick={()=>openKpi('target')}><span><Target size={17}/>{period.achievement}</span><strong data-target-ready={targetsReady} data-target-state={delivery.fallback?"full_coverage":delivery.state}>{reportProgress.available&&reportProgress.percent!=null?`${format(reportProgress.percent,1)}%`:'N/A'}</strong>{reportProgress.available&&<ProgressMeter visual={visual} className="delivery-meter" percent={reportProgress.percent} met={reportProgress.met} variant="segments" label="Report target progress"/>}<footer>{coverageState.loading?'Updating...':delivery.target==null?'Inspection target unavailable':`${period.duration} selected`}<ArrowUpRight size={13}/></footer></button></InfoCard><InfoCard title="Coverage %" info={<><p>{period.range}</p><p>Unique registered assets with a completed inspection divided by Total assets. Each asset counts once across the selected dates.</p><p>{format(metrics.uniqueEntities)} unique assets inspected / {format(metrics.totalEntities)} currently registered assets. Inventory is independent of the date range; the inspected count uses only the selected dates and geography.</p><p>Repeated visits to the same asset, including on different days, count once for coverage. Coverage is different from daily inspection target achievement.</p></>}><button onClick={()=>openKpi('coverage')}><span><MapPin size={17}/>Coverage %</span><strong data-metric="overview-coverage">{coverageState.loading?'Updating':metrics.coveragePercent==null?'N/A':`${format(metrics.coveragePercent,1)}%`}</strong>{visual&&!coverageState.loading&&metrics.coveragePercent!=null&&<Waffle percent={metrics.coveragePercent} label="Coverage" legend={["Assets inspected","Not yet inspected"]}/>}<footer><span className="inspection-kpi-context"><span>{coverageState.loading?'Updating...':`${format(metrics.uniqueEntities)} unique inspected in ${period.duration}`}</span><span>of {format(metrics.totalEntities)} registered assets{!coverageState.loading&&metrics.totalEntities!=null&&metrics.uniqueEntities!=null?` · ${format(Math.max(0,metrics.totalEntities-metrics.uniqueEntities))} not yet inspected`:''}</span></span><ArrowUpRight size={13}/></footer></button></InfoCard><InfoCard title={'Attendance'} info={<><p>{period.range}</p><p>Present attendance records divided by present plus absent records for the selected dates and geography. Across multiple days, the same employee can appear once for each day.</p></>}><button data-tone="neutral" onClick={()=>openKpi('attendance')}><span><Users size={17}/>Attendance</span><strong>{attendance?.attendanceRate==null?'N/A':`${format(attendance.attendanceRate,1)}%`}</strong>{visual&&attendance&&<Pictogram present={attendance.present} absent={attendance.absent}/>}<footer>{attendance?`${format(attendance.present)} present · ${format(attendance.absent)} absent`:pulse.errors.attendance?'N/A':'Employee attendance'}<ArrowUpRight size={13}/></footer></button></InfoCard></div>
    <CleanlinessInsights data={coverageState.data} loading={coverageState.loading} modules={cityModules} zones={scopeZones} wards={scopeWards} onOpen={openReports} onViewReport={viewReport}/>
    <CoverageOverview part="coverage" onCoverage={openCoverage} targetsReady={targetsReady} data={coverageState.data} loading={coverageState.loading} zone="" ward="" scopeLabel={wardIds.length?`${wardIds.length} wards selected`:zoneIds.length?`${zoneIds.length} zones selected`:'All zones and wards'} zones={scopeZones} rankings={pulse.rankings || []} official={pulse.official} from={range.from} to={range.to} wards={scopeWards} onOpen={openReports} onZone={()=>{}}/>
    <InspectionReviewOverview zones={scopeZones} wards={scopeWards} scopeText={scopeText} onViewReport={viewReport} cityId={city.id} pulse={pulse} data={coverageState.data} loading={coverageState.loading} zoneIds={zoneIds} wardIds={wardIds} revision={revision+matrixStore.loadRevision} onInspect={onInspect}/>
    <ModuleDelivery zoneOptions={scopeZones} onViewReport={viewReport} onCoverage={scope=>openCoverage(scope)} beatReports targetsReady={targetsReady} modules={cityModules} pulse={pulse} data={coverageState.data} loading={coverageState.loading} zone="" ward="" wards={scopeWards} onInspect={onInspect}/>
    <ZoneOverviewCards loading={coverageState.loading} onSelect={id=>inspectReports(moduleIds,undefined,[id],wardIds)} cards={zoneCards} detail={{data:coverageState.data,wards:scopeWards,modules:cityModules,onOpen:openReports,onViewReport:viewReport}}/>
    <CoverageOverview part="zones" zoneDetail rankingsLoading={pulse.pending>0&&!pulse.rankings} onCoverage={openCoverage} targetsReady={targetsReady} data={coverageState.data} loading={coverageState.loading} zone="" ward="" scopeLabel={wardIds.length?`${wardIds.length} wards selected`:zoneIds.length?`${zoneIds.length} zones selected`:'All zones and wards'} zones={scopeZones} rankings={pulse.rankings || []} official={pulse.official} from={range.from} to={range.to} wards={scopeWards} onOpen={openReports} onZone={()=>{}}/>
    <WardReportProgress wardDetail rankings={pulse.rankings||[]} rankingsLoading={pulse.pending>0&&!pulse.rankings} zoneNames={Object.fromEntries(cityZones.map(z=>[z.id,z.name]))} data={coverageState.data} wards={cityWards.filter(w=>matchesUlbScope({zoneId:w.zoneId,wardId:w.id},scope))} targetRows={targetRows} targetsReady={targetsReady} loading={coverageState.loading} onInspect={(ward,status)=>inspectReports(moduleIds,status,[ward.zoneId],[ward.id])}/>
    <div className="home-insights-grid">
    <PlantOverview plants={pulse.plants} totals={plantTotals} primary={primaryPlant} loading={!pulse.plants&&pulse.pending>0} onOpen={openPlants} onNavigate={()=>onNavigate('comm_plant')}/></div>
    <div ref={evidenceRef} className="home-bottom-grid"><section className="home-section"><div className="home-section-heading"><div><span>FIELD ACTIVITY</span><h2>Recent inspection evidence</h2></div><button onClick={()=>onInspect()}>All reports<ArrowRight size={14}/></button></div><div className="home-evidence-strip">{recent.map(r=><article key={r.id}><button className="home-evidence-image" aria-label={`Open images for ${r.assetName}`} onClick={()=>r.photos.length?setPhoto({report:r,index:0}):onSelectReport(r.id)}>{r.photos[0]?<img src={r.photos[0].url} alt={r.assetName} loading="lazy"/>:<ImageIcon size={24}/>}<span>{r.photos.length} images</span></button><button className="home-evidence-title" onClick={()=>onSelectReport(r.id)}><strong>{r.assetName}</strong><small>{MODULE_LABELS[r.moduleId]}</small></button><StatusBadge status={r.status} size="sm"/></article>)}{!recent.length&&<div className="home-empty">{matrixStore.getCollection('reports').status==='loading'?'Loading recent reports…':matrixStore.getCollection('reports').status==='error'?'Recent reports are unavailable. Open All reports to retry.':'Open All reports for the complete inspection register.'}</div>}</div></section></div>
    {(Object.keys(pulse.errors).length>0||coverageState.data.errors.length>0)&&<div className="home-refresh-note">Some information is unavailable.<button onClick={()=>setRevision(n=>n+1)}>Refresh overview</button></div>}
    <CityBriefing inspectionSummary={{total:coverageState.loading?null:outcomes.total,pending:coverageState.loading?null:outcomes.rows.find(r=>r.id==='pending_review')?.value??null,modules:cityModules.map(id=>{const m=inspectionMetrics(coverageState.data,{module:id},pulse.official?.modules[id]),d=reportTargetDelivery(targetReadState(m.delivery,targetsReady),m.achieved);return {id,label:MODULE_LABELS[id],value:coverageState.loading?null:d.percent,display:coverageState.loading?'Updating':d.percent==null?'N/A':`${format(d.percent,1)}%`,detail:`${format(m.achieved)} reports received / ${format(d.target)} target`,color:'#2b7a78'};})}} roleLabel={ROLE_LABELS[currentUser.role]} period={range} open={briefing} onClose={closeBriefing} cityName={city.name} pulse={pulse} notices={notices} pending={pulse.pending>0||coverageState.loading} onNavigate={onNavigate} onNotice={openNotice}/><ImageLightbox isOpen={Boolean(photo)} onClose={()=>setPhoto(null)} images={photo?.report.photos || []} initialIndex={photo?.index || 0}/>
  </div></PanelScope>;
}
