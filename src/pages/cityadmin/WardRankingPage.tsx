import React, { useEffect, useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { City, Ward, Beat, AttendanceRecord, OperationalReport, IecCleanlinessIssue } from '../../types';
import { api } from '../../services/api';
import { matrixStore } from '../../services/store';
import { generateCsv, downloadCsv } from '../../services/csv';
import { statusTone, ROLE_LABELS } from '../../services/presentation';
import { StatusBadge } from '../../components/common/Badge';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { RygLegend } from '../../components/common/RygLegend';
import { WardRankingInsights } from '../commissioner/WardRankingInsights';

interface Props { city: City; wards: Ward[]; beats: Beat[]; attendance: AttendanceRecord[]; reports: OperationalReport[]; iecIssues: IecCleanlinessIssue[]; }
export function WardRankingPage({ city }: Props) {
  const [rows,setRows] = useState<any[]>([]), [error,setError] = useState(''), [loading,setLoading] = useState(true);
  const [config,setConfig]=useState<any>(null),[retry,setRetry]=useState(0);
  const [search,setSearch] = useState(''), [zone,setZone] = useState('all'), [band,setBand] = useState('all'), [expanded,setExpanded] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);setError('');setRows([]);
    if (matrixStore.currentUser?.cityId !== city.id) { setError('Sign in with this city account to load its official ward rankings.');setLoading(false);return; }
    const {from,to} = matrixStore.getDateRange();
    setConfig(null);api(`/ward-ranking?from=${from}&to=${to}`,{signal:controller.signal}).then(data => {if(!controller.signal.aborted){setRows(data.rankings || []);setConfig(data.config);}}).catch(e => {if(!controller.signal.aborted)setError(e.message);}).finally(() => {if(!controller.signal.aborted)setLoading(false);});
    return () => controller.abort();
  },[city.id,matrixStore.loadRevision,retry]);
  const filtered = rows.filter(r => (!search || `${r.wardName} ${r.zoneName}`.toLowerCase().includes(search.toLowerCase())) && (zone === 'all' || r.zoneId === zone) && (band === 'all' || statusTone(r.rankable === false ? 'not_assessed' : r.performanceBand || '') === band));
  const zones = [...new Map(rows.filter(r => r.zoneId).map(r => [r.zoneId,r.zoneName])).entries()];
  const paging = usePagination(filtered, search + zone + band + city.id + matrixStore.loadRevision);
  if(['COMMISSIONER','ULB_OFFICER','CITY_ADMIN','HMS_SUPER_ADMIN'].includes(matrixStore.currentUser?.role || ''))return <WardRankingInsights city={city} rows={rows} config={config} loading={loading} error={error} onRetry={()=>setRetry(n=>n+1)}/>;
  return <section className="space-y-5"><div className="workspace-page-heading flex flex-wrap items-start justify-between gap-4"><div><span className="workspace-eyebrow">WARD PERFORMANCE</span><h1>Ward Ranking</h1><p>Compare wards, performance bands and score components.</p></div><button className="workspace-secondary-button" onClick={() => downloadCsv(`ward-rankings-${city.cityCode}.csv`,generateCsv(['Rank','Ward','Zone','Score','Performance band','Applicable weight'],filtered.map(r => [r.cityRank,r.wardName,r.zoneName,r.finalScore,r.performanceBand,r.applicableWeight])))}><Download size={15} />Export filtered rankings</button></div>
    <RygLegend /><div className="ops-filter-panel flex flex-wrap gap-3"><input aria-label="Search wards" placeholder="Search ward or zone" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Ranking zone" value={zone} onChange={e => setZone(e.target.value)}><option value="all">All zones</option>{zones.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select><select aria-label="Ranking RYG band" value={band} onChange={e => setBand(e.target.value)}><option value="all">All RYG bands</option><option value="red">Red</option><option value="yellow">Yellow / amber</option><option value="green">Green</option><option value="neutral">Not assessed</option></select><button className="ops-reset" onClick={() => {setSearch('');setZone('all');setBand('all');}}>Reset filters</button></div>
    {loading && <p role="status">Loading official rankings…</p>}{error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl text-sm">{error}</p>}
    <div className="workspace-panel overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>City rank</th><th>Ward</th><th>Zone</th><th>Score</th><th>Performance band</th><th>Trend</th><th>Breakdown</th></tr></thead><tbody>{paging.rows.map(r => <React.Fragment key={r.wardId}><tr><td>{r.rankable === false ? 'Not ranked' : r.cityRank ?? 'Not supplied'}</td><td><strong>{r.wardName}</strong></td><td>{r.zoneName || 'Not supplied'}</td><td>{r.rankable === false ? 'Not assessed' : r.finalScore ?? 'Not supplied'}</td><td><StatusBadge status={r.rankable === false ? 'not_assessed' : r.performanceBand || 'not_assessed'} /></td><td>{r.trend ? `${r.trend.direction} ${r.trend.change}` : 'Not supplied'}</td><td><button className="workspace-row-action" onClick={() => setExpanded(expanded === r.wardId ? '' : r.wardId)} aria-expanded={expanded === r.wardId} aria-label={`Component breakdown for ${r.wardName}`}>{expanded === r.wardId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></td></tr>{expanded === r.wardId && <tr><td colSpan={7}><div className="grid sm:grid-cols-3 gap-3 py-3">{Object.entries(r.components || {}).map(([key,c]:[string,any]) => <div key={key} className="rounded-lg border border-slate-200 p-3"><strong className="capitalize">{key === 'qc' ? ROLE_LABELS.QC : key === 'supervisor' ? ROLE_LABELS.SUPERVISOR : key === 'actionOfficer' ? ROLE_LABELS.ACTION_OFFICER : key.replace(/([A-Z])/g,' $1')}</strong><p className="mt-2 text-slate-500">{c.applicable === false ? 'Not applicable' : `${c.score ?? '—'} / ${c.maxScore ?? '—'}`}</p></div>)}</div></td></tr>}</React.Fragment>)}</tbody></table>{!loading && !error && !filtered.length && <div className="workspace-empty"><h3>No ward rankings match this view</h3></div>}</div>
    <Pagination {...paging} noun="wards" />
  </section>;
}
