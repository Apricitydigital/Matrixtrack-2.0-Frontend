import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  Radar,
  RefreshCw,
  Server,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildApiUrl } from "../config";

const HEALTH_ENDPOINT = buildApiUrl("/admin/system-health");
const AUTO_REFRESH_MS = 60 * 1000;

const STATUS_META = {
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    badge:
      "border-emerald-300/70 bg-emerald-50 text-emerald-700   ",
    panel:
      "border-emerald-300/50 bg-emerald-50/80  ",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    badge:
      "border-amber-300/70 bg-amber-50 text-amber-700   ",
    panel:
      "border-amber-300/60 bg-amber-50/80  ",
  },
  critical: {
    label: "Critical",
    icon: ShieldAlert,
    badge:
      "border-rose-300/70 bg-rose-50 text-rose-700   ",
    panel:
      "border-rose-300/60 bg-rose-50/80  ",
  },
  info: {
    label: "Info",
    icon: Activity,
    badge:
      "border-sky-300/70 bg-sky-50 text-sky-700   ",
    panel:
      "border-sky-300/60 bg-sky-50/80  ",
  },
};

const STORAGE_COLORS = ["#0ea5e9", "#2563eb", "#10b981", "#f59e0b", "#f97316"];

const formatBytes = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "N/A";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const normalized = bytes / 1024 ** unitIndex;
  return `${normalized.toFixed(normalized >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatPercent = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toFixed(numeric >= 10 ? 0 : 1)}%`
    : "N/A";
};

const formatCount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat("en-IN").format(numeric)
    : "0";
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDuration = (seconds) => {
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "N/A";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getToneColor = (severity) => {
  if (severity === "critical") return "#e11d48";
  if (severity === "warning") return "#f59e0b";
  if (severity === "healthy") return "#10b981";
  return "#0ea5e9";
};

const getUsageTone = (percent) => {
  const numeric = Number(percent);
  if (!Number.isFinite(numeric)) return "sky";
  if (numeric >= 90) return "rose";
  if (numeric >= 75) return "amber";
  return "emerald";
};

const toneToClasses = {
  rose: "from-rose-500 to-orange-400",
  amber: "from-amber-500 to-yellow-400",
  emerald: "from-emerald-500 to-teal-400",
  sky: "from-sky-500 to-blue-500",
};

const toneTrackClasses = {
  rose: "bg-rose-100 ",
  amber: "bg-amber-100 ",
  emerald: "bg-emerald-100 ",
  sky: "bg-sky-100 ",
};

const buildRequestConfig = () => {
  const token = localStorage.getItem("token");
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

const GlassPanel = ({ children, className = "" }) => (
  <div
    className={`rounded-[30px] border border-slate-200 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] ${className}`}
  >
    {children}
  </div>
);

const PanelHeader = ({ icon: Icon, title, caption, action }) => (
  <div className="mb-5 flex items-start justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {caption ? (
          <p className="mt-1 text-sm text-slate-600">{caption}</p>
        ) : null}
      </div>
    </div>
    {action}
  </div>
);

const MetricChip = ({ label, value, tone = "sky" }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-600">
      {label}
    </div>
    <div className="mt-2 flex items-end gap-2">
      <span className="text-2xl font-semibold text-slate-900">{value}</span>
      <span
        className={`mb-1 inline-block h-2 w-2 rounded-full ${
          tone === "rose"
            ? "bg-rose-500"
            : tone === "amber"
              ? "bg-amber-500"
              : tone === "emerald"
                ? "bg-emerald-500"
                : "bg-sky-500"
        }`}
      />
    </div>
  </div>
);

const ProgressBar = ({ value, tone = "sky" }) => {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`h-2.5 overflow-hidden rounded-full ${toneTrackClasses[tone] || toneTrackClasses.sky}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${toneToClasses[tone] || toneToClasses.sky}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
};

const SmallStat = ({ label, value, helper, tone = "sky", onClick = null }) => (
  <button
    type="button"
    onClick={onClick || undefined}
    className={`w-full rounded-3xl border border-slate-200 bg-white p-5 text-left ${
      onClick ? "transition hover:-translate-y-0.5 hover:shadow-lg" : ""
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-600 ">{label}</div>
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          tone === "rose"
            ? "bg-rose-500"
            : tone === "amber"
              ? "bg-amber-500"
              : tone === "emerald"
                ? "bg-emerald-500"
                : "bg-sky-500"
        }`}
      />
    </div>
    <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 ">
      {value}
    </div>
    {helper ? (
      <div className="mt-2 text-sm text-slate-600 ">{helper}</div>
    ) : null}
  </button>
);

function SystemHealth() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isStorageDrawerOpen, setStorageDrawerOpen] = useState(false);

  const requestConfig = useMemo(() => buildRequestConfig(), []);

  useEffect(() => {
    let active = true;

    const fetchSnapshot = async (silent = false) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const { data } = await axios.get(HEALTH_ENDPOINT, requestConfig);
        if (active) {
          setSnapshot(data);
          setError("");
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError?.response?.data?.error ||
              requestError?.message ||
              "Unable to load health status."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchSnapshot(false);
    const intervalId = window.setInterval(() => fetchSnapshot(true), AUTO_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [requestConfig]);

  const status = snapshot?.summary?.overallStatus || "info";
  const statusMeta = STATUS_META[status] || STATUS_META.info;
  const StatusIcon = statusMeta.icon;
  const alerts = snapshot?.alerts || [];
  const topAlert = alerts[0] || null;
  const database = snapshot?.database;
  const infrastructure = snapshot?.infrastructure;
  // remoteEc2: prefer CloudWatch data, fallback to static env profile from ec2 field
  const remoteEc2 = infrastructure?.remoteEc2 || infrastructure?.ec2 || null;
  const isRemoteEc2 = Boolean(
    remoteEc2 &&
    (infrastructure?.summary?.remoteConfigured || remoteEc2?.instanceId)
  );

  const storageMetrics = useMemo(() => {
    const summary = database?.summary || {};
    const configuredBytes = Number(summary.configuredStorageBytes) || null;
    const footprintBytes =
      Number(summary.actualUsedStorageBytes) ||
      Number(summary.estimatedFootprintBytes) ||
      ((Number(summary.totalBytes) || 0) + (Number(database?.wal?.directoryBytes) || 0)) ||
      0;
    const relationBytes = Number(summary.relationTotalBytes) || Number(summary.totalBytes) || 0;
    const tableBytes = Number(summary.relationTableBytes) || 0;
    const indexBytes = Number(summary.relationIndexBytes) || 0;
    const walBytes = Number(database?.wal?.directoryBytes) || 0;

    const storagePercent = configuredBytes
      ? Math.min(100, ((footprintBytes / configuredBytes) * 100).toFixed(1))
      : null;

    return {
      configuredBytes,
      footprintBytes,
      relationBytes,
      tableBytes,
      indexBytes,
      walBytes,
      storagePercent: storagePercent ? Number(storagePercent) : null,
      freeBytes:
        configuredBytes && footprintBytes <= configuredBytes
          ? configuredBytes - footprintBytes
          : null,
    };
  }, [database]);

  const storageCompositionData = useMemo(() => {
    const rows = [
      { name: "Table data", value: storageMetrics.tableBytes, fill: STORAGE_COLORS[0] },
      { name: "Indexes", value: storageMetrics.indexBytes, fill: STORAGE_COLORS[1] },
      { name: "WAL", value: storageMetrics.walBytes, fill: STORAGE_COLORS[2] },
    ];
    const leftovers =
      storageMetrics.relationBytes > storageMetrics.tableBytes + storageMetrics.indexBytes
        ? storageMetrics.relationBytes - storageMetrics.tableBytes - storageMetrics.indexBytes
        : 0;
    if (leftovers > 0) {
      rows.push({ name: "Other relation overhead", value: leftovers, fill: STORAGE_COLORS[3] });
    }
    return rows.filter((row) => row.value > 0);
  }, [storageMetrics]);

  const storageBreakdownRows = useMemo(() => {
    const topTables = (database?.tables || []).slice(0, 8).map((table) => ({
      label: table.tableName,
      kind: "Table",
      sizeLabel: table.totalSizeLabel,
      bytes: Number(table.totalBytes) || 0,
      helper: `${formatCount(table.liveRows)} live rows ┬╖ ${formatCount(
        table.deadRows
      )} dead rows`,
    }));

    const topIndexes = (database?.indexes || []).slice(0, 6).map((index) => ({
      label: index.indexName,
      kind: "Index",
      sizeLabel: index.indexSizeLabel,
      bytes: Number(index.indexBytes) || 0,
      helper: index.tableName,
    }));

    const specialRows = [
      {
        label: "WAL directory",
        kind: "WAL",
        sizeLabel: database?.wal?.directorySizeLabel || "N/A",
        bytes: Number(database?.wal?.directoryBytes) || 0,
        helper: database?.wal?.maxWalSizeLabel
          ? `Configured max ${database.wal.maxWalSizeLabel}`
          : "No configured max_wal_size",
      },
      {
        label: "Relation overhead",
        kind: "System",
        sizeLabel: formatBytes(
          Math.max(
            0,
            (storageMetrics.relationBytes || 0) -
              (storageMetrics.tableBytes || 0) -
              (storageMetrics.indexBytes || 0)
          )
        ),
        bytes: Math.max(
          0,
          (storageMetrics.relationBytes || 0) -
            (storageMetrics.tableBytes || 0) -
            (storageMetrics.indexBytes || 0)
        ),
        helper: "TOAST / free space / relation metadata",
      },
    ];

    return [...specialRows, ...topTables, ...topIndexes].sort(
      (left, right) => right.bytes - left.bytes
    );
  }, [database, storageMetrics]);

  const tableChartData = useMemo(
    () =>
      (database?.tables || [])
        .slice(0, 6)
        .map((table) => ({
          name: table.tableName,
          totalGb: Number(((Number(table.totalBytes) || 0) / 1024 ** 3).toFixed(2)),
          deadRows: Number(table.deadRows) || 0,
        })),
    [database]
  );

  const attendanceTrendData = useMemo(
    () =>
      [...(database?.attendanceByMonth || [])].reverse().map((row) => ({
        month: String(row.month),
        records: Number(row.records) || 0,
      })),
    [database]
  );

  const alertTimelineData = useMemo(() => {
    const storageAlert = storageMetrics.storagePercent || 0;
    const walConfigured = Number(database?.wal?.maxWalBytes) || 0;
    const walPercent = walConfigured
      ? Math.min(100, ((Number(database?.wal?.directoryBytes) || 0) / walConfigured) * 100)
      : 0;
    return [
      {
        name: isRemoteEc2 ? "EC2 CPU" : "EC2 Memory",
        value: isRemoteEc2
          ? Number(remoteEc2?.cpuUtilization) || 0
          : Number(infrastructure?.summary?.usedMemoryPercent) || 0,
        fill: getToneColor(
          getUsageTone(
            isRemoteEc2
              ? remoteEc2?.cpuUtilization
              : infrastructure?.summary?.usedMemoryPercent
          )
        ),
      },
      {
        name: isRemoteEc2 ? "Status Checks" : "EC2 Disk",
        value: isRemoteEc2
          ? remoteEc2?.checksHealthy
            ? 0
            : 100
          : Number(infrastructure?.disk?.usedPercent) || 0,
        fill: getToneColor(
          isRemoteEc2
            ? remoteEc2?.checksHealthy
              ? "healthy"
              : "critical"
            : getUsageTone(infrastructure?.disk?.usedPercent)
        ),
      },
      {
        name: "DB Storage",
        value: Number(storageAlert) || 0,
        fill: getToneColor(getUsageTone(storageAlert)),
      },
      {
        name: "WAL Pressure",
        value: Number(walPercent) || 0,
        fill: getToneColor(getUsageTone(walPercent)),
      },
      {
        name: "Connections",
        value: Number(database?.summary?.connectionUsagePercent) || 0,
        fill: getToneColor(getUsageTone(database?.summary?.connectionUsagePercent)),
      },
    ];
  }, [database, infrastructure, storageMetrics, isRemoteEc2, remoteEc2]);

  const refreshNow = async () => {
    try {
      setRefreshing(true);
      const { data } = await axios.get(HEALTH_ENDPOINT, requestConfig);
      setSnapshot(data);
      setError("");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to refresh health status."
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 bg-slate-50 min-h-screen -m-3 sm:-m-5 p-3 sm:p-5">
        <div className="h-56 animate-pulse rounded-[34px] bg-slate-200" />
        <div className="grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen -m-3 sm:-m-5 p-3 sm:p-5">
      <GlassPanel className="relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(14,165,233,0.07),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.06),transparent_30%)]" />
        <div className="relative">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${statusMeta.badge}`}>
                  <StatusIcon size={15} />
                  {statusMeta.label}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm text-slate-600   ">
                  <Sparkles size={15} />
                  Health intelligence deck
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 ">
                System Health Center
              </h1>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600 ">
                Real-time admin visibility for EC2 pressure, PostgreSQL footprint, WAL growth, replication drag, and table bloat. Top bar pe alert, niche advanced charts, aur clear storage math.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <MetricChip
                label="Last Snapshot"
                value={formatDateTime(snapshot?.generatedAt)}
                tone="sky"
              />
              <button
                type="button"
                onClick={refreshNow}
                disabled={refreshing}
                className="rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-left text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60   "
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing" : "Refresh now"}
                </div>
                <div className="mt-2 text-xs opacity-80">Auto refresh every 60 seconds</div>
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className={`rounded-[28px] border px-5 py-4 ${topAlert ? (STATUS_META[topAlert.severity] || STATUS_META.info).panel : STATUS_META.healthy.panel}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-white/80 p-2 text-slate-800 shadow-sm  ">
                  {topAlert ? (
                    (() => {
                      const Icon = (STATUS_META[topAlert.severity] || STATUS_META.info).icon;
                      return <Icon size={18} />;
                    })()
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-600 ">
                      Priority alert
                    </span>
                    {topAlert ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${(STATUS_META[topAlert.severity] || STATUS_META.info).badge}`}>
                        {(STATUS_META[topAlert.severity] || STATUS_META.info).label}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-900 ">
                    {topAlert?.title || "All monitored signals are inside safe thresholds."}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 ">
                    {topAlert?.message || "No urgent incident is active right now. Keep watching storage pressure and WAL growth."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <SmallStat
                label="Critical alerts"
                value={formatCount(snapshot?.summary?.criticalCount || 0)}
                helper={`${formatCount(snapshot?.summary?.alertCount || 0)} total signals`}
                tone={(snapshot?.summary?.criticalCount || 0) > 0 ? "rose" : "emerald"}
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {error ? (
        <div className="rounded-3xl border border-rose-300 bg-rose-50 px-5 py-4 text-sm text-rose-700   ">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-12">
        <GlassPanel className="p-5 xl:col-span-8">
          <PanelHeader
            icon={Database}
            title="Database Space Command"
            caption="Total allocated storage, current footprint, free headroom, and WAL impact."
            action={
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-600   ">
                {database?.summary?.databaseName || "database"}
              </div>
            }
          />

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eef7ff_100%)] p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricChip
                  label="Allocated"
                  value={
                    storageMetrics.configuredBytes
                      ? formatBytes(storageMetrics.configuredBytes)
                      : "Not mapped"
                  }
                  tone="sky"
                />
                <MetricChip
                  label="Used footprint"
                  value={formatBytes(storageMetrics.footprintBytes)}
                  tone={getUsageTone(storageMetrics.storagePercent)}
                />
                <MetricChip
                  label="Free headroom"
                  value={
                    storageMetrics.freeBytes !== null
                      ? formatBytes(storageMetrics.freeBytes)
                      : "Unknown"
                  }
                  tone={
                    storageMetrics.freeBytes !== null && storageMetrics.freeBytes < 5 * 1024 ** 3
                      ? "rose"
                      : "emerald"
                  }
                />
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 border-slate-200 bg-slate-50">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-600">Used vs Allocated</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {storageMetrics.storagePercent !== null
                          ? formatPercent(storageMetrics.storagePercent)
                          : "Configured DB capacity missing"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      {storageMetrics.configuredBytes
                        ? `${formatBytes(storageMetrics.footprintBytes)} / ${formatBytes(storageMetrics.configuredBytes)}`
                        : "Set `DB_STORAGE_LIMIT_GB` for exact capacity math"}
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                          Total
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          {storageMetrics.configuredBytes
                            ? formatBytes(storageMetrics.configuredBytes)
                            : "Not mapped"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                          Used
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          {formatBytes(storageMetrics.footprintBytes)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                          Free
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-900">
                          {storageMetrics.freeBytes !== null
                            ? formatBytes(storageMetrics.freeBytes)
                            : "Unknown"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4  ">
                      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700 ">
                          Storage meter
                        </span>
                        <span className="text-slate-600">
                          {storageMetrics.storagePercent !== null
                            ? `${formatPercent(storageMetrics.storagePercent)} used`
                            : "Capacity not configured"}
                        </span>
                      </div>
                      <div className="h-5 overflow-hidden rounded-full bg-slate-200 bg-slate-200">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${storageMetrics.storagePercent || 0}%`,
                            background: `linear-gradient(90deg, ${getToneColor(
                              getUsageTone(storageMetrics.storagePercent)
                            )} 0%, #38bdf8 100%)`,
                          }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                        <span>0 GB</span>
                        <span>
                          Used {formatBytes(storageMetrics.footprintBytes)}
                        </span>
                        <span>
                          Total{" "}
                          {storageMetrics.configuredBytes
                            ? formatBytes(storageMetrics.configuredBytes)
                            : "Unknown"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStorageDrawerOpen(true)}
                      className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 border-slate-200 bg-white :bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            Inspect storage usage
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Open detailed breakdown for tables, indexes, WAL and overhead.
                          </div>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 ">
                          View details
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 border-slate-200 bg-slate-50">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                    <div className="text-sm text-slate-600">Footprint Composition</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      Data vs indexes vs WAL
                    </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStorageDrawerOpen(true)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100  hover:bg-slate-100"
                    >
                      View details
                    </button>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={storageCompositionData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {storageCompositionData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatBytes(value)}
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid rgba(148,163,184,0.25)",
                            boxShadow: "0 20px 40px rgba(15,23,42,0.14)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {storageCompositionData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                          {entry.name}
                        </div>
                        <div className="font-medium text-slate-900">
                          {formatBytes(entry.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">Storage pressure</span>
                  <span className="font-medium text-slate-900">
                    {storageMetrics.storagePercent !== null
                      ? formatPercent(storageMetrics.storagePercent)
                      : "Unknown"}
                  </span>
                </div>
                <ProgressBar value={storageMetrics.storagePercent || 0} tone={getUsageTone(storageMetrics.storagePercent)} />
                <p className="mt-2 text-sm text-slate-600">
                  Source {database?.summary?.storageTelemetrySource || "database-estimate"} ┬╖ DB size {database?.summary?.totalSizeLabel || "N/A"} + WAL {database?.wal?.directorySizeLabel || "N/A"} = footprint {formatBytes(storageMetrics.footprintBytes)}.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <SmallStat
                label="Storage summary"
                value={`Used ${formatBytes(storageMetrics.footprintBytes)}`}
                helper={`Total ${formatBytes(
                  storageMetrics.configuredBytes
                )} ┬╖ Free ${
                  storageMetrics.freeBytes !== null
                    ? formatBytes(storageMetrics.freeBytes)
                    : "Unknown"
                } ┬╖ Click to inspect`}
                tone="sky"
                onClick={() => setStorageDrawerOpen(true)}
              />
              <SmallStat
                label="WAL footprint"
                value={database?.wal?.directorySizeLabel || "N/A"}
                helper={
                  database?.wal?.maxWalSizeLabel
                    ? `Configured ceiling ${database.wal.maxWalSizeLabel}`
                    : "No max_wal_size available"
                }
                tone={getUsageTone(
                  database?.wal?.maxWalBytes
                    ? ((Number(database?.wal?.directoryBytes) || 0) / Number(database?.wal?.maxWalBytes || 1)) * 100
                    : 0
                )}
              />
              <SmallStat
                label="DB connections"
                value={`${formatCount(database?.summary?.activeConnections || 0)} active`}
                helper={`${formatCount(database?.summary?.totalConnections || 0)} / ${formatCount(database?.summary?.maxConnections || 0)} total`}
                tone={getUsageTone(database?.summary?.connectionUsagePercent)}
              />
              <SmallStat
                label="Open alerts"
                value={formatCount(snapshot?.summary?.alertCount || 0)}
                helper={`${formatCount(snapshot?.summary?.criticalCount || 0)} critical ┬╖ ${formatCount(snapshot?.summary?.warningCount || 0)} warning`}
                tone={(snapshot?.summary?.criticalCount || 0) > 0 ? "rose" : (snapshot?.summary?.warningCount || 0) > 0 ? "amber" : "emerald"}
              />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 xl:col-span-4">
          <PanelHeader
            icon={Server}
            title="Alert Pressure Matrix"
            caption="Fast read across memory, disk, storage, WAL and connections."
          />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertTimelineData} layout="vertical" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.16)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={96}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => formatPercent(value)}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.25)",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.14)",
                  }}
                />
                <Bar dataKey="value" radius={[0, 12, 12, 0]}>
                  {alertTimelineData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3">
            <MetricChip
              label="EC2 Host"
              value={
                remoteEc2?.instanceName ||
                remoteEc2?.instanceId ||
                infrastructure?.ec2?.instanceId ||
                infrastructure?.summary?.hostname ||
                "Unknown"
              }
              tone="sky"
            />
            <MetricChip
              label={isRemoteEc2 ? "Instance ID" : "Uptime"}
              value={
                isRemoteEc2
                  ? remoteEc2?.instanceId || "N/A"
                  : formatDuration(infrastructure?.summary?.uptimeSeconds)
              }
              tone="emerald"
            />
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <GlassPanel className="p-5 xl:col-span-7">
          <PanelHeader
            icon={ShieldAlert}
            title="Live Alerts"
            caption="Most important alarms pinned on top with context."
            action={
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-600  ">
                {alerts.length} signals live
              </div>
            }
          />
          <div className="space-y-3">
            {alerts.length ? (
              alerts.slice(0, 6).map((alert, index) => {
                const meta = STATUS_META[alert.severity] || STATUS_META.info;
                const AlertIcon = meta.icon;
                return (
                  <div key={`${alert.title}-${index}`} className={`rounded-[24px] border p-4 ${meta.panel}`}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white/90 p-2.5 text-slate-900 shadow-sm bg-white text-slate-900">
                        <AlertIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-slate-900">
                            {alert.title}
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-600">
                            {alert.source}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {alert.message}
                        </p>
                        {(alert.current !== null && alert.current !== undefined) ||
                        (alert.threshold !== null && alert.threshold !== undefined) ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {alert.current !== null && alert.current !== undefined ? (
                              <span className="rounded-full border border-slate-200 bg-white/90 px-2 py-1  bg-white">
                                Current: {typeof alert.current === "number" && alert.current > 1000 ? formatBytes(alert.current) : String(alert.current)}
                              </span>
                            ) : null}
                            {alert.threshold !== null && alert.threshold !== undefined ? (
                              <span className="rounded-full border border-slate-200 bg-white/90 px-2 py-1  bg-white">
                                Threshold: {typeof alert.threshold === "number" && alert.threshold > 1000 ? formatBytes(alert.threshold) : String(alert.threshold)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-emerald-300/60 bg-emerald-50/80 p-5 text-sm text-emerald-700   ">
                No live alarms. Current snapshot says memory, storage, WAL and DB connectivity are stable.
              </div>
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 xl:col-span-5">
          <PanelHeader
            icon={Cpu}
            title="EC2 Runtime Pulse"
            caption={
              isRemoteEc2
                ? "Remote EC2 identity, CPU, network and status checks."
                : "Memory, disk, process footprint and host identity."
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricChip
              label="Instance Name"
              value={remoteEc2?.instanceName || remoteEc2?.instanceId || infrastructure?.summary?.hostname || "N/A"}
              tone="sky"
            />
            <MetricChip
              label="Type / Region"
              value={
                [
                  remoteEc2?.instanceType,
                  remoteEc2?.region || remoteEc2?.availabilityZone,
                ].filter(Boolean).join(" · ") ||
                infrastructure?.summary?.platform ||
                "N/A"
              }
              tone="emerald"
            />
            <MetricChip
              label="Public / Private IP"
              value={
                [remoteEc2?.publicIp, remoteEc2?.privateIp].filter(Boolean).join(" / ") || "N/A"
              }
              tone="sky"
            />
            <MetricChip
              label={isRemoteEc2 ? "Checks / State" : "Instance State"}
              value={
                remoteEc2?.instanceState
                  ? `${remoteEc2.instanceState} · ${remoteEc2?.checksHealthy ? "checks ok" : "check issue"}`
                  : remoteEc2?.instanceId
                  ? "running (metrics via CloudWatch)"
                  : "N/A"
              }
              tone={remoteEc2?.checksHealthy === false ? "rose" : "emerald"}
            />
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {isRemoteEc2 ? "CPU utilization" : "Memory usage"}
                </span>
                <span className="font-medium text-slate-900">
                  {isRemoteEc2
                    ? remoteEc2?.cpuUtilizationLabel || "N/A"
                    : formatPercent(infrastructure?.summary?.usedMemoryPercent)}
                </span>
              </div>
              <ProgressBar
                value={
                  isRemoteEc2
                    ? Number(remoteEc2?.cpuUtilization) || 0
                    : infrastructure?.summary?.usedMemoryPercent || 0
                }
                tone={getUsageTone(
                  isRemoteEc2
                    ? remoteEc2?.cpuUtilization
                    : infrastructure?.summary?.usedMemoryPercent
                )}
              />
              <div className="mt-2 text-sm text-slate-600">
                {isRemoteEc2
                  ? `Network in ${remoteEc2?.networkInLabel || "N/A"} ┬╖ Network out ${remoteEc2?.networkOutLabel || "N/A"}`
                  : `${infrastructure?.summary?.usedMemoryLabel || "N/A"} used of ${infrastructure?.summary?.totalMemoryLabel || "N/A"}`}
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {isRemoteEc2 ? "Status checks" : "Disk usage"}
                </span>
                <span className="font-medium text-slate-900">
                  {isRemoteEc2
                    ? remoteEc2?.checksHealthy
                      ? "Healthy"
                      : "Impaired"
                    : formatPercent(infrastructure?.disk?.usedPercent)}
                </span>
              </div>
              <ProgressBar
                value={
                  isRemoteEc2
                    ? remoteEc2?.checksHealthy
                      ? 12
                      : 100
                    : infrastructure?.disk?.usedPercent || 0
                }
                tone={
                  isRemoteEc2
                    ? remoteEc2?.checksHealthy
                      ? "emerald"
                      : "rose"
                    : getUsageTone(infrastructure?.disk?.usedPercent)
                }
              />
              <div className="mt-2 text-sm text-slate-600">
                {isRemoteEc2
                  ? `Instance check ${remoteEc2?.instanceCheckStatus || "unknown"} ┬╖ System check ${remoteEc2?.systemCheckStatus || "unknown"}`
                  : infrastructure?.disk?.usedBytes
                    ? `${formatBytes(infrastructure.disk.usedBytes)} used of ${formatBytes(infrastructure.disk.totalBytes)}`
                    : infrastructure?.disk?.note || "Disk info unavailable"}
              </div>
            </div>
            {isRemoteEc2 && remoteEc2?.metricsUnavailable ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-600 border-slate-200 bg-slate-50">
                CloudWatch remote metrics unavailable: {remoteEc2.metricsReason || "unknown reason"}
              </div>
            ) : null}
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <GlassPanel className="p-5 xl:col-span-4">
          <PanelHeader
            icon={Radar}
            title="Largest Tables"
            caption="Which tables are actually consuming storage."
          />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tableChartData} layout="vertical" margin={{ left: 10, right: 18, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.16)" />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={(value) => `${value} GB`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  stroke="#94a3b8"
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => `${value} GB`}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.25)",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.14)",
                  }}
                />
                <Bar dataKey="totalGb" radius={[0, 12, 12, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {(database?.tables || []).slice(0, 4).map((table) => (
              <div key={table.tableName} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm border-slate-200 bg-slate-50">
                <div>
                  <div className="font-medium text-slate-900">{table.tableName}</div>
                  <div className="text-xs text-slate-600">
                    {formatCount(table.liveRows)} live ┬╖ {formatCount(table.deadRows)} dead
                  </div>
                </div>
                <div className="font-medium text-slate-900">{table.totalSizeLabel}</div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 xl:col-span-4">
          <PanelHeader
            icon={Activity}
            title="Attendance Growth"
            caption="Historical attendance volume by month."
          />
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => formatCount(value)} />
                <Tooltip
                  formatter={(value) => formatCount(value)}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.25)",
                    boxShadow: "0 20px 40px rgba(15,23,42,0.14)",
                  }}
                />
                <Area type="monotone" dataKey="records" stroke="#0284c7" strokeWidth={3} fill="url(#attendanceArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">Recent density read</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {(attendanceTrendData[attendanceTrendData.length - 1] && `${formatCount(attendanceTrendData[attendanceTrendData.length - 1].records)} records in ${attendanceTrendData[attendanceTrendData.length - 1].month}`) || "No attendance history"}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 xl:col-span-4">
          <PanelHeader
            icon={HardDrive}
            title="Vacuum & Replication"
            caption="Bloat candidates and slot retention side by side."
          />
          <div className="space-y-3">
            {(database?.vacuumCandidates || []).slice(0, 3).map((table) => (
              <div key={table.tableName} className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{table.tableName}</div>
                    <div className="text-xs text-slate-600">
                      last autovacuum {formatDateTime(table.lastAutovacuum)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">
                      {formatPercent(table.deadPercent)}
                    </div>
                    <div className="text-xs text-slate-600">
                      {formatCount(table.deadRows)} dead rows
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(database?.replication?.slots || []).slice(0, 3).map((slot) => (
              <div key={slot.slotName} className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{slot.slotName}</div>
                    <div className="text-xs text-slate-600">
                      {slot.slotType} ┬╖ {slot.active ? "active" : "inactive"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">
                      {slot.retainedSizeLabel}
                    </div>
                    <div className="text-xs text-slate-600">
                      WAL retained
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!database?.vacuumCandidates?.length && !database?.replication?.slots?.length ? (
              <div className="rounded-[24px] border border-emerald-300/50 bg-emerald-50/80 p-4 text-sm text-emerald-700   ">
                No heavy vacuum candidate or replication slot pressure detected.
              </div>
            ) : null}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <PanelHeader
          icon={ArrowUpRight}
          title="Deep Technical Readout"
          caption="Exact numbers for infra and PostgreSQL internals."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricChip label="PostgreSQL" value={database?.summary?.postgresVersion || "N/A"} tone="sky" />
          <MetricChip label="WAL generated" value={database?.wal?.stats?.walBytesLabel || "N/A"} tone="amber" />
          <MetricChip label="Load average" value={(infrastructure?.summary?.loadAverage || []).map((value) => Number(value || 0).toFixed(2)).join(" / ") || "N/A"} tone="sky" />
          <MetricChip label="CPU cores" value={formatCount(infrastructure?.summary?.cpuCoreCount || 0)} tone="emerald" />
        </div>
      </GlassPanel>

      {isStorageDrawerOpen ? (
        <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/45 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setStorageDrawerOpen(false)}
            aria-label="Close storage details"
          />
          <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-600">
                  Storage Detail
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Database usage breakdown
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Total {formatBytes(storageMetrics.configuredBytes)} ┬╖ Used {formatBytes(
                    storageMetrics.footprintBytes
                  )} ┬╖ Free{" "}
                  {storageMetrics.freeBytes !== null
                    ? formatBytes(storageMetrics.freeBytes)
                    : "Unknown"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStorageDrawerOpen(false)}
                className="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100  hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MetricChip
                label="Allocated"
                value={formatBytes(storageMetrics.configuredBytes)}
                tone="sky"
              />
              <MetricChip
                label="Used"
                value={formatBytes(storageMetrics.footprintBytes)}
                tone={getUsageTone(storageMetrics.storagePercent)}
              />
              <MetricChip
                label="Free"
                value={
                  storageMetrics.freeBytes !== null
                    ? formatBytes(storageMetrics.freeBytes)
                    : "Unknown"
                }
                tone="emerald"
              />
            </div>

            <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/85 p-5  ">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700 ">
                    Where storage is used
                  </div>
                  <div className="text-xs text-slate-600">
                    Tables, indexes, WAL and relation overhead
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-600">
                  Top consumers
                </div>
              </div>
              <div className="space-y-3">
                {storageBreakdownRows.map((row) => {
                  const ratio = storageMetrics.footprintBytes
                    ? Math.max(
                        2,
                        Math.min(100, (row.bytes / storageMetrics.footprintBytes) * 100)
                      )
                    : 0;
                  return (
                    <div
                      key={`${row.kind}-${row.label}`}
                      className="rounded-2xl border border-slate-200 bg-white/90 p-4 border-slate-200 bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 ">
                              {row.kind}
                            </span>
                            <div className="truncate font-medium text-slate-900">
                              {row.label}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {row.helper}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">
                            {row.sizeLabel}
                          </div>
                          <div className="text-xs text-slate-600">
                            {storageMetrics.footprintBytes
                              ? formatPercent((row.bytes / storageMetrics.footprintBytes) * 100)
                              : "0%"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SystemHealth;
