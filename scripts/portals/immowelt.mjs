import { parseNumber, extractPattern } from './base.mjs';

export async function extract(page) {
  const listings = [];
  const items = page.locator('[data-testid^="classified-card-mfe-"]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    try {
      const item = items.nth(i);
      const link = item.locator('a[href*="/expose/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (!href) continue;
      const url = (href.startsWith('http') ? href : `https://www.immowelt.de${href}`).split('?')[0];
      const title = await item.locator(
        '[data-testid="cardmfe-description-box-text-test-id"], [data-testid="cardmfe-description-text-test-id"]'
      ).first().textContent().catch(() => '');
      const priceText = await item.locator('[data-testid="cardmfe-price-testid"]').textContent().catch(() => '');
      const factsText = await item.locator('[data-testid="cardmfe-keyfacts-testid"]').textContent().catch(() => '');
      const addressText = await item.locator('[data-testid="cardmfe-description-box-address"]').textContent().catch(() => '');
      listings.push({
        title: (title || '').trim().substring(0, 120),
        url,
        price: parseNumber(extractPattern(priceText, /(\d[\d.]*)\s*€/)),
        m2: parseNumber(extractPattern(factsText, /(\d[\d,]*)\s*m²/)),
        rooms: parseNumber(extractPattern(factsText, /(\d+)\s*Zimmer|(\d+)\s*Zi/)),
        location: (addressText || '').trim(),
        portal: 'Immowelt',
      });
    } catch { /* skip */ }
  }
  return listings;
}

export async function nextPage(page) {
  const nextBtn = page.locator('[data-testid="serp-core-paging-testid"] a[aria-label="Nächste Seite"], [data-testid="paging-next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  // Fallback: look for any "next" link in pagination
  const fallback = page.locator('a[rel="next"], [aria-label="next page"]').first();
  if (await fallback.isVisible({ timeout: 1000 }).catch(() => false)) {
    await fallback.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
