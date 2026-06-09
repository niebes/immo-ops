import { parseNumber, extractPattern } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const seen = new Set();

  // Semmelhaack uses card grid with full data (Kaltmiete, m², rooms, address).
  // Cards link to detail pages via "Zur Objektbeschreibung".
  const cards = page.locator('[class*="card"], [class*="listing"], [class*="object"], [class*="property"], article');
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    try {
      const card = cards.nth(i);
      const text = await card.textContent().catch(() => '');
      if (!text || text.length < 20) continue;
      // Must contain Potsdam or at least some property indicator
      if (!/m²|Zimmer|Kaltmiete|Inklusivmiete|Wohnung/i.test(text)) continue;
      const link = card.locator('a[href*="objekt"], a[href*="expose"], a[href*="detail"], a[href*="miet"]').first();
      let href = await link.getAttribute('href').catch(() => null);
      if (!href) {
        const anyLink = card.locator('a[href]').first();
        href = await anyLink.getAttribute('href').catch(() => null);
      }
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const url = href.startsWith('http') ? href : new URL(href, page.url()).href;
      const title = await card.locator('h2, h3, h4, [class*="title"], [class*="heading"]').first().textContent().catch(() => '');
      const priceMatch = text.match(/(?:Kaltmiete|Inklusivmiete|Miete)[:\s]*([\d.,]+)\s*€/i) || text.match(/([\d.,]+)\s*€/);
      const m2Match = text.match(/(\d[\d,]*)\s*m²/);
      const roomsMatch = text.match(/(\d+)\s*(?:Zimmer|Zi\.|Räume)/i);
      const locMatch = text.match(/(?:Potsdam|Berlin|Brandenburg)[^,\n]*/i);

      listings.push({
        title: (title || text.substring(0, 80)).replace(/\s+/g, ' ').trim().substring(0, 120),
        url,
        price: parseNumber(priceMatch?.[1]),
        m2: parseNumber(m2Match?.[1]),
        rooms: parseNumber(roomsMatch?.[1]),
        location: locMatch?.[0]?.trim() || '',
        portal: 'Semmelhaack',
      });
    } catch { /* skip */ }
  }

  return listings;
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[rel="next"], [aria-label*="ächste"], [class*="next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
