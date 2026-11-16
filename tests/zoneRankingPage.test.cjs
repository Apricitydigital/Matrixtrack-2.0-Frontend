const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,file);
require.extensions['.css']=()=>{};
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
global.requestAnimationFrame=fn=>fn();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {matrixStore}=require('../src/services/store.ts'),api=require('../src/services/api.ts');
const operations=require('../src/services/zoneOperations.ts');
const {ZoneWardDetails}=require('../src/pages/commissioner/ZoneWardDetails.tsx');
const city={id:'city',name:'Ujjain',cityCode:'UJN'},zones=[1,2,3].map(id=>({id:`z${id}`,cityId:'city',name:`Zone ${id}`}));
const wards=[{id:'a',cityId:'city',zoneId:'z1',name:'Ward 1'},{id:'b',cityId:'city',zoneId:'z1',name:'Ward 2'},{id:'c',cityId:'city',zoneId:'z2',name:'Ward 3'},{id:'d',cityId:'city',zoneId:'z3',name:'Ward 4'}];
const component={score:20,maxScore:30,percentage:66.67,applicable:true,metrics:{present:20,manpowerScheduled:30},components:{deployment:{score:20,maxScore:30,percentage:66.67,applicable:true}}};
const rankings=[['a',80],['b',60],['c',40]].map(([wardId,finalScore],i)=>({wardId,finalScore,rankable:true,cityRank:i+1,performanceBand:'GREEN',components:{workforce:component},applicableWeight:100}));
const props={city,zones,wards,beats:[],reports:[],iecIssues:[],attendance:[],users:[],onSelectReport:()=>{}};
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}}
function harness(load=async()=>({rankings}),fixtureProps=props){
 const original={useState:React.useState,useEffect:React.useEffect,useMemo:React.useMemo,useRef:React.useRef},savedApi=api.api,savedUser=matrixStore.currentUser;
 const values=[],effects=[],deps=[],cleanups=[];let hook=0;
 const operationScopes=[];
 const savedOperations=operations.useZoneOperations;operations.useZoneOperations=(...args)=>{operationScopes.push(args);return {...operations.emptyZoneOperations('fixture'),states:{inspections:'ready',targets:'ready',attendance:'ready',issues:'ready'}};};
 matrixStore.currentUser={cityId:'city'};api.api=load;
 return {
  operationScopes,
  render(){hook=0;React.useState=initial=>{const index=hook++;if(!(index in values))values[index]=typeof initial==='function'?initial():initial;return[values[index],value=>{values[index]=typeof value==='function'?value(values[index]):value;}];};React.useRef=()=>({current:null});React.useMemo=fn=>fn();React.useEffect=(effect,dependencies)=>{const index=hook++;if(!deps[index]||dependencies.some((value,i)=>value!==deps[index][i])){deps[index]=dependencies;effects.push(()=>{cleanups[index]?.();cleanups[index]=effect();});}};try{return ZoneWardDetails(fixtureProps);}finally{Object.assign(React,original);}},
  async flush(){while(effects.length)effects.shift()();await new Promise(resolve=>setImmediate(resolve));},
  close(){for(const cleanup of cleanups)cleanup?.();operations.useZoneOperations=savedOperations;api.api=savedApi;matrixStore.currentUser=savedUser;Object.assign(React,original);}
 };
}

test('zone → every ward → score evidence → selected ward reports retains the report callback',async()=>{
 const calls=[],h=harness(async(path)=>{calls.push(path);return{rankings};});
 try{
  let tree=h.render();assert.match(renderToStaticMarkup(tree),/Preparing zone rankings/);await h.flush();tree=h.render();
  let html=renderToStaticMarkup(tree);assert.match(html,/Best available zone/);assert.match(html,/provisional/);assert.match(html,/3 of 4 selected wards assessed/);assert.equal(calls.length,1);assert.match(calls[0],/^\/ward-ranking\?from=/);
  find(tree,n=>n.props?.['aria-label']==='View wards in Zone 1').props.onClick();tree=h.render();
  html=renderToStaticMarkup(tree);assert.match(html,/Zone 1 ward performance/);assert.match(html,/Ward 1/);assert.match(html,/Ward 2/);
  find(tree,n=>n.props?.className?.startsWith('zr-ward-card')&&renderToStaticMarkup(n).includes('Ward 2')).props.onClick();tree=h.render();html=renderToStaticMarkup(tree);
  assert.match(html,/Ward 2 performance details/);assert.match(html,/Workforce attendance/);assert.match(html,/20 \/ 30/);assert.match(html,/Registered attendance required/);
  find(tree,n=>n.props?.id==='zr-reports-tab').props.onClick();tree=h.render();
  const operations=find(tree,n=>n.props?.initialWardId==='b');assert.ok(operations);assert.equal(operations.props.onSelectReport,props.onSelectReport);
  find(tree,n=>n.props?.id==='zr-score-tab').props.onClick();tree=h.render();
  find(tree,n=>n.props?.className==='zr-back'&&React.Children.toArray(n.props.children).includes('Zone 1')).props.onClick();
  assert.doesNotMatch(renderToStaticMarkup(h.render()),/Ward 2 performance details/);
 }finally{h.close();}
});

test('search and assessment filters do not recalculate city ranks or hide missing wards from zone coverage',async()=>{
 const h=harness();try{h.render();await h.flush();let tree=h.render();
  find(tree,n=>n.props?.['aria-label']==='Search zones or wards').props.onChange({target:{value:'Ward 4'}});tree=h.render();
  const table=renderToStaticMarkup(find(tree,n=>n.props?.['aria-label']==='Zone leaderboard'));assert.match(table,/Zone 3/);assert.doesNotMatch(table,/Zone 1/);assert.match(table,/Not assessed/);
  find(tree,n=>n.props?.['aria-label']==='Search zones or wards').props.onChange({target:{value:''}});tree=h.render();
  find(tree,n=>n.props?.['aria-label']==='Zone assessment status').props.onChange({target:{value:'ranked'}});
  const ranked=renderToStaticMarkup(find(h.render(),n=>n.props?.['aria-label']==='Zone leaderboard'));assert.match(ranked,/Zone 1/);assert.match(ranked,/Zone 2/);assert.doesNotMatch(ranked,/Zone 3/);
 }finally{h.close();}
});

test('failed requests show retry and never present missing data as zero performance',async()=>{
 let attempts=0;const h=harness(async()=>{if(!attempts++)throw Error('Service unavailable');return{rankings};});
 try{h.render();await h.flush();let tree=h.render();const html=renderToStaticMarkup(tree);assert.match(html,/Zone rankings unavailable/);assert.doesNotMatch(html,/Best available zone/);
  find(tree,n=>n.type==='button'&&n.props.children==='Retry').props.onClick();h.render();await h.flush();tree=h.render();assert.match(renderToStaticMarkup(tree),/Best available zone/);assert.equal(attempts,2);
 }finally{h.close();}
});

test('unassessed wards remain explorable without displaying component marks as real scores',async()=>{
 const h=harness();try{h.render();await h.flush();let tree=h.render();find(tree,n=>n.props?.['aria-label']==='View wards in Zone 3').props.onClick();tree=h.render();find(tree,n=>n.props?.className?.startsWith('zr-ward-card')).props.onClick();tree=h.render();assert.match(renderToStaticMarkup(tree),/This ward has not been assessed/);
  find(tree,n=>n.props?.id==='zr-reports-tab').props.onClick();assert.ok(find(h.render(),n=>n.props?.initialWardId==='d'));
 }finally{h.close();}
});

test('ward selection recalculates the zone average and restricts comparison and source queries to that ward',async()=>{
 const {MultiSelectDropdown}=require('../src/components/common/MultiSelectDropdown.tsx');
 const h=harness();try{h.render();await h.flush();let tree=h.render();
  find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Wards').props.onChange(['a']);tree=h.render();
  const zones=renderToStaticMarkup(find(tree,n=>n.props?.['aria-label']==='Zone leaderboard'));
  assert.match(zones,/#1/);assert.match(zones,/>80</);assert.doesNotMatch(zones,/Zone 2|Zone 3/);
  assert.equal(h.operationScopes.length,0,'ranking view must not load operational statistics');
  find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Wards').props.onChange([]);tree=h.render();
  assert.match(renderToStaticMarkup(find(tree,n=>n.props?.['aria-label']==='Zone leaderboard')),/>70</);
 }finally{h.close();}
});

test('shared 15-ward preset excludes other wards from averages, comparisons, counts and source scope',async()=>{
 const {MultiSelectDropdown}=require('../src/components/common/MultiSelectDropdown.tsx'),{wardFocusPreset,focusLabel}=require('../src/services/wardFocusPreset.ts');
 const pairs=[[1,[12,10,11,13]],[2,[20,4,6]],[3,[23,33]],[4,[44,52]],[5,[38,40]],[6,[35,48]]];
 const zones=pairs.map(([zoneNumber])=>({id:`z${zoneNumber}`,cityId:'city',name:`Zone ${zoneNumber}`,zoneNumber}));
 const wards=pairs.flatMap(([zone,numbers])=>numbers.map(wardNumber=>({id:`w${wardNumber}`,cityId:'city',zoneId:`z${zone}`,name:`Ward ${wardNumber}`,wardNumber})));
 wards.push({id:'extra',cityId:'city',zoneId:'z1',name:'Ward 99',wardNumber:99});
 const rankings=wards.map(ward=>({wardId:ward.id,finalScore:ward.id==='extra'?100:50,rankable:true}));
 const preset=wardFocusPreset('city',zones,wards),h=harness(async()=>({rankings}),{...props,zones,wards});
 try{h.render();await h.flush();let tree=h.render();
  find(tree,n=>n.type==='button'&&n.props.children===focusLabel(preset)).props.onClick();tree=h.render();
  assert.deepEqual(find(tree,n=>n.type===MultiSelectDropdown&&n.props.label==='Wards').props.selected,preset.wardIds);
  const zonesHtml=renderToStaticMarkup(find(tree,n=>n.props?.['aria-label']==='Zone leaderboard'));assert.match(zonesHtml,/>50</);assert.doesNotMatch(zonesHtml,/>60</);
  find(tree,n=>n.props?.['aria-label']==='View wards in Zone 1').props.onClick();tree=h.render();
  const zoneWards=renderToStaticMarkup(find(tree,n=>n.props?.['aria-label']==='Zone 1 ward performance'));assert.doesNotMatch(zoneWards,/Ward 99/);assert.match(zoneWards,/Ward 12/);assert.match(zoneWards,/Ward 10/);assert.match(zoneWards,/Ward 11/);assert.match(zoneWards,/Ward 13/);
  assert.equal(h.operationScopes.length,0);
 }finally{h.close();}
});
