// import React, { useMemo, useState } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   ResponsiveContainer,
//   Cell,
// } from "recharts";

// const BAR_COLORS = [
//   "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
//   "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899",
//   "#14b8a6", "#a855f7", "#0ea5e9", "#eab308", "#d946ef",
// ];

// const ROLE_COLORS = [
//   "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
//   "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
// ];

// const CustomTooltip = ({ active, payload, label, type }) => {
//   if (!active || !payload || !payload.length) return null;

//   if (type === "zone") {
//     const data = payload[0].payload;
//     return (
//       <div className="bg-slate-800 text-white rounded-lg shadow-xl px-4 py-3 text-sm pointer-events-none">
//         <div className="font-bold text-base mb-1.5 border-b border-slate-700 pb-1">{data.zone}</div>
//         <div className="flex flex-col gap-1 text-slate-300 mt-2">
//           <div className="flex justify-between gap-4">
//             <span className="text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Employees:</span>
//             <span className="text-white font-bold">{data.total}</span>
//           </div>
//           <div className="flex justify-between gap-4">
//             <span className="text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">Total Kothis:</span>
//             <span className="text-amber-400 font-bold">{data.kothiCount}</span>
//           </div>
//         </div>
//         <div className="mt-3 text-[10px] text-indigo-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
//           <span>Click to View Kothi Details</span>
//           <span className="animate-bounce">↓</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[180px]">
//       <div className="font-bold text-slate-800 dark:text-white dark:text-white mb-2 border-b pb-1">{label}</div>
//       <div className="space-y-1">
//         {payload.map((entry, index) => (
//           <div key={index} className="flex justify-between items-center text-xs">
//             <div className="flex items-center gap-1.5">
//               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
//               <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{entry.name}:</span>
//             </div>
//             <span className="font-bold text-slate-700">{entry.value}</span>
//           </div>
//         ))}
//         <div className="border-t mt-1 pt-1 flex justify-between items-center text-xs font-bold text-slate-900">
//           <span>Total:</span>
//           <span>{payload.reduce((sum, p) => sum + (p.value || 0), 0)}</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// const KothiRoleChart = ({ wards }) => {
//   const [selectedZone, setSelectedZone] = useState(null);

//   // ---- Level 1: Zone-level summary ----
//   const zoneSummary = useMemo(() => {
//     if (!Array.isArray(wards) || wards.length === 0) return [];
//     const map = {};
//     wards.forEach(w => {
//       // Robust field checking
//       const zName = w.zone || w.zone_name || w.zoneName || (w.city_name ? `Zone (${w.city_name})` : "Unassigned Zone");
//       const kName = w.ward_name || w.name || w.wardName || "Kothi";

//       if (!map[zName]) {
//         map[zName] = { zone: zName, total: 0, kothis: new Set() };
//       }
//       map[zName].kothis.add(kName);

//       const employees = Array.isArray(w.employees) ? w.employees : [];
//       if (employees.length > 0) {
//         map[zName].total += employees.length;
//       } else {
//         const headcount = Number(w.totalEmployees || w.total_employees || w.count || 0);
//         map[zName].total += headcount;
//       }
//     });

//     return Object.values(map)
//       .map(z => ({ ...z, kothiCount: z.kothis.size }))
//       .filter(z => z.total > 0 || z.kothiCount > 0)
//       .sort((a, b) => a.zone.localeCompare(b.zone, undefined, { numeric: true, sensitivity: 'base' }));
//   }, [wards]);

//   // ---- Level 2: Kothi breakdown for selected Zone ----
//   const { kothiDetailData, roles } = useMemo(() => {
//     if (!selectedZone || !Array.isArray(wards)) return { kothiDetailData: [], roles: [] };

//     const roleSet = new Set();
//     const map = {};

//     wards.filter(w => (w.zone || w.zone_name || w.zoneName || "Unassigned Zone") === selectedZone)
//       .forEach(w => {
//         const kName = w.ward_name || w.name || w.wardName || "Kothi";
//         if (!map[kName]) map[kName] = { name: kName, total: 0 };

//         const employees = Array.isArray(w.employees) ? w.employees : [];
//         employees.forEach(e => {
//           const role = e.designation || e.designation_name || "Unknown Role";
//           roleSet.add(role);
//           map[kName][role] = (map[kName][role] || 0) + 1;
//           map[kName].total += 1;
//         });

//         if (employees.length === 0) {
//           const totalCount = Number(w.totalEmployees || w.total_employees || w.count || 0);
//           if (totalCount > 0) {
//             map[kName]["Staff"] = (map[kName]["Staff"] || 0) + totalCount;
//             map[kName].total += totalCount;
//             roleSet.add("Staff");
//           }
//         }
//       });

//     return {
//       kothiDetailData: Object.values(map).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })),
//       roles: Array.from(roleSet).sort()
//     };
//   }, [wards, selectedZone]);

//   const detailsRef = React.useRef(null);

//   React.useEffect(() => {
//     if (selectedZone && detailsRef.current) {
//       setTimeout(() => {
//         detailsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
//       }, 150);
//     }
//   }, [selectedZone]);

//   if (!wards || (Array.isArray(wards) && wards.length === 0)) return null;

//   const handleZoneClick = (state) => {
//     if (state && state.activePayload && state.activePayload[0]) {
//       setSelectedZone(state.activePayload[0].payload.zone);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* MAIN ZONE CHART */}
//       <div
//         className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 flex flex-col"
//         style={{ minHeight: '450px' }}
//       >
//         <div className="flex items-center justify-between mb-6 shrink-0">
//           <div>
//             <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white dark:text-white uppercase">
//               Zone Distribution
//             </h3>
//             <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-0.5 animate-pulse bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded inline-block">
//               Click a bar to view details
//             </p>
//           </div>
//         </div>

//         <div className="flex-1 relative" style={{ minHeight: '360px' }}>
//           {zoneSummary.length === 0 ? (
//             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-100">
//               <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//               </svg>
//               <span className="text-sm font-semibold">No distribution data available</span>
//             </div>
//           ) : (
//             <ResponsiveContainer width="100%" height={360}>
//               <BarChart
//                 data={zoneSummary}
//                 margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
//                 onClick={handleZoneClick}
//                 style={{ cursor: "pointer" }}
//               >
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                 <XAxis
//                   dataKey="zone"
//                   tick={{ fontSize: 11, fill: "#475569", fontWeight: 700 }}
//                   interval={0}
//                   height={50}
//                   axisLine={{ stroke: '#e2e8f0' }}
//                   tickLine={false}
//                 />
//                 <YAxis
//                   tick={{ fontSize: 11, fill: document.documentElement.classList.contains("dark")
  // ?"#64748b"
  // : "#94a3b8", fontWeight: 600 }}
//                   axisLine={false}
//                   tickLine={false}
//                   width={30}
//                 />
//                 <Tooltip content={<CustomTooltip type="zone" />} cursor={{ fill: "rgba(99, 102, 241, 0.04)" }} />
//                 <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={60}>
//                   {zoneSummary.map((entry, index) => (
//                     <Cell
//                       key={`cell-${index}`}
//                       fill={BAR_COLORS[index % BAR_COLORS.length]}
//                       className="hover:opacity-90 transition-all cursor-pointer hover:drop-shadow-md"
//                       style={{ transition: 'all 0.3s ease' }}
//                       opacity={selectedZone && selectedZone !== entry.zone ? 0.3 : 1}
//                     />
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </div>
//       </div>

//       {/* DRILL DOWN CHART (OPENS BELOW) */}
//       {selectedZone && (
//         <div
//           ref={detailsRef}
//           className="
// bg-white
// dark:bg-slate-900
// rounded-xl
// shadow-lg
// border
// border-slate-100
// dark:border-slate-700
// border-t-4
// border-t-indigo-500
// p-6
// flex
// flex-col
// relative
// animate-fade-in-up

//           style={{ minHeight: '450px' }}
//         >
//           <button
//             onClick={() => setSelectedZone(null)}
//             className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-500 rounded-full transition-colors z-10"
//             title="Close Details"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
//               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>

//           <div className="flex items-center justify-between mb-6 shrink-0 pr-12">
//             <div>
//               <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white dark:text-white uppercase flex items-center gap-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-indigo-500" strokeWidth={2.5}>
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
//                 </svg>
//                 {selectedZone} Details
//               </h3>
//               <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5 ml-7">
//                 Headcount by Kothi and Role
//               </p>
//             </div>
//             <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-full border border-indigo-100 uppercase tracking-tight">
//               {kothiDetailData.length} Kothis
//             </div>
//           </div>

//           <div className="flex-1 relative" style={{ minHeight: '360px' }}>
//             {kothiDetailData.length === 0 ? (
//               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-100">
//                 <span className="text-sm font-semibold">No Kothi data for {selectedZone}</span>
//               </div>
//             ) : (
//               <ResponsiveContainer width="100%" height={500}>
//                 <BarChart
//                   data={kothiDetailData}
//                   margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
//                 >
//                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                   <XAxis
//                     type="category"
//                     dataKey="name"
//                     hide={true}
//                   />
//                   <YAxis
//                     type="number"
//                     tick={{ fontSize: 11, fill: document.documentElement.classList.contains("dark")
//  ?"#64748b"
 // : "#94a3b8", fontWeight: 600 }}
//                     axisLine={false}
//                     tickLine={false}
//                     width={40}
//                     allowDecimals={false}
//                   />
//                   <Tooltip content={<CustomTooltip type="kothi" />} cursor={{ fill: "rgba(99, 102, 241, 0.04)" }} />
//                   <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "11px", fontWeight: 700 }} />
//                   {roles.map((role, idx) => (
//                     <Bar
//                       key={role}
//                       dataKey={role}
//                       stackId="a"
//                       fill={ROLE_COLORS[idx % ROLE_COLORS.length]}
//                       radius={idx === roles.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
//                       maxBarSize={40}
//                     />
//                   ))}
//                 </BarChart>
//               </ResponsiveContainer>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default KothiRoleChart;


import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const BAR_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#06b6d4",
  "#ec4899",
];

const ROLE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
];

const CustomTooltip = ({ active, payload, label, type }) => {
  if (!active || !payload || !payload.length) return null;

  if (type === "zone") {
    const data = payload[0].payload;

    return (
      <div className="
bg-white
dark:bg-slate-900
border
border-slate-200
dark:border-slate-700
rounded-xl
shadow-xl
px-4
py-3
text-sm
">
        <div className="font-bold text-slate-800 dark:text-white dark:text-white mb-2">
          {data.zone}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between gap-6">
            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Total Employees
            </span>
            <span className="font-bold text-slate-800 dark:text-white dark:text-white">
              {data.total}
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Total Kothis
            </span>
            <span className="font-bold text-indigo-600">
              {data.kothiCount}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xl p-3 min-w-[180px]">
      <div className="font-bold text-slate-800 dark:text-white dark:text-white mb-2 border-b pb-1">
        {label}
      </div>

      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div
            key={index}
            className="flex justify-between items-center text-xs"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              ></div>

              <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {entry.name}:
              </span>
            </div>

            <span className="font-bold text-slate-700">
              {entry.value}
            </span>
          </div>
        ))}

        <div className="border-t mt-1 pt-1 flex justify-between items-center text-xs font-bold text-slate-900">
          <span>Total:</span>

          <span>
            {payload.reduce(
              (sum, p) => sum + (p.value || 0),
              0
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

const KothiRoleChart = ({ wards }) => {
  const [selectedZone, setSelectedZone] =
    useState(null);

  // ---------------- ZONE SUMMARY ----------------

  const zoneSummary = useMemo(() => {
    if (!Array.isArray(wards) || wards.length === 0)
      return [];

    const map = {};

    wards.forEach((w) => {
      const zName =
        w.zone ||
        w.zone_name ||
        w.zoneName ||
        (w.city_name
          ? `Zone (${w.city_name})`
          : "Unassigned Zone");

      const kName =
        w.ward_name ||
        w.name ||
        w.wardName ||
        "Kothi";

      if (!map[zName]) {
        map[zName] = {
          zone: zName,
          total: 0,
          kothis: new Set(),
        };
      }

      map[zName].kothis.add(kName);

      const employees = Array.isArray(w.employees)
        ? w.employees
        : [];

      if (employees.length > 0) {
        map[zName].total += employees.length;
      } else {
        const headcount = Number(
          w.totalEmployees ||
          w.total_employees ||
          w.count ||
          0
        );

        map[zName].total += headcount;
      }
    });

    return Object.values(map)
      .map((z) => ({
        ...z,
        kothiCount: z.kothis.size,
      }))
      .filter(
        (z) => z.total > 0 || z.kothiCount > 0
      )
      .sort((a, b) =>
        a.zone.localeCompare(b.zone, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
  }, [wards]);

  // ---------------- DETAILS ----------------

  const { kothiDetailData, roles } = useMemo(() => {
    if (!selectedZone || !Array.isArray(wards))
      return {
        kothiDetailData: [],
        roles: [],
      };

    const roleSet = new Set();
    const map = {};

    wards
      .filter(
        (w) =>
          (w.zone ||
            w.zone_name ||
            w.zoneName ||
            "Unassigned Zone") === selectedZone
      )
      .forEach((w) => {
        const kName =
          w.ward_name ||
          w.name ||
          w.wardName ||
          "Kothi";

        if (!map[kName]) {
          map[kName] = {
            name: kName,
            total: 0,
          };
        }

        const employees = Array.isArray(
          w.employees
        )
          ? w.employees
          : [];

        employees.forEach((e) => {
          const role =
            e.designation ||
            e.designation_name ||
            "Unknown Role";

          roleSet.add(role);

          map[kName][role] =
            (map[kName][role] || 0) + 1;

          map[kName].total += 1;
        });

        if (employees.length === 0) {
          const totalCount = Number(
            w.totalEmployees ||
            w.total_employees ||
            w.count ||
            0
          );

          if (totalCount > 0) {
            map[kName]["Staff"] =
              (map[kName]["Staff"] || 0) +
              totalCount;

            map[kName].total += totalCount;

            roleSet.add("Staff");
          }
        }
      });

    return {
      kothiDetailData: Object.values(map).sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          )
      ),
      roles: Array.from(roleSet).sort(),
    };
  }, [wards, selectedZone]);

  const detailsRef = React.useRef(null);

  React.useEffect(() => {
    if (selectedZone && detailsRef.current) {
      setTimeout(() => {
        detailsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }
  }, [selectedZone]);

  if (
    !wards ||
    (Array.isArray(wards) && wards.length === 0)
  )
    return null;

  const totalEmployees = zoneSummary.reduce(
    (sum, z) => sum + z.total,
    0
  );

  return (
    <div className="space-y-6">
      {/* ================= DONUT CHART ================= */}

      <div className="
bg-white
dark:bg-slate-900
rounded-2xl
shadow-lg
border
border-slate-100
dark:border-slate-700
p-6
">        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white dark:text-white">
              Zone Distribution
            </h3>

            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-0.5 animate-pulse bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded inline-block">
              Click a zone to view details
            </p>
          </div>
        </div>

        {zoneSummary.length === 0 ? (
          <div className="h-[360px] flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
            No distribution data available
          </div>
        ) : (
          <>
            <div className="
rounded-2xl
border
border-slate-200
dark:border-slate-700
shadow-inner
overflow-hidden

bg-gradient-to-r
from-slate-50
via-white
to-slate-50

dark:from-slate-900
dark:via-slate-800
dark:to-slate-900

p-4
flex-1
">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-10 min-h-[400px]">

                {/* DONUT CHART */}
                <div className="w-[320px] h-[320px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={zoneSummary}
                        dataKey="total"
                        nameKey="zone"
                        innerRadius={85}
                        outerRadius={120}
                        paddingAngle={3}
                        stroke="none"
                        onClick={(data) =>
                          setSelectedZone(data.zone)
                        }
                      >
                        {zoneSummary.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              BAR_COLORS[
                              index % BAR_COLORS.length
                              ]
                            }
                            opacity={
                              selectedZone &&
                                selectedZone !== entry.zone
                                ? 0.35
                                : 1
                            }
                            className="cursor-pointer transition-all duration-300 hover:opacity-90"
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        content={<CustomTooltip type="zone" />}
                      />

                      {/* CENTER TOTAL */}

                      <text
                        x="50%"
                        y="48%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: "30px",
                          fontWeight: 800,
                          fill: document.documentElement.classList.contains("dark")
                            ? "#ffffff"
                            : "#0f172a",
                        }}
                      >
                        {totalEmployees.toLocaleString()}
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
                          fill: document.documentElement.classList.contains("dark")
                            ? "#64748b"
                            : "#94a3b8",
                        }}
                      >
                        TOTAL
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* RIGHT SIDE LEGEND */}

                {/* RIGHT SIDE LEGEND */}

                <div className="grid grid-cols-1 gap-3 w-full max-w-[300px]">

                  {zoneSummary.map((zone, index) => {

                    const percentage = (
                      (zone.total / totalEmployees) *
                      100
                    ).toFixed(1);

                    return (
                      <div
  key={zone.zone}
  onClick={() =>
    setSelectedZone(zone.zone)
  }
  className={`
flex
items-center
justify-between
rounded-xl
border
px-4
py-3
shadow-sm
transition-all
duration-300
cursor-pointer
backdrop-blur-sm

${selectedZone === zone.zone
    ? "shadow-md scale-[1.01]"
    : "hover:shadow-md"
  }

dark:bg-slate-800
dark:border-slate-700
`}
  style={{
    backgroundColor:
      document.documentElement.classList.contains("dark")
        ? undefined
        : `${BAR_COLORS[
            index % BAR_COLORS.length
          ]}12`,

    borderColor:
      document.documentElement.classList.contains("dark")
        ? undefined
        : `${BAR_COLORS[
            index % BAR_COLORS.length
          ]}35`,
  }}
>

                        <div className="flex items-center gap-3">

                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                BAR_COLORS[
                                index %
                                BAR_COLORS.length
                                ],
                            }}
                          />

                          <div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-white">                              {zone.zone}
                            </p>

                            <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium">
                              {zone.total.toLocaleString()} employees
                            </p>
                          </div>
                        </div>

                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          {percentage}% of Workforce
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div></div>
          </>
        )}
      </div>

      {/* ================= DETAILS CHART ================= */}

      {selectedZone && (
        <div
          ref={detailsRef}
          className="
bg-white
dark:bg-slate-900
rounded-xl
shadow-lg
border
border-slate-100
dark:border-slate-700
border-t-4
border-t-indigo-500
p-6
flex
flex-col
relative
animate-fade-in-up
"
          style={{ minHeight: "450px" }}
        >
          <button
            onClick={() => setSelectedZone(null)}
            className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-red-500 rounded-full transition-colors z-10"
            title="Close Details"
          >
            ✕
          </button>

          <div className="flex items-center justify-between mb-6 shrink-0 pr-12">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white dark:text-white uppercase">
                {selectedZone} Details
              </h3>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Headcount by Kothi and Role
              </p>
            </div>

            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black rounded-full border border-indigo-100 uppercase tracking-tight">
              {kothiDetailData.length} Kothis
            </div>
          </div>

          <div
            className="flex-1 relative"
            style={{ minHeight: "360px" }}
          >
            {kothiDetailData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500">
                No Kothi data for {selectedZone}
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={500}
              >
                <BarChart
                  data={kothiDetailData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 10,
                    bottom: 80,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />

                  <XAxis
                    type="category"
                    dataKey="name"
                    hide={true}
                  />

                  <YAxis
                    type="number"
                    tick={{
                      fontSize: 11,
                      fill: document.documentElement.classList.contains("dark")
                        ? "#64748b"
                        : "#94a3b8",
                      fontWeight: 600,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip type="kothi" />
                    }
                    cursor={{
                      fill:
                        "rgba(99, 102, 241, 0.04)",
                    }}
                  />

                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  />

                  {roles.map((role, idx) => (
                    <Bar
                      key={role}
                      dataKey={role}
                      stackId="a"
                      fill={
                        ROLE_COLORS[
                        idx %
                        ROLE_COLORS.length
                        ]
                      }
                      radius={
                        idx === roles.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KothiRoleChart;