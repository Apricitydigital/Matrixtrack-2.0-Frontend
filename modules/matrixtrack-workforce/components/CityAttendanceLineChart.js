// import { useMemo, useState, useCallback } from "react";
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
//   Cell,
// } from "recharts";
// import { buildApiUrl } from "../config";

// const ZONE_SUMMARY_ENDPOINT = buildApiUrl("/app/supervisor/wards/zone-summary");

// export const transformCitySummary = (summary) => {
//   if (!Array.isArray(summary)) return [];
//   return summary.map((item) => {
//     // The backend `citySummary` sends `present` natively.
//     // If not, fallback to `marked` (which in the backend is also mapped to `present`).
//     const present = Number(item.present ?? item.marked ?? 0) || 0;

//     // In case we want to store these for the API or drilldowns:
//     const fullyMarked = Number(item.fullyMarked ?? item.fully_marked ?? 0) || 0;
//     const inProgress = Number(item.inProgress ?? item.in_progress ?? item.pending ?? 0) || 0;
//     const onLeave = Number(item.onLeave ?? item.on_leave ?? 0) || 0;
//     const rawNotMarked = Number(item.notMarked ?? item.not_marked ?? item.absent ?? 0) || 0;

//     const apiTotalEmployees = Number(
//       item.totalEmployees ?? item.total_employees ?? item.totalEmployeesCount ?? item.total ?? 0
//     );

//     let absent;
//     let finalTotal;

//     if (apiTotalEmployees > 0) {
//       absent = Math.max(apiTotalEmployees - present - onLeave, 0);
//       finalTotal = apiTotalEmployees;
//     } else {
//       absent = Math.max(rawNotMarked, 0);
//       finalTotal = present + absent + onLeave;
//     }

//     return {
//       city: item.city_name ?? item.cityName ?? item.city ?? "Unassigned",
//       city_id: item.city_id ?? null,
//       present,
//       absent,
//       onLeave,
//       marked: fullyMarked,
//       inProgress,
//       notMarked: absent,
//       total: finalTotal,
//     };
//   });
// };

// // ── Custom tooltip ──────────────────────────────────────────────────────────
// const CustomTooltip = ({ active, payload, label }) => {
//   if (!active || !payload?.length) return null;
//   const total = payload.reduce((s, p) => s + (p.value || 0), 0);
//   return (
//     <div className="bg-white dark:bg-slate-900/95 backdrop-blur border border-gray-200 shadow-xl rounded-xl p-4 min-w-[180px]">
//       <p className="font-bold text-gray-800 dark:text-white dark:text-white mb-2 text-sm">{label}</p>
//       {payload.map((p) => (
//         <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs mb-1">
//           <span className="flex items-center gap-1.5">
//             <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.fill }} />
//             {p.name}
//           </span>
//           <span className="font-semibold text-gray-700">{p.value}</span>
//         </div>
//       ))}
//       {total > 0 && (
//         <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-xs font-bold text-gray-700">
//           <span>Total</span><span>{total}</span>
//         </div>
//       )}
//     </div>
//   );
// };

// // ── Attendance rate mini-pill ───────────────────────────────────────────────
// const RatePill = ({ value, total }) => {
//   const pct = total > 0 ? Math.round((value / total) * 100) : 0;
//   const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
//   return (
//     <span className={`inline-block px-2 py-0.5 rounded-full text-white text-xs font-bold ${color}`}>
//       {pct}%
//     </span>
//   );
// };

// // ── Zone drilldown panel ───────────────────────────────────────────────────
// function ZoneDrilldownPanel({ cityName, zoneData, loading, onClose }) {
//   return (
//     <div className="mt-4 border border-blue-100 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 relative animate-fadeIn">
//       <div className="flex items-center justify-between mb-4">
//         <div>
//           <h4 className="text-base font-bold text-blue-900">📍 {cityName} — Zone Breakdown</h4>
//           <p className="text-xs text-blue-500 mt-0.5">Attendance by zone for the selected date range</p>
//         </div>
//         <button
//           onClick={onClose}
//           className="text-gray-400 dark:text-slate-500 hover:text-gray-600 transition text-lg font-bold leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-white dark:bg-slate-900/60"
//         >
//           ×
//         </button>
//       </div>

//       {loading ? (
//         <div className="h-32 flex items-center justify-center text-blue-400 text-sm animate-pulse">
//           Loading zone data…
//         </div>
//       ) : !zoneData.length ? (
//         <div className="h-32 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
//           No zone data available.
//         </div>
//       ) : (
//         <div className="space-y-3">
//           {zoneData.map((zone) => {
//             const total = zone.totalEmployees || 0;
//             // The backend `zoneData` sends `present` natively.
//             // If not, fallback to `marked` (which in the backend is also mapped to `present`).
//             const present = Number(zone.present ?? zone.marked ?? 0) || 0;
//             const onLeave = zone.onLeave || zone.on_leave || 0;
//             let absent = zone.notMarked || 0;
//             if (total > 0) {
//               absent = Math.max(total - present - onLeave, 0);
//             }

//             const pct = total > 0 ? Math.round((present / total) * 100) : 0;
//             const barColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
//             return (
//               <div key={zone.zone_id} className="bg-white dark:bg-slate-900 rounded-lg px-4 py-3 shadow-sm border border-blue-100">
//                 <div className="flex items-center justify-between mb-2">
//                   <span className="text-sm font-semibold text-gray-800 dark:text-white dark:text-white truncate max-w-[60%]">{zone.zone_name}</span>
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs text-gray-400 dark:text-slate-500">{total} emp</span>
//                     <RatePill value={present} total={total} />
//                   </div>
//                 </div>
//                 {/* Progress bar */}
//                 <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
//                   <div
//                     className="h-2 rounded-full transition-all duration-500"
//                     style={{ width: `${pct}%`, background: barColor }}
//                   />
//                 </div>
//                 {/* Mini stat row */}
//                 <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
//                   <span>✅ <b className="text-green-700">{present}</b> present</span>
//                   <span>💼 <b className="text-amber-600">{onLeave}</b> on leave</span>
//                   <span>❌ <b className="text-red-600">{absent}</b> absent</span>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

// // ── Main component ─────────────────────────────────────────────────────────
// function CityAttendanceLineChart({ citySummary, loading, dashboardPayload }) {
//   const lineData = useMemo(() => transformCitySummary(citySummary), [citySummary]);
//   const hasData = lineData.some((entry) => entry.total > 0);

//   const [selectedCity, setSelectedCity] = useState(null); // { city, city_id }
//   const [zoneData, setZoneData] = useState([]);
//   const [zoneLoading, setZoneLoading] = useState(false);

//   const handleBarClick = useCallback(
//     async (data) => {
//       if (!data?.activePayload?.[0]?.payload) return;
//       const city = data.activePayload[0].payload;
//       if (selectedCity?.city === city.city) {
//         setSelectedCity(null);
//         setZoneData([]);
//         return;
//       }
//       setSelectedCity(city);
//       setZoneData([]);
//       setZoneLoading(true);

//       try {
//         const token = localStorage.getItem("token");
//         const body = {
//           ...(dashboardPayload || {}),
//           city_id: city.city_id,
//         };
//         const resp = await fetch(ZONE_SUMMARY_ENDPOINT, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             ...(token ? { Authorization: `Bearer ${token}` } : {}),
//           },
//           body: JSON.stringify(body),
//         });
//         const payload = await resp.json();
//         setZoneData(Array.isArray(payload?.data) ? payload.data : []);
//       } catch {
//         setZoneData([]);
//       } finally {
//         setZoneLoading(false);
//       }
//     },
//     [selectedCity, dashboardPayload]
//   );

//   return (
//     <div className="bg-white dark:bg-slate-900 shadow-md rounded-2xl mt-5 overflow-hidden border border-gray-100 dark:border-slate-700">
//       {/* Header */}
//       <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
//         <div>
//           <h3 className="text-lg font-bold text-gray-800 dark:text-white dark:text-white">City Attendance Overview</h3>
//           {hasData && (
//             <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
//               {lineData.length} {lineData.length === 1 ? "city" : "cities"} tracked
//               {" • "}
//               <span className="text-blue-600 font-bold animate-pulse bg-blue-50 px-2 py-0.5 rounded inline-block text-[10px] uppercase tracking-wider">
//                 Click a bar to view details
//               </span>
//             </p>
//           )}
//         </div>
//         {/* Legend pills */}
//         {hasData && (
//           <div className="flex items-center gap-3 text-xs">
//             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Present</span>
//             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> On Leave</span>
//             <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Absent</span>
//           </div>
//         )}
//       </div>

//       <div className="p-6">
//         {loading && !hasData && (
//           <div className="h-56 flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm animate-pulse">
//             Loading city data…
//           </div>
//         )}
//         {!loading && !hasData && (
//           <div className="h-56 flex flex-col items-center justify-center text-gray-300 gap-2">
//             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//             </svg>
//             <span className="text-sm">No attendance data for selected filters</span>
//           </div>
//         )}

//         {hasData && (
//           <>
//             {/* City stats summary row */}
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
//               {lineData.slice(0, 8).map((city) => (
//                 <button
//                   key={city.city}
//                   onClick={() => handleBarClick({ activePayload: [{ payload: city }] })}
//                   className={`rounded-xl px-3 py-2.5 text-left transition border ${selectedCity?.city === city.city
//                       ? "border-blue-400 bg-blue-50 shadow-sm"
//                       : "border-gray-100 dark:border-slate-700 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/40"
//                     }`}
//                 >
//                   <div className="flex items-center justify-between">
//                     <p className="text-xs font-semibold text-gray-700 truncate max-w-[75%]">{city.city}</p>
//                     <RatePill value={city.present} total={city.total} />
//                   </div>
//                   <p className="text-lg font-bold text-gray-800 dark:text-white dark:text-white mt-1">{city.total}</p>
//                   <p className="text-xs text-gray-400 dark:text-slate-500">employees</p>
//                 </button>
//               ))}
//             </div>

//             {/* Bar chart */}
//             <ResponsiveContainer width="100%" height={280}>
//               <BarChart
//                 data={lineData}
//                 onClick={handleBarClick}
//                 style={{ cursor: "pointer" }}
//                 barCategoryGap="35%"
//                 barGap={2}
//               >
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
//                 <XAxis
//                   dataKey="city"
//                   tick={{ fontSize: 12, fill: "#6b7280" }}
//                   axisLine={false}
//                   tickLine={false}
//                 />
//                 <YAxis
//                   allowDecimals={false}
//                   tick={{ fontSize: 11, fill: "#9ca3af" }}
//                   axisLine={false}
//                   tickLine={false}
//                 />
//                 <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
//                 <Bar maxBarSize={50} dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]}>
//                   {lineData.map((entry) => (
//                     <Cell
//                       key={entry.city}
//                       fill={selectedCity?.city === entry.city ? "#16a34a" : "#22c55e"}
//                     />
//                   ))}
//                 </Bar>
//                 <Bar maxBarSize={50} dataKey="onLeave" name="On Leave" fill="#f59e0b" radius={[4, 4, 0, 0]}>
//                   {lineData.map((entry) => (
//                     <Cell
//                       key={entry.city}
//                       fill={selectedCity?.city === entry.city ? "#d97706" : "#f59e0b"}
//                     />
//                   ))}
//                 </Bar>
//                 <Bar maxBarSize={50} dataKey="absent" name="Absent" fill="#f87171" radius={[4, 4, 0, 0]}>
//                   {lineData.map((entry) => (
//                     <Cell
//                       key={entry.city}
//                       fill={selectedCity?.city === entry.city ? "#dc2626" : "#f87171"}
//                     />
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>

//             {/* Zone drilldown panel */}
//             {selectedCity && (
//               <ZoneDrilldownPanel
//                 cityName={selectedCity.city}
//                 zoneData={zoneData}
//                 loading={zoneLoading}
//                 onClose={() => { setSelectedCity(null); setZoneData([]); }}
//               />
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default CityAttendanceLineChart;

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { buildApiUrl } from "../config";

const ZONE_SUMMARY_ENDPOINT = buildApiUrl("/app/supervisor/wards/zone-summary");

// ── All existing transform logic preserved exactly ────────────────────────
export const transformCitySummary = (summary) => {
  if (!Array.isArray(summary)) return [];
  return summary.map((item) => {
    const present = Number(item.present ?? item.marked ?? 0) || 0;
    const fullyMarked = Number(item.fullyMarked ?? item.fully_marked ?? 0) || 0;
    const inProgress = Number(item.inProgress ?? item.in_progress ?? item.pending ?? 0) || 0;
    const onLeave = Number(item.onLeave ?? item.on_leave ?? 0) || 0;
    const rawNotMarked = Number(item.notMarked ?? item.not_marked ?? item.absent ?? 0) || 0;
    const apiTotalEmployees = Number(
      item.totalEmployees ?? item.total_employees ?? item.totalEmployeesCount ?? item.total ?? 0
    );

    let absent, finalTotal;
    if (apiTotalEmployees > 0) {
      absent = Math.max(apiTotalEmployees - present - onLeave, 0);
      finalTotal = apiTotalEmployees;
    } else {
      absent = Math.max(rawNotMarked, 0);
      finalTotal = present + absent + onLeave;
    }

    return {
      city: item.city_name ?? item.cityName ?? item.city ?? "Unassigned",
      city_id: item.city_id ?? null,
      present,
      absent,
      onLeave,
      marked: fullyMarked,
      inProgress,
      notMarked: absent,
      total: finalTotal,
    };
  });
};

// ── Attendance rate pill ──────────────────────────────────────────────────
const RatePill = ({ value, total }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const { bg, text } =
    pct >= 80
      ? { bg: "bg-emerald-100 border-emerald-200", text: "text-emerald-700" }
      : pct >= 50
        ? { bg: "bg-amber-100 border-amber-200", text: "text-amber-700" }
        : { bg: "bg-rose-100 border-rose-200", text: "text-rose-700" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${bg} ${text}`}
    >
      {pct}%
    </span>
  );
};

// ── Custom tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 shadow-2xl rounded-2xl p-4 min-w-[200px] text-sm">
      <p className="font-bold text-gray-800 dark:text-white dark:text-white mb-3 text-sm border-b border-gray-100 dark:border-slate-700 pb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1.5">
          <span className="flex items-center gap-2 text-xs text-gray-600">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: p.fill }}
            />
            {p.name}
          </span>
          <span className="font-bold text-gray-800 dark:text-white dark:text-white text-xs tabular-nums">{p.value}</span>
        </div>
      ))}
      {total > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between text-xs font-bold text-gray-700">
          <span>Total</span>
          <span>{total}</span>
        </div>
      )}
    </div>
  );
};

// ── Skeleton loader for city cards ────────────────────────────────────────
const CityCardSkeleton = () => (
  <div className="rounded-xl px-3 py-2.5 border border-gray-100 dark:border-slate-700 bg-gray-50 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="h-4 w-9 bg-gray-200 rounded-full" />
    </div>
    <div className="h-6 bg-gray-200 rounded w-1/3 mt-1 mb-1" />
    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
  </div>
);

// ── Animated progress bar ─────────────────────────────────────────────────
const AnimatedBar = ({ pct, color }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      setTimeout(() => { el.style.width = `${pct}%`; }, 60);
    });
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        ref={ref}
        className="h-1.5 rounded-full"
        style={{
          background: color,
          transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </div>
  );
};

// ── Zone drilldown panel ──────────────────────────────────────────────────
function ZoneDrilldownPanel({ cityName, zoneData, loading, onClose }) {
  return (
    <div
      className="mt-5 border border-blue-100 rounded-2xl bg-gradient-to-br
from-blue-50/80
to-indigo-50/60

dark:from-slate-900
dark:to-slate-800 p-5 relative"
      style={{
        animation: "slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-blue-200 flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            {cityName} — Zone Breakdown
          </h4>
          <p className="text-[11px] text-blue-400 mt-0.5 ml-7">Workforce presence by zone for selected date range</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:bg-white dark:bg-slate-900/70 transition-all duration-150 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* States */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-blue-100 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded-full w-12" />
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : !zoneData.length ? (
        <div className="h-28 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 gap-2">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="text-sm">No zone data available</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {zoneData.map((zone, idx) => {
            const total = zone.totalEmployees || 0;
            const present = Number(zone.present ?? zone.marked ?? 0) || 0;
            const onLeave = zone.onLeave || zone.on_leave || 0;
            const absent = total > 0 ? Math.max(total - present - onLeave, 0) : zone.notMarked || 0;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;
            const barColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

            return (
              <div
                key={zone.zone_id}
                className="bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-blue-100/80 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                style={{ animation: `fadeInUp 0.3s ease both`, animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-gray-800 dark:text-white dark:text-white truncate max-w-[60%]">
                    {zone.zone_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">{total} emp</span>
                    <RatePill value={present} total={total} />
                  </div>
                </div>
                <AnimatedBar pct={pct} color={barColor} />
                <div className="flex gap-4 mt-2 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <b className="text-emerald-700 font-semibold">{present}</b> present
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    <b className="text-amber-600 font-semibold">{onLeave}</b> on leave
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                    <b className="text-rose-600 font-semibold">{absent}</b> absent
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
function CityAttendanceLineChart({
  citySummary,
  loading,
  dashboardPayload,
  summary
}) {
  const lineData = useMemo(() => transformCitySummary(citySummary), [citySummary]);
  const hasData = lineData.some((entry) => entry.total > 0);

  const [selectedCity, setSelectedCity] = useState(null);
  const [zoneData, setZoneData] = useState([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [hoveredCity, setHoveredCity] = useState(null);
useEffect(() => {
  if (lineData?.length > 0) {
    const city = lineData[0];

    setSelectedCity(city);
    fetchZoneData(city);
  }
}, [lineData]);
// useEffect(() => {

//   if (!selectedCity) return;

//   handleBarClick({
//     activePayload: [
//       {
//         payload: selectedCity,
//       },
//     ],
//   });

// }, [selectedCity]);
const fetchZoneData = async (city) => {

  if (!city) return;

  setZoneLoading(true);

  try {

    const token =
      localStorage.getItem("token");

    const body = {
      ...(dashboardPayload || {}),
      city_id: city.city_id,
    };
console.log("========== CITY CLICK ==========");
console.log("Selected City:", city);
console.log("City ID:", city.city_id);
console.log("Request Body:", body);
    const resp = await fetch(
      ZONE_SUMMARY_ENDPOINT,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },

        body: JSON.stringify(body),
      }
    );

    const payload =
      await resp.json();
console.log("Zone API Response:", payload);
    setZoneData(
      Array.isArray(payload?.data)
        ? payload.data
        : []
    );

  } catch {

    setZoneData([]);

  } finally {

    setZoneLoading(false);

  }

};
const handleBarClick = useCallback(
  async (data) => {

    if (
      !data?.activePayload?.[0]?.payload
    ) return;

    const city =
      data.activePayload[0].payload;

    setSelectedCity(city);

    fetchZoneData(city);

  },
  [dashboardPayload]
);
  // Summary stats for header chips
 const totals = useMemo(() => ({
  present:
    Number(summary?.marked || 0) +
    Number(summary?.inProgress || 0),

  onLeave:
    Number(summary?.onLeave || 0),

  absent:
    Number(summary?.notMarked || 0),

  total:
    Number(summary?.totalEmployees || 0),
}), [summary]);

  return (
    <div className="
bg-white dark:bg-slate-900
rounded-2xl
overflow-hidden
border
border-gray-100 dark:border-slate-700
shadow-sm

dark:bg-slate-900
dark:border-slate-700
">
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">              City Attendance Overview
            </h3>
            {hasData && (
<p className="text-xs text-gray-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-0.5">                {lineData.length} {lineData.length === 1 ? "city" : "cities"} tracked
                {" · "}
                <span className="text-blue-500 font-medium">click a bar or card for zone breakdown</span>
              </p>
            )}
          </div>

          {/* Summary chips */}
          {/* {hasData && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {totals.present.toLocaleString()} present
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {totals.onLeave.toLocaleString()} on leave
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {totals.absent.toLocaleString()} absent
              </span>
            </div>
          )} */}
        </div>
      </div>

      {/* ── Body ── */}

      <div className="p-6">

        {/* Loading skeleton */}
        {loading && !hasData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[1, 2, 3, 4].map((i) => <CityCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasData && (
          <div className="h-56 flex flex-col items-center justify-center text-gray-300 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 dark:border-slate-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm text-gray-400 dark:text-slate-500">No attendance data for selected filters</span>
          </div>
        )}

        {hasData && (
          <>
            {/* City stats summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {lineData.slice(0, 8).map((city) => (
                <button
                  key={city.city}
                  onClick={() => handleBarClick({ activePayload: [{ payload: city }] })}
                  className={`rounded-xl px-3 py-2.5 text-left transition border ${selectedCity?.city === city.city
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : "border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700 truncate max-w-[75%]">{city.city}</p>
               {/* <RatePill
  value={
    Number(summary?.marked || 0) +
    Number(summary?.inProgress || 0) +
    Number(summary?.onLeave || 0)
  }
  total={Number(summary?.totalEmployees || city.total)}
/> */}
<RatePill
  value={city.present + city.onLeave}
  total={city.total}
/>

<p className="text-lg font-bold text-gray-800 mt-1">
  {city.total.toLocaleString()}
</p>
                  </div>
             <p className="text-lg font-bold text-gray-800 mt-1">
  {city.present.toLocaleString()}
</p>
                  <p className="text-xs text-gray-400">Present Employees</p>
                </button>
              ))}
            </div>

            {/* ── Bar chart ── */}
            {/* <div
              className="rounded-xl bg-gray-50/50 border border-gray-100 dark:border-slate-700 p-4"
              style={{ animation: "fadeInUp 0.4s ease both", animationDelay: "200ms" }}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={lineData}
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
                  barCategoryGap="38%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="city"
                    tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#d1d5db" }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(99,102,241,0.04)", rx: 6 }}
                    animationDuration={150}
                  />

                
                  <Bar maxBarSize={44} dataKey="present" name="Present" fill="#34d399" radius={[5, 5, 0, 0]}>
                    {lineData.map((entry) => (
                      <Cell
                        key={entry.city}
                        fill={selectedCity?.city === entry.city ? "#059669" : "#34d399"}
                        opacity={selectedCity && selectedCity.city !== entry.city ? 0.5 : 1}
                      />
                    ))}
                  </Bar>

                 
                  <Bar maxBarSize={44} dataKey="onLeave" name="On Leave" fill="#fbbf24" radius={[5, 5, 0, 0]}>
                    {lineData.map((entry) => (
                      <Cell
                        key={entry.city}
                        fill={selectedCity?.city === entry.city ? "#d97706" : "#fbbf24"}
                        opacity={selectedCity && selectedCity.city !== entry.city ? 0.5 : 1}
                      />
                    ))}
                  </Bar>

                  
                  <Bar maxBarSize={44} dataKey="absent" name="Absent" fill="#fb7185" radius={[5, 5, 0, 0]}>
                    {lineData.map((entry) => (
                      <Cell
                        key={entry.city}
                        fill={selectedCity?.city === entry.city ? "#e11d48" : "#fb7185"}
                        opacity={selectedCity && selectedCity.city !== entry.city ? 0.5 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* STATUS LEGEND CARDS */}
        <div
  className="
grid
grid-cols-1
xl:grid-cols-[1fr_750px]

gap-6

items-start

w-full

"
>
  {/* LEFT SIDE */}
<div
  className="
flex

items-start

gap-10

pt-2
"
>
    {/* DONUT */}

    <div
      className="
flex
items-center
justify-center
h-[340px]
"
    >
      <div
        className="
w-[300px]
h-[300px]
shrink-0
cursor-pointer
"
        onClick={() => {
          if (lineData?.[0]) {
            handleBarClick({
              activePayload: [
                {
                  payload: lineData[0],
                },
              ],
            });
          }
        }}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={[
                {
                  name: "Present",
                  value: totals.present,
                  color: "#34d399",
                },

                {
                  name: "On Leave",
                  value: totals.onLeave,
                  color: "#fbbf24",
                },

                {
                  name: "Absent",
                  value: totals.absent,
                  color: "#fb7185",
                },
              ]}
              dataKey="value"
              nameKey="name"
              innerRadius={90}
              outerRadius={125}
              paddingAngle={4}
              stroke="none"
            >
              {[
                "#34d399",
                "#fbbf24",
                "#fb7185",
              ].map((color, index) => (
                <Cell
                  key={index}
                  fill={color}
                />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => [
                value.toLocaleString(),
                "Employees",
              ]}
            />

            {/* CENTER */}

            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: "30px",
                fontWeight: 800,

                fill:
                  document.documentElement.classList.contains(
                    "dark"
                  )
                    ? "#ffffff"
                    : "#0f172a",
              }}
            >
              {totals.total.toLocaleString()}
            </text>

            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "2px",

                fill:
                  document.documentElement.classList.contains(
                    "dark"
                  )
                    ? "#64748b"
                    : "#94a3b8",
              }}
            >
              TOTAL
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* STATUS CARDS */}

    {hasData && (
      <div
        className="
flex
flex-col
gap-3

w-full
w-[300px]
"
      >
        {[
          {
            name: "Present",
            value: totals.present,
            color: "#34d399",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
          },

          {
            name: "On Leave",
            value: totals.onLeave,
            color: "#fbbf24",
            bg: "bg-amber-50",
            border: "border-amber-100",
          },

          {
            name: "Absent",
            value: totals.absent,
            color: "#fb7185",
            bg: "bg-rose-50",
            border: "border-rose-100",
          },
        ].map((item, index) => {

          const percentage =
            totals.total
              ? (
                  (
                    item.value /
                    totals.total
                  ) * 100
                ).toFixed(1)
              : 0;

          return (
            <div
              key={index}
              className={`
flex
items-center
justify-between

rounded-2xl
border

px-5
py-5

shadow-sm
transition-all

hover:shadow-md

${item.bg}
${item.border}

dark:bg-slate-800
dark:border-slate-700
`}
            >
              <div className="flex items-center gap-3">

                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      item.color,
                  }}
                />

                <div>
                  <p
                    className="
text-sm
font-semibold

text-slate-700
dark:text-white
"
                  >
                    {item.name}
                  </p>

                  <p
                    className="
text-xs
font-medium

text-slate-400
dark:text-slate-500
"
                  >
                    {item.value.toLocaleString()} employees
                  </p>
                </div>
              </div>

              <span
                className="
text-sm
font-bold

text-slate-500
dark:text-slate-300
"
              >
                {percentage}%
              </span>
            </div>
          );

        })}
      </div>
    )}
  </div>

  {/* RIGHT PANEL */}

  <div
  className="
h-[330px]

overflow-y-auto

pr-2

custom-scrollbar
"
>
    <ZoneDrilldownPanel
      cityName={
        selectedCity?.city ||
        lineData?.[0]?.city ||
        "Pune"
      }

      zoneData={zoneData}

      loading={zoneLoading}

      onClose={() => {}}
    />
  </div>
</div>


          </>
        )}
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div >
  );
}

export default CityAttendanceLineChart;