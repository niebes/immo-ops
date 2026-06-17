# Portal: Ab ins Zuhause (ab-ins-zuhause.de)

Detail page: `/angebot/{uuid}`. Listings platform that re-lists from source portals (saw `Quelle: Immowelt.de` at the bottom).

## How to get the data
- **Plain `curl` (with a normal browser UA) returns the FULLY server-rendered detail page** — all fields are in the static HTML. No CiC, no Playwright, no consent click needed for the detail page. (~73 KB HTML.)
  - Why: saves opening a browser tab; the only XHR is usercentrics consent, which doesn't gate the content.
- No JSON-LD block. Extract by stripping tags and keyword-scanning the rendered text.

## Field layout (label/value pairs in text order)
- Title, then `{PLZ} {city}` (e.g. `14467 Potsdam` — only PLZ+city, no street).
- `{Kaltmiete} € / Kaltmiete zzgl. Nk`, `{m²} / Wohnfläche`, `{rooms} / Zimmer`, `Frei ab {weekday, D. Month YYYY}`.
- Kosten block: `Kaltmiete`, `Heizkosten`, `Nebenkosten`, `Gesamtmiete` (= Warmmiete), `Kaution {N} Kaltmieten`. NOTE: Heizkosten and Nebenkosten are listed separately — Warmmiete already given as Gesamtmiete.
- Sections: Objektbeschreibung, Lage, Sonstiges, Stichworte (e.g. "Anzahl Badezimmer: 2, ... modernisiert"), Gebäude/Wohnungsumfang, Energie & Bauzustand (Baujahr, Heizungsart, Energieausweisart, Endenergieverbrauch kWh/(m²a), Ausstellungsdatum, Gültig bis).
- Amenity chips near top: Einbauküche / Balkon / "Bad mit Dusche, Wanne".
- Anbieter shown only as `Gewerblicher Anbieter` or similar — **no company/Makler name in the exposé**; treat Block H as Unknown (3.5) and note it.

## Photos
- Gallery images are `cdnihddipa.cloudimg.io/.../{uuid}.jpg`. Count distinct cloudimg URLs (exclude `/build/images/...` logo/seal). Got 10 real photos for report #174. Grundriss usually NOT included.

## Expiry / discard
- Source is a re-list, so cache can go stale (like other aggregators) — if page shows "nicht gefunden"/sold, mark EXPIRED. Title `<title>` reflects the listing title when live.

Stable so far (first eval 2026-06-17, report #174). If the curl-renders-fully behaviour holds across more evals, promote to evaluate.md as "Ab ins Zuhause detail pages are static-fetchable".
