/**
 * ULB Officer web - Cleanliness Issue approvals: pure logic, API client contract and source-level guards.
 * Run: node --test tests/ulbCleanliness.test.cjs
 *
 * Covers: the three decisions and their remarks rules, the exact URLs / bodies sent (reopen endpoints keyed by
 * REQUEST id), outcome wording, 401/403/404/409 mapping, and static checks that the page is role-guarded, the
 * sidebar link lives only inside the ULB block, evidence uses the shared PhotoViewer, the dialog has a
 * double-submit guard, and nothing refers to Action Officer tasks.
 * Does NOT cover (needs a real browser): rendering, layout, gestures, real network. Reported as untested.
 */
require("./helpers/registerTs.cjs");
const Module = require("module");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const calls = [];
const originalLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (request === "./apiClient") {
    return { apiFetch: async (p, init = {}) => (calls.push({ path: p, method: init.method || "GET", body: init.body }), { issue: { id: "x" }, request: { id: "y" } }) };
  }
  return originalLoad.call(this, request, parent, ...rest);
};

const L = require("../lib/ulbCleanlinessLogic.ts");
const { UlbCleanlinessApi } = require("../lib/ulbCleanlinessApi.ts");

const action = (d) => L.ULB_ACTIONS.find((a) => a.decision === d);
const lastCall = () => calls[calls.length - 1];

/* ------------------------------------------------------------ decisions */

test("three ULB decisions exist; Reject and Action Required need remarks, Approve does not", () => {
  assert.deepEqual(L.ULB_ACTIONS.map((a) => a.decision), ["APPROVE", "REJECT", "ACTION_REQUIRED"]);
  assert.equal(action("APPROVE").requiresRemarks, false);
  assert.equal(action("REJECT").requiresRemarks, true);
  assert.equal(action("ACTION_REQUIRED").requiresRemarks, true);
});

test("remarks validation: blank and whitespace-only are refused when required", () => {
  for (const d of ["REJECT", "ACTION_REQUIRED"]) {
    assert.ok(L.validateRemarks(action(d), ""));
    assert.ok(L.validateRemarks(action(d), "   \n "));
    assert.equal(L.validateRemarks(action(d), "Wrong spot"), null);
  }
  assert.equal(L.validateRemarks(action("APPROVE"), ""), null);
});

test("every decision asks for confirmation and says it cannot be undone", () => {
  for (const a of [...L.ULB_ACTIONS, ...L.REOPEN_ACTIONS]) {
    assert.ok(a.confirmTitle && a.confirmLabel);
    assert.match(a.confirmMessage, /cannot be undone/);
  }
});

test("Action Required wording: same issue back to the Daroga, not an Action Officer", () => {
  const m = action("ACTION_REQUIRED").confirmMessage;
  assert.match(m, /SAME issue/);
  assert.match(m, /Daroga/);
  assert.match(m, /not sent to an Action Officer/);
});

test("request bodies carry only inspectionId, decision and trimmed remarks", () => {
  assert.deepEqual(L.buildReviewBody("insp-1", action("APPROVE"), "  "), { inspectionId: "insp-1", decision: "APPROVE" });
  assert.deepEqual(L.buildReviewBody("insp-1", action("REJECT"), "  bad photo "), { inspectionId: "insp-1", decision: "REJECT", remarks: "bad photo" });
  assert.deepEqual(L.buildReopenBody(L.REOPEN_ACTIONS[1], " no proof "), { decision: "REJECT", remarks: "no proof" });
  assert.deepEqual(L.buildReopenBody(L.REOPEN_ACTIONS[0], ""), { decision: "APPROVE" });
});

/* ------------------------------------------------------------ outcomes */

const issue = (extra = {}) => ({ id: "i", issueNumber: "CI-UJN-1", status: "CLOSED", closedAt: null, assignedDarogaId: null, currentCycleNumber: 2, ...extra });
test("outcome text follows the server's answer", () => {
  assert.match(L.describeReviewOutcome({ created: true, decision: "ULB_APPROVE", issue: issue(), returnedTo: null }).detail, /Closed/);
  const ar = L.describeReviewOutcome({ created: true, decision: "ULB_ACTION_REQUIRED", issue: issue({ status: "REINSPECTION_REQUIRED" }), returnedTo: { id: "d", name: "Ravi" } });
  assert.equal(ar.title, "Corrective action required");
  assert.match(ar.detail, /Returned to Ravi/);
  assert.equal(L.describeReviewOutcome({ created: true, decision: "ULB_REJECT", issue: issue(), returnedTo: null }).title, "Rejected");
  assert.match(L.describeReviewOutcome({ created: false, decision: "ULB_APPROVE", issue: issue(), returnedTo: null }).title, /already recorded/);
  assert.match(L.describeReopenOutcome({ created: true, decision: "APPROVE", request: {}, issue: issue({ currentCycleNumber: 3 }), assignedTo: null }).detail, /cycle 3/);
  assert.match(L.describeReopenOutcome({ created: true, decision: "REJECT", request: {}, issue: issue(), assignedTo: null }).detail, /stays Closed/);
});

/* ------------------------------------------------------------ errors */

test("401 / 403 / 404 / 409 / network are mapped; only stale and conflict refresh", () => {
  assert.equal(L.classifyDecisionError(401).kind, "session");
  assert.equal(L.classifyDecisionError(403, "Not allowed").message, "Not allowed");
  const stale = L.classifyDecisionError(404);
  assert.deepEqual([stale.kind, stale.refresh], ["stale", true]);
  const conflict = L.classifyDecisionError(409, "Already decided differently.");
  assert.deepEqual([conflict.kind, conflict.refresh], ["conflict", true]);
  assert.match(conflict.message, /Already decided differently/);
  assert.equal(L.classifyDecisionError(400, "Remarks are required").kind, "validation");
  assert.equal(L.classifyDecisionError(503).kind, "network");
  assert.equal(L.classifyDecisionError(undefined).kind, "network");
  assert.equal(L.classifyDecisionError(500).refresh, false);
});

/* ------------------------------------------------------------ API contract */

test("review posts to /:issueId/ulb/review with inspectionId", async () => {
  await UlbCleanlinessApi.review("issue-1", L.buildReviewBody("insp-9", action("ACTION_REQUIRED"), "Clean the drain"));
  assert.equal(lastCall().path, "/cleanliness-issues/issue-1/ulb/review");
  assert.equal(lastCall().method, "POST");
  assert.deepEqual(JSON.parse(lastCall().body), { inspectionId: "insp-9", decision: "ACTION_REQUIRED", remarks: "Clean the drain" });
});

test("reopen detail and decision are keyed by the REQUEST id", async () => {
  await UlbCleanlinessApi.reopenDetail("req-5");
  assert.equal(lastCall().path, "/cleanliness-issues/ulb/reopen/req-5");
  await UlbCleanlinessApi.reopenDecide("req-5", L.buildReopenBody(L.REOPEN_ACTIONS[1], "No proof"));
  assert.equal(lastCall().path, "/cleanliness-issues/ulb/reopen/req-5/decision");
  assert.deepEqual(JSON.parse(lastCall().body), { decision: "REJECT", remarks: "No proof" });
});

test("list endpoints use the documented paths and pass filters", async () => {
  const f = { from: "2026-10-01", to: "2026-10-22", zoneId: "z1", wardId: "w1", module: "GVP", search: "CI-1" };
  await UlbCleanlinessApi.pending(f, 2, 20);
  assert.match(lastCall().path, /^\/cleanliness-issues\/ulb\/pending\?/);
  for (const part of ["from=2026-10-01", "to=2026-10-22", "zoneId=z1", "wardId=w1", "module=GVP", "search=CI-1", "page=2", "pageSize=20"]) assert.ok(lastCall().path.includes(part), part);
  await UlbCleanlinessApi.pendingDetail("a/b");
  assert.equal(lastCall().path, "/cleanliness-issues/ulb/a%2Fb");
  await UlbCleanlinessApi.reopenPending({}, 1, 20);
  assert.match(lastCall().path, /^\/cleanliness-issues\/ulb\/reopen\/pending\?/);
  await UlbCleanlinessApi.history({}, { decision: "ULB_REJECT", mine: true }, 1, 20);
  assert.ok(lastCall().path.includes("/ulb/history?") && lastCall().path.includes("decision=ULB_REJECT") && lastCall().path.includes("mine=true"));
  await UlbCleanlinessApi.historyDetail("i1");
  assert.equal(lastCall().path, "/cleanliness-issues/ulb/history/i1");
  await UlbCleanlinessApi.summary({ from: "2026-10-01" });
  assert.match(lastCall().path, /^\/cleanliness-issues\/ulb\/summary\?from=2026-10-01$/);
  await UlbCleanlinessApi.filters();
  assert.equal(lastCall().path, "/cleanliness-issues/ulb/filters");
});

test("a request never carries city, role, reviewer or status", async () => {
  await UlbCleanlinessApi.review("i", L.buildReviewBody("x", action("APPROVE"), ""));
  const body = JSON.parse(lastCall().body);
  for (const k of ["cityId", "role", "reviewerId", "userId", "status", "reviewedAt"]) assert.ok(!(k in body), k);
});

/* ------------------------------------------------------------ display helpers */

test("display helpers", () => {
  assert.equal(L.ulbDecisionLabel("ULB_ACTION_REQUIRED"), "Action required");
  assert.equal(L.qcStatusText(null), "—");
  assert.equal(L.assetText({ module: "OTHER", asset: null, assetNotListed: false, otherIssueType: "Broken bench" }), "Broken bench");
  assert.equal(L.assetText({ module: "GVP", asset: null, assetNotListed: true, otherIssueType: null }), "Asset not listed");
  assert.equal(L.afterPhotoCaption({ questionCode: "q1" }, [{ code: "q1", question: "Is it clean?" }], 0, 2), "Is it clean?");
  assert.equal(L.afterPhotoCaption({ questionCode: null }, [], 1, 3), "After photo 2");
  assert.deepEqual(L.answerRows([{ type: "photo" }, { type: "yesno" }]), [{ type: "yesno" }]);
  assert.equal(L.answerText(null), "—");
});

/* ------------------------------------------------------------ source-level guards */

test("page is behind Protected + RoleGuard(ULB_OFFICER) only", () => {
  const page = read("app/ulb/cleanliness-issues/page.tsx");
  assert.match(page, /<Protected>/);
  assert.match(page, /roles=\{\['ULB_OFFICER'\]\}/);
  assert.doesNotMatch(page, /CITY_ADMIN|COMMISSIONER|HMS_SUPER_ADMIN/);
});

test("sidebar link exists once, inside the ULB-only block", () => {
  const src = read("components/PortalHomeLayout.tsx");
  assert.equal(src.split('href="/ulb/cleanliness-issues"').length - 1, 1);
  const at = src.indexOf('href="/ulb/cleanliness-issues"');
  const blockStart = src.lastIndexOf("{isUlbUser && (", at);
  assert.ok(blockStart > -1, "link must follow an isUlbUser opener");
  const between = src.slice(blockStart, at);
  assert.doesNotMatch(between, /\{(hasTaskforceAccess|isCityAdmin|isCommissioner)[^}]*&& \(/);
  assert.match(src, /pageTitle = 'Cleanliness Issue Approvals'/);
  assert.match(read("components/AppShell.tsx"), /"\/ulb\/cleanliness-issues"/);
});

test("evidence photos use the shared PhotoViewer and the dialog guards double submit", () => {
  const sections = read("components/cleanliness-issues/ulb/Sections.tsx");
  assert.match(sections, /from "\.\.\/PhotoViewer"/);
  assert.match(sections, /PhotoThumb/);
  const dialog = read("components/cleanliness-issues/ulb/DecisionDialog.tsx");
  assert.match(dialog, /inFlight\.current/);
  assert.match(dialog, /disabled=\{busy\}/);
  assert.match(dialog, /validateRemarks/);
});

test("no optimistic update and no Action Officer reference in the ULB screens", () => {
  const files = ["DecisionDialog.tsx", "DetailModals.tsx", "Sections.tsx", "UlbCleanlinessWorkspace.tsx"].map((f) => read(`components/cleanliness-issues/ulb/${f}`));
  const all = [...files, read("lib/ulbCleanlinessApi.ts"), read("lib/ulbCleanlinessLogic.ts")].join("\n");
  assert.doesNotMatch(all.replace(/not sent to an Action Officer/g, ""), /ActionOfficer|action-officer|ActionOfficerTask/i);
  // lists are only ever replaced from a server response
  assert.doesNotMatch(files[3], /setData\(\(?\s*\w*\s*=>\s*\{?\s*[^)]*filter\(/);
});
