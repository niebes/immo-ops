// CiC extraction snippet for Vonovia (Potsdam / adjacent Berlin-West).
// Run via CiC-over-CDP: `node scripts/scan.mjs --cic` (page.evaluate on the loaded page).
// Returns the compact wrapper: JSON string { c, n, L } (see immoscout24-cic.js).
//
// WHY CiC + WHY THE search_url IS AN API ENDPOINT:
//   vonovia.de is an Angular SPA — the /meine-stadt/... and /zuhause-finden pages
//   render NOTHING scrapeable (listings arrive via XHR only), and a Cookiebot consent
//   wall covers the first load. Playwright/generic extraction found 0 cards for weeks.
//   The SPA's own data source is a clean same-origin JSON API:
//     GET /api/real-estate/list?rentType=miete&immoType=wohnung&latitude=..&longitude=..&geoLocation=1&perimeter=..&orderBy=date_desc
//     → { paging, results: [{ wrk_id, titel, strasse, plz, ort, preis, groesse,
//                             anzahl_zimmer, slug, ... }] }
//   So portals.yml points search_url straight at that API with POTSDAM coordinates.
//   Navigating a browser to the API returns application/json; Chrome shows it as text,
//   and document.body.innerText is the raw JSON this snippet parses. No consent dialog
//   appears on the API URL, and the trusted profile's cookies authorize the request.
//
// Coordinates: latitude=52.3906&longitude=13.0645 = Potsdam centre; perimeter=20 (km).
// Potsdam proper usually has 0 Vonovia units, so the radius surfaces the adjacent
// Berlin-West/Kladow/Spandau edge — genuinely near-target stock; area triage/scoring
// downstream decides fit (we do NOT mechanically area-filter in the scanner).
//
// PAGINATION: the perimeter query returns all matches in one payload (single-digit
// counts), so n:false. If Vonovia inventory ever grows past one page, add &page=N.
// Detail URL = /zuhause-finden/immobilien/{slug}; slug is not id-derivable → field 0
// carries the FULL URL, no --url-prefix. Register: process-scan.mjs --portal "Vonovia Potsdam"

(function () {
  let data;
  try { data = JSON.parse(document.body.innerText || '{}'); } catch (e) { data = null; }
  const results = (data && Array.isArray(data.results)) ? data.results : [];
  const seen = new Set();
  const listings = [];

  results.forEach((r) => {
    const id = String(r.wrk_id || r.slug || '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    if (!r.slug) return;

    const preis = typeof r.preis === 'number' ? r.preis
      : parseFloat(String(r.preis || '').replace(/\./g, '').replace(',', '.'));
    const groesse = typeof r.groesse === 'number' ? r.groesse
      : parseFloat(String(r.groesse || '').replace(/\./g, '').replace(',', '.'));

    listings.push({
      url: 'https://www.vonovia.de/zuhause-finden/immobilien/' + r.slug,
      title: String(r.titel || '').replace(/\s+/g, ' ').trim().substring(0, 120),
      price: isNaN(preis) ? null : preis,
      m2: (isNaN(groesse) || groesse === 0) ? null : groesse,
      rooms: r.anzahl_zimmer != null ? parseFloat(String(r.anzahl_zimmer).replace(',', '.')) : null,
      location: [r.plz, r.ort].filter(Boolean).join(' ').substring(0, 60),
      portal: 'Vonovia Potsdam',
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
