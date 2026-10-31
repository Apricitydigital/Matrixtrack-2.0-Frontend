/** Copy to backend src/modules/targets/deletion.ts with the accompanying router patch. */
interface Scope {cityId:string;id:{in:string[]};}
interface Transaction {employeeTarget:{count(args:{where:Scope}):Promise<number>;deleteMany(args:{where:Scope}):Promise<{count:number}>};}
interface Database {$transaction<T>(work:(tx:Transaction)=>Promise<T>):Promise<T>;}
export async function deleteCityTargets(db:Database,cityId:string,ids:string[]) {
  const unique=[...new Set(ids)];
  if(!cityId||!unique.length)throw Object.assign(Error('Select at least one target.'),{status:400});
  return db.$transaction(async tx=>{
    const where={cityId,id:{in:unique}};
    if(await tx.employeeTarget.count({where})!==unique.length)throw Object.assign(Error('Targets changed or are unavailable in this city. Refresh before deleting.'),{status:409});
    const deleted=await tx.employeeTarget.deleteMany({where});
    if(deleted.count!==unique.length)throw Object.assign(Error('Targets changed while deleting. Refresh and try again.'),{status:409});
    return {deletedCount:deleted.count};
  });
}
