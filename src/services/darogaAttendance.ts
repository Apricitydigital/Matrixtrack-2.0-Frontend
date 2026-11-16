import { api } from './api';

/** A previous attendance upload must never stand in for the selected review period. */
export async function loadDarogaAttendance(cityId: string, from: string, to: string, signal: AbortSignal) {
  const query = new URLSearchParams({ cityId, from, to, page: '1', pageSize: '1' });
  const data = await api(`/city/attendance/dashboard?${query}`, { signal, cache: 'no-store' });
  if (data?.hasData === false && data.range === null) return { rows: [], status: 'no_data' as const, period: from === to ? from : `${from} to ${to}` };
  const start = String(data?.range?.from || '').slice(0, 10), end = String(data?.range?.to || '').slice(0, 10);
  if (start !== from || end !== to || typeof data.hasData !== 'boolean') throw new Error('Attendance response does not match the selected dates.');
  if (data.hasData && !Array.isArray(data.allEmployees)) throw new Error('Attendance employee totals are unavailable.');
  const rows = data.hasData ? data.allEmployees : [];
  return { rows, status: rows.length ? 'ready' as const : 'no_data' as const, period: from === to ? from : `${from} to ${to}` };
}
