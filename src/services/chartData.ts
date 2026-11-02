import {statusTone, type RygTone} from './presentation';
export const RAG_COLORS:Record<RygTone,string>={green:'#67a998',yellow:'#d4ad59',red:'#cf7d87',neutral:'#b5c4cf'};
/** Do not turn a partial or missing series into a complete-looking distribution. */
export function breakdownData(items:{value:number|null|undefined}[]) {
 const available=items.length>0&&items.every(i=>typeof i.value==='number'&&Number.isFinite(i.value)&&i.value>=0);
 const total=available?items.reduce((sum,i)=>sum+i.value!,0):null;
 return {available,total,shares:items.map(i=>total&&available?i.value!/total*100:0)};
}
export const workflowColor=(status:string)=>RAG_COLORS[statusTone(status)];
