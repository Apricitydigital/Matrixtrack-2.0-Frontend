import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Dashboard filters survive a page refresh. They live in sessionStorage, the same place as the login session,
 * so they are cleared on sign-out and never shared between browser tabs or people.
 */
const PREFIX = 'matrixtrack_filters:';
export const DATE_RANGE_KEY = 'matrixtrack_date_range';

const readSaved = <T,>(key: string, fallback: T): T => {
  try { const raw = sessionStorage.getItem(key); return raw == null ? fallback : (JSON.parse(raw) as T); } catch { return fallback; }
};
const writeSaved = (key: string, value: unknown) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ } };

/** Same as useState, but the value is restored after a refresh. `key` should include the user and city. */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState<T>(() => readSaved(storageKey, initial));
  const loadedKey = useRef(storageKey);
  useEffect(() => {
    // Another city or user: restore that scope's own filters instead of carrying these over.
    if (loadedKey.current !== storageKey) { loadedKey.current = storageKey; setValue(readSaved(storageKey, initial)); return; }
    writeSaved(storageKey, value);
  }, [storageKey, value]);
  return [value, setValue];
}

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v + 'T00:00:00Z'));
/** Last chosen date range, or null when none was saved or it is not valid. */
export function savedDateRange(): { from: string; to: string } | null {
  const saved = readSaved<{ from?: string; to?: string } | null>(DATE_RANGE_KEY, null);
  return saved && isDay(saved.from) && isDay(saved.to) && saved.from <= saved.to ? { from: saved.from, to: saved.to } : null;
}
export const saveDateRange = (from: string, to: string) => writeSaved(DATE_RANGE_KEY, { from, to });

/** Called on sign-out. */
export function clearPersistedFilters() {
  try {
    sessionStorage.removeItem(DATE_RANGE_KEY);
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key);
  } catch { /* Storage is optional. */ }
}
