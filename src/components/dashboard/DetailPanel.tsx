import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Drawer } from '../common/Drawer';

export interface PanelContent { title: string; subtitle?: string; body: React.ReactNode; width?: 'xl' | '2xl' | '3xl' | '4xl' }
interface PanelApi { open: (panel: PanelContent) => void; close: () => void }
const PanelContext = createContext<PanelApi | null>(null);

/** Right-side detail panel shared by every card on a dashboard. Null outside a PanelHost (cards then keep their old behaviour). */
export const usePanel = () => useContext(PanelContext);

/** Panel state for a dashboard that also opens panels itself. Call after the dashboard's own useState calls. */
export function usePanelState() {
  const [panel, setPanel] = useState<PanelContent | null>(null);
  const close = useCallback(() => setPanel(null), []);
  const api = useMemo<PanelApi>(() => ({ open: setPanel, close }), [close]);
  return { api, panel };
}
export function PanelHost({ children }: { children: React.ReactNode }) {
  const { api, panel } = usePanelState();
  return <PanelScope api={api} panel={panel}>{children}</PanelScope>;
}
export function PanelScope({ api, panel, children }: { api: PanelApi; panel: PanelContent | null; children: React.ReactNode }) {
  const close = api.close;
  return <PanelContext.Provider value={api}>{children}
    <Drawer isOpen={Boolean(panel)} onClose={close} title={panel?.title || ''} subtitle={panel?.subtitle} width={panel?.width || '2xl'}>
      <div className="dp-body">{panel?.body}</div>
    </Drawer>
  </PanelContext.Provider>;
}

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'neutral';
export function PanelStats({ items }: { items: { label: string; value: React.ReactNode; note?: string; tone?: Tone }[] }) {
  return <div className="dp-stats">{items.map(item => <div key={item.label} data-tone={item.tone || 'neutral'}><span>{item.label}</span><strong>{item.value}</strong>{item.note && <small>{item.note}</small>}</div>)}</div>;
}
export function PanelSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return <section className="dp-section"><header><h3>{title}</h3>{note && <p>{note}</p>}</header>{children}</section>;
}
export function PanelActions({ actions }: { actions: { label: string; onClick: () => void; primary?: boolean }[] }) {
  const panel = usePanel();
  return <div className="dp-actions">{actions.map(a => <button key={a.label} type="button" className={a.primary ? 'dp-primary' : ''} onClick={() => { panel?.close(); a.onClick(); }}>{a.label}<ArrowUpRight size={14} /></button>)}</div>;
}
/** Horizontal split bar (clean / not clean / unassessed, inspected / not inspected, …). */
export function SplitBar({ parts, label }: { parts: { label: string; value: number; color: string }[]; label: string }) {
  const total = parts.reduce((n, p) => n + Math.max(0, p.value), 0);
  return <div className="dp-split" role="img" aria-label={`${label}: ${parts.map(p => `${p.label} ${p.value}`).join(', ')}`}>
    <div className="dp-split-bar">{total > 0 ? parts.filter(p => p.value > 0).map(p => <i key={p.label} style={{ width: `${p.value / total * 100}%`, background: p.color }} title={`${p.label}: ${p.value.toLocaleString('en-IN')}`} />) : <i style={{ width: '100%', background: 'var(--viz-track)' }} />}</div>
    <div className="dp-split-key">{parts.map(p => <span key={p.label}><b style={{ background: p.color }} />{p.label} <em>{p.value.toLocaleString('en-IN')}</em></span>)}</div>
  </div>;
}
export function PanelTable({ head, rows, empty = 'Nothing to show for this selection.' }: { head: string[]; rows: { key: string; cells: React.ReactNode[]; onClick?: () => void }[]; empty?: string }) {
  if (!rows.length) return <p className="dp-empty">{empty}</p>;
  return <div className="dp-table"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.key} data-click={Boolean(r.onClick)} onClick={r.onClick} tabIndex={r.onClick ? 0 : undefined} onKeyDown={r.onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.onClick!(); } } : undefined}>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>;
}
export const CLEAN_COLORS = { clean: '#0ca30c', notClean: '#d03b3b', unassessed: '#a9b6c0', inspected: '#2a78d6', pending: '#eda100' };
export const fmtNum = (n: number | null | undefined, d = 0) => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: d });
export const fmtPct = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? '—' : `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`;
