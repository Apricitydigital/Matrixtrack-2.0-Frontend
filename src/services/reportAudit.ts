import type { OperationalReport, TimelineEvent } from '../types';
import { API_BASE_URL } from './api';
export function mediaUrl(value: unknown): string | null {
  if(typeof value !== 'string') return null;
  const url=value.trim();
  if(/^https?:\/\//i.test(url) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url) || /^blob:/i.test(url)) return url;
  if(url.startsWith('//')) return `https:${url}`;
  if(/^\/?(uploads|media)\//i.test(url) || /^\/(?!\/)/.test(url)) return `${API_BASE_URL}/${url.replace(/^\/+/, '')}`;
  if(/^[^:<>]+\.(jpe?g|png|gif|webp|heic|heif|avif)(\?.*)?$/i.test(url)) return `${API_BASE_URL}/${url.replace(/^\/+/, '')}`;
  return null;
}
const text=(...values: any[]) => values.find(v=>typeof v === 'string' && v.trim()) || '';
const person=(value: any) => typeof value === 'string' ? value : value?.name || '';
export function reportAudit(raw: any): Pick<OperationalReport,'aiReviews'|'decisions'|'timeline'> {
  const p=raw.payload || {};
  const definitions=[
    {role:'QC',actor:raw.reviewedByQc || raw.qcReviewer || raw.reviewedBy || p.reviewedByQc, decision:text(raw.qcDecision,p.qcDecision,raw.qcStatus,p.qcStatus,['APPROVED','REJECTED'].includes(raw.status) ? raw.status : ''), remarks:text(raw.qcComment,raw.qcRemark,raw.reviewerNote,raw.reviewRemarks,p.qcComment,p.qcRemark), timestamp:text(raw.qcReviewedAt,raw.reviewedAt,p.qcReviewedAt,p.reviewedAt)},
    {role:'ULB_OFFICER',actor:raw.ulbReviewedBy || raw.ulbReviewer || p.ulbReviewedBy,decision:text(raw.ulbStatus,p.ulbStatus),remarks:text(raw.ulbRemark,raw.ulbRemarks,p.ulbRemark,p.ulbRemarks),timestamp:text(raw.ulbReviewedAt,p.ulbReviewedAt,raw.actionRequiredAt)},
    {role:'ACTION_OFFICER',actor:raw.actionTakenBy || raw.actionOfficer || p.actionTakenBy,decision:raw.actionTakenAt || raw.actionOfficerRespondedAt || p.actionTakenAt ? 'ACTION_TAKEN' : '',remarks:text(raw.actionOfficerRemark,raw.actionTakenRemarks,raw.actionNote,raw.aoNote,raw.aoRemark,raw.actionDescription,raw.actionTakenDescription,p.aoRemark,p.actionDescription,p.actionRemarks),timestamp:text(raw.actionTakenAt,raw.actionOfficerRespondedAt,p.actionTakenAt)}
  ];
  const decisions=definitions.filter(d=>d.timestamp || d.remarks || d.decision).map(d=>({role:d.role,name:person(d.actor),decision:d.decision,remarks:d.remarks,timestamp:d.timestamp}));
  const aiReviews: NonNullable<OperationalReport['aiReviews']>=[];
  for(const [stage,result] of [['Sanitary Inspector',raw.autoQcResult || p.autoQcResult || raw.qcAiResult || p.qcAiResult],['ULB Officer',raw.actionAiResult || raw.ulbAiResult || p.actionAiResult || p.ulbAiResult]] as const) {
    if(!result) continue;
    const r=typeof result === 'string' ? {summary:result} : result;
    const confidence=r.confidence == null ? undefined : Number(r.confidence);
    aiReviews.push({stage,decision:text(r.decision,r.result,['ACTION_REQUIRED','NO_ACTION_REQUIRED'].includes(r.recommendation)?r.recommendation:''),summary:text(r.summary,r.reason,r.suggestion,!['ACTION_REQUIRED','NO_ACTION_REQUIRED'].includes(r.recommendation)?r.recommendation:''),recommendedAction:text(r.recommendedAction,r.actionSuggestion),reasons:(Array.isArray(r.reasons)?r.reasons:[]).map((v:any)=>typeof v==='string'?v:text(v.reason,v.summary)).filter(Boolean),summaryHi:text(r.summaryHi),recommendedActionHi:text(r.recommendedActionHi),reasonsHi:(Array.isArray(r.reasonsHi)?r.reasonsHi:[]).filter((v:any)=>typeof v==='string'),generatedAt:stage==='ULB Officer'?text(raw.actionAiAt,p.actionAiAt):text(raw.autoQcAt,p.autoQcAt),model:text(r.model),sourceQcDecision:text(r.sourceQcDecision),confidence:confidence !== undefined && Number.isFinite(confidence) ? Math.max(0,Math.min(100,confidence <= 1 ? confidence*100 : confidence)) : undefined, checks:(Array.isArray(r.checks) ? r.checks : Array.isArray(r.pointFindings) ? r.pointFindings : []).map((c:any,i:number)=>({label:text(c.question,c.questionCode,c.pointCode,c.code) || `Q${i+1}`,result:text(c.result,c.status,c.decision),reason:text(c.reason,c.visualFinding,c.finding,c.summary)})),insights:(Array.isArray(r.additionalInsights) ? r.additionalInsights : []).map((v:any)=>typeof v==='string'?v:text(v.summary,v.finding,v.reason)).filter(Boolean)});
  }
  const source=raw.statusHistory || raw.timeline || p.statusHistory || [];
  const timeline: TimelineEvent[]=(Array.isArray(source)?source:[]).map((h:any,i:number)=>({id:h.id || `history-${i}`,timestamp:text(h.at,h.timestamp,h.createdAt),action:text(h.event,h.action,h.status),actorName:person(h.actor) || text(h.actorName),actorRole:text(h.actor?.role,h.actorRole),remarks:text(h.reason,h.remarks,h.comment)}));
  const date=text(raw.createdAt,raw.submittedAt);
  if(date && !timeline.some(t=>t.timestamp === date)) timeline.push({id:'submission',timestamp:date,action:'Report submitted',actorName:person(raw.submittedBy || raw.supervisor || raw.submittedByUser),actorRole:raw.submittedBy?.role || 'SUPERVISOR'});
  for(const d of decisions) if(d.timestamp && !timeline.some(t=>t.timestamp===d.timestamp && t.actorRole===d.role)) timeline.push({id:`decision-${d.role}`,timestamp:d.timestamp,action:d.decision || 'Review recorded',actorName:d.name,actorRole:d.role,remarks:d.remarks});
  timeline.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  return {decisions,aiReviews,timeline};
}
