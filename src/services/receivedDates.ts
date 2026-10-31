import { api,primeApiRead } from './api';
export type ReceivedSource='attendance'|'plant';
export const dateOnly=(value:unknown):string|null=>{const s=typeof value==='string'?value.slice(0,10):'',d=new Date(s+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;};
const entries=(d:any):any[]=>Array.isArray(d.data)?d.data:d.data?.items || d.items || [];
export async function latestReceivedDate(source:ReceivedSource,signal?:AbortSignal,cityId?:string):Promise<string|null>{
  if(source==='attendance'){const d=await api(`/city/attendance/dashboard?page=1&pageSize=10${cityId?`&cityId=${encodeURIComponent(cityId)}`:''}`,{signal});const latest=dateOnly(d.range?.to) || dateOnly(d.records?.[0]?.attendanceDate);
    if(latest&&dateOnly(d.range?.from)===latest)primeApiRead(`/city/attendance/dashboard?${new URLSearchParams({...(cityId?{cityId}:{}),from:latest,to:latest,page:'1',pageSize:'10'})}`,d);
    return latest;}
  const d=await api('/modules/processing-plant/entries?page=1&limit=1',{signal});return dateOnly(entries(d)[0]?.entryDate);
}
export async function receivedDatesInMonth(source:ReceivedSource,month:string,signal?:AbortSignal,cityId?:string):Promise<Record<string,number>>{
  const [year,m]=month.split('-').map(Number),from=month+'-01',to=new Date(Date.UTC(year,m,0)).toISOString().slice(0,10),result:Record<string,number>={};
  if(source==='attendance'){
    const d=await api(`/city/attendance/dashboard?from=${from}&to=${to}&page=1&pageSize=1${cityId?`&cityId=${encodeURIComponent(cityId)}`:''}`,{signal});
    for(const row of d.dailyTrend || []){const date=dateOnly(row.date);if(date&&date>=from&&date<=to&&Number(row.total)>0)result[date]=Number(row.total);}
  }else{
    // Month-scoped pages preserve days with zero measured quantities, which a quantity trend can omit.
    let page=1,totalPages=1;
    do{const d=await api(`/modules/processing-plant/entries?from=${from}&to=${to}&page=${page}&limit=100`,{signal});
      for(const row of entries(d)){const date=dateOnly(row.entryDate);if(date&&date>=from&&date<=to)result[date]=(result[date] || 0)+1;}
      const meta=d.meta || d.pagination || d.data?.meta || d;totalPages=Number(meta.totalPages ?? Math.ceil(Number(meta.total || 0)/100)) || 1;page++;
    }while(page<=totalPages);
  }return result;
}
