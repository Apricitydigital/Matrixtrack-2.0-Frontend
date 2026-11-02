import {mapUser} from './adapters';
/** A directory row needs explicit city membership; never relabel a foreign row. */
export function scopedDirectoryUsers(rows:any[],cityId?:string) {
 const scoped=cityId?rows.filter(row=>row.cityId===cityId):rows;
 if(scoped.some(row=>!row.cityId))throw new Error('The user directory did not supply city membership. Refresh or contact your administrator.');
 return scoped.map(row=>mapUser({...row,modules:(row.modules||[]).filter((m:any)=>(!m.cityId||m.cityId===row.cityId)&&(!m.role||m.role===row.role))}));
}
