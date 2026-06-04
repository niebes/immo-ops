import { parseNumber, extractPattern } from './base.mjs';

export async function extract(page, portalName) {
  const listings = [];
  const seen = new Set();

  // Try structured containers first
  const containers = page.locator(
    '[class*="listing"], [class*="result"], [class*="offer"], [class*="property"], [class*="apartment"], [class*="expose"]'
  );
  const containerCount = await containers.count();

  if (containerCount > 0) {
    for (let i = 0; i < containerCount; i++) {
      try {
        const item = containers.nth(i);
        const text = await item.textContent().catch(() => '');
        if (!text) continue;
        if (!/\d+\s*€/.test(text) && !/\d+\s*m²/.test(text)) continue;
        const link = item.locator('a[href]').first();
        const href = await link.getAttribute('href').catch(() => null);
        if (!href || seen.has(href)) continue;
        seen.add(href);
        const url = href.startsWith('http') ? href : new URL(href, page.url()).href;
        const title = await item.locator('h2, h3, h4, [class*="title"]').first().textContent().catch(() => text.substring(0, 80));
        listings.push({
          title: (title || '').trim().substring(0, 120),
          url,
          price: parseNumber(extractPattern(text, /(\d[\d.,]*)\s*€/)),
          m2: parseNumber(extractPattern(text, /(\d[\d,]*)\s*m²/)),
          rooms: parseNumber(extractPattern(text, /(\d+)\s*Zi/)),
          location: '',
          portal: portalName,
        });
      } catch { /* skip */ }
    }
  }

  // Fallback: scan links, require price AND detail
  if (listings.length === 0) {
    const links = page.locator('a[href]');
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 200); i++) {
      try {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        if (!href || seen.has(href)) continue;
        const text = await link.textContent().catch(() => '');
        if (!text || text.length < 15 || text.length > 200) continue;
        if (!/\d+\s*€/.test(text) || !/(\d+\s*m²|\d+\s*Zi|\d+\s*Zimmer)/.test(text)) continue;
        seen.add(href);
        const url = href.startsWith('http') ? href : new URL(href, page.url()).href;
        listings.push({
          title: text.trim().substring(0, 120),
          url,
          price: parseNumber(extractPattern(text, /(\d[\d.,]*)\s*€/)),
          m2: parseNumber(extractPattern(text, /(\d[\d,]*)\s*m²/)),
          rooms: parseNumber(extractPattern(text, /(\d+)\s*Zi/)),
          location: '',
          portal: portalName,
        });
      } catch { /* skip */ }
    }
  }

  return listings;
}

export async function nextPage(page) {
  const nextBtn = page.locator('a[rel="next"], [aria-label*="ächste"], [aria-label="next"]').first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}
