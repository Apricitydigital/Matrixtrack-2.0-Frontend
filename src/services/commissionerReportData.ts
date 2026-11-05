import {isAdministrativeWard} from './wardAvailability';
import type { City, User, Ward, Zone, OperationalModuleId } from '../types';
import type { CityPulse } from './commissioner';
import { inspectionStatus } from './inspectionCoverage';
import type { InspectionCoverage } from './inspectionCoverage';
import { inspectionMetrics } from './inspectionMetrics';
import { computeUnitTotals } from './plantAnalytics';
import { personnelScope } from './personnel';
import { MODULE_LABELS } from './presentation';

export interface ReportFact {id:string;section:string;label:string;value:number|string|null;source:string;note:string;}
export interface ReportDataInput {city:City;from:string;to:string;zone?:string;ward?:string;zones:Zone[];wards:Ward[];users:User[];personnelComplete:boolean;selectedZoneIds?:string[];selectedWardIds?:string[];scopeName?:string;coverage:InspectionCoverage;pulse:CityPulse;}
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
/** Every report value has a source and scope; absent evidence is never substituted with zero. */
export function commissionerReportData(input:ReportDataInput):{facts:ReportFact[];modules:({id:OperationalModuleId;label:string}&ReturnType<typeof inspectionMetrics>)[];days:number;from:string;to:string;scope:string;available:number} {
  if(input.selectedZoneIds?.length||input.selectedWardIds?.length){
    const zoneIds=input.selectedZoneIds||[],wardIds=input.selectedWardIds||[];
    const match=(r:{zoneId?:string;wardId?:string})=>(!zoneIds.length||zoneIds.includes(r.zoneId||''))&&(!wardIds.length||wardIds.includes(r.wardId||''));
    const selectedWards=input.wards.filter(w=>match({zoneId:w.zoneId,wardId:w.id}));
    const selectedZones=input.zones.filter(z=>!zoneIds.length||zoneIds.includes(z.id));
    const users=input.users.filter(u=>{const scope=personnelScope(u,input.wards);return (!zoneIds.length||scope.zoneIds.some(id=>zoneIds.includes(id)))&&(!wardIds.length||scope.wardIds.some(id=>wardIds.includes(id)));});
    const scopeName=wardIds.length?selectedWards.map(w=>w.name).join(', '):selectedZones.map(z=>z.name).join(', ');
    const missingGeography=(r:{zoneId?:string;wardId?:string})=>Boolean(zoneIds.length&&!r.zoneId||wardIds.length&&!r.wardId);
    const failedModules=[...new Set([...input.coverage.failedModules,...input.coverage.visits.filter(missingGeography).map(v=>v.module)])];
    return commissionerReportData({...input,selectedZoneIds:[],selectedWardIds:[],scopeName,users,wards:selectedWards,zones:selectedZones,coverage:{...input.coverage,inventoryAvailable:input.coverage.inventoryAvailable&&!input.coverage.assets.some(missingGeography),failedModules,assets:input.coverage.assets.filter(match),visits:input.coverage.visits.filter(match)},pulse:{...input.pulse,attendance:zoneIds.length>1||wardIds.length>1?undefined:input.pulse.attendance,rankings:input.pulse.rankings?.filter(match)}});
  }

  const {city,from,to,zone='',ward='',zones,wards,users,personnelComplete,coverage,pulse}=input;
  const metrics=inspectionMetrics(coverage,{zone,ward},pulse.official?.totals);
  const days=Math.max(1,Math.round((Date.parse(to)-Date.parse(from))/86400000)+1);
  const facts:ReportFact[]=[];
  const add=(section:string,id:string,label:string,value:ReportFact['value'],source:string,note='')=>facts.push({section,id,label,value,source,note});
  const missing=(section:string,id:string,label:string,note:string)=>add(section,id,label,null,'No authoritative source supplied',note);
  const scopeWards=wards.filter(isAdministrativeWard).filter(w=>w.cityId===city.id&&(!zone||w.zoneId===zone)&&(!ward||w.id===ward));
  const zoneIds=new Set(scopeWards.map(w=>w.zoneId));
  const scopeZones=zones.filter(z=>z.cityId===city.id&&(!zone||z.id===zone)&&(!ward||zoneIds.has(z.id)));
  const active=users.filter(u=>{
    const scope=personnelScope(u,wards);
    return u.cityId===city.id&&u.status==='active'&&!u.isDeleted&&(!zone||scope.zoneIds.includes(zone))&&(!ward||scope.wardIds.includes(ward));
  });
  const people=(role:string)=>personnelComplete?new Set(active.filter(u=>u.role===role).map(u=>u.id)).size:null;
  const scopedVisits=[...new Map(coverage.visits.filter(v=>(!zone||v.zoneId===zone)&&(!ward||v.wardId===ward)).map(v=>[v.id,v])).values()];
  const completedVisits=scopedVisits.filter(v=>inspectionStatus(v.status||'SUBMITTED')!=='unclassified');
  const coveredZones=new Set(completedVisits.filter(v=>v.zoneId).map(v=>v.zoneId));
  const coveredWards=new Set(completedVisits.filter(v=>v.wardId).map(v=>v.wardId));
  const known=metrics.totalRecords!=null;
  const deployment='Deployment & work done';
  add(deployment,'dates','Selected reporting dates',`${from} to ${to} (${days} inclusive days)`,'Global dashboard date filter','All activity totals use these dates in IST. Inventory and accounts are current snapshots.');
  add(deployment,'zones','Configured zones in scope',scopeZones.length,'Current geography directory');
  add(deployment,'wards','Configured wards in scope',scopeWards.length,'Current geography directory');
  add(deployment,'zonesVisited','Zones with completed inspections',known?coveredZones.size:null,'Complete inspection register','Draft excluded. This measures recorded inspection activity, not administrative deployment.');
  add(deployment,'wardsVisited','Wards with completed inspections',known?coveredWards.size:null,'Complete inspection register','Draft excluded.');
  add(deployment,'workforce','Current active workforce accounts',people('EMPLOYEE'),'Complete personnel directory','Current app accounts, not a historical workforce roster or attendance-employee total.');
  add(deployment,'sis','Current active SIs',people('QC'),'Complete personnel directory','Current account snapshot.');
  add(deployment,'darogas','Current active Darogas',people('SUPERVISOR'),'Complete personnel directory','Current account snapshot.');
  add(deployment,'entities','Total mapped assets',metrics.totalEntities,'Current location inventory','Each registered asset counted once; not multiplied by days.');
  add(deployment,'achieved','Achieved: inspections completed',metrics.achieved,'Complete inspection register','All non-Draft field inspections, including Pending review.');
  add(deployment,'target','Inspection target',metrics.delivery.target,'Same target source as dashboard',metrics.delivery.fallback?'No configured target confirmed: assumes one completed visit per registered asset per selected day.':'Configured target returned by the source.');
  add(deployment,'targetCredits','Inspections credited toward target',metrics.delivery.completed,'Same target credit source as dashboard','Distinct registered asset/day visits for the planning assumption; configured targets use backend credit. Can differ from total completed inspections.');
  add(deployment,'targetAchievement','Inspection target achievement %',metrics.delivery.percent,'Target credits / inspection target','Not unique asset coverage.');
  add(deployment,'records','Total inspection records',metrics.totalRecords,'Complete inspection register','All statuses, including Draft; reconciles to status cards.');
  add(deployment,'unique','Unique registered assets inspected',metrics.uniqueEntities,'Complete inspection register + current inventory','Completed visits only; each asset counted once across all selected dates.');
  add(deployment,'coverage','Asset coverage %',metrics.coveragePercent,'Unique assets inspected / total mapped assets','Not the inspection target achievement percentage.');
  const attendance=pulse.attendance;
  add(deployment,'attendanceRecords','Attendance records logged',finite(attendance?.totalRecords)?attendance.totalRecords:null,'Attendance dashboard summary','Imported/recorded attendance; this is not a count of verified punches.');
  missing(deployment,'verifiedPunches','Verified attendance punches','Attendance summaries do not supply a verified-punch count. Checked-out records must not be relabelled as verified punches.');
  missing(deployment,'geotaggedPhotos','Geotagged collection photos','Photo attachments alone do not establish capture coordinates, distinct captures or collection completion. A verified photo aggregate is required.');
  const mass=!zone&&!ward&&pulse.plants?computeUnitTotals(pulse.plants.plantPerformance).find(row=>row.unit==='MT'):null;
  add(deployment,'plantInflow','Waste inflow reported (MT)',mass?.available?.received?mass.received:null,'Plant analytics for selected dates',zone||ward||input.scopeName?'Plant inflow is city-wide and cannot be attributed to this zone/ward.':mass?.partial?.received?'Partial: some plant measurements are missing. Exclude from a complete-total claim.':'Summed only in MT; other units are not mixed. Monthly-source plant figures may be apportioned to selected dates; this is not a verified daily weighbridge total.');
  const health='City health score & parameters';
  for(const [id,label] of [['weights','Approved score formula and parameter weights'],['week1Score','Week 1 baseline city health score'],['month1Score','Month 1 average city health score'],['month2Score','Month 2 average city health score'],['month3Score','Month 3 city health score'],['averageScore','Selected-range average city health score'],['weeklyScores','Weekly city health score trend']])missing(health,id,label,'The current ward/officer scores are separate measures. An approved city-health formula and historical daily scores are required.');
  const peak='Peak performance day';
  for(const [id,label] of [['peakDate','Highest city-health score date'],['peakScore','City health score on peak day'],['peakAttendance','Attendance on peak day'],['onTimeCollection','Collection points cleared on time on peak day'],['peakResolution','Average issue resolution time on peak day']])missing(peak,id,label,'Cannot identify a peak city-health day without a verified daily city-health score series.');
  const att='Attendance analysis';
  add(att,'attendanceRate','Reported attendance %',finite(attendance?.attendanceRate)?attendance.attendanceRate:null,'Attendance dashboard summary','Reported presence percentage, not independently verified attendance.');
  for(const [id,label] of [['verifiedWeek1','First-week verified attendance %'],['verifiedLastWeek','Last-week verified attendance %'],['onTimeWeek1','First-week punch-in before 6:30 AM %'],['onTimeLastWeek','Last-week punch-in before 6:30 AM %']])missing(att,id,label,'Verified-punch history and an approved eligible-worker denominator are not supplied by the current summary.');
  const actions='Action loop (supporting detail)';
  for(const [id,label] of [['alerts','Total system alerts flagged'],['missedAlerts','Missed-point alerts'],['lowAttendanceAlerts','Low-attendance alerts'],['downtimeAlerts','Vehicle/plant downtime alerts'],['dashboardActions','Actions taken via dashboard'],['sameDayResolution','Resolution before the next 8 AM briefing %'],['missedPointResolution','Average missed-point resolution time']])missing(actions,id,label,'Current report statuses and IEC issue totals do not establish historical system alerts, dashboard actions or an 8 AM resolution SLA.');
  const ranked=(pulse.rankings??[]).filter(r=>(!zone||r.zoneId===zone)&&(!ward||r.wardId===ward)&&r.rankable!==false&&finite(r.finalScore)).sort((a,b)=>b.finalScore-a.finalScore||String(a.wardName).localeCompare(String(b.wardName)));
  const zoneScores=scopeZones.map(z=>{const rows=ranked.filter(r=>r.zoneId===z.id);return {name:z.name,score:rows.length?rows.reduce((n,r)=>n+r.finalScore,0)/rows.length:null,assessed:rows.length};}).sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||a.name.localeCompare(b.name));
  const leaders='Leaderboards';
  add(leaders,'zoneWardAverage','Highest average ward-score zone',zoneScores[0]?.score!=null?`${zoneScores[0].name}: ${zoneScores[0].score.toFixed(1)} / 100`:null,'Ward ranking response','Average of assessed wards only; not a city health score or an attendance ranking.');
  add(leaders,'zoneRankings','All zones: assessed ward-score averages',zoneScores.some(z=>z.score!=null)?zoneScores.map(z=>`${z.name}: ${z.score==null?'Not assessed':z.score.toFixed(1)} (${z.assessed} assessed wards)`).join('; '):null,'Ward ranking response','Unassessed zones remain unassessed; no zero substitution.');
  add(leaders,'topWards','Top three assessed wards',ranked.length?ranked.slice(0,3).map(r=>`${r.wardName}: ${r.finalScore} / 100`).join('; '):null,'Ward ranking response','Tied scores remain tied. Ranking is by supplied finalScore, not inferred point-clearance percentage.');
  add(leaders,'focusWards','Lowest assessed wards',ranked.length?ranked.slice(-3).reverse().map(r=>`${r.wardName}: ${r.finalScore} / 100`).join('; '):null,'Ward ranking response','Lowest among assessed wards in this scope; includes no unassessed wards.');
  missing(leaders,'improvedWard','Most improved ward','Requires comparable Month 1 and Month 3 ward score snapshots; the current ranking alone cannot establish improvement.');
  for(const [role,label] of [['QC','SIs'],['SUPERVISOR','Darogas']]) {
    const stats=pulse.performance?.[role];
    const scores=Object.entries(stats??{}).flatMap(([id,value]:[string,any])=>{const person=active.find(u=>u.id===id&&u.role===role);return person&&finite(value.performance)?[{name:person.name,score:value.performance,scope:personnelScope(person,wards)}]:[];}).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
    add(leaders,`${role}Leaders`,`Top two ${label}: official officer score`,personnelComplete&&scores.length?scores.slice(0,2).map(r=>`${r.name}: ${r.score}%; ${wards.filter(w=>r.scope.wardIds.includes(w.id)).map(w=>w.name).join(', ')||'Ward assignment not supplied'}`).join('; '):null,'Officer performance response + complete personnel directory','Official timing/target score; does not establish attendance %, zero-miss days or a combined award score.');
    missing(leaders,`${role}AwardMetrics`,`${label}: attendance, resolution / on-time crew and zero-miss metrics`,'Per-officer matched attendance, collection deadlines and historical resolution records are required for these award criteria.');
  }
  const modules=city.enabledModules.map(module=>({id:module,label:MODULE_LABELS[module],...inspectionMetrics(coverage,{module,zone,ward},pulse.official?.modules[module])}));
  return {facts,modules,days,from,to,scope:input.scopeName|| (ward?scopeWards[0]?.name||'Selected ward':zone?scopeZones[0]?.name||'Selected zone':'All zones and wards'),available:facts.filter(f=>f.value!=null).length};
}
