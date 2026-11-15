import React, { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Lightbulb } from 'lucide-react';
import type { InspectionCoverage } from '../../services/inspectionCoverage';
import { officerAdvice, type AdviceRole, type OfficerAdvice } from '../../services/intelligenceAdvice';
import { ROLE_LABELS } from '../../services/presentation';
import { CardInfo } from '../common/CardInfo';
import { PanelActions, PanelSection, PanelStats, usePanel } from './DetailPanel';

const SEVERITY = { critical: 'Needs urgent attention', warning: 'Needs attention', good: 'On track' } as const;

export function AdviceDetail({ advice, onNavigate }: { advice: OfficerAdvice; onNavigate?: () => void }) {
  return <>
    <p className="ai-severity" data-severity={advice.severity}>{SEVERITY[advice.severity]}</p>
    <PanelStats items={advice.metrics.map(m => ({ label: m.label, value: m.value }))} />
    <PanelSection title="Suggestions" note="Generated from this officer's recorded targets, SI decisions, AI analysis and location assignments for the selected area and dates.">
      {advice.suggestions.length ? <ol className="ai-list">{advice.suggestions.map(s => <li key={s.title}><strong>{s.title}</strong><p>{s.detail}</p>{s.evidence && s.evidence.length > 0 && <ul>{s.evidence.map(e => <li key={e}>{e}</li>)}</ul>}</li>)}</ol>
        : <p className="dp-empty">No improvement needed on the recorded evidence.</p>}
    </PanelSection>
    {advice.strengths.length > 0 && <PanelSection title="Doing well"><ul className="ai-strengths">{advice.strengths.map(s => <li key={s}><CheckCircle2 size={14} />{s}</li>)}</ul></PanelSection>}
    {onNavigate && <PanelActions actions={[{ label: 'Open user performance', primary: true, onClick: onNavigate }]} />}
  </>;
}

interface Props {
  data: InspectionCoverage; loading: boolean; performance?: Record<string, Record<string, any> | undefined>;
  users: any[]; wards: { id: string; name: string; zoneId: string }[]; zoneIds: string[]; wardIds: string[]; onNavigate?: () => void; advice?: OfficerAdvice[];
}
export function useOfficerAdvice({ data, performance, users, wards, zoneIds, wardIds, advice }: Omit<Props, 'loading' | 'onNavigate'>, roles?: AdviceRole[]) {
  return useMemo(() => advice ?? officerAdvice({ visits: data.visits, assets: data.assets, users, wards, zoneIds, wardIds, from: data.from, to: data.to }, roles, performance || {}),
    [advice, data, performance, users, wards, zoneIds.join(), wardIds.join(), roles?.join()]);
}

/** Officers whose recorded evidence shows weak performance, with concrete ways to improve. */
export function IntelligenceSuggestions(props: Props) {
  const { loading, onNavigate } = props;
  const panel = usePanel();
  const [role, setRole] = useState<AdviceRole | 'ALL'>('ALL');
  const all = useOfficerAdvice(props);
  const needs = all.filter(a => a.severity !== 'good' && a.suggestions.length > 0);
  const shown = needs.filter(a => role === 'ALL' || a.role === role);
  const open = (a: OfficerAdvice) => panel?.open({ title: a.name, subtitle: `${ROLE_LABELS[a.role] || a.role} · intelligence suggestions`, body: <AdviceDetail advice={a} onNavigate={onNavigate} /> });
  const counts = { ALL: needs.length, SUPERVISOR: needs.filter(a => a.role === 'SUPERVISOR').length, QC: needs.filter(a => a.role === 'QC').length, ACTION_OFFICER: needs.filter(a => a.role === 'ACTION_OFFICER').length };
  const waiting = loading || !props.performance;
  return <section className="home-section ai-suggest" aria-label="Intelligence suggestions">
    <div className="home-section-heading"><div><span><Lightbulb size={14} /> INTELLIGENCE SUGGESTIONS</span><h2>Who needs support, and how to improve</h2><p>Officers with weak recorded performance, with specific steps drawn from their own figures.</p></div>
      <CardInfo title="How suggestions are made"><p>Suggestions are rules applied to recorded evidence only: inspection target credit, SI decisions, saved AI analysis, missed days and assigned locations that were not inspected.</p><p>An officer is listed when their score is below 60%. A Daroga's score is the average of target achievement and the clean share of their inspections.</p><p>Suggestions are guidance for supervisors, not official decisions.</p></CardInfo></div>
    <div className="ai-tabs" role="tablist">{(['ALL', 'SUPERVISOR', 'QC', 'ACTION_OFFICER'] as const).map(r => <button key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setRole(r)}>{r === 'ALL' ? 'All officers' : ROLE_LABELS[r] || r}<b>{counts[r]}</b></button>)}</div>
    {waiting && !all.length ? <p className="di-empty">Preparing suggestions…</p>
      : shown.length ? <div className="ai-grid">{shown.slice(0, 6).map(a => <button key={`${a.role}:${a.id}`} type="button" className="ai-card" data-severity={a.severity} onClick={() => open(a)}>
        <header><span className="ai-avatar">{a.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{a.name}</strong><small>{ROLE_LABELS[a.role] || a.role} · {SEVERITY[a.severity]}</small></div><b>{a.score == null ? 'N/A' : `${Math.round(a.score)}%`}</b></header>
        <ul>{a.suggestions.slice(0, 2).map(s => <li key={s.title}><strong>{s.title}</strong><span>{s.detail}</span></li>)}</ul>
        <footer>{a.suggestions.length > 2 ? `+${a.suggestions.length - 2} more suggestions` : 'View details'}<ArrowUpRight size={13} /></footer>
      </button>)}</div>
        : <div className="ai-ok"><CheckCircle2 size={18} />{all.length ? 'No officer in this selection needs improvement on the recorded evidence.' : 'No officer performance is recorded for this selection.'}</div>}
    {shown.length > 6 && <button type="button" className="ai-all" onClick={() => panel?.open({ title: 'Intelligence suggestions', subtitle: `${shown.length} officers need support`, width: '3xl', body: <div className="ai-panel-list">{shown.map(a => <button key={`${a.role}:${a.id}`} type="button" data-severity={a.severity} onClick={() => open(a)}><span><strong>{a.name}</strong><small>{ROLE_LABELS[a.role] || a.role} · {a.suggestions[0]?.title}</small></span><b>{a.score == null ? 'N/A' : `${Math.round(a.score)}%`}</b><ArrowUpRight size={14} /></button>)}</div> })}>View all {shown.length} officers<ArrowUpRight size={14} /></button>}
  </section>;
}
