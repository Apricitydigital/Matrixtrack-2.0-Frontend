/** Correct municipal vocabulary, never dates, IDs, figures or arbitrary user instructions. */
const aliases:Record<string,string>={zome:'zone',zomes:'zones',znoe:'zone',zoen:'zone',zon:'zone',wrd:'ward',wardswise:'wards',wardwise:'wards',zoon:'zone',plnt:'plant',attendence:'attendance',attandance:'attendance',attendace:'attendance',insoection:'inspection',inspecion:'inspection',insepction:'inspection',inpection:'inspection',inspectionsdone:'inspections done',coverate:'coverage',peanding:'pending',reviw:'review',repeated:'repeat',repeaded:'repeat',repeatedly:'repeat',perfromance:'performance',performence:'performance',perfomance:'performance',performace:'performance',rankingg:'ranking',litterbins:'litter bins',dustbins:'litter bins',targte:'target',tagret:'target',taget:'target',targetswise:'targets'};
const vocabulary=['performance','inspection','inspections','attendance','coverage','pending','review','cleaned','sweeping','toilets','targets','ranking','recovery'];
function closeWord(a:string,b:string){
 if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const differences:number[]=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences.push(i);return differences.length===1||differences.length===2&&differences[1]===differences[0]+1&&a[differences[0]]===b[differences[1]]&&a[differences[1]]===b[differences[0]];}
 const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;let i=0,j=0,skipped=false;while(i<shorter.length&&j<longer.length){if(shorter[i]===longer[j]){i++;j++;}else{if(skipped)return false;skipped=true;j++;}}return true;
}
export function normalizeInsightQuestion(question:string){
 let text=question.normalize('NFKC').toLowerCase().replace(/[a-z]+/g,word=>{
  if(aliases[word])return aliases[word];if(word.length<6||vocabulary.includes(word))return word;
  const matches=vocabulary.filter(candidate=>closeWord(word,candidate));return matches.length===1?matches[0]:word;
 });
 text=text.replace(/\b(zone|ward)s?\s*(?:no\.?\s*|number\s*|[-#]\s*)?(\d+)\s*/g,'$1 $2 ');
 text=text.replace(/\b(zone|ward)\s+(\d+)\s*(?:and|vs\.?|versus|with|,)\s*(\d+)\b/g,'$1 $2 and $1 $3');
 text=text.replace(/\b(best|worst|top)(wards?|zones?)\b/g,'$1 $2').replace(/\b(?:awaiting|waiting for)\s+(?:a\s+)?decision\b/g,'pending review');
 return text.replace(/\s+/g,' ').trim();
}
interface NamedScope {id:string;name:string;zoneId?:string;}
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function resolveInsightScope(question:string,zones:NamedScope[],wards:NamedScope[]){
 const q=normalizeInsightQuestion(question);
 const find=(kind:'zone'|'ward',items:NamedScope[])=>{
  const numbers=[...q.matchAll(new RegExp(`\\b${kind}\\s+(\\d+)\\b`,'g'))].map(match=>Number(match[1]));
  const selected=new Map<string,NamedScope>();let issue='';
  for(const number of numbers){const matches=items.filter(item=>{const match=normalizeInsightQuestion(item.name).match(new RegExp(`\\b${kind}\\s+(\\d+)\\b`));return match&&Number(match[1])===number;});
   if(matches.length===1)selected.set(matches[0].id,matches[0]);else issue=matches.length>1?`Please choose the full ${kind} name; more than one ${kind} uses number ${number}.`:`I could not find ${kind} ${number} in your city. Please choose a ${kind} listed in Zone Details.`;
  }
  if(!numbers.length)for(const item of items)if(new RegExp(`(?:^|\\W)${escape(normalizeInsightQuestion(item.name))}(?=$|\\W)`,'i').test(q))selected.set(item.id,item);
  return {items:[...selected.values()],issue};
 };
 const selectedZones=find('zone',zones),selectedWards=find('ward',wards);
 let issue=selectedZones.issue||selectedWards.issue;
 if(!issue&&selectedWards.items.length>1)issue='Please ask about one ward at a time so I can give you its exact figures.';
 if(!issue&&selectedZones.items.length&&selectedWards.items.some(ward=>ward.zoneId&&!selectedZones.items.some(zone=>zone.id===ward.zoneId)))issue='The selected ward belongs to a different zone. Please choose its zone or ask about the ward alone.';
 return {zones:selectedZones.items,ward:selectedWards.items[0],issue};
}
