import {finite} from './insights';
import {inspectionOutcomes, type InspectionCoverage} from './inspectionCoverage';
import type {ReportFact} from './commissionerReportData';
import {dailyInspectionTrend, scopeCoverage, scopeRankings} from './vizData';
import {area, band, bar, C, columns, documentHtml, donut, esc, foot, kpi, kpiRing, legend, lollipops, stack, STATUS, waffle, type DocContext} from './reportPdf';

const num = (v:unknown, d = 0) => finite(v) ? v.toLocaleString('en-IN', {maximumFractionDigits: d}) : '—';
const pct = (v:unknown, d = 1) => finite(v) ? `${v.toLocaleString('en-IN', {maximumFractionDigits: d})}%` : '—';
const ratio = (a:unknown, b:unknown) => finite(a) && finite(b) && b > 0 ? a / b * 100 : null;
const byName = (a:string, b:string) => a.localeCompare(b, undefined, {numeric: true});

/* =====================================================================================
 * Zone-wise review report: overview page + one landscape page per zone.
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
const statusItems = (t:any) => STATUS.map(s => ({label: s.label, value: t[s.key] ?? null, color: s.color}));
const aiItems = (t:any) => [
  {label: 'Suggested clean', value: t.intelligenceSuggestedClean ?? null, color: C.green},
  {label: 'Suggested not cleaned', value: t.intelligenceSuggestedNotCleaned ?? null, color: C.red},
  {label: 'Unable to assess', value: t.intelligenceUnableToAssess ?? null, color: C.grey},
  {label: 'Awaiting analysis', value: t.awaitingIntelligence ?? null, color: C.amber},
];
const progressCell = (achieved:unknown, target:unknown) => { const p = ratio(achieved, target); return `<td class="pb">${bar(p)}${pct(p)}</td>`; };

function wardLists(z:any) {
  // The source can list the same ward in both lists when a zone has few assessed wards: show each ward once.
  const best = [...(z.bestWards || [])].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 5);
  const seen = new Set(best.map((w:any) => w.wardId));
  const worst = [...(z.worstWards || [])].filter((w:any) => !seen.has(w.wardId)).sort((a, b) => (a.score ?? 101) - (b.score ?? 101)).slice(0, 5);
  const row = (w:any) => ({label: w.wardName || 'Ward', score: finite(w.score) ? w.score : null, sub: finite(w.completed) ? `${num(w.completed)} insp.` : undefined});
  return {best: best.map(row), worst: worst.map(row)};
}

export function zoneReportDocument(data:any, ctx:DocContext) {
  const zones = [...(data.zones || [])].sort((a:any, b:any) => byName(String(a.zoneName), String(b.zoneName)));
  const totals = sum(zones.map(zoneTotal)), progress = ratio(totals.achieved, totals.inspectionTarget);
  const title = 'Zone-wise Inspection Report';
  const notice = data.targetEvidenceAvailable === false ? '<p class="def">Configured target evidence could not be loaded. Targets use one completed visit per registered asset per selected day.</p>' : '';

  const overview = `<section class="page">${band(ctx, title, 'Overview')}<div class="body">
<h2>Overview — all selected zones</h2><p class="sub">${zones.length} zone${zones.length === 1 ? '' : 's'} · ${esc(ctx.scope)}</p>
<div class="kpis" style="--n:8">${kpi('Total assets', num(totals.totalEntities))}${kpi('Inspection target', num(totals.inspectionTarget), C.navy)}${kpi('Achieved', num(totals.achieved), C.blue)}${kpiRing('Target progress', progress, `${num(totals.achieved)} of ${num(totals.inspectionTarget)}`)}${kpi('Asset coverage', pct(totals.coveragePercent), C.aqua, `${num(totals.uniqueEntities)} unique assets`)}${kpi('Cleaned', num(totals.cleaned), C.green)}${kpi('Not cleaned', num(totals.notCleaned), C.red)}${kpi('ULB Action required', num(totals.actionRequired), C.orange)}</div>
<div class="grid g2"><div class="card"><h3>Target vs achieved by zone</h3>${columns(zones.map((z:any) => { const t = zoneTotal(z); return {label: String(z.zoneName), target: t.inspectionTarget ?? null, value: t.achieved ?? null}; }), 520, 190)}</div>
<div class="card"><h3>Outcome mix by zone <small>share of inspection records</small></h3>${zones.map((z:any) => `<div class="srow"><span>${esc(z.zoneName)}</span>${stack(statusItems(zoneTotal(z)))}<b>${num(zoneTotal(z).inspections)}</b></div>`).join('')}
<div class="keys">${STATUS.map(s => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div></div></div>
<table><thead><tr><th>Zone</th><th>Assets</th><th>Target</th><th>Achieved</th><th>Target progress</th><th>Coverage</th><th>Records</th><th>Cleaned</th><th>Not cleaned</th><th>Pending review</th><th>ULB Action req.</th><th>IEC Action taken</th><th>Escalated</th></tr></thead><tbody>
${zones.map((z:any) => { const t = zoneTotal(z); return `<tr><td>${esc(z.zoneName)}${z.wardFilter ? `<small> (${z.wardFilter.selected}/${z.wardFilter.total} wards)</small>` : ''}</td><td>${num(t.totalEntities)}</td><td>${num(t.inspectionTarget)}</td><td>${num(t.achieved)}</td>${progressCell(t.achieved, t.inspectionTarget)}<td>${pct(t.coveragePercent)}</td><td>${num(t.inspections)}</td><td>${num(t.cleaned)}</td><td>${num(t.notCleaned)}</td><td>${num(t.siPending)}</td><td>${num(t.actionRequired)}</td><td>${num(t.actionTaken)}</td><td>${num(t.escalated)}</td></tr>`; }).join('')}
<tr class="total"><td>Total</td><td>${num(totals.totalEntities)}</td><td>${num(totals.inspectionTarget)}</td><td>${num(totals.achieved)}</td>${progressCell(totals.achieved, totals.inspectionTarget)}<td>${pct(totals.coveragePercent)}</td><td>${num(totals.inspections)}</td><td>${num(totals.cleaned)}</td><td>${num(totals.notCleaned)}</td><td>${num(totals.siPending)}</td><td>${num(totals.actionRequired)}</td><td>${num(totals.actionTaken)}</td><td>${num(totals.escalated)}</td></tr></tbody></table>
<p class="def">Achieved = completed inspections in the selected dates. Target progress = achieved ÷ inspection target. Coverage = unique registered assets with a completed inspection ÷ total assets. Status counts include every record once and reconcile to Records.</p>${notice}
</div>${foot(ctx, 'Overview')}</section>`;

  const pages = zones.map((z:any) => {
    const t = zoneTotal(z), p = ratio(t.achieved, t.inspectionTarget), mods = (z.modules || []) as any[], {best, worst} = wardLists(z), ai = aiItems(t), aiTotal = ai.reduce((s, i) => s + (finite(i.value) ? i.value : 0), 0);
    return `<section class="page">${band(ctx, title, String(z.zoneName))}<div class="body">
<h2>${esc(z.zoneName)}</h2><p class="sub">${z.wardFilter ? `${z.wardFilter.selected} of ${z.wardFilter.total} wards selected · ` : ''}${esc(ctx.from === ctx.to ? ctx.from : `${ctx.from} to ${ctx.to}`)}</p>
<div class="kpis" style="--n:7">${kpi('Total assets', num(t.totalEntities))}${kpi('Inspection target', num(t.inspectionTarget))}${kpi('Achieved', num(t.achieved), C.blue)}${kpiRing('Target progress', p, `${num(t.achieved)} of ${num(t.inspectionTarget)}`)}${kpi('Asset coverage', pct(t.coveragePercent), C.aqua, `${num(t.uniqueEntities)} unique assets`)}${kpi('Cleaned', num(t.cleaned), C.green)}${kpi('ULB Action required', num(t.actionRequired), C.orange)}</div>
<table><thead><tr><th>Module</th><th>Assets</th><th>Target</th><th>Achieved</th><th>Target progress</th><th>Coverage</th><th>Records</th><th>Cleaned</th><th>Not cleaned</th><th>Pending review</th><th>ULB Action req.</th><th>IEC Action taken</th><th>Escalated</th></tr></thead><tbody>
${mods.map(m => `<tr><td>${esc(moduleName(m))}</td><td>${num(m.totalEntities)}</td><td>${num(m.inspectionTarget)}</td><td>${num(m.achieved)}</td>${progressCell(m.achieved, m.inspectionTarget)}<td>${pct(m.coveragePercent)}</td><td>${num(m.inspections)}</td><td>${num(m.cleaned)}</td><td>${num(m.notCleaned)}</td><td>${num(m.siPending)}</td><td>${num(m.actionRequired)}</td><td>${num(m.actionTaken)}</td><td>${num(m.escalated)}</td></tr>`).join('')}
<tr class="total"><td>Total</td><td>${num(t.totalEntities)}</td><td>${num(t.inspectionTarget)}</td><td>${num(t.achieved)}</td>${progressCell(t.achieved, t.inspectionTarget)}<td>${pct(t.coveragePercent)}</td><td>${num(t.inspections)}</td><td>${num(t.cleaned)}</td><td>${num(t.notCleaned)}</td><td>${num(t.siPending)}</td><td>${num(t.actionRequired)}</td><td>${num(t.actionTaken)}</td><td>${num(t.escalated)}</td></tr></tbody></table>
<div class="grid g2" style="margin-top:12px"><div class="card"><h3>Inspection outcomes <small>official SI decisions and follow-up</small></h3><div class="flex">${donut(statusItems(t), 86, num(t.inspections), 'records')}${legend(statusItems(t))}</div></div>
<div class="card"><h3>AI cleanliness assessment <small>suggestions only — an SI decision is the official outcome</small></h3>${aiTotal ? `<div class="flex">${donut(ai, 86, num(aiTotal), 'photos assessed')}${legend(ai)}</div>` : '<p class="empty">No AI assessments for this zone in the selected dates.</p>'}</div></div>
<div class="grid g2"><div class="wards top"><header>Highest-scoring wards<small>Ward score out of 100</small></header>${best.length ? lollipops(best, 'auto') : '<p class="empty" style="padding:6px 11px">No assessed wards in this zone.</p>'}</div>
<div class="wards bottom"><header>Lowest-scoring wards<small>Ward score out of 100 — focus for follow-up</small></header>${worst.length ? lollipops(worst, 'auto') : `<p class="empty" style="padding:6px 11px">${best.length ? 'Every assessed ward is already listed as highest-scoring.' : 'No assessed wards.'}</p>`}</div></div>
</div>${foot(ctx, String(z.zoneName))}</section>`;
  });
  return documentHtml(`${ctx.city} · ${title}`, [overview, ...pages]);
}

/* =====================================================================================
 * City summary ("Report data"): one model feeds both the preview and the PDF.
 * Figures that a chart or KPI already shows are not repeated in the fact grid.
 * ===================================================================================*/
const SHOWN = new Set(['dates', 'achieved', 'target', 'targetAchievement', 'records', 'unique', 'coverage', 'entities', 'sis', 'darogas', 'workforce', 'wards', 'wardsVisited', 'zones', 'zonesVisited', 'attendanceRate',
  'zoneWardAverage', 'zoneRankings', 'topWards', 'focusWards', 'QCLeaders', 'SUPERVISORLeaders']);
export interface CityReportInput {report:{facts:ReportFact[];modules:any[];days:number;scope:string;available:number};coverage:InspectionCoverage;pulse:any;zones:{id:string;name:string}[];zone?:string;ward?:string;selectedZoneIds?:string[];selectedWardIds?:string[]}

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
  return {
    scope: report.scope, days: report.days, available: report.available, totalFacts: report.facts.length,
    achieved: n('achieved'), target: n('target'), progress: n('targetAchievement'), records: n('records'), unique: n('unique'), entities: n('entities'), coverage: n('coverage'),
    attendance: rate == null ? null : {rate, present: finite(att?.present) ? att.present : null, absent: finite(att?.absent) ? att.absent : null},
    team: {sis: n('sis'), darogas: n('darogas'), workforce: n('workforce')},
    wardsReached: n('wardsVisited'), wardsTotal: n('wards'), zonesReached: n('zonesVisited'), zonesTotal: n('zones'),
    services: services.filter(s => (s.assets ?? 0) > 0 || (s.target ?? 0) > 0 || (s.achieved ?? 0) > 0),
    notConfigured: services.filter(s => !((s.assets ?? 0) > 0 || (s.target ?? 0) > 0 || (s.achieved ?? 0) > 0)).map(s => s.label),
    outcomes: inspectionOutcomes(scoped).rows.map(r => ({label: r.label, value: r.value, color: STATUS.find(s => s.id === r.id)?.color || C.grey})),
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

export function cityReportDocument(m:CityReportModel, ctx:DocContext) {
  const title = 'Inspection Summary Report';
  const fmtFact = (v:unknown) => typeof v === 'number' ? num(v, 1) : esc(v);
  const officers = (rows:{name:string;score:number;wards:string}[], label:string) => rows.length ? `<div class="officers">${rows.map(o => `<div><span><b style="text-align:left">${esc(o.name)}</b></span><b>${num(o.score, 1)}%</b><small>${esc(o.wards || 'Ward assignment not supplied')}</small></div>`).join('')}</div>` : `<p class="empty">${esc(label)} scores are not available for this scope.</p>`;
  const page1 = `<section class="page">${band(ctx, title, m.scope)}<div class="body">
<h2>${esc(m.scope)}</h2><p class="sub">${m.days} inclusive day${m.days === 1 ? '' : 's'} · ${m.available} of ${m.totalFacts} report fields have source data · “—” means not available, not zero</p>
<div class="kpis" style="--n:6">${kpi('Inspections completed', num(m.achieved), C.blue, `${num(m.records)} records`)}${kpi('Inspection target', num(m.target))}${kpiRing('Target progress', m.progress, `${num(m.achieved)} of ${num(m.target)}`)}${kpi('Asset coverage', pct(m.coverage), C.aqua, `${num(m.unique)} of ${num(m.entities)} assets`)}${m.attendance ? kpi('Reported attendance', pct(m.attendance.rate), C.violet, m.attendance.present != null ? `${num(m.attendance.present)} present · ${num(m.attendance.absent)} absent` : '') : kpi('Reported attendance', '—', C.grey, 'Shown for a single zone or ward')}${kpi('Wards reached', `${num(m.wardsReached)} / ${num(m.wardsTotal)}`, C.teal, `${num(m.zonesReached)} of ${num(m.zonesTotal)} zones`)}</div>
<div class="grid g64"><div class="card"><h3>Service delivery</h3>${m.services.length ? `<table><thead><tr><th>Service</th><th>Assets</th><th>Target</th><th>Achieved</th><th>Target progress</th><th>Coverage</th><th>Unique assets</th></tr></thead><tbody>${m.services.map(s => `<tr><td>${esc(s.label)}</td><td>${num(s.assets)}</td><td>${num(s.target)}</td><td>${num(s.achieved)}</td>${progressCell(s.achieved, s.target)}<td class="pb">${bar(s.coverage, C.aqua)}${pct(s.coverage)}</td><td>${num(s.unique)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No services with registered assets in this scope.</p>'}
${m.notConfigured.length ? `<p class="def">No registered assets or target: ${esc(m.notConfigured.join(', '))}.</p>` : ''}</div>
<div class="card"><h3>Inspection outcomes</h3><div class="flex">${donut(m.outcomes, 92, num(m.records), 'records')}${legend(m.outcomes)}</div></div></div>
<div class="grid g64"><div class="card"><h3>Completed inspections per day <small>IST · dashed line = daily average</small></h3>${area(m.trend, 560, 150)}</div>
<div class="card"><h3>Asset coverage <small>${num(m.unique)} of ${num(m.entities)} registered assets</small></h3>${waffle(m.coverage)}
<h3 style="margin-top:12px">Field team <small>current accounts</small></h3><div class="facts" style="grid-template-columns:repeat(3,1fr)"><div><span>SIs</span><b>${num(m.team.sis)}</b></div><div><span>Darogas</span><b>${num(m.team.darogas)}</b></div><div><span>Workforce</span><b>${num(m.team.workforce)}</b></div></div></div></div>
${m.other.length ? `<div class="card"><h3>Other recorded figures</h3><div class="facts">${m.other.map(f => `<div><span>${esc(f.label)}</span><b>${fmtFact(f.value)}</b></div>`).join('')}</div></div>` : ''}
</div>${foot(ctx, 'Summary')}</section>`;
  const page2 = `<section class="page">${band(ctx, title, `${m.scope} · Performance & data quality`)}<div class="body">
<h2>Performance & data quality</h2><p class="sub">Ward scores come from the ward ranking response; unassessed wards are not counted as zero.</p>
<div class="grid g2"><div class="wards top"><header>Highest-scoring wards<small>Score out of 100</small></header>${lollipops(m.top)}</div><div class="wards bottom"><header>Lowest-scoring wards<small>Score out of 100 — focus for follow-up</small></header>${m.bottom.length ? lollipops(m.bottom) : '<p class="empty" style="padding:9px 11px">Fewer than six assessed wards — all are listed as highest-scoring.</p>'}</div></div>
<div class="grid g3"><div class="card"><h3>Zone ward-score averages</h3>${m.zoneAverages.length ? lollipops(m.zoneAverages.map(z => ({label: z.label, score: z.score, sub: z.sub}))) : '<p class="empty">No zone has an assessed ward yet.</p>'}</div>
<div class="card"><h3>Top officers <small>official officer score</small></h3><h3 style="font-size:10.5px;color:${C.muted};margin:0 0 3px">SIs</h3>${officers(m.officers.si, 'SI')}<h3 style="font-size:10.5px;color:${C.muted};margin:6px 0 3px">Darogas</h3>${officers(m.officers.daroga, 'Daroga')}</div>
<div class="card"><h3>How complete is this report?</h3><div class="complete narrow">${m.completeness.map(s => `<div><span>${esc(s.section)}</span><span class="cells">${Array.from({length: s.total}, (_, i) => `<i class="${i < s.sourced ? 'on' : ''}"></i>`).join('')}</span><b>${s.sourced}/${s.total}</b></div>`).join('')}</div>
<p class="missing">${m.totalFacts - m.available} fields have no authoritative source yet — they are blank, not zero. Blue = field has source data. The CSV and Excel exports list every field with its source.</p></div></div>
</div>${foot(ctx, 'Performance & data quality')}</section>`;
  return documentHtml(`${ctx.city} · ${title}`, [page1, page2]);
}
