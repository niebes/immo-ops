# eBay.de (Grundstücke / Immobilien) — listing-page quirks

Matches: ebay.de item pages (`/itm/{id}`) in the Grundstücke/Immobilien category.

## Getting the data
- No cookie/consent wall blocks content; page renders immediately. CiC `navigate` then `read_page` works.
  Note: the first `navigate` sometimes lands on `chrome://newtab/` (no-op) — just call `navigate` again.
- **All the load-bearing fields are in the page DOM `read_page`, not behind interaction:**
  - Structured **Artikelmerkmale** key/value pairs are the spec sheet — use these:
    `Bebauung` (e.g. "Kein Bauland"), `Erschließung`, `Nutzungsart` (Freizeit/...), `Bundesland`,
    `Stadtteil / Gemeinde`, `Kauf/Pacht` (Kauf vs Pacht — critical for plots), `Stadt / Kreis`,
    `Empfohlene Nutzung`, `PLZ`. Location lives here + the `Standort:` line.
  - **Seller note** ("Hinweise des Verkäufers", quoted text) carries the real prose description
    (size in m², Grundbuch, lake distance, etc.). Extract its text node directly.
- **The seller's full HTML description is in a cross-origin iframe `#desc_ifr` and is NOT readable**
  (`contentDocument` is null/blocked). Do NOT waste calls trying to read it — the Artikelmerkmale +
  seller note already contain the substance. *Why:* otherwise you loop on iframe-access errors.
- Photo count comes from the gallery buttons "Bild N von M".
- Listing type: most plots are an **"Inserat"** (classified, fixed price, "kein Gebot") — contact-seller,
  no portal payment. Private sellers show "Angemeldet als privater Verkäufer" + member-since + feedback %.

## Triage
- Search is Brandenburg-state-wide, so listings are routinely 100+ km from Golm. The Cottbus/Spremberg/
  Lausitz southeast corner is ~128 km from Golm — far outside the ~50 km radius → location hard blocker.
  Always check `Stadt / Kreis` + PLZ against the radius before scoring.
