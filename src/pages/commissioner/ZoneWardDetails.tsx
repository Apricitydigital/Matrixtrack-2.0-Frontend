import { COMMISSIONER_TERMS as terms } from '../../services/commissionerTerms';
import React, { useEffect, useState } from 'react';
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
import { coverageCounts } from '../../services/inspectionCoverage';
import { targetDelivery } from '../../services/targetDelivery';
import { ChartCard, BarChart, DonutChart, chartColors } from '../../components/analytics/Analytics';
import { amount } from '../../services/insights';
import { emptyFilters, matchesFilters } from '../../services/presentation';
import { OperationalFilters } from '../../components/common/OperationalFilters';
import { Building2, Layers, CheckCircle2, AlertTriangle, Users, MapPin, Eye } from 'lucide-react';

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
  reports,
  iecIssues,
  attendance,
  users,
  onSelectReport
}) => {
  const cityZones = zones.filter(z => z.cityId === city.id);
  const cityWards = wards.filter(w => w.cityId === city.id);

  const [selectedZoneId, setSelectedZoneId] = useState('all');
  const selectableWards = cityWards.filter(w => selectedZoneId === 'all' || w.zoneId === selectedZoneId);
  const [selectedWardId, setSelectedWardId] = useState<string>(cityWards[0]?.id || '');

  const currentWard = selectableWards.find(w => w.id === selectedWardId) || selectableWards[0];
  const currentZone = cityZones.find(z => z.id === currentWard?.zoneId);

  const wardBeats = beats.filter(b => b.wardId === currentWard?.id);
  const [filters,setFilters]=useState(emptyFilters);
  const wardReports = reports.filter(r => r.wardId === currentWard?.id && matchesFilters(r,filters,[r.assetName,r.submittedByName,r.reportNumber]));
  const wardIec = iecIssues.filter(i => i.wardId === currentWard?.id);
  const wardAtt = attendance.filter(a => a.wardId === currentWard?.id);
  const paging = usePagination(wardReports, selectedZoneId + selectedWardId + city.id+JSON.stringify(filters));
  const [figures,setFigures]=useState<ReturnType<typeof summarizeZones>|null>(null),[present,setPresent]=useState<number|null>(null),[issues,setIssues]=useState<number|null>(null),[failed,setFailed]=useState(false),[revision,setRevision]=useState(0);
  const range=matrixStore.getDateRange();
  const coverage=useInspectionCoverage({...city,enabledModules:city.enabledModules??[]},range.from,range.to,revision+matrixStore.loadRevision);
  const delivery=targetDelivery(figures?.totals,coverageCounts(coverage.data,{ward:currentWard?.id}));
  useEffect(()=>{if(figures){if(matrixStore.getCollection('reports').status==='idle')void matrixStore.loadCollection('reports');if(matrixStore.getCollection('users').status==='idle')void matrixStore.loadCollection('users');}},[figures]);
  useEffect(()=>{setFigures(null);setPresent(null);setIssues(null);setFailed(false);if(!currentWard||!currentZone)return;const c=new AbortController(),q=new URLSearchParams({from:range.from,to:range.to,zoneId:currentZone.id,wardId:currentWard.id});
    const tasks:[string,(d:any)=>void][]=[
      [`/city/dashboard/zone-export?${new URLSearchParams({from:range.from,to:range.to,zoneIds:currentZone.id,wardIds:currentWard.id})}`,d=>setFigures(summarizeZones(d))],
      [`/city/attendance/dashboard?${q}&page=1&pageSize=1`,d=>setPresent(d.summary?.present ?? null)],
      [`/cleanliness-issues/commissioner/summary?${q}`,d=>setIssues(d.kpis?.openIssues ?? null)]
    ];
    const performance=api(`/city/users/daroga-performance?${new URLSearchParams({startDate:new Date(`${range.from}T00:00:00+05:30`).toISOString(),endDate:new Date(`${range.to}T23:59:59.999+05:30`).toISOString(),tzOffset:'-330'})}`,{signal:c.signal});
    void performance.catch(()=>{});
    tasks[0][1]=d=>{const summary=summarizeZones(d);setFigures(summary);void performance.then(p=>{if(!c.signal.aborted)setFigures(applyPerformanceTargets(summary,p.users||{},currentWard.id));}).catch(()=>{});};
    for(const [url,apply] of tasks)void api(url,{signal:c.signal}).then(d=>{if(!c.signal.aborted)apply(d);}).catch(()=>{if(!c.signal.aborted)setFailed(true);});return()=>c.abort();
  },[city.id,currentWard?.id,currentZone?.id,range.from,range.to,revision,matrixStore.loadRevision]);

  const daroga = users.find(u => u.id === currentWard?.darogaId) || users.find(u=>u.role==='SUPERVISOR'&&u.assignedWardIds?.includes(currentWard?.id || ''));
  const inspector = users.find(u => u.id === currentWard?.inspectorId) || users.find(u=>u.role==='QC'&&u.assignedWardIds?.includes(currentWard?.id || ''));

  if (!cityWards.length) {
    return <div className="p-8 text-center text-xs text-slate-500">No wards available for {city.name}.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Zone Details
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              {currentWard?.name || 'Select ward'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inspections, attendance and accountability for {currentWard?.name || 'the selected zone'}.
          </p>
        </div>

        {/* Ward Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="workspace-secondary-button" disabled={!wardReports.length} onClick={() => printReports(`${currentWard?.name || city.name} · Inspection Reports`,wardReports)}>Print ward reports with images</button>
          <label className="text-xs font-semibold text-slate-700" htmlFor="ward-zone">Zone:</label>
          <select id="ward-zone" value={selectedZoneId} onChange={e => { setSelectedZoneId(e.target.value); setSelectedWardId(''); }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg">
            <option value="all">All zones</option>{cityZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <label htmlFor="ward-selector" className="text-xs font-semibold text-slate-700">Ward:</label>
          <select
            id="ward-selector"
            value={currentWard?.id || ''}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold shadow-2xs"
          >
            {selectableWards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!currentWard ? <p className="p-6 text-sm text-slate-500">No wards available in this zone.</p> : <>
      {/* Ward Demographic & Officer Profile */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Zone</span>
          <p className="font-bold text-slate-900 text-sm">{currentZone?.name || 'Not supplied'}</p>
          <p className="text-slate-500 font-mono">{currentWard.areaSqKm>0?`Area: ${currentWard.areaSqKm} sq km`:''}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Ward</span>
          <p className="font-bold text-slate-900 text-sm font-mono tabular-nums">{currentWard.name}</p>
          <p className="text-slate-500 font-mono">{currentWard.population>0?`Population: ${currentWard.population.toLocaleString('en-IN')}`:''}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Assigned Daroga</span>
          <p className="font-bold text-slate-900 text-sm">{daroga?.name || 'Not assigned'}</p>
          <p className="text-slate-500 font-mono">{daroga?.phone || 'Not supplied'}</p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium uppercase tracking-wider block">Sanitary Inspector</span>
          <p className="font-bold text-slate-900 text-sm">{inspector?.name || 'Not assigned'}</p>
          <p className="text-slate-500 font-mono">{inspector?.email || 'Not supplied'}</p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={terms.target}
          value={delivery.target ?? '\u2014'}
          denominator={`${delivery.remaining ?? '\u2014'} ${terms.pending.toLowerCase()}${delivery.fallback?' (full coverage)':''}`}
          subtitle="Selected ward and review period"
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
        />
        <StatCard
          label="Workforce Present"
          value={present ?? '—'}
          subtitle="Selected ward and review period"
          icon={<Users className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label={terms.credited}
          value={figures?.totals.completed ?? '—'}
          denominator={`${figures?.totals.siPending ?? '—'} pending review`}
          subtitle="Assigned target achievement"
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
        />
        <StatCard
          label="Open IEC Issues"
          value={issues ?? '—'}
          subtitle="IEC-reported issue oversight"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
      </div>

      <div className="analytics-grid two"><ChartCard eyebrow="WARD INSPECTIONS" title="Reported outcomes"><DonutChart label="outcomes" items={[{id:'clean',label:terms.cleaned,value:figures?.totals.cleaned,color:chartColors.teal},{id:'pending',label:terms.pendingReview,value:figures?.totals.siPending,color:chartColors.gold},{id:'unclean',label:terms.notCleaned,value:figures?.totals.notCleaned,color:chartColors.red}]}/></ChartCard><ChartCard eyebrow="MODULE TARGETS" title="Backend target reference"><BarChart max={100} items={Object.entries(figures?.modules || {}).map(([id,m])=>({id,label:MODULE_LABELS[id],value:m.target>0?m.completed/m.target*100:null,display:`${amount(m.completed,0)} / ${amount(m.target,0)}`,detail:`${amount(m.siPending,0)} pending review`}))}/></ChartCard></div>
      {/* Supporting Report List for this Ward */}
      {failed&&<div className="compact-error">Some ward summaries are unavailable.<button onClick={()=>setRevision(n=>n+1)}>Retry</button></div>}
      <OperationalFilters value={filters} onChange={setFilters} users={users} statuses={['pending_review','approved','rejected','action_required','action_taken']} resultCount={wardReports.length}/>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Inspection History & Supporting Records ({wardReports.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Ward #{currentWard.wardNumber}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {wardReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No field inspections logged for Ward #{currentWard.wardNumber} in the current period.
            </div>
          ) : (
            paging.rows.map(rep => (
              <div key={rep.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900 text-xs">{rep.reportNumber}</span>
                    <StatusBadge status={rep.status} size="sm" />
                    <span className="text-[15px] uppercase font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                      {MODULE_LABELS[rep.moduleId]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium mt-1">{rep.assetName}</p>
                  <p className="text-[15px] text-slate-400 font-mono">
                    Logged by {rep.submittedByName || 'Not supplied'} on {rep.inspectionDate} · Score: {rep.overallScore == null ? 'Not supplied' : `${rep.overallScore}/100`}
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
        <Pagination {...paging} noun="ward reports" />
        {matrixStore.getCollection('reports').hasMore&&<div className="server-page-control"><span>Additional inspection reports available.</span><button disabled={matrixStore.getCollection('reports').status==='loading'} onClick={()=>{void matrixStore.loadMore('reports');}}>Load more reports</button></div>}
      </div>
      </>}
    </div>
  );
};
