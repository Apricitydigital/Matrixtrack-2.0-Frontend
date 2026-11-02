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
  await wait(`document.querySelector('[data-action-summary="all_actions_required"] strong')?.textContent==='1'`);
  assert.equal(await evaluate(`document.querySelector('[data-action-summary="action_taken"] strong').textContent`),'1');
  assert.equal(await evaluate(`document.querySelector('[data-action-summary="actions_outstanding"] strong').textContent`),'0');
  result.checks.push('Action Taken retains Total actions required and reduces only outstanding');
  await evaluate(`document.querySelector('[data-action-summary="all_actions_required"]').click()`);
  await wait(`document.querySelector('.register-coverage')?.textContent.includes('1 matching')`);
  result.checks.push('Cumulative action card drilldown returns the same report');
  await click('City Overview');await wait(`!!document.querySelector('[data-outcome="pending_review"]')`);await evaluate(`document.querySelector('[data-outcome="pending_review"]').click()`);
  await wait(`!!document.querySelector('.ops-filter-grid select')`);
  await evaluate(`(()=>{const e=[...document.querySelectorAll('.ops-filter select')].find(e=>[...e.options].some(o=>o.value==='nala'));Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'nala');e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait(`document.querySelectorAll('.commissioner-report-table tbody tr').length===1`);
  await evaluate(`document.querySelector('.report-open-button').click()`);
  await wait(`document.querySelector('.report-detail')?.innerText.includes('E2E saved SI evidence suggestion')&&!document.querySelector('.report-detail')?.innerText.includes('Updating report...')`);
  assert.ok(await evaluate(`document.querySelectorAll('.report-detail .report-evidence-preview img').length>0`));
  await wait(`Array.from(document.querySelectorAll('.report-detail .report-evidence-preview img')).every(i=>i.complete&&i.naturalWidth>0)`);
  assert.ok(await evaluate(`!document.querySelector('.report-detail')?.innerText.includes('Generate ULB suggestion')`));
  await click('Refresh report');await wait(`!document.querySelector('.report-detail')?.innerText.includes('Updating report...')`);
  assert.ok(await evaluate(`document.querySelector('.report-detail')?.innerText.includes('E2E saved SI evidence suggestion')`));
  result.checks.push('Pending report opens exact record, decodes photos, shows saved SI AI and refreshes without losing evidence');

  const pendingShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/pending-report-photos.png',Buffer.from(pendingShot.data,'base64'));
  const register=await(await fetch('http://127.0.0.1:4107/modules/NALA/records?tab=HISTORY&limit=100',{headers:{authorization:'Bearer '+token}})).json(),record=register.data.find(r=>r.autoQcResult?.summary==='E2E saved SI evidence suggestion');assert.ok(record);
  for(const [role,status,expected] of [['QC','APPROVED','Approved'],['ULB_OFFICER','ACTION_REQUIRED','Action required'],['ACTION_OFFICER','ACTION_TAKEN','Action taken']]){
   const actor=await(await fetch('http://127.0.0.1:4107/e2e-test-login/'+role)).json();
   const changed=await fetch('http://127.0.0.1:4107/modules/NALA/records/'+record.id+'/status',{method:'PATCH',headers:{authorization:'Bearer '+actor.token,'content-type':'application/json'},body:JSON.stringify({status,remarks:'Browser workflow update',...(status==='ACTION_TAKEN'?{aoPhotos:['http://127.0.0.1:4107/test-photo.jpg']}: {})})});assert.ok(changed.ok,await changed.text());
   await click('Refresh report');await wait(`!document.querySelector('.report-detail')?.innerText.includes('Updating report...')&&document.querySelector('.report-status-strip')?.innerText.includes(${JSON.stringify(expected)})`);
   assert.ok(await evaluate(`document.querySelectorAll('.report-detail .report-evidence-preview img').length>0`));
  }
  result.checks.push('Actual SI/ULB/IEC status changes refresh in the Commissioner drawer without losing photos or AI');
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
  await click('City Overview');await wait(`document.querySelector('[data-action-summary="all_actions_required"] strong')?.textContent==='2'&&document.querySelector('[data-action-summary="action_taken"] strong')?.textContent==='2'`);result.checks.push('Dashboard refresh retains both required actions after both become Action Taken');
  await click('Ward Ranking');await wait(`document.querySelectorAll('.score-component-grid>button').length===9`);
  const cards=await evaluate(`Array.from(document.querySelectorAll('.score-component-grid>button')).map(b=>b.innerText)`);
  assert.ok(cards.some(c=>c.includes('Workforce')&&c.includes('/ 30')));
  // Ward 2 has no entities: 70 marks remain distributed among the three responsibilities.
  await evaluate(`(()=>{const e=document.querySelector('[aria-label="Ranking ward"]'),o=[...e.options].find(o=>o.textContent==='Ward 2');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,o.value);e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait(`document.querySelector('.ward-explanation')?.innerText.includes('Ward 2')`);
  const absent=await evaluate(`Array.from(document.querySelectorAll('.score-component-grid>button')).map(b=>b.innerText)`);
  assert.ok(absent.some(c=>c.startsWith('Litter Bins')&&c.includes('No entities')));
  assert.ok(absent.some(c=>c.startsWith('Daroga')&&c.includes('redistributed')));
  result.checks.push('Absent inventory redistributes the 70 marks while Workforce stays 30');
  const screenshot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('.ui-review/action-equal-browser.png',Buffer.from(screenshot.data,'base64'));
  assert.equal(result.runtimeErrors.length,0,JSON.stringify(result.runtimeErrors));assert.equal(result.apiErrors.length,0,JSON.stringify(result.apiErrors));
 }finally{fs.writeFileSync('.ui-review/action-equal-browser-results.json',JSON.stringify(result,null,2));await send('Browser.close');ws.close();}
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
