// ONE page.evaluate, never per-card locator calls. Playwright locators auto-wait: a
// selector that matches nothing makes textContent() block for the 30 s default timeout
// before its .catch fires. When Immowelt dropped `cardmfe-keyfacts-testid` (2026-10),
// that cost 30 s × ~42 cards ≈ 21 min PER PAGE — the "Immowelt Kauf hangs" of
// 2026-10-13 (logs are buffered per portal, so it looked like a pagination freeze).
// Parsing mirrors scripts/portals/immowelt-extract.js (the stealth/CDP snippet).
export async function extract(page) {
  return page.evaluate(() => {
    // German format: "1.700" → 1700, "84,87" → 84.87
    const deNum = (s) => {
      if (!s) return null;
      const m = String(s).match(/[\d.]+(?:,\d+)?/);
      if (!m) return null;
      const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
      return isNaN(v) ? null : v;
    };
    const txt = (el, sel) => {
      const n = el.querySelector(sel);
      return n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '';
    };

    const seen = new Set();
    const listings = [];
    document.querySelectorAll('[data-testid^="classified-card-mfe-"]').forEach((card) => {
      const a = card.querySelector('a[href*="/expose/"]');
      const href = a?.getAttribute('href');
      if (!href) return;
      const url = (href.startsWith('http') ? href : `https://www.immowelt.de${href}`).split('?')[0];
      if (seen.has(url)) return;
      seen.add(url);

      // Key facts ("5 Zimmer · 178 m² · 500 m² Grundstück") are a plain text line inside
      // the description box since 2026-10 — no test-id of their own. The price line also
      // holds "€/m²", so pick the first line without "€". First m² = Wohnfläche for homes,
      // Grundstücksfläche for plots (same semantics as the old keyfacts element).
      const box = card.querySelector('[data-testid="cardmfe-description-box-text-test-id"]');
      const lines = (box?.innerText || '').split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
      const facts = txt(card, '[data-testid="cardmfe-keyfacts-testid"]')
        || lines.find((l) => !l.includes('€') && /\d\s*(?:Zimmer|m²)/.test(l)) || '';
      const typeLine = lines.find((l) => !l.includes('€') && /zum Kauf|zur Miete/i.test(l)) || '';
      const roomsRaw = (facts.match(/(\d+(?:[.,]\d+)?)\s*Zimmer/) || [])[1];

      listings.push({
        title: (txt(card, '[data-testid="cardmfe-description-text-test-id"]')
          || [typeLine, facts].filter(Boolean).join(' · ')
          || lines.join(' ')).substring(0, 120),
        url,
        price: deNum(txt(card, '[data-testid="cardmfe-price-testid"]')),
        m2: deNum((facts.match(/([\d.,]+)\s*m²/) || [])[1]),
        // "2,5 Zimmer" — comma is DECIMAL here, never thousands
        rooms: roomsRaw ? parseFloat(roomsRaw.replace(',', '.')) : null,
        location: txt(card, '[data-testid="cardmfe-description-box-address"]'),
        portal: 'Immowelt',
      });
    });
    return listings;
  });
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
