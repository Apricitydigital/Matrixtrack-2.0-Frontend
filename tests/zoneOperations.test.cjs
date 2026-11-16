const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const {emptyZoneOperations,zoneOperationalStats}=require('../src/services/zoneOperations.ts');
const {buildZoneRankings,zoneHighlights}=require('../src/services/zoneRanking.ts');
const {ZoneOperationsSummary,ZoneModuleStats}=require('../src/pages/commissioner/ZoneOperationsSummary.tsx');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function fixture(){return {...emptyZoneOperations('fixture'),states:{inspections:'ready',targets:'ready',attendance:'ready',issues:'ready'},attendance:{hasData:true,present:35,absent:5,totalRecords:40},data:{from:'2026-11-15',to:'2026-11-16',inventoryAvailable:true,failedModules:[],errors:[],modules:['sweeping'],assets:[{id:'beat-a',module:'sweeping',zoneId:'z1',wardId:'w1'},{id:'beat-b',module:'sweeping',zoneId:'z2',wardId:'w2'}],visits:[{id:'report1',module:'sweeping',assetId:'beat-a',zoneId:'z1',wardId:'w1',status:'APPROVED',submittedAt:'2026-11-15T10:00:00Z'},{id:'report2',module:'sweeping',assetId:'beat-a',zoneId:'z1',wardId:'w1',status:'SUBMITTED',submittedAt:'2026-11-16T10:00:00Z'},{id:'report3',module:'sweeping',assetId:'beat-b',zoneId:'z2',wardId:'w2',status:'DRAFT',submittedAt:'2026-11-16T10:00:00Z'}]}};}

test('operational totals load independently of scores, retain drafts and scope zones and wards exactly',()=>{
 const source=fixture(),city=zoneOperationalStats(source),zone=zoneOperationalStats(source,{zone:'z1'}),ward=zoneOperationalStats(source,{ward:'w2'});
 assert.equal(city.totalRecords,3);assert.equal(city.achieved,2);assert.equal(city.drafts,1);assert.equal(city.totalEntities,2);assert.equal(city.uniqueEntities,1);assert.equal(city.coveragePercent,50);
 assert.equal(zone.achieved,2);assert.equal(zone.target.target,2);assert.equal(zone.pendingReview,1);assert.equal(zone.clean.siClean,1);assert.equal(zone.uniqueEntities,1);
 assert.equal(ward.achieved,0);assert.equal(ward.totalRecords,1);assert.equal(ward.drafts,1);assert.equal(ward.pendingReview,1);
});

test('targets preserve ADMIN source credit while report intake uses actual submitted records',()=>{
 const source=fixture();source.targets=[{source:'ADMIN',module:'SWEEPING',wardId:'w1',zoneId:'z1',target:8,credit:1},{source:'DEFAULT',module:'SWEEPING',wardId:'w2',zoneId:'z2',target:2,credit:0}];
 const city=zoneOperationalStats(source),zone=zoneOperationalStats(source,{zone:'z1'}),other=zoneOperationalStats(source,{zone:'z2'});
 assert.equal(city.target.target,10);assert.equal(city.target.completed,2);assert.equal(zone.target.target,8);assert.equal(zone.target.completed,2);assert.equal(zone.target.remaining,6);assert.equal(zone.target.fallback,false);assert.equal(other.target.target,2);assert.equal(other.target.fallback,true);
 source.states.targets='loading';assert.equal(zoneOperationalStats(source).target.target,null);
 source.states.targets='error';assert.equal(zoneOperationalStats(source).target.target,null);
});

test('failed module and attendance sources never turn unavailable values into reassuring zeroes',()=>{
 const failed=emptyZoneOperations('failed');failed.states.inspections='error';assert.equal(zoneOperationalStats(failed).achieved,null);assert.equal(zoneOperationalStats(failed).outcomes.total,null);assert.equal(zoneOperationalStats(failed).actions.totalRequired,null);
 const source=fixture();source.data.failedModules=['sweeping'];source.states.attendance='error';source.attendance=null;
 const stats=zoneOperationalStats(source);assert.equal(stats.achieved,null);assert.equal(stats.pendingReview,null);assert.equal(stats.clean,null);
 const html=renderToStaticMarkup(React.createElement(ZoneOperationsSummary,{source,scope:{},label:'All zones'}));assert.match(html,/Attendance source unavailable/);assert.doesNotMatch(html,/No attendance sheet received/);
 const modules=renderToStaticMarkup(React.createElement(ZoneModuleStats,{source,scope:{},label:'All zones'}));assert.match(modules,/SI not clean/);assert.match(modules,/Pending review/);
});

test('reconciliation buckets are excluded and provisional leaders do not acquire official ranks',()=>{
 const zones=[{id:'z1',name:'Zone 1'},{id:'z2',name:'Zone 2'}];
 const wards=[{id:'a',name:'Ward 1',zoneId:'z1'},{id:'b',name:'Ward 2',zoneId:'z1'},{id:'c',name:'Ward 3',zoneId:'z2'},{id:'bucket',name:'Not Matched Employees',zoneId:'z1'}];
 const rows=buildZoneRankings(zones,wards,[{wardId:'a',finalScore:80},{wardId:'c',finalScore:20}]);
 assert.equal(rows.find(row=>row.zone.id==='z1').total,2);assert.equal(rows.find(row=>row.zone.id==='z1').rank,null);
 const leaders=zoneHighlights(rows,true);assert.equal(leaders.best[0].zone.id,'z1');assert.equal(leaders.attention[0].zone.id,'z2');assert.equal(zoneHighlights(rows).best[0].zone.id,'z2');
});

test('inspection reads settle independently and ULB area views never call Commissioner-only summaries',async()=>{
 const service=require('../src/services/zoneOperations.ts'),api=require('../src/services/api.ts'),coverage=require('../src/services/inspectionCoverage.ts'),{matrixStore}=require('../src/services/store.ts');
 const originals={useState:React.useState,useEffect:React.useEffect,api:api.api,reader:coverage.loadInspectionCoverage,user:matrixStore.currentUser};
 const jobs=[],effects=[],values=[];let cursor=0,cleanup;
 React.useState=initial=>{const index=cursor++;if(!(index in values))values[index]=typeof initial==='function'?initial():initial;return[values[index],value=>values[index]=typeof value==='function'?value(values[index]):value];};
 React.useEffect=effect=>effects.push(effect);matrixStore.currentUser={role:'ULB_OFFICER',cityId:'city'};
 api.api=(path,options)=>new Promise((resolve,reject)=>jobs.push({path,options,resolve,reject}));
 coverage.loadInspectionCoverage=async()=>fixture().data;
 const render=()=>{cursor=0;return service.useZoneOperations({id:'city',enabledModules:['sweeping']},'2026-11-15','2026-11-16',0,'z1','w1');};
 try{
  assert.equal(render().states.inspections,'loading');cleanup=effects.shift()();await new Promise(setImmediate);
  assert.ok(jobs.some(job=>job.path.includes('zoneId=z1')&&job.path.includes('wardId=w1')));
  assert.ok(jobs.every(job=>!job.path.includes('/commissioner/')&&!job.path.includes('zone-export')&&!job.path.includes('/ulb/summary')));
  const targets=jobs.find(job=>job.path.includes('daroga-performance'));targets.reject(Error('Target service offline'));await new Promise(setImmediate);
  const state=render();assert.equal(state.states.inspections,'ready');assert.equal(state.states.targets,'error');assert.equal(state.states.attendance,'loading');assert.equal(state.issues,null);assert.equal(state.states.issues,'ready');assert.equal(zoneOperationalStats(state,{ward:'w1'}).achieved,2);
  cleanup();jobs.find(job=>job.path.includes('attendance/dashboard')).resolve({hasData:true,summary:{present:99},dailyTrend:[]});await new Promise(setImmediate);assert.equal(render().attendance,null,'aborted responses must not update state');
 }finally{cleanup?.();React.useState=originals.useState;React.useEffect=originals.useEffect;api.api=originals.api;coverage.loadInspectionCoverage=originals.reader;matrixStore.currentUser=originals.user;}
});
