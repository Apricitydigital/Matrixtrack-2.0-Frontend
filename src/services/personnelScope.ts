import type {User,Ward} from '../types';
type ScopedPerson=Pick<User,'assignedZoneIds'|'assignedWardIds'|'moduleAssignments'>;
type ScopedWard=Pick<Ward,'id'|'zoneId'>;

export function personnelScope(user:ScopedPerson,wards:ScopedWard[]){
 const wardIds=[...new Set([...(user.assignedWardIds||[]),...(user.moduleAssignments||[]).flatMap(m=>m.wardIds)])];
 const zoneIds=[...new Set([...(user.assignedZoneIds||[]),...(user.moduleAssignments||[]).flatMap(m=>m.zoneIds),...wards.filter(w=>wardIds.includes(w.id)).map(w=>w.zoneId)])];return {zoneIds,wardIds};
}
export function personnelAssignedToWard(user:ScopedPerson,ward:ScopedWard){
 const matches=(z:string[],w:string[])=>!!(z.length||w.length)&&(!z.length||z.includes(ward.zoneId))&&(!w.length||w.includes(ward.id));
 const z=user.assignedZoneIds||[],w=user.assignedWardIds||[],scopedModules=(user.moduleAssignments||[]).filter(m=>m.zoneIds.length||m.wardIds.length);
 if(z.length||w.length)return matches(z,w)&&(!scopedModules.length||scopedModules.some(m=>matches(m.zoneIds,m.wardIds)));
 return scopedModules.some(m=>matches(m.zoneIds,m.wardIds));
}
