const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8').replaceAll('import.meta.env','({})'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const {intelligenceCounts,intelligenceFilter,matchesIntelligence}=require('../src/services/intelligenceMetrics');
const {matchesFilters,emptyFilters}=require('../src/services/presentation');
const {mapReport}=require('../src/services/adapters');
const {renderToStaticMarkup}=require('react-dom/server'),React=require('react');
const {IntelligenceSummary,IntelligenceSuggestion}=require('../src/components/reports/IntelligenceSuggestion');
const raw=(id,status,outcome,confidence=.88)=>({id,status,createdAt:'2026-11-04T05:00:00Z',autoQcResult:{decision:'APPROVED',cleanliness:{outcome,confidence,reasons:['Visible waste at the location'],reasonsHi:['यहाँ कचरा दिखाई दे रहा है']}}});
test('SI decisions stay official; only human-pending records enter the separate AI counts',()=>{
 const rows=[raw('1','SUBMITTED','CLEAN'),raw('2','SUBMITTED','NOT_CLEAN'),raw('3','APPROVED','CLEAN'),raw('4','REJECTED','NOT_CLEAN'),raw('5','DRAFT','CLEAN'),{id:'6',status:'PENDING_QC'},{...raw('7','SUBMITTED','NOT_CLEAN'),qcDecision:'REJECTED'}, {id:'8',status:'SUBMITTED',autoQcResult:{decision:'APPROVED',checks:[{result:'MATCH'}]}}];
 assert.deepEqual(intelligenceCounts(rows),{CLEAN:1,NOT_CLEAN:1,UNASSESSABLE:1,AWAITING_AI:1});
 const report=mapReport(rows[1],'sweeping','city',[]);assert.equal(report.status,'pending_review');assert.equal(report.intelligenceSuggestion.outcome,'NOT_CLEAN');assert.equal(report.intelligenceSuggestion.confidencePercent,88);
 assert.equal(matchesFilters(report,{...emptyFilters(),status:intelligenceFilter('NOT_CLEAN')},[]),true);
 assert.equal(matchesFilters(report,{...emptyFilters(),status:'rejected'},[]),false);
 assert.equal(matchesIntelligence(rows[3],intelligenceFilter('NOT_CLEAN')),false);
 assert.equal(matchesFilters({...report,wardId:'other'},{...emptyFilters(),wardId:'ward',status:intelligenceFilter('NOT_CLEAN')},[]),false);
});
test('dashboard and report rendering retain the reason and confidence without changing workflow labels',()=>{
 const report=raw('r','SUBMITTED','NOT_CLEAN');
 const summary=renderToStaticMarkup(React.createElement(IntelligenceSummary,{reports:[report]}));
 assert.match(summary,/Intelligence suggested clean/);assert.match(summary,/Intelligence suggested not cleaned/);assert.match(summary,/awaiting SI review/);
 const detail=renderToStaticMarkup(React.createElement(IntelligenceSuggestion,{report}));assert.match(detail,/88% AI confidence/);assert.match(detail,/Visible waste at the location/);assert.match(detail,/official decision/);
 const hindi=renderToStaticMarkup(React.createElement(IntelligenceSuggestion,{report,language:'hi'}));assert.match(hindi,/कचरा/);
});
