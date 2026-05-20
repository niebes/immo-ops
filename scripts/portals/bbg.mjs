export async function extract(page) {
  return page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/properties/"]');
    const seen = new Set();
    return Array.from(links).map(link => {
      const url = link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href;
      if (seen.has(url)) return null;
      seen.add(url);
      const heading = link.querySelector('h4, h3, h2') || link;
      const title = heading?.textContent?.trim() || '';
      if (!title) return null;
      const card = link.closest('div') || link;
      const text = card.textContent || '';
      const m2Match = text.match(/([\d.,]+)\s*m[²2]/);
      const priceMatch = text.match(/([\d.,]+)\s*EUR/i);
      const locMatch = title.match(/in\s+(.+?)$/i) || title.match(/[-–]\s*(.+?)$/);
      return {
        title: title.substring(0, 120),
        url,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: locMatch ? locMatch[1].trim() : 'Brandenburg',
        portal: 'BBG Brandenburg',
      };
    }).filter(Boolean);
  });
}

export async function nextPage() {
  return false;
}
