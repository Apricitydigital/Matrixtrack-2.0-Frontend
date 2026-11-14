/**
 * Self-contained report documents for Reports & Exports (Visual mode).
 *
 * Why this exists: the generic printElement() clones the live page and relies on the app's
 * stylesheets loading inside a print iframe. Charts printed before those styles arrived, so
 * exports came out unstyled and sprawling. Every document built here carries its own CSS and
 * draws charts with literal colours and sizes, so the screen preview and the PDF are the same
 * HTML and nothing external has to load before printing.
 */
import {finite} from './insights';

export interface DocContext {city:string;from:string;to:string;generated:string;scope:string;role:string;brand:string}

/* ---------- formatting ---------- */
export const esc = (v:unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
const num = (v:unknown, d = 0) => finite(v) ? v.toLocaleString('en-IN', {maximumFractionDigits: d}) : '—';
const pct = (v:unknown, d = 1) => finite(v) ? `${v.toLocaleString('en-IN', {maximumFractionDigits: d})}%` : '—';
const ratio = (a:unknown, b:unknown) => finite(a) && finite(b) && b > 0 ? a / b * 100 : null;
const clamp = (v:number) => Math.max(0, Math.min(100, v));

/* ---------- palette (validated categorical + status steps) ---------- */
export const C = {ink: '#19394d', muted: '#637f91', axis: '#8a9aa6', line: '#e1e8ee', track: '#e9eef2', navy: '#16405a', teal: '#1d6b78',
  blue: '#2a78d6', aqua: '#1baf7a', green: '#0ca30c', amber: '#fab219', red: '#d03b3b', orange: '#eb6834', violet: '#6250d6', grey: '#a9b6c0', target: '#cde2fb'};
export const STATUS = [
  {key: 'cleaned', id: 'approved', label: 'Cleaned', color: C.green},
  {key: 'notCleaned', id: 'rejected', label: 'Not cleaned', color: C.red},
  {key: 'siPending', id: 'pending_review', label: 'Pending review', color: C.amber},
  {key: 'actionRequired', id: 'action_required', label: 'ULB Action required', color: C.orange},
  {key: 'actionTaken', id: 'action_taken', label: 'IEC Action taken', color: C.blue},
  {key: 'escalated', id: 'escalated', label: 'Escalated', color: C.violet},
] as const;
const progressColor = (p:number | null) => p == null ? C.grey : p >= 100 ? C.green : p >= 60 ? C.aqua : p >= 30 ? C.blue : C.orange;
const inkOn = (fill:string) => fill === C.amber ? '#1b1b1b' : '#ffffff';

/* ---------- chart primitives (strings; literal colours; explicit sizes) ---------- */
export function ring(p:number | null, size = 74, color?:string, caption = '') {
  const v = p == null ? 0 : clamp(p), c = color || progressColor(p);
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" class="ring" role="img" aria-label="${esc(caption || 'Progress')} ${esc(pct(p, 0))}">
<circle cx="40" cy="40" r="31" fill="none" stroke="${C.track}" stroke-width="10"/>
${v > 0 ? `<circle cx="40" cy="40" r="31" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" pathLength="100" stroke-dasharray="${v.toFixed(2)} 100" transform="rotate(-90 40 40)"/>` : ''}
<text x="40" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="${C.ink}">${esc(p == null ? '—' : `${Math.round(p)}%`)}</text></svg>`;
}
export function donut(items:{label:string;value:number | null | undefined;color:string}[], size:number, center:string, sub:string) {
  const rows = items.filter(i => finite(i.value) && (i.value as number) > 0), total = rows.reduce((s, i) => s + (i.value as number), 0);
  let offset = 0;
  const gap = rows.length > 1 ? .5 : 0;
  const arcs = total ? rows.map(i => { const share = (i.value as number) / total * 100, len = Math.max(.01, share - gap), a = `<circle cx="50" cy="50" r="38" fill="none" stroke="${i.color}" stroke-width="16" pathLength="100" stroke-dasharray="${len.toFixed(3)} ${(100 - len).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}" transform="rotate(-90 50 50)"/>`; offset += share; return a; }).join('') : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${esc(sub)}"><circle cx="50" cy="50" r="38" fill="none" stroke="${C.track}" stroke-width="16"/>${arcs}
<text x="50" y="50" text-anchor="middle" font-size="15" font-weight="700" fill="${C.ink}">${esc(center)}</text><text x="50" y="62" text-anchor="middle" font-size="6.5" fill="${C.muted}">${esc(sub)}</text></svg>`;
}
export function legend(items:{label:string;value:number | null | undefined;color:string}[], showZero = true) {
  const total = items.reduce((s, i) => s + (finite(i.value) ? i.value : 0), 0);
  return `<div class="legend">${items.filter(i => showZero || (i.value ?? 0) > 0).map(i => `<div><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b>${num(i.value)}</b><em>${total && finite(i.value) ? pct(i.value / total * 100) : ''}</em></div>`).join('')}</div>`;
}
/** Paired columns: light = target, solid = achieved (green when the target is met). */
export function columns(rows:{label:string;target:number | null;value:number | null}[], w = 520, h = 200) {
  const valid = rows.filter(r => finite(r.target) || finite(r.value));
  if (!valid.length) return `<p class="empty">No comparable data.</p>`;
  const peak = Math.max(1, ...valid.flatMap(r => [r.target ?? 0, r.value ?? 0])), L = 46, R = 8, T = 22, B = 30, step = (w - L - R) / valid.length, cw = Math.min(58, step * .64);
  const y = (v:number) => T + (1 - v / peak) * (h - T - B);
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${w - R}" y1="${y(peak * f)}" y2="${y(peak * f)}" stroke="${C.line}" stroke-dasharray="3 4"/><text x="${L - 6}" y="${y(peak * f) + 3.5}" text-anchor="end" font-size="9.5" fill="${C.axis}">${esc(num(peak * f))}</text>`).join('');
  const bars = valid.map((r, n) => {
    const cx = L + step * n + step / 2, t = r.target ?? 0, v = r.value ?? 0, p = ratio(v, t), fill = t > 0 && v >= t ? C.green : C.blue;
    return `${t > 0 ? `<rect x="${cx - cw / 2}" y="${y(t)}" width="${cw}" height="${y(0) - y(t)}" rx="4" fill="${C.target}"/>` : ''}
${v > 0 ? `<rect x="${cx - cw * .3}" y="${y(v)}" width="${cw * .6}" height="${y(0) - y(v)}" rx="3" fill="${fill}"/>` : ''}
<text x="${cx}" y="${Math.min(y(t), y(v)) - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.ink}">${esc(p == null ? '—' : `${Math.round(p)}%`)}</text>
<text x="${cx}" y="${h - 12}" text-anchor="middle" font-size="10" fill="${C.muted}">${esc(r.label.length > 14 ? `${r.label.slice(0, 13)}…` : r.label)}</text>`;
  }).join('');
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Target and achieved">${grid}${bars}</svg>
<div class="keys"><span><i style="background:${C.target}"></i>Inspection target</span><span><i style="background:${C.blue}"></i>Achieved</span><span><i style="background:${C.green}"></i>Target met</span><span class="note">% = achieved ÷ target</span></div>`;
}
export function area(points:{label:string;value:number}[], w = 520, h = 170) {
  if (points.length < 2) return `<p class="empty">A trend needs at least two days in the selected range.</p>`;
  const peak = Math.max(1, ...points.map(p => p.value)), L = 36, R = 10, T = 14, B = 26, avg = points.reduce((s, p) => s + p.value, 0) / points.length;
  const x = (i:number) => L + i / (points.length - 1) * (w - L - R), y = (v:number) => T + (1 - v / peak) * (h - T - B);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const mid = Math.floor((points.length - 1) / 2);
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily trend">
<defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${C.blue}" stop-opacity=".3"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></linearGradient></defs>
${[0, .5, 1].map(f => `<line x1="${L}" x2="${w - R}" y1="${y(peak * f)}" y2="${y(peak * f)}" stroke="${C.line}" stroke-dasharray="3 4"/><text x="${L - 5}" y="${y(peak * f) + 3.5}" text-anchor="end" font-size="9" fill="${C.axis}">${esc(num(peak * f))}</text>`).join('')}
<path d="${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="url(#ag)"/><path d="${line}" fill="none" stroke="${C.blue}" stroke-width="2" stroke-linejoin="round"/>
<line x1="${L}" x2="${w - R}" y1="${y(avg)}" y2="${y(avg)}" stroke="${C.orange}" stroke-width="1.2" stroke-dasharray="5 4"/><text x="${w - R}" y="${y(avg) - 4}" text-anchor="end" font-size="9" fill="${C.orange}">avg ${esc(num(avg))}/day</text>
${[0, mid, points.length - 1].map(i => `<text x="${x(i)}" y="${h - 8}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}" font-size="9.5" fill="${C.muted}">${esc(points[i].label)}</text>`).join('')}</svg>`;
}
export const bar = (p:number | null, color?:string) => `<div class="bar"><i style="width:${p == null ? 0 : clamp(p).toFixed(1)}%;background:${color || progressColor(p)}"></i></div>`;
export function stack(items:{label:string;value:number | null | undefined;color:string}[]) {
  const rows = items.filter(i => finite(i.value) && (i.value as number) > 0), total = rows.reduce((s, i) => s + (i.value as number), 0);
  if (!total) return `<div class="stack empty-stack"><span>No records</span></div>`;
  return `<div class="stack">${rows.map(i => { const s = (i.value as number) / total * 100; return `<i style="flex:${s.toFixed(3)} 0 0;background:${i.color};color:${inkOn(i.color)}" title="${esc(i.label)}">${s >= 9 ? `${Math.round(s)}%` : ''}</i>`; }).join('')}</div>`;
}
export function waffle(p:number | null, color = C.aqua) {
  const filled = p == null ? 0 : Math.round(clamp(p));
  let cells = '';
  for (let i = 0; i < 100; i++) { const col = Math.floor(i / 5) + 1, row = (i % 5) + 1; cells += `<i style="grid-column:${col};grid-row:${row};${i < filled ? `background:${color}` : ''}"></i>`; }
  return `<div class="waffle">${cells}</div><div class="keys small"><span><i style="background:${color}"></i>Inspected</span><span><i style="background:${C.track}"></i>Not yet</span><span class="note">1 square = 1% of assets</span></div>`;
}
export function lollipops(rows:{label:string;score:number | null;sub?:string}[], tone:'good' | 'bad' | 'auto' = 'auto') {
  if (!rows.length) return `<p class="empty">No assessed wards.</p>`;
  return `<div class="lolli">${rows.map(r => { const s = r.score, c = s == null ? C.grey : tone === 'good' ? C.green : tone === 'bad' ? C.orange : s >= 70 ? C.green : s >= 40 ? C.blue : C.orange;
    return `<div><span class="lbl" title="${esc(r.label)}">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="trk"><i style="width:${s == null ? 0 : clamp(s)}%;background:${c}"></i><b style="left:${s == null ? 0 : clamp(s)}%;border-color:${c}"></b></span><strong>${s == null ? 'Not assessed' : num(s, 1)}</strong></div>`; }).join('')}
<div class="axis"><span></span><span><em>0</em><em>50</em><em>100</em></span><span></span></div></div>`;
}

/* ---------- document shell ---------- */
const CSS = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0}
body{font:11px/1.45 "Segoe UI",Arial,Helvetica,sans-serif;color:${C.ink};background:#eef3f7}
.page{background:#fff;max-width:1047px;margin:18px auto;padding:0 0 18px;border-radius:10px;box-shadow:0 6px 24px #0b243518;overflow:hidden}
.band{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:11px 22px 9px;background:${C.navy};color:#fff;border-bottom:4px solid ${C.blue}}
.band h1{margin:0;font-size:17px;letter-spacing:-.2px}.band p{margin:3px 0 0;font-size:10.5px;color:#c9dbe6}
.band .right{text-align:right}.band .right b{display:block;font-size:15px}.band .right span{font-size:10.5px;color:#c9dbe6}
.body{padding:11px 22px 0}
h2{margin:0 0 1px;font-size:16px;letter-spacing:-.2px}h2+.sub{margin:0 0 8px;color:${C.muted};font-size:11px}
h3{margin:0 0 5px;font-size:12px}h3 small{font-weight:400;color:${C.muted};margin-left:6px;font-size:10.5px}
.kpis{display:grid;grid-template-columns:repeat(var(--n,6),1fr);gap:8px;margin-bottom:9px}
.kpi{position:relative;padding:7px 10px 7px 13px;border:1px solid ${C.line};border-radius:9px;background:#f6f9fb;break-inside:avoid;min-height:50px}
.kpi:before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:4px;border-radius:0 3px 3px 0;background:var(--c,${C.navy})}
.kpi span{display:block;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted}}
.kpi b{display:block;margin-top:2px;font-size:17px;line-height:1.15;color:var(--c,${C.ink})}
.kpi small{display:block;font-size:9.5px;color:${C.muted}}
.kpi.ringed{display:flex;align-items:center;gap:8px;padding-left:12px}.kpi.ringed>div{min-width:0}
.grid{display:grid;gap:10px;margin-bottom:9px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr 1fr}.g64{grid-template-columns:1.55fr 1fr}.g46{grid-template-columns:1fr 1.4fr}
.card{border:1px solid ${C.line};border-radius:10px;padding:8px 12px;break-inside:avoid;min-width:0}
.flex{display:flex;align-items:center;gap:14px}.flex>svg{flex-shrink:0}
table{width:100%;border-collapse:collapse;font-size:10.5px;break-inside:auto}
thead th{background:${C.navy};color:#fff;font-weight:600;padding:5px 7px;text-align:right;white-space:nowrap}
thead th:first-child{text-align:left;border-radius:6px 0 0 0}thead th:last-child{border-radius:0 6px 0 0}
td{padding:4px 7px;border-bottom:1px solid ${C.line};text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td:first-child{text-align:left;font-weight:600;white-space:normal}
tbody tr:nth-child(even) td{background:#f7fafc}
tr.total td{background:#dcebfa!important;font-weight:700}
tr{break-inside:avoid}
td.pb{min-width:110px}td.pb .bar{display:inline-block;width:60px;vertical-align:middle;margin-right:6px}
.bar{height:8px;border-radius:5px;background:${C.track};overflow:hidden}.bar i{display:block;height:100%;border-radius:5px}
.stack{display:flex;gap:2px;height:16px;border-radius:5px;overflow:hidden}.stack i{display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:700;font-style:normal;min-width:2px}
.empty-stack{background:${C.track};justify-content:center;align-items:center;font-size:9px;color:${C.muted}}
.srow{display:grid;grid-template-columns:70px 1fr 44px;align-items:center;gap:8px;margin:5px 0;font-size:10.5px}.srow b{text-align:right;font-variant-numeric:tabular-nums}
.legend{display:grid;gap:1px;min-width:0;flex:1}.legend div{display:grid;grid-template-columns:10px 1fr auto 44px;align-items:center;gap:7px;font-size:10px;line-height:1.35}
.legend i,.keys i{width:9px;height:9px;border-radius:3px;display:inline-block}.legend b{font-variant-numeric:tabular-nums}.legend em{font-style:normal;color:${C.muted};text-align:right;font-size:9.5px}
.keys{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:4px;font-size:9.5px;color:${C.muted}}.keys span{display:inline-flex;align-items:center;gap:5px}.keys .note{color:${C.axis}}.keys.small{margin-top:5px}
.waffle{display:grid;grid-template-columns:repeat(20,8px);grid-template-rows:repeat(5,8px);gap:2px}.waffle i{background:${C.track};border-radius:2px}
.lolli{display:grid;gap:3px}.lolli>div{display:grid;grid-template-columns:minmax(0,44%) 1fr 58px;align-items:center;gap:8px;font-size:10.5px}
.lolli .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lolli .lbl small{margin-left:5px;color:${C.muted};font-size:9px}
.lolli .trk{position:relative;height:12px}.lolli .trk:before{content:'';position:absolute;left:0;right:0;top:5px;height:2px;background:${C.track}}
.lolli .trk i{position:absolute;left:0;top:4px;height:4px;border-radius:2px}.lolli .trk b{position:absolute;top:0;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#fff;border:3.5px solid}
.lolli strong{text-align:right;font-variant-numeric:tabular-nums}.lolli .axis{font-size:8.5px;color:${C.axis}}.lolli .axis>span:nth-child(2){display:flex;justify-content:space-between}.lolli .axis em{font-style:normal}
.wards{border-radius:10px;overflow:hidden;border:1px solid ${C.line};break-inside:avoid}
.wards header{padding:5px 11px;font-weight:700;font-size:11.5px}.wards header small{display:block;font-weight:400;font-size:9.5px;opacity:.85}
.wards.top header{background:#e9f8ef;color:#0b7a36;border-bottom:2px solid ${C.green}}.wards.bottom header{background:#fdeeee;color:#a42a2a;border-bottom:2px solid ${C.red}}
.wards .lolli{padding:6px 11px}
.empty{margin:8px 0;color:${C.muted};font-size:10.5px}
.foot{margin:8px 22px 0;padding-top:7px;border-top:1px solid ${C.line};display:flex;justify-content:space-between;font-size:9px;color:${C.axis}}
.def{margin:4px 0 0;font-size:9.5px;color:${C.muted}}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.facts div{padding:7px 9px;border-radius:7px;background:#f4f8fb;break-inside:avoid}.facts span{display:block;font-size:9.5px;color:${C.muted}}.facts b{font-size:14px}
.missing{margin:4px 0 0;font-size:9.5px;color:${C.muted};line-height:1.55}.missing b{color:${C.ink}}
.complete>div{display:grid;grid-template-columns:170px 1fr 36px;gap:8px;align-items:center;margin:3px 0;font-size:10px}.complete .cells{display:flex;gap:2px}.complete .cells i{flex:1;height:9px;border-radius:2px;background:${C.track}}.complete .cells i.on{background:${C.blue}}.complete b{text-align:right;color:${C.muted}}
.complete.narrow>div{grid-template-columns:1fr 34px;gap:1px 8px;margin:0 0 5px}.complete.narrow>div>span:first-child{grid-column:1/-1}
.officers{display:grid;gap:4px}.officers div{display:grid;grid-template-columns:1fr 60px;gap:0 10px;padding:4px 9px;border-radius:7px;background:#f4f8fb}.officers b{text-align:right}.officers small{grid-column:1/-1;color:${C.muted};font-size:9.5px}
@page{size:A4 landscape;margin:9mm}
@media print{body{background:#fff}.page{max-width:none;margin:0;border-radius:0;box-shadow:none;padding-bottom:0;break-after:page}.page:last-child{break-after:auto}}
`;
export function documentHtml(title:string, pages:string[]) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${pages.join('')}</body></html>`;
}
export function band(ctx:DocContext, title:string, crumb:string) {
  return `<div class="band"><div><h1>${esc(title)}</h1><p>MatrixTrack 2.0 · ${esc(ctx.role)} · ${esc(crumb)}</p></div><div class="right"><b>${esc(ctx.city)}</b><span>${esc(ctx.from === ctx.to ? ctx.from : `${ctx.from} to ${ctx.to}`)} · IST</span></div></div>`;
}
export const foot = (ctx:DocContext, label:string) => `<div class="foot"><span>${esc(ctx.brand)} · ${esc(label)}</span><span>Generated ${esc(ctx.generated)} IST</span></div>`;
export const kpi = (label:string, value:string, color:string = C.navy, sub = '') => `<div class="kpi" style="--c:${color}"><span>${esc(label)}</span><b>${esc(value)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
export const kpiRing = (label:string, p:number | null, sub:string) => `<div class="kpi ringed" style="--c:${progressColor(p)}">${ring(p, 50, undefined, label)}<div><span>${esc(label)}</span><small>${esc(sub)}</small></div></div>`;

/* ---------- printing ---------- */
/** Prints a finished document. No external resources, so nothing can arrive late and break the layout. */
export function printDocument(title:string, html:string) {
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.setAttribute('aria-hidden', 'true');
  // Same 1px-frame technique as services/print.ts: some browsers print a blank page from hidden frames.
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open(); doc.write(html); doc.close();
  const win = frame.contentWindow!;
  const go = () => {
    win.addEventListener('afterprint', () => frame.remove(), {once: true});
    win.focus(); win.print();
    setTimeout(() => frame.remove(), 120000);
  };
  const fonts = (doc as any).fonts?.ready as Promise<unknown> | undefined;
  Promise.race([fonts || Promise.resolve(), new Promise(r => setTimeout(r, 1500))]).then(() => requestAnimationFrame(() => requestAnimationFrame(go)));
}
