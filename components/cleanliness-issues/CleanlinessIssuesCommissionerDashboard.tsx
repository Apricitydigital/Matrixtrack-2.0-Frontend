'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { CleanlinessIssuesCommissionerApi, type CommissionerSummary, type GroupRow } from "@lib/cleanlinessIssuesApi";
import { hoursText, percentText, statusLabel, type FilterState } from "@lib/cleanlinessIssuesLogic";
import { FilterBar, KpiTile, LoadError, Panel, td, th } from "./ui";

const GroupedBars = dynamic(() => import("./Charts").then((m) => m.GroupedBars), { ssr: false });
const TrendLines = dynamic(() => import("./Charts").then((m) => m.TrendLines), { ssr: false });

const SERIES = [
  { key: "reported", label: "Reported", color: "#2563eb" },
  { key: "closed", label: "Closed", color: "#10b981" },
  { key: "overdue", label: "Overdue", color: "#ef4444" }
];
const bars = (rows: GroupRow[]) => rows.map((r) => ({ name: r.name ?? r.id, reported: r.total, closed: r.closed, overdue: r.overdue }));

function Comparison({ rows, label, withZone }: { rows: GroupRow[]; label: string; withZone?: boolean }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-400">No issues in this selection.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            {[label, ...(withZone ? ["Zone"] : []), "Reported", "Closed", "Closure %", "Overdue", "Reopen requests", "Rejection rate", "Avg resolution"].map((h) => <th key={h} className={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-50">
              <td className={`${td} font-bold`}>{r.name ?? r.id}</td>
              {withZone ? <td className={td}>{r.zoneName ?? "—"}</td> : null}
              <td className={td}>{r.total}</td><td className={td}>{r.closed}</td><td className={td}>{percentText(r.closurePercent)}</td>
              <td className={td}>{r.overdue}</td><td className={td}>{r.reopenRequests.total}</td><td className={td}>{percentText(r.rejectionRate)}</td><td className={td}>{hoursText(r.avgResolutionHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Commissioner: read-only city view of IEC-originated cleanliness issues. No assignment, no approval, no personal data. */
export default function CleanlinessIssuesCommissionerDashboard() {
  const [filters, setFilters] = useState<FilterState>({});
  const [options, setOptions] = useState<Awaited<ReturnType<typeof CleanlinessIssuesCommissionerApi.filters>> | null>(null);
  const [data, setData] = useState<CommissionerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ticket = useRef(0);

  useEffect(() => {
    CleanlinessIssuesCommissionerApi.filters().then(setOptions).catch(() => setOptions(null));
  }, []);

  const filterKey = JSON.stringify(filters);
  const load = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);
    try {
      const result = await CleanlinessIssuesCommissionerApi.summary(filters);
      if (mine === ticket.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mine === ticket.current) setError(e instanceof Error ? e.message : "Could not load the summary.");
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);
  useEffect(() => {
    load();
  }, [load]);

  const k = data?.kpis;
  const v = (n: number | undefined) => (k ? n ?? 0 : "—");
  const totalStatus = (data?.statusDistribution ?? []).reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">IEC Cleanliness Issues</h1>
          <p className="text-sm text-slate-500">City-level view of issues reported by IEC Members (read-only). Counted per parent issue.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <FilterBar value={filters} options={options} onChange={setFilters} />
      {error ? <LoadError message={error} onRetry={load} /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy={loading}>
        <KpiTile label="Total reported" value={v(k?.totalReported)} />
        <KpiTile label="Total closed" value={v(k?.totalClosed)} tone="success" />
        <KpiTile label="Open issues" value={v(k?.openIssues)} tone="warning" />
        <KpiTile label="Closure" value={k ? percentText(k.closurePercent) : "—"} tone="success" hint="closed ÷ reported" />
        <KpiTile label="Overdue inspections" value={v(k?.overdueInspections)} tone="danger" hint="not inspected, deadline passed" />
        <KpiTile label="Avg resolution time" value={k ? hoursText(k.avgResolutionHours) : "—"} hint="per closed cycle" />
        <KpiTile label="Reopened issues" value={v(k?.reopenedIssues)} hint={k ? `${k.reopenRequests.total} requests · ${k.reopenRequests.approved} approved · ${k.reopenRequests.rejected} rejected` : undefined} />
        <KpiTile label="Repeat inspection / rejection rate" value={k ? percentText(k.repeatRejectionRate) : "—"} tone="warning" hint={k ? `${k.rejectedAttempts} of ${k.inspectionAttempts} attempts rejected` : undefined} />
      </div>

      {data ? (
        <>
          <Panel title="Trend" subtitle={`${data.trend.granularity === "DAY" ? "Daily" : "Monthly"}, ${data.trend.from} to ${data.trend.to} (IST). Closed counts resolutions, so a reopened issue closed again counts again.`}>
            <TrendLines points={data.trend.points} />
          </Panel>
          <Panel title="Zone comparison"><GroupedBars data={bars(data.zones)} series={SERIES} /><Comparison rows={data.zones} label="Zone" /></Panel>
          <Panel title="Ward comparison"><GroupedBars data={bars(data.wards.slice(0, 20))} series={SERIES} /><Comparison rows={data.wards} label="Ward" withZone /></Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Module breakdown"><Comparison rows={data.modules} label="Module" /></Panel>
            <Panel title="Issue status distribution">
              <ul className="space-y-2">
                {data.statusDistribution.length === 0 ? <li className="text-sm text-slate-400">No issues in this selection.</li> : null}
                {data.statusDistribution.map((s) => (
                  <li key={s.status} className="text-sm">
                    <div className="flex justify-between"><span className="font-semibold">{statusLabel(s.status)}</span><span className="tabular-nums">{s.count}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${totalStatus ? (s.count / totalStatus) * 100 : 0}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  );
}
