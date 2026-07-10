#!/usr/bin/env node

/**
 * next-actions.mjs — follow-through checker (the "act phase" watchdog).
 *
 * Surfaces overdue actions from viewings.md + documents.md + correspondence/
 * + the tracker so a prepared-but-never-submitted application (see #216,
 * 2026-07 audit) can never rot silently again. Rules engine + parsers live in
 * lib/next-actions-lib.mjs (unit-tested).
 *
 * Usage:
 *   node scripts/next-actions.mjs                 # human report
 *   node scripts/next-actions.mjs --json          # + machine JSON as last line
 *   node scripts/next-actions.mjs --fix           # apply safe advances (Viewing→Viewed)
 *   node scripts/next-actions.mjs --mark-verified 216,230   # record liveness checks
 *
 * State: data/next-actions-state.json (user layer, gitignored) — remembers
 * when each listing's URL was last verified alive, so the ≤10-per-cycle
 * liveness queue rotates instead of rechecking the same rows.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseViewings, parseDocuments, parseTracker, parseCorrespondence, computeActions } from './lib/next-actions-lib.mjs';
import { parseListingRow } from './lib/listings-md.mjs';
import { writeAtomic } from './lib/fsx.mjs';
import { withLock } from './lib/lock.mjs';

const ROOT = process.cwd();
const LISTINGS_PATH = join(ROOT, 'data/listings.md');
const VIEWINGS_PATH = join(ROOT, 'data/viewings.md');
const DOCUMENTS_PATH = join(ROOT, 'data/documents.md');
const CORR_DIR = join(ROOT, 'correspondence');
const STATE_PATH = join(ROOT, 'data/next-actions-state.json');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const FIX = args.includes('--fix');
const mvIdx = args.indexOf('--mark-verified');

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const loadState = () => {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { verified: {} }; }
};

// ── --mark-verified: bookkeeping-only invocation ─────────────────────
if (mvIdx !== -1) {
  const nums = (args[mvIdx + 1] || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (nums.length === 0) { console.error('Usage: --mark-verified 216,230,...'); process.exit(1); }
  await withLock('data', { root: ROOT }, () => {
    const state = loadState();
    const today = new Date().toISOString().slice(0, 10);
    for (const n of nums) state.verified[n] = today;
    state.lastRun = new Date().toISOString();
    writeAtomic(STATE_PATH, JSON.stringify(state, null, 2));
  });
  console.log(`✓ Marked verified: ${nums.join(', ')}`);
  process.exit(0);
}

// ── Gather inputs ────────────────────────────────────────────────────
const tracker = parseTracker(read(LISTINGS_PATH));
const viewings = parseViewings(read(VIEWINGS_PATH));
const documents = parseDocuments(read(DOCUMENTS_PATH));
const correspondenceByListing = new Map();
if (existsSync(CORR_DIR)) {
  for (const f of readdirSync(CORR_DIR)) {
    if (!/^\d+-.*\.md$/.test(f)) continue;
    const c = parseCorrespondence(read(join(CORR_DIR, f)), f);
    if (c.listing) correspondenceByListing.set(c.listing, c);
  }
}
const state = loadState();

const { actions, livenessQueue, safeAdvances } = computeActions({
  tracker, viewings, documents, correspondenceByListing, verified: state.verified || {},
});

// Liveness nominees need a URL for the agent to check — from the report header.
for (const q of livenessQueue) {
  q.url = null;
  if (q.reportPath && existsSync(join(ROOT, q.reportPath))) {
    const m = read(join(ROOT, q.reportPath)).match(/\*\*URL:\*\*\s*(https?:\/\/\S+)/);
    if (m) q.url = m[1];
  }
}

// ── Apply safe advances (--fix) ──────────────────────────────────────
const appliedAdvances = [];
if (FIX && safeAdvances.length > 0) {
  await withLock('data', { root: ROOT }, () => {
    const lines = readFileSync(LISTINGS_PATH, 'utf8').split('\n');
    const out = lines.map((line) => {
      if (!line.startsWith('|') || line.startsWith('| #') || line.startsWith('|---')) return line;
      const cols = parseListingRow(line);
      if (cols.length < 11) return line;
      const adv = safeAdvances.find((s) => s.num === cols[0] && cols[9] === s.from);
      if (!adv) return line;
      cols[9] = adv.to;
      appliedAdvances.push(adv);
      return `| ${cols.join(' | ')} |`;
    });
    if (appliedAdvances.length > 0) writeAtomic(LISTINGS_PATH, out.join('\n'));
  });
}

// ── Human report ─────────────────────────────────────────────────────
const bySeverity = (sev) => actions.filter((a) => a.severity === sev);
console.log(`next-actions — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\n`);

for (const adv of appliedAdvances) {
  console.log(`✓ #${adv.num} ${adv.from} → ${adv.to} (${adv.reason})`);
}
if (!FIX && safeAdvances.length > 0) {
  for (const s of safeAdvances) console.log(`→ would advance #${s.num} ${s.from} → ${s.to} (${s.reason}) — run with --fix`);
}

const sections = [['⚠ OVERDUE', 'overdue'], ['◷ Due soon', 'due-soon'], ['ℹ Suggestions', 'info']];
for (const [label, sev] of sections) {
  const items = bySeverity(sev);
  if (items.length === 0) continue;
  console.log(`\n${label} (${items.length}):`);
  for (const a of items) {
    const days = a.daysOverdue > 0 ? ` [${a.daysOverdue}d]` : '';
    console.log(`  #${a.listing} · ${a.rule}${days} — ${a.summary}`);
    console.log(`      evidence: ${a.evidence.file}${a.evidence.detail ? ` (${a.evidence.detail})` : ''}`);
  }
}

if (livenessQueue.length > 0) {
  console.log(`\n⟳ Liveness queue (${livenessQueue.length} — verify these URLs are still active, then --mark-verified):`);
  for (const q of livenessQueue) {
    console.log(`  #${q.num} [${q.status}] ${q.url || '(no URL in report)'}`);
  }
}

if (actions.length === 0 && livenessQueue.length === 0 && safeAdvances.length === 0) {
  console.log('Nothing overdue. All followed through. ✓');
}

if (JSON_OUT) {
  console.log(JSON.stringify({
    generated: new Date().toISOString(),
    overdue: bySeverity('overdue'),
    dueSoon: bySeverity('due-soon'),
    info: bySeverity('info'),
    livenessQueue,
    safeAdvances,
    applied: appliedAdvances,
  }));
}
