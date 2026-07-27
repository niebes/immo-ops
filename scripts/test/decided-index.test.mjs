import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toNum, matchesDecided, findDecidedMatch, SKIP_STATUSES, ATTACH_STATUSES, DECIDED_STATUSES } from '../lib/decided-index.mjs';

test('toNum parses German and mixed formats', () => {
  assert.equal(toNum('1.450,25'), 1450.25);
  assert.equal(toNum('78,37'), 78.37);
  assert.equal(toNum('1200'), 1200);
  assert.equal(toNum('900 EUR'), 900);
  assert.equal(toNum('93,78 m²'), 93.78);
  assert.equal(toNum('-'), 0);
  assert.equal(toNum(''), 0);
});

test('status sets: Expired is NOT decided (re-list of expired should re-evaluate)', () => {
  assert.ok(SKIP_STATUSES.has('Rejected') && SKIP_STATUSES.has('Discarded') && SKIP_STATUSES.has('Accepted'));
  assert.ok(ATTACH_STATUSES.has('Contacted') && ATTACH_STATUSES.has('Applied') && ATTACH_STATUSES.has('Viewing'));
  assert.ok(!DECIDED_STATUSES.has('Expired'));
  assert.ok(!DECIDED_STATUSES.has('New'));
  assert.ok(!DECIDED_STATUSES.has('Evaluated'));
});

test('matchesDecided: same DIBOLIVING Golm flat across portals, price tweaked', () => {
  const cand = { location: 'potsdam-golm', price: 900, m2: 78, rooms: 3 }; // #477 kleinanzeigen
  const decided = { location: 'potsdam-golm', price: 870, m2: 78.37, rooms: 3 }; // #363 süddeutsche
  assert.equal(matchesDecided(cand, decided), 'confirmed'); // 3.3% price Δ, 0.37 m² Δ, hood agrees
});

test('matchesDecided: same-portal re-list (both ab-ins-zuhause) still matches', () => {
  const cand = { location: 'potsdam-bornstedt', price: 1450.25, m2: 93.78, rooms: 3 };
  const decided = { location: 'potsdam-bornstedt', price: 1450.25, m2: 93.78, rooms: 3 };
  // No same-portal veto here (unlike dedup-core.isSimilar) — this is the point.
  assert.equal(matchesDecided(cand, decided), 'confirmed');
});

test('matchesDecided: KNOWN-different neighbourhood hard-vetoes a perfect numeric match', () => {
  const cand = { location: 'bornstedt, potsdam', price: 1200, m2: 80, rooms: 3 };
  const decided = { location: 'babelsberg, potsdam', price: 1200, m2: 80, rooms: 3 };
  assert.equal(matchesDecided(cand, decided), false);
});

test('matchesDecided: price gap beyond 5% is not a match', () => {
  const cand = { location: 'potsdam-golm', price: 900, m2: 78, rooms: 3 };
  const decided = { location: 'potsdam-golm', price: 1000, m2: 78, rooms: 3 };
  assert.equal(matchesDecided(cand, decided), false);
});

test('matchesDecided: unknown location falls back to numeric (rooms must match)', () => {
  const cand = { location: '', price: 900, m2: 78, rooms: 3 };
  const decided = { location: '', price: 905, m2: 79, rooms: 3 };
  assert.equal(matchesDecided(cand, decided), 'numeric');
  const roomsDiffer = { location: '', price: 905, m2: 79, rooms: 4 };
  assert.equal(matchesDecided(cand, roomsDiffer), false);
});

test('findDecidedMatch prefers a confirmed match over a numeric one', () => {
  const cand = { location: 'potsdam-golm', price: 900, m2: 78, rooms: 3 };
  const list = [
    { num: '10', status: 'Contacted', location: '', price: 900, m2: 78, rooms: 3 }, // numeric
    { num: '20', status: 'Discarded', location: 'potsdam-golm', price: 890, m2: 79, rooms: 3 }, // confirmed
  ];
  const hit = findDecidedMatch(cand, list);
  assert.equal(hit.entry.num, '20');
  assert.equal(hit.kind, 'confirmed');
});
