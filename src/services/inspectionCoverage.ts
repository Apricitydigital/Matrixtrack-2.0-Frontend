import { actionLifecycle, actionIsPending } from './actionLifecycle';
import { INSPECTION_STATUSES, inspectionStatus } from './inspectionStatus';
export { INSPECTION_STATUSES, inspectionStatus } from './inspectionStatus';
import { api,getToken,ApiError } from './api';
import {cachedRead} from './readCache';
import {concurrentReads} from './concurrentReads';
import { MODULE_KEYS } from './adapters';
import { mapAssets, type MapAsset } from './operationsMap';
import type { City, OperationalModuleId, Zone } from '../types';

export interface InspectionVisit { id: string; module: OperationalModuleId; assetId?: string; zoneId: string; wardId: string; status?: string; submittedAt?:string; actionRequired?:boolean; actionTaken?:boolean; raw?:any; }
export interface CoverageCounts {
  total: number | null; inspections: number | null; unique: number | null;
  repeats: number | null; repeatedLocations: number | null; covered: number | null;
  required?: number | null; dailyCovered?: number | null; days?: number; remaining: number | null; percent: number | null; unidentified: number; outsideRegister: number;
}
export interface InspectionCoverage {
  compact?: boolean;
  from?: string; to?: string; assets: MapAsset[]; visits: InspectionVisit[]; modules: OperationalModuleId[];
  failedModules: OperationalModuleId[]; inventoryAvailable: boolean; errors: string[];
}
export const emptyCoverage = (): InspectionCoverage => ({assets:[],visits:[],modules:[],failedModules:[],inventoryAvailable:false,errors:[]});

export function inspectionVisit(raw: any, module: OperationalModuleId, cityId: string): InspectionVisit | null {
  if (raw.type === 'BIN_REGISTRATION' || raw.cityId && raw.cityId !== cityId) return null;
  if (!raw.id) throw new Error('Inspection response is missing a report ID.');
  const asset = raw.beat || raw.toilet || raw.bin || raw.nala || raw.feederPoint || {};
  const assetId = raw.assetId || (module==='sweeping'?raw.beatId:module==='toilets'?raw.toiletId:module==='litter_bins'?raw.binId:module==='nala'?raw.nalaPointId:raw.feederPointId || raw.gvpId) || (module==='nala'?raw.nalaPoint?.id:asset.id);
  const payload=raw.payload||{},history=raw.statusHistory||raw.timeline||payload.statusHistory||[];
  const lifecycle=actionLifecycle(raw),actionRequired=lifecycle.required;
  return {id:`${module}:${raw.id}`,module,raw,actionRequired,actionTaken:lifecycle.taken,submittedAt:raw.submittedAt||raw.createdAt||'',status:String(raw.workspaceStatus || raw.status || 'SUBMITTED').toUpperCase(),assetId:assetId?String(assetId):undefined,zoneId:raw.zoneId || raw.zone?.id || asset.zoneId || asset.zone?.id || '',wardId:raw.wardId || raw.ward?.id || asset.wardId || asset.ward?.id || ''};
}

/** All calls are GETs to existing city-scoped endpoints; no report writes or decisions. */
export async function loadInspectionCoverage(city: Pick<City,'id'|'enabledModules'>, from: string, to: string, signal: AbortSignal,compact=false): Promise<InspectionCoverage> {
  const token=getToken();
  const read=async(sharedSignal:AbortSignal)=>{
    if(compact&&city.enabledModules.length){
      try{
        const data=await api(`/city/dashboard/inspection-coverage?${new URLSearchParams({from,to,modules:city.enabledModules.join(',')})}`,{signal:sharedSignal,cache:'no-store'});
        if(data?.version!==1||data.complete!==true||data.cityId!==city.id||data.from!==from||data.to!==to||!Array.isArray(data.assets)||!Array.isArray(data.visits)||!Array.isArray(data.modules)||!Array.isArray(data.failedModules)||!Array.isArray(data.errors)||typeof data.inventoryAvailable!=='boolean'||city.enabledModules.some(m=>!data.modules.includes(m)))throw Error('Compact inspection register is incomplete or has the wrong scope.');
        if(data.visits.some((v:any)=>!v.id||!city.enabledModules.includes(v.module)||!v.submittedAt)||data.assets.some((a:any)=>!a.id||!city.enabledModules.includes(a.module)))throw Error('Compact inspection register is missing required identifiers.');
        return {...data,compact:true} as InspectionCoverage;
      }catch(error){
        // Old backends and scoped field roles retain their existing authorized reader.
        if(!(error instanceof ApiError)||![403,404].includes(error.status))throw error;
      }
    }
    return fetchInspectionCoverage(city,from,to,sharedSignal);
  };
  if(!token)return read(signal);
  const key=JSON.stringify(['inspection-coverage',compact,token,city.id,[...city.enabledModules].sort(),from,to]);
  return cachedRead(key,30000,read,signal,result=>result.inventoryAvailable&&!result.failedModules.length&&!result.errors.length);
}
async function fetchInspectionCoverage(city: Pick<City,'id'|'enabledModules'>, from: string, to: string, signal: AbortSignal): Promise<InspectionCoverage> {
  const result = emptyCoverage(); result.from=from; result.to=to; result.modules = [...city.enabledModules];
  const inventory = api(`/city/dashboard/operations-map?${new URLSearchParams({date:to,cityId:city.id})}`,{signal}).then(data=>{
    const groups:Record<OperationalModuleId,string>={sweeping:'beats',toilets:'toilets',litter_bins:'bins',nala:'nalas',ctu_gvp:'gvps'};
    if (!city.enabledModules.every(module=>Array.isArray(data?.[groups[module]]))) throw new Error('Location inventory is incomplete.');
    const assets=mapAssets(data).filter(a=>city.enabledModules.includes(a.module));
    if(assets.some(a=>!a.id))throw new Error('Location inventory is missing location IDs.');
    result.assets=assets; result.inventoryAvailable=true;
  }).catch(error=>{if(signal.aborted)throw error;result.errors.push('Location inventory unavailable.');});
  // Two modules at a time; date changes cancel every remaining page.
  const loadModule=async(module:OperationalModuleId)=>{
    try {
      const query=new URLSearchParams({cityId:city.id,tab:module==='litter_bins'||module==='ctu_gvp'?'DAILY_REPORTS':'HISTORY',startDate:`${from}T00:00:00+05:30`,endDate:`${to}T23:59:59.999+05:30`,limit:'500'});
      const visits=new Map<string,InspectionVisit>(),seenReports=new Set<string>();let expectedTotal:number|undefined;
      const readPage=async(page:number)=>{
        signal.throwIfAborted();
        const params=new URLSearchParams(query);params.set('page',String(page));
        const response=await api(`/modules/${MODULE_KEYS[module]}/records?${params}`,{signal});
        if(!Array.isArray(response?.data))throw new Error('Unexpected inspection response.');
        return response;
      };
      const first=await readPage(1),pagination=first.meta || first.pagination || first;
      if(pagination.total!=null&&Number.isFinite(Number(pagination.total)))expectedTotal=Number(pagination.total);
      if(pagination.totalPages==null&&expectedTotal==null&&first.data.length>=100)throw new Error('Inspection pagination metadata is missing; a complete total cannot be verified.');
      const pageSize=Number(pagination.limit || pagination.pageSize || first.data.length || 100);
      const totalPages=Number(pagination.totalPages ?? (expectedTotal!=null?Math.ceil(expectedTotal/pageSize):1));
      if(!Number.isInteger(totalPages)||totalPages<0||totalPages>1000)throw new Error('Inspection period exceeds the supported page limit. Narrow the dates.');
      const consume=(response:any,page:number)=>{
        let added=0;
        for(const raw of response.data){if(raw.id&&!seenReports.has(String(raw.id)))added++;if(raw.id)seenReports.add(String(raw.id));const visit=inspectionVisit(raw,module,city.id);if(visit)visits.set(visit.id,visit);}
        if(page<=totalPages&&page>1&&!added)throw new Error('Inspection pagination repeated a page or ended early.');
      };
      consume(first,1);
      // Fetch bounded batches instead of a long serial waterfall. Never publish partial module totals.
      for(let page=2;page<=totalPages;page+=3){
        const pages=Array.from({length:Math.min(3,totalPages-page+1)},(_,i)=>page+i);
        const responses=await Promise.all(pages.map(readPage));responses.forEach((response,i)=>consume(response,pages[i]));
      }
      if(expectedTotal!=null&&seenReports.size!==expectedTotal)throw new Error('Inspection pages do not match the reported total.');
      result.visits.push(...visits.values());return;
    }catch(error){if(signal.aborted)throw error;result.failedModules.push(module);result.errors.push(`${MODULE_KEYS[module]}: ${error instanceof Error?error.message:'Inspection counts unavailable.'}`);}
  };
  const records=concurrentReads(city.enabledModules.map(module=>()=>loadModule(module)),2).then(results=>{const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;});
  await Promise.all([inventory,records]);
  // Missing report geography can be recovered only from an exact registered location ID.
  const registry=new Map(result.assets.map(a=>[`${a.module}:${a.id}`,a]));
  result.visits=result.visits.map(v=>{const a=registry.get(`${v.module}:${v.assetId}`);return {...v,zoneId:v.zoneId||a?.zoneId||'',wardId:v.wardId||a?.wardId||''};});
  return result;
}

export function coverageCounts(data:InspectionCoverage,{module,zone='',ward='',zoneIds=[],wardIds=[]}:{module?:OperationalModuleId;zone?:string;ward?:string;zoneIds?:string[];wardIds?:string[]}={}):CoverageCounts {
  const matches=(item:{module:OperationalModuleId;zoneId:string;wardId:string})=>(!module||item.module===module)&&(!zone||item.zoneId===zone)&&(!ward||item.wardId===ward)&&(!zoneIds.length||zoneIds.includes(item.zoneId))&&(!wardIds.length||wardIds.includes(item.wardId));
  const assets=data.assets.filter(matches),visits=[...new Map(data.visits.filter(matches).map(v=>[v.id,v])).values()];
  const reportsAvailable=!data.failedModules.some(m=>!module||m===module);
  const unidentified=visits.filter(v=>!v.assetId).length;
  const frequency=new Map<string,number>();for(const visit of visits)if(visit.assetId){const key=`${visit.module}:${visit.assetId}`;frequency.set(key,(frequency.get(key)||0)+1);}
  const missingGeography=data.visits.some(v=>(!module||v.module===module)&&(((zone||zoneIds.length)&&!v.zoneId)||((ward||wardIds.length)&&!v.wardId)));
  const known=reportsAvailable&&!missingGeography,exact=known&&!unidentified;
  const registered=new Set(assets.map(a=>`${a.module}:${a.id}`));
  const covered=[...frequency.keys()].filter(key=>registered.has(key)).length;
  const total=data.inventoryAvailable?registered.size:null;
  const days=data.from&&data.to?Math.max(1,Math.round((Date.parse(data.to)-Date.parse(data.from))/86400000)+1):1;
  const daily=new Set<string>();
  let dated=true;
  for(const v of visits){if(!v.submittedAt||!Number.isFinite(Date.parse(v.submittedAt))){dated=false;continue;}
    const date=new Date(Date.parse(v.submittedAt)+330*60000).toISOString().slice(0,10);
    if(registered.has(`${v.module}:${v.assetId}`))daily.add(`${v.module}:${v.assetId}:${date}`);
  }
  return {days,required:total==null?null:total*days,dailyCovered:exact&&total!=null?(days===1?covered:dated?daily.size:null):null,total,inspections:known?visits.length:null,unique:exact?frequency.size:null,repeats:exact?visits.length-frequency.size:null,repeatedLocations:exact?[...frequency.values()].filter(n=>n>1).length:null,covered:exact&&total!=null?covered:null,remaining:exact&&total!=null?total-covered:null,percent:exact&&total?covered/total*100:null,unidentified,outsideRegister:[...frequency.keys()].filter(key=>!registered.has(key)).length};
}

export function zoneCoverage(data:InspectionCoverage,zones:Zone[],rankings:any[],ward='') {
  return zones.map(zone=>{
    const counts=coverageCounts(data,{zone:zone.id,ward});
    const assessed=rankings.filter(r=>r.zoneId===zone.id&&(!ward||r.wardId===ward)&&r.rankable!==false&&typeof r.finalScore==='number'&&Number.isFinite(r.finalScore));
    return {id:zone.id,name:zone.name,...counts,assessed:assessed.length,wardAverage:assessed.length?assessed.reduce((n,r)=>n+r.finalScore,0)/assessed.length:null};
  });
}

/** Mutually exclusive current states from the same complete register as Inspections done. */
export function inspectionOutcomes(data:InspectionCoverage,scope:{module?:OperationalModuleId;zone?:string;ward?:string}={}) {
  const counts=coverageCounts(data,scope),known=counts.inspections!=null;
  const visits=[...new Map(data.visits.filter(v=>(!scope.module||v.module===scope.module)&&(!scope.zone||v.zoneId===scope.zone)&&(!scope.ward||v.wardId===scope.ward)).map(v=>[v.id,v])).values()];
  return {total:counts.inspections,rows:INSPECTION_STATUSES.map(row=>({...row,value:known?visits.filter(v=>inspectionStatus(v.status)===row.id).length:null}))};
}


/** Lifecycle totals overlap current status counts; they are never summed into inspections. */
export function inspectionActions(data:InspectionCoverage,scope:{module?:OperationalModuleId;zone?:string;ward?:string}={}) {
 const known=coverageCounts(data,scope).inspections!=null;
 const visits=[...new Map(data.visits.filter(v=>(!scope.module||v.module===scope.module)&&(!scope.zone||v.zoneId===scope.zone)&&(!scope.ward||v.wardId===scope.ward)).map(v=>[v.id,v])).values()];
 const required=visits.filter(v=>actionLifecycle(v).required);
 const taken=required.filter(v=>actionLifecycle(v).taken).length;
 return {totalRequired:known?required.length:null,taken:known?taken:null,outstanding:known?required.filter(actionIsPending).length:null};
}
