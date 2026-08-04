import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from "recharts";

const buildShiftData = (wards) => {
  if (!Array.isArray(wards) || wards.length === 0) return [];

  // Shift timings:
  // Morning  : 6 AM – 1 PM  (hour 6 to 12)
  // Afternoon: 1 PM – 10 PM (hour 13 to 21)
  // Night    : 10 PM – 6 AM (hour 22,23,0,1,2,3,4,5)
  const shifts = {
    Morning: { name: "Morning", count: 0, color: "#10b981" },
    Afternoon: { name: "Afternoon", count: 0, color: "#f59e0b" },
    Night: { name: "Night", count: 0, color: "#6366f1" },
  };

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

        if (hour >= 6 && hour < 13) {
          shifts.Morning.count += 1;
        } else if (hour >= 13 && hour < 22) {
          shifts.Afternoon.count += 1;
        } else {
          // 10 PM to 6 AM → Night shift
          shifts.Night.count += 1;
        }
        hasData = true;
      }
    });
  });

  if (!hasData) return [];

  return Object.values(shifts);
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="
bg-white/95
dark:bg-slate-900/95

backdrop-blur

border
border-gray-100
dark:border-slate-700

shadow-xl
rounded-xl
p-4
">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{data.name}</p>
        <p className="text-lg font-bold" style={{ color: data.color }}>
          {payload[0].value} <span className="text-sm font-normal text-gray-500 dark:text-slate-400">employees</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function ShiftWiseAttendanceChart({ wards, loading, isEmbedded }) {
  const data = useMemo(() => buildShiftData(wards), [wards]);

  const content = (
    <>
<div
  className={`${
    isEmbedded
      ? `
        mb-4
        px-1
        py-1

        bg-transparent
        dark:bg-transparent
      `
      : `
        px-6
        py-5

        border-b
        border-gray-100
        dark:border-slate-700
      `
  }`}
>        <h3 className="
text-xl
font-extrabold
tracking-tight

text-slate-800
dark:text-slate-100
">Shift Wise Attendance</h3>
        {data.length > 0 && (
          <p className="
text-xs

text-slate-400
dark:text-slate-400

mt-0.5
uppercase
tracking-widest
font-bold
">
            Employee distribution across shifts
          </p>
        )}
      </div>

      <div className={`${isEmbedded ? 'rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 flex-1' : 'p-6'}`}>
        {loading && (
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm animate-pulse">
            Analyzing shift data…
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 gap-2">
            <span className="text-sm">No punch-in data available to analyze shifts</span>
          </div>
        )}
        {!loading && data.length > 0 && (
          <div>
            <ResponsiveContainer
              width="100%"
              height={isEmbedded ? 340 : 300}
            >
              <BarChart
                data={data}
                margin={{
                  top: 20,
                  right: 30,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={
                    document.documentElement.classList.contains("dark")
                      ? "#334155"
                      : "#f0f0f0"
                  }
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: document.documentElement.classList.contains("dark")
                      ? "#cbd5e1"
                      : "#6b7280",
                    fontWeight: 600,
                  }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 11,
                    fill: document.documentElement.classList.contains("dark")
                      ? "#94a3b8"
                      : "#9ca3af",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                />

                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  animationDuration={1500}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* LEGEND */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              {data.map((shift, index) => {
                const total = data.reduce(
                  (sum, item) => sum + item.count,
                  0
                );

                const percentage = (
                  (shift.count / total) *
                  100
                ).toFixed(1);

                return (
                  <div
  key={index}
  className="
flex
items-center
justify-between

rounded-xl

px-4
py-3

shadow-sm
hover:shadow-md

transition-all
border
backdrop-blur-sm

dark:bg-slate-800
dark:border-slate-700
"

  style={{
    backgroundColor:
      document.documentElement.classList.contains("dark")
        ? undefined
        : `${shift.color}12`,

    borderColor:
      document.documentElement.classList.contains("dark")
        ? undefined
        : `${shift.color}35`,
  }}
>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: shift.color,
                        }}
                      />

                      <span className="text-sm font-semibold text-slate-700 dark:text-white">
                        {shift.name}
                      </span>
                    </div>

                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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
