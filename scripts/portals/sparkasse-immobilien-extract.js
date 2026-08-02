// invisible-playwright extraction snippet for Sparkasse Immobilien (Sparkassen-Immobilienportal)
// Run via evaluate_script (stealth Firefox) or javascript_tool (debug Chrome).
// Returns compact JSON: { c, n, p, L } — see immoscout24-extract.js for the transport format.
//
// Search URL: https://immobilien.sparkasse.de/immobilien/brandenburg/potsdam.html
//
// WHY THIS SNIPPET EXISTS: the portal had NO extractor at all and its configured search URL
// (/immobilien/suche.html?marketingtype=SALE&objectType=LAND&…) is a confirmed 404 — it was a
// permanent ⛔ "reconfigure" coverage item. Rebuilt 2026-08-02.
//
// ── URL choice (important, and a compromise) ──────────────────────────────────
// The site has NO reachable search-results route. The search box is a JS widget with
// action="#" that never navigates, and the only listing surfaces exposed anywhere in the DOM
// are SEO city pages: /immobilien/{bundesland}[/{stadt}].html. Guessed type-filtered variants
// (…/potsdam/grundstueck.html) return 404. So the city page IS the search URL:
//   - NO property-type filter  -> mixed Häuser/Wohnungen/Grundstücke; the plot group's numeric
//                                 criteria gate + AI triage do the narrowing.
//   - NO sort-by-date param    -> order is the portal's default; dedup covers the rest.
// Detail pages are /expose/{FID-…|FIO-…}.html. NOTE those expire fast and then return
// HTTP 410 Gone (all 5 exposés a 2026-08-02 web search surfaced were already 410) — so the
// evaluator must verify liveness before scoring.
//
// ── Rendering: async, and genuinely flaky ─────────────────────────────────────
// Listings are injected client-side (portal.fio.de backend) AFTER first paint; the page shows
// "Lädt" meanwhile. Verified 2026-08-02: two identical synchronous probes seconds apart
// returned 12 cards and then 0 — a plain synchronous snippet is a coin flip. This snippet is
// therefore ASYNC and polls for up to ~12 s. That works because both backends run the snippet
// through page.evaluate(), which AWAITS a returned Promise.
//
// DOM (verified 2026-08-02):
//   - card     -> div[data-testid="estate-link"]  (a DIV, not an anchor)
//   - link     -> the card's inner <a href="/expose/FID-F12-345-948.html">
//   - title    -> [data-testid="estate-card-title"]
//   - location -> [data-testid="estate-card-subtitle"]   e.g. "Potsdam"
//   - price    -> [data-testid="cost-section"]           e.g. "Kaufpreis 450.000 €"
//   - size     -> [data-testid="mainfacts-section"]      e.g. "888 m² Grundstücksfläche"
//                 or "140 m² Wohnfläche 427 m² Grundstücksfläche" (both present)
// For the PLOT group the meaningful size is Grundstücksfläche, so that is preferred over
// Wohnfläche when both appear.

(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Poll for the client-side render (see header: it is genuinely flaky).
  let cards = [];
  for (let i = 0; i < 24; i++) {
    cards = [...document.querySelectorAll('[data-testid="estate-link"]')];
    if (cards.length) break;
    await sleep(500);
  }

  const parseNum = (s) => {
    if (!s) return null;
    const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  const listings = [];
  const seen = new Set();

  cards.forEach((card) => {
    const a = card.querySelector('a[href*="/expose/"]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href) return;
    const url = (href.startsWith('http') ? href : new URL(href, window.location.origin).href).split('#')[0];
    if (seen.has(url)) return;
    seen.add(url);

    const title = (card.querySelector('[data-testid="estate-card-title"]')?.innerText || '')
      .replace(/\s+/g, ' ').trim();
    const loc = (card.querySelector('[data-testid="estate-card-subtitle"]')?.innerText || '')
      .replace(/\s+/g, ' ').trim();

    const costTxt = (card.querySelector('[data-testid="cost-section"]')?.innerText || '')
      .replace(/\s+/g, ' ');
    const priceM = costTxt.match(/([\d.]+(?:,\d+)?)\s*(?:€|EUR)/);

    const factsTxt = (card.querySelector('[data-testid="mainfacts-section"]')?.innerText || '')
      .replace(/\s+/g, ' ');
    // Prefer Grundstücksfläche (this portal is registered under the plot search group);
    // fall back to Wohnfläche, then to any m² figure.
    const plotM = factsTxt.match(/([\d.,]+)\s*m²\s*Grundstücksfläche/i);
    const livM = factsTxt.match(/([\d.,]+)\s*m²\s*Wohnfläche/i);
    const anyM = factsTxt.match(/([\d.,]+)\s*m²/);
    const roomsM = factsTxt.match(/(\d+(?:[.,]\d+)?)\s*Zi\b/i);

    listings.push({
      url,
      title: (title || 'Sparkassen-Immobilie ' + (url.match(/\/expose\/([^/.]+)/) || [])[1] || 'Objekt').slice(0, 120),
      price: priceM ? Math.round(parseNum(priceM[1])) : null,
      m2: parseNum((plotM || livM || anyM || [])[1]),
      rooms: roomsM ? parseFloat(String(roomsM[1]).replace(',', '.')) : null,
      location: loc,
    });
  });

  // The SEO city page renders its full result list in one go — no pager exposed.
  const L = listings.map((l) => [
    l.url, l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: false, L });
})();
