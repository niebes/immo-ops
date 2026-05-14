export async function extract(page) {
  return page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/immobilien/details/"]');
    const seen = new Set();
    return Array.from(links).map(link => {
      const text = link.textContent.replace(/\s+/g, ' ').trim();
      if (!text || text === 'Jetzt ansehen' || seen.has(link.href)) return null;
      seen.add(link.href);
      const card = link.closest('.flex.flex-col') || link.parentElement?.parentElement?.parentElement;
      const cardText = card?.textContent || '';
      const priceMatch = cardText.match(/([\d.]+)\s*€/);
      const m2Match = cardText.match(/([\d.,]+)\s*m²/);
      return {
        title: text.substring(0, 120),
        url: link.href,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: '',
        portal: 'BVBI Volksbank',
      };
    }).filter(Boolean);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[rel="next"], button:has-text("Nächste"), [wire\\:click*="nextPage"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
