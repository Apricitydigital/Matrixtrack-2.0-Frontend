'use client';

import React, { useEffect, useState } from 'react';
import { Factory, Loader2, X } from 'lucide-react';
import type { ProcessingPlantFiltersState, ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { getProcessingPlantDetail } from '../../services/processingPlantService';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = {
  row: ProcessingPlantPerformanceRow | null;
  filters: ProcessingPlantFiltersState;
  onClose: () => void;
};

export default function PlantDetailDrawer({ row, filters, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!row?.plantId) return;
    let active = true;
    setLoading(true); setError(''); setDetail(null);
    getProcessingPlantDetail(row.plantId, { from: filters.from, to: filters.to })
      .then((data) => active && setDetail(data))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Unable to load plant details'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [row?.plantId, filters.from, filters.to]);

  if (!row) return null;
  const src = detail?.data ?? detail ?? {};
  const summary = src.summary ?? src.kpis ?? src.overview ?? src;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600"><Factory size={13} /> Plant Drill-down</div>
            <h2 className="mt-1 text-xl font-black text-slate-900">{row.plantName}</h2>
            <div className="text-xs font-bold text-slate-400">{row.plantType || 'Processing Plant'}</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={18} /></button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Received', formatMetric(row.received)], ['Processed', formatMetric(row.processed)], ['Recovered', formatMetric(row.recovered)], ['Reject', formatMetric(row.reject)], ['Efficiency', formatPercent(row.efficiency)], ['Utilization', row.utilization == null ? '—' : formatPercent(row.utilization)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-lg font-black text-slate-900">{value}</div></div>
            ))}
          </div>

          {loading && <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-10 text-sm font-bold text-slate-500"><Loader2 className="animate-spin" size={18} /> Loading plant analytics...</div>}
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
          {!loading && !error && detail && (
            <>
              <section className="rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-black text-slate-900">Reporting snapshot</h3><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">{JSON.stringify(summary, null, 2)}</pre></section>
              <p className="text-[11px] font-medium text-slate-400">This raw snapshot is intentionally visible during first integration. Replace it with final field cards once the exact plant-detail response is confirmed.</p>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
