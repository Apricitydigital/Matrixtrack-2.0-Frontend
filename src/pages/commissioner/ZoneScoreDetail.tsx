import React from 'react';
import { PanelSection, PanelStats, PanelTable, usePanel, fmtNum, fmtPct } from '../../components/dashboard/DetailPanel';
import { coverageCounts, type InspectionCoverage } from '../../services/inspectionCoverage';
import { cleanlinessStats } from '../../services/cleanliness';
import { componentLabels, amount } from '../../services/insights';
import { isAssessedWard, type ZoneRanking } from '../../services/zoneRanking';

const score = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? 'N/A' : amount(n, 2);
const BAND: Record<string, string> = { GREEN: 'Green', AMBER: 'Amber', RED: 'Red' };

/** Ward score breakdown: the components behind one ward's score, as marks earned out of marks that apply. */
function WardBreakdown({ ward, zoneName }: { ward: any; zoneName: string }) {
  const parts = Object.entries(ward.components || {}).filter(([, c]: [string, any]) => c && c.applicable !== false && Number.isFinite(c.maxScore) && c.maxScore > 0) as [string, any][];
  return <>
    <PanelStats items={[
      { label: 'Ward score', value: <>{score(ward.finalScore)}<small> / 100</small></>, tone: isAssessedWard(ward) ? 'blue' : 'neutral' },
      { label: 'Rank in zone', value: ward.zoneRank ? `#${ward.zoneRank}` : '—', note: zoneName },
      { label: 'City rank', value: ward.cityRank ? `#${ward.cityRank}` : '—' },
    ]} />
    <PanelSection title="How this ward's score is made" note="Marks earned out of the marks that apply. Ward score = marks earned ÷ marks that apply × 100.">
      <PanelTable head={['Component', 'Marks earned', 'Out of', 'Performance']} empty="No score breakdown is available for this ward."
        rows={parts.map(([key, c]) => ({ key, cells: [componentLabels[key] || key, score(c.score ?? 0), score(c.maxScore), fmtPct(c.maxScore ? (c.score ?? 0) / c.maxScore * 100 : null)] }))} />
    </PanelSection>
  </>;
}

/**
 * Side panel for one zone row of Zone performance. Scores and ranks are the Zone Ranking figures;
 * opening it never changes any dashboard filter.
 */
export function ZoneScoreDetail({ name, ranking, data, figures }: {
  name: string; ranking?: ZoneRanking; data: InspectionCoverage;
  figures: { received: string; target: string; percent: string; needed: string; coverage: string; coveragePercent: string; pending: string; siCleaned: string; siNotCleaned: string; aiClean: string; aiNotClean: string };
}) {
  const panel = usePanel();
  const members = ranking?.wards || [];
  const assessed = members.filter(isAssessedWard);
  const best = assessed[0], worst = assessed[assessed.length - 1];
  return <>
    <PanelStats items={[
      { label: 'Zone score', value: <>{score(ranking?.score)}<small> / 100</small></>, note: ranking && !ranking.complete && ranking.score != null ? 'Provisional: some wards not assessed' : 'Average of assessed ward scores', tone: 'blue' },
      { label: 'Zone rank', value: ranking?.rank ? `#${ranking.rank}` : '—', note: ranking?.rank ? undefined : 'Ranked once every ward is assessed' },
      { label: 'Wards assessed', value: `${ranking?.assessed ?? 0} / ${ranking?.total ?? 0}` },
      { label: 'Highest ward', value: best ? score(best.finalScore) : '—', note: best?.wardName },
      { label: 'Lowest ward', value: worst ? score(worst.finalScore) : '—', note: worst?.wardName },
    ]} />
    <PanelSection title="Inspection performance">
      <PanelStats items={[
        { label: 'Reports received', value: <>{figures.received}<small> / {figures.target}</small></>, note: figures.percent, tone: 'blue' },
        { label: 'Inspections still needed', value: figures.needed },
        { label: 'Coverage', value: figures.coverage, note: figures.coveragePercent },
        { label: 'Pending review', value: figures.pending, tone: 'amber' },
        { label: 'SI cleaned', value: figures.siCleaned, tone: 'green' },
        { label: 'SI not cleaned', value: figures.siNotCleaned, tone: 'red' },
        { label: 'AI suggests clean', value: figures.aiClean },
        { label: 'AI suggests not clean', value: figures.aiNotClean },
      ]} />
    </PanelSection>
    <PanelSection title={`Wards in ${name}`} note="Ranked by ward score. Select a ward to see how its score is made.">
      <PanelTable head={['Rank', 'Ward', 'Score', 'Band', 'Coverage', 'Cleanliness']} empty="No wards in this zone."
        rows={members.map((w: any, i) => {
          const k = coverageCounts(data, { ward: w.wardId } as any), cl = cleanlinessStats(data.visits.filter(v => v.wardId === w.wardId));
          const ok = isAssessedWard(w);
          return { key: w.wardId, onClick: () => panel?.open({ title: w.wardName, subtitle: `${name} · ward score`, width: '3xl', body: <WardBreakdown ward={w} zoneName={name} /> }),
            cells: [ok ? `#${i + 1}` : '—', w.wardName, ok ? score(w.finalScore) : 'Not assessed', ok && w.performanceBand ? <span className="zp-band" data-band={w.performanceBand}>{BAND[w.performanceBand] || w.performanceBand}</span> : '—', fmtPct(k.percent), fmtPct(cl.percent)] };
        })} />
    </PanelSection>
  </>;
}
