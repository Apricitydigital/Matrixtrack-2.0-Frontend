'use client';

import React from 'react';
import { Factory, Gauge, X } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';
import ModalPortal from "@components/ui/ModalPortal";

type Props = {
  row: ProcessingPlantPerformanceRow | null;
  onClose: () => void;
};

export default function PlantDetailDrawer({ row, onClose }: Props) {
  if (!row) return null;

  const suffix = ` ${row.unit || 'MT'}`;
  const efficiencyKnown = row.efficiencyAvailable !== false;
  const efficiencyTone = !efficiencyKnown ? 'text-slate-300' : row.efficiency >= 85 ? 'text-emerald-300' : row.efficiency >= 70 ? 'text-amber-300' : 'text-rose-300';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
        <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#312e81_0%,#4f46e5_45%,#7c3aed_100%)] p-5 text-white">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '17px 17px' }}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur"><Factory size={20} /></div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-100/80">Plant Drill-down</div>
                  <h2 className="mt-1 text-xl font-black leading-tight">{row.plantName}</h2>
                  <div className="text-xs font-bold text-white/60">{row.plantType || 'Processing Plant'}</div>
                </div>
              </div>
              <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20"><X size={18} /></button>
            </div>

            <div className="relative mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Gauge size={22} className={efficiencyTone} />
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-white/55">Processing Efficiency</div>
                <div className={`text-2xl font-black ${efficiencyTone}`}>{efficiencyKnown ? formatPercent(row.efficiency) : 'n/a'}</div>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Received', formatMetric(row.received, suffix)],
                ['Processed', formatMetric(row.processed, suffix)],
                ['Recovered', formatMetric(row.recovered, suffix)],
                ['Reject', formatMetric(row.reject, suffix)],
                ['Process loss', formatMetric(row.processLoss, suffix)],
                ['Efficiency', row.efficiencyAvailable === false ? 'n/a' : formatPercent(row.efficiency)],
                ['Utilization', row.utilization == null ? '—' : formatPercent(row.utilization)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-lg font-black text-slate-900">{value}</div></div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
