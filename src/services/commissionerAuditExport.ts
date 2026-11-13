import {reportTargetDelivery} from './targetDelivery';
import {validCoordinates} from './operationsMap';
import {plantQuantity} from './plantAnalytics';
import {summarizeZones,applyPerformanceTargets} from './commissioner';
import {api,getToken} from './api';
import {loadInspectionCoverage} from './inspectionCoverage';
import {commissionerReportData,type ReportDataInput} from './commissionerReportData';
import {mapReport} from './adapters';
import {inspectionMetrics} from './inspectionMetrics';
import {inspectionOutcomes,inspectionActions} from './inspectionCoverage';
import {downloadAuditWorkbook,type ExportSheet} from './spreadsheets';
import {isAdministrativeWard,wardAssessmentReason,wardRecordReason} from './wardAvailability';
import {MODULE_LABELS} from './presentation';

/** Strict pagination: partial records must never be labelled a full export. */
export async function allAuditPages(path:string,key:string,signal:AbortSignal,progress:(text:string)=>void=()=>{}) {
 const records=new Map<string,any>();let expected:number|undefined;
 for(let page=1;page<=10000;page++){
  signal.throwIfAborted();progress(`Reading ${key}: page ${page}`);
  const d=await api(`${path}${path.includes('?')?'&':'?'}page=${page}&pageSize=1000`,{signal,cache:'no-store'}),meta=d.pagination||d.meta;
  if(!Array.isArray(d[key])||!Number.isInteger(meta?.total)||!Number.isInteger(meta?.totalPages)||meta.total<0||meta.totalPages<0||meta.totalPages>10000)throw Error(`Cannot verify complete ${key} pagination.`);
  if(expected!==undefined&&expected!==meta.total)throw Error(`${key} changed during export. Retry for a consistent export.`);
  expected=meta.total;if(expected!>1048575)throw Error('Too many records for Excel. Narrow the date range.');
  const before=records.size;
  for(const row of d[key]){if(!row.id)throw Error(`${key} is missing a record ID.`);records.set(row.id,row);}
  if(page>=meta.totalPages){if(records.size!==expected)throw Error(`${key} pages do not reconcile to the source total.`);return [...records.values()];}
  if(records.size===before)throw Error(`${key} pagination repeated a page.`);
 }
 throw Error('Export page limit reached. Narrow the date range.');
}

export async function exportCommissionerAudit(input:ReportDataInput,signal:AbortSignal,progress:(message:string)=>void) {
 if(!input.personnelComplete)throw Error('Wait for the complete personnel directory before exporting.');
 const token=getToken(),{city,from,to,zone='',ward='',wards,zones}=input;
 const zoneIds=input.selectedZoneIds||[],wardIds=input.selectedWardIds||[];
 const multiScope=zoneIds.length>1||wardIds.length>1;
 const check=()=>{signal.throwIfAborted();if(getToken()!==token)throw Error('Your account changed. Export cancelled.');};
 const query=new URLSearchParams({from,to,...(zone?{zoneId:zone}:{}),...(ward?{wardId:ward}:{})});
 progress('Loading full inspection evidence…');
 const unavailable:{source:string;error:string}[]=[];
 const optional=async(source:string,path:string)=>{try{return await api(path,{signal,cache:'no-store'});}catch(e){if(signal.aborted)throw e;unavailable.push({source,error:e instanceof Error?e.message:'Unavailable'});return null;}};
 const perfRange=new URLSearchParams({startDate:new Date(`${from}T00:00:00+05:30`).toISOString(),endDate:new Date(`${to}T23:59:59.999+05:30`).toISOString(),tzOffset:'-330',view:'score'});
 const freshOthers=Promise.all([
  optional('Attendance summary',`/city/attendance/dashboard?${query}&page=1&pageSize=1`),
  optional('Targets',`/city/dashboard/zone-export?${new URLSearchParams({from,to,zoneIds:(zoneIds.length?zoneIds:zones.filter(z=>!zone||z.id===zone).map(z=>z.id)).join(','),...(wardIds.length?{wardIds:wardIds.join(',')}:ward?{wardIds:ward}:{})})}`),
  ...['daroga','si','iec'].map(key=>optional(`${key} performance`,`/city/users/${key}-performance?${perfRange}`))
 ]);
 const [fullCoverage,ranking,rawAttendance,others]=await Promise.all([
  loadInspectionCoverage(city,from,to,signal,false),api(`/ward-ranking?${new URLSearchParams({from,to})}`,{signal,cache:'no-store'}),
  allAuditPages(`/city/attendance/dashboard?${query}&view=records`,'records',signal,progress),freshOthers
 ]);check();
 const selectedScope=(r:{zoneId?:string;wardId?:string})=>(!zoneIds.length||zoneIds.includes(r.zoneId||''))&&(!wardIds.length||wardIds.includes(r.wardId||''));
 const coverage={...fullCoverage,assets:fullCoverage.assets.filter(selectedScope),visits:fullCoverage.visits.filter(selectedScope)},attendance=rawAttendance.filter(selectedScope);
 if(!coverage.inventoryAvailable||coverage.failedModules.length||coverage.errors.length)throw Error('The complete inspection register or inventory is unavailable. Retry before exporting.');
 if(attendance.some(r=>r.cityId&&r.cityId!==city.id))throw Error('Attendance response contains another city. Export cancelled.');
 if(!Array.isArray(ranking.rankings))throw Error('Ward rankings are unavailable. Export cancelled.');
 const scoped=(r:{zoneId?:string;wardId?:string})=>(!zone||r.zoneId===zone)&&(!ward||r.wardId===ward)&&selectedScope(r);
 const visits=coverage.visits.filter(scoped),assets=coverage.assets.filter(scoped);
 if((zone||ward||zoneIds.length||wardIds.length)&&fullCoverage.visits.some(v=>!v.zoneId||(ward||wardIds.length)&&!v.wardId))throw Error('Some inspections lack geography. The selected-scope export cannot be verified.');
 const performance=Object.fromEntries(['SUPERVISOR','QC','ACTION_OFFICER'].flatMap((role,i)=>others[i+2]?[ [role,others[i+2].users||{}] ]:[]));
 const baseOfficial=others[1]?summarizeZones(others[1]):undefined;
 const official=baseOfficial&&performance.SUPERVISOR?applyPerformanceTargets(baseOfficial,performance.SUPERVISOR,ward):baseOfficial;
 const pulse={...input.pulse,attendance:multiScope?undefined:others[0]?.summary,official,performance,rankings:ranking.rankings};
 const report=commissionerReportData({...input,coverage,pulse}),metrics=inspectionMetrics(coverage,{zone,ward},official?.totals);
 if(pulse.attendance?.totalRecords!=null&&pulse.attendance.totalRecords!==rawAttendance.length)throw Error('Attendance summary and raw export counts differ. Refresh and retry.');
 const names=(id:string,items:{id:string;name:string}[])=>items.find(i=>i.id===id)?.name||'Not mapped';
 const sourceRows=visits.map(v=>{if(!v.raw)throw Error('Full report evidence was not returned.');const r=mapReport(v.raw,v.module,city.id,[]),asset=coverage.assets.find(a=>a.id===v.assetId&&a.module===v.module);return {v,r,asset};});
 const selectedRankings=ranking.rankings.filter(isAdministrativeWard).filter(scoped);
 const sheets:ExportSheet[]=[
  {name:'Source availability',headers:['Source','State','Detail'],rows:[['Inspections and inventory','Complete','All report pages and inventory returned'],['Attendance records','Complete',String(attendance.length)+' source rows'],['Ward rankings','Complete',String(selectedRankings.length)+' municipal wards'],...unavailable.map(s=>[s.source,'Not available',s.error]),['Plant summary',input.pulse.plants?'Dashboard response':'Not available','Loaded city-wide plant summary; raw monthly entries are not included. No plant totals are asserted if unavailable.']]},
  {name:'Read me',headers:['Field','Value'],rows:[['City',city.name],['From (IST)',from],['To (IST)',to],['Scope',report.scope],['Inclusive days',report.days],['Export generated',new Date().toISOString()],['Officer scope','Official officer scores are city-wide for the selected dates; geography selects officers, not a recomputed ward-only score.'],['Plant scope','Plant quantities are city-wide for selected dates.'],['Source timing','Records read during this export; not an immutable historical snapshot. Current statuses may change after export.'],['Completeness','Full inspection records, current inventory and all selected attendance rows fetched and pagination checked.'],['Scoring','Workforce 30; other eligible components share 70. Disabled or zero-inventory asset modules release marks. Missing activity earns zero.'],['Attendance','Raw recorded attendance, not a verified-punch count. Office is supplied; geography selection uses the same server mapping as Attendance.'],['Photos','Photo URLs and metadata are exported; attachments alone do not prove capture authenticity or completeness.'],['Current inventory','Snapshot, independent of selected activity dates.'],['Activity completed',metrics.achieved],['Inspection records',metrics.totalRecords],['Attendance rows',attendance.length],['Unavailable','Missing sources are marked Not available. No values are invented.']]},
  {name:'Report facts',headers:['Section','Metric','Value','Source','Definition'],rows:report.facts.map(f=>[f.section,f.label,f.value,f.source,f.note])},
  {name:'Services',headers:['Service','Current assets','Inspection target','Completed inspections','Unique assets inspected','Coverage %','Target credit','Report target progress %','Total records'],rows:report.modules.map(m=>[m.label,m.totalEntities,m.delivery.target,m.achieved,m.uniqueEntities,m.coveragePercent,m.delivery.completed,reportTargetDelivery(m.delivery,m.achieved).percent,m.totalRecords])},
  {name:'Statuses',headers:['Status','Count'],rows:inspectionOutcomes(coverage,{zone,ward}).rows.map(r=>[r.label,r.value])},
  {name:'Action lifecycle',headers:['Metric','Count'],rows:Object.entries(inspectionActions(coverage,{zone,ward})).map(([key,value])=>[({totalRequired:'Action required',taken:'Action taken',outstanding:'Action required (pending)'} as Record<string,string>)[key]||key,value])},
  {name:'Ward rankings',headers:['Ward ID (join key)','Ward','Zone','Assessed','Score /100','City rank','Available marks','Current assets','Total records','Completed inspections','Recorded evidence','Assessment definition'],rows:selectedRankings.map((r:any)=>{const m=inspectionMetrics(coverage,{ward:r.wardId});return [r.wardId,r.wardName,r.zoneName,r.rankable!==false,r.rankable===false?null:r.finalScore,r.cityRank,r.applicableWeight,m.totalEntities,m.totalRecords,m.achieved,wardRecordReason(m.totalRecords,m.achieved,m.drafts),wardAssessmentReason(r)];})},
  {name:'Ward components',headers:['Ward','Component','Applicable','Earned','Available','Percentage','Exclusion reason'],rows:selectedRankings.flatMap((r:any)=>Object.entries(r.components||{}).map(([key,c]:[string,any])=>[r.wardName,key,c.applicable,c.score,c.maxScore,c.percentage,c.exclusionReason||'']))},
  {name:'Personnel snapshot',headers:['ID (join key)','Name','Role','Status','Zones','Wards','Modules','Created','Updated'],rows:input.users.filter(u=>u.cityId===city.id).map(u=>[u.id,u.name,u.role,u.status,(u.assignedZoneIds||[]).map(id=>names(id,zones)).join('; '),(u.assignedWardIds||[]).map(id=>names(id,wards)).join('; '),(u.moduleAssignments||[]).map(m=>m.key).join('; '),u.createdAt,u.updatedAt])},
  {name:'Asset register',headers:['ID (join key)','Service','Name','Zone','Ward','Current state'],rows:assets.map(a=>[a.id,MODULE_LABELS[a.module],a.name,names(a.zoneId,zones),names(a.wardId,wards),a.state])},
  {name:'Inspections',headers:['Report ID (join key)','Service','Asset ID','Asset name','Zone','Ward','Submitted timestamp','Status','Submitted by','Photo attachments','Report/location latitude (unverified)','Report/location longitude (unverified)','Reviewer','Reviewed at'],rows:sourceRows.map(({v,r,asset})=>[v.id,MODULE_LABELS[v.module],v.assetId,asset?.name||r.assetName,names(v.zoneId,zones),names(v.wardId,wards),v.submittedAt,r.status,r.submittedByName,r.photos.length,validCoordinates(r.coordinates?.[0],r.coordinates?.[1])?.[0],validCoordinates(r.coordinates?.[0],r.coordinates?.[1])?.[1],r.reviewerName,r.reviewedAt])},
  {name:'Decisions',headers:['Report ID','Role','Officer','Decision','Timestamp','Remarks'],rows:sourceRows.flatMap(({v,r})=>(r.decisions||[]).map(d=>[v.id,d.role,d.name,d.decision,d.timestamp,d.remarks]))},
  {name:'AI suggestions',headers:['Report ID','Stage','Advisory decision','Summary','Generated','Model'],rows:sourceRows.flatMap(({v,r})=>(r.aiReviews||[]).map(a=>[v.id,a.stage,a.decision,a.summary,a.generatedAt,a.model]))},
  {name:'Photo evidence',headers:['Report ID (join key)','Service','Asset','URL','Type','Caption','Timestamp (photo capture or report fallback)'],rows:sourceRows.flatMap(({v,r,asset})=>r.photos.map(p=>[v.id,MODULE_LABELS[v.module],asset?.name||r.assetName,p.url,p.type,p.caption,p.timestamp]))},
  {name:'Attendance records',headers:['ID (join key)','Employee ID','Employee','Date','Designation','Office','Division','Status','Check-in','Check-out'],rows:attendance.map(r=>[r.id,r.attendanceId,r.employeeName,String(r.attendanceDate||'').slice(0,10),r.designation,r.officeLocation,r.divisionUnit,r.status,r.inTime,r.outTime])},
  {name:'Attendance summary',headers:['Metric','Value'],rows:Object.entries(pulse.attendance||{}).filter(([,v])=>['number','string'].includes(typeof v)).map(([k,v])=>[k,v as string|number])},
  {name:'Officer measures',headers:['Role','Officer ID (join key)','Name','Official score %','Measure numerator','Measure denominator','Source details'],rows:Object.entries(pulse.performance||{}).flatMap(([role,stats]:[string,any])=>Object.entries(stats).filter(([id])=>input.users.some(u=>u.id===id&&u.role===role&&(!zone||u.assignedZoneIds?.includes(zone)||u.moduleAssignments?.some(m=>m.zoneIds.includes(zone)))&&(!ward||u.assignedWardIds?.includes(ward)||u.moduleAssignments?.some(m=>m.wardIds.includes(ward))))).map(([id,s]:[string,any])=>[role,id,input.users.find(u=>u.id===id)?.name,s.performance,s.scoreNumerator,s.scoreDenominator,JSON.stringify(s)]))},
  {name:'Plant summary',headers:['Plant','Unit','Received','Processed','Recovered','Reject','Process loss','Recovery %','Comparable material','Reporting granularity','Days reported','Source note'],rows:(input.pulse.plants?.plantPerformance||[]).map(p=>[p.plantName,p.unit||'MT',plantQuantity(p,'received'),plantQuantity(p,'processed'),plantQuantity(p,'recovered'),plantQuantity(p,'reject'),plantQuantity(p,'processLoss'),p.efficiencyAvailable===false?null:p.efficiency,p.materialComparable,p.reportingGranularity,p.daysReported,'City-wide, selected dates. Monthly values may be apportioned; raw weighbridge records are not supplied.'])},
 ];
 check();progress('Writing Excel workbook…');await downloadAuditWorkbook(`MatrixTrack-audit-${from}-to-${to}.xlsx`,sheets,check);return sheets.map(s=>({sheet:s.name,rows:s.rows.length}));
}
