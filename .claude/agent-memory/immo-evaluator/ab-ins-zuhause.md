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
- **`Gesamtmiete` is FABRICATED when the source has no Nebenkosten.** #596: AIZ rendered `Kaltmiete 1.400,00 €` **and** `Gesamtmiete 1.400,00 €` with no NK/Heizkosten row at all; the Immowelt source's Mietkosten block genuinely contains only Kaltmiete + Kaution. AIZ echoes the Kaltmiete into the Gesamtmiete slot rather than omitting it. **Rule: only believe `Gesamtmiete` when a separate NK and/or Heizkosten line is also present.** If Gesamtmiete == Kaltmiete, the Warmmiete is UNKNOWN — report it as unknown + an estimate, never as "Warmmiete = Kaltmiete". *Why:* it silently produces a fake all-in cost, which flips Block A and the whole budget check.
- **Kaution is passed through in whatever form the source used** — sometimes a raw unformatted number (`Kaution 4200`, no `€`, no "N Kaltmieten" → divide by the Kaltmiete yourself), sometimes the source's prose (`Kaution drei Monatsmieten`, #637). Don't expect a number; parse both shapes.
- **`Objektbeschreibung` can be literally `Keine Beschreibung angegeben`** while the listing is perfectly fine — the real prose then sits entirely in `Sonstiges`. Don't read the empty description as a thin/suspicious ad; read `Sonstiges` before judging. (#637.)
- Sections: Objektbeschreibung, Lage, Sonstiges, Stichworte (e.g. "Anzahl Badezimmer: 2, ... modernisiert"), Gebäude/Wohnungsumfang, Energie & Bauzustand (Baujahr, Heizungsart, Energieausweisart, Endenergieverbrauch kWh/(m²a), Ausstellungsdatum, Gültig bis).
- ⭐ **The `Stichworte` block is passed through VERBATIM from the Immowelt source — including fields no other portal inserts.** #637: AIZ carried `Mindestmietdauer: 24 Monate`, `Balkon-Terrassen-Fläche: 15,22 m²`, `Anzahl der Schlafzimmer/Badezimmer/Balkone/Terrassen`, `Bundesland` — the same string Immowelt renders. *Why:* this makes a 1-second curl of AIZ the **cheapest way to read an Immowelt `Stichworte` field** (Kündigungsausschluss/Mindestmietdauer are Block-G-deciding and IS24 twins of the same object often omit them). Always grep the AIZ text for `Mindestmietdauer|Kündigungsausschluss|Staffel|Index` before opening a browser.
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

## Dedup (aggregator twins)
- **Dedup on the `Quelle` expose ID, never on the price.** One grep — `grep -oE 'immowelt\.de/expose/[0-9A-Za-z-]+' page.html` — settles it before any scoring. The AIZ headline price is the **Kaltmiete** ("Kaltmiete zzgl. Nk"), while sibling aggregators (Süddeutsche) often cache the same-numbered **Warmmiete** of a *different* flat.
  - *Why (both directions seen in the 2026-08-11 cycle, same portal, same day):* an AIZ entry hinted "1.650 EUR / 3 Zi / Potsdam" looked exactly like #539's warm rent (1.250 kalt / 1.650 warm) — source ID `26XFJFHH69IZ` proved it was **#538** (1.650 **kalt**, Jägervorstadt). A second AIZ entry hinted "1.250 EUR" and this time really *was* #539 (`26EPHN5FFVMA`). Price similarity predicts nothing in either direction; the ID always decides.
- **Expect 3+ aggregator copies of one expose per cycle.** `26EPHN5FFVMA` surfaced as Immowelt (#539, scored) → Süddeutsche → AIZ. Whenever a Potsdam Immowelt expose has been scored recently, assume an AIZ/SZ twin is queued behind it and grep the ID first.
- AIZ titles are frequently the generic placeholder **"Immobilie in Potsdam"** — no title signal for dedup; go by source ID + street in the Objektbeschreibung.
- **AIZ also drops PHOTOS, not just fields** — #596: AIZ carried 10 cloudimg uuids, the Immowelt source 12. Never state a photo count off AIZ when the source is reachable.
- **AIZ silently DROPS fields the source expose has — and Keller is the field it drops.** #571 rendered no Keller and `Energieausweisart: Nicht angegeben` while the Immowelt source had Keller confirmed; **#637 repeated it exactly** (AIZ chips: Einbauküche / Balkon,Terrasse / Bad mit Dusche — no Keller; the Immowelt source has an explicit `Keller` Merkmal-Chip). Twice on the same field = treat "no Keller on AIZ" as **no information**, never as absence. Scoring it off AIZ alone would have taken the Block-E must-have penalty (3,9 → 2,0) and moved the global score by ~0,2. Always resolve `keller`/`balkon` at the `Quelle` expose.

Stable so far (first eval 2026-06-17, report #174). If the curl-renders-fully behaviour holds across more evals, promote to evaluate.md as "Ab ins Zuhause detail pages are static-fetchable".
