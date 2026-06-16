// Schoba Immobilien (schoba.de) — Potsdam broker, server-rendered table layout.
//
// Page structure: the whole result list lives in a single `div#objekte`; each
// listing is its own `<table>` with a `.tabelletextleft-liste` header
// (objektart / PLZ+city / title) followed by label rows: `Zimmer:`,
// `Wohnfläche:ca. N m²`, `Nettokaltmiete:|Bruttowarmmiete: N EUR`, `Verfügbar ab:`.
// Detail link is `a[href*="vm-...og{r|m|l}-...htm"]` (multiple dup anchors per card —
// dedup by URL). Rented units show price `0,00 EUR` and `Verfügbar ab:# vermietet`;
// we keep only currently-available listings (price > 0 and availability not "vermietet").
// Single page — no pagination.

export async function extract(page) {
  return page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'))
      .filter(a => /(^|\/)vm-.*\.og[rml]?-.*\.htm/i.test(a.getAttribute('href') || ''));
    const seen = new Set();
    const out = [];
    for (const a of anchors) {
      const href = a.getAttribute('href');
      const url = href.startsWith('http') ? href : new URL(href, window.location.href).href;
      if (seen.has(url)) continue;
      const table = a.closest('table');
      if (!table) continue;

      const t = (table.textContent || '').replace(/\s+/g, ' ').trim();
      const roomsM = t.match(/Zimmer:\s*(\d+)/);
      const m2M = t.match(/Wohnfläche:\s*ca\.?\s*([\d.,]+)\s*m²/);
      const priceM = t.match(/(?:Nettokaltmiete|Kaltmiete|Bruttowarmmiete|Warmmiete):\s*([\d.,]+)\s*EUR/);
      const availM = t.match(/Verfügbar ab:\s*(.+?)\s*(?:Nettokaltmiete|Bruttowarmmiete|Kaltmiete|Warmmiete|$)/);

      const price = priceM ? parseFloat(priceM[1].replace(/\./g, '').replace(',', '.')) : null;
      const avail = (availM ? availM[1] : '').trim();
      // Skip rented units (price 0,00 / availability marked "# vermietet").
      if (!price || price <= 0 || /vermietet/i.test(avail)) continue;

      // Header: objektart span, then PLZ+city line, then title line (separated by <br>).
      const th = table.querySelector('.tabelletextleft-liste') || table.querySelector('th');
      let title = '', loc = '';
      if (th) {
        const clone = th.cloneNode(true);
        clone.querySelectorAll('.objektart').forEach(e => e.remove());
        const lines = (clone.innerHTML || '')
          .split(/<br\s*\/?>/i)
          .map(s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        const locLine = lines.find(l => /\d{5}\s+\D/.test(l)) || '';
        loc = locLine;
        title = lines.filter(l => l !== locLine).pop() || '';
      }

      seen.add(url);
      out.push({
        title: title.substring(0, 120),
        url,
        price,
        m2: m2M ? parseFloat(m2M[1].replace(/\./g, '').replace(',', '.')) : null,
        rooms: roomsM ? parseInt(roomsM[1], 10) : null,
        location: loc,
        portal: 'Schoba Immobilien',
      });
    }
    return out;
  });
}

export async function nextPage() {
  // Single-page listing overview — no pagination.
  return false;
}
