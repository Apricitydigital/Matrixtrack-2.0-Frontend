import type { ExportSheet } from './spreadsheets';
export type MatchState = 'matched' | 'not_found' | 'review' | 'no_data';
export interface ReconciledEmployee {
  userId:string; name:string; employeeId:string; zoneIds:string[]; wardIds:string[]; zones:string[]; wards:string[];
  state:MatchState; reason:string; matchMethod:string|null; attendanceId:string|null; attendanceName:string|null;
  status:string|null; inTime:string|null; outTime:string|null; sheetLocation:string;
  locationStatus:string; locationWarnings:string[];
}
export interface ReconciliationData {
  cityId:string; date:string|null; hasAttendanceData:boolean; registrationBasis:string;
  unmatchedSheetRecords:number; ambiguousSheetRecords:number; employees:ReconciledEmployee[];
}
export const matchLabels:Record<MatchState,string>={matched:'Attendance matched',not_found:'Attendance not found',review:'Needs review',no_data:'No sheet received'};
export function reconciliationCounts(rows:ReconciledEmployee[]) {
  return {registered:rows.length,matched:rows.filter(r=>r.state==='matched').length,missing:rows.filter(r=>r.state==='not_found').length,
    review:rows.filter(r=>r.state==='review').length,noData:rows.filter(r=>r.state==='no_data').length,
    locationMismatch:rows.filter(r=>r.locationStatus==='mismatch').length,
    present:rows.filter(r=>r.state==='matched'&&['P','PRESENT'].includes((r.status||'').toUpperCase())).length};
}
export function reconciliationSheets(city:string,date:string,rows:ReconciledEmployee[],scope:string):ExportSheet[] {
  const headers=['Date','Registered employee','Employee ID','Registered zones','Registered wards','Match result','Reason','Attendance ID','Sheet name','Attendance status','Check-in','Check-out','Matched by','Sheet location','Location check'];
  const values=(r:ReconciledEmployee)=>([date,r.name,r.employeeId,r.zones.join(', '),r.wards.join(', '),matchLabels[r.state],r.reason,r.attendanceId,r.attendanceName,r.status,r.inTime,r.outTime,r.matchMethod,r.sheetLocation,r.locationWarnings.join('; ')|| (r.locationStatus==='consistent'?'Consistent':'Not comparable')]);
  const counts=reconciliationCounts(rows);
  return [
    {name:'Scope and totals',headers:['Measure','Value'],rows:[['City',city],['Attendance date',date],['Filters',scope],['Registration basis','Current registered employee accounts; not a historical roster'],['Registered',counts.registered],['Matched',counts.matched],['Attendance not found',counts.missing],['Needs review',counts.review],['No sheet received',counts.noData],['Note','Attendance not found does not establish absence. Ward totals can overlap for employees registered in multiple wards.']]},
    {name:'Matched attendance',headers,rows:rows.filter(r=>r.state==='matched').map(values)},
    {name:'Attendance not found',headers,rows:rows.filter(r=>r.state==='not_found').map(values)},
    {name:'Needs review',headers,rows:rows.filter(r=>r.state==='review').map(values)},
  ];
}
