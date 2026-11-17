import React, { useState } from 'react';
import { MODULE_LABELS } from '../../services/presentation';
import type { OperationalModuleId } from '../../types';

type Named = { id: string; name: string; zoneId?: string };
export interface PanelScope { zone?: string; ward?: string; module?: string }

/**
 * Zone, Ward and Module filters for a side panel. They are sub-filters of the dashboard filters: the lists only offer
 * what the dashboard already allows, and nothing here changes the dashboard. A filter is hidden when the panel's own
 * scope already fixes it (a ward panel has no zone or ward filter, a module panel has no module filter).
 */
export function ScopedPanel({ zones, wards, modules, initial = {}, children }: {
  zones?: Named[]; wards?: Named[]; modules?: OperationalModuleId[]; initial?: PanelScope; children: (scope: PanelScope) => React.ReactNode;
}) {
  const [zone, setZone] = useState(''), [ward, setWard] = useState(''), [module, setModule] = useState('');
  const showZone = Boolean(zones?.length) && !initial.zone && !initial.ward;
  const showWard = Boolean(wards?.length) && !initial.ward;
  const showModule = Boolean(modules && modules.length > 1) && !initial.module;
  const wardOptions = (wards || []).filter(w => !(zone || initial.zone) || w.zoneId === (zone || initial.zone));
  const scope: PanelScope = { ...initial, ...(zone ? { zone } : {}), ...(ward ? { ward } : {}), ...(module ? { module } : {}) };
  const filtered = Boolean(zone || ward || module);
  if (!showZone && !showWard && !showModule) return <>{children(scope)}</>;
  return <>
    <div className="zd-filters" role="group" aria-label="Filters for this panel only">
      {showZone && <label>Zone<select value={zone} onChange={e => { const z = e.target.value; setZone(z); if (z && ward && !(wards || []).some(w => w.id === ward && w.zoneId === z)) setWard(''); }}><option value="">All zones</option>{zones!.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>}
      {showWard && <label>Ward<select value={ward} onChange={e => setWard(e.target.value)}><option value="">All wards</option>{wardOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}
      {showModule && <label>Module<select value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>{modules!.map(m => <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>)}</select></label>}
      {filtered && <button type="button" onClick={() => { setZone(''); setWard(''); setModule(''); }}>Clear filters</button>}
      <small>Narrows the dashboard selection. Only this panel changes.</small>
    </div>
    {children(scope)}
  </>;
}
