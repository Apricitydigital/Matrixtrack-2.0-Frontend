import type { Beat, OperationalReport, Ward, Zone } from '../types';
import type { InspectionCoverage } from './inspectionCoverage';
import { mapReport } from './adapters';
import { MODULE_LABELS } from './presentation';

const natural=new Intl.Collator('en-IN',{numeric:true,sensitivity:'base'});
export function geographyOrder(a:{name:string;wardNumber?:number;zoneNumber?:number},b:{name:string;wardNumber?:number;zoneNumber?:number}) {
  const order=(row:typeof a)=>{const n=row.wardNumber??row.zoneNumber;return n!=null&&Number.isFinite(n)&&n>0?n:Number(row.name.match(/\d+/)?.[0])||Infinity;};
  return order(a)-order(b)||natural.compare(a.name,b.name);
}
const uuid=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
/** One row per visit from the same complete date-scoped register used by the status cards. */
export function wardInspectionRows(data:InspectionCoverage,cityId:string,wardId:string|undefined,zones:Zone[],wards:Ward[],beats:Beat[]=[]):OperationalReport[] {
  const nodes=[...zones.map(z=>({...z,level:'ZONE'})),...wards.map(w=>({...w,level:'WARD'}))];
  const assets=new Map(data.assets.map(a=>[`${a.module}:${a.id}`,a]));
  const visits=[...new Map(data.visits.filter(v=>!wardId||v.wardId===wardId).map(v=>[v.id,v])).values()];
  return visits.map(visit=>{
    const raw=visit.raw??{},id=raw.id??visit.id.slice(visit.id.indexOf(':')+1);
    const report=mapReport({...raw,id,zoneId:visit.zoneId,wardId:visit.wardId,submittedAt:visit.submittedAt||raw.submittedAt,status:visit.status||raw.status},visit.module,cityId,nodes);
    const asset=assets.get(`${visit.module}:${visit.assetId}`),beat=visit.module==='sweeping'?beats.find(b=>b.id===visit.assetId):undefined;
    const readable=(value:unknown)=>typeof value==='string'&&value.trim()&&!uuid.test(value)&&![id,visit.id,visit.assetId].includes(value);
    const assetName=[report.assetName,asset?.name,beat?.name].find(readable)||`${MODULE_LABELS[visit.module]} inspection`;
    return {...report,actionRequired:visit.actionRequired||report.actionRequired,actionTaken:visit.actionTaken||report.actionTaken,id:visit.id,assetId:visit.assetId||report.assetId,assetName,reportNumber:readable(raw.reportNumber)?raw.reportNumber:assetName};
  }).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)||natural.compare(a.assetName,b.assetName));
}
