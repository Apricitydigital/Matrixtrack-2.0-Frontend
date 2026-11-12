const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {emptyCoverage,selectInspectionCoverage}=require('../src/services/inspectionCoverage.ts');
const {ulbScopeData}=require('../src/services/ulbDashboard.ts');
const {ulbInspectionSummary,applyPerformanceTargets,reconcileZoneExport}=require('../src/services/commissioner.ts');
const {targetDelivery,reportTargetDelivery}=require('../src/services/targetDelivery.ts');
const {inspectionMetrics}=require('../src/services/inspectionMetrics.ts');
const {submittedBeatReportCount}=require('../src/services/beatReportCount.ts');
const {darogaReportProgress}=require('../src/services/darogaReportProgress.ts');
const {ulbReportRegister}=require('../src/services/ulbReportRegister.ts');
const {ulbTeamProgress}=require('../src/services/ulbTeamProgress.ts');
const {siReviewPercent,siReviewSummary}=require('../src/services/siReviewSummary.ts');
const zones=[{id:'z1',name:'Zone 1'},{id:'z2',name:'Zone 2'}];
const units=[['z1','w1','sweeping',10,['SUBMITTED','SUBMITTED','ACTION_REQUIRED']],['z1','w1','toilets',5,['APPROVED','REJECTED']],['z2','w2','sweeping',10,['SUBMITTED']],['z2','w2','toilets',5,['ACTION_TAKEN']],['z1','outside','sweeping',100,['SUBMITTED']]];
const raw={...emptyCoverage(),from:'2026-11-05',to:'2026-11-05',inventoryAvailable:true,modules:['sweeping','toilets'],assets:units.map(([zoneId,wardId,module],i)=>({id:`a${i}`,zoneId,wardId,module})),visits:units.flatMap(([zoneId,wardId,module,,statuses],i)=>statuses.map((status,j)=>({id:`r${i}-${j}`,assetId:`a${i}`,zoneId,wardId,module,status,submittedAt:'2026-11-05T04:00:00Z'})))};
raw.visits.push({...raw.visits[0],id:'draft',status:'DRAFT'});
const users={u:{rows:units.map(([zoneId,wardId,module,target])=>({wardId,zoneName:zones.find(z=>z.id===zoneId).name,module:module==='sweeping'?'SWEEPING':'TOILET',source:'ADMIN',target,credit:1,targetPercent:20,targetBasis:'current'}))}};
const data=selectInspectionCoverage(raw,['z1','z2'],['w1','w2']);
const official=applyPerformanceTargets(ulbInspectionSummary(raw,zones,['w1','w2']),users,['w1','w2']);

test('one ULB beat register reconciles totals, statuses, modules, wards, SI, progress and drill rows',()=>{
 const point=(id,status,index,at='2026-11-05T04:00:00Z')=>({id,module:'sweeping',assetId:'beat',zoneId:'z1',wardId:'w1',status,submittedAt:at,
  raw:{id,cityId:'city',status,payload:{pointIndex:index,photos:[`${id}.jpg`]}}});
 const input={...emptyCoverage(),from:'2026-11-05',to:'2026-11-06',inventoryAvailable:true,modules:['sweeping','toilets'],
  assets:[{id:'beat',module:'sweeping',zoneId:'z1',wardId:'w1'},{id:'draft-beat',module:'sweeping',zoneId:'z1',wardId:'w1'},{id:'toilet',module:'toilets',zoneId:'z1',wardId:'w1'}],
  visits:[point('p0','APPROVED',0),point('p1','SUBMITTED',1),point('p2','APPROVED',2),
   point('next','APPROVED',0,'2026-11-05T19:00:00Z'),
   {...point('draft','DRAFT',0),assetId:'draft-beat'},
   {...point('toilet','ACTION_TAKEN',0),assetId:'toilet',module:'toilets'},
   {...point('outside','REJECTED',0),assetId:'outside',zoneId:'z2',wardId:'w2'}]};
 const normalized=ulbReportRegister(input),selected=selectInspectionCoverage(normalized,['z1'],['w1']);
 assert.equal(input.visits.length,7,'normalization must not mutate the source register');
 assert.equal(normalized.visits.length,5);
 assert.deepEqual(ulbReportRegister(normalized),normalized,'normalization is idempotent');
 const scope=ulbScopeData(selected),{ulbDrillVisits}=require('../src/services/ulbDashboard.ts');
 assert.equal(scope.counts.inspections,4);assert.equal(scope.completedCounts.inspections,3);
 assert.equal(scope.statusCount('unclassified'),1);assert.equal(scope.statusCount('pending_review'),1);
 assert.equal(scope.statusCount('approved'),1);assert.equal(scope.statusCount('action_taken'),1);
 assert.equal(scope.completedCounts.covered,2);assert.equal(scope.completedCounts.repeats,1);
 assert.equal(ulbDrillVisits(scope,'inspections_completed').length,3);
 assert.equal(ulbScopeData(selected,{module:'sweeping'}).completedCounts.inspections,2);
 assert.equal(ulbDrillVisits(ulbScopeData(selected,{module:'sweeping'}),'pending_review').length,1);
 const modules=selected.modules.map(module=>inspectionMetrics(selected,{module}));
 assert.equal(modules.reduce((n,m)=>n+m.achieved,0),3);
 const delivery=targetDelivery({target:10,completed:1,targetState:'configured',targetPercent:20});
 assert.equal(darogaReportProgress(selected,delivery).percent,30);
 const review=siReviewSummary(selected,10);assert.equal(review.received,3);assert.equal(review.target,2);
 assert.deepEqual(ulbTeamProgress(selected),{si:{completed:2,target:3,percent:2/3*100},iec:{completed:1,target:1,percent:100}});
 const group=selected.visits.find(v=>v.sourceReportIds?.length===3);
 assert.equal(group.status,'SUBMITTED','partly reviewed beat cannot be shown as cleaned');
 assert.equal(group.raw.payload.points.length,3);
 assert.deepEqual(group.sourceReportIds,['p0','p1','p2']);
});

test('ULB legacy findings, action lifecycle and unavailable identity never inflate progress',()=>{
 const v={id:'r',module:'sweeping',assetId:'beat',zoneId:'z1',wardId:'w1',status:'ACTION_REQUIRED',submittedAt:'2026-11-05T04:00:00Z'};
 const source={...emptyCoverage(),inventoryAvailable:true,modules:['sweeping'],visits:[v,{...v,id:'taken',status:'ACTION_TAKEN'},{...v,id:'approved',status:'APPROVED'}]};
 const normalized=ulbReportRegister(source);assert.equal(normalized.visits.length,1);
 assert.equal(normalized.visits[0].status,'ACTION_REQUIRED');
 assert.equal(ulbScopeData(normalized).actionTakenTotal,1,'historical action submission survives reopening');
 assert.deepEqual(ulbTeamProgress(normalized).iec,{completed:0,target:1,percent:0},'reopened action remains outstanding');
 for(const change of [{assetId:undefined},{submittedAt:undefined},{wardId:'conflicting'}]){
  const invalid=ulbReportRegister({...source,visits:[v,{...v,id:'invalid',...change}]});
  assert.deepEqual(invalid.failedModules,['sweeping']);
  assert.equal(ulbScopeData(invalid).completedCounts.inspections,null);
  assert.equal(ulbTeamProgress(invalid).si.percent,null);
 }
 assert.equal(ulbTeamProgress({...source,visits:[]}).iec.percent,null);
 const duplicate=ulbReportRegister({...source,visits:[v,v]});assert.equal(duplicate.visits.length,1);
});

test('compact legacy beat drill hydrates every source photo without changing stored records',async()=>{
 const coverage=require('../src/services/inspectionCoverage.ts'),saved=coverage.loadInspectionCoverage,{coverageReportDetail}=require('../src/services/coverageReportDetail.ts');
 const rows=[0,1,2].map(i=>({id:`sweeping:r${i}`,module:'sweeping',assetId:'beat',zoneId:'z1',wardId:'w1',status:'SUBMITTED',submittedAt:'2026-11-05T04:00:00Z',raw:{id:`r${i}`,cityId:'city',payload:{pointIndex:i,photos:[`photo${i}.jpg`]}}}));
 const data=ulbReportRegister({...emptyCoverage(),compact:true,visits:rows});
 coverage.loadInspectionCoverage=async()=>({...emptyCoverage(),visits:rows});
 try{
  const result=await coverageReportDetail({id:'city'},data,data.visits[0],new AbortController().signal);
  assert.deepEqual(result.payload.points.map(p=>p.photo),['photo0.jpg','photo1.jpg','photo2.jpg']);
  assert.equal(rows[0].raw.payload.points,undefined);
  coverage.loadInspectionCoverage=async()=>({...emptyCoverage(),visits:rows.slice(1)});
  await assert.rejects(coverageReportDetail({id:'city'},data,data.visits[0],new AbortController().signal),/unavailable/);
 }finally{coverage.loadInspectionCoverage=saved;}
});

test('Daroga dashboard compares scoped submitted reports with the configured range target, not average officer credit',()=>{
 const source=targetDelivery(official.totals);
 const progress=darogaReportProgress(data,source);
 // Multiple sweeping point rows for a beat/day become one report; toilets remain individual reports.
 assert.equal(progress.completed,5);assert.equal(progress.target,30);
 assert.equal(progress.percent,5/30*100);assert.equal(progress.configuredPercent,20);
 assert.notEqual(progress.percent,source.percent);
 const selected=selectInspectionCoverage(data,['z1'],['w1']);
 const selectedOfficial=applyPerformanceTargets(ulbInspectionSummary(selected,[zones[0]],['w1']),users,['w1']);
 const scoped=darogaReportProgress(selected,targetDelivery(selectedOfficial.totals));
 assert.equal(scoped.completed,3);assert.equal(scoped.target,15);assert.equal(scoped.percent,20);
 assert.equal(darogaReportProgress({...selected,failedModules:['sweeping']},source).percent,null);
 assert.equal(darogaReportProgress(data,{...source,available:false}).percent,null);
 assert.equal(darogaReportProgress(data,{...source,target:0}).percent,null);
 assert.equal(darogaReportProgress(data,{...source,target:2}).percent,250);
});

test('ULB sweeping counts submitted beat/day reports instead of point rows or Drafts',()=>{
 const base={module:'sweeping',zoneId:'z1',wardId:'w1',status:'SUBMITTED',submittedAt:'2026-11-05T04:00:00Z'};
 const sample={...emptyCoverage(),inventoryAvailable:true,modules:['sweeping','toilets'],visits:[
  ...[3,4,5].flatMap((points,beat)=>Array.from({length:points},(_,i)=>({...base,id:`b${beat}-p${i}`,assetId:`b${beat}`}))),
  {...base,id:'modern',assetId:'modern',raw:{payload:{points:[{photo:'a'},{photo:'b'},{photo:'c'}]}}},
  {...base,id:'draft',assetId:'draft',status:'DRAFT'},
  {...base,id:'other-module',assetId:'toilet',module:'toilets'},
  {...base,id:'next-day',assetId:'b0',submittedAt:'2026-11-05T19:00:00Z'},
  {...base,id:'other-ward',assetId:'b4',wardId:'w2'},
 ]};
 assert.equal(submittedBeatReportCount(sample),6);
 assert.equal(submittedBeatReportCount(sample,'z1','w1'),5);
 assert.equal(submittedBeatReportCount({...sample,failedModules:['sweeping']}),null);
 assert.equal(submittedBeatReportCount({...sample,visits:[{...base,id:'missing-date',assetId:'b0',submittedAt:undefined}]}),null);
 assert.equal(submittedBeatReportCount({...sample,visits:[{...base,id:'missing-beat'}]}),null);
 assert.equal(submittedBeatReportCount({...sample,visits:[]}),0);
 const {ModuleDelivery}=require('../src/pages/commissioner/ModuleDelivery.tsx');
 const props={modules:['sweeping'],pulse:{official:null},data:sample,loading:false,zone:'z1',ward:'w1',onInspect:()=>{}};
 const ulb=renderToStaticMarkup(React.createElement(ModuleDelivery,{...props,beatReports:true}));
 assert.match(ulb,/Total beat reports<\/dt><dd data-metric="inspections">5<\/dd>/);
 assert.match(ulb,/point photos are not separate reports/);
 const commissioner=renderToStaticMarkup(React.createElement(ModuleDelivery,props));
 assert.match(commissioner,/Total inspection records<\/dt><dd data-metric="inspections">15<\/dd>/);
});

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
