const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,f);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {matrixStore}=require('../src/services/store.ts'),{useOfficerAttendance}=require('../src/services/useOfficerAttendance.ts'),{IecAttendance}=require('../src/pages/commissioner/IecAttendance.tsx');
const range={from:'2026-10-22',to:'2026-11-16'},user={id:'iec',name:'Demo IEC'},stat={performance:25,onTime:1,late:1,overdue:2,due:4};
function withModel(read,fn,hook=useOfficerAttendance){
 const saved={range:matrixStore.getDateRange,state:React.useState,effect:React.useEffect};
 matrixStore.getDateRange=()=>range;React.useState=()=>[read,()=>{}];React.useEffect=()=>{};
 let model;try{model=hook('city',[{user,stat}],true,0);}finally{React.useState=saved.state;React.useEffect=saved.effect;}
 try{return fn(model);}finally{matrixStore.getDateRange=saved.range;}
}
const read=(status,rows=[])=>({key:JSON.stringify(['city',range.from,range.to,matrixStore.loadRevision,0]),status,rows});
test('IEC shows selected-period attendance and missing days without changing action score',()=>{
 withModel(read('ready',[{matrixTrackUserId:'iec',totalDays:5,presentDays:5,absentDays:0}]),model=>{
  assert.equal(model.rows[0].att.score,5/26*100);assert.equal(model.rows[0].att.missingDays,21);
  assert.equal(model.rows[0].stat.performance,25);
  const html=renderToStaticMarkup(React.createElement(IecAttendance,{model}));
  assert.match(html,/19.2%/);assert.match(html,/Missing days/);assert.match(html,/<td>26<\/td>/);assert.match(html,/<td>21<\/td>/);assert.doesNotMatch(html,/100.0%/);
 });
});
test('IEC keeps no data, unavailable, unmatched and stale-period attendance distinct',()=>{
 for(const [state,label] of [['no_data','No attendance data'],['error','Unavailable'],['ready','Not matched']]){
  withModel(read(state),model=>{assert.equal(model.rows[0].att,null);assert.match(renderToStaticMarkup(React.createElement(IecAttendance,{model})),new RegExp(label));});
 }
 withModel({...read('ready',[{matrixTrackUserId:'iec',totalDays:1,presentDays:1}]),key:'old-period'},model=>{
  assert.equal(model.attendance.status,'loading');assert.equal(model.rows[0].att,null);
  const html=renderToStaticMarkup(React.createElement(IecAttendance,{model}));assert.match(html,/Loading/);assert.doesNotMatch(html,/100.0%/);
 });
});

const {iecPerformance}=require('../src/services/iecPerformance.ts');
test('IEC overall uses 80 percent on-time actions and 20 percent full-period attendance',()=>{
 const {useIecPerformance}=require('../src/services/useIecPerformance.ts'),{IecPerformance}=require('../src/pages/commissioner/IecPerformance.tsx'),{performanceBasis}=require('../src/services/performanceModel.ts');
 withModel(read('ready',[{matrixTrackUserId:'iec',totalDays:5,presentDays:5,absentDays:0}]),model=>{
  const row=model.rows[0];assert.equal(row.breakdown.actions,25);assert.equal(row.breakdown.attendance,5/26*100);
  assert.ok(Math.abs(row.stat.performance-(20+5/26*20))<1e-10);assert.equal(row.breakdown.weightUsed,100);
  assert.equal(performanceBasis(row.stat,'ACTION_OFFICER').title,'IEC overall (80/20)');
  const html=renderToStaticMarkup(React.createElement(IecPerformance,{model,rawStats:{},module:'ALL',wards:[],zones:[],loading:false}));
  assert.match(html,/23.8%/);assert.match(html,/25.0%/);assert.match(html,/19.2%/);assert.match(html,/5 \/ 26 days; 21 missing/);
  assert.match(html,/On-time actions \(80%\)/);assert.match(html,/Attendance \(20%\)/);
 },useIecPerformance);
});
test('IEC zero scores retain weight; missing components, in-progress work and unavailable sources stay distinct',()=>{
 const stats={onTime:3,late:1,overdue:1,inProgress:50};
 const att={presentDays:0,recordedDays:5,selectedDays:26,missingDays:21,absentDays:5,score:0};
 assert.equal(iecPerformance(stats,att).score,48);assert.equal(iecPerformance(stats,null).score,60);
 assert.equal(iecPerformance(stats,att).actions,60);
 assert.equal(iecPerformance({onTime:0,late:0,overdue:0},att).score,0);
 assert.equal(iecPerformance({onTime:0,late:0,overdue:0},null).score,null);
 assert.equal(iecPerformance({...stats,timingUnavailable:1},att).actions,null);
 assert.equal(iecPerformance({...stats,availability:'error'},att).score,null);
 assert.equal(iecPerformance(stats,att,true).score,null);
 const {performanceForRole}=require('../src/services/performanceModel.ts');
 const filtered=performanceForRole({moduleStats:{SWEEPING:{onTime:0,late:2,overdue:3,timingUnavailable:0},TOILET:{onTime:10,late:0,overdue:0}}},'ACTION_OFFICER','SWEEPING');
 assert.equal(iecPerformance(filtered,att).actions,0);
});
