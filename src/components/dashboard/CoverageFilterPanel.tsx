import React, { useState } from 'react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { MODULE_LABELS } from '../../services/presentation';
import type { OperationalModuleId } from '../../types';
import { CoverageDetail, type OpenReports, type Scope } from './panelBodies';

type Named = { id: string; name: string; zoneId?: string };

/**
 * Coverage details with Zone, Ward and Module filters. The lists only offer what the dashboard filters already allow,
 * and choosing here never changes the dashboard filters: they are sub-filters that live inside this panel.
 */
export function CoverageFilterPanel({ data, modules, zones, wards, initial = {}, onOpen }: {
  data: InspectionCoverage; modules: OperationalModuleId[]; zones: Named[]; wards: Named[]; initial?: Scope; onOpen?: OpenReports;
}) {
  const [zone, setZone] = useState(initial.zone || ''), [ward, setWard] = useState(initial.ward || ''), [module, setModule] = useState(initial.module || '');
  const wardOptions = wards.filter(w => !zone || w.zoneId === zone);
  const scope: Scope = { ...(zone ? { zone } : {}), ...(ward ? { ward } : {}), ...(module ? { module } : {}) };
  const filtered = Boolean(zone || ward || module);
  return <>
    <div className="zd-filters" role="group" aria-label="Filters for this panel only">
      <label>Zone<select value={zone} onChange={e => { const id = e.target.value; setZone(id); if (ward && !wards.some(w => w.id === ward && w.zoneId === id) && id) setWard(''); }}><option value="">All zones</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
      <label>Ward<select value={ward} onChange={e => setWard(e.target.value)}><option value="">All wards</option>{wardOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label>Module<select value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>{modules.map(m => <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>)}</select></label>
      {filtered && <button type="button" onClick={() => { setZone(''); setWard(''); setModule(''); }}>Clear filters</button>}
      <small>Narrows the dashboard selection. Only this panel changes.</small>
    </div>
    <CoverageDetail data={data} modules={module ? [module as OperationalModuleId] : modules} zones={zones} wards={wards} scope={scope} onOpen={onOpen} />
  </>;
}
