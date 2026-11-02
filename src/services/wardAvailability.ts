/** Attendance reconciliation buckets are not municipal wards. Keep their source data intact. */
export function isAdministrativeWard(row:{name?:string;wardName?:string;backendName?:string}) {
 const label=String(row.wardName||row.backendName||row.name||'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
 return !['not matched employees','unmatched employees','unassigned employees','unmapped employees'].includes(label);
}
export function wardAssessmentReason(row:any):string {
 if(row.rankable!==false)return 'Assessed from qualifying activity in the selected dates.';
 return 'No qualifying activity was counted by ward scoring for the selected dates. This does not prove that no inspection occurred: check Draft, unmapped reports, assignments and attendance.';
}

export function wardRecordReason(records:number|null,completed:number|null,drafts:number|null):string {
 if(records==null||completed==null)return 'Ward inspection totals are unavailable or some reports have missing geography. Do not infer zero inspections.';
 if(records===0)return 'No inspection report matched this ward in the complete selected-date register. This proves no recorded report, not that no field work happened.';
 if(completed===0)return `${records} records exist, including ${drafts??'unavailable'} Draft; no completed field visit is recorded.`;
 return `${completed} completed inspections are recorded. If the ward remains unassessed, check scoring eligibility, assignments and geography; do not describe this as no inspections.`;
}
