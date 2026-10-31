import React, { useEffect, useState } from 'react';
import { FileText, History, Image, MapPin, Printer, ShieldCheck, Sparkles } from 'lucide-react';
import type { User } from '../../types';
import { Drawer } from '../common/Drawer';
import { StatusBadge } from '../common/Badge';
import { ImageLightbox } from './ImageLightbox';
import { ReportContacts } from './ReportContacts';
import { ReportAiPanel } from './ReportAiPanel';
import { matrixStore } from '../../services/store';
import { MODULE_LABELS, ROLE_LABELS } from '../../services/presentation';
import { AiReview, DecisionHistory, ReportTimeline, formatDate, printReports } from './ReportDocument';
export function ReportDetailDrawer({ reportId,onClose,currentUser,onReportUpdated }: { reportId:string|null;onClose:()=>void;currentUser:User;onReportUpdated?:()=>void }) {
  const [tab,setTab]=useState('overview'),[image,setImage]=useState<number|null>(null),[reason,setReason]=useState(''),[escalating,setEscalating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setTab('overview');setImage(null);setEscalating(false);setReason('');setError('');},[reportId]);
  useEffect(()=>{if(reportId)void matrixStore.ensurePage('ulb_user_perf');},[reportId,currentUser.cityId]);
  const r=reportId ? matrixStore.getReportById(reportId) : null;
  if(!r)return null;
  const ward=matrixStore.getWards().find(w=>w.id===r.wardId),zone=matrixStore.getZones().find(z=>z.id===r.zoneId);
  const tabs=[['overview','Report overview',FileText],['evidence',`Images (${r.photos.length})`,Image],['decisions','Role decisions',ShieldCheck],['ai','AI Visual Review',Sparkles],['timeline','Timeline',History]] as const;
  const canEscalate=matrixStore.hasCapability(currentUser,'escalateOperationalReport',r.cityId) && ['approved','rejected'].includes(r.status);
  return <Drawer isOpen onClose={onClose} title={r.assetName} subtitle={`${MODULE_LABELS[r.moduleId]} · ${r.reportNumber}`} width="4xl"><div className="report-detail">
    <div className="report-status-strip"><StatusBadge status={r.status}/><span>{formatDate(r.submittedAt)} IST</span>{canEscalate&&<button className="action-required-button" onClick={()=>{setTab('decisions');setEscalating(true);}}>Mark Action Required</button>}<button className="workspace-secondary-button" onClick={()=>printReports(`Inspection report · ${r.reportNumber}`,[r])}><Printer size={15}/>Print / Save PDF</button></div>
    <nav className="report-tabs" aria-label="Report sections">{tabs.map(([id,label,Icon])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}><Icon size={14}/>{label}</button>)}</nav>
    {tab==='overview' && <div className="space-y-5"><ReportContacts report={r}/><div className="report-facts">{[['Zone',zone?.name],['Ward',ward?.name],['Submitted by',r.submittedByName],['Role',ROLE_LABELS[r.submittedByRole]],['Sanitary Inspector',r.reviewerName],['Inspection score',r.overallScore == null ? 'Not supplied' : `${r.overallScore}/100`]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value || 'Not recorded'}</strong></div>)}</div>{r.coordinates.some(Boolean) && <a className="inline-flex items-center gap-2 text-xs text-teal-700" href={`https://www.openstreetmap.org/?mlat=${r.coordinates[0]}&mlon=${r.coordinates[1]}#map=18/${r.coordinates[0]}/${r.coordinates[1]}`} target="_blank" rel="noreferrer"><MapPin size={14}/>Open report location</a>}
      <div className="report-evidence-preview">{r.photos.slice(0,3).map((p,i)=><button key={i} onClick={()=>setImage(i)}><img loading="lazy" src={p.url} alt={p.caption || `Evidence ${i+1}`}/><span>{p.caption || p.type}</span></button>)}{!r.photos.length && <div className="evidence-empty">No photographic evidence supplied.</div>}</div>
      <h3 className="report-section-title">Inspection questions & answers</h3>{r.questions.length ? <div className="space-y-3">{r.questions.map((q,i)=><article key={i} className="answer-card"><small>{q.category}</small><h4>{i+1}. {q.question}</h4><p>{typeof q.answerValue==='boolean' ? q.answerValue?'Yes':'No' : String(q.answerValue)}</p>{q.remarks && <blockquote>{q.remarks}</blockquote>}</article>)}</div> : <p className="evidence-empty">No question-level answers supplied.</p>}<h3 className="report-section-title">Review & decision summary</h3><DecisionHistory report={r}/></div>}
    {tab==='evidence' && <div className="evidence-grid">{r.photos.map((p,i)=><button key={i} className="evidence-photo" onClick={()=>setImage(i)}><img src={p.url} loading="lazy" alt={p.caption || `Report evidence ${i+1}`}/><div><strong>{p.caption || `Photo ${i+1}`}</strong><small>{p.type} · {formatDate(p.timestamp)}</small></div></button>)}{!r.photos.length && <p className="evidence-empty">No images supplied.</p>}</div>}
    {tab==='decisions' && <div className="space-y-5"><DecisionHistory report={r}/>{currentUser.role==='COMMISSIONER' && <p className="text-xs text-slate-500">Commissioner oversight: recorded decisions and officer remarks are shown here. Review actions remain with the assigned Sanitary Inspector, ULB Officer and IEC Member.</p>}{canEscalate && <button onClick={()=>setEscalating(v=>!v)} className="workspace-secondary-button">Mark Action Required</button>}{escalating && <form className="space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await matrixStore.escalateOperationalReport(r.id,reason,'',currentUser);setEscalating(false);onReportUpdated?.();}catch(e){setError(e instanceof Error?e.message:'Unable to submit.');}finally{setBusy(false);}}}><label className="ops-filter"><span>Reason for corrective action</span><textarea required value={reason} onChange={e=>setReason(e.target.value)} className="border rounded-lg p-3"/></label><button disabled={busy} className="workspace-secondary-button">{busy?'Submitting…':'Confirm request'}</button>{error && <p role="alert" className="text-red-700">{error}</p>}</form>}</div>}
    {tab==='ai' && <ReportAiPanel key={r.id} report={r} currentUser={currentUser}/>}{tab==='timeline' && <ReportTimeline report={r}/>}
    <ImageLightbox isOpen={image!==null} onClose={()=>setImage(null)} images={r.photos} initialIndex={image || 0}/>
  </div></Drawer>;
}
