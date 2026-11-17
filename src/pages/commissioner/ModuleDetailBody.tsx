import React, { useMemo, useState } from 'react';
import { PanelActions, PanelSection, PanelStats, fmtNum, fmtPct } from '../../components/dashboard/DetailPanel';
import { CleanlinessDetail, PendingList } from '../../components/dashboard/panelBodies';
import { aiAnalysis, pendingLocations } from '../../services/cleanliness';
import { inspectionActions, type InspectionCoverage } from '../../services/inspectionCoverage';
import { inspectionDisplayStatus } from '../../services/inspectionStatus';
import { inspectionMetrics } from '../../services/inspectionMetrics';
import { reportTargetDelivery, targetReadState } from '../../services/targetDelivery';
import type { OperationalModuleId } from '../../types';

type Named = { id: string; name: string; zoneId?: string };

/**
 * Module details with Zone and Ward filters. The lists only offer what the dashboard filters already allow,
 * and the dashboard filters are never changed from here: they are sub-filters that live inside this panel.
 */
export function ModuleDetailBody({ id, data, baseZone, baseWard, source, targetsReady, zoneOptions, wardOptions, onInspect }: {
  id: OperationalModuleId; data: InspectionCoverage; baseZone: string; baseWard: string; source?: any; targetsReady: boolean;
  zoneOptions?: Named[]; wardOptions: Named[]; onInspect: (module?: string, status?: string) => void;
}) {
  const [zone, setZone] = useState(''), [ward, setWard] = useState('');
  const filtered = Boolean(zone || ward);
  const scope = { module: id, zone: zone || baseZone || undefined, ward: ward || baseWard || undefined };
  const wards = wardOptions.filter(w => !zone || w.zoneId === zone);
  const v = useMemo(() => {
    // Official module totals describe the whole dashboard selection, so they are used only while no panel filter is set.
    const metrics = inspectionMetrics(data, scope, filtered ? undefined : source);
    const scoring = targetReadState(metrics.delivery, targetsReady), delivery = reportTargetDelivery(scoring, metrics.achieved);
    const visits = [...new Map(data.visits.filter(x => x.module === id && (!scope.zone || x.zoneId === scope.zone) && (!scope.ward || x.wardId === scope.ward)).map(x => [x.id, x])).values()];
    const si = { clean: 0, notClean: 0, pending: 0 };
    for (const x of visits) { const st = inspectionDisplayStatus(x.status); if (st === 'approved') si.clean++; else if (st === 'pending_review') si.pending++; else si.notClean++; }
    const acts = inspectionActions(data, scope);
    return { metrics, scoring, delivery, visits, si, acts, ai: aiAnalysis(visits), pending: data.inventoryAvailable ? pendingLocations(data, scope) : [] };
  }, [data, id, zone, ward, baseZone, baseWard, filtered, source, targetsReady]);
  const { metrics, scoring, delivery, si, acts, ai, pending } = v;
  const actPending = acts.totalRequired == null || acts.taken == null ? null : Math.max(0, acts.totalRequired - acts.taken);
  return <>
    <div className="zd-filters" role="group" aria-label="Filters for this panel only">
      {zoneOptions && zoneOptions.length > 0 && <label>Zone<select value={zone} onChange={e => { const z = e.target.value; setZone(z); if (z && ward && !wardOptions.some(w => w.id === ward && w.zoneId === z)) setWard(''); }}><option value="">All zones</option>{zoneOptions.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>}
      <label>Ward<select value={ward} onChange={e => setWard(e.target.value)}><option value="">All wards</option>{wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      {filtered && <button type="button" onClick={() => { setZone(''); setWard(''); }}>Clear filters</button>}
      <small>Narrows the dashboard selection. Only this panel changes.</small>
    </div>
    <PanelStats items={[
      { label: 'Total assets', value: fmtNum(metrics.totalEntities) }, { label: 'Inspection target', value: fmtNum(delivery.target) },
      { label: 'Inspections completed', value: fmtNum(metrics.achieved), tone: 'blue' }, { label: 'Coverage', value: fmtPct(metrics.coveragePercent) },
      { label: 'Report target progress', value: fmtPct(delivery.percent), tone: delivery.met ? 'green' : 'amber' }, { label: 'Not yet inspected', value: fmtNum(pending.length), tone: 'amber' },
      { label: 'Unique assets inspected', value: fmtNum(metrics.uniqueEntities) }, { label: 'Repeat visits (completed)', value: fmtNum(metrics.repeatInspections) },
      { label: 'Daroga scoring credit', value: fmtNum(scoring.completed), note: 'Scored separately from report progress' }, { label: 'Reports still needed', value: fmtNum(delivery.remaining) },
    ]} />
    <PanelSection title="Inspection status"><PanelStats items={[
      { label: 'Cleaned', value: fmtNum(si.clean), tone: 'green' }, { label: 'Not cleaned', value: fmtNum(si.notClean), tone: 'red' }, { label: 'Pending review', value: fmtNum(si.pending), tone: 'amber' },
      { label: 'ULB action required', value: fmtNum(acts.totalRequired), tone: 'red' }, { label: 'IEC action pending', value: fmtNum(actPending), tone: 'amber' }, { label: 'IEC action taken', value: fmtNum(acts.taken), tone: 'green' },
    ]} /></PanelSection>
    <PanelSection title="AI analysis" note="Saved AI cleanliness analysis of this module's inspection photos."><PanelStats items={[
      { label: 'AI: clean', value: fmtNum(ai.clean), tone: 'green' }, { label: 'AI: not clean', value: fmtNum(ai.notClean), tone: 'red' }, { label: 'Awaiting AI', value: fmtNum(ai.awaiting) },
      { label: 'AI agrees with SI', value: fmtPct(ai.agreement), note: ai.compared ? `${fmtNum(ai.agreed)} of ${fmtNum(ai.compared)} decided reports` : 'No decided reports with AI analysis' },
    ]} /></PanelSection>
    <PanelSection title="Cleanliness"><CleanlinessDetail data={data} scope={scope} wards={wardOptions} /></PanelSection>
    <PanelSection title="Pending inspections" note="Registered locations with no inspection in the selected dates."><PendingList data={data} scope={scope} wards={wardOptions} /></PanelSection>
    <PanelActions actions={[{ label: 'Open inspection register', primary: true, onClick: () => onInspect(id) }]} />
  </>;
}
