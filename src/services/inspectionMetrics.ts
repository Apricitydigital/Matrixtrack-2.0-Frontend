import { coverageCounts, inspectionStatus, type InspectionCoverage } from './inspectionCoverage';
import { targetDelivery } from './targetDelivery';
import type { InspectionFigures } from './commissioner';
import type { OperationalModuleId } from '../types';

export type InspectionScope={module?:OperationalModuleId;zone?:string;ward?:string};
/** Report records reconcile to status totals; completed visits and entity reach exclude Draft. */
export function inspectionMetrics(data:InspectionCoverage,scope:InspectionScope={},figures?:InspectionFigures|null) {
  const records=coverageCounts(data,scope);
  const completedData={...data,visits:data.visits.filter(v=>inspectionStatus(v.status||'SUBMITTED')!=='unclassified')};
  const completed=coverageCounts(completedData,scope);
  const delivery=targetDelivery(figures,completed);
  return {records,completed,delivery,totalEntities:records.total,achieved:completed.inspections,
    totalRecords:records.inspections,drafts:records.inspections==null?null:records.inspections-(completed.inspections??0),
    uniqueEntities:completed.covered,coveragePercent:completed.percent,
    repeatInspections:completed.repeats};
}
