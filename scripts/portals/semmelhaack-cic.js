// CiC extraction snippet for Semmelhaack (semmelhaack.de/mietangebote/)
// Run via mcp__claude-in-chrome__javascript_tool on the Mietangebote page.
// Semmelhaack CAPTCHA-blocks headless Playwright intermittently — this is the
// CiC (real-browser) fallback the scan workflow routes to when scan.mjs flags
// it in data/scan-failures.json (classification: bot_defense).
//
// Layout (2026): div.objekt-single-data card containing:
//   h2/h3/h4 (title) + .row > (.label + .value) for Adresse / Nutzfläche / Räume / Kaltmiete
//   a.zur-objektbeschreibung -> /vermietung/wohnobjekte/details-wohnobjekt/{id}/
// ~53 listings nationwide, single page (no pagination). Criteria filter drops
// the non-Potsdam ones downstream.

(function () {
  const cards = document.querySelectorAll('div.objekt-single-data');
  const seen = new Set();
  const listings = [];

  const num = (s) => {
    if (!s) return null;
    const m = s.replace(/[^\d.,]/g, '').match(/[\d.,]+/);
    if (!m) return null;
    const v = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };

  cards.forEach((card) => {
    const link = card.querySelector('a.zur-objektbeschreibung, a[href*="details-wohnobjekt"]');
    const href = link ? link.getAttribute('href') : null;
    if (!href || seen.has(href)) return;
    seen.add(href);

    const title = (card.querySelector('h1,h2,h3,h4,h5')?.innerText || '').trim();
    if (!title || title.length < 5) return;

    let price = null, m2 = null, rooms = null, address = '';
    card.querySelectorAll('.row').forEach((row) => {
      const label = (row.querySelector('.label')?.innerText || '').trim().replace(/:$/, '').toLowerCase();
      const value = (row.querySelector('.value')?.innerText || '').trim();
      if (label.includes('kaltmiete') || label.includes('inklusivmiete')) price = num(value);
      else if (label.includes('nutzfläche') || label.includes('wohnfläche') || label.includes('fläche')) m2 = num(value);
      else if (label.includes('räume') || label.includes('zimmer')) rooms = num(value);
      else if (label.includes('adresse') || label.includes('standort')) address = value;
    });

    listings.push({
      url: href.startsWith('http') ? href : 'https://semmelhaack.de' + href,
      title: title.slice(0, 120),
      price,
      m2,
      rooms: rooms != null ? Math.round(rooms) : null,
      location: address,
      portal: 'Semmelhaack',
    });
  });

  // Single-page listing — no pager.
  return JSON.stringify({ count: listings.length, hasNextPage: false, listings });
})();
