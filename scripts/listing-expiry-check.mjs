#!/usr/bin/env node

// Checks if tracked listings are still active on their portals.
// Reads listings.md, extracts URLs from reports, outputs which need verification.
// Actual Playwright verification is done by the agent, not this script.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const LISTINGS_PATH = join(ROOT, 'data/listings.md');
const REPORTS_DIR = join(ROOT, 'reports');

if (!existsSync(LISTINGS_PATH)) {
  console.log('No listings.md found.');
  process.exit(0);
}

const content = readFileSync(LISTINGS_PATH, 'utf8');
const lines = content.split('\n')
  .filter(l => l.startsWith('|') && !l.startsWith('| #') && !l.startsWith('|---'));

const activeStatuses = new Set(['Evaluated', 'Interested', 'Contacted', 'Viewing']);
const activeListing = [];

for (const line of lines) {
  const cols = line.split('|').map(c => c.trim()).filter(Boolean);
  const [num, date, , , location, , , , , status] = cols;
  if (!activeStatuses.has(status)) continue;

  const reportLink = cols[10] || '';
  const reportPath = reportLink.replace(/^\[.*?\]\(/, '').replace(/\)$/, '');
  let url = null;

  if (reportPath && existsSync(join(ROOT, reportPath))) {
    const report = readFileSync(join(ROOT, reportPath), 'utf8');
    const urlMatch = report.match(/\*\*URL:\*\*\s*(https?:\/\/\S+)/);
    if (urlMatch) url = urlMatch[1];
  }

  const daysSince = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

  activeListing.push({ num, date, location, status, url, daysSince });
}

if (activeListing.length === 0) {
  console.log('No active listings to check.');
  process.exit(0);
}

console.log(`Listings to verify (${activeListing.length} active):\n`);

const urgent = activeListing.filter(l => l.daysSince > 7);
const recent = activeListing.filter(l => l.daysSince <= 7);

if (urgent.length > 0) {
  console.log('⚠ Older than 7 days (verify soon):');
  for (const l of urgent) {
    console.log(`  #${l.num} | ${l.location} | ${l.status} | ${l.daysSince}d old | ${l.url || 'no URL'}`);
  }
  console.log();
}

if (recent.length > 0) {
  console.log('Recent (likely still active):');
  for (const l of recent) {
    console.log(`  #${l.num} | ${l.location} | ${l.status} | ${l.daysSince}d old | ${l.url || 'no URL'}`);
  }
}

console.log(`\nTo verify, the agent should navigate to each URL with Playwright and check if the listing is still active.`);
