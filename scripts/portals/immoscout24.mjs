import { parseNumber } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const items = page.locator('li[data-id]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    try {
      const item = items.nth(i);
      const link = item.locator('a[href*="/expose/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (!href) continue;
      const url = href.startsWith('http') ? href : `https://www.immobilienscout24.de${href}`;
      const title = await item.locator('[data-testid="title"]').textContent().catch(() =>
        item.locator('h2, h5, .result-list-entry__brand-title').first().textContent().catch(() => '')
      );
      const priceText = await item.locator('[data-testid="price"]').textContent().catch(() => '');
      const sizeText = await item.locator('[data-testid="area"]').textContent().catch(() => '');
      const roomsText = await item.locator('[data-testid="rooms"]').textContent().catch(() => '');
      const addressText = await item.locator('[data-testid="address"]').textContent().catch(() => '');
      listings.push({
        title: (title || '').trim(),
        url: url.split('#')[0].split('?')[0],
        price: parseNumber(priceText),
        m2: parseNumber(sizeText),
        rooms: parseNumber(roomsText),
        location: (addressText || '').trim(),
        portal: 'ImmoScout24',
      });
    } catch { /* skip */ }
  }
  return listings;
}
