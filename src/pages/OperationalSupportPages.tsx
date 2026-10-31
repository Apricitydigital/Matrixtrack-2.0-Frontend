import React, { useState } from 'react';
import { Layers, Printer } from 'lucide-react';
import type { City, User, OperationalReport } from '../types';
import { MODULE_LABELS, ROLE_LABELS, emptyFilters, matchesFilters, statusTone } from '../services/presentation';
import { matrixStore } from '../services/store';
import {PERSONNEL_MODULE_LABELS} from '../services/personnel';
import { todayIST } from '../services/api';
import { OperationalFilters } from '../components/common/OperationalFilters';
import { StatusBadge } from '../components/common/Badge';

export function ModuleDirectory({ city }: { city: City }) {
  const [query,setQuery]=useState('');
  const catalog=matrixStore.getCityModules(city.id).filter(m=>m.enabled);
  const modules=catalog.filter(m=>`${m.key} ${PERSONNEL_MODULE_LABELS[m.key]||''}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="space-y-5"><div className="workspace-page-heading"><span className="workspace-eyebrow">CITY CONFIGURATION</span><h1>Operational module directory</h1><p>Provisioned modules for {city.name}. Provisioning is managed by the Super Admin.</p></div><label className="block">Search modules<input aria-label="Search modules" className="workspace-input block mt-1" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Module name"/></label><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{modules.map(m=><article key={m.id||m.key} className="workspace-panel p-5 space-y-4"><Layers size={22} className="text-slate-500"/><h2 className="font-semibold">{PERSONNEL_MODULE_LABELS[m.key]||m.key}</h2><StatusBadge status={m.enabled?'active':'inactive'}/></article>)}</div>{!catalog.length?<p role="status">No module configuration was returned for this city.</p>:!modules.length&&<p>No modules match this search.</p>}</section>;
}

export function StaffActivity({ city, users, reports }: { city: City; users: User[]; reports: OperationalReport[] }) {
  const [filters, setFilters] = useState(emptyFilters);
  const matching = reports.filter(r => r.cityId === city.id && matchesFilters(r, filters, [r.submittedByName,r.assetName,r.reportNumber]));
  const rows = users.filter(u => u.cityId === city.id && ['SUPERVISOR','QC','ACTION_OFFICER'].includes(u.role) && (filters.staffId === 'all' || u.id === filters.staffId) && (!filters.query || u.name.toLowerCase().includes(filters.query.toLowerCase()) || matching.some(r => r.submittedByUserId === u.id))).map(u => {
    const activity = matching.filter(r => [r.submittedByUserId,r.reviewerId,r.assignedDarogaId].includes(u.id));
    return { user: u, submitted: activity.filter(r => r.submittedByUserId === u.id).length, reviewed: activity.filter(r => r.reviewerId === u.id).length, red: activity.filter(r => statusTone(r.status) === 'red').length, yellow: activity.filter(r => statusTone(r.status) === 'yellow').length, green: activity.filter(r => statusTone(r.status) === 'green').length };
  }).sort((a,b) => b.submitted - a.submitted || a.user.name.localeCompare(b.user.name));
  return <section className="space-y-5"><div className="workspace-page-heading"><span className="workspace-eyebrow">PERFORMANCE & ACCOUNTABILITY</span><h1>Staff inspection activity</h1><p>Activity attributed in loaded reports for the selected period. Counts are not a target achievement score.</p></div><OperationalFilters value={filters} onChange={setFilters} zones={matrixStore.getZones(city.id)} wards={matrixStore.getWards(city.id)} users={users.filter(u => u.cityId === city.id)} resultCount={matching.length} /><div className="workspace-panel overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Staff member</th><th>Role</th><th>Submitted</th><th>Reviewed</th><th>Action needed</th><th>Pending</th><th>Approved</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.user.id}:${row.user.role}`}><td><strong>{row.user.name}</strong></td><td>{ROLE_LABELS[row.user.role]}</td><td>{row.submitted}</td><td>{row.reviewed}</td><td>{row.red}</td><td>{row.yellow}</td><td>{row.green}</td></tr>)}</tbody></table>{!rows.length && <div className="workspace-empty"><h3>No matching staff activity</h3></div>}</div></section>;
}

export function ExecutiveBrief({ city, reports }: { city: City; reports: OperationalReport[] }) {
  const rows = reports.filter(r => r.cityId === city.id), range = matrixStore.getDateRange();
  return <article className="workspace-panel p-7 space-y-6 print:shadow-none"><div className="flex justify-between items-start gap-4"><div className="workspace-page-heading"><span className="workspace-eyebrow">EXECUTIVE BRIEF · {city.cityCode}</span><h1>{city.name}</h1><p>{range.from} to {range.to} · Prepared {todayIST()}</p></div><button onClick={() => window.print()} className="workspace-secondary-button print:hidden"><Printer size={16} />Print brief</button></div><p className="text-sm text-slate-500">This brief covers loaded inspection records. Use the data controls to load additional pages before printing.</p><div className="grid sm:grid-cols-3 gap-4">{(['red','yellow','green'] as const).map(tone => <div key={tone} className={`metric-card ryg-surface-${tone} rounded-xl p-5`}><StatusBadge status={tone} /><p className="text-3xl font-semibold mt-3">{rows.filter(r => statusTone(r.status) === tone).length}</p></div>)}</div><table className="w-full text-left text-xs"><thead><tr><th>Module</th><th>Loaded inspections</th><th>Action needed</th><th>Pending</th><th>Approved</th></tr></thead><tbody>{Object.entries(MODULE_LABELS).map(([key,label]) => { const items = rows.filter(r => r.moduleId === key); return <tr key={key}><td>{label}</td><td>{items.length}</td>{(['red','yellow','green'] as const).map(tone => <td key={tone}>{items.filter(r => statusTone(r.status) === tone).length}</td>)}</tr>; })}</tbody></table></article>;
}

export { TargetsWorkspace } from './TargetsWorkspace';
