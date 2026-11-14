const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
for(const extension of ['.ts','.tsx'])require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
function loader(){
 const scripts=[],events=[],window={dispatchEvent:event=>events.push(event.type)},document={createElement:()=>({remove(){this.removed=true;}}),querySelector:()=>({nonce:'test-nonce'}),head:{appendChild:script=>scripts.push(script)}};
 const module={exports:{}};const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/googleMaps.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,process:{env:{}},window,document,URLSearchParams,Event,setTimeout,clearTimeout});return {...module.exports,scripts,events,window};
}
test('both map screens share one Google SDK request and inherit CSP nonce',async()=>{
 const f=loader(),a=f.loadGoogleMaps('test-key'),b=f.loadGoogleMaps('test-key');assert.equal(a,b);assert.equal(f.scripts.length,1);
 const url=new URL(f.scripts[0].src);assert.equal(url.origin,'https://maps.googleapis.com');assert.equal(url.searchParams.get('loading'),'async');assert.equal(url.searchParams.get('v'),'quarterly');assert.equal(f.scripts[0].nonce,'test-nonce');
 f.window.google={maps:{Map:function(){}}};f.window.matrixtrackGoogleMapsReady();assert.equal(await a,f.window.google.maps);await f.loadGoogleMaps('test-key');assert.equal(f.scripts.length,1);
});
test('missing key causes no external request; network failures allow another attempt',async()=>{
 const f=loader();await assert.rejects(f.loadGoogleMaps(''),/not configured/);assert.equal(f.scripts.length,0);
 const a=f.loadGoogleMaps('test-key'),rejection=assert.rejects(a,/could not load/);f.scripts[0].onerror();await rejection;assert.equal(f.scripts[0].removed,true);
 const b=f.loadGoogleMaps('test-key');assert.equal(f.scripts.length,2);f.window.google={maps:{Map:function(){}}};f.window.matrixtrackGoogleMapsReady();await b;
});
test('Google authorization errors reach the screen before and after loading',async()=>{
 const f=loader(),a=f.loadGoogleMaps('test-key'),rejection=assert.rejects(a,/authorized/);f.window.gm_authFailure();await rejection;assert.equal(f.events.length,1);
 const b=f.loadGoogleMaps('test-key');f.window.google={maps:{Map:function(){}}};f.window.matrixtrackGoogleMapsReady();await b;f.window.gm_authFailure();assert.equal(f.events.length,2);
});
function scene(){
 const nodes=[],layers=[],overlays=[],lines=[],windows=[],listeners=[];
 const element=tag=>({tag,children:[],style:{setProperty(k,v){this[k]=v;}},dataset:{},appendChild(child){this.children.push(child);},setAttribute(k,v){this[k]=v;},remove(){this.removed=true;}});
 const listen=()=>{const l={remove(){this.removed=true;}};listeners.push(l);return l;};
 const maps={
  LatLng:class{constructor(lat,lng){this.lat=lat;this.lng=lng;}},LatLngBounds:class{points=[];extend(p){this.points.push(p);}},
  Data:class{features=[];handlers={};constructor({map}){this.map=map;layers.push(this);}setStyle(style){this.style=style;}addGeoJson(json){return json.features.map(raw=>{const values={},f={raw,setProperty:(k,v)=>values[k]=v,getProperty:k=>values[k]};this.features.push(f);return f;});}addListener(name,fn){this.handlers[name]=fn;return listen();}setMap(map){this.map=map;}},
  InfoWindow:class{constructor(){windows.push(this);}setContent(content){this.content=content;}setPosition(){}open(){this.opened=true;}close(){this.opened=false;}},
  Polyline:class{constructor(options){this.options=options;lines.push(this);}addListener(){return listen();}setMap(map){this.map=map;}},
  OverlayView:class{static preventMapHitsAndGesturesFrom(){}setMap(map){this.map=map;if(map){overlays.push(this);this.onAdd();this.draw();}else this.onRemove();}getPanes(){return {overlayMouseTarget:{appendChild:node=>nodes.push(node)}};}getProjection(){return {fromLatLngToDivPixel:()=>({x:10,y:20})};}},
  event:{addListenerOnce:()=>listen()}
 };
 const map={zoom:18,getProjection:()=>({fromLatLngToPoint:p=>({x:p.lng,y:p.lat})}),getZoom(){return this.zoom;},setZoom(zoom){this.zoom=zoom;},setCenter(){},fitBounds(){},addListener:()=>listen()};
 return {maps,map,nodes,layers,overlays,lines,windows,listeners,document:{createElement:element}};
}
test('Google overlays preserve holes, stable boundary colors, dashed zones and overlap selection',()=>{
 const saved=global.document,f=scene();global.document=f.document;
 const {renderGoogleMap,mapEntries}=require('../src/services/googleMapRenderer.ts'),{boundaryColor}=require('../src/services/operationsMap.ts');
 const ring=[[75,23],[76,23],[76,24],[75,24],[75,23]],hole=[[75.2,23.2],[75.3,23.2],[75.3,23.3],[75.2,23.2]],geometry={type:'Polygon',coordinates:[ring,hole]};
 const assets=['APPROVED','PENDING'].map((state,i)=>({key:'asset'+i,id:''+i,module:'sweeping',name:'Beat '+i,state,coordinates:[23.5,75.5],geometry,actors:[],supervisors:[],employees:[]})),picked=[];
 try{
  const dispose=renderGoogleMap(f.maps,f.map,mapEntries(assets),[{id:'ward',name:'Ward',geometry},{id:'zone',name:'Zone',geometry,derived:true,uploadedWardCount:2,totalWardCount:2}],a=>picked.push(a.key));
  assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].dataset.locationCount,'2');assert.match(f.nodes[0].children[0].style['--cluster-color'],/conic-gradient/);
  assert.deepEqual(f.layers[1].features[0].raw.geometry.coordinates,[ring,hole]);assert.equal(f.layers[1].style(f.layers[1].features[0]).strokeColor,boundaryColor('ward'));assert.equal(f.lines.length,2);assert.equal(f.lines[0].options.icons[0].repeat,'12px');
  f.nodes[0].onclick();const box=f.windows[1].content;box.children[1].value='1';box.children[2].onclick();assert.deepEqual(picked,['asset1']);
  f.layers[0].handlers.click({feature:f.layers[0].features[0]});assert.deepEqual(picked,['asset1','asset0']);
  dispose();assert.ok(f.overlays.every(o=>o.map===null));assert.ok(f.layers.every(l=>l.map===null));assert.ok(f.listeners.every(l=>l.removed));
 }finally{global.document=saved;}
});
