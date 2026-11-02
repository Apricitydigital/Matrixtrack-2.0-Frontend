// Real browser against the disposable local API/database. No mocked API responses.
const fs=require('node:fs'),assert=require('node:assert/strict');
const result={checks:[],apiErrors:[],runtimeErrors:[]};
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
  const {token}=await(await fetch('http://127.0.0.1:4107/e2e-test-login/COMMISSIONER')).json();
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('matrixtrack_command_access_token',${JSON.stringify(token)});`});
  await send('Page.navigate',{url:process.env.MUNICIPAL_E2E_FRONTEND||'http://127.0.0.1:3017/'});await wait(`!!document.querySelector('aside')`);
  await evaluate(`document.querySelector('[aria-label="Close city briefing"]')?.click()`);
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1100,deviceScaleFactor:1,mobile:false});
  for(const preset of ['today','last_7_days','last_90_days']){
   await evaluate(`(()=>{const e=document.querySelector('select[aria-label="Review period"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(preset)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
   await click('Ward Ranking');await wait(`document.querySelectorAll('.score-component-grid>button').length===9&&!document.querySelector('[role="status"]')`);
   const cards=await evaluate(`Array.from(document.querySelectorAll('.score-component-grid>button')).map(b=>b.innerText)`);
   assert.ok(cards.some(x=>x.includes('Workforce')&&x.includes('30')));assert.ok(cards.some(x=>x.includes('Nala')));assert.ok(cards.some(x=>x.includes('CTU/GVP')));
   await evaluate(`Array.from(document.querySelectorAll('.score-component-grid>button')).find(b=>b.innerText.startsWith('Sweeping')).click()`);
   await wait(`document.querySelector('.factor-metrics')?.innerText.includes('Planned beat visits')`);
   const metrics=await evaluate(`document.querySelector('.factor-metrics').innerText`);assert.ok(metrics.includes('Visits awaiting submission'));assert.ok(metrics.includes('Point captures saved'));
   const order=await evaluate(`Array.from(document.querySelector('[aria-label="Ranking ward"]').options).filter(o=>o.value).map(o=>o.textContent)`);
   assert.deepEqual(order,[...order].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})));
   result.checks.push(preset+': all factors, 30 Workforce marks, distinct beat/point evidence, numeric ward order');
   await click('Reports & Exports');await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Select all zones')`);await click('Select all zones');await click('Generate zone report');
   await wait(`Array.from(document.querySelectorAll('table th')).some(e=>e.textContent==='Ward score /100')`);
   const apiData=await evaluate(`(async()=>{const dates=document.querySelector('.custom-period summary').innerText;const from=${JSON.stringify(preset)}==='today'?'2026-11-02':${JSON.stringify(preset)}==='last_7_days'?'2026-10-27':'2026-08-05';return await(await fetch('/backend/ward-ranking?from='+from+'&to=2026-11-02',{headers:{authorization:'Bearer '+sessionStorage.getItem('matrixtrack_command_access_token')}})).json();})()`);
   const expected=new Map(apiData.rankings.filter(r=>r.rankable).map(r=>[r.wardName,r.finalScore]));
   const actual=await evaluate(`Array.from(document.querySelectorAll('table')).filter(t=>t.querySelector('thead')?.innerText.includes('Ward score /100')).flatMap(t=>Array.from(t.querySelectorAll('tbody tr')).filter(r=>r.children.length===5).map(r=>[r.children[0].textContent,Number(r.children[4].textContent)]))`);
   assert.ok(actual.length>0);for(const [name,score] of actual)assert.equal(score,expected.get(name),name+' report score differs');
   result.checks.push(preset+': exported ward scores match official ranking');
  }
  await click('Ward Ranking');await wait(`document.querySelectorAll('.score-component-grid>button').length===9`);
  await evaluate(`Array.from(document.querySelectorAll('.score-component-grid>button')).find(b=>b.innerText.startsWith('Sweeping')).click()`);
  await evaluate(`document.querySelector('.score-component-grid').scrollIntoView({block:'start'})`);await new Promise(r=>setTimeout(r,400));
  const screen=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/ranking-desktop.png',Buffer.from(screen.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await new Promise(r=>setTimeout(r,600));await evaluate(`document.querySelector('.score-component-grid').scrollIntoView({block:'start'})`);
  assert.ok(await evaluate(`document.querySelector('.score-component-grid').getBoundingClientRect().right<=innerWidth`));
  const mobile=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/ranking-mobile.png',Buffer.from(mobile.data,'base64'));
  assert.equal(result.runtimeErrors.length,0,JSON.stringify(result.runtimeErrors));assert.equal(result.apiErrors.length,0,JSON.stringify(result.apiErrors));
 }finally{fs.writeFileSync('.ui-review/ranking-browser-results.json',JSON.stringify(result,null,2));await send('Browser.close');ws.close();}
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
