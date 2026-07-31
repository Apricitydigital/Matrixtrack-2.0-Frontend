import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, Clock3, History, MapPin, Plus, RefreshCw, ShieldCheck, Trash2, UserRound, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AccessDeniedState from "../components/selfPunch/AccessDeniedState";
import ToastMessage from "../components/selfPunch/ToastMessage";
import { parseApiError } from "../lib/apiClient";
import { professionalAttendanceApi, professionalLeaveMgmtApi } from "../services/supervisorSelfPunchApi";
import attendanceBannerBg from "../assets/attendance-banner-bg.png";
import { useAuth } from "../AuthContext";

const TABS = ["pending", "approved", "rejected"];

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const raw = String(value);
  const parsed = raw.includes("T") ? new Date(raw) : new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const badgeClass = (status) => {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const statusMeta = (status) => {
  if (status === "approved") {
    return { label: "Approved", icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" };
  }
  if (status === "rejected") {
    return { label: "Rejected", icon: XCircle, tone: "bg-rose-100 text-rose-700" };
  }
  return { label: "Pending", icon: Clock3, tone: "bg-amber-100 text-amber-700" };
};

export default function ProfessionalLeaveManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isAdmin } = useAuth();

  // Permission for setting quotas (The "Allocations" button)
  const canManageAllocations = isAdmin() || hasPermission({ module: 'professional-leave-allocation', action: 'write' });

  // Permission for approving/rejecting requests (The "Approve/Reject" buttons)
  const canApproveReject = isAdmin() || hasPermission({ module: 'professional-leave-mgmt', action: 'write' });

  const [activeTab, setActiveTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [wardId, setWardId] = useState("");
  const [kothiId, setKothiId] = useState("");
  const [toast, setToast] = useState(null);
  const [actionItem, setActionItem] = useState(null);
  const [actionMode, setActionMode] = useState("");
  const [actionNote, setActionNote] = useState("");

  // Allocation modal state
  const [allocItem, setAllocItem] = useState(null); // professional row for which we are editing
  const [allocModalTab, setAllocModalTab] = useState("edit"); // 'edit' | 'logs'
  const [allocWeekOff, setAllocWeekOff] = useState([]);
  const [allocRows, setAllocRows] = useState([{ leave_type: "CASUAL", period: "monthly", allocated_count: "" }]);
  const [allocLogs, setAllocLogs] = useState([]);
  const [allocLogsLoading, setAllocLogsLoading] = useState(false);

  const toggleAllocWeekDay = (idx) => setAllocWeekOff((prev) =>
    prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
  );
  const addAllocRow = () => setAllocRows((prev) => [...prev, { leave_type: "CASUAL", period: "monthly", allocated_count: "" }]);
  const updateAllocRow = (i, field, val) => setAllocRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeAllocRow = (i) => setAllocRows((prev) => prev.filter((_, idx) => idx !== i));

  const hierarchyQuery = useQuery({
    queryKey: ["professional-sector-hierarchy"],
    queryFn: professionalAttendanceApi.getSectorHierarchy,
  });

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["professional-leave-requests", activeTab, page, cityId, zoneId, wardId, kothiId],
    queryFn: () =>
      professionalLeaveMgmtApi.getRequests({
        status: activeTab,
        page,
        limit: 20,
        cityId,
        zoneId,
        wardId,
        kothiId,
      }),
    placeholderData: (prev) => prev,
    refetchInterval: 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }) => professionalLeaveMgmtApi.approveRequest(id, note),
    onSuccess: () => {
      setToast({ type: "success", message: "Leave request approved." });
      setActionItem(null);
      setActionNote("");
      queryClient.invalidateQueries({ queryKey: ["professional-leave-requests"] });
    },
    onError: (mutationError) => {
      setToast({ type: "error", message: parseApiError(mutationError, "Failed to approve request.") });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }) => professionalLeaveMgmtApi.rejectRequest(id, note),
    onSuccess: () => {
      setToast({ type: "success", message: "Leave request rejected." });
      setActionItem(null);
      setActionNote("");
      queryClient.invalidateQueries({ queryKey: ["professional-leave-requests"] });
    },
    onError: (mutationError) => {
      setToast({ type: "error", message: parseApiError(mutationError, "Failed to reject request.") });
    },
  });

  const allocationMutation = useMutation({
    mutationFn: ({ professionalId, allocations, week_off_days }) =>
      professionalLeaveMgmtApi.setLeaveAllocations(professionalId, { allocations, week_off_days }),
    onSuccess: () => {
      setToast({ type: "success", message: "Leave allocations updated successfully." });
      setAllocItem(null);
    },
    onError: (mutationError) => {
      setToast({ type: "error", message: parseApiError(mutationError, "Failed to update allocations.") });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [cityId, zoneId, wardId, kothiId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };
  const isForbidden = error?.response?.status === 403;
  const errorMessage = useMemo(() => parseApiError(error, "Failed to load leave requests."), [error]);
  const actionPending = approveMutation.isPending || rejectMutation.isPending;

  const cityOptions = useMemo(() => {
    const source = Array.isArray(hierarchyQuery.data) ? hierarchyQuery.data : [];
    const unique = new Map();
    source.forEach((city) => {
      const id = String(city.cityId || city.city_id || "");
      const name = city.city || city.city_name;
      if (!id || !name) return;
      if (!unique.has(id)) unique.set(id, { id, name });
    });
    return Array.from(unique.values());
  }, [hierarchyQuery.data]);

  const zoneOptions = useMemo(() => {
    const source = Array.isArray(hierarchyQuery.data) ? hierarchyQuery.data : [];
    const collected = source.flatMap((city) => {
      const cityIdentifier = String(city.cityId || city.city_id || "");
      if (cityId && cityIdentifier !== String(cityId)) return [];
      const zones = Array.isArray(city?.zones) ? city.zones : [];
      return zones.map((zone) => ({
        id: String(zone.zoneId || zone.zone_id),
        name: zone.zone || zone.zone_name,
      }));
    });
    const unique = new Map();
    collected.forEach((item) => {
      if (!unique.has(item.id)) unique.set(item.id, item);
    });
    return Array.from(unique.values());
  }, [hierarchyQuery.data, cityId]);

  const wardOptions = useMemo(() => {
    const source = Array.isArray(hierarchyQuery.data) ? hierarchyQuery.data : [];
    const flattened = source.flatMap((city) => {
      const cityIdentifier = String(city.cityId || city.city_id || "");
      if (cityId && cityIdentifier !== String(cityId)) return [];
      const zones = Array.isArray(city?.zones) ? city.zones : [];
      return zones.flatMap((zone) => {
        const zoneIdentifier = String(zone.zoneId || zone.zone_id || "");
        if (zoneId && zoneIdentifier !== String(zoneId)) return [];
        const sectors = Array.isArray(zone?.sectors) ? zone.sectors : [];
        return sectors.map((sector) => ({
          id: String(sector.sectorId || sector.sector_id),
          name: sector.sectorName || sector.sector_name,
          kothis: Array.isArray(sector.kothis) ? sector.kothis : [],
        }));
      });
    });
    const unique = new Map();
    flattened.forEach((item) => {
      if (!unique.has(item.id)) unique.set(item.id, item);
    });
    return Array.from(unique.values());
  }, [hierarchyQuery.data, cityId, zoneId]);

  const kothiOptions = useMemo(() => {
    const uniqueMap = new Map();
    const sourceKothis = wardId
      ? (wardOptions.find((item) => item.id === String(wardId))?.kothis || [])
      : wardOptions.flatMap((item) => item.kothis || []);
    sourceKothis.forEach((kothi) => {
      const id = String(kothi.wardId || kothi.ward_id);
      const name = kothi.wardName || kothi.ward_name;
      if (!id || !name) return;
      if (!uniqueMap.has(id)) uniqueMap.set(id, { id, name });
    });
    return Array.from(uniqueMap.values());
  }, [wardOptions, wardId]);

  const clearFilters = () => {
    setCityId("");
    setZoneId("");
    setWardId("");
    setKothiId("");
  };

  return (
    <div className="space-y-4">
      <ToastMessage toast={toast} onClose={() => setToast(null)} />

      <section
        className="overflow-hidden rounded-2xl border border-blue-100 bg-cover bg-right bg-no-repeat p-5 md:p-6"
        style={{ backgroundImage: `linear-gradient(102deg, rgba(227,240,255,0.95) 0%, rgba(238,235,255,0.9) 52%, rgba(236,228,255,0.82) 100%), url(${attendanceBannerBg})` }}
      >
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            <CalendarDays className="h-3.5 w-3.5" />
            Professional Leave
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">Professional Leave Management</h1>
          <p className="mt-2 text-base font-medium text-slate-700">Review professional leave requests and take approval actions.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const meta = statusMeta(tab);
              const Icon = meta.icon;
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
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={cityId}
              onChange={(event) => {
                setCityId(event.target.value);
                setZoneId("");
                setWardId("");
                setKothiId("");
              }}
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="">All Cities</option>
              {cityOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            <select
              value={zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setWardId("");
                setKothiId("");
              }}
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="">All Zones</option>
              {zoneOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <select
              value={wardId}
              onChange={(event) => {
                setWardId(event.target.value);
                setKothiId("");
              }}
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="">All Wards</option>
              {wardOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={kothiId}
              onChange={(event) => setKothiId(event.target.value)}
              className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
            >
              <option value="">All Kothis</option>
              {kothiOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear Filters
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        {isForbidden ? (
          <AccessDeniedState />
        ) : isLoading ? (
          <div className="py-10 text-center text-sm font-medium text-slate-500">Loading leave requests...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{errorMessage}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-4 py-3">Professional</th>
                    <th className="px-4 py-3">Leave Date</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reviewed By</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">No leave requests found.</td>
                    </tr>
                  ) : rows.map((item) => {
                    const meta = statusMeta(item.status);
                    const StatusIcon = meta.icon;
                    const locationText = [item.city_name, item.zone_name, item.ward_name, item.kothi_name].filter(Boolean).join(" / ") || "-";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-black uppercase text-violet-700">
                              {(item.full_name || "NA").split(" ").map((part) => part[0] || "").slice(0, 2).join("") || "NA"}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900">{item.full_name || "-"}</div>
                              <div className="text-xs font-medium text-slate-500">{item.mobile || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDateOnly(item.requested_date)}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">{item.leave_type || "-"}</span>
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-slate-700">{item.reason || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">
                          <span className="inline-flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span>{locationText}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(item.status)}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {item.reviewed_by_name ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                <UserRound className="h-3.5 w-3.5 text-slate-400" />
                                {item.reviewed_by_name}
                              </div>
                              <div className="text-xs text-slate-500">{formatDateTime(item.reviewed_at)}</div>
                            </div>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            {item.status === "pending" ? (
                              canApproveReject ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setActionItem(item); setActionMode("approve"); }}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setActionItem(item); setActionMode("reject"); }}
                                    className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  Pending
                                </span>
                              )
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                Completed
                              </span>
                            )}
                            {/* Allocations button ΓÇö only for users with Write permission on Professional Leave Management */}
                            {canManageAllocations && (
                             <button
                              type="button"
                              onClick={async () => {
                                setAllocItem(item);
                                setAllocModalTab("edit");
                                // Fetch existing allocations
                                try {
                                  const res = await professionalLeaveMgmtApi.getLeaveAllocations(item.professional_id || item.id);
                                  const d = res?.data || {};
                                  setAllocWeekOff(d.week_off?.week_off_days || []);
                                  setAllocRows(
                                    (d.allocations || []).length > 0
                                      ? d.allocations.map((a) => ({
                                          leave_type: a.leave_type,
                                          period: a.period,
                                          allocated_count: String(a.allocated_count),
                                        }))
                                      : [{ leave_type: "CASUAL", period: "monthly", allocated_count: "" }]
                                  );
                                } catch (_) {
                                  setAllocRows([{ leave_type: "CASUAL", period: "monthly", allocated_count: "" }]);
                                  setAllocWeekOff([]);
                                }
                              }}
                              className="rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                            >
                              Allocations
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {actionItem ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {actionMode === "approve" ? "Approve Leave" : "Reject Leave"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {actionItem.full_name} | {formatDateOnly(actionItem.requested_date)} | {actionItem.leave_type}
            </p>
            <textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              rows={4}
              placeholder={actionMode === "reject" ? "Rejection reason (required)" : "Optional note"}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setActionItem(null); setActionNote(""); }}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionPending || (actionMode === "reject" && !actionNote.trim())}
                onClick={() => {
                  if (actionMode === "approve") { approveMutation.mutate({ id: actionItem.id, note: actionNote.trim() }); return; }
                  rejectMutation.mutate({ id: actionItem.id, note: actionNote.trim() });
                }}
                className={`rounded px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  actionMode === "approve" ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                {actionPending ? "Submitting..." : (actionMode === "approve" ? "Approve" : "Reject")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Allocation Edit Modal */}
      {allocItem ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Leave Allocations</h3>
                <p className="text-xs text-slate-500">{allocItem.full_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllocModalTab("edit")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                    allocModalTab === "edit" ? "bg-violet-600 text-white border-violet-600" : "border-slate-300 text-slate-700"
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAllocModalTab("logs");
                    setAllocLogsLoading(true);
                    try {
                      const res = await professionalLeaveMgmtApi.getAllocationLogs(allocItem.professional_id || allocItem.id);
                      setAllocLogs(res?.data || []);
                    } catch (_) { setAllocLogs([]); }
                    finally { setAllocLogsLoading(false); }
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                    allocModalTab === "logs" ? "bg-amber-500 text-white border-amber-500" : "border-slate-300 text-slate-700"
                  }`}
                >
                  <History className="h-3 w-3" /> History
                </button>
                <button type="button" onClick={() => setAllocItem(null)} className="text-slate-500 hover:text-slate-800 text-lg leading-none px-1">&times;</button>
              </div>
            </div>

            {allocModalTab === "edit" && (
              <>
                {/* Week Off */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Week Off Days</p>
                  <div className="flex flex-wrap gap-2">
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleAllocWeekDay(idx)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          allocWeekOff.includes(idx)
                            ? "border-violet-500 bg-violet-600 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leave Rows */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">Leave Allocations</p>
                    <button type="button" onClick={addAllocRow} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 border border-blue-300 rounded-lg px-2 py-1 hover:bg-blue-50">
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {allocRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <select value={row.leave_type} onChange={(e) => updateAllocRow(i, "leave_type", e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs bg-white">
                          {["CASUAL","MEDICAL","PAID"].map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={row.period} onChange={(e) => updateAllocRow(i, "period", e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs bg-white">
                          {["monthly","quarterly","half_yearly","yearly"].map((p) => (
                            <option key={p} value={p}>{{ monthly:"Monthly", quarterly:"Quarterly", half_yearly:"Half-Yearly", yearly:"Yearly" }[p]}</option>
                          ))}
                        </select>
                        <input type="number" min={0} value={row.allocated_count} onChange={(e) => updateAllocRow(i, "allocated_count", e.target.value)} placeholder="Count" className="w-16 rounded border border-slate-300 px-2 py-1 text-xs" />
                        <button type="button" onClick={() => removeAllocRow(i)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    {allocRows.length === 0 && <p className="text-xs text-slate-400 italic">No allocations ΓÇö unlimited leaves.</p>}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" onClick={() => setAllocItem(null)} className="rounded border border-slate-300 px-3 py-2 text-sm">Cancel</button>
                  <button
                    type="button"
                    disabled={allocationMutation.isPending}
                    onClick={() => allocationMutation.mutate({
                      professionalId: allocItem.professional_id || allocItem.id,
                      allocations: allocRows.filter((r) => r.allocated_count !== "" && !isNaN(Number(r.allocated_count))).map((r) => ({ ...r, allocated_count: Number(r.allocated_count) })),
                      week_off_days: allocWeekOff,
                    })}
                    className="rounded bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {allocationMutation.isPending ? "Saving..." : "Save Allocations"}
                  </button>
                </div>
              </>
            )}

            {allocModalTab === "logs" && (
              <div className="space-y-2">
                {allocLogsLoading ? (
                  <p className="text-sm text-slate-500 text-center py-6">Loading history...</p>
                ) : allocLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No allocation changes recorded yet.</p>
                ) : (
                  allocLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800">{log.actor_name || "Unknown"}</span>
                        <span className="text-slate-400">{formatDateTime(log.created_at)}</span>
                      </div>
                      <p className="text-slate-600">{log.change_summary}</p>
                      {log.new_values && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-blue-600">View details</summary>
                          <pre className="mt-1 text-slate-500 whitespace-pre-wrap text-[10px]">{JSON.stringify(log.new_values, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}