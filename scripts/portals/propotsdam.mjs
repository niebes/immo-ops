export async function extract(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('.table-list__row, li.row');
    const seen = new Set();
    return Array.from(rows).map(row => {
      const link = row.querySelector('a[href*="/verkaufsobjektdetails/"]');
      if (!link || seen.has(link.href)) return null;
      seen.add(link.href);
      const h = row.querySelector('h3, h4, .table-list__headline');
      const title = h?.textContent?.replace(/\s+/g, ' ').trim() || '';
      if (!title) return null;
      const facts = row.querySelectorAll('.main-facts__text');
      let price = null;
      let m2 = null;
      for (const f of facts) {
        const t = f.textContent.trim();
        if (/€/.test(t) && !price) {
          const m = t.match(/([\d.,]+)\s*€/);
          if (m) price = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        }
        if (/m²/.test(t) && !m2) {
          const m = t.match(/([\d.,]+)\s*m²/);
          if (m) m2 = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        }
      }
      const locMatch = title.match(/in\s+(?:der\s+)?(.+?)(?:\s+Neu)?$/);
      return {
        title: title.replace(/\s*Neu$/, '').substring(0, 120),
        url: link.href.startsWith('http') ? link.href : new URL(link.href, window.location.origin).href,
        price,
        m2,
        rooms: null,
        location: locMatch ? `Potsdam, ${locMatch[1]}` : 'Potsdam',
        portal: 'ProPotsdam',
      };
    }).filter(Boolean);
  });
}

export async function nextPage() {
  return false;
}
