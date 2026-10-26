'use client';

import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@lib/apiClient";
import { Modal } from "@components/ui/Modal";
import { formatDateTimeIst, statusLabel } from "@lib/cleanlinessIssuesLogic";
import {
  UlbCleanlinessApi,
  type HistoryDetail,
  type PendingDetail,
  type ReopenDetail,
  type ReopenResult,
  type ReviewResult
} from "@lib/ulbCleanlinessApi";
import {
  assetText,
  buildReopenBody,
  buildReviewBody,
  classifyDecisionError,
  decisionTone,
  REOPEN_ACTIONS,
  reopenStatusLabel,
  ULB_ACTIONS,
  ulbDecisionLabel,
  type DecisionAction
} from "@lib/ulbCleanlinessLogic";
import { LoadError, Pill, StatusPill } from "../ui";
import { DecisionDialog } from "./DecisionDialog";
import { AfterPhotos, Answers, Decisions, Facts, Gps, Photos, Section, Timeline } from "./Sections";

/** Throws an Error whose message is what the officer should read; `refresh` tells the caller to reload. */
export class DecisionFailure extends Error {
  refresh: boolean;
  constructor(message: string, refresh: boolean) {
    super(message);
    this.refresh = refresh;
  }
}
const toFailure = (e: unknown) => {
  const status = e instanceof ApiError ? e.status : undefined;
  const c = classifyDecisionError(status, e instanceof Error ? e.message : undefined);
  return new DecisionFailure(c.message, c.refresh);
};

function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(() => {
    setData(null);
    setError(null);
    load().then(setData, (e) => setError(e instanceof ApiError && e.status === 404 ? "This item is no longer available in your queue." : e instanceof Error ? e.message : "Could not load."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(run, [run]);
  return { data, error, reload: run };
}

const Loading = () => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
    <Loader2 size={16} className="animate-spin" /> Loading…
  </div>
);

const ActionButtons = <D extends string>({ actions, onPick }: { actions: Array<DecisionAction<D>>; onPick: (a: DecisionAction<D>) => void }) => (
  <div className="flex flex-wrap justify-end gap-2">
    {actions.map((a) => (
      <button
        key={a.decision}
        type="button"
        onClick={() => onPick(a)}
        className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${a.tone === "positive" ? "bg-emerald-600 hover:bg-emerald-700" : a.tone === "negative" ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}
      >
        {a.label}
      </button>
    ))}
  </div>
);

/* ------------------------------------------------------------ pending review */

export function ReviewModal({ issueId, onClose, onDecided, onStale }: { issueId: string; onClose: () => void; onDecided: (r: ReviewResult) => void; onStale: () => void }) {
  const { data: d, error, reload } = useLoad(() => UlbCleanlinessApi.pendingDetail(issueId));
  const [action, setAction] = useState<DecisionAction<"APPROVE" | "REJECT" | "ACTION_REQUIRED"> | null>(null);

  const submit = async (a: DecisionAction<"APPROVE" | "REJECT" | "ACTION_REQUIRED">, remarks: string) => {
    if (!d) return;
    try {
      const result = await UlbCleanlinessApi.review(d.id, buildReviewBody(d.review.inspectionId, a, remarks));
      onDecided(result);
    } catch (e) {
      const f = toFailure(e);
      if (f.refresh) onStale();
      throw f;
    }
  };

  return (
    <Modal open onClose={onClose} size="2xl" title={d ? `Review ${d.issueNumber}` : "Review"} subtitle={d ? `${d.moduleLabel} · ${d.zone.name} / ${d.ward.name}` : undefined} footer={d ? <ActionButtons actions={ULB_ACTIONS} onPick={setAction} /> : undefined}>
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
        {error ? <LoadError message={error} onRetry={reload} /> : !d ? <Loading /> : <PendingBody d={d} />}
      </div>
      {action && d ? <DecisionDialog action={action} subject={d.issueNumber} onSubmit={submit} onClose={() => setAction(null)} /> : null}
    </Modal>
  );
}

function PendingBody({ d }: { d: PendingDetail }) {
  const i = d.inspection;
  return (
    <>
      <Section title="Original IEC complaint">
        <Facts
          rows={[
            ["Issue number", d.issueNumber],
            ["Status", <StatusPill key="s" status={d.status} />],
            ["IEC Member", d.iecMember.name],
            ["Reported", formatDateTimeIst(d.reportedAt)],
            ["Module", d.moduleLabel],
            ["Asset / issue type", assetText(d)],
            ["Zone / Ward", `${d.zone.name ?? "—"} / ${d.ward.name ?? "—"}`],
            ["Reported location", <Gps key="g" {...d.location} />],
            ["Assigned Daroga", d.assignedDaroga.name],
            ["Cycle", d.currentCycleNumber]
          ]}
        />
        {d.remarks ? <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{d.remarks}</p> : null}
        <div className="mt-4"><Photos photos={d.beforePhotos} label="Before photo" /></div>
      </Section>

      <Section title={`Daroga inspection — attempt ${i.attemptNumber}`}>
        <Facts
          rows={[
            ["Daroga", i.daroga.name],
            ["Inspected", formatDateTimeIst(i.submittedAt)],
            ["Inspection GPS", <Gps key="g" latitude={i.location.latitude} longitude={i.location.longitude} accuracyMeters={i.location.accuracyMeters} />],
            ["Distance from reported spot", `${Math.round(i.distanceFromReportedMeters)} m`],
            ["Survey", i.surveyTitle]
          ]}
        />
        {i.remarks ? <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{i.remarks}</p> : null}
        <div className="mt-4"><Answers answers={i.answers} /></div>
        <div className="mt-4"><AfterPhotos photos={i.afterPhotos} answers={i.answers} /></div>
      </Section>

      <Section title="QC verification">
        {d.qcDecision ? <Decisions items={[d.qcDecision]} /> : <p className="text-sm italic text-slate-400">No QC decision recorded.</p>}
      </Section>

      {d.attempts.length > 1 || d.lastRejection ? (
        <Section title="Earlier attempts">
          <div className="space-y-4">
            {d.attempts
              .filter((a) => a.id !== i.id)
              .map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-2 text-sm font-bold">Attempt {a.attemptNumber} · {a.daroga.name ?? "—"} · {formatDateTimeIst(a.submittedAt)}</div>
                  {a.remarks ? <p className="mb-2 text-sm text-slate-600">{a.remarks}</p> : null}
                  <AfterPhotos photos={a.afterPhotos} answers={[]} />
                  <div className="mt-2"><Decisions items={a.reviews} /></div>
                </div>
              ))}
          </div>
        </Section>
      ) : null}

      {d.reopenRequests.length ? (
        <Section title="Earlier reopening requests">
          <ul className="space-y-2 text-sm">
            {d.reopenRequests.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-2.5">
                <Pill tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{reopenStatusLabel(r.status)}</Pill>
                <span className="ml-2 text-xs text-slate-500">{r.requestedBy.name ?? "—"} · {formatDateTimeIst(r.requestedAt)}</span>
                <p className="mt-1 whitespace-pre-wrap">{r.reason}</p>
                {r.decisionRemarks ? <p className="mt-1 text-xs text-slate-500">Decision: {r.decisionRemarks}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="History"><Timeline items={d.statusHistory} /></Section>
    </>
  );
}

/* ------------------------------------------------------------ reopen request */

export function ReopenModal({ requestId, onClose, onDecided, onStale }: { requestId: string; onClose: () => void; onDecided: (r: ReopenResult) => void; onStale: () => void }) {
  const { data: d, error, reload } = useLoad(() => UlbCleanlinessApi.reopenDetail(requestId));
  const [action, setAction] = useState<DecisionAction<"APPROVE" | "REJECT"> | null>(null);

  const submit = async (a: DecisionAction<"APPROVE" | "REJECT">, remarks: string) => {
    try {
      // The reopen endpoints are keyed by the request id, never the issue id.
      onDecided(await UlbCleanlinessApi.reopenDecide(requestId, buildReopenBody(a, remarks)));
    } catch (e) {
      const f = toFailure(e);
      if (f.refresh) onStale();
      throw f;
    }
  };

  return (
    <Modal open onClose={onClose} size="2xl" title={d ? `Reopen request ${d.issueNumber}` : "Reopen request"} subtitle={d ? `${d.moduleLabel} · ${d.zone.name} / ${d.ward.name}` : undefined} footer={d ? <ActionButtons actions={REOPEN_ACTIONS} onPick={setAction} /> : undefined}>
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
        {error ? <LoadError message={error} onRetry={reload} /> : !d ? <Loading /> : <ReopenBody d={d} />}
      </div>
      {action && d ? <DecisionDialog action={action} subject={d.issueNumber} onSubmit={submit} onClose={() => setAction(null)} /> : null}
    </Modal>
  );
}

function ReopenBody({ d }: { d: ReopenDetail }) {
  return (
    <>
      <Section title="Reopening request">
        <Facts rows={[["Requested by", d.request.requestedBy.name], ["Requested", formatDateTimeIst(d.request.requestedAt)], ["IEC Member", d.iecMember.name], ["Asset / issue type", assetText(d)]]} />
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{d.request.reason}</p>
        <div className="mt-4"><Photos photos={d.request.photos} label="Reopen photo" /></div>
      </Section>
      <Section title="Closure">
        <Facts
          rows={[
            ["Closed", d.closure.closedAt ? formatDateTimeIst(d.closure.closedAt) : "—"],
            ["Cycle", d.closure.cycleNumber],
            ["Approved by", d.closure.approvedBy?.name],
            ["Attempts", d.closure.attempts],
            ["Reported location", <Gps key="g" {...d.location} />]
          ]}
        />
        {d.closure.approvedBy?.remarks ? <p className="mt-2 text-sm text-slate-600">{d.closure.approvedBy.remarks}</p> : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-1">
          <Photos photos={d.beforePhotos} label="Before photo" />
          <AfterPhotos photos={d.latestAfterPhotos} answers={[]} />
        </div>
      </Section>
      {d.previousRequests.length ? (
        <Section title="Earlier reopening requests">
          <ul className="space-y-2 text-sm">
            {d.previousRequests.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-2.5">
                <Pill tone={r.status === "APPROVED" ? "success" : "danger"}>{reopenStatusLabel(r.status)}</Pill>
                <span className="ml-2 text-xs text-slate-500">{formatDateTimeIst(r.requestedAt)}</span>
                <p className="mt-1 whitespace-pre-wrap">{r.reason}</p>
                {r.decisionRemarks ? <p className="mt-1 text-xs text-slate-500">Decision by {r.reviewer.name ?? "—"}: {r.decisionRemarks}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Section title="History"><Timeline items={d.statusHistory} /></Section>
    </>
  );
}

/* ------------------------------------------------------------ history (read-only) */

export function HistoryModal({ issueId, onClose }: { issueId: string; onClose: () => void }) {
  const { data: d, error, reload } = useLoad(() => UlbCleanlinessApi.historyDetail(issueId));
  return (
    <Modal open onClose={onClose} size="2xl" title={d ? `${d.issueNumber} — review history` : "Review history"} subtitle={d ? `${d.moduleLabel} · ${d.zone.name} / ${d.ward.name}` : undefined}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {error ? <LoadError message={error} onRetry={reload} /> : !d ? <Loading /> : <HistoryBody d={d} />}
      </div>
    </Modal>
  );
}

function HistoryBody({ d }: { d: HistoryDetail }) {
  return (
    <>
      <Section title="Issue">
        <Facts
          rows={[
            ["Status", <StatusPill key="s" status={d.status} />],
            ["IEC Member", d.iecMember.name],
            ["Reported", formatDateTimeIst(d.reportedAt)],
            ["Asset / issue type", assetText(d)],
            ["Assigned Daroga", d.assignedDaroga.name],
            ["Reported location", <Gps key="g" latitude={d.location.latitude} longitude={d.location.longitude} accuracyMeters={d.location.accuracyMeters} />],
            ["Latest ULB decision", d.latestUlbDecision ? `${ulbDecisionLabel(d.latestUlbDecision.decision)} by ${d.latestUlbDecision.reviewer.isYou ? "you" : d.latestUlbDecision.reviewer.name ?? "—"}` : "—"],
            ["Closed", d.closedAt ? formatDateTimeIst(d.closedAt) : "—"]
          ]}
        />
        {d.remarks ? <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{d.remarks}</p> : null}
        <div className="mt-4"><Photos photos={d.beforePhotos} label="Before photo" /></div>
      </Section>

      {d.attempts.map((a) => (
        <Section key={a.id} title={`Cycle ${a.cycleNumber ?? "—"} · attempt ${a.attemptNumber} · ${statusLabel(a.outcome)}`}>
          <Facts
            rows={[
              ["Daroga", a.daroga.name],
              ["Inspected", formatDateTimeIst(a.submittedAt)],
              ["Inspection GPS", <Gps key="g" latitude={a.location.latitude} longitude={a.location.longitude} accuracyMeters={a.location.accuracyMeters} />],
              ["Distance from reported spot", `${Math.round(a.distanceFromReportedMeters)} m`]
            ]}
          />
          {a.remarks ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.remarks}</p> : null}
          <div className="mt-3"><Answers answers={a.answers} /></div>
          <div className="mt-3"><AfterPhotos photos={a.afterPhotos} answers={a.answers} /></div>
          <div className="mt-3 space-y-2">
            {a.reviews.map((r) => (
              <div key={r.reviewId} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm">
                <Pill tone={decisionTone(r.decision)}>{ulbDecisionLabel(r.decision)}</Pill>
                <span className="ml-2 text-xs text-slate-500">{r.reviewer.isYou ? "You" : r.reviewer.name ?? "—"} · {formatDateTimeIst(r.reviewedAt)}</span>
                {r.remarks ? <p className="mt-1 whitespace-pre-wrap">{r.remarks}</p> : null}
              </div>
            ))}
          </div>
        </Section>
      ))}

      {d.reopenRequests.length ? (
        <Section title="Reopening requests">
          <ul className="space-y-3 text-sm">
            {d.reopenRequests.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-2.5">
                <Pill tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{reopenStatusLabel(r.status)}</Pill>
                <span className="ml-2 text-xs text-slate-500">{r.requestedBy.name ?? "—"} · {formatDateTimeIst(r.requestedAt)}</span>
                <p className="mt-1 whitespace-pre-wrap">{r.reason}</p>
                {r.decisionRemarks ? <p className="mt-1 text-xs text-slate-500">Decision by {r.reviewer?.isYou ? "you" : r.reviewer?.name ?? "—"}: {r.decisionRemarks}</p> : null}
                {r.photos.length ? <div className="mt-2"><Photos photos={r.photos} label="Reopen photo" /></div> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="History"><Timeline items={d.statusHistory} /></Section>
    </>
  );
}
