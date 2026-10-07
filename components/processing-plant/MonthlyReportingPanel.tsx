'use client';

import React from 'react';
import { CalendarDays, Info } from 'lucide-react';
import type { ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatMetric } from '../../utils/processingPlantAnalytics';

type Props = {
  /** The plants of the current selection that report one total per month. */
  rows: ProcessingPlantPerformanceRow[];
};

function monthLabel(month: string) {
  const [year, number] = month.split('-').map(Number);
  if (!year || !number) return month;
  return new Date(year, number - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function daysInMonth(month: string) {
  const [year, number] = month.split('-').map(Number);
  return year && number ? new Date(year, number, 0).getDate() : 0;
}

export default function MonthlyReportingPanel({ rows }: Props) {
  if (rows.length === 0) return null;

  const names = rows.map((row) => row.plantName);

  return (
    <section className="overflow-hidden rounded-[26px] border border-indigo-100 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-indigo-100 bg-indigo-50/60 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600"><Info size={18} /></div>
        <div>
          <h2 className="text-sm font-black text-slate-900">
            {rows.length === 1 ? `${names[0]} reports monthly totals only` : 'These plants report monthly totals only'}
          </h2>
          {rows.length > 1 && <div className="mt-0.5 text-xs font-bold text-slate-600">{names.join(' · ')}</div>}
          <p className="mt-1 text-xs font-medium text-slate-500">
            This plant sends one total per month, not daily data. The cards and charts above show that total spread evenly over the days of the month, so please read it month by month in the table below.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {rows.map((row) => {
          const suffix = ` ${row.unit || 'MT'}`;
          const months = row.monthly ?? [];

          return (
            <div key={row.plantId || row.plantName}>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <CalendarDays size={13} className="text-indigo-500" /> {row.plantName} · month by month
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3">Processed</th>
                      <th className="px-4 py-3">Recovered</th>
                      <th className="px-4 py-3">Reject</th>
                      <th className="px-4 py-3">Process loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {months.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-xs font-bold text-slate-400">No monthly figures in the selected period.</td></tr>
                    ) : months.map((month) => {
                      const total = daysInMonth(month.month);
                      const partial = total > 0 && month.days < total;
                      return (
                        <tr key={month.month}>
                          <td className="px-4 py-3 text-xs font-black text-slate-800">
                            {monthLabel(month.month)}
                            {partial && <div className="text-[10px] font-bold text-amber-600" title="The selected period covers only part of this month, so the figures are pro-rata">{month.days} of {total} days selected</div>}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatMetric(month.received, suffix)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatMetric(month.processed, suffix)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatMetric(month.recovered, suffix)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatMetric(month.reject, suffix)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatMetric(month.processLoss, suffix)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
