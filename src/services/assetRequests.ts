import {api,writeApi} from './api';
import {assertCityAdmin} from './citySetup';
import type {OperationalModuleId} from '../types';
const paths={sweeping:['/city/areas/pending-requests','pendingBeats'],nala:['/city/nalas/pending-requests','pendingNalas'],toilets:['/modules/toilet/pending','toilets'],litter_bins:['/modules/twinbin/bins/pending','bins'],ctu_gvp:['/modules/taskforce/feeder-points/pending','feederPoints']} as const;
export async function registrationRequests(cityId:string,module:OperationalModuleId,signal:AbortSignal){
 assertCityAdmin(cityId);const [path,key]=paths[module],rows=new Map<string,any>();let expected:number|undefined;
 for(let page=1;page<=1000;page++){
  const response=await api(`${path}?page=${page}&limit=100`,{signal,cache:'no-store'});if(!Array.isArray(response[key]))throw new Error('Registration requests are unavailable.');
  const before=rows.size;for(const row of response[key]){if(!row.id)throw new Error('A registration request has no identifier.');rows.set(row.id,row);}
  const meta=response.meta||response.pagination;if(!meta)return [...rows.values()];
  if(!Number.isInteger(meta.total)||!Number.isInteger(meta.totalPages)||meta.totalPages<0||meta.total<0||expected!==undefined&&expected!==meta.total)throw new Error('Registration requests changed. Refresh the list.');expected=meta.total;
  if(page>=meta.totalPages){if(rows.size!==expected)throw new Error('The request list is incomplete. Refresh before reviewing.');return [...rows.values()];}
  if(rows.size===before)throw new Error('The request list repeated a page.');
 }throw new Error('Too many requests. Narrow the selection.');
}
export async function reviewRegistration(cityId:string,module:OperationalModuleId,id:string,approve:boolean,reason=''){
 assertCityAdmin(cityId);if(!approve&&!reason.trim())throw new Error('Enter a reason for rejection.');
 if(module==='sweeping'||module==='nala')return writeApi(`/city/${module==='sweeping'?'areas':'nalas'}/${encodeURIComponent(id)}/review`,'POST',{action:approve?'APPROVE':'REJECT',...(!approve?{rejectionReason:reason.trim()}:{})});
 const prefix=module==='toilets'?'/modules/toilet':module==='litter_bins'?'/modules/twinbin/bins':'/modules/taskforce/feeder-points';
 return writeApi(`${prefix}/${encodeURIComponent(id)}/${approve?'approve':'reject'}`,'POST',approve?{}:{reason:reason.trim(),rejectionReason:reason.trim()});
}
