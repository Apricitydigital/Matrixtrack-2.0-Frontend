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
 let script;
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/backend/*'}]});
  const {token}=await(await fetch('http://127.0.0.1:4107/e2e-test-login/HMS_SUPER_ADMIN')).json();
  script=await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('matrixtrack_command_access_token',${JSON.stringify(token)});`});
  await send('Page.navigate',{url:process.env.MUNICIPAL_E2E_FRONTEND||'http://localhost:3000/'});await wait(`!!document.querySelector('aside')`);await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
  await click('City Directory');await wait(`document.querySelector('main')?.textContent.includes('Created date')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Onboard Municipal Corporation')).click()`);
  await wait(`document.querySelector('[role="dialog"] select')?.options.length>1`);
  await chooseLabel('State','E2E State');await wait(`document.querySelectorAll('[role="dialog"] select')[1].options.length>1`);
  await chooseLabel('District','E2E District');await wait(`document.querySelectorAll('[role="dialog"] select')[2].options.length>1`);
  await chooseLabel('City','E2E Browser City');
  await fillLabel('Administrator name','Browser Administrator');await fillLabel('Email','browser-admin@municipal-e2e.test');await fillLabel('Initial password','LocalTest@12345');
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] label')).find(l=>l.textContent.trim()==='sweeping').querySelector('input').click()`);
  await click('Create city');await wait(`!document.querySelector('[role="dialog"]') && Boolean(${rowExpr})`);
  assert.ok(await evaluate(`(${rowExpr}).textContent.includes('Active')`));result.steps.push('UI onboarding with optional codes, one selected module, administrator and date columns');
  await evaluate(`(${rowExpr}).querySelector('[title="Deactivate Corporation"]').click()`);await wait(`(${rowExpr})?.textContent.includes('Inactive')`);
  await evaluate(`(${rowExpr}).querySelector('[title="Activate Corporation"]').click()`);await wait(`(${rowExpr})?.textContent.includes('Active')`);result.steps.push('UI disable and enable persist');
  await evaluate(`(${rowExpr}).querySelector('[title="Move to Trash"]').click()`);await input('textarea','E2E browser lifecycle test');await click('Confirm Move to Trash');await wait(`!(${rowExpr})`);
  await click('Trash and Restore');await wait(`document.querySelector('main')?.textContent.includes('E2E Browser City')`);await click('Restore City');
  await click('City Directory');await wait(`Boolean(${rowExpr})`);result.steps.push('UI Trash removal and restore return the city to the directory');
  await click('Registered Users');await wait(`document.querySelector('main')?.textContent.includes('qc@municipal-e2e.test')`);
  await evaluate(`Array.from(document.querySelectorAll('tr')).find(r=>r.textContent.includes('qc@municipal-e2e.test')).querySelector('button').click()`);
  await wait(`!!document.querySelector('[aria-label="City assignment Zone 2"]')`);
  await input('[aria-label="Edit personnel name"]','Browser Edited Inspector');
  await evaluate(`document.querySelector('[aria-label="City assignment Zone 1"]').click();document.querySelector('[aria-label="City assignment Zone 2"]').click()`);
  await wait(`!!document.querySelector('[aria-label="City assignment Ward 2"]')`);await evaluate(`document.querySelector('[aria-label="City assignment Ward 2"]').click()`);
  await evaluate(`Array.from(document.querySelectorAll('input[aria-label^="Edit assign "]')).filter(e=>e.getAttribute('aria-label')!=='Edit assign SWEEPING'&&e.checked).forEach(e=>e.click())`);
  await click('Save changes');await wait(`!document.querySelector('[role="dialog"]') && document.querySelector('main')?.textContent.includes('saved and verified')`);
  await evaluate(`Array.from(document.querySelectorAll('tr')).find(r=>r.textContent.includes('qc@municipal-e2e.test')).querySelector('button').click()`);await wait(`!!document.querySelector('[aria-label="City assignment Zone 2"]')`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="City assignment Zone 2"]').checked&&document.querySelector('[aria-label="City assignment Ward 2"]').checked&&Array.from(document.querySelectorAll('input[aria-label^="Edit assign "]')).filter(e=>e.checked).length===1`),true);
  result.steps.push('UI edit/reopen confirms saved profile, Zone 2, Ward 2 and Sweeping-only permissions');
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/lifecycle-user-edit.png',Buffer.from(shot.data,'base64'));
  await click('Cancel');
  // Restore the test inspector through the same UI before the dashboard smoke tests.
  await evaluate(`Array.from(document.querySelectorAll('tr')).find(r=>r.textContent.includes('qc@municipal-e2e.test')).querySelector('button').click()`);await wait(`!!document.querySelector('[aria-label="City assignment Zone 2"]')`);
  await evaluate(`document.querySelector('[aria-label="City assignment Zone 2"]').click();document.querySelector('[aria-label="City assignment Zone 1"]').click()`);await wait(`!!document.querySelector('[aria-label="City assignment Ward 1"]')`);await evaluate(`document.querySelector('[aria-label="City assignment Ward 1"]').click();Array.from(document.querySelectorAll('input[aria-label^="Edit assign "]')).filter(e=>!e.checked).forEach(e=>e.click())`);
  await click('Save changes');await wait(`!document.querySelector('[role="dialog"]')`);
  const loginResponse=await fetch('http://127.0.0.1:4107/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'browser-admin@municipal-e2e.test',password:'LocalTest@12345'})});
  const browserAdmin=await loginResponse.json();assert.ok(loginResponse.ok);
  const adminScript=await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('matrixtrack_command_access_token',${JSON.stringify(browserAdmin.token)});`});
  await send('Page.navigate',{url:process.env.MUNICIPAL_E2E_FRONTEND||'http://localhost:3000/'});await wait(`!!document.querySelector('aside')`);await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:adminScript.identifier});
  const menu=await evaluate(`Array.from(document.querySelectorAll('aside button')).map(b=>b.textContent.trim())`);
  assert.ok(menu.includes('Sweeping'));for(const label of ['Cleanliness of Toilet','Litter Bins','Nala','CTU/GVP Transformation','Plant & Processing'])assert.ok(!menu.includes(label),label+' must remain hidden');
  await click('Module Directory');await wait(`document.querySelector('main')?.textContent.includes('Operational module directory')`);
  assert.equal(await evaluate(`document.querySelectorAll('main article').length`),1);
  result.steps.push('New city administrator sees only Super Admin-enabled Sweeping in navigation and module directory');
  assert.equal(result.apiErrors.length,0,JSON.stringify(result.apiErrors));assert.equal(result.runtimeErrors.length,0,JSON.stringify(result.runtimeErrors));
 }finally{result.body=await evaluate('document.body.innerText').catch(()=>null);const image=await send('Page.captureScreenshot',{format:'png'}).catch(()=>null);if(image)fs.writeFileSync('.ui-review/lifecycle-browser-final.png',Buffer.from(image.data,'base64'));fs.writeFileSync('.ui-review/lifecycle-browser-results.json',JSON.stringify(result,null,2));await send('Browser.close');ws.close();}
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
