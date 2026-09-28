import { parseNumber } from './base.mjs';

// WG Karl Marx Potsdam — static HTML cards with category filter.
// Structure: div.immo-object.card[data-type="Mietwohnung"|"Büro/Praxis"|"Gastronomie"]
//   → a.card-link[href="/fuer-wohnungssucher/expose/..."]
//   → h3.card-title
//   → div.card-details:
//       div.space > div.number (m², labeled "Hauptfläche" or "Wohnfläche")
//       div.price > div.number (€, labeled "Miete pro Monat")
//       div.rooms > div.number (date, labeled "Verfügbar ab" — NOT room count!)
// Room count is NOT in the card — only on detail page or inferred from title.
//
// LEGITIMATE EMPTY STATE (2026-09-28): the coop is not taking new members
// ("zurzeit grundsätzlich keine Neuaufnahme von Mitgliedern") and the page often lists
// ONLY commercial units (Büro/Praxis, Gastronomie). Filtering those out left 0 cards,
// which scan.mjs recorded as a bot-block ⛔ every run since 2026-09-24. When the card
// grid rendered (so the selectors still work) but holds no flat, return [] marked
// `.empty = true` — scan.mjs then logs "legitimately empty" instead of a failure.
// A page with NO cards at all is still reported as drift (the grid itself is missing).

export async function extract(page) {
  const listings = [];
  const seen = new Set();

  // Only extract Wohnung Miete cards, skip Büro/Praxis/Gastronomie/Gewerbe
  const cards = page.locator('.immo-object.card');
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    try {
      const card = cards.nth(i);
      const dataType = await card.getAttribute('data-type').catch(() => '');
      // Accept any flat type: the header notes "Mietwohnung", the site's filter UI says
      // "Wohnung Miete" — the old /Wohnung\s*Miete/ would have dropped "Mietwohnung".
      // Commercial types (Büro/Praxis, Gastronomie/Hotel, Gewerbe) never contain "wohnung".
      if (dataType && !/wohnung/i.test(dataType)) continue;

      const link = card.locator('a.card-link').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const url = href.startsWith('http') ? href : new URL(href, page.url()).href;

      const title = await card.locator('h3.card-title').textContent().catch(() => '');

      const m2Text = await card.locator('.space .number').textContent().catch(() => '');
      const priceText = await card.locator('.price .number').textContent().catch(() => '');
      const roomsText = await card.locator('.rooms .number').textContent().catch(() => '');

      const roomsFromCard = parseNumber(roomsText);
      const roomsFromTitle = parseNumber(title.match(/(\d+)[\s-]*(?:Raum|Zimmer|Zi)/i)?.[1]);

      listings.push({
        title: title.trim().substring(0, 120),
        url,
        price: parseNumber(priceText.replace(/[€\s]/g, '')),
        m2: parseNumber(m2Text.replace(/m²|m&sup2;|\s/g, '')),
        rooms: roomsFromCard || roomsFromTitle,
        location: 'Potsdam',
        portal: 'WG Karl Marx eG',
      });
    } catch { /* skip */ }
  }

  // Grid rendered but no flat on offer (commercial-only) → clean empty scan, not ⛔.
  if (listings.length === 0 && count > 0) listings.empty = true;
  return listings;
}

export async function nextPage() {
  return false;
}
