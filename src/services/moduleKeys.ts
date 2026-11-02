/** Canonical keys are shared by provisioning, user assignments and scoring. */
export function canonicalModuleKey(value:unknown):string {
 const key=String(value||'').trim().toUpperCase().replace(/[\s/]+/g,'_');
 return ({GVP:'TASKFORCE',CTU:'TASKFORCE',CTU_GVP:'TASKFORCE',CTU_GVP_TRANSFORMATION:'TASKFORCE',BEAT:'SWEEPING',SWEEP_RES:'SWEEPING',SWEEP_COM:'SWEEPING',LITTERBIN:'LITTERBINS',LITTER_BINS:'LITTERBINS',TWINBIN:'LITTERBINS',TOILETS:'TOILET',WORKFORCE:'WORKFORCE_MONITORING',MATRIXTRACK:'WORKFORCE_MONITORING',WARD_RANKING:'SWACHH_RANKING',SWACHH:'SWACHH_RANKING'} as Record<string,string>)[key]||key;
}
