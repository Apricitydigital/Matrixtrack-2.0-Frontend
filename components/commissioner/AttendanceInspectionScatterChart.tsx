'use client';

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
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

export type AttendanceInspectionPoint = {
  name: string;
  attendance: number | null;
  inspection: number;
  reports: number;
  employee: any;
  records: any[];
};

export default function AttendanceInspectionScatterChart({
  data,
  onPointClick,
}: {
  data: AttendanceInspectionPoint[];
  onPointClick: (row: AttendanceInspectionPoint) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 25, bottom: 20, left: 5 }}>
        <CartesianGrid strokeDasharray="4 5" stroke="#e2e8f0" />

        <XAxis
          type="number"
          dataKey="attendance"
          name="Attendance"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          type="number"
          dataKey="inspection"
          name="Inspection Performance"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />

        <ZAxis type="number" dataKey="reports" range={[70, 440]} />

        <Tooltip
          cursor={{ strokeDasharray: '4 4' }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) {
              return null;
            }

            const row = payload[0].payload;

            return (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] shadow-xl">
                <div className="font-black text-slate-950">{row.name}</div>

                <div className="mt-2 flex justify-between gap-5">
                  <span className="font-semibold text-slate-500">Attendance</span>

                  <span className="font-black text-slate-950">
                    {percentText(row.attendance)}
                  </span>
                </div>

                <div className="mt-1 flex justify-between gap-5">
                  <span className="font-semibold text-slate-500">
                    Inspection Performance
                  </span>

                  <span className="font-black text-slate-950">
                    {percentText(row.inspection)}
                  </span>
                </div>

                <div className="mt-1 flex justify-between gap-5">
                  <span className="font-semibold text-slate-500">Records</span>

                  <span className="font-black text-slate-950">{row.reports}</span>
                </div>
              </div>
            );
          }}
        />

        <Scatter
          data={data}
          fill="#4f46e5"
          cursor="pointer"
          isAnimationActive
          animationDuration={800}
          onClick={(data: any) => {
            const row = data?.payload || data;

            if (!row) {
              return;
            }

            onPointClick(row);
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
