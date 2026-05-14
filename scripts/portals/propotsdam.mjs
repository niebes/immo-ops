export async function extract(page) {
  return page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/verkaufsobjektdetails/"]');
    const seen = new Set();
    return Array.from(links).map(link => {
      if (seen.has(link.href)) return null;
      seen.add(link.href);
      const card = link.closest('article, .card, section, div') || link.parentElement?.parentElement;
      const text = card?.textContent || '';
      const title = link.textContent.trim() || '';
      if (title === 'Details' || title.length < 5) {
        const h = card?.querySelector('h2, h3, h4');
        if (h) return { title: h.textContent.trim().substring(0, 120), url: link.href, price: null, m2: null, rooms: null, location: '', portal: 'ProPotsdam' };
      }
      const priceMatch = text.match(/([\d.]+)\s*€/);
      const m2Match = text.match(/([\d.,]+)\s*m²/);
      return {
        title: (title === 'Details' ? (card?.querySelector('h2, h3, h4')?.textContent?.trim() || title) : title).substring(0, 120),
        url: link.href,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: '',
        portal: 'ProPotsdam',
      };
    }).filter(Boolean);
  });
}

export async function nextPage() {
  return false;
}
