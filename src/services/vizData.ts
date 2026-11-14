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
  const days:string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`); t <= end && days.length < 400; t += 86400_000) days.push(new Date(t).toISOString().slice(0, 10));
  if (days.length <= 62) return days.map(d => ({id: d, label: short(d), value: counts.get(d) || 0}));
  const weeks:{id:string;label:string;value:number}[] = [];
  days.forEach((d, i) => { if (i % 7 === 0) weeks.push({id: d, label: `Week of ${short(d)}`, value: 0}); weeks.at(-1)!.value += counts.get(d) || 0; });
  return weeks;
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
