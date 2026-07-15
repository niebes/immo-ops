# Immowelt (immowelt.de) — listing-page quirks

Matches: immowelt.de `/expose/{id}` detail pages (AVIV Germany GmbH).

## Getting the data
- **Plain curl/WebFetch is blocked (403)** even with a browser UA — don't bother; go straight to a browser tier.
- **invisible-playwright works first-try** (2026-07-11, #310): `new_page` → title already shows price/m²/address; `document.body.innerText` returns the FULL expose in one `evaluate_script` (no truncation), incl. Merkmale, Mietkosten, Sonstiges, Anbieter name + rating. No consent wall. Real gallery `<img>`s ARE present in the DOM here (filter out `/shared/images/` placeholders) — the "photos absent from DOM" note below was observed under CiC only.
- CiC fallback: **first `navigate` often lands on `chrome://newtab/` (no-op) — just call `navigate` again.** Second call loads.
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
- **Photo count under CiC without an aggregator:** even when gallery `<img>`s are absent, the raw HTML holds the photo CDN URLs — regex `documentElement.innerHTML` for `mms\.immowelt\.de\/[a-z0-9\/\-]+\.(webp|jpg|png)` and count uniques (also check `og:image`, which is a real mms photo). *Why:* #334 showed 0 real `<img>` but 10 unique mms URLs — avoids a wrong D-cap and needs no aggregator twin.
- **Cross-check via the aggregator:** when arriving from Süddeutsche/regionalimmobilien24, the aggregator page's `og:image` meta holds a real listing photo — use it to confirm photos EXIST (count still unknown) before capping D for "no photos". *Why:* #331 Immowelt DOM showed zero real imgs under CiC, but the SZ og:image proved the gallery is populated — a blind D-cap would have been wrong.

## Tauschwohnung (swap) listings
- Title `h1` shows "… • Tauschwohnung"; Anbieter is a private person via **Tauschwohnung.com** (a tauschwohnung.com disclaimer paragraph sits right after the description).
- **The partner's Suche is free-text in the description body**, not a structured field — e.g. "Wir suchen eine 4 Zimmer Wohnung ab 95 m². Unsere Wohnung zum Tausch ist im {Adresse}." Read the description prose for rooms/m²/area of what they want AND the real address/Vermieter of their flat (often a municipal landlord like Gesobau — swap needs that landlord's approval).

## Notes
- **Price cuts leave the description stale:** header Kaltmiete/Warmmiete fields get updated on reduction, but a "Mietkonditionen:" breakdown inside Sonstiges keeps the OLD numbers (seen #310: header 1.494/2.184 vs description 1.563,42/2.303,42). Report both and flag the conflict — don't average them.
- Availability: usually no explicit date on page (only an "Einzugsdatum" field in the contact form) → Block F = 3.0, ask in contact.
- Private listings show no Anbieter name and often no phone → contact via portal only; minor scam-caution signal.
- Aggregator twins: same units re-appear via regionalimmobilien24 / sueddeutsche / ab-ins-zuhause — dedup by unit (rooms/m²/area), not URL.
