import React from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {Ward} from '../../types';
import type {InspectionCoverage} from '../../services/inspectionCoverage';
import {inspectionOutcomes} from '../../services/inspectionCoverage';
import {inspectionMetrics} from '../../services/inspectionMetrics';
import {targetDelivery,targetReadState,reportTargetDelivery} from '../../services/targetDelivery';
import {geographyOrder} from '../../services/wardInspections';
import {Pagination,usePagination} from '../../components/common/Pagination';

interface Props {data:InspectionCoverage;wards:Ward[];targetRows:any[];targetsReady:boolean;loading:boolean;onInspect:(ward:Ward,status?:string)=>void;}
const count=(value:number|null)=>value==null?'\u2014':value.toLocaleString('en-IN',{maximumFractionDigits:1});

export function WardReportProgress({data,wards,targetRows,targetsReady,loading,onInspect}:Props) {
  const paging=usePagination([...wards].sort(geographyOrder),JSON.stringify([data.from,data.to,wards.map(w=>w.id),data.modules]));
  const number=(value:number|null)=>loading?'Updating':count(value);
  return <section className="home-section ward-overview"><div className="home-section-heading"><div><span>WARD FOLLOW-UP</span><h2>Ward performance</h2><p>Submitted reports against the inspection target for the selected dates and modules.</p></div></div>
    <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Ward</th><th>Total assets</th><th>Inspection target</th><th>Reports received</th><th>Reports still needed</th><th>Report target progress</th><th>Coverage</th><th>Pending review</th><th>Cleaned</th><th>Not cleaned</th><th>Action required</th><th>Action taken</th></tr></thead><tbody>{paging.rows.map(ward=>{
      const scope={zone:ward.zoneId,ward:ward.id},metrics=inspectionMetrics(data,scope);
      const rows=targetRows.filter(row=>row.wardId===ward.id),configured=rows.some(row=>row.source==='ADMIN');
      const source={target:rows.reduce((n,row)=>n+row.target,0),completed:rows.reduce((n,row)=>n+row.credit,0),targetState:configured?'configured' as const:'default' as const};
      const delivery=reportTargetDelivery(targetReadState(targetDelivery(source,metrics.completed),targetsReady),metrics.achieved);
      const outcomes=inspectionOutcomes(data,scope),status=(id:string)=>outcomes.rows.find(row=>row.id===id)?.value??null;
      return <tr key={ward.id} data-ward-progress={ward.id}><td><button className="zone-select" onClick={()=>onInspect(ward)}>{ward.name}<ArrowUpRight size={13}/></button></td>
        <td data-ward-metric="assets">{number(metrics.totalEntities)}</td><td data-ward-metric="target">{number(delivery.target)}</td>
        <td data-ward-metric="received"><button disabled={loading||metrics.achieved==null} onClick={()=>onInspect(ward,'inspections_completed')}>{number(metrics.achieved)}</button></td>
        <td data-ward-metric="remaining">{number(delivery.remaining)}</td><td data-ward-metric="progress">{loading?'Updating':delivery.percent==null?'\u2014':`${count(delivery.percent)}%`}</td>
        <td>{loading?'Updating':metrics.coveragePercent==null?'\u2014':`${count(metrics.coveragePercent)}%`}</td>
        {['pending_review','approved','rejected','action_required','action_taken'].map(id=><td key={id}><button disabled={loading||status(id)==null} onClick={()=>onInspect(ward,id)}>{number(status(id))}</button></td>)}
      </tr>;
    })}</tbody></table></div>{!wards.length&&<p className="home-empty">No wards in the selected scope.</p>}<Pagination {...paging} noun="wards"/>
  </section>;
}
