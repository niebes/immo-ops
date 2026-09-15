// Extractor for immobilien.de — REBUILT 2026-09-15 after the site relaunch (Next.js).
//
// What broke: the old surface /Wohnen/Suchergebnisse-51797.html now redirects to a generic
// /suche page that IGNORES the old search.* params (nationwide results, no `a.lr-card`
// markup, no /wohnen/{id} links). The last listings came in on 2026-08-27; since then every
// scan extracted 0 and scan.mjs mis-flagged it as bot_defense — it was a relaunch, not a block.
//
// New listing surface: server-rendered SEO location pages /mieten/wohnung/{slug}/
//   e.g. /mieten/wohnung/potsdam/ → h1 "Wohnung mieten in Potsdam: 20 aktuelle Angebote"
// Each card has ONE title anchor `a[href^="/expose/{id}"]`; the card text reads
//   "{title} {price} € {Kaltmiete|Warmmiete} {n} € / m² {PLZ Ort} Fläche {m2} m² Zimmer {rooms}"
// The price is Kalt- OR Warmmiete depending on the lister — taken as shown.
// Pagination: ?page=N (24 cards/page on large cities; ?seite= and ?p= are silently ignored).
// These pages carry no price/room filters — scan.mjs applies the numeric gates.
// robots.txt disallows /api/ — only the HTML pages are used.

export async function extract(page) {
  // The `empty` flag must be re-attached HERE, in Node: page.evaluate() returns a
  // serialized copy, so a custom property set on the array inside the browser is dropped.
  const { listings, empty } = await page.evaluate(() => {
    const deNum = (s) => {
      if (s == null) return null;
      const m = String(s).match(/[\d.]+(?:,\d+)?/);
      if (!m) return null;
      const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
      return isNaN(v) ? null : v;
    };
    const exposeId = (el) => ((el.getAttribute('href') || '').match(/^\/expose\/(\d+)/) || [])[1];
    const idsIn = (root) =>
      new Set([...root.querySelectorAll('a[href^="/expose/"]')].map(exposeId).filter(Boolean));

    const out = [];
    const seen = new Set();
    document.querySelectorAll('a[href^="/expose/"]').forEach((a) => {
      const id = exposeId(a);
      if (!id) return;
      const url = new URL(`/expose/${id}`, window.location.origin).href;
      if (seen.has(url)) return;
      seen.add(url);

      // Card root = the LARGEST ancestor that still contains only this card's exposé id.
      // Scoping every field to it prevents the URL↔metadata desync bug.
      let card = a;
      while (card.parentElement && card.parentElement !== document.body) {
        const parentIds = idsIn(card.parentElement);
        if (parentIds.size > 1) break;
        card = card.parentElement;
      }
      const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
      const title = (a.textContent || '').replace(/\s+/g, ' ').trim();
      // Parse fields ONLY from the text after the title: titles like "2-Zimmer, Jugendstilhaus"
      // otherwise hijack the "Zimmer …" regex (rooms came back NaN → the room gate was skipped).
      const tIdx = title ? text.indexOf(title) : -1;
      const rest = tIdx >= 0 ? text.slice(tIdx + title.length) : text;
      const priceM = rest.match(/(\d[\d.]*(?:,\d+)?)\s*€\s*(?:Kaltmiete|Warmmiete|Miete|Kaufpreis)/)
        || rest.match(/(\d[\d.]*(?:,\d+)?)\s*€/);
      const m2M = rest.match(/Fläche\s*(\d[\d.]*(?:,\d+)?)\s*m²/);
      const roomsM = rest.match(/Zimmer\s*(\d+(?:[.,]\d+)?)/);
      const locM = rest.match(/€\s*\/\s*m²\s*(\d{5}\s+.*?)\s*Fläche/)
        || rest.match(/(\d{5}\s+[^\d€]{2,60}?)\s*(?:Fläche|Zimmer|$)/);

      out.push({
        // Promoted cards can have a blank heading — keep them with a placeholder title.
        title: (title || `immobilien.de Exposé ${id}`).substring(0, 120),
        url,
        price: priceM ? deNum(priceM[1]) : null,
        m2: m2M ? deNum(m2M[1]) : null,
        // Rooms may be "2.5" — dot or comma is always a decimal, never thousands.
        rooms: roomsM ? parseFloat(roomsM[1].replace(',', '.')) : null,
        location: locM ? locM[1].replace(/\s+/g, ' ').trim().substring(0, 120) : '',
        portal: 'immobilien.de',
      });
    });

    // Total comes from the SEO h1 ("20 aktuelle Angebote") or, on /suche, the result line
    // ("30 Immobilien in 14193").
    const h1 = (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ');
    const bodyText = document.body?.innerText || '';
    const totalM = h1.match(/(\d[\d.]*)\s+aktuelle Angebote/) || bodyText.match(/(\d[\d.]*)\s+Immobilien in\s/);
    const total = totalM ? parseInt(totalM[1].replace(/\./g, ''), 10) : null;
    const isEmpty = total === 0 || /Keine passenden Objekte gefunden|keine aktuellen Angebote/i.test(bodyText);
    return { listings: out, empty: isEmpty };
  });
  if (empty && listings.length === 0) listings.empty = true;
  return listings;
}

export async function nextPage(page) {
  const info = await page.evaluate(() => {
    const h1 = (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ');
    const bodyText = document.body?.innerText || '';
    const m = h1.match(/(\d[\d.]*)\s+aktuelle Angebote/) || bodyText.match(/(\d[\d.]*)\s+Immobilien in\s/);
    const total = m ? parseInt(m[1].replace(/\./g, ''), 10) : null;
    const u = new URL(window.location.href);
    const cur = parseInt(u.searchParams.get('page') || '1', 10);
    const onPage = new Set(
      [...document.querySelectorAll('a[href^="/expose/"]')].map((a) => a.getAttribute('href')),
    ).size;
    return { total, cur, onPage, href: u.href };
  });
  // Stop when the h1 total is unknown, the page is empty, or everything is already covered.
  if (!info.total || !info.onPage || info.cur * info.onPage >= info.total) return false;
  const next = new URL(info.href);
  next.searchParams.set('page', String(info.cur + 1));
  await page.goto(next.href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  return true;
}
