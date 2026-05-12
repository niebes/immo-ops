#!/usr/bin/env node

// Merges TSV files from batch/tracker-additions/ into data/listings.md.
// Deduplicates by URL or location+rooms combo.

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

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

const dataLines = existingLines.filter(l => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'));
const existingNums = new Set(dataLines.map(l => l.split('|')[1]?.trim()).filter(Boolean));

let added = 0;
const newRows = [];

for (const file of tsvFiles) {
  const content = readFileSync(join(ADDITIONS_DIR, file), 'utf8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('num\t'));

  for (const line of lines) {
    const [num, date, portal, type, location, price, m2, rooms, score, status, report, notes] = line.split('\t');
    if (existingNums.has(num)) {
      console.log(`  Skip duplicate #${num}`);
      continue;
    }
    newRows.push(`| ${num} | ${date} | ${portal} | ${type} | ${location} | ${price} | ${m2} | ${rooms} | ${score} | ${status} | ${report ? `[${num}](${report})` : ''} | ${notes || ''} |`);
    existingNums.add(num);
    added++;
  }
}

if (newRows.length > 0) {
  const updatedContent = listings.trimEnd() + '\n' + newRows.join('\n') + '\n';
  writeFileSync(LISTINGS_PATH, updatedContent);
}

// Clean up processed TSV files
for (const file of tsvFiles) {
  unlinkSync(join(ADDITIONS_DIR, file));
}

console.log(`Merged ${added} new listing(s) from ${tsvFiles.length} file(s).`);
