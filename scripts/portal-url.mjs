#!/usr/bin/env node

/**
 * portal-url.mjs — print a portal's search_url with profile placeholders resolved.
 *
 * The CiC scan path (immo-find skill) navigates to a portal's search_url by hand,
 * so it must resolve {price_max} etc. the same way scan.mjs does for Playwright.
 * This is the shared entry point for that path — never navigate to a raw
 * portals.yml URL that may still contain {placeholders}.
 *
 * Usage:
 *   node scripts/portal-url.mjs "ImmoScout24"                      # first match across groups
 *   node scripts/portal-url.mjs --group "Berlin flat rental" "ImmoScout24"
 *   node scripts/portal-url.mjs --all                              # every enabled portal, resolved
 */

import { readFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { resolveSearchUrl, findProfileSearch } from './lib/search-url.mjs';

const ROOT = process.cwd();
const portals = yaml.load(readFileSync(`${ROOT}/portals.yml`, 'utf8')) || {};
const profile = existsSync(`${ROOT}/config/profile.yml`)
  ? yaml.load(readFileSync(`${ROOT}/config/profile.yml`, 'utf8'))
  : null;

const args = process.argv.slice(2);
const groupIdx = args.indexOf('--group');
const groupFilter = groupIdx !== -1 ? args[groupIdx + 1] : null;
const ALL = args.includes('--all');
const portalName = args.filter((a, i) => a !== '--group' && i !== groupIdx + 1 && a !== '--all')[0];

const rows = [];
for (const group of portals.search_groups || []) {
  if (group.enabled === false && !ALL) continue;
  if (groupFilter && group.name !== groupFilter) continue;
  for (const portal of group.portals || []) {
    if (portal.enabled === false && !ALL) continue;
    if (portalName && portal.name !== portalName) continue;
    if (!portal.search_url) continue;
    const { url, unresolved } = resolveSearchUrl(portal.search_url, findProfileSearch(profile, group.name));
    rows.push({ group: group.name, portal: portal.name, url, unresolved });
  }
}

if (rows.length === 0) {
  console.error('No matching portal found.');
  process.exit(1);
}

if (ALL || rows.length > 1) {
  for (const r of rows) {
    console.log(`# ${r.portal} [${r.group}]${r.unresolved.length ? `  ⚠ unresolved {${r.unresolved.join('}, {')}}` : ''}`);
    console.log(r.url);
  }
} else {
  // Single match: print just the URL so it can be piped/captured cleanly.
  if (rows[0].unresolved.length) {
    console.error(`⚠ unresolved placeholder(s): {${rows[0].unresolved.join('}, {')}}`);
  }
  console.log(rows[0].url);
}
