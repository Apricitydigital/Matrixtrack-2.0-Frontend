require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterPerformanceRows, sortPerformanceRows, directoryNames, directoryScope, performanceAssessment, matchesPerformanceFocus } = require('../lib/userPerformanceDirectory.ts');
const { restrictDarogaModules, restrictSiModules, restrictIecModules } = require('../lib/userPerformanceScores.ts');
const row = (key, performance, zone = 'Zone 2', ward = 'Ward 2') => ({ key, label: key, performance, zones: [zone], wards: [ward], modules: ['Sweeping'] });

test('zone, ward and search combine; filtering retains zero-activity roster members', () => {
  const rows = [row('Zero', 0), row('Other ward', 20, 'Zone 2', 'Ward 3'), row('Other zone', 90, 'Zone 1')];
  assert.deepEqual(filterPerformanceRows(rows, 'zone 2', 'WARD 2', 'sweeping').map(r => r.key), ['Zero']);
  assert.equal(filterPerformanceRows(rows, 'Zone 2', '', '').length, 2);
  assert.equal(filterPerformanceRows(rows, '', '', 'missing').length, 0);
});

test('both score directions preserve zero and put unavailable data last without mutating the input', () => {
  const rows = [row('Unknown', null), row('High', 90), row('Zero', 0), row('Low', 20)];
  assert.deepEqual(sortPerformanceRows(rows, 'performance', 'asc').map(r => r.key), ['Zero', 'Low', 'High', 'Unknown']);
  assert.deepEqual(sortPerformanceRows(rows, 'performance', 'desc').map(r => r.key), ['High', 'Low', 'Zero', 'Unknown']);
  assert.equal(rows[0].key, 'Unknown');
});

test('location options and location sorting use natural numeric order', () => {
  assert.deepEqual(directoryNames(['Zone 10', 'Zone 2', 'zone 2', '']), ['zone 2', 'Zone 10']);
  const rows = [row('Ten', 1, 'Zone 10'), row('Two', 1)];
  assert.equal(sortPerformanceRows(rows, 'zone', 'asc')[0].key, 'Two');
  assert.equal(sortPerformanceRows(rows, 'zone', 'desc')[0].key, 'Ten');
});

test('zone-wide users remain filterable in child wards without reports; ward-only users inherit the parent zone', () => {
  const names = new Map([['z1', 'Zone 1'], ['z2', 'Zone 2'], ['w1', 'Ward 1'], ['w2', 'Ward 2'], ['w3', 'Ward 3']]);
  const parents = new Map([['ward 1', 'Zone 1'], ['ward 2', 'Zone 1'], ['ward 3', 'Zone 2']]);
  assert.deepEqual(directoryScope({ zoneIds: ['z1'] }, names, parents), { zones: ['Zone 1'], wards: ['Ward 1', 'Ward 2'] });
  assert.deepEqual(directoryScope({ wardIds: ['w3'] }, names, parents), { zones: ['Zone 2'], wards: ['Ward 3'] });
});

test('target sorting retains fractional period targets; shortfall cannot go negative', () => {
  const rows = [
    { ...row('A', 50), coverage: { required: 2.86, completed: 1.43 } },
    { ...row('B', 100), coverage: { required: 2, completed: 3 } },
    row('Unknown', null),
  ];
  assert.equal(sortPerformanceRows(rows, 'target', 'asc')[0].key, 'B');
  assert.equal(sortPerformanceRows(rows, 'shortfall', 'desc')[0].key, 'A');
  assert.equal(sortPerformanceRows(rows, 'shortfall', 'asc')[0].key, 'B');
});

test('SI and IEC sort using the selected role counters', () => {
  const rows = [{ ...row('SI', 20), si: { due: 10, onTime: 2, overdue: 8 } }, { ...row('IEC', 50), iec: { due: 4, onTime: 2, overdue: 2 } }];
  assert.equal(sortPerformanceRows(rows, 'overdue', 'desc')[0].key, 'SI');
  assert.equal(sortPerformanceRows(rows, 'due', 'asc')[0].key, 'IEC');
});

test('Daroga module totals, day counts and zero-target exclusions stay consistent', () => {
  const data = { days: 2, modules: { TOILET: { assigned: 10, required: 20, completed: 5 }, SWEEPING: { assigned: 2, required: 4, completed: 4 } }, daily: [
    { date: '2026-10-01', modules: { TOILET: { target: 10, credit: 5 }, SWEEPING: { target: 2, credit: 2 } } },
    { date: '2026-10-02', modules: { TOILET: { target: 10, credit: 0 }, SWEEPING: { target: 2, credit: 2 } } },
  ], rows: [{ module: 'TOILET' }, { module: 'SWEEPING' }], periods: [] };
  const sweeping = restrictDarogaModules(data, 'SWEEPING');
  assert.deepEqual([sweeping.required, sweeping.completed, sweeping.performance, sweeping.daysMet, sweeping.daysWithTarget], [4, 4, 100, 2, 2]);
  assert.equal(restrictDarogaModules(data, 'TOILET').performance, 25);
  assert.equal(restrictDarogaModules(data, 'NALA').performance, null);
});

test('timed module rates exclude reports still within their deadline', () => {
  const data = { modules: {}, moduleStats: { TOILET: { arrived: 15, onTime: 4, late: 2, overdue: 2, inProgress: 7, backlogOverdue: 1 } }, daily: [] };
  for (const restrict of [restrictSiModules, restrictIecModules]) {
    const result = restrict(data, 'TOILET');
    assert.deepEqual([result.performance, result.due, result.inProgress, result.backlogOverdue], [50, 8, 7, 1]);
    assert.equal(restrict(data, 'NALA').performance, null);
  }
});

test('each Daroga has one assessment; zero credit is an attention subset, not missing data', () => {
  const rows = [
    { ...row('Missing', null) },
    { ...row('No target', null), coverage: { required: 0, completed: 0 } },
    { ...row('Zero', 0), coverage: { required: 10, completed: 0 } },
    { ...row('Low', 79.9), coverage: { required: 100, completed: 79.9 } },
    { ...row('On track', 80), coverage: { required: 10, completed: 8 } },
    { ...row('Met', 100), coverage: { required: 10, completed: 10 } },
  ];
  assert.deepEqual(rows.map(r => performanceAssessment(r, 'SUPERVISOR').status), ['unavailable', 'noTarget', 'attention', 'attention', 'onTrack', 'met']);
  const groups = ['unavailable', 'noTarget', 'attention', 'onTrack', 'met'];
  assert.equal(groups.reduce((sum, focus) => sum + rows.filter(r => matchesPerformanceFocus(r, focus, 'SUPERVISOR')).length, 0), rows.length);
  assert.deepEqual(rows.filter(r => matchesPerformanceFocus(r, 'zero', 'SUPERVISOR')).map(r => r.key), ['Zero']);
  assert.equal(rows.filter(r => matchesPerformanceFocus(r, 'all', 'SUPERVISOR')).length, rows.length);
});

test('overdue SI or IEC work needs attention even with a high on-time percentage', () => {
  for (const role of ['QC', 'ACTION_OFFICER']) {
    const entry = { ...row('High with overdue', 90), [role === 'QC' ? 'si' : 'iec']: { due: 10, onTime: 9, overdue: 1 } };
    assert.equal(performanceAssessment(entry, role).status, 'attention');
    assert.match(performanceAssessment(entry, role).reason, /1 reports/);
    assert.equal(matchesPerformanceFocus(entry, 'attention', role), true);
    assert.equal(matchesPerformanceFocus(entry, 'zero', role), false);
  }
});

test('assessment keeps no due work separate from an unavailable timed response', () => {
  assert.equal(performanceAssessment({ ...row('No work', null), si: { due: 0, onTime: 0, overdue: 0 } }, 'QC').status, 'noTarget');
  assert.equal(performanceAssessment(row('Missing', null), 'QC').status, 'unavailable');
  assert.equal(performanceAssessment({ ...row('Met', 100), iec: { due: 3, onTime: 3, overdue: 0 } }, 'ACTION_OFFICER').status, 'met');
});
