export async function extract(page) {
  return page.evaluate(() => {
    const links = document.querySelectorAll('.d_tab_objekte a[href*="/detail/"]');
    return Array.from(links).map(card => {
      const left = card.querySelector('.left');
      const middle = card.querySelector('.middle');
      const right = card.querySelector('.right');
      const address = left?.textContent?.trim().replace(/\s+/g, ' ') || '';
      const desc = middle?.textContent?.trim().replace(/\s+/g, ' ') || '';
      const priceText = right?.textContent?.trim() || '';
      const priceMatch = priceText.match(/([\d.]+)\s*€/);
      const m2Match = desc.match(/([\d.,]+)\s*m/);
      const title = `${desc.substring(0, 60)} — ${address}`.substring(0, 120);
      return {
        title,
        url: card.href.startsWith('http') ? card.href : new URL(card.href, window.location.origin).href,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(/,/g, '.')) : null,
        rooms: null,
        location: address,
        portal: 'Zwangsversteigerung.de',
      };
    }).filter(l => l.url && l.title);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[href*="seite"]:has-text("»"), a[href*="seite"]:has-text("nächste")').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
