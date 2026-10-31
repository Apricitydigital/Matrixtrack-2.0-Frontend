import { todayIST } from './api';
export interface InsightPeriod {from:string;to:string;}
const day=(value:string,offset:number)=>new Date(Date.parse(value+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
function date(y:number,m:number,d:number){const value=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return !Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:null;}
export function questionPeriod(question:string,fallback:InsightPeriod,today=todayIST()):InsightPeriod {
 const q=question.toLowerCase();let found:string[]=[];
 const tokens=/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4}\b|\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\b/gi;
 for(const match of q.matchAll(tokens)){
  const text=match[0];let parsed:string|null=null;
  if(/^\d{4}-/.test(text)){const [y,m,d]=text.split('-').map(Number);parsed=date(y,m,d);}
  else if(/^\d{1,2}[/.\-]/.test(text)){const [d,m,y]=text.split(/[/.\-]/).map(Number);parsed=date(y,m,d);}
  else{const [d,month,y]=text.split(/\s+/);parsed=date(Number(y),['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(month.slice(0,3))+1,Number(d));}
  if(!parsed)throw Error('Please enter a valid date, such as 31/10/2026, or choose the dates above.');found.push(parsed);
 }
 let range=fallback;
 if(found.length>2)throw Error('Please ask about one date or one date range at a time.');
 if(found.length)range={from:found[0],to:found[1]||found[0]};
 else if(/\byesterday\b/.test(q))range={from:day(today,-1),to:day(today,-1)};
 else if(/\btoday\b/.test(q))range={from:today,to:today};
 else if(/\blast\s+(\d+)\s+days?\b/.test(q)){const days=Number(q.match(/\blast\s+(\d+)\s+days?\b/)![1]);if(days<1||days>366)throw Error('Please choose a range of 1 to 366 days.');range={from:day(today,1-days),to:today};}
 else if(/\bthis month\b/.test(q))range={from:today.slice(0,7)+'-01',to:today};
 else if(/\blast month\b/.test(q)){const last=day(today.slice(0,7)+'-01',-1);range={from:last.slice(0,7)+'-01',to:last};}
 else if(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/.test(q)){
  const match=q.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/)!;
  const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(match[1].slice(0,3))+1,year=Number(match[2]);
  range={from:date(year,month,1)!,to:date(year,month,new Date(Date.UTC(year,month,0)).getUTCDate())!};
 }
 else if(/\blast week\b/.test(q))range={from:day(today,-7),to:day(today,-1)};
 else if(/\bthis week\b/.test(q)){const weekday=new Date(today+'T12:00:00Z').getUTCDay();range={from:day(today,-((weekday+6)%7)),to:today};}
 if(!found.length&&/\b\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{2})?\b/.test(q))throw Error('Please enter the complete date, such as 31/10/2026, or choose the dates above.');
 if(!range.from||!range.to||!date(...range.from.split('-').map(Number) as [number,number,number])||!date(...range.to.split('-').map(Number) as [number,number,number])||range.from>range.to)throw Error('Please choose a valid start date on or before the end date.');
 return range;
}
