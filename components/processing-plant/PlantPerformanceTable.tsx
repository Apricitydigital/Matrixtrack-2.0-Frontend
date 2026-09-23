'use client';

import React from 'react';
import { ChevronRight, Factory } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

function efficiencyPill(efficiency: number) {
  if (efficiency >= 85) return 'bg-emerald-50 text-emerald-700';
  if (efficiency >= 70) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

function statusPill(status?: string) {
  const value = (status || '').toUpperCase();
  if (['MISSING', 'NOT_REPORTED', 'INACTIVE'].includes(value)) return 'bg-rose-50 text-rose-600';
  if (['PARTIAL', 'DELAYED'].includes(value)) return 'bg-amber-50 text-amber-600';
  if (value) return 'bg-emerald-50 text-emerald-600';
  return 'bg-slate-100 text-slate-600';
}

const avatarTints = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600'];

export default function PlantPerformanceTable({ rows, onSelect }: { rows: ProcessingPlantPerformanceRow[]; onSelect: (row: ProcessingPlantPerformanceRow) => void }) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Drill-down Matrix</div>
          <h2 className="mt-1 text-lg font-black text-slate-900">Plant Performance Matrix</h2>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Factory size={18} /></div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">#</th>
              <th className="px-2 py-3">Plant</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Processed</th><th className="px-4 py-3">Recovered</th><th className="px-4 py-3">Reject</th><th className="px-4 py-3">Efficiency</th><th className="px-4 py-3">Utilization</th><th className="px-4 py-3">Reporting</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-5 py-12 text-center text-sm font-bold text-slate-400">No plant rows available.</td></tr>
            ) : rows.map((row, index) => (
              <tr key={row.plantId || row.plantName} onClick={() => onSelect(row)} className="cursor-pointer transition hover:bg-blue-50/50">
                <td className="px-5 py-4 text-xs font-black text-slate-300">{index + 1}</td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white ${avatarTints[index % avatarTints.length]}`}>
                      {row.plantName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-slate-900">{row.plantName}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.plantType || 'Plant'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.received)}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.processed)}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.recovered)}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.reject)}</td>
                <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${efficiencyPill(row.efficiency)}`}>{formatPercent(row.efficiency)}</span></td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.utilization == null ? '—' : formatPercent(row.utilization)}</td>
                <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusPill(row.reportingStatus)}`}>{row.reportingStatus || '—'}</span></td>
                <td className="px-4 py-4 text-slate-300"><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
