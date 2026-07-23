// Playwright extractor for Kleinanzeigen (Haus/Grundstück purchase groups).
//
// 2026 LAYOUT: Kleinanzeigen serves DIFFERENT markup by User-Agent. Under the scan's
// Chrome UA (scan.mjs newContext) the modern Tailwind layout is served: cards are
// `article[data-adid]` with the detail URL in the `data-href` attribute, and the legacy
// `article.aditem` / `a.ellipsis` / `.aditem-main--top--left` classes are GONE (they only
// appear under a Firefox UA). The old selector matched 0 cards under Chrome → 0 listings,
// which scan.mjs misread as bot-block/selector-drift for weeks. Verified 2026-07-23.
//
// Also: the article's textContent is a JSON-LD blob, so read innerText (not textContent)
// for the price/m²/rooms regexes. This mirrors scripts/portals/kleinanzeigen-extract.js
// (the CiC/stealth snippet), run here via page.evaluate so it works under any UA.
//
// URL note: the search_url must NOT end in `/sortierung:neuste/` before the k-code — with
// no keyword segment after it, Kleinanzeigen parses the sort token as the SEARCH TERM and
// returns "keine Ergebnisse". Keyword-less form (`…/potsdam/k0c208l7958`) returns the ads.
// See portals.yml notes for both Kleinanzeigen purchase entries.

export async function extract(page) {
  return page.evaluate(() => {
    const ORIGIN = 'https://www.kleinanzeigen.de';
    const cards = document.querySelectorAll('article[data-adid]');
    const seen = new Set();
    const listings = [];

    // German money/size: "1.150,00" / "459.000" → 459000 ; "83,5" → 83.5
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
      try {
        ldTitle = (JSON.parse(card.querySelector('script[type="application/ld+json"]')?.textContent || '{}').title) || '';
      } catch { /* ignore */ }
      const title = (ldTitle || card.querySelector('h2')?.textContent || '')
        .replace(/\s+/g, ' ').trim();

      const txt = (card.innerText || '').replace(/\s+/g, ' ');
      const m2Match = txt.match(/([\d.,]+)\s*m²/);
      const roomsMatch = txt.match(/([\d.,]+)\s*Zi\.?/);
      const priceMatch = txt.match(/([\d.]+(?:,\d+)?)\s*€/);
      const locMatch = txt.match(/(\d{5}\s+\S+)/); // "14469 Potsdam"

      listings.push({
        title: title.slice(0, 120),
        url,
        price: deNum(priceMatch ? priceMatch[1] : null),
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: roomsMatch ? Math.round(parseFloat(roomsMatch[1].replace(',', '.'))) : null,
        location: locMatch ? locMatch[1] : '',
        portal: 'Kleinanzeigen',
      });
    });
    return listings;
  });
}

// Pagination on Kleinanzeigen is a `/seite:N/` PATH segment, not a clickable pager in the
// modern layout. For a recent-first incremental scan, page 1 (~25 freshest ads) is the
// right surface and dedup covers the rest — so treat as single-page.
export async function nextPage() {
  return false;
}
