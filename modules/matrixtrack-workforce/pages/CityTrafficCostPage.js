import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config";

const formatDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

const formatDateLabel = (value) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatShortTime = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatInr = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatCount = (value) => new Intl.NumberFormat("en-IN").format(Number(value) || 0);

const sourceMeta = {
  group_attendance: {
    label: "Group Attendance",
    short: "Group",
    description: "Supervisor group photo attendance traffic",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
  },
  individual_attendance: {
    label: "Individual Attendance",
    short: "Individual",
    description: "Single employee or self punch attendance traffic",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  professional_punch_in: {
    label: "Professional Punch In",
    short: "Pro In",
    description: "Professional punch-in face verification traffic",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
  professional_punch_out: {
    label: "Professional Punch Out",
    short: "Pro Out",
    description: "Professional punch-out face verification traffic",
    badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  },
  professional_access_request: {
    label: "Professional Access Request",
    short: "Access",
    description: "Professional access request records",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  face_enrollment: {
    label: "Face Enrollment",
    short: "Enroll",
    description: "Face indexing or enrollment traffic",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const getSourceMeta = (source) => sourceMeta[source] || {
  label: String(source || "Unknown").replace(/_/g, " "),
  short: String(source || "Unknown").replace(/_/g, " "),
  description: "Traffic source",
  badge: "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeRow = (row) => ({
  ...row,
  partner_name: row.partner_name || "",
  billing_model: row.billing_model || "per_attendance",
  rate_per_request_inr: Number(row.rate_per_request_inr ?? 0),
  rate_per_attendance_inr: Number(row.rate_per_attendance_inr ?? 0),
  notes: row.notes || "",
});

const buildCostFormula = (row) => {
  const requestRate = Number(row.rate_per_request_inr) || 0;
  const attendanceRate = Number(row.rate_per_attendance_inr) || 0;
  const requests = Number(row.request_count) || 0;
  const attendance = Number(row.attendance_count) || 0;
  const pieces = [];

  if (requestRate > 0) {
    pieces.push(`${formatCount(requests)} x ${formatInr(requestRate)} req`);
  }
  if (attendanceRate > 0) {
    pieces.push(`${formatCount(attendance)} x ${formatInr(attendanceRate)} attendance`);
  }

  if (!pieces.length) return "No rate set for this city yet";
  return pieces.join(" + ");
};

export default function CityTrafficCostPage() {
  const today = useMemo(() => formatDateInput(new Date()), []);
  const monthStart = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    return formatDateInput(date);
  }, []);

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [configs, setConfigs] = useState([]);
  const [summary, setSummary] = useState({ rows: [], cityTotals: [], dayTotals: [], overview: {} });
  const [loading, setLoading] = useState(true);
  const [savingCityId, setSavingCityId] = useState(null);
  const [error, setError] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");

  const token = localStorage.getItem("token");

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [configRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin-management/city-cost/configs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin-management/city-cost/summary?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const configPayload = await configRes.json().catch(() => []);
      const summaryPayload = await summaryRes.json().catch(() => ({}));

      if (!configRes.ok) {
        throw new Error(configPayload?.error || "Unable to load city configs.");
      }
      if (!summaryRes.ok) {
        throw new Error(summaryPayload?.error || "Unable to load city summary.");
      }

      setConfigs(Array.isArray(configPayload) ? configPayload.map(normalizeRow) : []);
      setSummary({
        rows: Array.isArray(summaryPayload.rows) ? summaryPayload.rows : [],
        cityTotals: Array.isArray(summaryPayload.cityTotals) ? summaryPayload.cityTotals : [],
        dayTotals: Array.isArray(summaryPayload.dayTotals) ? summaryPayload.dayTotals : [],
        overview: summaryPayload.overview || {},
        bucket: summaryPayload.bucket || null,
      });
    } catch (loadError) {
      setError(loadError.message || "Unable to load city traffic cost data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateConfigField = (cityId, field, value) => {
    setConfigs((current) =>
      current.map((row) =>
        Number(row.city_id) === Number(cityId) ? { ...row, [field]: value } : row
      )
    );
  };

  const saveConfig = async (row) => {
    setSavingCityId(row.city_id);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin-management/city-cost/configs/${row.city_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partner_name: row.partner_name,
          billing_model: row.billing_model,
          rate_per_request_inr: Number(row.rate_per_request_inr) || 0,
          rate_per_attendance_inr: Number(row.rate_per_attendance_inr) || 0,
          notes: row.notes,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Unable to save config.");
      }
      setConfigs((current) =>
        current.map((item) =>
          Number(item.city_id) === Number(row.city_id) ? normalizeRow(payload) : item
        )
      );
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Unable to save config.");
    } finally {
      setSavingCityId(null);
    }
  };

  const detailedRows = useMemo(() => {
    const rows = Array.isArray(summary.rows) ? summary.rows : [];
    return rows.filter((row) => {
      const cityMatch = selectedCity === "all" || String(row.city_id) === selectedCity;
      const sourceMatch = selectedSource === "all" || String(row.source) === selectedSource;
      return cityMatch && sourceMatch;
    });
  }, [selectedCity, selectedSource, summary.rows]);

  const detailCities = useMemo(() => {
    const map = new Map();
    for (const row of summary.rows || []) {
      if (!map.has(String(row.city_id))) {
        map.set(String(row.city_id), { id: String(row.city_id), name: row.city_name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [summary.rows]);

  const detailSources = useMemo(() => {
    const unique = [...new Set((summary.rows || []).map((row) => String(row.source)))];
    return unique.sort();
  }, [summary.rows]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Superadmin Only</div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">City Traffic Cost</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              City-wise billing view for attendance traffic. Cost is calculated in INR from request count and attendance count using the rate setup below.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <button
              onClick={loadData}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Refresh
            </button>
          </div>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Billable Requests" value={formatCount(summary.overview?.request_count || 0)} tone="sky" />
        <MetricCard label="Attendance Events" value={formatCount(summary.overview?.attendance_count || 0)} tone="emerald" />
        <MetricCard label="Successful API Calls" value={formatCount(summary.overview?.success_count || 0)} tone="violet" />
        <MetricCard label="Estimated Cost" value={formatInr(summary.overview?.total_cost_inr || 0)} tone="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">City Billing Setup</h2>
              <p className="text-sm text-slate-500">Rate settings used for INR cost calculation.</p>
            </div>
            <div className="text-xs text-slate-500">Snapshot bucket: {summary.bucket || "Not configured"}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-3 font-medium">City</th>
                  <th className="px-3 py-3 font-medium">Billing Model</th>
                  <th className="px-3 py-3 font-medium">Req Rate (INR)</th>
                  <th className="px-3 py-3 font-medium">Attendance Rate (INR)</th>
                  <th className="px-3 py-3 font-medium">Notes</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {configs.map((row) => (
                  <tr key={row.city_id} className="align-top">
                    <td className="px-3 py-3 font-medium text-slate-900">{row.city_name}</td>
                    <td className="px-3 py-3">
                      <select
                        value={row.billing_model}
                        onChange={(e) => updateConfigField(row.city_id, "billing_model", e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-2"
                      >
                        <option value="per_request">Per Request</option>
                        <option value="per_attendance">Per Attendance</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate_per_request_inr}
                        onChange={(e) => updateConfigField(row.city_id, "rate_per_request_inr", e.target.value)}
                        className="w-28 rounded-lg border border-slate-300 px-2 py-2"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.rate_per_attendance_inr}
                        onChange={(e) => updateConfigField(row.city_id, "rate_per_attendance_inr", e.target.value)}
                        className="w-28 rounded-lg border border-slate-300 px-2 py-2"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.notes}
                        onChange={(e) => updateConfigField(row.city_id, "notes", e.target.value)}
                        className="w-44 rounded-lg border border-slate-300 px-2 py-2"
                        placeholder="Optional note"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => saveConfig(row)}
                        disabled={savingCityId === row.city_id}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {savingCityId === row.city_id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">City Totals</h2>
            <p className="text-sm text-slate-500">Aggregated for the selected date range.</p>
          </div>
          <div className="space-y-3">
            {summary.cityTotals?.length ? summary.cityTotals.map((row) => (
              <div key={row.city_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{row.city_name}</div>
                    <div className="text-xs text-slate-500">Success {formatCount(row.success_count || 0)} | Failed {formatCount(row.failure_count || 0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{formatInr(row.total_cost_inr)}</div>
                    <div className="text-xs text-slate-500">{row.billing_model}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-xl bg-white px-3 py-2">Requests: <span className="font-medium text-slate-900">{formatCount(row.request_count)}</span></div>
                  <div className="rounded-xl bg-white px-3 py-2">Attendance: <span className="font-medium text-slate-900">{formatCount(row.attendance_count)}</span></div>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No city traffic recorded for this range yet.</div>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Daily Totals</h2>
            <p className="text-sm text-slate-500">Day-wise total bill for the selected period.</p>
          </div>
          <div className="space-y-3">
            {summary.dayTotals?.length ? summary.dayTotals.map((row) => (
              <div key={row.metric_date} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{formatDateLabel(row.metric_date)}</div>
                    <div className="text-xs text-slate-500">API success {formatCount(row.success_count || 0)} | failed {formatCount(row.failure_count || 0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-slate-900">{formatInr(row.total_cost_inr)}</div>
                    <div className="text-xs text-slate-500">daily total</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-xl bg-white px-3 py-2">Requests: <span className="font-medium text-slate-900">{formatCount(row.request_count)}</span></div>
                  <div className="rounded-xl bg-white px-3 py-2">Attendance: <span className="font-medium text-slate-900">{formatCount(row.attendance_count)}</span></div>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No daily totals yet.</div>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Detailed Billing Timeline</h2>
              <p className="text-sm text-slate-500">
                This shows when each city/source row was last updated and how the bill was calculated. Time shown here is sync time, not exact employee punch time.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="all">All cities</option>
                {detailCities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
              >
                <option value="all">All sources</option>
                {detailSources.map((source) => (
                  <option key={source} value={source}>{getSourceMeta(source).label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <QuickStat label="Visible Rows" value={formatCount(detailedRows.length)} />
            <QuickStat label="Visible Requests" value={formatCount(detailedRows.reduce((sum, row) => sum + (Number(row.request_count) || 0), 0))} />
            <QuickStat label="Visible Cost" value={formatInr(detailedRows.reduce((sum, row) => sum + (Number(row.total_cost_inr) || 0), 0))} />
          </div>

          <div className="max-h-[760px] space-y-3 overflow-auto pr-1">
            {detailedRows.length ? detailedRows.map((row, index) => {
              const meta = getSourceMeta(row.source);
              return (
                <article key={`${row.metric_date}-${row.city_id}-${row.source}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {formatDateLabel(row.metric_date)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                          {row.city_name}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{meta.description}</div>
                        <div className="text-xs text-slate-500">Last updated at {formatDateTime(row.last_updated)}</div>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Row Cost</div>
                      <div className="text-2xl font-semibold text-slate-900">{formatInr(row.total_cost_inr)}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <DetailCell label="Sync Time" value={formatShortTime(row.last_updated)} helper="when this billing row last changed" />
                    <DetailCell label="Requests" value={formatCount(row.request_count)} helper="billable AWS calls counted" />
                    <DetailCell label="Attendance" value={formatCount(row.attendance_count)} helper="successful business events" />
                    <DetailCell label="API Result" value={`${formatCount(row.success_count || 0)} success / ${formatCount(row.failure_count || 0)} fail`} helper="tracked Rekognition usage" />
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cost Calculation</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{buildCostFormula(row)}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Billing model: {row.billing_model} | Req rate: {formatInr(row.rate_per_request_inr)} | Attendance rate: {formatInr(row.rate_per_attendance_inr)}
                    </div>
                  </div>
                </article>
              );
            }) : <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No detailed billing rows for the selected filters.</div>}
          </div>
        </section>
      </div>

      {loading ? <div className="text-sm text-slate-500">Loading city traffic cost data...</div> : null}
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  const toneMap = {
    sky: "from-sky-500 to-cyan-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-fuchsia-500",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 w-full bg-gradient-to-r ${toneMap[tone] || toneMap.sky}`} />
      <div className="p-5">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DetailCell({ label, value, helper }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
  );
}
