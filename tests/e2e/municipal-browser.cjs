// Real browser against the disposable local API/database. No mocked API responses.
const fs=require('node:fs'),assert=require('node:assert/strict');
const result={pages:[],apiErrors:[],runtimeErrors:[]};
(async()=>{
 let targets;for(let i=0;i<40;i++){try{targets=await(await fetch('http://127.0.0.1:9336/json')).json();break;}catch{await new Promise(r=>setTimeout(r,250));}}
 const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let id=0;const jobs=new Map();const send=(method,params={})=>new Promise((resolve,reject)=>{jobs.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 ws.onmessage=async event=>{const m=JSON.parse(event.data);if(m.id){const job=jobs.get(m.id);jobs.delete(m.id);m.error?job.reject(m.error):job.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')result.runtimeErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Fetch.requestPaused'){
   const p=m.params;try{const url=new URL(p.request.url),route=url.pathname.replace(/^\/backend/,'')+url.search;
    const headers={...p.request.headers};delete headers.Host;delete headers['Content-Length'];
    const response=await fetch('http://127.0.0.1:4107'+route,{method:p.request.method,headers,body:['GET','HEAD'].includes(p.request.method)?undefined:p.request.postData});
    const body=await response.text();if(response.status>=400)result.apiErrors.push({route,status:response.status,message:body.slice(0,250)});
    await send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:response.status,responseHeaders:[{name:'Content-Type',value:response.headers.get('content-type')||'application/json'}],body:Buffer.from(body).toString('base64')});
   }catch(e){if(!String(e.message||'').includes('InterceptionId'))result.apiErrors.push({message:e.message||JSON.stringify(e)});await send('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'}).catch(()=>{});}
  }
 };
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<160;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out '+expression);};
 const click=async text=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing '+${JSON.stringify(text)});b.click();})()`);
 try{
  await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/*'}]});
  for(const role of ['COMMISSIONER','CITY_ADMIN','ULB_OFFICER','HMS_SUPER_ADMIN']){
   const {token}=await(await fetch('http://127.0.0.1:4107/e2e-test-login/'+role)).json();
   const script=await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('matrixtrack_command_access_token',${JSON.stringify(token)});`});
   await send('Page.navigate',{url:process.env.MUNICIPAL_E2E_FRONTEND||'http://localhost:3000/'});await wait(`!!document.querySelector('aside')`);await new Promise(r=>setTimeout(r,800));
   await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
   const buttons=await evaluate(`Array.from(document.querySelectorAll('aside button')).map(b=>b.textContent.trim()).filter(Boolean)`);
   fs.writeFileSync('.ui-review/e2e-menu-'+role+'.json',JSON.stringify(buttons,null,2));
   for(const label of buttons){
    if(/sign out|dark|light|collapse|expand|workspace/i.test(label))continue;
    const start=Date.now();await evaluate(`document.querySelector('[aria-label="Close city briefing"]')?.click()`);
    await click(label);await new Promise(r=>setTimeout(r,350));
    await wait(`!document.querySelector('[role="progressbar"]') && ![...document.querySelectorAll('main strong')].some(e=>e.textContent==='Loading…'||e.textContent==='Loading...')`);
    const visible=await evaluate(`document.querySelector('main')?.innerText.length||0`);assert.ok(visible>15,role+' '+label+' empty');
    result.pages.push({role,label,ms:Date.now()-start});
   }
   if(role==='COMMISSIONER'){
    await click('City Overview');await wait(`document.querySelector('[data-metric="overview-inspections"]')?.textContent==='5'`);
    for(const preset of ['last_7_days','last_30_days','last_90_days','this_month','today']){
     const changed=await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Review period"]');if(!e||![...e.options].some(o=>o.value===${JSON.stringify(preset)}))return false;Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(preset)});e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
     assert.equal(changed,true);await wait(`document.querySelector('[data-metric="overview-inspections"]')?.textContent==='5'`);
    }
    await evaluate(`(()=>{document.querySelector('.custom-period summary').click();for(const [label,value] of [['Review from','2026-08-01'],['Review to','2026-11-02']]){const e=document.querySelector('[aria-label="'+label+'"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('.custom-period form').requestSubmit();})()`);
    await wait(`document.querySelector('[data-metric="overview-inspections"]')?.textContent==='5' && document.querySelector('.custom-period summary')?.textContent.includes('Aug')`);
    for(const label of ['Overview zone','Overview ward']){
     await evaluate(`(()=>{const e=document.querySelector('[aria-label="${label}"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,e.options[1].value);e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
     await wait(`document.querySelector('[data-metric="overview-inspections"]')?.textContent==='5'`);
    }
    const screen=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/e2e-real-commissioner.png',Buffer.from(screen.data,'base64'));
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate(`document.querySelector('.custom-period summary').click()`);
    assert.equal(await evaluate(`(()=>{const r=document.querySelector('.custom-period form').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()`),true);
    const mobile=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/e2e-real-mobile.png',Buffer.from(mobile.data,'base64'));
    await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1100,deviceScaleFactor:1,mobile:false});
   }
   if(role==='HMS_SUPER_ADMIN'){
    await click('Cross-City Overview');
    await wait(`Array.from(document.querySelectorAll('tr')).some(r=>r.textContent.includes('E2E Municipal Test City'))`);
    await evaluate(`Array.from(document.querySelectorAll('tr')).find(r=>r.textContent.includes('E2E Municipal Test City')).querySelector('button').click()`);
    await wait(`document.querySelector('main')?.textContent.includes('Inspection target') && !document.querySelector('main')?.textContent.includes('Loading…')`);
    result.pages.push({role,label:'Selected dummy city progress'});
   }
  }
  assert.equal(result.runtimeErrors.length,0,JSON.stringify(result.runtimeErrors));assert.equal(result.apiErrors.length,0,JSON.stringify(result.apiErrors));
 }finally{fs.writeFileSync('.ui-review/municipal-browser-results.json',JSON.stringify(result,null,2));await send('Browser.close');ws.close();}
 console.log(JSON.stringify({pages:result.pages.length,apiErrors:result.apiErrors.length,runtimeErrors:result.runtimeErrors.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
