import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toNum, matchesDecided, findDecidedMatch, findBestMatch, matchCloseness,
  titleTokens, titlesConflict, reportPathFromCell,
  SKIP_STATUSES, ATTACH_STATUSES, DECIDED_STATUSES,
} from '../lib/decided-index.mjs';

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

// ── Regression: the false ATTACH of 2026-08-07 ──────────────────────────────
// A re-list of the Evaluated #510 was welded onto the Swap-candidate #251
// because non-decided rows were invisible to the matcher and the first numeric
// hit won. Both halves of the fix are exercised here.

const RELIST_510 = {
  location: '14480 potsdam', price: 1281.98, m2: 76.84, rooms: 3,
  title: 'Tolles Angebot: 2,5-Zimmer-Wohnung in begehrter Lage',
};
// #510 is Evaluated, so it is in the pool but not routable.
const ROW_510 = {
  num: '510', status: 'Evaluated', decided: false, skip: false,
  location: 'brunnenviertel (brunnenallee 3a), 14478 potsdam',
  price: 1281.98, m2: 76.84, rooms: 3,
};
const ROW_251 = {
  num: '251', status: 'Swap-candidate', decided: true, skip: false,
  location: 'potsdam west, potsdam', price: 1250, m2: 77, rooms: 3,
};

test('findBestMatch: the closest row wins even when it is not decided', () => {
  // File order deliberately puts the decided row first — the old first-hit
  // loop returned #251 here.
  const hit = findBestMatch(RELIST_510, [ROW_251, ROW_510]);
  assert.equal(hit.entry.num, '510');
  assert.equal(hit.entry.decided, false); // caller leaves it pending
});

test('matchCloseness ranks an exact twin ahead of a merely-similar row', () => {
  assert.ok(matchCloseness(RELIST_510, ROW_510) < matchCloseness(RELIST_510, ROW_251));
  assert.equal(matchCloseness(RELIST_510, ROW_510), 0);
});

test('findBestMatch: a decided row still routes when it IS the closest', () => {
  const hit = findBestMatch(RELIST_510, [ROW_251]);
  assert.equal(hit.entry.num, '251'); // pool without the true twin — unchanged behaviour
  assert.equal(hit.entry.decided, true);
});

test('titleTokens drops generic and category words, keeps distinctive ones', () => {
  // Every swap ad shares "Tauschwohnung"; only the Ortsteil distinguishes them.
  assert.deepEqual([...titleTokens('Tauschwohnung 3 Zimmer Golm')], ['golm']);
  assert.equal(titleTokens('Tolle 3-Zimmer-Wohnung in bester Lage').size, 0); // wholly generic
});

test('titlesConflict vetoes only when both titles are distinctive and disjoint', () => {
  assert.equal(titlesConflict('Tauschwohnung 3 Zimmer Golm',
    'Tauschwohnung: Tausche Indexmiet-Wohnung im Waldparkquartier'), true);
  assert.equal(titlesConflict('Wohnen am Griebnitzsee', 'Wohnen am Griebnitzsee, saniert'), false);
  // Fails open: a generic title can never veto.
  assert.equal(titlesConflict('Tolle Wohnung in bester Lage', 'Tauschwohnung Golm'), false);
  assert.equal(titlesConflict('', 'Tauschwohnung Golm'), false);
});

test('findBestMatch: title conflict vetoes a numeric-only match', () => {
  const swapCand = { location: '14476 potsdam', price: 900, m2: 60, rooms: 3, title: 'Tauschwohnung 3 Zimmer Golm' };
  const oldSwap = {
    num: '4', status: 'Discarded', decided: true, skip: true,
    location: 'potsdam', price: 900, m2: 60, rooms: 3,
    title: 'Tauschwohnung: Tausche Indexmiet-Wohnung im Waldparkquartier',
  };
  const titleConflict = (c, e) => titlesConflict(c.title, e.title);
  assert.equal(findBestMatch(swapCand, [oldSwap], { titleConflict }), null); // veto → not auto-skipped
  assert.ok(findBestMatch(swapCand, [oldSwap]) !== null);                    // without it, the old false SKIP
});

test('reportPathFromCell extracts the markdown link target', () => {
  assert.equal(reportPathFromCell('[510](reports/510-potsdam-brunnenviertel-3r-2026-08-04.md)'),
    'reports/510-potsdam-brunnenviertel-3r-2026-08-04.md');
  assert.equal(reportPathFromCell(''), '');
  assert.equal(reportPathFromCell('-'), '');
});
