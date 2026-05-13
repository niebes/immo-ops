import { parseNumber, extractPattern } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const items = page.locator('article.aditem');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    try {
      const item = items.nth(i);
      const link = item.locator('a[href*="/s-anzeige/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (!href) continue;
      const url = href.startsWith('http') ? href : `https://www.kleinanzeigen.de${href}`;
      const title = await item.locator('a.ellipsis').first().textContent().catch(() =>
        link.textContent().catch(() => '')
      );
      const text = await item.textContent().catch(() => '');
      const locationEl = await item.locator('.aditem-main--top--left').textContent().catch(() => '');
      listings.push({
        title: (title || '').trim(),
        url,
        price: parseNumber(extractPattern(text, /(\d[\d.]*)\s*€/)),
        m2: parseNumber(extractPattern(text, /(\d[\d,]*)\s*m²/)),
        rooms: parseNumber(extractPattern(text, /(\d+)\s*Zi/)),
        location: (locationEl || '').trim(),
        portal: 'Kleinanzeigen',
      });
    } catch { /* skip */ }
  }
  return listings;
}

export async function nextPage(page) {
  const nextBtn = page.locator('a.pagination-next').first();
  if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
