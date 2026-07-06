import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSearchUrl, findProfileSearch } from '../lib/search-url.mjs';

const search = {
  name: 'Potsdam flat rental',
  price: { max_kaltmiete: 1900 },
  size: { min_rooms: 3, min_m2: 70 },
};

test('resolveSearchUrl substitutes profile placeholders', () => {
  const { url, unresolved } = resolveSearchUrl(
    'https://x.de/suche?price=-{price_max}&rooms={rooms_min}-&size={size_min}-',
    search,
  );
  assert.equal(url, 'https://x.de/suche?price=-1900&rooms=3-&size=70-');
  assert.deepEqual(unresolved, []);
});

test('resolveSearchUrl leaves unknown/valueless placeholders literal and reports them', () => {
  const { url, unresolved } = resolveSearchUrl(
    'https://x.de/suche?price=-{price_max}&max={size_max}',
    search, // no size.max_m2 → {size_max} unresolvable
  );
  assert.equal(url, 'https://x.de/suche?price=-1900&max={size_max}');
  assert.deepEqual(unresolved, ['size_max']);
});

test('resolveSearchUrl with no search entry reports all placeholders', () => {
  const { url, unresolved } = resolveSearchUrl('https://x.de/?p={price_max}', null);
  assert.equal(url, 'https://x.de/?p={price_max}');
  assert.deepEqual(unresolved, ['price_max']);
});

test('resolveSearchUrl passes through URLs without placeholders', () => {
  const { url, unresolved } = resolveSearchUrl('https://x.de/suche', search);
  assert.equal(url, 'https://x.de/suche');
  assert.deepEqual(unresolved, []);
});

test('findProfileSearch matches by group name, falls back to first enabled', () => {
  const profile = { searches: [
    { name: 'A', enabled: false },
    { name: 'B' },
    { name: 'C' },
  ] };
  assert.equal(findProfileSearch(profile, 'C').name, 'C');
  assert.equal(findProfileSearch(profile, 'nope').name, 'B'); // first enabled fallback
  assert.equal(findProfileSearch(null, 'B'), null);            // missing profile
  assert.equal(findProfileSearch({}, 'B'), null);
});
