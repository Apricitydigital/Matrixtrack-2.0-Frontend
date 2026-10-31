import type { User } from '../types';
import type { InsightAnswer } from './commissionerAssistant';
export interface InsightExchange {id:string;question:string;answer:InsightAnswer;askedAt:string;answeredAt:string;from:string;to:string;}
const listeners=new Set<()=>void>();
const key=(user:Pick<User,'id'|'role'|'cityId'>,cityId:string)=>{if(user.role!=='COMMISSIONER'||user.cityId!==cityId)throw Error('This history is unavailable for the selected account.');return `matrixtrack_insight_history:${user.id}:${cityId}`;};
export function readInsightHistory(user:Pick<User,'id'|'role'|'cityId'>,cityId:string):InsightExchange[]{
 try{const data=JSON.parse(localStorage.getItem(key(user,cityId))||'[]');return Array.isArray(data)?data.filter(row=>typeof row.id==='string'&&typeof row.question==='string'&&typeof row.answer?.text==='string'&&typeof row.askedAt==='string'&&typeof row.answeredAt==='string'&&typeof row.from==='string'&&typeof row.to==='string'):[];}catch{return [];}
}
export function saveInsightExchange(user:Pick<User,'id'|'role'|'cityId'>,cityId:string,exchange:InsightExchange){const storageKey=key(user,cityId),rows=readInsightHistory(user,cityId);localStorage.setItem(storageKey,JSON.stringify([...rows.filter(row=>row.id!==exchange.id),exchange]));listeners.forEach(fn=>fn());}
export function clearInsightHistory(user:Pick<User,'id'|'role'|'cityId'>,cityId:string){localStorage.removeItem(key(user,cityId));listeners.forEach(fn=>fn());}
export function subscribeInsightHistory(fn:()=>void){listeners.add(fn);return ()=>{listeners.delete(fn);};}
