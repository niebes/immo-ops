import { parseNumber, extractPattern } from './base.mjs';

export async function extract(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('a[data-om-id]');
    return Array.from(cards).map(card => {
      const href = card.getAttribute('href');
      const url = href?.startsWith('http') ? href : new URL(href, window.location.origin).href;
      const img = card.querySelector('img');
      const title = img?.alt || card.textContent?.trim().substring(0, 120) || '';
      const priceEl = card.querySelector('.text-primary-500');
      const priceText = priceEl?.textContent?.trim() || '';
      const text = card.textContent || '';
      const priceMatch = priceText.match(/([\d.]+)\s*€/);
      const m2Match = text.match(/([\d.,]+)\s*m²/);
      const locEl = card.querySelector('.text-slate-500, .text-sm');
      const loc = locEl?.textContent?.trim() || '';
      return {
        title: title.substring(0, 120),
        url,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: loc,
        portal: 'ohne-makler.net',
      };
    }).filter(l => l.url && l.title);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[rel="next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
