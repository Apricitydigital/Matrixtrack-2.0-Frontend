import { UserCheck, UserX, Calendar } from "lucide-react";

const defaultSummary = {
  totalEmployees: 0,
  totalFaceRegistered: 0,
  totalSupervisors: 0,
  marked: 0,
  inProgress: 0,
  midShiftPunchIn: 0,
  onLeave: 0,
  notMarked: 0,
  attendanceRate: 0,
  autoPunchOut: 0,
  manualPunchOut: 0,
};

const formatNumber = (value) =>
  Number.isFinite(value) ? value.toLocaleString() : "0";

const formatPercentage = (value) =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : "0%";

// ── Stat icons ────────────────────────────────────────────────────────────────
const TotalIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const MarkedIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);



const AbsentIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SupervisorIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const FaceIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h.01M9 9h.01M12 14h.01M7 3h10a2 2 0 012 2v10a6 6 0 01-6 6h-2a6 6 0 01-6-6V5a2 2 0 012-2z" />
  </svg>
);

const RateIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ── Admin colour config ────────────────────────
const CARD_CONFIG = {
  total: { from: "from-blue-600", to: "to-blue-700", icon: <TotalIcon />, glow: "shadow-blue-200" },
  "face-registered": { from: "from-indigo-500", to: "to-indigo-700", icon: <FaceIcon />, glow: "shadow-indigo-200" },
  marked: { from: "from-purple-500", to: "to-violet-600", icon: <MarkedIcon />, glow: "shadow-purple-200" },
  "in-progress": { from: "from-emerald-500", to: "to-green-600", icon: <UserCheck className="w-6 h-6" />, glow: "shadow-green-200" },
  "on-leave": { from: "from-amber-400", to: "to-yellow-500", icon: <Calendar className="w-6 h-6" />, glow: "shadow-amber-200" },
  "not-marked": { from: "from-rose-500", to: "to-red-600", icon: <UserX className="w-6 h-6" />, glow: "shadow-red-200" },
  "mid-shift": { from: "from-amber-500", to: "to-orange-500", icon: <Calendar className="w-6 h-6" />, glow: "shadow-amber-200" },
  supervisors: { from: "from-teal-500", to: "to-cyan-600", icon: <SupervisorIcon />, glow: "shadow-teal-200" },
};

// ── Supervisor colour config ───────────────────────
const SUPERVISOR_CARD_CONFIG = {
  "sup-total": { from: "from-blue-600", to: "to-blue-700", icon: <TotalIcon />, glow: "shadow-blue-200" },
  "sup-face-registered": { from: "from-indigo-500", to: "to-indigo-700", icon: <FaceIcon />, glow: "shadow-indigo-200" },
  "sup-punched-in": { from: "from-emerald-500", to: "to-green-600", icon: <UserCheck className="w-6 h-6" />, glow: "shadow-green-200" },
  "sup-on-leave": { from: "from-amber-400", to: "to-yellow-500", icon: <Calendar className="w-6 h-6" />, glow: "shadow-amber-200" },
  "sup-absent": { from: "from-rose-500", to: "to-red-600", icon: <UserX className="w-6 h-6" />, glow: "shadow-red-200" },
  "sup-punched-out": { from: "from-purple-500", to: "to-violet-600", icon: <MarkedIcon />, glow: "shadow-purple-200" },
  "sup-mid-shift": { from: "from-amber-500", to: "to-orange-500", icon: <Calendar className="w-6 h-6" />, glow: "shadow-amber-200" },
  "sup-supervisors": { from: "from-teal-500", to: "to-cyan-600", icon: <SupervisorIcon />, glow: "shadow-teal-200" },
  "sup-attend-rate": { from: "from-teal-500", to: "to-cyan-600", icon: <RateIcon />, glow: "shadow-teal-200" },
};

function DashboardStats({
  summary,
  loading,
  showSupervisorStat = false,
  supervisorCount,
  supervisorLoading = false,
  onStatusClick,
  supervisorMode = false,
}) {
  const {
    totalEmployees,
    totalFaceRegistered,
    totalSupervisors,
    marked,
    inProgress,
    midShiftPunchIn,
    onLeave,
    notMarked,
    attendanceRate,
    autoPunchOut,
    manualPunchOut,
  } = summary ? { ...defaultSummary, ...summary } : defaultSummary;
  const change = summary?.change || {};
  const presentCount = (marked || 0) + (inProgress || 0);
  const totalAttendancePercent =
    totalEmployees > 0
      ? Number((((presentCount + (onLeave || 0)) / totalEmployees) * 100).toFixed(1))
      : Number.isFinite(attendanceRate)
        ? attendanceRate
        : 0;
  // ── Supervisor card set ────────────────────────────────────────────────────
  if (supervisorMode) {
    const supervisorStats = [
      {
        key: "sup-total",
        trend: change.totalEmployees ?? 0,
        title: "Total Employees",
        value: formatNumber(
          totalEmployees || totalFaceRegistered
        ),
        subLabel: `Total attendance: ${formatPercentage(totalAttendancePercent)}`,
        clickKey: "total",
      },
      {
        key: "sup-punched-in",
        trend: change.present ?? 0,
        title: "Present",
        value: formatNumber((inProgress || 0) + (marked || 0)),
        subLabel: "Punched In",
        clickKey: "present",
      },
      {
        key: "sup-on-leave",
        trend: change.onLeave ?? 0,
        title: "On Leave",
        value: formatNumber(onLeave),
        clickKey: "onLeave",
        subLabel: "On Leave",
      },
      {
        key: "sup-absent",
        trend: change.absent ?? 0,
        title: "Absent",
        value: formatNumber(notMarked),
        subLabel: "Not Punched In",
        clickKey: "notMarked",
      },
      {
        key: "sup-punched-out",
        trend: change.fullyMarked ?? 0,
        title: "Punched Out",
        value: formatNumber(marked || 0),
        subLabel: (autoPunchOut > 0 || manualPunchOut > 0)
          ? `${manualPunchOut} manual • ${autoPunchOut} auto`
          : "Fully marked",
        clickKey: "marked",
      },
      {
        key: "sup-mid-shift",
        trend: change.midShiftPunchIn ?? 0,
        title: "Mid Shift Punch In",
        value: formatNumber(midShiftPunchIn || 0),
        subLabel: "Mid shift records",
        clickKey: "midShiftPunchIn",
      },
      {
        key: "sup-supervisors",
        trend: change.supervisors ?? 0,
        title: "Supervisors",
        value: formatNumber(Number.isFinite(supervisorCount) ? supervisorCount : totalSupervisors),
        subLabel: "Active in system",
        clickKey: "supervisors",
      },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {supervisorStats.map((stat) => {
          const cfg = SUPERVISOR_CARD_CONFIG[stat.key] || SUPERVISOR_CARD_CONFIG["sup-total"];
          const isClickable = !!stat.clickKey && typeof onStatusClick === "function";

          const handleClick = () => {
            if (!isClickable) return;
            onStatusClick(stat.clickKey);
          };

          return (
            <div
              key={stat.key}
              onClick={handleClick}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }
                  : undefined
              }
              className={`
  group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.from} ${cfg.to}
  text-white shadow-lg dark:shadow-none ${cfg.glow}
  transition-all duration-300 flex flex-col justify-between
  ${loading ? "opacity-80" : "opacity-100"}
  ${isClickable
                  ? "cursor-pointer hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/50"
                  : ""
                }
`}
            >
              {/* Decorative circles */}
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -right-2 top-8 w-12 h-12 rounded-full bg-white/10" />

              <div className="relative p-5 flex flex-col h-full">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{stat.title}</p>
                    <div className="h-10 flex items-center">
                      {loading && !summary ? (
                        <span className="block h-8 w-24 rounded-lg bg-white/30 animate-pulse" />
                      ) : (
                        <p className={`text-3xl font-black tracking-tight`}>{stat.value}</p>
                      )}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    {cfg.icon}
                  </div>
                </div>


                <div className="mt-auto">



                  {/* Sparkline */}
                  <svg
                    className="w-full h-6 mt-1 overflow-visible"
                    viewBox="0 0 120 22"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <filter id={`sparkGlow-${stat.key}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <path
                      d="
M0 17
C5 15 10 8 15 10
C20 12 25 18 30 15
C35 12 40 4 45 6
C50 8 55 15 60 13
C65 11 70 6 75 8
C80 10 85 17 90 15
C95 13 100 8 105 10
C110 12 115 16 120 14
"
                      fill="none"
                      stroke="rgba(255,255,255,.92)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={`url(#sparkGlow-${stat.key})`}
                    />
                  </svg>

                </div>

                {/* Sub Label */}
                <div className="text-[11px] text-white/75 font-medium">
                  {stat.subLabel}
                </div>

                {/* Trend */}
                <div
                  className={`flex items-center gap-1 mt-1 text-[11px] font-semibold ${stat.trend > 0
                    ? "text-green-100"
                    : stat.trend < 0
                      ? "text-red-100"
                      : "text-white/90"
                    }`}
                >
                  <span>
                    {stat.trend > 0 ? "↑" : stat.trend < 0 ? "↓" : "→"}
                  </span>

                  <span>{Math.abs(stat.trend).toFixed(1)}%</span>

                  <span className="text-white/80 font-medium">
                    vs yesterday
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Admin card set (completely unchanged) ─────────────────────────────────
  const stats = [
    {
      key: "total",
      title: "Total Employees",
      value: formatNumber(totalEmployees),
      trend: change.totalEmployees ?? 0,
      subLabel: `Total attendance: ${formatPercentage(totalAttendancePercent)}`,
    },
    {
      key: "face-registered",
      title: "Face Registered",
      value: formatNumber(totalFaceRegistered),
      subLabel: "Face registered employees",
    },
    {
      key: "in-progress",
      trend: change.present ?? 0,
      title: "Present",
      value: formatNumber((inProgress || 0) + (marked || 0)),
      subLabel: "Punched In",
    },
    {
      key: "not-marked",
      trend: change.absent ?? 0,
      title: "Absent",
      value: formatNumber(notMarked),
      subLabel: "Not Punched In",
    },

    {
      key: "on-leave",
      trend: change.onLeave ?? 0,
      title: "On Leave",
      value: formatNumber(onLeave),
      subLabel: "On Leave",
    },

    {
      key: "mid-shift",
      trend: change.midShiftPunchIn ?? 0,
      title: "Mid Shift Punch In",
      value: formatNumber(midShiftPunchIn || 0),
      subLabel: "Mid shift records",
    },
    {
      key: "supervisors",
      trend: change.supervisors ?? 0,
      title: "Supervisors",
      value: formatNumber(Number.isFinite(supervisorCount) ? supervisorCount : 0),
      subLabel: "Active in system",
    },


  ];

  const showSkeleton = loading && !summary;
  const clickableKeys = new Set(["total", "face-registered", "marked", "in-progress", "on-leave", "not-marked", "supervisors"]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
      {stats.map((stat) => {
        const cfg = CARD_CONFIG[stat.key] || CARD_CONFIG.total;
        const isSupervisorCard = stat.key === "supervisors";
        const shouldShowSkeleton = isSupervisorCard
          ? supervisorLoading && !Number.isFinite(supervisorCount)
          : showSkeleton;
        const isClickable =
          (clickableKeys.has(stat.key) || isSupervisorCard) && typeof onStatusClick === "function";

        const handleClick = () => {
          if (!isClickable) return;
          const statusMap = {
            "total": "total",
            "face-registered": "faceRegistered",
            marked: "marked",
            "in-progress": "present",
            "not-marked": "notMarked",
            "on-leave": "onLeave",
            "supervisors": "supervisors"
          };
          onStatusClick(statusMap[stat.key]);
        };

        return (
          <div
            key={stat.key}
            onClick={handleClick}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={
              isClickable
                ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }
                : undefined
            }
            className={`
  group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.from} ${cfg.to}
  text-white shadow-lg dark:shadow-none ${cfg.glow}
  transition-all duration-300 flex flex-col justify-between
  ${loading ? "opacity-80" : "opacity-100"}
  ${isClickable
                ? "cursor-pointer hover:shadow-xl dark:hover:shadow-none hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/50"
                : ""
              }
`}
          >
            {/* Decorative circles */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 top-8 w-12 h-12 rounded-full bg-white/10" />

            <div className="relative p-5 flex flex-col h-full">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">{stat.title}</p>
                  <div className="h-10 flex items-center">
                    {shouldShowSkeleton ? (
                      <span className="block h-8 w-24 rounded-lg bg-white/30 animate-pulse" />
                    ) : (
                      <p className={`text-3xl font-black tracking-tight`}>{stat.value}</p>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                  {cfg.icon}
                </div>
              </div>

              <div className="mt-auto border-t border-white/20 pt-2">

                <div className="flex items-center justify-between">

                  <span className="text-xs font-medium text-white/80 truncate">
                    {stat.subLabel || ""}
                  </span>

                  <span
                    className={`text-xs font-bold ${stat.trend > 0
                      ? "text-green-200"
                      : stat.trend < 0
                        ? "text-red-200"
                        : "text-white/80"
                      }`}
                  >
                    {stat.trend > 0
                      ? `▲ ${stat.trend}%`
                      : stat.trend < 0
                        ? `▼ ${Math.abs(stat.trend)}%`
                        : `0%`}
                  </span>

                </div>

                <div className="flex items-center justify-between mt-1">

                  <span className="text-[10px] text-white/70">
                    vs yesterday
                  </span>

                  {isClickable && (
                    <span className="text-[10px] uppercase font-bold text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
                      View →
                    </span>
                  )}

                </div>

              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DashboardStats;
