"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  Filter,
  History,
  RefreshCw,
  Search,
  Sparkles,
  TimerReset,
  UploadCloud,
  UserCheck,
  UserRoundX,
  UsersRound,
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
import { RoleGuard } from "@components/Guards";
import { ApiError } from "@lib/apiClient";
import {
  AttendanceApi,
  type AttendanceDashboardQuery,
  type AttendanceDashboardResponse,
  type AttendanceRecord,
  type AttendanceUploadResponse,
} from "@lib/attendanceApi";

const numberFormatter = new Intl.NumberFormat("en-IN");

const chartColors = {
  blue: "#2563eb",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  slate: "#64748b",
};

type FilterState = {
  from: string;
  to: string;
  status: string;
  designation: string;
  officeLocation: string;
  divisionUnit: string;
  checkoutState: string;
  search: string;
};

const emptyFilters: FilterState = {
  from: "",
  to: "",
  status: "ALL",
  designation: "",
  officeLocation: "",
  divisionUnit: "",
  checkoutState: "ALL",
  search: "",
};

function formatShortDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function durationLabel(inTime: string | null, outTime: string | null) {
  if (!inTime || !outTime) return "—";
  const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const minutes = Math.round(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function minutesToClock(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const normalized = Math.round(value);
  const hours = Math.floor(normalized / 60) % 24;
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minutesToDuration(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const normalized = Math.round(value);
  return `${Math.floor(normalized / 60)}h ${normalized % 60}m`;
}

function statusLabel(status: string) {
  if (status === "P") return "Present";
  if (status === "A") return "Absent";
  return status || "Unknown";
}

function StatusPill({ status }: { status: string }) {
  const present = status === "P";
  const absent = status === "A";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        present
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : absent
            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          present ? "bg-emerald-500" : absent ? "bg-rose-500" : "bg-slate-400"
        }`}
      />
      {statusLabel(status)}
    </span>
  );
}

function KpiSparkline({ tone }: { tone: "blue" | "emerald" | "rose" | "violet" | "teal" | "amber" | "slate" }) {
  const colors = {
    blue: { line: "#2563eb", fill: "#dbeafe" },
    emerald: { line: "#10b981", fill: "#d1fae5" },
    rose: { line: "#f43f5e", fill: "#ffe4e6" },
    violet: { line: "#8b5cf6", fill: "#ede9fe" },
    teal: { line: "#14b8a6", fill: "#ccfbf1" },
    amber: { line: "#f59e0b", fill: "#fef3c7" },
    slate: { line: "#64748b", fill: "#e2e8f0" },
  } as const;

  return (
    <svg viewBox="0 0 180 46" preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
      <path
        d="M0 35 C10 36 13 29 22 32 C31 35 34 22 44 27 C54 32 58 23 67 24 C78 25 78 34 90 31 C102 28 102 16 113 20 C124 25 126 10 139 14 C150 18 153 7 163 10 C171 12 174 7 180 8 L180 46 L0 46 Z"
        fill={colors[tone].fill}
        opacity="0.72"
      />
      <path
        d="M0 35 C10 36 13 29 22 32 C31 35 34 22 44 27 C54 32 58 23 67 24 C78 25 78 34 90 31 C102 28 102 16 113 20 C124 25 126 10 139 14 C150 18 153 7 163 10 C171 12 174 7 180 8"
        fill="none"
        stroke={colors[tone].line}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  tone,
  onClick,
  active = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "rose" | "violet" | "teal" | "amber" | "slate";
  onClick?: () => void;
  active?: boolean;
}) {
  const tones = {
    blue: {
      badge: "from-blue-500 via-blue-600 to-indigo-600",
      shadow: "shadow-blue-500/25",
    },
    emerald: {
      badge: "from-emerald-400 via-emerald-500 to-emerald-700",
      shadow: "shadow-emerald-500/25",
    },
    rose: {
      badge: "from-rose-400 via-rose-500 to-pink-600",
      shadow: "shadow-rose-500/25",
    },
    violet: {
      badge: "from-violet-400 via-violet-600 to-purple-700",
      shadow: "shadow-violet-500/25",
    },
    teal: {
      badge: "from-teal-400 via-teal-500 to-cyan-700",
      shadow: "shadow-teal-500/25",
    },
    amber: {
      badge: "from-amber-400 via-orange-500 to-orange-600",
      shadow: "shadow-orange-500/25",
    },
    slate: {
      badge: "from-slate-400 via-slate-500 to-slate-700",
      shadow: "shadow-slate-500/25",
    },
  } as const;

  const toneStyle = tones[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[218px] w-full flex-col overflow-hidden rounded-[18px] border bg-white px-3.5 pb-3 pt-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.065)] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 ${
        active
          ? "-translate-y-1 border-blue-300 shadow-[0_16px_38px_rgba(37,99,235,0.14)] ring-2 ring-blue-100"
          : "border-slate-200/90 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_38px_rgba(15,23,42,0.11)]"
      }`}
      aria-label={`View ${label} records`}
    >
      <div className="flex min-h-[48px] items-start gap-2.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-105 ${toneStyle.badge} ${toneStyle.shadow}`}
          style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}
        >
          {icon}
        </div>
        <p className="pt-1 text-[10px] font-extrabold leading-[14px] tracking-[-0.01em] text-slate-800">
          {label}
        </p>
      </div>

      <div className="mt-3">
        <p className="whitespace-nowrap text-[27px] font-black tabular-nums leading-none tracking-[-0.04em] text-slate-950 2xl:text-[29px]">
          {value}
        </p>
        <p className="mt-2 min-h-[28px] text-[9.5px] font-semibold leading-[14px] text-slate-500">
          {detail}
        </p>
      </div>

      <div className="mt-auto -mx-1 pt-2">
        <KpiSparkline tone={tone} />
      </div>

      <div className="mt-1 flex items-center justify-center border-t border-slate-100 pt-2.5">
        <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-blue-600 transition-colors group-hover:text-blue-700">
          View Records <ArrowUpRight size={11} strokeWidth={2.3} />
        </span>
      </div>
    </button>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  icon,
  tone = "blue",
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  icon?: React.ReactNode;
  tone?: "blue" | "emerald" | "rose" | "violet" | "amber" | "slate";
  children: React.ReactNode;
}) {
  const tones = {
    blue: { icon: "bg-blue-50 text-blue-600 ring-blue-100", bar: "from-blue-500 via-cyan-400 to-transparent", glow: "bg-blue-400/10", badge: "bg-blue-50 text-blue-700 ring-blue-100" },
    emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", bar: "from-emerald-500 via-teal-400 to-transparent", glow: "bg-emerald-400/10", badge: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
    rose: { icon: "bg-rose-50 text-rose-600 ring-rose-100", bar: "from-rose-500 via-pink-400 to-transparent", glow: "bg-rose-400/10", badge: "bg-rose-50 text-rose-700 ring-rose-100" },
    violet: { icon: "bg-violet-50 text-violet-600 ring-violet-100", bar: "from-violet-500 via-fuchsia-400 to-transparent", glow: "bg-violet-400/10", badge: "bg-violet-50 text-violet-700 ring-violet-100" },
    amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", bar: "from-amber-500 via-orange-400 to-transparent", glow: "bg-amber-400/10", badge: "bg-amber-50 text-amber-700 ring-amber-100" },
    slate: { icon: "bg-slate-100 text-slate-600 ring-slate-200", bar: "from-slate-500 via-slate-300 to-transparent", glow: "bg-slate-400/10", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  };

  return (
    <section className="group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/45 p-5 shadow-[0_12px_38px_rgba(15,23,42,0.055)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.09)]">
      <div className={`absolute left-0 top-0 h-1 w-40 bg-gradient-to-r ${tones[tone].bar}`} />
      <div className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125 ${tones[tone].glow}`} />
      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-sm ${tones[tone].icon}`}>{icon}</div>}
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-[-0.02em] text-slate-950">{title}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>
          </div>
        </div>
        {badge && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${tones[tone].badge}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function UploadModal({
  open,
  uploading,
  onClose,
  onUpload,
}: {
  open: boolean;
  uploading: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDragging(false);
    }
  }, [open]);

  if (!open) return null;

  const acceptFile = (nextFile?: File) => {
    if (!nextFile) return;
    setFile(nextFile);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">Upload attendance CSV</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Validated, normalized and saved to PostgreSQL</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files?.[0]);
            }}
            className={`flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40"
            }`}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
              <FileSpreadsheet size={25} />
            </div>
            <p className="text-sm font-black text-slate-800">Drop CSV here or choose a file</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Maximum file size 15 MB</p>
          </button>

          {file && (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 ring-1 ring-emerald-100">
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB · ready to import
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={uploading}
                className="text-xs font-bold text-slate-500 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs font-medium leading-5 text-blue-800">
            Re-uploading the same attendance date updates matching employee records instead of creating duplicates.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => file && onUpload(file)}
            disabled={!file || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {uploading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
            {uploading ? "Importing..." : "Import attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}


type KpiDrilldown = {
  key: "ALL" | "PRESENT" | "ABSENT" | "RATE" | "CHECKED_OUT" | "OPEN_CHECKIN" | "AVG_CHECKIN" | "AVG_WORK";
  title: string;
  subtitle: string;
  value: string;
  tone: "blue" | "emerald" | "rose" | "violet" | "amber" | "slate";
  query?: Partial<AttendanceDashboardQuery>;
};

function KpiRecordsDrawer({
  open,
  config,
  data,
  loading,
  page,
  onPageChange,
  onClose,
}: {
  open: boolean;
  config: KpiDrilldown | null;
  data: AttendanceDashboardResponse | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !config) return null;

  const toneClasses = {
    blue: "from-blue-600 to-cyan-500 bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "from-emerald-600 to-teal-500 bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "from-rose-600 to-pink-500 bg-rose-50 text-rose-700 ring-rose-100",
    violet: "from-violet-600 to-fuchsia-500 bg-violet-50 text-violet-700 ring-violet-100",
    amber: "from-amber-500 to-orange-500 bg-amber-50 text-amber-700 ring-amber-100",
    slate: "from-slate-700 to-slate-500 bg-slate-100 text-slate-700 ring-slate-200",
  };
  const total = data?.pagination.total || 0;
  const totalPages = Math.max(data?.pagination.totalPages || 0, 1);

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/45 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-[1120px] flex-col overflow-hidden border-l border-white/70 bg-white shadow-[-28px_0_90px_rgba(15,23,42,0.22)] animate-[attendanceDrawer_.3s_cubic-bezier(.2,.8,.2,1)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-5 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white ${toneClasses[config.tone].split(' ').slice(0,2).join(' ')}`}>
                  KPI drill-down
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-blue-100">
                  {numberFormatter.format(total)} matching records
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <h2 className="text-xl font-black tracking-[-0.03em] sm:text-2xl">{config.title}</h2>
                <span className="text-2xl font-black tabular-nums text-white/95">{config.value}</span>
              </div>
              <p className="mt-1.5 max-w-3xl text-xs font-semibold leading-5 text-blue-100/75">{config.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close KPI records"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50/55">
          {loading && !data ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw size={22} className="animate-spin text-blue-600" />
              <p className="text-sm font-bold">Loading matching attendance records...</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        {['Employee', 'Attendance ID', 'Designation', 'Date', 'In time', 'Out time', 'Duration', 'Status', 'Punch'].map((heading) => (
                          <th key={heading} className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.records || []).map((record: AttendanceRecord) => {
                        const punch = record.outTime ? "Checked out" : record.inTime ? "Open" : "No punch";
                        return (
                          <tr key={record.id} className="border-b border-slate-100 transition-colors odd:bg-white even:bg-slate-50/35 hover:bg-blue-50/60 last:border-b-0">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                                  {record.employeeName.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="max-w-[180px] truncate text-xs font-bold text-slate-800" title={record.employeeName}>{record.employeeName}</p>
                                  <p className="mt-0.5 max-w-[180px] truncate text-[10px] font-medium text-slate-400" title={record.officeLocation || ""}>{record.officeLocation || "—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-600">{record.attendanceId}</td>
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{record.designation || "—"}</td>
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatShortDate(record.attendanceDate)}</td>
                            <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100"><Clock3 size={11} />{formatTime(record.inTime)}</span></td>
                            <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-black ring-1 ${record.outTime ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-50 text-slate-400 ring-slate-100"}`}><CheckCircle2 size={11} />{formatTime(record.outTime)}</span></td>
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">{durationLabel(record.inTime, record.outTime)}</td>
                            <td className="px-4 py-3.5"><StatusPill status={record.status} /></td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black ring-1 ${record.outTime ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : record.inTime ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                                {record.outTime ? <CheckCircle2 size={11} /> : record.inTime ? <Clock3 size={11} /> : <AlertCircle size={11} />}{punch}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!loading && !(data?.records || []).length && (
                  <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                    <Search size={25} className="mb-3 text-slate-300" />
                    <p className="text-sm font-black text-slate-700">No matching records</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">This KPI has no rows under the current dashboard filters.</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold text-slate-500">Page {data?.pagination.page || page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1 || loading} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
                    <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function AttendanceDashboard() {
  const [data, setData] = useState<AttendanceDashboardResponse | null>(null);
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [kpiDrilldown, setKpiDrilldown] = useState<KpiDrilldown | null>(null);
  const [kpiDrilldownData, setKpiDrilldownData] = useState<AttendanceDashboardResponse | null>(null);
  const [kpiDrilldownPage, setKpiDrilldownPage] = useState(1);
  const [kpiDrilldownLoading, setKpiDrilldownLoading] = useState(false);

  const buildQuery = (filters: FilterState, requestedPage: number): AttendanceDashboardQuery => ({
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.status === "ALL" ? undefined : filters.status,
    designation: filters.designation || undefined,
    officeLocation: filters.officeLocation || undefined,
    divisionUnit: filters.divisionUnit || undefined,
    checkoutState: filters.checkoutState === "ALL" ? undefined : filters.checkoutState,
    search: filters.search.trim() || undefined,
    page: requestedPage,
    pageSize: 25,
  });

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const result = await AttendanceApi.dashboard(buildQuery(appliedFilters, page));
      setData(result);
      setLastUpdated(new Date());

      if (!appliedFilters.from && !appliedFilters.to && result.range) {
        const resolved = {
          ...appliedFilters,
          from: result.range.from,
          to: result.range.to,
        };
        setDraftFilters(resolved);
        setAppliedFilters(resolved);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load attendance analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page]);

  useEffect(() => {
    if (!kpiDrilldown) {
      setKpiDrilldownData(null);
      return;
    }

    let cancelled = false;
    const loadKpiRecords = async () => {
      setKpiDrilldownLoading(true);
      try {
        const query: AttendanceDashboardQuery = {
          ...buildQuery(appliedFilters, kpiDrilldownPage),
          ...kpiDrilldown.query,
          page: kpiDrilldownPage,
          pageSize: 25,
        };
        const result = await AttendanceApi.dashboard(query);
        if (!cancelled) setKpiDrilldownData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load KPI records");
      } finally {
        if (!cancelled) setKpiDrilldownLoading(false);
      }
    };

    void loadKpiRecords();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpiDrilldown, kpiDrilldownPage, appliedFilters]);

  const openKpiDrilldown = (config: KpiDrilldown) => {
    setKpiDrilldownPage(1);
    setKpiDrilldownData(null);
    setKpiDrilldown(config);
  };

  const summary = data?.summary;

  const attendancePie = useMemo(
    () => [
      { name: "Present", value: summary?.present || 0, color: chartColors.emerald },
      { name: "Absent", value: summary?.absent || 0, color: chartColors.rose },
    ],
    [summary?.present, summary?.absent]
  );

  const checkInDistribution = useMemo(() => {
    const byHour = new Map((data?.checkInDistribution || []).map((item) => [item.hour, item.count]));
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count: byHour.get(hour) || 0,
    }));
  }, [data?.checkInDistribution]);

  const peakCheckIn = useMemo(() => {
    return checkInDistribution.reduce((best, item) => item.count > best.count ? item : best, checkInDistribution[0] || { hour: 0, label: "—", count: 0 });
  }, [checkInDistribution]);

  const bestDesignation = useMemo(() => {
    return (data?.designationBreakdown || []).reduce<any>((best, item) => !best || item.rate > best.rate ? item : best, null);
  }, [data?.designationBreakdown]);

  const applyFilters = () => {
    if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
      setError("From date cannot be after To date");
      return;
    }
    setError("");
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters({ ...emptyFilters });
    setPage(1);
    setAppliedFilters({ ...emptyFilters });
  };

  const setRangePreset = (days: number) => {
    const anchor = data?.uploads?.[0]?.attendanceDate || data?.range?.to;
    if (!anchor) return;
    const [year, month, day] = anchor.split("-").map(Number);
    const end = new Date(Date.UTC(year, month - 1, day));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const toIso = (value: Date) => value.toISOString().slice(0, 10);
    const next = { ...draftFilters, from: toIso(start), to: toIso(end) };
    setDraftFilters(next);
    setPage(1);
    setAppliedFilters(next);
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a CSV file");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");
    try {
      const result: AttendanceUploadResponse = await AttendanceApi.upload(file);
      setUploadOpen(false);
      setNotice(
        `Attendance imported for ${formatShortDate(result.batch.attendanceDate)} · ${numberFormatter.format(
          result.batch.insertedRows
        )} new · ${numberFormatter.format(result.batch.updatedRows)} updated${
          result.batch.invalidRows ? ` · ${result.batch.invalidRows} rejected` : ""
        }`
      );
      setPage(1);
      setDraftFilters({ ...emptyFilters });
      setAppliedFilters({ ...emptyFilters });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "CSV import failed");
    } finally {
      setUploading(false);
    }
  };

  const visibleRangeLabel = data?.range
    ? data.range.from === data.range.to
      ? formatShortDate(data.range.from)
      : `${formatShortDate(data.range.from)} – ${formatShortDate(data.range.to)}`
    : "No attendance data";

  if (loading && !data) {
    return (
      <div className="flex min-h-[68vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <RefreshCw size={20} className="animate-spin text-blue-600" />
          </div>
          <p className="text-sm font-bold">Loading attendance analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5 pb-10">
      <UploadModal
        open={uploadOpen}
        uploading={uploading}
        onClose={() => !uploading && setUploadOpen(false)}
        onUpload={handleUpload}
      />
      <KpiRecordsDrawer
        open={Boolean(kpiDrilldown)}
        config={kpiDrilldown}
        data={kpiDrilldownData}
        loading={kpiDrilldownLoading}
        page={kpiDrilldownPage}
        onPageChange={setKpiDrilldownPage}
        onClose={() => setKpiDrilldown(null)}
      />

      <style jsx global>{`
        @keyframes attendanceRise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .attendance-rise { animation: attendanceRise .48s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes attendanceDrawer {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .attendance-rise { animation: none !important; }
        }
      `}</style>

      <section className="relative overflow-hidden rounded-[30px] border border-blue-900/10 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-6 text-white shadow-[0_22px_65px_rgba(30,58,138,0.2)] sm:px-7 lg:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-100px] left-[32%] h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100">
                <Sparkles size={12} /> City Attendance Intelligence
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
                {visibleRangeLabel}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">Attendance Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-blue-100/75">
              Upload daily attendance CSVs and monitor workforce presence, punch activity, working hours and employee-level records from one dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5"
            >
              <UploadCloud size={16} />
              Upload CSV
            </button>
          </div>
        </div>
      </section>

      {(error || notice) && (
        <div
          className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {error ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <p className="text-sm font-semibold leading-5">{error || notice}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
            }}
            className="shrink-0 opacity-60 transition hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Filter size={15} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Smart filters</p>
              <p className="text-[11px] font-medium text-slate-400">All KPIs, charts and records use the same filters</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setRangePreset(1)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">Latest</button>
            <button onClick={() => setRangePreset(7)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">7 days</button>
            <button onClick={() => setRangePreset(30)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">30 days</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
            <input
              type="date"
              value={draftFilters.from}
              onChange={(e) => setDraftFilters((current) => ({ ...current, from: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
            <input
              type="date"
              value={draftFilters.to}
              onChange={(e) => setDraftFilters((current) => ({ ...current, to: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendence</span>
            <select
              value={draftFilters.status}
              onChange={(e) => setDraftFilters((current) => ({ ...current, status: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="ALL">All</option>
              <option value="P">Present</option>
              <option value="A">Absent</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Punch status</span>
            <select
              value={draftFilters.checkoutState}
              onChange={(e) => setDraftFilters((current) => ({ ...current, checkoutState: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="ALL">All punches</option>
              <option value="CHECKED_OUT">Punch out</option>
              <option value="OPEN_CHECKIN">Punch in</option>
              <option value="NO_PUNCH">No punch</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation</span>
            <select
              value={draftFilters.designation}
              onChange={(e) => setDraftFilters((current) => ({ ...current, designation: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All designations</option>
              {(data?.filters.designations || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Office</span>
            <select
              value={draftFilters.officeLocation}
              onChange={(e) => setDraftFilters((current) => ({ ...current, officeLocation: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All offices</option>
              {(data?.filters.officeLocations || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Division</span>
            <select
              value={draftFilters.divisionUnit}
              onChange={(e) => setDraftFilters((current) => ({ ...current, divisionUnit: e.target.value }))}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All divisions</option>
              {(data?.filters.divisionUnits || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee search</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((current) => ({ ...current, search: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Name or attendance ID"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-[11px] font-medium text-slate-400">
            {lastUpdated ? `Last refreshed ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Filter size={13} /> Apply filters
            </button>
          </div>
        </div>
      </section>

      {!data?.hasData || !summary ? (
        <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-violet-50 text-blue-600 ring-1 ring-blue-100">
            <FileSpreadsheet size={28} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900">No attendance data yet</h2>
          <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Upload the first daily CSV. The data will be saved city-wise in PostgreSQL and this dashboard will populate automatically.
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <UploadCloud size={16} /> Upload first CSV
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
            <KpiCard label="Unique employees" value={numberFormatter.format(summary.uniqueEmployees)} detail={`${numberFormatter.format(summary.totalRecords)} attendance records`} icon={<UsersRound size={18} />} tone="blue" active={kpiDrilldown?.key === "ALL"} onClick={() => openKpiDrilldown({ key: "ALL", title: "Unique employees", subtitle: "Underlying employee attendance records for the current dashboard filters.", value: numberFormatter.format(summary.uniqueEmployees), tone: "blue" })} />
            <KpiCard label="Present" value={numberFormatter.format(summary.present)} detail={`${summary.attendanceRate.toFixed(1)}% Present`} icon={<UserCheck size={18} />} tone="emerald" active={kpiDrilldown?.key === "PRESENT"} onClick={() => openKpiDrilldown({ key: "PRESENT", title: "Present employees", subtitle: "Employees marked present within the current date range and active filters.", value: numberFormatter.format(summary.present), tone: "emerald", query: { status: "P" } })} />
            <KpiCard label="Absent" value={numberFormatter.format(summary.absent)} detail={`${summary.totalRecords ? ((summary.absent / summary.totalRecords) * 100).toFixed(1) : "0.0"}% Absent`} icon={<UserRoundX size={18} />} tone="rose" active={kpiDrilldown?.key === "ABSENT"} onClick={() => openKpiDrilldown({ key: "ABSENT", title: "Absent employees", subtitle: "Employees marked absent within the current date range and active filters.", value: numberFormatter.format(summary.absent), tone: "rose", query: { status: "A" } })} />
            <KpiCard label="Attendance rate" value={`${summary.attendanceRate.toFixed(1)}%`} detail="Present ÷ total records" icon={<Activity size={18} />} tone="violet" active={kpiDrilldown?.key === "RATE"} onClick={() => openKpiDrilldown({ key: "RATE", title: "Attendance rate · Present records", subtitle: "The present employee records used to form the attendance rate for the current selection.", value: `${summary.attendanceRate.toFixed(1)}%`, tone: "violet", query: { status: "P" } })} />
            <KpiCard label="Punch out" value={numberFormatter.format(summary.checkedOut)} detail="Completed punch cycle" icon={<CheckCircle2 size={18} />} tone="teal" active={kpiDrilldown?.key === "CHECKED_OUT"} onClick={() => openKpiDrilldown({ key: "CHECKED_OUT", title: "Checked-out employees", subtitle: "Attendance records that contain a completed out-time punch.", value: numberFormatter.format(summary.checkedOut), tone: "emerald", query: { checkoutState: "CHECKED_OUT" } })} />
            <KpiCard label="Punch in" value={numberFormatter.format(summary.openCheckIns)} detail="In time without out time" icon={<Clock3 size={18} />} tone="amber" active={kpiDrilldown?.key === "OPEN_CHECKIN"} onClick={() => openKpiDrilldown({ key: "OPEN_CHECKIN", title: "Open check-ins", subtitle: "Employees with an in-time punch but no out-time punch yet.", value: numberFormatter.format(summary.openCheckIns), tone: "amber", query: { checkoutState: "OPEN_CHECKIN" } })} />
            <KpiCard label="Avg. Punch in" value={minutesToClock(summary.avgCheckInMinutes)} detail="Across available punches" icon={<TimerReset size={18} />} tone="blue" active={kpiDrilldown?.key === "AVG_CHECKIN"} onClick={() => openKpiDrilldown({ key: "AVG_CHECKIN", title: "Check-in records", subtitle: "Employee records with an available in-time punch used for check-in-time analysis.", value: minutesToClock(summary.avgCheckInMinutes), tone: "blue", query: { checkoutState: "HAS_CHECKIN" } })} />
            <KpiCard label="Avg. work time" value={minutesToDuration(summary.avgWorkMinutes)} detail="Completed punch cycles" icon={<BarChart3 size={18} />} tone="slate" active={kpiDrilldown?.key === "AVG_WORK"} onClick={() => openKpiDrilldown({ key: "AVG_WORK", title: "Completed work cycles", subtitle: "Employee records with valid in and out punches used for average working-time calculation.", value: minutesToDuration(summary.avgWorkMinutes), tone: "slate", query: { checkoutState: "COMPLETED_WORK" } })} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
            <ChartCard title="Attendance trend" subtitle="Daily workforce movement across the selected period" badge={data.dailyTrend.length === 1 ? "Single day" : `${data.dailyTrend.length} days`} icon={<Activity size={18} />} tone="blue">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100"><span className="h-2 w-2 rounded-full bg-blue-500" /> Present</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700 ring-1 ring-rose-100"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
                <span className="ml-auto hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:inline">Trend intelligence</span>
              </div>
              <div className="h-[295px] w-full rounded-2xl bg-gradient-to-b from-slate-50/70 to-white px-1 pt-2 ring-1 ring-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrend} margin={{ left: -15, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="presentArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.blue} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={chartColors.blue} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="absentArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.rose} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={chartColors.rose} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 12px 34px rgba(15,23,42,.12)", fontSize: 12 }} labelFormatter={(label) => formatShortDate(String(label))} />
                    <Area type="monotone" dataKey="present" name="Present" stroke={chartColors.blue} strokeWidth={2.7} fill="url(#presentArea)" dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: "#ffffff" }} />
                    <Area type="monotone" dataKey="absent" name="Absent" stroke={chartColors.rose} strokeWidth={2.3} fill="url(#absentArea)" dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: "#ffffff" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Attendance mix" subtitle="A quick view of present vs absent workforce" badge={`${summary.attendanceRate.toFixed(1)}% present`} icon={<UserCheck size={18} />} tone="emerald">
              <div className="relative h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={attendancePie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={96} paddingAngle={3} strokeWidth={0}>
                      {attendancePie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tracking-tight text-slate-900">{summary.attendanceRate.toFixed(1)}%</span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Attendance</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="group/mix rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 px-3.5 py-3 ring-1 ring-emerald-100 transition hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Present</p><UserCheck size={15} className="text-emerald-500" /></div>
                  <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{numberFormatter.format(summary.present)}</p>
                </div>
                <div className="group/mix rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/70 px-3.5 py-3 ring-1 ring-rose-100 transition hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Absent</p><UserRoundX size={15} className="text-rose-500" /></div>
                  <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{numberFormatter.format(summary.absent)}</p>
                </div>
              </div>
            </ChartCard>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="Check-in activity by hour" subtitle="Hourly punch pattern and peak reporting window" badge={`Peak ${peakCheckIn.label}`} icon={<Clock3 size={18} />} tone="violet">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-violet-50/70 px-3 py-2.5 ring-1 ring-violet-100"><p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Peak hour</p><p className="mt-0.5 text-sm font-black text-violet-900">{peakCheckIn.label}</p></div>
                <div className="rounded-2xl bg-blue-50/70 px-3 py-2.5 ring-1 ring-blue-100"><p className="text-[9px] font-black uppercase tracking-wider text-blue-500">Peak punches</p><p className="mt-0.5 text-sm font-black text-blue-900">{numberFormatter.format(peakCheckIn.count)}</p></div>
              </div>
              <div className="h-[245px] w-full rounded-2xl bg-gradient-to-b from-violet-50/35 to-white px-1 pt-2 ring-1 ring-violet-100/70">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={checkInDistribution} margin={{ left: -15, right: 6, top: 8, bottom: 0 }}>
                    <defs><linearGradient id="checkInBars" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#4f46e5" /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" interval={2} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="count" name="Check-ins" fill="url(#checkInBars)" radius={[7, 7, 2, 2]} maxBarSize={26} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Designation performance" subtitle="Attendance rate across major workforce groups" badge={bestDesignation ? `Best ${bestDesignation.rate.toFixed(1)}%` : "Top 12"} icon={<UsersRound size={18} />} tone="violet">
              <div className="h-[300px] w-full rounded-2xl bg-gradient-to-r from-violet-50/30 to-white px-2 py-2 ring-1 ring-violet-100/70">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.designationBreakdown} layout="vertical" margin={{ left: 18, right: 18, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="designation" width={142} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Attendance rate"]} contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="rate" radius={[0, 7, 7, 0]} maxBarSize={16} animationDuration={950}>
                      {data.designationBreakdown.map((item, index) => <Cell key={`${item.designation}-${index}`} fill={item.rate >= 85 ? chartColors.emerald : item.rate >= 70 ? chartColors.violet : item.rate >= 50 ? chartColors.amber : chartColors.rose} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <ChartCard title="Work duration" subtitle="Distribution of completed in/out punch durations" badge={`${numberFormatter.format(summary.checkedOut)} completed`} icon={<BarChart3 size={18} />} tone="blue">
              <div className="h-[245px] w-full rounded-2xl bg-gradient-to-b from-blue-50/35 to-white px-1 pt-2 ring-1 ring-blue-100/70">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.workDurationBuckets} margin={{ left: -15, right: 5, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="count" name="Employees" radius={[8, 8, 2, 2]} maxBarSize={40} animationDuration={950}>
                      {data.workDurationBuckets.map((item, index) => <Cell key={`${item.bucket}-${index}`} fill={[chartColors.rose, chartColors.amber, chartColors.blue, chartColors.emerald, chartColors.violet][index % 5]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Punch health" subtitle="How complete today's attendance punch cycles are" icon={<CheckCircle2 size={18} />} tone="amber">
              <div className="space-y-3 pt-1">
                {[
                  { label: "Punched out", value: summary.checkedOut, total: summary.totalRecords, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-gradient-to-r from-emerald-50 to-teal-50/60", icon: <CheckCircle2 size={16} /> },
                  { label: "Punched in", value: summary.openCheckIns, total: summary.totalRecords, color: "bg-amber-500", text: "text-amber-700", bg: "bg-gradient-to-r from-amber-50 to-orange-50/60", icon: <Clock3 size={16} /> },
                  { label: "No punch", value: summary.noPunch, total: summary.totalRecords, color: "bg-slate-400", text: "text-slate-600", bg: "bg-gradient-to-r from-slate-100 to-slate-50", icon: <AlertCircle size={16} /> },
                ].map((item) => {
                  const percent = item.total ? (item.value / item.total) * 100 : 0;
                  return (
                    <div key={item.label} className={`rounded-2xl ${item.bg} px-4 py-3.5`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-2 text-xs font-black ${item.text}`}>{item.icon}{item.label}</span>
                        <span className="text-sm font-black tabular-nums text-slate-950">{numberFormatter.format(item.value)} <span className="text-[10px] font-bold text-slate-400">({percent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
                        <div className={`h-full rounded-full ${item.color} transition-[width] duration-1000 ease-out`} style={{ width: `${Math.min(percent, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard title="Office attendance" subtitle="Location-wise attendance strength and participation" badge={`${data.officeBreakdown.length} shown`} icon={<Activity size={18} />} tone="emerald">
              <div className="space-y-3">
                {data.officeBreakdown.length ? data.officeBreakdown.slice(0, 5).map((office) => (
                  <div key={office.officeLocation} className="group/office rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2"><div className={`h-7 w-1 rounded-full ${office.rate >= 85 ? "bg-emerald-500" : office.rate >= 70 ? "bg-blue-500" : office.rate >= 50 ? "bg-amber-500" : "bg-rose-500"}`} /><p className="min-w-0 truncate text-xs font-black text-slate-700" title={office.officeLocation}>{office.officeLocation}</p></div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${office.rate >= 85 ? "bg-emerald-50 text-emerald-700" : office.rate >= 70 ? "bg-blue-50 text-blue-700" : office.rate >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{office.rate.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
                        <div className={`h-full rounded-full transition-[width] duration-1000 ease-out ${office.rate >= 85 ? "bg-emerald-500" : office.rate >= 70 ? "bg-blue-500" : office.rate >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${Math.min(office.rate, 100)}%` }} />
                      </div>
                      <span className="w-16 text-right text-[10px] font-semibold text-slate-400">{numberFormatter.format(office.present)}/{numberFormatter.format(office.total)}</span>
                    </div>
                  </div>
                )) : (
                  <div className="flex h-[210px] items-center justify-center text-center text-xs font-medium text-slate-400">No office/location values for this range</div>
                )}
              </div>
            </ChartCard>
          </section>

          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.055)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50/35 to-violet-50/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><UsersRound size={18} /></div>
                  <div>
                  <h2 className="text-base font-black tracking-tight text-slate-950">Employee attendance records</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{numberFormatter.format(data.pagination.total)} records match the current filters</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-blue-700 shadow-sm ring-1 ring-blue-100">
                  <CalendarDays size={13} /> {visibleRangeLabel}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50/95 text-left backdrop-blur">
                      {['Employee', 'Attendance ID', 'Designation', 'Date', 'In time', 'Out time', 'Duration', 'Status', 'Punch'].map((heading) => (
                        <th key={heading} className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((record: AttendanceRecord) => {
                      const punch = record.outTime ? "Checked out" : record.inTime ? "Open" : "No punch";
                      return (
                        <tr key={record.id} className="group border-b border-slate-100 transition-all duration-200 odd:bg-white even:bg-slate-50/25 hover:bg-blue-50/55 last:border-b-0">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                                {record.employeeName.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[190px] truncate text-xs font-bold text-slate-800" title={record.employeeName}>{record.employeeName}</p>
                                <p className="mt-0.5 max-w-[190px] truncate text-[10px] font-medium text-slate-400" title={record.officeLocation || ""}>{record.officeLocation || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-600">{record.attendanceId}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{record.designation || "—"}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatShortDate(record.attendanceDate)}</td>
                          <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100"><Clock3 size={11} />{formatTime(record.inTime)}</span></td>
                          <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-black ring-1 ${record.outTime ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-50 text-slate-400 ring-slate-100"}`}><CheckCircle2 size={11} />{formatTime(record.outTime)}</span></td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">{durationLabel(record.inTime, record.outTime)}</td>
                          <td className="px-4 py-3.5"><StatusPill status={record.status} /></td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black ring-1 ${record.outTime ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : record.inTime ? "bg-amber-50 text-amber-700 ring-amber-100" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{record.outTime ? <CheckCircle2 size={11} /> : record.inTime ? <Clock3 size={11} /> : <AlertCircle size={11} />}{punch}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!data.records.length && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
                    <Search size={24} className="mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No records match these filters</p>
                    <button onClick={resetFilters} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">Clear filters</button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-semibold text-slate-500">
                  Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(data.pagination.totalPages, current + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-violet-50/30 p-5 shadow-[0_14px_42px_rgba(15,23,42,0.055)]">
              <div className="absolute left-0 top-0 h-1 w-40 bg-gradient-to-r from-violet-500 via-fuchsia-400 to-transparent" />
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-900">Upload history</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Recent CSV imports for this city</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <History size={17} />
                </div>
              </div>

              <div className="space-y-2.5">
                {data.uploads.length ? data.uploads.map((upload) => (
                  <div key={upload.id} className="group/upload relative overflow-hidden rounded-2xl border border-slate-100 bg-white/90 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-md">
                    <div className={`absolute inset-y-0 left-0 w-1 ${upload.status === "COMPLETED" ? "bg-emerald-500" : upload.status === "FAILED" ? "bg-rose-500" : "bg-amber-500"}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-700" title={upload.fileName}>{upload.fileName}</p>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{formatShortDate(upload.attendanceDate)} · {formatDateTime(upload.createdAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${upload.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : upload.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{upload.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-100"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Valid</p><p className="mt-0.5 text-xs font-black text-slate-800">{numberFormatter.format(upload.validRows)}</p></div>
                      <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-100"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">New</p><p className="mt-0.5 text-xs font-black text-blue-700">{numberFormatter.format(upload.insertedRows)}</p></div>
                      <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-100"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Updated</p><p className="mt-0.5 text-xs font-black text-violet-700">{numberFormatter.format(upload.updatedRows)}</p></div>
                    </div>
                  </div>
                )) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
                    <UploadCloud size={22} className="mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">No uploads yet</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              >
                <UploadCloud size={14} /> Upload another CSV <ArrowUpRight size={13} />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function AttendanceAnalyticsPage() {
  return (
    <RoleGuard roles={["CITY_ADMIN"]}>
      <AttendanceDashboard />
    </RoleGuard>
  );
}