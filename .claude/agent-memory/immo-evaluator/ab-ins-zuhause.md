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
- Anbieter field shown only as `Gewerblicher Anbieter` or similar — no name there. BUT the actual landlord/company is often buried in the Objektbeschreibung/Sonstiges/Datenschutz text (e.g. #236 named "BUWOG-Immobilien Treuhand" in the Sonstiges block). Keyword-scan the description before defaulting Block H to Unknown (3.5) — a named corporate landlord raises H.

## Photos
- Gallery images are `cdnihddipa.cloudimg.io/.../{uuid}.jpg`. Count DISTINCT cloudimg uuids (exclude `/build/images/...` logo/seal; the og:image uuid repeats across several meta tags, so dedupe). Grundriss usually NOT included.
- **Static fetch DOES still contain the full gallery** (confirmed #258: 4 distinct uuids; #174: 10). Per-listing photo counts just vary — a low count = that listing genuinely has few photos, not a fetch limitation. (#257 the TAG Wohnen unit really had only 1 photo — do not read that as "gallery lazy-loads".) So curl remains sufficient to count real photos.
- **Why:** briefly mis-diagnosed #257's single photo as JS-hydration; #258's 4 static photos disproved it — the curl HTML is complete, some listings are just photo-poor.

## Expiry / discard
- Source is a re-list, so cache can go stale (like other aggregators) — if page shows "nicht gefunden"/sold, mark EXPIRED. Title `<title>` reflects the listing title when live.
- **AIZ keeps serving HTTP 200 with the full expose long after the source ad is deleted** — it shows no "gelöscht"/"vermietet" state of its own. Liveness must always be decided at the source: the `Quelle: Immowelt.de` link (grep `immowelt\.de/expose/[0-9a-f-]+` in the raw HTML) is the only ID that matters. #542: AIZ rendered a complete, plausible expose while that exact Immowelt ID answered "Anzeige gelöscht". *Why:* a rich, fully-rendered AIZ page reads as proof of liveness and it is not.
- **But keep the AIZ cache — it is the best post-mortem record.** It is a much fatter cache than Süddeutsche's (which has no date/Baujahr/energy/street) and is what lets you state *what changed* between an old report and a re-list. Curl it even when the source is already dead.
- Transient `curl` exit 35 (SSL) happens occasionally; a plain retry succeeds. Not a block.

Stable so far (first eval 2026-06-17, report #174). If the curl-renders-fully behaviour holds across more evals, promote to evaluate.md as "Ab ins Zuhause detail pages are static-fetchable".
