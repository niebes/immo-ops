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

  // Wait for a POSITIVE logged-in signal. Merely "URL is not a login page" is
  // not one — the INITIAL navigation URL already satisfies that, so the old
  // waitForURL predicate could fire before login and save pre-login cookies.
  // Instead poll for a logout/abmelden link or the "Mein Konto" user menu,
  // which only exist once the session is authenticated.
  const deadline = Date.now() + 300000; // 5 min to log in (incl. 2FA)
  let loggedIn = false;
  while (Date.now() < deadline) {
    loggedIn = await page.evaluate(() => {
      if (document.querySelector('a[href*="logout" i], a[href*="abmelden" i]')) return true;
      // Login/SSO pages never show the account menu.
      if (/login|sso|auth|einloggen/i.test(location.href)) return false;
      const text = document.body ? document.body.innerText : '';
      return /mein konto|abmelden/i.test(text);
    }).catch(() => false); // mid-navigation → try again
    if (loggedIn) break;
    await page.waitForTimeout(2000);
  }
  if (!loggedIn) {
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
