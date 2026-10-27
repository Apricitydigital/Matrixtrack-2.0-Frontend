require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(request, parent, ...args) {
  if (request === '@lib/auth') return { getStoredToken: () => 'test-token' };
  if (request === '@lib/session') return { clearPersistedAccessToken() {}, clearPersistedUserSnapshot() {} };
  return originalLoad.call(this, request, parent, ...args);
};
const { ModuleRecordsApi } = require('../lib/apiClient.ts');
Module._load = originalLoad;
const { loadInspectionRecords } = require('../lib/inspectionRecords.ts');

test('opening a beat requests only its submitted reports, preserving date range and page', async () => {
  const originalFetch = global.fetch;
  let requested;
  global.fetch = async (url, init) => {
    requested = { url: new URL(url), init };
    return { ok: true, json: async () => ({ data: [{ id: 'r1' }], meta: { total: 21, page: 2, limit: 20, totalPages: 2 } }) };
  };
  try {
    const response = await ModuleRecordsApi.getRecords('SWEEPING', { beatId: 'beat-a', fromDate: '2026-10-26T18:30:00.000Z', toDate: '2026-10-27T18:29:59.999Z', page: 2, limit: 20, tab: 'HISTORY' });
    assert.equal(requested.url.pathname, '/modules/SWEEPING/records');
    assert.equal(requested.url.searchParams.get('beatId'), 'beat-a');
    assert.equal(requested.url.searchParams.get('startDate'), '2026-10-26T18:30:00.000Z');
    assert.equal(requested.url.searchParams.get('endDate'), '2026-10-27T18:29:59.999Z');
    assert.equal(requested.url.searchParams.get('page'), '2');
    assert.equal(requested.url.searchParams.get('limit'), '20');
    assert.equal(requested.init.headers.Authorization, 'Bearer test-token');
    assert.equal(response.meta.total, 21);
    assert.equal(response.data[0].id, 'r1');
    await ModuleRecordsApi.getRecords('SWEEPING', { beatId: 'beat-a', beatReportStatus: 'pendingReview', page: 2, limit: 20, tab: 'HISTORY' });
    assert.equal(requested.url.searchParams.get('beatReportStatus'), 'pendingReview');
    assert.equal(requested.url.searchParams.get('beatId'), 'beat-a');
    assert.equal(requested.url.searchParams.get('page'), '2');
  } finally { global.fetch = originalFetch; }
});

test('inspection analytics includes unreviewed litter-bin inspections rather than QC-only history', async () => {
  const originalFetch = global.fetch;
  const urls = [];
  global.fetch = async url => {
    const parsed = new URL(url); urls.push(parsed);
    const data = parsed.searchParams.get('tab') === 'DAILY_REPORTS'
      ? Array.from({ length: 12 }, (_, index) => ({ id: `visit-${index}`, type: 'VISIT_REPORT', status: 'PENDING_QC' }))
      : [];
    return { ok: true, json: async () => ({ data, meta: { total: data.length } }) };
  };
  try {
    const bins = await loadInspectionRecords('LITTERBINS', { page: 1, limit: 500 });
    assert.equal(bins.data.length, 12);
    assert.ok(bins.data.every(report => report.status === 'PENDING_QC'));
    assert.equal(urls[0].pathname, '/modules/LITTERBINS/records');
    assert.equal(urls[0].searchParams.get('tab'), 'DAILY_REPORTS');
    await loadInspectionRecords('TOILET', { page: 1, limit: 500 });
    assert.equal(urls[1].searchParams.get('tab'), 'HISTORY');
  } finally { global.fetch = originalFetch; }
});
