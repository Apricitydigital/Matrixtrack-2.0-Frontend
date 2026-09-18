'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function percentText(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return `${round1(value)}%`;
}

export type ComparisonDatum = {
  metric: string;
  current: number | null;
  lastMonth: number | null;
};

export default function ComparisonBarChart({
  data,
}: {
  data: ComparisonDatum[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 4, bottom: 0, left: -22 }}
        barGap={4}
      >
        <CartesianGrid vertical={false} stroke="#e8edf5" strokeDasharray="3 5" />

        <XAxis
          dataKey="metric"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}
        />

        <YAxis
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: '#94a3b8' }}
          tickFormatter={(value) => `${value}%`}
        />

        <Tooltip
          formatter={(value: any, name: any) => [
            percentText(Number(value)),
            name === 'current' ? 'Current Period' : 'Last Month',
          ]}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px rgba(15,23,42,.10)',
            fontSize: 10,
          }}
        />

        <Bar
          dataKey="lastMonth"
          fill="#cbd5e1"
          radius={[6, 6, 0, 0]}
          barSize={15}
          isAnimationActive
          animationDuration={650}
        />

        <Bar
          dataKey="current"
          fill="#4f46e5"
          radius={[6, 6, 0, 0]}
          barSize={15}
          isAnimationActive
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
