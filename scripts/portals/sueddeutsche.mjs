// Extractor for Süddeutsche Immobilienmarkt (immobilienmarkt.sueddeutsche.de).
// Aggregator portal (pulls from regionalimmobilien24 and others). Search results
// render as `div.card.item-wrap` cards even behind the consent overlay.
//
// Field quirks observed during setup:
//   • prices are German format with cents: "2.390,00 €" / "901,60 €"
//   • size uses "m2" (ASCII) as well as "m²" → match both
//   • rooms as "4 Zi." (and "3,5 Zi.")
//   • detail link is /immobilien/{slug}-{ID}; an /expose/{uuid} link also exists
//     per card — we key off the human /immobilien/ slug and dedup by URL
//   • pagination: numbered pager with a "›" next anchor (no rel="next")

export async function extract(page) {
  await page.waitForSelector('div.card.item-wrap', { timeout: 10000 }).catch(() => {});

  return page.evaluate(() => {
    const cards = document.querySelectorAll('div.card.item-wrap');
    const seen = new Set();

    const deNum = (s) => {
      if (!s) return null;
      // German: strip "." thousands, "," → decimal
      const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
      return isNaN(v) ? null : v;
    };

    return Array.from(cards).map((card) => {
      const link = card.querySelector('a[href*="/immobilien/"]:not([href*="/expose"])')
        || card.querySelector('a[href*="/expose/"]');
      if (!link) return null;
      const href = link.getAttribute('href');
      const url = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
      if (seen.has(url)) return null;
      seen.add(url);

      const text = (card.textContent || '').replace(/\s+/g, ' ');
      // prefer the price with cents ("2.390,00 €"), else a plain "1.200 €"
      const priceMatch = text.match(/([\d.]+,\d{2})\s*€/) || text.match(/([\d.]+)\s*€/);
      const m2Match = text.match(/([\d.,]+)\s*m[2²]/i);
      const roomsMatch = text.match(/([\d,]+)\s*Zi\.?/);

      // Title source chain. "Top Premium" teaser cards carry NO title in the SERP
      // (empty h2/title-link, no img alt, ID-only URL), so as a last resort synthesize
      // one from the attributes — the evaluation step fetches the real title from the
      // detail page. Never drop a card that has a URL + price/size just for a blank title.
      let title = (card.querySelector('h1,h2,h3,h4,h5')?.textContent
        || card.querySelector('a.js-item-title-link, [class*="title" i]')?.textContent
        || link.textContent
        || card.querySelector('img')?.getAttribute('alt')
        || '').replace(/\s+/g, ' ').trim();
      if (!title) {
        const bits = [roomsMatch && `${roomsMatch[1].replace(',', '.')} Zi.`, m2Match && `${m2Match[1]} m²`]
          .filter(Boolean).join(', ');
        title = `Wohnung (Premium-Anzeige)${bits ? ` — ${bits}` : ''}`;
      }
      title = title.substring(0, 120);

      // location: the line carrying a 5-digit PLZ
      const loc = ((card.innerText || '').split('\n').map((l) => l.trim())
        .find((l) => /\b\d{5}\b/.test(l)) || '').substring(0, 120);

      return {
        title,
        url,
        price: priceMatch ? deNum(priceMatch[1]) : null,
        m2: m2Match ? deNum(m2Match[1]) : null,
        rooms: roomsMatch ? deNum(roomsMatch[1]) : null,
        location: loc,
        portal: 'Süddeutsche Immobilienmarkt',
      };
    }).filter((l) => l && l.url && (l.price != null || l.m2 != null));
  });
}

export async function nextPage(page) {
  // Numbered pager; the next control is an <a> with the "›" chevron.
  const next = page.locator('.pagination a, ul.pagination a, nav a').filter({ hasText: '›' }).first();
  if (await next.isVisible({ timeout: 2000 }).catch(() => false)) {
    await next.click();
    await page.waitForTimeout(3000);
    await page.waitForSelector('div.card.item-wrap', { timeout: 8000 }).catch(() => {});
    return true;
  }
  return false;
}
