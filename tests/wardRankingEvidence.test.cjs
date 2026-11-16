const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {rankingEvidence,rankingFormula}=require('../src/services/wardRankingEvidence.ts');
test('workforce evidence distinguishes employee-days, missing records and absence without deployment claims',()=>{
 const e=rankingEvidence('workforce',{manpowerScheduled:90,present:70,matchedAttendance:75,uniqueScheduledEmployees:45,confirmedAbsent:5,attendanceNotFound:15,attendanceNeedsReview:0,correctlyDeployed:70,unmannedBeats:3});
 assert.equal(e.primary.find(x=>x.id==='manpowerScheduled').label,'Registered attendance required');
 assert.equal(e.primary.length,4);
 assert.ok(!e.primary.some(x=>x.id==='uniqueScheduledEmployees'));
 assert.ok(e.additional.some(([key,value])=>key==='uniqueScheduledEmployees'&&value===45));
 assert.ok(e.primary.find(x=>x.id==='attendanceNotFound').help.includes('Names are not used'));
 assert.ok(![...e.primary,...e.additional].some(x=>x.id==='correctlyDeployed'||x[0]==='correctlyDeployed'));
 assert.equal(rankingFormula('workforce','deployment',{present:35,manpowerScheduled:45}),'Matched present / registered attendance required: 35 / 45');
});
test('module formulas preserve work denominators and target overrides',()=>{
 assert.equal(rankingFormula('beat','inspectionCoverage',{beatsChecked:5,beatsDue:32}),'Completed / required: 5 / 32');
 assert.equal(rankingFormula('qc','reviewCoverage',{reviewed:8,totalReports:10}),'Completed / required: 8 / 10');
 assert.equal(rankingFormula('supervisor','submissionCoverage',{targetBased:true,targetsMet:3,assignedTargets:4}),'Achieved / assigned targets: 3 / 4');
 assert.equal(rankingFormula('toilet','quality',{evidenceMatchedChecks:7,evidenceEvaluatedChecks:10}),'Evidence checks passed / evaluated: 7 / 10');
 assert.equal(rankingFormula('workforce','deployment',{}),'');
});

test('cleanliness scoring exposes all four sources and the submitted-report denominator without SI/AI double credit',()=>{
 const metrics={cleanlinessPolicy:'INSPECTION_20_CLEANLINESS_60_QUALITY_20',cleanlinessSiClean:4,cleanlinessSiNotClean:1,cleanlinessAiClean:3,cleanlinessAiNotClean:1,cleanlinessUnassessed:1,cleanlinessUnclear:0,cleanlinessClean:7,cleanlinessSubmitted:10,beatsChecked:10,beatsDue:20};
 const evidence=rankingEvidence('beat',metrics);assert.deepEqual(evidence.primary.map(row=>row.label),['SI clean','SI not clean','AI suggested clean','AI suggested not clean']);
 assert.equal(rankingFormula('beat','cleanliness',metrics),'SI clean + AI clean / submitted reports: 7 / 10');
 assert.equal(rankingFormula('beat','inspectionCoverage',metrics),'Completed / required: 10 / 20');
 assert.ok(evidence.additional.some(([key,value])=>key==='cleanlinessUnassessed'&&value===1));
 require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,file);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{WardScoreBreakdown}=require('../src/components/analytics/WardScoreBreakdown.tsx');
 const html=renderToStaticMarkup(React.createElement(WardScoreBreakdown,{factor:{key:'beat',label:'Sweeping',score:5.7,maxScore:10,metrics,components:{inspectionCoverage:{score:1,maxScore:2,percentage:50,applicable:true},cleanliness:{score:4.2,maxScore:6,percentage:70,applicable:true},completeBeatCoverage:{score:.5,maxScore:2,percentage:25,applicable:true}}}}));
 assert.match(html,/Cleanliness \(SI \+ AI\)/);assert.match(html,/7 \/ 10/);assert.match(html,/4.2 \/ 6/);assert.match(html,/AI suggested not clean/);assert.match(html,/60% cleanliness/);
});

test('selected score exposes the exact active subtotal behind 19.86 and excludes N/A shift',()=>{
 const {scoreCalculation}=require('../src/services/wardRankingEvidence.ts');
 const result=scoreCalculation({components:{deployment:{score:11.67,maxScore:18,applicable:true},shiftCompliance:{score:0,maxScore:6,applicable:false},supervisorAvailability:{score:2.5,maxScore:3,applicable:true},unmannedBeatControl:{score:1.72,maxScore:3,applicable:true}}});
 assert.equal(result.parts.length,3);assert.equal(result.available,24);assert.equal(Number((result.earned/result.available*30).toFixed(2)),19.86);
 assert.equal(scoreCalculation({components:{reviewCoverage:{score:4,maxScore:10,applicable:true}}}).earned,4);
});

test('IEC calculation includes action completion only, excluding legacy diagnostic scores',()=>{
 const {scoreCalculation}=require('../src/services/wardRankingEvidence.ts');
 const result=scoreCalculation({key:'actionOfficer',components:{acknowledgement:{score:1,maxScore:1,applicable:true},actionCompletion:{score:6.47,maxScore:10,applicable:true},closureEvidence:{score:2,maxScore:2,applicable:true}}});
 assert.deepEqual(result.parts.map(p=>p.key),['actionCompletion']);assert.equal(result.earned,6.47);assert.equal(result.available,10);
});

test('compact selected evidence renders the score equation and keeps extra counts collapsed',()=>{
 require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,filename);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {WardScoreBreakdown}=require('../src/components/analytics/WardScoreBreakdown.tsx');
 const html=renderToStaticMarkup(React.createElement(WardScoreBreakdown,{factor:{key:'workforce',label:'Workforce attendance',score:19.86,maxScore:30,metrics:{manpowerScheduled:162,present:105,matchedAttendance:136,attendanceNotFound:26,uniqueScheduledEmployees:27},components:{deployment:{score:11.67,maxScore:18,applicable:true},shiftCompliance:{score:0,maxScore:6,applicable:false},supervisorAvailability:{score:2.5,maxScore:3,applicable:true},unmannedBeatControl:{score:1.72,maxScore:3,applicable:true}}}}));
 assert.match(html,/15.89 \/ 24/);assert.match(html,/= 19.86/);assert.match(html,/Matched with attendance sheet/);
 assert.match(html,/<details[^>]*><summary>More details<\/summary>/);assert.doesNotMatch(html,/Unique Employee ID|weighted achievement|insight-bar-chart/);
});


test('workforce breakdown adds the three supported factors directly without a 24-to-30 conversion',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 require.extensions['.tsx']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,f);
 const {WardScoreBreakdown}=require('../src/components/analytics/WardScoreBreakdown.tsx');
 const part=(score,maxScore,applicable=true)=>({score,maxScore,applicable,percentage:score/maxScore*100});
 const factor={key:'workforce',label:'Workforce attendance',score:11.34,maxScore:30,metrics:{present:108,manpowerScheduled:276},components:{deployment:part(8.8,22.5),supervisorAvailability:part(1.56,3.75),unmannedBeatControl:part(.98,3.75),shiftCompliance:part(0,0,false)}};
 const html=renderToStaticMarkup(React.createElement(WardScoreBreakdown,{factor}));
 assert.match(html,/8.8 \+ 1.56 \+ 0.98/);assert.doesNotMatch(html,/\/ 24/);assert.match(html,/22.5/);assert.match(html,/3.75/);
});
