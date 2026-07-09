// invisible-playwright / CiC extraction snippet for WBG Daheim eG
//   https://www.wbgdaheim.de/angebote/
// Run via evaluate_script (invisible) or mcp__claude-in-chrome__javascript_tool.
// Returns compact JSON: { c, n, L } — full detail URL in field 0 (no --url-prefix):
//   node scripts/process-scan.mjs --portal "WBG Daheim eG" --group "Potsdam flat rental"
//
// WHY THIS SNIPPET EXISTS: WBG Daheim is a tiny 182-apartment coop that is USUALLY empty
// ("Zur Zeit können wir Ihnen leider keine freien Wohnungen anbieten"). Headless Playwright's
// scan.mjs read that fine but misclassified the legitimate empty state as a bot-block / selector
// drift and kept flagging it as a ⛔ CiC-fallback every run. This snippet distinguishes the two:
//   - empty state  -> returns { c: 0 } cleanly (NOT a failure);
//   - vacancies     -> best-effort card extraction from the #content region.
// File name is wbg-daheim-eg-extract.js to match scan.mjs snippetSlug("WBG Daheim eG").
// The site is a WordPress build; listings (when present) render as blocks under the "Angebote"
// H1 in #content. No populated sample was available when this was written, so the populated-path
// extraction is heuristic — re-check selectors against a live vacancy the first time one appears.

(function () {
  const root = document.querySelector('#content, main, .entry-content') || document.body;
  const rootText = (root.innerText || '');

  // 1) Empty state — the normal case. Return 0 cleanly so the scanner records "scanned, 0 new"
  //    instead of a bot-block ⛔.
  if (/keine freien Wohnungen|keine (freien )?Angebote|derzeit keine|leider keine/i.test(rootText)) {
    return JSON.stringify({ c: 0, n: false, L: [], empty: true });
  }

  // 2) Populated case — heuristic. Look for blocks that carry a size/rooms/price signal and a
  //    detail link, under the Angebote content region.
  const num = (s) => {
    if (!s) return null;
    const m = String(s).replace(/[^\d.,]/g, '').match(/[\d.,]+/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  const seen = new Set();
  const listings = [];

  // Candidate cards: small-ish blocks whose text mentions m²/Zimmer/€.
  const blocks = [...root.querySelectorAll('article, .elementor-widget-container, .wp-block-column, .et_pb_module, li, .card, .angebot, div')]
    .filter((el) => {
      const t = el.innerText || '';
      return el.children.length <= 12 && /(\d+[.,]?\d*)\s*(m²|m2|qm)/i.test(t) && /(zimmer|zi\.|raum|räume)/i.test(t);
    });

  blocks.forEach((el) => {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    const link = el.querySelector('a[href]') || el.closest('a[href]');
    let href = link ? link.getAttribute('href') : null;
    if (href && !/^https?:/.test(href)) href = 'https://www.wbgdaheim.de' + (href.startsWith('/') ? href : '/' + href);
    const key = href || t.slice(0, 60);
    if (seen.has(key)) return;
    seen.add(key);

    const m2 = num((t.match(/([\d.,]+)\s*(?:m²|m2|qm)/i) || [])[1]);
    const rooms = num((t.match(/([\d.,]+)\s*(?:zimmer|zi\.|raum|räume)/i) || [])[1]);
    const price = num((t.match(/([\d.,]+)\s*(?:€|EUR|Kaltmiete)/i) || [])[1]);
    const title = (el.querySelector('h1,h2,h3,h4,h5')?.innerText || t).replace(/\s+/g, ' ').trim().slice(0, 120);

    listings.push({
      url: href || 'https://www.wbgdaheim.de/angebote/',
      title,
      price,
      m2,
      rooms: rooms != null ? Math.round(rooms) : null,
      location: 'Potsdam',
      portal: 'WBG Daheim eG',
    });
  });

  const L = listings.map((l) => [l.url, l.price, l.m2, l.rooms, (l.title || '').slice(0, 60), l.location]);
  return JSON.stringify({ c: L.length, n: false, L });
})();
