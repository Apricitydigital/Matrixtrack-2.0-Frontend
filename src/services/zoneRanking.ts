import type { Zone, Ward } from '../types';
import { naturalCompare } from './wardRankingEvidence';
import { isAdministrativeWard } from './wardAvailability';

export interface ZoneWardScore {
  wardId: string;
  wardName: string;
  zoneId: string;
  finalScore?: number;
  rankable?: boolean;
  performanceBand?: string;
  components?: Record<string, any>;
  [key: string]: any;
}

export const isAssessedWard = (row?: ZoneWardScore) => !!row && row.rankable !== false &&
  typeof row.finalScore === 'number' && Number.isFinite(row.finalScore) && row.finalScore >= 0 && row.finalScore <= 100;

/** Registered geography defines the denominator; missing API rows never disappear. */
export function buildZoneRankings(zones: Zone[], wards: Ward[], rows: ZoneWardScore[]) {
  const byWard = new Map(rows.map(row => [row.wardId, row]));
  const results = zones.map(zone => {
    const members: ZoneWardScore[] = wards.filter(ward => ward.zoneId === zone.id && isAdministrativeWard(ward)).map(ward => ({
      ...byWard.get(ward.id), wardId: ward.id, wardName: ward.name, zoneId: zone.id,
    })).sort((a, b) => Number(isAssessedWard(b)) - Number(isAssessedWard(a)) ||
      (isAssessedWard(a) && isAssessedWard(b) ? b.finalScore! - a.finalScore! : 0) || naturalCompare(a.wardName, b.wardName));
    const assessed = members.filter(isAssessedWard);
    const score = assessed.length ? assessed.reduce((sum, ward) => sum + ward.finalScore!, 0) / assessed.length : null;
    return { zone, wards: members, assessed: assessed.length, total: members.length, score,
      complete: members.length > 0 && assessed.length === members.length, rank: null as number | null };
  }).sort((a, b) => Number(b.complete) - Number(a.complete) || (b.score ?? -1) - (a.score ?? -1) || naturalCompare(a.zone.name, b.zone.name));
  let previous: number | null = null, previousRank = 0, position = 0;
  for (const item of results) {
    if (!item.complete) continue;
    position++;
    // The same two-decimal score shown in the UI receives the same rank.
    const value = Math.round(item.score! * 100);
    item.rank = value === previous ? previousRank : position;
    previous = value; previousRank = item.rank;
  }
  return results;
}

export type ZoneRanking = ReturnType<typeof buildZoneRankings>[number];

export function zoneHighlights(rows: ZoneRanking[], includeProvisional = false) {
  const eligible = rows.filter(row => includeProvisional ? row.score !== null : row.complete).sort((a,b)=>b.score!-a.score!);
  if (!eligible.length) return { best: [] as ZoneRanking[], attention: [] as ZoneRanking[] };
  const highest = Math.round(eligible[0].score! * 100), lowest = Math.round(eligible[eligible.length - 1].score! * 100);
  return {
    best: eligible.filter(row => Math.round(row.score! * 100) === highest),
    attention: eligible.length > 1 && highest !== lowest ? eligible.filter(row => Math.round(row.score! * 100) === lowest) : [],
  };
}
