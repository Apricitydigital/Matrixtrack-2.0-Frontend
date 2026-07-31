import { useMemo } from "react";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

const Plot = createPlotlyComponent(Plotly);

const STATUS_COLORS = {
  Present: "#22c55e",
  "On Leave": "#f59e0b",
  Absent: "#ef4444",
};

const deriveCountsFromSummary = (summary) => {
  if (!summary || typeof summary !== "object") {
    return null;
  }
  const totalEmployees = Number(summary.totalEmployees ?? 0);
  if (!Number.isFinite(totalEmployees) || totalEmployees <= 0) {
    return null;
  }

  const marked = Number(summary.marked ?? 0);
  const inProgress = Number(summary.inProgress ?? 0);
  const notMarked = Number(summary.notMarked ?? 0);
  const onLeave = Number(summary.onLeave ?? 0);
  const present = marked + inProgress;
  const absent = notMarked;

  const total = present + absent + onLeave;
  if (total <= 0) {
    return null;
  }

  return { Present: present, "On Leave": onLeave, Absent: absent };
};

const aggregateStatusCounts = (wards) => {
  const totals = { Present: 0, "On Leave": 0, Absent: 0 };

  if (!Array.isArray(wards)) {
    return totals;
  }

  const seen = new Set();
  wards.forEach((ward) => {
    const employees = Array.isArray(ward.employees) ? ward.employees : [];
    employees.forEach((employee, index) => {
      const rawId =
        employee?.emp_id ??
        employee?.employee_id ??
        employee?.id ??
        employee?.emp_code;
      const wardId = ward?.ward_id ?? ward?.id ?? "ward";
      const fallbackId = employee?.name ? employee.name.trim() : `idx-${index}`;
      const key = `${wardId}:${rawId || fallbackId}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const status = (employee?.attendance_status || "").toLowerCase();
      if (status === "marked" || status === "in progress" || status.includes("progress")) {
        totals.Present += 1;
      } else if (status === "leave" || status.includes("medical") || status.includes("casual")) {
        totals["On Leave"] += 1;
      } else {
        totals.Absent += 1;
      }
    });
  });

  return totals;
};

function AttendanceChart({ summary, wards, loading }) {
  const pieData = useMemo(() => {
    const summaryCounts = deriveCountsFromSummary(summary);
    const counts = summaryCounts || aggregateStatusCounts(wards);
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((entry) => entry.value > 0);
  }, [summary, wards]);

const totalEmployees =
  summary?.totalEmployees ||
  pieData.reduce((sum, item) => sum + item.value, 0);

  const hasData = totalEmployees > 0;

  const statusColors = useMemo(
    () => pieData.map((entry) => STATUS_COLORS[entry.name] || "#3b82f6"),
    [pieData]
  );

  const completionRate = useMemo(() => {
    if (totalEmployees === 0) {
      return 0;
    }
    const marked = pieData.find((item) => item.name === "Present")?.value || 0;
    return Number(((marked / totalEmployees) * 100).toFixed(1));
  }, [pieData, totalEmployees]);

  return (
    <div
  className="
p-5

bg-white
dark:bg-slate-900

shadow-md
dark:shadow-slate-950/30

rounded-lg

mt-5

border
border-slate-200
dark:border-slate-700
"
>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
  Attendance Distribution
</h3>

      </div>

      {loading && !hasData && (
        <div className="
h-48

flex
items-center
justify-center

text-gray-500
dark:text-slate-400
">
          Loading attendance data...
        </div>
      )}

      {!loading && !hasData && (
        <div className="
h-48

flex
items-center
justify-center

text-gray-500
dark:text-slate-400
">
          No attendance data available for the selected supervisor.
        </div>
      )}

      {hasData && (
        <div className="
rounded-2xl

border
border-slate-200
dark:border-slate-700

shadow-lg
dark:shadow-slate-950/30

overflow-hidden

bg-white/70
dark:bg-slate-900/80

backdrop-blur
">
          <div className="
px-5
pt-4
pb-2

flex
items-center
justify-between

bg-gradient-to-r
from-blue-50
via-white
to-emerald-50

dark:from-slate-900
dark:via-slate-900
dark:to-slate-800

border-b
border-slate-100
dark:border-slate-700
">
            <div>
              <p className="
text-xs
uppercase
tracking-[0.15em]

text-slate-400
dark:text-slate-500
">
                Insights
              </p>
            </div>
            <div className="
flex
items-center
gap-2

text-xs
font-medium

text-emerald-700
dark:text-emerald-400

bg-emerald-50
dark:bg-emerald-900/20

border
border-emerald-100
dark:border-emerald-800

px-3
py-1

rounded-full

shadow-sm
dark:shadow-none
">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Status
            </div>
          </div>
          <div className="px-2 sm:px-4 pb-4">
            <Plot
              data={[
                {
                  type: "pie",
                  hole: 0.62,
                  values: pieData.map((item) => item.value),
                  labels: pieData.map((item) => item.name),
                  marker: {
                    colors: statusColors,
                    line: {
  color: document.documentElement.classList.contains("dark")
    ? "#0f172a"
    : "#ffffff",
  width: 3,
},
                    pattern: { shape: "linear", solidity: 0.35, size: 8 },
                  },
                  pull: pieData.map((item) =>
                    item.name === "Absent" ? 0.08 : 0.03
                  ),
                  sort: false,
                  rotation: -45,
                  direction: "clockwise",
                  hoverlabel: {
                bgcolor: document.documentElement.classList.contains("dark")
  ? "#020617"
  : "#0f172a",

bordercolor: document.documentElement.classList.contains("dark")
  ? "#334155"
  : "#0f172a",

font: {
  color: "#ffffff",
  size: 12,
},
                  },
                  hovertemplate:
                    "<b>%{label}</b><br>%{value:,} people<br>%{percent:.1%} of total<extra></extra>",
                  textinfo: "label+percent",
                  textposition: "outside",
                  textfont: {
  size: 13,
  color: document.documentElement.classList.contains("dark")
    ? "#f8fafc"
    : "#0f172a",
},
                  automargin: true,
                  insidetextorientation: "radial",
                },
              ]}
              layout={{
                margin: { l: 24, r: 24, t: 12, b: 40 },
                showlegend: true,
                legend: {
                  orientation: "h",
                  y: -0.2,
                  font: {
  size: 12,
  color: document.documentElement.classList.contains("dark")
    ? "#cbd5e1"
    : "#475569",
},
                  traceorder: "normal",
                },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                annotations: [
                  {
                    text: `${totalEmployees.toLocaleString()}`,
                    x: 0.5,
                    y: 0.52,
                    font: {
                      size: 22,
                      color: document.documentElement.classList.contains("dark")
  ? "#f8fafc"
  : "#0f172a",
                      family: "Inter, system-ui",
                    },
                    showarrow: false,
                  },
                  {
                    text: "Total Employees",
                    x: 0.5,
                    y: 0.46,
                    font: {
  size: 12,
  color: document.documentElement.classList.contains("dark")
    ? "#94a3b8"
    : "#6b7280",
},
                    showarrow: false,
                  },

                ],
              }}
              style={{ width: "100%", height: "360px" }}
              useResizeHandler
              config={{
                displaylogo: false,
                responsive: true,
                modeBarButtonsToRemove: [
                  "select2d",
                  "lasso2d",
                  "toggleSpikelines",
                  "autoScale2d",
                ],
              }}
            />
          </div>
          <div className="
px-4
pb-4

grid
grid-cols-1
sm:grid-cols-3

gap-3

bg-slate-50/70
dark:bg-slate-900/60

border-t
border-slate-100
dark:border-slate-700
">
            {pieData.map((item) => {
              const percent =
                totalEmployees > 0
                  ? Math.round((item.value / totalEmployees) * 100)
                  : 0;
              return (
                <div
                  key={item.name}
                  className="
flex
items-center
gap-3

rounded-lg

border
border-slate-100
dark:border-slate-700

bg-white
dark:bg-slate-800

px-3
py-2

shadow-sm
dark:shadow-none
"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow"
                    style={{ backgroundColor: STATUS_COLORS[item.name] || "#3b82f6" }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {item.name}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {item.value.toLocaleString()} • {percent}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceChart;
