// CiC extraction snippet for Regionalimmobilien24 (www.regionalimmobilien24.de)
// Run via mcp__claude-in-chrome__javascript_tool on the search results page.
// Returns JSON: { count, hasNextPage, listings }
//
// WHY CiC: the site bot-blocks headless Playwright. Use the real browser.
//
// IMPORTANT — this page needs prep before the snippet returns anything:
//   1. A TCF cookie-consent dialog covers the page on first load. Dismiss it —
//      click "Ablehnen (Funktionseinschränkung)" (the privacy-preserving decline).
//      In the user's real Chrome this choice is remembered, so later scans skip it.
//   2. Listing cards LAZY-LOAD on scroll. Scroll to the bottom and wait ~3 s before
//      extracting. This snippet scrolls on entry, but the first call may still return
//      count:0 — if so, wait ~3 s and run it again.
//
// Layout (2026):
//   article#oid-{id}.list-immoitem            → one per listing; id carries the listing id
//     .shariff[data-url]                       → canonical detail URL (also data-title)
//     h2.listentry-click                       → title
//     .listentry-details                       → "1.040,00 € Kaltmiete (netto) 71,00 m² Wohnfläche 3.5 Räume"
//     .listentry-adress                        → "adresse 14476 Potsdam | …"
//
// Number format is MIXED per card: price/m² are German (1.040,00 / 71,00) but room
// counts use a dot decimal ("3.5 Räume"). Parse them with separate helpers.
//
// This is the source that Süddeutsche Immobilienmarkt aggregates — expect heavy
// overlap; cross-portal dedup in process-scan collapses the twins.

(function () {
  window.scrollTo(0, document.body.scrollHeight); // nudge lazy-load

  const arts = [...document.querySelectorAll('article.list-immoitem, article[id^="oid-"]')];
  const seen = new Set();
  const listings = [];

  // German money/size: "1.040,00" → 1040, "71,00" → 71
  const deNum = (s) => {
    if (!s) return null;
    const m = String(s).match(/[\d.]+(?:,\d+)?/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };
  // rooms: "3.5" or "3,5" — dot OR comma is the decimal, never thousands
  const roomNum = (s) => {
    if (!s) return null;
    const m = String(s).match(/\d+(?:[.,]\d+)?/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  arts.forEach((a) => {
    const id = (a.id || '').replace(/^oid-/, '');
    if (!id || seen.has(id)) return;
    seen.add(id);

    const share = a.querySelector('.shariff[data-url]');
    let url = null;
    try { url = share ? new URL(share.getAttribute('data-url')).href : null; } catch (e) { /* skip */ }
    if (!url) return;

    const title = (a.querySelector('h2.listentry-click, h2, h3')?.textContent
      || share?.getAttribute('data-title') || '').replace(/\s+/g, ' ').trim();

    const det = (a.querySelector('.listentry-details')?.textContent || '').replace(/\s+/g, ' ');
    const price = deNum((det.match(/([\d.]+,\d{2})\s*€/) || det.match(/([\d.]+)\s*€/) || [])[1]);
    const m2 = deNum((det.match(/([\d.,]+)\s*m²/) || [])[1]);
    const rooms = roomNum((det.match(/([\d.,]+)\s*(?:Zimmer|Räume|Raum|Zi\.?)/) || [])[1]);

    const location = (a.querySelector('.listentry-adress')?.textContent || '')
      .replace(/\s+/g, ' ').trim().replace(/^adresse\s*/i, '').substring(0, 120);

    listings.push({
      url,
      title: title.substring(0, 120),
      price,
      m2,
      rooms,
      location,
      portal: 'Regionalimmobilien24',
    });
  });

  const hasNextPage = !!document.querySelector('a[rel="next"], .pagination a.next, a[href*="seite-"]');

  // Compact transport (see immoscout24-extract.js): positional rows, portal dropped (via
  // --portal). This portal's detail URLs are NOT derivable from a bare id (varied
  // region segment + slug), so field 0 carries the FULL URL and there is NO
  // --url-prefix — process-scan uses field 0 verbatim when it starts with http.
  //   node scripts/process-scan.mjs --portal "Regionalimmobilien24"
  const L = listings.map((l) => [
    l.url,
    l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: hasNextPage, L });
})();
