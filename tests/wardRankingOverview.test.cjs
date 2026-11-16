const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {wardRankingOverview}=require('../src/services/wardRankingOverview.ts');
const {WardRankingInsights}=require('../src/pages/commissioner/WardRankingInsights.tsx');
const {matrixStore}=require('../src/services/store.ts');
const component=(score,maxScore,applicable=true)=>({score,maxScore,applicable});
const row=(id,score,zoneId='z1',extra={})=>({wardId:id,wardName:`Ward ${id}`,zoneId,zoneName:`Zone ${zoneId.slice(1)}`,finalScore:score,cityRank:Number(id),performanceBand:score>=85?'GREEN':score>=70?'AMBER':'RED',applicableWeight:100,components:{workforce:component(10,30),qc:component(0,14)},...extra});
test('overview preserves official scores and excludes unassessed and missing scores from comparisons',()=>{
 const rows=[row('1',0),row('2',40),row('3',90,'z2'),row('4',99,'z2',{rankable:false}),row('5',null,'z3')];
 const result=wardRankingOverview(rows);
 assert.equal(result.average,130/3);assert.equal(result.unassessed,2);assert.equal(result.best.wardId,'3');
 assert.deepEqual(result.lowest.map(r=>r.wardId),['1','2','3']);
 assert.deepEqual(result.distribution.map(b=>b.value),[1,0,2,2]);
 assert.deepEqual(result.zones.map(z=>[z.id,z.value,z.assessed,z.total]),[['z1',20,2,2],['z2',90,1,2],['z3',null,0,1]]);
 assert.equal(rows[1].finalScore,40);
});
test('component opportunities use only assessed applicable wards, including zero marks and redistributed maxima',()=>{
 const rows=[row('1',12),row('2',20,'z1',{components:{workforce:component(20,30),qc:component(0,14,false)}}),row('3',5,'z1',{components:{workforce:component(5,30),qc:component(0,17.5)}}),row('4',0,'z1',{rankable:false})];
 const result=wardRankingOverview(rows),qc=result.gaps.find(g=>g.key==='qc');
 assert.equal(qc.count,2);assert.equal(qc.gap,15.75);assert.equal(qc.maximum,15.75);
 assert.equal(result.gaps.find(g=>g.key==='workforce').gap,55/3);
 assert.equal(wardRankingOverview([]).average,null);assert.equal(wardRankingOverview([]).best,undefined);
});
test('loaded, loading, empty and error views render with accessible linear comparisons and no radial gauges',()=>{
 const props={city:{id:'test',name:'Ujjain'},rows:[row('1',10),row('2',20)],config:{thresholds:{greenMinScore:85,amberMinScore:70}},loading:false,error:'',onRetry:()=>{}};
 const html=renderToStaticMarkup(React.createElement(WardRankingInsights,props));
 assert.match(html,/How the zones compare/);assert.match(html,/role="meter"/);assert.match(html,/aria-valuenow="15"/);assert.match(html,/Where marks are being lost/);assert.match(html,/Start with these wards/);
 assert.ok(html.indexOf('WARD COMPARISON')<html.indexOf('WARD DEEP DIVE'));assert.doesNotMatch(html,/viz-gauge|insight-donut-chart/);
 assert.match(renderToStaticMarkup(React.createElement(WardRankingInsights,{...props,rows:[]})),/No wards match this view/);
 const loading=renderToStaticMarkup(React.createElement(WardRankingInsights,{...props,loading:true}));
 assert.match(loading,/Preparing ward insights/);assert.doesNotMatch(loading,/wr-zone-chart|WARD DEEP DIVE/);
 const failed=renderToStaticMarkup(React.createElement(WardRankingInsights,{...props,error:'Network unavailable'}));
 assert.match(failed,/Rankings unavailable/);assert.doesNotMatch(failed,/wr-zone-chart|WARD DEEP DIVE/);
});
test('zone, band and search interactions keep summaries and register in the same scope; selection opens evidence',()=>{
 const originals={useState:React.useState,useMemo:React.useMemo,useRef:React.useRef},saved={getZones:matrixStore.getZones,getWards:matrixStore.getWards};
 const slots=[];let index=0;matrixStore.getZones=()=>[];matrixStore.getWards=()=>[];
 const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];
 const props={city:{id:'test',name:'City'},rows:[row('1',10),row('2',90,'z2'),row('3',null,'z3')],config:null,loading:false,error:'',onRetry:()=>{}};
 const render=()=>{index=0;return WardRankingInsights(props);};
 try{
  React.useState=initial=>{const at=index++;if(!(at in slots))slots[at]=typeof initial==='function'?initial():initial;return[slots[at],v=>{slots[at]=typeof v==='function'?v(slots[at]):v;}];};React.useMemo=fn=>fn();React.useRef=()=>({current:null});
  let tree=render();nodes(tree).find(n=>n.props?.['aria-label']==='Ranking zone').props.onChange({target:{value:'z2'}});tree=render();
  let html=renderToStaticMarkup(tree);assert.match(html,/aria-valuenow="90"/);assert.doesNotMatch(html,/Explain score for Ward 1/);
  nodes(tree).find(n=>n.props?.className==='wr-reset').props.onClick();tree=render();nodes(tree).find(n=>n.props?.['aria-label']==='Ranking RYG band').props.onChange({target:{value:'neutral'}});tree=render();
  html=renderToStaticMarkup(tree);assert.match(html,/Awaiting assessment/);assert.doesNotMatch(html,/aria-valuenow=/);
  nodes(tree).find(n=>n.props?.className==='wr-reset').props.onClick();tree=render();nodes(tree).find(n=>n.props?.['aria-label']==='Search wards').props.onChange({target:{value:'Ward 2'}});tree=render();
  html=renderToStaticMarkup(tree);assert.match(html,/Explain score for Ward 2/);assert.doesNotMatch(html,/Explain score for Ward 1/);
  nodes(tree).find(n=>n.props?.['aria-label']==='Ranking ward').props.onChange({target:{value:'2'}});assert.doesNotThrow(render);
 }finally{Object.assign(React,originals);Object.assign(matrixStore,saved);}
});
