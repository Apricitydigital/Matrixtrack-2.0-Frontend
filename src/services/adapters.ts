import type { City, User, OperationalModuleId, OperationalReport, IecCleanlinessIssue, AttendanceRecord, Beat, Zone, Ward } from '../types';
import { mediaUrl, reportAudit } from './reportAudit';
import { reportCoordinates } from './operationsMap';
import { rawReportContacts } from './reportContacts';

export const MODULE_KEYS: Record<OperationalModuleId, string> = { sweeping: 'SWEEPING', toilets: 'TOILET', litter_bins: 'LITTERBINS', nala: 'NALA', ctu_gvp: 'TASKFORCE' };
export const moduleId = (key: string): OperationalModuleId | undefined => ({BEAT:'sweeping',LITTERBIN:'litter_bins',GVP:'ctu_gvp'} as const)[key] || (Object.keys(MODULE_KEYS) as OperationalModuleId[]).find(id => MODULE_KEYS[id] === key);
const text = (value: any): string => typeof value === 'string' ? value : value?.name || '';
const num = (value: any, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const rolesOf = (raw: any): string[] => Array.from(new Set([...(raw.roles || []), raw.role].filter(Boolean)));

export function mapUser(raw: any, cityId?: string): User {
  return { id: raw.id, name: raw.name || raw.email || 'Unnamed user', email: raw.email || '', phone: raw.phone || '', role: raw.role || raw.roles?.[0] || raw.requestedRole || 'EMPLOYEE', cityId: raw.cityId || cityId || undefined, employeeId:raw.employeeId,employmentType:raw.employmentType,moduleAssignments:(raw.modules || []).map((m:any)=>({id:m.id||m.moduleId,canWrite:m.canWrite,key:m.key || m.module?.name || m.name,zoneIds:m.zoneIds || [],wardIds:m.wardIds || []})), assignedZoneIds: raw.zoneIds || (raw.zoneId?[raw.zoneId]:[]), assignedWardIds: raw.wardIds || (raw.wardId?[raw.wardId]:[]), assignedBeatIds: raw.assignedBeatIds || [], status: raw.status === 'PENDING' ? 'pending_approval' : raw.status === 'REJECTED' ? 'rejected' : raw.enabled === false ? 'inactive' : 'active', createdAt: raw.createdAt || '', isDeleted: raw.isDeleted, deletedAt: raw.deletedAt, requestedModules:raw.requestedModules, rejectionRemarks: raw.rejectReason || raw.rejectionReason || raw.reason };
}

export function mapCity(raw: any): City {
  const modules = (raw.modules || []).filter((m: any) => m.enabled !== false).map((m: any) => m.key || m.name);
  return { geographyCountsAvailable:raw.totalZones!=null&&raw.totalWards!=null,populationAvailable:raw.population!=null,id: raw.id, name: raw.name, state: text(raw.state) || raw.stateName || '', division: text(raw.division) || raw.divisionName, district: text(raw.district) || raw.districtName || '', cityCode: raw.code || raw.cityCode || '', ulbCode: raw.ulbCode || '', status: raw.enabled === false ? 'inactive' : 'active', adminIds: (raw.cityAdmins || []).map((a: any) => a.id), enabledModules: modules.map(moduleId).filter(Boolean), enabledProducts: ['municipal_operations', ...(modules.some((m: string) => /WORKFORCE|ATTEND/.test(m)) ? ['workforce_monitoring' as const] : []), ...(modules.some((m: string) => /SWACHH/.test(m)) ? ['swachh_assessment' as const] : []), ...(modules.some((m: string) => /PROCESSING|MRF/.test(m)) ? ['plant_processing' as const] : [])], population: num(raw.population), areaSqKm: num(raw.areaSqKm), totalWards: num(raw.totalWards), totalZones: num(raw.totalZones), centerCoordinates: [num(raw.latitude), num(raw.longitude)], createdAt: raw.createdAt || '', updatedAt: raw.updatedAt || '', isDeleted: raw.isDeleted, deletedAt: raw.deletedAt };
}

export function mapGeography(nodes: any[], cityId: string): { zones: Zone[]; wards: Ward[] } {
  const name = (n: any) => n.displayName && n.displayName !== n.name ? `${n.name} - ${n.displayName}` : n.name;
  const number = (n: any) => num(n.name?.match(/\d+/)?.[0]);
  return {
    zones: nodes.filter(n => n.level === 'ZONE').map(n => ({ id: n.id, cityId: n.cityId || cityId, backendName:n.name, name: name(n), zoneNumber: number(n), totalWards: nodes.filter(w => w.level === 'WARD' && w.parentId === n.id).length, status: 'active' })),
    wards: nodes.filter(n => n.level === 'WARD').map(n => ({ id: n.id, cityId: n.cityId || cityId, backendName:n.name, zoneId: n.parentId || '', name: name(n), wardNumber: number(n), population: num(n.population), areaSqKm: num(n.areaSqKm), status: 'active' }))
  };
}

export function mapBeat(raw: any, cityId: string): Beat {
  const points = raw.points || raw.beatPoints || [];
  return { geometry:raw.geometry,rawKml:raw.rawKml,segments:raw.segments||[],points:points.map((p:any,i:number)=>({lat:Number(p.lat??p.latitude),lng:Number(p.lng??p.longitude??p.lon),label:p.label||p.code||`P${i+1}`})), id: raw.id, cityId, zoneId: raw.zoneId || '', wardId: raw.wardId || '', areaId: raw.areaId || '', name: raw.beatName || raw.name || '', beatNumber: raw.beatCode || raw.code || raw.id, lengthKm: num(raw.lengthKm || raw.totalLengthKm), startPoint: raw.startPoint || '', endPoint: raw.endPoint || '', startCoords: [num(points[0]?.lat??points[0]?.latitude), num(points[0]?.lng??points[0]?.longitude)], endCoords: [num(points.at(-1)?.lat??points.at(-1)?.latitude), num(points.at(-1)?.lng??points.at(-1)?.longitude)], assignedDarogaId: raw.assignedToId || raw.supervisorAssignedToId, assignedDarogaIds: [...new Set([raw.assignedToId,...(raw.segments || []).map((s:any)=>s.supervisorAssignedToId)].filter(Boolean))] as string[], assignedDarogaNames: [...new Set([raw.assignedToName,...(raw.segments || []).map((s:any)=>s.supervisorAssignedToName || s.supervisorAssignedTo?.name)].filter(Boolean))] as string[], assignedEmployeeIds: (raw.segments || []).map((s: any) => s.employeeAssignedToId).filter(Boolean), status: raw.status === 'PENDING_QC' ? 'under_review' : 'active', priority: raw.priority || 'medium', shift: raw.shift || 'morning' };
}

export function mapReport(raw: any, module: OperationalModuleId, cityId: string, nodes: any[]): OperationalReport {
  const payload = raw.payload || {};
  const asset = raw.toilet || raw.bin || raw.beat || raw.nala || raw.feederPoint || {};
  const submitter = raw.submittedBy || raw.submittedByUser || (raw.createdById?{id:raw.createdById,name:typeof raw.createdBy==='string'?raw.createdBy:raw.createdBy?.name,phone:raw.phone}:null) || raw.supervisor || {};
  const reviewer = raw.reviewedBy || raw.qcReviewer || raw.reviewedByQc || payload.reviewedByQc || {};
  const date = raw.createdAt || raw.submittedAt || '';
  const state = String(raw.workspaceStatus || raw.status || '').toUpperCase();
  const status: OperationalReport['status'] = ({ APPROVED: 'approved', REJECTED: 'rejected', ACTION_REQUIRED: 'action_required', ACTION_TAKEN: 'action_taken', ESCALATED: 'escalated' } as const)[state] || 'pending_review';
  const answers = raw.inspectionAnswers || raw.answers || payload.answers || [];
  const questions = (Array.isArray(answers) ? answers : []).map((a: any, index: number) => ({ questionId: a.code || a.questionId || String(index), question: typeof a.question === 'string' ? a.question : a.question?.text || a.question?.label || a.label || a.code || `Question ${index+1}`, category: a.section || '', answerType: 'text' as const, answerValue: typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer ?? a.answerValue ?? '', score: a.score, maxScore: a.maxScore, remarks: a.remarks || a.comment }));
  const photos: OperationalReport['photos'] = [];
  const addPhotos = (items: any, type: 'before' | 'after' | 'during' | 'corrective', caption = '') => {
    for (const photo of Array.isArray(items) ? items : items ? [items] : []) {
      const url = mediaUrl(typeof photo === 'string' ? photo : photo?.url || photo?.photoUrl || photo?.imageUrl);
      if (url && !photos.some(p => p.url === url)) photos.push({ url, caption: photo.caption || photo.label || caption, timestamp: photo.capturedAt || date, type });
    }
  };
  addPhotos(raw.photos || payload.photos, 'during');
  addPhotos(raw.beforePhotos, 'before'); addPhotos(raw.afterPhotos, 'after');
  addPhotos(raw.actionPhotos || raw.actionPhoto, 'corrective');
  for (const a of Array.isArray(answers) ? answers : []) addPhotos(a.photos, 'during');
  for (const point of payload.points || []) addPhotos(point.photos || point.photoUrl || point.photo, 'during', point.label || point.pointCode || point.code || '');
  for (const key of ['actionPhotoUrl','aoPhoto','actionPhotos','aoPhotos','actionPhoto']) { addPhotos(raw[key], 'corrective'); addPhotos(payload[key], 'corrective'); }
  addPhotos(raw.beforePhoto || payload.beforePhotos || payload.beforePhoto, 'before');addPhotos(raw.afterPhoto || payload.afterPhotos || payload.afterPhoto, 'after');
  addPhotos(raw.photoUrl || payload.photoUrl, 'during');
  const zoneId = raw.zoneId || raw.zone?.id || asset.zoneId || asset.zone?.id || nodes.find(n => n.level === 'ZONE' && n.name === raw.zoneName)?.id || '';
  const wardId = raw.wardId || raw.ward?.id || asset.wardId || asset.ward?.id || nodes.find(n => n.level === 'WARD' && n.name === raw.wardName)?.id || '';
  return { contacts:rawReportContacts(raw),currentOwnerRole:raw.currentOwnerRole || payload.currentOwnerRole,qcDecision:raw.qcDecision || raw.qcStatus || payload.qcDecision || payload.qcStatus,stageSince:raw.actionTakenAt || raw.actionOfficerRespondedAt || raw.actionRequiredAt || raw.qcReviewedAt || raw.reviewedAt || date, id: `${module}:${raw.id}`, backendId: raw.id, backendType: raw.type, reportNumber: raw.reportNumber || raw.id, cityId: raw.cityId || cityId, zoneId, wardId, moduleId: module, beatId: raw.beatId || (module === 'sweeping' ? asset.id : undefined), assetId: asset.id || raw.toiletId || raw.nalaId || raw.binId, assetName: raw.toiletLabel || raw.toiletName || raw.nalaName || raw.beatName || raw.locationName || asset.name || asset.beatName || asset.feederPointName || raw.areaName || raw.id, coordinates: reportCoordinates(raw), inspectionDate: date.slice(0, 10), submittedAt: date, submittedByUserId: submitter.id || raw.submittedById || '', submittedByName: submitter.name || raw.supervisorName || raw.submittedByName || raw.employee?.name || raw.createdBy?.name || '', submittedByRole: submitter.role || raw.submittedByRole || 'SUPERVISOR', assignedDarogaId: raw.supervisor?.id || submitter.id, assignedDarogaName: raw.supervisor?.name || submitter.name, reviewerId: reviewer.id, reviewerName: reviewer.name, reviewerRole: reviewer.id ? 'QC' : undefined, reviewedAt: raw.qcReviewedAt || raw.reviewedAt, status, overallScore: raw.overallScore == null && payload.overallScore == null ? null : num(raw.overallScore ?? payload.overallScore), questions, photos, ...reportAudit(raw), escalationReason: raw.ulbRemark || payload.ulbRemark, actionTakenRemarks: raw.actionNote || payload.actionRemarks, cycleNumber: raw.cycleNumber || 1 };
}
export function mapIssue(raw: any, cityId: string): IecCleanlinessIssue {
  const attempts = raw.inspections || raw.attempts || (raw.inspection ? [raw.inspection] : []);
  const latest = attempts.at(-1) || {};
  const status: IecCleanlinessIssue['status'] = ({ CLOSED: 'approved_closed', APPROVED_CLOSED: 'approved_closed', REOPENED: 'reopened', ACTION_REQUIRED: 'action_required', REJECTED: 'rejected', ULB_REJECTED: 'rejected' } as const)[raw.status] || 'pending_review';
  const photo = (p: any) => ({ url: p.url, caption: p.caption || '', timestamp: p.capturedAt || raw.reportedAt || '' });
  return { id: raw.id, moduleId: moduleId(raw.module), canReview: Boolean(raw.review), inspectionId: raw.review?.inspectionId || raw.inspection?.id || latest.id, ticketNumber: raw.issueNumber || raw.id, cityId, zoneId: raw.zone?.id || '', wardId: raw.ward?.id || '', locationAddress: raw.asset?.label || raw.asset?.name || raw.ward?.name || '', coordinates: [num(raw.location?.latitude), num(raw.location?.longitude)], reportedDate: raw.reportedAt || '', reportedBy: raw.iecMember?.name || '', complaintDescription: raw.remarks || raw.otherIssueType || raw.moduleLabel || '', category: 'not_specified', priority: 'not_specified', assignedDarogaId: raw.assignedDaroga?.id || '', assignedDarogaName: raw.assignedDaroga?.name || '', status, currentCycle: raw.currentCycleNumber || 1, deadlineTimestamp: raw.inspectionDueAt || '', attemptsCount: attempts.length || raw.attemptsInCycle || 0, beforePhotos: (raw.beforePhotos || (raw.beforePhoto ? [raw.beforePhoto] : [])).map(photo), afterPhotos: (latest.afterPhotos || (raw.afterPhoto ? [raw.afterPhoto] : [])).map(photo), gpsDistanceMeters: num(latest.distanceFromReportedMeters), reopeningRequests: (raw.reopenRequests || []).map((r: any) => ({ id: r.id, requestedAt: r.requestedAt, requestedBy: r.requestedBy?.name || '', reason: r.reason || '', status: r.status.toLowerCase(), decidedAt: r.decidedAt, decidedBy: r.reviewer?.name, remarks: r.decisionRemarks })), timeline: (raw.statusHistory || []).map((h: any, i: number) => ({ id: String(i), timestamp: h.at, action: h.event, actorName: h.actor?.name || h.actorName || '', actorRole: h.actor?.role || h.actorRole || '', remarks: h.reason })) };
}

export function mapAttendance(raw: any, cityId: string, nodes: any[] = []): AttendanceRecord {
  const geoId = (value: string) => nodes.find(n => n.id === value || n.name === value || n.displayName === value)?.id || value || '';
  const shift = String(raw.shift || '').toLowerCase();
  return { id: raw.id, cityId, date: raw.attendanceDate?.slice(0, 10) || '', userId: raw.matrixTrackUserId || raw.attendanceId || '', userName: raw.employeeName || '', role: 'EMPLOYEE', zoneId: geoId(raw.zones?.[0]), wardId: geoId(raw.wards?.[0]), shift: (['morning','afternoon','night'].includes(shift) ? shift : 'not_recorded') as AttendanceRecord['shift'], status: ({ PRESENT: 'present', ABSENT: 'absent', LATE: 'late', LEAVE: 'leave' } as const)[String(raw.status).toUpperCase()] || 'unmarked', checkInTime: raw.inTime, checkOutTime: raw.outTime, source: 'manual_upload' };
}
