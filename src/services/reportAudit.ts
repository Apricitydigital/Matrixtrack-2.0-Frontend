import {actionLifecycle} from './actionLifecycle';
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
    {role:'QC',actor:raw.reviewedByQc || raw.qcReviewer || raw.reviewedBy || p.reviewedByQc || p.qcReviewedBy, decision:text(raw.qcDecision,p.qcDecision,raw.qcStatus,p.qcStatus,['APPROVED','REJECTED'].includes(raw.status) ? raw.status : ''), remarks:text(raw.qcComment,raw.qcRemark,raw.qcRemarks,raw.reviewerNote,raw.reviewRemarks,p.qcComment,p.qcRemark,p.qcRemarks,p.reviewRemarks), timestamp:text(raw.qcReviewedAt,raw.reviewedAt,p.qcReviewedAt,p.reviewedAt,p.qcReviewAt)},
    {role:'ULB_OFFICER',actor:raw.ulbReviewedBy || raw.ulbReviewer || p.ulbReviewedBy || p.ulbReviewer,decision:text(raw.ulbStatus,p.ulbStatus,actionLifecycle(raw).required?'ACTION_REQUIRED':''),remarks:text(raw.ulbRemark,raw.ulbRemarks,p.ulbRemark,p.ulbRemarks),timestamp:text(raw.ulbReviewedAt,p.ulbReviewedAt,raw.actionRequiredAt,p.actionRequiredAt)},
    {role:'ACTION_OFFICER',actor:raw.actionTakenBy || raw.actionOfficer || p.actionTakenBy,decision:raw.actionTakenAt || raw.actionOfficerRespondedAt || p.actionTakenAt ? 'ACTION_TAKEN' : '',remarks:text(raw.actionOfficerRemark,raw.actionTakenRemarks,raw.actionNote,raw.aoNote,raw.aoRemark,raw.actionDescription,raw.actionTakenDescription,p.aoRemark,p.actionDescription,p.actionRemarks),timestamp:text(raw.actionTakenAt,raw.actionOfficerRespondedAt,p.actionTakenAt)}
  ];
  const decisions=definitions.filter(d=>d.timestamp || d.remarks || d.decision).map(d=>({role:d.role,name:person(d.actor),decision:d.decision,remarks:d.remarks,timestamp:d.timestamp}));
  const aiReviews: NonNullable<OperationalReport['aiReviews']>=[];
  for(const [stage,result] of [['SI',raw.autoQcResult || p.autoQcResult || raw.qcAiResult || p.qcAiResult],['ULB Officer',raw.actionAiResult || raw.ulbAiResult || p.actionAiResult || p.ulbAiResult]] as const) {
    if(!result) continue;
    let r=result;
    if(typeof result==='string'){try{const parsed=JSON.parse(result);r=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{summary:result};}catch{r={summary:result};}}
    const confidence=r.confidence == null ? undefined : Number(r.confidence);
    aiReviews.push({stage,decision:text(r.decision,r.result,['ACTION_REQUIRED','NO_ACTION_REQUIRED'].includes(r.recommendation)?r.recommendation:''),summary:text(r.summary,r.reason,r.suggestion,!['ACTION_REQUIRED','NO_ACTION_REQUIRED'].includes(r.recommendation)?r.recommendation:''),recommendedAction:text(r.recommendedAction,r.actionSuggestion),reasons:(Array.isArray(r.reasons)?r.reasons:[]).map((v:any)=>typeof v==='string'?v:text(v.reason,v.summary)).filter(Boolean),summaryHi:text(r.summaryHi),recommendedActionHi:text(r.recommendedActionHi),reasonsHi:(Array.isArray(r.reasonsHi)?r.reasonsHi:[]).filter((v:any)=>typeof v==='string'),generatedAt:stage==='ULB Officer'?text(raw.actionAiAt,raw.ulbAiAt,p.actionAiAt,p.ulbAiAt):text(raw.autoQcAt,p.autoQcAt),model:text(r.model,stage==='ULB Officer'?raw.actionAiModel:raw.autoQcModel),sourceQcDecision:text(r.sourceQcDecision),confidence:confidence !== undefined && Number.isFinite(confidence) ? Math.max(0,Math.min(100,confidence <= 1 ? confidence*100 : confidence)) : undefined, checks:(Array.isArray(r.checks) ? r.checks : Array.isArray(r.pointFindings) ? r.pointFindings : []).map((c:any,i:number)=>({label:text(c.question,c.questionCode,c.pointCode,c.code) || `Q${i+1}`,result:text(c.result,c.status,c.decision),reason:text(c.reason,c.visualFinding,c.finding,c.summary)})),insights:(Array.isArray(r.additionalInsights) ? r.additionalInsights : []).map((v:any)=>typeof v==='string'?v:text(v.summary,v.finding,v.reason)).filter(Boolean)});
  }
  // Empty top-level history must not hide recorded events in the payload.
  const source=[raw.statusHistory,raw.timeline,p.statusHistory,p.timeline].flatMap(h=>Array.isArray(h)?h:[]);
  const actionKey=(action:string)=>action.trim().toUpperCase().replace(/[\s-]+/g,'_');
  const timeline: TimelineEvent[]=[];
  for(const [i,h] of source.entries()){
    const event={id:h.id || `history-${i}`,timestamp:text(h.at,h.timestamp,h.createdAt),action:text(h.event,h.action,h.statusAfter,h.status),actorName:person(h.actor) || text(h.actorName),actorRole:text(h.actor?.role,h.actorRole),remarks:text(h.reason,h.remarks,h.comment)};
    const duplicate=timeline.find(t=>t.timestamp===event.timestamp&&t.actorRole===event.actorRole&&actionKey(t.action)===actionKey(event.action));
    if(duplicate){duplicate.actorName ||= event.actorName;duplicate.remarks ||= event.remarks;}else timeline.push(event);
  }
  const date=text(raw.submittedAt,raw.createdAt);
  if(date && !timeline.some(t=>t.timestamp===date&&['REPORT_SUBMITTED','SUBMITTED'].includes(actionKey(t.action)))) timeline.push({id:'submission',timestamp:date,action:'Report submitted',actorName:person(raw.submittedBy || raw.supervisor || raw.submittedByUser),actorRole:raw.submittedBy?.role || 'SUPERVISOR'});
  for(const d of decisions){
    const existing=timeline.find(t=>t.timestamp===d.timestamp&&(t.actorRole===d.role||actionKey(t.action)===actionKey(d.decision)));
    if(existing){existing.actorName ||= d.name;existing.actorRole ||= d.role;existing.remarks ||= d.remarks;}
    else timeline.push({id:`decision-${d.role}`,timestamp:d.timestamp,action:d.decision || 'Review recorded',actorName:d.name,actorRole:d.role,remarks:d.remarks});
  }
  // Known decisions remain visible even when an older record lacks an event date.
  // Never substitute updatedAt or the submission date for an absent review date.
  timeline.sort((a,b)=>(Number.isFinite(Date.parse(a.timestamp))?Date.parse(a.timestamp):Infinity)-(Number.isFinite(Date.parse(b.timestamp))?Date.parse(b.timestamp):Infinity));
  return {decisions,aiReviews,timeline};
}
