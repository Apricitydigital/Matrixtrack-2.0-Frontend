import {INTELLIGENCE_LABELS,intelligenceFilter} from '../../services/intelligenceMetrics';
import React, { useId, useMemo, useRef, useState } from 'react';
import { useFilterDismiss } from './FilterPopover';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { Zone, Ward, User } from '../../types';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { cityFocusPreset, focusQuickSelection } from '../../services/wardFocusPreset';
import { emptyFilters, selectedZoneIds, selectedWardIds, MODULE_LABELS, ROLE_LABELS, RYG_LABELS, statusLabel, type OperationalFilters as Filters } from '../../services/presentation';

interface Props { value: Filters; onChange: (value: Filters) => void; zones?: Zone[]; wards?: Ward[]; users?: User[]; statuses?: string[]; modules?: boolean; moduleIds?: string[]; statusLabels?: Record<string,string>; staffOptions?: [string,string][]; resultCount?: number; }
export function OperationalFilters({ value, onChange, zones = [], wards = [], users = [], statuses = [], modules = true, moduleIds, statusLabels = {}, staffOptions, resultCount }: Props) {
  const id = useId();
  const [expanded,setExpanded]=useState(false);
  const root=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useFilterDismiss(root,reason=>{setExpanded(false);if(reason==='escape')trigger.current?.focus();},expanded);
  const zoneSel=selectedZoneIds(value);
  const preset=useMemo(()=>cityFocusPreset(zones,wards),[zones,wards]);
  const quickSelection=focusQuickSelection(preset,zoneSel,selectedWardIds(value),p=>onChange({ ...value, zoneId: 'all', zoneIds: p.zoneIds, wardId: 'all', wardIds: p.wardIds }));
  const advancedCount=['staffId','status','ryg'].filter(key=>value[key as keyof Filters]!=='all').length;
  const select = (label: string, field: 'moduleId' | 'staffId' | 'status' | 'ryg', options: [string, string][]) => <label className="ops-filter" key={field} htmlFor={`${id}-${field}`}><span>{label}</span><select id={`${id}-${field}`} value={value[field]} onChange={e => onChange({ ...value, [field]: e.target.value })}><option value="all">All {label.toLowerCase()}</option>{value[field]!=='all'&&!options.some(([key])=>key===value[field])&&<option value={value[field]}>{statusLabel(value[field])} (current status)</option>}{[...new Map(options.map(([key,label])=>[key,{key,label}])).values()].map(({key,label})=>[key,label] as [string,string]).sort((a,b)=>a[1].localeCompare(b[1],undefined,{numeric:true,sensitivity:'base'})).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label>;
  return <section ref={root} className="ops-filter-panel" aria-label="Report filters"><div className="ops-filter-heading"><span><SlidersHorizontal size={14} /> Filters</span>{resultCount !== undefined && <small>{resultCount.toLocaleString()} matching reports</small>}</div><div className="ops-filter-grid"><label className="ops-filter ops-filter-search" htmlFor={`${id}-query`}><span>Search</span><div><Search size={15} /><input id={`${id}-query`} value={value.query} onChange={e => onChange({ ...value, query: e.target.value })} placeholder="Report, location or user" /></div></label>
    {!!zones.length && <MultiSelectDropdown label="Zones" quickSelection={quickSelection} options={zones.map(z => [z.id, z.name])} selected={zoneSel} onChange={zoneIds => onChange({ ...value, zoneId: 'all', zoneIds, wardId: 'all', wardIds: selectedWardIds(value).filter(id => !zoneIds.length || wards.some(w => w.id === id && zoneIds.includes(w.zoneId))) })} />}
    {!!wards.length && <MultiSelectDropdown label="Wards" options={wards.filter(w => !zoneSel.length || zoneSel.includes(w.zoneId)).map(w => [w.id, w.name])} selected={selectedWardIds(value)} onChange={wardIds => onChange({ ...value, wardId: 'all', wardIds })} />}
    {modules && <MultiSelectDropdown label="Modules" options={Object.entries(MODULE_LABELS).filter(([key])=>!moduleIds||moduleIds.includes(key)) as [string,string][]} selected={value.moduleIds.length?value.moduleIds:value.moduleId!=='all'?[value.moduleId]:[]} onChange={ids=>onChange({ ...value, moduleId: 'all', moduleIds: ids })} />}
    <button ref={trigger} type="button" className="ops-more" aria-expanded={expanded} aria-controls={`${id}-advanced`} onClick={()=>setExpanded(v=>!v)}><SlidersHorizontal size={14}/>{expanded?'Fewer filters':'More filters'}{advancedCount>0&&<b>{advancedCount}</b>}</button>
    <button type="button" className="ops-reset" onClick={() => {setExpanded(false);onChange(emptyFilters());}}><RotateCcw size={14} />Reset filters</button>
  </div>{expanded&&<div id={`${id}-advanced`} className="ops-advanced-grid">
    {(staffOptions?.length||users.length)>0 && select('Staff', 'staffId', staffOptions || [...new Map(users.map(u => [u.id, u])).values()].map(u => [u.id, `${u.name} · ${ROLE_LABELS[u.role] || u.role}`]))}
    {!!statuses.length && select('Statuses', 'status', [...statuses.map(s => [s, statusLabels[s] || statusLabel(s)] as [string,string]),...Object.entries(INTELLIGENCE_LABELS).map(([key,label])=>[intelligenceFilter(key),label] as [string,string])])}
    {select('RYG statuses', 'ryg', Object.entries(RYG_LABELS))}
  </div>}</section>;
}
