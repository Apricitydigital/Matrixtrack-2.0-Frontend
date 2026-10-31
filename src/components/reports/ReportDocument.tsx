import React from 'react';
import type { OperationalReport } from '../../types';
import { ROLE_LABELS, MODULE_LABELS, statusLabel, statusTone } from '../../services/presentation';
import { matrixStore } from '../../services/store';
import { printHtml } from '../../services/print';
import { AiCards } from './ReportAiPanel';
import { ReportContacts } from './ReportContacts';
export const formatDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not recorded';
export function DecisionHistory({ report }: { report: OperationalReport }) {
  return <div className="decision-grid">{['QC','ULB_OFFICER','ACTION_OFFICER'].map(role => {
    const d=report.decisions?.find(d=>d.role===role);
    return <article key={role} data-tone={statusTone(d?.decision || "")} className={`decision-card ${d ? 'decision-recorded' : ''}`}><span>{ROLE_LABELS[role]}</span><h3>{d?.decision ? statusLabel(d.decision) : d ? 'Remarks recorded' : 'No decision recorded'}</h3><p>{d?.name || 'Officer name not recorded'}</p><small>{formatDate(d?.timestamp)}</small><blockquote>{d?.remarks || 'No remarks recorded.'}</blockquote></article>;
  })}</div>;
}
export function AiReview({ report }: { report: OperationalReport }) {
  return <AiCards report={report}/>;
}
export function ReportTimeline({ report }: { report: OperationalReport }) {
  return report.timeline.length ? <ol className="report-timeline">{report.timeline.map(e=><li key={e.id}><span className="timeline-dot"/><div><strong>{statusLabel(e.action)}</strong><time>{formatDate(e.timestamp)} IST</time><p>{e.actorName || 'Name not recorded'}{e.actorRole ? ` · ${ROLE_LABELS[e.actorRole] || e.actorRole}` : ''}</p>{e.remarks && <blockquote>{e.remarks}</blockquote>}</div></li>)}</ol> : <p className="evidence-empty">No timeline supplied for this report.</p>;
}
export function ReportDocument({ report, images = true }: { report: OperationalReport; images?: boolean }) {
  const ward=matrixStore.getWards().find(w=>w.id===report.wardId),zone=matrixStore.getZones().find(z=>z.id===report.zoneId);
  return <article className="report-document"><h2>{MODULE_LABELS[report.moduleId]} · {report.assetName}</h2><p>{report.reportNumber} · {statusLabel(report.status)}</p><p>{zone?.name || 'Zone not recorded'} / {ward?.name || 'Ward not recorded'} · {formatDate(report.submittedAt)} IST</p><p>Submitted by {report.submittedByName || 'Not recorded'} · {ROLE_LABELS[report.submittedByRole]}</p><ReportContacts report={report}/><h3>Role decisions & remarks</h3><DecisionHistory report={report}/><h3>Inspection answers</h3>{report.questions.length ? <table><thead><tr><th>Question</th><th>Response</th><th>Remarks</th></tr></thead><tbody>{report.questions.map((q,i)=><tr key={i}><td>{q.question}</td><td>{String(q.answerValue)}</td><td>{q.remarks || '—'}</td></tr>)}</tbody></table> : <p>No inspection answers supplied.</p>}<h3>AI Visual Review</h3><AiReview report={report}/><h3>Timeline</h3><ReportTimeline report={report}/>{images && <><h3>Photographic evidence ({report.photos.length})</h3><div className="print-gallery">{report.photos.map((p,i)=><figure key={i}><img src={p.url} alt={p.caption || `Evidence ${i+1}`}/><figcaption>{p.type} · {p.caption} · {formatDate(p.timestamp)}</figcaption></figure>)}</div>{!report.photos.length && <p>No photographs supplied.</p>}</>}</article>;
}
export async function printReports(title: string, reports: OperationalReport[], images = true) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const range=matrixStore.getDateRange();
  printHtml(title,renderToStaticMarkup(<>{reports.map(r=><ReportDocument key={r.id} report={r} images={images}/>)}</>),`${matrixStore.getCityById(reports[0]?.cityId)?.name || ''} · ${range.from} to ${range.to} · ${reports.length} selected loaded reports`);
}
