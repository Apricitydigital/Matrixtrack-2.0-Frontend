const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const coverageHook=require('../src/services/useInspectionCoverage.ts'),commissioner=require('../src/services/commissioner.ts');
const {CommissionerHome}=require('../src/pages/commissioner/CommissionerHome.tsx');
const {CommissionerWorkspace}=require('../src/pages/commissioner/CommissionerWorkspace.tsx');
const {MultiSelectDropdown}=require('../src/components/common/MultiSelectDropdown.tsx');
const {emptyCoverage}=require('../src/services/inspectionCoverage.ts');
const {matrixStore}=require('../src/services/store.ts');
const {inspectionDrillFilters}=require('../src/services/inspectionPeriod.ts');
const {wardFocusPreset}=require('../src/services/wardFocusPreset.ts');
const {ulbReportRegister}=require('../src/services/ulbReportRegister.ts');
const {selectInspectionCoverage}=require('../src/services/inspectionCoverage.ts');
const {WardReportProgress}=require('../src/pages/commissioner/WardReportProgress.tsx');
const {UlbDashboard}=require('../src/pages/ulbofficer/UlbDashboard.tsx');
const {Drawer}=require('../src/components/common/Drawer.tsx');
const {OperationalFilters}=require('../src/components/common/OperationalFilters.tsx');
const {ModuleDelivery}=require('../src/pages/commissioner/ModuleDelivery.tsx');
const {ReportsExports}=require('../src/pages/commissioner/ReportsExports.tsx');
const {ReportDataReview}=require('../src/pages/commissioner/ReportDataReview.tsx');
const {ZoneWardDetails}=require('../src/pages/commissioner/ZoneWardDetails.tsx');
const pairs=[[1,[12,10,11,13]],[2,[20,4,6]],[3,[23,33]],[4,[44,52]],[5,[38,40]],[6,[35,48]]];
const zones=[...pairs.map(([n])=>({id:`z${n}`,cityId:'c',zoneNumber:n,name:`Zone ${n}`})),{id:'z7',cityId:'c',zoneNumber:7,name:'Zone 7'}];
const wards=[...pairs.flatMap(([z,ns])=>ns.map(n=>({id:`w${n}`,cityId:'c',zoneId:`z${z}`,wardNumber:n,name:`Ward ${n}`}))),{id:'extra',cityId:'c',zoneId:'z1',wardNumber:99,name:'Ward 99'},{id:'outside',cityId:'c',zoneId:'z7',wardNumber:100,name:'Ward 100'}];
const city={id:'c',name:'City',enabledModules:['sweeping','toilets']};
const assets=wards.flatMap(w=>['sweeping','toilets'].flatMap(module=>Array.from({length:module==='sweeping'?10:5},(_,i)=>({id:`${module}-${w.id}-${i}`,module,zoneId:w.zoneId,wardId:w.id,name:`${module} ${w.name} ${i}`}))));
const visit=(w,module,id,status,day=5,index=0)=>({id:`${module}:${id}`,module,assetId:`${module}-${w.id}-0`,zoneId:w.zoneId,wardId:w.id,status,submittedAt:`2026-11-0${day}T04:00:00Z`,raw:{id,cityId:'c',status,payload:{pointIndex:index,photos:[`${id}.jpg`]}}});
const statuses=['SUBMITTED','APPROVED','REJECTED','ACTION_REQUIRED','ACTION_TAKEN'];
const visits=wards.flatMap((w,i)=>[...Array.from({length:3},(_,p)=>visit(w,'sweeping',`${w.id}-${p}`,statuses[i%5],5,p)),visit(w,'toilets',`${w.id}-toilet`,i===0?'DRAFT':'APPROVED')]);
visits.push(visit(wards[0],'sweeping','next-day','SUBMITTED',6));
visits.push({...visit(wards[0],'sweeping','draft','DRAFT'),assetId:'sweeping-w12-1'});
const data={...emptyCoverage(),from:'2026-11-05',to:'2026-11-07',modules:city.enabledModules,inventoryAvailable:true,assets,visits};
const users={u:{performance:2.4,rows:wards.flatMap(w=>['SWEEPING','TOILET'].map(module=>({wardId:w.id,zoneName:zones.find(z=>z.id===w.zoneId).name,module,source:'ADMIN',target:module==='SWEEPING'?6:3,credit:0,targetPercent:20,targetBasis:'current'})))}};
const props={city,zones,wards,reports:[],currentUser:{id:'comm',role:'COMMISSIONER'},noticeRequest:0,onNavigate:()=>{},onSelectReport:()=>{},onInspect:()=>{},onNoticeCount:()=>{}};

function find(node,predicate){if(!node||typeof node!=='object')return undefined;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child,predicate);if(result)return result;}}
function harness(){
 const originals={useState:React.useState,useEffect:React.useEffect,useRef:React.useRef,useMemo:React.useMemo,useCallback:React.useCallback};
 const savedCoverage=coverageHook.useInspectionCoverage,savedPulse=commissioner.useCityPulse,savedRange=matrixStore.getDateRange,slots=[];
 coverageHook.useInspectionCoverage=()=>({loading:false,data});
 commissioner.useCityPulse=()=>({pending:0,errors:{},official:{totals:{target:99999},zones:[],modules:{}},performance:{SUPERVISOR:users,QC:{si:{performance:99}},ACTION_OFFICER:{iec:{performance:99}}},rankings:[]});
 matrixStore.getDateRange=()=>({from:data.from,to:data.to});
 return {render(component=CommissionerHome,values=props){let index=0;React.useState=initial=>{const at=index++;if(!(at in slots))slots[at]=typeof initial==='function'?initial():initial;return [slots[at],value=>{slots[at]=typeof value==='function'?value(slots[at]):value;}];};React.useEffect=()=>{};React.useRef=()=>({current:null});React.useMemo=fn=>fn();React.useCallback=fn=>fn;
  try{return component(values);}finally{Object.assign(React,originals);}},close(){Object.assign(React,originals);coverageHook.useInspectionCoverage=savedCoverage;commissioner.useCityPulse=savedPulse;matrixStore.getDateRange=savedRange;}};
}

test('Commissioner 6-zone/15-ward shortcut reconciles configured targets, grouped reports and team progress',()=>{
 const h=harness();try{
  let tree=h.render();const zonesFilter=find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Zones');
  assert.equal(zonesFilter.props.quickSelection.label,'15 wards \u00b7 6 zones');zonesFilter.props.quickSelection.onSelect();
  tree=h.render();const html=renderToStaticMarkup(tree);
  assert.equal(find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Zones').props.quickSelection.active,true);
  assert.match(html,/6 zones selected/);assert.match(html,/15 wards selected/);assert.doesNotMatch(html,/>Ward 99<|>Ward 100<|>Zone 7</);
  assert.match(html,/data-target-progress="target">135</);assert.match(html,/data-target-progress="received">30</);assert.match(html,/data-target-progress="remaining">105</);
  assert.match(html,/data-metric="overview-inspections">30</);assert.match(html,/data-team-progress="SUPERVISOR">22.2%/);
  assert.match(html,/data-team-progress="QC">86.7%/);assert.match(html,/data-team-progress="ACTION_OFFICER">50%/);
  assert.doesNotMatch(html,/avg\. score|Daroga scoring credit:|99%/);
  assert.match(html,/Total beat reports/);assert.match(html,/20% configured/);assert.match(html,/Ward performance/);
 }finally{h.close();}
});

test('module selection, period target and report drill retain the same selected scope; Clear resets all filters',()=>{
 const h=harness(),drills=[];try{
  let tree=h.render(CommissionerHome,{...props,onInspect:(...args)=>drills.push(args)});
  find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Zones').props.quickSelection.onSelect();
  tree=h.render(CommissionerHome,{...props,onInspect:(...args)=>drills.push(args)});
  find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.onChange(['sweeping']);
  tree=h.render(CommissionerHome,{...props,onInspect:(...args)=>drills.push(args)});let html=renderToStaticMarkup(tree);
  assert.match(html,/data-target-progress="target">90</);assert.match(html,/data-target-progress="received">16</);assert.match(html,/data-target-progress="remaining">74</);
  assert.match(html,/data-team-progress="SUPERVISOR">17.8%/);assert.doesNotMatch(html,/data-module="toilets"/);
  find(tree,n=>n.props?.className==='target-kpi'&&find(n,c=>c.props?.['data-metric']==='overview-inspections')).props.onClick();
  const preset=wardFocusPreset('c',zones,wards);assert.deepEqual(drills[0],[['sweeping'],'inspections_completed',preset.zoneIds,preset.wardIds]);
  const filters=inspectionDrillFilters(drills[0][2],drills[0][3],drills[0][0],drills[0][1]);
  assert.deepEqual(filters.moduleIds,['sweeping']);assert.equal(filters.moduleId,'all');assert.equal(filters.status,'inspections_completed');
  find(tree,n=>n.type==='button'&&n.props.children==='Clear filters').props.onClick();tree=h.render();
  for(const label of ['Zones','Wards','Modules'])assert.deepEqual(find(tree,n=>n.type===MultiSelectDropdown&&n.props.label===label).props.selected,[]);
 }finally{h.close();}
});

test('Commissioner report register uses the same grouped reports, including all source photos',()=>{
 const h=harness();try{
  const preset=wardFocusPreset('c',zones,wards);
  const filters=inspectionDrillFilters(preset.zoneIds,preset.wardIds,['sweeping'],'inspections_completed');
  const tree=h.render(CommissionerWorkspace,{city,zones,wards,users:[],reports:[],onSelectReport:()=>{},initialFilters:filters});
  const html=renderToStaticMarkup(tree);
  assert.match(html,/16 matching \/ 36 period reports/);
  assert.match(html,/3 images/);assert.doesNotMatch(html,/>Ward 99<|>Ward 100</);
 }finally{h.close();}
});

test('ward table uses the configured range target; fallback and unavailable targets remain distinct',()=>{
 const selected=selectInspectionCoverage(ulbReportRegister(data),['z1'],['w12']);
 const args={data:selected,wards:[wards[0]],targetRows:users.u.rows,targetsReady:true,loading:false,onInspect:()=>{}};
 const html=renderToStaticMarkup(React.createElement(WardReportProgress,args));
 assert.match(html,/data-ward-metric="target">9</);assert.match(html,/data-ward-metric="received"><button>2</);
 assert.match(html,/data-ward-metric="remaining">7</);assert.match(html,/data-ward-metric="progress">22.2%</);
 const fallback=renderToStaticMarkup(React.createElement(WardReportProgress,{...args,targetRows:[]}));
 assert.match(fallback,/data-ward-metric="target">45</);
 const unavailable=renderToStaticMarkup(React.createElement(WardReportProgress,{...args,targetsReady:false}));
 assert.match(unavailable,/data-ward-metric="target">—</);assert.match(unavailable,/data-ward-metric="remaining">—</);
 assert.match(unavailable,/data-ward-metric="received"><button>2</);
});

test('an incomplete module cannot become a zero score and does not block another selected module',()=>{
 const h=harness();try{
  coverageHook.useInspectionCoverage=()=>({loading:false,data:{...data,visits:[...data.visits,{...data.visits[0],id:'missing-day',submittedAt:undefined}]}});
  let tree=h.render();find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Zones').props.quickSelection.onSelect();
  tree=h.render();let html=renderToStaticMarkup(tree);
  assert.match(html,/data-metric="overview-inspections">—</);assert.match(html,/data-team-progress="SUPERVISOR">—</);
  find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.onChange(['toilets']);
  tree=h.render();html=renderToStaticMarkup(tree);
  assert.match(html,/data-target-progress="target">45</);assert.match(html,/data-target-progress="received">14</);
  assert.match(html,/data-team-progress="SUPERVISOR">31.1%/);
 }finally{h.close();}
});

test('ULB report drawer filters modules together with zone/ward and offers only the clicked module scope',()=>{
 const h=harness(),ulbProps={...props,currentUser:{id:'ulb',role:'ULB_OFFICER'},onInspectZone:()=>{},onNoticeHandled:()=>{}};
 const render=()=>h.render(UlbDashboard,ulbProps),drawer=tree=>find(tree,n=>n.type===Drawer&&n.props.isOpen);
 try{
  let tree=render();find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children)[0]==='All inspection reports').props.onClick();
  tree=render();let details=drawer(tree);assert.ok(details);
  const modules=find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules');
  assert.deepEqual(modules.props.options.map(([id])=>id),['sweeping','toilets']);
  modules.props.onChange(['toilets']);tree=render();details=drawer(tree);
  let html=renderToStaticMarkup(details);assert.match(html,/17 inspection records/);
  assert.doesNotMatch(html,/>Sweeping<\/td>/);
  find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Wards').props.onChange(['w12']);
  tree=render();details=drawer(tree);html=renderToStaticMarkup(details);
  assert.match(html,/1 inspection records/);
  find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Zones').props.onChange(['z2']);
  tree=render();details=drawer(tree);
  assert.deepEqual(find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Wards').props.selected,[]);
  assert.deepEqual(find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.selected,['toilets']);
  // A module card cannot be widened to a different module from its report drawer.
  find(tree,n=>n.type===ModuleDelivery).props.onInspect('sweeping');tree=render();details=drawer(tree);
  assert.deepEqual(find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.options.map(([id])=>id),['sweeping']);
  assert.deepEqual(find(details,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.selected,[]);
 }finally{h.close();}
});

test('Commissioner and ULB report registers both expose module filters and update the result count',()=>{
 for(const role of ['COMMISSIONER','ULB_OFFICER']){
  const h=harness();try{
   const values={city,zones,wards,users:[],reports:[],onSelectReport:()=>{},role};
   let tree=h.render(CommissionerWorkspace,values),filter=find(tree,n=>n.type===OperationalFilters);
   assert.notEqual(filter.props.modules,false);assert.match(renderToStaticMarkup(filter),/>Modules</);
   filter.props.onChange({...filter.props.value,moduleId:'all',moduleIds:['toilets']});
   tree=h.render(CommissionerWorkspace,values);assert.match(renderToStaticMarkup(tree),/17 matching \/ 36 period reports/);
  }finally{h.close();}
 }
});

test('export module selection narrows evidence, report facts and target source together',()=>{
 const h=harness();try{
  const values={city,zones,wards,reports:[]};let tree=h.render(ReportsExports,values);
  find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.onChange(['toilets']);
  tree=h.render(ReportsExports,values);
  const report=find(tree,n=>n.type===ReportDataReview);
  assert.deepEqual(report.props.city.enabledModules,['toilets']);
  assert.equal(report.props.coverage.visits.length,17);assert.equal(report.props.pulse.official.totals.target,51);
  assert.ok(report.props.coverage.visits.every(v=>v.module==='toilets'));
  find(tree,n=>n.type==='button'&&n.props.children==='Load inspection evidence').props.onClick();
  tree=h.render(ReportsExports,values);assert.match(renderToStaticMarkup(tree),/>17<span/);
 }finally{h.close();}
});

test('Zone Details keeps its module selector next to geography and applies it to the register and module charts',()=>{
 const h=harness();try{
  const values={city,zones,wards,beats:[],reports:[],iecIssues:[],attendance:[],users:[],onSelectReport:()=>{}};
  let tree=h.render(ZoneWardDetails,values),modules=find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules');
  assert.ok(modules);modules.props.onChange(['toilets']);tree=h.render(ZoneWardDetails,values);
  assert.deepEqual(find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.selected,['toilets']);
  const html=renderToStaticMarkup(tree);assert.match(html,/1 matching \/ 1 available/);
  assert.doesNotMatch(html,/>Sweeping<\/td>/);
 }finally{h.close();}
});

test('zone export totals and targets exclude unselected modules without mutating the source report',()=>{
 const report={zones:[{zoneId:'z1',zoneName:'Zone 1',modules:[{module:'SWEEPING',target:60,targetConfigured:true},{module:'TOILET',target:30,targetConfigured:true}],total:{target:90,targetConfigured:true}}]};
 const selected=commissioner.reconcileZoneExport(report,ulbReportRegister(data),[],users,['toilets']).zones[0];
 assert.deepEqual(selected.modules.map(m=>m.module),['TOILET']);
 assert.equal(selected.total.inspectionTarget,15);assert.equal(selected.total.achieved,4);assert.equal(selected.total.inspections,5);
 const withoutPerformance=commissioner.reconcileZoneExport(report,ulbReportRegister(data),[],undefined,['toilets']).zones[0];
 assert.equal(withoutPerformance.total.inspectionTarget,30);
 assert.equal(report.zones[0].total.target,90);assert.equal(report.zones[0].modules.length,2);
});

test('Commissioner and ULB show 100% inspection baseline before configured target and in each zone tag',()=>{
 for(const component of [CommissionerHome,UlbDashboard]){
  const h=harness(),values={...props,currentUser:{id:'officer',role:component===UlbDashboard?'ULB_OFFICER':'COMMISSIONER'},onInspectZone:()=>{},onNoticeHandled:()=>{}};
  try{
   let tree=h.render(component,values);
   find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Zones').props.quickSelection.onSelect();
   tree=h.render(component,values);let html=renderToStaticMarkup(tree);
   assert.match(html,/data-target-progress="full-target">675</);
   assert.ok(html.indexOf('data-target-progress="full-target"')<html.indexOf('data-target-progress="target"'));
   assert.match(html,/Total inspections required/);assert.match(html,/Total reports at 100% target/);
   assert.match(html,/data-zone-full-target="z1">180</);assert.match(html,/data-zone-full-target="z2">135</);
   find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Modules').props.onChange(['toilets']);
   tree=h.render(component,values);html=renderToStaticMarkup(tree);
   assert.match(html,/data-target-progress="full-target">225</);assert.match(html,/data-zone-full-target="z1">60</);
   // The full baseline comes from inventory and dates, independently of target loading.
   commissioner.useCityPulse=()=>({pending:1,errors:{},performance:undefined,rankings:[]});
   tree=h.render(component,values);html=renderToStaticMarkup(tree);assert.match(html,/data-target-progress="full-target">225</);
   coverageHook.useInspectionCoverage=()=>({loading:false,data:{...data,inventoryAvailable:false}});
   tree=h.render(component,values);html=renderToStaticMarkup(tree);assert.doesNotMatch(html,/data-target-progress="full-target">0</);
  }finally{h.close();}
 }
});
