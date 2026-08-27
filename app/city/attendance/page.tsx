"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileSpreadsheet,
  Filter,
  Info,
  RefreshCw,
  Share2,
  Search,
  Sparkles,
  TimerReset,
  Trophy,
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
import { useAuth } from "@hooks/useAuth";
import { ApiError } from "@lib/apiClient";
import { isHmsSuperAdmin } from "@utils/rbac";
import {
  AttendanceApi,
  type AttendanceCity,
  type AttendanceDashboardQuery,
  type AttendanceDashboardResponse,
  type AttendanceEmployeeSummary,
  type AttendanceRecord,
  type AttendanceUploadCalendarResponse,
  type AttendanceUploadResponse,
} from "@lib/attendanceApi";

const numberFormatter = new Intl.NumberFormat("en-IN");

function formatAverageValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 100 || Number.isInteger(value)) return numberFormatter.format(Math.round(value));
  return value.toFixed(1);
}

function averageFormula(total: number, days: number) {
  return `${numberFormatter.format(total)} ÷ ${days} ${days === 1 ? "day" : "days"}`;
}

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
  checkoutState: string;
  search: string;
};

const emptyFilters: FilterState = {
  from: "",
  to: "",
  status: "ALL",
  designation: "",
  checkoutState: "ALL",
  search: "",
};

type SearchableOption = { value: string; label: string };

function formatScopeNames(values?: string[] | string) {
  if (Array.isArray(values)) return values.length ? values.join(", ") : "—";
  if (typeof values === "string" && values.trim()) return values.trim();
  return "—";
}

function SearchableSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label || "";
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle || query === selectedLabel) return options;
    return options.filter((option) => option.label.toLocaleLowerCase().includes(needle));
  }, [options, query, selectedLabel]);

  const choose = (option: SearchableOption) => {
    setQuery(option.label);
    setOpen(false);
    onChange(option.value);
  };

  return (
    <div className="relative">
      <Search size={13} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onFocus={(event) => {
          setOpen(true);
          event.currentTarget.select();
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredOptions[0]) {
            event.preventDefault();
            choose(filteredOptions[0]);
          } else if (event.key === "Escape") {
            setQuery(selectedLabel);
            setOpen(false);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setQuery(selectedLabel);
            setOpen(false);
          }, 120);
        }}
        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
      />
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.value || option.label}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition ${
                  option.value === value
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-2 text-xs font-semibold text-slate-400">No matching option</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatShortDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function toLocalDateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${present
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : absent
            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${present ? "bg-emerald-500" : absent ? "bg-rose-500" : "bg-slate-400"
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
      className={`group relative flex min-h-[170px] w-full flex-col overflow-hidden rounded-[18px] border bg-white px-3.5 pb-2.5 pt-3.5 text-left shadow-[0_6px_18px_rgba(15,23,42,0.055)] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 ${active
          ? "-translate-y-0.5 border-blue-300 shadow-[0_14px_32px_rgba(37,99,235,0.12)] ring-2 ring-blue-100"
          : "border-slate-200/90 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
        }`}
      aria-label={`View ${label} records`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${toneStyle.badge} ${toneStyle.shadow}`}
          style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%)" }}
        >
          {icon}
        </div>
        <p className="pt-0.5 text-[10.5px] font-extrabold leading-[14px] tracking-[-0.01em] text-slate-800">
          {label}
        </p>
      </div>

      <div className="mt-3">
        <p className="whitespace-nowrap text-[24px] font-black tabular-nums leading-none tracking-[-0.04em] text-slate-950 2xl:text-[26px]">
          {value}
        </p>
        <p className="mt-1.5 min-h-[28px] text-[9.5px] font-semibold leading-[14px] text-slate-500">
          {detail}
        </p>
      </div>

      <div className="mt-auto -mx-1 pt-1.5">
        <KpiSparkline tone={tone} />
      </div>

      <div className="mt-1 flex items-center justify-center border-t border-slate-100 pt-2">
        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-blue-600 transition-colors group-hover:text-blue-700">
          View records <ArrowUpRight size={10} strokeWidth={2.3} />
        </span>
      </div>
    </button>
  );
}

function ChartCard({
  title,
  subtitle,
  badge,
  headerRight,
  icon,
  tone = "blue",
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  headerRight?: React.ReactNode;
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
    <section className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/45 p-5 shadow-[0_12px_38px_rgba(15,23,42,0.055)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.09)]">
      <div className={`absolute left-0 top-0 h-1 w-40 bg-gradient-to-r ${tones[tone].bar}`} />
      <div className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125 ${tones[tone].glow}`} />
      <div className="relative mb-5 flex shrink-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 shadow-sm ${tones[tone].icon}`}>{icon}</div>}
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-[-0.02em] text-slate-950">{title}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{subtitle}</p>
          </div>
        </div>
        {headerRight ? (
          <div className="shrink-0">{headerRight}</div>
        ) : (
          badge && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ring-1 ${tones[tone].badge}`}>
              {badge}
            </span>
          )
        )}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
  tone?: "blue" | "emerald" | "rose" | "violet" | "teal" | "amber" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    teal: "bg-teal-50 text-teal-600 ring-teal-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  } as const;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition hover:border-slate-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        {icon && (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ${tones[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-1.5 whitespace-nowrap text-lg font-black tabular-nums text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-[9.5px] font-semibold leading-[13px] text-slate-500">{detail}</p>}
    </div>
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
  onUpload: (files: File[]) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setDragging(false);
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const acceptFiles = (nextFiles: File[]) => {
    const csvFiles = nextFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".csv")
    );

    if (!csvFiles.length) return;

    setFiles((current) => {
      const merged = [...current];

      csvFiles.forEach((file) => {
        if (
          !merged.some(
            (item) =>
              item.name === file.name &&
              item.size === file.size
          )
        ) {
          merged.push(file);
        }
      });

      return merged;
    });
  };

  const removeFile = (index: number) => {
    setFiles((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  };

  return createPortal(
    <div
      className="z-[9999] bg-slate-950/40 backdrop-blur-[2px]"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
      }}
      onMouseDown={() => {
        if (!uploading) onClose();
      }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
        style={{
          position: "fixed",
          left: "50vw",
          top: "50dvh",
          transform: "translate(-50%, -50%)",
          width: "min(580px, calc(100vw - 28px))",
          maxHeight: "min(610px, calc(100dvh - 56px))",
          margin: 0,
        }}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              <UploadCloud size={18} />
            </div>

            <div className="min-w-0">
              <h2 className="text-[15px] font-black tracking-tight text-slate-900">
                Upload attendance CSVs
              </h2>

              <p className="mt-0.5 text-[10.5px] font-semibold text-slate-500">
                Upload Present and Absent exports together or separately
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            aria-label="Close upload attendance modal"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) =>
              acceptFiles(
                Array.from(
                  event.target.files || []
                )
              )
            }
          />

          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() =>
              setDragging(false)
            }
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);

              acceptFiles(
                Array.from(
                  event.dataTransfer.files || []
                )
              );
            }}
            className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${dragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40"
              }`}
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
              <FileSpreadsheet size={22} />
            </div>

            <p className="text-xs font-black text-slate-800">
              Drop Present + Absent CSVs here
            </p>

            <p className="mt-1 text-[10.5px] font-medium text-slate-500">
              Select multiple CSV files · maximum 15 MB each
            </p>
          </button>

          {files.length > 0 && (
            <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1">
              {files.map(
                (file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-emerald-100">
                        <CheckCircle2 size={15} />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="truncate text-[11px] font-bold text-slate-800"
                          title={file.name}
                        >
                          {file.name}
                        </p>

                        <p className="mt-0.5 text-[9.5px] font-medium text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB · ready
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(index)
                      }
                      disabled={uploading}
                      className="shrink-0 text-[10px] font-bold text-slate-500 hover:text-rose-600 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-[10.5px] font-medium leading-4 text-blue-800">
            Detailed View exports are supported, including
            <b> Emp Id</b>, Present files without Status,
            Absent files with Status A, and
            <b> 0000-00-00 00:00:00</b> Punch Out values.
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-white disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() =>
              files.length &&
              onUpload(files)
            }
            disabled={
              !files.length ||
              uploading
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {uploading ? (
              <RefreshCw
                size={14}
                className="animate-spin"
              />
            ) : (
              <ArrowDownToLine size={14} />
            )}

            {uploading
              ? "Importing..."
              : `Import ${files.length} ${files.length === 1
                ? "file"
                : "files"
              }`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UploadCalendarModal({
  open,
  monthDate,
  data,
  loading,
  todayKey,
  onPreviousMonth,
  onNextMonth,
  onClose,
}: {
  open: boolean;
  monthDate: Date;
  data: AttendanceUploadCalendarResponse | null;
  loading: boolean;
  todayKey: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
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

  if (!open || typeof document === "undefined") return null;

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const uploadedByDate = new Map((data?.days || []).map((item) => [item.date, item]));
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null;
    const day = index - firstDay + 1;
    const date = new Date(year, month, day);
    const dateKey = toLocalDateKey(date);
    const upload = uploadedByDate.get(dateKey);
    const uploaded = Boolean(upload?.completedUploads);
    const future = dateKey > todayKey;
    return { day, dateKey, upload, uploaded, future };
  });

  return createPortal(
    <div
      className="z-[9999] bg-slate-950/40 backdrop-blur-[2px]"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh" }}
      onMouseDown={onClose}
    >
      <div
        className="overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
        style={{
          position: "fixed",
          left: "50vw",
          top: "50dvh",
          transform: "translate(-50%, -50%)",
          width: "min(620px, calc(100vw - 28px))",
          maxHeight: "calc(100dvh - 40px)",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-black tracking-tight text-slate-900">Attendance CSV calendar</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-emerald-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Uploaded
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-rose-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Not uploaded
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                  <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" /> Future date
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close attendance upload calendar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPreviousMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-black text-slate-900">{monthLabel}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Daily upload status</p>
            </div>
            <button
              type="button"
              onClick={onNextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{day}</div>
            ))}
            {cells.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className="aspect-square" />;
              const isToday = cell.dateKey === todayKey;
              const className = loading
                ? "border-slate-100 bg-slate-50/70 text-slate-400"
                : cell.future
                  ? "border-slate-100 bg-white text-slate-400"
                  : cell.uploaded
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-700";
              const title = loading
                ? "Checking upload status"
                : cell.future
                  ? "Future date"
                  : cell.uploaded
                    ? `${cell.upload?.completedUploads || 0} CSV ${cell.upload?.completedUploads === 1 ? "file" : "files"} uploaded`
                    : "CSV not uploaded";

              return (
                <div
                  key={cell.dateKey}
                  title={title}
                  className={`relative flex aspect-square min-h-[42px] flex-col items-center justify-center rounded-lg border text-[11px] font-black transition ${className} ${isToday ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
                >
                  <span>{cell.day}</span>
                  {!loading && !cell.future && (
                    cell.uploaded
                      ? <CheckCircle2 size={12} className="mt-1 text-emerald-600" />
                      : <AlertCircle size={12} className="mt-1 text-rose-500" />
                  )}
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-500">
              <RefreshCw size={13} className="animate-spin" /> Loading upload status...
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-slate-100 pt-4 text-[10px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Uploaded</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Not uploaded</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-white" /> Future</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


type KpiDrilldown = {
  key: "ALL" | "PRESENT" | "ABSENT" | "RATE" | "PUNCH_IN" | "PUNCH_OUT" | "OPEN_PUNCH_IN" | "AVG_PUNCH_IN" | "AVG_WORK";
  title: string;
  subtitle: string;
  value: string;
  tone: "blue" | "emerald" | "rose" | "violet" | "teal" | "amber" | "slate";
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
    teal: "from-teal-600 to-cyan-500 bg-teal-50 text-teal-700 ring-teal-100",
    amber: "from-amber-500 to-orange-500 bg-amber-50 text-amber-700 ring-amber-100",
    slate: "from-slate-700 to-slate-500 bg-slate-100 text-slate-700 ring-slate-200",
  };
  const total = data?.pagination.total || 0;
  const totalPages = Math.max(data?.pagination.totalPages || 0, 1);

  return createPortal(
    <div
      className="fixed inset-0 z-[35] bg-slate-950/35 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <aside
        className="fixed bottom-5 left-4 right-4 top-[124px] flex flex-col overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] animate-[attendanceDrawer_.3s_cubic-bezier(.2,.8,.2,1)] sm:left-5 sm:right-5 lg:left-[calc(18rem+1.25rem)] lg:top-[136px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-5 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white ${toneClasses[config.tone].split(' ').slice(0, 2).join(' ')}`}>
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
                  <table className="w-full min-w-[1180px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        {['Employee', 'Attendance ID', 'Designation', 'Zone', 'Ward', 'Date', 'Punch In', 'Punch Out', 'Duration', 'Status', 'Punch status'].map((heading) => (
                          <th key={heading} className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.records || []).map((record: AttendanceRecord) => {
                        const punch = record.outTime ? "Punch Out" : record.inTime ? "Punch In" : "No punch";
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
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatScopeNames((record as any).zone || record.zones)}</td>
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatScopeNames((record as any).ward || record.wards)}</td>
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
    </div>,
    document.body
  );
}

function EmployeeRecordsDrawer({
  open,
  employee,
  data,
  loading,
  page,
  onPageChange,
  onClose,
}: {
  open: boolean;
  employee: AttendanceEmployeeSummary | null;
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

  if (!open || !employee) return null;

  const records = data?.records || [];
  const totalPages = Math.max(data?.pagination.totalPages || 0, 1);

  return createPortal(
    <div
      className="fixed inset-0 z-[35] bg-slate-950/35 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <aside
        className="fixed bottom-5 left-4 right-4 top-[124px] flex flex-col overflow-hidden rounded-[26px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] animate-[attendanceDrawer_.3s_cubic-bezier(.2,.8,.2,1)] sm:left-5 sm:right-5 lg:left-[calc(18rem+1.25rem)] lg:top-[136px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-5 text-white sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                  Employee drill-down
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-blue-100">
                  {employee.attendanceId}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-[-0.03em] sm:text-2xl">{employee.employeeName}</h2>
              <p className="mt-1.5 max-w-3xl text-xs font-semibold leading-5 text-blue-100/75">
                {employee.designation || "Employee"} · {employee.officeLocation || "—"} · Zone: {formatScopeNames(employee.zones)} · Ward: {formatScopeNames(employee.wards)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-400/15 px-2.5 py-1 text-[10.5px] font-black text-emerald-200 ring-1 ring-emerald-300/20">
                  {employee.presentDays}/{employee.totalDays} present ({employee.attendanceRate.toFixed(1)}%)
                </span>
                <span className="rounded-lg bg-rose-400/15 px-2.5 py-1 text-[10.5px] font-black text-rose-200 ring-1 ring-rose-300/20">
                  {employee.absentDays} absent
                </span>
                <span className="rounded-lg bg-blue-400/15 px-2.5 py-1 text-[10.5px] font-black text-blue-200 ring-1 ring-blue-300/20">
                  {employee.completedPunches} completed punch cycles
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[10.5px] font-black text-white/90 ring-1 ring-white/15">
                  Avg work time {minutesToDuration(employee.avgWorkMinutes)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close employee records"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50/55">
          {loading && !data ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw size={22} className="animate-spin text-blue-600" />
              <p className="text-sm font-bold">Loading this employee's attendance...</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        {['Date', 'Punch In', 'Punch Out', 'Duration', 'Status', 'Punch status'].map((heading) => (
                          <th key={heading} className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record: AttendanceRecord) => {
                        const punch = record.outTime ? "Punch Out" : record.inTime ? "Punch In" : "No punch";
                        return (
                          <tr key={record.id} className="border-b border-slate-100 transition-colors odd:bg-white even:bg-slate-50/35 hover:bg-blue-50/60 last:border-b-0">
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

                {!loading && !records.length && (
                  <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                    <Search size={25} className="mb-3 text-slate-300" />
                    <p className="text-sm font-black text-slate-700">No records found</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">This employee has no attendance rows in the selected date range.</p>
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
    </div>,
    document.body
  );
}


function WorkDurationEmployeesPopup({
  open,
  bucket,
  expectedCount,
  data,
  loading,
  page,
  onPageChange,
  onClose,
}: {
  open: boolean;
  bucket: string | null;
  expectedCount: number;
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

  if (!open || !bucket || typeof document === "undefined") return null;

  const records = data?.records || [];
  const total = data?.pagination.total ?? expectedCount;
  const totalPages = Math.max(data?.pagination.totalPages || 1, 1);

  return createPortal(
    <div
      className="z-[9999] bg-slate-950/35 backdrop-blur-[2px]"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
      }}
      onMouseDown={onClose}
    >
      <div
        className="flex flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]"
        style={{
          position: "fixed",
          left: "50vw",
          top: "50dvh",
          transform: "translate(-50%, -50%)",
          width: "min(560px, calc(100vw - 28px))",
          maxHeight: "min(560px, calc(100dvh - 56px))",
          margin: 0,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                Work duration
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 ring-1 ring-slate-200">
                {numberFormatter.format(total)} employees
              </span>
            </div>
            <h3 className="truncate text-[15px] font-black tracking-tight text-slate-900">
              {bucket} employees
            </h3>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Completed Punch In / Punch Out records in this duration range.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close work duration employees"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {loading && !data ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw size={20} className="animate-spin text-blue-600" />
              <p className="text-xs font-bold">Loading employees...</p>
            </div>
          ) : records.length ? (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/65 px-3 py-2.5 transition hover:border-blue-100 hover:bg-blue-50/45"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-black text-blue-700 shadow-sm ring-1 ring-blue-100">
                    {record.employeeName.slice(0, 1).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-black text-slate-800" title={record.employeeName}>
                        {record.employeeName}
                      </p>
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700 ring-1 ring-blue-100">
                        {durationLabel(record.inTime, record.outTime)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[9.5px] font-semibold text-slate-400">
                      {record.designation || "Employee"} · {record.attendanceId}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400" title={`Zone: ${formatScopeNames((record as any).zone || record.zones)} · Ward: ${formatScopeNames((record as any).ward || record.wards)}`}>
                      Zone: {formatScopeNames((record as any).zone || record.zones)} · Ward: {formatScopeNames((record as any).ward || record.wards)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                      <span className="rounded-md bg-white px-1.5 py-1 text-slate-600 ring-1 ring-slate-200">
                        {formatShortDate(record.attendanceDate)}
                      </span>
                      <span className="rounded-md bg-blue-50 px-1.5 py-1 text-blue-700 ring-1 ring-blue-100">
                        In {formatTime(record.inTime)}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-emerald-700 ring-1 ring-emerald-100">
                        Out {formatTime(record.outTime)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
              <UsersRound size={24} className="mb-2 text-slate-300" />
              <p className="text-xs font-black text-slate-600">No employees found</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                No completed work durations match this bucket under the current filters.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <p className="text-[9.5px] font-semibold text-slate-500">
            Page {data?.pagination.page || page} of {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9.5px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={12} />
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9.5px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AttendanceDashboard() {
  const { user } = useAuth();
  const hmsSuperAdmin = isHmsSuperAdmin(user);
  const isUlbOfficer =
    user?.roles?.some((role) => String(role).toUpperCase() === "ULB_OFFICER") ?? false;
  const [cities, setCities] = useState<AttendanceCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [data, setData] = useState<AttendanceDashboardResponse | null>(null);
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(emptyFilters);
  const [employeeGroup, setEmployeeGroup] = useState<"ALL" | "HEALTH_WORKERS">("ALL");
  const [page, setPage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarData, setCalendarData] = useState<AttendanceUploadCalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [todayUploadData, setTodayUploadData] = useState<AttendanceUploadCalendarResponse | null>(null);
  const [todayUploadLoading, setTodayUploadLoading] = useState(false);
  const [uploadTrackingVersion, setUploadTrackingVersion] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [kpiDrilldown, setKpiDrilldown] = useState<KpiDrilldown | null>(null);
  const [kpiDrilldownData, setKpiDrilldownData] = useState<AttendanceDashboardResponse | null>(null);
  const [kpiDrilldownPage, setKpiDrilldownPage] = useState(1);
  const [kpiDrilldownLoading, setKpiDrilldownLoading] = useState(false);
  const [workDurationBucket, setWorkDurationBucket] = useState<string | null>(null);
  const [workDurationData, setWorkDurationData] = useState<AttendanceDashboardResponse | null>(null);
  const [workDurationPage, setWorkDurationPage] = useState(1);
  const [workDurationLoading, setWorkDurationLoading] = useState(false);
  const [designationPage, setDesignationPage] = useState(1);
  const [designationNameFilter, setDesignationNameFilter] = useState("");
  const [designationRateFilter, setDesignationRateFilter] = useState<"ALL" | "HIGH" | "MID_HIGH" | "MID_LOW" | "LOW">("ALL");
  const [topEmployeesPage, setTopEmployeesPage] = useState(1);
  const [employeeDrilldown, setEmployeeDrilldown] = useState<AttendanceEmployeeSummary | null>(null);
  const [employeeDrilldownData, setEmployeeDrilldownData] = useState<AttendanceDashboardResponse | null>(null);
  const [employeeDrilldownPage, setEmployeeDrilldownPage] = useState(1);
  const [employeeDrilldownLoading, setEmployeeDrilldownLoading] = useState(false);

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const calendarYear = calendarMonthDate.getFullYear();
  const calendarMonth = calendarMonthDate.getMonth() + 1;
  const attendanceCityId = hmsSuperAdmin ? selectedCityId || undefined : undefined;

  const buildQuery = (filters: FilterState, requestedPage: number): AttendanceDashboardQuery => ({
    cityId: attendanceCityId,
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.status === "ALL" ? undefined : filters.status,
    designation: filters.designation || undefined,
    checkoutState: filters.checkoutState === "ALL" ? undefined : filters.checkoutState,
    search: filters.search.trim() || undefined,
    employeeGroup: employeeGroup === "ALL" ? undefined : employeeGroup,
    page: requestedPage,
    pageSize: employeePageSize,
  });

  useEffect(() => {
    if (!hmsSuperAdmin) return;

    let cancelled = false;

    const loadCities = async () => {
      setCitiesLoading(true);
      try {
        const result = await AttendanceApi.cities();
        if (cancelled) return;

        setCities(result.cities);
        setSelectedCityId((current) => {
          if (current && result.cities.some((city) => city.id === current)) return current;
          if (user?.cityId && result.cities.some((city) => city.id === user.cityId)) return user.cityId;
          return result.cities[0]?.id || "";
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load cities");
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    };

    void loadCities();
    return () => {
      cancelled = true;
    };
  }, [hmsSuperAdmin, user?.cityId]);

  useEffect(() => {
    if (hmsSuperAdmin && !selectedCityId) {
      setTodayUploadData(null);
      setTodayUploadLoading(false);
      return;
    }

    let cancelled = false;
    setTodayUploadLoading(true);

    AttendanceApi.uploadCalendar(todayYear, todayMonth, attendanceCityId)
      .then((result) => {
        if (!cancelled) setTodayUploadData(result);
      })
      .catch(() => {
        if (!cancelled) setTodayUploadData(null);
      })
      .finally(() => {
        if (!cancelled) setTodayUploadLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attendanceCityId, hmsSuperAdmin, selectedCityId, todayMonth, todayYear, uploadTrackingVersion]);

  useEffect(() => {
    if (!calendarOpen) return;
    if (hmsSuperAdmin && !selectedCityId) {
      setCalendarData(null);
      setCalendarLoading(false);
      return;
    }

    let cancelled = false;
    setCalendarLoading(true);

    AttendanceApi.uploadCalendar(calendarYear, calendarMonth, attendanceCityId)
      .then((result) => {
        if (!cancelled) setCalendarData(result);
      })
      .catch(() => {
        if (!cancelled) setCalendarData(null);
      })
      .finally(() => {
        if (!cancelled) setCalendarLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attendanceCityId, calendarMonth, calendarOpen, calendarYear, hmsSuperAdmin, selectedCityId, uploadTrackingVersion]);

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
    if (hmsSuperAdmin && !selectedCityId) {
      setLoading(false);
      return;
    }

    void loadDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, employeePageSize, selectedCityId, hmsSuperAdmin, employeeGroup]);

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
  }, [kpiDrilldown, kpiDrilldownPage, appliedFilters, selectedCityId, hmsSuperAdmin]);


  useEffect(() => {
    if (!workDurationBucket) {
      setWorkDurationData(null);
      return;
    }

    let cancelled = false;

    const loadWorkDurationEmployees = async () => {
      setWorkDurationLoading(true);
      try {
        const result = await AttendanceApi.dashboard({
          ...buildQuery(appliedFilters, workDurationPage),
          workDurationBucket,
          page: workDurationPage,
          pageSize: 8,
        });

        if (!cancelled) {
          setWorkDurationData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Unable to load employees for this work duration"
          );
        }
      } finally {
        if (!cancelled) {
          setWorkDurationLoading(false);
        }
      }
    };

    void loadWorkDurationEmployees();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDurationBucket, workDurationPage, appliedFilters, selectedCityId, hmsSuperAdmin]);

  useEffect(() => {
    if (!employeeDrilldown) {
      setEmployeeDrilldownData(null);
      return;
    }

    let cancelled = false;

    const loadEmployeeRecords = async () => {
      setEmployeeDrilldownLoading(true);
      try {
        const result = await AttendanceApi.dashboard({
          cityId: attendanceCityId,
          from: appliedFilters.from || undefined,
          to: appliedFilters.to || undefined,
          employeeGroup: employeeGroup === "ALL" ? undefined : employeeGroup,
          employeeId: employeeDrilldown.attendanceId,
          page: employeeDrilldownPage,
          pageSize: 25,
        });
        if (!cancelled) setEmployeeDrilldownData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load this employee's attendance");
        }
      } finally {
        if (!cancelled) setEmployeeDrilldownLoading(false);
      }
    };

    void loadEmployeeRecords();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeDrilldown, employeeDrilldownPage, appliedFilters, selectedCityId, hmsSuperAdmin, employeeGroup]);

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    setData(null);
    setTodayUploadData(null);
    setCalendarData(null);
    setCalendarOpen(false);
    const now = new Date();
    setCalendarMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setDraftFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
    setPage(1);
    setKpiDrilldown(null);
    setKpiDrilldownData(null);
    setWorkDurationBucket(null);
    setWorkDurationData(null);
    setEmployeeDrilldown(null);
    setEmployeeDrilldownData(null);
    setDesignationPage(1);
    setTopEmployeesPage(1);
    setNotice("");
    setError("");
  };

  const openWorkDurationBucket = (bucket: string) => {
    setWorkDurationBucket(bucket);
    setWorkDurationPage(1);
    setWorkDurationData(null);
  };

  const openEmployeeDrilldown = (employee: AttendanceEmployeeSummary) => {
    setEmployeeDrilldownPage(1);
    setEmployeeDrilldownData(null);
    setEmployeeDrilldown(employee);
  };

  const openKpiDrilldown = (config: KpiDrilldown) => {
    setKpiDrilldownPage(1);
    setKpiDrilldownData(null);
    setKpiDrilldown(config);
  };

  const summary = data?.summary;
  const punchInCount = summary
    ? summary.punchIn ?? summary.checkedOut + summary.openCheckIns
    : 0;

  const rangeDayCount = data?.dailyTrend?.length || 0;
  const isMultiDayRange = rangeDayCount > 1;
  const avgDivisor = Math.max(rangeDayCount, 1);

  const avgPresent = summary ? summary.present / avgDivisor : 0;
  const avgAbsent = summary ? summary.absent / avgDivisor : 0;
  const avgTotalRecords = summary ? summary.totalRecords / avgDivisor : 0;
  const avgPunchIn = summary ? punchInCount / avgDivisor : 0;
  const avgCheckedOut = summary ? summary.checkedOut / avgDivisor : 0;
  const avgOpenCheckIns = summary ? summary.openCheckIns / avgDivisor : 0;
  const avgNoPunch = summary ? summary.noPunch / avgDivisor : 0;

  const punchCompletionPie = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Punch Out", value: summary.checkedOut, color: chartColors.emerald },
      { name: "Not punched out", value: summary.openCheckIns, color: chartColors.amber },
      { name: "No punch", value: summary.noPunch, color: chartColors.slate },
    ].filter((item) => item.value > 0);
  }, [summary?.checkedOut, summary?.openCheckIns, summary?.noPunch]);

  const punchCompletionRate =
    summary && summary.totalRecords ? (summary.checkedOut / summary.totalRecords) * 100 : 0;

  const checkInDistribution = useMemo(() => {
    const byHour = new Map((data?.checkInDistribution || []).map((item) => [item.hour, item.count]));
    const days = Math.max(data?.dailyTrend?.length || 0, 1);
    const multiDay = (data?.dailyTrend?.length || 0) > 1;
    return Array.from({ length: 24 }, (_, hour) => {
      const raw = byHour.get(hour) || 0;
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        count: multiDay ? Number((raw / days).toFixed(1)) : raw,
        rawCount: raw,
      };
    });
  }, [data?.checkInDistribution, data?.dailyTrend]);

  const workDurationChartData = useMemo(() => {
    const days = Math.max(data?.dailyTrend?.length || 0, 1);
    const multiDay = (data?.dailyTrend?.length || 0) > 1;
    return (data?.workDurationBuckets || []).map((item) => ({
      ...item,
      rawCount: item.count,
      count: multiDay ? Number((item.count / days).toFixed(1)) : item.count,
    }));
  }, [data?.workDurationBuckets, data?.dailyTrend]);

  const peakCheckIn = useMemo(() => {
    return checkInDistribution.reduce((best, item) => item.count > best.count ? item : best, checkInDistribution[0] || { hour: 0, label: "—", count: 0, rawCount: 0 });
  }, [checkInDistribution]);

  const sortedDesignationBreakdown = useMemo(() => {
    return [...(data?.designationBreakdown || [])].sort(
      (a, b) => b.rate - a.rate || b.present - a.present || a.designation.localeCompare(b.designation)
    );
  }, [data?.designationBreakdown]);

  const bestDesignation = sortedDesignationBreakdown[0] || null;
  const worstDesignation =
    sortedDesignationBreakdown.length > 1
      ? sortedDesignationBreakdown[sortedDesignationBreakdown.length - 1]
      : null;

  const designationsFullyPresentCount = sortedDesignationBreakdown.filter(
    (item) => item.total > 0 && item.present === item.total
  ).length;
  const designationsFullyAbsentCount = sortedDesignationBreakdown.filter(
    (item) => item.total > 0 && item.present === 0
  ).length;

  const sortedDurationBuckets = useMemo(
    () => [...workDurationChartData].sort((a, b) => b.count - a.count),
    [workDurationChartData]
  );
  const peakDurationBucket = sortedDurationBuckets[0] || null;
  const leastDurationBucket =
    sortedDurationBuckets.length > 1
      ? sortedDurationBuckets[sortedDurationBuckets.length - 1]
      : null;

  const employeePerformance = data?.employeePerformance || null;

  const designationRateMatchers: Record<typeof designationRateFilter, (rate: number) => boolean> = {
    ALL: () => true,
    HIGH: (rate) => rate >= 85,
    MID_HIGH: (rate) => rate >= 70 && rate < 85,
    MID_LOW: (rate) => rate >= 50 && rate < 70,
    LOW: (rate) => rate < 50,
  };

  const filteredDesignationBreakdown = useMemo(() => {
    const rateMatch = designationRateMatchers[designationRateFilter];
    return sortedDesignationBreakdown.filter(
      (item) => (!designationNameFilter || item.designation === designationNameFilter) && rateMatch(item.rate)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedDesignationBreakdown, designationNameFilter, designationRateFilter]);

  const designationPageSize = 8;
  const designationTotal = filteredDesignationBreakdown.length;
  const designationTotalPages = Math.max(1, Math.ceil(designationTotal / designationPageSize));
  const designationPageItems = useMemo(() => {
    const start = (designationPage - 1) * designationPageSize;
    return filteredDesignationBreakdown.slice(start, start + designationPageSize);
  }, [filteredDesignationBreakdown, designationPage]);
  const designationStart = designationTotal ? (designationPage - 1) * designationPageSize + 1 : 0;
  const designationEnd = Math.min(designationPage * designationPageSize, designationTotal);

  useEffect(() => {
    setDesignationPage((current) => Math.min(current, designationTotalPages));
  }, [designationTotalPages]);

  useEffect(() => {
    setDesignationPage(1);
  }, [designationNameFilter, designationRateFilter]);

  useEffect(() => {
    if (designationNameFilter && !sortedDesignationBreakdown.some((item) => item.designation === designationNameFilter)) {
      setDesignationNameFilter("");
    }
  }, [sortedDesignationBreakdown, designationNameFilter]);

  const topEmployeesPageSize = 3;
  const topEmployeesTotal = data?.topEmployees.length || 0;
  const topEmployeesTotalPages = Math.max(1, Math.ceil(topEmployeesTotal / topEmployeesPageSize));
  const topEmployeesPageItems = useMemo(() => {
    const start = (topEmployeesPage - 1) * topEmployeesPageSize;
    return (data?.topEmployees || []).slice(start, start + topEmployeesPageSize);
  }, [data?.topEmployees, topEmployeesPage]);

  useEffect(() => {
    setTopEmployeesPage((current) => Math.min(current, topEmployeesTotalPages));
  }, [topEmployeesTotalPages]);

  const topEmployeesStart = topEmployeesTotal ? (topEmployeesPage - 1) * topEmployeesPageSize + 1 : 0;
  const topEmployeesEnd = Math.min(topEmployeesPage * topEmployeesPageSize, topEmployeesTotal);

  const updateFilter = (patch: Partial<FilterState>) => {
    const next = { ...draftFilters, ...patch };
    if (next.from && next.to && next.from > next.to) {
      setDraftFilters(next);
      setError("From date cannot be after To date");
      return;
    }
    setError("");
    setDraftFilters(next);
    setPage(1);
    setDesignationPage(1);
    setTopEmployeesPage(1);
    setAppliedFilters(next);
  };

  const applyFilters = () => {
    if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
      setError("From date cannot be after To date");
      return;
    }
    setError("");
    setPage(1);
    setDesignationPage(1);
    setTopEmployeesPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters({ ...emptyFilters });
    setPage(1);
    setDesignationPage(1);
    setTopEmployeesPage(1);
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
    setDesignationPage(1);
    setTopEmployeesPage(1);
    setAppliedFilters(next);
  };

  const handleUpload = async (files: File[]) => {
    const csvFiles = files.filter((file) => file.name.toLowerCase().endsWith(".csv"));
    if (!csvFiles.length) {
      setError("Please choose at least one CSV file");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const results: AttendanceUploadResponse[] = [];

      for (const file of csvFiles) {
        const result = await AttendanceApi.upload(
          file,
          hmsSuperAdmin ? selectedCityId : undefined
        );
        results.push(result);
      }

      const insertedRows = results.reduce((sum, result) => sum + result.batch.insertedRows, 0);
      const updatedRows = results.reduce((sum, result) => sum + result.batch.updatedRows, 0);
      const invalidRows = results.reduce((sum, result) => sum + result.batch.invalidRows, 0);
      const dates = Array.from(new Set(results.map((result) => formatShortDate(result.batch.attendanceDate))));

      setUploadOpen(false);
      setNotice(
        `${results.length} CSV ${results.length === 1 ? "file" : "files"} imported for ${dates.join(", ")} · ${numberFormatter.format(insertedRows)} new · ${numberFormatter.format(updatedRows)} updated${invalidRows ? ` · ${numberFormatter.format(invalidRows)} rejected` : ""
        }`
      );
      setPage(1);
      setDraftFilters({ ...emptyFilters });
      setAppliedFilters({ ...emptyFilters });
      setUploadTrackingVersion((current) => current + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "CSV import failed");
    } finally {
      setUploading(false);
    }
  };

  const todayUpload = todayUploadData?.days.find((item) => item.date === todayKey) || null;
  const todayUploaded = Boolean(todayUpload?.completedUploads);

  const visibleRangeLabel = data?.range
    ? data.range.from === data.range.to
      ? formatShortDate(data.range.from)
      : `${formatShortDate(data.range.from)} – ${formatShortDate(data.range.to)}`
    : "No attendance data";

  const selectedCity = hmsSuperAdmin
    ? cities.find((city) => city.id === selectedCityId) || null
    : null;

  const buildSummaryText = () => {
    if (!summary) return "";
    const lines: string[] = [];

    lines.push(`Attendance Summary${selectedCity ? ` — ${selectedCity.name}` : ""}`);
    lines.push(`Period: ${visibleRangeLabel} (${rangeDayCount} ${rangeDayCount === 1 ? "day" : "days"})`);
    lines.push(isMultiDayRange ? "Figures below are daily averages (total ÷ days)." : "Figures below are exact for the selected date.");
    lines.push("");
    lines.push(`Total employees: ${numberFormatter.format(summary.uniqueEmployees)}`);
    lines.push(`Present (avg/day): ${formatAverageValue(avgPresent)}`);
    lines.push(`Absent (avg/day): ${formatAverageValue(avgAbsent)}`);
    lines.push(`Attendance rate: ${summary.attendanceRate.toFixed(1)}%`);
    lines.push("");
    lines.push(`Punch In (avg/day): ${formatAverageValue(avgPunchIn)}`);
    lines.push(`Completed punch cycle (avg/day): ${formatAverageValue(avgCheckedOut)}`);
    lines.push(`Not punched out (avg/day): ${formatAverageValue(avgOpenCheckIns)}`);
    lines.push(`Punch completion: ${summary.punchIn ? ((summary.checkedOut / summary.punchIn) * 100).toFixed(1) : "0.0"}%`);
    lines.push("");
    if (bestDesignation) lines.push(`Highest punch-in rate designation: ${bestDesignation.designation} (${bestDesignation.rate.toFixed(1)}%)`);
    if (worstDesignation) lines.push(`Lowest punch-in rate designation: ${worstDesignation.designation} (${worstDesignation.rate.toFixed(1)}%)`);
    lines.push("");
    lines.push(`Average working hours: ${minutesToDuration(summary.avgWorkMinutes)}`);
    if (peakDurationBucket) lines.push(`Peak duration bucket: ${peakDurationBucket.bucket} (${numberFormatter.format(peakDurationBucket.count)}${isMultiDayRange ? "/day" : ""})`);
    if (leastDurationBucket) lines.push(`Least duration bucket: ${leastDurationBucket.bucket} (${numberFormatter.format(leastDurationBucket.count)}${isMultiDayRange ? "/day" : ""})`);

    if (employeePerformance) {
      lines.push("");
      lines.push(`100% present employees: ${numberFormatter.format(employeePerformance.fullyPresent)} of ${numberFormatter.format(employeePerformance.totalEmployees)}`);
      lines.push(`— of which full punch cycle (Punch In + Punch Out every day): ${numberFormatter.format(employeePerformance.fullyPresentWithCompletedCycle)}`);
      lines.push(`Fully absent employees (0% present): ${numberFormatter.format(employeePerformance.fullyAbsent)} of ${numberFormatter.format(employeePerformance.totalEmployees)}`);
    }
    lines.push(`Designations at 100% present: ${numberFormatter.format(designationsFullyPresentCount)} of ${numberFormatter.format(designationTotal)}`);
    lines.push(`Designations fully absent (0% present): ${numberFormatter.format(designationsFullyAbsentCount)} of ${numberFormatter.format(designationTotal)}`);

    lines.push("");
    lines.push(`Generated ${new Date().toLocaleString()} · MatrixTrack Attendance Dashboard`);

    return lines.join("\n");
  };

  const copySummaryToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const handleCopySummary = async () => {
    const text = buildSummaryText();
    if (!text) return;
    try {
      await copySummaryToClipboard(text);
      setError("");
      setNotice("Summary copied to clipboard — paste it to share with the commissioner or higher authority");
    } catch {
      setError("Unable to copy summary. Please try again.");
    }
  };

  const handleShareSummary = async () => {
    const text = buildSummaryText();
    if (!text) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Attendance Summary", text });
      } catch {
        // user cancelled the native share sheet — no error needed
      }
      return;
    }
    void handleCopySummary();
  };

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
    <div className="mx-auto w-full max-w-[1780px] space-y-4 pb-8">
      {!isUlbOfficer && (
        <UploadModal
          open={uploadOpen}
          uploading={uploading}
          onClose={() => !uploading && setUploadOpen(false)}
          onUpload={handleUpload}
        />
      )}
      <UploadCalendarModal
        open={calendarOpen}
        monthDate={calendarMonthDate}
        data={calendarData}
        loading={calendarLoading}
        todayKey={todayKey}
        onPreviousMonth={() => setCalendarMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        onNextMonth={() => setCalendarMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
        onClose={() => setCalendarOpen(false)}
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
      <WorkDurationEmployeesPopup
        open={Boolean(workDurationBucket)}
        bucket={workDurationBucket}
        expectedCount={
          data?.workDurationBuckets.find((item) => item.bucket === workDurationBucket)?.count || 0
        }
        data={workDurationData}
        loading={workDurationLoading}
        page={workDurationPage}
        onPageChange={setWorkDurationPage}
        onClose={() => setWorkDurationBucket(null)}
      />
      <EmployeeRecordsDrawer
        open={Boolean(employeeDrilldown)}
        employee={employeeDrilldown}
        data={employeeDrilldownData}
        loading={employeeDrilldownLoading}
        page={employeeDrilldownPage}
        onPageChange={setEmployeeDrilldownPage}
        onClose={() => setEmployeeDrilldown(null)}
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

      <section className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex bg-slate-100/50 p-1 rounded-xl shadow-inner border border-slate-200/60 ring-1 ring-white/50">
            <button
              onClick={() => setEmployeeGroup("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                employeeGroup === "ALL" 
                  ? "bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/80" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <Sparkles size={12} className={employeeGroup === "ALL" ? "text-blue-500" : "text-slate-400"} />
              All Employees
            </button>
            <button
              onClick={() => setEmployeeGroup("HEALTH_WORKERS")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                employeeGroup === "HEALTH_WORKERS" 
                  ? "bg-white text-blue-700 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/80" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }`}
            >
              <Building2 size={12} className={employeeGroup === "HEALTH_WORKERS" ? "text-blue-500" : "text-slate-400"} />
              Health Workers
            </button>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
            <CalendarDays size={12} />
            {visibleRangeLabel}
          </span>
          {lastUpdated && (
            <span className="text-[10px] font-semibold text-slate-400">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hmsSuperAdmin && (
            <label className="flex h-9 min-w-[210px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 shadow-sm">
              <Building2 size={14} className="shrink-0 text-blue-600" />
              <select
                value={selectedCityId}
                onChange={(event) => handleCityChange(event.target.value)}
                disabled={citiesLoading || !cities.length}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-black text-blue-900 outline-none disabled:opacity-50"
                aria-label="Select city attendance dashboard"
              >
                {!cities.length && (
                  <option value="">{citiesLoading ? "Loading cities..." : "No cities available"}</option>
                )}
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}{city.code ? ` · ${city.code}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={() => {
              setUploadTrackingVersion((current) => current + 1);
              void loadDashboard(true);
            }}
            disabled={refreshing || (hmsSuperAdmin && !selectedCityId)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCalendarMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
              setCalendarOpen(true);
            }}
            disabled={hmsSuperAdmin && !selectedCityId}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CalendarDays size={14} />
            Upload calendar
          </button>

          {!isUlbOfficer && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              disabled={hmsSuperAdmin && !selectedCityId}
              title={hmsSuperAdmin && selectedCity ? `Upload attendance for ${selectedCity.name}` : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <UploadCloud size={14} />
              Upload CSVs
            </button>
          )}
        </div>
      </section>

      {(!hmsSuperAdmin || selectedCityId) && (
        <section
          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 shadow-[0_5px_16px_rgba(15,23,42,0.03)] ${todayUploadLoading
              ? "border-slate-200 bg-white"
              : todayUploadData && todayUploaded
                ? "border-emerald-200 bg-emerald-50/75"
                : todayUploadData
                  ? "border-rose-200 bg-rose-50/75"
                  : "border-amber-200 bg-amber-50/75"
            }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${todayUploadLoading
                ? "bg-slate-100 text-slate-500"
                : todayUploadData && todayUploaded
                  ? "bg-emerald-100 text-emerald-700"
                  : todayUploadData
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"
              }`}
          >
            {todayUploadLoading
              ? <RefreshCw size={14} className="animate-spin" />
              : todayUploadData && todayUploaded
                ? <CheckCircle2 size={15} />
                : <AlertCircle size={15} />}
          </div>

          <div className="min-w-0 flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <p
              className={`shrink-0 text-xs font-black ${todayUploadLoading
                  ? "text-slate-800"
                  : todayUploadData && todayUploaded
                    ? "text-emerald-900"
                    : todayUploadData
                      ? "text-rose-900"
                      : "text-amber-900"
                }`}
            >
              {todayUploadLoading
                ? "Checking today's CSV upload..."
                : todayUploadData && todayUploaded
                  ? "Today's CSV uploaded"
                  : todayUploadData
                    ? "Today's CSV not uploaded"
                    : "Today's CSV upload status unavailable"}
            </p>
            <span className="hidden h-1 w-1 shrink-0 rounded-full bg-current opacity-30 sm:block" />
            <p
              className={`truncate text-[10.5px] font-semibold ${todayUploadData && todayUploaded
                  ? "text-emerald-700"
                  : todayUploadData
                    ? "text-rose-700"
                    : "text-slate-500"
                }`}
            >
              {todayUploadData && todayUploaded
                ? `${todayUpload?.completedUploads || 0} CSV ${todayUpload?.completedUploads === 1 ? "file" : "files"} uploaded for ${formatShortDate(todayKey)}.`
                : todayUploadData
                  ? `No completed attendance CSV has been uploaded for ${formatShortDate(todayKey)}.`
                  : `Attendance upload status for ${formatShortDate(todayKey)} could not be confirmed.`}
            </p>
          </div>
        </section>
      )}

      {(error || notice) && (
        <div
          className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 ${error
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

      <section className="rounded-3xl border border-slate-200/80 bg-white p-3.5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="mb-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
              <Filter size={15} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Smart filters</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setRangePreset(1)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">Latest</button>
            <button onClick={() => setRangePreset(7)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">7 days</button>
            <button onClick={() => setRangePreset(30)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200">30 days</button>
          </div>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
            <input
              type="date"
              value={draftFilters.from}
              onChange={(e) => updateFilter({ from: e.target.value })}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
            <input
              type="date"
              value={draftFilters.to}
              onChange={(e) => updateFilter({ to: e.target.value })}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
            {isMultiDayRange && (
              <p className="flex items-start gap-1 text-[9.5px] font-semibold leading-[13px] text-blue-600">
                <Info size={11} className="mt-0.5 shrink-0" />
                {rangeDayCount}-day range: cards show avg/day (total ÷ {rangeDayCount} days)
              </p>
            )}
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance</span>
            <SearchableSelect
              value={draftFilters.status}
              onChange={(status) => updateFilter({ status })}
              options={[
                { value: "ALL", label: "All" },
                { value: "P", label: "Present" },
                { value: "A", label: "Absent" },
              ]}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Punch status</span>
            <SearchableSelect
              value={draftFilters.checkoutState}
              onChange={(checkoutState) => updateFilter({ checkoutState })}
              options={[
                { value: "ALL", label: "All punches" },
                { value: "CHECKED_OUT", label: "Punch Out" },
                { value: "OPEN_CHECKIN", label: "Punch In" },
                { value: "NO_PUNCH", label: "No punch" },
              ]}
            />
          </label>
          {employeeGroup !== "HEALTH_WORKERS" && (
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation</span>
              <SearchableSelect
                value={draftFilters.designation}
                onChange={(designation) => updateFilter({ designation })}
                options={[
                  { value: "", label: "All designations" },
                  ...(data?.filters.designations || []).map((value) => ({ value, label: value })),
                ]}
              />
            </label>
          )}
          <label className={`space-y-1.5 ${employeeGroup === "HEALTH_WORKERS" ? "md:col-span-2 xl:col-span-2 2xl:col-span-2" : ""}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee search</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((current) => ({ ...current, search: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Name or attendance ID"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
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
          <section className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            <KpiCard
              label="Total employees"
              value={numberFormatter.format(summary.uniqueEmployees)}
              detail={
                isMultiDayRange
                  ? `Avg ${formatAverageValue(avgTotalRecords)} records/day (${averageFormula(summary.totalRecords, rangeDayCount)})`
                  : `${numberFormatter.format(summary.totalRecords)} attendance records`
              }
              icon={<UsersRound size={18} />}
              tone="blue"
              active={kpiDrilldown?.key === "ALL"}
              onClick={() => openKpiDrilldown({
                key: "ALL",
                title: "Total employees",
                subtitle: "Underlying employee attendance records for the current dashboard filters.",
                value: numberFormatter.format(summary.uniqueEmployees),
                tone: "blue",
              })}
            />
            <KpiCard
              label="Present"
              value={isMultiDayRange ? formatAverageValue(avgPresent) : numberFormatter.format(summary.present)}
              detail={
                isMultiDayRange
                  ? `Avg/day (${averageFormula(summary.present, rangeDayCount)})`
                  : `${summary.attendanceRate.toFixed(1)}% attendance`
              }
              icon={<UserCheck size={18} />}
              tone="emerald"
              active={kpiDrilldown?.key === "PRESENT"}
              onClick={() => openKpiDrilldown({
                key: "PRESENT",
                title: "Present employees",
                subtitle: "Employees marked present within the current date range and active filters.",
                value: numberFormatter.format(summary.present),
                tone: "emerald",
                query: { status: "P" },
              })}
            />
            <KpiCard
              label="Absent"
              value={isMultiDayRange ? formatAverageValue(avgAbsent) : numberFormatter.format(summary.absent)}
              detail={
                isMultiDayRange
                  ? `Avg/day (${averageFormula(summary.absent, rangeDayCount)})`
                  : `${summary.totalRecords ? ((summary.absent / summary.totalRecords) * 100).toFixed(1) : "0.0"}% of records`
              }
              icon={<UserRoundX size={18} />}
              tone="rose"
              active={kpiDrilldown?.key === "ABSENT"}
              onClick={() => openKpiDrilldown({
                key: "ABSENT",
                title: "Absent employees",
                subtitle: "Employees marked absent within the current date range and active filters.",
                value: numberFormatter.format(summary.absent),
                tone: "rose",
                query: { status: "A" },
              })}
            />
            <KpiCard
              label="Attendance rate"
              value={`${summary.attendanceRate.toFixed(1)}%`}
              detail="Present ÷ total records"
              icon={<Activity size={18} />}
              tone="violet"
              active={kpiDrilldown?.key === "RATE"}
              onClick={() => openKpiDrilldown({
                key: "RATE",
                title: "Attendance rate · Present records",
                subtitle: "Present employee records used to calculate the attendance rate for the current selection.",
                value: `${summary.attendanceRate.toFixed(1)}%`,
                tone: "violet",
                query: { status: "P" },
              })}
            />
            <KpiCard
              label="Punch In"
              value={isMultiDayRange ? formatAverageValue(avgPunchIn) : numberFormatter.format(punchInCount)}
              detail={
                isMultiDayRange
                  ? `Avg/day (${averageFormula(punchInCount, rangeDayCount)})`
                  : `${summary.totalRecords ? ((punchInCount / summary.totalRecords) * 100).toFixed(1) : "0.0"}% with Punch In`
              }
              icon={<Clock3 size={18} />}
              tone="blue"
              active={kpiDrilldown?.key === "PUNCH_IN"}
              onClick={() => openKpiDrilldown({
                key: "PUNCH_IN",
                title: "Punch In records",
                subtitle: "Employees with a recorded Punch In within the current selection.",
                value: numberFormatter.format(punchInCount),
                tone: "blue",
                query: { checkoutState: "HAS_CHECKIN" },
              })}
            />
            <KpiCard
              label="Punch Out"
              value={isMultiDayRange ? formatAverageValue(avgCheckedOut) : numberFormatter.format(summary.checkedOut)}
              detail={
                isMultiDayRange
                  ? `Avg/day (${averageFormula(summary.checkedOut, rangeDayCount)})`
                  : "Completed Punch In / Punch Out cycle"
              }
              icon={<CheckCircle2 size={18} />}
              tone="teal"
              active={kpiDrilldown?.key === "PUNCH_OUT"}
              onClick={() => openKpiDrilldown({
                key: "PUNCH_OUT",
                title: "Punch Out records",
                subtitle: "Attendance records with a completed Punch Out.",
                value: numberFormatter.format(summary.checkedOut),
                tone: "teal",
                query: { checkoutState: "CHECKED_OUT" },
              })}
            />
            <KpiCard
              label="Not punched out"
              value={isMultiDayRange ? formatAverageValue(avgOpenCheckIns) : numberFormatter.format(summary.openCheckIns)}
              detail={
                isMultiDayRange
                  ? `Avg/day (${averageFormula(summary.openCheckIns, rangeDayCount)})`
                  : "Punch In recorded · Punch Out pending"
              }
              icon={<TimerReset size={18} />}
              tone="amber"
              active={kpiDrilldown?.key === "OPEN_PUNCH_IN"}
              onClick={() => openKpiDrilldown({
                key: "OPEN_PUNCH_IN",
                title: "Not punched out records",
                subtitle: "Employees with Punch In recorded but no Punch Out yet.",
                value: numberFormatter.format(summary.openCheckIns),
                tone: "amber",
                query: { checkoutState: "OPEN_CHECKIN" },
              })}
            />
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

            <ChartCard
              title="Punch completion"
              subtitle="Punch In → Punch Out completion across all attendance records"
              badge={`${punchCompletionRate.toFixed(1)}% completed`}
              icon={<CheckCircle2 size={18} />}
              tone="emerald"
            >
              <div className="relative h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={punchCompletionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={96} paddingAngle={3} strokeWidth={0}>
                      {punchCompletionPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(value: number, name: string) => [numberFormatter.format(value as number), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black tracking-tight text-slate-900">{punchCompletionRate.toFixed(1)}%</span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="group/mix rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 px-2.5 py-3 ring-1 ring-emerald-100 transition hover:-translate-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700">Punch Out</p>
                  <p className="mt-1 text-base font-black tabular-nums text-slate-950">
                    {isMultiDayRange ? formatAverageValue(avgCheckedOut) : numberFormatter.format(summary.checkedOut)}
                  </p>
                  <p className="mt-0.5 text-[8.5px] font-semibold leading-tight text-emerald-700/70">
                    {isMultiDayRange ? `Avg/day · ${averageFormula(summary.checkedOut, rangeDayCount)}` : "Completed Punch In / Punch Out cycle"}
                  </p>
                </div>
                <div className="group/mix rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/70 px-2.5 py-3 ring-1 ring-amber-100 transition hover:-translate-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Not punched out</p>
                  <p className="mt-1 text-base font-black tabular-nums text-slate-950">
                    {isMultiDayRange ? formatAverageValue(avgOpenCheckIns) : numberFormatter.format(summary.openCheckIns)}
                  </p>
                  <p className="mt-0.5 text-[8.5px] font-semibold leading-tight text-amber-700/70">
                    {isMultiDayRange ? `Avg/day · ${averageFormula(summary.openCheckIns, rangeDayCount)}` : "Punch In recorded · Punch Out pending"}
                  </p>
                </div>
                <div className="group/mix rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50/70 px-2.5 py-3 ring-1 ring-slate-200 transition hover:-translate-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">No punch</p>
                  <p className="mt-1 text-base font-black tabular-nums text-slate-950">
                    {isMultiDayRange ? formatAverageValue(avgNoPunch) : numberFormatter.format(summary.noPunch)}
                  </p>
                  <p className="mt-0.5 text-[8.5px] font-semibold leading-tight text-slate-500">
                    {isMultiDayRange ? `Avg/day · ${averageFormula(summary.noPunch, rangeDayCount)}` : "No Punch In or Punch Out recorded"}
                  </p>
                </div>
              </div>
            </ChartCard>
          </section>

          <section className="grid items-stretch gap-5 lg:grid-cols-2">
            <ChartCard
              title="Work duration"
              subtitle="Click a bar to view employees in that working-hour range"
              badge={
                isMultiDayRange
                  ? `${formatAverageValue(avgCheckedOut)} avg/day`
                  : `${numberFormatter.format(summary.checkedOut)} completed`
              }
              icon={<BarChart3 size={18} />}
              tone="blue"
            >
              <div className="flex h-full flex-col">
                <div className="h-[245px] w-full rounded-2xl bg-gradient-to-b from-blue-50/35 to-white px-1 pt-2 ring-1 ring-blue-100/70">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workDurationChartData} margin={{ left: -15, right: 5, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(value: number, _name, item: any) => {
                          if (!isMultiDayRange) return [numberFormatter.format(value as number), "Employees"];
                          const raw = item?.payload?.rawCount ?? 0;
                          return [`${numberFormatter.format(value as number)}/day (${averageFormula(raw, rangeDayCount)})`, "Employees avg"];
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Employees"
                        radius={[8, 8, 2, 2]}
                        maxBarSize={40}
                        animationDuration={950}
                        cursor="pointer"
                        onClick={(entry: any) => {
                          const bucket = String(entry?.bucket || entry?.payload?.bucket || "");
                          if (bucket) openWorkDurationBucket(bucket);
                        }}
                      >
                        {workDurationChartData.map((item, index) => (
                          <Cell
                            key={`${item.bucket}-${index}`}
                            fill={[chartColors.rose, chartColors.amber, chartColors.blue, chartColors.emerald, chartColors.violet][index % 5]}
                            fillOpacity={
                              workDurationBucket && workDurationBucket !== item.bucket ? 0.35 : 1
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {isMultiDayRange && (
                  <p className="mt-2 text-[9.5px] font-semibold text-blue-700/70">
                    Bars show the daily average employee count per duration bucket across {rangeDayCount} days.
                  </p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-blue-50/75 px-3 py-2.5 ring-1 ring-blue-100">
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">Average work time</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-blue-950">{minutesToDuration(summary.avgWorkMinutes)}</p>
                  </div>
                  <div className="rounded-2xl bg-violet-50/75 px-3 py-2.5 ring-1 ring-violet-100">
                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Punch completion</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-violet-950">{summary.punchIn ? ((summary.checkedOut / summary.punchIn) * 100).toFixed(1) : "0.0"}%</p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-slate-100 bg-white/80 p-3.5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Duration mix</p>
                      <p className="mt-0.5 text-[9.5px] font-semibold text-slate-400">
                        {isMultiDayRange ? `Avg completed employees/day by working-hour bucket` : "Completed employees by working-hour bucket"}
                      </p>
                    </div>
                    <TimerReset size={17} className="text-blue-500" />
                  </div>
                  <div className="space-y-2.5">
                    {(workDurationChartData || []).map((item, index) => {
                      const maxCount = Math.max(...(workDurationChartData || []).map((bucket) => bucket.count), 1);
                      const width = (item.count / maxCount) * 100;
                      const barColors = ["bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-violet-500"];
                      return (
                        <div key={`duration-insight-${item.bucket}`}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-600">{item.bucket}</span>
                            <span className="text-[10px] font-black tabular-nums text-slate-800">
                              {numberFormatter.format(item.count)}
                              {isMultiDayRange && (
                                <span className="ml-1 font-semibold text-slate-400">({averageFormula(item.rawCount, rangeDayCount)})</span>
                              )}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${barColors[index % barColors.length]} transition-[width] duration-1000`} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title="Top attendance employees"
              subtitle="Best employee attendance across the selected date range"
              badge={`${numberFormatter.format(topEmployeesTotal)} ranked`}
              icon={<Trophy size={18} />}
              tone="amber"
            >
              <div className="flex h-full flex-col">
                <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50/65 px-3 py-2.5">
                  <p className="text-[9.5px] font-bold leading-4 text-amber-800">
                    Ranking is based on most present days, then attendance rate, then completed Punch In / Punch Out cycles.
                  </p>
                </div>

                <div className="flex-1 space-y-2.5">
                  {topEmployeesPageItems.map((employee, index) => {
                    const rank = (topEmployeesPage - 1) * topEmployeesPageSize + index;
                    const rankStyles = [
                      "from-amber-400 to-orange-500 text-white shadow-amber-500/20",
                      "from-slate-300 to-slate-500 text-white shadow-slate-400/20",
                      "from-orange-300 to-amber-700 text-white shadow-orange-500/20",
                      "from-blue-400 to-indigo-600 text-white shadow-blue-500/20",
                      "from-violet-400 to-fuchsia-600 text-white shadow-violet-500/20",
                    ];
                    const attendanceTone =
                      employee.attendanceRate >= 90
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : employee.attendanceRate >= 75
                          ? "bg-blue-50 text-blue-700 ring-blue-100"
                          : "bg-amber-50 text-amber-700 ring-amber-100";
                    const dayWord = employee.presentDays === 1 ? "day" : "days";
                    const punchWord = employee.completedPunches === 1 ? "cycle" : "cycles";
                    const whyTop = `${employee.presentDays} present ${dayWord} · ${employee.attendanceRate.toFixed(1)}% attendance · ${employee.completedPunches} completed punch ${punchWord}`;

                    return (
                      <div
                        key={employee.attendanceId}
                        className="group/top rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-amber-50/25 px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-100 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black shadow-md ${rankStyles[rank % rankStyles.length]}`}>
                            #{rank + 1}
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                            {employee.employeeName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-black text-slate-800" title={employee.employeeName}>
                                {employee.employeeName}
                              </p>
                              <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ring-1 ${attendanceTone}`}>
                                {employee.attendanceRate.toFixed(1)}%
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[9.5px] font-semibold text-slate-400" title={employee.designation || employee.attendanceId}>
                              {employee.designation || "Employee"} · {employee.attendanceId}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400" title={`Zone: ${formatScopeNames((employee as any).zone || employee.zones)} · Ward: ${formatScopeNames((employee as any).ward || employee.wards)}`}>
                              Zone: {formatScopeNames((employee as any).zone || employee.zones)} · Ward: {formatScopeNames((employee as any).ward || employee.wards)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 rounded-xl bg-white/80 px-2.5 py-2 ring-1 ring-amber-100/80">
                          <div className="flex items-start gap-2">
                            <Trophy size={12} className="mt-0.5 shrink-0 text-amber-500" />
                            <p className="text-[9.5px] font-semibold leading-4 text-slate-600">
                              <span className="font-black text-amber-700">Why #{rank + 1}:</span> {whyTop}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!topEmployeesTotal && (
                    <div className="flex h-[238px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 text-center">
                      <Trophy size={24} className="mb-2 text-slate-300" />
                      <p className="text-xs font-black text-slate-600">No ranking data available</p>
                      <p className="mt-1 text-[10px] font-medium leading-4 text-slate-400">
                        Top employees will appear for the selected attendance date range.
                      </p>
                    </div>
                  )}
                </div>

                {topEmployeesTotal > topEmployeesPageSize && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="text-[10.5px] font-semibold text-slate-500">
                      {topEmployeesStart}-{topEmployeesEnd} of {numberFormatter.format(topEmployeesTotal)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTopEmployeesPage((current) => Math.max(1, current - 1))}
                        disabled={topEmployeesPage <= 1}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10.5px] font-bold text-slate-600 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={13} /> Previous
                      </button>
                      <span className="min-w-[58px] text-center text-[10.5px] font-black text-slate-600">
                        {topEmployeesPage} / {topEmployeesTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTopEmployeesPage((current) => Math.min(topEmployeesTotalPages, current + 1))}
                        disabled={topEmployeesPage >= topEmployeesTotalPages}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10.5px] font-bold text-slate-600 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ChartCard>

          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ChartCard
              title="Punch In activity by hour"
              subtitle={
                isMultiDayRange
                  ? `Average hourly Punch In pattern across ${rangeDayCount} days`
                  : "Hourly Punch In pattern and peak reporting window"
              }
              badge={`Peak ${peakCheckIn.label}`}
              icon={<Clock3 size={18} />}
              tone="violet"
            >
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-violet-50/70 px-3 py-2.5 ring-1 ring-violet-100"><p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Peak hour</p><p className="mt-0.5 text-sm font-black text-violet-900">{peakCheckIn.label}</p></div>
                <div className="rounded-2xl bg-blue-50/70 px-3 py-2.5 ring-1 ring-blue-100">
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">{isMultiDayRange ? "Peak punches (avg/day)" : "Peak punches"}</p>
                  <p className="mt-0.5 text-sm font-black text-blue-900">{numberFormatter.format(peakCheckIn.count)}</p>
                  {isMultiDayRange && (
                    <p className="mt-0.5 text-[9px] font-semibold text-blue-700/70">{averageFormula(peakCheckIn.rawCount, rangeDayCount)}</p>
                  )}
                </div>
              </div>
              <div className="h-[245px] w-full rounded-2xl bg-gradient-to-b from-violet-50/35 to-white px-1 pt-2 ring-1 ring-violet-100/70">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={checkInDistribution} margin={{ left: -15, right: 6, top: 8, bottom: 0 }}>
                    <defs><linearGradient id="checkInBars" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#4f46e5" /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" interval={2} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(value: number, _name, item: any) => {
                        if (!isMultiDayRange) return [numberFormatter.format(value as number), "Punch Ins"];
                        const raw = item?.payload?.rawCount ?? 0;
                        return [`${numberFormatter.format(value as number)}/day (${averageFormula(raw, rangeDayCount)})`, "Punch Ins avg"];
                      }}
                    />
                    <Bar dataKey="count" name="Punch Ins" fill="url(#checkInBars)" radius={[7, 7, 2, 2]} maxBarSize={26} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {isMultiDayRange && (
                <p className="mt-2 text-[9.5px] font-semibold text-violet-700/70">
                  Bars show the daily average Punch In count per hour across {rangeDayCount} days.
                </p>
              )}
            </ChartCard>

            <ChartCard
              title="Designation performance"
              subtitle="Attendance rate across all workforce groups"
              headerRight={
                <div className="w-44">
                  <SearchableSelect
                    value={designationNameFilter}
                    onChange={setDesignationNameFilter}
                    options={[
                      { value: "", label: `All (${sortedDesignationBreakdown.length})` },
                      ...sortedDesignationBreakdown.map((item) => ({ value: item.designation, label: item.designation })),
                    ]}
                  />
                </div>
              }
              icon={<UsersRound size={18} />}
              tone="violet"
            >
              {/* Designation performance color meaning — click a bucket to filter the chart */}
              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                  Performance:
                </span>

                {(
                  [
                    { key: "HIGH", color: chartColors.emerald, label: "85%" },
                    { key: "MID_HIGH", color: chartColors.violet, label: "70%–84.9%" },
                    { key: "MID_LOW", color: chartColors.amber, label: "50%–69.9%" },
                    { key: "LOW", color: chartColors.rose, label: "Below 50%" },
                  ] as const
                ).map((bucket) => {
                  const active = designationRateFilter === bucket.key;
                  return (
                    <button
                      key={bucket.key}
                      type="button"
                      onClick={() => setDesignationRateFilter((current) => (current === bucket.key ? "ALL" : bucket.key))}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold transition ${
                        active ? "bg-white text-slate-900 ring-1 ring-slate-300 shadow-sm" : "text-slate-600 hover:bg-white/70"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                      {bucket.label}
                    </button>
                  );
                })}

                {designationRateFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setDesignationRateFilter("ALL")}
                    className="ml-auto text-[10px] font-bold text-violet-600 hover:text-violet-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {designationTotal ? (
                <>
                  <div className="h-[300px] w-full rounded-2xl bg-gradient-to-r from-violet-50/30 to-white px-2 py-2 ring-1 ring-violet-100/70">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={designationPageItems} layout="vertical" margin={{ left: 18, right: 18, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="designation" width={142} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(124,58,237,0.05)" }}
                          content={({ active, payload }) => {
                            const item = payload?.[0]?.payload as { designation: string; total: number; present: number; absent: number; rate: number } | undefined;
                            if (!active || !item) return null;
                            return (
                              <div className="min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-lg">
                                <p className="font-black text-slate-900">{item.designation}</p>
                                <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600">
                                  <div className="flex items-center justify-between gap-4"><span>Attendance rate</span><strong className="text-violet-700">{item.rate.toFixed(1)}%</strong></div>
                                  <div className="flex items-center justify-between gap-4"><span>Total count</span><strong className="text-slate-900">{numberFormatter.format(item.total)}</strong></div>
                                  <div className="flex items-center justify-between gap-4"><span>Present</span><strong className="text-emerald-700">{numberFormatter.format(item.present)}</strong></div>
                                  <div className="flex items-center justify-between gap-4"><span>Absent</span><strong className="text-rose-700">{numberFormatter.format(item.absent)}</strong></div>
                                </div>
                                {isMultiDayRange && (
                                  <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-500">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Daily average</p>
                                    <div className="flex items-center justify-between gap-4"><span>Present/day</span><strong className="text-emerald-700">{formatAverageValue(item.present / rangeDayCount)} ({averageFormula(item.present, rangeDayCount)})</strong></div>
                                    <div className="flex items-center justify-between gap-4"><span>Absent/day</span><strong className="text-rose-700">{formatAverageValue(item.absent / rangeDayCount)} ({averageFormula(item.absent, rangeDayCount)})</strong></div>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="rate" radius={[0, 7, 7, 0]} maxBarSize={16} animationDuration={950}>
                          {designationPageItems.map((item, index) => <Cell key={`${item.designation}-${index}`} fill={item.rate >= 85 ? chartColors.emerald : item.rate >= 70 ? chartColors.violet : item.rate >= 50 ? chartColors.amber : chartColors.rose} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-[10.5px] font-semibold text-slate-500">
                      <span>{designationStart}-{designationEnd} of {numberFormatter.format(designationTotal)} designations</span>
                      {bestDesignation && (
                        <span className="hidden rounded-full bg-violet-50 px-2 py-1 font-bold text-violet-700 ring-1 ring-violet-100 sm:inline">
                          Best: {bestDesignation.designation} · {bestDesignation.rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDesignationPage((current) => Math.max(1, current - 1))}
                        disabled={designationPage <= 1}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10.5px] font-bold text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={13} /> Previous
                      </button>
                      <span className="min-w-[58px] text-center text-[10.5px] font-black text-slate-600">
                        {designationPage} / {designationTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDesignationPage((current) => Math.min(designationTotalPages, current + 1))}
                        disabled={designationPage >= designationTotalPages}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10.5px] font-bold text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 text-center">
                  <UsersRound size={24} className="mb-2 text-slate-300" />
                  <p className="text-xs font-black text-slate-600">No designations match this filter</p>
                  <p className="mt-1 text-[10px] font-medium leading-4 text-slate-400">
                    Try a different designation or clear the performance bucket filter.
                  </p>
                </div>
              )}
            </ChartCard>
          </section>

          <section>
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.055)]">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-white via-blue-50/35 to-violet-50/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><UsersRound size={18} /></div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-950">Employee attendance records</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {numberFormatter.format(data.employeePagination.total)} unique employees match the current filters · tap a name for their full history
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-blue-700 shadow-sm ring-1 ring-blue-100">
                  <CalendarDays size={13} /> {visibleRangeLabel}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm sm:flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={draftFilters.search}
                    onChange={(e) => setDraftFilters((current) => ({ ...current, search: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    placeholder="Search employee by name or attendance ID"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-[4.5rem] text-xs font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-700"
                  >
                    Search
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Show</span>
                  <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setEmployeePageSize(size);
                          setPage(1);
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                          employeePageSize === size
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1270px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50/95 text-left backdrop-blur">
                      {['Employee', 'Attendance ID', 'Designation', 'Zone', 'Ward', 'Present', 'Absent', 'Attendance rate', 'Completed punches', 'Avg work time'].map((heading) => (
                        <th key={heading} className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.map((employee: AttendanceEmployeeSummary) => (
                      <tr key={employee.attendanceId} className="group border-b border-slate-100 transition-all duration-200 odd:bg-white even:bg-slate-50/25 hover:bg-blue-50/55 last:border-b-0">
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => openEmployeeDrilldown(employee)}
                            className="flex items-center gap-2.5 text-left"
                            title={`View ${employee.employeeName}'s attendance for ${visibleRangeLabel}`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                              {employee.employeeName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[190px] truncate text-xs font-bold text-blue-700 underline-offset-2 group-hover:underline" title={employee.employeeName}>{employee.employeeName}</p>
                              <p className="mt-0.5 max-w-[190px] truncate text-[10px] font-medium text-slate-400" title={employee.officeLocation || ""}>{employee.officeLocation || "—"}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] font-bold text-slate-600">{employee.attendanceId}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{employee.designation || "—"}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatScopeNames(employee.zones)}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{formatScopeNames(employee.wards)}</td>
                        <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">{employee.presentDays}/{employee.totalDays}</span></td>
                        <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">{employee.absentDays}</span></td>
                        <td className="px-4 py-3.5 text-xs font-bold text-slate-700">{employee.attendanceRate.toFixed(1)}%</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{employee.completedPunches}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-500">{minutesToDuration(employee.avgWorkMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.employees.length && (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
                    <Search size={24} className="mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No employees match these filters</p>
                    <button onClick={resetFilters} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">Clear filters</button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-semibold text-slate-500">
                  Page {data.employeePagination.page} of {Math.max(data.employeePagination.totalPages, 1)}
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
                    onClick={() => setPage((current) => Math.min(data.employeePagination.totalPages, current + 1))}
                    disabled={page >= data.employeePagination.totalPages}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

          </section>

          {/* <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_38px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="absolute left-0 top-0 h-1 w-40 bg-gradient-to-r from-blue-500 via-violet-400 to-transparent" />

            <div className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 ring-1 ring-blue-100">
                    Exclusive summary
                  </span>
                  <h2 className="mt-1.5 text-base font-black tracking-[-0.02em] text-slate-950">{visibleRangeLabel}</h2>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {isMultiDayRange
                      ? `Daily average across ${rangeDayCount} days with data — total ÷ days`
                      : "Exact figures for the selected date"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopySummary()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  title="Copy a shareable text summary for the commissioner or higher authority"
                >
                  <Copy size={13} /> Copy summary
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareSummary()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-[11px] font-bold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5"
                  title="Share this summary"
                >
                  <Share2 size={13} /> Share
                </button>
              </div>
            </div>

            <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile
                label="Avg total records"
                value={formatAverageValue(avgTotalRecords)}
                detail={isMultiDayRange ? `/day · ${averageFormula(summary.totalRecords, rangeDayCount)}` : "Exact — single day"}
                icon={<UsersRound size={13} />}
                tone="blue"
              />
              <SummaryTile
                label="Avg present"
                value={formatAverageValue(avgPresent)}
                detail={isMultiDayRange ? `/day · ${averageFormula(summary.present, rangeDayCount)}` : `${summary.attendanceRate.toFixed(1)}% attendance`}
                icon={<UserCheck size={13} />}
                tone="emerald"
              />
              <SummaryTile
                label="Avg absent"
                value={formatAverageValue(avgAbsent)}
                detail={isMultiDayRange ? `/day · ${averageFormula(summary.absent, rangeDayCount)}` : "Of total records"}
                icon={<UserRoundX size={13} />}
                tone="rose"
              />
              <SummaryTile
                label="Attendance rate"
                value={`${summary.attendanceRate.toFixed(1)}%`}
                detail="Present ÷ total records"
                icon={<Activity size={13} />}
                tone="violet"
              />
            </div>

            <div className="relative mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile
                label="Avg Punch In"
                value={formatAverageValue(avgPunchIn)}
                detail={isMultiDayRange ? `/day · ${averageFormula(punchInCount, rangeDayCount)}` : "Recorded Punch Ins"}
                icon={<Clock3 size={13} />}
                tone="blue"
              />
              <SummaryTile
                label="Avg punch cycle"
                value={formatAverageValue(avgCheckedOut)}
                detail={isMultiDayRange ? `/day completed · ${averageFormula(summary.checkedOut, rangeDayCount)}` : "Completed Punch In → Punch Out"}
                icon={<CheckCircle2 size={13} />}
                tone="teal"
              />
              <SummaryTile
                label="Avg not punched out"
                value={formatAverageValue(avgOpenCheckIns)}
                detail={isMultiDayRange ? `/day · ${averageFormula(summary.openCheckIns, rangeDayCount)}` : "Punch Out pending"}
                icon={<TimerReset size={13} />}
                tone="amber"
              />
              <SummaryTile
                label="Punch completion"
                value={`${summary.punchIn ? ((summary.checkedOut / summary.punchIn) * 100).toFixed(1) : "0.0"}%`}
                detail="Punch Out ÷ Punch In"
                icon={<BarChart3 size={13} />}
                tone="slate"
              />
            </div>

            <div className="relative mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <p className="mb-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400">Designation punch-in rate</p>
                {bestDesignation ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-emerald-700" title={bestDesignation.designation}>
                        ▲ {bestDesignation.designation}
                      </span>
                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                        {bestDesignation.rate.toFixed(1)}%
                      </span>
                    </div>
                    {worstDesignation ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-rose-700" title={worstDesignation.designation}>
                          ▼ {worstDesignation.designation}
                        </span>
                        <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
                          {worstDesignation.rate.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] font-semibold text-slate-400">Only one designation in this range</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] font-semibold text-slate-400">No designation data</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <p className="mb-2 text-[9.5px] font-black uppercase tracking-wider text-slate-400">Working hours</p>
                <p className="text-lg font-black tabular-nums text-slate-950">
                  {minutesToDuration(summary.avgWorkMinutes)}
                  <span className="ml-1.5 text-[10px] font-semibold text-slate-400">avg</span>
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[10.5px] font-bold">
                    <span className="text-emerald-700">Peak bucket</span>
                    <span className="text-slate-700">
                      {peakDurationBucket ? `${peakDurationBucket.bucket} · ${numberFormatter.format(peakDurationBucket.count)}${isMultiDayRange ? "/day" : ""}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10.5px] font-bold">
                    <span className="text-rose-700">Least bucket</span>
                    <span className="text-slate-700">
                      {leastDurationBucket ? `${leastDurationBucket.bucket} · ${numberFormatter.format(leastDurationBucket.count)}${isMultiDayRange ? "/day" : ""}` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <p className="mb-2.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400">Employee performance</p>
                {employeePerformance ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-700">100% present</span>
                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                        {numberFormatter.format(employeePerformance.fullyPresent)} / {numberFormatter.format(employeePerformance.totalEmployees)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pl-3">
                      <span className="truncate text-[10.5px] font-semibold text-slate-500">↳ also full punch cycle</span>
                      <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                        {numberFormatter.format(employeePerformance.fullyPresentWithCompletedCycle)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-700">Fully absent</span>
                      <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
                        {numberFormatter.format(employeePerformance.fullyAbsent)} / {numberFormatter.format(employeePerformance.totalEmployees)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-semibold text-slate-400">No employee data</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
                <p className="mb-2.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400">Designation performance</p>
                {designationTotal ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-700">100% present</span>
                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                        {numberFormatter.format(designationsFullyPresentCount)} / {numberFormatter.format(designationTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-700">Fully absent</span>
                      <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100">
                        {numberFormatter.format(designationsFullyAbsentCount)} / {numberFormatter.format(designationTotal)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-semibold text-slate-400">No designation data</p>
                )}
              </div>
            </div>
          </section> */}
        </>
      )}
    </div>
  );
}

export default function AttendanceAnalyticsPage() {
  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "ULB_OFFICER"]}>
      <AttendanceDashboard />
    </RoleGuard>
  );
}
