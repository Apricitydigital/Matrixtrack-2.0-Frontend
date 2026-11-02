import type { OperationalReport } from '../types';
import { INSPECTION_STATUSES, inspectionStatus } from './inspectionStatus';
import { MODULE_LABELS } from './presentation';
import { RAG_COLORS } from './chartData';
export function registerInsightData(rows: OperationalReport[], modules: string[] = Object.keys(MODULE_LABELS)) {
  const statuses=new Map<string,number>(),totals=new Map<string,number>(),pending=new Map<string,number>();
  for(const row of rows){const status=inspectionStatus(row.status);statuses.set(status,(statuses.get(status)||0)+1);totals.set(row.moduleId,(totals.get(row.moduleId)||0)+1);if(status==='pending_review')pending.set(row.moduleId,(pending.get(row.moduleId)||0)+1);}
  return {
    statuses: INSPECTION_STATUSES.map(s => ({id:s.id,label:s.label,color:RAG_COLORS[s.tone],value:statuses.get(s.id)||0})),
    queues: Object.entries(MODULE_LABELS).filter(([id])=>modules.includes(id)||totals.has(id)).map(([id,label])=>({id,label,value:pending.get(id)||0,detail:`${(totals.get(id)||0).toLocaleString()} total inspection records`,color:RAG_COLORS.yellow})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label)),
  };
}
