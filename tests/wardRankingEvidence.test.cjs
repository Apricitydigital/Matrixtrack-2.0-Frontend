const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {rankingEvidence,rankingFormula}=require('../src/services/wardRankingEvidence.ts');
test('workforce evidence distinguishes employee-days, missing records and absence without deployment claims',()=>{
 const e=rankingEvidence('workforce',{manpowerScheduled:90,present:70,uniqueScheduledEmployees:45,confirmedAbsent:5,attendanceNotFound:15,attendanceNeedsReview:0,correctlyDeployed:70,unmannedBeats:3});
 assert.equal(e.primary.find(x=>x.id==='manpowerScheduled').label,'Scheduled employee-days');
 assert.equal(e.primary.find(x=>x.id==='uniqueScheduledEmployees').value,45);
 assert.ok(e.primary.find(x=>x.id==='attendanceNotFound').help.includes('Names are not used'));
 assert.ok(![...e.primary,...e.additional].some(x=>x.id==='correctlyDeployed'||x[0]==='correctlyDeployed'));
 assert.equal(rankingFormula('workforce','deployment',{present:35,manpowerScheduled:45}),'Matched present / scheduled employee-days: 35 / 45');
});
test('module formulas preserve work denominators and target overrides',()=>{
 assert.equal(rankingFormula('beat','inspectionCoverage',{beatsChecked:5,beatsDue:32}),'Completed / required: 5 / 32');
 assert.equal(rankingFormula('qc','reviewCoverage',{reviewed:8,totalReports:10}),'Completed / required: 8 / 10');
 assert.equal(rankingFormula('supervisor','submissionCoverage',{targetBased:true,targetsMet:3,assignedTargets:4}),'Achieved / assigned targets: 3 / 4');
 assert.equal(rankingFormula('toilet','quality',{evidenceMatchedChecks:7,evidenceEvaluatedChecks:10}),'Evidence checks passed / evaluated: 7 / 10');
 assert.equal(rankingFormula('workforce','deployment',{}),'');
});
