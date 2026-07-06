#!/usr/bin/env node

/**
 * dedup-listings.mjs — Cross-portal duplicate detector
 *
 * Detects the same property listed on multiple portals by fuzzy-matching
 * location + price + m². Checks both pipeline.md (pending) and listings.md (tracked).
 *
 * Usage:
 *   node scripts/dedup-listings.mjs              # report only
 *   node scripts/dedup-listings.mjs --fix        # mark pipeline dupes as DISCARDED
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parseListingRow } from './lib/listings-md.mjs';
import { locAgree } from './lib/geo.mjs';

const ROOT = process.cwd();
const PIPELINE_PATH = `${ROOT}/data/pipeline.md`;
const LISTINGS_PATH = `${ROOT}/data/listings.md`;
const FIX = process.argv.includes('--fix');

// ── Parse sources ──────────────────────────────────────────────────

function parsePipeline() {
  if (!existsSync(PIPELINE_PATH)) return [];
  const content = readFileSync(PIPELINE_PATH, 'utf8');
  const entries = [];
  for (const line of content.split('\n')) {
    if (!line.startsWith('- [ ]')) continue;
    const url = (line.match(/https?:\/\/[^\s|]+/) || [])[0] || '';
    const parts = line.split('|').map(s => s.trim());
    const portal = parts[1] || '';
    const text = parts.slice(2).join(' ');
    const priceMatch = text.match(/(\d[\d.]*)\s*EUR/);
    const m2Match = text.match(/([\d.]+)\s*m²/);
    const roomsMatch = text.match(/(\d+)\s*Zi/);
    // Extract location from structured format: "3 Zi, Nauener Vorstadt (14469), 1500 EUR"
    const locMatch = text.match(/,\s*([^,]+?)\s*(?:\(\d{5}\))?(?:,|\s*\d+\s*EUR)/);
    entries.push({
      source: 'pipeline',
      line,
      url,
      portal,
      location: (locMatch ? locMatch[1] : '').toLowerCase().trim(),
      price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, '')) : 0,
      m2: m2Match ? parseFloat(m2Match[1]) : 0,
      rooms: roomsMatch ? parseInt(roomsMatch[1]) : 0,
    });
  }
  return entries;
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

// ── Similarity ─────────────────────────────────────────────────────
// Neighbourhood matching (hood/locAgree) lives in lib/geo.mjs, shared with
// duplicates.mjs — see the comments there for why Levenshtein over the whole
// location string is unsafe.

function isSimilar(a, b) {
  if (a.url && b.url && a.url === b.url) return false; // same URL = same entry, not a cross-portal dupe
  if (a.portal === b.portal) return false; // same portal = not a cross-portal dupe

  const loc = locAgree(a.location, b.location); // true | false | null
  if (loc === false) return false; // KNOWN-different neighbourhoods → never the same flat (hard veto)

  const priceMatch = a.price > 0 && b.price > 0 &&
    Math.abs(a.price - b.price) / Math.max(a.price, b.price) < 0.05;
  const sizeMatch = a.m2 > 0 && b.m2 > 0 &&
    Math.abs(a.m2 - b.m2) <= 3;

  // Require a CONFIRMED same neighbourhood — price+size coincidences across distinct
  // Ortsteile (or with unknown locations) are not enough to auto-collapse into a DUPE.
  return loc === true && priceMatch && sizeMatch;
}

// ── Main ───────────────────────────────────────────────────────────

const pipelineEntries = parsePipeline();
const listingEntries = parseListings();
const all = [...pipelineEntries, ...listingEntries];

const dupes = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    if (isSimilar(all[i], all[j])) {
      dupes.push([all[i], all[j]]);
    }
  }
}

if (dupes.length === 0) {
  console.log('No cross-portal duplicates found.');
  process.exit(0);
}

console.log(`Found ${dupes.length} potential cross-portal duplicate(s):\n`);

const pipelineLinesToRemove = new Set();

for (const [a, b] of dupes) {
  const labelA = a.source === 'listings' ? `#${a.num} (${a.portal})` : `pipeline (${a.portal})`;
  const labelB = b.source === 'listings' ? `#${b.num} (${b.portal})` : `pipeline (${b.portal})`;
  console.log(`  ${labelA} ↔ ${labelB}`);
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
  let pipeline = readFileSync(PIPELINE_PATH, 'utf8');
  for (const line of pipelineLinesToRemove) {
    const discardedLine = line.replace('- [ ]', '- [x] DUPE');
    pipeline = pipeline.replace(line, discardedLine);
  }
  writeFileSync(PIPELINE_PATH, pipeline);
  console.log(`✓ Marked ${pipelineLinesToRemove.size} pipeline dupe(s) as DUPE.`);
} else if (pipelineLinesToRemove.size > 0) {
  console.log(`Run with --fix to mark ${pipelineLinesToRemove.size} pipeline dupe(s).`);
}
