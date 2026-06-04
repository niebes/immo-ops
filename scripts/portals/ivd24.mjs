export async function extract(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('a.rr-list-results[data-id]');
    return Array.from(cards).map(card => {
      const title = card.querySelector('h2')?.textContent?.trim() || '';
      const loc = card.querySelector('h5')?.textContent?.trim().replace(/\s+/g, ' ') || '';
      const barText = card.querySelector('.result-bar .float-right')?.textContent?.trim() || '';
      const priceMatch = barText.match(/([\d.,]+)\s*€/);
      const m2Match = barText.match(/([\d.]+)\s*m²/);
      return {
        title: title.substring(0, 120),
        url: card.href,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : null,
        m2: m2Match ? parseFloat(m2Match[1]) : null,
        rooms: null,
        location: loc,
        portal: 'IVD24',
      };
    }).filter(l => l.url && l.title);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('a.next, a[rel="next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
