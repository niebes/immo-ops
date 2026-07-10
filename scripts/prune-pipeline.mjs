#!/usr/bin/env node

/**
 * prune-pipeline.mjs — pipeline.md section hygiene + bounded growth.
 *
 * The 2026-07 audit found 680 completed `- [x]` items sitting under
 * `## Pending` (only 37 under Processed) and scan-history.tsv growing
 * ~60 KB/day unbounded. This script:
 *
 *   default        move `- [x]` lines from Pending → Processed, then archive
 *                  Processed entries older than --days (30) to
 *                  data/archive/pipeline-YYYY-MM.md. Entry age comes from the
 *                  URL's first_seen in scan-history.tsv; entries whose URL is
 *                  unknown there get an 'archived' history row appended first,
 *                  so lib/seen-urls.mjs keeps deduping them with NO change
 *                  (it reads scan-history + pipeline + listings — an archived
 *                  URL must stay visible in one of them).
 *   --history      additionally drop skipped_criteria history rows older than
 *                  90 days (they are ~89% of the file; a re-seen listing is
 *                  simply re-filtered — 'added'/'archived' rows are kept
 *                  forever, dedup depends on them). Dropped rows are appended
 *                  to data/archive/scan-history-YYYY-MM.tsv, not deleted.
 *   --repair       one-off data repairs (idempotent): dot-normalize Score
 *                  decimals in listings.md, fix 2025→2026 date typos, move
 *                  numbering-collision orphan reports to reports/archive/.
 *   --dry-run      report what would change, write nothing.
 *
 * All writes run under the shared 'data' lock.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync, renameSync } from 'fs';
import { join, basename } from 'path';
import { writeAtomic } from './lib/fsx.mjs';
import { withLock } from './lib/lock.mjs';
import { parseListingRow } from './lib/listings-md.mjs';

const ROOT = process.cwd();
const PIPELINE_PATH = join(ROOT, 'data/pipeline.md');
const LISTINGS_PATH = join(ROOT, 'data/listings.md');
const HISTORY_PATH = join(ROOT, 'data/scan-history.tsv');
const ARCHIVE_DIR = join(ROOT, 'data/archive');
const REPORTS_DIR = join(ROOT, 'reports');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DO_HISTORY = args.includes('--history');
const DO_REPAIR = args.includes('--repair');
const daysIdx = args.indexOf('--days');
const ARCHIVE_DAYS = daysIdx !== -1 ? parseInt(args[daysIdx + 1], 10) : 30;
const HISTORY_DAYS = 90;

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (dateStr) => Math.floor((today - new Date(dateStr)) / 86_400_000);

// ── scan-history index: canonical URL → first_seen ──────────────────
// Same canonicalization as lib/seen-urls.mjs so the join actually hits.
import { canonicalizeUrl } from './lib/seen-urls.mjs';

function loadHistoryIndex() {
  const map = new Map();
  if (!existsSync(HISTORY_PATH)) return map;
  for (const line of readFileSync(HISTORY_PATH, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('url\t')) continue;
    const cols = line.split('\t');
    if (cols[0] && cols[1]) map.set(canonicalizeUrl(cols[0]), cols[1]);
  }
  return map;
}

const urlOf = (line) => (line.match(/https?:\/\/[^\s|]+/) || [])[0] || '';

// ── Pipeline sections ────────────────────────────────────────────────

function prunePipeline() {
  if (!existsSync(PIPELINE_PATH)) { console.log('No pipeline.md.'); return; }
  const text = readFileSync(PIPELINE_PATH, 'utf8');
  const historyIndex = loadHistoryIndex();

  // Split into head / Pending block / Processed block, preserving anything else.
  const lines = text.split('\n');
  const pendingKeep = [], processedLines = [], head = [], tail = [];
  let section = 'head';
  let movedDone = 0;
  for (const line of lines) {
    if (line.startsWith('## Pending')) { section = 'pending'; head.push(line); continue; }
    if (line.startsWith('## Processed')) { section = 'processed'; continue; }
    if (line.startsWith('## ')) { section = 'other'; tail.push(line); continue; }
    if (section === 'head') head.push(line);
    else if (section === 'pending') {
      if (line.startsWith('- [x]')) { processedLines.push(line); movedDone++; }
      else if (line.startsWith('- [ ]') || !line.trim()) { if (line.trim()) pendingKeep.push(line); }
      else pendingKeep.push(line); // unknown prose in Pending: preserve where it was
    } else if (section === 'processed') { if (line.trim()) processedLines.push(line); }
    else tail.push(line);
  }

  // Age-partition Processed. Unknown first_seen (manually added URL, or no URL
  // at all) → keep: conservative, and the next run re-judges after the
  // 'archived' backfill below has landed in history.
  const keepProcessed = [], toArchive = [];
  const backfill = [];
  for (const line of processedLines) {
    const url = urlOf(line);
    const canon = url ? canonicalizeUrl(url) : '';
    const firstSeen = canon ? historyIndex.get(canon) : null;
    if (firstSeen && daysAgo(firstSeen) > ARCHIVE_DAYS) {
      toArchive.push({ line, month: firstSeen.slice(0, 7) });
    } else if (!firstSeen && url) {
      // URL unknown to history: make it durable there FIRST, archive next run.
      backfill.push(`${url}\t${iso(today)}\t\t\t\t\t\t\tarchived`);
      keepProcessed.push(line);
    } else {
      keepProcessed.push(line);
    }
  }

  console.log(`Pending → Processed moves: ${movedDone}`);
  console.log(`Processed kept: ${keepProcessed.length}, archived: ${toArchive.length}, history backfills: ${backfill.length}`);
  if (DRY_RUN) return;

  // head already ends with '## Pending'
  const rebuilt = [
    ...head,
    ...pendingKeep.map(l => l),
    '',
    '## Processed',
    ...keepProcessed,
    '',
    ...tail,
  ].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  writeAtomic(PIPELINE_PATH, rebuilt);

  if (backfill.length > 0) appendFileSync(HISTORY_PATH, backfill.join('\n') + '\n');

  if (toArchive.length > 0) {
    mkdirSync(ARCHIVE_DIR, { recursive: true });
    const byMonth = new Map();
    for (const { line, month } of toArchive) {
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(line);
    }
    for (const [month, ls] of byMonth) {
      const f = join(ARCHIVE_DIR, `pipeline-${month}.md`);
      const header = existsSync(f) ? '' : `# Pipeline archive ${month}\n\n`;
      appendFileSync(f, header + ls.join('\n') + '\n');
    }
    console.log(`✓ Archived to ${[...byMonth.keys()].map(m => `data/archive/pipeline-${m}.md`).join(', ')}`);
  }
}

// ── History compaction ──────────────────────────────────────────────

function pruneHistory() {
  if (!existsSync(HISTORY_PATH)) return;
  const lines = readFileSync(HISTORY_PATH, 'utf8').split('\n');
  const keep = [], drop = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith('url\t')) { keep.push(line); continue; }
    const cols = line.split('\t');
    const status = cols[8], firstSeen = cols[1];
    if (status === 'skipped_criteria' && firstSeen && daysAgo(firstSeen) > HISTORY_DAYS) drop.push(line);
    else keep.push(line);
  }
  console.log(`History: keeping ${keep.length}, dropping ${drop.length} skipped_criteria rows >${HISTORY_DAYS}d`);
  if (DRY_RUN || drop.length === 0) return;
  mkdirSync(ARCHIVE_DIR, { recursive: true });
  const f = join(ARCHIVE_DIR, `scan-history-${iso(today).slice(0, 7)}.tsv`);
  appendFileSync(f, drop.join('\n') + '\n');
  writeAtomic(HISTORY_PATH, keep.join('\n') + '\n');
  console.log(`✓ Dropped rows appended to ${f.replace(ROOT + '/', '')}`);
}

// ── One-off repairs (idempotent) ────────────────────────────────────

function repair() {
  // 1. listings.md: Score decimals comma→dot; Date typos 2025-→2026-.
  if (existsSync(LISTINGS_PATH)) {
    const lines = readFileSync(LISTINGS_PATH, 'utf8').split('\n');
    let scoreFixes = 0, dateFixes = 0;
    const out = lines.map((line) => {
      if (!line.startsWith('|') || line.startsWith('| #') || line.startsWith('|---')) return line;
      const cols = parseListingRow(line);
      if (cols.length < 11) return line;
      let changed = false;
      if (/^\d+,\d+$/.test(cols[8])) { cols[8] = cols[8].replace(',', '.'); scoreFixes++; changed = true; }
      if (/^2025-/.test(cols[1])) { cols[1] = cols[1].replace(/^2025-/, '2026-'); dateFixes++; changed = true; }
      return changed ? `| ${cols.join(' | ')} |` : line;
    });
    console.log(`listings.md: ${scoreFixes} score decimal fixes, ${dateFixes} date typo fixes`);
    if (!DRY_RUN && (scoreFixes || dateFixes)) writeAtomic(LISTINGS_PATH, out.join('\n'));
  }

  // 2. Orphan reports from the May numbering collision: an unreferenced
  //    NNN-*.md whose NNN prefix is ALSO used by a referenced file. Market/
  //    research reports are never tracker-linked by design — excluded.
  if (existsSync(REPORTS_DIR) && existsSync(LISTINGS_PATH)) {
    const listings = readFileSync(LISTINGS_PATH, 'utf8');
    const referenced = new Set([...listings.matchAll(/reports\/([^\s)]+\.md)/g)].map(m => m[1]));
    const files = readdirSync(REPORTS_DIR).filter(f => /^\d{3}-.*\.md$/.test(f));
    const referencedPrefixes = new Set([...referenced].map(f => f.slice(0, 3)));
    const orphans = files.filter(f =>
      !referenced.has(f) &&
      referencedPrefixes.has(f.slice(0, 3)) &&
      !/market|research/.test(f)
    );
    console.log(`Orphan collision reports: ${orphans.length}`);
    for (const f of orphans) console.log(`  → reports/archive/${f}`);
    if (!DRY_RUN && orphans.length > 0) {
      mkdirSync(join(REPORTS_DIR, 'archive'), { recursive: true });
      for (const f of orphans) renameSync(join(REPORTS_DIR, f), join(REPORTS_DIR, 'archive', f));
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────

await withLock('data', { root: ROOT }, () => {
  prunePipeline();
  if (DO_HISTORY) pruneHistory();
  if (DO_REPAIR) repair();
});
if (DRY_RUN) console.log('(dry run — nothing written)');
