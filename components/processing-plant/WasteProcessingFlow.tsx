'use client';

import React from 'react';
import { ArrowRight, Boxes, Factory, Recycle, Trash2, Truck } from 'lucide-react';
import type { ProcessingPlantDashboardData } from '../../types/processingPlant';
import { formatMetric } from '../../utils/processingPlantAnalytics';

type Props = { data: ProcessingPlantDashboardData };

export default function WasteProcessingFlow({ data }: Props) {
  const nodes = [
    { label: 'Received', value: data.totalReceived, icon: Truck },
    { label: 'Processed', value: data.totalProcessed, icon: Factory },
    { label: 'Recovered', value: data.totalRecovered, icon: Recycle },
    { label: 'Reject', value: data.totalReject, icon: Trash2 },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Operational Flow</div>
          <h2 className="mt-1 text-lg font-black">City Waste Processing Flow</h2>
          <p className="mt-1 text-xs text-slate-400">Input-to-output view for the selected filters.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10"><Boxes size={18} /></div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {nodes.map(({ label, value, icon: Icon }, index) => (
          <React.Fragment key={label}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-slate-300"><Icon size={15} /><span className="text-xs font-bold">{label}</span></div>
              <div className="mt-3 text-2xl font-black tracking-tight">{formatMetric(value)}</div>
              {index === 1 && data.totalReceived > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min((data.totalProcessed / data.totalReceived) * 100, 100)}%` }} />
                </div>
              )}
            </div>
            {index < nodes.length - 1 && (
              <div className="hidden items-center justify-center lg:flex"><ArrowRight size={18} className="text-slate-600" /></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
