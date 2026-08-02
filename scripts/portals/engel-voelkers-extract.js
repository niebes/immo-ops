// invisible-playwright extraction snippet for Engel & Völkers
// Run via evaluate_script (stealth Firefox) or javascript_tool (debug Chrome).
// Returns compact JSON: { c, n, p, L } — see immoscout24-extract.js for the transport format.
//
// Search URL: /de/de/propertysearch?... (React SPA; sorted newest via sortingOptions[]=PUBLISHED_AT_DESC)
//
// WHY THIS SNIPPET EXISTS: the React SPA renders nothing for headless Playwright — the
// playwright extractor (scripts/portals/engel-voelkers.mjs) returned 0 cards and scan.mjs
// logged `bot_defense` / selector drift every run. Verified live 2026-08-02 in the stealth
// Firefox: NO bot wall (`bot:false`), 24 <article> cards, real prices. Moved
// playwright → invisible-playwright.
//
// DOM (verified 2026-08-02):
//   - card     -> <article> (24 of them — but SOME ARE CTA CARDS, not results:
//                 the "Suche speichern" card has data-testid
//                 `search-components_cta-card_search-alert_button` and NO expose link
//                 → skipped by requiring an /exposes/{uuid} href)
//   - link     -> a[href^="/de/de/exposes/{uuid}"]
//   - headline -> [data-testid="search-components_result-card_headline"]
//   - price    -> [data-testid="search-components_result-card_price"]
//   - size     -> [data-testid^="search-components_result-card_attribute_"] whose testid ends
//                 in `-plotSurface` (Grundstück) or `-livingSurface` (Wohnfläche)
//
// URL↔metadata desync guard (see the skill's CiC gotchas): the attribute testids EMBED the
// listing uuid — `search-components_result-card_attribute_{uuid}-plotSurface`. We extract the
// uuid from the href AND from the attribute testid and only keep fields whose uuid matches
// the card's own link. Cards whose ids disagree are skipped rather than mis-joined.
//
// Number format is German (1.234.567 € / 1.234,5 m²). Prices here routinely run 650k–15,5 Mio,
// far above the plot group's 200k cap — the criteria gate drops them. That is a legitimate
// "scanned, 0 new", not a blocker.

(function () {
  const listings = [];
  const seen = new Set();

  const parseNum = (s) => {
    if (!s) return null;
    const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  [...document.querySelectorAll('article')].forEach((card) => {
    const link = card.querySelector('a[href*="/exposes/"]');
    if (!link) return; // CTA / search-alert cards
    const href = link.getAttribute('href') || '';
    const idm = href.match(/\/exposes\/([0-9a-f-]{8,})/i);
    if (!idm) return;
    const id = idm[1];
    if (seen.has(id)) return;
    seen.add(id);

    const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;

    const title = (card.querySelector('[data-testid="search-components_result-card_headline"]')?.innerText || '')
      .replace(/\s+/g, ' ').trim();

    const priceTxt = card.querySelector('[data-testid="search-components_result-card_price"]')?.innerText || '';
    const priceM = priceTxt.match(/([\d.]+(?:,\d+)?)\s*(?:€|EUR)/);

    // Size: only accept an attribute node whose testid carries THIS card's uuid.
    let m2 = null;
    card.querySelectorAll('[data-testid*="_result-card_attribute_"]').forEach((el) => {
      if (m2 != null) return;
      const dt = el.getAttribute('data-testid') || '';
      if (dt.indexOf(id) === -1) return;              // desync guard
      if (!/-(plotSurface|livingSurface)$/.test(dt)) return;
      const m = (el.innerText || '').match(/([\d.,]+)\s*m²/);
      if (m) m2 = parseNum(m[1]);
    });

    // Location sits in the card body as "Golm, Potsdam, Brandenburg, Deutschland".
    // Match ONLY on a line ending in the country — collapsing the whole card to one string
    // and grabbing the first comma-run instead picks up the image-carousel a11y labels
    // ("Previous Next carousel index 0 button …"), which is exactly what the first version
    // of this snippet did.
    const locLine = (card.innerText || '').split('\n')
      .map((s) => s.trim())
      .find((s) => /,\s*Deutschland$/.test(s) && s.length < 90);

    listings.push({
      url,
      // A promoted card can render a blank headline — synthesize rather than drop it.
      title: (title || 'Engel & Völkers Objekt ' + id.slice(0, 8)).slice(0, 120),
      price: priceM ? Math.round(parseNum(priceM[1])) : null,
      m2,
      rooms: null,
      // Drop the ", Deutschland" tail — every row has it, it carries no signal.
      location: locLine ? locLine.replace(/,\s*Deutschland$/, '').slice(0, 60) : '',
    });
  });

  // Pagination: the SPA uses a `page=N` query param on the search URL.
  const nextBtn = document.querySelector(
    'a[rel="next"], [data-testid*="pagination"] a[aria-label*="eiter"], [data-testid*="next"]'
  );
  const hasNextPage = !!(nextBtn && nextBtn.getAttribute('aria-disabled') !== 'true');

  const L = listings.map((l) => [
    l.url, l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  return JSON.stringify({ c: listings.length, n: hasNextPage, L });
})();
