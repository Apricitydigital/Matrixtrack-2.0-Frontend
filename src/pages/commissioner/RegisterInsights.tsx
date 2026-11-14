import React, {useMemo} from 'react';
import { CardInfo } from '../../components/common/CardInfo';
import type { OperationalReport } from '../../types';
import { BarChart, ChartCard, DonutChart } from '../../components/analytics/Analytics';
import { registerInsightData } from '../../services/registerInsights';
export function RegisterInsights({rows,modules,onStatus,onModule,unavailable}:{rows:OperationalReport[];modules?:string[];onStatus:(value:string)=>void;onModule:(value:string)=>void;unavailable?:string}) {
  const data=useMemo(()=>registerInsightData(rows,modules),[rows,modules]);
  return <div className="analytics-grid two"><ChartCard eyebrow="CURRENT REPORT STATUS" title="Every inspection accounted for" action={<CardInfo title="Current report statuses">One current status per record, using the same labels as City Overview. Pending review includes submitted reports awaiting an SI decision.</CardInfo>}>{unavailable?<p role="status">{unavailable}</p>:<><DonutChart label="inspection records" items={data.statuses.filter(s=>s.value>0)} onSelect={onStatus}/></>}</ChartCard><ChartCard eyebrow="SI REVIEW QUEUES" title="Reports awaiting SI review" action={<CardInfo title="SI review queues">Pending review only. IEC Action taken is tracked separately while corrective work awaits verification. Select a module to open its pending reports.</CardInfo>}>{unavailable?<p role="status">{unavailable}</p>:<><BarChart items={data.queues} onSelect={onModule}/></>}</ChartCard></div>;
}
