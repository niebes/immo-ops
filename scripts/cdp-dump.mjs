// Fetch ONE exposé through the trusted debug Chrome (CDP :9222, `npm run chrome:immo`) and
// save it to disk, so a `Parallel: yes` evaluator can score it without touching a browser.
//
// WHY: Immowelt's DataDome wall blocks the read-only stealth driver on exposé pages
// (2026-10-07, 10-10, 10-14 — 0 chars, `blocked:true` or a silent `captcha-delivery.com`
// shell), while the debug Chrome's accrued trust clears it on the first call every time.
// Parallel workers must never drive the shared, logged-in debug Chrome themselves, so the
// ORCHESTRATOR pre-fetches serially with this script and passes the dump path to the worker.
//
// Opens its OWN tab, expands "mehr anzeigen", writes <outdir>/page.txt (innerText),
// page.html (full DOM incl. Immowelt's __UFRN_LIFECYCLE_SERVERREQUEST__ payload) and
// meta.json (finalUrl, title, JSON-LD, image URLs, fetchedAt), then closes only that tab.
// Prints one JSON line {finalUrl, title, chars, images, blocked}.
//
// Usage: node scripts/cdp-dump.mjs <url> tmp/eval/{NNN}/cdp
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
setTimeout(() => { console.error('WATCHDOG'); process.exit(9); }, 90000).unref();

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6000);
  // expand "mehr anzeigen" description toggles if present
  await page.evaluate(() => document.querySelectorAll('button').forEach((b) => {
    if (/mehr anzeigen|weiterlesen|alle anzeigen/i.test(b.textContent || '')) try { b.click(); } catch {}
  }));
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => ({
    finalUrl: location.href,
    title: document.title,
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    images: [...new Set([...document.querySelectorAll('img')].map((i) => i.currentSrc || i.src).filter((s) => /^https/.test(s)))].slice(0, 60),
    text: document.body ? document.body.innerText : '',
  }));
  fs.writeFileSync(path.join(out, 'page.txt'), data.text);
  fs.writeFileSync(path.join(out, 'page.html'), await page.content());
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ ...data, text: undefined, fetchedAt: new Date().toISOString() }, null, 1));
  const blocked = /captcha|datadome|Zugriff verweigert|access denied/i.test(data.text.slice(0, 2000)) && data.text.length < 3000;
  console.log(JSON.stringify({ finalUrl: data.finalUrl, title: data.title, chars: data.text.length, images: data.images.length, blocked }));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {}); // disconnects CDP only; the debug Chrome keeps running
}
