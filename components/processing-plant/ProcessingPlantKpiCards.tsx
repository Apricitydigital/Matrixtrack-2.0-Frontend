'use client';

import React from 'react';
import { ChevronRight, Droplets, Factory, Gauge, PackageCheck, Recycle, Trash2, Truck } from 'lucide-react';
import type { ProcessingMetricKey, ProcessingPlantDashboardData, ProcessingUnitTotals } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = {
  data: ProcessingPlantDashboardData;
  /** Totals of the unit family chosen on the dashboard (MT / KL / ML). */
  totals: ProcessingUnitTotals;
  /** Opens the plant-wise drill-down for the clicked card. */
  onSelect?: (metric: ProcessingMetricKey) => void;
};

const accents = [
  { grad: 'from-blue-500 to-cyan-400', chip: 'bg-blue-50 text-blue-600', blob: 'bg-blue-200/30' },
  { grad: 'from-emerald-500 to-teal-400', chip: 'bg-emerald-50 text-emerald-600', blob: 'bg-emerald-200/30' },
  { grad: 'from-violet-500 to-indigo-400', chip: 'bg-violet-50 text-violet-600', blob: 'bg-violet-200/30' },
  { grad: 'from-rose-500 to-orange-400', chip: 'bg-rose-50 text-rose-600', blob: 'bg-rose-200/30' },
  { grad: 'from-sky-500 to-blue-400', chip: 'bg-sky-50 text-sky-600', blob: 'bg-sky-200/30' },
  { grad: 'from-amber-500 to-yellow-400', chip: 'bg-amber-50 text-amber-600', blob: 'bg-amber-200/30' },
  { grad: 'from-slate-700 to-slate-500', chip: 'bg-slate-100 text-slate-700', blob: 'bg-slate-300/30' },
];

export default function ProcessingPlantKpiCards({ data, totals, onSelect }: Props) {
  const suffix = ` ${totals.unit}`;
  const cards: { key: ProcessingMetricKey; label: string; value: string; note: string; icon: typeof Truck }[] = [
    { key: 'received', label: 'Waste Received', value: formatMetric(totals.received, suffix), note: 'Input received in selected period', icon: Truck },
    { key: 'processed', label: 'Waste Processed', value: formatMetric(totals.processed, suffix), note: 'Processed in selected period', icon: PackageCheck },
    { key: 'recovered', label: 'Material Recovered', value: formatMetric(totals.recovered, suffix), note: 'Useful material recovered', icon: Recycle },
    { key: 'reject', label: 'Reject / Residual', value: formatMetric(totals.reject, suffix), note: 'Residual output requiring attention', icon: Trash2 },
    { key: 'loss', label: 'Process Loss / Moisture', value: formatMetric(totals.processLoss, suffix), note: 'Loss and moisture during processing', icon: Droplets },
    { key: 'efficiency', label: 'Processing Efficiency', value: totals.hasEfficiency ? formatPercent(totals.efficiency) : 'n/a', note: 'Recovered ÷ received', icon: Gauge },
    { key: 'reporting', label: 'Reporting Plants', value: `${data.reportingPlants || data.activePlants || 0}/${data.totalPlants || 0}`, note: 'Plants reporting in period', icon: Factory },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      {cards.map(({ key, label, value, note, icon: Icon }, index) => {
        const accent = accents[index % accents.length];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect?.(key)}
            aria-label={`${label}: ${value}. Open plant-wise list`}
            className="group relative w-full cursor-pointer overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.grad}`} />
            <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${accent.blob} blur-2xl transition group-hover:scale-125`} />

            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.chip}`}>
                  <Icon size={17} />
                </div>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</div>
              <div className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 2xl:text-xl">{value}</div>
              <div className="mt-1 text-[11px] font-medium text-slate-400">{note}</div>
              <div className="mt-2.5 flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-500 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                View plants <ChevronRight size={12} className="transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
