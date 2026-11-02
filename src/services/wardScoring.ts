import {distributeWardMarks,WARD_SCORING_POLICY} from './wardMarks';
// Workforce keeps 30 marks; other eligible components share 70.
// Missing activity earns zero and does not release a responsibility share.
const numeric=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function applyFixedWardWeights<T extends {rankings?:any[];config?:any}>(data:T,enabledModules?:readonly string[]):T {
  if(!Array.isArray(data?.rankings))return data;
  let changed=false;
  const rankings=data.rankings.map(row=>{
    if(row.scoringPolicy==='WORKFORCE_30_EQUAL_70' && !enabledModules)return {...row};
    if(!row.components)return {...row};
    const components=distributeWardMarks(row.components,enabledModules||row.enabledModuleKeys||data.config?.enabledModuleKeys);
    const included=Object.values(components).filter((c:any)=>c.applicable!==false&&numeric(c.maxScore)&&c.maxScore>0) as any[];
    const applicableWeight=included.reduce((n,c)=>n+c.maxScore,0),earned=included.reduce((n,c)=>n+(numeric(c.score)?c.score:0),0);
    const rankable=row.rankable!==false&&applicableWeight>0;
    const finalScore=rankable?Number((earned/applicableWeight*100).toFixed(2)):0;
    const thresholds=data.config?.thresholds,green=thresholds?.greenMinScore??85,amber=thresholds?.amberMinScore??70;
    const adjusted=row.finalScore!==finalScore||row.applicableWeight!==applicableWeight;
    changed ||= adjusted;
    return {...row,scoringPolicy:WARD_SCORING_POLICY,components,applicableWeight,finalScore,rankable,performanceBand:rankable?(finalScore>=green?'GREEN':finalScore>=amber?'AMBER':'RED'):null,...(adjusted?{trend:null}:{})};
  });
  if(changed){
    // Rank the complete city response before any page, zone or ward filtering.
    const assessed=rankings.filter(r=>r.rankable!==false&&numeric(r.finalScore)).sort((a,b)=>b.finalScore-a.finalScore||(a.cityRank??Infinity)-(b.cityRank??Infinity)||String(a.wardName).localeCompare(String(b.wardName)));
    const zones=new Map<string,number>();
    assessed.forEach((r,i)=>{r.cityRank=i+1;if(r.zoneId){const rank=(zones.get(r.zoneId)||0)+1;zones.set(r.zoneId,rank);r.zoneRank=rank;}});
    rankings.filter(r=>r.rankable===false).forEach(r=>{r.cityRank=null;r.zoneRank=null;});
  }
  return {...data,rankings};
}
