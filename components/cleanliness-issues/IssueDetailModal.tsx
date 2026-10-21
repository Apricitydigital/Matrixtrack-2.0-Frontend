'use client';

import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, UserCog } from "lucide-react";
import { Modal } from "@components/ui/Modal";
import { CleanlinessIssuesAdminApi, type IssueDetail } from "@lib/cleanlinessIssuesApi";
import {
  assignmentReasonLabel,
  decisionLabel,
  describeRemaining,
  eventLabel,
  formatDateTimeIst,
  mapsUrl,
  overdueLabel,
  statusLabel
} from "@lib/cleanlinessIssuesLogic";
import { PhotoGrid } from "./PhotoViewer";
import { LoadError, Pill, StatusPill } from "./ui";

const ASSIGNABLE = ["REPORTED", "UNASSIGNED", "REOPENED", "ASSIGNED", "REINSPECTION_REQUIRED"];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 py-1.5 text-sm">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-blue-700">{title}</h4>
      {children}
    </section>
  );
}

/** The complete lifecycle of one parent issue: every cycle, attempt, photo, decision, reassignment and closure. */
export function IssueDetailModal({ issueId, onClose, onAssign }: { issueId: string | null; onClose: () => void; onAssign?: (issue: IssueDetail) => void }) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    setError(null);
    try {
      setIssue(await CleanlinessIssuesAdminApi.issue(issueId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this issue.");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    setIssue(null);
    if (issueId) load();
  }, [issueId, load]);

  const remaining = issue ? describeRemaining(new Date(issue.inspectionDueAt).getTime() - Date.now()) : null;
  const overdue = issue ? overdueLabel(issue.overdue) : null;

  return (
    <Modal open={!!issueId} onClose={onClose} title={issue?.issueNumber ?? "Issue details"} subtitle={issue ? `${issue.moduleLabel} · ${issue.zone.name ?? ""} · ${issue.ward.name ?? ""}` : undefined} size="2xl">
      <div className="max-h-[75vh] overflow-y-auto p-5">
        {loading && !issue ? <p className="py-10 text-center text-sm text-slate-400">Loading issue…</p> : null}
        {error ? <LoadError message={error} onRetry={load} /> : null}
        {issue ? (
          <>
            <Section title="Issue">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusPill status={issue.status} />
                {overdue ? <Pill tone={overdue.tone}>{overdue.text}</Pill> : null}
                {issue.needsDaroga ? <Pill tone="danger">No Daroga assigned</Pill> : null}
                {issue.currentCycleNumber > 1 ? <Pill tone="primary">Cycle {issue.currentCycleNumber}</Pill> : null}
              </div>
              <dl>
                <Row label="Module" value={issue.moduleLabel} />
                <Row label={issue.module === "OTHER" ? "Issue type" : "Asset"} value={issue.module === "OTHER" ? issue.otherIssueType : issue.asset?.label ?? (issue.assetNotListed ? "Asset not listed" : null)} />
                <Row label="IEC Member" value={issue.iecMember.name} />
                <Row label="Reported" value={formatDateTimeIst(issue.reportedAt)} />
                <Row label="Assigned Daroga" value={issue.assignedDaroga?.name ?? "Unassigned"} />
                <Row label="Current inspection deadline" value={`${formatDateTimeIst(issue.inspectionDueAt)}${remaining && issue.status !== "CLOSED" ? ` (${remaining.text})` : ""}`} />
                <Row label="Last updated" value={formatDateTimeIst(issue.updatedAt)} />
              </dl>
              {onAssign && ASSIGNABLE.includes(issue.status) ? (
                <button type="button" onClick={() => onAssign(issue)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                  <UserCog size={16} /> {issue.assignedDaroga ? "Reassign Daroga" : "Assign Daroga"}
                </button>
              ) : null}
            </Section>

            <Section title="IEC original complaint">
              <p className="mb-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{issue.remarks}</p>
              <dl className="mb-3">
                <Row label="Original latitude" value={issue.location.latitude.toFixed(6)} />
                <Row label="Original longitude" value={issue.location.longitude.toFixed(6)} />
                <Row label="Location GPS accuracy" value={issue.location.accuracyMeters === null ? "Not available" : `±${issue.location.accuracyMeters} m`} />
                <Row label="Location captured" value={formatDateTimeIst(issue.location.capturedAt)} />
              </dl>
              <a href={mapsUrl(issue.location.latitude, issue.location.longitude)} target="_blank" rel="noopener noreferrer" className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                <ExternalLink size={14} /> Open in Maps
              </a>
              <PhotoGrid photos={issue.beforePhotos} label="Before photo" />
            </Section>

            <Section title="Cycles and deadlines">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-1 pr-3">Cycle</th><th className="pr-3">Reason</th><th className="pr-3">Started</th><th className="pr-3">Deadline</th><th className="pr-3">First inspection</th><th>Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issue.cycles.map((c) => (
                      <tr key={c.cycleNumber} className="border-t border-slate-50">
                        <td className="py-1.5 pr-3 font-bold">{c.cycleNumber}</td>
                        <td className="pr-3">{c.reason === "REOPEN" ? "Reopened" : "Initial"}</td>
                        <td className="pr-3">{formatDateTimeIst(c.startedAt)}</td>
                        <td className="pr-3">{formatDateTimeIst(c.inspectionDueAt)}</td>
                        <td className="pr-3">{c.firstInspectionSubmittedAt ? formatDateTimeIst(c.firstInspectionSubmittedAt) : "—"}</td>
                        <td>{c.closedAt ? formatDateTimeIst(c.closedAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Inspection attempts">
              {issue.inspections.length === 0 ? <p className="text-sm italic text-slate-400">No inspection has been submitted yet.</p> : null}
              {issue.inspections.map((n) => (
                <div key={n.id} className="mb-4 rounded-xl border border-slate-100 p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold">
                    Cycle {n.cycleNumber ?? "?"} · Attempt {n.attemptNumber}
                    <Pill tone={n.outcome === "ULB_APPROVED" ? "success" : n.outcome.includes("REJECT") || n.outcome.includes("ACTION") ? "danger" : "warning"}>{statusLabel(n.outcome)}</Pill>
                  </div>
                  <dl className="mb-2">
                    <Row label="Daroga" value={n.daroga.name} />
                    <Row label="Submitted" value={formatDateTimeIst(n.submittedAt)} />
                    <Row label="Inspection location" value={`${n.location.latitude.toFixed(6)}, ${n.location.longitude.toFixed(6)} (${n.location.accuracyMeters === null ? "accuracy not available" : `±${n.location.accuracyMeters} m`})`} />
                    <Row label="Distance from reported spot" value={`${n.distanceFromReportedMeters.toFixed(1)} m`} />
                    <Row label="Daroga remarks" value={n.remarks} />
                  </dl>
                  <PhotoGrid photos={n.afterPhotos} label="After photo" />
                  {n.reviews.map((r) => (
                    <div key={r.id} className={`mt-2 rounded-lg p-2 text-sm ${r.decision.includes("REJECT") || r.decision.includes("ACTION") ? "bg-red-50" : "bg-emerald-50"}`}>
                      <div className="font-bold">{decisionLabel(r.decision)} · {r.reviewer.name ?? "Reviewer"} · {formatDateTimeIst(r.reviewedAt)}</div>
                      {r.remarks ? <div className="mt-0.5 text-slate-700">{r.remarks}</div> : null}
                    </div>
                  ))}
                </div>
              ))}
            </Section>

            <Section title="Reopening">
              {issue.reopenRequests.length === 0 ? <p className="text-sm italic text-slate-400">This issue was never reopened.</p> : null}
              {issue.reopenRequests.map((r) => (
                <div key={r.id} className="mb-4 rounded-xl border border-slate-100 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                    Requested {formatDateTimeIst(r.requestedAt)}
                    <Pill tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{statusLabel(r.status)}</Pill>
                  </div>
                  <dl className="mb-2">
                    <Row label="Closed cycle" value={r.cycleNumber} />
                    <Row label="Requested by" value={r.requestedBy.name} />
                    <Row label="Reason" value={r.reason} />
                    <Row label="Decided by" value={r.reviewer?.name} />
                    <Row label="Decided" value={r.decidedAt ? formatDateTimeIst(r.decidedAt) : null} />
                    <Row label="Decision remarks" value={r.decisionRemarks} />
                    <Row label="New cycle" value={r.newCycleNumber} />
                  </dl>
                  <PhotoGrid photos={r.photos} label="Reopening photo" />
                </div>
              ))}
            </Section>

            <Section title="Assignment and reassignment history">
              {issue.assignments.length === 0 ? <p className="text-sm italic text-slate-400">No Daroga has been assigned yet.</p> : null}
              <ol className="space-y-2">
                {issue.assignments.map((a) => (
                  <li key={a.id} className="rounded-lg bg-slate-50 p-2.5 text-sm">
                    <div className="font-bold">{a.assignedTo.name ?? "Daroga"}{!a.endedAt ? <span className="ml-2 text-xs font-semibold text-emerald-700">(current)</span> : null}</div>
                    <div className="text-xs text-slate-500">
                      {assignmentReasonLabel(a.reason)} · cycle {a.cycleNumber ?? "?"} · {formatDateTimeIst(a.assignedAt)}
                      {a.assignedBy ? ` · by ${a.assignedBy.name ?? "City Admin"}` : ""}
                      {a.previousAssignee ? ` · from ${a.previousAssignee.name ?? "previous Daroga"}` : ""}
                      {a.endedAt ? ` · ended ${formatDateTimeIst(a.endedAt)} (${a.endReason ?? "—"})` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            {issue.closure ? (
              <Section title="Final closure">
                <dl>
                  <Row label="Closed" value={formatDateTimeIst(issue.closure.closedAt)} />
                  <Row label="Closed in cycle" value={issue.closure.cycleNumber} />
                  <Row label="Final approval by" value={issue.closure.approvedBy?.name} />
                  <Row label="Approval remarks" value={issue.closure.remarks} />
                </dl>
              </Section>
            ) : null}

            <Section title="Complete history">
              <ol className="space-y-1.5">
                {issue.statusHistory.map((h, i) => (
                  <li key={`${h.event}-${h.at}-${i}`} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <div className="font-semibold text-slate-800">{eventLabel(h.event)}</div>
                      <div className="text-xs text-slate-400">
                        {formatDateTimeIst(h.at)} · {h.actor.name ?? (h.actor.role === "SYSTEM" || !h.actor.id ? "System" : h.actor.role)}
                        {h.actor.role && h.actor.id ? ` (${h.actor.role.replace(/_/g, " ").toLowerCase()})` : ""}
                      </div>
                      {h.reason ? <div className="mt-0.5 text-xs text-slate-600">{h.reason}</div> : null}
                      {typeof h.metadata?.remarks === "string" ? <div className="mt-0.5 text-xs italic text-slate-600">Admin note: {h.metadata.remarks}</div> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
