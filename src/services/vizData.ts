import {inspectionStatus, type InspectionCoverage} from './inspectionCoverage';

const IST = 5.5 * 3600_000;
const istDay = (iso:string) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + IST).toISOString().slice(0, 10) : ''; };
const short = (day:string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', timeZone: 'UTC'});

/**
 * Completed inspections per IST day across the selected range, zero-filled.
 * Ranges longer than 62 days are grouped by week so the sparkline stays readable.
 */
export function dailyInspectionTrend(data:InspectionCoverage) {
  const counts = new Map<string, number>();
  for (const v of data.visits) {
    if (inspectionStatus(v.status || 'SUBMITTED') === 'unclassified' || !v.submittedAt) continue;
    const d = istDay(v.submittedAt); if (d) counts.set(d, (counts.get(d) || 0) + 1);
  }
  const from = data.from || [...counts.keys()].sort()[0], to = data.to || [...counts.keys()].sort().at(-1);
  if (!from || !to) return [];
  const start = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`), day = 86400_000;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];
  const step = (end - start) / day + 1 <= 62 ? day : 7 * day;
  const buckets:{id:string;label:string;value:number}[] = [];
  for (let t = start; t <= end; t += step) {
    const id = new Date(t).toISOString().slice(0, 10);
    buckets.push({id, label: `${step === day ? '' : 'Week of '}${short(id)}`, value: 0});
  }
  for (const [date, count] of counts) {
    const t = Date.parse(`${date}T00:00:00Z`);
    if (t >= start && t <= end) buckets[Math.floor((t - start) / step)].value += count;
  }
  return buckets;
}

/** Same geography rules as commissionerReportData: selected zones/wards first, then a single zone/ward. */
export function scopeCoverage(data:InspectionCoverage, s:{zone?:string;ward?:string;zoneIds?:string[];wardIds?:string[]}):InspectionCoverage {
  const zoneIds = s.zoneIds || [], wardIds = s.wardIds || [];
  const keep = (r:{zoneId?:string;wardId?:string}) => (!zoneIds.length || zoneIds.includes(r.zoneId || '')) && (!wardIds.length || wardIds.includes(r.wardId || '')) && (!s.zone || r.zoneId === s.zone) && (!s.ward || r.wardId === s.ward);
  return {...data, assets: data.assets.filter(keep), visits: data.visits.filter(keep)};
}
export interface RankedWard {wardId:string;wardName:string;zoneId:string;finalScore:number}
export function scopeRankings(rankings:any[] | undefined, s:{zone?:string;ward?:string;zoneIds?:string[];wardIds?:string[]}):RankedWard[] {
  const zoneIds = s.zoneIds || [], wardIds = s.wardIds || [];
  return (rankings || []).filter(r => r.rankable !== false && typeof r.finalScore === 'number' && Number.isFinite(r.finalScore)
    && (!zoneIds.length || zoneIds.includes(r.zoneId)) && (!wardIds.length || wardIds.includes(r.wardId)) && (!s.zone || r.zoneId === s.zone) && (!s.ward || r.wardId === s.ward))
    .sort((a, b) => b.finalScore - a.finalScore || String(a.wardName).localeCompare(String(b.wardName)));
}
