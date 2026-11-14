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

export type FocusPreset = { zoneIds: string[]; wardIds: string[] };

/** Option value used by single-choice zone selects for the focus-ward preset. */
export const FOCUS_SCOPE = '__focus_wards';

export const focusLabel = (preset: FocusPreset) => `${preset.wardIds.length} wards · ${preset.zoneIds.length} zones`;

/** Preset for whichever city the supplied zones belong to (zones/wards may already be city-filtered). */
export function cityFocusPreset(zones: Zone[], wards: Ward[], cityId = zones[0]?.cityId) {
  return cityId ? wardFocusPreset(cityId, zones, wards) : null;
}

/** `quickSelection` prop for a zones MultiSelectDropdown. */
export function focusQuickSelection(preset: FocusPreset | null, zoneIds: string[], wardIds: string[], apply: (preset: FocusPreset) => void) {
  if (!preset) return undefined;
  const same = (a: string[], b: string[]) => a.length === b.length && b.every(id => a.includes(id));
  return { label: focusLabel(preset), active: same(zoneIds, preset.zoneIds) && same(wardIds, preset.wardIds), onSelect: () => apply(preset) };
}

/** Single-choice zone filter match that understands the preset sentinel. */
export function matchesZoneChoice(choice: string, preset: FocusPreset | null, zoneId?: string | null, wardId?: string | null) {
  if (!choice || choice === 'all') return true;
  if (choice === FOCUS_SCOPE) return !!preset && !!wardId && preset.wardIds.includes(wardId);
  return zoneId === choice;
}
