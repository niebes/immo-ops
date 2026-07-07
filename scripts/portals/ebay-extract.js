// CiC extraction snippet for eBay.de (Grundstücke / Freizeitgrundstück)
// Run via mcp__claude-in-chrome__javascript_tool on the eBay search results page.
// eBay 403-blocks Playwright/HTTP — CiC (real browser) only.
// Returns JSON: { count, hasNextPage, listings: [{url,title,price,m2,rooms,location,portal}] }
//
// Search URL pattern (sorted newest = _sop=10):
//   https://www.ebay.de/sch/66436/i.html?_nkw=Brandenburg&LH_TitleDesc=1&_sop=10&_dcat=66436&_udlo=1000&_udhi=60000
//
// Pagination: append &_pgn=N to the search URL (or click the "Weiter" pager).
// Repeat per page until no more pages, 100 total, or >=80% already seen.
//
// Layout note (2026): eBay uses `.s-card` containers (the old `.s-item` is gone).
// The first card is a "Shop on eBay" placeholder/ad (itemId 123456) — skipped.

(function () {
  const cards = document.querySelectorAll('.s-card');
  const seen = new Set();
  const listings = [];

  const cleanTitle = (t) =>
    (t || '')
      .split('\n')[0]
      .replace(/Wird in neuem Fenster oder Tab geöffnet/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const parsePrice = (t) => {
    if (!t) return null;
    // "EUR 14.000,00" / "14.000,00 €" -> 14000
    const m = t.replace(/[^\d.,]/g, '').match(/[\d.,]+/);
    if (!m) return null;
    const n = m[0].replace(/\./g, '').replace(',', '.');
    const v = parseFloat(n);
    return isNaN(v) ? null : Math.round(v);
  };

  cards.forEach((card) => {
    const link = card.querySelector('a[href*="/itm/"]');
    if (!link) return;
    const idm = (link.getAttribute('href') || '').match(/\/itm\/(\d+)/);
    if (!idm) return;
    const id = idm[1];
    if (id === '123456' || seen.has(id)) return; // placeholder ad / dup

    const title = cleanTitle(card.querySelector('.s-card__title')?.innerText);
    if (!title || /^Shop on eBay$/i.test(title)) return;
    seen.add(id);

    const priceTxt = card.querySelector('.s-card__price')?.innerText || '';
    const attrs = (card.querySelector('.su-card-container__attributes__primary')?.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
    const hay = title + ' ' + attrs;

    const m2Match = hay.match(/([\d.,]+)\s*(?:m²|m2|qm)\b/i);
    const roomsMatch = hay.match(/(\d+)\s*Zi/);

    listings.push({
      url: 'https://www.ebay.de/itm/' + id,
      title,
      price: parsePrice(priceTxt),
      m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
      rooms: roomsMatch ? parseInt(roomsMatch[1]) : null,
      location: '', // eBay listings carry location in the title; left blank to avoid noise
      portal: 'eBay.de Grundstücke',
    });
  });

  const nextBtn = document.querySelector('a.pagination__next, a[aria-label="Weiter"], a[type="next"]');
  const hasNextPage = !!(nextBtn && nextBtn.getAttribute('aria-disabled') !== 'true');

  // Compact transport (see immoscout24-extract.js): positional rows with the itm/ URL
  // prefix stripped (rebuilt via --url-prefix) and portal dropped (via --portal).
  //   node scripts/process-scan.mjs --portal "eBay.de Grundstücke" --url-prefix "https://www.ebay.de/itm/"
  const P = 'https://www.ebay.de/itm/';
  const L = listings.map((l) => [
    l.url.startsWith(P) ? l.url.slice(P.length) : l.url,
    l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: hasNextPage, p: P, L });
})();
