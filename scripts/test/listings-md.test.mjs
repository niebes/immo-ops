import test from 'node:test';
import assert from 'node:assert/strict';
import { parseListingRow } from '../lib/listings-md.mjs';

test('normal row parses into positional cells', () => {
  const row = '| 001 | 2026-05-13 | Immowelt | Wohnung | Bornstedt, Potsdam | 990 | 101 | 3 | 3.4 | Evaluated | [001](reports/001.md) | note |';
  const cols = parseListingRow(row);
  assert.equal(cols.length, 12);
  assert.equal(cols[0], '001');
  assert.equal(cols[2], 'Immowelt');
  assert.equal(cols[9], 'Evaluated');
  assert.equal(cols[10], '[001](reports/001.md)');
});

test('empty interior cell keeps column alignment (no filter(Boolean) shift)', () => {
  // Rooms cell empty (e.g. a Grundstück) — Status must still land at index 9.
  const row = '| 007 | 2026-06-01 | BVVG | Grundstück | Golm | 95000 | 800 |  | 2.5 | Discarded | [007](reports/007.md) |  |';
  const cols = parseListingRow(row);
  assert.equal(cols.length, 12);
  assert.equal(cols[7], '');            // empty Rooms preserved
  assert.equal(cols[8], '2.5');         // Score not shifted
  assert.equal(cols[9], 'Discarded');   // Status at the right index
  assert.equal(cols[10], '[007](reports/007.md)');
});

test('row with trailing pipe and whitespace', () => {
  const row = '  | 002 | 2026-05-14 | ImmoScout24 | Wohnung | Babelsberg | 1500 | 80 | 3 | 4.1 | Interested | [002](reports/002.md) | good |  ';
  const cols = parseListingRow(row);
  assert.equal(cols[0], '002');
  assert.equal(cols[11], 'good');
});
