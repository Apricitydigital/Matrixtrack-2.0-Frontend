require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectionOverview, inspectionRangeDays, inspectionRollingRange } = require('../lib/inspectionOverview.ts');
const inventory = [
  { module: 'SWEEPING', wardId: 'w1', zoneId: 'z1', total: 10 },
  { module: 'LITTERBINS', wardId: 'w1', zoneId: 'z1', total: 5 },
  { module: 'TOILET', wardId: 'w2', zoneId: 'z2', total: 5 },
];
const row = (module, wardId, assigned, target, credit) => ({ module, wardId, zoneName: wardId === 'w1' ? 'Zone 1' : 'Zone 2', assigned, target, credit });
const summarize = (options = {}) => inspectionOverview({ inventory, users: {}, days: 1, ...options });

test('10 beats with five photos each, five bins and five toilets total 20 assets, with full default targets', () => {
  const overview = summarize();
  assert.equal(overview.total, 20);
  assert.equal(overview.target, 20);
  assert.equal(overview.credit, 0);
  assert.equal(overview.pending, 20);
  assert.equal(summarize({ module: 'SWEEPING' }).total, 10);
});

test('a set target of five on ten beats with three credited inspections leaves two pending', () => {
  const users = { daroga: { rows: [row('SWEEPING', 'w1', 10, 5, 3)] } };
  const overview = summarize({ users, module: 'SWEEPING' });
  assert.deepEqual([overview.total, overview.target, overview.credit, overview.pending, overview.percent], [10, 5, 3, 2, 60]);
  assert.equal(summarize({ users }).target, 15, 'other modules retain their full defaults');
});

test('module, zone and ward filters apply to totals and targets together', () => {
  const users = { daroga: { rows: [row('SWEEPING', 'w1', 10, 5, 3), row('TOILET', 'w2', 5, 2, 1)] } };
  assert.equal(summarize({ users, zoneId: 'z1', zoneName: 'Zone 1' }).total, 15);
  assert.equal(summarize({ users, zoneId: 'z1', zoneName: 'Zone 1' }).target, 10);
  assert.equal(summarize({ users, wardId: 'w2' }).pending, 1);
  assert.equal(summarize({ users, zoneId: 'z2', module: 'SWEEPING' }).target, 0);
});

test('multi-day targets preserve asset totals and fractional periodic target credit', () => {
  const users = { daroga: { rows: [{ ...row('SWEEPING', 'w1', 10, 2.86, 1), targetPercent: 20 }] } };
  const overview = summarize({ users, module: 'SWEEPING', days: 2 });
  assert.equal(overview.total, 10);
  assert.equal(overview.target, 2.86);
  assert.equal(overview.pending, 1.86);
  assert.deepEqual(overview.percentTargets, [20]);
  assert.equal(summarize({ days: 2 }).target, 40);
});

test('assets without a Daroga default to full, without adding assigned assets twice', () => {
  const users = { daroga: { rows: [row('SWEEPING', 'w1', 8, 5, 3)] } };
  assert.equal(summarize({ users, module: 'SWEEPING' }).target, 7);
});

test('unavailable requests and All Time never invent zero targets; real empty inventory is zero', () => {
  assert.equal(summarize({ inventory: null }).total, null);
  assert.equal(summarize({ users: null }).target, null);
  assert.equal(summarize({ days: null }).target, null);
  assert.equal(summarize({ days: null }).total, 20);
  assert.equal(summarize({ inventory: [] }).target, 0);
  assert.equal(summarize({ days: 0 }).pending, 0);
});

test('shared default assignments cannot inflate the full inventory target or cover another ward', () => {
  const users = {
    a: { rows: [row('SWEEPING', 'w1', 10, 10, 10)] },
    b: { rows: [row('SWEEPING', 'w1', 10, 10, 10)] },
  };
  const overview = summarize({ users });
  assert.equal(overview.target, 20);
  assert.equal(overview.credit, 10);
  assert.equal(overview.pending, 10);
});

test('credit cannot produce negative pending, and future dates are not due', () => {
  assert.equal(summarize({ users: { d: { rows: [row('SWEEPING', 'w1', 10, 5, 12)] } }, module: 'SWEEPING' }).pending, 0);
  assert.equal(inspectionRangeDays('2026-10-26', '2026-11-10', '2026-10-27'), 2);
  assert.equal(inspectionRangeDays('2026-11-01', '2026-11-10', '2026-10-27'), 0);
  assert.equal(inspectionRangeDays('2000-01-01', '2026-10-27', '2026-10-27'), null);
});

test('This Week is seven inclusive dates, so 65 default daily assets produce 455 targets', () => {
  const range = inspectionRollingRange(7, new Date(2026, 9, 27, 12));
  assert.deepEqual(range, { start: '2026-10-21', end: '2026-10-27' });
  const days = inspectionRangeDays(range.start, range.end, '2026-10-27');
  assert.equal(days, 7);
  const overview = summarize({ inventory: [{ module: 'TOILET', wardId: 'w1', zoneId: 'z1', total: 65 }], days });
  assert.equal(overview.target, 455);
  assert.deepEqual(inspectionRollingRange(7, new Date(2026, 0, 3, 12)), { start: '2025-12-28', end: '2026-01-03' });
});

test('pending drilldown includes only unfinished scopes and reconciles exactly to the card', () => {
  const users = { d: { rows: [row('SWEEPING', 'w1', 10, 5, 3), row('TOILET', 'w2', 5, 5, 5)] } };
  const overview = summarize({ users });
  assert.equal(overview.pending, 7);
  assert.equal(overview.pendingRows.reduce((sum, row) => sum + row.pending, 0), overview.pending);
  assert.deepEqual(overview.pendingRows.map(row => [row.module, row.wardId, row.pending]), [['SWEEPING', 'w1', 2], ['LITTERBINS', 'w1', 5]]);
  assert.equal(summarize({ users, wardId: 'w2' }).pendingRows.length, 0);
  assert.equal(summarize({ users: null }).pendingRows.length, 0);
});
