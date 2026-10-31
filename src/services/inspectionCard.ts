import type { InspectionFigures } from './commissioner';
import type { CoverageCounts } from './inspectionCoverage';
import { targetDelivery } from './targetDelivery';

/** Full-coverage baseline is independent of the configured target percentage/count. */
export function inspectionCard(counts:CoverageCounts,figures?:InspectionFigures) {
  return {totalRequired:counts.total,delivery:targetDelivery(figures,counts),counts};
}
