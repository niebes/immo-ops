// CiC extraction snippet for ImmoScout24
// Run via mcp__claude-in-chrome__javascript_tool on the search results page.
// Returns JSON array of listings from the CURRENT page only.
//
// For pagination: after processing results, check if there's a next page:
//   1. Run this snippet → get listings JSON
//   2. Pipe to process-scan.mjs
//   3. Use CiC to click the "Nächste Seite" button (or navigate to URL with &pagenumber=N)
//   4. Run this snippet again on the new page
//   5. Repeat until no more pages or 100 total listings or ≥80% already seen
//
// Sort by newest: add &sorting=2 to the search URL

const cards = document.querySelectorAll('.listing-card');
const seen = new Set();
const listings = [];

cards.forEach(card => {
  const link = card.querySelector('a[href*="/expose/"]');
  if (!link) return;
  const m = link.getAttribute('href').match(/\/expose\/(\d+)/);
  if (!m || seen.has(m[1])) return;
  seen.add(m[1]);

  const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
  const lines = (card.innerText || '').split('\n').map(l => l.trim()).filter(l => l.length > 3);
  const skip = ['Neu', 'Gesponsert', 'Guter Preis', 'Sehr guter Preis', 'Ausgezeichneter Preis', 'Noch', 'Sortieren'];
  const title = lines.find(l => l.length > 10 && !skip.some(s => l.startsWith(s))) || '';
  const priceMatch = text.match(/([\d.]+(?:,\d+)?)\s*€/);
  const m2Match = text.match(/([\d.,]+)\s*m²/);
  const roomsMatch = text.match(/(\d+)\s*Zi\./);
  const addrLine = lines.find(l => l.includes(',') && /\d{5}|\b[A-Z][a-zäöü]+(?:stadt|burg|berg|heim|dorf|feld)\b/.test(l)) || '';

  listings.push({
    url: 'https://www.immobilienscout24.de/expose/' + m[1],
    title,
    price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, '').replace(',', '.')) : null,
    m2: m2Match ? parseFloat(m2Match[1].replace(',', '.')) : null,
    rooms: roomsMatch ? parseInt(roomsMatch[1]) : null,
    location: addrLine,
    portal: 'ImmoScout24',
  });
});

// Also return pagination info
const totalText = document.querySelector('[data-testid="serp-title-variant-a-testid"], h1')?.textContent || '';
const totalMatch = totalText.match(/(\d+)\s*Mietwohnung/);
const hasNextPage = !!document.querySelector('[aria-label="Nächste Seite"], [data-nav="next"]');

JSON.stringify({ count: listings.length, total: totalMatch ? parseInt(totalMatch[1]) : null, hasNextPage, listings });
