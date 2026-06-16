// Ab ins Zuhause (ab-ins-zuhause.de) — listings platform, Symfony/Stimulus app.
//
// Search route is /entdecken/?p={url-encoded JSON}; the JSON carries
// placeSelection.placeId (8136 = Potsdam) and filter.tradingType (1=Miete) /
// filter.objectTypes (2=Wohnung). Despite looking SPA-ish, the result list is
// server-rendered into the DOM (the only XHR is the usercentrics consent service),
// so headless Playwright sees all entries — no CiC needed.
//
// Each listing is a div[data-entries-list-target="entryCardWrapper"] holding an
// a.entry-card[href*="/angebot/{uuid}"]. Fields: title p.text-truncate,
// location first <small>, price p.fw-bold ("2.390 € / Mo"), meta <small>
// ("4 Zi. | 125 m²"). All results render on one load (the page param doesn't
// paginate — page=1 returns the same set), so there is no next page.

export async function extract(page) {
  await page.waitForSelector('[data-entries-list-target="entryCardWrapper"]', { timeout: 15000 }).catch(() => {});
  return page.evaluate(() => {
    const cards = document.querySelectorAll('[data-entries-list-target="entryCardWrapper"]');
    const seen = new Set();
    const out = [];
    for (const card of cards) {
      const a = card.querySelector('a[href*="/angebot/"]');
      if (!a) continue;
      const href = a.getAttribute('href').split('?')[0];
      const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      if (seen.has(url)) continue;
      seen.add(url);

      const title = card.querySelector('p.text-truncate')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const smalls = Array.from(card.querySelectorAll('small')).map(s => s.textContent.replace(/\s+/g, ' ').trim());
      const loc = smalls.find(t => t && !/Zi\.|m²/.test(t) && !/^Neu$/i.test(t)) || '';
      const meta = smalls.find(t => /Zi\.|m²/.test(t)) || '';
      const priceTx = card.querySelector('p.fw-bold')?.textContent || '';

      const priceM = priceTx.match(/([\d.]+)\s*€/);
      const roomsM = meta.match(/([\d.,]+)\s*Zi\.?/);
      const m2M = meta.match(/([\d.,]+)\s*m²/);
      const m2 = m2M ? parseFloat(m2M[1].replace(/\./g, '').replace(',', '.')) : null;

      out.push({
        title: title.substring(0, 120),
        url,
        price: priceM ? parseFloat(priceM[1].replace(/\./g, '')) : null,
        m2: m2 && m2 > 0 ? m2 : null,
        rooms: roomsM ? parseFloat(roomsM[1].replace(',', '.')) : null,
        location: loc,
        portal: 'Ab ins Zuhause',
      });
    }
    return out;
  });
}

export async function nextPage() {
  // All results render on the single /entdecken load — no pagination.
  return false;
}
