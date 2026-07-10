import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePipelineLine, isSimilar } from '../lib/dedup-core.mjs';

// ── parsePipelineLine ────────────────────────────────────────────────

test('parse: new-format line with all fields', () => {
  const e = parsePipelineLine('- [ ] https://x.de/expose/1 | ImmoScout24 | Potsdam flat rental | Schöne Wohnung | 1.500 EUR | 86 m² | 3 Zi | Babelsberg, Potsdam');
  assert.equal(e.url, 'https://x.de/expose/1');
  assert.equal(e.portal, 'ImmoScout24');
  assert.equal(e.group, 'Potsdam flat rental');
  assert.equal(e.price, 1500);
  assert.equal(e.m2, 86);
  assert.equal(e.rooms, 3);
  assert.equal(e.location, 'babelsberg, potsdam');
});

test('parse: old-format line (real data) degrades gracefully — no location, rooms from title', () => {
  const e = parsePipelineLine('- [ ] https://www.vonovia.de/z/82-1 | Vonovia Potsdam | Potsdam flat rental | 3-Zimmerwohnung mit Balkon in bester Lage! | 805.74 EUR | 60.13 m²');
  assert.equal(e.price, 805.74);
  assert.equal(e.m2, 60.13);
  assert.equal(e.rooms, 3); // from "3-Zimmerwohnung" in the title
  assert.equal(e.location, '');
});

test('parse: field order does not matter (shape-classified)', () => {
  const e = parsePipelineLine('- [ ] https://x.de/1 | P | G | T | Golm, Potsdam | 3 Zi | 61.1 m² | 536 EUR');
  assert.equal(e.price, 536);
  assert.equal(e.m2, 61.1);
  assert.equal(e.rooms, 3);
  assert.equal(e.location, 'golm, potsdam');
});

test('parse: location containing PLZ digits is not mistaken for a numeric field', () => {
  const e = parsePipelineLine('- [ ] https://x.de/1 | P | G | T | 1500 EUR | Golm (14476), Potsdam');
  assert.equal(e.price, 1500);
  assert.equal(e.location, 'golm (14476), potsdam');
});

test('parse: German decimal comma in fields', () => {
  const e = parsePipelineLine('- [ ] https://x.de/1 | P | G | T | 571,65 EUR | 60,83 m² | 3 Zi');
  assert.equal(e.price, 571.65);
  assert.equal(e.m2, 60.83);
});

test('parse: non-pending lines return null', () => {
  assert.equal(parsePipelineLine('- [x] DONE | https://x.de/1'), null);
  assert.equal(parsePipelineLine('## Pending'), null);
  assert.equal(parsePipelineLine(''), null);
});

// ── isSimilar ────────────────────────────────────────────────────────

const base = { source: 'pipeline', url: 'https://a.de/1', portal: 'ImmoScout24', price: 1200, m2: 80, rooms: 3, location: 'kirchsteigfeld, potsdam' };
const mk = (over) => ({ ...base, ...over });

test('isSimilar: confirmed-hood match across portals', () => {
  const r = isSimilar(base, mk({ url: 'https://b.de/2', portal: 'Kleinanzeigen', price: 1199, m2: 79.5, location: 'potsdam kirchsteigfeld' }));
  assert.equal(r, 'confirmed');
});

test('isSimilar: same portal / same URL are never cross-portal dupes', () => {
  assert.equal(isSimilar(base, mk({ url: 'https://b.de/2' })), false); // same portal
  assert.equal(isSimilar(base, mk({ portal: 'Immowelt' , url: base.url })), false); // same URL
});

test('isSimilar: KNOWN-different neighbourhoods hard-veto even a perfect numeric match', () => {
  const r = isSimilar(base, mk({ url: 'https://b.de/2', portal: 'Immowelt', location: 'babelsberg nord, potsdam' }));
  assert.equal(r, false);
});

test('isSimilar: numeric fallback fires when either location is unknown (the resurrected path)', () => {
  const r = isSimilar(mk({ location: '' }), mk({ url: 'https://b.de/2', portal: 'Immowelt', location: '', price: 1210, m2: 82 }));
  assert.equal(r, 'numeric');
});

test('isSimilar: numeric fallback requires rooms present and equal', () => {
  const a = mk({ location: '' });
  assert.equal(isSimilar(a, mk({ url: 'https://b.de/2', portal: 'Immowelt', location: '', rooms: 4 })), false);
  assert.equal(isSimilar(mk({ location: '', rooms: 0 }), mk({ url: 'https://b.de/2', portal: 'Immowelt', location: '', rooms: 0 })), false);
});

test('isSimilar: price tolerance is 5%, size tolerance 3 m²', () => {
  const a = mk({ location: '' });
  // 6% price gap → no match
  assert.equal(isSimilar(a, mk({ url: 'https://b.de/2', portal: 'Immowelt', location: '', price: 1275 })), false);
  // 4 m² gap → no match
  assert.equal(isSimilar(a, mk({ url: 'https://b.de/2', portal: 'Immowelt', location: '', m2: 84.5 })), false);
});

test('isSimilar: missing price or m² blocks any match (never match on absence)', () => {
  assert.equal(isSimilar(mk({ price: 0, location: '' }), mk({ url: 'https://b.de/2', portal: 'Immowelt', price: 0, location: '' })), false);
  assert.equal(isSimilar(mk({ m2: 0, location: '' }), mk({ url: 'https://b.de/2', portal: 'Immowelt', m2: 0, location: '' })), false);
});
