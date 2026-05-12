// CiC extraction snippet for ImmoScout24
// Run via mcp__claude-in-chrome__javascript_tool on the search results page.
// Returns JSON array of listings.

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
  const priceMatch = text.match(/([\d.]+)\s*€/);
  const m2Match = text.match(/([\d.,]+)\s*m²/);
  const roomsMatch = text.match(/(\d+)\s*Zi\./);
  // Address lines typically end with a city name and contain a comma
  const addrLine = lines.find(l => l.includes(',') && /\d{5}|\b[A-Z][a-zäöü]+(?:stadt|burg|berg|heim|dorf|feld)\b/.test(l)) || '';

  listings.push({
    url: 'https://www.immobilienscout24.de/expose/' + m[1],
    title,
    price: priceMatch ? parseInt(priceMatch[1].replace(/\./g, '')) : null,
    m2: m2Match ? parseFloat(m2Match[1].replace(',', '.')) : null,
    rooms: roomsMatch ? parseInt(roomsMatch[1]) : null,
    location: addrLine,
    portal: 'ImmoScout24',
  });
});

JSON.stringify(listings);
