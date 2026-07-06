import test from 'node:test';
import assert from 'node:assert/strict';
import { hood, locAgree } from '../lib/geo.mjs';

test('hood extracts the neighbourhood token', () => {
  assert.equal(hood('Waldstadt I, Potsdam'), 'waldstadt i');
  assert.equal(hood('Golm, Potsdam (14476)'), 'golm');
  assert.equal(hood('Babelsberg Nord, Potsdam'), 'babelsberg nord');
});

test('hood: bare city name carries no neighbourhood signal', () => {
  assert.equal(hood('Potsdam'), '');
  assert.equal(hood('Berlin'), '');
  assert.equal(hood(''), '');
  assert.equal(hood(null), '');
});

test('hood strips PLZ', () => {
  assert.equal(hood('14476 Golm'), 'golm');
  assert.equal(hood('Golm (14476), Potsdam'), 'golm');
});

test('locAgree: discriminator tokens veto near-identical Ortsteile', () => {
  assert.equal(locAgree('Waldstadt I, Potsdam', 'Waldstadt II, Potsdam'), false);
  assert.equal(locAgree('Babelsberg Nord, Potsdam', 'Babelsberg Süd, Potsdam'), false);
  // A bare vs qualified form is ambiguous-by-discriminator too.
  assert.equal(locAgree('Babelsberg, Potsdam', 'Babelsberg Nord, Potsdam'), false);
});

test('locAgree: same neighbourhood', () => {
  assert.equal(locAgree('Golm, Potsdam', 'Golm (14476), Potsdam'), true);
  // One side a more detailed form of the other, no discriminator conflict.
  assert.equal(locAgree('Am Stern, Potsdam', 'Stern, Potsdam'), true);
});

test('locAgree: clearly different neighbourhoods', () => {
  assert.equal(locAgree('Nauener Vorstadt, Potsdam', 'Babelsberg Nord, Potsdam'), false);
});

test('locAgree: unknown neighbourhood yields null, not a match', () => {
  assert.equal(locAgree('Potsdam', 'Golm, Potsdam'), null);
  assert.equal(locAgree('', 'Golm, Potsdam'), null);
});
