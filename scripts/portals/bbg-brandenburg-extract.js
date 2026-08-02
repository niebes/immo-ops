// invisible-playwright extraction snippet for BBG Brandenburg
// (Brandenburgische Boden Gesellschaft — state-owned land and buildings)
// Run via evaluate_script (stealth Firefox) or javascript_tool (debug Chrome).
// Returns compact JSON: { c, n, L } — see immoscout24-extract.js for the transport format.
//
// Search URL: https://bbg-immo.de/immobilien/immobilie-kaufen-brandenburg/
//
// WHY THIS SNIPPET EXISTS: headless Playwright hits a CAPTCHA here (recorded as
// `bot_defense` in data/scan-failures.json for weeks). Verified live 2026-08-02 in the
// stealth Firefox: NO bot wall at all (`bot:false`), full render, 8 real properties. The
// block is specific to the headless fingerprint, so the portal only needs the stealth
// transport — moved playwright → invisible-playwright.
//
// DOM (verified 2026-08-02):
//   - card   -> `.property_listing` (a WordPress/Realtyna-style listing block)
//   - link   -> multiple <a href="https://bbg-immo.de/properties/{slug}"> PER CARD
//               (image link, title link, and social share links). 18 anchors = 8 properties.
//               → dedupe by URL and DROP share links (facebook.com/sharer, twitter, mailto…),
//                 which carry the property URL inside their own query string.
//   - title  -> the anchor whose text is non-empty (the image link's text is "" or "+")
//   - price  -> often ABSENT (BBG lists "Preis auf Anfrage" for most objects) → price stays
//               null, which process-scan tolerates; the evaluator reads the detail page.
//
// Inventory skews commercial (Industrie-/Gewerbeflächen) — the plot group's title_filter
// lists Gewerbe, so AI triage discards most of these. That is expected: the point is
// COVERAGE (a scanned 0 is not the same as a blocked ⛔).

(function () {
  const listings = [];
  const seen = new Set();

  const parseNum = (s) => {
    if (!s) return null;
    const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  const cards = [...document.querySelectorAll('.property_listing, [class*="property_listing"]')];

  cards.forEach((card) => {
    // Only same-origin property links; share links point at facebook/twitter/mailto and
    // merely CONTAIN the property URL in a query string.
    const link = [...card.querySelectorAll('a[href*="/properties/"]')].find((a) => {
      const h = a.getAttribute('href') || '';
      return /^(https?:\/\/(www\.)?bbg-immo\.de)?\/properties\//.test(h);
    });
    if (!link) return;

    let href = link.getAttribute('href') || '';
    if (!href) return;
    const url = (href.startsWith('http') ? href : new URL(href, window.location.origin).href)
      .split('#')[0];
    if (seen.has(url)) return;
    seen.add(url);

    // Title: the card's heading, else the first property anchor with real text
    // (the image anchor's text is empty or the "+" zoom glyph).
    const titleEl = card.querySelector('h1, h2, h3, h4, .listing-title, [class*="title"]');
    let title = (titleEl?.innerText || '').replace(/\s+/g, ' ').trim();
    if (!title || title === '+') {
      const textLink = [...card.querySelectorAll('a[href*="/properties/"]')]
        .map((a) => (a.innerText || '').replace(/\s+/g, ' ').trim())
        .find((t) => t && t !== '+');
      title = textLink || '';
    }
    // Fall back to the URL slug so a card is never dropped for a blank heading
    // (the evaluator gets the real title from the detail page).
    if (!title || title === '+') {
      title = decodeURIComponent((url.match(/\/properties\/([^/?#]+)/) || [])[1] || '')
        .replace(/[-_]+/g, ' ').trim();
    }
    if (!title) return;

    const text = (card.innerText || '').replace(/\s+/g, ' ');
    const priceM = text.match(/([\d.]+(?:,\d+)?)\s*(?:EUR|€)/);
    const m2M = text.match(/([\d.,]+)\s*m²/);

    listings.push({
      url,
      title: title.slice(0, 120),
      price: priceM ? Math.round(parseNum(priceM[1])) : null,
      m2: m2M ? parseNum(m2M[1]) : null,
      rooms: null,
      location: '',
    });
  });

  const nextBtn = document.querySelector(
    'a.next, a.next.page-numbers, a[rel="next"], .pagination a.next, [class*="pagination"] a.next'
  );
  const hasNextPage = !!nextBtn;

  const L = listings.map((l) => [
    l.url, l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: hasNextPage, L });
})();
