'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUp, Download, RefreshCw } from "lucide-react";
import {
  CleanlinessIssuesAdminApi,
  type AnalyticsResponse,
  type DarogaPerformanceRow,
  type FilterOptions,
  type GroupRow,
  type IssuePage,
  type IssueRow,
  type SortState,
  type SummaryResponse,
  type UnassignedRow
} from "@lib/cleanlinessIssuesApi";
import { describeRemaining, formatDateTimeIst, hoursText, overdueLabel, percentText, type FilterState } from "@lib/cleanlinessIssuesLogic";
import { AssignDarogaModal } from "./AssignDarogaModal";
import { IssueDetailModal } from "./IssueDetailModal";
import { FilterBar, KpiTile, LoadError, Pagination, Panel, Pill, StatusPill, Tabs, td, th } from "./ui";

const GroupedBars = dynamic(() => import("./Charts").then((m) => m.GroupedBars), { ssr: false });

const ASSIGNABLE = ["REPORTED", "UNASSIGNED", "REOPENED", "ASSIGNED", "REINSPECTION_REQUIRED"];
const PAGE_SIZE = 25;
type TabId = "issues" | "unassigned" | "performance" | "analytics";

/** Runs a loader on every change of its inputs and ignores answers that arrive after a newer request. */
function useLoader<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const ticket = useRef(0);
  const run = useCallback(async () => {
    const mine = ++ticket.current;
    setLoading(true);
    try {
      const result = await loader();
      if (mine === ticket.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mine === ticket.current) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (mine === ticket.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { data, error, loading, reload: run };
}

export default function CleanlinessIssuesAdminDashboard() {
  const [tab, setTab] = useState<TabId>("issues");
  const [filters, setFilters] = useState<FilterState>({});
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sort: "reportedAt", order: "desc" });
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);

  useEffect(() => {
    CleanlinessIssuesAdminApi.filters().then(setOptions).catch((e) => setOptionsError(e instanceof Error ? e.message : "Could not load the filters."));
  }, []);

  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(1);
    setUnassignedPage(1);
  }, [filterKey]);

  const summary = useLoader<SummaryResponse>(() => CleanlinessIssuesAdminApi.summary(filters), [filterKey]);
  const issues = useLoader<IssuePage>(() => CleanlinessIssuesAdminApi.issues(filters, page, PAGE_SIZE, sort), [filterKey, page, sort.sort, sort.order]);
  const unassigned = useLoader(() => CleanlinessIssuesAdminApi.unassigned(filters, unassignedPage, PAGE_SIZE), [filterKey, unassignedPage]);
  const performance = useLoader(() => (tab === "performance" ? CleanlinessIssuesAdminApi.performance(filters) : Promise.resolve(null)), [filterKey, tab === "performance"]);
  const analytics = useLoader(() => (tab === "analytics" ? CleanlinessIssuesAdminApi.analytics(filters) : Promise.resolve(null)), [filterKey, tab === "analytics"]);

  const refreshAll = () => {
    summary.reload();
    issues.reload();
    unassigned.reload();
    performance.reload();
    analytics.reload();
  };

  const sortBy = (column: string) => setSort((s) => (s.sort === column ? { sort: column, order: s.order === "asc" ? "desc" : "asc" } : { sort: column, order: column === "issueNumber" ? "asc" : "desc" }));

  const exportCsv = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      const { rows, truncated } = await CleanlinessIssuesAdminApi.exportCsv(filters, sort);
      setNotice(truncated ? `Exported the first ${rows} issues (the export is capped). Narrow the filters to export the rest.` : `Exported ${rows} issues.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The export failed.");
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const k = summary.data?.kpis;
  const fmt = (n: number | undefined) => (k ? n ?? 0 : "—");

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Cleanliness Issues Management</h1>
          <p className="text-sm text-slate-500">Issues reported by IEC Members. Counted per parent issue; separate from scheduled inspections.</p>
        </div>
        <button type="button" onClick={refreshAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {optionsError ? <LoadError message={optionsError} /> : null}
      {notice ? (
        <div role="status" className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-bold">Dismiss</button>
        </div>
      ) : null}

      <FilterBar value={filters} options={options} onChange={setFilters} fields={{ status: tab === "issues", daroga: tab === "issues", overdue: tab === "issues", search: tab === "issues" }} />

      {summary.error ? <LoadError message={summary.error} onRetry={summary.reload} /> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6" aria-label="Key figures" aria-busy={summary.loading}>
        <KpiTile label="Total reported" value={fmt(k?.total)} />
        <KpiTile label="Open issues" value={fmt(k?.open)} tone="warning" />
        <KpiTile label="Closed issues" value={fmt(k?.closed)} tone="success" hint={k ? `${percentText(k.closurePercent)} closed` : undefined} />
        <KpiTile label="Pending Daroga inspection" value={fmt(k?.pendingDaroga)} tone="primary" />
        <KpiTile label="QC pending" value={fmt(k?.qcPending)} tone="warning" />
        <KpiTile label="ULB pending" value={fmt(k?.ulbPending)} tone="warning" />
        <KpiTile label="Reinspection required" value={fmt(k?.reinspection)} tone="danger" />
        <KpiTile label="Overdue issues" value={fmt(k?.overdue)} tone="danger" hint="not inspected, deadline passed" onClick={() => { setTab("issues"); setFilters((f) => ({ ...f, overdue: "OVERDUE" })); }} />
        <KpiTile label="Unassigned issues" value={fmt(k?.unassigned)} tone="danger" onClick={() => setTab("unassigned")} />
        <KpiTile label="Reopened issues" value={fmt(k?.reopened)} hint={k ? `${k.reopenRequests.pending} request${k.reopenRequests.pending === 1 ? "" : "s"} pending` : undefined} />
        <KpiTile label="Avg initial inspection time" value={k ? hoursText(k.avgInitialInspectionHours) : "—"} hint="per cycle, start to first inspection" />
        <KpiTile label="Avg resolution time" value={k ? hoursText(k.avgResolutionHours) : "—"} hint="per closed cycle" />
      </div>

      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "issues", label: "All issues" },
          { id: "unassigned", label: "Unassigned issues", badge: unassigned.data?.total ?? null },
          { id: "performance", label: "Daroga performance" },
          { id: "analytics", label: "Zone / Ward analytics" }
        ]}
      />

      {tab === "issues" ? (
        <Panel
          title="Issues"
          subtitle="Click an issue number for its complete lifecycle."
          actions={
            <button type="button" onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <Download size={14} /> {exporting ? "Exporting…" : "Export CSV"}
            </button>
          }
        >
          {issues.error ? <LoadError message={issues.error} onRetry={issues.reload} /> : null}
          <IssueTable rows={issues.data?.items ?? []} loading={issues.loading} sort={sort} onSort={sortBy} onOpen={setDetailId} onAssign={setAssignId} />
          {issues.data ? <Pagination page={issues.data.page} totalPages={issues.data.totalPages} total={issues.data.total} onPage={setPage} /> : null}
        </Panel>
      ) : null}

      {tab === "unassigned" ? (
        <Panel title="Unassigned issues" subtitle="Issues waiting for a Daroga. The 24-hour deadline keeps running; assigning does not reset it.">
          {unassigned.error ? <LoadError message={unassigned.error} onRetry={unassigned.reload} /> : null}
          <UnassignedTable rows={unassigned.data?.items ?? []} loading={unassigned.loading} onOpen={setDetailId} onAssign={setAssignId} />
          {unassigned.data ? <Pagination page={unassigned.data.page} totalPages={unassigned.data.totalPages} total={unassigned.data.total} onPage={setUnassignedPage} /> : null}
        </Panel>
      ) : null}

      {tab === "performance" ? (
        <Panel title="Daroga performance (IEC issues only)" subtitle="The 24-hour measure is the Daroga's first inspection of each cycle against that cycle's deadline. It is independent of QC / ULB approval time and of scheduled-inspection performance.">
          {performance.error ? <LoadError message={performance.error} onRetry={performance.reload} /> : null}
          <PerformanceTable rows={performance.data?.items ?? []} loading={performance.loading} />
        </Panel>
      ) : null}

      {tab === "analytics" ? (
        <AnalyticsView data={analytics.data} loading={analytics.loading} error={analytics.error} onRetry={analytics.reload} />
      ) : null}

      <IssueDetailModal issueId={detailId} onClose={() => setDetailId(null)} onAssign={(i) => { setDetailId(null); setAssignId(i.id); }} />
      <AssignDarogaModal
        issueId={assignId}
        onClose={() => setAssignId(null)}
        onDone={(message) => {
          setNotice(message);
          refreshAll();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ tables */

function assetText(r: IssueRow) {
  if (r.module === "OTHER") return r.otherIssueType ?? "—";
  const asset = r.asset as { label?: string | null } | null;
  return asset?.label ?? (r.assetNotListed ? "Asset not listed" : "—");
}

function SortHeader({ label, column, sort, onSort }: { label: string; column: string; sort: SortState; onSort: (c: string) => void }) {
  const active = sort.sort === column;
  return (
    <th className={th} aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1 uppercase tracking-wider">
        {label}
        {active ? sort.order === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
      </button>
    </th>
  );
}

function Empty({ loading, text }: { loading: boolean; text: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{loading ? "Loading…" : text}</p>;
}

function IssueTable({ rows, loading, sort, onSort, onOpen, onAssign }: { rows: IssueRow[]; loading: boolean; sort: SortState; onSort: (c: string) => void; onOpen: (id: string) => void; onAssign: (id: string) => void }) {
  if (!rows.length) return <Empty loading={loading} text="No issues match these filters." />;
  return (
    <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
      <table className="w-full min-w-[1100px] border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <SortHeader label="Issue number" column="issueNumber" sort={sort} onSort={onSort} />
            <SortHeader label="Reported" column="reportedAt" sort={sort} onSort={onSort} />
            <th className={th}>IEC Member</th>
            <SortHeader label="Module" column="module" sort={sort} onSort={onSort} />
            <th className={th}>Zone</th>
            <th className={th}>Ward</th>
            <th className={th}>Asset / type</th>
            <th className={th}>Assigned Daroga</th>
            <SortHeader label="Status" column="status" sort={sort} onSort={onSort} />
            <SortHeader label="Inspection deadline" column="inspectionDueAt" sort={sort} onSort={onSort} />
            <th className={th}>Overdue</th>
            <SortHeader label="Last updated" column="updatedAt" sort={sort} onSort={onSort} />
            <th className={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const overdue = overdueLabel(r.overdue);
            return (
              <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                <td className={td}><button type="button" onClick={() => onOpen(r.id)} className="font-bold text-blue-700 hover:underline">{r.issueNumber}</button>{r.currentCycleNumber > 1 ? <div className="text-[11px] text-slate-400">Cycle {r.currentCycleNumber}</div> : null}</td>
                <td className={td}>{formatDateTimeIst(r.reportedAt)}</td>
                <td className={td}>{r.iecMember.name ?? "—"}</td>
                <td className={td}>{r.moduleLabel}</td>
                <td className={td}>{r.zone.name ?? "—"}</td>
                <td className={td}>{r.ward.name ?? "—"}</td>
                <td className={td}>{assetText(r)}</td>
                <td className={td}>{r.assignedDaroga?.name ?? <Pill tone={r.needsDaroga ? "danger" : "neutral"}>Unassigned</Pill>}</td>
                <td className={td}><StatusPill status={r.status} /></td>
                <td className={td}>{formatDateTimeIst(r.inspectionDueAt)}</td>
                <td className={td}><Pill tone={overdue.tone}>{overdue.text}</Pill></td>
                <td className={td}>{formatDateTimeIst(r.updatedAt)}</td>
                <td className={td}>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onOpen(r.id)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50">View</button>
                    {ASSIGNABLE.includes(r.status) ? (
                      <button type="button" onClick={() => onAssign(r.id)} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700">{r.assignedDaroga ? "Reassign" : "Assign"}</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UnassignedTable({ rows, loading, onOpen, onAssign }: { rows: UnassignedRow[]; loading: boolean; onOpen: (id: string) => void; onAssign: (id: string) => void }) {
  if (!rows.length) return <Empty loading={loading} text="No issue is waiting for a Daroga." />;
  return (
    <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
      <table className="w-full min-w-[960px] border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            <th className={th}>Issue number</th><th className={th}>Zone / Ward</th><th className={th}>Module</th><th className={th}>Reported</th>
            <th className={th}>Deadline</th><th className={th}>Time remaining</th><th className={th}>Reason</th><th className={th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const remaining = describeRemaining(r.timeRemainingMs);
            return (
              <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                <td className={td}><button type="button" onClick={() => onOpen(r.id)} className="font-bold text-blue-700 hover:underline">{r.issueNumber}</button><div className="mt-0.5"><StatusPill status={r.status} /></div></td>
                <td className={td}>{r.zone.name ?? "—"} / {r.ward.name ?? "—"}</td>
                <td className={td}>{r.moduleLabel}</td>
                <td className={td}>{formatDateTimeIst(r.reportedAt)}</td>
                <td className={td}>{formatDateTimeIst(r.inspectionDueAt)}</td>
                <td className={td}><Pill tone={remaining.overdue ? "danger" : "primary"}>{remaining.text}</Pill></td>
                <td className={`${td} max-w-[320px]`}>
                  <div className="font-semibold">{r.unassigned.causeLabel}</div>
                  <div className={`text-xs ${r.unassigned.noEligibleDaroga ? "text-red-600" : "text-slate-500"}`}>{r.unassigned.reason}</div>
                </td>
                <td className={td}>
                  <button type="button" onClick={() => onAssign(r.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">Assign Daroga</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PerformanceTable({ rows, loading }: { rows: DarogaPerformanceRow[]; loading: boolean }) {
  if (!rows.length) return <Empty loading={loading} text="No Daroga has handled an IEC issue in this selection." />;
  const heads = ["Daroga", "Assigned issues", "Open", "Closed", "Overdue initial inspections", "Initial inspections within 24 h", "Avg initial inspection", "Reinspections", "QC rejections", "ULB rejections", "ULB action required"];
  return (
    <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">{heads.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.daroga.id} className="border-t border-slate-50">
              <td className={`${td} font-bold`}>{r.daroga.name ?? r.daroga.id}</td>
              <td className={td}>{r.assignedIssues}</td>
              <td className={td}>{r.openIssues}</td>
              <td className={td}>{r.closedIssues}</td>
              <td className={td}>{r.overdueInitialInspections}<div className="text-[11px] text-slate-400">{r.overdueOutstanding} pending · {r.submittedLate} late</div></td>
              <td className={td}>{r.initialWithin24h} of {r.initialInspections}</td>
              <td className={td}>{hoursText(r.avgInitialInspectionHours)}</td>
              <td className={td}>{r.reinspections}</td>
              <td className={td}>{r.qcRejections}</td>
              <td className={td}>{r.ulbRejections}</td>
              <td className={td}>{r.ulbActionRequired}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------- analytics */

function GroupTable({ rows, nameLabel, withZone }: { rows: GroupRow[]; nameLabel: string; withZone?: boolean }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-400">No issues in this selection.</p>;
  const heads = [nameLabel, ...(withZone ? ["Zone"] : []), "Reported", "Open", "Closed", "Overdue", "Issues reinspected", "Reopen requests", "Approved", "Rejected", "Avg resolution"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <thead><tr className="border-b border-slate-100 bg-slate-50/70">{heads.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-50">
              <td className={`${td} font-bold`}>{r.name ?? r.id}</td>
              {withZone ? <td className={td}>{r.zoneName ?? "—"}</td> : null}
              <td className={td}>{r.total}</td><td className={td}>{r.open}</td><td className={td}>{r.closed}</td>
              <td className={td}>{r.overdue}</td><td className={td}>{r.issuesWithRejection}</td>
              <td className={td}>{r.reopenRequests.total}</td><td className={td}>{r.reopenRequests.approved}</td><td className={td}>{r.reopenRequests.rejected}</td>
              <td className={td}>{hoursText(r.avgResolutionHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SERIES = [
  { key: "open", label: "Open", color: "#f59e0b" },
  { key: "closed", label: "Closed", color: "#10b981" },
  { key: "overdue", label: "Overdue", color: "#ef4444" }
];
const toBars = (rows: GroupRow[]) => rows.map((r) => ({ name: r.name ?? r.id, open: r.open, closed: r.closed, overdue: r.overdue }));

function AnalyticsView({ data, loading, error, onRetry }: { data: AnalyticsResponse | null; loading: boolean; error: string | null; onRetry: () => void }) {
  if (error) return <LoadError message={error} onRetry={onRetry} />;
  if (!data) return <Empty loading={loading} text="No data." />;
  return (
    <div className="space-y-5">
      <Panel title="Zone-wise issues" subtitle="Open versus closed, and overdue"><GroupedBars data={toBars(data.zones)} series={SERIES} /><GroupTable rows={data.zones} nameLabel="Zone" /></Panel>
      <Panel title="Ward-wise issues"><GroupedBars data={toBars(data.wards.slice(0, 20))} series={SERIES} /><GroupTable rows={data.wards} nameLabel="Ward" withZone /></Panel>
      <Panel title="Module-wise distribution"><GroupedBars data={toBars(data.modules)} series={SERIES} height={240} /><GroupTable rows={data.modules} nameLabel="Module" /></Panel>
    </div>
  );
}
