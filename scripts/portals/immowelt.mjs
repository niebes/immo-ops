import { parseNumber, extractPattern } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const items = page.locator('[data-testid^="classified-card-mfe-"]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    try {
      const item = items.nth(i);
      const link = item.locator('a[href*="/expose/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (!href) continue;
      const url = (href.startsWith('http') ? href : `https://www.immowelt.de${href}`).split('?')[0];
      const title = await item.locator(
        '[data-testid="cardmfe-description-box-text-test-id"], [data-testid="cardmfe-description-text-test-id"]'
      ).first().textContent().catch(() => '');
      const priceText = await item.locator('[data-testid="cardmfe-price-testid"]').textContent().catch(() => '');
      const factsText = await item.locator('[data-testid="cardmfe-keyfacts-testid"]').textContent().catch(() => '');
      const addressText = await item.locator('[data-testid="cardmfe-description-box-address"]').textContent().catch(() => '');
      listings.push({
        title: (title || '').trim().substring(0, 120),
        url,
        price: parseNumber(extractPattern(priceText, /(\d[\d.,]*)\s*€/)),
        m2: parseNumber(extractPattern(factsText, /(\d[\d,]*)\s*m²/)),
        rooms: parseNumber(extractPattern(factsText, /(\d+)\s*Zimmer|(\d+)\s*Zi/)),
        location: (addressText || '').trim(),
        portal: 'Immowelt',
      });
    } catch { /* skip */ }
  }
  return listings;
}

export async function nextPage(page) {
  // ⚠ Do NOT paginate by URL here. Immowelt 302s every search URL to a canonical
  // SEO/neighbourhood path that DROPS ALL query params — `page` included — so `?page=N`
  // silently re-serves page 1. The old code did exactly that and returned `cards > 0`,
  // reporting the same page as a fresh one; the scanner then re-scanned page 1 until
  // MAX_LISTINGS. Verified 2026-08-23 on Grunewald (32 cards reported as 128 listings
  // over 4 identical "pages") and Potsdam (h1 "268 Wohnungen", page=2 identical first
  // card — only the first 32 of 268 had EVER been seen).
  //
  // The real pager is a react-aria button row that is LAZY-RENDERED: it does not exist
  // in the DOM until the result list is scrolled to the bottom. That absence is what the
  // original "SPA button click breaks in headless" note was actually seeing — the button
  // was not there yet, rather than unclickable. Scroll first, then drive it. The active
  // page carries aria-current="page"; every other button is labelled "zu seite N".
  const CARD = '[data-testid^="classified-card-mfe-"]';
  const firstHref = () =>
    page.locator(`${CARD} a[href*="/expose/"]`).first().getAttribute('href').catch(() => null);

  const firstBefore = await firstHref();

  const currentText = await page
    .locator('button[aria-current="page"]')
    .first()
    .textContent()
    .catch(() => null);
  const current = parseInt((currentText || '1').trim(), 10);
  if (!Number.isFinite(current)) return false;

  const nextSel = `button[aria-label="zu seite ${current + 1}"]`;
  if ((await page.locator(nextSel).count()) === 0) return false; // last page

  // ⚠ MUST be activated by KEYBOARD, not clicked. An <aside> overlay sits on top of the
  // pager, so the pager button is visible and enabled but never receives the event:
  // a plain .click() times out on actionability, and click({force:true}) "succeeds"
  // while the mouse event lands on the overlay — the page silently stays put, which is
  // the most dangerous variant because it looks like it worked. focus() + Enter bypasses
  // hit-testing entirely and is what react-aria (data-react-aria-pressable) listens for.
  // Verified 2026-08-23: click → page 1, force-click → page 1, Enter → page 2.
  await page.evaluate((s) => document.querySelector(s)?.focus(), nextSel);
  await page.keyboard.press('Enter');

  // The SPA TEARS THE LIST DOWN before re-rendering, so the card count dips to 0 for a
  // moment. Poll for it to come back instead of sleeping a fixed interval — a fixed wait
  // sampled that empty gap and the `cards === 0` guard below read it as "no next page",
  // which is precisely how this looked broken after the keyboard fix was already correct.
  await page
    .waitForFunction((sel) => document.querySelectorAll(sel).length > 0, CARD, {
      timeout: 20000,
      polling: 500,
    })
    .catch(() => {});
  await page.waitForTimeout(1500);

  const cards = await page.locator(CARD).count();
  if (cards === 0) return false;

  // Belt-and-braces: if the click did not actually advance the list, stop rather than
  // re-scan the same page. This is the invariant the old URL-based version violated.
  const firstAfter = await firstHref();
  if (firstBefore && firstAfter && firstBefore === firstAfter) return false;
  return true;
}
