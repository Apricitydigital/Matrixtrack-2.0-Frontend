import { submittedBeatReportCount } from './beatReportCount';
import { inspectionMetrics } from './inspectionMetrics';
import type { InspectionCoverage } from './inspectionCoverage';
import { reportTargetDelivery, type TargetDelivery } from './targetDelivery';

/** Dashboard report delivery uses the selected register and its configured range target. */
export function darogaReportProgress(data: InspectionCoverage, delivery: TargetDelivery): TargetDelivery {
  const counts = data.modules.map(module => module === 'sweeping'
    ? submittedBeatReportCount(data)
    : inspectionMetrics(data, { module }).achieved);
  const received = counts.every(value => value != null)
    ? counts.reduce<number>((total, value) => total + value!, 0)
    : null;
  return reportTargetDelivery(delivery, received);
}
