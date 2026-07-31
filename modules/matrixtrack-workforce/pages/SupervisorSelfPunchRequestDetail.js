import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, Eye, EyeOff, FileText, Plus, ShieldCheck, Trash2, UserRound, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import { parseApiError } from "../lib/apiClient";
import { supervisorSelfPunchApi, professionalLeaveMgmtApi } from "../services/supervisorSelfPunchApi";
import StatusBadge from "../components/selfPunch/StatusBadge";
import AccessDeniedState from "../components/selfPunch/AccessDeniedState";
import ToastMessage from "../components/selfPunch/ToastMessage";
import attendanceBannerBg from "../assets/attendance-banner-bg.png";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const maskAadhaar = (value) => {
  if (!value) return "-";
  const clean = String(value).replace(/\D/g, "");
  if (clean.length < 4) return "****";
  return `XXXX-XXXX-${clean.slice(-4)}`;
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

const normalizeLog = (entry) => ({
  ...entry,
  actorName: entry.supervisor_name || "System",
  actorRole: entry.performed_by_id ? "Supervisor" : "System",
  note: entry.comments || "-",
  timestamp: entry.created_at,
});

export default function SupervisorSelfPunchRequestDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [showAadhaar, setShowAadhaar] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [toast, setToast] = useState(null);

  // Leave allocation state (for approve modal)
  const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const LEAVE_TYPES = ["CASUAL", "MEDICAL", "PAID"];
  const PERIODS = ["monthly", "quarterly", "half_yearly", "yearly"];
  const PERIOD_LABELS = { monthly: "Monthly", quarterly: "Quarterly (3M)", half_yearly: "Half-Yearly", yearly: "Yearly" };

  const [weekOffDays, setWeekOffDays] = useState([]);
  const [allocations, setAllocations] = useState([
    { leave_type: "CASUAL", period: "monthly", allocated_count: "" },
  ]);

  const toggleWeekDay = (day) => setWeekOffDays((prev) =>
    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
  );

  const addAllocRow = () => setAllocations((prev) => [
    ...prev,
    { leave_type: "CASUAL", period: "monthly", allocated_count: "" },
  ]);

  const updateAllocRow = (idx, field, value) => setAllocations((prev) =>
    prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
  );

  const removeAllocRow = (idx) => setAllocations((prev) => prev.filter((_, i) => i !== idx));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["self-punch-request-detail", id],
    queryFn: () => supervisorSelfPunchApi.getRequestDetail(id),
    enabled: Boolean(id),
  });

  const approveMutation = useMutation({
    mutationFn: () => supervisorSelfPunchApi.approveRequest(id, actionNote, {
      week_off_days: weekOffDays,
      allocations: allocations
        .filter((r) => r.allocated_count !== "" && !isNaN(Number(r.allocated_count)))
        .map((r) => ({ ...r, allocated_count: Number(r.allocated_count) })),
    }),
    onSuccess: (response) => {
      setApproveOpen(false);
      setActionNote("");
      setWeekOffDays([]);
      setAllocations([{ leave_type: "CASUAL", period: "monthly", allocated_count: "" }]);
      const smsSent = response?.sms?.sent;
      const smsError = response?.sms?.error?.message;
      setToast({
        type: smsSent === false ? "error" : "success",
        message: smsSent === false
          ? `Approved, but SMS failed: ${smsError || "Unknown SMS error"}`
          : "Request approved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["self-punch-requests"] });
      queryClient.invalidateQueries({ queryKey: ["self-punch-pending-count"] });
      refetch();
    },
    onError: (mutationError) => {
      setToast({ type: "error", message: parseApiError(mutationError, "Failed to approve request.") });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => supervisorSelfPunchApi.rejectRequest(id, actionNote),
    onSuccess: (response) => {
      setRejectOpen(false);
      setActionNote("");
      const smsSent = response?.sms?.sent;
      const smsError = response?.sms?.error?.message;
      setToast({
        type: smsSent === false ? "error" : "success",
        message: smsSent === false
          ? `Updated, but SMS failed: ${smsError || "Unknown SMS error"}`
          : (response?.message || "Request rejected successfully.")
      });
      queryClient.invalidateQueries({ queryKey: ["self-punch-requests"] });
      queryClient.invalidateQueries({ queryKey: ["self-punch-pending-count"] });
      refetch();
    },
    onError: (mutationError) => {
      setToast({ type: "error", message: parseApiError(mutationError, "Failed to reject request.") });
    },
  });

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const request = data?.data;
  const logs = useMemo(() => {
    const list = Array.isArray(request?.logs) ? request.logs.map(normalizeLog) : [];
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [request]);

  const approvalLog = logs.find((entry) => entry.action === "approved");

  const isForbidden = error?.response?.status === 403;
  const isPdf = (request?.aadhar_doc_url || "").toLowerCase().includes(".pdf");

  if (isForbidden) {
    return <AccessDeniedState />;
  }

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading request details...</div>;
  }

  if (error || !request) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
        {parseApiError(error, "Failed to load request details.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToastMessage toast={toast} onClose={() => setToast(null)} />

      <section
        className="overflow-hidden rounded-2xl border border-blue-100 bg-cover bg-right bg-no-repeat p-5 md:p-6"
        style={{ backgroundImage: `linear-gradient(102deg, rgba(227,240,255,0.95) 0%, rgba(238,235,255,0.9) 52%, rgba(236,228,255,0.82) 100%), url(${attendanceBannerBg})` }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Access Request Review
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-4xl">{request.full_name || "Professional Request"}</h1>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Submitted on {formatDateTime(request.created_at)}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate("/supervisor/self-punch/requests")}
                className="inline-flex items-center gap-2 rounded-lg border border-white/80 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to List
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/75 px-3 py-2">
            <StatusBadge status={request.status} />
          </div>
        </div>
      </section>

      {approvalLog && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Approved by <span className="font-semibold">{approvalLog.actorName}</span> on {formatDateTime(approvalLog.timestamp)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <UserRound className="h-5 w-5 text-blue-600" />
            Submitted Details & Documents
          </h2>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Name</dt><dd className="font-semibold text-slate-900">{request.full_name || "-"}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Employee Code</dt><dd className="font-semibold text-slate-900">{request.emp_code || "-"}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Mobile</dt><dd className="font-semibold text-slate-900">{request.mobile || "-"}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Email</dt><dd className="font-semibold text-slate-900">{request.email || "-"}</dd></div>
            <div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <dt className="text-slate-500">Aadhaar</dt>
                <dd className="flex items-center gap-2 font-semibold text-slate-900">
                  {showAadhaar ? request.aadhar_number : maskAadhaar(request.aadhar_number)}
                  <button
                    type="button"
                    onClick={() => setShowAadhaar((value) => !value)}
                    className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-50"
                  >
                    {showAadhaar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </dd>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">City</dt><dd className="font-semibold text-slate-900">{request.city_name || "-"}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Zone</dt><dd className="font-semibold text-slate-900">{request.zone_name || "-"}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Ward</dt><dd className="font-semibold text-slate-900">{request.ward_name || "-"}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><dt className="text-slate-500">Kothi</dt><dd className="font-semibold text-slate-900">{request.kothi_name || "-"}</dd></div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Selfie</h3>
            {request.selfie_url ? (
              <button type="button" onClick={() => setLightboxImage(request.selfie_url)} className="block w-full">
                <img
                  src={request.selfie_url}
                  alt="Selfie"
                  className="max-h-80 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
                />
              </button>
            ) : (
              <p className="text-sm text-slate-500">No selfie available.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4" />
                Aadhaar Document
              </h3>
              {request.aadhar_doc_url && (
                <a
                  href={request.aadhar_doc_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              )}
            </div>

            {request.aadhar_doc_url ? (
              isPdf ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <Document file={request.aadhar_doc_url} loading={<p className="p-2 text-sm text-slate-500">Loading PDF...</p>}>
                    <Page pageNumber={1} width={520} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                </div>
              ) : (
                <button type="button" onClick={() => setLightboxImage(request.aadhar_doc_url)} className="block w-full">
                  <img
                    src={request.aadhar_doc_url}
                    alt="Aadhaar"
                    className="max-h-96 w-full rounded-xl border border-slate-200 object-contain"
                  />
                </button>
              )
            ) : (
              <p className="text-sm text-slate-500">No document uploaded.</p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
            <CalendarDays className="h-5 w-5 text-violet-600" />
            Actions & Audit Log
          </h2>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Current Status</p>
            <div className="mt-1">
              <StatusBadge status={request.status} />
            </div>
          </div>

          {(request.status === "pending" || request.status === "approved") && (
            <div className="flex flex-wrap gap-2">
              {request.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <XCircle className="h-4 w-4" />
                {request.status === "approved" ? "Reject & Deactivate" : "Reject"}
              </button>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Activity Log</h3>
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              <ol className="space-y-3 border-l border-slate-200 pl-4">
                {logs.map((log) => (
                  <li key={log.id || `${log.action}-${log.timestamp}`} className="relative rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm">
                    <span className="absolute -left-[1.02rem] top-4 h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <p className="font-semibold capitalize text-slate-800">{log.action}</p>
                    <p className="text-slate-600">
                      {log.actorName} ({log.actorRole})
                    </p>
                    <p className="text-slate-600">Note: {log.note}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(log.timestamp)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setLightboxImage("")}
          role="presentation"
        >
          <img src={lightboxImage} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-1" />
        </div>
      )}

      {approveOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Approval</h3>
            <p className="mt-1 text-sm text-slate-600">Optionally configure leave allocations and week off before approving.</p>
            <textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              rows={2}
              placeholder="Optional note"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {/* Week Off Section */}
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Week Off Days</p>
              <div className="flex flex-wrap gap-2">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekDay(idx)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      weekOffDays.includes(idx)
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Leave Allocation Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Leave Allocations</p>
                <button type="button" onClick={addAllocRow} className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                  <Plus className="h-3 w-3" /> Add Row
                </button>
              </div>
              <div className="space-y-2">
                {allocations.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <select
                      value={row.leave_type}
                      onChange={(e) => updateAllocRow(idx, "leave_type", e.target.value)}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-800 bg-white"
                    >
                      {["CASUAL","MEDICAL","PAID"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      value={row.period}
                      onChange={(e) => updateAllocRow(idx, "period", e.target.value)}
                      className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-800 bg-white"
                    >
                      {["monthly","quarterly","half_yearly","yearly"].map((p) => (
                        <option key={p} value={p}>{{ monthly:"Monthly", quarterly:"Quarterly", half_yearly:"Half-Yearly", yearly:"Yearly" }[p]}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={row.allocated_count}
                      onChange={(e) => updateAllocRow(idx, "allocated_count", e.target.value)}
                      placeholder="Count"
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-xs text-slate-800"
                    />
                    <button type="button" onClick={() => removeAllocRow(idx)} className="text-rose-500 hover:text-rose-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {allocations.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No allocations set ΓÇö employee will have unlimited leaves.</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setApproveOpen(false)} className="rounded border border-slate-300 px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
              >
                {approveMutation.isPending ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {request.status === "approved" ? "Reject & Deactivate Access" : "Reject Request"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Reason is required to proceed.
            </p>
            <textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              rows={4}
              placeholder="Enter rejection reason"
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectOpen(false)} className="rounded border border-slate-300 px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || !actionNote.trim()}
                className="rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Submitting..." : (request.status === "approved" ? "Reject & Deactivate" : "Reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}