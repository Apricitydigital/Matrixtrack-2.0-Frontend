'use client';

import React from 'react';
import type { ProcessingPlantTrendPoint } from '../../types/processingPlant';

function points(values: number[], width: number, height: number, max: number) {
  if (!values.length) return '';
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  return values.map((v, i) => `${i * step},${height - (max ? (v / max) * height : 0)}`).join(' ');
}

export default function ProcessingTrendChart({ trend }: { trend: ProcessingPlantTrendPoint[] }) {
  const width = 900;
  const height = 250;
  const max = Math.max(1, ...trend.flatMap((d) => [d.received, d.processed]));
  const received = points(trend.map((d) => d.received), width, height, max);
  const processed = points(trend.map((d) => d.processed), width, height, max);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Trend Analytics</div>
          <h2 className="mt-1 text-lg font-black text-slate-900">Received vs Processed</h2>
          <p className="text-xs text-slate-500">Daily movement across the selected date range.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Received</span>
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Processed</span>
        </div>
      </div>

      {trend.length === 0 ? (
        <div className="mt-5 flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No trend data available for this period.</div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[720px]">
            <svg viewBox={`0 0 ${width} ${height + 34}`} className="h-[290px] w-full overflow-visible">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line key={ratio} x1="0" x2={width} y1={height - height * ratio} y2={height - height * ratio} stroke="#e2e8f0" strokeWidth="1" />
              ))}
              <polyline fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={received} />
              <polyline fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={processed} />
              {trend.map((d, i) => {
                const x = trend.length === 1 ? width / 2 : (i * width) / (trend.length - 1);
                return (
                  <g key={`${d.date}-${i}`}>
                    <circle cx={x} cy={height - (d.received / max) * height} r="4" fill="#2563eb"><title>{`${d.date}: Received ${d.received}`}</title></circle>
                    <circle cx={x} cy={height - (d.processed / max) * height} r="4" fill="#10b981"><title>{`${d.date}: Processed ${d.processed}`}</title></circle>
                    {(i === 0 || i === trend.length - 1 || i % Math.ceil(trend.length / 6) === 0) && (
                      <text x={x} y={height + 25} textAnchor="middle" fontSize="11" fill="#64748b">{d.date}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
