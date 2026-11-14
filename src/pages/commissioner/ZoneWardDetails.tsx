import {FOCUS_SCOPE,focusLabel,wardFocusPreset} from '../../services/wardFocusPreset';
import {MultiSelectDropdown} from '../../components/common/MultiSelectDropdown';
import {ulbReportRegister} from '../../services/ulbReportRegister';
import {aggregateTargetState} from '../../services/targetConfiguration';
import {selectInspectionModules} from '../../services/inspectionCoverage';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { inspectionPeriod } from '../../services/inspectionPeriod';
import { geographyOrder, wardInspectionRows } from '../../services/wardInspections';
import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React, { useEffect, useMemo, useState } from 'react';
import { City, Zone, Ward, Beat, OperationalReport, IecCleanlinessIssue, AttendanceRecord, User } from '../../types';
import { StatusBadge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { MODULE_LABELS } from '../../services/presentation';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { printReports } from '../../components/reports/ReportDocument';
import { api } from '../../services/api';
import { matrixStore } from '../../services/store';
import { summarizeZones, applyPerformanceTargets } from '../../services/commissioner';
import { useInspectionCoverage } from '../../services/useInspectionCoverage';
import { coverageCounts, inspectionOutcomes, selectInspectionCoverage } from '../../services/inspectionCoverage';
import { targetDelivery, reportTargetDelivery } from '../../services/targetDelivery';
import { ChartCard, BarChart } from '../../components/analytics/Analytics';
import { OverviewInsights } from './OverviewInsights';
import { emptyFilters, matchesFilters } from '../../services/presentation';
import { OperationalFilters } from '../../components/common/OperationalFilters';
import { Layers, CheckCircle2, AlertTriangle, Users, Eye } from 'lucide-react';

interface ZoneWardDetailsProps {
  city: City;
  zones: Zone[];
  wards: Ward[];
  beats: Beat[];
  reports: OperationalReport[];
  iecIssues: IecCleanlinessIssue[];
  attendance: AttendanceRecord[];
  users: User[];
  onSelectReport: (reportId: string) => void;
}

export const ZoneWardDetails: React.FC<ZoneWardDetailsProps> = ({
  city,
  zones,
  wards,
  beats,
  users,
  onSelectReport
}) => {
  const cityZones = zones.filter(z => z.cityId === city.id).sort(geographyOrder);
  const cityWards = wards.filter(w => w.cityId === city.id).sort(geographyOrder);

  const [selectedZoneId, setSelectedZoneId] = useState('all');
  const focus = useMemo(() => wardFocusPreset(city.id, zones, wards), [city.id, zones, wards]);
  const focusName = selectedZoneId === FOCUS_SCOPE && focus ? focusLabel(focus) : '';
  const selectableWards = cityWards.filter(w => selectedZoneId === 'all' || (selectedZoneId === FOCUS_SCOPE ? !!focus?.wardIds.includes(w.id) : w.zoneId === selectedZoneId));
  const [selectedWardId, setSelectedWardId] = useState<string>(cityWards[0]?.id || '');

  const allWards = selectedWardId === 'all';
  const singleWard = selectableWards.find(w => w.id === selectedWardId);
  const currentWard = allWards ? undefined : singleWard || selectableWards[0];
  const scopeWards = allWards ? selectableWards : currentWard ? [currentWard] : [];
  const scopeWardIds = scopeWards.map(w => w.id), scopeWardKey = scopeWardIds.join(',');
  const scopeZoneIds = [...new Set(scopeWards.map(w => w.zoneId))], scopeZoneKey = scopeZoneIds.join(',');
  const currentZone = allWards ? (selectedZoneId === 'all' ? undefined : cityZones.find(z => z.id === selectedZoneId)) : cityZones.find(z => z.id === currentWard?.zoneId);
  const scopeLabel = allWards ? (currentZone ? `${currentZone.name} · All wards (${scopeWards.length})` : focusName ? `${focusName} · All wards (${scopeWards.length})` : `All wards (${scopeWards.length})`) : currentWard?.name || 'Select ward';
  const zoneNameOf=(id:string)=>cityZones.find(z=>z.id===id)?.name||'',wardNameOf=(id:string)=>cityWards.find(w=>w.id===id)?.name||'';
  const scopeZoneName = allWards ? (currentZone?.name || focusName || 'All zones') : currentZone?.name;

  const [filters,setFilters]=useState(emptyFilters);
  const [figures,setFigures]=useState<ReturnType<typeof summarizeZones>|null>(null),[present,setPresent]=useState<number|null>(null),[issues,setIssues]=useState<number|null>(null),[failed,setFailed]=useState(false),[revision,setRevision]=useState(0);
  const range=matrixStore.getDateRange();
  const rawCoverage=useInspectionCoverage({...city,enabledModules:city.enabledModules??[]},range.from,range.to,revision+matrixStore.loadRevision,true,true);
  const moduleIds=filters.moduleIds.length?filters.moduleIds:filters.moduleId!=='all'?[filters.moduleId]:[],moduleKey=moduleIds.join(',');
  const coverage=useMemo(()=>({...rawCoverage,data:selectInspectionModules(ulbReportRegister(rawCoverage.data),moduleIds)}),[rawCoverage.data,rawCoverage.loading,moduleKey]);
  const selectedFigures=useMemo(()=>{
    if(!figures||!moduleIds.length)return figures;
    const modules=Object.fromEntries(Object.entries(figures.modules).filter(([id])=>moduleIds.includes(id))),rows=Object.values(modules);
    return {...figures,modules,totals:{...figures.totals,target:rows.reduce((n,row)=>n+row.target,0),completed:rows.reduce((n,row)=>n+row.completed,0),targetState:aggregateTargetState(rows)}};
  },[figures,moduleKey]);
  const scoped=useMemo(()=>selectInspectionCoverage(coverage.data,[],scopeWardIds),[coverage.data,scopeWardKey]);
  const wardOutcomes=inspectionOutcomes(scoped);
  const counts=coverageCounts(scoped);
  const metrics=inspectionMetrics(scoped,{},selectedFigures?.totals),delivery=reportTargetDelivery(metrics.delivery,metrics.achieved);
  const allWardReports=useMemo(()=>scopeWards.length?wardInspectionRows(scoped,city.id,undefined,cityZones,cityWards,beats):[],[scoped,city.id,scopeWardKey,zones,wards,beats]);
  const wardReports=allWardReports.filter(r=>matchesFilters(r,filters,[r.assetName,r.submittedByName,zoneNameOf(r.zoneId),wardNameOf(r.wardId)]));
  const paging=usePagination(wardReports,`${city.id}:${scopeWardKey}:${range.from}:${range.to}:${JSON.stringify(filters)}`);
  const historyComplete=!coverage.loading&&counts.inspections!=null;
  const pendingReview=wardOutcomes.rows.find(r=>r.id==='pending_review')?.value;
  const count=(n:number|null|undefined)=>coverage.loading?'Updating':n==null?'Unavailable':n.toLocaleString('en-IN');
  useEffect(()=>{setFilters(previous=>({...emptyFilters(),moduleId:previous.moduleId,moduleIds:previous.moduleIds}));},[city.id,scopeWardKey,range.from,range.to]);
  useEffect(()=>{if(figures){if(matrixStore.getCollection('users').status==='idle')void matrixStore.loadCollection('users');}},[figures]);
  useEffect(()=>{setFigures(null);setPresent(null);setIssues(null);setFailed(false);if(!scopeWards.length)return;const c=new AbortController(),q=new URLSearchParams({from:range.from,to:range.to,zoneId:scopeZoneKey,wardId:scopeWardKey});
    const tasks:[string,(d:any)=>void][]=[
      [`/city/dashboard/zone-export?${new URLSearchParams({from:range.from,to:range.to,zoneIds:scopeZoneKey,wardIds:scopeWardKey})}`,d=>setFigures(summarizeZones(d))],
      [`/city/attendance/dashboard?${q}&page=1&pageSize=1`,d=>setPresent(d.summary?.present ?? null)],
      [`/cleanliness-issues/commissioner/summary?${q}`,d=>setIssues(d.kpis?.openIssues ?? null)]
    ];
    const performance=api(`/city/users/daroga-performance?${new URLSearchParams({startDate:new Date(`${range.from}T00:00:00+05:30`).toISOString(),endDate:new Date(`${range.to}T23:59:59.999+05:30`).toISOString(),tzOffset:'-330'})}`,{signal:c.signal});
    void performance.catch(()=>{});
    tasks[0][1]=d=>{const summary=summarizeZones(d);setFigures(summary);void performance.then(p=>{if(!c.signal.aborted)setFigures(applyPerformanceTargets(summary,p.users||{},scopeWardIds));}).catch(()=>{});};
    for(const [url,apply] of tasks)void api(url,{signal:c.signal}).then(d=>{if(!c.signal.aborted)apply(d);}).catch(()=>{if(!c.signal.aborted)setFailed(true);});return()=>c.abort();
  },[city.id,scopeWardKey,scopeZoneKey,range.from,range.to,revision,matrixStore.loadRevision]);

  const unique=(names:(string|undefined)[])=>[...new Set(names.filter(Boolean) as string[])];
  const darogaOf=(w:Ward)=>users.filter(u=>u.cityId===city.id).find(u => u.id === w.darogaId) || users.find(u=>u.cityId===city.id&&u.role==='SUPERVISOR'&&u.assignedWardIds?.includes(w.id));
  const inspectorOf=(w:Ward)=>users.filter(u=>u.cityId===city.id).find(u => u.id === w.inspectorId) || users.find(u=>u.cityId===city.id&&u.role==='QC'&&u.assignedWardIds?.includes(w.id));
  const darogaNames=unique(scopeWards.map(w=>darogaOf(w)?.name)),inspectorNames=unique(scopeWards.map(w=>inspectorOf(w)?.name));
  const daroga = users.filter(u=>u.cityId===city.id).find(u => u.id === currentWard?.darogaId) || users.find(u=>u.cityId===city.id&&u.role==='SUPERVISOR'&&u.assignedWardIds?.includes(currentWard?.id || ''));
  const inspector = users.filter(u=>u.cityId===city.id).find(u => u.id === currentWard?.inspectorId) || users.find(u=>u.cityId===city.id&&u.role==='QC'&&u.assignedWardIds?.includes(currentWard?.id || ''));

  if (!cityWards.length) {
    return <div className="p-8 text-center text-xs text-slate-500">No wards available for {city.name}.</div>;
  }

  return (
    <div className="zone-ward-details space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Zone Details
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              {scopeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inspections, attendance and accountability for {scopeLabel}.
          </p>
        </div>

        {/* Ward Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="workspace-secondary-button" disabled={!historyComplete||!wardReports.length} onClick={() => printReports(`${scopeLabel} · Inspection Reports`,wardReports)}>Print ward reports with images</button>
          <label className="text-xs font-semibold text-slate-700" htmlFor="ward-zone">Zone:</label>
          <select id="ward-zone" value={selectedZoneId} onChange={e => { setSelectedZoneId(e.target.value); setSelectedWardId(e.target.value === 'all' ? '' : 'all'); }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg">
            <option value="all">All zones</option>{focus && <option value={FOCUS_SCOPE}>{focusLabel(focus)}</option>}{cityZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <label htmlFor="ward-selector" className="text-xs font-semibold text-slate-700">Ward:</label>
          <select
            id="ward-selector"
            value={allWards ? 'all' : currentWard?.id || ''}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold shadow-2xs"
          >
            <option value="all">{selectedZoneId === 'all' ? 'All wards' : selectedZoneId === FOCUS_SCOPE ? 'All selected wards' : 'All wards in zone'}</option>
            {selectableWards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <MultiSelectDropdown label="Modules" options={(city.enabledModules??[]).map(id=>[id,MODULE_LABELS[id]])} selected={moduleIds} onChange={ids=>setFilters({...filters,moduleId:'all',moduleIds:ids})}/>
        </div>
      </div>

      {!scopeWards.length ? <p className="p-6 text-sm text-slate-500">No wards available in this zone.</p> : <>
      {/* Ward Demographic & Officer Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Zone</span>
          <p className="font-bold text-slate-900 text-sm">{scopeZoneName || 'Not supplied'}</p>
          <p className="text-slate-500 font-mono">{currentWard&&currentWard.areaSqKm>0?`Area: ${currentWard.areaSqKm} sq km`:''}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Ward</span>
          <p className="font-bold text-slate-900 text-sm font-mono tabular-nums">{allWards?`${scopeWards.length} wards`:currentWard?.name}</p>
          <p className="text-slate-500 font-mono">{currentWard&&currentWard.population>0?`Population: ${currentWard.population.toLocaleString('en-IN')}`:''}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Assigned Daroga</span>
          <p className="font-bold text-slate-900 text-sm">{allWards?(darogaNames.join(', ')||'Not assigned'):daroga?.name || 'Not assigned'}</p>
          <p className="text-slate-500 font-mono">{allWards?`${darogaNames.length} assigned`:daroga?.phone || 'Not supplied'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">SI</span>
          <p className="font-bold text-slate-900 text-sm">{allWards?(inspectorNames.join(', ')||'Not assigned'):inspector?.name || 'Not assigned'}</p>
          <p className="text-slate-500 font-mono">{allWards?`${inspectorNames.length} assigned`:inspector?.email || 'Not supplied'}</p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={inspectionPeriod(counts,delivery).requirement}
          value={count(delivery.target)}
          subtitle={`${inspectionPeriod(counts,delivery,range.from,range.to).range}: ${count(metrics.achieved)} reports received / ${count(delivery.target)} target; ${count(delivery.remaining)} more inspections needed${delivery.fallback?`; ${inspectionPeriod(counts,delivery).basis}`:''}`}
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
        />
        <StatCard
          label="Workforce Present"
          value={present ?? '—'}
          subtitle="Selected ward and review period"
          icon={<Users className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label={terms.done}
          value={count(counts.inspections)}
          subtitle={`${count(pendingReview)} submitted reports awaiting review`}
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
        />
        <StatCard
          label="Open IEC Issues"
          value={issues ?? '—'}
          subtitle="IEC-reported issue oversight"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
      </div>

      <div className="space-y-5"><OverviewInsights pulse={{pending:0,errors:{}}} data={scoped} loading={coverage.loading} onInspect={(_module,status)=>setFilters({...filters,status:status||'all'})}/><ChartCard eyebrow="MODULE TARGETS" title="Target credit by module"><BarChart max={100} items={(city.enabledModules??[]).filter(id=>!moduleIds.length||moduleIds.includes(id)).map(id=>{const target=inspectionMetrics(scoped,{module:id},selectedFigures?.modules[id]).delivery;return {id,label:MODULE_LABELS[id],value:coverage.loading?null:target.percent,display:`${count(target.completed)} / ${count(target.target)}`,detail:inspectionPeriod(coverageCounts(scoped,{module:id}),target).achievement};})}/></ChartCard></div>
      {/* Supporting Report List for this Ward */}
      {failed&&<div className="compact-error">Some ward summaries are unavailable.<button onClick={()=>setRevision(n=>n+1)}>Retry</button></div>}
      <OperationalFilters modules={false} value={filters} onChange={setFilters} users={users.filter(u=>u.cityId===city.id)} statuses={['pending_review','approved','rejected','action_required','action_taken','escalated','unclassified']} resultCount={wardReports.length}/>
      <div aria-label="Ward inspection history" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Inspection history ({coverage.loading?'Updating':`${wardReports.length} matching / ${allWardReports.length} available`})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {scopeZoneName} / {allWards?`All wards (${scopeWards.length})`:currentWard?.name}
          </span>
        </div>

        <p className="px-6 py-3 text-sm text-slate-500" role="status">{coverage.loading?'Loading the complete ward inspection history...':historyComplete?`Complete ward register: ${allWardReports.length} inspections for ${range.from} to ${range.to}. Filters apply to this history and printing; summary cards cover the full ward.`:'Some inspection records are unavailable. Available rows are shown; ward totals and printing remain unavailable.'}</p>
        <div className="divide-y divide-slate-100">
          {coverage.loading ? <div className="p-8 text-center text-sm text-slate-500">Updating inspection records...</div> : wardReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No available inspections match these filters for {scopeLabel}.
            </div>
          ) : (
            paging.rows.map(rep => (
              <div data-ward-report key={rep.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{rep.assetName}</span>
                    <StatusBadge status={rep.status} size="sm" />
                    <span className="text-[15px] uppercase font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                      {MODULE_LABELS[rep.moduleId]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium mt-1">{zoneNameOf(rep.zoneId) || 'Zone name unavailable'} / {wardNameOf(rep.wardId) || 'Ward name unavailable'}</p>
                  <p className="text-[15px] text-slate-400 font-mono">
                    Logged by {rep.submittedByName || 'Not supplied'} on {rep.inspectionDate} · Score: {coverage.data.compact?'Open report for score':rep.overallScore == null ? 'Not supplied' : `${rep.overallScore}/100`}
                  </p>
                </div>

                <button
                  onClick={() => onSelectReport(rep.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View report</span>
                </button>
              </div>
            ))
          )}
        </div>
        {!coverage.loading&&<Pagination {...paging} noun="ward reports" />}

      </div>
      </>}
    </div>
  );
};
