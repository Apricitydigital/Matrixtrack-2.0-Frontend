import React from 'react';
import type { OperationalReport } from '../../types';
import { MODULE_LABELS, statusTone } from '../../services/presentation';
import { BarChart, ChartCard, chartColors, DonutChart } from '../../components/analytics/Analytics';
export function RegisterInsights({rows,onStatus,onModule}:{rows:OperationalReport[];onStatus:(value:string)=>void;onModule:(value:string)=>void}) {
  return <div className="analytics-grid two"><ChartCard eyebrow="REGISTER STATUS" title="Which reports need follow-up?"><DonutChart label="register reports" items={[['red','Attention required',chartColors.red],['yellow','Pending / verification',chartColors.gold],['green','Approved',chartColors.teal],['neutral','Unassessed',chartColors.grey]].map(([id,label,color])=>({id,label,color,value:rows.filter(r=>statusTone(r.status)===id).length}))} onSelect={onStatus}/></ChartCard><ChartCard eyebrow="MODULE REVIEW QUEUES" title="Where pending reports are concentrated"><BarChart items={Object.entries(MODULE_LABELS).map(([id,label])=>({id,label,value:rows.filter(r=>r.moduleId===id&&statusTone(r.status)==='yellow').length,detail:`${rows.filter(r=>r.moduleId===id).length} reports in this register`,color:chartColors.gold})).sort((a,b)=>b.value-a.value)} onSelect={onModule}/></ChartCard></div>;
}
