'use client';

import React from 'react';
import { ArrowRight, Boxes, Factory, Recycle, Trash2, Truck } from 'lucide-react';
import type { ProcessingMetricKey, ProcessingPlantDashboardData } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = {
  data: ProcessingPlantDashboardData;
  /** Opens the plant-wise drill-down for the clicked box. */
  onSelect?: (metric: ProcessingMetricKey) => void;
};

export default function WasteProcessingFlow({ data, onSelect }: Props) {
  const ratio = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

  const nodes = [
    { key: 'received' as ProcessingMetricKey, label: 'Received', value: data.totalReceived, icon: Truck, tint: 'text-blue-300', bar: null as number | null },
    { key: 'processed' as ProcessingMetricKey, label: 'Processed', value: data.totalProcessed, icon: Factory, tint: 'text-cyan-300', bar: ratio(data.totalProcessed, data.totalReceived) },
    { key: 'recovered' as ProcessingMetricKey, label: 'Recovered', value: data.totalRecovered, icon: Recycle, tint: 'text-emerald-300', bar: ratio(data.totalRecovered, data.totalProcessed) },
    { key: 'reject' as ProcessingMetricKey, label: 'Reject', value: data.totalReject, icon: Trash2, tint: 'text-rose-300', bar: ratio(data.totalReject, data.totalProcessed) },
  ];

  const barColor = (index: number) => (index === 3 ? 'bg-rose-400' : index === 2 ? 'bg-emerald-400' : 'bg-cyan-400');

  // Where the received waste went (solid plants, same basis as the KPI totals above).
  const recoveredShare = Math.min(ratio(data.totalRecovered, data.totalReceived), 100);
  const rejectShare = Math.min(ratio(data.totalReject, data.totalReceived), 100 - recoveredShare);
  const otherShare = Math.max(100 - recoveredShare - rejectShare, 0);
  const split = [
    { label: 'Recovered', share: recoveredShare, value: data.totalRecovered, bar: 'bg-emerald-400' },
    { label: 'Reject', share: rejectShare, value: data.totalReject, bar: 'bg-rose-400' },
    { label: 'Loss / moisture / other', share: otherShare, value: Math.max(data.totalReceived - data.totalRecovered - data.totalReject, 0), bar: 'bg-slate-500' },
  ];

  return (
    <section className="relative flex flex-col overflow-hidden rounded-[26px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_18px_46px_-28px_rgba(15,23,42,.7)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      />

      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-300">
              <Boxes size={11} /> Operational Flow
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <h2 className="mt-2 text-lg font-black">City Waste Processing Flow</h2>
          <p className="mt-1 text-xs font-medium text-slate-400">Input-to-output view for the selected filters.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur"><Boxes size={18} /></div>
      </div>

      <div className="relative grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {nodes.map(({ key, label, value, icon: Icon, tint, bar }, index) => (
          <React.Fragment key={label}>
            <button
              type="button"
              onClick={() => onSelect?.(key)}
              aria-label={`${label}: ${formatMetric(value)}. Open plant-wise list`}
              className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <div className={`flex items-center gap-2 ${tint}`}><Icon size={15} /><span className="text-xs font-bold text-slate-300">{label}</span></div>
              <div className="mt-3 text-2xl font-black tracking-tight">{formatMetric(value)}</div>
              {bar !== null && (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${barColor(index)} transition-all duration-700`} style={{ width: `${Math.min(Math.max(bar, 0), 100)}%` }} />
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-500">{formatPercent(bar)} of {index === 1 ? 'received' : 'processed'}</div>
                </>
              )}
            </button>
            {index < nodes.length - 1 && (
              <div className="hidden items-center justify-center lg:flex"><ArrowRight size={18} className="text-slate-600" /></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {data.totalReceived > 0 && (
        <div className="relative mt-5 flex flex-1 flex-col justify-between gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Where the received waste went</div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
              {split.map((part) => (
                <div key={part.label} className={`${part.bar} transition-all duration-700`} style={{ width: `${part.share}%` }} title={`${part.label}: ${formatPercent(part.share)}`} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {split.map((part) => (
                <div key={part.label} className="flex items-start gap-2">
                  <i className={`mt-1 h-2 w-2 shrink-0 rounded-full ${part.bar}`} />
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">{part.label}</div>
                    <div className="text-xs font-black">{formatMetric(part.value)} <span className="font-bold text-slate-500">· {formatPercent(part.share)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
