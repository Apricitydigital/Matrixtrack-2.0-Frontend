require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { timedPerformanceSummary } = require('../lib/timedPerformanceSummary.ts');
const { matchesPerformanceFocus, performanceAssessment, sortPerformanceRows } = require('../lib/userPerformanceDirectory.ts');
const counters = (values = {}) => ({ due: 10, onTime: 6, late: 2, overdue: 2, inProgress: 3, backlogOverdue: 1, oldestPendingDays: 8, avgTurnaroundHours: 4, ...values });
const row = (key, values, role = 'QC') => ({ key, label: key, zones: [], wards: [], modules: [], performance: values.due ? values.onTime / values.due * 100 : null, [role === 'QC' ? 'si' : 'iec']: values });

test('timed totals use the combined report denominator and never add backlog twice', () => {
  const rows = [row('A', counters()), row('B', counters({ due: 4, onTime: 4, late: 0, overdue: 0, inProgress: 1, backlogOverdue: 0, oldestPendingDays: 1, avgTurnaroundHours: 10 }))];
  const stats = timedPerformanceSummary(rows, true);
  assert.deepEqual([stats.due, stats.onTime, stats.late, stats.overdue, stats.inProgress, stats.backlogOverdue], [14, 10, 2, 2, 4, 1]);
  assert.equal(stats.rate, 10 / 14 * 100);
  assert.notEqual(stats.rate, (60 + 100) / 2);
  assert.equal(stats.overdueUsers, 1);
  assert.equal(stats.avgHours, 7, 'explicitly the mean of user averages');
  assert.equal(stats.oldestDays, 8);
  assert.equal(stats.consistent, true);
});

test('module-filtered views cannot show whole-user age, turnaround or estimated-timestamp counters', () => {
  const stats = timedPerformanceSummary([row('IEC', counters({ estimated: 5, avgResolutionHours: 12 }), 'ACTION_OFFICER')], false);
  assert.equal(stats.avgHours, null);
  assert.equal(stats.oldestDays, null);
  assert.equal(stats.estimated, null);
  assert.equal(stats.backlogOverdue, 1);
});

test('pending work inside the deadline has no score and is distinct from missing data', () => {
  const pending = row('Pending', counters({ due: 0, onTime: 0, late: 0, overdue: 0, inProgress: 3, backlogOverdue: 0 }));
  const stats = timedPerformanceSummary([pending, { performance: null, si: null }], true);
  assert.equal(stats.rate, null);
  assert.equal(stats.available, 1);
  assert.equal(stats.unavailable, 1);
  assert.equal(stats.scoredUsers, 0);
  assert.equal(matchesPerformanceFocus(pending, 'pending', 'QC'), true);
  assert.equal(matchesPerformanceFocus(pending, 'attention', 'QC'), false);
  assert.match(performanceAssessment(pending, 'QC').reason, /not scored/);
});

test('report-category actions include partial performers, not only users with a 100% rate', () => {
  for (const role of ['QC', 'ACTION_OFFICER']) {
    const user = row('Mixed', counters(), role);
    for (const focus of ['onTime', 'late', 'overdue', 'pending', 'backlog']) assert.equal(matchesPerformanceFocus(user, focus, role), true, focus);
    assert.equal(matchesPerformanceFocus(user, 'met', role), false);
  }
});

test('a high-scoring user with an overdue report still needs attention; late completions get a relevant next step', () => {
  const overdue = row('High', counters({ due: 100, onTime: 99, late: 0, overdue: 1 }));
  assert.equal(performanceAssessment(overdue, 'QC').status, 'attention');
  const late = row('Late', counters({ due: 10, onTime: 6, late: 4, overdue: 0 }));
  assert.equal(performanceAssessment(late, 'QC').label, 'Some work completed late');
  assert.match(performanceAssessment(late, 'QC').nextStep, /delayed completion/);
});

test('timed work columns sort by late, pending and backlog counts in either direction', () => {
  const rows = [row('A', counters()), row('B', counters({ late: 4, inProgress: 9, backlogOverdue: 2 }))];
  for (const field of ['late', 'inProgress', 'backlog']) {
    assert.equal(sortPerformanceRows(rows, field, 'desc')[0].key, 'B');
    assert.equal(sortPerformanceRows(rows, field, 'asc')[0].key, 'A');
  }
});

test('inconsistent or absent counters are surfaced instead of inventing an accurate-looking rate', () => {
  assert.equal(timedPerformanceSummary([row('Bad', counters({ due: 100 }))], true).consistent, false);
  const stats = timedPerformanceSummary([{ performance: null, si: {} }], true);
  assert.equal(stats.unavailable, 1);
  assert.equal(stats.rate, null);
});

test('SI and IEC render role-specific deadlines, queues and follow-up actions', () => {
  const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const filename = path.resolve(__dirname, '../app/municipal/commissioner/user-performance/TimedPerformanceOverview.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const original = Module._load;
  let Component;
  try {
    Module._load = function(id, parent, isMain) {
      if (id === '@lib/timedPerformanceSummary') return { timedPerformanceSummary };
      return original.call(this, id, parent, isMain);
    };
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths; mod._compile(compiled, filename); Component = mod.exports.default;
  } finally { Module._load = original; }
  const render = role => renderToStaticMarkup(React.createElement(Component, { role, rows: [row('Example', counters(), role)], moduleFilter: 'ALL', fromDate: '2026-10-01', toDate: '2026-10-29', onReview() {}, onOpen() {} }));
  const si = render('QC'), iec = render('ACTION_OFFICER');
  assert.match(si, /Sanitary Inspectors in review/);
  assert.match(si, /day after report submission/);
  assert.match(si, /Review overdue queues/);
  assert.match(iec, /IEC members in review/);
  assert.match(iec, /day after the report was sent for action/);
  assert.match(iec, /Review unresolved issues/);
  for (const html of [si, iec]) {
    assert.match(html, /Older overdue backlog/);
    assert.match(html, /do not add it again/);
    assert.doesNotMatch(html, /Daroga|standard daily targets/);
  }
});
