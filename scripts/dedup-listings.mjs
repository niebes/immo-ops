#!/usr/bin/env node

/**
 * dedup-listings.mjs — Cross-portal duplicate detector
 *
 * Detects the same property listed on multiple portals by fuzzy-matching
 * location + price + m² (+ rooms for the numeric fallback when location is
 * unknown). Checks both pipeline.md (pending) and listings.md (tracked).
 * Matching logic lives in lib/dedup-core.mjs (unit-tested).
 *
 * Usage:
 *   node scripts/dedup-listings.mjs              # report only
 *   node scripts/dedup-listings.mjs --fix        # mark pipeline dupes as DUPE
 */

import { readFileSync, existsSync } from 'fs';
import { parseListingRow } from './lib/listings-md.mjs';
import { parsePipelineLine, isSimilar } from './lib/dedup-core.mjs';
import { writeAtomic } from './lib/fsx.mjs';
import { withLock } from './lib/lock.mjs';

const ROOT = process.cwd();
const PIPELINE_PATH = `${ROOT}/data/pipeline.md`;
const LISTINGS_PATH = `${ROOT}/data/listings.md`;
const FIX = process.argv.includes('--fix');

// ── Parse sources ──────────────────────────────────────────────────

function parsePipeline() {
  if (!existsSync(PIPELINE_PATH)) return [];
  return readFileSync(PIPELINE_PATH, 'utf8')
    .split('\n')
    .map(parsePipelineLine)
    .filter(Boolean);
}

function parseListings() {
  if (!existsSync(LISTINGS_PATH)) return [];
  const content = readFileSync(LISTINGS_PATH, 'utf8');
  return content.split('\n')
    .filter(l => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'))
    .map(line => {
      // Shared parser keeps empty interior cells — filter(Boolean) shifted
      // columns whenever a cell (e.g. Rooms) was blank.
      const cols = parseListingRow(line);
      return {
        source: 'listings',
        line,
        num: cols[0],
        portal: cols[2] || '',
        location: (cols[4] || '').toLowerCase(),
        price: parseFloat(cols[5]) || 0,
        m2: parseFloat(cols[6]) || 0,
        rooms: parseFloat(cols[7]) || 0,
      };
    });
}

// ── Main ───────────────────────────────────────────────────────────

const pipelineEntries = parsePipeline();
const listingEntries = parseListings();
const all = [...pipelineEntries, ...listingEntries];

const dupes = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const kind = isSimilar(all[i], all[j]); // false | 'confirmed' | 'numeric'
    if (kind) dupes.push([all[i], all[j], kind]);
  }
}

if (dupes.length === 0) {
  console.log('No cross-portal duplicates found.');
  process.exit(0);
}

console.log(`Found ${dupes.length} potential cross-portal duplicate(s):\n`);

const pipelineLinesToRemove = new Set();

for (const [a, b, kind] of dupes) {
  const labelA = a.source === 'listings' ? `#${a.num} (${a.portal})` : `pipeline (${a.portal})`;
  const labelB = b.source === 'listings' ? `#${b.num} (${b.portal})` : `pipeline (${b.portal})`;
  const tag = kind === 'numeric' ? '  (numeric-only match — no location)' : '';
  console.log(`  ${labelA} ↔ ${labelB}${tag}`);
  console.log(`    Location: "${a.location}" / "${b.location}"`);
  console.log(`    Price: ${a.price} / ${b.price} EUR | Size: ${a.m2} / ${b.m2} m²`);

  // If one is already in listings and the other in pipeline, mark pipeline one for removal
  if (a.source === 'listings' && b.source === 'pipeline') {
    pipelineLinesToRemove.add(b.line);
    console.log(`    → Pipeline entry is a dupe of tracked #${a.num}`);
  } else if (b.source === 'listings' && a.source === 'pipeline') {
    pipelineLinesToRemove.add(a.line);
    console.log(`    → Pipeline entry is a dupe of tracked #${b.num}`);
  } else if (a.source === 'pipeline' && b.source === 'pipeline') {
    // Both in pipeline — keep the one from the bigger portal (ImmoScout > Immowelt > Kleinanzeigen)
    const rank = { 'ImmoScout24': 3, 'Immowelt': 2, 'Kleinanzeigen': 1 };
    const keepA = (rank[a.portal] || 0) >= (rank[b.portal] || 0);
    pipelineLinesToRemove.add(keepA ? b.line : a.line);
    console.log(`    → Keeping ${keepA ? a.portal : b.portal} entry, removing ${keepA ? b.portal : a.portal}`);
  }
  console.log();
}

if (FIX && pipelineLinesToRemove.size > 0) {
  // Re-read under the lock: the parse above ran unlocked and another writer
  // may have touched the file since. Marking by exact line text keeps this
  // safe — a line that vanished in between simply doesn't match.
  await withLock('data', { root: ROOT }, () => {
    let pipeline = readFileSync(PIPELINE_PATH, 'utf8');
    for (const line of pipelineLinesToRemove) {
      const discardedLine = line.replace('- [ ]', '- [x] DUPE');
      pipeline = pipeline.replace(line, discardedLine);
    }
    writeAtomic(PIPELINE_PATH, pipeline);
  });
  console.log(`✓ Marked ${pipelineLinesToRemove.size} pipeline dupe(s) as DUPE.`);
} else if (pipelineLinesToRemove.size > 0) {
  console.log(`Run with --fix to mark ${pipelineLinesToRemove.size} pipeline dupe(s).`);
}
