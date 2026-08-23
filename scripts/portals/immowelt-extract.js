// Immowelt — stealth-Firefox extractor snippet (scan_method: invisible-playwright).
//
// WHY THIS EXISTS (2026-08-23). Immowelt was `playwright` against a readable search URL
// like /suche/potsdam/wohnungen/mieten?rmi=3&ami=60&pma=1900&sort=createdate. That URL
// 302s to a canonical SEO path (/suche/mieten/wohnung/brandenburg/potsdam-14480/ad08de8638)
// which DROPS EVERY QUERY PARAM — filters, sort AND `page`. Consequences, all verified:
//   • pma/rmi/ami were never applied server-side (already noted in portals.yml)
//   • sort=createdate was never applied → the list is Relevanz-ordered, not newest-first
//   • ?page=N re-served page 1, and the old nextPage returned `cards > 0` = true, so the
//     scanner re-scanned page 1 until MAX_LISTINGS. Potsdam states "268 Wohnungen" and
//     only the first 32 had EVER been seen.
// The DOM pager cannot be clicked either: an <aside> overlay covers it, so .click() times
// out and click({force:true}) silently lands on the overlay. Keyboard Enter DOES activate
// it — and doing so revealed the route the SPA actually navigates to:
//   /classified-search?distributionTypes=Rent&estateTypes=Apartment&locations={CODE}&page=N
// That route keeps its params and paginates properly. It renders nothing on a direct
// headless-Chromium load (SPA shell only), but the stealth Firefox renders it fully —
// hence invisible-playwright plus this snippet. `locations` is the SEO slug uppercased
// (potsdam-14480/ad08de8638 → AD08DE8638; grunewald-14193/nbh2de91302033 → NBH2DE91302033).
//
// Field 0 carries the FULL detail URL (no --url-prefix): process-scan uses it verbatim
// when it starts with http, same contract as regionalimmobilien24-extract.js.

(function () {
  const cards = [...document.querySelectorAll('[data-testid^="classified-card-mfe-"]')];
  const seen = new Set();
  const listings = [];

  // German format: "1.700" → 1700, "84,87" → 84.87, "3,5" → 3.5
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

  cards.forEach((card) => {
    const a = card.querySelector('a[href*="/expose/"]');
    if (!a) return;
    // Strip the tracking query (…?serp_position=…&…_detail_XL) so the dedup key is stable —
    // scan-history canonicalises too, but an unstable field 0 also breaks the change guard.
    const url = (a.href || '').split('?')[0];
    if (!url || seen.has(url)) return;
    seen.add(url);

    const price = deNum(txt(card, '[data-testid="cardmfe-price-testid"]'));
    const facts = txt(card, '[data-testid="cardmfe-keyfacts-testid"]');
    const m2 = deNum((facts.match(/([\d.,]+)\s*m²/) || [])[1]);
    // Rooms may be "3 Zimmer" or "2,5 Zimmer" — comma/dot are DECIMAL here, never thousands.
    const roomsRaw = (facts.match(/([\d]+(?:[.,]\d+)?)\s*Zimmer/) || [])[1];
    const rooms = roomsRaw ? parseFloat(roomsRaw.replace(',', '.')) : null;
    const title =
      txt(card, '[data-testid="cardmfe-description-box-text-test-id"]') ||
      txt(card, '[data-testid="cardmfe-description-text-test-id"]');
    const loc = txt(card, '[data-testid="cardmfe-description-box-address"]');

    listings.push({ url, price, m2, rooms, title, location: loc });
  });

  // Pager: the active page carries aria-current="page"; the others are "zu seite N".
  // A next page exists iff a button for current+1 is present. Absent pager (single page
  // of results) correctly yields false.
  const curEl = document.querySelector('button[aria-current="page"]');
  const cur = curEl ? parseInt((curEl.textContent || '1').trim(), 10) : 1;
  const hasNextPage = !!document.querySelector(
    'button[aria-label="zu seite ' + (Number.isFinite(cur) ? cur + 1 : 2) + '"]'
  );

  // Immowelt states its own total in the h1 ("268 Wohnungen zur Miete in Potsdam").
  const total = (() => {
    const h = (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ');
    const m = h.match(/([\d.]+)\s*(?:Wohnung|Wohnungen|Häuser|Haus|Immobilien)/);
    return m ? parseInt(m[1].replace(/\./g, ''), 10) : null;
  })();

  // LEGITIMATE EMPTY STATE: page renders, states 0, no cards. Distinguishes a genuinely
  // empty neighbourhood from selector drift (cf. WBG Daheim / BLB).
  if (listings.length === 0 && total === 0) {
    return JSON.stringify({ c: 0, n: false, total: 0, empty: true, L: [] });
  }

  const L = listings.map((l) => [
    l.url,
    l.price,
    l.m2,
    l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: hasNextPage, total, L });
})();
