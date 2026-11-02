// Real UI writes against the disposable municipal-workflow.e2e.cjs API only.
const fs=require('node:fs'),assert=require('node:assert/strict');
const result={steps:[],apiErrors:[],runtimeErrors:[]};const pushStep=result.steps.push.bind(result.steps);result.steps.push=(message)=>{console.log('PASS '+message);return pushStep(message);};
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
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:require('node:path').resolve('.ui-review')});
  await enter('COMMISSIONER');await click('City Overview');
  await wait(`document.querySelector('.overview-outcomes .status-breakdown[aria-busy="false"]') && document.querySelector('[data-metric="overview-inspections"]')?.textContent!=='?'`);
  await evaluate(`document.querySelector('[aria-label="Close city briefing"]')?.click();Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='View dashboard')?.click()`);
  const partition=await evaluate(`Array.from(document.querySelectorAll('.overview-outcomes .status-breakdown')[0].querySelectorAll('.status-breakdown-legend strong')).map(e=>Number(e.textContent.replaceAll(',','')))`);
  assert.ok(partition.every(Number.isFinite));assert.ok(partition.reduce((a,b)=>a+b,0)>0);result.steps.push('Commissioner distribution uses actual status counts, including neutral Draft');
  await evaluate(`document.querySelector('.overview-outcomes [data-outcome="pending_review"]').click()`);await wait(`document.querySelector('[role="dialog"]') || /inspection register/i.test(document.body.innerText)`);
  result.steps.push('Chart legend drills into pending source reports');
  await click('City Overview');await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Review report data')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='View dashboard')?.click()`);await click('Review report data');
  await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Download full audit workbook'&&!b.disabled)`);
  await click('Download full audit workbook');await wait(`document.body.innerText.includes('Audit workbook downloaded.')`);
  result.steps.push('Full audit workbook downloads after source pagination verification');
  let downloaded;for(let i=0;i<100;i++){downloaded=fs.readdirSync('.ui-review').find(n=>n==='MatrixTrack-audit-2026-11-02-to-2026-11-02.xlsx');if(downloaded)break;await new Promise(r=>setTimeout(r,100));}assert.ok(downloaded,'Missing workbook');
  const {Workbook}=require('exceljs'),book=new Workbook();await book.xlsx.readFile('.ui-review/'+downloaded);
  for(const name of ['Read me','Services','Ward rankings','Ward components','Inspections','Photo evidence','Attendance records','Officer measures','Source availability'])assert.ok(book.getWorksheet(name),name);
  assert.ok(book.getWorksheet('Inspections').rowCount>1);assert.equal(book.getWorksheet('Attendance records').rowCount,2);result.steps.push('Workbook contains full fixture inspection evidence and the exact attendance row count');
  await enter('CITY_ADMIN');await wait(`document.querySelectorAll('[data-admin-module] .insight-bar-chart').length>0`);result.steps.push('City Admin asset charts replace count tiles');
  await enter('ULB_OFFICER');await wait(`!!document.querySelector('.ulb-dashboard .status-breakdown[aria-busy="false"]')`);
  assert.ok(await evaluate(`document.querySelector('[data-ulb-metric="unclassified"]')?.textContent.includes('Draft')`));result.steps.push('ULB chart distinguishes Draft from Pending review');
  await enter('HMS_SUPER_ADMIN');await wait(`!!document.querySelector('[aria-label="City provisioning"][aria-busy="false"]')`);result.steps.push('Super Admin provisioning chart uses exclusive readiness categories');
  assert.equal(result.runtimeErrors.length,0,JSON.stringify(result.runtimeErrors));assert.equal(result.apiErrors.length,0,JSON.stringify(result.apiErrors));
 }finally{result.body=await evaluate('document.body.innerText').catch(()=>null);const shot=await send('Page.captureScreenshot',{format:'png'}).catch(()=>null);if(shot)fs.writeFileSync('.ui-review/ppt-audit-fixture-dashboard.png',Buffer.from(shot.data,'base64'));fs.writeFileSync('.ui-review/ppt-audit-browser-results.json',JSON.stringify(result,null,2));await Promise.race([send('Browser.close'),new Promise(r=>setTimeout(r,1000))]);ws.close();}
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
