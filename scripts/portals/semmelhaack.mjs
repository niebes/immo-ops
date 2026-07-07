import { parseNumber } from './base.mjs';

// Semmelhaack — JS-rendered listing cards (needs Playwright).
// Structure (2026): div.objekt-single-data → h2/h3/h4 (title)
//   → div.row > span.label + span.value (Adresse, Nutzfläche, Räume, Kaltmiete)
//   → a.zur-objektbeschreibung (detail link to /vermietung/wohnobjekte/details-wohnobjekt/{id}/)
// ~53 listings nationwide. Wait for JS render.
// NOTE: site intermittently CAPTCHA-blocks headless — when that happens scan.mjs
// flags it for the CiC fallback (scripts/portals/semmelhaack-extract.js).

export async function extract(page) {
  await page.waitForSelector('div.objekt-single-data', { timeout: 10000 }).catch(() => {});
  const listings = [];
  const seen = new Set();

  const containers = page.locator('div.objekt-single-data');
  const count = await containers.count();

  for (let i = 0; i < count; i++) {
    try {
      const container = containers.nth(i);
      const title = await container.locator('h1,h2,h3,h4,h5').first().textContent().catch(() => '');
      if (!title || title.length < 5) continue;

      const link = container.locator('a.zur-objektbeschreibung').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const url = href.startsWith('http') ? href : new URL(href, page.url()).href;

      const rows = container.locator('.row');
      const rowCount = await rows.count();
      let price = null, m2 = null, rooms = null, address = '';

      for (let j = 0; j < rowCount; j++) {
        const label = await rows.nth(j).locator('.label').textContent().catch(() => '');
        const value = await rows.nth(j).locator('.value').textContent().catch(() => '');
        const labelClean = label.trim().replace(/:$/, '').toLowerCase();
        const valueClean = value.trim();

        if (labelClean.includes('kaltmiete') || labelClean.includes('inklusivmiete')) {
          price = parseNumber(valueClean.replace(/€/, ''));
        } else if (labelClean.includes('nutzfläche') || labelClean.includes('wohnfläche') || labelClean.includes('fläche')) {
          m2 = parseNumber(valueClean.replace(/m²/, ''));
        } else if (labelClean.includes('räume') || labelClean.includes('zimmer')) {
          rooms = parseNumber(valueClean);
        } else if (labelClean.includes('adresse') || labelClean.includes('standort')) {
          address = valueClean;
        }
      }

      listings.push({
        title: title.trim().substring(0, 120),
        url,
        price,
        m2,
        rooms,
        location: address,
        portal: 'Semmelhaack',
      });
    } catch { /* skip */ }
  }

  return listings;
}

export async function nextPage() {
  return false;
}
