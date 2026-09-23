'use client';

import React from 'react';
import { Factory, Gauge, PackageCheck, Recycle, Trash2, Truck } from 'lucide-react';
import type { ProcessingPlantDashboardData } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = { data: ProcessingPlantDashboardData };

const accents = [
  { grad: 'from-blue-500 to-cyan-400', chip: 'bg-blue-50 text-blue-600', blob: 'bg-blue-200/30' },
  { grad: 'from-emerald-500 to-teal-400', chip: 'bg-emerald-50 text-emerald-600', blob: 'bg-emerald-200/30' },
  { grad: 'from-violet-500 to-indigo-400', chip: 'bg-violet-50 text-violet-600', blob: 'bg-violet-200/30' },
  { grad: 'from-rose-500 to-orange-400', chip: 'bg-rose-50 text-rose-600', blob: 'bg-rose-200/30' },
  { grad: 'from-amber-500 to-yellow-400', chip: 'bg-amber-50 text-amber-600', blob: 'bg-amber-200/30' },
  { grad: 'from-slate-700 to-slate-500', chip: 'bg-slate-100 text-slate-700', blob: 'bg-slate-300/30' },
];

export default function ProcessingPlantKpiCards({ data }: Props) {
  const cards = [
    { label: 'Waste Received', value: formatMetric(data.totalReceived), note: 'Total city-level input', icon: Truck },
    { label: 'Waste Processed', value: formatMetric(data.totalProcessed), note: 'Processed in selected period', icon: PackageCheck },
    { label: 'Material Recovered', value: formatMetric(data.totalRecovered), note: 'Useful material recovered', icon: Recycle },
    { label: 'Reject / Residual', value: formatMetric(data.totalReject), note: 'Residual output requiring attention', icon: Trash2 },
    { label: 'Processing Efficiency', value: formatPercent(data.efficiency), note: 'Processed ÷ received', icon: Gauge },
    { label: 'Reporting Plants', value: `${data.reportingPlants || data.activePlants || 0}/${data.totalPlants || 0}`, note: 'Plants reporting in period', icon: Factory },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map(({ label, value, note, icon: Icon }, index) => {
        const accent = accents[index % accents.length];
        return (
          <article
            key={label}
            className="group relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.grad}`} />
            <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${accent.blob} blur-2xl transition group-hover:scale-125`} />

            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.chip}`}>
                  <Icon size={17} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">City</span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</div>
              <div className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">{value}</div>
              <div className="mt-1 text-[11px] font-medium text-slate-400">{note}</div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
