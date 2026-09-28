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
//
// Then applies staged pipeline updates from batch/pipeline-updates/{NNN}.json
// ({ "url": "...", "line": "- [x] #NNN | ..." }). Evaluators never edit
// data/pipeline.md themselves — parallel workers editing one shared file lose
// each other's updates — so this single serial step is the only writer.
// The pending "- [ ]" line containing the URL is replaced by `line`; a file
// whose URL has no pending line (already applied) is dropped; a file whose URL
// is not in the pipeline at all is KEPT with a warning.
//
// An update may also carry `tracker_notes`: findings about OTHER tracker rows
// that a parallel evaluator may not write itself (e.g. "#757 is the same flat,
// now cheaper — see #852", "#365's exposé is 404, re-listed as #861"):
//   "tracker_notes": [{ "num": "757", "append": "[2026-09-28: superseded by #852 …]" },
//                     { "num": "365", "status": "Expired", "append": "[… 404 …]" }]
// `append` is added to that row's Notes cell; `status` may only be set to
// Expired (a verified-dead exposé) — every other status change is the user's call.

import { readFileSync, readdirSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { parseListingRow } from './lib/listings-md.mjs';
import { canonicalizeUrl } from './lib/seen-urls.mjs';
import { writeAtomic } from './lib/fsx.mjs';
import { withLock } from './lib/lock.mjs';

const ROOT = process.cwd();
const ADDITIONS_DIR = join(ROOT, 'batch/tracker-additions');
const PIPELINE_UPDATES_DIR = join(ROOT, 'batch/pipeline-updates');
const LISTINGS_PATH = join(ROOT, 'data/listings.md');
const PIPELINE_PATH = join(ROOT, 'data/pipeline.md');

const tsvFiles = existsSync(ADDITIONS_DIR)
  ? readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'))
  : [];
// Same 'data' lock as process-scan/prune/route-decided: a scan can be writing
// pipeline.md in the background while the orchestrator merges.
await withLock('data', { root: ROOT }, () => {
  if (tsvFiles.length === 0) {
    console.log('No TSV files to merge.');
  } else {
    mergeTracker();
  }
  applyPipelineUpdates();
});

function mergeTracker() {
  const listings = readFileSync(LISTINGS_PATH, 'utf8');
  const existingLines = listings.split('\n');

  const headerIdx = existingLines.findIndex(l => l.startsWith('| #'));
  if (headerIdx === -1) {
    console.error('Could not find header row in listings.md');
    process.exitCode = 1;
    return;
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
      const [num, date, portal, type, location, price, m2, rooms, rawScore, status, report, notes] = cells;
      // Machine columns are dot-decimal; evaluators sometimes write the German "4,1".
      // verify-pipeline rejects that, so normalise here instead of failing the cycle.
      const score = rawScore.replace(/^(\d+),(\d+)$/, '$1.$2');
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
    writeAtomic(LISTINGS_PATH, updatedContent);
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
}

function urlsIn(line) {
  return (line.match(/https?:\/\/[^\s|]+/g) || []).map(canonicalizeUrl);
}

function applyPipelineUpdates() {
  if (!existsSync(PIPELINE_UPDATES_DIR)) return;
  const files = readdirSync(PIPELINE_UPDATES_DIR).filter(f => f.endsWith('.json')).sort();
  if (files.length === 0) return;

  const lines = readFileSync(PIPELINE_PATH, 'utf8').split('\n');
  let applied = 0;
  const consumed = []; // deleted only after pipeline.md is safely written
  const trackerNotes = [];
  for (const file of files) {
    const full = join(PIPELINE_UPDATES_DIR, file);
    let update;
    try {
      update = JSON.parse(readFileSync(full, 'utf8'));
    } catch (e) {
      console.warn(`  ⚠ Keeping ${file}: not valid JSON (${e.message})`);
      continue;
    }
    if (Array.isArray(update.tracker_notes)) {
      for (const n of update.tracker_notes) trackerNotes.push({ ...n, from: file });
    }
    const url = canonicalizeUrl(update.url);
    if (!url || typeof update.line !== 'string' || !update.line.startsWith('- [')) {
      console.warn(`  ⚠ Keeping ${file}: needs "url" and a "line" starting with "- ["`);
      continue;
    }
    const idx = lines.findIndex(l => l.startsWith('- [ ]') && urlsIn(l).includes(url));
    if (idx !== -1) {
      lines[idx] = update.line.replace(/\s*\n.*/s, '');
      applied++;
      consumed.push(full);
    } else if (lines.some(l => urlsIn(l).includes(url))) {
      console.log(`  Skip ${file}: ${url} is no longer pending in pipeline.md`);
      consumed.push(full);
    } else {
      console.warn(`  ⚠ Keeping ${file}: ${url} not found in pipeline.md`);
    }
  }
  if (applied > 0) writeAtomic(PIPELINE_PATH, lines.join('\n'));
  if (trackerNotes.length > 0) applyTrackerNotes(trackerNotes);
  for (const full of consumed) unlinkSync(full);
  console.log(`Applied ${applied} pipeline update(s) from ${files.length} file(s).`);
}

// Cross-row findings staged by evaluators (see header). Notes are appended once
// (idempotent on re-run); status may only become Expired.
function applyTrackerNotes(notes) {
  const lines = readFileSync(LISTINGS_PATH, 'utf8').split('\n');
  let changed = 0;
  for (const n of notes) {
    const num = String(n.num || '').replace(/^#/, '');
    const idx = lines.findIndex(l => l.startsWith('|') && parseListingRow(l)[0].replace(/^0+(?=\d)/, '') === num.replace(/^0+(?=\d)/, ''));
    if (idx === -1) {
      console.warn(`  ⚠ tracker_notes (${n.from}): #${num} not in listings.md — skipped`);
      continue;
    }
    const cells = parseListingRow(lines[idx]);
    while (cells.length < 12) cells.push('');
    if (n.status) {
      if (n.status !== 'Expired') {
        console.warn(`  ⚠ tracker_notes (${n.from}): refusing status "${n.status}" for #${num} (only Expired is automatic)`);
      } else if (cells[9] !== 'Expired') {
        cells[9] = 'Expired';
        changed++;
      }
    }
    const append = String(n.append || '').replace(/[|\n]+/g, ' ').trim();
    if (append && !cells[11].includes(append)) {
      cells[11] = `${cells[11]} ${append}`.trim();
      changed++;
    }
    lines[idx] = `| ${cells.join(' | ')} |`;
  }
  if (changed > 0) writeAtomic(LISTINGS_PATH, lines.join('\n'));
  console.log(`Applied ${changed} tracker note change(s) from ${notes.length} staged note(s).`);
}
