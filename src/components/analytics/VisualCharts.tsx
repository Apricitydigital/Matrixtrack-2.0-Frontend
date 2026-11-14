import React, {useId, useRef, useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {amount, finite} from '../../services/insights';
import {STATUS_VIVID, vivid} from '../../services/vizMode';

/**
 * Pictorial chart set used when the prototype "Visual" mode is on.
 * Each component mirrors the props of the classic chart it replaces, so pages need no changes.
 */
export interface VizItem {id:string;label:string;value:number|null|undefined;detail?:string;display?:string;color?:string;}

/* ---------- geometry ---------- */
const rad = (deg:number) => (deg - 90) * Math.PI / 180; // 0deg = 12 o'clock, clockwise
const pt = (cx:number, cy:number, r:number, deg:number) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))] as const;
function sector(cx:number, cy:number, ro:number, ri:number, a0:number, a1:number) {
  if (a1 - a0 >= 359.99) { // full ring: two halves
    const h = a0 + 180;
    return sector(cx, cy, ro, ri, a0, h) + sector(cx, cy, ro, ri, h, a0 + 360);
  }
  const large = a1 - a0 > 180 ? 1 : 0, [x0, y0] = pt(cx, cy, ro, a0), [x1, y1] = pt(cx, cy, ro, a1);
  if (ri <= 0) return `M${cx},${cy}L${x0},${y0}A${ro},${ro} 0 ${large} 1 ${x1},${y1}Z`;
  const [x2, y2] = pt(cx, cy, ri, a1), [x3, y3] = pt(cx, cy, ri, a0);
  return `M${x0},${y0}A${ro},${ro} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${ri},${ri} 0 ${large} 0 ${x3},${y3}Z`;
}
function arc(cx:number, cy:number, r:number, a0:number, a1:number) {
  const span = Math.min(359.9, a1 - a0), [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a0 + span);
  return `M${x0},${y0}A${r},${r} 0 ${span > 180 ? 1 : 0} 1 ${x1},${y1}`;
}
/** Monotone cubic (Fritsch–Carlson) so smoothed areas never overshoot below zero. */
function smooth(p:[number, number][]) {
  if (p.length < 3) return p.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  const n = p.length, d = p.slice(1).map((q, i) => (q[1] - p[i][1]) / (q[0] - p[i][0])), m = [d[0], ...d.slice(1).map((v, i) => v * d[i] <= 0 ? 0 : (v + d[i]) / 2), d[n - 2]];
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  let path = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) { const h = (p[i + 1][0] - p[i][0]) / 3; path += `C${p[i][0] + h},${p[i][1] + m[i] * h} ${p[i + 1][0] - h},${p[i + 1][1] - m[i + 1] * h} ${p[i + 1][0]},${p[i + 1][1]}`; }
  return path;
}
const inkOn = (fill:string) => ['#eda100', '#fab219'].includes(fill.toLowerCase()) ? '#0b0b0b' : '#ffffff';
const clip = (s:string, n:number) => s.length > n ? `${s.slice(0, n - 1)}…` : s;

/* ---------- tooltip ---------- */
interface Tip {x:number;y:number;flip:boolean;body:React.ReactNode}
function useTip() {
  const frame = useRef<HTMLDivElement>(null), [tip, setTip] = useState<Tip | null>(null);
  const place = (cx:number, cy:number, body:React.ReactNode) => { const b = frame.current?.getBoundingClientRect(); if (!b) return; const x = cx - b.left, y = cy - b.top; setTip({x, y, flip: x > b.width * .6, body}); };
  const bind = (body:React.ReactNode) => ({
    onMouseMove: (e:React.MouseEvent) => place(e.clientX, e.clientY, body),
    onMouseLeave: () => setTip(null),
    onFocus: (e:React.FocusEvent<Element>) => { const r = e.currentTarget.getBoundingClientRect(); place(r.left + r.width / 2, r.top + r.height / 2, body); },
    onBlur: () => setTip(null),
  });
  const layer = tip && <div className="viz-tip" style={{left: tip.x, top: tip.y, transform: `translate(${tip.flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`}} role="presentation">{tip.body}</div>;
  return {frame, bind, layer, active: tip};
}
const TipBody = ({color, label, value, extra}:{color:string;label:string;value:string;extra?:string}) => <><span><i style={{background: color}}/>{label}</span><b>{value}</b>{extra && <small>{extra}</small>}</>;
const keyActivate = (fn?:() => void) => (e:React.KeyboardEvent) => { if (fn && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fn(); } };

/* ---------- Pie / donut ---------- */
export interface PieSlice extends VizItem {attributes?:Record<string, string>;}
export function PieChart({items, label, value, donut = true, onSelect, colors, legend = true, emptyText = 'No records in this selection'}:{items:PieSlice[];label:string;value?:string;donut?:boolean;onSelect?:(id:string) => void;colors?:string[];legend?:boolean;emptyText?:string}) {
  const {frame, bind, layer} = useTip(), [hover, setHover] = useState<string | null>(null);
  const color = (i:VizItem, n:number) => colors?.[n] ?? vivid(i.color, n);
  const valid = items.filter(i => finite(i.value) && i.value > 0), total = valid.reduce((s, i) => s + (i.value as number), 0);
  const C = 110, RO = 92, RI = donut ? 58 : 0;
  let start = 0;
  const slices = total > 0 ? items.map((i, n) => {
    if (!finite(i.value) || i.value <= 0) return null;
    const share = i.value / total, a0 = start, a1 = start + share * 360; start = a1;
    const mid = (a0 + a1) / 2, pop = hover === i.id ? 6 : 0, [dx, dy] = pt(0, 0, pop, mid), fill = color(i, n);
    const [lx, ly] = pt(C, C, donut ? (RO + RI) / 2 : RO * .62, mid);
    const b = bind(<TipBody color={fill} label={i.label} value={i.display || amount(i.value, 0)} extra={`${amount(share * 100, 1)}% of ${amount(total, 0)}`}/>);
    return <g key={i.id} transform={`translate(${dx},${dy})`} className="viz-slice" tabIndex={0} role={onSelect ? 'button' : 'img'}
      aria-label={`${i.label}: ${i.display || amount(i.value, 0)} (${amount(share * 100, 1)}%)`}
      onClick={() => onSelect?.(i.id)} onKeyDown={keyActivate(onSelect && (() => onSelect(i.id)))}
      {...b} onMouseEnter={() => setHover(i.id)} onMouseLeave={() => { b.onMouseLeave(); setHover(null); }}
      onFocus={e => { b.onFocus(e); setHover(i.id); }} onBlur={() => { b.onBlur(); setHover(null); }} style={{cursor: onSelect ? 'pointer' : 'default'}}>
      <path d={sector(C, C, RO, RI, a0, a1)} fill={fill} stroke="var(--viz-surface)" strokeWidth={valid.length > 1 ? 2 : 0} strokeLinejoin="round"/>
      {share >= .08 && <text x={lx} y={ly + 4} textAnchor="middle" className="viz-slice-label" fill={inkOn(fill)}>{amount(share * 100, 0)}%</text>}
    </g>;
  }) : null;
  return <div className="viz-pie" ref={frame}>
    {!donut && value != null && <div className="viz-pie-caption"><b>{value}</b><span>{label}</span></div>}
    <svg viewBox="0 0 220 220" role="group" aria-label={label}>
      {!slices && <circle cx={C} cy={C} r={(RO + RI) / 2 || RO / 2} fill="none" stroke="var(--viz-track)" strokeWidth={donut ? RO - RI : RO}/>}
      {slices}
      {donut && <><text x={C} y={C + 2} textAnchor="middle" className="viz-center-value">{value ?? (total > 0 ? amount(total, 0) : '—')}</text><text x={C} y={C + 22} textAnchor="middle" className="viz-center-label">{clip(label, 22)}</text></>}
      {!slices && !donut && <text x={C} y={C + 4} textAnchor="middle" className="viz-center-label">{emptyText}</text>}
    </svg>
    {layer}
    {legend && <div className="viz-legend">{items.map((i, n) => {
      const share = total > 0 && finite(i.value) ? i.value / total * 100 : null;
      return <button key={i.id} disabled={!onSelect} onClick={() => onSelect?.(i.id)} onMouseEnter={() => setHover(i.id)} onMouseLeave={() => setHover(null)} data-active={hover === i.id}>
        <i style={{background: color(i, n)}}/><span>{i.label}{i.detail && <small>{i.detail}</small>}</span><b>{i.display || amount(i.value, 0)}</b><em>{share == null ? '' : `${amount(share, 1)}%`}</em>{onSelect && <ArrowUpRight size={12}/>}
      </button>;
    })}</div>}
  </div>;
}

/* ---------- Ring gauges (percent scores) ---------- */
export function GaugeGrid({items, max = 100, onSelect, allowEmptySelection = false, empty = 'No comparable data available.'}:{items:VizItem[];max?:number;onSelect?:(id:string) => void;allowEmptySelection?:boolean;empty?:string}) {
  if (!items.some(i => finite(i.value)) && !allowEmptySelection) return <div className="analytics-empty">{empty}</div>;
  return <div className="viz-gauges">{items.map((i, n) => {
    const v = finite(i.value) ? Math.max(0, Math.min(1, i.value / max)) : 0, fill = vivid(i.color, i.color ? n : 0);
    const enabled = !!onSelect && (allowEmptySelection || finite(i.value));
    return <button key={i.id} className="viz-gauge" disabled={!enabled} onClick={() => onSelect?.(i.id)} title={i.detail || `${i.label}: ${i.display || amount(i.value)}`} aria-label={`${i.label}: ${i.display || amount(i.value)}`}>
      <svg viewBox="0 0 120 104" aria-hidden="true">
        <path d={arc(60, 60, 46, -135, 135)} fill="none" stroke="var(--viz-track)" strokeWidth="10" strokeLinecap="round"/>
        {v > 0 && <path d={arc(60, 60, 46, -135, -135 + 270 * v)} fill="none" stroke={fill} strokeWidth="10" strokeLinecap="round" className="viz-grow"/>}
        <text x="60" y="66" textAnchor="middle" className="viz-gauge-value">{i.display || amount(i.value, 0)}</text>
        {!i.display && finite(i.value) && max === 100 && <text x="60" y="82" textAnchor="middle" className="viz-gauge-unit">of 100</text>}
      </svg>
      <strong>{i.label}</strong>{i.detail && <small>{i.detail}</small>}{onSelect && enabled && <ArrowUpRight size={12} className="viz-gauge-go"/>}
    </button>;
  })}</div>;
}

/* ---------- Radial bars (magnitudes, ≤ 7 items) ---------- */
export function RadialBars({items, max, onSelect, allowEmptySelection = false, empty = 'No comparable data available.'}:{items:VizItem[];max?:number;onSelect?:(id:string) => void;allowEmptySelection?:boolean;empty?:string}) {
  const {frame, bind, layer} = useTip();
  const valid = items.filter(i => finite(i.value)); if (!valid.length && !allowEmptySelection) return <div className="analytics-empty">{empty}</div>;
  const peak = max ?? Math.max(1, ...valid.map(i => i.value as number)), same = new Set(items.map(i => i.color || '')).size <= 1;
  const color = (i:VizItem, n:number) => same ? vivid(undefined, n) : vivid(i.color, n);
  const C = 120, W = Math.min(14, 70 / items.length), G = Math.max(3, W * .35), R0 = 104;
  return <div className="viz-radial" ref={frame}>
    <svg viewBox="0 0 240 240" role="group" aria-label="Comparison">
      {items.map((i, n) => {
        const r = R0 - n * (W + G), v = finite(i.value) ? Math.max(0, Math.min(1, i.value / peak)) : 0, fill = color(i, n);
        const go = onSelect && (allowEmptySelection || finite(i.value)) ? () => onSelect(i.id) : undefined;
        return <g key={i.id} tabIndex={0} role={go ? 'button' : 'img'} aria-label={`${i.label}: ${i.display || amount(i.value)}`} onClick={go} onKeyDown={keyActivate(go)} style={{cursor: go ? 'pointer' : 'default'}}
          {...bind(<TipBody color={fill} label={i.label} value={i.display || amount(i.value)} extra={i.detail}/>)}>
          <path d={arc(C, C, r, 0, 270)} fill="none" stroke="var(--viz-track)" strokeWidth={W} strokeLinecap="round"/>
          {v > 0 && <path d={arc(C, C, r, 0, Math.max(2, 270 * v))} fill="none" stroke={fill} strokeWidth={W} strokeLinecap="round" className="viz-grow"/>}
          <path d={arc(C, C, r, 0, 270)} fill="none" stroke="transparent" strokeWidth={W + G}/>
          <text x={C - 6} y={C - r + W * .32} textAnchor="end" className="viz-radial-label">{clip(i.display || amount(i.value, 0), 10)}</text>
        </g>;
      })}
    </svg>
    {layer}
    <div className="viz-legend">{items.map((i, n) => <button key={i.id} disabled={!onSelect || (!allowEmptySelection && !finite(i.value))} onClick={() => onSelect?.(i.id)}>
      <i style={{background: color(i, n)}}/><span>{i.label}{i.detail && <small>{i.detail}</small>}</span><b>{i.display || amount(i.value)}</b>{onSelect && <ArrowUpRight size={12}/>}
    </button>)}</div>
  </div>;
}

/* ---------- Treemap (magnitudes, many items) ---------- */
interface Tile {item:VizItem;n:number;x:number;y:number;w:number;h:number}
function layout(list:{item:VizItem;n:number;v:number}[], x:number, y:number, w:number, h:number, out:Tile[]) {
  if (!list.length) return;
  if (list.length === 1) { out.push({item: list[0].item, n: list[0].n, x, y, w, h}); return; }
  const total = list.reduce((s, i) => s + i.v, 0); let acc = 0, k = 0;
  while (k < list.length - 1 && acc + list[k].v <= total / 2) acc += list[k++].v;
  if (k === 0) acc = list[k++].v;
  const f = total ? acc / total : .5, a = list.slice(0, k), b = list.slice(k);
  if (w >= h * 1.6) { layout(a, x, y, w * f, h, out); layout(b, x + w * f, y, w * (1 - f), h, out); }
  else { layout(a, x, y, w, h * f, out); layout(b, x, y + h * f, w, h * (1 - f), out); }
}
export function Treemap({items, onSelect, empty = 'No comparable data available.'}:{items:VizItem[];onSelect?:(id:string) => void;empty?:string}) {
  const {frame, bind, layer} = useTip();
  const list = items.map((item, n) => ({item, n, v: finite(item.value) ? Math.max(0, item.value) : 0})).filter(i => i.v > 0).sort((a, b) => b.v - a.v);
  if (!list.length) return <div className="analytics-empty">{empty}</div>;
  const tiles:Tile[] = []; layout(list, 0, 0, 100, 100, tiles);
  const total = list.reduce((s, i) => s + i.v, 0), same = new Set(items.map(i => i.color || '')).size <= 1;
  const zero = items.filter(i => !finite(i.value) || i.value <= 0);
  return <div className="viz-treemap-wrap" ref={frame}>
    <div className="viz-treemap">{tiles.map(t => {
      const fill = same ? vivid(undefined, t.n) : vivid(t.item.color, t.n), share = (t.item.value as number) / total * 100;
      return <button key={t.item.id} disabled={!onSelect} onClick={() => onSelect?.(t.item.id)} aria-label={`${t.item.label}: ${t.item.display || amount(t.item.value)}`}
        style={{left: `${t.x}%`, top: `${t.y}%`, width: `${t.w}%`, height: `${t.h}%`, background: fill, color: inkOn(fill)}}
        {...bind(<TipBody color={fill} label={t.item.label} value={t.item.display || amount(t.item.value)} extra={`${amount(share, 1)}% of total${t.item.detail ? ` · ${t.item.detail}` : ''}`}/>)}>
        {t.w * t.h > 90 && <><strong>{t.item.label}</strong><b>{t.item.display || amount(t.item.value, 0)}</b></>}
      </button>;
    })}</div>
    {layer}
    {zero.length > 0 && <p className="viz-note">No value: {zero.map(i => i.label).join(', ')}</p>}
  </div>;
}

/* ---------- Area distribution (replaces column chart) ---------- */
export function AreaDistribution({items, onSelect}:{items:VizItem[];onSelect?:(id:string) => void}) {
  const {frame, bind, layer} = useTip(), gid = useId().replace(/:/g, ''), [active, setActive] = useState<number | null>(null);
  if (!items.length) return <div className="analytics-empty">No distribution available.</div>;
  const peak = Math.max(1, ...items.map(i => finite(i.value) ? i.value : 0)), W = 600, H = 220, L = 34, R = 16, T = 18, B = 40;
  const x = (n:number) => items.length === 1 ? (L + W - R) / 2 : L + n / (items.length - 1) * (W - L - R), y = (v:number) => T + (1 - v / peak) * (H - T - B);
  const pts = items.map((i, n) => [x(n), y(finite(i.value) ? i.value : 0)] as [number, number]), line = smooth(pts);
  const every = Math.ceil(items.length / 8), fill = '#2a78d6';
  return <div className="viz-area" ref={frame}>
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Distribution">
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={fill} stopOpacity=".35"/><stop offset="1" stopColor={fill} stopOpacity=".02"/></linearGradient></defs>
      {[0, .5, 1].map(f => <g key={f}><line x1={L} x2={W - R} y1={y(peak * f)} y2={y(peak * f)} className="viz-grid"/><text x={L - 6} y={y(peak * f) + 4} textAnchor="end" className="viz-axis">{amount(peak * f, 0)}</text></g>)}
      <path d={`${line}L${pts.at(-1)![0]},${y(0)}L${pts[0][0]},${y(0)}Z`} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={fill} strokeWidth="2.5" strokeLinecap="round"/>
      {items.map((i, n) => { const b = bind(<TipBody color={fill} label={i.label} value={amount(i.value)}/>); return <g key={i.id} tabIndex={0} role={onSelect ? 'button' : 'img'} aria-label={`${i.label}: ${amount(i.value)}`} onClick={() => onSelect?.(i.id)} onKeyDown={keyActivate(onSelect && (() => onSelect(i.id)))}
        style={{cursor: onSelect ? 'pointer' : 'default'}} {...b} onMouseEnter={() => setActive(n)} onMouseLeave={() => { b.onMouseLeave(); setActive(null); }}
        onFocus={e => { b.onFocus(e); setActive(n); }} onBlur={() => { b.onBlur(); setActive(null); }}>
        <rect x={pts[n][0] - (W - L - R) / items.length / 2} y={T} width={(W - L - R) / items.length} height={H - T - B} fill="transparent"/>
        {active === n && <line x1={pts[n][0]} x2={pts[n][0]} y1={T} y2={y(0)} className="viz-crosshair"/>}
        <circle cx={pts[n][0]} cy={pts[n][1]} r={active === n ? 6 : 4} fill={fill} stroke="var(--viz-surface)" strokeWidth="2"/>
        {n % every === 0 && <text x={pts[n][0]} y={H - 16} textAnchor="middle" className="viz-axis">{clip(i.label, 12)}</text>}
      </g>; })}
    </svg>
    {layer}
  </div>;
}

/* ---------- Area series (replaces multi-line chart) ---------- */
export function AreaSeries({points, series, onSelect}:{points:{id:string;label:string;values:(number | null | undefined)[]}[];series:{label:string;color:string}[];onSelect?:(id:string) => void}) {
  const gid = useId().replace(/:/g, ''), [active, setActive] = useState<number | null>(null);
  const all = points.flatMap(p => p.values.filter(finite)) as number[];
  if (!points.length || !all.length) return <div className="analytics-empty">No trend data for this selection.</div>;
  const peak = Math.max(1, ...all), W = 680, H = 236, L = 42, R = 20, T = 16, B = 40;
  const x = (i:number) => points.length === 1 ? (L + W - R) / 2 : L + i / (points.length - 1) * (W - L - R), y = (v:number) => T + (1 - Math.max(0, v) / peak) * (H - T - B);
  const colors = series.map((s, j) => vivid(s.color, j));
  return <div className="viz-area">
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${series.map(s => s.label).join(' and ')} trend`}>
      <defs>{colors.map((c, j) => <linearGradient key={j} id={`${gid}${j}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".28"/><stop offset="1" stopColor={c} stopOpacity="0"/></linearGradient>)}</defs>
      {[0, .5, 1].map(f => <g key={f}><line x1={L} x2={W - R} y1={y(peak * f)} y2={y(peak * f)} className="viz-grid"/><text x={L - 6} y={y(peak * f) + 4} textAnchor="end" className="viz-axis">{amount(peak * f, 0)}</text></g>)}
      {series.map((s, j) => {
        const runs:[number, number][][] = []; let run:[number, number][] = [];
        points.forEach((p, i) => { const v = p.values[j]; if (finite(v)) run.push([x(i), y(v)]); else if (run.length) { runs.push(run); run = []; } }); if (run.length) runs.push(run);
        return <g key={s.label}>{runs.map((r, k) => { const d = smooth(r); return <g key={k}>
          {r.length > 1 && <path d={`${d}L${r.at(-1)![0]},${y(0)}L${r[0][0]},${y(0)}Z`} fill={`url(#${gid}${j})`}/>}
          {r.length > 1 ? <path d={d} fill="none" stroke={colors[j]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/> : <circle cx={r[0][0]} cy={r[0][1]} r="4" fill={colors[j]}/>}
        </g>; })}</g>;
      })}
      {points.map((p, i) => <g key={p.id} tabIndex={0} role={onSelect ? 'button' : 'img'} aria-label={`${p.label}, ${series.map((s, j) => `${s.label} ${amount(p.values[j])}`).join(', ')}`}
        onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => onSelect?.(p.id)} onKeyDown={keyActivate(onSelect && (() => onSelect(p.id)))} style={{cursor: onSelect ? 'pointer' : 'default'}}>
        <rect x={x(i) - (W - L - R) / Math.max(1, points.length) / 2} y={T} width={(W - L - R) / Math.max(1, points.length)} height={H - T - B} fill="transparent"/>
        {active === i && <><line x1={x(i)} x2={x(i)} y1={T} y2={y(0)} className="viz-crosshair"/>{series.map((s, j) => finite(p.values[j]) ? <circle key={j} cx={x(i)} cy={y(p.values[j] as number)} r="5" fill={colors[j]} stroke="var(--viz-surface)" strokeWidth="2"/> : null)}</>}
      </g>)}
      <text x={L} y={H - 14} className="viz-axis">{points[0].label}</text>
      {points.length > 2 && <text x={x(Math.floor((points.length - 1) / 2))} y={H - 14} textAnchor="middle" className="viz-axis">{points[Math.floor((points.length - 1) / 2)].label}</text>}
      {points.length > 1 && <text x={W - R} y={H - 14} textAnchor="end" className="viz-axis">{points.at(-1)!.label}</text>}
    </svg>
    <div className="series-readout viz-readout" aria-live="polite">{active != null
      ? <><strong>{points[active].label}</strong>{series.map((s, j) => <span key={s.label}><i style={{background: colors[j]}}/>{s.label}<b>{amount(points[active].values[j])}</b></span>)}</>
      : series.map((s, j) => <span key={s.label}><i style={{background: colors[j]}}/>{s.label}</span>)}</div>
  </div>;
}

/* ---------- Status pie (replaces stacked status track) ---------- */
export function StatusPie({items, label, loading, available, total, onSelect}:{items:{id:string;label:string;value:number | null | undefined;tone:keyof typeof STATUS_VIVID;attributes?:Record<string, string>;detail?:string}[];label:string;loading:boolean;available:boolean;total:number | null;onSelect?:(id:string) => void}) {
  const ready = !loading && available;
  return <div className="viz-status" aria-label={label} aria-busy={loading}>
    {ready
      ? <PieChart items={items} label={label.length > 22 ? 'total records' : label} colors={items.map(i => STATUS_VIVID[i.tone])} legend={false}/>
      : <div className="viz-status-empty"><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="75" fill="none" stroke="var(--viz-track)" strokeWidth="34" className={loading ? 'viz-pulse' : ''}/></svg><span>{loading ? 'Updating…' : 'Data unavailable'}</span></div>}
    <div className="status-breakdown-legend viz-status-legend">{items.map(item => {
      const share = ready && total ? (item.value || 0) / total * 100 : null;
      return <button key={item.id} {...item.attributes} data-tone={item.tone} disabled={!onSelect || !ready || item.value == null} onClick={() => onSelect?.(item.id)} title={item.detail || `${item.label}: ${ready ? amount(item.value, 0) : 'Unavailable'}`} aria-label={`${item.label}: ${ready ? amount(item.value, 0) : 'Unavailable'}. ${onSelect ? 'Open source records.' : ''}`}>
        <i style={{background: STATUS_VIVID[item.tone]}}/><span>{item.label}<small>{item.detail}</small></span><strong>{loading ? '…' : available ? amount(item.value, 0) : '—'}</strong><small>{share == null ? '' : `${amount(share, 1)}%`}</small>
        {share != null && <u className="viz-mini-track" aria-hidden="true"><u style={{width: `${Math.min(100, share)}%`, background: STATUS_VIVID[item.tone]}}/></u>}
        {onSelect && <ArrowUpRight size={14}/>}
      </button>;
    })}</div>
  </div>;
}

/* ---------- Half gauge (replaces thin progress meters) ---------- */
export function HalfGauge({percent, met, label, size = 'md'}:{percent:number | null | undefined;met?:boolean | null;label?:string;size?:'sm' | 'md'}) {
  const v = finite(percent) ? Math.max(0, Math.min(1, percent / 100)) : 0, fill = met ? STATUS_VIVID.green : v >= .75 ? '#1baf7a' : v >= .4 ? '#2a78d6' : '#eb6834';
  return <div className={`viz-half viz-half-${size}`} role="progressbar" aria-label={label || 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={finite(percent) ? Math.round(Math.min(100, percent)) : undefined}>
    <svg viewBox="0 0 140 78" aria-hidden="true">
      <path d={arc(70, 70, 56, -90, 90)} fill="none" stroke="var(--viz-track)" strokeWidth="12" strokeLinecap="round"/>
      {v > 0 && <path d={arc(70, 70, 56, -90, -90 + 180 * v)} fill="none" stroke={fill} strokeWidth="12" strokeLinecap="round" className="viz-grow"/>}
      {[25, 50, 75].map(t => { const [a, b] = pt(70, 70, 44, -90 + t * 1.8), [c, d] = pt(70, 70, 40, -90 + t * 1.8); return <line key={t} x1={a} y1={b} x2={c} y2={d} className="viz-tick"/>; })}
      {size === 'md' && <text x="70" y="66" textAnchor="middle" className="viz-half-value">{finite(percent) ? `${amount(percent, 0)}%` : '—'}</text>}
    </svg>
  </div>;
}

const progressColor = (v:number, met?:boolean | null) => met ? STATUS_VIVID.green : v >= .75 ? '#1baf7a' : v >= .4 ? '#2a78d6' : '#eb6834';
const pct = (p:number | null | undefined) => finite(p) ? Math.max(0, Math.min(100, p)) : 0;
const progressAria = (label:string | undefined, percent:number | null | undefined) => ({role: 'progressbar', 'aria-label': label || 'Progress', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': finite(percent) ? Math.round(pct(percent)) : undefined});

/** Battery-style meter: 20 blocks, each worth 5%. */
export function SegmentMeter({percent, met, label}:{percent:number | null | undefined;met?:boolean | null;label?:string}) {
  const v = pct(percent), full = Math.floor(v / 5), part = (v % 5) / 5, fill = progressColor(v / 100, met);
  return <div className="viz-segments" {...progressAria(label, percent)}>{Array.from({length: 20}, (_, i) =>
    <span key={i} style={{background: i < full ? fill : i === full && part > 0 ? `linear-gradient(90deg, ${fill} ${part * 100}%, var(--viz-track) ${part * 100}%)` : undefined}}/>)}</div>;
}
/** Thick bar on a 0–100 ruler with quarter ticks. */
export function ScaleMeter({percent, met, label}:{percent:number | null | undefined;met?:boolean | null;label?:string}) {
  const v = pct(percent);
  return <div className="viz-scale" {...progressAria(label, percent)}>
    <div className="viz-scale-bar"><span className="viz-grow-x" style={{width: `${v}%`, background: `linear-gradient(90deg, ${progressColor(v / 100, met)}cc, ${progressColor(v / 100, met)})`}}/>{[25, 50, 75].map(t => <i key={t} style={{left: `${t}%`}}/>)}</div>
    <div className="viz-scale-axis"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
  </div>;
}
/** Compact full ring with the value in the middle. */
export function RingMeter({percent, met, label, caption}:{percent:number | null | undefined;met?:boolean | null;label?:string;caption?:string}) {
  const v = pct(percent) / 100, fill = progressColor(v, met);
  return <div className="viz-ring" {...progressAria(label, percent)}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--viz-track)" strokeWidth="11"/>
      {v > 0 && <path d={arc(50, 50, 40, 0, Math.max(1, 360 * v))} fill="none" stroke={fill} strokeWidth="11" strokeLinecap="round" className="viz-grow"/>}
      <text x="50" y="55" textAnchor="middle" className="viz-ring-value">{finite(percent) ? `${amount(percent, 0)}%` : '—'}</text>
    </svg>
    {caption && <small>{caption}</small>}
  </div>;
}

/** Thin linear meter in classic mode; a pictorial meter in visual mode. Keeps the classic markup byte-identical. */
export function ProgressMeter({percent, met, visual, className, label, size, variant = 'half'}:{percent:number | null | undefined;met?:boolean | null;visual:boolean;className:string;label?:string;size?:'sm' | 'md';variant?:'half' | 'ring' | 'segments' | 'scale'}) {
  if (visual) return variant === 'ring' ? <RingMeter percent={percent} met={met} label={label}/> : variant === 'segments' ? <SegmentMeter percent={percent} met={met} label={label}/> : variant === 'scale' ? <ScaleMeter percent={percent} met={met} label={label}/> : <HalfGauge percent={percent} met={met} label={label} size={size}/>;
  return <div className={className}><i data-met={met ?? undefined} style={{width: `${Math.min(100, Math.max(0, percent ?? 0))}%`}}/></div>;
}

/* ---------- KPI mini visuals (sit inside clickable cards, so they are hover-only, not focusable) ---------- */
export function Sparkbars({points, label}:{points:{id:string;label:string;value:number}[];label:string}) {
  const {frame, bind, layer} = useTip();
  if (points.length < 2) return null;
  const peak = Math.max(1, ...points.map(p => p.value)), avg = points.reduce((s, p) => s + p.value, 0) / points.length, W = 240, H = 46, gap = points.length > 40 ? 1 : 2, bw = W / points.length - gap;
  return <div className="viz-spark" ref={frame} aria-label={`${label}: ${points.map(p => `${p.label} ${p.value}`).join(', ')}`} role="img">
    <svg viewBox={`0 0 ${W} ${H + 2}`} preserveAspectRatio="none" aria-hidden="true">
      {points.map((p, i) => { const h = Math.max(p.value ? 2 : 1, p.value / peak * H); return <rect key={p.id} x={i * (bw + gap)} y={H - h} width={Math.max(1, bw)} height={h} rx={Math.min(2, bw / 2)}
        fill={i === points.length - 1 ? '#2a78d6' : p.value >= avg ? '#86b6ef' : '#cde2fb'} {...bind(<TipBody color="#2a78d6" label={p.label} value={amount(p.value, 0)} extra={`Average ${amount(avg, 0)} per ${points[0].label.startsWith('Week') ? 'week' : 'day'}`}/>)}/>; })}
      <line x1="0" x2={W} y1={H - avg / peak * H} y2={H - avg / peak * H} className="viz-spark-avg"/>
    </svg>
    <div className="viz-spark-axis"><span>{points[0].label}</span><span>avg {amount(avg, 0)}</span><span>{points.at(-1)!.label}</span></div>
    {layer}
  </div>;
}
/** 100-cell waffle: each cell is 1%. */
export function Waffle({percent, label, color = '#1baf7a', legend}:{percent:number | null | undefined;label:string;color?:string;legend?:[string, string]}) {
  const filled = Math.round(pct(percent));
  const grid = <div className="viz-waffle" role="img" aria-label={`${label}: ${finite(percent) ? amount(percent, 1) : '—'}%`}>{Array.from({length: 100}, (_, i) => {
    const col = Math.floor(i / 5), row = i % 5; // fill column by column, left to right
    return <span key={i} style={{gridColumn: col + 1, gridRow: row + 1, background: i < filled ? color : undefined, animationDelay: `${i * 6}ms`}}/>;
  })}</div>;
  if (!legend) return grid;
  return <div className="viz-waffle-wrap">{grid}<div className="viz-waffle-key"><span><i style={{background: color}}/>{legend[0]}</span><span><i/>{legend[1]}</span></div><small className="viz-waffle-note">1 square = 1% of registered assets</small></div>;
}
const PERSON = 'M10 2.2a3.3 3.3 0 1 1 0 6.6a3.3 3.3 0 0 1 0-6.6ZM4 19c0-3.6 2.7-6.6 6-6.6s6 3 6 6.6v5.8a1.2 1.2 0 0 1-1.2 1.2H5.2A1.2 1.2 0 0 1 4 24.8Z';
/** Ten people; the filled share is present / (present + absent). */
export function Pictogram({present, absent}:{present:number | null | undefined;absent:number | null | undefined}) {
  const id = useId().replace(/:/g, '');
  if (!finite(present) || !finite(absent) || present + absent <= 0) return null;
  const share = present / (present + absent) * 10;
  return <div className="viz-picto" role="img" aria-label={`About ${amount(share, 1)} in every 10 employees present`}>
    {Array.from({length: 10}, (_, i) => { const f = Math.max(0, Math.min(1, share - i)); return <svg key={i} viewBox="0 0 20 28" aria-hidden="true">
      <defs><clipPath id={`${id}${i}`}><rect x="0" y="0" width={20 * f} height="28"/></clipPath></defs>
      <path d={PERSON} fill="var(--viz-track)"/>{f > 0 && <path d={PERSON} fill="#2a78d6" clipPath={`url(#${id}${i})`}/>}
    </svg>; })}
    <small>{amount(share, 1)} of 10 present</small>
  </div>;
}

/* ---------- Target bullets: how much of the full requirement is targeted, and how much of the target arrived ---------- */
export function TargetBullets({required, target, received, onReceived}:{required:number | null;target:number | null;received:number | null;onReceived?:() => void}) {
  const fmt = (n:number | null) => n == null ? '—' : amount(n, 0);
  const rows = [
    {id: 'target', label: 'Inspection target vs. 100% requirement', value: target, of: required, color: '#2a78d6', rest: 'not targeted'},
    {id: 'received', label: 'Reports received vs. target', value: received, of: target, color: '#1baf7a', rest: 'still needed'},
  ].filter(r => r.value != null && r.of != null && r.of > 0);
  if (!rows.length) return null;
  return <div className="viz-bullets">{rows.map(r => {
    const share = Math.min(100, (r.value as number) / (r.of as number) * 100), rest = Math.max(0, (r.of as number) - (r.value as number));
    return <div key={r.id} className="viz-bullet">
      <div className="viz-bullet-head"><span>{r.label}</span><b>{amount((r.value as number) / (r.of as number) * 100, 1)}%</b></div>
      <div className="viz-bullet-track" title={`${fmt(r.value)} of ${fmt(r.of)}`}>
        <span className="viz-grow-x" style={{width: `${share}%`, background: r.color}}>{share >= 14 && <em>{fmt(r.value)}</em>}</span>
        {rest > 0 && <i className="viz-bullet-rest">{share < 14 && <em className="viz-bullet-out">{fmt(r.value)}</em>}<em>{fmt(rest)} {r.rest}</em></i>}
      </div>
      <div className="viz-bullet-foot"><span>0</span>{r.id === 'received' && onReceived ? <button type="button" onClick={onReceived}>Open received reports <ArrowUpRight size={12}/></button> : <span/>}<span>{fmt(r.of)}</span></div>
    </div>;
  })}</div>;
}

/* ---------- 100% stacked status bar ---------- */
export function StackedStatusBar({items, onSelect}:{items:{id:string;label:string;value:number | null | undefined;color:string}[];onSelect?:(id:string) => void}) {
  const {frame, bind, layer} = useTip();
  const valid = items.filter(i => finite(i.value) && i.value > 0), total = valid.reduce((s, i) => s + (i.value as number), 0);
  if (!total) return null;
  return <div className="viz-stack" ref={frame}>
    <div className="viz-stack-bar">{valid.map(i => { const share = (i.value as number) / total * 100; return <button key={i.id} type="button" disabled={!onSelect} onClick={() => onSelect?.(i.id)} style={{flexGrow: share, background: i.color, color: inkOn(i.color)}} aria-label={`${i.label}: ${amount(i.value, 0)} (${amount(share, 1)}%)`}
      {...bind(<TipBody color={i.color} label={i.label} value={amount(i.value, 0)} extra={`${amount(share, 1)}% of ${amount(total, 0)} reports`}/>)}>{share >= 12 && `${amount(share, 0)}%`}</button>; })}</div>
    <div className="viz-stack-legend">{valid.map(i => <span key={i.id}><i style={{background: i.color}}/>{i.label}</span>)}</div>
    {layer}
  </div>;
}

/* ---------- Zone comparison: target column with received column inside ---------- */
export function ZoneColumns({zones, onSelect, targetLabel = 'Inspection target', valueLabel = 'Reports received'}:{zones:{id:string;name:string;target:number | null;received:number | null;percent:number | null}[];onSelect?:(id:string) => void;targetLabel?:string;valueLabel?:string}) {
  const {frame, bind, layer} = useTip();
  const rows = zones.filter(z => finite(z.target) || finite(z.received));
  if (!rows.length) return null;
  const peak = Math.max(1, ...rows.flatMap(z => [z.target ?? 0, z.received ?? 0])), W = 640, H = 210, T = 26, B = 34, L = 40, step = (W - L - 8) / rows.length, cw = Math.min(56, step * .62);
  const y = (v:number) => T + (1 - v / peak) * (H - T - B);
  return <div className="viz-zones" ref={frame}>
    <div className="viz-zones-legend"><span><i style={{background: 'var(--viz-target)'}}/>{targetLabel}</span><span><i style={{background: '#2a78d6'}}/>{valueLabel}</span><span><i style={{background: STATUS_VIVID.green}}/>Target met</span></div>
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Target and reports received by zone">
      {[0, .5, 1].map(f => <g key={f}><line x1={L} x2={W - 8} y1={y(peak * f)} y2={y(peak * f)} className="viz-grid"/><text x={L - 6} y={y(peak * f) + 4} textAnchor="end" className="viz-axis">{amount(peak * f, 0)}</text></g>)}
      {rows.map((z, n) => {
        const cx = L + step * n + step / 2, t = z.target ?? 0, r = z.received ?? 0, met = t > 0 && r >= t, fill = met ? STATUS_VIVID.green : '#2a78d6';
        const go = onSelect ? () => onSelect(z.id) : undefined;
        return <g key={z.id} tabIndex={0} role={go ? 'button' : 'img'} aria-label={`${z.name}: ${amount(r, 0)} received of ${amount(t, 0)} target`} onClick={go} onKeyDown={keyActivate(go)} style={{cursor: go ? 'pointer' : 'default'}}
          {...bind(<TipBody color={fill} label={z.name} value={`${amount(r, 0)} / ${amount(t, 0)}`} extra={`${z.percent == null ? '—' : amount(z.percent, 1)}% of ${targetLabel.toLowerCase()}`}/>)}>
          <rect x={cx - step / 2} y={T} width={step} height={H - T - B} fill="transparent"/>
          {t > 0 && <rect x={cx - cw / 2} y={y(t)} width={cw} height={y(0) - y(t)} rx="5" fill="var(--viz-target)"/>}
          {r > 0 && <rect x={cx - cw * .3} y={y(r)} width={cw * .6} height={y(0) - y(r)} rx="4" fill={fill} className="viz-rise"/>}
          <text x={cx} y={Math.min(y(t), y(r)) - 7} textAnchor="middle" className="viz-zone-pct">{z.percent == null ? '—' : `${amount(z.percent, 0)}%`}</text>
          <text x={cx} y={H - 12} textAnchor="middle" className="viz-axis">{clip(z.name, 12)}</text>
        </g>;
      })}
    </svg>
    {layer}
  </div>;
}

/** Sequential tint for heat-table cells (light → dark blue as the percentage rises). */
export const heatStyle = (percent:number | null | undefined):React.CSSProperties | undefined => finite(percent) ? {'--heat': `${Math.round(8 + pct(percent) * .42)}%`} as React.CSSProperties : undefined;
