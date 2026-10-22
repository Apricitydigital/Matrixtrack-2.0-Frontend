/**
 * Pure logic of the ULB Officer web screens (IEC-originated Cleanliness Issues): the three decisions and their
 * wording (identical in meaning to the mobile app), remarks validation, the exact request bodies, outcome text
 * and error classification. No React / browser imports so it is unit-tested with plain `node --test`.
 *
 * The server stays the authority for every rule and every status change. Nothing here marks anything decided:
 * the screens only show an outcome after the server has confirmed it.
 */
import type { ReopenBody, ReopenDecision, ReopenResult, ReviewBody, ReviewResult, UlbDecision } from "./ulbCleanlinessApi";

export type ActionTone = "positive" | "negative" | "warning";

export type DecisionAction<D extends string> = {
  decision: D;
  label: string;
  tone: ActionTone;
  requiresRemarks: boolean;
  remarksLabel: string;
  remarksHint: string;
  /** Message when remarks are required but blank. */
  remarksError: string;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel: string;
};

/** Approve / Reject / Action Required. Wording matches the mobile app. */
export const ULB_ACTIONS: Array<DecisionAction<UlbDecision>> = [
  {
    decision: "APPROVE",
    label: "Approve",
    tone: "positive",
    requiresRemarks: false,
    remarksLabel: "Remarks (optional)",
    remarksHint: "Add a note for the record",
    remarksError: "",
    confirmTitle: "Approve and close this issue?",
    confirmMessage: "The issue will be closed. The IEC Member will see it as Closed. This cannot be undone.",
    confirmLabel: "Approve & Close"
  },
  {
    decision: "REJECT",
    label: "Reject",
    tone: "negative",
    requiresRemarks: true,
    remarksLabel: "Reason for rejecting (required)",
    remarksHint: "Explain what is wrong with this inspection",
    remarksError: "Enter the reason for rejecting.",
    confirmTitle: "Reject this inspection?",
    confirmMessage: "It goes back to the Daroga, who must inspect again; it will pass QC again before reaching you. Your remarks are shown to the Daroga. This cannot be undone.",
    confirmLabel: "Reject"
  },
  {
    decision: "ACTION_REQUIRED",
    label: "Action Required",
    tone: "warning",
    requiresRemarks: true,
    remarksLabel: "Action required (required)",
    remarksHint: "Describe exactly what the Daroga must do",
    remarksError: "Describe the action that is required.",
    confirmTitle: "Require corrective action?",
    confirmMessage:
      "The SAME issue goes straight back to the Daroga for corrective action and a new inspection with a new After photo. It then passes QC and your review again. It is not sent to an Action Officer. Your remarks are shown to the Daroga. This cannot be undone.",
    confirmLabel: "Require Action"
  }
];

export const REOPEN_ACTIONS: Array<DecisionAction<ReopenDecision>> = [
  {
    decision: "APPROVE",
    label: "Approve reopening",
    tone: "positive",
    requiresRemarks: false,
    remarksLabel: "Remarks (optional)",
    remarksHint: "Add a note for the record",
    remarksError: "",
    confirmTitle: "Approve reopening?",
    confirmMessage: "The same issue starts a new cycle with a fresh 24-hour deadline from now and is given to an available Daroga. Earlier history is kept. This cannot be undone.",
    confirmLabel: "Approve & Reopen"
  },
  {
    decision: "REJECT",
    label: "Reject reopening",
    tone: "negative",
    requiresRemarks: true,
    remarksLabel: "Reason for rejecting (required)",
    remarksHint: "The IEC Member will see this reason",
    remarksError: "Enter the reason for rejecting this request.",
    confirmTitle: "Reject reopening?",
    confirmMessage: "The issue stays closed and no Daroga is assigned. Your remarks are shown to the IEC Member, who may send a new request. This cannot be undone.",
    confirmLabel: "Reject"
  }
];

export const findUlbAction = (d: UlbDecision) => ULB_ACTIONS.find((a) => a.decision === d);
export const findReopenAction = (d: ReopenDecision) => REOPEN_ACTIONS.find((a) => a.decision === d);

/** Returns an error message, or null when the decision may be sent. Whitespace-only counts as empty. */
export function validateRemarks(action: Pick<DecisionAction<string>, "requiresRemarks" | "remarksError">, remarks: string): string | null {
  return action.requiresRemarks && !remarks.trim() ? action.remarksError : null;
}

/** The ONLY fields the web sends. Optional remarks are omitted when empty. */
export function buildReviewBody(inspectionId: string, action: Pick<DecisionAction<UlbDecision>, "decision">, remarks: string): ReviewBody {
  const text = remarks.trim();
  return { inspectionId, decision: action.decision, ...(text ? { remarks: text } : {}) };
}
export function buildReopenBody(action: Pick<DecisionAction<ReopenDecision>, "decision">, remarks: string): ReopenBody {
  const text = remarks.trim();
  return { decision: action.decision, ...(text ? { remarks: text } : {}) };
}

export type Outcome = { title: string; detail: string; tone: ActionTone };

/** What to tell the officer AFTER the server confirmed the decision. */
export function describeReviewOutcome(result: ReviewResult): Outcome {
  const repeat = result.created ? "" : " (this decision was already recorded)";
  switch (result.decision) {
    case "ULB_APPROVE":
      return { title: `Approved${repeat}`, detail: `${result.issue.issueNumber} is now Closed.`, tone: "positive" };
    case "ULB_REJECT":
    case "ULB_ACTION_REQUIRED": {
      const who = result.returnedTo?.name ? `Returned to ${result.returnedTo.name} for reinspection.` : "Returned for reinspection. It will be given to an available Daroga.";
      const action = result.decision === "ULB_ACTION_REQUIRED";
      return {
        title: `${action ? "Corrective action required" : "Rejected"}${repeat}`,
        detail: `${result.issue.issueNumber}: ${who} The same issue returns to QC and then to you after the new inspection.`,
        tone: action ? "warning" : "negative"
      };
    }
    default:
      return { title: `Decision recorded${repeat}`, detail: `Status: ${result.issue.status}`, tone: "positive" };
  }
}

export function describeReopenOutcome(result: ReopenResult): Outcome {
  const repeat = result.created ? "" : " (this decision was already recorded)";
  if (result.decision === "REJECT") {
    return { title: `Reopening rejected${repeat}`, detail: `${result.issue.issueNumber} stays Closed. The IEC Member can see your remarks.`, tone: "negative" };
  }
  const who = result.assignedTo?.name ? `Assigned to ${result.assignedTo.name}.` : "No eligible Daroga is available right now; it waits as unassigned and is given to the next available Daroga.";
  return { title: `Reopening approved${repeat}`, detail: `${result.issue.issueNumber} started cycle ${result.issue.currentCycleNumber} with a fresh 24-hour deadline. ${who}`, tone: "positive" };
}

export type DecisionErrorKind = "session" | "forbidden" | "stale" | "conflict" | "validation" | "network" | "unknown";
export type DecisionError = { kind: DecisionErrorKind; message: string; /** reload lists / detail after the user acknowledges */ refresh: boolean };

/** Maps the server's answer to what the officer should see. Never treats a failure as a success. */
export function classifyDecisionError(status: number | undefined, serverMessage?: string): DecisionError {
  const detail = serverMessage?.trim();
  switch (status) {
    case 401:
      return { kind: "session", message: "Your session has expired. Please sign in again; nothing was saved.", refresh: false };
    case 403:
      return { kind: "forbidden", message: detail || "You are not authorised to make this decision.", refresh: false };
    case 404:
      return { kind: "stale", message: "This item is no longer waiting for your decision (it may already have been decided, or it is outside your area).", refresh: true };
    case 409:
      return { kind: "conflict", message: `${detail || "This has already been decided or has changed."} Nothing new was saved; the list will be refreshed.`, refresh: true };
    case 400:
    case 422:
      return { kind: "validation", message: detail || "The decision was not accepted. Please check the remarks and try again.", refresh: false };
    case 0:
    case 408:
    case 503:
    case undefined:
      return { kind: "network", message: "The server could not be reached. Your decision was not recorded as far as you can tell. Check your connection, refresh, and try again; a repeated tap is never recorded twice.", refresh: false };
    default:
      return { kind: "unknown", message: detail || "Something went wrong. Please refresh and try again.", refresh: status >= 500 ? false : true };
  }
}

/* ------------------------------------------------------------------ display */

export const ULB_DECISION_LABEL: Record<string, string> = {
  ULB_APPROVE: "Approved",
  ULB_REJECT: "Rejected",
  ULB_ACTION_REQUIRED: "Action required",
  QC_ACCEPT: "Accepted by QC",
  QC_REJECT: "Rejected by QC"
};
export const ulbDecisionLabel = (d: string) => ULB_DECISION_LABEL[d] ?? d;

export const decisionTone = (d: string): "success" | "danger" | "warning" | "neutral" =>
  d === "ULB_APPROVE" || d === "QC_ACCEPT" ? "success" : d === "ULB_REJECT" || d === "QC_REJECT" ? "danger" : d === "ULB_ACTION_REQUIRED" ? "warning" : "neutral";

export const qcStatusText = (qc: { decision: string } | null | undefined) => (qc ? ulbDecisionLabel(qc.decision) : "—");

/** Asset / issue-type text of a row. */
export function assetText(row: { module: string; asset: { label: string | null } | null; assetNotListed: boolean; otherIssueType: string | null }): string {
  if (row.module === "OTHER") return row.otherIssueType ?? "—";
  return row.asset?.label ?? (row.assetNotListed ? "Asset not listed" : "—");
}

/** Heading of an After photo: the checklist question it belongs to, else "After photo n". */
export function afterPhotoCaption(photo: { questionCode: string | null }, answers: Array<{ code: string; question: string }>, index: number, total: number): string {
  const question = photo.questionCode ? answers.find((a) => a.code === photo.questionCode)?.question : undefined;
  return question ?? `After photo${total > 1 ? ` ${index + 1}` : ""}`;
}

/** Checklist rows to show as text (photo-only questions are shown through their photos). */
export const answerRows = <T extends { type: string }>(answers: T[]): T[] => answers.filter((a) => a.type !== "photo");

export function answerText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value);
}

export const PAGE_SIZE = 20;

export const REOPEN_STATUS_LABEL: Record<string, string> = { PENDING: "Waiting for decision", APPROVED: "Approved", REJECTED: "Rejected" };
export const reopenStatusLabel = (s: string) => REOPEN_STATUS_LABEL[s] ?? s;
