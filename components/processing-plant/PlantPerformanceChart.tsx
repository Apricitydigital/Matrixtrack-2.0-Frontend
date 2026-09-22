'use client';

import React from 'react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatPercent } from '../../utils/processingPlantAnalytics';

export default function PlantPerformanceChart({ rows, onSelect }: { rows: ProcessingPlantPerformanceRow[]; onSelect: (row: ProcessingPlantPerformanceRow) => void }) {
  const data = [...rows].sort((a, b) => b.efficiency - a.efficiency).slice(0, 10);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Plant Comparison</div>
        <h2 className="mt-1 text-lg font-black text-slate-900">Processing Efficiency by Plant</h2>
        <p className="text-xs text-slate-500">Click any plant to open its drill-down.</p>
      </div>
      <div className="mt-5 space-y-3">
        {data.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No plant comparison data available.</div>
        ) : data.map((row) => (
          <button key={row.plantId || row.plantName} onClick={() => onSelect(row)} className="group block w-full text-left">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-slate-800 group-hover:text-blue-600">{row.plantName}</div>
                {row.plantType && <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.plantType}</div>}
              </div>
              <div className="text-sm font-black text-slate-900">{formatPercent(row.efficiency)}</div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all" style={{ width: `${Math.min(Math.max(row.efficiency, 0), 100)}%` }} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
