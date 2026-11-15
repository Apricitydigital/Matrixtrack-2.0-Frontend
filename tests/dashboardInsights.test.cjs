const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {visitCleanliness,cleanlinessStats,cleanlinessBy,pendingLocations,aiAnalysis,notCleanLocations}=require('../src/services/cleanliness.ts');
const {officerAdvice}=require('../src/services/intelligenceAdvice.ts');
const {emptyCoverage}=require('../src/services/inspectionCoverage.ts');

const ai=outcome=>({intelligenceSuggestion:{outcome,reasons:['x'],reasonsHi:[],confidencePercent:90}});
const visit=(id,{status='SUBMITTED',qc,outcome,module='sweeping',zone='z1',ward='w1',asset,by='d1'}={})=>({id:`${module}:${id}`,module,assetId:asset??id,zoneId:zone,wardId:ward,status,submittedAt:'2026-11-05T05:00:00Z',raw:{id,status,qcDecision:qc,submittedBy:{id:by,name:'Daroga One'},...(outcome?ai(outcome):{})}});

test('cleanliness uses the SI decision first and AI only for reports awaiting SI review',()=>{
 assert.deepEqual(visitCleanliness(visit('a',{qc:'APPROVED',outcome:'NOT_CLEAN'})),{verdict:'clean',source:'si'});
 assert.deepEqual(visitCleanliness(visit('b',{qc:'REJECTED',outcome:'CLEAN'})),{verdict:'not_clean',source:'si'});
 assert.deepEqual(visitCleanliness(visit('c',{status:'APPROVED'})),{verdict:'clean',source:'si'});
 assert.deepEqual(visitCleanliness(visit('d',{outcome:'CLEAN'})),{verdict:'clean',source:'ai'});
 assert.deepEqual(visitCleanliness(visit('e',{outcome:'NOT_CLEAN'})),{verdict:'not_clean',source:'ai'});
 assert.deepEqual(visitCleanliness(visit('f',{outcome:'UNASSESSABLE'})),{verdict:'unassessed',source:null});
 // Corrective workflow keeps the permanent SI decision.
 assert.deepEqual(visitCleanliness(visit('g',{status:'ACTION_REQUIRED',qc:'REJECTED'})),{verdict:'not_clean',source:'si'});
});

test('cleanliness percentages count each inspection once and leave unassessed reports out',()=>{
 const visits=[visit('a',{qc:'APPROVED'}),visit('a',{qc:'APPROVED'}),visit('b',{qc:'REJECTED',ward:'w2'}),visit('c',{outcome:'CLEAN',zone:'z2',ward:'w3',module:'toilets'}),visit('d',{outcome:'UNASSESSABLE'})];
 const s=cleanlinessStats(visits);
 assert.equal(s.inspections,4);assert.equal(s.clean,2);assert.equal(s.notClean,1);assert.equal(s.unassessed,1);
 assert.equal(s.siClean,1);assert.equal(s.aiClean,1);assert.equal(s.siNotClean,1);
 assert.equal(Math.round(s.percent*10)/10,66.7);assert.equal(s.siPercent,50);
 assert.equal(cleanlinessBy(visits,'zoneId').get('z2').clean,1);
 assert.equal(cleanlinessBy(visits,'module').get('sweeping').inspections,3);
 assert.equal(cleanlinessBy(visits,'wardId').get('w2').percent,0);
 assert.equal(cleanlinessStats([]).percent,null);
});

test('pending locations are registered assets without an inspection, matching coverage remaining',()=>{
 const {coverageCounts}=require('../src/services/inspectionCoverage.ts');
 const assets=Array.from({length:5},(_,i)=>({id:`a${i}`,key:`sweeping:a${i}`,module:'sweeping',zoneId:'z1',wardId:i<3?'w1':'w2',name:`Beat ${i}`,wardName:i<3?'Ward 1':'Ward 2'}));
 const data={...emptyCoverage(),inventoryAvailable:true,assets,visits:[visit('v1',{asset:'a0'}),visit('v2',{asset:'a0'}),visit('v3',{asset:'a3',ward:'w2'})]};
 const pending=pendingLocations(data);
 assert.deepEqual(pending.map(a=>a.id),['a1','a2','a4']);assert.equal(pending.length,coverageCounts(data).remaining);
 assert.deepEqual(pendingLocations(data,{ward:'w2'}).map(a=>a.id),['a4']);
 assert.deepEqual(pendingLocations(data,{module:'toilets'}),[]);
});

test('AI analysis reports agreement only where an SI decision and a clear AI result both exist',()=>{
 const a=aiAnalysis([visit('a',{qc:'APPROVED',outcome:'CLEAN'}),visit('b',{qc:'REJECTED',outcome:'CLEAN'}),visit('c',{outcome:'NOT_CLEAN'}),visit('d',{qc:'APPROVED',outcome:'UNASSESSABLE'}),visit('e')]);
 assert.equal(a.analysed,4);assert.equal(a.awaiting,1);assert.equal(a.clean,2);assert.equal(a.notClean,1);assert.equal(a.unassessable,1);
 assert.equal(a.compared,2);assert.equal(a.agreed,1);assert.equal(a.agreement,50);
});

test('locations found not clean are ranked by frequency with their basis',()=>{
 const data={...emptyCoverage(),assets:[{id:'a1',module:'sweeping',name:'Market beat'}],visits:[]};
 const rows=notCleanLocations(data,[visit('1',{asset:'a1',qc:'REJECTED'}),visit('2',{asset:'a1',outcome:'NOT_CLEAN'}),visit('3',{asset:'a2',qc:'REJECTED'}),visit('4',{asset:'a3',qc:'APPROVED'})]);
 assert.deepEqual(rows.map(r=>[r.name,r.count]),[['Market beat',2],['a2',1]]);
});

test('intelligence suggestions coach weak Darogas from recorded evidence only',()=>{
 const wards=[{id:'w1',name:'Ward 1',zoneId:'z1'},{id:'w2',name:'Ward 2',zoneId:'z1'}];
 const assets=Array.from({length:6},(_,i)=>({id:`a${i}`,module:'sweeping',zoneId:'z1',wardId:'w1',name:`Beat ${i}`,supervisors:[{id:'d1'}]}));
 const visits=[...Array.from({length:4},(_,i)=>visit(`r${i}`,{asset:'a0',qc:i<3?'REJECTED':'APPROVED'})),visit('p1',{asset:'a1',outcome:'NOT_CLEAN'}),visit('p2',{asset:'a1',outcome:'NOT_CLEAN'})];
 const performance={SUPERVISOR:{d1:{required:60,completed:6,performance:10,daily:[{target:20,credit:0},{target:20,credit:0},{target:20,credit:6}]},d2:{required:10,completed:10,performance:100}}};
 const advice=officerAdvice({visits,assets,users:[{id:'d1',name:'Daroga One',role:'SUPERVISOR'},{id:'d2',name:'Daroga Two',role:'SUPERVISOR'}],wards,from:'2026-11-05',to:'2026-11-07'},['SUPERVISOR'],performance);
 const weak=advice.find(a=>a.id==='d1'),strong=advice.find(a=>a.id==='d2');
 assert.equal(advice[0].id,'d1');assert.equal(weak.severity,'critical');
 const titles=weak.suggestions.map(s=>s.title);
 assert.ok(titles.includes('Raise the daily inspection count'));
 assert.match(weak.suggestions.find(s=>s.title==='Raise the daily inspection count').detail,/Completed 6 of 60 .*54 more were needed — about 18 extra per day over 3 days/);
 assert.ok(titles.includes('Avoid days with no inspections'));
 assert.ok(titles.includes('Cover the locations that were skipped'));
 assert.equal(weak.suggestions.find(s=>s.title==='Cover the locations that were skipped').evidence.length,4);
 assert.ok(titles.includes('Fix cleanliness at problem locations'));
 assert.ok(titles.includes('Act on AI-flagged reports before SI review'));
 assert.equal(strong.severity,'good');assert.equal(strong.suggestions.length,0);
 // Scope: a Daroga with no reports or assignment in the selected ward is left out.
 assert.deepEqual(officerAdvice({visits:[],assets:[],users:[],wards,wardIds:['w2']},['SUPERVISOR'],{SUPERVISOR:{d9:{required:5,completed:0,performance:0,rows:[{wardId:'w1'}]}}}),[]);
});

test('SI and IEC suggestions use their own on-time evidence',()=>{
 const advice=officerAdvice({visits:[],assets:[],users:[{id:'s1',name:'SI One',role:'QC'}],wards:[]},['QC'],{QC:{s1:{due:20,onTime:5,late:10,overdue:5,performance:25,oldestPendingDays:6}}});
 assert.equal(advice.length,1);assert.equal(advice[0].severity,'critical');
 assert.deepEqual(advice[0].suggestions.map(s=>s.title),['Clear the review backlog daily','Start with the oldest items']);
});

test('cleanliness insights and the module AI strip render from the same register',()=>{
 const {CleanlinessInsights,CleanedSummary}=require('../src/components/dashboard/CleanlinessInsights.tsx');
 const {ModuleDelivery}=require('../src/pages/commissioner/ModuleDelivery.tsx');
 const assets=[{id:'a0',key:'sweeping:a0',module:'sweeping',zoneId:'z1',wardId:'w1',name:'Beat 0'},{id:'a1',key:'sweeping:a1',module:'sweeping',zoneId:'z1',wardId:'w1',name:'Beat 1'}];
 const data={...emptyCoverage(),from:'2026-11-05',to:'2026-11-05',modules:['sweeping'],inventoryAvailable:true,assets,visits:[visit('1',{asset:'a0',qc:'APPROVED',outcome:'CLEAN'}),visit('2',{asset:'a0',outcome:'NOT_CLEAN'})]};
 const html=renderToStaticMarkup(React.createElement(CleanlinessInsights,{data,loading:false,modules:['sweeping'],zones:[{id:'z1',name:'Zone 1'}],wards:[{id:'w1',name:'Ward 1',zoneId:'z1'}]}));
 assert.match(html,/data-metric="city-cleanliness">50%/);assert.match(html,/By module/);assert.match(html,/By zone/);assert.match(html,/Ward 1/);
 const summary=renderToStaticMarkup(React.createElement(CleanedSummary,{data,loading:false}));
 assert.match(summary,/data-metric="summary-cleaned">1</);assert.match(summary,/data-metric="summary-not-cleaned">0</);assert.match(summary,/50% clean/);
 const card=renderToStaticMarkup(React.createElement(ModuleDelivery,{modules:['sweeping'],pulse:{pending:0,errors:{}},data,loading:false,zone:'',ward:'',onInspect:()=>{}}));
 assert.match(card,/data-module-ai="sweeping"/);assert.match(card,/data-metric="pending-locations">1</);assert.match(card,/Beat 1/);assert.doesNotMatch(card,/inspection-card-details/);
});
