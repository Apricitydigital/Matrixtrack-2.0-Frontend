'use client';

import React from 'react';
import { ChevronRight, Factory } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

export default function PlantPerformanceTable({ rows, onSelect }: { rows: ProcessingPlantPerformanceRow[]; onSelect: (row: ProcessingPlantPerformanceRow) => void }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
              <th className="px-5 py-3">Plant</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Processed</th><th className="px-4 py-3">Recovered</th><th className="px-4 py-3">Reject</th><th className="px-4 py-3">Efficiency</th><th className="px-4 py-3">Utilization</th><th className="px-4 py-3">Reporting</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm font-bold text-slate-400">No plant rows available.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.plantId || row.plantName} onClick={() => onSelect(row)} className="cursor-pointer transition hover:bg-blue-50/50">
                <td className="px-5 py-4"><div className="font-black text-slate-900">{row.plantName}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.plantType || 'Plant'}</div></td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.received)}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.processed)}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.recovered)}</td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{formatMetric(row.reject)}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{formatPercent(row.efficiency)}</span></td>
                <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.utilization == null ? '—' : formatPercent(row.utilization)}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">{row.reportingStatus || '—'}</span></td>
                <td className="px-4 py-4 text-slate-400"><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
