export const WARD_SCORING_POLICY = 'WORKFORCE_30_EQUAL_70' as const;
export const OTHER_COMPONENTS = ['beat','nala','toilet','litterBin','gvp','supervisor','qc','actionOfficer'] as const;
const entityModules:Record<string,string>={beat:'SWEEPING',nala:'NALA',toilet:'TOILET',litterBin:'LITTERBINS',gvp:'TASKFORCE'};
const inventory = {beat:'totalBeats',nala:'totalNalas',toilet:'totalToilets',litterBin:'totalBins',gvp:'totalPoints'};

/** Disabled modules and absent asset inventories release marks. Missing submissions never do. */
export function distributeWardMarks(source:Record<string,any>, enabledModuleKeys?:readonly string[]) {
  const eligible=OTHER_COMPONENTS.filter(key=>{
    if(enabledModuleKeys && entityModules[key] && !enabledModuleKeys.includes(entityModules[key]))return false;
    const field=inventory[key as keyof typeof inventory];
    const count=source[key]?.metrics?.[field];
    return !field || !Number.isFinite(count) || count!==0;
  });
  const cents=Math.floor(7000/eligible.length);
  const maxima=new Map(eligible.map((key,i)=>[key,(cents+(i<7000-cents*eligible.length?1:0))/100]));
  const components:Record<string,any>={};
  for(const key of ['workforce',...OTHER_COMPONENTS]) {
    const old=source[key]||{},applicable=key==='workforce'||maxima.has(key as any);
    const maxScore=key==='workforce'?30:maxima.get(key as any)??0;
    const percentage=old.applicable!==false&&Number.isFinite(old.percentage)?Math.max(0,Math.min(100,old.percentage)):old.applicable!==false&&old.maxScore>0?Math.max(0,Math.min(100,(old.score||0)/old.maxScore*100)):0;
    const scale=old.maxScore>0?maxScore/old.maxScore:0;
    const parts=old.components?Object.fromEntries(Object.entries(old.components).map(([id,p]:[string,any])=>[id,{...p,maxScore:Number((p.maxScore*scale).toFixed(4)),score:Number((p.score*scale).toFixed(4))}])):undefined;
    components[key]={...old,...(parts?{components:parts}:{}),exclusionReason:applicable?undefined:enabledModuleKeys&&!enabledModuleKeys.includes(entityModules[key])?'module_disabled':'no_entities',baseMaxScore:key==='workforce'?30:8.75,redistributedMarks:applicable?Number((maxScore-(key==='workforce'?30:8.75)).toFixed(2)):0,maxScore,score:applicable?Number((maxScore*percentage/100).toFixed(2)):0,percentage:applicable?percentage:0,applicable};
  }
  return components;
}
