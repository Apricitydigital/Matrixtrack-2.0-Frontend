// Newest first (present -> past). Falls back to inspectionDate; stable for equal/missing dates.
type Dated = { submittedAt?: string; inspectionDate?: string; id?: string };
const stamp = (r: Dated) => r.submittedAt || r.inspectionDate || '';
export const newestFirst = (a: Dated, b: Dated) => stamp(b).localeCompare(stamp(a)) || String(a.id || '').localeCompare(String(b.id || ''));
export const sortNewestFirst = <T extends Dated>(rows: T[]): T[] => [...rows].sort(newestFirst);
