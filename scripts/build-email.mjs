#!/usr/bin/env node

/**
 * build-email.mjs — generate the immo-find notification email from the tracker.
 *
 * Replaces hand-typed HTML (immo-find Notify mode). Selects this cycle's
 * tracker rows, reads each row's report for URL / Warmmiete / ✓✗ summary /
 * next action / swap Suche, groups them into one section per search target,
 * and writes the HTML plus a subject line. The orchestrator then passes the
 * file's contents to the Gmail create_draft tool.
 *
 * Usage:
 *   node scripts/build-email.mjs --from 849 --to 870 \
 *        [--actions tmp/next-actions.json] [--scan-note-file tmp/scan-note.txt] \
 *        [--out tmp/email.html] [--date 2026-09-28]
 *
 *   --from/--to   tracker number range of this cycle (preferred: an hourly loop
 *                 runs several cycles per day). Without it: rows dated --date
 *                 (default today).
 *   --actions     output of `next-actions.mjs --json` (overdue items lead the email)
 *   --scan-note-file  plain-text coverage note (every enabled-but-unprocessed
 *                 portal + blocker); HTML-escaped into the header
 *   --out         HTML destination (default tmp/email.html)
 *
 * stdout: one JSON line {subject, out, count, breakdown, top, excluded, discarded}
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import yaml from 'js-yaml';
import { writeAtomic } from './lib/fsx.mjs';
import { parseListingRow } from './lib/listings-md.mjs';
import { canonicalizeUrl } from './lib/seen-urls.mjs';
import {
  trackerRow, reportHeader, reportTitle, extractWarm, extractSummary, extractAction,
  extractSucheCheck, inferGroup, dealType, renderSection, renderOverdue, buildSubject,
  groupShort, escapeHtml, discardReason,
} from './lib/email-report.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : def;
};

const now = new Date();
const pad = n => String(n).padStart(2, '0');
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const tz = new Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';
const stamp = `${today} ${pad(now.getHours())}:${pad(now.getMinutes())}${tz ? ' ' + tz : ''}`;

const FROM = arg('--from') ? parseInt(arg('--from'), 10) : null;
const TO = arg('--to') ? parseInt(arg('--to'), 10) : null;
const DATE = arg('--date', today);
const OUT = join(ROOT, arg('--out', 'tmp/email.html'));
const ACTIONS = arg('--actions');
const NOTE_FILE = arg('--scan-note-file');

// ── config: search groups (portals.yml) joined with searches (profile.yml) ──
const portalsCfg = yaml.load(readFileSync(join(ROOT, 'portals.yml'), 'utf8'));
const profile = yaml.load(readFileSync(join(ROOT, 'config/profile.yml'), 'utf8'));
const searchByName = new Map((profile.searches || []).map(s => [s.name, s]));
const groups = (portalsCfg.search_groups || []).map(g => {
  const s = searchByName.get(g.name) || {};
  return {
    name: g.name,
    enabled: g.enabled !== false && s.enabled !== false,
    portals: (g.portals || []).filter(p => p.enabled !== false).map(p => p.name),
    type: s.type,
    property: s.property,
    city: s.location?.city,
  };
});
const activeGroups = groups.filter(g => g.enabled);

// ── tracker rows of this cycle ──
const listingLines = readFileSync(join(ROOT, 'data/listings.md'), 'utf8')
  .split('\n').filter(l => /^\|\s*\d+\s*\|/.test(l));
const rows = listingLines.map(l => trackerRow(parseListingRow(l))).filter(r => {
  const n = parseInt(r.num, 10);
  if (FROM != null || TO != null) return (FROM == null || n >= FROM) && (TO == null || n <= TO);
  return r.date === DATE;
});

function readReport(path) {
  if (!path) return '';
  const full = join(ROOT, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

const itemsByGroup = new Map(groups.map(g => [g.name, []]));
const excluded = [];   // scored < 3.0 (not discarded)
const discarded = [];  // Discarded / Expired in range
for (const row of rows) {
  const md = readReport(row.reportPath);
  if (/^(Discarded|Expired)$/i.test(row.status)) {
    discarded.push(row);
    continue;
  }
  if (!Number.isFinite(row.score) || row.score < 3.0) {
    excluded.push(row);
    continue;
  }
  const groupName = inferGroup(row, activeGroups, md) || activeGroups[0]?.name;
  const group = groups.find(g => g.name === groupName);
  const summary = extractSummary(md);
  const swap = /swap/i.test(row.status);
  itemsByGroup.get(groupName).push({
    row,
    url: reportHeader(md, 'URL').split(/\s/)[0] || '',
    title: reportTitle(md) || row.location,
    warm: extractWarm(md),
    deal: dealType(row, reportHeader(md, 'Type')),
    property: group?.property,
    pros: summary.pros,
    cons: summary.cons,
    text: summary.text,
    action: extractAction(md),
    swap,
    suche: swap ? extractSucheCheck(md) : '',
    scam: reportHeader(md, 'Scam Assessment'),
  });
}
for (const items of itemsByGroup.values()) items.sort((a, b) => b.row.score - a.row.score);

// ── pipeline folds of the cycle date (DUPE / DISCARDED per group) ──
const firstSeen = new Map();
const histPath = join(ROOT, 'data/scan-history.tsv');
if (existsSync(histPath)) {
  for (const l of readFileSync(histPath, 'utf8').split('\n')) {
    const c = l.split('\t');
    if (c[0]?.startsWith('http')) firstSeen.set(canonicalizeUrl(c[0]), c[1]);
  }
}
const cycleDate = rows[0]?.date || DATE;
const folds = new Map(groups.map(g => [g.name, { dupe: 0, discarded: 0 }]));
for (const l of readFileSync(join(ROOT, 'data/pipeline.md'), 'utf8').split('\n')) {
  const m = l.match(/^- \[x\] (DUPE|DISCARDED)[^|]*\|\s*(https?:\/\/\S+)\s*\|\s*[^|]*\|\s*([^|]+?)\s*\|/);
  if (!m) continue;
  if (firstSeen.get(canonicalizeUrl(m[2])) !== cycleDate) continue;
  const f = folds.get(m[3]);
  if (f) f[m[1] === 'DUPE' ? 'dupe' : 'discarded']++;
}

// ── overdue actions ──
let overdue = [];
if (ACTIONS && existsSync(join(ROOT, ACTIONS))) {
  const raw = readFileSync(join(ROOT, ACTIONS), 'utf8');
  const jsonLine = raw.split('\n').reverse().find(l => l.trim().startsWith('{'));
  try { overdue = JSON.parse(jsonLine || raw).overdue || []; } catch { overdue = []; }
}

// ── assemble ──
const listed = [...itemsByGroup.values()].flat();
const breakdownParts = [];
for (const g of groups) {
  const n = itemsByGroup.get(g.name)?.length || 0;
  if (!n) continue;
  const label = groupShort(g);
  const prev = breakdownParts.find(p => p.label === label);
  if (prev) prev.n += n; else breakdownParts.push({ label, n });
}
const breakdown = breakdownParts.map(p => `${p.n} ${p.label}`).join(', ');
const subject = buildSubject(listed.length, breakdown, stamp);

const note = NOTE_FILE && existsSync(join(ROOT, NOTE_FILE)) ? readFileSync(join(ROOT, NOTE_FILE), 'utf8').trim() : '';
const evaluated = rows.length;

const footerBits = [];
footerBits.push(excluded.length
  ? `Excluded sub-3.0: ${excluded.map(r => `#${r.num} (${Number.isFinite(r.score) ? r.score.toFixed(1) : '–'}/5 — ${r.notes.slice(0, 90)})`).join('; ')}.`
  : 'Excluded sub-3.0: none this cycle.');
if (discarded.length) {
  footerBits.push(`Discarded / expired after evaluation (not listed): ${discarded.map(r => `#${r.num} (${discardReason(r.notes)})`).join('; ')}.`);
}
const foldText = groups.filter(g => g.enabled)
  .map(g => `${g.name}: ${folds.get(g.name).dupe} DUPE, ${folds.get(g.name).discarded} discarded`).join(' · ');
footerBits.push(`Pipeline folds on ${cycleDate} — ${foldText}.`);
const nums = rows.map(r => r.num).sort();
if (nums.length) footerBits.push(`Reports: reports/${nums[0]}–${nums[nums.length - 1]}-*.md`);

const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;max-width:900px">
<h1 style="border-bottom:2px solid #1a73e8;padding-bottom:8px">immo-ops scan results</h1>
<p style="color:#666">${escapeHtml(stamp)} • ${evaluated} new listings evaluated • ${listed.length} scoring 3.0+</p>
${note ? `<p style="color:#888;font-size:12px">${escapeHtml(note)}</p>` : ''}
${renderOverdue(overdue)}
${groups.map(g => renderSection(g, itemsByGroup.get(g.name) || [])).join('\n\n')}
<p style="margin-top:18px;font-size:12px;color:#777">${footerBits.map(escapeHtml).join(' ')} · <a href="https://github.com/niebes/immo-ops">immo-ops repo</a></p>
</div>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeAtomic(OUT, html);

const top = listed.slice().sort((a, b) => b.row.score - a.row.score)[0];
console.log(JSON.stringify({
  subject,
  out: OUT.replace(ROOT + '/', ''),
  count: listed.length,
  breakdown,
  top: top ? { num: top.row.num, score: top.row.score } : null,
  overdue: overdue.length,
  excluded: excluded.length,
  discarded: discarded.length,
}));
