#!/usr/bin/env node

/**
 * login-immoscout.mjs — Interactive login to save session cookies
 *
 * Opens a visible browser, navigates to ImmoScout24 login page.
 * You log in manually. Once logged in, cookies are saved to
 * config/cookies-immoscout24.json for use by the scan script.
 *
 * Usage:
 *   node scripts/login-immoscout.mjs
 *
 * Re-run when cookies expire (scan script warns you).
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const COOKIES_PATH = 'config/cookies-immoscout24.json';

mkdirSync('config', { recursive: true });

async function main() {
  console.log('Opening browser — please log in to ImmoScout24...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'de-DE',
  });
  const page = await context.newPage();

  await page.goto('https://www.immobilienscout24.de/geschlossenerbereich/start.html');

  console.log('Waiting for login... (the script will detect when you reach the logged-in homepage)\n');
  console.log('If you have 2FA, complete it in the browser.\n');

  // Wait until we detect a logged-in state:
  // - URL changes away from login/auth pages
  // - OR a known logged-in element appears
  try {
    await page.waitForURL(url => {
      const path = new URL(url).pathname;
      return !path.includes('login')
        && !path.includes('auth')
        && !path.includes('einloggen')
        && !path.includes('sso');
    }, { timeout: 300000 }); // 5 min to log in
  } catch {
    console.error('Timed out waiting for login (5 minutes). Try again.');
    await browser.close();
    process.exit(1);
  }

  // Give the page a moment to fully load post-login cookies
  await page.waitForTimeout(3000);

  const cookies = await context.cookies();
  const immoscoutCookies = cookies.filter(c =>
    c.domain.includes('immobilienscout24') || c.domain.includes('is24')
  );

  writeFileSync(COOKIES_PATH, JSON.stringify(immoscoutCookies, null, 2));

  console.log(`\n✓ Saved ${immoscoutCookies.length} cookies to ${COOKIES_PATH}`);
  console.log('The scan script will now use these for ImmoScout24.\n');
  console.log('Re-run this script when cookies expire (scan will warn you).');

  await browser.close();
}

main().catch(err => {
  console.error('Login failed:', err.message);
  process.exit(1);
});
