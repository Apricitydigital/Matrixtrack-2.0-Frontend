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
  } finally { global.fetch = originalFetch; }
});
