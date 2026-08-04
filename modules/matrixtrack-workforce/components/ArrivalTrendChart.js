import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ReferenceDot,
} from "recharts";

const buildArrivalTrendData = (wards) => {
  if (!Array.isArray(wards) || wards.length === 0) return [];
  const hourCounts = {};

  // Standard working hours initialization from 6 AM to 8 PM
  for (let i = 6; i <= 20; i++) {
    hourCounts[i] = 0;
  }

  let hasData = false;
  const seen = new Set();

  wards.forEach((ward, wIdx) => {
    const employees = Array.isArray(ward.employees) ? ward.employees : [];
    employees.forEach((employee, eIdx) => {
      const rawId =
        employee?.emp_id ??
        employee?.employee_id ??
        employee?.id ??
        employee?.emp_code ??
        employee?.employee_code ??
        employee?.empId;

      const key = rawId ? String(rawId) : `ward-${wIdx}-emp-${eIdx}`;
      if (seen.has(key)) return;
      seen.add(key);

      const inEpoch = Number(employee.punch_in_epoch) || 0;
      if (inEpoch > 0) {
        const d = new Date(inEpoch * 1000);
        const hour = d.getHours();

        // dynamically expand if someone clocks in at 4 AM or 11 PM
        if (hourCounts[hour] === undefined) {
          hourCounts[hour] = 0;
        }
        hourCounts[hour] += 1;
        hasData = true;
      }
    });
  });

  if (!hasData) return [];

  const keys = Object.keys(hourCounts).map(Number).sort((a, b) => a - b);

  return keys.map((h) => {
    const isPM = h >= 12;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const period = isPM ? "PM" : "AM";
    return {
      hourLabel: `${hour12}:00 ${period}`,
      arrivals: hourCounts[h],
      hourVal: h
    };
  });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="
bg-white/95
dark:bg-slate-900/95

backdrop-blur

border
border-indigo-100
dark:border-slate-700

shadow-xl
rounded-xl
p-4
">        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-indigo-600">
          {payload[0].value} <span className="text-sm font-normal text-gray-500 dark:text-slate-400">Check-ins</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ArrivalTrendChart({ wards, loading, isEmbedded }) {
  const data = useMemo(() => buildArrivalTrendData(wards), [wards]);

  const content = (
    <>
      <div
  className={`${
    isEmbedded
      ? `
        mb-4
        px-1
        py-1
      `
      : `
        px-6
        py-5

        border-b
        border-gray-100
        dark:border-slate-700
      `
  }`}
>
        <h3 className="
text-xl
font-extrabold
tracking-tight

text-slate-800
dark:text-slate-100
">Peak Attendance Time</h3>
        {data.length > 0 && (
          <p className="
text-xs

text-slate-400
dark:text-slate-500

mt-0.5
uppercase
tracking-widest
font-bold
">
            Hourly check-in distribution
          </p>
        )}
      </div>

      <div className={`${isEmbedded ? 'rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 flex-1' : 'p-6'}`}>
        {loading && (
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-slate-500 dark:text-slate-500 text-sm animate-pulse">
            Calculating arrival trends…
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 gap-2">
            <span className="text-sm">No punch-in data available to chart trends</span>
          </div>
        )}
        {!loading && data.length > 0 && (
          <ResponsiveContainer width="100%" height={isEmbedded ? 340 : 300}>
            <LineChart data={data} margin={{ left: -15, right: 20, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={
  document.documentElement.classList.contains("dark")
    ? "#334155"
    : "#f0f0f0"
} />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 10, fill: document.documentElement.classList.contains("dark")
  ? "#cbd5e1"
  : "#6b7280", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: document.documentElement.classList.contains("dark")
  ? "#94a3b8"
  : "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{
  stroke: document.documentElement.classList.contains("dark")
    ? "rgba(255,255,255,0.12)"
    : "rgba(99,102,241,0.1)",

  strokeWidth: 2,
}} />
              <Line
                type="monotone"
                dataKey="arrivals"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{
  r: 4,

  fill: document.documentElement.classList.contains("dark")
    ? "#0f172a"
    : "#ffffff",

  stroke: "#6366f1",
  strokeWidth: 2,
}}
                activeDot={{
  r: 6,

  fill: "#4f46e5",

  stroke: document.documentElement.classList.contains("dark")
    ? "#0f172a"
    : "#ffffff",

  strokeWidth: 2,
}}
                name="Employees Punched In"
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );

  if (isEmbedded) return content;

  return (
    <div className="
bg-white
dark:bg-slate-900

shadow-md
rounded-2xl
mt-5
overflow-hidden

border
border-gray-100
dark:border-slate-700
">
      {content}
    </div>
  );
}
