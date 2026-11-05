import {intelligenceCounts} from './intelligenceMetrics';
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
  const advisory = intelligenceCounts(data.visits.filter(v=>(!scope.zone||v.zoneId===scope.zone)&&(!scope.ward||v.wardId===scope.ward)&&(!scope.module||v.module===scope.module)).map(v=>({...v.raw,status:v.raw?.workspaceStatus||v.status})));
  const intelligence = data.failedModules.some(module=>!scope.module||module===scope.module)?null:advisory;
  return {records,completed,delivery,intelligence,totalEntities:records.total,achieved:completed.inspections,
    totalRecords:records.inspections,drafts:records.inspections==null?null:records.inspections-(completed.inspections??0),
    uniqueEntities:completed.covered,coveragePercent:completed.percent,
    repeatInspections:completed.repeats};
}
