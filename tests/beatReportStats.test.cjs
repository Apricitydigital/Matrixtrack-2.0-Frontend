require('./helpers/registerTs.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesBeatFilter, reportStatusForBeatFilter } = require('../lib/beatReportStats.ts');
const beats = [
  { id: 'a', covered: true, reportCounts: { submitted: 30, pendingReview: 4, cleaned: 26 } },
  { id: 'b', covered: false, reportCounts: { draft: 2 } },
  { id: 'c', covered: false, reportCounts: {} },
];

test('Submitted Reports and Pending Review filter beats once despite many matching reports', () => {
  assert.deepEqual(beats.filter(beat => matchesBeatFilter(beat, 'submitted')).map(beat => beat.id), ['a']);
  assert.deepEqual(beats.filter(beat => matchesBeatFilter(beat, 'pendingReview')).map(beat => beat.id), ['a']);
  assert.deepEqual(beats.filter(beat => matchesBeatFilter(beat, 'draft')).map(beat => beat.id), ['b']);
  assert.deepEqual(beats.filter(beat => matchesBeatFilter(beat, 'resolved')), []);
});

test('Pending Beats means missing coverage, while Pending Review pages only submitted reports awaiting review', () => {
  assert.deepEqual(beats.filter(beat => matchesBeatFilter(beat, 'pending')).map(beat => beat.id), ['b', 'c']);
  assert.equal(reportStatusForBeatFilter('pending'), undefined);
  assert.equal(reportStatusForBeatFilter('pendingReview'), 'pendingReview');
  assert.equal(reportStatusForBeatFilter('draft'), 'draft');
});
