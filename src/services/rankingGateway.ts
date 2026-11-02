import {api} from './api';

/**
 * Client of the backend ranking gateway (/ranking-gateway), which proxies the external
 * Swachhta Parv ranking API. The API key never reaches the browser; access is decided by the
 * signed-in role and the per-city SWACHH_RANKING module toggle (HMS super admin).
 */

const BASE='/ranking-gateway';

type Envelope={organization?:{code:string;name:string}|null;generatedAt?:string};

export type RankingCategorySummary={key:string;label:string;participants:number;fieldAssessmentsCompleted:number;selfAssessmentsCompleted:number;completionRate:number};
export type RankingSummary=Envelope&{
  participants:{approved:number;registered:number;pending:number;rejected:number};
  wards:number;
  surveys:{fieldAssessmentsCompleted:number;selfAssessmentsCompleted:number;total:number};
  categories:RankingCategorySummary[];
};
export type RankingEntry={rank:number;participantId:string;name:string|null;ward:string|null;score:number;maxScore:number;percentage:number};
export type RankingResponse=Envelope&{basis?:string;categories:{category:string;participantsRanked:number;data:RankingEntry[]}[]};
export type RankingZone={id:string;name:string;wards:{id:string;name:string}[]};
export type RankingParticipant={id:string;name:string|null;category:string;ward:string|null;zone:string|null;registeredAt:string|null};
export type RankingPage<T=Record<string,any>>=Envelope&{page:number;pageSize:number;total:number;totalPages:number;basis?:string;data:T[]};
export type RankingDashboard=Envelope&{population?:string;stages:Record<string,number|{count:number;percent:number}>;categories:Record<string,any>[]};
export type RankingGatewayHealth={
  configured:boolean;connected:boolean;apiKeyHint?:string|null;error?:string;
  organization?:{code:string;name:string}|null;
  client?:{name:string;environment:string;scopes:string[];rateLimitPerMinute:number|null;usageThisMonth:number|null;monthlyQuota:number|null;expiresAt:string|null}|null;
  rateLimit?:{limit:string|null;remaining:string|null;reset:string|null}|null;
};

function qs(params:Record<string,string|number|undefined>){
  const search=new URLSearchParams();
  for(const [key,value] of Object.entries(params))if(value!==undefined&&value!=='')search.set(key,String(value));
  const text=search.toString();
  return text?`?${text}`:'';
}

const paged=(path:string)=>(category:string|undefined,page:number,pageSize:number)=>api<RankingPage>(`${BASE}${path}${qs({category,page,pageSize})}`);

export const RankingGatewayApi={
  summary:()=>api<RankingSummary>(`${BASE}/summary`),
  rankings:(category?:string,limit?:number)=>api<RankingResponse>(`${BASE}/rankings${qs({category,limit})}`),
  zones:()=>api<Envelope&{data:RankingZone[]}>(`${BASE}/zones`),
  participants:paged('/participants') as (category:string|undefined,page:number,pageSize:number)=>Promise<RankingPage<RankingParticipant>>,
  dashboard:(category?:string)=>api<RankingDashboard>(`${BASE}/dashboard${qs({category})}`),
  assessments:paged('/assessments'),
  selfAssessments:paged('/self-assessments'),
  scores:paged('/scores'),
  reviewRecords:paged('/reports/review-records'),
  health:()=>api<RankingGatewayHealth>(`${BASE}/health`,{cache:'no-store'}),
  clearCache:()=>api<{ok:boolean}>(`${BASE}/cache/clear`,{method:'POST'}),
};
