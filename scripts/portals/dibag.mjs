import { parseNumber } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const seen = new Set();
  const body = await page.textContent('body').catch(() => '');

  // DIBAG uses semantic blocks per unit — no standard listing cards.
  // Each unit has: "Haus X | WE NN", rooms/floor, address, m².
  // NO prices shown — extract what's available.
  const links = page.locator('a[href*="vermietung"], a[href*="expose"], a[href*="wohnung"], a[href*="objekt"]');
  const count = await links.count();

  for (let i = 0; i < count; i++) {
    try {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      if (!href || seen.has(href)) continue;
      const text = await link.textContent().catch(() => '');
      if (!text || text.length < 10) continue;
      seen.add(href);
      const url = href.startsWith('http') ? href : new URL(href, page.url()).href;
      const m2Match = text.match(/(\d[\d,]*)\s*m²/);
      const roomsMatch = text.match(/(\d+)\s*Zimmer/i);
      listings.push({
        title: text.replace(/\s+/g, ' ').trim().substring(0, 120),
        url,
        price: null,
        m2: parseNumber(m2Match?.[1]),
        rooms: parseNumber(roomsMatch?.[1]),
        location: 'Potsdam-Golm',
        portal: 'DIBAG Potsdam',
      });
    } catch { /* skip */ }
  }

  // Fallback: scan for unit patterns in page text
  if (listings.length === 0) {
    const sections = page.locator('section, article, div[class*="unit"], div[class*="wohnung"], div[class*="apartment"]');
    const secCount = await sections.count();
    for (let i = 0; i < secCount; i++) {
      try {
        const sec = sections.nth(i);
        const text = await sec.textContent().catch(() => '');
        if (!text || text.length < 20) continue;
        const weMatch = text.match(/(?:WE|Wohnung)\s*(\d+)/i);
        if (!weMatch) continue;
        const id = weMatch[1];
        if (seen.has(id)) continue;
        seen.add(id);
        const m2Match = text.match(/(\d[\d,]*)\s*m²/);
        const roomsMatch = text.match(/(\d+)\s*Zimmer/i);
        const link = sec.locator('a[href]').first();
        const href = await link.getAttribute('href').catch(() => null);
        const url = href ? (href.startsWith('http') ? href : new URL(href, page.url()).href) : page.url() + '#WE' + id;
        listings.push({
          title: text.replace(/\s+/g, ' ').trim().substring(0, 120),
          url,
          price: null,
          m2: parseNumber(m2Match?.[1]),
          rooms: parseNumber(roomsMatch?.[1]),
          location: 'Potsdam-Golm',
          portal: 'DIBAG Potsdam',
        });
      } catch { /* skip */ }
    }
  }

  return listings;
}

export async function nextPage() {
  return false;
}
