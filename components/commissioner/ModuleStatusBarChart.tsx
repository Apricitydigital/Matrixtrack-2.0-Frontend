'use client';

import {
  Bar,
  BarChart,
  Legend,
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

export type ModuleStatusDatum = {
  key: string;
  name: string;
  Approved: number;
  Rejected: number;
  'Action Required': number;
  'Action Taken': number;
  Pending: number;
};

export default function ModuleStatusBarChart({
  data,
}: {
  data: ModuleStatusDatum[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 32, right: 14, top: 4, bottom: 4 }}
      >
        <defs>
          <linearGradient id="approvedGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="rejectedGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#be123c" />
          </linearGradient>

          <linearGradient id="actionRequiredGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="actionTakenGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>

        <XAxis
          type="number"
          domain={[0, 100]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />

        <YAxis
          type="category"
          dataKey="name"
          width={145}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
        />

        <Tooltip
          formatter={(value: any) => percentText(Number(value))}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            fontSize: 11,
          }}
        />

        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 800 }} />

        <Bar
          dataKey="Approved"
          stackId="status"
          fill="url(#approvedGradient)"
          isAnimationActive
          animationDuration={650}
        />

        <Bar
          dataKey="Rejected"
          stackId="status"
          fill="url(#rejectedGradient)"
          isAnimationActive
          animationDuration={700}
        />

        <Bar
          dataKey="Action Required"
          stackId="status"
          fill="url(#actionRequiredGradient)"
          isAnimationActive
          animationDuration={750}
        />

        <Bar
          dataKey="Action Taken"
          stackId="status"
          fill="url(#actionTakenGradient)"
          isAnimationActive
          animationDuration={800}
        />

        <Bar
          dataKey="Pending"
          stackId="status"
          fill="#cbd5e1"
          radius={[0, 10, 10, 0]}
          isAnimationActive
          animationDuration={850}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
