import { API_BASE_URL, getToken } from './api';

export type TargetState='configured'|'not_set'|'default'|'mixed'|'unverified'|'unavailable';
export interface TargetEvidence {targetState?:TargetState;targetConfigured?:boolean;targetSource?:string;targetId?:string;}
export interface TargetConfiguration {state:'empty'|'records_present'|'unavailable';}

export function targetState(value?:TargetEvidence|null):TargetState {
  if(!value)return 'unavailable';
  if(value.targetState)return value.targetState;
  if(value.targetConfigured===false)return 'not_set';
  const source=String(value.targetSource||'').toUpperCase();
  if(['DEFAULT','BASELINE','CALCULATED','AUTOMATIC'].includes(source))return 'default';
  if(value.targetConfigured===true||value.targetId||['ASSIGNED','CONFIGURED','ADMIN'].includes(source))return 'configured';
  return 'unverified';
}

export function aggregateTargetState(rows:TargetEvidence[]):TargetState {
  if(!rows.length)return 'unavailable';
  const states=rows.map(targetState);
  return states.every(state=>state===states[0])?states[0]:'mixed';
}

/** Empty complete saved-target records are evidence of no configured target. A 403 is not. */
export async function loadTargetConfiguration(signal:AbortSignal):Promise<TargetConfiguration> {
  try{
    // This optional permission check must not invalidate a session that can read the dashboard.
    const token=getToken();const result=await fetch(`${API_BASE_URL}/city/targets/performance`,{method:'GET',headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),cache:'no-store'});
    if(!result.ok)return {state:'unavailable'};
    const response=await result.json();
    if(!Array.isArray(response?.targets))return {state:'unavailable'};
    const total=response.meta?.total??response.pagination?.total;
    const pages=response.meta?.totalPages??response.pagination?.totalPages??1;
    if(response.hasMore===true||Number(pages)>1||total!=null&&Number(total)>response.targets.length)return {state:'unavailable'};
    return {state:response.targets.length?'records_present':'empty'};
  }catch(error){if(signal.aborted)throw error;return {state:'unavailable'};}
}

export function verifyTargetFigures<T extends TargetEvidence>(figures:T,configuration:TargetConfiguration):T {
  if(configuration.state!=='empty')return figures;
  const state=targetState(figures);
  return {...figures,targetState:state==='configured'||state==='mixed'?'unverified':state==='default'?'default':'not_set'};
}

export const TARGET_STATE_LABELS:Record<TargetState,string>={configured:'Configured',not_set:'Not set',default:'Default requirement',mixed:'Mixed sources',unverified:'Not verified',unavailable:'Unavailable'};
