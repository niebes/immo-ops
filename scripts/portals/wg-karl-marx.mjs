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
      if (dataType && !/Wohnung\s*Miete/i.test(dataType)) continue;

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

  return listings;
}

export async function nextPage() {
  return false;
}
