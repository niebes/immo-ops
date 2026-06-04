import { parseNumber } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const items = page.locator('li[data-id]');
  let count = await items.count();

  // Fallback: try .listing-card if li[data-id] not found
  if (count === 0) {
    const cards = page.locator('.listing-card');
    count = await cards.count();
    for (let i = 0; i < count; i++) {
      try {
        const card = cards.nth(i);
        const link = card.locator('a[href*="/expose/"]').first();
        const href = await link.getAttribute('href').catch(() => null);
        if (!href) continue;
        const url = (href.startsWith('http') ? href : `https://www.immobilienscout24.de${href}`).split('#')[0].split('?')[0];
        const text = await card.textContent().catch(() => '');
        const priceMatch = text.match(/([\d.,]+)\s*€/);
        const m2Match = text.match(/([\d.,]+)\s*m²/);
        const roomsMatch = text.match(/(\d+)\s*Zi\./);
        const title = text.replace(/\s+/g, ' ').trim().substring(0, 120);
        listings.push({
          title, url,
          price: parseNumber(priceMatch?.[1]),
          m2: parseNumber(m2Match?.[1]),
          rooms: parseNumber(roomsMatch?.[1]),
          location: '',
          portal: 'ImmoScout24',
        });
      } catch { /* skip */ }
    }
    return listings;
  }

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

export async function nextPage(page) {
  // ImmoScout uses "Nächste Seite" or a next arrow button
  const nextBtn = page.locator('[aria-label="Nächste Seite"], [data-nav="next"], a[data-is24-qa="paging_button_next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
