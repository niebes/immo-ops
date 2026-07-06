#!/usr/bin/env node

// Merges TSV files from batch/tracker-additions/ into data/listings.md.
//
// Each TSV row has 12 columns (notes may be omitted → 11):
//   num  date  portal  type  location  price  m2  rooms  score  status  report  notes
//
// Behavior:
//   - Rows with a wrong column count (< 11 or > 12) are SKIPPED with a warning
//     (previously they were merged with literal "undefined" cells).
//   - Dedup is by tracker number AND by listing URL: the row's `report` cell
//     points at reports/{...}.md, whose "**URL:** ..." header identifies the
//     listing; a row whose URL already appears in listings.md (via any existing
//     row's report) is skipped even under a fresh number.
//   - Cleanly processed TSV files are deleted; a file containing skipped
//     malformed rows is KEPT so the data isn't lost.

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { parseListingRow } from './lib/listings-md.mjs';
import { canonicalizeUrl } from './lib/seen-urls.mjs';

const ROOT = process.cwd();
const ADDITIONS_DIR = join(ROOT, 'batch/tracker-additions');
const LISTINGS_PATH = join(ROOT, 'data/listings.md');

if (!existsSync(ADDITIONS_DIR)) {
  console.log('No tracker-additions directory found.');
  process.exit(0);
}

const tsvFiles = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));
if (tsvFiles.length === 0) {
  console.log('No TSV files to merge.');
  process.exit(0);
}

const listings = readFileSync(LISTINGS_PATH, 'utf8');
const existingLines = listings.split('\n');

const headerIdx = existingLines.findIndex(l => l.startsWith('| #'));
if (headerIdx === -1) {
  console.error('Could not find header row in listings.md');
  process.exit(1);
}

// Resolve the listing URL behind a report cell ("reports/....md" or
// "[042](reports/....md)") by reading the report's "**URL:** ..." header.
const reportUrlCache = new Map();
function urlFromReport(reportCell) {
  const m = (reportCell || '').match(/reports\/[^\s)\]]+\.md/);
  if (!m) return null;
  const path = m[0];
  if (reportUrlCache.has(path)) return reportUrlCache.get(path);
  let url = null;
  const full = join(ROOT, path);
  if (existsSync(full)) {
    const um = readFileSync(full, 'utf8').match(/\*\*URL:\*\*\s*(https?:\/\/\S+)/);
    if (um) url = canonicalizeUrl(um[1]);
  }
  reportUrlCache.set(path, url);
  return url;
}

const dataLines = existingLines.filter(l => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'));
const existingNums = new Set();
const existingUrls = new Set();
for (const l of dataLines) {
  const cols = parseListingRow(l);
  if (cols[0]) existingNums.add(cols[0]);
  const url = urlFromReport(cols[10]);
  if (url) existingUrls.add(url);
}

let added = 0;
const newRows = [];
const dirtyFiles = new Set(); // files with skipped malformed rows — keep them

for (const file of tsvFiles) {
  const content = readFileSync(join(ADDITIONS_DIR, file), 'utf8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('num\t'));

  for (const line of lines) {
    const cells = line.split('\t').map(c => c.trim());
    if (cells.length < 11 || cells.length > 12) {
      console.warn(`  ⚠ ${file}: skipping row with ${cells.length} columns (expected 11–12): ${line.slice(0, 80)}`);
      dirtyFiles.add(file);
      continue;
    }
    const [num, date, portal, type, location, price, m2, rooms, score, status, report, notes] = cells;
    if (existingNums.has(num)) {
      console.log(`  Skip duplicate #${num}`);
      continue;
    }
    const url = urlFromReport(report);
    if (url && existingUrls.has(url)) {
      console.log(`  Skip #${num}: URL already tracked (${url})`);
      continue;
    }
    newRows.push(`| ${num} | ${date} | ${portal} | ${type} | ${location} | ${price} | ${m2} | ${rooms} | ${score} | ${status} | ${report ? `[${num}](${report})` : ''} | ${notes || ''} |`);
    existingNums.add(num);
    if (url) existingUrls.add(url);
    added++;
  }
}

if (newRows.length > 0) {
  const updatedContent = listings.trimEnd() + '\n' + newRows.join('\n') + '\n';
  writeFileSync(LISTINGS_PATH, updatedContent);
}

// Clean up processed TSV files; keep files that still hold malformed rows.
for (const file of tsvFiles) {
  if (dirtyFiles.has(file)) {
    console.warn(`  ⚠ Keeping ${file} (contains malformed rows — fix and re-run)`);
    continue;
  }
  unlinkSync(join(ADDITIONS_DIR, file));
}

console.log(`Merged ${added} new listing(s) from ${tsvFiles.length} file(s).`);
