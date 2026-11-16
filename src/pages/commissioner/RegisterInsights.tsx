import React, {useMemo} from 'react';
import { CardInfo } from '../../components/common/CardInfo';
import type { OperationalReport } from '../../types';
import { ArrowUpRight } from 'lucide-react';
import { BarChart, ChartCard } from '../../components/analytics/Analytics';
import { registerInsightData } from '../../services/registerInsights';

function ReportStatusChart({items,onSelect}:{items:ReturnType<typeof registerInsightData>['statuses'];onSelect:(value:string)=>void}) {
  const total=items.reduce((sum,item)=>sum+item.value,0);
  const pending=items.find(item=>item.id==='pending_review')?.value||0;
  return <div className="register-status-chart">
    <div className="register-status-summary"><div><strong>{total.toLocaleString()}</strong><span>Total reports</span></div><div><strong>{pending.toLocaleString()}</strong><span>Pending review</span></div></div>
    {total===0?<p className="register-status-empty" role="status">No inspection reports for the selected filters.</p>:<>
      <div className="register-status-bars" aria-label="Report counts by current status">{items.map(item=>{
        const percent=item.value/total*100;
        const share=percent.toLocaleString(undefined,{maximumFractionDigits:1});
        return <button key={item.id} type="button" disabled={item.value===0} onClick={()=>onSelect(item.id)} aria-label={`${item.label}: ${item.value.toLocaleString()} reports, ${share}%. Open reports.`}>
          <span className="register-status-label">{item.label}</span><span className="register-status-track" aria-hidden="true"><i style={{width:`${percent}%`,background:item.color}}/></span><strong>{item.value.toLocaleString()}</strong><small>{share}%</small><ArrowUpRight size={12} aria-hidden="true"/>
        </button>;
      })}</div>
      <p className="register-status-note">Share of matching reports · Select a status to view its reports.</p>
    </>}
  </div>;
}
export function RegisterInsights({rows,modules,onStatus,onModule,unavailable}:{rows:OperationalReport[];modules?:string[];onStatus:(value:string)=>void;onModule:(value:string)=>void;unavailable?:string}) {
  const data=useMemo(()=>registerInsightData(rows,modules),[rows,modules]);
  return <div className="analytics-grid two"><ChartCard eyebrow="CURRENT REPORT STATUS" title="Report status breakdown" action={<CardInfo title="Current report statuses">Each report appears in one current status. Bar lengths show the share of matching reports. Pending review also includes drafts and unclassified records; it is not a count of completed SI decisions.</CardInfo>}>{unavailable?<p role="status">{unavailable}</p>:<ReportStatusChart items={data.statuses} onSelect={onStatus}/>}</ChartCard><ChartCard eyebrow="SI REVIEW QUEUES" title="Reports awaiting SI review" action={<CardInfo title="SI review queues">Pending review only. IEC Action taken is tracked separately while corrective work awaits verification. Select a module to open its pending reports.</CardInfo>}>{unavailable?<p role="status">{unavailable}</p>:<><BarChart items={data.queues} onSelect={onModule}/></>}</ChartCard></div>;
}
