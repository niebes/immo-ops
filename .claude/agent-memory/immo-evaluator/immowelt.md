# Immowelt (immowelt.de) — listing-page quirks

Matches: immowelt.de `/expose/{id}` detail pages (AVIV Germany GmbH).

## Getting the data
- **First `navigate` often lands on `chrome://newtab/` (no-op) — just call `navigate` again.** Second call loads.
- No cookie/consent wall blocks content; page renders immediately. `read_page`/`javascript_tool` on `document.body.innerText` works.
- **All load-bearing fields are in `innerText`** — extract by section, not one blob (CiC truncates ~1100 chars):
  - Header `h1`: Kaltmiete, Warmmiete, rooms · m² · Geschoss, area+PLZ.
  - `Merkmale` block: amenities list (Einbauküche, Balkon, Stellplatz, Badezimmer count, möbliert y/n, WG-geeignet, Dachgeschoss). **Keller is only listed if present — absence = treat must-have as missing.**
  - `Bausubstanz und Energie`: Energieausweis class, Zustand (teilsaniert/saniert/…), Energieträger.
  - `Mietkosten`: Warmmiete, Kaltmiete + €/m², Nebenkosten, Heizkosten note, Kaution.
  - Tail: `Über den Eigentümer` → "Privater Anbieter" / "Keine Telefonnummer hinterlegt", `Online-ID`.

## Photos
- **Real property photos are frequently absent from the DOM** — `document.querySelectorAll('img')` returns only
  placeholders under `immowelt.de/shared/images/` (map `address-map.png`, `travel-time.png`, house-icon
  `selection_property_house.png`). A gallery *region* exists but holds zero real `<img>`.
  Filter out `/shared/images/` srcs; if nothing real-CDN remains → **no real photos → cap Block D at 3.0** and
  flag "no photos" in summary. *Why:* naive `img` count returns ~5–6 and looks like photos exist when none do.
- No on-page "N Fotos" counter to rely on.

## Notes
- Availability: usually no explicit date on page (only an "Einzugsdatum" field in the contact form) → Block F = 3.0, ask in contact.
- Private listings show no Anbieter name and often no phone → contact via portal only; minor scam-caution signal.
- Aggregator twins: same units re-appear via regionalimmobilien24 / sueddeutsche / ab-ins-zuhause — dedup by unit (rooms/m²/area), not URL.
