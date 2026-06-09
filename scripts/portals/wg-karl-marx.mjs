import { parseNumber } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const seen = new Set();

  // WG Karl Marx uses card-based listings with filter tabs (Mietwohnung, Büro, etc).
  // Cards contain: image, title, m² (Hauptfläche/Wohnfläche), price (Warmmiete), rooms, address, availability.
  const cards = page.locator('a[href*="angebot"], a[href*="objekt"], a[href*="wohnung"], [class*="card"] a[href], [class*="listing"] a[href], [class*="offer"] a[href]');
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    try {
      const card = cards.nth(i);
      const href = await card.getAttribute('href');
      if (!href || seen.has(href)) continue;
      const text = await card.textContent().catch(() => '');
      if (!text || text.length < 15) continue;
      if (!/m²|Zimmer|Wohnfläche|Hauptfläche|€/i.test(text)) continue;
      seen.add(href);
      const url = href.startsWith('http') ? href : new URL(href, page.url()).href;
      const m2Match = text.match(/(\d[\d,]*)\s*m²/);
      const priceMatch = text.match(/([\d.,]+)\s*€/);
      const roomsMatch = text.match(/(\d+)\s*(?:Zimmer|Zi\.)/i);
      const locMatch = text.match(/\d{5}\s+[\w\s-]+/);

      listings.push({
        title: text.replace(/\s+/g, ' ').trim().substring(0, 120),
        url,
        price: parseNumber(priceMatch?.[1]),
        m2: parseNumber(m2Match?.[1]),
        rooms: parseNumber(roomsMatch?.[1]),
        location: locMatch?.[0]?.trim() || 'Potsdam',
        portal: 'WG Karl Marx eG',
      });
    } catch { /* skip */ }
  }

  return listings;
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[rel="next"], [aria-label*="ächste"], [class*="next"], [class*="pagination"] a:last-child').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
