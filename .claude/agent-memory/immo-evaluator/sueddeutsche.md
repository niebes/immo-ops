# Süddeutsche Immobilienmarkt — page quirks
Portal match: "Süddeutsche Immobilienmarkt" · immobilienmarkt.sueddeutsche.de

Aggregator. The detail page is thin and links out to the real source (Immowelt / OhneMakler / Engel & Völkers / Regionalimmobilien24) — open the source and extract the real details there. The aggregator cache goes stale: if the source says "Anzeige gelöscht" / deleted / "nicht gefunden", mark **EXPIRED** (do NOT score the cached numbers). Usually no cookie wall blocking content. Same source pool as Regionalimmobilien24 → heavy overlap; watch for the same flat already scored via ImmoScout24/Immowelt.

**Why:** scoring the cached aggregator page yields wrong/expired data; following to source is the only reliable extraction.

## Getting the data cheaply
- **Plain `curl` (normal browser UA) returns the full SZ detail page** — no browser needed for the aggregator layer itself. It only carries: title, PLZ+city, Kaltmiete, rooms, m², a price block, and `Quelle: www.immowelt.de` (source name as text, no visible link).
- **The source expose URL IS in the raw HTML even though it is not rendered.** Grep the fetched HTML for `immowelt\.de/[a-z0-9/-]+` (or the respective source domain) to recover the exact `expose/{uuid}` — much faster than searching the source portal by title. Same trick works on the Ab-ins-Zuhause cross-listing.
  - Why: SZ shows only "Quelle: www.immowelt.de" as plain text; without the grep you'd have to hunt the source listing manually.
- **SZ's own price block is sometimes wrong — always cross-check, never trust silently.** Seen broken (#363): `Warmmiete 1.110` next to `Bruttokaltmiete 870`, `Nebenkosten 240`, `Heizkosten 120` — labels mislabeled, numbers don't add up. Seen exactly right (#364/GZFMWR): 870 kalt + 290 NK = 1.160 warm, Kaution 2.610, matching the Immowelt source field-for-field. So: take prices from the source, cross-check against an Ab-ins-Zuhause twin if one exists (it splits Kaltmiete/Heizkosten/Nebenkosten/Gesamtmiete cleanly), and report any discrepancy.

## Dedup FIRST — before spending any effort on the listing
After grepping the source expose URL out of the raw HTML (above), grep that expose ID against `data/pipeline.md` **before** extracting/scoring. SZ re-lists flats that were already scored under their source portal, and the SZ slug shares no token with the source URL, so slug-based dedup never catches it. Example: `.../helle-3-zimmer-wohnung-altbau-potsdam-babelsberg-GZFMWR` turned out to be `immowelt.de/expose/26nvt9lyf6y1` = already report **#334**, plus DUPE rows for the IS24 and Ab-ins-Zuhause copies of the same flat — a 4-way cross-post.
`grep -i "{exposeId}" data/pipeline.md` (case-insensitively — SZ's HTML carries the ID uppercase, the pipeline row may hold it lowercase).

**Why:** without this, a duplicate burns a fresh report number and produces a second, divergent score for one flat.

## Cross-listing shortcut
SZ listings are frequently duplicated on **Ab ins Zuhause** (`/angebot/{uuid}`), which is fully static-curlable and much richer (full Objektbeschreibung, Lage, Sonstiges, Baujahr, Energieausweis, photo uuids, Kaution, frei-ab date). If the pipeline flags a DUPE, curl the AIZ twin for the body text and the source expose for the authoritative facts leaflet (Etage, Warmmiete, Anbieter name + rating). Two curls + one browser call covers everything.

## Machine-generated descriptions
Some source exposés (esp. Immowelt via Potsdam agencies) carry auto-generated body text that **contradicts the structured fields** — seen in one listing: "Erdgeschosswohnung … liegt auf der ersten Etage", "3 Zimmer" in the fact bar vs "besteht aus insgesamt zwei Zimmern" in prose, Terrasse chip vs Balkon in prose. Trust the structured fact bar, flag the contradiction in the report, and dock Block C/H rather than treating it as a scam signal.
