const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
const { buildPlantInsights } = require('../src/services/plantInsights.ts');
const plant = (id, extra = {}) => ({ plantId: id, plantName: id, unit: 'MT', received: 100, recovered: 60, reject: 10, processLoss: 20, efficiency: 60, daysReported: 2, daysInRange: 3, ...extra });

test('input shares use only supplied quantities, preserve the tail, and keep units separate', () => {
  const rows = Array.from({ length: 8 }, (_, i) => plant(String(i), { received: (i + 1) * 10 }));
  const x = buildPlantInsights([...rows, plant('unknown', { receivedAvailable: false, received: 999 }), plant('liquid', { unit: 'KL', received: 999 })], 'MT');
  assert.equal(x.input.total, 360);
  assert.equal(x.input.topShare, 150 / 360 * 100);
  assert.equal(x.input.segments.reduce((n, s) => n + s.value, 0), 360);
  assert.equal(x.input.segments.at(-1).value, 60);
  assert.equal(x.input.unknown, 1);
});
test('reporting gaps use plant-days and never treat unknown or invalid counts as zero', () => {
  const x = buildPlantInsights([plant('zero', { daysReported: 0 }), plant('monthly', { daysReported: 3, reportingGranularity: 'MONTHLY' }), plant('unknown', { daysReported: undefined }), plant('invalid', { daysReported: 8 }), plant('none', { daysInRange: 0 })], 'MT');
  assert.equal(x.reporting.expected, 6);
  assert.equal(x.reporting.reported, 3);
  assert.equal(x.reporting.missing, 3);
  assert.equal(x.reporting.unknown, 3);
  assert.equal(x.reporting.complete, 1);
  assert.equal(x.reporting.gaps, 1);
});
test('balance differences do not cancel and missing loss or energy outputs are excluded', () => {
  const x = buildPlantInsights([plant('positive'), plant('negative', { processLoss: 40 }), plant('missing', { processLossAvailable: false }), plant('energy', { materialComparable: false, efficiencyAvailable: false })], 'MT');
  assert.equal(x.balance.absolute, 20);
  assert.equal(x.balance.checked, 2);
  assert.equal(x.balance.excluded, 2);
  assert.deepEqual(x.balance.rows.map(r => r.delta), [10, -10]);
});
test('recovery uses comparable measurements, preserves real zero and rates above 100%', () => {
  const x = buildPlantInsights([plant('zero', { recovered: 0 }), plant('over', { recovered: 125 }), plant('missing', { recoveredAvailable: false }), plant('energy', { materialComparable: false })], 'MT');
  assert.equal(x.recovery.count, 2);
  assert.equal(x.recovery.spread, 125);
  assert.equal(x.recovery.scale, 125);
  assert.deepEqual(x.recovery.rows.map(r => r.efficiency), [0, 125]);
  assert.equal(buildPlantInsights([], 'MT').input.topShare, null);
  assert.equal(buildPlantInsights([plant('single')], 'MT').recovery.spread, null);
});
