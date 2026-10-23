'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, X } from "lucide-react";
import { formatDateIst, formatDateTimeIst, type FilterState } from "@lib/cleanlinessIssuesLogic";
import {
  UlbCleanlinessApi,
  type HistoryItem,
  type Page,
  type PendingItem,
  type ReopenItem,
  type UlbFilterOptions,
  type UlbSummary
} from "@lib/ulbCleanlinessApi";
import {
  assetText,
  decisionTone,
  describeReopenOutcome,
  describeReviewOutcome,
  PAGE_SIZE,
  qcStatusText,
  ulbDecisionLabel,
  type Outcome
} from "@lib/ulbCleanlinessLogic";
import { FilterBar, Field, KpiTile, LoadError, Pagination, Panel, Pill, StatusPill, Tabs, td, th } from "../ui";
import { HistoryModal, ReopenModal, ReviewModal } from "./DetailModals";

type TabId = "pending" | "reopen" | "history";

const TONE_BOX: Record<Outcome["tone"], string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  negative: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900"
};

/** Loads one page of a list; the latest request wins so a slow older answer never overwrites a newer one. */
function useList<T>(enabled: boolean, load: (page: number) => Promise<Page<T>>, deps: unknown[]) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback((p: number) => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    loadRef.current(p).then(
      (r) => {
        if (mine !== seq.current) return;
        setData(r);
        setLoading(false);
      },
      (e) => {
        if (mine !== seq.current) return;
        setError(e instanceof Error ? e.message : "Could not load.");
        setLoading(false);
      }
    );
  }, []);

  // Filter / tab changes go back to page 1.
  useEffect(() => {
    setPage(1);
    if (enabled) run(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const go = (p: number) => {
    setPage(p);
    run(p);
  };
  const reload = () => run(page);
  return { data, error, loading, page, go, reload };
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse">
        <thead className="border-b border-slate-100">
          <tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-50">{children}</tbody>
      </table>
    </div>
  );
}

function ListState<T>({ list, empty, children }: { list: ReturnType<typeof useList<T>>; empty: string; children: (items: T[]) => React.ReactNode }) {
  if (list.error) return <LoadError message={list.error} onRetry={list.reload} />;
  if (!list.data) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  if (!list.data.items.length) return <div className="py-16 text-center text-sm text-slate-400">{empty}</div>;
  return (
    <div className={list.loading ? "opacity-60 transition" : ""}>
      {children(list.data.items)}
      <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={list.go} />
    </div>
  );
}

const openBtn = "rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700";
const ghostBtn = "rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50";
const selectCls = "h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium normal-case tracking-normal text-slate-700";

export default function UlbCleanlinessWorkspace() {
  const [tab, setTab] = useState<TabId>("pending");
  const [filters, setFilters] = useState<FilterState>({});
  const [options, setOptions] = useState<UlbFilterOptions | null>(null);
  const [summary, setSummary] = useState<UlbSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [historyDecision, setHistoryDecision] = useState("");
  const [mine, setMine] = useState(false);
  const [notice, setNotice] = useState<Outcome | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [reopen, setReopen] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  useEffect(() => {
    UlbCleanlinessApi.filters().then(setOptions, () => setOptions({ zones: [], modules: [], decisions: [] }));
  }, []);

  const filterKey = JSON.stringify(filters);
  const loadSummary = useCallback(() => {
    setSummaryError(null);
    UlbCleanlinessApi.summary(filters).then(setSummary, (e) => setSummaryError(e instanceof Error ? e.message : "Could not load the summary."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);
  useEffect(loadSummary, [loadSummary]);

  const pending = useList<PendingItem>(tab === "pending", (p) => UlbCleanlinessApi.pending(filters, p, PAGE_SIZE), [filterKey]);
  const reopens = useList<ReopenItem>(tab === "reopen", (p) => UlbCleanlinessApi.reopenPending(filters, p, PAGE_SIZE), [filterKey]);
  const history = useList<HistoryItem>(tab === "history", (p) => UlbCleanlinessApi.history(filters, { decision: historyDecision, mine }, p, PAGE_SIZE), [filterKey, historyDecision, mine]);

  const refreshAll = () => {
    loadSummary();
    pending.reload();
    reopens.reload();
    history.reload();
  };
  /** After the server answered (success or stale), always reload from the server: no optimistic updates. */
  const afterChange = () => {
    setReview(null);
    setReopen(null);
    loadSummary();
    if (tab === "pending") pending.reload();
    if (tab === "reopen") reopens.reload();
    if (tab === "history") history.reload();
  };

  const tabs = [
    { id: "pending" as const, label: "Pending Approvals", badge: summary?.pendingApprovals ?? null },
    { id: "reopen" as const, label: "Reopen Requests", badge: summary?.pendingReopenRequests ?? null },
    { id: "history" as const, label: "Review History" }
  ];

  return (
    <div className="space-y-5 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Cleanliness Issue Approvals</h1>
          <p className="text-sm text-slate-500">Final review of IEC-reported cleanliness issues after the Daroga inspection and QC.</p>
        </div>
        <button type="button" onClick={refreshAll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <RefreshCw size={13} className={pending.loading || reopens.loading || history.loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {notice ? (
        <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${TONE_BOX[notice.tone]}`}>
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">{notice.title}</div>
            <div>{notice.detail}</div>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X size={16} /></button>
        </div>
      ) : null}

      {summaryError ? (
        <LoadError message={summaryError} onRetry={loadSummary} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KpiTile label="Pending approvals" value={summary?.pendingApprovals ?? "…"} tone="warning" hint="Waiting for you now" onClick={() => setTab("pending")} />
          <KpiTile label="Reopen requests" value={summary?.pendingReopenRequests ?? "…"} tone="warning" hint="Waiting for you now" onClick={() => setTab("reopen")} />
          <KpiTile label="Approved" value={summary?.approved ?? "…"} tone="success" hint="In the date range" />
          <KpiTile label="Rejected" value={summary?.rejected ?? "…"} tone="danger" hint="In the date range" />
          <KpiTile label="Action required" value={summary?.actionRequired ?? "…"} tone="primary" hint="In the date range" />
        </div>
      )}
      {summary ? <p className="-mt-3 text-[11px] text-slate-400">{summary.basis.pending} {summary.basis.decisions}</p> : null}

      <FilterBar value={filters} options={options} fields={{ search: true }} onChange={setFilters} />

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === "pending" ? (
        <Panel title="Pending approvals" subtitle="Inspections that passed QC and wait for your decision">
          <ListState list={pending} empty="Nothing is waiting for your approval.">
            {(items) => (
              <Table head={["Issue Number", "Reported Date", "IEC Member", "Module", "Zone", "Ward", "Assigned Daroga", "Inspection Date", "QC Status", "Current Status", "Action"]}>
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className={`${td} font-bold text-slate-900`}>{r.issueNumber}<div className="text-[11px] font-normal text-slate-400">{assetText(r)}</div></td>
                    <td className={td}>{formatDateIst(r.reportedAt) ?? "—"}</td>
                    <td className={td}>{r.iecMember.name ?? "—"}</td>
                    <td className={td}>{r.moduleLabel}</td>
                    <td className={td}>{r.zone.name ?? "—"}</td>
                    <td className={td}>{r.ward.name ?? "—"}</td>
                    <td className={td}>{r.assignedDaroga.name ?? "—"}</td>
                    <td className={td}>{r.latestAttempt ? formatDateIst(r.latestAttempt.submittedAt) : "—"}{r.attemptsInCycle > 1 ? <div className="text-[11px] text-slate-400">Attempt {r.latestAttempt?.attemptNumber}</div> : null}</td>
                    <td className={td}>{r.qcDecision ? <Pill tone={decisionTone(r.qcDecision.decision)}>{qcStatusText(r.qcDecision)}</Pill> : "—"}</td>
                    <td className={td}><StatusPill status={r.status} /></td>
                    <td className={td}><button type="button" className={openBtn} onClick={() => setReview(r.id)}>Review</button></td>
                  </tr>
                ))}
              </Table>
            )}
          </ListState>
        </Panel>
      ) : null}

      {tab === "reopen" ? (
        <Panel title="Reopen requests" subtitle="Closed issues the IEC Member asked to reopen">
          <ListState list={reopens} empty="No reopening requests are waiting for you.">
            {(items) => (
              <Table head={["Issue Number", "Requested", "IEC Member", "Module", "Zone", "Ward", "Closed", "Reason", "Times reopened", "Action"]}>
                {items.map((r) => (
                  <tr key={r.requestId} className="hover:bg-slate-50/60">
                    <td className={`${td} font-bold text-slate-900`}>{r.issueNumber}<div className="text-[11px] font-normal text-slate-400">{assetText(r)}</div></td>
                    <td className={td}>{formatDateTimeIst(r.requestedAt)}</td>
                    <td className={td}>{r.iecMember.name ?? "—"}</td>
                    <td className={td}>{r.moduleLabel}</td>
                    <td className={td}>{r.zone.name ?? "—"}</td>
                    <td className={td}>{r.ward.name ?? "—"}</td>
                    <td className={td}>{r.closedAt ? formatDateIst(r.closedAt) : "—"}</td>
                    <td className={`${td} max-w-[260px]`}><span className="line-clamp-2">{r.reason}</span></td>
                    <td className={td}>{r.reopenCount}</td>
                    <td className={td}><button type="button" className={openBtn} onClick={() => setReopen(r.requestId)}>Review</button></td>
                  </tr>
                ))}
              </Table>
            )}
          </ListState>
        </Panel>
      ) : null}

      {tab === "history" ? (
        <Panel
          title="Review history"
          subtitle="Decisions recorded by ULB Officers in your area (read-only)"
          actions={
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Decision">
                <select className={selectCls} value={historyDecision} onChange={(e) => setHistoryDecision(e.target.value)}>
                  <option value="">All decisions</option>
                  {(options?.decisions ?? []).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </Field>
              <label className="flex h-9 items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> My decisions only
              </label>
            </div>
          }
        >
          <ListState list={history} empty="No review decisions match these filters.">
            {(items) => (
              <Table head={["Issue Number", "Reported Date", "IEC Member", "Module", "Zone", "Ward", "Assigned Daroga", "Inspection Date", "QC Status", "Decision", "Decided", "Current Status", "Action"]}>
                {items.map((r) => (
                  <tr key={r.reviewId} className="hover:bg-slate-50/60">
                    <td className={`${td} font-bold text-slate-900`}>{r.issueNumber}<div className="text-[11px] font-normal text-slate-400">{assetText(r)}</div></td>
                    <td className={td}>{formatDateIst(r.reportedAt) ?? "—"}</td>
                    <td className={td}>{r.iecMember.name ?? "—"}</td>
                    <td className={td}>{r.moduleLabel}</td>
                    <td className={td}>{r.zone.name ?? "—"}</td>
                    <td className={td}>{r.ward.name ?? "—"}</td>
                    <td className={td}>{r.assignedDaroga.name ?? "—"}</td>
                    <td className={td}>{r.inspectionDate ? formatDateIst(r.inspectionDate) : "—"}</td>
                    <td className={td}>{r.qcDecision ? <Pill tone={decisionTone(r.qcDecision.decision)}>{qcStatusText(r.qcDecision)}</Pill> : "—"}</td>
                    <td className={td}>
                      <Pill tone={decisionTone(r.decision)}>{ulbDecisionLabel(r.decision)}</Pill>
                      <div className="mt-0.5 text-[11px] text-slate-400">{r.reviewer.isYou ? "You" : r.reviewer.name ?? "—"}</div>
                    </td>
                    <td className={td}>{formatDateTimeIst(r.reviewedAt)}</td>
                    <td className={td}><StatusPill status={r.currentStatus} /></td>
                    <td className={td}><button type="button" className={ghostBtn} onClick={() => setHistoryId(r.issueId)}>View</button></td>
                  </tr>
                ))}
              </Table>
            )}
          </ListState>
        </Panel>
      ) : null}

      {review ? (
        <ReviewModal
          issueId={review}
          onClose={() => setReview(null)}
          onStale={afterChange}
          onDecided={(result) => {
            setNotice(describeReviewOutcome(result));
            afterChange();
          }}
        />
      ) : null}
      {reopen ? (
        <ReopenModal
          requestId={reopen}
          onClose={() => setReopen(null)}
          onStale={afterChange}
          onDecided={(result) => {
            setNotice(describeReopenOutcome(result));
            afterChange();
          }}
        />
      ) : null}
      {historyId ? <HistoryModal issueId={historyId} onClose={() => setHistoryId(null)} /> : null}
    </div>
  );
}
