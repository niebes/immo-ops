export async function extract(page) {
  return page.evaluate(() => {
    const articles = document.querySelectorAll('article');
    return Array.from(articles).map(article => {
      const link = article.querySelector('a[href*="/pressemitteilung"]');
      if (!link) return null;
      const heading = article.querySelector('h2, h3');
      const title = heading?.textContent?.trim() || link.textContent?.trim() || '';
      if (!title || title.includes('keine Immobilien')) return null;
      const text = article.textContent || '';
      const priceMatch = text.match(/Kaufpreisvorstellung:\s*([\d.,]+)\s*EUR/i);
      const m2Match = text.match(/([\d.,]+)\s*m²/);
      return {
        title: title.substring(0, 120),
        url: link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: '',
        portal: 'BLB Brandenburg',
      };
    }).filter(Boolean);
  });
}

export async function nextPage() {
  return false;
}
