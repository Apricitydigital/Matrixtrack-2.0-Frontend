import {finite} from './insights';
import {inspectionOutcomes, type InspectionCoverage} from './inspectionCoverage';
import {inspectionDisplayStatus} from './inspectionStatus';
import {scopedIntelligence} from './intelligenceMetrics';
import type {ReportFact} from './commissionerReportData';
import {dailyInspectionTrend, scopeCoverage, scopeRankings} from './vizData';
import {area, band, bar, C, cleanColor, documentHtml, donut, esc, foot, heroRate, kpi, kpiRing, legend, lollipops, rateRows, stack, stackCols, STATUS, waffle, type DocContext} from './reportPdf';

const num = (v:unknown, d = 0) => finite(v) ? v.toLocaleString('en-IN', {maximumFractionDigits: d}) : '—';
const pct = (v:unknown, d = 1) => finite(v) ? `${v.toLocaleString('en-IN', {maximumFractionDigits: d})}%` : '—';
const ratio = (a:unknown, b:unknown) => finite(a) && finite(b) && b > 0 ? a / b * 100 : null;
const byName = (a:string, b:string) => a.localeCompare(b, undefined, {numeric: true});

/* =====================================================================================
 * Cleanliness: the SI decision on each report is the official result.
 * Cleanliness rate = cleaned ÷ reports the SI has decided (cleaned + not cleaned +
 * ULB action required + IEC action taken + escalated). Awaiting review is not counted.
 * ===================================================================================*/
const VERDICT_KEYS = ['cleaned', 'notCleaned', 'actionRequired', 'actionTaken', 'escalated'] as const;
export function cleanliness(t:any) {
  const g = (k:string) => finite(t?.[k]) ? t[k] as number : 0;
  const cleaned = g('cleaned'), decided = VERDICT_KEYS.reduce((s, k) => s + g(k), 0);
  const records = finite(t?.inspections) ? t.inspections as number : null;
  return {cleaned, issues: decided - cleaned, decided, records, pending: finite(t?.siPending) ? t.siPending as number : null,
    rate: decided ? cleaned / decided * 100 : null, checked: ratio(decided, records)};
}
const verdictItems = (t:any) => STATUS.filter(s => s.key !== 'siPending').map(s => ({label: s.label, value: t?.[s.key] ?? null, color: s.color}));
const statusItems = (t:any) => STATUS.map(s => ({label: s.label, value: t?.[s.key] ?? null, color: s.color}));
const rateCell = (rate:number | null) => `<td class="pb">${bar(rate, cleanColor(rate))}${pct(rate)}</td>`;

/** Tally report statuses in the same shape as the zone export totals. */
function tally(visits:{status?:string}[]) {
  const t:Record<string, number> = {inspections: visits.length};
  for (const s of STATUS) t[s.key] = 0;
  for (const v of visits) { const s = STATUS.find(x => x.id === inspectionDisplayStatus(v.status)); if (s) t[s.key]++; }
  return t;
}
const istDay = (iso?:string) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? new Date(t + 330 * 60000).toISOString().slice(0, 10) : null; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (d:string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
/** Daily (or weekly, for long ranges) cleaned / issues / awaiting review counts. */
function dailyCleanliness(visits:{status?:string;submittedAt?:string}[], from?:string, to?:string) {
  const keyed = visits.map(v => ({day: istDay(v.submittedAt), v})).filter(x => x.day) as {day:string;v:any}[];
  const start = from || keyed.map(x => x.day).sort()[0], end = to || keyed.map(x => x.day).sort().at(-1);
  if (!start || !end) return [];
  const days:string[] = [];
  for (let t = Date.parse(`${start}T00:00:00Z`), stop = Date.parse(`${end}T00:00:00Z`); t <= stop && days.length < 400; t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
  const size = days.length > 62 ? 7 : 1, buckets:{label:string;parts:number[]}[] = [];
  for (let i = 0; i < days.length; i += size) buckets.push({label: size > 1 ? `wk ${dayLabel(days[i])}` : dayLabel(days[i]), parts: [0, 0, 0]});
  const index = new Map(days.map((d, i) => [d, Math.floor(i / size)]));
  for (const {day, v} of keyed) {
    const b = index.get(day); if (b == null) continue;
    const id = inspectionDisplayStatus(v.status);
    buckets[b].parts[id === 'approved' ? 0 : id === 'pending_review' ? 2 : 1]++;
  }
  return buckets;
}
const DAILY_SERIES = [{label: 'Cleaned', color: C.green}, {label: 'Not cleaned / action', color: C.red}, {label: 'Awaiting SI review', color: C.amber}];

/* =====================================================================================
 * Zone-wise report: cleanliness overview + one landscape page per zone.
 * ===================================================================================*/
const SUM_KEYS = ['totalEntities', 'inspectionTarget', 'achieved', 'uniqueEntities', 'inspections', 'cleaned', 'notCleaned', 'siPending', 'actionRequired', 'actionTaken', 'escalated',
  'intelligenceSuggestedClean', 'intelligenceSuggestedNotCleaned', 'intelligenceUnableToAssess', 'awaitingIntelligence'] as const;
function sum(rows:any[]) {
  const out:Record<string, number | null> = {};
  for (const k of SUM_KEYS) { const vals = rows.map(r => r?.[k]).filter(finite) as number[]; out[k] = vals.length ? vals.reduce((s, v) => s + v, 0) : null; }
  out.coveragePercent = ratio(out.uniqueEntities, out.totalEntities);
  return out;
}
const zoneTotal = (z:any) => z.total ? {...z.total, coveragePercent: finite(z.total.coveragePercent) ? z.total.coveragePercent : ratio(z.total.uniqueEntities, z.total.totalEntities)} : sum(z.modules || []);
const moduleName = (m:any) => String(m.label || m.module || 'Module');
const aiItems = (t:any) => [
  {label: 'Suggested clean', value: t.intelligenceSuggestedClean ?? null, color: C.green},
  {label: 'Suggested not cleaned', value: t.intelligenceSuggestedNotCleaned ?? null, color: C.red},
  {label: 'Unable to assess', value: t.intelligenceUnableToAssess ?? null, color: C.grey},
  {label: 'Awaiting analysis', value: t.awaitingIntelligence ?? null, color: C.amber},
];
const aiTotal = (t:any) => aiItems(t).reduce((s, i) => s + (finite(i.value) ? i.value : 0), 0);

function wardLists(z:any) {
  // The source can list the same ward in both lists when a zone has few assessed wards: show each ward once.
  const best = [...(z.bestWards || [])].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 5);
  const seen = new Set(best.map((w:any) => w.wardId));
  const worst = [...(z.worstWards || [])].filter((w:any) => !seen.has(w.wardId)).sort((a, b) => (a.score ?? 101) - (b.score ?? 101)).slice(0, 5);
  const row = (w:any) => ({label: w.wardName || 'Ward', score: finite(w.score) ? w.score : null, sub: finite(w.completed) ? `${num(w.completed)} insp.` : undefined});
  return {best: best.map(row), worst: worst.map(row)};
}

/** Cleanliness columns first, inspection delivery after a divider. */
const TABLE_HEAD = (first:string) => `<thead><tr class="grp"><th></th><th colspan="9" class="c">Cleanliness — SI decisions on reports</th><th colspan="5" class="sep">Inspection delivery</th></tr>
<tr><th>${first}</th><th>Reports</th><th>SI-checked</th><th>Cleaned</th><th>Not cleaned</th><th>ULB action req.</th><th>IEC action taken</th><th>Escalated</th><th>Awaiting SI</th><th>Cleanliness rate</th><th class="sep">Assets</th><th>Target</th><th>Achieved</th><th>Progress</th><th>Coverage</th></tr></thead>`;
const tableRow = (label:string, t:any, cls = '') => { const c = cleanliness(t);
  return `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td><td>${num(t.inspections)}</td><td>${num(c.decided)}</td><td>${num(t.cleaned)}</td><td>${num(t.notCleaned)}</td><td>${num(t.actionRequired)}</td><td>${num(t.actionTaken)}</td><td>${num(t.escalated)}</td><td>${num(t.siPending)}</td>${rateCell(c.rate)}<td class="sep">${num(t.totalEntities)}</td><td>${num(t.inspectionTarget)}</td><td>${num(t.achieved)}</td><td>${pct(ratio(t.achieved, t.inspectionTarget))}</td><td>${pct(t.coveragePercent)}</td></tr>`; };
const DEFS = '<p class="def">Cleanliness rate = reports the SI marked Cleaned ÷ reports the SI has decided (SI-checked). Reports awaiting SI review are not counted as clean or not clean. Target progress = completed inspections ÷ inspection target; coverage = unique registered assets inspected ÷ total assets.</p>';

export function zoneReportDocument(data:any, ctx:DocContext) {
  const zones = [...(data.zones || [])].sort((a:any, b:any) => byName(String(a.zoneName), String(b.zoneName)));
  const totals = sum(zones.map(zoneTotal)), c = cleanliness(totals), progress = ratio(totals.achieved, totals.inspectionTarget);
  const title = 'Zone-wise Cleanliness Report';
  const notice = data.targetEvidenceAvailable === false ? '<p class="def">Configured target evidence could not be loaded. Targets use one completed visit per registered asset per selected day.</p>' : '';
  const anyAi = zones.some((z:any) => aiTotal(zoneTotal(z)) > 0);

  const overview = `<section class="page">${band(ctx, title, 'Overview')}<div class="body">
<h2>${esc(ctx.scope)}</h2><p class="sub">Cleanliness overview · ${zones.length} zone${zones.length === 1 ? '' : 's'} · SI decisions are the official cleanliness result</p>
<div class="kpis" style="--n:8">${kpiRing('Cleanliness rate', c.rate, `${num(c.cleaned)} of ${num(c.decided)} SI-checked`, cleanColor(c.rate))}${kpi('SI-checked', num(c.decided), C.navy, `${pct(c.checked)} of ${num(c.records)} reports`)}${kpi('Cleaned', num(totals.cleaned), C.green)}${kpi('Not cleaned', num(totals.notCleaned), C.red)}${kpi('ULB action required', num(totals.actionRequired), C.orange)}${kpi('IEC action taken', num(totals.actionTaken), C.blue)}${kpi('Awaiting SI review', num(totals.siPending), C.amber)}${kpiRing('Inspection target', progress, `${num(totals.achieved)} of ${num(totals.inspectionTarget)}`)}</div>
<div class="grid g2"><div class="card"><h3>Cleanliness rate by zone <small>verdicts on SI-checked reports</small></h3>${rateRows(zones.map((z:any) => { const t = zoneTotal(z), zc = cleanliness(t); return {label: String(z.zoneName), items: verdictItems(t), rate: zc.rate, sub: zc.records ? `${num(zc.decided)} of ${num(zc.records)} checked` : 'No reports'}; }))}
<div class="keys">${STATUS.filter(s => s.key !== 'siPending').map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div></div>
${anyAi ? `<div class="card"><h3>AI cleanliness suggestions by zone <small>advisory only — not an SI decision</small></h3>${zones.map((z:any) => { const t = zoneTotal(z); return `<div class="srow"><span>${esc(z.zoneName)}</span>${stack(aiItems(t))}<b>${num(aiTotal(t))}</b></div>`; }).join('')}
<div class="keys">${aiItems({}).map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div></div>`
  : `<div class="card"><h3>Where reports stand <small>share of all reports</small></h3>${zones.map((z:any) => `<div class="srow"><span>${esc(z.zoneName)}</span>${stack(statusItems(zoneTotal(z)))}<b>${num(zoneTotal(z).inspections)}</b></div>`).join('')}
<div class="keys">${STATUS.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div></div>`}</div>
<table>${TABLE_HEAD('Zone')}<tbody>
${zones.map((z:any) => tableRow(`${esc(z.zoneName)}${z.wardFilter ? `<small> (${z.wardFilter.selected}/${z.wardFilter.total} wards)</small>` : ''}`, zoneTotal(z))).join('')}
${tableRow('Total', totals, 'total')}</tbody></table>
${DEFS}${notice}
</div>${foot(ctx, 'Overview')}</section>`;

  const pages = zones.map((z:any) => {
    const t = zoneTotal(z), zc = cleanliness(t), p = ratio(t.achieved, t.inspectionTarget), mods = (z.modules || []) as any[], {best, worst} = wardLists(z), ai = aiItems(t), aiSum = aiTotal(t);
    return `<section class="page">${band(ctx, title, String(z.zoneName))}<div class="body">
<h2>${esc(z.zoneName)}</h2><p class="sub">${z.wardFilter ? `${z.wardFilter.selected} of ${z.wardFilter.total} wards selected · ` : ''}${esc(ctx.from === ctx.to ? ctx.from : `${ctx.from} to ${ctx.to}`)}</p>
<div class="kpis" style="--n:7">${kpiRing('Cleanliness rate', zc.rate, `${num(zc.cleaned)} of ${num(zc.decided)} SI-checked`, cleanColor(zc.rate))}${kpi('Cleaned', num(t.cleaned), C.green)}${kpi('Not cleaned', num(t.notCleaned), C.red)}${kpi('ULB action required', num(t.actionRequired), C.orange)}${kpi('IEC action taken', num(t.actionTaken), C.blue)}${kpi('Awaiting SI review', num(t.siPending), C.amber, `${pct(zc.checked)} of reports SI-checked`)}${kpiRing('Inspection target', p, `${num(t.achieved)} of ${num(t.inspectionTarget)}`)}</div>
<div class="grid g2"><div class="card"><h3>Cleanliness verdicts <small>official SI decisions and follow-up</small></h3><div class="flex">${donut(statusItems(t), 92, num(t.inspections), 'reports')}${legend(statusItems(t))}</div></div>
<div class="card"><h3>AI cleanliness assessment <small>suggestions only — an SI decision is the official outcome</small></h3>${aiSum ? `<div class="flex">${donut(ai, 92, num(aiSum), 'photos assessed')}${legend(ai)}</div>` : '<p class="empty">No AI assessments for this zone in the selected dates.</p>'}</div></div>
<table>${TABLE_HEAD('Module')}<tbody>
${mods.map(m => tableRow(esc(moduleName(m)), m)).join('')}
${tableRow('Total', t, 'total')}</tbody></table>
<div class="grid g2" style="margin-top:9px"><div class="wards top"><header>Highest-scoring wards<small>Ward score out of 100</small></header>${best.length ? lollipops(best, 'auto') : '<p class="empty" style="padding:6px 11px">No assessed wards in this zone.</p>'}</div>
<div class="wards bottom"><header>Lowest-scoring wards<small>Ward score out of 100 — focus for follow-up</small></header>${worst.length ? lollipops(worst, 'auto') : `<p class="empty" style="padding:6px 11px">${best.length ? 'Every assessed ward is already listed as highest-scoring.' : 'No assessed wards.'}</p>`}</div></div>
</div>${foot(ctx, String(z.zoneName))}</section>`;
  });
  return documentHtml(`${ctx.city} · ${title}`, [overview, ...pages]);
}

/* =====================================================================================
 * City summary: page 1 cleanliness, page 2 inspection delivery, page 3 performance &
 * data quality. One model feeds both the preview and the PDF.
 * Figures that a chart or KPI already shows are not repeated in the fact grid.
 * ===================================================================================*/
const SHOWN = new Set(['dates', 'achieved', 'target', 'targetAchievement', 'records', 'unique', 'coverage', 'entities', 'sis', 'darogas', 'workforce', 'wards', 'wardsVisited', 'zones', 'zonesVisited', 'attendanceRate',
  'zoneWardAverage', 'zoneRankings', 'topWards', 'focusWards', 'QCLeaders', 'SUPERVISORLeaders']);
export interface CityReportInput {report:{facts:ReportFact[];modules:any[];days:number;scope:string;available:number};coverage:InspectionCoverage;pulse:any;zones:{id:string;name:string}[];wards?:{id:string;name:string}[];zone?:string;ward?:string;selectedZoneIds?:string[];selectedWardIds?:string[]}

/** "Name: 41.489%; Ward 37 - X, Ward 44 - Y; Name 2: 0%; ..." → officers with rounded scores. */
export function parseOfficers(value:unknown) {
  if (typeof value !== 'string') return [];
  const out:{name:string;score:number;wards:string}[] = [];
  for (const token of value.split('; ')) {
    const m = token.match(/^(.+): (-?\d+(?:\.\d+)?)%$/);
    if (m) out.push({name: m[1], score: Number(m[2]), wards: ''});
    else if (out.length) out[out.length - 1].wards = out[out.length - 1].wards ? `${out[out.length - 1].wards}; ${token}` : token;
  }
  return out;
}

export function cityReportModel(input:CityReportInput) {
  const {report} = input, fact = (id:string) => report.facts.find(f => f.id === id)?.value ?? null, n = (id:string) => { const v = fact(id); return finite(v) ? v : null; };
  const geo = {zone: input.zone, ward: input.ward, zoneIds: input.selectedZoneIds, wardIds: input.selectedWardIds};
  const scoped = scopeCoverage(input.coverage, geo);
  const ranked = scopeRankings(input.pulse?.rankings, geo);
  // Attendance follows the report's own rule: the fact is withheld for multi-zone/ward scopes.
  const rate = n('attendanceRate'), att = input.pulse?.attendance;
  const services = report.modules.map((m:any) => ({label: String(m.label), assets: m.totalEntities, target: m.delivery?.target ?? null, achieved: m.achieved, unique: m.uniqueEntities, coverage: m.coveragePercent}));
  const zoneAverages = [...new Set(ranked.map(r => r.zoneId))].map(id => { const rows = ranked.filter(r => r.zoneId === id); return {label: input.zones.find(z => z.id === id)?.name || 'Zone', score: rows.reduce((s, r) => s + r.finalScore, 0) / rows.length, sub: `${rows.length} wards`}; }).sort((a, b) => byName(a.label, b.label));
  const sections = [...new Set(report.facts.map(f => f.section))];

  // Cleanliness: totals from the same outcome counts as the dashboard; breakdowns from the report register.
  const outcomeRows = inspectionOutcomes(scoped).rows;
  const statusTotals:Record<string, number | null> = {inspections: n('records')};
  for (const s of STATUS) statusTotals[s.key] = outcomeRows.find(r => r.id === s.id)?.value ?? null;
  const visits = [...new Map(scoped.visits.map(v => [v.id, v])).values()];
  const group = <K extends string>(key:(v:any) => K, label:(k:K) => string) => {
    const by = new Map<K, any[]>(); for (const v of visits) { const k = key(v); if (k) by.set(k, [...(by.get(k) || []), v]); }
    return [...by.entries()].map(([k, rows]) => { const t = tally(rows), c = cleanliness(t); return {id: k, label: label(k), t, ...c}; });
  };
  const moduleLabel = (id:string) => report.modules.find((m:any) => m.id === id || m.module === id)?.label || id;
  const wardName = (id:string) => input.wards?.find(w => w.id === id)?.name || 'Ward';
  const byZone = group(v => v.zoneId, id => input.zones.find(z => z.id === id)?.name || 'Zone').sort((a, b) => byName(a.label, b.label));
  const byModule = group(v => v.module, moduleLabel).sort((a, b) => (b.records ?? 0) - (a.records ?? 0));
  const byWard = group(v => v.wardId, wardName);
  const cleanest = byWard.filter(w => w.decided > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.decided - a.decided).slice(0, 5);
  const shown = new Set(cleanest.map(w => w.id));
  const attention = byWard.filter(w => !shown.has(w.id) && (w.issues > 0 || (w.pending ?? 0) > 0)).sort((a, b) => b.issues - a.issues || (b.pending ?? 0) - (a.pending ?? 0)).slice(0, 5);
  const ai = scopedIntelligence(scoped, {}, outcomeRows.every(r => r.value != null));

  return {
    scope: report.scope, days: report.days, available: report.available, totalFacts: report.facts.length,
    achieved: n('achieved'), target: n('target'), progress: n('targetAchievement'), records: n('records'), unique: n('unique'), entities: n('entities'), coverage: n('coverage'),
    attendance: rate == null ? null : {rate, present: finite(att?.present) ? att.present : null, absent: finite(att?.absent) ? att.absent : null},
    team: {sis: n('sis'), darogas: n('darogas'), workforce: n('workforce')},
    wardsReached: n('wardsVisited'), wardsTotal: n('wards'), zonesReached: n('zonesVisited'), zonesTotal: n('zones'),
    services: services.filter(s => (s.assets ?? 0) > 0 || (s.target ?? 0) > 0 || (s.achieved ?? 0) > 0),
    notConfigured: services.filter(s => !((s.assets ?? 0) > 0 || (s.target ?? 0) > 0 || (s.achieved ?? 0) > 0)).map(s => s.label),
    outcomes: outcomeRows.map(r => ({label: r.label, value: r.value, color: STATUS.find(s => s.id === r.id)?.color || C.grey})),
    clean: {totals: statusTotals, ...cleanliness(statusTotals), byZone, byModule, cleanest, attention, ai,
      daily: dailyCleanliness(visits, scoped.from, scoped.to)},
    trend: dailyInspectionTrend(scoped).map(p => ({label: p.label, value: p.value})),
    top: ranked.slice(0, 5).map(r => ({label: r.wardName, score: r.finalScore})),
    bottom: ranked.length > 5 ? ranked.slice(-Math.min(5, ranked.length - 5)).reverse().map(r => ({label: r.wardName, score: r.finalScore})) : [],
    zoneAverages,
    officers: {si: parseOfficers(fact('QCLeaders')), daroga: parseOfficers(fact('SUPERVISORLeaders'))},
    other: report.facts.filter(f => !SHOWN.has(f.id) && f.value != null),
    completeness: sections.map(s => { const rows = report.facts.filter(f => f.section === s); return {section: s, total: rows.length, sourced: rows.filter(f => f.value != null).length, missing: rows.filter(f => f.value == null).map(f => f.label)}; }),
  };
}
export type CityReportModel = ReturnType<typeof cityReportModel>;

type WardClean = CityReportModel['clean']['cleanest'][number];
const wardTable = (rows:WardClean[], empty:string) => rows.length ? `<table class="wtab"><thead><tr><th>Ward</th><th>SI-checked</th><th>Cleaned</th><th>Issues</th><th>Awaiting</th><th>Cleanliness</th></tr></thead><tbody>${rows.map(w => `<tr><td title="${esc(w.label)}">${esc(w.label)}</td><td>${num(w.decided)}</td><td>${num(w.cleaned)}</td><td>${num(w.issues)}</td><td>${num(w.pending)}</td>${rateCell(w.rate)}</tr>`).join('')}</tbody></table>` : `<p class="empty">${esc(empty)}</p>`;

export function cityReportDocument(m:CityReportModel, ctx:DocContext) {
  const cleanTitle = 'Cleanliness Summary Report', title = 'Inspection Summary Report', cl = m.clean, t = cl.totals;
  const fmtFact = (v:unknown) => typeof v === 'number' ? num(v, 1) : esc(v);
  const officers = (rows:{name:string;score:number;wards:string}[], label:string) => rows.length ? `<div class="officers">${rows.map(o => `<div><span><b style="text-align:left">${esc(o.name)}</b></span><b>${num(o.score, 1)}%</b><small>${esc(o.wards || 'Ward assignment not supplied')}</small></div>`).join('')}</div>` : `<p class="empty">${esc(label)} scores are not available for this scope.</p>`;
  const groupRows = (rows:CityReportModel['clean']['byZone']) => rateRows(rows.map(r => ({label: r.label, items: verdictItems(r.t), rate: r.rate, sub: `${num(r.decided)} of ${num(r.records)} checked`})));
  const aiLine = cl.ai && (cl.ai.clean + cl.ai.notClean) > 0 ? `<p class="ai">Of the <b>${num(t.siPending)}</b> reports awaiting SI review, AI suggests <b>${num(cl.ai.clean)}</b> clean and <b>${num(cl.ai.notClean)}</b> not cleaned (${num(cl.ai.other)} not yet assessed). Suggestions are advisory; the SI decision is the official result.</p>` : '';

  const page1 = `<section class="page">${band(ctx, cleanTitle, 'Cleanliness')}<div class="body">
<h2>${esc(ctx.scope)}</h2><p class="sub">${m.days} inclusive day${m.days === 1 ? '' : 's'} · cleanliness is the SI decision on each inspection report</p>
<div class="grid" style="grid-template-columns:1fr 1fr"><div class="card herogrid">${heroRate(cl.rate, 'Cleanliness rate', `${num(cl.cleaned)} of ${num(cl.decided)} SI-checked reports were found clean`)}
<div class="facts mini"><div><span>Cleaned</span><b style="color:${C.green}">${num(t.cleaned)}</b></div><div><span>Not cleaned</span><b style="color:${C.red}">${num(t.notCleaned)}</b></div><div><span>ULB action required</span><b style="color:${C.orange}">${num(t.actionRequired)}</b></div><div><span>IEC action taken</span><b style="color:${C.blue}">${num(t.actionTaken)}</b></div><div><span>Escalated</span><b style="color:${C.violet}">${num(t.escalated)}</b></div><div><span>Awaiting SI review</span><b style="color:#b07a00">${num(t.siPending)}</b></div></div></div>
<div class="card"><h3>Cleanliness verdicts <small>${num(cl.decided)} of ${num(cl.records)} reports SI-checked (${pct(cl.checked)})</small></h3><div class="flex">${donut(m.outcomes, 104, num(cl.records), 'reports')}${legend(m.outcomes)}</div>${aiLine}</div></div>
<div class="grid g3"><div class="card"><h3>Daily cleanliness <small>reports by SI verdict, IST</small></h3>${stackCols(cl.daily, DAILY_SERIES, 360, 140)}</div>
<div class="card"><h3>Cleanliness by zone <small>% clean of SI-checked</small></h3>${groupRows(cl.byZone)}</div>
<div class="card"><h3>Cleanliness by service</h3>${groupRows(cl.byModule)}</div></div>
<div class="grid g2"><div class="wards top"><header>Cleanest wards<small>Highest share of SI-checked reports found clean</small></header>${wardTable(cl.cleanest, 'No ward has an SI decision yet.')}</div>
<div class="wards bottom"><header>Wards needing attention<small>Most reports not cleaned or sent for action, then most awaiting review</small></header>${wardTable(cl.attention, 'No ward has open cleanliness issues.')}</div></div>
</div>${foot(ctx, 'Cleanliness')}</section>`;

  const page2 = `<section class="page">${band(ctx, title, 'Inspection delivery')}<div class="body">
<h2>${esc(ctx.scope)}</h2><p class="sub">${m.days} inclusive day${m.days === 1 ? '' : 's'} · ${m.available} of ${m.totalFacts} report fields have source data · “—” means not available, not zero</p>
<div class="kpis" style="--n:6">${kpi('Inspections completed', num(m.achieved), C.blue, `${num(m.records)} records`)}${kpi('Inspection target', num(m.target))}${kpiRing('Target progress', m.progress, `${num(m.achieved)} of ${num(m.target)}`)}${kpi('Asset coverage', pct(m.coverage), C.aqua, `${num(m.unique)} of ${num(m.entities)} assets`)}${m.attendance ? kpi('Reported attendance', pct(m.attendance.rate), C.violet, m.attendance.present != null ? `${num(m.attendance.present)} present · ${num(m.attendance.absent)} absent` : '') : kpi('Reported attendance', '—', C.grey, 'Shown for a single zone or ward')}${kpi('Wards reached', `${num(m.wardsReached)} / ${num(m.wardsTotal)}`, C.teal, `${num(m.zonesReached)} of ${num(m.zonesTotal)} zones`)}</div>
<div class="grid g64"><div class="card"><h3>Service delivery</h3>${m.services.length ? `<table><thead><tr><th>Service</th><th>Assets</th><th>Target</th><th>Achieved</th><th>Target progress</th><th>Coverage</th><th>Unique assets</th></tr></thead><tbody>${m.services.map(s => `<tr><td>${esc(s.label)}</td><td>${num(s.assets)}</td><td>${num(s.target)}</td><td>${num(s.achieved)}</td><td class="pb">${bar(ratio(s.achieved, s.target))}${pct(ratio(s.achieved, s.target))}</td><td class="pb">${bar(s.coverage, C.aqua)}${pct(s.coverage)}</td><td>${num(s.unique)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No services with registered assets in this scope.</p>'}
${m.notConfigured.length ? `<p class="def">No registered assets or target: ${esc(m.notConfigured.join(', '))}.</p>` : ''}</div>
<div class="card"><h3>Asset coverage <small>${num(m.unique)} of ${num(m.entities)} registered assets</small></h3>${waffle(m.coverage)}
<h3 style="margin-top:12px">Field team <small>current accounts</small></h3><div class="facts" style="grid-template-columns:repeat(3,1fr)"><div><span>SIs</span><b>${num(m.team.sis)}</b></div><div><span>Darogas</span><b>${num(m.team.darogas)}</b></div><div><span>Workforce</span><b>${num(m.team.workforce)}</b></div></div></div></div>
<div class="card" style="margin-bottom:9px"><h3>Completed inspections per day <small>IST · dashed line = daily average</small></h3>${area(m.trend, 1000, 120)}</div>
${m.other.length ? `<div class="card"><h3>Other recorded figures</h3><div class="facts">${m.other.map(f => `<div><span>${esc(f.label)}</span><b>${fmtFact(f.value)}</b></div>`).join('')}</div></div>` : ''}
</div>${foot(ctx, 'Inspection delivery')}</section>`;

  const page3 = `<section class="page">${band(ctx, title, 'Performance & data quality')}<div class="body">
<h2>Performance & data quality</h2><p class="sub">${esc(ctx.scope)} · ward scores come from the ward ranking response; unassessed wards are not counted as zero</p>
<div class="grid g2"><div class="wards top"><header>Highest-scoring wards<small>Score out of 100</small></header>${lollipops(m.top)}</div><div class="wards bottom"><header>Lowest-scoring wards<small>Score out of 100 — focus for follow-up</small></header>${m.bottom.length ? lollipops(m.bottom) : '<p class="empty" style="padding:9px 11px">Fewer than six assessed wards — all are listed as highest-scoring.</p>'}</div></div>
<div class="grid g3"><div class="card"><h3>Zone ward-score averages</h3>${m.zoneAverages.length ? lollipops(m.zoneAverages.map(z => ({label: z.label, score: z.score, sub: z.sub}))) : '<p class="empty">No zone has an assessed ward yet.</p>'}</div>
<div class="card"><h3>Top officers <small>official officer score</small></h3><h3 style="font-size:10.5px;color:${C.muted};margin:0 0 3px">SIs</h3>${officers(m.officers.si, 'SI')}<h3 style="font-size:10.5px;color:${C.muted};margin:6px 0 3px">Darogas</h3>${officers(m.officers.daroga, 'Daroga')}</div>
<div class="card"><h3>How complete is this report?</h3><div class="complete narrow">${m.completeness.map(s => `<div><span>${esc(s.section)}</span><span class="cells">${Array.from({length: s.total}, (_, i) => `<i class="${i < s.sourced ? 'on' : ''}"></i>`).join('')}</span><b>${s.sourced}/${s.total}</b></div>`).join('')}</div>
<p class="missing">${m.totalFacts - m.available} fields have no authoritative source yet — they are blank, not zero. Blue = field has source data. The CSV and Excel exports list every field with its source.</p></div></div>
</div>${foot(ctx, 'Performance & data quality')}</section>`;
  return documentHtml(`${ctx.city} · Cleanliness & Inspection Summary`, [page1, page2, page3]);
}
