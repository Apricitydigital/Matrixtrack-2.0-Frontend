import {exportCommissionerAudit} from '../../services/commissionerAuditExport';
import React, { useEffect, useRef, useState } from 'react';
import { Download, FileBarChart, Printer } from 'lucide-react';
import { commissionerReportData, type ReportDataInput } from '../../services/commissionerReportData';
import { matrixStore } from '../../services/store';
import { downloadCsv, generateCsv } from '../../services/csv';
import { printElement } from '../../services/print';
import { CardInfo } from '../../components/common/CardInfo';

const number=(value:number|null|undefined)=>value==null?'Not available':value.toLocaleString('en-IN',{maximumFractionDigits:1});
export type ReportDataReviewProps=Omit<ReportDataInput,'personnelComplete'>&{loading:boolean};
/** Detailed report evidence belongs on Reports & Exports. */
export function ReportDataReview(props:ReportDataReviewProps) {
  const [open,setOpen]=useState(true);
  return <section className="home-section report-data-review"><div className="home-section-heading"><div><span>REPORT DATA & SOURCES</span><h2>Report data</h2><p>Service totals and supporting records for the selected dates.</p></div><button aria-expanded={open} onClick={()=>setOpen(v=>!v)}><FileBarChart size={16}/>{open?'Close report data':'Review report data'}</button></div>{open&&<ReportDataContent {...props}/>}</section>;
}

function ReportDataContent(props:ReportDataReviewProps) {
  const root=useRef<HTMLDivElement>(null),[peopleError,setPeopleError]=useState('');
  const exportRequest=useRef<AbortController|null>(null),[exporting,setExporting]=useState(false),[exportMessage,setExportMessage]=useState('');
  useEffect(()=>{setExporting(false);setExportMessage('');return()=>exportRequest.current?.abort();},[props.city.id,props.from,props.to,props.zone,props.ward,JSON.stringify(props.selectedZoneIds),JSON.stringify(props.selectedWardIds)]);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      try {
        await matrixStore.loadCollection('users');
        for(let page=0;!cancelled&&matrixStore.getCollection('users').hasMore&&page<1000;page++) {
          const before=matrixStore.getCollection('users').loaded;
          await matrixStore.loadMore('users');
          if(matrixStore.getCollection('users').status==='error'||matrixStore.getCollection('users').loaded<=before)break;
        }
        if(!cancelled&&matrixStore.getCollection('users').status!=='ready')setPeopleError('Personnel totals could not be verified.');
      }catch{if(!cancelled)setPeopleError('Personnel totals could not be verified.');}
    };
    void load();return()=>{cancelled=true;};
  },[props.city.id]);
  const collection=matrixStore.getCollection('users');
  const report=commissionerReportData({...props,personnelComplete:collection.status==='ready'&&!collection.hasMore});
  const sections=[...new Set(report.facts.map(f=>f.section))];
  const exportData=()=>downloadCsv(`commissioner-report-data-${props.from}-${props.to}.csv`,generateCsv(['From (IST)','To (IST)','Scope','Section','Metric','Value','Source','Definition / availability'],[
    ...report.facts.map(f=>[props.from,props.to,report.scope,f.section,f.label,f.value??'Not available',f.source,f.note]),
    ...report.modules.flatMap(m=>[['Total assets',m.totalEntities],['Inspection target',m.delivery.target],['Achieved: inspections completed',m.achieved],['Coverage %',m.coveragePercent],['Unique assets inspected',m.uniqueEntities],['Total inspection records',m.totalRecords],['Draft',m.drafts],['Target credits',m.delivery.completed]].map(([label,value])=>[props.from,props.to,report.scope,`Service: ${m.label}`,label,value??'Not available','Same inspection register and target source as dashboard','Achieved and asset coverage exclude Draft. Total inspection records include Draft.']))
  ]));
  return <div className="report-data-content" ref={root}><div className="report-data-meta"><div><strong>{props.from} – {props.to}</strong><span>{report.days} inclusive days · IST · {report.scope}</span></div><div className="commissioner-actions no-print"><button disabled={props.loading||exporting||collection.status!=='ready'||Boolean(collection.hasMore)} onClick={async()=>{const c=new AbortController();exportRequest.current=c;setExporting(true);setExportMessage('Preparing Excel report...');try{await exportCommissionerAudit({...props,personnelComplete:true},c.signal,setExportMessage);if(!c.signal.aborted)setExportMessage('Report downloaded.');}catch(e){if(!c.signal.aborted)setExportMessage(e instanceof Error?e.message:'Export failed.');}finally{if(!c.signal.aborted)setExporting(false);}}}><Download size={15}/>{exporting?'Preparing Excel report...':'Download Excel report'}</button>{exporting&&<button onClick={()=>{exportRequest.current?.abort();setExporting(false);setExportMessage('Export cancelled.');}}>Cancel export</button>}<button disabled={props.loading} onClick={exportData}><Download size={15}/>Download CSV</button><button disabled={props.loading} onClick={()=>printElement(`${props.city.name} · Report data`,root.current,`${props.from} to ${props.to} · ${report.scope}`)}><Printer size={15}/>Print / Save PDF</button></div></div>
    <p className="report-data-notice">{props.loading?'Loading complete inspection records...':`${report.available} of ${report.facts.length} report fields have source data.`} “Not available” means evidence is missing, not zero. Current inventory and enrolled accounts are snapshots; activity totals use the selected dates.</p>
    {exportMessage&&<p role="status">{exportMessage}</p>}
    {peopleError&&<p role="status">{peopleError}</p>}
    <div className="zone-table-wrap"><table className="zone-delivery-table"><thead><tr><th>Service</th><th>Total assets</th><th>Inspection target</th><th>Achieved</th><th>Coverage %</th><th>Unique assets inspected</th><th>Total inspection records</th></tr></thead><tbody>{report.modules.map(m=><tr key={m.id}><td>{m.label}</td>{[m.totalEntities,m.delivery.target,m.achieved,m.coveragePercent,m.uniqueEntities,m.totalRecords].map((v,i)=><td key={i}>{props.loading?'Updating':number(v)}{i===3&&v!=null?'%':''}</td>)}</tr>)}</tbody></table></div>
    {sections.map((section,index)=><details className="report-fact-section" key={section} open={index===0}><summary>{section}<small>{report.facts.filter(f=>f.section===section&&f.value!=null).length} sourced</small></summary><dl>{report.facts.filter(f=>f.section===section).map(f=><div key={f.id}><dt>{f.label}<CardInfo title={f.label}><p>{f.source}</p><p>{f.note||'Uses the selected dashboard scope.'}</p></CardInfo></dt><dd data-report-field={f.id} data-available={!props.loading&&f.value!=null}>{props.loading?'Updating':typeof f.value==='number'?number(f.value):f.value??'Not available'}<small className="report-print-note">{f.source}. {f.note}</small></dd></div>)}</dl></details>)}
  </div>;
}
