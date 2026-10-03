#!/usr/bin/env node

// Data integrity checks for immo-ops.
// Verifies listings.md, pipeline.md, scan-history.tsv, and cross-references.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseListingRow } from './lib/listings-md.mjs';

const ROOT = process.cwd();
// Every report carries its best-known address (modes/evaluate.md step 3). Older
// reports predate the field and are left as they are.
const ADDRESS_REQUIRED_SINCE = '2026-10-04';
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
    'New', 'Evaluated', 'Interested', 'Swap-candidate', 'Contacted',
    'Viewing', 'Viewed', 'Applied',
    'Accepted', 'Rejected', 'Discarded', 'Expired',
  ];

  for (const line of lines) {
    // Parse as a markdown table row (shared parser keeps empty interior cells —
    // dropping them shifts Status/Report onto wrong fields).
    const cols = parseListingRow(line);
    if (cols.length < 11) {
      check(false, `Listing row has ${cols.length} columns, expected 11+: ${line.substring(0, 80)}`);
      continue;
    }
    const [num, , , , , , , , score, status, report] = cols;
    check(validStatuses.includes(status), `Listing #${num}: invalid status "${status}"`);
    // Machine columns are dot-decimal; German-comma scores broke reconcile and
    // numeric sorting (normalized 2026-07 by prune-pipeline --repair).
    check(!/^\d+,\d+$/.test(score), `Listing #${num}: comma-decimal score "${score}" (use dot)`);
    if (report && report.startsWith('reports/') || report?.startsWith('[')) {
      const reportPath = report.replace(/^\[.*?\]\(/, '').replace(/\)$/, '');
      if (reportPath.startsWith('reports/')) {
        check(fileExists(reportPath), `Listing #${num}: report file not found: ${reportPath}`, 'warn');
        const md = fileExists(reportPath) ? readFile(reportPath) : '';
        const date = (md.match(/^\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/m) || [])[1];
        if (date && date >= ADDRESS_REQUIRED_SINCE) {
          check(/^\*\*Address:\*\*\s*\S/m.test(md), `Listing #${num}: report has no **Address:** header (${reportPath})`, 'warn');
        }
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

  // Section purity: completed items sitting under '## Pending' hide the real
  // queue state (the audit found 680 of them). WARNING, not error: the normal
  // workflow flips entries '- [ ]'→'- [x]' IN PLACE under Pending (merge-tracker
  // applying staged evaluator updates, dedup --fix) and prune-pipeline.mjs
  // sweeps them later in the same cycle —
  // an error here would fail Step-5 verification on every productive cycle.
  const pendingSection = pipeline.split('## Pending')[1]?.split(/^## /m)[0] || '';
  const doneUnderPending = (pendingSection.match(/^- \[x\]/gm) || []).length;
  check(doneUnderPending === 0,
    `${doneUnderPending} completed '- [x]' item(s) under '## Pending' — run: node scripts/prune-pipeline.mjs`, 'warn');
}

// Staged worker output that was never merged. Evaluators (possibly running in
// parallel) only write per-listing staging files; merge-tracker.mjs is the one
// serial writer of listings.md/pipeline.md, and a memory-consolidation pass
// folds batch/memory-inbox/ into the evaluator's memory. Leftovers mean a
// merge/consolidation step was skipped or a staged file was rejected.
console.log('\nStaging:');
const staged = (dir, ext) => {
  const full = join(ROOT, dir);
  return existsSync(full) ? readdirSync(full).filter(f => f.endsWith(ext)) : [];
};
const leftTsv = staged('batch/tracker-additions', '.tsv');
const leftUpdates = staged('batch/pipeline-updates', '.json');
const leftNotes = staged('batch/memory-inbox', '.md');
console.log(`  tracker-additions: ${leftTsv.length}, pipeline-updates: ${leftUpdates.length}, memory-inbox: ${leftNotes.length}`);
check(leftTsv.length === 0,
  `${leftTsv.length} unmerged tracker TSV(s) (${leftTsv.slice(0, 5).join(', ')}) — run: node scripts/merge-tracker.mjs`);
check(leftUpdates.length === 0,
  `${leftUpdates.length} unapplied pipeline update(s) (${leftUpdates.slice(0, 5).join(', ')}) — run: node scripts/merge-tracker.mjs, then fix any file it keeps`);
check(leftNotes.length === 0,
  `${leftNotes.length} unconsolidated evaluator memory note(s) in batch/memory-inbox/ — run the immo-evaluator MEMORY CONSOLIDATION pass`, 'warn');

// Evaluator memory files must stay readable in ONE Read call. immobilienscout24.md
// grew to 545 KB unnoticed and every evaluator had to grep it by heading
// (2026-09-28). Past the budget, the consolidation pass compacts or splits it.
const MEMORY_DIR = '.claude/agent-memory/immo-evaluator';
const MEMORY_BUDGET = 60 * 1024;
const oversized = staged(MEMORY_DIR, '.md')
  .map(f => ({ f, size: readFileSync(join(ROOT, MEMORY_DIR, f)).length }))
  .filter(x => x.size > MEMORY_BUDGET);
check(oversized.length === 0,
  `${oversized.length} evaluator memory file(s) over ${MEMORY_BUDGET / 1024} KB (${oversized.map(x => `${x.f} ${Math.round(x.size / 1024)} KB`).join(', ')}) — run the immo-evaluator MEMORY CONSOLIDATION pass with compaction`, 'warn');

// Check scan-history.tsv
console.log('\nScan History:');
if (fileExists('data/scan-history.tsv')) {
  const tsv = readFile('data/scan-history.tsv');
  const lines = tsv.split('\n').filter(l => l.trim() && !l.startsWith('url\t'));
  console.log(`  ${lines.length} entries`);
  // 'archived' = pipeline entry moved to data/archive/ by prune-pipeline.mjs;
  // the row keeps the URL in the seen-set so dedup never re-adds it.
  const validStatuses = ['added', 'skipped_title', 'skipped_criteria', 'skipped_dup', 'skipped_expired', 'archived'];
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
