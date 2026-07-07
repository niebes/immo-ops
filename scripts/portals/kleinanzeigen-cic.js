// CiC extraction snippet for Kleinanzeigen (www.kleinanzeigen.de)
// Run via CiC-over-CDP: `node scripts/scan.mjs --cic` (page.evaluate on the results page).
// Returns the compact wrapper: JSON string { c, n, L } (see immoscout24-cic.js).
//
// WHY CiC: Kleinanzeigen now 403/bot-blocks headless Playwright/HTTP (empty shell).
// The dedicated, persistent, trusted debug Chrome (scripts/immo-chrome.sh) loads it
// normally — that's why this moved from scan_method: playwright to cic (2026-07-07).
//
// Search URL (sorted newest via the /sortierung:neuste/ PATH segment):
//   https://www.kleinanzeigen.de/s-wohnung-mieten/potsdam/sortierung:neuste/3-zimmer-wohnung/k0c203l7958
//
// PAGINATION: Kleinanzeigen paginates with a `/seite:N/` PATH segment, NOT a query
// param — the CiC-over-CDP driver only knows how to append `?pagenumber=N`, which
// Kleinanzeigen ignores (would re-serve page 1 → dup loop). So this returns n:false
// (single page). For a newest-first incremental scan, page 1 (~25 freshest ads) is
// the right surface; older ads were caught on prior runs.
//
// Layout (redesigned 2026 → Tailwind utility classes; the old .aditem / .ellipsis /
// .aditem-main--* semantic classes are GONE):
//   article[data-adid]          → one per ad; data-adid = id, data-href = relative URL
//     script[type="application/ld+json"] (ImageObject) → .title = clean listing title
//     innerText tail            → "… 83 m² · 3 Zi. 1.150 €" and a leading "PLZ Ort"
// m²/rooms/price are parsed from innerText (no stable class hooks survive). Detail
// URLs are NOT rebuildable from a bare id (slug varies) → field 0 = FULL URL, no
// --url-prefix. Register: node scripts/process-scan.mjs --portal "Kleinanzeigen"

(function () {
  const ORIGIN = 'https://www.kleinanzeigen.de';
  const cards = document.querySelectorAll('article[data-adid]');
  const seen = new Set();
  const listings = [];

  // German money/size: "1.150,00" / "1.150" → 1150 ; "83,5" → 83.5
  const deNum = (s) => {
    if (!s) return null;
    const m = String(s).match(/[\d.]+(?:,\d+)?/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  cards.forEach((card) => {
    const id = card.getAttribute('data-adid');
    const href = card.getAttribute('data-href')
      || card.querySelector('a[href*="/s-anzeige/"]')?.getAttribute('href');
    if (!id || !href || seen.has(id)) return;
    seen.add(id);
    const url = href.startsWith('http') ? href : ORIGIN + href;

    let ldTitle = '';
    try { ldTitle = (JSON.parse(card.querySelector('script[type="application/ld+json"]')?.textContent || '{}').title) || ''; } catch (e) { /* ignore */ }
    const title = (ldTitle || card.querySelector('h2')?.textContent || '')
      .replace(/\s+/g, ' ').trim();

    const txt = (card.innerText || '').replace(/\s+/g, ' ');
    const m2Match = txt.match(/([\d.,]+)\s*m²/);
    const roomsMatch = txt.match(/([\d.,]+)\s*Zi\.?/);
    const priceMatch = txt.match(/([\d.]+(?:,\d+)?)\s*€/);
    const locMatch = txt.match(/(\d{5}\s+\S+)/); // "14469 Potsdam" (skips leading image-count digit)

    listings.push({
      url,
      title: title.substring(0, 120),
      price: deNum(priceMatch ? priceMatch[1] : null),
      m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
      rooms: roomsMatch ? parseFloat(roomsMatch[1].replace(',', '.')) : null,
      location: locMatch ? locMatch[1] : '',
      portal: 'Kleinanzeigen',
    });
  });

  // Compact transport: positional rows, portal dropped (via --portal), full URL in
  // field 0 (no --url-prefix). n:false — see PAGINATION note above.
  const L = listings.map((l) => [
    l.url,
    l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: false, L });
})();
