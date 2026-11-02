export const INSPECTION_STATUSES = [
  {id:'approved',label:'Cleaned',tone:'green'},
  {id:'pending_review',label:'Pending review',tone:'yellow'},
  {id:'rejected',label:'Not cleaned',tone:'red'},
  {id:'action_required',label:'Action required',tone:'red'},
  {id:'action_taken',label:'Action taken',tone:'yellow'},
  {id:'escalated',label:'Escalated',tone:'red'},
  {id:'unclassified',label:'Draft',tone:'neutral'},
] as const;
export function inspectionStatus(status?:string) {
  const key=String(status||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  if(['submitted','pending','pending_qc','qc_pending','under_review','pending_review','reinspection'].includes(key))return 'pending_review';
  return INSPECTION_STATUSES.some(s=>s.id===key)?key:'unclassified';
}
export function inspectionStatusLabel(status?:string) {
  return INSPECTION_STATUSES.find(s=>s.id===inspectionStatus(status))!.label;
}
