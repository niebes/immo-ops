export async function extract(page) {
  // BVVG requires form submission to show listings
  await page.evaluate(() => {
    const form = document.querySelector('form.immomakler-search');
    if (form) form.submit();
  });
  await page.waitForTimeout(5000);

  return page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/objekte/"]');
    const seen = new Set();
    return Array.from(links)
      .filter(a => {
        const h = a.href;
        return h.includes('/objekte/') && !h.includes('merkliste') && !h.endsWith('/objekte/') && !h.includes('#') && !h.includes('?') && a.textContent.trim().length > 5;
      })
      .map(link => {
        if (seen.has(link.href)) return null;
        seen.add(link.href);
        const card = link.closest('.immomakler-listitem, .immomakler-property, div') || link;
        const text = card.textContent || '';
        const haMatch = text.match(/([\d.,]+)\s*ha/);
        const m2Match = text.match(/([\d.,]+)\s*m²/);
        let m2 = null;
        if (m2Match) m2 = parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.'));
        else if (haMatch) m2 = parseFloat(haMatch[1].replace(/\./g, '').replace(',', '.')) * 10000;
        return {
          title: link.textContent.trim().substring(0, 120),
          url: link.href,
          price: null,
          m2,
          rooms: null,
          location: '',
          portal: 'BVVG',
        };
      })
      .filter(Boolean);
  });
}

export async function nextPage(page) {
  const nextBtn = page.locator('a.next, a[rel="next"], .immomakler-pagination a:last-child').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
