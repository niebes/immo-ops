import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAvailableDate, scoreAvailability } from '../score-listing.mjs';

test('parseAvailableDate handles ISO and German DD.MM.YYYY formats', () => {
  assert.equal(parseAvailableDate('2026-09-01').toISOString().slice(0, 10), '2026-09-01');
  assert.equal(parseAvailableDate('01.09.2026').toISOString().slice(0, 10), '2026-09-01');
  assert.equal(parseAvailableDate('1.9.2026').toISOString().slice(0, 10), '2026-09-01');
});

test('parseAvailableDate treats sofort / ab sofort as immediately available', () => {
  for (const s of ['sofort', 'ab sofort', 'Sofort', 'Ab sofort']) {
    const d = parseAvailableDate(s);
    assert.ok(d instanceof Date && !isNaN(d.getTime()), `${s} should parse`);
    assert.ok(Math.abs(d.getTime() - Date.now()) < 60000, `${s} should be ~now`);
  }
});

test('parseAvailableDate returns null for unparseable input', () => {
  assert.equal(parseAvailableDate('nach Vereinbarung'), null);
  assert.equal(parseAvailableDate(null), null);
});

test('scoreAvailability: unparseable date is neutral 3.0, not 1.5', () => {
  const criteria = { earliest_move_in: '2026-08-01' };
  assert.equal(scoreAvailability({ available_date: 'nach Vereinbarung' }, criteria), 3.0);
});

test('scoreAvailability: German date and sofort score via the normal path', () => {
  const criteria = { earliest_move_in: '2026-08-01' };
  // 15.08.2026 is within the window (no latest bound) → 5.0
  assert.equal(scoreAvailability({ available_date: '15.08.2026' }, criteria), 5.0);
  // sofort with an earliest date in the past → available now → 5.0
  assert.equal(scoreAvailability({ available_date: 'ab sofort' }, { earliest_move_in: '2020-01-01' }), 5.0);
});

test('scoreAvailability: missing inputs stay neutral', () => {
  assert.equal(scoreAvailability({}, { earliest_move_in: '2026-08-01' }), 3.0);
  assert.equal(scoreAvailability({ available_date: '2026-08-01' }, {}), 3.0);
});
