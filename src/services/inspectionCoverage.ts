import { api,getToken } from './api';
import {cachedRead} from './readCache';
import {concurrentReads} from './concurrentReads';
import { MODULE_KEYS } from './adapters';
import { mapAssets, type MapAsset } from './operationsMap';
import type { City, OperationalModuleId, Zone } from '../types';

export interface InspectionVisit { id: string; module: OperationalModuleId; assetId?: string; zoneId: string; wardId: string; status?: string; submittedAt?:string; actionRequired?:boolean; raw?:any; }
export interface CoverageCounts {
  total: number | null; inspections: number | null; unique: number | null;
  repeats: number | null; repeatedLocations: number | null; covered: number | null;
  remaining: number | null; percent: number | null; unidentified: number; outsideRegister: number;
}
export interface InspectionCoverage {
  assets: MapAsset[]; visits: InspectionVisit[]; modules: OperationalModuleId[];
  failedModules: OperationalModuleId[]; inventoryAvailable: boolean; errors: string[];
}
export const emptyCoverage = (): InspectionCoverage => ({assets:[],visits:[],modules:[],failedModules:[],inventoryAvailable:false,errors:[]});

export function inspectionVisit(raw: any, module: OperationalModuleId, cityId: string): InspectionVisit | null {
  if (raw.type === 'BIN_REGISTRATION' || raw.cityId && raw.cityId !== cityId) return null;
  if (!raw.id) throw new Error('Inspection response is missing a report ID.');
  const asset = raw.beat || raw.toilet || raw.bin || raw.nala || raw.feederPoint || {};
  const assetId = raw.assetId || (module==='sweeping'?raw.beatId:module==='toilets'?raw.toiletId:module==='litter_bins'?raw.binId:module==='nala'?raw.nalaId:raw.feederPointId || raw.gvpId) || asset.id;
  const payload=raw.payload||{},history=raw.statusHistory||raw.timeline||payload.statusHistory||[];
  const actionRequired=Boolean(raw.actionRequiredAt||payload.actionRequiredAt||[raw.status,raw.workspaceStatus,raw.actionStatus,raw.ulbStatus,payload.ulbStatus].some(s=>['ACTION_REQUIRED','ACTION_TAKEN'].includes(String(s).toUpperCase()))||(Array.isArray(history)&&history.some(h=>/ACTION_REQUIRED/i.test(String(h.event||h.action||h.status||h.statusAfter||'')))));
  return {id:`${module}:${raw.id}`,module,raw,actionRequired,submittedAt:raw.submittedAt||raw.createdAt||'',status:String(raw.workspaceStatus || raw.status || 'SUBMITTED').toUpperCase(),assetId:assetId?String(assetId):undefined,zoneId:raw.zoneId || raw.zone?.id || asset.zoneId || asset.zone?.id || '',wardId:raw.wardId || raw.ward?.id || asset.wardId || asset.ward?.id || ''};
}

/** All calls are GETs to existing city-scoped endpoints; no report writes or decisions. */
export async function loadInspectionCoverage(city: Pick<City,'id'|'enabledModules'>, from: string, to: string, signal: AbortSignal): Promise<InspectionCoverage> {
  const token=getToken();
  if(!token)return fetchInspectionCoverage(city,from,to,signal);
  const key=JSON.stringify(['inspection-coverage',token,city.id,[...city.enabledModules].sort(),from,to]);
  return cachedRead(key,30000,sharedSignal=>fetchInspectionCoverage(city,from,to,sharedSignal),signal,result=>result.inventoryAvailable&&!result.failedModules.length&&!result.errors.length);
}
async function fetchInspectionCoverage(city: Pick<City,'id'|'enabledModules'>, from: string, to: string, signal: AbortSignal): Promise<InspectionCoverage> {
  const result = emptyCoverage(); result.modules = [...city.enabledModules];
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
      const query=new URLSearchParams({cityId:city.id,tab:module==='litter_bins'?'DAILY_REPORTS':'HISTORY',startDate:`${from}T00:00:00+05:30`,endDate:`${to}T23:59:59.999+05:30`,limit:'100'});
      const visits=new Map<string,InspectionVisit>(),seenReports=new Set<string>();let expectedTotal:number|undefined;
      for(let page=1;page<=1000;page++){
        signal.throwIfAborted();query.set('page',String(page));
        const response=await api(`/modules/${MODULE_KEYS[module]}/records?${query}`,{signal});
        if(!Array.isArray(response?.data))throw new Error('Unexpected inspection response.');
        const pagination=response.meta || response.pagination || response;
        if(Number.isFinite(Number(pagination.total)))expectedTotal=Number(pagination.total);
        const totalPages=Number(pagination.totalPages ?? (expectedTotal!=null?Math.ceil(expectedTotal/100):1));
        if(!Number.isFinite(totalPages)||totalPages>1000)throw new Error('Inspection period exceeds the supported page limit. Narrow the dates.');
        let added=0;
        for(const raw of response.data){if(raw.id)seenReports.add(String(raw.id));const visit=inspectionVisit(raw,module,city.id);if(visit&&!visits.has(visit.id)){visits.set(visit.id,visit);added++;}}
        if(page<totalPages&&!added&&response.data.length)throw new Error('Inspection pagination repeated a page.');
        if(page>=totalPages){if(expectedTotal!=null&&seenReports.size!==expectedTotal)throw new Error('Inspection pages do not match the reported total.');result.visits.push(...visits.values());return;}
        if(!response.data.length)throw new Error('Inspection pagination ended early.');
      }
      throw new Error('Inspection period is too large. Narrow the dates.');
    }catch(error){if(signal.aborted)throw error;result.failedModules.push(module);result.errors.push(`${MODULE_KEYS[module]}: ${error instanceof Error?error.message:'Inspection counts unavailable.'}`);}
  };
  const records=concurrentReads(city.enabledModules.map(module=>()=>loadModule(module)),2).then(results=>{const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;});
  await Promise.all([inventory,records]);
  // Missing report geography can be recovered only from an exact registered location ID.
  const registry=new Map(result.assets.map(a=>[`${a.module}:${a.id}`,a]));
  result.visits=result.visits.map(v=>{const a=registry.get(`${v.module}:${v.assetId}`);return {...v,zoneId:v.zoneId||a?.zoneId||'',wardId:v.wardId||a?.wardId||''};});
  return result;
}

export function coverageCounts(data:InspectionCoverage,{module,zone='',ward=''}:{module?:OperationalModuleId;zone?:string;ward?:string}={}):CoverageCounts {
  const matches=(item:{module:OperationalModuleId;zoneId:string;wardId:string})=>(!module||item.module===module)&&(!zone||item.zoneId===zone)&&(!ward||item.wardId===ward);
  const assets=data.assets.filter(matches),visits=[...new Map(data.visits.filter(matches).map(v=>[v.id,v])).values()];
  const reportsAvailable=!data.failedModules.some(m=>!module||m===module);
  const unidentified=visits.filter(v=>!v.assetId).length;
  const frequency=new Map<string,number>();for(const visit of visits)if(visit.assetId){const key=`${visit.module}:${visit.assetId}`;frequency.set(key,(frequency.get(key)||0)+1);}
  const missingGeography=data.visits.some(v=>(!module||v.module===module)&&((zone&&!v.zoneId)||(ward&&!v.wardId)));
  const known=reportsAvailable&&!missingGeography,exact=known&&!unidentified;
  const registered=new Set(assets.map(a=>`${a.module}:${a.id}`));
  const covered=[...frequency.keys()].filter(key=>registered.has(key)).length;
  const total=data.inventoryAvailable?registered.size:null;
  return {total,inspections:known?visits.length:null,unique:exact?frequency.size:null,repeats:exact?visits.length-frequency.size:null,repeatedLocations:exact?[...frequency.values()].filter(n=>n>1).length:null,covered:exact&&total!=null?covered:null,remaining:exact&&total!=null?total-covered:null,percent:exact&&total?covered/total*100:null,unidentified,outsideRegister:[...frequency.keys()].filter(key=>!registered.has(key)).length};
}

export function zoneCoverage(data:InspectionCoverage,zones:Zone[],rankings:any[],ward='') {
  return zones.map(zone=>{
    const counts=coverageCounts(data,{zone:zone.id,ward});
    const assessed=rankings.filter(r=>r.zoneId===zone.id&&(!ward||r.wardId===ward)&&r.rankable!==false&&typeof r.finalScore==='number'&&Number.isFinite(r.finalScore));
    return {id:zone.id,name:zone.name,...counts,assessed:assessed.length,wardAverage:assessed.length?assessed.reduce((n,r)=>n+r.finalScore,0)/assessed.length:null};
  });
}
