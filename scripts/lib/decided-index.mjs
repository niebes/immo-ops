/**
 * decided-index.mjs — match freshly-scanned candidates against tracker entries
 * the user has ALREADY decided on, so a re-listing of a rejected / contacted /
 * applied flat folds back into that same lead instead of being re-evaluated and
 * re-notified as if it were new.
 *
 * Why this exists: URL dedup (lib/seen-urls.mjs) only catches identical URLs, and
 * the cross-portal similarity net (dedup-core.mjs) runs within a single scan batch
 * and vetoes same-portal matches. Neither consults data/listings.md status. A flat
 * that re-lists under a new expose ID (same or different portal, tweaked price)
 * therefore slips through as brand-new. This module closes that gap by treating the
 * tracker status as the authority: the user marks a flat once, and every future
 * re-appearance is routed by that status.
 *
 * Covered by scripts/test/decided-index.test.mjs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { locAgree } from './geo.mjs';
import { parseListingRow } from './listings-md.mjs';

// Status routing (canonical names from templates/states.yml):
//  - SKIP: a terminal decision by the user/landlord that a re-list must NOT undo.
//    (Expired is deliberately NOT here — a re-list of an expired flat means it is
//     available again and SHOULD be re-evaluated.)
export const SKIP_STATUSES = new Set(['Rejected', 'Discarded', 'Accepted']);
//  - ATTACH: an in-flight lead; a re-list belongs to it and feeds the follow-through
//    watchdog (next-actions.mjs) rather than starting a fresh evaluation.
export const ATTACH_STATUSES = new Set([
  'Interested', 'Swap-candidate', 'Contacted', 'Viewing', 'Viewed', 'Applied',
]);
export const DECIDED_STATUSES = new Set([...SKIP_STATUSES, ...ATTACH_STATUSES]);

// German/mixed number parse: "1.450,25" → 1450.25, "78,37" → 78.37, "1200" → 1200,
// "1450.25 EUR" → 1450.25. A dot is a thousands sep only before exactly 3 digits.
export function toNum(s) {
  if (s == null) return 0;
  const cleaned = String(s).replace(/[^\d.,]/g, '');
  return parseFloat(
    cleaned.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'),
  ) || 0;
}

/**
 * Load decided tracker entries from data/listings.md.
 * Columns: # | Date | Portal | Type | Location | Price | m² | Rooms | Score | Status | Report | Notes
 * Only rows whose Status is in DECIDED_STATUSES are returned.
 */
export function loadDecidedListings(root) {
  const path = `${root}/data/listings.md`;
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = parseListingRow(line);
    if (c.length < 10) continue;
    const num = c[0];
    if (!/^\d+$/.test(num)) continue; // skip header + separator rows
    const status = c[9];
    if (!DECIDED_STATUSES.has(status)) continue;
    out.push({
      num,
      status,
      portal: c[2] || '',
      location: (c[4] || '').toLowerCase(),
      price: toNum(c[5]),
      m2: toNum(c[6]),
      rooms: toNum(c[7]),
      skip: SKIP_STATUSES.has(status),
    });
  }
  return out;
}

/**
 * Is candidate `a` (a freshly-scanned listing) the same physical flat as a
 * decided tracker entry `b`? Same matching thresholds as dedup-core.isSimilar
 * (price Δ<5% + m² Δ≤3, rooms equal when neighbourhood is unknown) BUT:
 *  - same-portal matches ARE allowed (a flat re-lists on the same portal under a
 *    new ID — e.g. two ab-ins-zuhause UUIDs for one flat), and
 *  - there is no URL-equality veto (URL dedup already runs upstream; a candidate
 *    that reaches here has a new URL by definition).
 * Returns false | 'confirmed' | 'numeric'.
 */
export function matchesDecided(a, b) {
  const loc = locAgree(a.location, b.location); // true | false | null
  if (loc === false) return false; // KNOWN-different neighbourhoods → hard veto

  const priceMatch = a.price > 0 && b.price > 0 &&
    Math.abs(a.price - b.price) / Math.max(a.price, b.price) < 0.05;
  const sizeMatch = a.m2 > 0 && b.m2 > 0 && Math.abs(a.m2 - b.m2) <= 3;
  if (!priceMatch || !sizeMatch) return false;

  if (loc === true) return 'confirmed';
  return a.rooms > 0 && a.rooms === b.rooms ? 'numeric' : false;
}

/**
 * Find the best decided-entry match for a candidate.
 * Prefers a 'confirmed' (neighbourhood-agreeing) match over a 'numeric' one.
 * Returns { entry, kind } or null.
 */
export function findDecidedMatch(candidate, decidedList) {
  let numericHit = null;
  for (const entry of decidedList) {
    const kind = matchesDecided(candidate, entry);
    if (kind === 'confirmed') return { entry, kind };
    if (kind === 'numeric' && !numericHit) numericHit = { entry, kind };
  }
  return numericHit;
}
