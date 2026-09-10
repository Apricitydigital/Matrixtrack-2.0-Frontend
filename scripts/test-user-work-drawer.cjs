const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");
const source = fs.readFileSync(path.join(__dirname, "../app/portal-home/registered-users/page.tsx"), "utf8");
const start = source.indexOf("function drilldownRoleBadgeStyle");
const end = source.indexOf("export default function RegisteredUsersPage", start);
assert(start >= 0 && end > start);
const drawerSource = source.slice(start, end);
// The summary must not call mutating assignment APIs or expose quick-remove actions.
assert(!/CityUserApi\.update|AreaBeatApi\.assign|TwinbinApi\.assign|unassignToilet|onRemove|onAddClick/.test(drawerSource));
assert(!/handleRemoveBeat|handleAssignPick|AssignPickerModal/.test(source));
const js = ts.transpileModule(drawerSource + "\nglobalThis.Drawer = UserWorkDrilldownDrawer;", {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React }
}).outputText;
const context = { React, ...icons, useRef: React.useRef, useEffect: React.useEffect, createPortal: node => node, document: { body: {} } };
vm.createContext(context); vm.runInContext(js, context);
const counts = { total: 10, approved: 2, completed: 3, pending: 1, attention: 4 };
const data = { user: { name: "Current Name", roles: ["CITY_ADMIN", "SUPERVISOR"] }, scope: { zones: [], wards: [] }, assignments: { beats: [], litterBins: [], toilets: [] }, workSummary: { overall: counts, sweeping: counts, toilet: counts, litterBin: counts } };
const props = { open: true, user: { name: "Old Name", role: "CITY_ADMIN" }, data, loading: false, error: null, onClose() {} };
const render = overrides => renderToStaticMarkup(React.createElement(context.Drawer, { ...props, ...overrides }));
const html = render();
assert(html.includes('role="dialog"') && html.includes('aria-modal="true"'));
assert(html.includes("Current Name") && html.includes("CITY_ADMIN / SUPERVISOR"));
assert(html.includes("Completed") && html.includes("Needs attention") && html.includes("all time"));
assert(!html.includes(">Rejected<"));
const rows = html.match(/<tbody>[\s\S]*?<\/tbody>/)[0].match(/<tr[\s\S]*?<\/tr>/g);
assert.equal(rows.length, 3);
for (const row of rows) {
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => match[1].replace(/<[^>]*>/g, ""));
  assert.deepEqual(cells.slice(1), ["10", "2", "3", "1", "4"]);
}
assert(render({ data: null, loading: true }).includes("Loading assignments"));
assert(render({ data: null, error: "Access denied" }).includes("Access denied"));
assert.equal(render({ open: false }), "");
const legacy = { ...data, workSummary: Object.fromEntries(Object.entries(data.workSummary).map(([key, value]) => { const { completed, ...rest } = value; return [key, rest]; })) };
assert(!render({ data: legacy }).includes("NaN"));
console.log("PASS: summary rendering, completed counts, attention labels, multi-role display, loading/error/closed states, legacy compatibility, read-only assignments");
