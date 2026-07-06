#!/usr/bin/env node

/**
 * scan.mjs — Playwright-based portal scanner
 *
 * Navigates configured portals headlessly, extracts listings,
 * filters by title and profile criteria, deduplicates, and appends to pipeline.
 *
 * Usage:
 *   node scripts/scan.mjs                       # scan all enabled search groups
 *   node scripts/scan.mjs --group "Potsdam flat rental"  # scan one search group
 *   node scripts/scan.mjs --dry-run             # preview without writing
 *   node scripts/scan.mjs --portal ImmoScout24  # scan single portal (within selected groups)
 *   node scripts/scan.mjs --headed              # visible browser (debug)
 *
 * Exit codes:
 *   0  full coverage — every attempted portal processed
 *   1  hard crash
 *   2  --cic: cannot connect to the CDP debug Chrome
 *   3  completed, but some portals were NOT processed (see data/scan-failures.json)
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

// Portals attempted in THIS run, as "portal|group" keys. The failures file is
// merged, not clobbered: `scan auto` runs the Playwright pass and the CiC pass
// as two separate processes, and each must preserve the other's entries (the
// Playwright pass's bot_defense entries ARE the routing signal the CiC pass
// exists to serve). An attempted portal's stale entry is superseded by this
// run's outcome — including "no failure", which clears it.
const attemptedPortals = new Set();
const portalKey = (portalName, groupName) => `${portalName}|${groupName}`;

function writeFailuresReport() {
  let existing = [];
  try { existing = JSON.parse(readFileSync(SCAN_FAILURES_PATH, 'utf8')).failures || []; } catch { /* absent or corrupt → start fresh */ }
  const carried = existing.filter(f => !attemptedPortals.has(portalKey(f.portal, f.group)));
  const failures = [...carried, ...scanFailures];
  writeFileSync(SCAN_FAILURES_PATH, JSON.stringify({ timestamp: new Date().toISOString(), failures }, null, 2));
  return carried;
}

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

// ── CiC-over-CDP mode (`--cic`) ────────────────────────────────────
// Instead of launching a fresh headless Chrome (which the bot-protected portals
// CAPTCHA-block), connect over the DevTools protocol to a persistent, LOGGED-IN
// Chrome — the dedicated debug profile started by scripts/immo-chrome.sh. That
// browser is trusted (cookies + fingerprint history), so IS24 etc. wave it through,
// and the CiC extractor snippets run via page.evaluate() → JSON straight to disk,
// no ~1 KB channel, no chunking. Scans scan_method: cic portals (not playwright).
const CIC_MODE = args.includes('--cic');
// --deep: paginate through ALL pages, disabling the "≥80% already seen" early-stop and
// raising the per-portal listing cap. Use when scan-history has been pruned (e.g. swap
// records deleted) so still-live listings buried on later pages get re-surfaced even
// though earlier pages are dominated by already-seen non-target listings.
const DEEP = args.includes('--deep');
const cdpIdx = args.indexOf('--cdp');
const CDP_ENDPOINT = cdpIdx !== -1 ? args[cdpIdx + 1]
  : `http://127.0.0.1:${process.env.IMMO_CDP_PORT || '9222'}`;

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

// ── Profile criteria (for post-extraction filtering) ───────────────

function loadCriteria(groupName) {
  if (!profile || !profile.searches || profile.searches.length === 0) return null;
  let search = profile.searches.find(s => s.name === groupName && s.enabled !== false);
  if (!search) {
    search = profile.searches.find(s => s.enabled !== false);
    // A silent fallback here once labeled 176 pipeline entries with the wrong
    // group and bypassed criteria filtering — be loud about it.
    console.warn(`⚠ No profile search named "${groupName}" in config/profile.yml — falling back to "${search?.name || 'none'}". portals.yml group names must exactly match searches[].name.`);
  }
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
// Only objective numeric criteria + dedup gate here. Title relevance is judged by
// the AI triage step (see modes/scan.md), never by keyword matching.

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
    const MAX_LISTINGS = DEEP ? 600 : 100;
    const allListings = [];
    const seenUrls = loadSeenUrls();
    let pageNum = 1;

    while (allListings.length < MAX_LISTINGS) {
      const pageListings = await extractFn(page);
      if (pageListings.length === 0) {
        // A page that loaded and passed the CAPTCHA check but yields ZERO cards on the
        // first page is almost never a genuine "no results" — it's a soft bot-block (empty
        // shell page with no CAPTCHA text) or selector drift. Returning [] silently hides a
        // broken portal (this is exactly how Kleinanzeigen went unnoticed). Flag it so the
        // coverage report surfaces it and CiC fallback can pick it up.
        if (pageNum === 1) {
          log(`  ✗ 0 listings extracted on page 1 — probable bot-block or selector drift → flagging`);
          recordFailure(portal, groupName, 'no listings extracted (bot-block or selector drift)', 'bot_defense');
        }
        break;
      }

      // Check for early exit: if most listings on this page are already seen, stop
      let seenOnPage = 0;
      for (const l of pageListings) {
        if (seenUrls.has(l.url)) seenOnPage++;
        allListings.push(l);
      }
      log(`  page ${pageNum}: ${pageListings.length} listings (${seenOnPage} already seen)`);

      if (allListings.length >= MAX_LISTINGS) break;
      if (!DEEP && seenOnPage >= pageListings.length * 0.8) {
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
  let pipeline = existsSync(PIPELINE_PATH)
    ? readFileSync(PIPELINE_PATH, 'utf8')
    : '# Pipeline\n\n## Pending\n\n## Processed\n';
  // Without this guard a missing header makes indexOf return -1 and the
  // entries get spliced at byte 0's first newline — silent corruption.
  if (!pipeline.includes('## Pending')) pipeline += '\n## Pending\n';
  const pendingIdx = pipeline.indexOf('## Pending');
  const insertIdx = pipeline.indexOf('\n', pendingIdx) + 1;
  const entries = listings.map(l =>
    `- [ ] ${l.url} | ${l.portal} | ${groupName} | ${l.title}${l.price ? ` | ${l.price} EUR` : ''}${l.m2 ? ` | ${l.m2} m²` : ''}`
  ).join('\n') + '\n';
  writeFileSync(PIPELINE_PATH, pipeline.slice(0, insertIdx) + entries + pipeline.slice(insertIdx));
}

// ── Main ───────────────────────────────────────────────────────────

// Resolve a portal's CiC extractor snippet file (scripts/portals/{slug}-cic.js).
function cicSnippetFile(portalName) {
  const slug = cicSnippetSlug(portalName);
  const cands = [`${slug}-cic.js`, `${slug.split('-')[0]}-cic.js`, `${slug}24-cic.js`];
  for (const c of cands) {
    const p = `${ROOT}/scripts/portals/${c}`;
    if (existsSync(p)) return p;
  }
  return null;
}

// IS24-style pagination: set/replace &pagenumber=N. Single-page portals return
// hasNextPage=false and never reach here.
function withPageParam(url, n) {
  if (/[?&]pagenumber=\d+/.test(url)) return url.replace(/([?&]pagenumber=)\d+/, `$1${n}`);
  return url + (url.includes('?') ? '&' : '?') + `pagenumber=${n}`;
}

// ── CiC scan over CDP ──────────────────────────────────────────────
// Connects to the persistent, LOGGED-IN debug Chrome (scripts/immo-chrome.sh),
// runs each scan_method: cic portal's extractor snippet via page.evaluate()
// (a string → CDP Runtime.evaluate, which is NOT subject to page CSP), and pipes
// the compact {c,n,p,L} straight to process-scan.mjs. No ~1 KB channel, no chunking.
async function runCicScan() {
  const { execFileSync } = await import('node:child_process');
  const os = await import('node:os');
  console.log(`\nimmo-ops CiC scan over CDP (${CDP_ENDPOINT})${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_ENDPOINT);
  } catch (err) {
    console.error(`✗ Cannot connect to Chrome over CDP at ${CDP_ENDPOINT}.`);
    console.error(`  Start the dedicated debug browser first:  scripts/immo-chrome.sh`);
    console.error(`  (${err.message})`);
    process.exit(2);
  }
  const context = browser.contexts()[0] || await browser.newContext();

  let totalNew = 0, portalsDone = 0;
  for (const group of searchGroups) {
    if (GROUP_FILTER && group.name !== GROUP_FILTER) continue;
    const portals = (group.portals || [])
      .filter(p => p.enabled !== false && p.scan_method === 'cic')
      .filter(p => !SINGLE_PORTAL || p.name === SINGLE_PORTAL);
    if (portals.length === 0) continue;
    console.log(`\n${'═'.repeat(50)}\nGroup: ${group.name}\n${'═'.repeat(50)}`);

    for (const portal of portals) {
      console.log(`\n[${portal.name}]`);
      attemptedPortals.add(portalKey(portal.name, group.name));
      const snippetFile = cicSnippetFile(portal.name);
      if (!snippetFile) { console.log(`  ⛔ no CiC snippet — skipping`); recordFailure(portal, group.name, 'no CiC extractor snippet', 'config'); continue; }
      if (!portal.search_url) { console.log(`  ⛔ no search_url`); recordFailure(portal, group.name, 'no_search_url', 'config'); continue; }

      const { url: baseUrl } = resolveSearchUrl(portal.search_url, findProfileSearch(profile, group.name));
      const snippetSrc = readFileSync(snippetFile, 'utf8').trim().replace(/;\s*$/, '');
      const page = await context.newPage();
      let failed = false;
      try {
        let pageNum = 1, total = 0;
        while (total < (DEEP ? 600 : 100)) {
          const url = pageNum === 1 ? baseUrl : withPageParam(baseUrl, pageNum);
          console.log(`  → page ${pageNum}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
          await page.waitForTimeout(2500);
          await handleCookieConsent(page).catch(() => {});

          // Trust model: the persistent logged-in profile usually clears the CAPTCHA
          // after a short wait (a FRESH browser never would — that's why we reuse this one).
          let blocked = isCaptcha(await page.textContent('body').catch(() => ''));
          for (let t = 0; blocked && t < 3; t++) {
            console.log(`  … CAPTCHA — waiting 8s (trusted profile usually clears)`);
            await page.waitForTimeout(8000);
            await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
            blocked = isCaptcha(await page.textContent('body').catch(() => ''));
          }
          if (blocked) { console.log(`  ⛔ still CAPTCHA-blocked — skipping`); recordFailure(portal, group.name, 'captcha (CiC/CDP)', 'bot_defense'); failed = true; break; }

          // Lazy-load nudge (some portals render cards on scroll).
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
          await page.waitForTimeout(1500);

          let resultStr = await page.evaluate(snippetSrc).catch(e => { console.log(`  ⚠ evaluate error: ${e.message}`); return null; });
          // Lazy-load portals can return 0 on the first pass — retry once after a wait.
          if (resultStr) { try { if ((JSON.parse(resultStr).c || 0) === 0 && pageNum === 1) { await page.waitForTimeout(3000); resultStr = await page.evaluate(snippetSrc).catch(() => resultStr); } } catch { /* keep */ } }
          // A dead page 1 is a broken portal, not "no new listings" — flag it so the
          // coverage report surfaces it (mirrors the Playwright path's page-1 rule;
          // silently breaking here is exactly how portals go unnoticed for weeks).
          if (!resultStr) {
            if (pageNum === 1) { recordFailure(portal, group.name, 'CiC snippet evaluate failed on page 1', 'config'); failed = true; }
            break;
          }
          let parsed;
          try { parsed = JSON.parse(resultStr); } catch {
            console.log(`  ⚠ snippet did not return JSON`);
            if (pageNum === 1) { recordFailure(portal, group.name, 'CiC snippet returned non-JSON on page 1', 'config'); failed = true; }
            break;
          }
          const pageCount = parsed.c || (parsed.L ? parsed.L.length : 0);
          if (pageCount === 0 && pageNum === 1) {
            console.log(`  ✗ 0 listings on page 1 (after retry) — selector drift or empty shell → flagging`);
            recordFailure(portal, group.name, 'CiC snippet returned 0 listings on page 1 (selector drift?)', 'config');
            failed = true;
            break;
          }
          total += pageCount;

          const tmp = `${os.tmpdir()}/immo-cic-${cicSnippetSlug(portal.name)}-${pageNum}.json`;
          writeFileSync(tmp, resultStr);
          const psArgs = ['scripts/process-scan.mjs', '--file', tmp, '--portal', portal.name, '--group', group.name];
          if (DRY_RUN) psArgs.push('--dry-run');
          let out = '', childFailed = false;
          try { out = execFileSync('node', psArgs, { cwd: ROOT, encoding: 'utf8' }); }
          catch (e) { out = (e.stdout || '') + (e.stderr || ''); childFailed = e.status !== 0; }
          process.stdout.write(out.split('\n').filter(Boolean).map(l => '    ' + l).join('\n') + '\n');
          if (childFailed) {
            recordFailure(portal, group.name, `process-scan.mjs failed: ${out.trim().split('\n')[0].slice(0, 100)}`, 'config');
            failed = true;
            break;
          }

          const processed = parseInt((out.match(/Processed:\s*(\d+)/) || [])[1] || '0', 10);
          const dups = parseInt((out.match(/Duplicates:\s*(\d+)/) || [])[1] || '0', 10);
          totalNew += parseInt((out.match(/New in pipeline:\s*(\d+)/) || [])[1] || '0', 10);

          if (!parsed.n) { console.log(`  → single page / no next`); break; }
          if (!DEEP && processed > 0 && dups >= processed * 0.8) { console.log(`  → ≥80% already seen — stopping`); break; }
          pageNum++;
          if (portal.rate_limit) await page.waitForTimeout(portal.rate_limit * 1000);
        }
        if (failed) {
          console.log(`  ⛔ not processed — see failure report`);
        } else {
          console.log(`  ✓ done (${total} listings seen)`);
          portalsDone++;
        }
      } catch (err) {
        console.log(`  ✗ error: ${err.message}`);
        recordFailure(portal, group.name, (err.message || '').slice(0, 120), 'error');
      } finally {
        await page.close().catch(() => {});
      }
    }
  }

  await browser.close().catch(() => {}); // CDP: disconnects Playwright, leaves Chrome running
  console.log(`\n${'━'.repeat(40)}`);
  console.log(`CiC portals processed: ${portalsDone}`);
  console.log(`New in pipeline:       ${totalNew}`);
  let carried = [];
  if (!DRY_RUN) carried = writeFailuresReport();
  if (scanFailures.length) {
    console.log(`\n⛔ Not processed this run:`);
    for (const f of scanFailures) console.log(`  - ${f.portal} [${f.group}] — ${f.reason}`);
  }
  if (carried.length) {
    console.log(`\n⚠ Still open from other passes (carried over in ${SCAN_FAILURES_PATH.replace(ROOT + '/', '')}):`);
    for (const f of carried) console.log(`  - ${f.portal} [${f.group}] — ${f.reason} → ${f.fallback}`);
  }
  // Exit 3 = scan completed but with unprocessed portals; distinguishes a
  // partial run from full coverage (0) and from a hard crash (1/2).
  if (scanFailures.length) process.exitCode = 3;
}

async function main() {
  if (CIC_MODE) { await runCicScan(); return; }
  console.log(`\nimmo-ops scan — ${today()}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);
  console.log(`Search groups: ${searchGroups.map(g => g.name).join(', ')}`);

  const seenUrls = loadSeenUrls();
  console.log(`Dedup: ${seenUrls.size} URLs known\n`);

  const browser = await chromium.launch({ headless: !HEADED });
  const totalStats = { found: 0, added: 0, skipped_criteria: 0, skipped_dup: 0, portals: 0 };
  const allNewListings = [];
  const allHistoryLines = [];

  for (const group of searchGroups) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Group: ${group.name}`);
    console.log(`${'═'.repeat(50)}`);

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
      attemptedPortals.add(portalKey(portal.name, group.name));
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
        // NO mechanical title filtering. Relevance judgements that depend on reading
        // the title (apartment swaps, garages/parking, commercial, WBS, sublets, …)
        // are made by the AI triage step, not by keyword matching — a keyword in a
        // title is ambiguous (e.g. "DHH mit … Garage" is a house that HAS a garage,
        // not a garage). Only the objective numeric criteria + dedup gate here; the
        // AI reads every survivor's title downstream. See modes/scan.md "AI triage".
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
  // Merged write: this run's outcome supersedes stale entries for the portals it
  // attempted (a clean pass clears them); entries from portals NOT attempted here
  // (e.g. the CiC pass's) are carried over, never clobbered.
  let carried = [];
  if (!DRY_RUN) carried = writeFailuresReport();

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

  if (carried.length > 0) {
    console.log(`\n⚠ Still open from other passes (carried over in ${SCAN_FAILURES_PATH.replace(ROOT + '/', '')}):`);
    for (const f of carried) console.log(`  - ${f.portal} [${f.group}] — ${f.reason} → ${f.fallback}`);
  }

  if (totalStats.added > 0) {
    console.log(`\n→ Run /immo-find pipeline to evaluate them.`);
  }

  // Exit 3 = scan completed but with unprocessed portals; distinguishes a
  // partial run from full coverage (0) and from a hard crash (1).
  if (scanFailures.length > 0) process.exitCode = 3;
}

main().catch(err => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});
