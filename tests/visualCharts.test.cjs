const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
function load(file,mocks){
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>{if(id in mocks)return mocks[id];throw Error(`Unexpected dependency: ${id}`);}});
 return exports;
}
function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];}
test('visual trend keeps selection by day and safely drops a removed day after filtering',()=>{
 let selected=null;
 const {AreaSeries}=load('components/analytics/VisualCharts.tsx',{
  react:{...React,useId:()=>':trend:',useState:()=>[selected,id=>{selected=id;}]},
  'lucide-react':{},'../../services/insights':{finite:v=>typeof v==='number'&&Number.isFinite(v),amount:String},
  '../../services/vizMode':{vivid:c=>c,STATUS_VIVID:{}},
 });
 const points=Array.from({length:7},(_,i)=>({id:`day-${i}`,label:`Day ${i}`,values:[i]})),series=[{label:'Visits',color:'#000'}];
 const render=p=>AreaSeries({points:p,series});
 nodes(render(points)).find(n=>n.type==='g'&&n.props['aria-label']?.startsWith('Day 6,')).props.onFocus();
 assert.equal(selected,'day-6');
 const readout=p=>nodes(render(p)).find(n=>n.props?.className==='series-readout viz-readout');
 assert.equal(nodes(readout([points[6],points[0]])).find(n=>n.type==='strong').props.children,'Day 6');
 assert.equal(nodes(readout(points.slice(0,2))).some(n=>n.type==='strong'),false);
 assert.doesNotThrow(()=>render([]));
});
const {dailyInspectionTrend}=load('services/vizData.ts',{'./inspectionCoverage':{inspectionStatus:()=> 'approved'}});
test('inspection trend includes the final partial week beyond 400 days and excludes out-of-range visits',()=>{
 const visits=['2025-01-01','2026-11-14','2026-11-15'].map(d=>({status:'APPROVED',submittedAt:`${d}T06:00:00Z`}));
 const rows=dailyInspectionTrend({from:'2025-01-01',to:'2026-11-14',visits});
 assert.equal(rows.reduce((n,r)=>n+r.value,0),2);
 assert.equal(rows.at(-1).value,1);
 assert.ok(rows.at(-1).id<='2026-11-14');
 assert.ok(rows.at(-1).id>='2026-11-08');
});
test('daily inspection trend zero-fills short ranges using IST dates',()=>{
 const rows=dailyInspectionTrend({from:'2026-11-13',to:'2026-11-14',visits:[{status:'APPROVED',submittedAt:'2026-11-13T20:00:00Z'}]});
 assert.equal(JSON.stringify(rows.map(r=>[r.id,r.value])),JSON.stringify([['2026-11-13',0],['2026-11-14',1]]));
 assert.equal(dailyInspectionTrend({from:'invalid',to:'2026-11-14',visits:[]}).length,0);
});
