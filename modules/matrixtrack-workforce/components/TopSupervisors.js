import { useEffect, useState, useCallback, useMemo } from "react";
import { buildApiUrl } from "../config";

const TOP_SUPERVISORS_ENDPOINT = buildApiUrl(
  "/app/supervisor/wards/top-supervisors"
);

const BADGE_STYLES = [
  "bg-amber-100 text-amber-700 border border-amber-300 shadow-sm",
  "bg-slate-200 text-slate-700 border border-slate-300 shadow-sm",
  "bg-orange-100 text-orange-700 border border-orange-300 shadow-sm",
];
const DEFAULT_BADGE = `
bg-white
dark:bg-slate-700

text-slate-400
dark:text-slate-300

border
border-slate-200
dark:border-slate-600
`;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Build last 6 months + "Today" as options */
const buildMonthOptions = () => {
  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const todayYear = Number(istParts.find((p) => p.type === "year").value);
  const todayMonth = Number(istParts.find((p) => p.type === "month").value);
  const todayDay = istParts.find((p) => p.type === "day").value;
  const todayDate = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${todayDay}`;

  const options = [];

  for (let i = 0; i < 6; i++) {
    let m = todayMonth - i;
    let y = todayYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    const monthStr = String(m).padStart(2, "0");
    const startDate = `${y}-${monthStr}-01`;
    // Last day of the month
    const lastDay = new Date(y, m, 0).getDate();
    let endDate = `${y}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
    // If current month, cap to today
    if (i === 0) {
      endDate = todayDate;
    }

    const label = i === 0
      ? `${MONTH_NAMES[m - 1]} ${y} (Current)`
      : `${MONTH_NAMES[m - 1]} ${y}`;

    options.push({ label, value: `${y}-${monthStr}`, startDate, endDate });
  }

  return options;
};

function TopSupervisors({
  startDate: _parentStart,
  endDate: _parentEnd,
  selectedCityId,

  selectedZone,
  setSelectedZone,

  selectedWard,
  setSelectedWard,

  uniqueZones = [],
  uniqueWards = [],

  refreshKey
}) {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [selectedPeriod, setSelectedPeriod] = useState(() => monthOptions[0]?.value || "");
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Resolve dates from selected period
  const { resolvedStart, resolvedEnd, periodLabel } = useMemo(() => {
    const match = monthOptions.find((o) => o.value === selectedPeriod);
    if (match) {
      return {
        resolvedStart: match.startDate,
        resolvedEnd: match.endDate,
        periodLabel: match.label,
      };
    }
    return {
      resolvedStart: _parentStart,
      resolvedEnd: _parentEnd,
      periodLabel: "Selected Date",
    };
  }, [selectedPeriod, monthOptions, _parentStart, _parentEnd]);

 const fetchTopSupervisors = useCallback(async () => {
  const controller = new AbortController();

  setLoading(true);
  setError(null);

  try {
    const token = localStorage.getItem("token");

    const normalizedCityId =
      selectedCityId && selectedCityId !== "ALL"
        ? Number(selectedCityId)
        : null;

    const response = await fetch(
      TOP_SUPERVISORS_ENDPOINT,
      {
        method: "POST",

        signal: controller.signal,

        headers: {
          "Content-Type": "application/json",
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },

        body: JSON.stringify({
          city_id: normalizedCityId,

          startDate: resolvedStart,
          endDate: resolvedEnd,

          selectedZone:
            selectedZone !== "ALL"
              ? selectedZone
              : null,

          selectedWard:
            selectedWard !== "ALL"
              ? selectedWard
              : null,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Unable to load top supervisors."
      );
    }

    const payload = await response.json();

    setSupervisors(
      Array.isArray(payload?.data)
        ? payload.data
        : []
    );
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error(err);

      setError(
        err.message || "Failed to load."
      );

      setSupervisors([]);
    }
  } finally {
    setLoading(false);
  }

  return () => controller.abort();
}, [
  resolvedStart,
  resolvedEnd,
  selectedCityId,
  selectedZone,
  selectedWard,
]);
useEffect(() => {
  const timeout = setTimeout(() => {
    fetchTopSupervisors();
  }, 300);

  return () => clearTimeout(timeout);
}, [fetchTopSupervisors, refreshKey]);

  const periodSelector = (
    <select

  className="
    text-sm

    border
    border-slate-300
    dark:border-slate-700

    rounded-lg
    px-3
    py-1.5

    text-slate-700
    dark:text-white

    bg-slate-50
    dark:bg-slate-800

    hover:bg-white
    dark:hover:bg-slate-700

    focus:outline-none
    focus:ring-2
    focus:ring-blue-500/20
    focus:border-blue-500

    shadow-sm
    transition-all
    cursor-pointer
  "

      value={selectedPeriod}
      onChange={(e) => setSelectedPeriod(e.target.value)}
    >
      {monthOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 border-l-[4px] border-l-blue-500 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Top Performing Supervisors
          </h3>
          {periodSelector}
        </div>
        <div className="h-32 flex items-center justify-center text-sm text-red-500 bg-red-50 rounded-xl border border-dashed border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (loading && supervisors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 border-l-[4px] border-l-blue-500 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Top Performing Supervisors
          </h3>
          {periodSelector}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-200" />
                <div className="w-32 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-16 h-6 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (supervisors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 border-l-[4px] border-l-blue-500 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Top Performing Supervisors
          </h3>
          {periodSelector}
        </div>
        <div className="h-48 flex items-center justify-center text-sm font-medium text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No supervisor data available for this selection.
        </div>
      </div>
    );
  }

  return (
    <div className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

border-l-[4px]
border-l-blue-500

p-6
relative
flex
flex-col
h-full
">
      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 shrink-0">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Top Performing Supervisors
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">
            Ranked by attendance rate • {periodLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {periodSelector}
          <span className="
px-3
py-1
text-xs
font-semibold
rounded-full

bg-blue-50
dark:bg-blue-900/30

text-blue-700
dark:text-blue-300

border
border-blue-100
dark:border-blue-800

shadow-sm
whitespace-nowrap
">
            {supervisors.length} supervisor{supervisors.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div> */}
<div className="mb-5 shrink-0">

  {/* TOP ROW */}
  <div className="flex items-center justify-between gap-3 mb-4">

    {/* TITLE */}
    <div>
      <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
        Top Performing Supervisors
      </h3>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Ranked by attendance rate • {periodLabel}
      </p>
    </div>

    {/* COUNT BADGE */}
    <span
      className="
        px-4
        py-2

        text-sm
        font-semibold

        rounded-full

        bg-blue-50
        dark:bg-blue-900/30

        text-blue-700
        dark:text-blue-300

        border
        border-blue-100
        dark:border-blue-800

        shadow-sm
        whitespace-nowrap
      "
    >
      {supervisors.length} supervisor
      {supervisors.length !== 1
        ? "s"
        : ""}
    </span>
  </div>

  {/* FILTER ROW */}
  <div className="flex flex-wrap items-center gap-3">

    {/* ZONE FILTER */}
  {/* ZONE FILTER */}
<select
  value={selectedZone || "ALL"}
  onChange={(e) => {
    setSelectedZone(e.target.value);
    setSelectedWard("ALL");
  }}
  className="
    min-w-[140px]

    text-sm

    border
    border-slate-300
    dark:border-slate-700

    rounded-xl

    px-4
    py-2.5

    text-slate-700
    dark:text-white

    bg-slate-50
    dark:bg-slate-800

    hover:bg-white
    dark:hover:bg-slate-700

    focus:outline-none
    focus:ring-2
    focus:ring-blue-500/20
    focus:border-blue-500

    shadow-sm
    transition-all
    cursor-pointer
  "
>
  <option value="ALL">
    All Zones
  </option>

  {uniqueZones.map((zone) => (
    <option
      key={zone}
      value={zone}
    >
      {zone}
    </option>
  ))}
</select>

    {/* WARD FILTER */}
   {/* WARD FILTER */}
<select
  value={selectedWard || "ALL"}
  onChange={(e) =>
    setSelectedWard(e.target.value)
  }
  className="
    min-w-[260px]

    text-sm

    border
    border-slate-300
    dark:border-slate-700

    rounded-xl

    px-4
    py-2.5

    text-slate-700
    dark:text-white

    bg-slate-50
    dark:bg-slate-800

    hover:bg-white
    dark:hover:bg-slate-700

    focus:outline-none
    focus:ring-2
    focus:ring-blue-500/20
    focus:border-blue-500

    shadow-sm
    transition-all
    cursor-pointer
  "
>
  <option value="ALL">
    All Wards
  </option>

  {uniqueWards.map((ward) => (
    <option
      key={ward}
      value={ward}
    >
      {ward}
    </option>
  ))}
</select>
    {/* MONTH FILTER */}
    <select
      className="
        min-w-[180px]

        text-sm

        border
        border-slate-300
        dark:border-slate-700

        rounded-xl

        px-4
        py-2.5

        text-slate-700
        dark:text-white

        bg-slate-50
        dark:bg-slate-800

        hover:bg-white
        dark:hover:bg-slate-700

        focus:outline-none
        focus:ring-2
        focus:ring-blue-500/20
        focus:border-blue-500

        shadow-sm
        transition-all
        cursor-pointer
      "
      value={selectedPeriod}
      onChange={(e) =>
        setSelectedPeriod(e.target.value)
      }
    >
      {monthOptions.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
        >
          {opt.label}
        </option>
      ))}
    </select>

    {/* LOADER */}
{loading && supervisors.length > 0 && (      <div
        className="
          w-5
          h-5

          border-2
          border-blue-500
          border-t-transparent

          rounded-full
          animate-spin
        "
      />
    )}
  </div>
</div>
      <div className="mt-4 space-y-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "450px" }}>
        {supervisors.map((supervisor, index) => {
          const badgeClass =
            index < 3 ? BADGE_STYLES[index] : DEFAULT_BADGE;

          const rateColor =
            supervisor.attendance_rate >= 80
              ? "text-emerald-600"
              : supervisor.attendance_rate >= 50
                ? "text-amber-600"
                : "text-red-500";

          return (
            <div
              key={supervisor.supervisor_id || index}
              className="
relative
flex
items-center
justify-between

p-4

bg-slate-50
dark:bg-slate-800

border
border-slate-100
dark:border-slate-700

rounded-xl

hover:bg-blue-50
dark:hover:bg-slate-700

hover:border-blue-200
dark:hover:border-blue-700

transition-colors
group
cursor-default
"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0 ${badgeClass}`}
                >
                  #{index + 1}
                </div>
                <div className="flex flex-col">
                  <span className="
text-sm
font-bold

text-slate-800
dark:text-white

group-hover:text-blue-800
dark:group-hover:text-blue-300

transition-colors
">
                    {supervisor.name}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className={`text-xl font-black ${rateColor}`}>
                  {supervisor.attendance_rate}%
                </div>
                <div className="
text-[10px]
font-bold

text-slate-400
dark:text-slate-500 dark:text-slate-400

uppercase
tracking-wider
">
                  ATTENDANCE RATE
                </div>
              </div>

              {/* Hover Tooltip */}
              <div className="
absolute
left-[4rem]
top-1/2
-translate-y-1/2

z-20

min-w-[220px]
max-w-[320px]

bg-slate-800
dark:bg-slate-900

text-white

rounded
shadow-xl

border
border-slate-700

opacity-0
invisible

group-hover:opacity-100
group-hover:visible

transition-opacity
duration-200

p-3
pointer-events-none
">
                <div className="
absolute
top-1/2
-left-1
-translate-y-1/2

w-2
h-2

bg-slate-800
dark:bg-slate-900

transform
rotate-45
" />
                <div className="font-bold text-sm mb-1.5">
                  {supervisor.name}
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Total Employees:</span>
                    {supervisor.total_employees}
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Present:</span>
                    <span className="text-emerald-400">{supervisor.present}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">On Leave:</span>
                    <span className="text-amber-400">{supervisor.on_leave}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Absent:</span>
                    <span className="text-red-400">{supervisor.absent}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Punch Out:</span>
                    <span className="text-purple-400">
                      {supervisor.fully_marked}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TopSupervisors;
