import { componentLabels, finite, wardExplanation } from './insights';
import { naturalCompare } from './wardRankingEvidence';
import { statusTone } from './presentation';

export const rankingBands = [
  { id: 'green', label: 'On track', color: '#168575' },
  { id: 'yellow', label: 'Needs attention', color: '#b98022' },
  { id: 'red', label: 'Action needed', color: '#cf6259' },
  { id: 'neutral', label: 'Not assessed', color: '#8b9ba9' },
];
export const isScoredWard = (row: any) => row.rankable !== false && finite(row.finalScore);
export const wardBand = (row: any) => statusTone(isScoredWard(row) ? row.performanceBand : 'not_assessed');

/** Summaries of the server scores in the current selection; never recalculate ranking marks. */
export function wardRankingOverview(rows: any[]) {
  const assessed = rows.filter(isScoredWard);
  const ordered = [...assessed].sort((a, b) => a.finalScore - b.finalScore || naturalCompare(a.wardName, b.wardName));
  const average = assessed.length ? assessed.reduce((sum, row) => sum + row.finalScore, 0) / assessed.length : null;
  const distribution = rankingBands.map(band => ({ ...band, value: rows.filter(row => wardBand(row) === band.id).length }));
  const zones = [...new Set(rows.map(row => row.zoneId || 'unassigned'))].map(id => {
    const members = rows.filter(row => (row.zoneId || 'unassigned') === id);
    const scored = members.filter(isScoredWard);
    return { id, label: members[0]?.zoneName || 'Unassigned zone', total: members.length, assessed: scored.length,
      attention: scored.filter(row => wardBand(row) === 'red').length,
      value: scored.length ? scored.reduce((sum, row) => sum + row.finalScore, 0) / scored.length : null };
  }).sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity) || naturalCompare(a.label, b.label));
  const gaps = Object.entries(componentLabels).map(([key, label]) => {
    const components = assessed.flatMap(row => wardExplanation(row).applicable.filter(component => component.key === key));
    return { key, label, count: components.length,
      gap: components.length ? components.reduce((sum, c) => sum + Math.max(0, c.maxScore - c.score), 0) / components.length : null,
      maximum: components.length ? components.reduce((sum, c) => sum + c.maxScore, 0) / components.length : null };
  }).filter(item => item.count > 0).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
  return { assessed, average, distribution, zones, gaps, lowest: ordered.slice(0, 3), best: ordered.at(-1), unassessed: rows.length - assessed.length };
}
