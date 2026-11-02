const state=(value:unknown)=>String(value||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
/** Historical flags overlap. Never count an AI recommendation as a recorded officer action. */
export function actionLifecycle(raw:any) {
  const p=raw?.payload||{},source=raw?.raw;
  const nested=source?actionLifecycle(source):{required:false,taken:false};
  const history=[raw?.statusHistory,raw?.timeline,p.statusHistory,raw?.decisions].flatMap(h=>Array.isArray(h)?h:[]);
  const historyHas=(key:string)=>history.some(h=>[h.status,h.statusAfter,h.action,h.event,h.decision].some(v=>[key,`ULB_${key}`,`IEC_${key}`,`AO_${key}`].includes(state(v))));
  const states=[raw?.status,raw?.workspaceStatus,raw?.actionStatus,raw?.ulbStatus,p.ulbStatus].map(state);
  const taken=Boolean(raw?.actionTaken===true||nested.taken||raw?.actionTakenAt||raw?.actionOfficerRespondedAt||p.actionTakenAt||p.actionOfficerRespondedAt||states.includes('ACTION_TAKEN')||historyHas('ACTION_TAKEN'));
  const required=Boolean(taken||nested.required||raw?.actionRequired===true||raw?.actionRequiredAt||p.actionRequiredAt||states.some(s=>['ACTION_REQUIRED','ESCALATED'].includes(s))||historyHas('ACTION_REQUIRED'));
  return {required,taken};
}
export function actionIsPending(raw:any) {
  const flags=actionLifecycle(raw);
  return flags.required&&(['ACTION_REQUIRED','ESCALATED'].includes(state(raw?.status))||!flags.taken);
}
