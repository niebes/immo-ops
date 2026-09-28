import test from 'node:test';
import assert from 'node:assert/strict';
import { plzPrefixesFor, outsidePlzRegion } from '../lib/plz-gate.mjs';

const cfg = { search_groups: [{ name: 'G', portals: [{ name: 'Semmelhaack', plz_prefixes: ['14', '13'] }, { name: 'IS24' }] }] };

test('plzPrefixesFor returns only opted-in portals', () => {
  assert.deepEqual(plzPrefixesFor(cfg, 'G', 'Semmelhaack'), ['14', '13']);
  assert.equal(plzPrefixesFor(cfg, 'G', 'IS24'), null);
  assert.equal(plzPrefixesFor(cfg, 'X', 'Semmelhaack'), null);
});

test('outsidePlzRegion gates only on a printed postcode', () => {
  const p = ['14', '13'];
  assert.equal(outsidePlzRegion('Fehlingstr. 53, 23570 Lübeck', p), true);
  assert.equal(outsidePlzRegion('14476 Potsdam-Golm', p), false);
  assert.equal(outsidePlzRegion('Potsdam', p), false);           // no PLZ → keep
  assert.equal(outsidePlzRegion('23570 Lübeck', null), false);   // not opted in
  assert.equal(outsidePlzRegion('Tel 0331123456 14476', p), false); // 10-digit number is not a PLZ; 14476 is
});
