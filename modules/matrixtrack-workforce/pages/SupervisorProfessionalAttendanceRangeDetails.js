import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, TimerReset, XCircle } from "lucide-react";
import { parseApiError } from "../lib/apiClient";
import { professionalAttendanceApi } from "../services/supervisorSelfPunchApi";

const formatClock = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatLocation = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "-";
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

const formatHoursWorked = (value, fallback = "-") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  const totalMinutes = Math.round(numeric * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const isTruthyFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
};

const isAutoPunchOutRecord = (record) => {
  if (!record) return false;
  if (isTruthyFlag(record.is_auto_punch_out) || isTruthyFlag(record.auto_punched_out)) return true;
  const outAddress = String(record.out_address || "").toLowerCase();
  const punchOutBy = String(record.punch_out_by || record.punchout_by || "").toLowerCase();
  const punchOutMode = String(record.punch_out_mode || record.punch_out_type || "").toLowerCase();
  return (
    outAddress.includes("auto punch-out") ||
    outAddress.includes("auto punch out") ||
    punchOutBy.includes("auto") ||
    punchOutMode.includes("auto")
  );
};

const isLeaveRecord = (record) => {
  if (!record) return false;
  if (record.leave_status) return true;
  if (record.leave_type || record.leaveType) return true;
  const status = String(record.attendance_status || record.status || "").toLowerCase();
  return status.includes("leave");
};

export default function SupervisorProfessionalAttendanceRangeDetailsPage() {
  const [searchParams] = useSearchParams();
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  const professionalId = searchParams.get("professionalId") || "";
  const employeeName = searchParams.get("name") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const hasRequiredParams = Boolean(professionalId && startDate && endDate);

  const detailsQuery = useQuery({
    queryKey: ["professional-attendance-range-details", { professionalId, startDate, endDate }],
    queryFn: () => professionalAttendanceApi.getDateRangeDetails({ professionalId, startDate, endDate }),
    enabled: hasRequiredParams,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => detailsQuery.data?.data?.records || [], [detailsQuery.data]);
  const visibleRows = useMemo(
    () => rows.filter((entry) => !isAutoPunchOutRecord(entry)),
    [rows]
  );
  const stats = detailsQuery.data?.data || {};
  const hiddenCount = Math.max(rows.length - visibleRows.length, 0);

  const insights = useMemo(() => {
    const completedDays = visibleRows.filter((entry) => Boolean(entry.punch_out)).length;
    const incompleteDays = Math.max(visibleRows.length - completedDays, 0);
    const totalHours = visibleRows.reduce((acc, entry) => acc + (Number(entry.hours_worked) || 0), 0);
    const avgHours = visibleRows.length ? totalHours / visibleRows.length : 0;
    return {
      totalDays: visibleRows.length,
      completedDays,
      incompleteDays,
      totalHours,
      avgHours,
    };
  }, [visibleRows]);

  useEffect(() => {
    if (!detailsQuery.isLoading) {
      setIsSlowLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setIsSlowLoading(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [detailsQuery.isLoading]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Professional Attendance Details</h1>
            <p className="text-sm text-slate-600">
              {employeeName || stats.professional_name || professionalId} | {startDate} to {endDate}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Clean attendance timeline
            </div>
          </div>
          <Link
            to="/supervisor/professional-attendance"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Attendance Days</p>
            <CalendarDays className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{insights.totalDays}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Completed Days</p>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{insights.completedDays}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">In Progress Days</p>
            <TimerReset className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{insights.incompleteDays}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Total Hours</p>
            <Clock3 className="h-5 w-5 text-violet-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatHoursWorked(insights.totalHours, "0m")}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">Avg {formatHoursWorked(insights.avgHours, "0m")} / day</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">Day-wise Attendance Ledger</h2>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {hiddenCount > 0 ? `Filtered records: ${hiddenCount}` : "Day-wise records"}
          </div>
        </div>
        {!hasRequiredParams ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Missing details parameters. Please reopen from the attendance list.
          </div>
        ) : detailsQuery.isLoading ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-sm text-slate-500">Loading attendance details...</p>
            {isSlowLoading ? (
              <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                This is taking longer than expected. Please wait or retry.
              </div>
            ) : null}
          </div>
        ) : detailsQuery.isError ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
              {parseApiError(detailsQuery.error, "Failed to load attendance details.")}
            </div>
            <button
              type="button"
              onClick={() => detailsQuery.refetch()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Punch In</th>
                  <th className="px-3 py-2">Punch Out</th>
                  <th className="px-3 py-2">Leave Type</th>
                  <th className="px-3 py-2">Leave Status</th>
                  <th className="px-3 py-2">Reviewed By</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2">In Location</th>
                  <th className="px-3 py-2">Out Location</th>
                  <th className="px-3 py-2">In Photo</th>
                  <th className="px-3 py-2">Out Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-8 text-center text-slate-500">No day-wise records found in selected range.</td>
                  </tr>
                ) : (
                  visibleRows.map((entry, index) => (
                    <tr key={entry.attendance_id || `${entry.date}-${index}`} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-slate-600">{index + 1}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{formatDate(entry.date)}</td>
                      <td className="px-3 py-3">
                        {entry.leave_status ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold capitalize text-amber-700">
                            {entry.leave_status}
                          </span>
                        ) : entry.punch_out ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            <XCircle className="h-3.5 w-3.5" />
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{formatClock(entry.punch_in)}</td>
                      <td className="px-3 py-3 text-slate-700">{formatClock(entry.punch_out)}</td>
                      <td className="px-3 py-3 text-slate-700">{entry.leave_type || "-"}</td>
                      <td className="px-3 py-3 text-slate-700 capitalize">{entry.leave_status || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">{entry.leave_reviewed_by_name || "-"}</td>
                      <td className="px-3 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                          {formatHoursWorked(entry.hours_worked)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {Number.isFinite(Number(entry.punch_in_latitude)) && Number.isFinite(Number(entry.punch_in_longitude)) ? (
                          <a
                            href={`https://www.google.com/maps?q=${entry.punch_in_latitude},${entry.punch_in_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            {formatLocation(entry.punch_in_latitude, entry.punch_in_longitude)}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {Number.isFinite(Number(entry.punch_out_latitude)) && Number.isFinite(Number(entry.punch_out_longitude)) ? (
                          <a
                            href={`https://www.google.com/maps?q=${entry.punch_out_latitude},${entry.punch_out_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            {formatLocation(entry.punch_out_latitude, entry.punch_out_longitude)}
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {entry.punch_in_photo_url ? (
                          <a
                            href={entry.punch_in_photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View
                          </a>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {entry.punch_out_photo_url ? (
                          <a
                            href={entry.punch_out_photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View
                          </a>
                        ) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}