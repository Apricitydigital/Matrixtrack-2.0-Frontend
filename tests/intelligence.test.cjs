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

test('the ULB operations dashboard renders intelligence counts alongside the official SI counts',()=>{
 const coverageHook=require('../src/services/useInspectionCoverage');
 const commissioner=require('../src/services/commissioner');
 const originalCoverage=coverageHook.useInspectionCoverage,originalPulse=commissioner.useCityPulse;
 const {inspectionVisit}=require('../src/services/inspectionCoverage');
 const records=Array.from({length:100},(_,i)=>raw(String(i),i<6?'APPROVED':i<10?'REJECTED':'SUBMITTED',i%2?'CLEAN':'NOT_CLEAN'));
 const data={from:'2026-11-04',to:'2026-11-04',assets:[],visits:records.map(record=>inspectionVisit({...record,beatId:`beat-${record.id}`,zoneId:'z',wardId:'w'},'sweeping','city')),modules:['sweeping'],failedModules:[],inventoryAvailable:true,errors:[]};
 coverageHook.useInspectionCoverage=()=>({data,loading:false});
 commissioner.useCityPulse=()=>({pending:0,errors:{},performance:{}});
 try {
  const {UlbDashboard}=require('../src/pages/ulbofficer/UlbDashboard');
  const html=renderToStaticMarkup(React.createElement(UlbDashboard,{city:{id:'city',name:'Test city',enabledModules:['sweeping']},zones:[],wards:[],currentUser:{id:'ulb'},noticeRequest:0,onNavigate:()=>{},onSelectReport:()=>{},onNoticeCount:()=>{},onNoticeHandled:()=>{}}));
  assert.match(html,/Inspection decisions &amp; follow-up/);
  assert.match(html,/data-ulb-metric="approved"[^]*?<strong>6<\/strong>/);
  assert.match(html,/data-ulb-metric="rejected"[^]*?<strong>4<\/strong>/);
  assert.match(html,/data-outcome="CLEAN"[^]*?<strong>45<\/strong>/);
  assert.match(html,/data-outcome="NOT_CLEAN"[^]*?<strong>45<\/strong>/);
  assert.match(html,/Intelligence suggested clean/);assert.match(html,/Intelligence suggested not cleaned/);
 } finally {coverageHook.useInspectionCoverage=originalCoverage;commissioner.useCityPulse=originalPulse;}
});
