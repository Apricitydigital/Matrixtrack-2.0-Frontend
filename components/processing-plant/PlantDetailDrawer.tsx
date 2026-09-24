'use client';

import React, { useEffect, useState } from 'react';
import { Code2, Factory, Gauge, Loader2, X } from 'lucide-react';
import type { ProcessingPlantFiltersState, ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { getProcessingPlantDetail } from '../../services/processingPlantService';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';
import ModalPortal from "@components/ui/ModalPortal";

type Props = {
  row: ProcessingPlantPerformanceRow | null;
  filters: ProcessingPlantFiltersState;
  onClose: () => void;
};

function humanize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return String(value);
}

export default function PlantDetailDrawer({ row, filters, onClose }: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!row?.plantId) return;
    let active = true;
    setLoading(true); setError(''); setDetail(null); setShowRaw(false);
    getProcessingPlantDetail(row.plantId, { from: filters.from, to: filters.to })
      .then((data) => active && setDetail(data))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Unable to load plant details'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [row?.plantId, filters.from, filters.to]);

  if (!row) return null;
  const src = detail?.data ?? detail ?? {};
  const summary = src.summary ?? src.kpis ?? src.overview ?? src;

  const flatEntries = Object.entries(summary ?? {}).filter(
    ([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value),
  );

  const efficiencyTone = row.efficiency >= 85 ? 'text-emerald-300' : row.efficiency >= 70 ? 'text-amber-300' : 'text-rose-300';

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
                <div className={`text-2xl font-black ${efficiencyTone}`}>{formatPercent(row.efficiency)}</div>
              </div>
            </div>
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
              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-black text-slate-900">Reporting Snapshot</h3>

                {flatEntries.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {flatEntries.map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{humanize(key)}</div>
                        <div className="mt-0.5 truncate text-xs font-black text-slate-800">{formatValue(value)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-medium text-slate-400">No additional flat reporting fields available for this response.</p>
                )}

                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  <Code2 size={13} /> {showRaw ? 'Hide raw response' : 'View raw response'}
                </button>

                {showRaw && (
                  <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">{JSON.stringify(summary, null, 2)}</pre>
                )}
              </section>
            )}
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
