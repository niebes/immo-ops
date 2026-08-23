// CiC extraction snippet for ImmoScout24
// Run via mcp__claude-in-chrome__javascript_tool on the search results page.
// Returns JSON array of listings from the CURRENT page only.
//
// For pagination: after processing results, check if there's a next page:
//   1. Run this snippet → get listings JSON
//   2. Pipe to process-scan.mjs
//   3. Use CiC to click the "Nächste Seite" button (or navigate to URL with &pagenumber=N)
//   4. Run this snippet again on the new page
//   5. Repeat until no more pages or 100 total listings or ≥80% already seen
//
// Sort by newest: add &sorting=2 to the search URL
//
// ── Why this reads structured per-card fields (data-testid), not regex over
//    card.innerText ──
// Earlier versions took the URL from the first `a[href*="/expose/"]` in a card
// but pulled title/price/m²/rooms by regexing the WHOLE card's innerText. When a
// card's blended text contained a stray figure or a neighbouring listing's line,
// the URL and the metadata desynced — an /expose/<id> got paired with another
// flat's price/size. That bad pairing was written to scan-history.tsv and
// pipeline.md; evaluation agents then opened the real URL, found different
// numbers, and logged "Pipeline data was incorrect" (see reports/017-waldstadt-ii).
//
// Fix: every field is read from its OWN card-scoped element:
//   [data-testid="headline"]          → title
//   [data-testid="attributes"]        → "1.400 €99 m²3 Zi. B" (price/m²/rooms[+energy])
//   [data-testid="hybridViewAddress"] → location
// and the card's TRUE expose id comes from its gallery slide
//   [data-testid="<id>-slide-0"]      → the hero-image listing = what the card advertises
// The gallery id is preferred over the anchor href; if they disagree we trust the
// gallery (the photos shown ARE the listing) and count it as a corrected card.
// Field text therefore can never bleed across listings.

(function () {
  // IS24 pads ANY short result set with out-of-area listings under a
  // "Hier schon gesucht? / Weitere Treffer in angrenzenden Regionen" heading, and
  // `.listing-card` is document-wide — so those got harvested as in-area hits.
  // Verified 2026-08-23 on Grunewald wohnung-mieten: stated total 4, but 24 cards
  // scraped, 18 of them Schmargendorf/Charlottenburg/Westend/Zehlendorf. Cut at the
  // heading. Harmless on a full page (no heading → marker null → keep everything);
  // decisive for a tightly-scoped group, where short result sets are the norm.
  const PAD_RE = /angrenzenden Regionen|Weitere Treffer|Umgebungstreffer|Hier schon gesucht/i;
  let padMarker = null;
  const _walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let _n;
  while ((_n = _walk.nextNode())) {
    if (PAD_RE.test(_n.nodeValue || '')) { padMarker = _n.parentElement; break; }
  }
  const cards = [...document.querySelectorAll('.listing-card')].filter(
    (c) => !padMarker || !(padMarker.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)
  );
  const seen = new Set();
  const listings = [];
  let corrected = 0; // cards where anchor id != gallery id (desync caught & fixed)

  // German number → float: "1.400" → 1400, "983,99" → 983.99, "61,1" → 61.1
  const deNum = (s) => {
    if (!s) return null;
    const m = String(s).match(/[\d.]+(?:,\d+)?/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };
  const txt = (el) => (el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : '');

  cards.forEach((card) => {
    if (/ad-card/.test(card.className)) return; // sponsored placeholder, no listing

    const anchor = card.querySelector('a[href*="/expose/"]');
    const linkId = (anchor?.getAttribute('href') || '').match(/\/expose\/(\d+)/)?.[1] || null;
    const slideEl = card.querySelector('[data-testid$="-slide-0"]');
    const slideId = slideEl ? (slideEl.getAttribute('data-testid').match(/(\d+)-slide-0/)?.[1] || null) : null;

    // The gallery (hero photos) is the listing the card advertises — trust it over
    // the anchor when they disagree. Fall back to the anchor only if no gallery.
    const id = slideId || linkId;
    if (!id || seen.has(id)) return;
    if (linkId && slideId && linkId !== slideId) corrected++;
    seen.add(id);

    // All field text is scoped to THIS card's structured elements.
    const title = txt(card.querySelector('[data-testid="headline"]'));
    const location = txt(card.querySelector('[data-testid="hybridViewAddress"]'));
    // attributes string e.g. "1.400 €99 m²3 Zi. B" — split on the unit markers so a
    // figure can't be mistaken for another field.
    let attrs = txt(card.querySelector('[data-testid="attributes"]'));
    // Resilience: if the structured attributes element is gone (layout change),
    // fall back to the card's own innerText — still card-scoped, never cross-card.
    if (!attrs) attrs = txt(card);

    const price = deNum((attrs.match(/([\d.]+(?:,\d+)?)\s*€/) || [])[1]);
    const m2 = deNum((attrs.match(/€\s*([\d.]+(?:,\d+)?)\s*m²/) || [])[1]);
    const rooms = deNum((attrs.match(/m²\s*([\d.]+(?:,\d+)?)\s*Zi\./) || [])[1]);

    listings.push({
      url: 'https://www.immobilienscout24.de/expose/' + id,
      title,
      price,
      m2,
      rooms,
      location,
      portal: 'ImmoScout24',
    });
  });

  // Pagination info
  const totalText = document.querySelector('[data-testid="serp-title-variant-a-testid"], h1')?.textContent || '';
  const totalMatch = totalText.match(/(\d+)\s*(?:Mietwohnung|Wohnung|Haus|Häuser|Immobilie)/);
  const hasNextPage = !!document.querySelector('[aria-label="Nächste Seite"], [data-nav="next"]');

  // Compact transport: the javascript_tool return channel truncates ~1 KB, so ship
  // positional rows [id, price, m2, rooms, title, location] with the constant URL
  // prefix stripped (rebuilt by process-scan via --url-prefix) and the portal dropped
  // (supplied via --portal). Cuts a 20-listing page ~3× → 1–2 calls instead of ~6.
  // Same snippet serves ImmoScout24 and ImmoScout24 Haus — pass the matching --portal.
  //   node scripts/process-scan.mjs --portal "ImmoScout24" --url-prefix "https://www.immobilienscout24.de/expose/"
  const P = 'https://www.immobilienscout24.de/expose/';
  const L = listings.map((l) => [
    l.url.startsWith(P) ? l.url.slice(P.length) : l.url,
    l.price, l.m2, l.rooms,
    (l.title || '').slice(0, 60),
    (l.location || '').slice(0, 40),
  ]);
  // NEIGHBOUR-REGION PADDING GUARD. When a search has no hits IS24 still renders
  // `.listing-card`s under "Weitere Treffer in angrenzenden Regionen" — and the card
  // selector is document-wide, so those get harvested as if they were in-area. Verified
  // 2026-08-23: Grunewald haus-mieten states "0 Häuser zur Miete in Grunewald (Berlin)"
  // yet yielded one Westend listing. IS24's own stated total is the authority: when it
  // says 0, every card on the page is padding. Report a clean empty state instead — a
  // tightly-scoped group (single Ortsteil) hits this routinely.
  const total = totalMatch ? parseInt(totalMatch[1]) : null;
  if (total === 0) {
    return JSON.stringify({ c: 0, n: false, total: 0, corrected: 0, empty: true, p: P, L: [] });
  }

  // Belt-and-braces after the heading cut: IS24 also slips Neubauprojekt teasers
  // ("1 passende Wohneinheit: Mietwohnungen in Charlottenburg-West") into the block
  // ABOVE the heading, so the pre-marker set can still exceed the stated total. The
  // genuine hits render first, so where IS24's own count is smaller, trust it.
  // Only ever trims — on a paginated search (total 78, 20 per page) it is a no-op.
  const kept = total !== null && total < L.length ? L.slice(0, total) : L;

  return JSON.stringify({
    c: kept.length, // count
    n: hasNextPage, // hasNextPage — for the pagination decision
    total,
    corrected, // # cards where the desync guard repaired the URL↔metadata pairing
    p: P, // url-prefix to pass as --url-prefix
    L: kept, // compact rows (padding-trimmed)
  });
})();
