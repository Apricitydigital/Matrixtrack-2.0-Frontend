const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {darogaCleaned,darogaOverall}=require('../src/services/darogaBreakdown.ts');
const visit=(id,module,status,qcDecision,extra={})=>({id,module,status,raw:{submittedBy:{id:'daroga'},qcDecision,...extra}});
test('corrective workflow preserves permanent SI decisions instead of replacing them',()=>{
 for(const status of ['ACTION_REQUIRED','ACTION_TAKEN','ESCALATED']){
  const approved=darogaCleaned([visit('approved','sweeping',status,'APPROVED')],'daroga');
  assert.equal(approved.score,100);assert.equal(approved.cleaned,1);assert.equal(approved.siDecided,1);
  const rejected=darogaCleaned([visit('rejected','sweeping',status,'REJECTED')],'daroga');
  assert.equal(rejected.score,0);assert.equal(rejected.notCleaned,1);assert.equal(rejected.siDecided,1);
 }
});
test('ULB escalation before SI review uses AI evidence or stays unassessed without inventing an SI decision',()=>{
 const rows=[visit('no-evidence','sweeping','ACTION_REQUIRED',null),visit('ai','sweeping','ACTION_REQUIRED',null,{intelligenceSuggestion:{outcome:'CLEAN',reasons:['Clear view'],confidencePercent:90}})];
 const result=darogaCleaned(rows,'daroga');
 assert.equal(result.siDecided,0);assert.equal(result.aiSuggested,1);assert.equal(result.cleaned,1);assert.equal(result.notCleaned,0);assert.equal(result.unassessed,1);
});
test('module selection isolates cleaned and overall scores while excluding other users and duplicate visits',()=>{
 const rows=[visit('s','sweeping','APPROVED','APPROVED'),visit('t','toilets','REJECTED','REJECTED'),visit('s','sweeping','APPROVED','APPROVED'),visit('other','sweeping','REJECTED','REJECTED',{submittedBy:{id:'someone-else'}})];
 assert.equal(darogaCleaned(rows,'daroga').score,50);
 const cleaned=darogaCleaned(rows,'daroga','SWEEPING');assert.equal(cleaned.total,1);assert.equal(cleaned.score,100);
 assert.equal(darogaCleaned(rows,'daroga','TOILET').score,0);
 assert.equal(darogaOverall({inspection:100,cleaned:cleaned.score,attendance:100}).score,100);
});
