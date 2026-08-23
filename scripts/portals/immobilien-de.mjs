// Extractor for immobilien.de (Wohnen search results)
// Search page: /Wohnen/Suchergebnisse-51797.html?...&search.wo=city:9959 (Potsdam)
// Works headless (HTTP 200, no CAPTCHA) → scan_method: playwright.
//
// Layout (2026): each listing is an `a.lr-card` whose href is `/wohnen/{id}`
// (relative). The visible fields live in a `.lr-card__body` whose text reads:
//   "{title} {price} € {Kalt|Warm}miete {location} Fläche {m2} m² Zimmer {rooms} Etage {n}"
// Title also has its own `.lr-card__title`. Price may be Kalt- OR Warmmiete —
// we take the shown € figure as-is (flagged in notes). Numbers are German format.
//
// NOTE: this portal is aggregator-like — heavy overlap with ImmoScout24 / Immowelt /
// Regionalimmobilien24; cross-portal dedup in process-scan collapses the twins.

export async function extract(page) {
  // The `empty` flag must be re-attached HERE, in Node: page.evaluate() returns a
  // serialized copy, so a custom property set on the array inside the browser is
  // silently dropped. scan.mjs reads `pageListings.empty` to tell a real "no results"
  // apart from selector drift — see the empty-state note in scan.mjs.
  const { listings, empty } = await page.evaluate(() => {
    const cards = document.querySelectorAll('a.lr-card');
    const seen = new Set();
    const deNum = (s) => {
      if (!s) return null;
      const m = String(s).match(/[\d.]+(?:,\d+)?/);
      if (!m) return null;
      const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
      return isNaN(v) ? null : v;
    };
    const out = [];
    cards.forEach((card) => {
      const href = card.getAttribute('href');
      if (!href) return;
      const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      if (seen.has(url)) return;
      seen.add(url);
      const body = (card.querySelector('.lr-card__body')?.textContent || card.textContent || '')
        .replace(/\s+/g, ' ').trim();
      const title = (card.querySelector('.lr-card__title, h2, h3, h4')?.textContent || '')
        .replace(/\s+/g, ' ').trim();
      const price = deNum((body.match(/([\d.]+(?:,\d+)?)\s*€/) || [])[1]);
      const m2 = deNum((body.match(/Fläche\s*([\d.,]+)\s*m²/) || body.match(/([\d.,]+)\s*m²/) || [])[1]);
      const roomMatches = [...body.matchAll(/Zimmer\s+([\d.,]+)/g)];
      const rooms = roomMatches.length
        ? parseFloat(roomMatches[roomMatches.length - 1][1].replace(',', '.'))
        : null;
      const loc = ((body.match(/(?:Kaltmiete|Warmmiete)\s*(.*?)\s*Fläche/) || [])[1] || '')
        .replace(/\s+/g, ' ').trim().substring(0, 120);
      out.push({
        title: title.substring(0, 120),
        url,
        price,
        m2,
        rooms,
        location: loc,
        portal: 'immobilien.de',
      });
    });
    // The portal states this verbatim when a filter combination has no matches
    // (verified live 2026-08-23 on the Grunewald plz:14193 search).
    const isEmpty = /Keine passenden Objekte gefunden/i.test(document.body?.innerText || '');
    return { listings: out.filter(Boolean), empty: isEmpty };
  });
  if (empty && listings.length === 0) listings.empty = true;
  return listings;
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[rel="next"], .pagination a.next, a.next, a[aria-label="Nächste"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
