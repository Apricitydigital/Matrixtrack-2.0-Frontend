import React, { useMemo, useState } from 'react';
import type { InspectionCoverage, InspectionVisit } from '../../services/inspectionCoverage';
import { inspectionDisplayStatus, inspectionStatusLabel } from '../../services/inspectionStatus';
import { intelligenceSuggestion } from '../../services/intelligenceSuggestion';
import { INTELLIGENCE_LABELS, matchesIntelligence } from '../../services/intelligenceMetrics';
import { MODULE_LABELS } from '../../services/presentation';
import { PanelActions, PanelSection, PanelStats, PanelTable, fmtNum, fmtPct } from './DetailPanel';

type Named = { id: string; name: string };
const unique = (visits: InspectionVisit[]) => [...new Map(visits.map(v => [v.id, v])).values()];
const asRecord = (v: InspectionVisit) => ({ ...v.raw, status: v.raw?.workspaceStatus || v.status });

/** Reports behind one status, action or AI-suggestion figure on the overview. */
export function reportsFor(data: InspectionCoverage, filter: string): InspectionVisit[] {
  const all = unique(data.visits);
  if (filter === 'actions_pending') return all.filter(v => v.actionRequired && !v.actionTaken);
  if (filter === 'si_not_cleaned') return all.filter(v => !['approved', 'pending_review'].includes(inspectionDisplayStatus(v.status)));
  if (filter === 'all_actions_required') return all.filter(v => v.actionRequired);
  if (filter === 'all_actions_taken') return all.filter(v => v.actionRequired && v.actionTaken);
  if (filter.startsWith('intelligence_')) return all.filter(v => matchesIntelligence(asRecord(v), filter));
  return all.filter(v => inspectionDisplayStatus(v.status) === filter);
}

export function ReportListPanel({ data, filter, wards, note, onViewReport, onOpenAll }: { data: InspectionCoverage; filter: string; wards: Named[]; note?: string; onViewReport?: (visit: InspectionVisit) => void; onOpenAll?: () => void }) {
  const rows = useMemo(() => reportsFor(data, filter).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')), [data, filter]);
  const total = unique(data.visits).length;
  const [module, setModule] = useState('');
  const [shown, setShown] = useState(15);
  const assetName = useMemo(() => new Map(data.assets.map(a => [`${a.module}:${a.id}`, a.name])), [data.assets]);
  const byModule = useMemo(() => { const m = new Map<string, number>(); rows.forEach(v => m.set(v.module, (m.get(v.module) || 0) + 1)); return m; }, [rows]);
  const list = module ? rows.filter(v => v.module === module) : rows;
  const showAi = filter === 'pending_review' || filter.startsWith('intelligence_');
  return <>
    <PanelStats items={[{ label: 'Reports', value: fmtNum(rows.length), note: total ? `${fmtPct(rows.length / total * 100)} of all inspections` : undefined, tone: 'blue' }, ...[...byModule].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => ({ label: MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m, value: fmtNum(n) }))]} />
    {note && <p className="dp-empty" style={{ textAlign: 'left' }}>{note}</p>}
    <PanelSection title="Reports" note={rows.length ? 'Newest first. View report opens the full report with photos and remarks.' : undefined}>
      {byModule.size > 1 && <div className="rl-chips" role="group" aria-label="Filter by module"><button type="button" data-on={!module} onClick={() => { setModule(''); setShown(15); }}>All</button>{[...byModule].map(([m, n]) => <button key={m} type="button" data-on={module === m} onClick={() => { setModule(m); setShown(15); }}>{MODULE_LABELS[m as keyof typeof MODULE_LABELS] || m} ({n})</button>)}</div>}
      <PanelTable head={['Location', 'Module', 'Ward', 'Date', showAi ? 'AI suggestion' : 'Status', 'Report']} empty="No report in this selection."
        rows={list.slice(0, shown).map(v => ({ key: v.id, cells: [
          assetName.get(`${v.module}:${v.assetId}`) || v.raw?.locationName || 'Location not recorded',
          MODULE_LABELS[v.module] || v.module,
          wards.find(w => w.id === v.wardId)?.name || 'Not recorded',
          v.submittedAt ? new Date(v.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A',
          showAi ? (INTELLIGENCE_LABELS[intelligenceSuggestion(asRecord(v)).outcome] || 'N/A').replace('Intelligence ', '') : inspectionStatusLabel(v.status),
          onViewReport ? <button type="button" className="dp-more" onClick={() => onViewReport(v)}>View report</button> : 'N/A',
        ] }))} />
      {list.length > shown && <button type="button" className="dp-more" onClick={() => setShown(n => n + 20)}>Show more ({fmtNum(list.length - shown)} remaining)</button>}
    </PanelSection>
    {onOpenAll && <PanelActions actions={[{ label: 'Open in Inspection performance', onClick: onOpenAll }]} />}
  </>;
}
