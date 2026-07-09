// CiC / invisible-playwright extraction snippet for eBay.de (Grundstücke / Freizeitgrundstück)
// Run via evaluate_script (invisible) or mcp__claude-in-chrome__javascript_tool on the eBay search results page.
// eBay 403-blocks Playwright/HTTP — stealth (invisible) or CiC (real browser) only.
// Returns compact JSON: { c, n, p, L } — see immoscout24-extract.js for the transport format.
//
// Search URL pattern (sorted newest = _sop=10):
//   https://www.ebay.de/sch/66436/i.html?_nkw=Brandenburg&LH_TitleDesc=1&_sop=10&_dcat=66436&_udlo=1000&_udhi=60000
//
// Pagination: append &_pgn=N to the search URL (or click the "Weiter" pager).
// Repeat per page until no more pages, 100 total, or >=80% already seen.
//
// Layout note (2026-07): eBay dropped `.s-card`/`.s-item` for its `su-*` design system with
// OBFUSCATED per-item container classes (bQGD, a8kr, …). Stable anchors that survive the churn:
//   - each result is an <a href*="/itm/{id}"> whose nearest ancestor with a `.su-item-card__header`
//     or `.su-item-card__price` is the card;
//   - title    -> `.su-item-card__header` (falls back to the item image's alt);
//   - price    -> `.su-item-card__price` ("EUR 19.500,00");
//   - "Privat" subtitle is stripped off the title tail.
// The placeholder ad (itemId 123456) and the sponsored "mydays"/Gutschein voucher cards carry no
// real /itm price — they come back with price=null and are dropped here.

(function () {
  const seen = new Set();
  const listings = [];

  const cleanTitle = (t) =>
    (t || '')
      .replace(/Wird in neuem Fenster oder Tab geöffnet/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*Privat$/, '')
      .replace(/\s*Anzeige$/, '')
      .trim();

  const parsePrice = (t) => {
    if (!t) return null;
    const m = t.replace(/[^\d.,]/g, '').match(/[\d.,]+/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : Math.round(v);
  };

  document.querySelectorAll('a[href*="/itm/"]').forEach((link) => {
    const idm = (link.getAttribute('href') || '').match(/\/itm\/(\d+)/);
    if (!idm) return;
    const id = idm[1];
    if (id === '123456' || seen.has(id)) return; // placeholder ad / dup

    // climb to the card container (nearest ancestor holding the su-item-card header/price)
    let card = link;
    for (let i = 0; i < 8 && card; i++) {
      if (card.querySelector && card.querySelector('.su-item-card__header, .su-item-card__price')) break;
      card = card.parentElement;
    }
    if (!card) return;

    const title = cleanTitle(
      card.querySelector('.su-item-card__header')?.innerText ||
      link.querySelector('img')?.getAttribute('alt') || ''
    );
    if (!title || /^Shop on eBay$/i.test(title) || /^mydays|Gutschein/i.test(title)) return;

    const price = parsePrice(card.querySelector('.su-item-card__price')?.innerText || '');
    if (price == null) return; // sponsored/voucher/ad rows have no real item price

    seen.add(id);
    const m2Match = title.match(/([\d.,]+)\s*(?:m²|m2|qm)\b/i);
    const roomsMatch = title.match(/(\d+)\s*Zi/);

    listings.push({
      url: 'https://www.ebay.de/itm/' + id,
      title,
      price,
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
