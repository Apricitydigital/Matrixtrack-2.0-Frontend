const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,f);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const {siPerformance}=require('../src/services/siPerformance.ts'),{performanceForRole}=require('../src/services/performanceModel.ts');
const stat={targetReviews:{counted:8,target:10},onTime:7,late:1,overdue:2,timingUnavailable:0};
test('SI agreed 50/30/20 formula gives 79 and counts late and overdue against timeliness',()=>{
 const result=siPerformance(stat,{presentDays:9,recordedDays:10,absentDays:1});
 assert.equal(result.score,79);assert.equal(result.reviews,80);assert.equal(result.timing,70);assert.equal(result.attendance,90);assert.equal(result.weightUsed,100);
 assert.equal(siPerformance({...stat,onTime:0,late:0,overdue:10},null).timing,0);
});
test('missing attendance is excluded, actual zero attendance retains its weight, and source failures do not score',()=>{
 assert.equal(siPerformance(stat,null).score,76.25);
 assert.equal(siPerformance(stat,{presentDays:0,recordedDays:10,absentDays:10}).score,61);
 assert.equal(siPerformance(stat,null,true).score,null);
 assert.equal(siPerformance({...stat,availability:'error'},{presentDays:1,recordedDays:1,absentDays:0}).score,null);
 assert.equal(siPerformance({},null).score,null);
 assert.equal(siPerformance({...stat,targetReviews:{target:10,counted:0},onTime:0,late:0,overdue:10},null).score,0);
});
test('unknown timing is not a zero, in-progress work is excluded, and excess review credit is capped',()=>{
 assert.equal(siPerformance({...stat,timingUnavailable:1},null).timing,null);
 assert.equal(siPerformance({...stat,inProgress:100},null).timing,70);
 assert.equal(siPerformance({...stat,targetReviews:{target:10,counted:20}},null).reviews,100);
 assert.equal(siPerformance({...stat,onTime:0,late:0,overdue:0},null).timing,null);
});
test('module target and timing use the same selected module; approve versus reject earns no bonus',()=>{
 const raw={target:{effectiveTarget:20,counted:18,modules:{SWEEPING:{effectiveTarget:10,counted:8},TOILET:{effectiveTarget:10,counted:10}}},moduleStats:{SWEEPING:{onTime:2,late:3,overdue:5,inProgress:0,timingUnavailable:0},TOILET:{onTime:10,late:0,overdue:0}},targetBreakdown:{SWEEPING:{approved:0,rejected:8,pending:2}}};
 const selected=performanceForRole(raw,'QC','SWEEPING');assert.equal(siPerformance(selected,null).score,57.5);
 const changed={...selected,targetReviews:{...selected.targetReviews,approved:8,rejected:0}};assert.deepEqual(siPerformance(changed,null),siPerformance(selected,null));
 assert.equal(siPerformance(performanceForRole(raw,'QC','TOILET'),null).score,100);
});
test('SI page renders component scores, no-data notice, and opens personal attendance in its detail panel',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{SiPerformance}=require('../src/pages/commissioner/SiPerformance.tsx'),{matrixStore}=require('../src/services/store.ts');
 const user={id:'si',name:'Demo SI',role:'QC',assignedWardIds:[]},breakdown=siPerformance(stat,null),row={user,stat:{...stat,performance:breakdown.score},att:null,breakdown};
 const props={model:{rows:[row],attendance:{key:'x',rows:[],status:'no_data'}},rawStats:{},module:'ALL',wards:[],zones:[],loading:false};
 const savedState=React.useState,savedRange=matrixStore.getDateRange;matrixStore.getDateRange=()=>({from:'2026-11-16',to:'2026-11-16'});
 try{
  const html=renderToStaticMarkup(React.createElement(SiPerformance,props));assert.match(html,/76.3%/);assert.match(html,/No attendance uploaded/);assert.match(html,/Review targets/);assert.match(html,/Timeliness/);assert.match(html,/Open SI performance for Demo SI/);
  let index=0;React.useState=initial=>[++index===1?'si':index===3?'attendance':typeof initial==='function'?initial():initial,()=>{}];
  const open=SiPerformance(props);React.useState=savedState;const detail=renderToStaticMarkup(open);assert.match(detail,/No attendance data/);assert.match(detail,/Only this SI/);assert.match(detail,/Recorded days/);
 }finally{React.useState=savedState;matrixStore.getDateRange=savedRange;}
});
