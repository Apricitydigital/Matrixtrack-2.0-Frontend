'use client';

import React from 'react';
import { Factory, Gauge, PackageCheck, Recycle, Trash2, Truck } from 'lucide-react';
import type { ProcessingPlantDashboardData } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = { data: ProcessingPlantDashboardData };

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
      {cards.map(({ label, value, note, icon: Icon }) => (
        <article key={label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-100 transition group-hover:scale-110" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"><Icon size={17} /></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">City</span>
            </div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</div>
            <div className="mt-1 text-[11px] font-medium text-slate-400">{note}</div>
          </div>
        </article>
      ))}
    </div>
  );
}
