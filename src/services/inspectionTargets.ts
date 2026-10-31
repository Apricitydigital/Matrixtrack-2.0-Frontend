import { moduleId } from './adapters';
import { MODULE_LABELS } from './presentation';
import { todayIST } from './api';

export interface TargetAssignment {userId:string;userName:string;employeeId?:string|null;wardId:string;wardName:string;zoneId?:string|null;moduleId:string;moduleName:string;assigned:number;}
export interface TargetDraft {userId:string;moduleId:string;wardId:string;role:string;periodType:string;startDate:string;mode:'count'|'percentage';value:string;allowRepeat:boolean;}
export function targetModuleLabel(value:{name?:string;displayName?:string}|string) {
  const name=typeof value==='string'?value:value.name||'';
  const id=moduleId(name);
  return id?MODULE_LABELS[id]:typeof value==='string'?value:value.displayName||name;
}
export function targetPreview(assigned:number,period:string,startDate:string,mode:string,value:string,today=todayIST()) {
  const amount=Number(value),date=new Date(`${startDate>today?startDate:today}T12:00:00Z`);
  const days=period==='WEEKLY'?7:period==='MONTHLY'?new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate():1;
  const maximum=assigned*days;
  return {days,maximum,count:mode==='percentage'?Math.ceil(maximum*amount/100):amount};
}
export function targetPayload(draft:TargetDraft,assignments:TargetAssignment[],editing=false) {
  if(!draft.userId||!draft.moduleId)throw Error('Select an employee and module.');
  if(!['SUPERVISOR','QC'].includes(draft.role))throw Error('Select a Daroga or Sanitary Inspector.');
  if(!['DAILY','WEEKLY','MONTHLY'].includes(draft.periodType)||!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)||Number.isNaN(Date.parse(draft.startDate))||new Date(draft.startDate).toISOString().slice(0,10)!==draft.startDate)throw Error('Select a valid period and effective date.');
  const value=Number(draft.value);
  if(!Number.isInteger(value)||value<1||(draft.mode==='percentage'&&value>100))throw Error(draft.mode==='percentage'?'Enter a whole percentage from 1 to 100.':'Enter a positive whole inspection count.');
  if(draft.mode==='percentage'&&(!draft.wardId||draft.role!=='SUPERVISOR'))throw Error('Percentage targets require a ward-wise Daroga assignment.');
  if(draft.wardId){
    const row=assignments.find(r=>r.userId===draft.userId&&r.wardId===draft.wardId&&r.moduleId===draft.moduleId);
    if(draft.role!=='SUPERVISOR'||!row||row.assigned<=0)throw Error('Select an existing Daroga, ward and module assignment.');
    if(draft.mode==='count'&&value>targetPreview(row.assigned,draft.periodType,draft.startDate,draft.mode,draft.value).maximum)throw Error('Target exceeds assigned locations for this period.');
  }
  const amount=draft.mode==='percentage'?{targetPercent:value}:{targetValue:value};
  if(editing)return {...amount,allowRepeat:draft.allowRepeat};
  return {userId:draft.userId,moduleId:draft.moduleId,role:draft.role,periodType:draft.periodType,startDate:draft.startDate,...(draft.wardId?{wardId:draft.wardId,allowRepeat:draft.allowRepeat}:{}),...amount};
}
