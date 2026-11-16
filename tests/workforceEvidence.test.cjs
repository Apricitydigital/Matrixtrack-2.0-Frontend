const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,f);
global.sessionStorage={getItem:()=>null};global.window=new EventTarget();
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),api=require('../src/services/api.ts'),{matrixStore}=require('../src/services/store.ts');
const {WorkforceEvidenceDrawer,workforceDateRows}=require('../src/components/analytics/WorkforceEvidenceDrawer.tsx'),{WardScoreBreakdown}=require('../src/components/analytics/WardScoreBreakdown.tsx');
const date='2026-11-16',data={basis:'registered_workforce',receivedDays:[date],people:[{id:'a',name:'Worker A',employeeId:'EMP1',registered:true,daroga:false,days:[{date,state:'matched',present:true}]},{id:'d',name:'Daroga D',employeeId:'EMP2',registered:true,daroga:true,days:[{date,state:'not_found',present:false}]}],beats:[{id:'b',name:'Beat 1',employeeIds:['a'],days:[{date,state:'staffed',presentIds:['a']}]},{id:'empty',name:'Beat 2',employeeIds:[],days:[{date,state:'unverified',presentIds:[]}]}]};
function find(node,match){if(!node||typeof node!=='object')return;if(match(node))return node;for(const child of React.Children.toArray(node.props?.children)){const r=find(child,match);if(r)return r;}}
function harness(read,load=async()=>({period:{from:date,to:date},data})){
 const saved={state:React.useState,effect:React.useEffect,api:api.api,range:matrixStore.getDateRange},values=[],deps=[],effects=[];let index=0;
 matrixStore.getDateRange=()=>({from:date,to:date});api.api=load;
 return {render(){index=0;React.useState=initial=>{const i=index++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;return [values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v;}];};React.useEffect=(fn,next)=>{const i=index++;if(!deps[i]||next.some((x,j)=>x!==deps[i][j])){deps[i]=next;effects.push(fn);}};try{return read();}finally{React.useState=saved.state;React.useEffect=saved.effect;}},async flush(){while(effects.length)effects.shift()();await new Promise(setImmediate);},close(){api.api=saved.api;matrixStore.getDateRange=saved.range;}};
}
test('all three workforce rows open the side panel for the selected factor and ward',()=>{
 const part={score:1,maxScore:3,applicable:true},factor={key:'workforce',label:'Workforce',score:3,maxScore:30,metrics:{},components:{deployment:part,supervisorAvailability:part,unmannedBeatControl:part}};
 const h=harness(()=>WardScoreBreakdown({factor,wardId:'ward'}));
 try{for(const [key,label] of [['deployment','Registered staff present'],['supervisorAvailability','Daroga availability'],['unmannedBeatControl','Verified staffed beat-days']]){let tree=h.render();find(tree,n=>n.props?.['aria-label']===`View ${label} details`).props.onClick();tree=h.render();const drawer=find(tree,n=>n.type===WorkforceEvidenceDrawer);assert.equal(drawer.props.wardId,'ward');assert.equal(drawer.props.factor,key);}}finally{h.close();}
});
test('date totals distinguish registered staff, Darogas, staffed beats and unverified entries',()=>{
 assert.deepEqual(workforceDateRows(data,'deployment'),[{date,actual:1,required:2}]);assert.deepEqual(workforceDateRows(data,'supervisorAvailability'),[{date,actual:0,required:1}]);assert.deepEqual(workforceDateRows(data,'unmannedBeatControl'),[{date,actual:1,required:2}]);
});
test('drawer fetches exact period evidence, exposes names and IDs, and filters present matches',async()=>{
 const calls=[],h=harness(()=>WorkforceEvidenceDrawer({wardId:'ward',factor:'deployment',onClose:()=>{}}),async path=>{calls.push(path);return {period:{from:date,to:date},data};});
 try{h.render();await h.flush();let tree=h.render(),html=renderToStaticMarkup(tree);assert.match(calls[0],/ward\/component\/WORKFORCE/);assert.match(calls[0],/from=2026-11-16&to=2026-11-16&evidence=attendance/);assert.match(html,/Worker A/);assert.match(html,/EMP1/);assert.match(html,/Attendance not found/);assert.doesNotMatch(html,/>Absent</);
  find(tree,n=>n.type==='select'&&n.props['aria-label']==='Workforce evidence status').props.onChange({target:{value:'present'}});tree=h.render();html=renderToStaticMarkup(tree);assert.match(html,/Worker A/);assert.doesNotMatch(html,/Daroga D/);
 }finally{h.close();}
});
test('beat evidence expands assigned names without implying a supervisor visit or treating empty beats as absent',async()=>{
 const h=harness(()=>WorkforceEvidenceDrawer({wardId:'ward',factor:'unmannedBeatControl',onClose:()=>{}}));
 try{h.render();await h.flush();const html=renderToStaticMarkup(h.render());assert.match(html,/Beat 1/);assert.match(html,/Assigned employees/);assert.match(html,/Worker A/);assert.match(html,/does not verify a supervisor visit/);assert.match(html,/No assigned field employees/);assert.match(html,/Presence unverified/);}finally{h.close();}
});
test('legacy or wrong-period evidence is rejected rather than presenting mismatched names as score evidence',async()=>{
 const h=harness(()=>WorkforceEvidenceDrawer({wardId:'ward',factor:'deployment',onClose:()=>{}}),async()=>({period:{from:'2026-11-15',to:'2026-11-15'},data}));
 try{h.render();await h.flush();const html=renderToStaticMarkup(h.render());assert.match(html,/Exact ranking attendance evidence is unavailable/);assert.doesNotMatch(html,/Worker A/);assert.match(html,/Retry evidence/);}finally{h.close();}
});
