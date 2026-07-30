"use client";

import React from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white/95 px-3 py-2 shadow-card-hover backdrop-blur-sm">
      {label && <div className="mb-1 text-xs font-bold text-slate-700">{label}</div>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="font-medium text-slate-500">{entry.name}:</span>
          <span className="font-bold text-slate-800">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendAreaChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone" dataKey="value" name="Cities" stroke="#2563eb"
          strokeWidth={2.5} fill="url(#areaGrad)" animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} animationDuration={900}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
            innerRadius={62} outerRadius={92} paddingAngle={3} animationDuration={900}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-extrabold text-slate-900">{total}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</div>
      </div>
    </div>
  );
}

export function ChartLegend({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          <span className="text-xs font-medium text-slate-500">{d.label}</span>
          <span className="text-xs font-bold text-slate-700">{d.value}</span>
        </div>
      ))}
    </div>
  );
}