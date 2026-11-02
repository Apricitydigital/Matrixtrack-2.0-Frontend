// Real UI writes against the disposable municipal-workflow.e2e.cjs API only.
const fs=require('node:fs'),assert=require('node:assert/strict');
const result={steps:[],apiErrors:[],runtimeErrors:[]};
(async()=>{
 let targets;for(let i=0;i<40;i++){try{targets=await(await fetch('http://127.0.0.1:9336/json')).json();break;}catch(e){if(i===39)throw e;await new Promise(r=>setTimeout(r,250));}}
 const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 let seq=0;const jobs=new Map(),send=(method,params={})=>new Promise((resolve,reject)=>{jobs.set(++seq,{resolve,reject});ws.send(JSON.stringify({id:seq,method,params}));});
 ws.onmessage=async event=>{const m=JSON.parse(event.data);if(m.id){const job=jobs.get(m.id);jobs.delete(m.id);m.error?job.reject(m.error):job.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')result.runtimeErrors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Page.javascriptDialogOpening'){await send('Page.handleJavaScriptDialog',{accept:true});}
  if(m.method==='Fetch.requestPaused'){
   const p=m.params;try{const u=new URL(p.request.url),route=u.pathname.replace(/^\/backend/,'')+u.search,headers={...p.request.headers};delete headers.Host;delete headers['Content-Length'];
    const r=await fetch('http://127.0.0.1:4107'+route,{method:p.request.method,headers,body:['GET','HEAD'].includes(p.request.method)?undefined:p.request.postData}),body=await r.text();
    if(r.status>=400)result.apiErrors.push({route,status:r.status,message:body.slice(0,350)});
    await send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:r.status,responseHeaders:[{name:'Content-Type',value:r.headers.get('content-type')||'application/json'}],body:Buffer.from(body).toString('base64')});
   }catch(e){if(!String(e.message||'').includes('InterceptionId'))result.apiErrors.push({message:e.message||JSON.stringify(e)});await send('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'}).catch(()=>{});}
  }
 };
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out: '+expression);};
 const click=async text=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing '+${JSON.stringify(text)});b.click();})()`);
 const input=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const chooseLabel=async(label,text)=>evaluate(`(()=>{const l=[...document.querySelectorAll('[role="dialog"] label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)}),e=l.querySelector('select'),o=[...e.options].find(o=>o.textContent===${JSON.stringify(text)});if(!o)throw Error('Missing option');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,o.value);e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const fillLabel=async(label,value)=>evaluate(`(()=>{const l=[...document.querySelectorAll('[role="dialog"] label')].find(l=>l.firstChild.textContent.trim()===${JSON.stringify(label)}),e=l.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const rowExpr=`[...document.querySelectorAll('tr')].find(r=>r.textContent.includes('E2E Browser City'))`;

 async function enter(role){
  const {token}=await(await fetch('http://127.0.0.1:4107/e2e-test-login/'+role)).json();
  const script=await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('matrixtrack_command_access_token',${JSON.stringify(token)});`});
  await send('Page.navigate',{url:process.env.MUNICIPAL_E2E_FRONTEND||'http://127.0.0.1:3017/'});await wait(`!!document.querySelector('aside')`);await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
 }
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/*'}]});
  await enter('HMS_SUPER_ADMIN');
  await evaluate(`Array.from(document.querySelectorAll('aside button')).find(b=>/Product.*Module/.test(b.textContent)).click()`);
  await wait(`document.querySelector('[aria-label="Module access city"]')?.options.length>1`);
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Module access city"]'),o=[...e.options].find(o=>o.textContent==='E2E Municipal Test City');e.value=o.value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait(`Array.from(document.querySelectorAll('main article')).some(a=>a.textContent.includes('CTU/GVP'))`);
  const gvp=`Array.from(document.querySelectorAll('main article')).find(a=>a.textContent.includes('CTU/GVP'))`;
  await wait(`(${gvp})?.textContent.includes('Disable module')`);
  await evaluate(`(${gvp}).querySelector('button').click()`);await wait(`(${gvp})?.textContent.includes('Enable module')`);
  await evaluate(`(${gvp}).querySelector('button').click()`);await wait(`(${gvp})?.textContent.includes('Disable module')`);
  result.steps.push('Super Admin UI disables/re-enables GVP and verifies persisted state');
  await enter('CITY_ADMIN');await click('Municipal Users');await wait(`document.querySelector('main')?.textContent.includes('qc@municipal-e2e.test')`);
  await evaluate(`Array.from(document.querySelectorAll('tr')).find(r=>r.textContent.includes('qc@municipal-e2e.test')).querySelectorAll('td:last-child button')[1].click()`);
  await wait(`!!document.querySelector('[role="dialog"]') && document.querySelector('[role="dialog"]').textContent.includes('CTU/GVP')`);
  const openSi=async()=>{await evaluate(`Array.from(document.querySelectorAll('tr')).find(r=>r.textContent.includes('qc@municipal-e2e.test')).querySelectorAll('td:last-child button')[1].click()`);await wait(`!!document.querySelector('[aria-label="Assign TASKFORCE"]')`);};
  assert.equal(await evaluate(`document.querySelector('[aria-label="Assign TASKFORCE"]').checked`),true);
  await evaluate(`document.querySelector('[aria-label="Assign TASKFORCE"]').click()`);await click('Save changes');await wait(`!document.querySelector('[role="dialog"]')`);
  await openSi();assert.equal(await evaluate(`document.querySelector('[aria-label="Assign TASKFORCE"]').checked`),false);
  await evaluate(`document.querySelector('[aria-label="Assign TASKFORCE"]').click()`);await click('Save changes');await wait(`!document.querySelector('[role="dialog"]')`);
  await openSi();assert.equal(await evaluate(`document.querySelector('[aria-label="Assign TASKFORCE"]').checked`),true);await click('Cancel');
  result.steps.push('City Admin SI module editor displays GVP; removing/reassigning saves and survives reopening');
  await enter('SECOND_CITY_ADMIN');await click('Municipal Users');await wait(`document.querySelector('main')?.textContent.includes('second-admin@municipal-e2e.test')`);
  assert.ok(!await evaluate(`document.querySelector('main').textContent.includes('qc@municipal-e2e.test')`));
  assert.ok(!await evaluate(`document.querySelector('main').textContent.includes('admin@municipal-e2e.test') && !document.querySelector('main').textContent.includes('second-admin@municipal-e2e.test')`));
  result.steps.push('Second city UI directory contains its own admin and excludes first-city SI');
  await enter('COMMISSIONER');await click('Ward Ranking');await wait(`document.querySelectorAll('.score-component-grid button').length===9`);
  const cards=await evaluate(`Array.from(document.querySelectorAll('.score-component-grid button strong')).map(e=>e.innerText)`);
  assert.ok(cards[0].includes('30'),JSON.stringify(cards));
  const total=cards.reduce((sum,label)=>sum+(label.includes('/')?Number(label.split('/')[1].trim()):0),0);assert.ok(Math.abs(total-100)<.001,JSON.stringify(cards));
  result.steps.push('Commissioner Ward Ranking card maxima sum to 100 with Workforce at 30');
  assert.equal(result.apiErrors.length,0,JSON.stringify(result.apiErrors));assert.equal(result.runtimeErrors.length,0,JSON.stringify(result.runtimeErrors));
 }finally{result.body=await evaluate('document.body.innerText').catch(()=>null);const image=await send('Page.captureScreenshot',{format:'png'}).catch(()=>null);if(image)fs.writeFileSync('.ui-review/assignment-isolation-browser.png',Buffer.from(image.data,'base64'));fs.writeFileSync('.ui-review/assignment-isolation-browser-results.json',JSON.stringify(result,null,2));await send('Browser.close');ws.close();}
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
