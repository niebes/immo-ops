import test from 'node:test';
import assert from 'node:assert/strict';
import { tsvField, toHistoryLine } from '../lib/tsv.mjs';

test('tsvField collapses tab/newline/CR runs to a single space', () => {
  assert.equal(tsvField('a\tb'), 'a b');
  assert.equal(tsvField('a\t\t\nb'), 'a b');
  assert.equal(tsvField('a\r\nb'), 'a b');
  assert.equal(tsvField('plain'), 'plain');
});

test('tsvField maps null/undefined to empty string', () => {
  assert.equal(tsvField(null), '');
  assert.equal(tsvField(undefined), '');
});

test('toHistoryLine round-trip: tabs/newlines in title stay in 9 columns', () => {
  const listing = {
    url: 'https://example.com/expose/123',
    portal: 'ImmoScout24',
    title: 'Schöne\t3-Zimmer\nWohnung\r\nin Golm',
    location: 'Golm,\tPotsdam',
    price: 1200,
    m2: 75,
    rooms: 3,
  };
  const line = toHistoryLine(listing, 'added', '2026-07-06');
  const cols = line.split('\t');
  assert.equal(cols.length, 9);
  assert.deepEqual(cols, [
    'https://example.com/expose/123',
    '2026-07-06',
    'ImmoScout24',
    'Schöne 3-Zimmer Wohnung in Golm',
    'Golm, Potsdam',
    '1200',
    '75',
    '3',
    'added',
  ]);
});

test('toHistoryLine handles missing optional fields', () => {
  const line = toHistoryLine({ url: 'https://x.de/1', portal: 'P', title: 'T' }, 'skipped_criteria', '2026-07-06');
  const cols = line.split('\t');
  assert.equal(cols.length, 9);
  assert.equal(cols[4], ''); // location
  assert.equal(cols[5], ''); // price
  assert.equal(cols[8], 'skipped_criteria');
});
