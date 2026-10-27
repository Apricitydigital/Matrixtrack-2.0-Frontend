require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
require.extensions['.tsx'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  module._compile(outputText, filename);
};
const Cards = require('../components/InspectionOverviewCards.tsx').default;
const overview = { total: 65, target: 455, credit: 120, pending: 335 };

test('shared ULB/Commissioner summary renders Total, Targeted, Completed, Pending in order', () => {
  const html = renderToStaticMarkup(React.createElement(Cards, { overview, days: 7, loading: false, onPending() {} }));
  const labels = ['Total', 'Targeted', 'Completed Inspection', 'Pending Inspection'];
  let last = -1;
  for (const label of labels) {
    const index = html.indexOf(`>${label}<`);
    assert.ok(index > last, `${label} must appear in the intended order`);
    last = index;
  }
  for (const value of [65, 455, 120, 335]) assert.match(html, new RegExp(`>${value}<`));
  assert.match(html, /<button[^>]+aria-label="View pending inspections"/);
  assert.ok(!html.includes('Each beat counts as one asset'));
});

test('summary shows unavailable values and disables pending click while target data is unavailable', () => {
  const html = renderToStaticMarkup(React.createElement(Cards, { overview: { total: 65, target: null, credit: null, pending: null }, days: null, loading: true, onPending() {} }));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /<button[^>]+disabled=""[^>]+aria-label="View pending inspections"/);
  assert.match(html, /Choose a date range/);
});

test('completed card exposes the actual module breakdown rather than implying photo-point totals', () => {
  const html = renderToStaticMarkup(React.createElement(Cards, {
    overview: { total: 65, target: 65, credit: 19, pending: 46, completedByModule: { SWEEPING: 5, TOILET: 2, LITTERBINS: 12 } },
    days: 1, loading: false, onPending() {},
  }));
  assert.match(html, /Sweeping 5 \+ Toilet 2 \+ Litter Bin 12/);
});
