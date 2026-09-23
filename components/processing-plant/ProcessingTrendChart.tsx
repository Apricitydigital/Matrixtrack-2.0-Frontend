'use client';

import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { ProcessingPlantTrendPoint } from '../../types/processingPlant';
import { formatMetric } from '../../utils/processingPlantAnalytics';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white/95 p-3 text-xs shadow-[0_12px_30px_rgba(15,23,42,.10)] backdrop-blur">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 font-bold text-slate-600">
            <i className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {entry.dataKey === 'received' ? 'Received' : 'Processed'}
          </span>
          <span className="font-black text-slate-900">{formatMetric(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProcessingTrendChart({ trend }: { trend: ProcessingPlantTrendPoint[] }) {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-100/40 blur-3xl" />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            <TrendingUp size={12} className="text-blue-500" /> Trend Analytics
          </div>
          <h2 className="mt-1 text-lg font-black text-slate-900">Received vs Processed</h2>
          <p className="text-xs font-medium text-slate-500">Daily movement across the selected date range.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Received</span>
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Processed</span>
        </div>
      </div>

      {trend.length === 0 ? (
        <div className="relative mt-5 flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
          No trend data available for this period.
        </div>
      ) : (
        <div className="relative mt-5 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="processedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="#e8edf5" strokeDasharray="3 5" />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}
                minTickGap={24}
              />

              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} width={44} />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="received"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#receivedFill)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                isAnimationActive
                animationDuration={700}
              />

              <Area
                type="monotone"
                dataKey="processed"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#processedFill)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                isAnimationActive
                animationDuration={850}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
