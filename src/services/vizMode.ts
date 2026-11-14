import {useSyncExternalStore} from 'react';

export type VizMode = 'classic' | 'visual';
const KEY = 'matrixtrack-viz-mode';
const listeners = new Set<() => void>();
let current: VizMode | null = null;

function read(): VizMode {
  if (current) return current;
  try { current = localStorage.getItem(KEY) === 'classic' ? 'classic' : 'visual'; } catch { current = 'visual'; }
  return current;
}
export function getVizMode(): VizMode { return typeof window === 'undefined' ? 'classic' : read(); }
export function setVizMode(mode: VizMode) {
  current = mode;
  try { localStorage.setItem(KEY, mode); } catch { /* Storage is optional. */ }
  if (typeof document !== 'undefined') document.documentElement.dataset.viz = mode;
  listeners.forEach(l => l());
}
export function initializeVizMode() { if (typeof document !== 'undefined') document.documentElement.dataset.viz = getVizMode(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
// Without a DOM (server render, node tests that call components as plain functions) there is
// nothing to toggle: return classic without touching React. This branch is constant per environment.
export function useVizMode(): VizMode { return typeof document === 'undefined' ? 'classic' : useSyncExternalStore(subscribe, getVizMode, () => 'classic'); }
export const useVisual = () => useVizMode() === 'visual';

/** Visual-mode palette: validated categorical slots + status steps. Old muted colours map onto these. */
export const VIVID = {blue:'#2a78d6',orange:'#eb6834',aqua:'#1baf7a',yellow:'#eda100',magenta:'#e87ba4',green:'#008300',violet:'#6250d6',red:'#e34948'};
export const VIVID_ORDER = [VIVID.blue, VIVID.orange, VIVID.aqua, VIVID.yellow, VIVID.magenta, VIVID.green, VIVID.violet, VIVID.red];
export const STATUS_VIVID = {green:'#0ca30c', yellow:'#fab219', red:'#d03b3b', neutral:'#a9b6c0'};
const MAP: Record<string, string> = {
  '#385f7b': VIVID.blue, '#67a998': VIVID.aqua, '#d4ad59': VIVID.yellow, '#cf7d87': VIVID.red,
  '#b5c4cf': STATUS_VIVID.neutral, '#9186b2': VIVID.violet, '#7d9eb0': VIVID.blue, '#6bae97': STATUS_VIVID.green,
};
export const vivid = (color: string | undefined, index = 0) => color ? (MAP[color.toLowerCase()] || color) : VIVID_ORDER[index % VIVID_ORDER.length];
/** One colour per inspection status so stacked segments never share a hue. */
export const STATUS_ID_COLORS: Record<string, string> = {approved: STATUS_VIVID.green, pending_review: STATUS_VIVID.yellow, rejected: STATUS_VIVID.red, action_required: VIVID.orange, action_taken: VIVID.blue, escalated: VIVID.violet};
export const statusIdColor = (id: string) => STATUS_ID_COLORS[id] || STATUS_VIVID.neutral;
