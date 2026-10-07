'use client';

import React from 'react';
import { Boxes } from 'lucide-react';
import type { ProcessingPlantDashboardData, ProcessingUnitTotals } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = {
  data: ProcessingPlantDashboardData;
  /** Totals of the unit family chosen on the dashboard (MT / KL / ML). */
  totals: ProcessingUnitTotals;
};

const ratio = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

export default function WasteProcessingFlow({ data, totals }: Props) {
  const suffix = ` ${totals.unit}`;
  const { received, recovered, reject, processLoss: loss } = totals;

  const recoveredShare = Math.min(ratio(recovered, received), 100);
  const rejectShare = Math.min(ratio(reject, received), 100 - recoveredShare);
  const lossShare = Math.min(ratio(loss, received), Math.max(100 - recoveredShare - rejectShare, 0));
  const unaccountedShare = Math.max(100 - recoveredShare - rejectShare - lossShare, 0);

  const split = [
    { label: 'Recovered', share: recoveredShare, value: recovered, bar: 'bg-emerald-400' },
    { label: 'Reject', share: rejectShare, value: reject, bar: 'bg-rose-400' },
    { label: 'Process loss / moisture', share: lossShare, value: loss, bar: 'bg-sky-400' },
    // received quantity that no plant reported an outcome for
    ...(unaccountedShare >= 0.05
      ? [{ label: 'Not accounted for', share: unaccountedShare, value: Math.max(received - recovered - reject - loss, 0), bar: 'bg-slate-500' }]
      : []),
  ];

  return (
    <section className="relative flex flex-col overflow-hidden rounded-[26px] border border-white/10 bg-slate-950 p-5 text-white shadow-[0_18px_46px_-28px_rgba(15,23,42,.7)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      />

      <div className="relative mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 backdrop-blur"><Boxes size={17} /></div>
        <h2 className="text-lg font-black">Waste Processing Flow</h2>
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          Where the received waste went · {formatMetric(received, suffix)} received
        </div>

        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
          {received > 0 && split.map((part) => (
            <div key={part.label} className={`${part.bar} transition-all duration-700`} style={{ width: `${part.share}%` }} title={`${part.label}: ${formatPercent(part.share)}`} />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {split.map((part) => (
            <div key={part.label} className="flex items-start gap-2">
              <i className={`mt-1 h-2 w-2 shrink-0 rounded-full ${part.bar}`} />
              <div>
                <div className="text-[11px] font-bold text-slate-300">{part.label}</div>
                <div className="text-xs font-black">{formatMetric(part.value, suffix)} <span className="font-bold text-slate-500">· {formatPercent(part.share)}</span></div>

                {/* outputs measured in another unit (e.g. electricity in kWh) cannot sit on this bar, so they are listed with Recovered */}
                {part.label === 'Recovered' && data.otherOutputs.map((item) => (
                  <div key={`${item.name}-${item.unit}`} className="mt-0.5 text-[11px] font-bold text-emerald-300/90">
                    + {formatMetric(item.quantity, ` ${item.unit}`)} <span className="font-medium text-slate-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
