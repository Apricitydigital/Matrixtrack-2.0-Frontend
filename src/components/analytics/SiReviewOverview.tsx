import React,{useEffect,useState} from 'react';
import type {InspectionCoverage} from '../../services/inspectionCoverage';
import {api} from '../../services/api';
import {useOperationalRefresh} from '../../services/useOperationalRefresh';
import {siReviewPercent,siReviewSummary,type SiReviewRule} from '../../services/siReviewSummary';
import {CardInfo} from '../common/CardInfo';

export function SiReviewOverview({cityId,data,loading,zoneIds=[],wardIds=[],revision=0,rule,onPending}:{cityId:string;data:InspectionCoverage;loading:boolean;zoneIds?:string[];wardIds?:string[];revision?:number;rule?:SiReviewRule|null;onPending:()=>void}) {
  const [loaded,setLoaded]=useState<{key:string;rule:SiReviewRule|null}>({key:'',rule:null});
  const liveRevision=useOperationalRefresh(cityId,rule===undefined&&!loading);
  const key=JSON.stringify([cityId,zoneIds,wardIds,revision]);
  useEffect(()=>{
    if(rule!==undefined)return;
    const c=new AbortController();
    api(`/city/targets/percent-scope?${new URLSearchParams({role:'QC',zoneIds:zoneIds.join(','),wardIds:wardIds.join(',')})}`,{signal:c.signal,headers:{'x-city-id':cityId},cache:'no-store'}).then(value=>{if(!c.signal.aborted)setLoaded({key,rule:value});}).catch(()=>{if(!c.signal.aborted)setLoaded({key,rule:null});});
    return()=>c.abort();
  },[key,rule,liveRevision]);
  const current=rule!==undefined?rule:loaded.key===key?loaded.rule:null;
  const percent=siReviewPercent(current),summary=siReviewSummary(data,percent);
  const count=(n:number|null)=>loading?'…':n==null?'—':n.toLocaleString('en-IN');
  return <section className="home-section"><div className="home-section-heading"><div><span>SI REVIEW</span><h2>SI review workload</h2></div><CardInfo title="SI target"><p>Submitted reports use the same dates, zones, wards and modules as Inspection target. Drafts are excluded.</p><p>The target uses the SI percentage saved by ULB for the selected area. The date-range target sums the rounded percentage of reports submitted on each IST day. It is not multiplied by the number of SIs.</p><p>Officer queues and scores use each SI's assigned reports, saved review sets and older backlog. Those operational figures are separate from this submission-period comparison.</p></CardInfo></div><div className="ulb-si-body"><div className="ulb-followup-tiles">
    <div className="ulb-followup-tile neutral"><button type="button" disabled><span>Reports received for SI review</span><strong>{count(summary.received)}</strong></button></div>
    <div className="ulb-followup-tile neutral"><button type="button" disabled><span>SI target{percent!=null?` (${percent}%)`:''}</span><strong>{count(summary.target)}</strong></button></div>
    <div className="ulb-followup-tile green"><button type="button" disabled><span>Reviewed / passed to follow-up</span><strong>{count(summary.reviewed)}</strong></button></div>
    <div className="ulb-followup-tile yellow"><button onClick={onPending} disabled={loading||summary.pending==null}><span>Pending with SI</span><strong>{count(summary.pending)}</strong></button></div>
  </div><p className="ulb-target-explanation">{percent==null?'SI percentage setting unavailable or mixed; no target is assumed.':`${current?.targets?'Configured':'Default'} ${percent}% daily review target. For these dates, the target is based on submitted reports, rounded up once per IST day across the selected modules.`}</p>{summary.other!=null&&summary.other>0&&<p className="coverage-data-note">{count(summary.other)} submitted reports are in other workflow states.</p>}</div></section>;
}
