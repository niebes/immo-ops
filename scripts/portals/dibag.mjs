import { parseNumber } from './base.mjs';

// DIBAG Potsdam — Elementor page with WE unit blocks.
// Structure: elementor-heading-title ("Haus X | WE NN") → text-editor ("DG · 1 Zimmer\nAddress") → uael-table (Etage, Wohnfläche)
// No prices shown. PDF floor plans linked.

export async function extract(page) {
  const listings = [];

  const headings = page.locator('.elementor-heading-title');
  const count = await headings.count();

  for (let i = 0; i < count; i++) {
    try {
      const heading = headings.nth(i);
      const text = await heading.textContent();
      const weMatch = text.match(/Haus\s+([A-Z])\s*\|\s*WE\s*(\d+)/);
      if (!weMatch) continue;

      const container = heading.locator('..').locator('..');
      const parent = container.locator('..').locator('..');
      const fullText = await parent.textContent().catch(() => '');

      const zimmerMatch = fullText.match(/(\d+)\s*Zimmer/i);
      const m2Match = fullText.match(/([\d,]+)\s*m²/);
      const addressMatch = fullText.match(/(In der Feldmark\s*\d+)/i);
      const floorMatch = fullText.match(/(DG|EG|\d+\.\s*OG)/i);

      const pdfLink = parent.locator('a[href$=".pdf"]').first();
      const pdfHref = await pdfLink.getAttribute('href').catch(() => null);
      const url = pdfHref
        ? (pdfHref.startsWith('http') ? pdfHref : new URL(pdfHref, page.url()).href)
        : page.url() + '#WE' + weMatch[2];

      listings.push({
        title: `Haus ${weMatch[1]} WE ${weMatch[2]} — ${zimmerMatch?.[1] || '?'} Zi, ${m2Match?.[1] || '?'} m², ${floorMatch?.[1] || '?'}`,
        url,
        price: null,
        m2: parseNumber(m2Match?.[1]),
        rooms: parseNumber(zimmerMatch?.[1]),
        location: addressMatch?.[1] ? `${addressMatch[1]}, 14476 Potsdam-Golm` : 'Potsdam-Golm',
        portal: 'DIBAG Potsdam',
      });
    } catch { /* skip */ }
  }

  return listings;
}

export async function nextPage() {
  return false;
}
