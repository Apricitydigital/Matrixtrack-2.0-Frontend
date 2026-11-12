const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {emptyCoverage,selectInspectionCoverage}=require('../src/services/inspectionCoverage.ts');
const {ulbScopeData}=require('../src/services/ulbDashboard.ts');
const {ulbInspectionSummary,applyPerformanceTargets,reconcileZoneExport}=require('../src/services/commissioner.ts');
const {targetDelivery,reportTargetDelivery}=require('../src/services/targetDelivery.ts');
const {inspectionMetrics}=require('../src/services/inspectionMetrics.ts');
const {siReviewPercent,siReviewSummary}=require('../src/services/siReviewSummary.ts');
const zones=[{id:'z1',name:'Zone 1'},{id:'z2',name:'Zone 2'}];
const units=[['z1','w1','sweeping',10,['SUBMITTED','SUBMITTED','ACTION_REQUIRED']],['z1','w1','toilets',5,['APPROVED','REJECTED']],['z2','w2','sweeping',10,['SUBMITTED']],['z2','w2','toilets',5,['ACTION_TAKEN']],['z1','outside','sweeping',100,['SUBMITTED']]];
const raw={...emptyCoverage(),from:'2026-11-05',to:'2026-11-05',inventoryAvailable:true,modules:['sweeping','toilets'],assets:units.map(([zoneId,wardId,module],i)=>({id:`a${i}`,zoneId,wardId,module})),visits:units.flatMap(([zoneId,wardId,module,,statuses],i)=>statuses.map((status,j)=>({id:`r${i}-${j}`,assetId:`a${i}`,zoneId,wardId,module,status,submittedAt:'2026-11-05T04:00:00Z'})))};
raw.visits.push({...raw.visits[0],id:'draft',status:'DRAFT'});
const users={u:{rows:units.map(([zoneId,wardId,module,target])=>({wardId,zoneName:zones.find(z=>z.id===zoneId).name,module:module==='sweeping'?'SWEEPING':'TOILET',source:'ADMIN',target,credit:1,targetPercent:20,targetBasis:'current'}))}};
const data=selectInspectionCoverage(raw,['z1','z2'],['w1','w2']);
const official=applyPerformanceTargets(ulbInspectionSummary(raw,zones,['w1','w2']),users,['w1','w2']);

test('top, zone and module report progress reconcile while scoring credit remains separate',()=>{
 const top=reportTargetDelivery(targetDelivery(official.totals),ulbScopeData(data).completedCounts.inspections);
 assert.equal(top.target,30);assert.equal(top.completed,7);assert.equal(top.remaining,23);assert.equal(official.totals.completed,4);
 const area=zones.map(z=>reportTargetDelivery(targetDelivery(official.zones.find(r=>r.id===z.id).totals),inspectionMetrics(data,{zone:z.id}).achieved));
 assert.deepEqual(area.map(r=>[r.target,r.completed,r.remaining]),[[15,5,10],[15,2,13]]);
 for(const key of ['target','completed','remaining'])assert.equal(area.reduce((n,r)=>n+r[key],0),top[key]);
 const modules=['sweeping','toilets'].map(module=>reportTargetDelivery(targetDelivery(official.modules[module]),inspectionMetrics(data,{module}).achieved));
 assert.deepEqual(modules.map(r=>[r.target,r.completed,r.remaining]),[[20,4,16],[10,3,7]]);
 for(const key of ['target','completed','remaining'])assert.equal(modules.reduce((n,r)=>n+r[key],0),top[key]);
 const {ModuleDelivery}=require('../src/pages/commissioner/ModuleDelivery.tsx');
 const html=renderToStaticMarkup(React.createElement(ModuleDelivery,{modules:['sweeping','toilets'],pulse:{official,errors:{},pending:0},data,loading:false,zone:'',ward:'',onInspect:()=>{}}));
 assert.match(html,/data-metric="achievement" data-met="false">20%/);assert.match(html,/data-metric="achievement" data-met="false">30%/);
 assert.match(html,/Daroga scoring credit/);assert.match(html,/data-metric="pending">16/);assert.match(html,/data-metric="pending">7/);
});
test('module selection narrows target rows along with geography; exports retain the same percentage',()=>{
 const scoped=applyPerformanceTargets(ulbInspectionSummary(raw,zones,['w1','w2']),users,['w1','w2'],['toilets']);
 assert.equal(scoped.totals.target,10);assert.equal(scoped.totals.completed,2);
 const report={zones:[{zoneId:'z1',zoneName:'Zone 1',total:{},modules:[{module:'SWEEPING'},{module:'TOILET'}]}]};
 const result=reconcileZoneExport(report,raw,['w1'],users).zones[0];
 assert.equal(result.total.inspectionTarget,15);assert.equal(result.total.achieved,5);assert.equal(result.total.targetAchievement,5/15*100);assert.equal(result.total.targetCredit,2);
});
test('SI automatic 10% is rounded once per day across modules and includes post-review follow-up',()=>{
 assert.equal(siReviewPercent({targets:0,percentTargets:0,percents:[],defaultPercent:10}),10);
 const summary=siReviewSummary(data,10);assert.deepEqual(summary,{received:7,reviewed:4,pending:3,other:0,target:1,days:1});
 const {SiReviewOverview}=require('../src/components/analytics/SiReviewOverview.tsx');
 const html=renderToStaticMarkup(React.createElement(SiReviewOverview,{cityId:'c',data,loading:false,rule:{targets:0,percentTargets:0,percents:[],defaultPercent:10},onPending:()=>{}}));
 assert.match(html,/Automatic 10% daily review sample/);assert.match(html,/SI sample target \(10%\)/);assert.doesNotMatch(html,/not set|whole city only/);
 assert.equal(siReviewSummary({...data,visits:data.visits.map(v=>({...v,submittedAt:undefined}))},10).target,null);
 assert.equal(siReviewSummary({...data,failedModules:['sweeping']},10).received,null);
 assert.equal(siReviewPercent({targets:2,percentTargets:2,percents:[10,20]}),null);
});
test('SI uses IST submission days and no duplicate reports or Drafts',()=>{
 const sample={...data,visits:[data.visits[0],data.visits[0],{...data.visits[0],id:'next',submittedAt:'2026-11-05T19:00:00Z'},{...data.visits[0],id:'draft',status:'DRAFT'}]};
 assert.equal(siReviewSummary(sample,10).target,2);assert.equal(siReviewSummary(sample,10).received,2);
});

test('compact dashboard hydrates only the exact clicked report module and IST day',async()=>{
 const coverage=require('../src/services/inspectionCoverage.ts'),saved=coverage.loadInspectionCoverage,{coverageReportDetail}=require('../src/services/coverageReportDetail.ts');
 const clicked={...data.visits[0],id:'sweeping:clicked',submittedAt:'2026-11-05T19:00:00Z'},raw={id:'clicked',cityId:'city',photos:[{url:'evidence.jpg'}]},requests=[];
 coverage.loadInspectionCoverage=async(...args)=>{requests.push(args);return {...emptyCoverage(),visits:[{...clicked,id:'sweeping:other',raw:{id:'other'}},{...clicked,raw}]}};
 try{
  const signal=new AbortController().signal,result=await coverageReportDetail({id:'city'},{...data,compact:true},clicked,signal);
  assert.equal(result,raw);assert.deepEqual(requests[0].slice(0,3),[{id:'city',enabledModules:['sweeping']},'2026-11-06','2026-11-06']);assert.equal(requests[0][3],signal);assert.equal(requests[0][4],false);
  assert.equal(await coverageReportDetail({id:'city'},data,{...clicked,raw},signal),raw);assert.equal(requests.length,1);
  coverage.loadInspectionCoverage=async()=>({...emptyCoverage(),visits:[{...clicked,id:'sweeping:other',raw:{id:'other'}}]});
  await assert.rejects(coverageReportDetail({id:'city'},{...data,compact:true},clicked,signal),/unavailable/);
 }finally{coverage.loadInspectionCoverage=saved;}
});

test('compact overview retains completed corrective actions after the current status changes',async()=>{
 const api=require('../src/services/api.ts'),saved=api.api,coverage=require('../src/services/inspectionCoverage.ts');
 api.api=async()=>({...emptyCoverage(),version:1,complete:true,cityId:'city',from:'2026-11-05',to:'2026-11-05',inventoryAvailable:true,modules:['sweeping'],visits:[{id:'sweeping:r',module:'sweeping',zoneId:'z1',wardId:'w1',status:'APPROVED',submittedAt:'2026-11-05T04:00:00Z',raw:{status:'APPROVED',payload:{actionTakenAt:'2026-11-05T05:00:00Z'}}}]});
 try{const result=await coverage.loadInspectionCoverage({id:'city',enabledModules:['sweeping']},'2026-11-05','2026-11-05',new AbortController().signal,true);assert.equal(result.visits[0].actionRequired,true);assert.equal(result.visits[0].actionTaken,true);assert.equal(ulbScopeData(result).actionTakenTotal,1);}finally{api.api=saved;}
});
