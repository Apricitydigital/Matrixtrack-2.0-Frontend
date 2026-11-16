import React from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {Ward} from '../../types';
import type {InspectionCoverage} from '../../services/inspectionCoverage';
import {inspectionOutcomes} from '../../services/inspectionCoverage';
import {inspectionMetrics} from '../../services/inspectionMetrics';
import {targetDelivery,targetReadState,reportTargetDelivery} from '../../services/targetDelivery';
import {geographyOrder} from '../../services/wardInspections';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {useVisual} from '../../services/vizMode';
import {scopedIntelligence} from '../../services/intelligenceMetrics';
import {heatStyle} from '../../components/analytics/VisualCharts';
import {usePanel} from '../../components/dashboard/DetailPanel';
import {isAssessedWard} from '../../services/zoneRanking';
import {amount} from '../../services/insights';
import {ScoreCalcInfo,WardScoreBody,scoreText,type InspectionFigures} from './WardScoreDetail';

interface Props {data:InspectionCoverage;wards:Ward[];targetRows:any[];targetsReady:boolean;loading:boolean;onInspect:(ward:Ward,status?:string)=>void;rankings?:any[];rankingsLoading?:boolean;zoneNames?:Record<string,string>;wardDetail?:boolean;}
const count=(value:number|null)=>value==null?'N/A':value.toLocaleString('en-IN',{maximumFractionDigits:1});

export function WardReportProgress({data,wards,targetRows,targetsReady,loading,onInspect,rankings=[],rankingsLoading=false,zoneNames={},wardDetail=false}:Props) {
  const panel=usePanel();
  // Ward score and rank come from the Ward Ranking data. Assessed wards are listed first by city rank; the rest follow in geography order.
  const scoreOf=React.useMemo(()=>new Map(rankings.map((row:any)=>[row.wardId,row])),[rankings]);
  const ordered=React.useMemo(()=>[...wards].sort((a,b)=>{const ra=scoreOf.get(a.id),rb=scoreOf.get(b.id),oa=isAssessedWard(ra),ob=isAssessedWard(rb);return oa&&ob?rb.finalScore-ra.finalScore||(ra.cityRank??1e9)-(rb.cityRank??1e9)||geographyOrder(a,b):oa!==ob?(oa?-1:1):geographyOrder(a,b);}),[wards,scoreOf]);
  const paging=usePagination(ordered,JSON.stringify([data.from,data.to,wards.map(w=>w.id),data.modules,rankings.length]),6);
  // Colour scale across the wards shown: best score green, fading to a light amber for the lowest.
  const scores=ordered.map(w=>scoreOf.get(w.id)).filter(isAssessedWard).map((r:any)=>r.finalScore as number),lo=scores.length?Math.min(...scores):0,hi=scores.length?Math.max(...scores):0;
  const scale=(v:number|null)=>v==null?0:hi===lo?1:(v-lo)/(hi-lo);
  const number=(value:number|null)=>loading?'Updating':count(value);
  const rowData=(ward:Ward)=>{
    const scope={zone:ward.zoneId,ward:ward.id},metrics=inspectionMetrics(data,scope);
    const rows=targetRows.filter(row=>row.wardId===ward.id),configured=rows.some(row=>row.source==='ADMIN');
    const source={target:rows.reduce((n,row)=>n+row.target,0),completed:rows.reduce((n,row)=>n+row.credit,0),targetState:configured?'configured' as const:'default' as const};
    const delivery=reportTargetDelivery(targetReadState(targetDelivery(source,metrics.completed),targetsReady),metrics.achieved);
    const outcomes=inspectionOutcomes(data,scope),ai=scopedIntelligence(data,scope,outcomes.total!=null),status=(id:string)=>outcomes.rows.find(row=>row.id===id)?.value??null;
    return {scope,metrics,delivery,outcomes,ai,status};
  };
  /** Ward row click: with wardDetail the ward opens in a side panel and no dashboard filter changes; otherwise the old page behaviour. */
  const openWard=(ward:Ward)=>{
    if(!wardDetail||!panel||loading){onInspect(ward);return;}
    const {metrics,delivery,outcomes,ai,status}=rowData(ward),n=(v:number|null)=>count(v);
    const figures:InspectionFigures={received:n(metrics.achieved),target:n(delivery.target),percent:delivery.percent==null?'':`${count(delivery.percent)}% of target`,needed:n(delivery.remaining),coverage:`${n(metrics.uniqueEntities)} / ${n(metrics.totalEntities)}`,coveragePercent:metrics.coveragePercent==null?'Coverage unavailable':`${count(metrics.coveragePercent)}% of registered locations`,pending:n(status('pending_review')),siCleaned:n(status('approved')),siNotCleaned:n(status('rejected')),aiClean:n(ai?ai.clean:null),aiNotClean:n(ai?ai.notClean:null)};
    const ranked=scoreOf.get(ward.id)||{wardId:ward.id,wardName:ward.name,zoneId:ward.zoneId,rankable:false};
    panel.open({title:ward.name,subtitle:`Ward performance · ${zoneNames[ward.zoneId]||'zone'}`,width:'3xl',body:<WardScoreBody ward={ranked} zoneName={zoneNames[ward.zoneId]} figures={figures} onOpenReports={()=>onInspect(ward)}/>});
  };

  const visual=useVisual();
  return <section className="home-section ward-overview"><div className="home-section-heading"><div><span>WARD FOLLOW-UP</span><h2>Ward performance</h2><p>Wards ranked by ward score, with submitted reports against the inspection target for the selected dates and modules.</p></div></div>
    <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Ward</th><th>Ward score &amp; rank<ScoreCalcInfo level="ward"/></th><th>Total assets</th><th>Inspection target</th><th>Reports received</th><th>Reports still needed</th><th>Report target progress</th><th>Coverage</th><th>Pending review</th><th>Cleaned<small> (SI)</small></th><th>Not cleaned<small> (SI)</small></th><th>AI suggests clean</th><th>AI suggests not clean</th></tr></thead><tbody>{paging.rows.map(ward=>{
      const {metrics,delivery,outcomes,ai,status,scope}=rowData(ward);
      return <tr key={ward.id} data-ward-progress={ward.id}><td><button className="zone-select" onClick={()=>openWard(ward)}>{ward.name}<ArrowUpRight size={13}/></button></td>
        {(()=>{const wr=scoreOf.get(ward.id),ok=isAssessedWard(wr);return <td data-label="Ward score & rank"><div className="zp-score" data-empty={!ok||undefined} style={{'--zt':scale(ok?wr.finalScore:null)} as React.CSSProperties}><strong>{loading||rankingsLoading?'…':ok?scoreText(wr.finalScore):'N/A'}<small>{!loading&&!rankingsLoading&&ok?' / 100':''}</small></strong><span className="zp-rank" data-rank={ok&&wr.cityRank?wr.cityRank:undefined} title={ok&&wr.cityRank?`City rank ${wr.cityRank}`:'Not ranked: no qualifying activity in these dates'}>{loading||rankingsLoading?'…':ok&&wr.cityRank?`#${wr.cityRank}`:'—'}</span><small>{rankingsLoading?'Updating scores…':ok?`${wr.zoneRank?`Zone rank #${wr.zoneRank}`:'City rank'}${wr.performanceBand?` · ${({GREEN:'On track',AMBER:'Needs attention',RED:'Action needed'} as Record<string,string>)[wr.performanceBand]||''}`:''}`:'Not assessed'}</small></div></td>;})()}
        <td data-ward-metric="assets">{number(metrics.totalEntities)}</td><td data-ward-metric="target">{number(delivery.target)}</td>
        <td data-ward-metric="received"><button disabled={loading||metrics.achieved==null} onClick={()=>onInspect(ward,'inspections_completed')}>{number(metrics.achieved)}</button></td>
        <td data-ward-metric="remaining">{number(delivery.remaining)}</td><td data-ward-metric="progress" className={visual&&!loading?'viz-heat':undefined} style={visual&&!loading?heatStyle(delivery.percent):undefined}>{loading?'Updating':delivery.percent==null?'N/A':`${count(delivery.percent)}%`}</td>
        <td className={visual&&!loading?'viz-heat viz-heat-aqua':undefined} style={visual&&!loading?heatStyle(metrics.coveragePercent):undefined}>{loading?'Updating':metrics.coveragePercent==null?'N/A':`${count(metrics.coveragePercent)}%`}</td>
        {['pending_review','approved','rejected'].map(id=><td key={id}><button disabled={loading||status(id)==null} onClick={()=>onInspect(ward,id)}>{number(status(id))}</button></td>)}
        {[['clean','intelligence_clean'],['notClean','intelligence_not_clean']].map(([k,f])=>{const v=ai?(ai as any)[k] as number:null;return <td key={f} data-ward-metric={f} title="AI suggestion on reports awaiting SI review; not an official decision"><button disabled={loading||v==null} onClick={()=>onInspect(ward,f)}>{number(v)}</button></td>;})}
      </tr>;
    })}</tbody></table></div>{!wards.length&&<p className="home-empty">No wards in the selected scope.</p>}<Pagination {...paging} noun="wards"/>
  </section>;
}
