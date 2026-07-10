#!/usr/bin/env node

/**
 * process-scan.mjs — Process raw scan results from any source
 *
 * Takes a JSON array of listings on stdin, applies title filter,
 * criteria filter, cross-portal dedup, and writes to pipeline + scan-history.
 *
 * Input JSON format:
 *   [{ url, title, price, m2, rooms, location, portal }, ...]
 *
 * Usage:
 *   echo '[...]' | node scripts/process-scan.mjs
 *   node scripts/process-scan.mjs --file /tmp/listings.json
 *   node scripts/process-scan.mjs --dry-run < listings.json
 *   node scripts/process-scan.mjs --portal ImmoScout24 < listings.json
 *   node scripts/process-scan.mjs --json < listings.json   # machine-readable stats as last stdout line
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { toHistoryLine } from './lib/tsv.mjs';
import { loadSeenUrls, canonicalizeUrl } from './lib/seen-urls.mjs';
import { writeAtomic } from './lib/fsx.mjs';
import { withLock } from './lib/lock.mjs';
import { insertPendingEntries, toPipelineLine } from './lib/pipeline-md.mjs';

const ROOT = process.cwd();
const PORTALS_PATH = `${ROOT}/portals.yml`;
const SCAN_HISTORY_PATH = `${ROOT}/data/scan-history.tsv`;
const PIPELINE_PATH = `${ROOT}/data/pipeline.md`;
const PROFILE_PATH = `${ROOT}/config/profile.yml`;

mkdirSync(`${ROOT}/data`, { recursive: true });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
// --json: print exactly one JSON stats line as the LAST stdout line
// ({"found":N,"criteria":N,"dups":N,"added":N}); human output stays above it.
const JSON_STATS = args.includes('--json');
const fileIdx = args.indexOf('--file');
const INPUT_FILE = fileIdx !== -1 ? args[fileIdx + 1] : null;
const groupIdx = args.indexOf('--group');
const GROUP_NAME = groupIdx !== -1 ? args[groupIdx + 1] : null;

// ── Config ─────────────────────────────────────────────────────────

function loadYaml(path) {
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, 'utf8'));
}

const portalsConfig = loadYaml(PORTALS_PATH) || {};
const profile = loadYaml(PROFILE_PATH);

// NOTE: title relevance (apartment swaps, garages/parking, commercial, WBS, sublets)
// is NOT keyword-filtered here — it is judged by the AI triage step. A keyword in a
// free-text title is ambiguous ("DHH mit … Garage" is a house that HAS a garage, not
// a garage). This script only applies the objective numeric criteria + dedup; the AI
// reads every survivor's title downstream. The title_filter lists in portals.yml are
// kept only as advisory hints for that AI triage.

// ── Criteria ───────────────────────────────────────────────────────

const search = GROUP_NAME
  ? profile?.searches?.find(s => s.name === GROUP_NAME)
  : profile?.searches?.find(s => s.enabled !== false);
// A --group that matches no profile search means criteria filtering would be
// silently bypassed AND pipeline entries get a label no evaluator recognizes
// (this happened: 176 entries labeled with a stale template group name).
// Hard-fail so the caller (scan.mjs --debug-chrome records it as a portal failure) or
// the operator fixes the name instead of ingesting unfiltered data.
if (GROUP_NAME && !search && profile?.searches?.length) {
  console.error(`✗ No search named "${GROUP_NAME}" in config/profile.yml.`);
  console.error(`  Known searches: ${profile.searches.map(s => s.name).join(', ')}`);
  console.error(`  portals.yml group names must exactly match searches[].name.`);
  process.exit(4);
}
const criteria = search ? {
  minRooms: search.size?.min_rooms || null,
  minM2: search.size?.min_m2 || null,
  maxPrice: search.price?.max_kaltmiete || search.price?.max_kaufpreis || null,
  excludedAreas: (search.location?.excluded_areas || []).map(a => a.toLowerCase()),
} : null;

// ── Dedup ──────────────────────────────────────────────────────────
// loadSeenUrls/canonicalizeUrl come from lib/seen-urls.mjs: dedup keys are
// canonicalized (query/hash stripped) on both sides; originals go to disk.

// ── Filters ────────────────────────────────────────────────────────

// Only objective numeric criteria + dedup gate here. Title relevance is judged by the
// AI triage step, never by keyword matching.

function filterCriteria(listing) {
  if (!criteria) return null;
  if (criteria.minRooms && listing.rooms && listing.rooms < criteria.minRooms) return 'skipped_criteria';
  if (criteria.minM2 && listing.m2 && listing.m2 < criteria.minM2) return 'skipped_criteria';
  if (criteria.maxPrice && listing.price && listing.price > criteria.maxPrice * 1.1) return 'skipped_criteria';
  if (criteria.excludedAreas.length > 0 && listing.location) {
    const loc = listing.location.toLowerCase();
    if (criteria.excludedAreas.some(a => loc.includes(a))) return 'skipped_criteria';
  }
  // NOTE: deliberately NO positive area filter here. Location data is inconsistent
  // across portals (many empty; literal keyword matching drops valid addresses like
  // "14476 Golm"). With few listings, false negatives cost more than letting a few
  // out-of-area listings through — those are caught in triage. See git history.
  return null;
}

// ── Main ───────────────────────────────────────────────────────────

const input = INPUT_FILE ? readFileSync(INPUT_FILE, 'utf8') : readFileSync(0, 'utf8');
let listings;
try {
  listings = JSON.parse(input);
} catch (err) {
  console.error('Invalid JSON input:', err.message);
  process.exit(1);
}

// Unwrap the extractor's return wrapper so the SAME string a CiC extractor returns
// (which also carries count/hasNextPage for the pagination decision) can be piped
// straight in: {..., L:[[...]]} (compact rows) or {..., listings:[{...}]} (objects).
let wrapperPrefix = null;
if (listings && !Array.isArray(listings) && typeof listings === 'object') {
  // The wrapper self-describes its URL prefix in `p` (present for id-based portals
  // like IS24/eBay), so the caller need not repeat --url-prefix — the `scan.mjs --debug-chrome`
  // path just pipes the raw {c,n,p,L} through.
  if (typeof listings.p === 'string') wrapperPrefix = listings.p;
  listings = Array.isArray(listings.L) ? listings.L
    : Array.isArray(listings.listings) ? listings.listings
    : listings;
}

// ── Compact transport (array-of-arrays) ────────────────────────────
// A CiC scan moves each search page's listings out of the browser through the
// javascript_tool return channel, whose display is capped at ~1 KB. The verbose object
// form ({"url":…,"title":…,"portal":…} × 20) repeats every key + URL prefix + portal
// per listing, so a page overflows the channel ~5× and must be pulled in many slices.
// The compact form drops that repetition — each listing is a positional array
//   [idOrUrl, price, m2, rooms, title, location]
// and the portal (constant per page) + URL prefix (constant per portal) are supplied
// once via flags. This shrinks a 20-listing page enough to cross in 1–2 calls.
//   node process-scan.mjs --portal "ImmoScout24" --url-prefix "https://www.immobilienscout24.de/expose/" < compact.json
// Field 0 may be a bare id (reconstructed as url-prefix + id) OR a full http(s) URL
// (used as-is) — so portals whose URLs are not derivable from an id (e.g.
// Regionalimmobilien24) just emit the full URL in field 0 and skip --url-prefix.
if (Array.isArray(listings) && listings.length > 0 && Array.isArray(listings[0])) {
  const portalIdx = args.indexOf('--portal');
  const COMPACT_PORTAL = portalIdx !== -1 ? args[portalIdx + 1] : '';
  const prefixIdx = args.indexOf('--url-prefix');
  const URL_PREFIX = (prefixIdx !== -1 ? args[prefixIdx + 1] : '') || wrapperPrefix || '';
  listings = listings.map((r) => {
    const first = r[0] == null ? '' : String(r[0]);
    return {
      url: /^https?:\/\//.test(first) ? first : URL_PREFIX + first,
      price: r[1] == null ? null : r[1],
      m2: r[2] == null ? null : r[2],
      rooms: r[3] == null ? null : r[3],
      title: r[4] == null ? '' : String(r[4]),
      location: r[5] == null ? '' : String(r[5]),
      portal: COMPACT_PORTAL,
    };
  });
}

function printJsonStats(stats) {
  console.log(JSON.stringify({
    found: stats.found,
    criteria: stats.skipped_criteria,
    dups: stats.skipped_dup,
    added: stats.added,
  }));
}

if (!Array.isArray(listings) || listings.length === 0) {
  console.log('No listings to process.');
  if (JSON_STATS) printJsonStats({ found: 0, skipped_criteria: 0, skipped_dup: 0, added: 0 });
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const stats = { found: listings.length, skipped_criteria: 0, skipped_dup: 0, added: 0 };
const newListings = [];
const historyLines = [];

// Filter + dedup + write as ONE critical section. Loading the seen-set INSIDE
// the lock is what makes concurrent-pass dedup correct: a URL the other pass
// added between an early load and our write would otherwise be re-added.
// The section is pure fs work (no network/browser) — milliseconds.
function filterAndDedup() {
  const seenUrls = loadSeenUrls(ROOT);
  for (const l of listings) {
    const criteriaResult = filterCriteria(l);
    if (criteriaResult) {
      stats.skipped_criteria++;
      historyLines.push(toHistoryLine(l, criteriaResult, today));
      continue;
    }

    // Dedup on the canonical (query/hash-stripped) URL; the original URL is what
    // gets written to pipeline/history below.
    const canonUrl = canonicalizeUrl(l.url);
    if (seenUrls.has(canonUrl)) {
      stats.skipped_dup++;
      continue;
    }

    seenUrls.add(canonUrl);
    stats.added++;
    newListings.push(l);
    historyLines.push(toHistoryLine(l, 'added', today));
  }
}

if (DRY_RUN) {
  filterAndDedup(); // read-only — no lock needed
} else {
  await withLock('data', { root: ROOT }, () => {
    filterAndDedup();

    if (historyLines.length > 0) {
      const header = existsSync(SCAN_HISTORY_PATH) ? '' : 'url\tfirst_seen\tportal\ttitle\tlocation\tprice\tm2\trooms\tstatus\n';
      appendFileSync(SCAN_HISTORY_PATH, header + historyLines.join('\n') + '\n');
    }

    if (newListings.length > 0) {
      const pipeline = existsSync(PIPELINE_PATH) ? readFileSync(PIPELINE_PATH, 'utf8') : '';
      // Same line format as scan.mjs — lib/pipeline-md.mjs owns it, so the
      // evaluator never has to guess which field is the group.
      const groupLabel = GROUP_NAME || search?.name || '';
      const entries = newListings.map(l => toPipelineLine(l, groupLabel));
      writeAtomic(PIPELINE_PATH, insertPendingEntries(pipeline, entries));
    }
  });
}

console.log(`Processed: ${stats.found} listings`);
console.log(`  Filtered (criteria): ${stats.skipped_criteria}`);
console.log(`  Duplicates:          ${stats.skipped_dup}`);
console.log(`  New in pipeline:     ${stats.added}`);

if (newListings.length > 0) {
  console.log('\nNew:');
  for (const l of newListings) {
    const details = [l.price && `${l.price} EUR`, l.m2 && `${l.m2} m²`, l.rooms && `${l.rooms} Zi`].filter(Boolean).join(', ');
    console.log(`  + ${l.portal} | ${l.title.substring(0, 60)} | ${details}`);
  }
}

if (JSON_STATS) printJsonStats(stats);
