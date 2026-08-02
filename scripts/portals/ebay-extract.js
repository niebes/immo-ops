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
// ── LAYOUT CHURN HISTORY (eBay rewrites this markup every few months) ──
//   .s-item          → dropped
//   .s-card          → dropped ~2026-06
//   .su-item-card__* → the 2026-07 design system (OBFUSCATED per-item wrappers)
//   .s-card + .su-card-container__*  ← CURRENT, verified live 2026-08-02
// Verified 2026-08-02 against the live Brandenburg search: 21 `.s-card` nodes = 19 real
// listings + 2 "Shop on eBay" placeholder ads (itemId 123456), matching the page's own
// "19 Ergebnisse". The su-item-card__header / su-item-card__price classes the previous
// version anchored on are now ZERO on the page — that is why it returned c:0 and the whole
// Freizeitgrundstück group lost coverage.
//
// Current stable anchors:
//   - card    -> `.s-card` (each also carries `.su-card-container`)
//   - id      -> the card's `a[href*="/itm/{id}"]`
//   - title   -> `.su-card-container__header` (tail "Wird in neuem Fenster…" / "Privat" stripped)
//   - price   -> first `EUR n.nnn,nn` inside `.su-card-container__attributes__primary`
//                (that node reads e.g. "EUR 1.000,00 Inserat Kostenlose Abholung")
// Selector sets are tried NEWEST-FIRST with the older generations kept as fallbacks, so a
// partial revert on eBay's side does not take the portal offline again.
//
// The placeholder ad (itemId 123456) and sponsored "mydays"/Gutschein voucher cards carry no
// real /itm price — they come back with price=null and are dropped here.

(function () {
  const seen = new Set();
  const listings = [];

  const TITLE_SEL = [
    '.su-card-container__header',   // current (2026-08)
    '.su-item-card__header',        // 2026-07
    '.s-item__title',               // legacy
  ].join(', ');

  const PRICE_SEL = [
    '.su-card-container__attributes__primary', // current (2026-08)
    '.su-item-card__price',                    // 2026-07
    '.s-item__price',                          // legacy
  ].join(', ');

  const CARD_SEL = '.s-card, .su-card-container, [class*="su-item-card"]';

  const cleanTitle = (t) =>
    (t || '')
      .replace(/Wird in neuem Fenster oder Tab geöffnet/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*Privat$/i, '')
      .replace(/\s*Anzeige$/i, '')
      .replace(/\s*Gewerblich$/i, '')
      .trim();

  // "EUR 1.000,00 Inserat Kostenlose Abholung" -> 1000
  // Anchored on the EUR token so trailing shipping/format noise can't be mistaken for a price.
  const parsePrice = (t) => {
    if (!t) return null;
    const m = String(t).match(/(?:EUR|€)\s*([\d.]+(?:,\d{1,2})?)/i)
           || String(t).match(/([\d.]+(?:,\d{1,2})?)\s*(?:EUR|€)/i);
    if (!m) return null;
    const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) || v <= 0 ? null : Math.round(v);
  };

  document.querySelectorAll(CARD_SEL).forEach((card) => {
    const link = card.querySelector('a[href*="/itm/"]');
    if (!link) return;
    const idm = (link.getAttribute('href') || '').match(/\/itm\/(\d+)/);
    if (!idm) return;
    const id = idm[1];
    if (id === '123456' || seen.has(id)) return; // placeholder ad / dup (nested card wrappers)

    const title = cleanTitle(
      card.querySelector(TITLE_SEL)?.innerText ||
      card.querySelector('img')?.getAttribute('alt')?.replace(/\s*Bild \d+ von \d+$/, '') || ''
    );
    if (!title || /^Shop on eBay$/i.test(title) || /^mydays|Gutschein/i.test(title)) return;

    const price = parsePrice(card.querySelector(PRICE_SEL)?.innerText || '');
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

  // Pagination. The filtered Brandenburg search is single-page (19 results as of 2026-08-02),
  // but keep the probe so a widened search still paginates. eBay currently renders no pager
  // at all when there is only one page.
  const nextBtn = document.querySelector(
    'a.pagination__next, a[type="next"], a[rel="next"], a[aria-label="Weiter"], a[aria-label="Next page"]'
  );
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
