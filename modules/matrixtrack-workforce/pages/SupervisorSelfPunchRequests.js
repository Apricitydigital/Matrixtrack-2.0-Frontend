import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck2, CheckCircle2, Clock3, RefreshCw, UserCheck2, UserX2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supervisorSelfPunchApi } from "../services/supervisorSelfPunchApi";
import StatusBadge from "../components/selfPunch/StatusBadge";
import AccessDeniedState from "../components/selfPunch/AccessDeniedState";
import ToastMessage from "../components/selfPunch/ToastMessage";
import { useSelfPunchRealtime } from "../hooks/useSelfPunchRealtime";
import { parseApiError } from "../lib/apiClient";
import attendanceBannerBg from "../assets/attendance-banner-bg.png";

const TABS = ["pending", "approved", "rejected"];

const tabMeta = {
  pending: { label: "Pending", icon: Clock3 },
  approved: { label: "Approved", icon: CheckCircle2 },
  rejected: { label: "Rejected", icon: UserX2 },
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatShortTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function SupervisorSelfPunchRequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["self-punch-requests", activeTab, page],
    queryFn: () =>
      supervisorSelfPunchApi.getRequests({
        status: activeTab,
        page,
        limit: 20,
      }),
    refetchInterval: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  useSelfPunchRealtime((payload) => {
    const wardName = payload?.ward_name || payload?.wardName || payload?.ward_id || "your ward";
    setToast({ type: "success", message: `New professional access request in ${wardName}` });
    queryClient.invalidateQueries({ queryKey: ["self-punch-requests"] });
    queryClient.invalidateQueries({ queryKey: ["self-punch-pending-count"] });
  });

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const isForbidden = error?.response?.status === 403;
  const errorMessage = useMemo(() => parseApiError(error, "Failed to load requests."), [error]);

  return (
    <div className="space-y-4">
      <ToastMessage toast={toast} onClose={() => setToast(null)} />

      <section
        className="overflow-hidden rounded-2xl border border-blue-100 bg-cover bg-right bg-no-repeat p-5 md:p-6"
        style={{ backgroundImage: `linear-gradient(102deg, rgba(227,240,255,0.95) 0%, rgba(238,235,255,0.9) 52%, rgba(236,228,255,0.82) 100%), url(${attendanceBannerBg})` }}
      >
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            <UserCheck2 className="h-3.5 w-3.5" />
            Professional Access
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">Professional Access Requests</h1>
          <p className="mt-2 text-base font-medium text-slate-700">Review and action self punch-in registration requests.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const Icon = tabMeta[tab].icon;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    activeTab === tab
                      ? "border-indigo-500 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow"
                      : "border-white/60 bg-white/80 text-slate-700 hover:bg-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tabMeta[tab].label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => refetch()}
              className="ml-0 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white md:ml-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">

        {isForbidden ? (
          <AccessDeniedState />
        ) : isLoading ? (
          <div className="py-10 text-center text-sm font-medium text-slate-500">Loading requests...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{errorMessage}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Ward</th>
                    <th className="px-4 py-3">Kothi</th>
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        No requests found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-black uppercase text-violet-700">
                              {(item.full_name || "NA").split(" ").map((part) => part[0] || "").slice(0, 2).join("") || "NA"}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900">{item.full_name}</div>
                              <div className="mt-0.5 text-xs font-medium text-slate-500">{item.city_name || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{item.mobile || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{item.ward_name || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {item.kothi_name ? (
                            <span className="inline-flex rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                              {item.kothi_name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Not selected</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{item.zone_name || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDateTime(item.created_at)}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {item.status !== "approved" ? (
                            <span className="text-slate-400">-</span>
                          ) : item.attendance_state === "done" ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-700">
                              <CalendarCheck2 className="h-4 w-4" />
                              Done ({formatShortTime(item.attendance_punch_in)} - {formatShortTime(item.attendance_punch_out)})
                            </span>
                          ) : item.attendance_state === "punched_in" ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Punched In ({formatShortTime(item.attendance_punch_in)})
                            </span>
                          ) : (
                            <span className="text-slate-500">Not Punched In</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "approved" ? (
                              <Link
                                to={`/supervisor/professional-attendance?professionalId=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.full_name || "")}`}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                Attendance
                              </Link>
                            ) : null}
                            <Link
                              to={`/supervisor/self-punch/requests/${item.id}`}
                              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                            >
                              Review
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                <span className="font-semibold">Total: {pagination.total || 0}</span>
                <span className="ml-1 text-slate-500">{activeTab} requests</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                  Page {pagination.page || page} of {pagination.pages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(pagination.pages || value, value + 1))}
                  disabled={page >= (pagination.pages || 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}