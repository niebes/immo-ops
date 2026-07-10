/**
 * dedup-core.mjs — parsing + similarity logic for the cross-portal duplicate
 * detector, extracted from dedup-listings.mjs so it is unit-testable (the same
 * split as geo.mjs). The 2026-07 audit found the previous pipeline parser
 * expected a location format the writers never emitted, so location was always
 * '' and isSimilar() could never fire for pipeline entries — the whole
 * cross-portal safety net was silently dead. These functions are now covered
 * by scripts/test/dedup-core.test.mjs.
 */

import { locAgree } from './geo.mjs';

const toNum = (s) => parseFloat(String(s).replace(/\./g, (m, i, str) =>
  // German thousands dot ("1.500") vs decimal dot ("61.1"): treat a dot as a
  // thousands separator only when followed by exactly 3 digits at the end or
  // another separator group.
  /^\d{3}(\D|$)/.test(str.slice(i + 1)) ? '' : m
).replace(',', '.')) || 0;

/**
 * Parse one pipeline entry line into a comparable record, or null when the
 * line is not a pending entry.
 *
 * Format (fields after title conditional — see lib/pipeline-md.mjs):
 *   - [ ] URL | portal | group | title | 1500 EUR | 86 m² | 3 Zi | location
 * Old-format lines (no rooms/location fields) degrade to rooms/location
 * best-effort from the title text — never a crash, never a misparse.
 */
export function parsePipelineLine(line) {
  if (!line.startsWith('- [ ]')) return null;
  const parts = line.split('|').map((s) => s.trim());
  const url = (parts[0].match(/https?:\/\/[^\s|]+/) || [])[0] || '';
  const portal = parts[1] || '';
  const group = parts[2] || '';
  const title = parts[3] || '';

  // Shape-classify everything after the title: order-independent, tolerant of
  // missing fields, and old-format lines simply have no unclassified field left.
  let price = 0, m2 = 0, rooms = 0, location = '';
  for (const f of parts.slice(4)) {
    if (/^\d[\d.,]*\s*EUR$/.test(f)) price = toNum(f.replace(/\s*EUR$/, ''));
    else if (/^[\d.,]+\s*m²$/.test(f)) m2 = toNum(f.replace(/\s*m²$/, ''));
    else if (/^\d+(?:[.,]\d+)?\s*Zi$/.test(f)) rooms = toNum(f.replace(/\s*Zi$/, ''));
    else if (f) location = f;
  }
  // Old-format fallback: rooms often only survive inside the title.
  if (!rooms) {
    const m = title.match(/(\d+(?:[.,]\d+)?)[\s-]*(?:Zi|Zimmer|Raum|Räume)/i);
    if (m) rooms = toNum(m[1]);
  }
  return { source: 'pipeline', line, url, portal, group, title, price, m2, rooms, location: location.toLowerCase() };
}

/**
 * Same flat listed on two portals?
 *  - identical URL / same portal → never a cross-portal dupe
 *  - locAgree === false (KNOWN-different neighbourhoods) → hard veto, always
 *  - locAgree === true  → price Δ<5% + m² Δ≤3 suffices (confirmed-hood path)
 *  - locAgree === null  (either location unknown) → numeric fallback: the same
 *    price/size tolerances AND rooms must be present and equal. Rooms equality
 *    is mandatory for the blind match — price+size coincidences across a small
 *    market are real, price+size+rooms across different portals rarely are.
 *    Callers should tag these matches as numeric-only in their output.
 * Returns false | 'confirmed' | 'numeric'.
 */
export function isSimilar(a, b) {
  if (a.url && b.url && a.url === b.url) return false;
  if (a.portal === b.portal) return false;

  const loc = locAgree(a.location, b.location); // true | false | null
  if (loc === false) return false;

  const priceMatch = a.price > 0 && b.price > 0 &&
    Math.abs(a.price - b.price) / Math.max(a.price, b.price) < 0.05;
  const sizeMatch = a.m2 > 0 && b.m2 > 0 && Math.abs(a.m2 - b.m2) <= 3;
  if (!priceMatch || !sizeMatch) return false;

  if (loc === true) return 'confirmed';
  return a.rooms > 0 && a.rooms === b.rooms ? 'numeric' : false;
}
