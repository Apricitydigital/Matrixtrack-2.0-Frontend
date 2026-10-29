require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');

// Run the real page's effects with controlled network responses. Rendering only
// its element tree keeps chart/drawer implementation out of these loading tests.
function pageHarness(role = 'SUPERVISOR', summaryResponse, geographyResponse) {
  const filename = path.resolve(__dirname, '../app/municipal/commissioner/user-performance/UserPerformanceView.tsx');
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'UserPerformanceView');
  const stateNames = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === 'useState') stateNames.push(node.name.elements[0].name.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(component);
  const state = new Map([['roleFilter', role]]);
  const refs = [];
  const calls = [];
  let effects = [], stateIndex = 0, refIndex = 0;
  const fakeReact = {
    ...React,
    useState(initial) {
      const name = stateNames[stateIndex++];
      if (!state.has(name)) state.set(name, typeof initial === 'function' ? initial() : initial);
      return [state.get(name), (value) => state.set(name, typeof value === 'function' ? value(state.get(name)) : value)];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: (fn) => effects.push(fn),
  };
  const scoreApi = Object.fromEntries(['darogaPerformance', 'siPerformance', 'iecPerformance'].map(key => [key, () => {
    calls.push(key);
    return summaryResponse ? summaryResponse(key) : Promise.resolve({ users: {} });
  }]));
  const originalLoad = Module._load;
  let Page;
  try {
    Module._load = function(id, parent, isMain) {
      if (id === 'react') return fakeReact;
      if (id === 'next/dynamic') return () => () => null;
      if (id === './TimedPerformanceOverview') return () => null;
      if (id === 'next/link') return () => null;
      if (id === 'next/navigation') return { usePathname: () => '/municipal/commissioner/user-performance' };
      if (id === '@hooks/useAuth') return { useAuth: () => ({ user: { city: { id: 'city' } } }) };
      if (id === '@lib/apiClient') return {
        CityUserApi: { ...scoreApi, list: async () => { calls.push('roster'); return { users: [] }; } },
        GeoApi: { list: async (level) => { calls.push(level); return geographyResponse ? geographyResponse() : { nodes: [] }; } },
        ModuleRecordsApi: { getRecords: async () => { calls.push('history'); return { data: [] }; } },
      };
      if (id === '@lib/attendanceApi') return { AttendanceApi: { dashboard: async () => { calls.push('attendance'); return { employees: [] }; } } };
      if (id.startsWith('@lib/')) return originalLoad.call(this, path.resolve(__dirname, '../lib', `${id.slice(5)}.ts`), parent, isMain);
      if (id.startsWith('@components/')) return new Proxy({}, { get: () => () => null });
      return originalLoad.call(this, id, parent, isMain);
    };
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.paths = module.paths;
    mod._compile(compiled, filename);
    Page = mod.exports.default;
  } finally { Module._load = originalLoad; }
  return {
    calls, state,
    render() {
      effects = []; stateIndex = 0; refIndex = 0;
      Page({});
      return effects.map(effect => effect()).filter(cleanup => typeof cleanup === 'function');
    },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

for (const [role, endpoint] of [['SUPERVISOR', 'darogaPerformance'], ['QC', 'siPerformance'], ['ACTION_OFFICER', 'iecPerformance']]) {
  test(`${role} overview requests only its own score and does not download history or attendance`, async () => {
    const page = pageHarness(role);
    page.render();
    await settle();
    assert.deepEqual(page.calls.filter(call => call.endsWith('Performance')), [endpoint]);
    assert.equal(page.calls.includes('history'), false);
    assert.equal(page.calls.includes('attendance'), false);
    assert.equal(page.state.get('loading'), false);
    assert.equal(page.state.get('rosterLoading'), false);
  });
}

test('opening a user lazily fetches inspection history and attendance', async () => {
  const page = pageHarness();
  page.state.set('activeRow', { key: 'SUPERVISOR-person' });
  page.render();
  await settle();
  assert.equal(page.calls.filter(call => call === 'history').length, 5);
  assert.equal(page.calls.filter(call => call === 'attendance').length, 1);
  assert.equal(page.state.get('detailsStatus'), 'ready');
});

test('a slow previous role cannot overwrite a newer request or keep the loader active', async () => {
  let resolveOld;
  const page = pageHarness('SUPERVISOR', key => key === 'darogaPerformance' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ users: {} }));
  const cleanups = page.render();
  cleanups.forEach(cleanup => cleanup());
  page.state.set('roleFilter', 'QC');
  page.render();
  await settle();
  assert.equal(page.state.get('siStatus'), 'ready');
  assert.equal(page.state.get('loading'), false);
  resolveOld({ users: { stale: {} } });
  await settle();
  assert.equal(page.state.get('darogaPerformance'), null);
  assert.equal(page.state.get('loading'), false);
});

test('the summary becomes available without waiting for slow geography', async () => {
  const page = pageHarness('SUPERVISOR', undefined, () => new Promise(() => {}));
  page.render();
  await settle();
  assert.equal(page.state.get('rosterLoading'), false);
  assert.equal(page.state.get('loading'), false);
  assert.equal(page.state.get('darogaStatus'), 'ready');
});

test('reopening details for the same dates reuses both history and attendance', async () => {
  const page = pageHarness();
  page.state.set('activeRow', { key: 'SUPERVISOR-person' });
  let cleanups = page.render();
  await settle();
  cleanups.forEach(cleanup => cleanup());
  page.state.set('activeRow', null);
  cleanups = page.render();
  await settle();
  cleanups.forEach(cleanup => cleanup());
  page.state.set('activeRow', { key: 'SUPERVISOR-person' });
  page.render();
  await settle();
  assert.equal(page.calls.filter(call => call === 'attendance').length, 1);
  assert.equal(page.calls.filter(call => call === 'history').length, 5);
  assert.equal(page.state.get('detailsStatus'), 'ready');
});

test('a score request failure clears the loader and presents unavailable data', async () => {
  const page = pageHarness('SUPERVISOR', () => Promise.reject(new Error('Unavailable')));
  const originalError = console.error;
  try {
    console.error = () => {};
    page.render();
    await settle();
  } finally { console.error = originalError; }
  assert.equal(page.state.get('loading'), false);
  assert.equal(page.state.get('loadError'), true);
  assert.equal(page.state.get('darogaStatus'), 'error');
  assert.equal(page.state.get('darogaPerformance'), null);
});
