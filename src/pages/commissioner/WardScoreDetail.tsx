import React from 'react';
import { CardInfo } from '../../components/common/CardInfo';
import { PanelActions, PanelSection, PanelStats, PanelTable } from '../../components/dashboard/DetailPanel';
import { amount, wardExplanation } from '../../services/insights';
import { isAssessedWard } from '../../services/zoneRanking';

export const scoreText = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? 'N/A' : amount(n, 2);
/** Band labels follow the Ward Ranking page. */
export const BAND_LABEL: Record<string, string> = { GREEN: 'On track', AMBER: 'Needs attention', RED: 'Action needed' };

/** Figures from the dashboard row (already formatted), shown beside the score. */
export interface InspectionFigures { received: string; target: string; percent: string; needed: string; coverage: string; coveragePercent: string; pending: string; siCleaned: string; siNotCleaned: string; aiClean: string; aiNotClean: string }

export function InspectionFiguresBlock({ figures }: { figures: InspectionFigures }) {
  return <PanelSection title="Inspection performance">
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
  </PanelSection>;
}

/** The "i" explanation shared by the zone and ward score columns. Matches the Zone Ranking and Ward Ranking pages. */
export function ScoreCalcInfo({ level }: { level: 'zone' | 'ward' }) {
  return <CardInfo title={level === 'zone' ? 'How the zone score and rank are calculated' : 'How the ward score and rank are calculated'}>
    <p><b>{level === 'zone' ? 'Step 1 · ' : ''}Ward score (out of 100).</b> Workforce attendance carries 30 marks. The other 70 marks are shared equally by the components that apply to the ward: Sweeping beats, Nala, Toilets, Litter bins, CTU/GVP, Daroga, SI and IEC (8 components, 8.75 marks each). A module that is switched off, or has no assets in the ward, releases its marks to the others. A component with no activity earns zero. It does not release its marks.</p>
    <p>Each component earns its marks multiplied by its performance %. Ward score = marks earned ÷ marks that apply × 100.</p>
    {level === 'zone'
      ? <><p><b>Step 2 · Zone score.</b> The simple average of the assessed ward scores in the zone. Every ward has equal weight. Example: wards scoring 80 and 60 give a zone score of 70.</p>
        <p><b>Step 3 · Rank.</b> Zones are ordered by zone score, highest first. A zone gets a rank only when every ward in it is assessed. Otherwise it shows a provisional score from the wards assessed so far, with no rank. Equal scores (to 2 decimals) share a rank.</p></>
      : <p><b>Rank.</b> City rank orders every assessed ward in the city by ward score, highest first. Zone rank orders the wards inside each zone. A ward with no qualifying activity in the selected dates is shown as not assessed and has no rank. The rank is the same as on the Ward Ranking page.</p>}
    <p>Band: 85 and above is On track, 70 to 85 Needs attention, below 70 Action needed (unless the city has set other limits).</p>
    <p>This is the same calculation as the {level === 'zone' ? 'Zone' : 'Ward'} Ranking page, for the dashboard filter in use.</p>
  </CardInfo>;
}

/** Everything behind one ward's score. Reuses the Ward Ranking explanation: marks earned out of marks that apply. */
export function WardScoreBody({ ward, zoneName, figures, onOpenReports }: { ward: any; zoneName?: string; figures?: InspectionFigures; onOpenReports?: () => void }) {
  const explanation = wardExplanation(ward);
  const assessed = isAssessedWard(ward);
  return <>
    <PanelStats items={[
      { label: 'Ward score', value: <>{assessed ? scoreText(ward.finalScore) : 'N/A'}<small>{assessed ? ' / 100' : ''}</small></>, note: assessed ? (BAND_LABEL[ward.performanceBand] || undefined) : 'Not assessed in these dates', tone: 'blue' },
      { label: 'City rank', value: ward.cityRank ? `#${ward.cityRank}` : '—' },
      { label: 'Rank in zone', value: ward.zoneRank ? `#${ward.zoneRank}` : '—', note: zoneName },
      { label: 'Marks earned', value: assessed ? `${scoreText(explanation.earned)} / ${scoreText(explanation.denominator)}` : '—', note: 'Out of marks that apply' },
    ]} />
    {figures && <InspectionFiguresBlock figures={figures} />}
    <PanelSection title="How this ward's score is made" note="Each component earns marks out of the marks that apply to this ward. Ward score = marks earned ÷ marks that apply × 100.">
      <PanelTable head={['Component', 'Marks earned', 'Out of', 'Not earned']} empty="No score breakdown is available for this ward."
        rows={explanation.components.map(c => ({ key: c.key, cells: c.applicable === false
          ? [c.label, 'N/A', 'N/A', c.exclusionReason === 'module_disabled' ? 'Module disabled' : 'No registered entities']
          : [c.label, scoreText(c.score), <>{scoreText(c.maxScore)}{c.redistributedMarks > 0 ? <small> (+{scoreText(c.redistributedMarks)} shared)</small> : null}</>, scoreText(Math.max(0, (c.maxScore ?? 0) - (c.score ?? 0)))] }))} />
    </PanelSection>
    {ward.topExceptions?.length > 0 && <PanelSection title="Recorded exceptions">
      <PanelTable head={['Issue', 'Details', 'Count']} rows={ward.topExceptions.map((e: any, i: number) => ({ key: String(i), cells: [e.title, e.description, Number.isFinite(e.count) ? amount(e.count, 0) : '—'] }))} />
    </PanelSection>}
    {onOpenReports && <PanelActions actions={[{ label: "Open this ward's reports", onClick: onOpenReports }]} />}
  </>;
}
