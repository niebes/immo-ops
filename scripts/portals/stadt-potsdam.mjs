export async function extract(page) {
  return page.evaluate(() => {
    const articles = document.querySelectorAll('article');
    return Array.from(articles).map(article => {
      const link = article.querySelector('a[href]');
      if (!link) return null;
      const heading = article.querySelector('h2, h3');
      const title = heading?.textContent?.trim() || link.textContent?.trim() || '';
      if (!title) return null;
      const text = article.textContent || '';
      const m2Match = text.match(/([\d.,]+)\s*m²/);
      return {
        title: title.substring(0, 120),
        url: link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href,
        price: null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: 'Potsdam',
        portal: 'Stadt Potsdam / KIS',
      };
    }).filter(Boolean);
  });
}

export async function nextPage() {
  return false;
}
