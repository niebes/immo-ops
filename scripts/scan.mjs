#!/usr/bin/env node

/**
 * scan.mjs — Playwright-based portal scanner
 *
 * Navigates configured portals headlessly, extracts listings,
 * filters by title and profile criteria, deduplicates, and appends to pipeline.
 *
 * Usage:
 *   node scripts/scan.mjs                       # scan all enabled search groups
 *   node scripts/scan.mjs --group "Berlin flat rental"  # scan one search group
 *   node scripts/scan.mjs --dry-run             # preview without writing
 *   node scripts/scan.mjs --portal ImmoScout24  # scan single portal (within selected groups)
 *   node scripts/scan.mjs --headed              # visible browser (debug)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { chromium } from 'playwright';
import yaml from 'js-yaml';
import { getExtractor } from './portals/index.mjs';
import { handleCookieConsent, isCaptcha } from './portals/base.mjs';
import { resolveSearchUrl, findProfileSearch } from './lib/search-url.mjs';

// ── Paths ──────────────────────────────────────────────────────────

const ROOT = process.cwd();
const PORTALS_PATH = `${ROOT}/portals.yml`;
const SCAN_HISTORY_PATH = `${ROOT}/data/scan-history.tsv`;
const PIPELINE_PATH = `${ROOT}/data/pipeline.md`;
const LISTINGS_PATH = `${ROOT}/data/listings.md`;
const PROFILE_PATH = `${ROOT}/config/profile.yml`;
const IMMOSCOUT_COOKIES_PATH = `${ROOT}/config/cookies-immoscout24.json`;
const SCAN_FAILURES_PATH = `${ROOT}/data/scan-failures.json`;

mkdirSync(`${ROOT}/data`, { recursive: true });

// ── Failure tracking ───────────────────────────────────────────────
// When a Playwright portal fails, we classify and record it so the scan/auto
// workflow can ROUTE it (CiC fallback or reconfigure) instead of silently
// dropping it. scanPortal() pushes here; main() writes data/scan-failures.json.
const scanFailures = [];

// Does a CiC extractor snippet exist for this portal? (scripts/portals/{slug}-cic.js)
function cicSnippetSlug(portalName) {
  return portalName.toLowerCase()
    .replace(/[äöü]/g, m => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m]))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function hasCicSnippet(portalName) {
  const slug = cicSnippetSlug(portalName);
  // try a couple of common slug forms
  return ['', '24'].some(suffix =>
    existsSync(`${ROOT}/scripts/portals/${slug}${suffix}-cic.js`)) ||
    existsSync(`${ROOT}/scripts/portals/${slug.split('-')[0]}-cic.js`);
}

// Classify a failure and record it with a recommended action.
function recordFailure(portal, groupName, reason, classification) {
  let fallback, action;
  if (classification === 'bot_defense') {
    fallback = 'cic';
    action = hasCicSnippet(portal.name)
      ? `Retry via CiC (real browser) — extractor exists. Auto mode will pick it up.`
      : `Retry via CiC, but NO extractor snippet exists — build one with /immo-portal (scripts/portals/{slug}-cic.js).`;
  } else if (classification === 'config') {
    fallback = 'reconfigure';
    action = `Not a transient failure — fix the portal config or rebuild the extractor via /immo-portal.`;
  } else {
    fallback = 'retry';
    action = `Transient error — retry next cycle; if it persists, consider CiC or /immo-portal.`;
  }
  scanFailures.push({ portal: portal.name, group: groupName, reason, classification, fallback, action });
}

// ── CLI args ───────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HEADED = args.includes('--headed');
const portalIdx = args.indexOf('--portal');
const SINGLE_PORTAL = portalIdx !== -1 ? args[portalIdx + 1] : null;
const groupIdx = args.indexOf('--group');
const GROUP_FILTER = groupIdx !== -1 ? args[groupIdx + 1] : null;
// Bounded concurrency for the per-portal FETCH phase. Different portals are
// independent domains, so parallelizing across them does NOT raise any single
// site's request rate (bot-defense is per-site); the real limiter is local
// RAM/CPU — each portal drives its own headless browser context (~200–300 MB).
// Default cap 4; override with --concurrency N. The dedup/write REDUCE phase
// stays strictly sequential (see main()) so scan-history/pipeline never race.
const concIdx = args.indexOf('--concurrency');
const SCAN_CONCURRENCY = Math.max(1, concIdx !== -1 ? parseInt(args[concIdx + 1], 10) || 4 : 4);

// Run `worker` over `items` with at most `limit` in flight; results are returned
// in INPUT order (not completion order) so the downstream reduce is deterministic.
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return results;
}

// ── Config ─────────────────────────────────────────────────────────

function loadYaml(path) {
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, 'utf8'));
}

const portalsConfig = loadYaml(PORTALS_PATH);
if (!portalsConfig) { console.error('Missing portals.yml'); process.exit(1); }

const profile = loadYaml(PROFILE_PATH);

// ── Resolve search groups ─────────────────────────────────────────

const allGroups = portalsConfig.search_groups;
if (!allGroups || allGroups.length === 0) {
  console.error('No search_groups found in portals.yml');
  process.exit(1);
}

const searchGroups = allGroups
  .filter(g => g.enabled !== false)
  .filter(g => !GROUP_FILTER || g.name === GROUP_FILTER);

if (searchGroups.length === 0) {
  console.error(GROUP_FILTER
    ? `No enabled search group matching "${GROUP_FILTER}"`
    : 'No enabled search groups found');
  process.exit(1);
}

function loadTitleFilter(group) {
  const tf = group.title_filter || {};
  return {
    negative: (tf.negative || []).map(k => k.toLowerCase()),
    positive: (tf.positive || []).map(k => k.toLowerCase()),
  };
}

// ── Profile criteria (for post-extraction filtering) ───────────────

function loadCriteria(groupName) {
  if (!profile || !profile.searches || profile.searches.length === 0) return null;
  const search = profile.searches.find(s => s.name === groupName && s.enabled !== false)
    || profile.searches.find(s => s.enabled !== false);
  if (!search) return null;
  const loc = search.location || {};
  return {
    minRooms: search.size?.min_rooms || null,
    minM2: search.size?.min_m2 || null,
    maxPrice: search.price?.max_kaltmiete || search.price?.max_kaufpreis || null,
    excludedAreas: (loc.excluded_areas || []).map(a => a.toLowerCase()),
  };
}

// ── Dedup ──────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();
  for (const path of [SCAN_HISTORY_PATH, PIPELINE_PATH, LISTINGS_PATH]) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }
  return seen;
}

// ── Filters ────────────────────────────────────────────────────────

// Keyword must start at a word boundary (start-of-string or a non-letter) so we
// don't match a keyword that is merely the SUFFIX of a longer word — e.g. the
// keyword "befristet" must NOT match "unbefristet" (the opposite, desirable, meaning).
// Suffix continuation IS allowed, so "tauschwohnung" still matches "Tauschwohnungen".
function titleHasKeyword(lower, kw) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-zäöüß])' + esc).test(lower);
}

function filterTitle(title, titleKw) {
  const lower = title.toLowerCase();
  if (titleKw.negative.some(k => titleHasKeyword(lower, k))) return 'skipped_title';
  if (titleKw.positive.length > 0 && !titleKw.positive.some(k => titleHasKeyword(lower, k))) return 'skipped_title';
  return null;
}

function filterCriteria(listing, criteria) {
  if (!criteria) return null;
  if (criteria.minRooms && listing.rooms && listing.rooms < criteria.minRooms) return 'skipped_criteria';
  if (criteria.minM2 && listing.m2 && listing.m2 < criteria.minM2) return 'skipped_criteria';
  if (criteria.maxPrice && listing.price && listing.price > criteria.maxPrice * 1.1) return 'skipped_criteria';
  if (criteria.excludedAreas.length > 0 && listing.location) {
    const loc = listing.location.toLowerCase();
    if (criteria.excludedAreas.some(a => loc.includes(a))) return 'skipped_criteria';
  }
  // NO positive area filter: location formats vary per portal (e.g. Immowelt's
  // "Golm, P (14476)" abbreviates Potsdam, so a literal "potsdam"/"golm (bei potsdam)"
  // match silently dropped real Golm listings — the user's home area). Active groups
  // are already URL-scoped to the target region; out-of-area outliers are caught in
  // triage. If a genuinely-nationwide portal is enabled later (DGA/BImA/etc.), scope
  // it at the search URL or add postcode filtering for THAT portal — not globally.
  return null;
}

// ── Portal scanning ────────────────────────────────────────────────

async function scanPortal(browser, portal, groupName) {
  // Buffer all per-portal output so parallel scans print as atomic blocks
  // (interleaved live logs would be unreadable). Returned to the caller, which
  // flushes the block when this portal completes.
  const logs = [];
  const log = (s) => logs.push(s);

  if (!portal.search_url) {
    log(`  ⚠ ${portal.name}: no search_url, skipping`);
    recordFailure(portal, groupName, 'no_search_url', 'config');
    return { listings: [], logs };
  }

  // Derive the query from the profile: resolve {price_max} etc. placeholders so
  // the search ceiling tracks config/profile.yml instead of a hardcoded literal.
  const { url: searchUrl, unresolved } = resolveSearchUrl(
    portal.search_url,
    findProfileSearch(profile, groupName),
  );
  if (unresolved.length) {
    log(`  ⚠ ${portal.name}: unresolved URL placeholder(s) {${unresolved.join('}, {')}} — no profile value; left literal`);
  }

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'de-DE',
  });

  // Load saved cookies for portals that need authentication
  if (portal.name.toLowerCase().includes('immoscout') && existsSync(IMMOSCOUT_COOKIES_PATH)) {
    try {
      const cookies = JSON.parse(readFileSync(IMMOSCOUT_COOKIES_PATH, 'utf8'));
      await context.addCookies(cookies);
      log(`  🔑 Loaded ${cookies.length} saved cookies`);
    } catch (err) {
      log(`  ⚠ Failed to load cookies: ${err.message}`);
    }
  }

  const page = await context.newPage();

  try {
    log(`  → Navigating...`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await page.waitForTimeout(3000);

    await handleCookieConsent(page);
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body').catch(() => '');
    if (isCaptcha(bodyText)) {
      const hasCookies = portal.name.toLowerCase().includes('immoscout') && existsSync(IMMOSCOUT_COOKIES_PATH);
      log(`  ✗ CAPTCHA detected, skipping → flagged for CiC fallback`);
      if (portal.name.toLowerCase().includes('immoscout')) {
        log(hasCookies
          ? `    Cookies loaded but expired — re-run: node scripts/login-immoscout.mjs`
          : `    Run: node scripts/login-immoscout.mjs to save session cookies`);
      }
      recordFailure(portal, groupName, 'captcha', 'bot_defense');
      return { listings: [], logs };
    }

    const { extract: extractFn, nextPage: nextPageFn } = getExtractor(portal.name);
    const MAX_LISTINGS = 100;
    const allListings = [];
    const seenUrls = loadSeenUrls();
    let pageNum = 1;

    while (allListings.length < MAX_LISTINGS) {
      const pageListings = await extractFn(page);
      if (pageListings.length === 0) break;

      // Check for early exit: if most listings on this page are already seen, stop
      let seenOnPage = 0;
      for (const l of pageListings) {
        if (seenUrls.has(l.url)) seenOnPage++;
        allListings.push(l);
      }
      log(`  page ${pageNum}: ${pageListings.length} listings (${seenOnPage} already seen)`);

      if (allListings.length >= MAX_LISTINGS) break;
      if (seenOnPage >= pageListings.length * 0.8) {
        log(`  → stopping: ≥80% already seen on page ${pageNum}`);
        break;
      }

      // Try next page
      const hasNext = await nextPageFn(page).catch(err => {
        log(`  ⚠ nextPage error: ${err.message}`);
        return false;
      });
      if (!hasNext) {
        log(`  → no more pages`);
        break;
      }
      pageNum++;

      if (portal.rate_limit) {
        await new Promise(r => setTimeout(r, portal.rate_limit * 1000));
      }
    }

    log(`  ✓ ${allListings.length} listings total (${pageNum} page${pageNum > 1 ? 's' : ''})`);
    return { listings: allListings.slice(0, MAX_LISTINGS), logs };
  } catch (err) {
    log(`  ✗ Error: ${err.message}`);
    // Reachable-but-blocked / nav failures look like bot defense → CiC fallback.
    // Genuine timeouts are transient → retry. Anything else is a generic error.
    const m = err.message || '';
    const classification = /403|forbidden|net::ERR|blocked|ERR_HTTP2|access denied/i.test(m)
      ? 'bot_defense'
      : (/timeout|timed out|navigation/i.test(m) ? 'transient' : 'error');
    recordFailure(portal, groupName, m.slice(0, 120), classification);
    return { listings: [], logs };
  } finally {
    await context.close();
  }
}

// ── Output ─────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toHistoryLine(listing, status) {
  return [listing.url, today(), listing.portal, listing.title, listing.location,
    listing.price || '', listing.m2 || '', listing.rooms || '', status].join('\t');
}

function writeScanHistory(lines) {
  const header = existsSync(SCAN_HISTORY_PATH) ? '' : 'url\tfirst_seen\tportal\ttitle\tlocation\tprice\tm2\trooms\tstatus\n';
  appendFileSync(SCAN_HISTORY_PATH, header + lines.join('\n') + '\n');
}

function writePipeline(listings, groupName) {
  const pipeline = existsSync(PIPELINE_PATH)
    ? readFileSync(PIPELINE_PATH, 'utf8')
    : '# Pipeline\n\n## Pending\n\n## Processed\n';
  const pendingIdx = pipeline.indexOf('## Pending');
  const insertIdx = pipeline.indexOf('\n', pendingIdx) + 1;
  const entries = listings.map(l =>
    `- [ ] ${l.url} | ${l.portal} | ${groupName} | ${l.title}${l.price ? ` | ${l.price} EUR` : ''}${l.m2 ? ` | ${l.m2} m²` : ''}`
  ).join('\n') + '\n';
  writeFileSync(PIPELINE_PATH, pipeline.slice(0, insertIdx) + entries + pipeline.slice(insertIdx));
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\nimmo-ops scan — ${today()}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);
  console.log(`Search groups: ${searchGroups.map(g => g.name).join(', ')}`);

  const seenUrls = loadSeenUrls();
  console.log(`Dedup: ${seenUrls.size} URLs known\n`);

  const browser = await chromium.launch({ headless: !HEADED });
  const totalStats = { found: 0, added: 0, skipped_title: 0, skipped_criteria: 0, skipped_dup: 0, portals: 0 };
  const allNewListings = [];
  const allHistoryLines = [];

  for (const group of searchGroups) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Group: ${group.name}`);
    console.log(`${'═'.repeat(50)}`);

    const titleKw = loadTitleFilter(group);
    const criteria = loadCriteria(group.name);
    if (criteria) {
      console.log(`Criteria: ≥${criteria.minRooms || '?'} rooms, ≥${criteria.minM2 || '?'} m², ≤${criteria.maxPrice || '?'} EUR`);
    }

    const portals = (group.portals || [])
      .filter(p => p.enabled !== false && p.scan_method === 'playwright')
      .filter(p => !SINGLE_PORTAL || p.name === SINGLE_PORTAL)
      .sort((a, b) => {
        if (a.captcha_risk === 'high' && b.captcha_risk !== 'high') return 1;
        if (b.captcha_risk === 'high' && a.captcha_risk !== 'high') return -1;
        return 0;
      });

    if (portals.length === 0) {
      console.log('  No enabled playwright portals in this group.');
      continue;
    }

    const groupNewListings = [];

    // ── FETCH phase: portals run in parallel (bounded), pagination stays
    // sequential inside each scanPortal. Each portal's log block flushes when
    // it completes (completion order); results come back in portal order.
    if (SCAN_CONCURRENCY > 1 && portals.length > 1) {
      console.log(`  (scanning ${portals.length} portals, up to ${SCAN_CONCURRENCY} in parallel)`);
    }
    const portalResults = await runPool(portals, SCAN_CONCURRENCY, async (portal) => {
      const { listings, logs } = await scanPortal(browser, portal, group.name);
      console.log(`\n[${portal.name}]\n${logs.join('\n')}`);
      return listings;
    });

    // ── REDUCE phase: strictly sequential, in portal order, so dedup against
    // the shared seenUrls set and the history/pipeline writes are deterministic.
    portals.forEach((portal, idx) => {
      const listings = portalResults[idx] || [];
      totalStats.portals++;
      totalStats.found += listings.length;

      for (const listing of listings) {
        const titleResult = filterTitle(listing.title, titleKw);
        if (titleResult) {
          totalStats.skipped_title++;
          allHistoryLines.push(toHistoryLine(listing, titleResult));
          continue;
        }

        const criteriaResult = filterCriteria(listing, criteria);
        if (criteriaResult) {
          totalStats.skipped_criteria++;
          allHistoryLines.push(toHistoryLine(listing, criteriaResult));
          continue;
        }

        if (seenUrls.has(listing.url)) {
          totalStats.skipped_dup++;
          continue;
        }

        seenUrls.add(listing.url);
        totalStats.added++;
        groupNewListings.push(listing);
        allHistoryLines.push(toHistoryLine(listing, 'added'));
      }
    });

    if (!DRY_RUN && groupNewListings.length > 0) {
      writePipeline(groupNewListings, group.name);
    }
    allNewListings.push(...groupNewListings);
  }

  await browser.close();

  if (!DRY_RUN && allHistoryLines.length > 0) {
    writeScanHistory(allHistoryLines);
  }

  console.log(`\n${'━'.repeat(40)}`);
  console.log(`Portals scanned:   ${totalStats.portals}`);
  console.log(`Listings found:    ${totalStats.found}`);
  console.log(`Filtered (title):  ${totalStats.skipped_title}`);
  console.log(`Filtered (criteria): ${totalStats.skipped_criteria}`);
  console.log(`Duplicates:        ${totalStats.skipped_dup}`);
  console.log(`New in pipeline:   ${totalStats.added}`);

  if (allNewListings.length > 0) {
    console.log('\nNew listings:');
    for (const l of allNewListings) {
      const details = [l.price && `${l.price} EUR`, l.m2 && `${l.m2} m²`, l.rooms && `${l.rooms} Zi`].filter(Boolean).join(', ');
      console.log(`  + ${l.portal} | ${l.title.substring(0, 60)} | ${details}`);
    }
  }

  if (!DRY_RUN && allNewListings.length > 0) {
    console.log('\nRunning cross-portal dedup...');
    const { execSync } = await import('child_process');
    try {
      const output = execSync('node scripts/dedup-listings.mjs --fix', { encoding: 'utf8', cwd: ROOT });
      console.log(output.trim());
    } catch { /* dedup is best-effort */ }
  }

  // ── Failure report + routing signal ──────────────────────────────
  // Always (re)write the failures file so a clean run clears a stale one.
  if (!DRY_RUN) {
    writeFileSync(SCAN_FAILURES_PATH, JSON.stringify({
      timestamp: new Date().toISOString(),
      failures: scanFailures,
    }, null, 2));
  }

  if (scanFailures.length > 0) {
    console.log(`\n${'⚠'.repeat(20)}`);
    console.log(`PORTALS NOT PROCESSED (${scanFailures.length}) — require follow-up:`);
    for (const f of scanFailures) {
      const tag = f.fallback === 'cic' ? '→ CiC fallback'
        : f.fallback === 'reconfigure' ? '→ reconfigure'
        : '→ retry';
      console.log(`  ⛔ ${f.portal} [${f.group}] — ${f.reason} (${f.classification}) ${tag}`);
      console.log(`     ${f.action}`);
    }
    console.log(`\n  → CiC-fallback portals must be scanned via Claude-in-Chrome before notifying.`);
    console.log(`     Details written to ${SCAN_FAILURES_PATH.replace(ROOT + '/', '')}`);
  }

  if (totalStats.added > 0) {
    console.log(`\n→ Run /immo-find pipeline to evaluate them.`);
  }
}

main().catch(err => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});
