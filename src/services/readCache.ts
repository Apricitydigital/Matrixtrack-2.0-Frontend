// Memory only: each session gets its own short-lived GET cache. Never persists credentials/data.
type Entry={value:any;expires:number};
const values=new Map<string,Entry>();
type Job={controller:AbortController;promise:Promise<any>;users:number};
const jobs=new Map<string,Job>();let epoch=0;
export function clearReadCache(){epoch++;values.clear();for(const job of jobs.values())job.controller.abort();jobs.clear();}
export function readCacheKey(path:string,session:string){const [base,query='']=path.split('?'),params=new URLSearchParams(query);params.sort();return `${session}\n${base}?${params}`;}
export function readCacheTtl(path:string){const base=path.split('?')[0];if(/^\/auth\//.test(base)||['/city/info','/city/modules','/hms/cities'].includes(base))return 0;return ['/city/geo','/city/users','/modules/processing-plant/plants'].includes(base)?120000:30000;}
export function primeReadCache(key:string,value:any,ttl=30000){values.set(key,{value:structuredClone(value),expires:Date.now()+ttl});trim();}
function trim(){while(values.size>100)values.delete(values.keys().next().value!);}
export function cachedRead(key:string,ttl:number,load:(signal:AbortSignal)=>Promise<any>,signal?:AbortSignal,cacheable:(value:any)=>boolean=()=>true):Promise<any>{
  if(signal?.aborted)return Promise.reject(signal.reason || new DOMException('Aborted','AbortError'));
  const cached=values.get(key);if(cached&&cached.expires>Date.now())return Promise.resolve(structuredClone(cached.value));
  if(cached)values.delete(key);
  let job=jobs.get(key);
  if(!job){const controller=new AbortController(),version=epoch;job={controller,users:0,promise:Promise.resolve()};const current=job;
    current.promise=load(controller.signal).then(value=>{if(version===epoch&&!controller.signal.aborted&&cacheable(value))primeReadCache(key,value,ttl);return value;}).finally(()=>{if(jobs.get(key)===current)jobs.delete(key);});jobs.set(key,current);
  }
  const current=job;current.users++;
  return new Promise((resolve,reject)=>{let done=false;const finish=(error:any,value?:any)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);current.users--;if(!current.users&&jobs.get(key)===current){jobs.delete(key);current.controller.abort();}if(error)reject(error);else resolve(structuredClone(value));};const abort=()=>finish(signal?.reason || new DOMException('Aborted','AbortError'));signal?.addEventListener('abort',abort,{once:true});current.promise.then(value=>finish(null,value),error=>finish(error));});
}
