#!/usr/bin/env node

// Detects duplicate listings across portals.
// Same property may appear on ImmoScout24, Immowelt, and Kleinanzeigen.
// Matches by: similar address/location + similar price + similar m².

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const LISTINGS_PATH = join(ROOT, 'data/listings.md');

if (!existsSync(LISTINGS_PATH)) {
  console.log('No listings.md found.');
  process.exit(0);
}

const content = readFileSync(LISTINGS_PATH, 'utf8');
const lines = content.split('\n')
  .filter(l => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'));

const listings = lines.map(line => {
  const cols = line.split('|').map(c => c.trim()).filter(Boolean);
  return {
    num: cols[0],
    portal: cols[2],
    location: cols[4]?.toLowerCase() || '',
    price: parseFloat(cols[5]) || 0,
    m2: parseFloat(cols[6]) || 0,
    rooms: parseFloat(cols[7]) || 0,
  };
});

function isSimilar(a, b) {
  if (a.num === b.num) return false;
  const locMatch = a.location && b.location &&
    (a.location.includes(b.location) || b.location.includes(a.location) ||
     levenshteinRatio(a.location, b.location) > 0.7);
  const priceMatch = a.price > 0 && b.price > 0 && Math.abs(a.price - b.price) / Math.max(a.price, b.price) < 0.05;
  const sizeMatch = a.m2 > 0 && b.m2 > 0 && Math.abs(a.m2 - b.m2) <= 3;
  return locMatch && priceMatch && sizeMatch;
}

function levenshteinRatio(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}

const duplicates = [];
for (let i = 0; i < listings.length; i++) {
  for (let j = i + 1; j < listings.length; j++) {
    if (isSimilar(listings[i], listings[j])) {
      duplicates.push([listings[i], listings[j]]);
    }
  }
}

if (duplicates.length === 0) {
  console.log('No potential duplicates found.');
} else {
  console.log(`Found ${duplicates.length} potential duplicate pair(s):\n`);
  for (const [a, b] of duplicates) {
    console.log(`  #${a.num} (${a.portal}) ↔ #${b.num} (${b.portal})`);
    console.log(`    Location: "${a.location}" / "${b.location}"`);
    console.log(`    Price: ${a.price} / ${b.price} EUR | Size: ${a.m2} / ${b.m2} m²`);
    console.log();
  }
}
