import type { Ward, Zone } from '../types';

const focusWards: [number, number[]][] = [
  [1, [12, 10, 11, 13]],
  [2, [20, 4, 6]],
  [3, [23, 33]],
  [4, [44, 52]],
  [5, [38, 40]],
  [6, [35, 48]],
];

/** Resolve the complete sheet by city and zone–ward pair; never apply a partial/all-area scope. */
export function wardFocusPreset(cityId: string, zones: Zone[], wards: Ward[]) {
  const zoneIds: string[] = [], wardIds: string[] = [];
  for (const [zoneNumber, numbers] of focusWards) {
    const matches = zones.filter(z => z.cityId === cityId && z.zoneNumber === zoneNumber);
    if (matches.length !== 1) return null;
    const zone = matches[0];
    zoneIds.push(zone.id);
    for (const number of numbers) {
      const matches = wards.filter(w => w.cityId === cityId && w.zoneId === zone.id && w.wardNumber === number);
      if (matches.length !== 1) return null;
      wardIds.push(matches[0].id);
    }
  }
  return { zoneIds, wardIds };
}
