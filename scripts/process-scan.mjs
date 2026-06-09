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
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const PORTALS_PATH = `${ROOT}/portals.yml`;
const SCAN_HISTORY_PATH = `${ROOT}/data/scan-history.tsv`;
const PIPELINE_PATH = `${ROOT}/data/pipeline.md`;
const LISTINGS_PATH = `${ROOT}/data/listings.md`;
const PROFILE_PATH = `${ROOT}/config/profile.yml`;

mkdirSync(`${ROOT}/data`, { recursive: true });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
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

// Collect negative keywords scoped to --group if provided, otherwise all groups
const negativeKeywords = [];
if (portalsConfig.search_groups) {
  const groups = GROUP_NAME
    ? portalsConfig.search_groups.filter(g => g.name === GROUP_NAME)
    : portalsConfig.search_groups;
  for (const group of groups) {
    for (const kw of (group.title_filter?.negative || [])) {
      const lower = kw.toLowerCase();
      if (!negativeKeywords.includes(lower)) negativeKeywords.push(lower);
    }
  }
} else if (portalsConfig.title_filter) {
  negativeKeywords.push(...(portalsConfig.title_filter.negative || []).map(k => k.toLowerCase()));
}

// ── Criteria ───────────────────────────────────────────────────────

const search = GROUP_NAME
  ? profile?.searches?.find(s => s.name === GROUP_NAME)
  : profile?.searches?.find(s => s.enabled !== false);
const criteria = search ? {
  minRooms: search.size?.min_rooms || null,
  minM2: search.size?.min_m2 || null,
  maxPrice: search.price?.max_kaltmiete || search.price?.max_kaufpreis || null,
  excludedAreas: (search.location?.excluded_areas || []).map(a => a.toLowerCase()),
} : null;

// ── Dedup ──────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();
  for (const path of [SCAN_HISTORY_PATH, PIPELINE_PATH, LISTINGS_PATH]) {
    if (!existsSync(path)) continue;
    for (const m of readFileSync(path, 'utf8').matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(m[0]);
    }
  }
  return seen;
}

// ── Filters ────────────────────────────────────────────────────────

function filterTitle(title) {
  const lower = (title || '').toLowerCase();
  return negativeKeywords.some(k => lower.includes(k)) ? 'skipped_title' : null;
}

function filterCriteria(listing) {
  if (!criteria) return null;
  if (criteria.minRooms && listing.rooms && listing.rooms < criteria.minRooms) return 'skipped_criteria';
  if (criteria.minM2 && listing.m2 && listing.m2 < criteria.minM2) return 'skipped_criteria';
  if (criteria.maxPrice && listing.price && listing.price > criteria.maxPrice * 1.1) return 'skipped_criteria';
  if (criteria.excludedAreas.length > 0 && listing.location) {
    const loc = listing.location.toLowerCase();
    if (criteria.excludedAreas.some(a => loc.includes(a))) return 'skipped_criteria';
  }
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

if (!Array.isArray(listings) || listings.length === 0) {
  console.log('No listings to process.');
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const seenUrls = loadSeenUrls();
const stats = { found: listings.length, skipped_title: 0, skipped_criteria: 0, skipped_dup: 0, added: 0 };
const newListings = [];
const historyLines = [];

for (const l of listings) {
  const titleResult = filterTitle(l.title);
  if (titleResult) {
    stats.skipped_title++;
    historyLines.push([l.url, today, l.portal || '', l.title, l.location || '', l.price || '', l.m2 || '', l.rooms || '', titleResult].join('\t'));
    continue;
  }

  const criteriaResult = filterCriteria(l);
  if (criteriaResult) {
    stats.skipped_criteria++;
    historyLines.push([l.url, today, l.portal || '', l.title, l.location || '', l.price || '', l.m2 || '', l.rooms || '', criteriaResult].join('\t'));
    continue;
  }

  if (seenUrls.has(l.url)) {
    stats.skipped_dup++;
    continue;
  }

  seenUrls.add(l.url);
  stats.added++;
  newListings.push(l);
  historyLines.push([l.url, today, l.portal || '', l.title, l.location || '', l.price || '', l.m2 || '', l.rooms || '', 'added'].join('\t'));
}

if (!DRY_RUN) {
  if (historyLines.length > 0) {
    const header = existsSync(SCAN_HISTORY_PATH) ? '' : 'url\tfirst_seen\tportal\ttitle\tlocation\tprice\tm2\trooms\tstatus\n';
    appendFileSync(SCAN_HISTORY_PATH, header + historyLines.join('\n') + '\n');
  }

  if (newListings.length > 0) {
    const pipeline = existsSync(PIPELINE_PATH) ? readFileSync(PIPELINE_PATH, 'utf8') : '# Pipeline\n\n## Pending\n\n## Processed\n';
    const pendingIdx = pipeline.indexOf('## Pending');
    const insertIdx = pipeline.indexOf('\n', pendingIdx) + 1;
    const entries = newListings.map(l =>
      `- [ ] ${l.url} | ${l.portal} | ${l.title}${l.price ? ` | ${l.price} EUR` : ''}${l.m2 ? ` | ${l.m2} m²` : ''}`
    ).join('\n') + '\n';
    writeFileSync(PIPELINE_PATH, pipeline.slice(0, insertIdx) + entries + pipeline.slice(insertIdx));
  }
}

console.log(`Processed: ${stats.found} listings`);
console.log(`  Filtered (title):    ${stats.skipped_title}`);
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
