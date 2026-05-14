export async function extract(page) {
  await page.waitForSelector('[data-testid*="result-card_headline"]', { timeout: 10000 }).catch(() => {});

  return page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="StyledContent"]');
    return Array.from(cards).map(card => {
      const headline = card.querySelector('[data-testid*="result-card_headline"]');
      const location = card.querySelector('[data-testid*="result-card_location"]');
      const price = card.querySelector('[data-testid*="result-card_price"]');
      const link = card.querySelector('a[href*="/exposes/"]');
      const attrs = card.querySelectorAll('[data-testid*="result-card_attribute"]');
      let m2 = null;
      for (const attr of attrs) {
        const match = attr.textContent.match(/([\d.,]+)\s*m²/);
        if (match) { m2 = parseFloat(match[1].replace(/\./g, '').replace(',', '.')); break; }
      }
      const priceText = price?.textContent?.trim() || '';
      const priceMatch = priceText.match(/([\d.]+)\s*€/);
      return {
        title: (headline?.textContent?.trim() || '').substring(0, 120),
        url: link ? (link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href) : '',
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : null,
        m2,
        rooms: null,
        location: location?.textContent?.trim() || '',
        portal: 'Engel & Völkers',
      };
    }).filter(l => l.url && l.title);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('button[aria-label*="next"], button[aria-label*="Nächste"], a[aria-label*="next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  const url = new URL(page.url());
  const currentPage = parseInt(url.searchParams.get('page') || '1');
  url.searchParams.set('page', String(currentPage + 1));
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  const hasCards = await page.locator('[data-testid*="result-card_headline"]').count();
  return hasCards > 0;
}
