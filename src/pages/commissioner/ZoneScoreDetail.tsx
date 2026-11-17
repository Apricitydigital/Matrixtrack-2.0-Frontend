import React from 'react';
import { PanelSection, PanelStats, PanelTable, usePanel, fmtPct } from '../../components/dashboard/DetailPanel';
import { coverageCounts, type InspectionCoverage } from '../../services/inspectionCoverage';
import { cleanlinessStats } from '../../services/cleanliness';
import { BAND_LABEL, InspectionFiguresBlock, WardScoreBody, scoreText, type InspectionFigures } from './WardScoreDetail';
import { isAssessedWard, type ZoneRanking } from '../../services/zoneRanking';

const score = scoreText;

/**
 * Side panel for one zone row of Zone performance. Scores and ranks are the Zone Ranking figures;
 * opening it never changes any dashboard filter.
 */
export function ZoneScoreDetail({ name, ranking, data, figures }: {
  name: string; ranking?: ZoneRanking; data: InspectionCoverage;
  figures: InspectionFigures;
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
    <InspectionFiguresBlock figures={figures} />
    <PanelSection title={`Wards in ${name}`} note="Ranked by ward score. Select a ward to see how its score is made.">
      <PanelTable head={['Rank', 'Ward', 'Score', 'Band', 'Coverage', 'Cleanliness']} empty="No wards in this zone."
        rows={members.map((w: any, i) => {
          const k = coverageCounts(data, { ward: w.wardId } as any), cl = cleanlinessStats(data.visits.filter(v => v.wardId === w.wardId));
          const ok = isAssessedWard(w);
          return { key: w.wardId, onClick: () => panel?.open({ title: w.wardName, subtitle: `${name} · ward score`, width: '3xl', body: <WardScoreBody ward={w} zoneName={name} /> }),
            cells: [ok ? `#${i + 1}` : '—', w.wardName, ok ? score(w.finalScore) : 'Not assessed', ok && w.performanceBand ? <span className="zp-band" data-band={w.performanceBand}>{BAND_LABEL[w.performanceBand] || w.performanceBand}</span> : '—', fmtPct(k.percent), fmtPct(cl.percent)] };
        })} />
    </PanelSection>
  </>;
}
