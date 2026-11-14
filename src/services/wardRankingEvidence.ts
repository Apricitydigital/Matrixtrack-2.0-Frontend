export const naturalCompare=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});

const beatFields:Record<string,[string,string]>={
 totalBeats:['Registered beats','Current beat inventory; independent of the selected number of days.'],
 beatsDue:['Planned beat visits','Registered beats × inclusive selected days. This is the total requirement, not the remaining work.'],
 beatsChecked:['Submitted beat visits','One submitted report per beat per operational day.'],
 beatsNotChecked:['Visits awaiting submission','Planned visits minus submitted visits. Includes reports still pending at Daroga.'],
 totalPointsExpected:['Planned point captures','Configured points across registered beats × selected days.'],
 pointsCaptured:['Point captures saved','Captured beat points, including unfinished reports not yet submitted. Different days count separately.'],
 beatsInProgress:['Visits started','Beat reports with at least one point captured but not submitted. These are already included in visits awaiting submission.'],
 completeBeatCoverage:['Visits with all points','Submitted beat visits capturing every configured point. Three points may permit submission without completing all five.'],
};

export function rankingEvidence(key:string,metrics:Record<string,unknown>) {
 const entries=Object.entries(metrics||{}).filter(([,v])=>typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v));
 if(key==='workforce')return {primary:Object.entries(workforceFields).filter(([id])=>metrics[id]!==undefined).map(([id,[label,help]])=>({id,label,help,value:metrics[id]})),additional:entries.filter(([id])=>!workforceFields[id]&&!['correctlyDeployed','unmannedBeats','shiftCompliant'].includes(id))};
 if(key!=='beat')return {primary:entries.slice(0,8).map(([id,value])=>({id,value,label:'',help:''})),additional:entries.slice(8)};
 return {primary:Object.entries(beatFields).filter(([id])=>metrics[id]!==undefined).map(([id,[label,help]])=>({id,label,help,value:metrics[id]})),additional:entries.filter(([id])=>!beatFields[id])};
}

const workforceFields:Record<string,[string,string]>={
 manpowerScheduled:['Scheduled employee-days','Unique assigned staff per ward, counted once on each day with received attendance data. Missing matches remain in this denominator.'],
 present:['Matched present employee-days','Assigned staff with a unique Employee ID/Aadhaar match and present status. Identity matches alone do not prove presence or physical deployment.'],
 uniqueScheduledEmployees:['Unique assigned employees','Distinct assigned people in this ward; does not multiply by selected days.'],
 matchedAttendance:['Matched attendance employee-days','Uniquely matched rows, including both present and absent statuses.'],
 confirmedAbsent:['Matched non-present employee-days','A uniquely matched attendance row has a non-present status. Missing rows are excluded from this count.'],
 attendanceNotFound:['Attendance not found employee-days','No matching identifier. Names are not used to guess identity. Open Attendance to review people.'],
 attendanceNeedsReview:['Attendance requiring review employee-days','Conflicting identifiers or multiple rows for the same person/day; no present credit until resolved.'],
 attendanceDays:['Days with attendance data','Only received attendance days participate in workforce ratios.'],
 selectedDays:['Selected days','Full inclusive operational date range. Current assignments are used; this is not a historical roster.'],
 supervisorsScheduled:['Scheduled Daroga-days','Distinct assigned Darogas multiplied by days with attendance data.'],
 supervisorsAvailable:['Matched present Daroga-days','Assigned Darogas with a unique identifier match and present status.'],
 beatDeploymentOpportunities:['Scheduled beat-days','Registered beats multiplied by days with attendance data.'],
 beatsConfirmedAbsent:['Beat-days with all staff non-present','Every assigned employee has a unique matched non-present attendance row.'],
 beatsPresenceUnverified:['Beat-days with unverified presence','No matched present assigned staff, with missing/review attendance or no assigned employees. This is not proof that the beat was unmanned.'],
};

/** Formula text is evidence, not an independent recalculation of official scores. */
export function rankingFormula(key:string,part:string,m:Record<string,any>) {
 const ratio=(a:string,b:string,label:string)=>Number.isFinite(m[a])&&Number.isFinite(m[b])?`${label}: ${m[a]} / ${m[b]}`:'';
 if(key==='workforce') {
  if(part==='deployment')return ratio('present','manpowerScheduled','Matched present / scheduled employee-days');
  if(part==='supervisorAvailability')return ratio('supervisorsAvailable','supervisorsScheduled','Matched present / scheduled Daroga-days');
  if(part==='unmannedBeatControl'&&Number.isFinite(m.beatDeploymentOpportunities)&&Number.isFinite(m.unmannedBeats))return `Verified staffed / scheduled beat-days: ${m.beatDeploymentOpportunities-m.unmannedBeats} / ${m.beatDeploymentOpportunities}`;
 }
 const coverage:Record<string,[string,string]>={beat:['beatsChecked','beatsDue'],nala:['pointsChecked','pointsDue'],toilet:['toiletsChecked','toiletsDue'],litterBin:['binsChecked','binsDue'],gvp:['pointsChecked','pointsDue'],supervisor:['reportsSubmitted','reportsDue'],qc:['reviewed','totalReports'],actionOfficer:['tasksCompleted','tasksAssigned']};
 if(m.targetBased&&(part==='submissionCoverage'||part==='reviewCoverage'))return ratio('targetsMet','assignedTargets','Achieved / assigned targets');
 if(['inspectionCoverage','submissionCoverage','reviewCoverage','actionCompletion'].includes(part)&&coverage[key])return ratio(...coverage[key], 'Completed / required');
 if(part==='qcApproval')return ratio('qcApproved','qcReviewed','Approved / reviewed');
 if(part==='completePointCoverage')return ratio('completePointCoverage','pointsDue','Complete reports / required reports');
 if(part==='compliance')return key==='toilet'?ratio('compliantToilets','qcReviewed','Compliant / reviewed'):ratio('compliantBins','qcReviewed','Compliant / reviewed');
 if(part==='quality')return ratio('evidenceMatchedChecks','evidenceEvaluatedChecks','Evidence checks passed / evaluated');
 if(part==='eliminationProgress')return ratio('eliminatedPoints','totalPoints','Verified eliminated / registered points');
 if(part==='completeBeatCoverage')return ratio('completeBeatCoverage','beatsDue','Complete visits / required visits');
 return '';
}
