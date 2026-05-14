export async function extract(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('.auktion-details');
    return Array.from(rows).map(row => {
      const link = row.querySelector('.addr-list a');
      if (!link) return null;
      const priceSpan = row.querySelector('.auktionLimitAmoutForSorting');
      const price = priceSpan ? parseInt(priceSpan.textContent.trim()) : null;
      const text = link.textContent.replace(/\s+/g, ' ').trim();
      const lines = link.innerHTML.split('<br>').map(s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()).filter(Boolean);
      const title = lines[0] || text.substring(0, 120);
      const address = lines.slice(1).join(', ');
      const m2Match = text.match(/([\d.,]+)\s*m²/);
      return {
        title: title.substring(0, 120),
        url: link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href,
        price: price || null,
        m2: m2Match ? parseFloat(m2Match[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: null,
        location: address,
        portal: 'DGA Auktionen',
      };
    }).filter(Boolean);
  });
}

export async function nextPage() {
  return false;
}
