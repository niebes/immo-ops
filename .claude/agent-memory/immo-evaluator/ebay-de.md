# eBay.de (Grundstücke / Immobilien) — listing-page quirks

Matches: ebay.de item pages (`/itm/{id}`) in the Grundstücke/Immobilien category.

## Getting the data
- **Plain `curl` of `/itm/{id}` returns 403** — the item page always needs a browser. (Only the
  description iframe, below, is curl-able.)
- **invisible-playwright: never pass the URL to `new_page`.** `new_page(url='https://www.ebay.de/itm/…')`
  hangs the full 120 s MCP timeout AND leaves the page dead — the next `navigate_page` fails with
  `browsingContext is undefined`. Working recipe: `new_page` with an **empty** url → `navigate_page(url)`
  → `evaluate_script`. Returns 200 + title in ~2 s. If you already hit the timeout, call `new_page`
  (empty) again to get a fresh context; don't try to reuse the dead one.
- No cookie/consent wall blocks content; page renders immediately. `document.body.innerText` on the
  item page is only ~5 KB and already contains **the whole Artikelmerkmale table, seller box,
  feedback and Standort** — one `evaluate_script` gets everything except the long description.
  (CiC `navigate` then `read_page` also works; its first `navigate` sometimes lands on
  `chrome://newtab/` — just call `navigate` again.)
- **All the load-bearing fields are in the page DOM `read_page`, not behind interaction:**
  - Structured **Artikelmerkmale** key/value pairs are the spec sheet — use these:
    `Bebauung` (e.g. "Kein Bauland"), `Erschließung`, `Nutzungsart` (Freizeit/...), `Bundesland`,
    `Stadtteil / Gemeinde`, `Kauf/Pacht` (Kauf vs Pacht — critical for plots), `Stadt / Kreis`,
    `Empfohlene Nutzung`, `PLZ`. Location lives here + the `Standort:` line.
  - **Seller note** ("Hinweise des Verkäufers", quoted text) carries the real prose description
    (size in m², Grundbuch, lake distance, etc.). Extract its text node directly.
- **Seller's full HTML description (cross-origin iframe `#desc_ifr`): unreadable IN-BROWSER, but
  plain `curl` of the iframe `src` WORKS** (2026-07, item 298497838874). Recipe: grab
  `document.querySelector('#desc_ifr').src` (an `itm.ebaydesc.com/itmdesc/{id}?...` URL with a
  `t=` token), then Bash `curl -s '{src}' -H 'User-Agent: Mozilla/5.0 ...'` and strip tags — full
  description (Grundbuch refs, "Verhandlungsbasis", sale motive) comes back. *Why:* the VB-vs-real
  price question is often only answerable from the description; in-browser paths all fail
  (contentDocument null; in-page fetch → NetworkError; navigating to ebaydesc host → eval blocked
  by CSP + take_snapshot errors). Don't retry the in-browser routes — go straight to curl.
- Photo count comes from the gallery buttons "Bild N von M".
- Listing type: most plots are an **"Inserat"** (classified, fixed price, "kein Gebot") — contact-seller,
  no portal payment. Private sellers show "Angemeldet als privater Verkäufer" + member-since + feedback %.

## Price history / repost check (feeds the "reposted with different prices" scam signal)
- **`https://www.ebay.de/rvh/{itemId}`** = "Übersicht der Änderungen": a dated list of what the
  seller edited (Startpreis, Beschreibung, Bild-URL). Loads without login. Tells you *that* the
  price moved, not the old value.
- **`https://picclick.de/{slug}-{itemId}.html`** mirrors **ended** eBay items with their price,
  full description and "N days on eBay / unsold". This is how you find a **predecessor listing**:
  WebSearch the item title, and an old item number with a different price often surfaces.
  Seen 2026-08 on 178426822041 (39.000 VB) → predecessor 178331294925 ran 30 days at 45.000 unsold.
  *Why it matters:* it converts an unexplained Medium scam signal into a documented price
  reduction — and tells you exactly how soft the asking price is.

## Field traps in Artikelmerkmale
- **`Kauf/Pacht: Kauf` is NOT trustworthy on its own.** Sellers of Datschen/Bungalows on leased
  land tick "Kauf" (they *are* selling something) while the same table also carries
  `Pachtdauer (Jahre)` and `Pacht/Erbbauzins p.a.` — those two fields, plus the description, are
  authoritative. If either is populated, what is sold is only the **Baulichkeit**, the land stays
  Pachtland → no Grundbuch, no Eigentum, and a short Pachtdauer means removal risk.
  *Why:* scoring such a listing as a land purchase inflates Block A and misses the real risk (G).
- `Bebauung: Kein Bauland` + `Empfohlene Nutzung: … keine Bebauung` on a listing that *shows a
  house* = the structure's Baugenehmigung/Bestandsschutz is unproven, not that there is no house.
- `Grundstücksfläche (m²)` on Freizeit listings can be a tiny parcel (110 m² seen) — always read
  it, the word "Grundstück" in the title implies nothing about size.

## Triage
- Search is Brandenburg-state-wide, so listings are routinely 100+ km from Golm. The Cottbus/Spremberg/
  Lausitz southeast corner is ~128 km from Golm — far outside the ~50 km radius → location hard blocker.
  Always check `Stadt / Kreis` + PLZ against the radius before scoring.
