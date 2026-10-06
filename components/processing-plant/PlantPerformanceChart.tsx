'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatPercent } from '../../utils/processingPlantAnalytics';

const medalTint = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-950'];

// 5 rows keeps this card about as tall as the Material Recovery Mix card beside it.
const PAGE_SIZE = 5;

function tierColor(efficiency: number) {
  if (efficiency >= 85) return 'from-emerald-500 to-teal-400';
  if (efficiency >= 70) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-orange-400';
}

export default function PlantPerformanceChart({ rows, onSelect }: { rows: ProcessingPlantPerformanceRow[]; onSelect: (row: ProcessingPlantPerformanceRow) => void }) {
  const sorted = useMemo(() => [...rows].sort((a, b) => b.efficiency - a.efficiency), [rows]);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // new data / filters can shrink the list
  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const data = sorted.slice(start, start + PAGE_SIZE);

  return (
    <section className="flex flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Plant Comparison</div>
          <h2 className="mt-1 text-lg font-black text-slate-900">Processing Efficiency by Plant</h2>
          <p className="text-xs font-medium text-slate-500">Click any plant to open its drill-down.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Trophy size={18} /></div>
      </div>

      <div className="mt-5 flex-1 space-y-2">
        {data.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No plant comparison data available.</div>
        ) : data.map((row, index) => {
          const rank = start + index + 1;
          return (
            <button
              key={row.plantId || row.plantName}
              onClick={() => onSelect(row)}
              className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  rank <= 3 ? medalTint[rank - 1] : 'bg-slate-100 text-slate-500'
                }`}
              >
                {rank}
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
          );
        })}
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-bold text-slate-400">
            {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)} of {sorted.length} plants
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
              <button
                key={number}
                onClick={() => setPage(number)}
                aria-current={number === page ? 'page' : undefined}
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-black transition ${
                  number === page ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {number}
              </button>
            ))}

            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
