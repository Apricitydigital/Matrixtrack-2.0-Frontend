/**
 * Cleanliness Issues (City Admin / Commissioner) - pure logic, API client contract and source-level guards.
 * Run: node --test tests/cleanlinessIssues.test.cjs
 *
 * What this DOES cover: IST formatting, filter/query building, image-viewer geometry (zoom, pan limits, pinch),
 * photo-metadata rows, the exact URLs/bodies the client sends, and that the screens are wired to the viewer,
 * the role guards and the double-submit guard (static source checks).
 * What it does NOT cover (needs a real browser / device): rendering, pointer/touch gestures on a real screen,
 * layout, the print/download dialogs. Those are reported as untested.
 */
require("./helpers/registerTs.cjs");
const Module = require("module");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// Path aliases (@lib/..) and the app's own api client are replaced so the pure modules load under plain node.
const calls = [];
let reply = { ok: true, status: 200, json: {} };
const originalLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (request === "./apiClient") {
    return {
      apiFetch: async (p, init = {}) => {
        calls.push({ path: p, method: init.method || "GET", body: init.body });
        return reply.json;
      }
    };
  }
  if (request === "./auth") return { getStoredToken: () => "TEST-TOKEN" };
  return originalLoad.call(this, request, parent, ...rest);
};

const L = require("../lib/cleanlinessIssuesLogic.ts");
const { CleanlinessIssuesAdminApi, CleanlinessIssuesCommissionerApi } = require("../lib/cleanlinessIssuesApi.ts");

/* ------------------------------------------------------------ time (IST) */

test("times are shown in Asia/Kolkata with the IST label", () => {
  assert.equal(L.formatDateIst("2026-10-21T04:59:59Z"), "21 Oct 2026");
  assert.equal(L.formatTimeIst("2026-10-21T04:59:59Z"), "10:29:59 AM");
  assert.equal(L.formatDateTimeIst("2026-10-21T04:59:59Z"), "21 Oct 2026, 10:29:59 AM IST");
  // across the IST midnight: 18:30 UTC is already the next IST day
  assert.equal(L.formatDateIst("2026-10-20T18:30:00Z"), "21 Oct 2026");
  assert.equal(L.formatTimeIst("2026-10-20T18:30:00Z"), "12:00:00 AM");
  assert.equal(L.formatDateTimeIst(null), "—");
  assert.equal(L.formatDateTimeIst("not a date"), "—");
});

test("time remaining / overdue wording", () => {
  assert.deepEqual(L.describeRemaining(3 * 3_600_000 + 5 * 60_000), { text: "3h 05m left", overdue: false });
  assert.deepEqual(L.describeRemaining(-(26 * 3_600_000)), { text: "Overdue by 1d 2h", overdue: true });
  assert.deepEqual(L.describeRemaining(-60_000), { text: "Overdue by 1m", overdue: true });
  assert.equal(L.describeRemaining(Number.NaN).text, "—");
  assert.equal(L.humanDuration(0), "0m");
  assert.deepEqual(L.overdueLabel({ isOverdue: true, isOutstanding: true, submittedLate: false, overdueByMs: 7_200_000 }), { text: "Overdue 2h 00m", tone: "danger" });
  assert.equal(L.overdueLabel({ isOverdue: true, isOutstanding: false, submittedLate: true, overdueByMs: 3_600_000 }).tone, "warning");
  assert.deepEqual(L.overdueLabel({ isOverdue: false, isOutstanding: false, submittedLate: false, overdueByMs: 0 }), { text: "On time", tone: "success" });
  assert.equal(L.hoursText(6), "6.0 h");
  assert.equal(L.hoursText(null), "—");
  assert.equal(L.percentText(11.1), "11.1%");
  assert.equal(L.percentText(null), "—");
});

test("status and event labels", () => {
  assert.equal(L.statusLabel("ASSIGNED"), "Pending Daroga inspection");
  assert.equal(L.statusLabel("REINSPECTION_REQUIRED"), "Reinspection required");
  assert.equal(L.statusLabel("SOMETHING_NEW"), "Something new");
  assert.equal(L.statusLabel(null), "—");
  assert.equal(L.eventLabel("REASSIGN"), "Reassigned to another Daroga");
  assert.equal(L.decisionLabel("ULB_ACTION_REQUIRED"), "Action required by ULB");
  assert.equal(L.assignmentReasonLabel("MANUAL"), "Manual (City Admin)");
});

/* --------------------------------------------------------------- filters */

test("query strings contain only non-empty values and are encoded", () => {
  assert.equal(L.buildQuery({ a: "1", b: "", c: undefined, d: null, e: "x y&z", f: 0 }), "?a=1&e=x%20y%26z&f=0");
  assert.equal(L.buildQuery({}), "");
  assert.equal(L.buildQuery({ a: "  " }), "");
});

test("a ward cannot stay selected under a zone that does not contain it; 'to' never precedes 'from'", () => {
  const zones = [{ id: "z1", wards: [{ id: "w11" }, { id: "w12" }] }, { id: "z2", wards: [{ id: "w21" }] }];
  assert.deepEqual(L.normalizeFilters({ zoneId: "z2", wardId: "w11" }, zones), { zoneId: "z2", wardId: undefined });
  assert.deepEqual(L.normalizeFilters({ zoneId: "z1", wardId: "w12" }, zones), { zoneId: "z1", wardId: "w12" });
  assert.deepEqual(L.normalizeFilters({ wardId: "w21" }, zones), { wardId: "w21" });
  assert.deepEqual(L.normalizeFilters({ from: "2026-10-10", to: "2026-10-01" }, zones), { from: "2026-10-10", to: "2026-10-10" });
  assert.equal(L.hasActiveFilters({}), false);
  assert.equal(L.hasActiveFilters({ module: "TOILET" }), true);
  assert.equal(L.hasActiveFilters({ module: undefined, search: "  " }), false);
});

/* ------------------------------------------------------------ image zoom */

test("zoom stays within 100%-600% and steps by 50%", () => {
  assert.equal(L.clampZoom(0.2), 1);
  assert.equal(L.clampZoom(99), 6);
  assert.equal(L.clampZoom(Number.NaN), 1);
  assert.equal(L.zoomIn(1), 1.5);
  assert.equal(L.zoomIn(6), 6, "cannot zoom in past the maximum");
  assert.equal(L.zoomOut(1.5), 1);
  assert.equal(L.zoomOut(1), 1, "cannot zoom out past fit");
  let z = 1;
  for (let i = 0; i < 20; i += 1) z = L.zoomIn(z);
  assert.equal(z, 6);
  assert.equal(L.toggleZoom(1), L.DOUBLE_TAP_ZOOM);
  assert.equal(L.toggleZoom(3), 1, "double tap on a zoomed image returns to fit");
});

test("mouse wheel and pinch zoom are proportional and clamped", () => {
  assert.ok(L.wheelZoom(2, -100) > 2, "wheel up zooms in");
  assert.ok(L.wheelZoom(2, 100) < 2, "wheel down zooms out");
  assert.equal(L.wheelZoom(1, 100), 1);
  assert.equal(L.wheelZoom(6, -100), 6);
  assert.equal(L.pinchZoom(1, 100, 200), 2, "fingers twice as far apart = twice the zoom");
  assert.equal(L.pinchZoom(2, 200, 100), 1);
  assert.equal(L.pinchZoom(3, 100, 1000), 6);
  assert.equal(L.pinchZoom(2, 0, 50), 2, "a zero-distance start is ignored");
  assert.equal(L.distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test("panning is limited to the zoomed image's edge and impossible at fit", () => {
  const vp = { width: 800, height: 600 };
  assert.deepEqual(L.clampPan({ x: 500, y: -500 }, 1, vp), { x: 0, y: 0 }, "no pan at 100%");
  assert.deepEqual(L.clampPan({ x: 5000, y: -5000 }, 2, vp), { x: 400, y: -300 });
  assert.deepEqual(L.clampPan({ x: 100, y: -50 }, 2, vp), { x: 100, y: -50 }, "inside the limits it is untouched");
  assert.deepEqual(L.clampPan({ x: 5000, y: 0 }, 3, vp), { x: 800, y: 0 });
  assert.deepEqual(L.clampPan({ x: 50, y: 50 }, 2, { width: 0, height: 0 }), { x: 0, y: 0 });
});

test("portrait and landscape photos stay visible when dragged inside a wide or tall viewer", () => {
  const far = { x: 5000, y: -5000 };
  const viewport = { width: 1200, height: 800 };
  const portrait = { width: 400, height: 800 };
  assert.deepEqual(L.clampPan(far, 2, viewport, portrait), { x: 0, y: -400 }, "narrow photos stay centered horizontally");
  assert.deepEqual(L.clampPan(far, 6, viewport, portrait), { x: 600, y: -2000 }, "at maximum zoom the image edge cannot cross the viewport edge");
  assert.deepEqual(L.clampPan(far, 2, { width: 600, height: 900 }, { width: 600, height: 300 }), { x: 300, y: 0 }, "short landscape photos stay centered vertically");
  assert.deepEqual(L.clampPan(far, 1, viewport, portrait), { x: 0, y: 0 }, "reset always restores fit and center");
});

/* ------------------------------------------------------- photo metadata */

test("photo metadata rows: IST date and time, latitude, longitude, accuracy - exactly as stored", () => {
  const rows = L.describePhotoMetadata({
    capturedAt: "2026-10-21T04:59:59Z",
    capturedAtDisplay: { date: "21 Oct 2026", time: "10:29:59 AM", timeZone: "Asia/Kolkata" },
    latitude: 23.1705,
    longitude: 75.78,
    accuracyMeters: 8.25
  });
  assert.deepEqual(rows.map((r) => [r.label, r.value, r.missing]), [
    ["Date", "21 Oct 2026", false],
    ["Time (IST)", "10:29:59 AM IST", false],
    ["Latitude", "23.170500", false],
    ["Longitude", "75.780000", false],
    ["GPS accuracy", "±8.3 m", false]
  ]);
  // without the server's display block the client formats the stored instant in IST itself
  const fallback = L.describePhotoMetadata({ capturedAt: "2026-10-20T18:30:00Z", latitude: 1, longitude: 2, accuracyMeters: 0 });
  assert.deepEqual([fallback[0].value, fallback[1].value, fallback[4].value], ["21 Oct 2026", "12:00:00 AM IST", "±0 m"]);
});

test("missing metadata reads 'Not available' and is never invented", () => {
  for (const photo of [null, undefined, {}, { latitude: null, longitude: null, accuracyMeters: null, capturedAt: null }]) {
    const rows = L.describePhotoMetadata(photo);
    assert.equal(rows.length, 5);
    assert.ok(rows.every((r) => r.value === "Not available" && r.missing), JSON.stringify(photo));
  }
  const partial = L.describePhotoMetadata({ capturedAt: "2026-10-21T04:59:59Z", latitude: 23.1, longitude: null, accuracyMeters: null });
  assert.deepEqual(partial.map((r) => r.missing), [false, false, false, true, true]);
  assert.equal(L.describePhotoMetadata({ latitude: 0, longitude: 0, accuracyMeters: 0, capturedAt: "2026-10-21T04:59:59Z" })[2].value, "0.000000", "a real zero is a value, not 'missing'");
});

test("only http(s) image links are rendered", () => {
  assert.equal(L.safeImageUrl("https://bucket.s3.amazonaws.com/a.jpg"), "https://bucket.s3.amazonaws.com/a.jpg");
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "", null, undefined]) assert.equal(L.safeImageUrl(bad), null, String(bad));
  assert.equal(L.mapsUrl(23.17, 75.78), "https://www.google.com/maps/search/?api=1&query=23.17,75.78");
});

/* ---------------------------------------------------------- API contract */

test("City Admin API: exact endpoints, methods and bodies; the city is never sent", async () => {
  const A = CleanlinessIssuesAdminApi;
  calls.length = 0;
  reply = { json: { kpis: {} } };
  await A.summary({ from: "2026-10-01", to: "2026-10-21", zoneId: "z", module: "TOILET", status: "QC_PENDING", overdue: "OVERDUE", darogaId: "d", search: "CI-1" });
  assert.equal(calls[0].path, "/cleanliness-issues/admin/summary?from=2026-10-01&to=2026-10-21&zoneId=z&module=TOILET&status=QC_PENDING&overdue=OVERDUE&darogaId=d&search=CI-1");
  await A.summary({});
  assert.equal(calls[1].path, "/cleanliness-issues/admin/summary");

  await A.issues({ module: "NALA" }, 3, 25, { sort: "issueNumber", order: "asc" });
  assert.equal(calls[2].path, "/cleanliness-issues/admin/issues?module=NALA&page=3&pageSize=25&sort=issueNumber&order=asc");
  reply = { json: { issue: { id: "i/1" } } };
  assert.equal((await A.issue("i/1")).id, "i/1");
  assert.equal(calls[3].path, "/cleanliness-issues/admin/issues/i%2F1");
  reply = { json: {} };
  await A.unassigned({ zoneId: "z", status: "ASSIGNED", search: "x", module: "OTHER" }, 2, 25);
  assert.equal(calls[4].path, "/cleanliness-issues/admin/unassigned?zoneId=z&module=OTHER&page=2&pageSize=25", "the unassigned queue ignores status / search");
  await A.eligible("abc");
  assert.equal(calls[5].path, "/cleanliness-issues/admin/issues/abc/eligible-darogas");
  await A.assign("abc", { assigneeId: "d1", remarks: "short staffed" });
  assert.deepEqual([calls[6].path, calls[6].method, JSON.parse(calls[6].body)], ["/cleanliness-issues/admin/issues/abc/assign", "POST", { assigneeId: "d1", remarks: "short staffed" }]);
  await A.analytics({ from: "2026-10-01", status: "CLOSED", wardId: "w" });
  assert.equal(calls[7].path, "/cleanliness-issues/admin/analytics?from=2026-10-01&wardId=w", "analytics take date / zone / ward / module only");
  await A.performance({ module: "TOILET", overdue: "OVERDUE" });
  assert.equal(calls[8].path, "/cleanliness-issues/admin/daroga-performance?module=TOILET");
  await A.filters();
  assert.equal(calls[9].path, "/cleanliness-issues/admin/filters");
  for (const c of calls) assert.ok(!/cityId/i.test(c.path + (c.body ?? "")), "the city is taken from the session, never sent");
});

test("Commissioner API has read-only endpoints only", async () => {
  const C = CleanlinessIssuesCommissionerApi;
  calls.length = 0;
  reply = { json: {} };
  await C.summary({ from: "2026-10-01", module: "GVP", status: "CLOSED", darogaId: "d" });
  await C.filters();
  assert.deepEqual(calls.map((c) => [c.method, c.path]), [
    ["GET", "/cleanliness-issues/commissioner/summary?from=2026-10-01&module=GVP"],
    ["GET", "/cleanliness-issues/commissioner/filters"]
  ]);
  assert.deepEqual(Object.keys(C).sort(), ["filters", "summary"], "no assignment / approval method exists for the Commissioner");
});

/* ------------------------------------------------ static source guards */

test("static: the image viewer has zoom in/out, reset, close, wheel, pinch, drag-pan, double-click and Escape, and shows the metadata", () => {
  const v = read("components/cleanliness-issues/PhotoViewer.tsx");
  for (const needle of ['aria-label="Zoom in"', 'aria-label="Zoom out"', 'aria-label="Reset zoom"', 'aria-label="Close photo"', "addEventListener(\"wheel\"", "passive: false", "onPointerDown", "pinchZoom(", "clampPan(", "toggleZoom(", 'e.key === "Escape"', "describePhotoMetadata(photo)", "safeImageUrl(photo.url)", 'role="dialog"', "setPointerCapture"]) {
    assert.ok(v.includes(needle), `viewer is missing: ${needle}`);
  }
  assert.ok(!/dangerouslySetInnerHTML/.test(v));
});

test("static: every evidence image on the admin screens goes through the zoomable viewer; no bare <img> elsewhere", () => {
  for (const file of ["IssueDetailModal.tsx", "CleanlinessIssuesAdminDashboard.tsx", "CleanlinessIssuesCommissionerDashboard.tsx", "AssignDarogaModal.tsx"]) {
    const src = read(`components/cleanliness-issues/${file}`);
    assert.ok(!/<img[\s>]/.test(src), `${file}: images must use PhotoThumb / PhotoGrid`);
  }
  const detail = read("components/cleanliness-issues/IssueDetailModal.tsx");
  assert.equal((detail.match(/<PhotoGrid/g) || []).length, 3, "Before, After and Reopening photos all use the viewer grid");
  assert.match(detail, /label="Before photo"/);
  assert.match(detail, /label="After photo"/);
  assert.match(detail, /label="Reopening photo"/);
  const thumb = read("components/cleanliness-issues/PhotoViewer.tsx");
  assert.match(thumb, /describePhotoMetadata\(photo\)/, "the metadata sits under every thumbnail");
});

test("static: pages are guarded by role; the Commissioner screens contain no write call", () => {
  assert.match(read("app/city/cleanliness-issues/page.tsx"), /RoleGuard roles=\{\['CITY_ADMIN'\]\}/);
  assert.match(read("app/municipal/commissioner/cleanliness-issues/page.tsx"), /RoleGuard roles=\{\['COMMISSIONER', 'CITY_ADMIN'\]\}/);
  const commissioner = read("components/cleanliness-issues/CleanlinessIssuesCommissionerDashboard.tsx");
  assert.ok(!/AssignDarogaModal|IssueDetailModal|CleanlinessIssuesAdminApi|\.assign\(|method: "POST"/.test(commissioner), "no assignment or write in the Commissioner dashboard");
  const api = read("lib/cleanlinessIssuesApi.ts");
  const commissionerApi = api.slice(api.indexOf("export const CleanlinessIssuesCommissionerApi"));
  assert.ok(!/POST|PUT|PATCH|DELETE/.test(commissionerApi));
});

test("static: manual assignment offers only server-listed Darogas, guards double clicks and never touches the deadline", () => {
  const modal = read("components/cleanliness-issues/AssignDarogaModal.tsx");
  assert.match(modal, /CleanlinessIssuesAdminApi\.eligible\(issueId\)/);
  assert.match(modal, /data\.eligible|const eligible = data\?\.eligible/);
  assert.match(modal, /savingRef\.current = true/, "synchronous double-click guard");
  assert.match(modal, /does <b>not<\/b> change/, "the user is told the deadline is unchanged");
  assert.match(modal, /role="alert"/);
  assert.ok(!/inspectionDueAt\s*[:=][^=]/.test(modal.replace(/formatDateTimeIst\(data\.inspectionDueAt\)/, "")), "no deadline is sent");
});

test("static: the dashboard shows all 12 required KPIs, the table columns, filters, sort, pagination, CSV export and the unassigned queue", () => {
  const d = read("components/cleanliness-issues/CleanlinessIssuesAdminDashboard.tsx");
  for (const label of ["Total reported", "Open issues", "Closed issues", "Pending Daroga inspection", "QC pending", "ULB pending", "Reinspection required", "Overdue issues", "Unassigned issues", "Reopened issues", "Avg initial inspection time", "Avg resolution time"]) {
    assert.ok(d.includes(`label="${label}"`), `KPI missing: ${label}`);
  }
  for (const col of ["Issue number", "Reported", "IEC Member", "Module", "Zone", "Ward", "Asset / type", "Assigned Daroga", "Status", "Inspection deadline", "Overdue", "Last updated", "Action"]) {
    assert.ok(d.includes(col), `column missing: ${col}`);
  }
  for (const needle of ["exportCsv", "Pagination", "aria-sort", "FilterBar", "Unassigned issues", "Daroga performance", "Zone / Ward analytics", "Assign Daroga", "Reassign"]) assert.ok(d.includes(needle), needle);
  const f = read("components/cleanliness-issues/ui.tsx");
  for (const label of ["From", "To", "Zone", "Ward", "Module", "Status", "Assigned Daroga", "Overdue", "Issue number"]) assert.ok(f.includes(`label="${label}"`), `filter missing: ${label}`);
});

test("static: navigation entries exist only for the right roles", () => {
  const nav = read("app/city/CityNavTabs.tsx");
  assert.match(nav, /isCityAdmin \? \[\s*\{ name: "Cleanliness Issues", href: "\/city\/cleanliness-issues"/);
  const sidebar = read("components/ui/Sidebar.tsx");
  assert.match(sidebar, /href: "\/municipal\/commissioner\/cleanliness-issues"/);
  assert.match(sidebar, /href: "\/city\/cleanliness-issues"/);
});
