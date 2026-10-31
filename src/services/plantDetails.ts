export interface PlantMeasurement {code:string;label:string;category:string;unit:string;value:number|null;rawValue:string;}
export interface PlantSubmission {id:string;date:string;submittedAt:string;submittedBy:string;unit:string;received:number|null;recovered:number|null;reject:number|null;processLoss:number|null;measurements:PlantMeasurement[];otherOutputs:{name:string;unit:string;quantity:number}[];}
const numeric=(v:any):number|null=>v!==null&&v!==undefined&&!(typeof v==='string'&&!v.trim())&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):null;
export function formatPlantNumber(value:unknown,missing='Not recorded'){const n=numeric(value);if(n==null)return missing;return n!==0&&Math.abs(n)<.01?n.toLocaleString('en-IN',{maximumSignificantDigits:3}):n.toLocaleString('en-IN',{maximumFractionDigits:2});}
export function plantUnit(unit:string){return ({TPD:'MT',KLD:'KL',MLD:'ML'} as Record<string,string>)[unit?.toUpperCase()] || unit?.toUpperCase() || 'MT';}
export function convertPlantQuantity(value:number,source:string,target:string):number|null{
  const units:Record<string,[string,number]>={MT:['mass',1000],TON:['mass',1000],TONNE:['mass',1000],TONNES:['mass',1000],KG:['mass',1],KGS:['mass',1],KILOGRAM:['mass',1],KILOGRAMS:['mass',1],L:['volume',1],KL:['volume',1000],ML:['volume',1000000]};
  const a=units[source.trim().toUpperCase()],b=units[plantUnit(target)];return a&&b&&a[0]===b[0]?value*a[1]/b[1]:null;
}
export function normalizePlantSubmission(raw:any,plant:any,unit=plantUnit(plant?.capacityUnit)):PlantSubmission{
  const measurements:PlantMeasurement[]=(raw.values || []).map((v:any)=>{const p=v.parameter || plant?.parameters?.find((p:any)=>p.code===v.code) || {};return {code:v.code || p.code || '',label:v.label || p.label || v.code || 'Measurement',category:String(v.category || p.category || '').toUpperCase(),unit:v.unit || p.unit || '',value:numeric(v.value),rawValue:v.rawValue==null?'':String(v.rawValue)};});
  const sum=(category:string,loss=false):number|null=>{
    const values=measurements.filter(v=>loss?v.code==='PROCESS_LOSS':v.category===category&&v.code!=='PROCESS_LOSS').flatMap(v=>{const n=v.value==null?null:convertPlantQuantity(v.value,v.unit,unit);return n==null?[]:[n];});
    if(values.length)return values.reduce((a,b)=>a+b,0);
    // Category totals are a fallback for older responses; never infer a unit or include loss twice.
    if(!loss&&!measurements.some(v=>v.category===category||(category==='OUTPUT'&&v.code==='PROCESS_LOSS'))){
      const totals=(raw.totalsByCategory?.[category] || []).flatMap((v:any)=>{const n=numeric(v.value),q=n==null?null:convertPlantQuantity(n,v.unit || '',unit);return q==null?[]:[q];});if(totals.length)return totals.reduce((a:number,b:number)=>a+b,0);
    }return null;
  };
  const otherOutputs=measurements.filter(v=>v.category==='OUTPUT'&&v.code!=='PROCESS_LOSS'&&v.value!=null&&convertPlantQuantity(v.value,v.unit,unit)==null).map(v=>({name:v.label,unit:v.unit,quantity:v.value!}));
  if(!measurements.some(v=>v.category==='OUTPUT'))for(const v of raw.totalsByCategory?.OUTPUT || []){const n=numeric(v.value);if(n!=null&&convertPlantQuantity(n,v.unit || '',unit)==null)otherOutputs.push({name:'Reported output',unit:v.unit || '',quantity:n});}
  return {id:raw.id || raw.entryDate,date:String(raw.entryDate || raw.date || '').slice(0,10),submittedAt:raw.submittedAt || raw.createdAt || '',submittedBy:raw.submittedByName || raw.submittedBy?.name || '',unit,
    received:numeric(raw.received)??sum('INPUT'),recovered:numeric(raw.recovered)??sum('OUTPUT'),reject:numeric(raw.reject)??sum('REJECT'),processLoss:numeric(raw.processLoss)??sum('',true),measurements,
    otherOutputs};
}
export function plantDetailSummary(entries:PlantSubmission[]){
  const total=(key:'received'|'recovered'|'reject'|'processLoss')=>{const values=entries.map(e=>e[key]).filter((v):v is number=>v!=null);return values.length?values.reduce((a,b)=>a+b,0):null;};
  const outputs=new Map<string,{name:string;unit:string;quantity:number}>();for(const e of entries)for(const o of e.otherOutputs){const key=o.name+'\n'+o.unit,previous=outputs.get(key);outputs.set(key,{...o,quantity:(previous?.quantity || 0)+o.quantity});}
  const latest=entries.map(e=>e.submittedAt).filter(v=>v&&!Number.isNaN(Date.parse(v))).sort((a,b)=>Date.parse(b)-Date.parse(a))[0] || '';
  return {received:total('received'),recovered:total('recovered'),reject:total('reject'),processLoss:total('processLoss'),otherOutputs:[...outputs.values()],latest,latestDate:entries.map(e=>e.date).filter(Boolean).sort().at(-1) || ''};
}
