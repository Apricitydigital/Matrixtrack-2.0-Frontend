const assert = require('node:assert/strict');
const {test,beforeEach} = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module,filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const values = new Map();
global.sessionStorage = {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
global.window = new EventTarget();
const {api,setToken,setRefreshToken,clearToken,getToken,getSessionVersion} = require('../src/services/api.ts');
const jwt = exp => `header.${Buffer.from(JSON.stringify({exp})).toString('base64url')}.signature`;
const json = (value,status=200) => new Response(JSON.stringify(value),{status});
beforeEach(()=>{clearToken();values.clear();});

test('successful ULB target writes notify live dashboards; reads and rejected writes do not',async()=>{
 let updates=0;const updated=()=>updates++;window.addEventListener('matrixtrack:targets-changed',updated);
 try{
  global.fetch=async()=>json({updated:1,created:0});
  await api('/city/targets/percent-scope',{method:'POST',body:JSON.stringify({role:'QC',percent:20,zoneIds:[],wardIds:[]})});assert.equal(updates,1);
  await api('/city/targets/percent-scope?role=QC',{cache:'no-store'});assert.equal(updates,1);
  global.fetch=async()=>json({error:'Not allowed'},403);
  await assert.rejects(api('/city/targets/percent-scope',{method:'POST',body:'{}'}));assert.equal(updates,1);
 }finally{window.removeEventListener('matrixtrack:targets-changed',updated);}
});

test('Connection failures show English guidance without internal URLs or raw fetch errors',async()=>{
  global.fetch=async()=>{throw new TypeError('Failed to fetch http://localhost:4000');};
  await assert.rejects(api('/auth/login',{method:'POST',body:'{}'}),error=>{
    assert.equal(error.status,0);
    assert.equal(error.message,'Unable to connect to the service. Please check your connection and try again. If the problem continues, contact your administrator.');
    return true;
  });
});

test('Cancelled requests retain their cancellation reason',async()=>{
  const controller=new AbortController(),reason=new Error('Navigation cancelled this request');controller.abort(reason);
  global.fetch=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(api('/auth/login',{signal:controller.signal}),error=>error===reason);
});

test('Concurrent browser requests refresh once and use the new access token',async()=>{
  const expired=jwt(1),fresh=jwt(Math.floor(Date.now()/1000)+1800);setToken(expired);setRefreshToken('original-refresh');
  const version=getSessionVersion();let renewals=0,protectedReads=0;
  global.fetch=async(url,options)=>{
    if(url.endsWith('/auth/refresh')) {renewals++;assert.equal(JSON.parse(options.body).refreshToken,'original-refresh');await Promise.resolve();return json({token:fresh,refreshToken:'rotated-refresh'});}
    protectedReads++;assert.equal(new Headers(options.headers).get('Authorization'),`Bearer ${fresh}`);return json({ok:true});
  };
  await Promise.all([api('/auth/me',{cache:'no-store'}),api('/city/info',{cache:'no-store'})]);
  assert.equal(renewals,1);assert.equal(protectedReads,2);assert.equal(getToken(),fresh);assert.equal(getSessionVersion(),version);
  assert.ok([...values.values()].includes('rotated-refresh'));
});
test('Logout during refresh cannot resurrect the old browser session',async()=>{
  setToken(jwt(1));setRefreshToken('old-refresh');let release,reads=0;
  global.fetch=(url)=>url.endsWith('/auth/refresh')?new Promise(resolve=>release=resolve):(reads++,Promise.resolve(json({ok:true})));
  const pending=api('/auth/me',{cache:'no-store'});await Promise.resolve();clearToken();release(json({token:jwt(9999999999),refreshToken:'new-refresh'}));
  await assert.rejects(pending,/session has changed/);assert.equal(getToken(),null);assert.equal(values.size,0);assert.equal(reads,0);
});
test('Rejected refresh clears credentials and never sends the protected request',async()=>{
  setToken(jwt(1));setRefreshToken('revoked-refresh');let requests=0;
  global.fetch=async()=>{requests++;return json({error:'revoked'},401);};
  await assert.rejects(api('/auth/me',{cache:'no-store'}));assert.equal(requests,1);assert.equal(getToken(),null);assert.equal(values.size,0);
});
test('Temporary refresh failure preserves credentials for a later retry',async()=>{
  const expired=jwt(1);setToken(expired);setRefreshToken('valid-refresh');global.fetch=async()=>json({error:'unavailable'},503);
  await assert.rejects(api('/auth/me',{cache:'no-store'}));assert.equal(getToken(),expired);assert.ok([...values.values()].includes('valid-refresh'));
});
