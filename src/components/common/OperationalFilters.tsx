import React, { useId, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { Zone, Ward, User } from '../../types';
import { emptyFilters, MODULE_LABELS, ROLE_LABELS, RYG_LABELS, statusLabel, type OperationalFilters as Filters } from '../../services/presentation';

interface Props { value: Filters; onChange: (value: Filters) => void; zones?: Zone[]; wards?: Ward[]; users?: User[]; statuses?: string[]; modules?: boolean; resultCount?: number; }
export function OperationalFilters({ value, onChange, zones = [], wards = [], users = [], statuses = [], modules = true, resultCount }: Props) {
  const id = useId();
  const [expanded,setExpanded]=useState(false);
  const advancedCount=['staffId','status','ryg'].filter(key=>value[key as keyof Filters]!=='all').length;
  const select = (label: string, field: keyof Filters, options: [string, string][]) => <label className="ops-filter" key={field} htmlFor={`${id}-${field}`}><span>{label}</span><select id={`${id}-${field}`} value={value[field]} onChange={e => onChange({ ...value, [field]: e.target.value, ...(field === 'zoneId' ? { wardId: 'all' } : {}) })}><option value="all">All {label.toLowerCase()}</option>{options.map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label>;
  return <section className="ops-filter-panel" aria-label="Report filters"><div className="ops-filter-heading"><span><SlidersHorizontal size={14} /> Filters</span>{resultCount !== undefined && <small>{resultCount.toLocaleString()} matching reports</small>}</div><div className="ops-filter-grid"><label className="ops-filter ops-filter-search" htmlFor={`${id}-query`}><span>Search</span><div><Search size={15} /><input id={`${id}-query`} value={value.query} onChange={e => onChange({ ...value, query: e.target.value })} placeholder="Report, location or officer" /></div></label>
    {!!zones.length && select('Zones', 'zoneId', zones.map(z => [z.id, z.name]))}
    {!!wards.length && select('Wards', 'wardId', wards.filter(w => value.zoneId === 'all' || w.zoneId === value.zoneId).map(w => [w.id, w.name]))}
    {modules && select('Modules', 'moduleId', Object.entries(MODULE_LABELS))}
    <button type="button" className="ops-more" aria-expanded={expanded} aria-controls={`${id}-advanced`} onClick={()=>setExpanded(v=>!v)}><SlidersHorizontal size={14}/>{expanded?'Fewer filters':'More filters'}{advancedCount>0&&<b>{advancedCount}</b>}</button>
    <button type="button" className="ops-reset" onClick={() => onChange(emptyFilters())}><RotateCcw size={14} />Reset filters</button>
  </div>{expanded&&<div id={`${id}-advanced`} className="ops-advanced-grid">
    {!!users.length && select('Staff', 'staffId', [...new Map(users.map(u => [u.id, u])).values()].map(u => [u.id, `${u.name} · ${ROLE_LABELS[u.role] || u.role}`]))}
    {!!statuses.length && select('Statuses', 'status', statuses.map(s => [s, statusLabel(s)]))}
    {select('RYG statuses', 'ryg', Object.entries(RYG_LABELS))}
  </div>}</section>;
}
