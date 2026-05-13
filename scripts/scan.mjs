#!/usr/bin/env node

/**
 * scan.mjs — Playwright-based portal scanner
 *
 * Navigates configured portals headlessly, extracts listings,
 * filters by title and profile criteria, deduplicates, and appends to pipeline.
 *
 * Usage:
 *   node scripts/scan.mjs                       # scan all enabled portals
 *   node scripts/scan.mjs --dry-run             # preview without writing
 *   node scripts/scan.mjs --portal ImmoScout24  # scan single portal
 *   node scripts/scan.mjs --headed              # visible browser (debug)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { chromium } from 'playwright';
import yaml from 'js-yaml';
import { getExtractor } from './portals/index.mjs';
import { handleCookieConsent, isCaptcha } from './portals/base.mjs';

// ── Paths ──────────────────────────────────────────────────────────

const ROOT = process.cwd();
const PORTALS_PATH = `${ROOT}/portals.yml`;
const SCAN_HISTORY_PATH = `${ROOT}/data/scan-history.tsv`;
const PIPELINE_PATH = `${ROOT}/data/pipeline.md`;
const LISTINGS_PATH = `${ROOT}/data/listings.md`;
const PROFILE_PATH = `${ROOT}/config/profile.yml`;
const IMMOSCOUT_COOKIES_PATH = `${ROOT}/config/cookies-immoscout24.json`;

mkdirSync(`${ROOT}/data`, { recursive: true });

// ── CLI args ───────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HEADED = args.includes('--headed');
const portalIdx = args.indexOf('--portal');
const SINGLE_PORTAL = portalIdx !== -1 ? args[portalIdx + 1] : null;

// ── Config ─────────────────────────────────────────────────────────

function loadYaml(path) {
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, 'utf8'));
}

const portalsConfig = loadYaml(PORTALS_PATH);
if (!portalsConfig) { console.error('Missing portals.yml'); process.exit(1); }

const profile = loadYaml(PROFILE_PATH);
const titleFilter = portalsConfig.title_filter || {};
const negativeKeywords = (titleFilter.negative || []).map(k => k.toLowerCase());
const positiveKeywords = (titleFilter.positive || []).map(k => k.toLowerCase());

// ── Profile criteria (for post-extraction filtering) ───────────────

function loadCriteria() {
  if (!profile || !profile.searches || profile.searches.length === 0) return null;
  const search = profile.searches[0];
  return {
    minRooms: search.size?.min_rooms || null,
    minM2: search.size?.min_m2 || null,
    maxPrice: search.price?.max_kaltmiete || search.price?.max_kaufpreis || null,
    excludedAreas: (search.location?.excluded_areas || []).map(a => a.toLowerCase()),
  };
}

const criteria = loadCriteria();

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

function filterTitle(title) {
  const lower = title.toLowerCase();
  if (negativeKeywords.some(k => lower.includes(k))) return 'skipped_title';
  if (positiveKeywords.length > 0 && !positiveKeywords.some(k => lower.includes(k))) return 'skipped_title';
  return null;
}

function filterCriteria(listing) {
  if (!criteria) return null;
  if (criteria.minRooms && listing.rooms && listing.rooms < criteria.minRooms) return 'skipped_criteria';
  if (criteria.minM2 && listing.m2 && listing.m2 < criteria.minM2) return 'skipped_criteria';
  if (criteria.maxPrice && listing.price && listing.price > criteria.maxPrice * 1.1) return 'skipped_criteria';
  if (criteria.excludedAreas.length > 0 && listing.location) {
    const loc = listing.location.toLowerCase();
    if (criteria.excludedAreas.some(a => loc.includes(a))) return 'skipped_criteria';
  }
  return null;
}

// ── Portal scanning ────────────────────────────────────────────────

async function scanPortal(browser, portal) {
  if (!portal.search_url) {
    console.log(`  ⚠ ${portal.name}: no search_url, skipping`);
    return [];
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
      console.log(`  🔑 Loaded ${cookies.length} saved cookies`);
    } catch (err) {
      console.log(`  ⚠ Failed to load cookies: ${err.message}`);
    }
  }

  const page = await context.newPage();

  try {
    console.log(`  → Navigating...`);
    await page.goto(portal.search_url, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
      await page.goto(portal.search_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await page.waitForTimeout(3000);

    await handleCookieConsent(page);
    await page.waitForTimeout(1000);

    const bodyText = await page.textContent('body').catch(() => '');
    if (isCaptcha(bodyText)) {
      const hasCookies = portal.name.toLowerCase().includes('immoscout') && existsSync(IMMOSCOUT_COOKIES_PATH);
      console.log(`  ✗ CAPTCHA detected, skipping`);
      if (portal.name.toLowerCase().includes('immoscout')) {
        console.log(hasCookies
          ? `    Cookies loaded but expired — re-run: node scripts/login-immoscout.mjs`
          : `    Run: node scripts/login-immoscout.mjs to save session cookies`);
      }
      return [];
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
      console.log(`  page ${pageNum}: ${pageListings.length} listings (${seenOnPage} already seen)`);

      if (allListings.length >= MAX_LISTINGS) break;
      if (seenOnPage >= pageListings.length * 0.8) {
        console.log(`  → stopping: ≥80% already seen on page ${pageNum}`);
        break;
      }

      // Try next page
      const hasNext = await nextPageFn(page).catch(err => {
        console.log(`  ⚠ nextPage error: ${err.message}`);
        return false;
      });
      if (!hasNext) {
        console.log(`  → no more pages`);
        break;
      }
      pageNum++;

      if (portal.rate_limit) {
        await new Promise(r => setTimeout(r, portal.rate_limit * 1000));
      }
    }

    console.log(`  ✓ ${allListings.length} listings total (${pageNum} page${pageNum > 1 ? 's' : ''})`);
    return allListings.slice(0, MAX_LISTINGS);
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    return [];
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

function writePipeline(listings) {
  const pipeline = existsSync(PIPELINE_PATH)
    ? readFileSync(PIPELINE_PATH, 'utf8')
    : '# Pipeline\n\n## Pending\n\n## Processed\n';
  const pendingIdx = pipeline.indexOf('## Pending');
  const insertIdx = pipeline.indexOf('\n', pendingIdx) + 1;
  const entries = listings.map(l =>
    `- [ ] ${l.url} | ${l.portal} | ${l.title}${l.price ? ` | ${l.price} EUR` : ''}${l.m2 ? ` | ${l.m2} m²` : ''}`
  ).join('\n') + '\n';
  writeFileSync(PIPELINE_PATH, pipeline.slice(0, insertIdx) + entries + pipeline.slice(insertIdx));
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\nimmo-ops scan — ${today()}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const seenUrls = loadSeenUrls();
  console.log(`Dedup: ${seenUrls.size} URLs known`);
  if (criteria) {
    console.log(`Criteria: ≥${criteria.minRooms || '?'} rooms, ≥${criteria.minM2 || '?'} m², ≤${criteria.maxPrice || '?'} EUR`);
  }
  console.log();

  const portals = portalsConfig.portals
    .filter(p => p.enabled !== false && p.scan_method === 'playwright')
    .filter(p => !SINGLE_PORTAL || p.name === SINGLE_PORTAL)
    .sort((a, b) => {
      if (a.captcha_risk === 'high' && b.captcha_risk !== 'high') return 1;
      if (b.captcha_risk === 'high' && a.captcha_risk !== 'high') return -1;
      return 0;
    });

  if (portals.length === 0) {
    console.log('No enabled playwright portals to scan.');
    process.exit(0);
  }

  const browser = await chromium.launch({ headless: !HEADED });
  const stats = { found: 0, added: 0, skipped_title: 0, skipped_criteria: 0, skipped_dup: 0, portals: 0 };
  const newListings = [];
  const historyLines = [];

  for (const portal of portals) {
    console.log(`[${portal.name}]`);
    const listings = await scanPortal(browser, portal);
    stats.portals++;
    stats.found += listings.length;

    for (const listing of listings) {
      const titleResult = filterTitle(listing.title);
      if (titleResult) {
        stats.skipped_title++;
        historyLines.push(toHistoryLine(listing, titleResult));
        continue;
      }

      const criteriaResult = filterCriteria(listing);
      if (criteriaResult) {
        stats.skipped_criteria++;
        historyLines.push(toHistoryLine(listing, criteriaResult));
        continue;
      }

      if (seenUrls.has(listing.url)) {
        stats.skipped_dup++;
        continue;
      }

      seenUrls.add(listing.url);
      stats.added++;
      newListings.push(listing);
      historyLines.push(toHistoryLine(listing, 'added'));
    }

    if (portal.rate_limit) {
      await new Promise(r => setTimeout(r, portal.rate_limit * 1000));
    }
  }

  await browser.close();

  if (!DRY_RUN) {
    if (historyLines.length > 0) writeScanHistory(historyLines);
    if (newListings.length > 0) writePipeline(newListings);
  }

  console.log(`\n${'━'.repeat(40)}`);
  console.log(`Portals scanned:   ${stats.portals}`);
  console.log(`Listings found:    ${stats.found}`);
  console.log(`Filtered (title):  ${stats.skipped_title}`);
  console.log(`Filtered (criteria): ${stats.skipped_criteria}`);
  console.log(`Duplicates:        ${stats.skipped_dup}`);
  console.log(`New in pipeline:   ${stats.added}`);

  if (newListings.length > 0) {
    console.log('\nNew listings:');
    for (const l of newListings) {
      const details = [l.price && `${l.price} EUR`, l.m2 && `${l.m2} m²`, l.rooms && `${l.rooms} Zi`].filter(Boolean).join(', ');
      console.log(`  + ${l.portal} | ${l.title.substring(0, 60)} | ${details}`);
    }
  }

  // Run cross-portal dedup after adding new listings
  if (!DRY_RUN && newListings.length > 0) {
    console.log('\nRunning cross-portal dedup...');
    const { execSync } = await import('child_process');
    try {
      const output = execSync('node scripts/dedup-listings.mjs --fix', { encoding: 'utf8', cwd: ROOT });
      console.log(output.trim());
    } catch { /* dedup is best-effort */ }
  }

  if (stats.added > 0) {
    console.log(`\n→ Run /immo-find pipeline to evaluate them.`);
  }
}

main().catch(err => {
  console.error('Scan failed:', err.message);
  process.exit(1);
});
