# Immowelt (immowelt.de) — listing-page quirks

Matches: immowelt.de `/expose/{id}` detail pages (AVIV Germany GmbH).

## Getting the data
- **Plain curl/WebFetch is blocked (403)** even with a browser UA — don't bother; go straight to a browser tier. Re-confirmed 2026-07-20 (#397): still 403 (771-byte body) with a Chrome-126 UA. *Why:* callers/orchestrators sometimes assert "Immowelt is curl-fetchable" — it is not; test it in one call if told so, then escalate.
- **invisible-playwright can HANG (not just crash)**: 2026-07-20 `new_page` returned nothing for the full 1800s idle timeout — one lost call. Symptom differs from the "Connection closed while reading from the driver" crash below but the remedy is the same: don't retry, go straight to CiC. *Why:* a retry costs another 30 min of wall-clock.
- **invisible-playwright works first-try** (2026-07-11, #310): `new_page` → title already shows price/m²/address; `document.body.innerText` returns the FULL expose in one `evaluate_script` (no truncation), incl. Merkmale, Mietkosten, Sonstiges, Anbieter name + rating. No consent wall. Real gallery `<img>`s ARE present in the DOM here (filter out `/shared/images/` placeholders) — the "photos absent from DOM" note below was observed under CiC only.
- CiC fallback: **first `navigate` often lands on `chrome://newtab/` (no-op) — just call `navigate` again.** Second call loads.
- No cookie/consent wall blocks content; page renders immediately. `read_page`/`javascript_tool` on `document.body.innerText` works.
- **All load-bearing fields are in `innerText`** — extract by section, not one blob (CiC truncates ~1100 chars):
  - Header `h1`: Kaltmiete, Warmmiete, rooms · m² · Geschoss, area+PLZ.
  - `Merkmale` block: amenities list (Einbauküche, Balkon, Stellplatz, Badezimmer count, möbliert y/n, WG-geeignet, Dachgeschoss). **Keller is NOT reliably listed.** The visible chip list is truncated to ~7 items behind "Alle N Merkmale anzeigen"; absence of a Keller chip does NOT mean no Keller (see the Structured-payload section — #396 had a Keller that only the Grundriss caption revealed). Confirm against `innerHTML` before scoring a Keller as missing.
  - `Bausubstanz und Energie`: Energieausweis class, Zustand (teilsaniert/saniert/…), Energieträger.
  - `Mietkosten`: Warmmiete, Kaltmiete + €/m², Nebenkosten, Heizkosten note, Kaution.
  - **KAUF listings — `Preisdetails` is a ready-made Block A.** Gives Kaufpreis, €/m², `Provision für Käufer` (%), and a full itemized `Kaufnebenkosten` + **`Geschätzte Gesamtkosten`** (Notar 1,5 % / Grunderwerbsteuer / Provision / Grundbuch 0,5 %). Immediately after it, `Preise in der Region` states whether the €/m² is above/below comparable regional objects, plus the regional min/max €/m². *Why:* no need to hand-compute Nebenkosten or WebSearch a market benchmark — but note Immowelt's Grunderwerbsteuer line is the **state** rate (Brandenburg 6,5 %), so verify it matches the property's state, and the "günstiger als vergleichbare" verdict is an AVIV estimate over a very wide band, so treat it as weak evidence only.
  - Tail: `Über den Eigentümer` → "Privater Anbieter" / "Keine Telefonnummer hinterlegt", `Online-ID`.
  - Tail for COMMERCIAL listings: `Über den Anbieter` → company name + address + **`{x},{y}/5 ({N} Bewertungen)`** + partnership tenure ("10 Jahre Partnerschaft", "Diamond Partner") + Ansprechpartner. This is a ready-made Block-H reputation input — grab the last ~900 chars of `innerText` for it. *Why:* saves a WebSearch for landlord reputation; the portal rating is right there.
- **`Merkmale` shows only ~8 entries behind an "Alle {N} Merkmale anzeigen" control — clicking it via a `[...querySelectorAll('button')]` text match does NOT expand it** (2026-07-20, #397: not a `<button>`). The visible 8 plus the description prose have carried every scoring-relevant amenity so far; don't burn calls on the expander. Note that negatives ARE stated explicitly here ("**Kein Keller**"), unlike the rental Merkmale block where absence = missing.
- **`Alle {N} Merkmale anzeigen` often refuses to expand under automation** — clicking the leaf element and its 4 ancestors leaves `innerText` unchanged (React handler not on any clickable ancestor). Don't burn calls on it: the visible 7–8 Merkmale plus the description prose normally already confirm every must-have. To probe for a specific feature, regex `documentElement.innerHTML` for the keyword instead — but **verify the hit's context**, since Immowelt's nav dropdown contains `Zwangsversteigerung` and Ortsbeschreibungen contain `Denkmal`; both are boilerplate and will false-positive a profile deal-breaker (#398). *Why:* a naive keyword scan would have wrongly discarded a 4,4/5 house.
- **Kauf: the header €/m² can badly understate value** — it is Kaufpreis ÷ *Wohnfläche* only. When the description names a larger `Wohn- und Nutzfläche` (e.g. voll ausgebauter Keller: 100 m² Wohnfl. but 200 m² per Energieausweis), compute the effective €/m² too and say so in Block A. Also grab `Geschätzte Gesamtkosten` + the Kaufnebenkosten breakdown (Notar/GrESt/Provision/Grundbuch) straight from `Preisdetails` — for a budget check, total cost is the load-bearing number, not the sticker price. Nearby, `Preise in der Region` gives an AVIV comparable €/m² — useful Block-A market anchor, but low-confidence in small Ortsteile. *Why:* #398 read as 30% over the €/m² cap on the header figure, ~35% under on the real one.
- **Energieausweis detail is NOT in `innerText`** — the `Bausubstanz und Energie` section shows only Baujahr + a "Mehr Infos" button. Generic "click every button labelled Mehr anzeigen/Mehr Infos" does NOT open it; click `document.querySelector('[data-testid="cdp-energy-modal-button"]').click()`, wait ~1,5s, then read `[role="dialog"]`.innerText → Energieverbrauch kWh/(m²·a), **Energieausweistyp** (Verbrauchs-/Bedarfsausweis) and **Gültigkeit von–bis**. *Why:* without this the class/value looks "not stated" and the cert's validity window (a real red flag when expired) is invisible.
- **Photo count + per-room labels live in the embedded JSON, not the DOM `<img>`s.** Only the Anbieter logo is a real `<img>`. In `documentElement.innerHTML` find `\"medias\"` and read `\"description\":\"Bild N\"` (count) plus `\"classification\":{\"name\":\"...\"}` — values like `BEDROOM/KITCHEN/BATHROOM/LIVING_ROOM/HALLWAY/EMPTY_ROOM`. *Why:* gives exactly which rooms are pictured and, by absence, which are NOT (balcony, exterior, Grundriss) — much better than a bare mms-URL regex count, which also over-counts by including the logo.
- **When invisible-playwright's driver is down** (`new_page: Connection closed while reading from the driver`, repeatable), fall back to CiC — Immowelt loads fine there and `javascript_tool` slicing `innerText` around anchors like `indexOf('Kaltmiete')` gets every field in 2–3 calls.

## Structured payload (CiC) — media classification + hidden features
- The page embeds a JSON payload in `documentElement.innerHTML` with **backslash-escaped** quotes
  (`\"name\":\"...\"`), not plain `"name":"..."`. A naive `/"name":"X"/` regex returns **nothing** —
  match `/\\"name\\":\\"[A-Z_]+\\"/` instead. *Why:* #396 first attempt returned an empty object and
  looked like "no media data" when 35 classified entries were present.
- That payload gives a **per-image classification histogram** — `FLOORPLAN`, `INTERIOR`-type values
  (`LIVING_ROOM`, `BATHROOM`, `KITCHEN`, `BEDROOM`, `CLOSET`, `HALLWAY`, `STAIRCASE`, `EMPTY_ROOM`),
  `HOUSE_FACADE`, `TERRACE`, `BALCONY`, `YARD`. This separates **real photos from Grundrisse exactly**,
  which is what the `_shared.md` "cap D at 3.0" rule actually needs — better than the mms-URL count.
- **Hidden Merkmale:** the "Alle N Merkmale anzeigen" control does **not** expand via `.click()`
  (React handler not triggered). Don't fight it — grep `innerHTML` for the feature keywords you care
  about (Keller, Sauna, Kamin, Terrasse, Loggia, Aufzug, Einliegerwohnung, vermietet…) and read the
  surrounding context. *Why:* #396 the visible list showed 7 of 11 and omitted Keller; the Keller was
  only provable from a `"unverbindlicher Grundriss Keller"` FLOORPLAN caption in the payload.
  **A `Grundriss Keller` image caption is positive proof of a Keller** even when no Keller feature chip renders.

## Photos
- **Real property photos are frequently absent from the DOM** — `document.querySelectorAll('img')` returns only
  placeholders under `immowelt.de/shared/images/` (map `address-map.png`, `travel-time.png`, house-icon
  `selection_property_house.png`). A gallery *region* exists but holds zero real `<img>`.
  Filter out `/shared/images/` srcs; if nothing real-CDN remains → **no real photos → cap Block D at 3.0** and
  flag "no photos" in summary. *Why:* naive `img` count returns ~5–6 and looks like photos exist when none do.
- No on-page "N Fotos" counter to rely on.
- **Photo count under CiC without an aggregator:** even when gallery `<img>`s are absent, the raw HTML holds the photo CDN URLs — regex `documentElement.innerHTML` for `mms\.immowelt\.de\/[a-z0-9\/\-]+\.(webp|jpg|png)` and count uniques (also check `og:image`, which is a real mms photo). *Why:* #334 showed 0 real `<img>` but 10 unique mms URLs — avoids a wrong D-cap and needs no aggregator twin.
- **Cross-check via the aggregator:** when arriving from Süddeutsche/regionalimmobilien24, the aggregator page's `og:image` meta holds a real listing photo — use it to confirm photos EXIST (count still unknown) before capping D for "no photos". *Why:* #331 Immowelt DOM showed zero real imgs under CiC, but the SZ og:image proved the gallery is populated — a blind D-cap would have been wrong.

## Kauf listings
- **"Preise in der Region" block is a free Block-A anchor.** Even on a "Preis auf Anfrage" expose,
  Immowelt prints `Niedrigster Wert in der Region {x} €/m²` / `Höchster Wert {y} €/m²` (it says
  "Wir haben derzeit keinen Vergleich für diese Immobilie" but still shows the band). Use it as an
  independent cross-check against a Bodenrichtwert-derived estimate. *Why:* #396 — the portal's own
  3.218–5.946 EUR/m² band corroborated the BORIS-based floor with zero extra research.
- **Provision terms are spelled out in the Preisdetails block** — rate, when it becomes due, and
  crucially whether a **same-rate contract with the seller** exists (= § 656c BGB split confirmed).
  Read it verbatim; it is a real Block-G differentiator (#396 was clean and 2,38 %; #384's IS24 twin
  tried to bind the Maklervertrag to the mere Exposé-Abruf at 3,57 %).
- **Watch the tail of the description for a digital-staging disclaimer** — e.g. "Einige Räume sowie
  die Außenanlage wurden digital gestaltet und dienen ausschließlich als Inspiration." It sits AFTER
  the prose and before "Mehr anzeigen", so a truncated read misses it. It is *partial* staging on an
  existing building: do NOT apply the full `_shared.md` cap-D-at-3.0 (plenty of real photos coexist),
  but dock ~0,25 and flag which features are unverifiable. *Why:* #396 the staged part was the
  Außenanlage — i.e. exactly the garden + waterfront the listing was selling.

## Tauschwohnung (swap) listings
- Title `h1` shows "… • Tauschwohnung"; Anbieter is a private person via **Tauschwohnung.com** (a tauschwohnung.com disclaimer paragraph sits right after the description).
- **The partner's Suche is free-text in the description body**, not a structured field — e.g. "Wir suchen eine 4 Zimmer Wohnung ab 95 m². Unsere Wohnung zum Tausch ist im {Adresse}." Read the description prose for rooms/m²/area of what they want AND the real address/Vermieter of their flat (often a municipal landlord like Gesobau — swap needs that landlord's approval).
- **The Suche can hinge on FLOOR/Etage, not just rooms/m²/area — check the title too.** Seen on #351 (dd00b8fa, Bornstedt): title = "TAUSCHWOHNUNG **Tausch in eine höhere Etage**", flat is EG, Suche = "2-3 Zimmer mit Balkon in Potsdam (Norden)". Their central motivation was a *higher floor*. Our Golm offer (EG, no balcony) matched rooms+area (Golm = Potsdam-Nord) but failed the two explicit points (höhere Etage + Balkon) → side-2 clear fail → DISCARDED, even though their flat scored 4,4/5 for us. So a floor preference in the title is a real side-2 match dimension; our EG offer fails any "höhere Etage"/upper-floor Suche.

## Notes
- **Price cuts leave the description stale:** header Kaltmiete/Warmmiete fields get updated on reduction, but a "Mietkonditionen:" breakdown inside Sonstiges keeps the OLD numbers (seen #310: header 1.494/2.184 vs description 1.563,42/2.303,42). Report both and flag the conflict — don't average them.
- Availability: usually no explicit date on page (only an "Einzugsdatum" field in the contact form) → Block F = 3.0, ask in contact.
- Private listings show no Anbieter name and often no phone → contact via portal only; minor scam-caution signal.
- Aggregator twins: same units re-appear via regionalimmobilien24 / sueddeutsche / ab-ins-zuhause — dedup by unit (rooms/m²/area), not URL.
