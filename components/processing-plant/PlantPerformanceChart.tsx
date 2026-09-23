'use client';

import React from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatPercent } from '../../utils/processingPlantAnalytics';

const medalTint = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950'];

function tierColor(efficiency: number) {
  if (efficiency >= 85) return 'from-emerald-500 to-teal-400';
  if (efficiency >= 70) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-orange-400';
}

export default function PlantPerformanceChart({ rows, onSelect }: { rows: ProcessingPlantPerformanceRow[]; onSelect: (row: ProcessingPlantPerformanceRow) => void }) {
  const data = [...rows].sort((a, b) => b.efficiency - a.efficiency).slice(0, 10);
  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Plant Comparison</div>
          <h2 className="mt-1 text-lg font-black text-slate-900">Processing Efficiency by Plant</h2>
          <p className="text-xs font-medium text-slate-500">Click any plant to open its drill-down.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Trophy size={18} /></div>
      </div>

      <div className="mt-5 space-y-2">
        {data.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No plant comparison data available.</div>
        ) : data.map((row, index) => (
          <button
            key={row.plantId || row.plantName}
            onClick={() => onSelect(row)}
            className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50"
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                index < 3 ? medalTint[index] : 'bg-slate-100 text-slate-500'
              }`}
            >
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-slate-800 group-hover:text-blue-600">{row.plantName}</div>
                  {row.plantType && <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.plantType}</div>}
                </div>
                <div className="text-sm font-black text-slate-900">{formatPercent(row.efficiency)}</div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tierColor(row.efficiency)} transition-all duration-700`}
                  style={{ width: `${Math.min(Math.max(row.efficiency, 0), 100)}%` }}
                />
              </div>
            </div>

            <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
          </button>
        ))}
      </div>
    </section>
  );
}
