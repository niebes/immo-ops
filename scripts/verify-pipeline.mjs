#!/usr/bin/env node

// Data integrity checks for immo-ops.
// Verifies listings.md, pipeline.md, scan-history.tsv, and cross-references.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function check(condition, msg, level = 'error') {
  if (!condition) {
    if (level === 'error') { console.error(`  ✗ ${msg}`); errors++; }
    else { console.warn(`  ⚠ ${msg}`); warnings++; }
  }
  return condition;
}

function fileExists(path) {
  return existsSync(join(ROOT, path));
}

function readFile(path) {
  const full = join(ROOT, path);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf8');
}

console.log('immo-ops integrity check\n');

// Check required files
console.log('Files:');
const requiredFiles = [
  'CLAUDE.md', 'DATA_CONTRACT.md', 'data/listings.md',
  'data/pipeline.md', 'templates/states.yml',
];
for (const f of requiredFiles) {
  check(fileExists(f), `Missing required file: ${f}`);
}

const optionalFiles = [
  'config/profile.yml', 'modes/_profile.md', 'portals.yml',
  'data/viewings.md', 'data/documents.md',
];
for (const f of optionalFiles) {
  check(fileExists(f), `Missing optional file: ${f} (run first-time setup)`, 'warn');
}

// Check listings.md format
console.log('\nListings:');
const listings = readFile('data/listings.md');
if (listings) {
  const lines = listings.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'));
  console.log(`  Found ${lines.length} listing(s)`);

  const validStatuses = [
    'New', 'Evaluated', 'Interested', 'Contacted',
    'Viewing', 'Viewed', 'Applied',
    'Accepted', 'Rejected', 'Discarded', 'Expired',
  ];

  for (const line of lines) {
    // Parse as a markdown table row: strip the outer delimiters, then split.
    // Do NOT filter empty cells — interior blanks (e.g. Rooms for a Grundstück)
    // are valid columns and dropping them shifts Status/Report onto wrong fields.
    const cols = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    if (cols.length < 11) {
      check(false, `Listing row has ${cols.length} columns, expected 11+: ${line.substring(0, 80)}`);
      continue;
    }
    const [num, , , , , , , , , status, report] = cols;
    check(validStatuses.includes(status), `Listing #${num}: invalid status "${status}"`);
    if (report && report.startsWith('reports/') || report?.startsWith('[')) {
      const reportPath = report.replace(/^\[.*?\]\(/, '').replace(/\)$/, '');
      if (reportPath.startsWith('reports/')) {
        check(fileExists(reportPath), `Listing #${num}: report file not found: ${reportPath}`, 'warn');
      }
    }
  }
}

// Check pipeline.md format
console.log('\nPipeline:');
const pipeline = readFile('data/pipeline.md');
if (pipeline) {
  const pending = (pipeline.match(/^- \[ \]/gm) || []).length;
  const processed = (pipeline.match(/^- \[x\]/gm) || []).length;
  console.log(`  Pending: ${pending}, Processed: ${processed}`);
}

// Check scan-history.tsv
console.log('\nScan History:');
if (fileExists('data/scan-history.tsv')) {
  const tsv = readFile('data/scan-history.tsv');
  const lines = tsv.split('\n').filter(l => l.trim() && !l.startsWith('url\t'));
  console.log(`  ${lines.length} entries`);
  const validStatuses = ['added', 'skipped_title', 'skipped_criteria', 'skipped_dup', 'skipped_expired'];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length >= 9) {
      check(validStatuses.includes(cols[8]), `Scan history: invalid status "${cols[8]}" for ${cols[0].substring(0, 50)}`);
    }
  }
} else {
  console.log('  No scan history yet');
}

// Summary
console.log(`\n${'━'.repeat(40)}`);
if (errors === 0 && warnings === 0) {
  console.log('✓ All checks passed');
} else {
  console.log(`${errors} error(s), ${warnings} warning(s)`);
}
process.exit(errors > 0 ? 1 : 0);
