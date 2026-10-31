import type { OperationalReport, User } from '../types';
import { MODULE_KEYS } from './adapters';
type Contact=NonNullable<OperationalReport['contacts']>[number];
export function rawReportContacts(raw:any):Contact[] {
  const p=raw.payload || {},contacts:Contact[]=[];
  const add=(role:string,value:any,source:string,fallbackId?:string)=>{if(!value&&!fallbackId)return;const name=typeof value==='string'?value:value?.name;const id=value?.id || fallbackId;if(!name&&!id)return;contacts.push({role,id,name:name || '',phone:value?.phone || value?.mobile || '',email:value?.email || '',source});};
  add('SUPERVISOR',raw.supervisor || raw.assignedDaroga || raw.daroga,'Assigned Daroga',raw.supervisorAssignedToId || raw.assignedDarogaId);
  add(raw.submittedBy?.role || raw.submittedByUser?.role || 'SUPERVISOR',raw.submittedBy || raw.submittedByUser || (raw.createdById?{id:raw.createdById,name:typeof raw.createdBy==='string'?raw.createdBy:raw.createdBy?.name,phone:raw.phone}:null),'Submitted report',raw.submittedById);
  add('QC',raw.reviewedByQc || raw.qcReviewer || raw.reviewedBy || p.reviewedByQc,'Recorded SI reviewer',raw.reviewedByQcId || raw.qcReviewerId);
  add('QC',raw.assignedQc || raw.assignedSanitaryInspector || raw.sanitaryInspector,'Assigned Sanitary Inspector',raw.assignedQcId || raw.sanitaryInspectorId);
  add('ULB_OFFICER',raw.ulbReviewer || raw.ulbReviewedBy || p.ulbReviewedBy,'Recorded ULB reviewer',raw.ulbReviewedById);
  add('ACTION_OFFICER',raw.actionOfficer || raw.actionTakenBy || p.actionTakenBy,'Assigned / recorded IEC Member',raw.actionOfficerId || raw.actionTakenById);
  return contacts;
}
export function reportContacts(report:OperationalReport,users:User[]):Contact[] {
  const directory=users.filter(u=>u.cityId===report.cityId&&!u.isDeleted&&u.status==='active');
  const contacts=(report.contacts || []).map(c=>{const matches=directory.filter(u=>c.id?u.id===c.id:u.role===c.role&&u.name===c.name);const u=matches.length===1?matches[0]:undefined;return {...c,name:c.name || u?.name || 'Name not supplied',phone:c.phone || u?.phone || '',email:c.email || u?.email || ''};});
  if(report.submittedByName&&!contacts.some(c=>c.id===report.submittedByUserId||c.name===report.submittedByName&&c.role===report.submittedByRole)){
    const u=directory.find(u=>u.id===report.submittedByUserId);contacts.push({id:report.submittedByUserId,name:report.submittedByName,role:report.submittedByRole,phone:u?.phone || '',email:u?.email || '',source:'Submitted report'});
  }
  for(const role of ['SUPERVISOR','QC','ACTION_OFFICER','ULB_OFFICER']){
    if(contacts.some(c=>c.role===role))continue;
    for(const u of directory.filter(u=>u.role===role)){
      const assignments=u.moduleAssignments || [],m=assignments.find(m=>m.key===MODULE_KEYS[report.moduleId]);if(assignments.length&&!m)continue;
      const effective=(global:string[]|undefined,local:string[]|undefined)=>global?.length&&local?.length?global.filter(id=>local.includes(id)):local?.length?local:global || [];
      const wards=effective(u.assignedWardIds,m?.wardIds),zones=effective(u.assignedZoneIds,m?.zoneIds);
      if(u.assignedZoneIds?.length&&m?.zoneIds?.length&&!zones.length)continue;
      if(!report.wardId||!wards.includes(report.wardId)||(zones.length>0&&!zones.includes(report.zoneId)))continue;
      contacts.push({id:u.id,name:u.name,role,phone:u.phone,email:u.email,source:'Ward / module assignment'});
    }
  }
  return [...new Map(contacts.map(c=>[`${c.role}:${c.id || c.name}`,c])).values()];
}
export function reportStage(report:OperationalReport){
  const role=report.currentOwnerRole || ({pending_review:'QC',approved:'ULB_OFFICER',rejected:'ULB_OFFICER',action_required:'ACTION_OFFICER',action_taken:'ULB_OFFICER',escalated:'ULB_OFFICER'}[report.status]);
  return {role,since:report.stageSince || report.reviewedAt || report.submittedAt,label:({pending_review:'Pending Sanitary Inspector review',approved:'Sanitary Inspector approved · ULB oversight',rejected:'Sanitary Inspector rejected · ULB oversight',action_required:'Corrective action pending',action_taken:'Action submitted · verification pending',escalated:'Escalated for review'}[report.status])};
}
export const telephone=(phone:string)=>/^\+?[\d\s()-]{6,25}$/.test(phone)?`tel:${phone.replace(/[^\d+]/g,'')}`:undefined;
