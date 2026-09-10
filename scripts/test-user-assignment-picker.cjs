const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), assert = require("node:assert/strict"), ts = require("typescript"), React = require("react");
const source = fs.readFileSync(path.join(__dirname, "../components/users/UserAssignmentPicker.tsx"), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function mount(api) {
  let cursor = 0; const hooks = [], effects = [], calls = [];
  const fakeReact = { ...React,
    useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = typeof value === "function" ? value(hooks[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = { current: initial }; return hooks[i]; },
    useEffect(fn, deps) { const i = cursor++; const old = hooks[i]; if (!old || deps.some((d, index) => d !== old.deps[index])) { old?.cleanup?.(); hooks[i] = { deps }; effects.push(() => { hooks[i].cleanup = fn(); }); } }
  };
  const ctx = { exports: {}, require(name) { if (name === "react") return fakeReact; if (name === "@lib/apiClient") return { CityUserApi: api }; throw Error(name); } };
  vm.runInNewContext(code, ctx);
  const props = { userId: "target", userName: "Test User", type: "BIN", roles: ["SUPERVISOR", "EMPLOYEE"], initialRole: "SUPERVISOR", onCancel: () => calls.push("cancel"), onAssigned: async () => { calls.push("assigned"); }, onBusyChange: value => calls.push(value) };
  return { calls, render() { cursor = 0; const tree = ctx.exports.UserAssignmentPicker(props); while (effects.length) effects.shift()(); return tree; } };
}
function nodes(tree, predicate) { const out = []; function walk(node) { if (!node || typeof node !== "object") return; if (predicate(node)) out.push(node); React.Children.forEach(node.props?.children, walk); } walk(tree); return out; }
function text(node) { if (typeof node === "string" || typeof node === "number") return String(node); if (!node?.props) return ""; return React.Children.toArray(node.props.children).map(text).join(""); }
(async () => {
  const requests = []; let resolveSave;
  const app = mount({ assignmentOptions: async (...args) => { requests.push(["options", ...args]); return { items: [{ id: "one", label: "Bin One" }, { id: "two", label: "Bin Two" }] }; }, addAssignment: (...args) => { requests.push(["add", ...args]); return new Promise(resolve => { resolveSave = resolve; }); } });
  assert(text(app.render()).includes("Loading options")); await flush();
  let tree = app.render(); assert(text(tree).includes("Bin One"));
  nodes(tree, n => n.type === "input")[0].props.onChange({ target: { value: "two" } }); tree = app.render();
  assert(!text(tree).includes("Bin One") && text(tree).includes("Bin Two"));
  nodes(tree, n => n.type === "select")[0].props.onChange({ target: { value: "EMPLOYEE" } }); app.render(); await flush(); tree = app.render();
  assert.equal(requests.at(-1)[3], "EMPLOYEE");
  const save = nodes(tree, n => n.type === "button" && text(n) === "Assign")[0];
  save.props.onClick(); save.props.onClick(); tree = app.render();
  assert.equal(requests.filter(r => r[0] === "add").length, 1);
  assert(nodes(tree, n => n.type === "button").every(n => n.props.disabled));
  assert.equal(JSON.stringify(requests.at(-1)), JSON.stringify(["add", "target", { type: "BIN", role: "EMPLOYEE", itemId: "two" }]));
  resolveSave({ success: true }); await flush(); app.render(); assert(app.calls.includes("assigned") && app.calls.at(-1) === false);
  const bad = mount({ assignmentOptions: async () => ({ items: [{ id: "one", label: "One" }] }), addAssignment: async () => { throw new Error("Already assigned elsewhere"); } });
  bad.render(); await flush(); tree = bad.render(); nodes(tree, n => n.type === "button" && text(n) === "Assign")[0].props.onClick(); await flush(); tree = bad.render();
  assert(nodes(tree, n => n.props?.role === "alert").length === 1); assert(!bad.calls.includes("assigned"));
  const denied = mount({ assignmentOptions: async () => { throw new Error("Forbidden"); } }); denied.render(); await flush(); assert(nodes(denied.render(), n => n.props?.role === "alert").length === 1);
  console.log("PASS: picker loading, search, explicit role, additive payload, duplicate-submit lock, success refresh, save error, options error");
})().catch(e => { console.error(e); process.exitCode = 1; });
