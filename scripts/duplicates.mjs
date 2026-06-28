#!/usr/bin/env node

/**
 * duplicates.mjs — list the OTHER portal listings that are the SAME physical flat
 * as a given tracker listing, so downstream efforts (correspondence logs, calendar
 * invites) can show the full cross-portal footprint.
 *
 * HIGH-PRECISION matching (false dupes are worse than none — they'd mislead):
 * a scan-history row R is a duplicate of target T iff
 *   - rooms equal (when both known), AND
 *   - |m²(R) − m²(T)| ≤ 0.5, AND
 *   - ( normalized-title(R) == normalized-title(T)   // same ad text across portals
 *       OR  |price(R) − price(T)| / price(T) ≤ 0.02 )// or near-exact same rent
 *   - and R is not a Tausch/Wohnungstausch swap ad.
 * Plain m²+price-band matching is NOT enough (many distinct flats share ~73 m²/
 * 3 Zi/~1.100 €). Output is "likely duplicates — verify"; treat as a hint.
 *
 * Data source: data/scan-history.tsv (url, first_seen, portal, title, location, price, m2, rooms, status).
 *
 * Usage:
 *   node scripts/duplicates.mjs 156          # by tracker listing number (resolves the report's URL)
 *   node scripts/duplicates.mjs 168453075    # by expose id / full URL
 */

import { readFileSync, readdirSync } from 'fs';
const ROOT = process.cwd();
const arg = process.argv[2];
if (!arg) { console.error('usage: duplicates.mjs <listing#|exposeId|url>'); process.exit(1); }

const rows = readFileSync(`${ROOT}/data/scan-history.tsv`, 'utf8')
  .split('\n').filter(Boolean).map((l) => {
    const c = l.split('\t');
    return { url: c[0], portal: c[2], title: c[3] || '', location: c[4] || '', price: parseFloat(c[5]) || null, m2: parseFloat(c[6]) || null, rooms: parseFloat(c[7]) || null };
  });

const norm = (t) => (t || '').toLowerCase().replace(/[^a-zäöüß0-9]+/g, '').trim();
const isSwap = (t) => /tausch|wohnungstausch/i.test(t || '');

// Resolve canonical url → target row.
let canonUrl = null;
if (/^\d{1,3}$/.test(arg)) {
  const rep = readdirSync(`${ROOT}/reports`).find((f) => f.startsWith(`${arg}-`));
  if (rep) {
    const m = readFileSync(`${ROOT}/reports/${rep}`, 'utf8').match(/\*\*URL:\*\*\s*(\S+)/);
    if (m) canonUrl = m[1];
  }
  if (!canonUrl) { console.error(`could not resolve URL for listing #${arg} (no report URL)`); process.exit(1); }
} else {
  canonUrl = arg;
}
const key = canonUrl.replace(/^https?:\/\//, '');
const target = rows.find((r) => r.url.includes(key) || (key.length > 6 && r.url.includes(key)));
if (!target) { console.error(`no scan-history row for ${canonUrl}`); process.exit(1); }
if (target.m2 == null) { console.error('target has no m² — cannot match'); process.exit(1); }

const tNorm = norm(target.title);
const dups = [];
const seen = new Set([target.url]);
for (const r of rows) {
  if (seen.has(r.url)) continue;
  if (r.m2 == null || Math.abs(r.m2 - target.m2) > 0.5) continue;
  if (target.rooms != null && r.rooms != null && r.rooms !== target.rooms) continue;
  if (isSwap(r.title)) continue;
  const sameTitle = tNorm.length > 8 && norm(r.title) === tNorm;
  const samePrice = target.price && r.price && Math.abs(r.price - target.price) / target.price <= 0.02;
  if (!sameTitle && !samePrice) continue;
  seen.add(r.url);
  dups.push({ ...r, sameTitle });
}

console.log(`Likely duplicates of ${/^\d{1,3}$/.test(arg) ? '#' + arg : canonUrl} — "${target.title}" (~${target.m2} m², ${target.rooms ?? '?'} Zi, ${target.price ?? '?'} €): ${dups.length}`);
for (const d of dups) console.log(`- ${d.portal} · ${d.price ?? '?'} € · ${d.url}${d.sameTitle ? '' : ' (price-match)'}`);
if (!dups.length) console.log('(none found)');
