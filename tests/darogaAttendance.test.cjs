const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,f);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const api=require('../src/services/api.ts'),{loadDarogaAttendance}=require('../src/services/darogaAttendance.ts'),{darogaOverall}=require('../src/services/darogaBreakdown.ts');
const from='2026-11-16',to=from;
test('no selected-date upload never requests the latest uploaded day and grants no attendance credit',async()=>{
 const saved=api.api,calls=[];api.api=async(path)=>{calls.push(path);return{hasData:false,range:{from,to},allEmployees:[]};};
 try{const result=await loadDarogaAttendance('city',from,to,new AbortController().signal);assert.equal(result.status,'no_data');assert.deepEqual(result.rows,[]);assert.equal(calls.length,1);assert.match(calls[0],/from=2026-11-16&to=2026-11-16/);assert.equal(darogaOverall({inspection:0,cleaned:null,attendance:null}).score,0);}finally{api.api=saved;}
});
test('null-range no-data responses are valid but older-day rows are rejected',async()=>{
 const saved=api.api;try{api.api=async()=>({hasData:false,range:null});assert.equal((await loadDarogaAttendance('city',from,to,new AbortController().signal)).status,'no_data');api.api=async()=>({hasData:true,range:{from:'2026-11-15',to:'2026-11-15'},allEmployees:[{totalDays:1,presentDays:1}]});await assert.rejects(loadDarogaAttendance('city',from,to,new AbortController().signal),/selected dates/);}finally{api.api=saved;}
});
test('selected-period attendance is preserved and read failures do not trigger any fallback',async()=>{
 const saved=api.api;let calls=0;try{const rows=[{matrixTrackUserId:'d',totalDays:2,presentDays:1,absentDays:1}];api.api=async()=>({hasData:true,range:{from,to},allEmployees:rows});assert.deepEqual((await loadDarogaAttendance('city',from,to,new AbortController().signal)).rows,rows);api.api=async()=>{calls++;throw Error('offline');};await assert.rejects(loadDarogaAttendance('city',from,to,new AbortController().signal),/offline/);assert.equal(calls,1);}finally{api.api=saved;}
});
test('overall table shows no attendance data and excludes yesterday scores immediately when dates change',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),coverage=require('../src/services/useInspectionCoverage.ts'),{emptyCoverage}=require('../src/services/inspectionCoverage.ts'),{matrixStore}=require('../src/services/store.ts'),{DarogaPerformanceTabs}=require('../src/pages/commissioner/DarogaPerformanceTabs.tsx');
 const saved={useState:React.useState,useEffect:React.useEffect,useMemo:React.useMemo,coverage:coverage.useInspectionCoverage,range:matrixStore.getDateRange};
 matrixStore.getDateRange=()=>({from,to});coverage.useInspectionCoverage=()=>({data:emptyCoverage(),loading:false});
 const props={city:{id:'city',enabledModules:[]},module:'ALL',rows:[{user:{id:'d',name:'Daroga',role:'SUPERVISOR',assignedWardIds:[]},stat:{performance:0}}],tab:'overall',onTab:()=>{},wards:[],zones:[]};
 function render(read){let index=0;React.useState=initial=>{index++;return[index===1?'':index===2?read:typeof initial==='function'?initial():initial,()=>{}];};React.useEffect=()=>{};React.useMemo=fn=>fn();try{return DarogaPerformanceTabs(props);}finally{React.useState=saved.useState;React.useEffect=saved.useEffect;React.useMemo=saved.useMemo;}}
 try{let html=renderToStaticMarkup(render({key:JSON.stringify(['city',from,to,matrixStore.loadRevision]),rows:[],status:'no_data',period:from}));assert.match(html,/No attendance data/);assert.match(html,/0.0%/);assert.doesNotMatch(html,/100.0%|33.3%/);html=renderToStaticMarkup(render({key:'yesterday',rows:[{matrixTrackUserId:'d',totalDays:1,presentDays:1}],status:'ready',period:'2026-11-15'}));assert.match(html,/Loading/);assert.doesNotMatch(html,/100.0%/);
 const start='2026-10-22',end='2026-11-16';matrixStore.getDateRange=()=>({from:start,to:end});
 const partial={key:JSON.stringify(['city',start,end,matrixStore.loadRevision]),rows:[{matrixTrackUserId:'d',totalDays:5,presentDays:5,absentDays:0}],status:'ready',period:`${start} to ${end}`};
 html=renderToStaticMarkup(render(partial));assert.match(html,/19.2%/);assert.match(html,/5 \/ 26 days; 21 missing/);assert.doesNotMatch(html,/100.0%/);
 props.tab='attendance';html=renderToStaticMarkup(render(partial));assert.match(html,/Selected days/);assert.match(html,/Missing days/);assert.match(html,/<td>26<\/td>/);assert.match(html,/<td>21<\/td>/);
 }finally{coverage.useInspectionCoverage=saved.coverage;matrixStore.getDateRange=saved.range;}
});


test('partial attendance uploads cannot earn full-period Daroga attendance marks',()=>{
 const {darogaAttendance}=require('../src/services/darogaBreakdown.ts');
 const user={id:'d',name:'Daroga'},rows=[{matrixTrackUserId:'d',totalDays:5,presentDays:5,absentDays:0}];
 const result=darogaAttendance(user,[],rows,{from:'2026-10-22',to:'2026-11-16'});
 assert.equal(result.selectedDays,26);assert.equal(result.recordedDays,5);
 assert.equal(result.presentDays,5);assert.equal(result.absentDays,0);assert.equal(result.missingDays,21);
 assert.equal(result.score,5/26*100);
 assert.ok(Math.abs(darogaOverall({inspection:80,cleaned:80,attendance:result.score}).score-(64+result.score*0.2))<1e-10);
});

test('full-period, single-day, absent, unmatched and invalid attendance remain distinct',()=>{
 const {darogaAttendance}=require('../src/services/darogaBreakdown.ts');
 const user={name:'Daroga'},period={from:'2026-10-31',to:'2026-11-01'};
 const read=(totalDays,presentDays,absentDays,range=period)=>darogaAttendance(user,[],[{employeeName:'Daroga',totalDays,presentDays,absentDays}],range);
 assert.equal(read(2,2,0).score,100);assert.equal(read(2,1,1).score,50);
 assert.equal(read(1,1,0,{from,to}).score,100);assert.equal(read(1,0,1,{from,to}).score,0);
 assert.equal(read(1,0,1).missingDays,1);assert.equal(read(0,0,0).score,null);
 assert.equal(darogaAttendance(user,[],[],period),null);
 assert.equal(read(3,3,0),null);assert.equal(read(2,3,0),null);
 assert.equal(read(1,1,0,{from:to,to:'2026-11-15'}),null);
});
