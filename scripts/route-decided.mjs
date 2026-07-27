#!/usr/bin/env node
/**
 * route-decided.mjs — fold re-listings of already-decided flats back into their
 * tracker entry, instead of letting them run through evaluate→notify as "new".
 *
 * Runs in the scan pipeline AFTER process-scan.mjs has added pending entries and
 * BEFORE AI triage (immo-find Step 3). For every pending `- [ ]` line it looks
 * for a matching decided tracker entry (lib/decided-index.mjs). On a match it
 * routes by that entry's status:
 *   - SKIP  (Rejected / Discarded / Accepted) → the pending line is moved to
 *     Processed as a DUPE and never evaluated. The user's decision stands.
 *   - ATTACH (Interested / Swap-candidate / Contacted / Viewing / Viewed /
 *     Applied) → moved to Processed as a DUPE of the live lead; the lead itself
 *     (and its follow-through in next-actions.mjs) is unchanged.
 * In both cases the candidate URL is appended to the tracker row's Notes as a
 * "re-list seen" alias, so lib/seen-urls.mjs catches that exact URL next time too.
 *
 * Expired is intentionally NOT routed — a re-list of an expired flat means it is
 * back on the market and should be evaluated afresh.
 *
 * Auto-routes silently (the design decision on 2026-07-27). Prints a summary.
 *   node scripts/route-decided.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { withLock } from './lib/lock.mjs';
import { parsePipelineLine } from './lib/dedup-core.mjs';
import { loadDecidedListings, findDecidedMatch } from './lib/decided-index.mjs';

const ROOT = process.cwd();
const PIPE = `${ROOT}/data/pipeline.md`;
const LISTINGS = `${ROOT}/data/listings.md`;
const DRY = process.argv.includes('--dry-run');
const today = new Date().toISOString().slice(0, 10);
const routed = [];

function appendAlias(listingsText, num, url) {
  const lines = listingsText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith(`| ${num} |`)) continue;
    if (lines[i].includes(url)) return listingsText; // already recorded
    // Insert the alias inside the trailing Notes cell (before the final ` |`).
    lines[i] = lines[i].replace(/\s*\|\s*$/, ` [re-list seen ${today}: ${url}] |`);
    return lines.join('\n');
  }
  return listingsText; // row not found — leave untouched
}

async function main() {
  if (!existsSync(PIPE)) { console.log('No pipeline.md — nothing to route.'); return; }

  await withLock('pipeline', { root: ROOT }, () => {
    const decided = loadDecidedListings(ROOT);
    if (decided.length === 0) { console.log('No decided tracker entries — nothing to match against.'); return; }

    const text = readFileSync(PIPE, 'utf8');
    const lines = text.split('\n');
    const head = [], pendingKeep = [], processedAdd = [], processedExisting = [], tail = [];
    let section = 'head';
    for (const line of lines) {
      if (line.startsWith('## Pending')) { section = 'pending'; head.push(line); continue; }
      if (line.startsWith('## Processed')) { section = 'processed'; continue; }
      if (line.startsWith('## ')) { section = 'other'; tail.push(line); continue; }
      if (section === 'head') head.push(line);
      else if (section === 'processed') processedExisting.push(line);
      else if (section === 'other') tail.push(line);
      else if (section === 'pending') {
        const cand = parsePipelineLine(line);
        const match = cand ? findDecidedMatch(cand, decided) : null;
        if (!match) { pendingKeep.push(line); continue; }
        const { entry, kind } = match;
        const action = entry.skip ? 'auto-skip' : 'attached to live lead';
        processedAdd.push(
          `- [x] DUPE of #${entry.num} (re-list of ${entry.status} flat, ${action}; ${kind} match) | ${cand.url} | ${cand.portal}`,
        );
        routed.push({ ...match, url: cand.url, title: cand.title });
      } else pendingKeep.push(line);
    }

    if (routed.length === 0) { console.log('No re-lists of decided flats found.'); return; }

    let listingsText = readFileSync(LISTINGS, 'utf8');
    for (const r of routed) listingsText = appendAlias(listingsText, r.entry.num, r.url);

    const out = [...head, ...pendingKeep, '', '## Processed', ...processedAdd, ...processedExisting, ...tail].join('\n');

    console.log(`Re-lists routed: ${routed.length}${DRY ? ' (dry-run, no writes)' : ''}`);
    for (const r of routed) {
      console.log(`  → #${r.entry.num} [${r.entry.status}] ${r.entry.skip ? 'SKIP' : 'ATTACH'} (${r.kind}): ${r.title || r.url}`);
    }
    if (!DRY) {
      writeFileSync(PIPE, out);
      writeFileSync(LISTINGS, listingsText);
    }
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
