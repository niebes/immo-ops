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
 * Load tracker entries from data/listings.md.
 * Columns: # | Date | Portal | Type | Location | Price | m² | Rooms | Score | Status | Report | Notes
 *
 * ALL rows are returned, not just decided ones — `decided` says whether the row
 * may be routed. This matters: matching must see the whole tracker, because the
 * closest twin of a re-list is frequently a NON-decided row (an `Evaluated` one),
 * and a matcher that cannot see it does not stop — it falls through to the
 * next-best *decided* row and welds the re-list onto an unrelated lead. Loading
 * decided rows only is what caused #502's re-list to attach to the Applied #216
 * (2026-08-03) and #510's to the Swap-candidate #251 (2026-08-07).
 */
export function loadTrackerListings(root) {
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
    out.push({
      num,
      status,
      portal: c[2] || '',
      location: (c[4] || '').toLowerCase(),
      price: toNum(c[5]),
      m2: toNum(c[6]),
      rooms: toNum(c[7]),
      report: c[10] || '',
      decided: DECIDED_STATUSES.has(status),
      skip: SKIP_STATUSES.has(status),
    });
  }
  return out;
}

/** Decided-only view of the tracker (the routable subset). */
export function loadDecidedListings(root) {
  return loadTrackerListings(root).filter((e) => e.decided);
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
 * How close is this match? Lower is better. Combines the relative price gap with
 * the absolute m² gap, both normalised against the thresholds matchesDecided
 * already enforces (5 % and 3 m²), so neither dominates.
 */
export function matchCloseness(a, b) {
  const priceGap = Math.abs(a.price - b.price) / Math.max(a.price, b.price, 1) / 0.05;
  const sizeGap = Math.abs(a.m2 - b.m2) / 3;
  return priceGap + sizeGap;
}

/**
 * Find the best-matching tracker entry for a candidate.
 *
 * Ranks by kind first (a neighbourhood-confirmed match beats a numeric-only one),
 * then by closeness. Ranking is the second half of the false-attach fix: with the
 * whole tracker in the pool, several rows can clear the thresholds at once, and
 * "first row in file order" is not a decision — it is an accident. Yesterday #510
 * matched at Δ 0,00 % / 0,00 m² while #251 matched at Δ 2,49 % / 0,16 m²; ranking
 * is what makes the former win.
 *
 * opts.titleConflict(candidate, entry) — optional veto consulted for numeric-only
 * matches, letting a caller bring the title signal the tracker row itself lacks.
 * Returns { entry, kind } or null.
 */
export function findBestMatch(candidate, list, opts = {}) {
  const { titleConflict } = opts;
  let best = null;
  for (const entry of list) {
    const kind = matchesDecided(candidate, entry);
    if (!kind) continue;
    if (kind === 'numeric' && titleConflict && titleConflict(candidate, entry)) continue;
    const rank = kind === 'confirmed' ? 0 : 1;
    const closeness = matchCloseness(candidate, entry);
    if (!best || rank < best.rank || (rank === best.rank && closeness < best.closeness)) {
      best = { entry, kind, rank, closeness };
    }
  }
  return best ? { entry: best.entry, kind: best.kind } : null;
}

/** Back-compat alias: best match within an already-filtered decided list. */
export function findDecidedMatch(candidate, decidedList, opts = {}) {
  return findBestMatch(candidate, decidedList, opts);
}

// ── Title signal ────────────────────────────────────────────────────────────
// Price and m² cannot tell two similarly-sized flats apart, which is exactly how
// a re-list gets welded onto an unrelated lead — or, in the swap case, auto-
// skipped as a dupe of an old discarded swap in a different Ortsteil. The tracker
// has no title column, but every scored row links a report whose first line reads
// `# Evaluation: {title} — {address}`, so a title IS recoverable per row.
//
// Used ONLY as a veto on numeric-only matches, never as positive evidence, and it
// FAILS OPEN: an unknown or wholly generic title vetoes nothing. The worst case is
// therefore a duplicate evaluation, never a silently dropped listing.

// Category and marketing words carry no identity. "Tauschwohnung" in particular
// must be stopped: it is the one token every swap ad shares, and leaving it in is
// what would let a Golm swap look like the Bornstedt swap #004.
const TITLE_STOPWORDS = new Set([
  'wohnung', 'wohnungen', 'zimmer', 'raum', 'raeume', 'räume', 'haus', 'haushaelfte', 'haushälfte',
  'etage', 'geschoss', 'stock', 'lage', 'angebot', 'objekt', 'immobilie', 'wohnen', 'wohntraum',
  'tauschwohnung', 'wohnungstausch', 'tausche', 'tausch', 'swap', 'nachmieter', 'nachvermietung',
  'untermiete', 'miete', 'mieten', 'vermietung', 'provisionsfrei', 'erstbezug', 'neubau',
  'schoene', 'schöne', 'schoenes', 'schönes', 'tolle', 'tolles', 'toller', 'grosse', 'große',
  'grosses', 'großes', 'grosser', 'großer', 'grosszuegige', 'großzügige', 'gemuetliche',
  'gemütliche', 'moderne', 'modernes', 'moderner', 'attraktive', 'attraktives', 'attraktiver',
  'helle', 'helles', 'ruhige', 'ruhiges', 'charmante', 'exklusive', 'gepflegte', 'renovierte',
  'sanierte', 'begehrter', 'begehrte', 'bester', 'beste', 'traumhafte', 'kompakte', 'barrierearme',
  'sofort', 'frei', 'neue', 'neues', 'neuer', 'inkl', 'mit', 'ohne', 'und', 'oder', 'fuer', 'für',
  'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'einer', 'eines', 'von', 'vom', 'zur', 'zum',
  'auf', 'bei', 'aus', 'ist', 'sehr', 'ihre', 'ihr', 'sie', 'wir', 'ganz', 'top',
]);

/** Distinctive lowercase tokens of a listing title ('' / generic → empty set). */
export function titleTokens(s) {
  const out = new Set();
  for (const raw of String(s || '').toLowerCase().split(/[^a-zäöüß]+/)) {
    if (raw.length < 4) continue;          // drops 'zi', 'og', bare numerals
    if (TITLE_STOPWORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/** true only when BOTH titles are known-and-distinctive and share no token. */
export function titlesConflict(a, b) {
  const ta = titleTokens(a), tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return false; // fail open
  for (const t of ta) if (tb.has(t)) return false;
  return true;
}

/** `[510](reports/510-x.md)` → `reports/510-x.md`; '' when absent. */
export function reportPathFromCell(cell) {
  const m = String(cell || '').match(/\(([^)]*\.md)\)/);
  return m ? m[1] : '';
}

/**
 * Title from a report's `# Evaluation: {title} — {address}` first line.
 * Splits on the LAST em dash — the address is the trailing segment, and titles
 * themselves contain em dashes (e.g. "🔄 SWAP — TAUSCHWOHNUNG …").
 */
export function readReportTitle(root, reportCell) {
  const rel = reportPathFromCell(reportCell);
  if (!rel) return '';
  const path = `${root}/${rel}`;
  if (!existsSync(path)) return '';
  const first = (readFileSync(path, 'utf8').split('\n')[0] || '').trim();
  const heading = first.replace(/^#\s*Evaluation:\s*/i, '');
  if (heading === first) return '';           // not an evaluation report
  const cut = heading.lastIndexOf(' — ');
  return (cut > 0 ? heading.slice(0, cut) : heading).trim();
}

/** Memoised title lookup for a tracker entry, for use as findBestMatch's veto. */
export function makeTitleConflict(root) {
  const cache = new Map();
  return (candidate, entry) => {
    if (!cache.has(entry.num)) cache.set(entry.num, readReportTitle(root, entry.report));
    return titlesConflict(candidate.title, cache.get(entry.num));
  };
}
