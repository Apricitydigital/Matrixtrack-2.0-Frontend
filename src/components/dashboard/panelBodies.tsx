import React, { useMemo, useState } from 'react';
import type { InspectionCoverage, InspectionVisit } from '../../services/inspectionCoverage';
import { inspectionStatus } from '../../services/inspectionStatus';
import { coverageCounts } from '../../services/inspectionCoverage';
import { aiAnalysis, cleanlinessStats, notCleanLocations, pendingLocations, visitCleanliness, type CleanStats } from '../../services/cleanliness';
import { MODULE_LABELS } from '../../services/presentation';
import type { OperationalModuleId } from '../../types';
import { CLEAN_COLORS, PanelActions, PanelSection, PanelStats, PanelTable, SplitBar, fmtNum, fmtPct } from './DetailPanel';

export type Scope = { module?: string; zone?: string; ward?: string };
export type OpenReports = (scope: Scope, status?: string) => void;
type Named = { id: string; name: string; zoneId?: string };
const nameOf = (rows: Named[], id: string, fallback: string) => rows.find(r => r.id === id)?.name || fallback;
const inScope = (scope: Scope) => (r: { module: string; zoneId: string; wardId: string }) => (!scope.module || r.module === scope.module) && (!scope.zone || r.zoneId === scope.zone) && (!scope.ward || r.wardId === scope.ward);

export function CleanSplit({ stats }: { stats: CleanStats }) {
  return <SplitBar label="Cleanliness" parts={[{ label: 'Clean', value: stats.clean, color: CLEAN_COLORS.clean }, { label: 'Not clean', value: stats.notClean, color: CLEAN_COLORS.notClean }, { label: 'AI analysing', value: stats.unassessed, color: CLEAN_COLORS.unassessed }]} legend={false} />;
}

/** Cleanliness of one scope: SI and AI split, AI agreement and the locations found not clean. */
export function CleanlinessDetail({ data, scope, wards, onOpen, onViewReport }: { data: InspectionCoverage; scope: Scope; wards: Named[]; onOpen?: OpenReports; onViewReport?: (visit: InspectionVisit) => void }) {
  const visits = data.visits.filter(inScope(scope)), stats = cleanlinessStats(visits), ai = aiAnalysis(visits), dirty = notCleanLocations(data, visits, 12);
  const latest = new Map<string, InspectionVisit>();
  for (const v of visits) { if (visitCleanliness(v).verdict !== 'not_clean') continue; const k = `${v.module}:${v.assetId || v.id}`, cur = latest.get(k); if (!cur || (v.submittedAt || '') > (cur.submittedAt || '')) latest.set(k, v); }
  return <>
    <PanelStats items={[
      { label: 'Cleanliness', value: fmtPct(stats.percent), note: `${fmtNum(stats.clean + stats.notClean)} assessed of ${fmtNum(stats.inspections)} inspections`, tone: stats.percent == null ? 'neutral' : stats.percent >= 80 ? 'green' : stats.percent >= 60 ? 'amber' : 'red' },
      { label: 'Clean', value: fmtNum(stats.clean), note: `SI ${fmtNum(stats.siClean)} · AI ${fmtNum(stats.aiClean)}`, tone: 'green' },
      { label: 'Not clean', value: fmtNum(stats.notClean), note: `SI ${fmtNum(stats.siNotClean)} · AI ${fmtNum(stats.aiNotClean)}`, tone: 'red' },
      { label: 'AI analysing', value: fmtNum(stats.unassessed), note: 'No SI decision or AI result yet' },
    ]} />
    <CleanSplit stats={stats} />
    <PanelSection title="SI decisions and AI analysis" note="The SI decision is used where one was made. Reports still awaiting SI review use the saved AI suggestion; AI never overrides an SI decision.">
      <PanelStats items={[
        { label: 'SI cleanliness', value: fmtPct(stats.siPercent), note: `${fmtNum(stats.siClean + stats.siNotClean)} SI decisions` },
        { label: 'AI agrees with SI', value: fmtPct(ai.agreement), note: ai.compared ? `${fmtNum(ai.agreed)} of ${fmtNum(ai.compared)} compared` : 'No decided reports with AI analysis' },
      ]} />
    </PanelSection>
    <PanelSection title="Locations found not clean" note={dirty.length ? 'Most frequent first.' : undefined}>
      <PanelTable head={onViewReport ? ['Location', 'Module', 'Ward', 'Times not clean', 'Basis', 'Report'] : ['Location', 'Module', 'Ward', 'Times not clean', 'Basis']} empty="No inspection in this selection was found not clean."
        rows={dirty.map(r => { const v = latest.get(r.key); return { key: r.key, cells: [r.name, MODULE_LABELS[r.module] || r.module, nameOf(wards, r.wardId, 'Not recorded'), fmtNum(r.count), r.source === 'si' ? 'SI decision' : 'AI suggestion', ...(onViewReport ? [v ? <button type="button" className="dp-more" onClick={() => onViewReport(v)}>View report</button> : 'N/A'] : [])] }; })} />
    </PanelSection>
    {onOpen && <PanelActions actions={[{ label: 'Open not-cleaned reports', primary: true, onClick: () => onOpen(scope, 'rejected') }, { label: 'Open all reports', onClick: () => onOpen(scope) }]} />}
  </>;
}

/** Registered locations with no inspection in the selected dates, shown a page at a time. */
export function PendingList({ data, scope, wards, limit = 25 }: { data: InspectionCoverage; scope: Scope; wards: Named[]; limit?: number }) {
  const [shown, setShown] = useState(limit);
  const rows = pendingLocations(data, scope);
  if (!data.inventoryAvailable) return <p className="dp-empty">The location register is unavailable, so pending locations cannot be listed.</p>;
  return <>
    <PanelTable head={['Location', 'Module', 'Ward']} empty="Every registered location in this selection was inspected."
      rows={rows.slice(0, shown).map(a => ({ key: a.key || `${a.module}:${a.id}`, cells: [a.name || a.id, MODULE_LABELS[a.module] || a.module, a.wardName || nameOf(wards, a.wardId, 'Not recorded')] }))} />
    {rows.length > shown && <button type="button" className="dp-more" onClick={() => setShown(n => n + 50)}>Show more ({fmtNum(rows.length - shown)} remaining)</button>}
  </>;
}

/** Coverage for a scope: registered, inspected, not yet inspected, outside the register; by module and zone; pending list. */
export function CoverageDetail({ data, modules, zones, wards, scope = {}, onOpen, between }: { data: InspectionCoverage; modules: OperationalModuleId[]; zones: Named[]; wards: Named[]; scope?: Scope; onOpen?: OpenReports; between?: React.ReactNode }) {
  data=useMemo(()=>({...data,visits:data.visits.filter(v=>inspectionStatus(v.status||'SUBMITTED')!=='unclassified')}),[data]);
  const c = coverageCounts(data, scope as any);
  const row = (label: string, s: Scope) => { const k = coverageCounts(data, s as any); return [label, fmtNum(k.total), fmtNum(k.covered), fmtNum(k.remaining), fmtPct(k.percent)]; };
  return <>
    <AssetCoverageStats counts={c} />
    <SplitBar label="Asset coverage" parts={[{ label: 'Inspected', value: c.covered ?? 0, color: CLEAN_COLORS.inspected }, { label: 'Not yet inspected', value: c.remaining ?? 0, color: CLEAN_COLORS.pending }]} legend={false} />
    {!scope.module && <PanelSection title="By module"><PanelTable head={['Module', 'Registered', 'Inspected', 'Not yet inspected', 'Coverage']} rows={modules.map(m => ({ key: m, cells: row(MODULE_LABELS[m] || m, { ...scope, module: m }) }))} /></PanelSection>}
    {!scope.zone && !scope.ward && zones.length > 0 && <PanelSection title="By zone"><PanelTable head={['Zone', 'Registered', 'Inspected', 'Not yet inspected', 'Coverage']} rows={zones.map(z => ({ key: z.id, cells: row(z.name, { ...scope, zone: z.id }) }))} /></PanelSection>}
    {between}
    <PanelSection title="Locations not yet inspected" note="Registered locations with no inspection in the selected dates."><PendingList data={data} scope={scope} wards={wards} /></PanelSection>
    {onOpen && <PanelActions actions={[{ label: 'Open completed inspections', primary: true, onClick: () => onOpen(scope, 'inspections_completed') }]} />}
  </>;
}

/** Registered / inspected / not yet inspected / not in the register. */
export function AssetCoverageStats({ counts, loading = false }: { counts: ReturnType<typeof coverageCounts>; loading?: boolean }) {
  const v = (n: number | null) => loading ? '…' : fmtNum(n);
  return <PanelStats items={[
    { label: 'Registered assets', value: v(counts.total), note: 'Current location register' },
    { label: 'Inspected', value: v(counts.covered), note: counts.percent == null ? 'Unique assets' : `${fmtPct(counts.percent)} of registered`, tone: 'blue' },
    { label: 'Not yet inspected', value: v(counts.remaining), note: 'No inspection in these dates', tone: 'amber' },
    { label: 'Not in register', value: v(counts.outsideRegister), note: counts.unidentified ? `Inspected but missing from the register · ${fmtNum(counts.unidentified)} reports lack a location ID` : 'Inspected but missing from the register', tone: counts.outsideRegister ? 'red' : 'neutral' },
  ]} />;
}
