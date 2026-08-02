// invisible-playwright extraction snippet for BLB Brandenburg
// (Brandenburgischer Landesbetrieb für Liegenschaften und Bauen — state surplus property)
// Run via evaluate_script (stealth Firefox) or javascript_tool (debug Chrome).
// Returns compact JSON: { c, n, L } — see immoscout24-extract.js for the transport format.
//
// Search URL: https://blb.brandenburg.de/blb/de/aufgaben/facilitymanagement/liegenschaftsmanagement/immobilienangebote/
//
// WHY THIS SNIPPET EXISTS — same story as wbg-daheim-eg-extract.js:
// BLB is a low-volume state landlord whose offer page is USUALLY EMPTY. Verified live
// 2026-08-02: the page is NOT bot-blocked (`bot:false`, HTTP 200, full render) and reads
//   "Zur Zeit haben wir keine Immobilien im Angebot."
// but the playwright extractor (scripts/portals/blb.mjs) returned 0 cards, and scan.mjs
// classified that 0 as `bot_defense` / selector drift — so BLB was reported as a ⛔
// "bot-block, no extractor snippet" coverage gap every single run. It was never blocked;
// it just had nothing to sell.
//
// This snippet distinguishes the two cases:
//   - empty state -> { c: 0, empty: true }  → scan.mjs logs a CLEAN scan, no ⛔
//   - real offers -> best-effort card extraction
//
// ⚠ The populated path is HEURISTIC: no live listing existed when this was written, so the
// card selectors are derived from the page's own markup conventions (article/teaser blocks
// under the Immobilienangebote heading) and the historical note in portals.yml ("4 article
// elements with titles and 'Kaufpreisvorstellung: 77.000 EUR'"). RE-VERIFY the first time a
// vacancy actually appears.

(function () {
  const bodyText = document.body.innerText || '';

  // ── Empty state (the normal case) ─────────────────────────────
  // The page states this in prose inside the content article; match it loosely so a
  // wording tweak ("derzeit"/"zur Zeit", with or without "leider") still counts.
  const EMPTY_RE = /(zur\s*zeit|derzeit|momentan)[^.]{0,40}\bkeine\b[^.]{0,40}(immobilien|objekte|angebote)/i;
  if (EMPTY_RE.test(bodyText)) {
    return JSON.stringify({ c: 0, n: false, L: [], empty: true });
  }

  const listings = [];
  const seen = new Set();

  const parseNum = (s) => {
    if (!s) return null;
    const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  // Cards: prefer real content articles/teasers, but ignore the site chrome. A BLB offer
  // block links to a detail page under the same Liegenschaften path.
  const cards = [...document.querySelectorAll('article, [class*="teaser"], [class*="bb-flex-stretch"]')];

  cards.forEach((card) => {
    const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text || EMPTY_RE.test(text)) return;

    // A real offer mentions a price or an explicit Grundstück/Objekt size.
    const priceM = text.match(/(?:Kaufpreis(?:vorstellung)?|Preis)\s*:?\s*([\d.]+(?:,\d+)?)\s*(?:EUR|€)/i)
                || text.match(/([\d.]+(?:,\d+)?)\s*(?:EUR|€)/);
    const m2M = text.match(/([\d.,]+)\s*m²/);
    if (!priceM && !m2M) return;

    const link = card.querySelector('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    // Skip the page's own self-links / nav entries.
    if (!href || /^#/.test(href) || /immobilienangebote\/?$/.test(href)) return;

    const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
    if (seen.has(url)) return;
    seen.add(url);

    const title = (card.querySelector('h1, h2, h3, h4')?.innerText || link.innerText || text)
      .replace(/\s+/g, ' ').replace(/\s*Weiterlesen\s*\.*$/i, '').trim().slice(0, 120);
    if (!title) return;

    listings.push({
      url,
      title,
      price: priceM ? Math.round(parseNum(priceM[1])) : null,
      m2: m2M ? parseNum(m2M[1]) : null,
      rooms: null,
      location: '',
    });
  });

  // Single page — BLB has no pager (volume is a handful of objects at most).
  const L = listings.map((l) => [
    l.url, l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  // If nothing matched AND the empty marker was absent, return c:0 WITHOUT the empty flag so
  // scan.mjs still flags it — that combination means the page really did change.
  return JSON.stringify({ c: listings.length, n: false, L });
})();
