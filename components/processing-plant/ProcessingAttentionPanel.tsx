'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, RadioTower } from 'lucide-react';
import type { ProcessingPlantDashboardData } from '../../types/processingPlant';
import { formatPercent } from '../../utils/processingPlantAnalytics';

export default function ProcessingAttentionPanel({ data }: { data: ProcessingPlantDashboardData }) {
  const alerts: { title: string; detail: string; tone: 'warn' | 'bad' }[] = [];

  data.plantPerformance.forEach((row) => {
    if (row.efficiency > 0 && row.efficiency < 70) alerts.push({ title: `${row.plantName}: low processing efficiency`, detail: `${formatPercent(row.efficiency)} in selected period`, tone: 'bad' });
    const rejectRate = row.received > 0 ? (row.reject / row.received) * 100 : 0;
    if (rejectRate >= 25) alerts.push({ title: `${row.plantName}: high reject share`, detail: `${formatPercent(rejectRate)} of received quantity`, tone: 'warn' });
    if (row.reportingStatus && ['MISSING', 'NOT_REPORTED', 'INACTIVE'].includes(row.reportingStatus.toUpperCase())) alerts.push({ title: `${row.plantName}: reporting attention`, detail: row.reportingStatus, tone: 'warn' });
  });

  if ((data.failedEntries || 0) > 0) alerts.unshift({ title: 'Failed form submissions detected', detail: `${data.failedEntries} submission(s) need review`, tone: 'bad' });

  const visible = alerts.slice(0, 6);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-500">Exception Intelligence</div>
          <h2 className="mt-1 text-lg font-black text-slate-900">Needs Attention</h2>
          <p className="text-xs text-slate-500">Rule-based operational exceptions.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><RadioTower size={18} /></div>
      </div>

      <div className="mt-4 space-y-2.5">
        {visible.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 size={18} />
            <div><div className="text-sm font-black">No critical exception detected</div><div className="text-xs font-medium text-emerald-600">Based on currently available dashboard values.</div></div>
          </div>
        ) : visible.map((alert, index) => (
          <div key={`${alert.title}-${index}`} className={`flex gap-3 rounded-2xl border p-3.5 ${alert.tone === 'bad' ? 'border-rose-100 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
            {alert.tone === 'bad' ? <CircleAlert size={17} className="mt-0.5 shrink-0 text-rose-600" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />}
            <div><div className="text-xs font-black text-slate-800">{alert.title}</div><div className="mt-0.5 text-[11px] font-medium text-slate-500">{alert.detail}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}
