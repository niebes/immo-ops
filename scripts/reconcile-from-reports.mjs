#!/usr/bin/env node

/**
 * reconcile-from-reports.mjs — Repair scan-history.tsv and pipeline.md from reports/
 *
 * Reports are ground truth: each evaluation opened the REAL expose URL and recorded
 * the actual listing. The legacy ImmoScout24 card extractor (now fixed) sometimes
 * paired a URL with another listing's title/price/m²/rooms, and that bad pairing was
 * written to scan-history.tsv + pipeline.md. This script finds every URL where the
 * recorded metadata disagrees with its report and (with --apply) rewrites the record
 * to match the report.
 *
 * Usage:
 *   node scripts/reconcile-from-reports.mjs            # dry-run: list mismatches only
 *   node scripts/reconcile-from-reports.mjs --apply    # rewrite history + pipeline
 *
 * Safe by default (dry-run). --apply writes .bak copies first.
 */

import { readFileSync, readdirSync, copyFileSync, mkdirSync } from 'fs';
import { writeAtomic } from './lib/fsx.mjs';

const ROOT = process.cwd();
const REPORTS_DIR = `${ROOT}/reports`;
const HISTORY = `${ROOT}/data/scan-history.tsv`;
const PIPELINE = `${ROOT}/data/pipeline.md`;
const APPLY = process.argv.includes('--apply');

// ── number helpers ────────────────────────────────────────────────
// Reports are authored as prose and may use EITHER German ("1.443,87", "80,5",
// "3,5") or US ("1,443.87", "80.5", "3.5") convention; the data files are plain
// US ("1443.87", "80.5"). This parser is locale-robust:
//   • both '.' and ',' present → the LAST one is the decimal separator
//   • only one separator present → exactly 3 trailing digits ⇒ thousands separator
//     (strip it); 1–2 trailing digits ⇒ decimal separator
// Handles every form in our domain (rents <10k, sizes, room counts).
const toNum = (s) => {
  if (s == null) return null;
  const tok = (String(s).match(/\d[\d.,]*\d|\d/) || [])[0];
  if (tok == null) return null;
  const hasDot = tok.includes('.');
  const hasComma = tok.includes(',');
  let normalized;
  if (hasDot && hasComma) {
    const decimal = tok.lastIndexOf('.') > tok.lastIndexOf(',') ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    normalized = tok.split(thousands).join('').replace(decimal, '.');
  } else if (hasDot || hasComma) {
    const sep = hasDot ? '.' : ',';
    const after = tok.slice(tok.lastIndexOf(sep) + 1);
    normalized = after.length === 3 ? tok.split(sep).join('') : tok.replace(sep, '.');
  } else {
    normalized = tok;
  }
  const v = parseFloat(normalized);
  return isNaN(v) ? null : v;
};
// For a range like "498–552" or "498-552", return the upper bound (the SERP/headline
// figure the extractor would have captured).
const upperOfRange = (s) => {
  if (s == null) return null;
  const parts = String(s).split(/[–—]|(?<=\d)\s*-\s*(?=\d)/).map((p) => toNum(p)).filter((n) => n != null);
  return parts.length ? Math.max(...parts) : null;
};

// ── parse one report ──────────────────────────────────────────────
function parseReport(text, file) {
  const url = (text.match(/^\*\*URL:\*\*\s*(\S+)/m) || [])[1] || null;
  if (!url) return null;
  const scoreRaw = (text.match(/^\*\*Score:\*\*\s*(.+)$/m) || [])[1]?.trim() || null;
  const score = scoreRaw && /^\d/.test(scoreRaw) ? toNum(scoreRaw) : null;
  const status = scoreRaw && !/^\d/.test(scoreRaw) ? scoreRaw.toUpperCase() : null; // DISCARDED/EXPIRED
  const heading = (text.match(/^#\s+Evaluation:\s*(.+)$/m) || [])[1]?.trim() || null;

  // Kaltmiete: first "- Kaltmiete: ..." line in the Price block.
  const kaltLine = (text.match(/-\s*Kaltmiete:\s*([^\n(]+)/i) || [])[1] || null;
  const kaltmiete = kaltLine && /[–—-]/.test(kaltLine) ? upperOfRange(kaltLine) : toNum(kaltLine);

  // m²: "- Living area: 78 m²" or "Wohnfläche: 78 m²"
  const m2Line = (text.match(/-\s*(?:Living area|Wohnfläche|Wohnflaeche|Größe):\s*([^\n(]+)/i) || [])[1] || null;
  const m2 = toNum(m2Line);

  // rooms: "- Rooms: 3" or "Zimmer: 3"
  const roomsLine = (text.match(/-\s*(?:Rooms|Zimmer|Räume):\s*([^\n(]+)/i) || [])[1] || null;
  const rooms = toNum(roomsLine);

  // a date to pick the canonical report when a URL appears in several files
  const date = (text.match(/^\*\*Date:\*\*\s*(\S+)/m) || [])[1] || file.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';

  // Plausibility guards — reports mix US ("1,444", "79.2") and German ("1.444",
  // "80,5") number formats, so a single parser sometimes yields garbage (1.444 →
  // 1.444, "80,5" → 805). A value outside the plausible range means the parse
  // failed; treat that field as unknown so we never overwrite a good row with junk.
  const ok = (v, lo, hi) => (v != null && v >= lo && v <= hi ? v : null);
  let parseSkips = [];
  const kaltOk = ok(kaltmiete, 100, 10000); if (kaltmiete != null && kaltOk == null) parseSkips.push('price');
  const m2Ok = ok(m2, 15, 250); if (m2 != null && m2Ok == null) parseSkips.push('m²');
  const roomsOk = ok(rooms, 1, 12); if (rooms != null && roomsOk == null) parseSkips.push('rooms');

  return { url, file, heading, score, status, kaltmiete: kaltOk, m2: m2Ok, rooms: roomsOk, date, parseSkips };
}

// ── load reports, keep the most recent per URL ────────────────────
const reportFiles = readdirSync(REPORTS_DIR).filter((f) => f.endsWith('.md'));
const byUrl = new Map();
const dupUrls = new Map(); // url -> [files]
for (const f of reportFiles) {
  const r = parseReport(readFileSync(`${REPORTS_DIR}/${f}`, 'utf8'), f);
  if (!r) continue;
  if (!dupUrls.has(r.url)) dupUrls.set(r.url, []);
  dupUrls.get(r.url).push(f);
  const prev = byUrl.get(r.url);
  if (!prev || (r.date > prev.date)) byUrl.set(r.url, r);
}

// ── compare against scan-history.tsv ──────────────────────────────
// columns: url, first_seen, portal, title, location, price, m2, rooms, status
const histLines = readFileSync(HISTORY, 'utf8').split('\n');
const histMismatches = [];
const PRICE_TOL = 0.03; // 3%
for (let i = 1; i < histLines.length; i++) {
  const cols = histLines[i].split('\t');
  if (cols.length < 8) continue;
  const url = cols[0];
  const r = byUrl.get(url);
  if (!r) continue;
  const hp = toNum(cols[5]), hm = toNum(cols[6]), hr = toNum(cols[7]);
  const diffs = [];
  if (r.kaltmiete != null && hp != null && Math.abs(hp - r.kaltmiete) > Math.max(5, r.kaltmiete * PRICE_TOL))
    diffs.push(`price ${hp}→${r.kaltmiete}`);
  if (r.m2 != null && hm != null && Math.abs(hm - r.m2) > 1) diffs.push(`m² ${hm}→${r.m2}`);
  if (r.rooms != null && hr != null && Math.abs(hr - r.rooms) >= 1) diffs.push(`rooms ${hr}→${r.rooms}`);
  if (diffs.length) histMismatches.push({ lineNo: i, url, cols, r, diffs });
}

// ── compare against pipeline.md ───────────────────────────────────
// format: - [x] #NNN | URL | Portal | desc | score/5   (or DISCARDED/DUPE/EXPIRED tokens)
const pipeLines = readFileSync(PIPELINE, 'utf8').split('\n');
const pipeMismatches = [];
for (let i = 0; i < pipeLines.length; i++) {
  const line = pipeLines[i];
  const urlM = line.match(/https?:\/\/\S+/);
  if (!urlM) continue;
  const url = urlM[0].replace(/\s+$/, '');
  const r = byUrl.get(url);
  if (!r) continue;
  const diffs = [];
  // pipeline desc often embeds "NNNN EUR" and "NN m²"
  const pPrice = toNum((line.match(/([\d.,]+)\s*EUR/) || [])[1]);
  const pM2 = toNum((line.match(/([\d.,]+)\s*m²/) || [])[1]);
  if (r.kaltmiete != null && pPrice != null && Math.abs(pPrice - r.kaltmiete) > Math.max(5, r.kaltmiete * PRICE_TOL))
    diffs.push(`price ${pPrice}→${r.kaltmiete}`);
  if (r.m2 != null && pM2 != null && Math.abs(pM2 - r.m2) > 1) diffs.push(`m² ${pM2}→${r.m2}`);
  // score/status conflict (e.g. pipeline shows 3.8/5 but report is DISCARDED)
  // Accept both decimal separators — German-comma scores ("3,9/5") exist in
  // real pipeline lines and were silently skipped by the dot-only regex.
  const pScore = toNum((line.match(/\|\s*([\d.,]+)\/5/) || [])[1]);
  if (r.status && pScore != null) diffs.push(`status ${pScore}/5→${r.status}`);
  if (r.score != null && pScore != null && Math.abs(pScore - r.score) >= 0.1) diffs.push(`score ${pScore}→${r.score}`);
  if (diffs.length) pipeMismatches.push({ lineNo: i, url, line, r, diffs });
}

// ── report ────────────────────────────────────────────────────────
console.log(`Reports parsed: ${byUrl.size} URLs (${reportFiles.length} files)`);
const skipped = [...byUrl.values()].filter((r) => r.parseSkips && r.parseSkips.length);
if (skipped.length) {
  console.log(`Report fields skipped as unparseable (mixed number format): ${skipped.length}`);
  for (const r of skipped) console.log(`  ${r.file}: ${r.parseSkips.join(', ')}`);
}
const dups = [...dupUrls.entries()].filter(([, fs]) => fs.length > 1);
console.log(`Duplicate-URL reports: ${dups.length}`);
for (const [url, fs] of dups) console.log(`  ${url}\n     ${fs.join('\n     ')}`);

console.log(`\nscan-history mismatches: ${histMismatches.length}`);
for (const h of histMismatches) console.log(`  L${h.lineNo} ${h.url}\n     ${h.cols[3]?.slice(0, 50)} | ${h.diffs.join(', ')}  [${h.r.file}]`);

console.log(`\npipeline mismatches: ${pipeMismatches.length}`);
for (const p of pipeMismatches) console.log(`  L${p.lineNo} ${p.url}\n     ${p.diffs.join(', ')}  [${p.r.file}]`);

if (!APPLY) {
  console.log(`\n(dry-run — re-run with --apply to write changes)`);
  process.exit(0);
}

// ── apply ──────────────────────────────────────────────────────────
// Backups go to tmp/ (gitignored): timestamped, and never at risk of the
// auto-commit hook sweeping personal data into the public repo.
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
mkdirSync('tmp', { recursive: true });
copyFileSync(HISTORY, `tmp/scan-history.tsv.${stamp}.bak`);
copyFileSync(PIPELINE, `tmp/pipeline.md.${stamp}.bak`);

// True identity swap: the URL was paired with a DIFFERENT apartment entirely, so
// price AND m² both differ — title/location are stale too and must be replaced.
const isSwap = (d) => d.some((x) => x.startsWith('price')) && d.some((x) => x.startsWith('m²'));
const headingParts = (h) => {
  if (!h) return [null, null];
  const i = h.lastIndexOf(' — ');
  return i === -1 ? [h.trim(), null] : [h.slice(0, i).trim(), h.slice(i + 3).trim()];
};

for (const h of histMismatches) {
  const c = h.cols.slice();
  if (h.r.kaltmiete != null) c[5] = String(Math.round(h.r.kaltmiete)); // whole EUR
  if (h.r.m2 != null) c[6] = String(h.r.m2);
  if (h.r.rooms != null) c[7] = String(h.r.rooms);
  if (isSwap(h.diffs)) {
    const [title, area] = headingParts(h.r.heading);
    if (title) c[3] = title;      // title col
    if (area) c[4] = area;        // location col
  }
  histLines[h.lineNo] = c.join('\t');
}
writeAtomic(HISTORY, histLines.join('\n'));

for (const p of pipeMismatches) {
  let line = p.line;
  if (p.r.kaltmiete != null) line = line.replace(/([\d.]+)\s*EUR/, `${Math.round(p.r.kaltmiete)} EUR`);
  if (p.r.m2 != null) line = line.replace(/([\d.,]+)\s*m²/, `${p.r.m2} m²`);
  if (p.r.status) line = line.replace(/\|\s*[\d.]+\/5\s*$/, `| ${p.r.status} (was mispaired; see ${p.r.file})`);
  else if (p.r.score != null) line = line.replace(/\|\s*[\d.]+\/5/, `| ${p.r.score}/5`);
  pipeLines[p.lineNo] = line;
}
writeAtomic(PIPELINE, pipeLines.join('\n'));

console.log(`\n✓ Applied. Backups in tmp/: scan-history.tsv.${stamp}.bak, pipeline.md.${stamp}.bak`);
