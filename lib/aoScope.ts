import { AuthUser } from '../types/auth';

/**
 * Checks if a user has Action Officer (AO) role.
 */
export function isActionOfficerUser(user: AuthUser | null | undefined): boolean {
  if (!user) {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user') || localStorage.getItem('swachh_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const roles = parsed?.roles || (parsed?.role ? [parsed.role] : []);
          return roles.some((r: string) => String(r).toUpperCase() === 'ACTION_OFFICER' || String(r).toUpperCase() === 'AO');
        }
      } catch (_) {}
    }
    return false;
  }

  const roles = user.roles || (user.role ? [user.role] : []);
  return roles.some(r => String(r).toUpperCase() === 'ACTION_OFFICER' || String(r).toUpperCase() === 'AO');
}

/**
 * Extract all assigned Zone IDs/Names and Ward IDs/Names for a user.
 */
export function getUserAssignedGeoScope(user: AuthUser | null | undefined, moduleKey?: string) {
  let u = user;
  if (!u && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('swachh_user');
      if (stored) u = JSON.parse(stored);
    } catch (_) {}
  }

  if (!u) return { zoneIds: [], wardIds: [], zoneNames: [], wardNames: [] };

  const zoneIdSet = new Set<string>();
  const wardIdSet = new Set<string>();
  const zoneNameSet = new Set<string>();
  const wardNameSet = new Set<string>();

  const addStr = (set: Set<string>, val: any) => {
    if (val && typeof val === 'string' && val.trim()) {
      set.add(val.trim().toLowerCase());
    }
  };

  // Direct user properties
  (u.zoneIds || []).forEach(id => zoneIdSet.add(String(id)));
  (u.wardIds || []).forEach(id => wardIdSet.add(String(id)));
  if (u.zoneId) zoneIdSet.add(String(u.zoneId));
  if (u.wardId) wardIdSet.add(String(u.wardId));
  addStr(zoneNameSet, u.zoneName || u.zone?.name);
  addStr(wardNameSet, u.wardName || u.ward?.name);

  // Module level assignments
  if (Array.isArray(u.modules)) {
    u.modules.forEach((mod: any) => {
      if (!moduleKey || mod.key?.toUpperCase() === (moduleKey || '').toUpperCase() || mod.moduleId === moduleKey) {
        (mod.zoneIds || []).forEach((id: any) => zoneIdSet.add(String(id)));
        (mod.wardIds || []).forEach((id: any) => wardIdSet.add(String(id)));
      }
    });
  }

  return {
    zoneIds: Array.from(zoneIdSet),
    wardIds: Array.from(wardIdSet),
    zoneNames: Array.from(zoneNameSet),
    wardNames: Array.from(wardNameSet)
  };
}

/**
 * Determines whether a given report record is visible to an Action Officer (AO).
 * Rules for AO:
 * 1. Status MUST be APPROVED, ACTION_REQUIRED, or ACTION_TAKEN.
 * 2. Record Zone/Ward MUST match AO's assigned Zone/Ward scope (if AO has an assigned scope).
 */
export function isReportVisibleToAO(
  user: AuthUser | null | undefined,
  record: any,
  moduleKey?: string
): boolean {
  if (!isActionOfficerUser(user)) {
    return true; // Non-AO users (QC, Admins, etc.) are unaffected by AO scope filtering
  }

  if (!record) return false;

  // 1. Status Filter for AO
  const status = String(record.status || '').toUpperCase();
  const isAllowedStatus = status === 'APPROVED' || status === 'ACTION_REQUIRED' || status === 'ACTION_TAKEN' || status === 'RESOLVED';
  if (!isAllowedStatus) {
    return false;
  }

  // 2. Zone & Ward Scope Filter for AO
  const { zoneIds, wardIds, zoneNames, wardNames } = getUserAssignedGeoScope(user, moduleKey);

  const hasZoneScope = zoneIds.length > 0 || zoneNames.length > 0;
  const hasWardScope = wardIds.length > 0 || wardNames.length > 0;

  if (!hasZoneScope && !hasWardScope) {
    return true; // No specific assigned zone/ward restriction on AO user account
  }

  // Extract record zone ID/name
  const recZoneId = String(
    record.zoneId || record.toilet?.zoneId || record.beat?.zoneId ||
    record.segment?.zoneId || record.payload?.zoneId || record.feederPoint?.zoneId ||
    record.toilet?.ward?.parentId || ''
  );
  const recZoneName = String(
    record.zoneName || record.zone?.name || record.toilet?.zoneName ||
    record.beat?.zoneName || record.payload?.zoneName || ''
  ).toLowerCase();

  // Extract record ward ID/name
  const recWardId = String(
    record.wardId || record.toilet?.wardId || record.beat?.wardId ||
    record.segment?.wardId || record.payload?.wardId || record.feederPoint?.wardId || ''
  );
  const recWardName = String(
    record.wardName || record.ward?.name || record.toilet?.wardName ||
    record.beat?.wardName || record.payload?.wardName || ''
  ).toLowerCase();

  let zoneMatches = true;
  if (hasZoneScope && (recZoneId || recZoneName)) {
    const cleanRecZoneName = recZoneName.replace(/zone\s*/gi, '').trim();
    zoneMatches =
      (recZoneId !== '' && zoneIds.includes(recZoneId)) ||
      (recZoneName !== '' && zoneNames.some(z => {
        const cleanZ = z.replace(/zone\s*/gi, '').trim();
        return recZoneName.includes(z) || z.includes(recZoneName) || (cleanRecZoneName && cleanRecZoneName === cleanZ);
      }));
  }

  let wardMatches = true;
  if (hasWardScope && (recWardId || recWardName)) {
    const cleanRecWardName = recWardName.replace(/ward\s*/gi, '').trim();
    wardMatches =
      (recWardId !== '' && wardIds.includes(recWardId)) ||
      (recWardName !== '' && wardNames.some(w => {
        const cleanW = w.replace(/ward\s*/gi, '').trim();
        return recWardName.includes(w) || w.includes(recWardName) || (cleanRecWardName && cleanRecWardName === cleanW);
      }));
  }

  return zoneMatches && wardMatches;
}
