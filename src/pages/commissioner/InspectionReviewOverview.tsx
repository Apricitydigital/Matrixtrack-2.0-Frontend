import React, { useMemo } from 'react';
import { ArrowUpRight, ClipboardCheck, Sparkles } from 'lucide-react';
import { STATUS_VIVID } from '../../services/vizMode';
import { CardInfo } from '../../components/common/CardInfo';
import { usePanel } from '../../components/dashboard/DetailPanel';
import { ReportListPanel } from '../../components/dashboard/ReportListPanel';
import { StatusBreakdown } from '../../components/analytics/StatusBreakdown';
import { useSiReviewRule } from '../../components/analytics/SiReviewOverview';
import { amount } from '../../services/insights';
import type { CityPulse } from '../../services/commissioner';
import { inspectionActions, type InspectionCoverage, type InspectionVisit } from '../../services/inspectionCoverage';
import { inspectionDisplayStatus } from '../../services/inspectionStatus';
import { siReviewPercent, siReviewSummary } from '../../services/siReviewSummary';
import { intelligenceCounts, intelligenceFilter } from '../../services/intelligenceMetrics';

const AI_ROWS = [
  { id: 'CLEAN', label: 'AI suggests clean', color: '#0ca30c' },
  { id: 'NOT_CLEAN', label: 'AI suggests not clean', color: '#d03b3b' },
  { id: 'AWAITING_AI', label: 'Awaiting AI analysis', color: '#eda100' },
] as const;

/**
 * One container for the review pipeline: where every inspection stands, how much SI review is done against target,
 * what the AI suggests for reports still awaiting SI, and the action follow-up. Each figure appears once.
 */
export function InspectionReviewOverview({ cityId, pulse, data, loading, zoneIds = [], wardIds = [], revision = 0, wards = [], scopeText = '', onInspect, onViewReport }: {
  cityId: string; pulse: CityPulse; data: InspectionCoverage; loading: boolean; zoneIds?: string[]; wardIds?: string[]; revision?: number;
  wards?: { id: string; name: string }[]; scopeText?: string; onInspect: (module?: string, status?: string) => void; onViewReport?: (visit: InspectionVisit) => void;
}) {
  const panel = usePanel();
  /** Opens the reports behind a figure in the side panel; falls back to the full list page only when no panel exists. */
  const open = (filter: string, title: string, note?: string) => panel ? panel.open({ title, subtitle: scopeText || 'Selected dates and area', width: '3xl', body: <ReportListPanel data={data} filter={filter} wards={wards} note={note} onViewReport={onViewReport} onOpenAll={() => onInspect(undefined, filter)} /> }) : onInspect(undefined, filter);
  // SI review outcome: every inspection is exactly one of Cleaned, Not cleaned or Pending, so the three always add up to the total.
  // Reports later sent to ULB / IEC were first marked Not cleaned by the SI, so they stay in Not cleaned here and are tracked in the action row.
  const si = useMemo(() => {
    const out = { clean: 0, notClean: 0, pending: 0 };
    for (const v of new Map(data.visits.map(x => [x.id, x])).values()) {
      const s = inspectionDisplayStatus(v.status);
      if (s === 'approved') out.clean++; else if (s === 'pending_review') out.pending++; else out.notClean++;
    }
    return out;
  }, [data.visits]);
  const siTotal = si.clean + si.notClean + si.pending;
  const actions = useMemo(() => inspectionActions(data), [data]);
  const required = actions.totalRequired, taken = actions.taken, pendingActions = required == null || taken == null ? null : Math.max(0, required - taken);
  const pctOf = (v: number | null) => required && v != null ? v / required * 100 : null;
  const actionRows = [
    { id: 'all_actions_required', label: 'ULB Action required', value: required, share: required == null ? null : 100, tone: 'red' as const, attr: 'all_actions_required', note: 'Every report sent to ULB for action.' },
    { id: 'actions_pending', label: 'IEC action pending', value: pendingActions, share: pctOf(pendingActions), tone: 'yellow' as const, attr: 'actions_pending', note: 'Sent to ULB for action; IEC has not recorded a response yet.' },
    { id: 'all_actions_taken', label: 'IEC action taken', value: taken, share: pctOf(taken), tone: 'green' as const, attr: 'action_taken', note: 'IEC has recorded its action.' },
  ];
  const rule = useSiReviewRule(cityId, loading, zoneIds, wardIds, revision);
  const percent = siReviewPercent(rule), summary = siReviewSummary(data, percent);
  const ai = useMemo(() => intelligenceCounts(data.visits.map(v => ({ ...v.raw, status: v.raw?.workspaceStatus || v.status }))), [data.visits]);
  const aiTotal = AI_ROWS.reduce((sum, r) => sum + ai[r.id], 0);
  const unavailable = data.failedModules.length > 0;
  const n = (v: number | null | undefined) => loading ? '…' : v == null ? '—' : v.toLocaleString('en-IN');
  const progress = summary.target ? Math.min(100, (summary.reviewed ?? 0) / summary.target * 100) : null;
  const totalLabel = loading ? '…' : `${amount(siTotal, 0)} total inspection records`;

  return <section className="home-section ir" aria-label="Inspection review overview">
    <div className="home-section-heading"><div><span><ClipboardCheck size={14} /> INSPECTION STATUS</span><h2>Every inspection accounted for</h2><p>Where each inspection stands, how SI review is progressing, and what AI suggests for reports still pending.</p></div>
      <span className="outcome-total">{totalLabel}</span>
      <CardInfo title="How to read this"><p><b>Status bar:</b> every inspection record in the selected dates, counted once by its current status.</p><p><b>SI review:</b> compares reports reviewed with the SI target. The target uses the SI percentage saved by ULB for the selected area, rounded up once per IST day. It is not multiplied by the number of SIs.</p><p><b>AI suggestions:</b> visual advice on reports still awaiting an SI decision. It never replaces the SI decision and is separate from the official Cleaned / Not cleaned counts.</p></CardInfo></div>

    <StatusBreakdown label="SI review outcome of every inspection" loading={loading}
      items={[
        { id: 'approved', label: 'Cleaned', value: unavailable ? null : si.clean, tone: 'green', attributes: { 'data-outcome': 'approved' } },
        { id: 'si_not_cleaned', label: 'Not cleaned', value: unavailable ? null : si.notClean, tone: 'red', attributes: { 'data-outcome': 'rejected' } },
        { id: 'pending_review', label: 'Pending review', value: unavailable ? null : si.pending, tone: 'yellow', attributes: { 'data-outcome': 'pending_review' } },
      ]}
      onSelect={id => open(id, id === 'approved' ? 'Cleaned' : id === 'si_not_cleaned' ? 'Not cleaned' : 'Pending review', id === 'si_not_cleaned' ? 'Marked not cleaned by the SI. Reports sent on for ULB action or IEC response stay here and are tracked in the action row.' : undefined)}
      extra={<div className="status-breakdown-legend viz-status-legend ir-lines" aria-label="ULB action required and IEC response">
                {actionRows.map(r => { const share = r.share; return <button key={r.id} type="button" data-tone={r.tone} data-action-summary={r.attr} disabled={loading || r.value == null} onClick={() => open(r.id, r.label, r.note)} aria-label={`${r.label}: ${n(r.value)}. Open reports.`}>
                  <i style={{ background: STATUS_VIVID[r.tone] }} /><span>{r.label}</span><strong>{n(r.value)}</strong><small>{loading || share == null ? '' : `${amount(share, 1)}%`}</small>
                  {!loading && share != null && <u className="viz-mini-track" aria-hidden="true"><u style={{ width: `${Math.min(100, share)}%`, background: STATUS_VIVID[r.tone] }} /></u>}
                  <ArrowUpRight size={14} />
                </button>; })}
              </div>} />

    <div className="ir-grid">
      <div className="ir-card" data-kind="si">
        <h3>SI review progress</h3>
        <p className="ir-sub">{percent == null ? 'SI percentage setting unavailable or mixed; no target is assumed.' : `${rule?.targets ? 'Configured' : 'Default'} ${percent}% daily review target`}</p>
        <div className="ir-meter" role="img" aria-label={progress == null ? 'SI target unavailable' : `${Math.round(progress)}% of SI target reviewed`}><i style={{ width: `${progress ?? 0}%` }} /></div>
        <ul className="ir-figs">
          <li><span>Received for SI review</span><b>{n(summary.received)}</b></li>
          <li><span>SI target{percent != null ? ` (${percent}%)` : ''}</span><b>{n(summary.target)}</b></li>
          <li><span>SI reviewed (decision recorded)</span><b>{n(summary.reviewed)}</b></li>
        </ul>
        {!loading && progress != null && <p className="ir-note">{Math.round(progress)}% of the SI target has been reviewed.</p>}
        {summary.other != null && summary.other > 0 && <p className="ir-note">{n(summary.other)} submitted reports are in other workflow states.</p>}
      </div>

      <div className="ir-card" data-kind="ai">
        <h3><Sparkles size={14} /> AI suggestions on pending reports</h3>
        <p className="ir-sub">Reports still awaiting an SI decision. Suggestions are advice only.</p>
        <div className="ir-stack" role="img" aria-label="AI suggestions split">{!loading && !unavailable && aiTotal > 0 ? AI_ROWS.map(r => ai[r.id] > 0 && <i key={r.id} style={{ width: `${ai[r.id] / aiTotal * 100}%`, background: r.color }} title={`${r.label}: ${ai[r.id]}`} />) : <i className="ir-empty" />}</div>
        <ul className="ir-figs">{AI_ROWS.map(r => <li key={r.id}><button type="button" disabled={loading || unavailable} onClick={() => open(intelligenceFilter(r.id), r.label, 'Reports awaiting an SI decision. The AI suggestion is advice only and never replaces the SI decision.')}><span className="ir-dot"><i style={{ background: r.color }} />{r.label}</span><b>{loading ? '…' : unavailable ? '—' : ai[r.id].toLocaleString('en-IN')}</b></button></li>)}</ul>
        {!loading && !unavailable && aiTotal > 0 && <p className="ir-note">{Math.round((ai.CLEAN + ai.NOT_CLEAN) / aiTotal * 100)}% of pending reports have an AI result.</p>}
      </div>

    </div>
  </section>;
}
