# Süddeutsche Immobilienmarkt — page quirks
Portal match: "Süddeutsche Immobilienmarkt" · immobilienmarkt.sueddeutsche.de

Aggregator. The detail page is thin and links out to the real source (Immowelt / OhneMakler / Engel & Völkers / Regionalimmobilien24) — open the source and extract the real details there. The aggregator cache goes stale: if the source says "Anzeige gelöscht" / deleted / "nicht gefunden", mark **EXPIRED** (do NOT score the cached numbers). Usually no cookie wall blocking content. Same source pool as Regionalimmobilien24 → heavy overlap; watch for the same flat already scored via ImmoScout24/Immowelt.

**Why:** scoring the cached aggregator page yields wrong/expired data; following to source is the only reliable extraction.

## Getting the data cheaply
- **Plain `curl` (normal browser UA) returns the full SZ detail page** — no browser needed for the aggregator layer itself. It only carries: title, PLZ+city, Kaltmiete, rooms, m², a price block, and `Quelle: www.immowelt.de` (source name as text, no visible link).
- **The source expose URL IS in the raw HTML even though it is not rendered.** Grep the fetched HTML for `immowelt\.de/[a-z0-9/-]+` (or the respective source domain) to recover the exact `expose/{uuid}` — much faster than searching the source portal by title. Same trick works on the Ab-ins-Zuhause cross-listing.
  - Why: SZ shows only "Quelle: www.immowelt.de" as plain text; without the grep you'd have to hunt the source listing manually.
- **immobilien.de is also in the source pool, and its URL hides in a tracking query string.** The grep must include `immobilien\.de/wohnen/[0-9]+` — the link appears only as `immobilien.de/wohnen/9747714?utm_campaign=…`, never as a rendered anchor, and a naive `immowelt|ohnemakler|…` alternation misses it entirely. immobilien.de IDs are plain integers, so grep them against `data/pipeline.md` as `wohnen/{id}` (bare digits alone produce false hits). Dead source renders "Kein Objekt gefunden bei immobilien.de" but still returns **HTTP 404 with a full 55 KB page** — check the body text, not just the status code, on portals that soft-404.
- **The SZ breadcrumb Ortsteil is unreliable — treat it as a guess, not data.** Seen H22NXT: breadcrumb + region id `de.potsdam-bornstedt`, while the flat is Carl-Adam-Petri-Straße in Nauener Vorstadt / Jungfernsee. Both are 14469, so the PLZ won't catch the error. *Why:* trusting it makes the same complex look like a new neighbourhood and defeats dedup-by-area.
- **SZ can silently DROP a Heizkosten line, so its Warmmiete reads low.** H22NXT showed `Warmmiete 1.945 = Kaltmiete 1.685 + NK 260`, but the sibling report on the same complex (#193) had a separate `Heizkosten 90` — i.e. the true warm figure is ~90 EUR higher than SZ's. Never quote SZ's Warmmiete as final; reconstruct it from the source.
- **SZ's own price block is sometimes wrong — always cross-check, never trust silently.** Seen broken (#363): `Warmmiete 1.110` next to `Bruttokaltmiete 870`, `Nebenkosten 240`, `Heizkosten 120` — labels mislabeled, numbers don't add up. Seen exactly right (#364/GZFMWR): 870 kalt + 290 NK = 1.160 warm, Kaution 2.610, matching the Immowelt source field-for-field. So: take prices from the source, cross-check against an Ab-ins-Zuhause twin if one exists (it splits Kaltmiete/Heizkosten/Nebenkosten/Gesamtmiete cleanly), and report any discrepancy.

- **SZ's "Warmmiete" label can actually be a *Pauschalmiete*.** When the price block shows a
  single "Warmmiete" and the source's `Nebenkosten` is `0 €` with no Kaltmiete row, it is an
  all-inclusive furnished let (§ 549 Abs. 2 Nr. 1 BGB) — a hard blocker, not a bargain warm
  rent. Chase the Anbieter's own exposé, which labels it `Pauschalmiete` (see
  `immobilien-de.md` and `homecompany.md`). Seen #659. *Why:* the scan gate compares that
  number against `max_kaltmiete`/`max_warmmiete` and lets it through; only EUR/m² exposes it.
- **SZ's PLZ is as unreliable as its breadcrumb Ortsteil** — and both can be wrong at once.
  #659 carried PLZ `14193` + breadcrumb "Berlin-Charlottenburg-Wilmersdorf" for a street that
  is actually **14199 Schmargendorf**; SZ just passes the source's field through unvalidated.
  Get the street from the source's JSON-LD and check it against a street directory whenever
  the Ortsteil decides scope. Do NOT fall back on the source `geo` — it is often a centroid of
  the wrong PLZ.

## Dedup FIRST — before spending any effort on the listing
After grepping the source expose URL out of the raw HTML (above), grep that expose ID against `data/pipeline.md` **before** extracting/scoring. SZ re-lists flats that were already scored under their source portal, and the SZ slug shares no token with the source URL, so slug-based dedup never catches it. Example: `.../helle-3-zimmer-wohnung-altbau-potsdam-babelsberg-GZFMWR` turned out to be `immowelt.de/expose/26nvt9lyf6y1` = already report **#334**, plus DUPE rows for the IS24 and Ab-ins-Zuhause copies of the same flat — a 4-way cross-post.
`grep -i "{exposeId}" data/pipeline.md data/listings.md` (case-insensitively — SZ's HTML carries the ID uppercase, the pipeline row may hold it lowercase).

**Grep `data/listings.md` too — the matching ID often lives ONLY in a report row's Notes column, never in `pipeline.md`.** Seen 2026-08-21 (H35WSF): `grep b0eab6d0 data/pipeline.md` → 0 hits, while `data/listings.md` row #228 carried "…DUPE Immowelt b0eab6d0". The reason is structural: when the *source* portal (IS24) was the one evaluated, the cross-post's ID was only ever written into the report/tracker note, so it never became a pipeline URL. *Why:* a pipeline-only grep declares a known flat "novel" and the whole re-list-vs-echo distinction below collapses.

**Why:** without this, a duplicate burns a fresh report number and produces a second, divergent score for one flat.

**One flat can fan out ≥3 aggregator caches inside a single scan cycle** (seen 2026-08-11, Immowelt `26XFJFHH69IZ` = report #538 → Ab-ins-Zuhause twin → SZ twin, all three surfacing hours apart with identical price blocks). So the expose-ID grep must hit `data/pipeline.md` **including its already-`[x]`-marked DUPE rows**, not just rows carrying a `#NNN`: the sibling you match may itself be a DUPE annotation rather than the original report. *Why:* grepping only for scored rows makes the 3rd cache look novel.

**A route-level "re-list of #NNN" auto-skip is not a dedup — always re-derive it from the source expose ID.** Seen 2026-08-11: the router skipped this SZ URL as a re-list of #357 (a *Discarded Tauschwohnung* in a different Ortsteil); the ID grep showed it was actually #538, an ordinary rental in Jägervorstadt. Two unrelated failure modes hide here — a wrong skip target, and skipping against a `Discarded` swap (which should never suppress a normal rental at all). *Why:* accepting the router's guess would have both mis-linked the flat and lost the "already scored 4,2/5" fact.

**But an expose-ID grep does NOT catch a re-list of an already-Expired flat.** When a landlord re-offers a unit it gets a **brand-new** source expose ID (and a new SZ slug), so the ID search comes back clean even though the flat has its own old report. Second dedup pass, cheap: grep `data/listings.md` for the **exact price+m² tuple** from the SZ price block (`grep "577,61\|66,24"`) — those figures survive a re-list unchanged even when dates and IDs don't. Seen #542: new Immowelt ID `8ef25270-…`, zero ID hits, but the price tuple matched #227 (Vonovia Waldstadt I) instantly. *Why:* without it you re-derive a whole evaluation from scratch and lose the "what changed since last time" comparison, which is the only real value a re-list has.

## Re-list vs. syndication echo: the **source exposé ID** decides it, not the SZ slug
A caller ("this is almost certainly a re-list of #NNN") cannot tell the two apart; you can, in one grep:
- **New source exposé ID** (never seen in `pipeline.md`/`listings.md`) ⇒ the landlord really did re-offer the flat. Then chase what changed (frei-ab, price, Anbieter) — that comparison is the report's whole value. Seen #542.
- **Same ID that is already logged (often as an old report's DUPE)** ⇒ pure **syndication echo**: SZ re-emitted its cache of the *original* ad months later. Nothing is back on the market. Seen #636/H35WSF (Immowelt `b0eab6d0` = #228's DUPE, byte-identical price block, source now "Anzeige gelöscht", IS24 twin still 404) → **EXPIRED**, state plainly that it is NOT a re-list.

*Why:* both shapes arrive with the identical prompt "identical numbers → the flat is back". Confirming that framing on an echo tells the user to act on a flat that has been gone for two months.

Two corrections worth harvesting even from a dead echo (cheap, and they pre-empt the *next* appearance):
1. **Re-add the price block.** SZ's arithmetic is self-consistent, older reports' often are not — #228 recorded Warmmiete 766,82 where 517,82 + 170 + 115 = **802,82**.
2. **Re-run the Mietspiegel anchor.** Old Waldstadt/Drewitz reports routinely scored Block A 5,0 off an Angebotsmieten anchor (9,01 / 12,60–13,50); against the qualified 2026 table the same flat is usually *above* the ortsübliche Vergleichsmiete (#228: 8,50 vs 6,46 EUR/m² = +31,6 %, Bremse überschritten). Same fix already applied to #227/#542.

## SZ's price block is a *subset* — pull the Ab-ins-Zuhause twin before concluding "nothing changed"
The SZ detail page carries **no availability date, no Baujahr, no Energieausweis, no street, no description**. On #542 that made a genuine re-offer look like a stale syndication echo: SZ's numbers were byte-identical to the old report, but the AIZ twin of the *same* source expose showed `Frei ab 02.09.2026` (two months later than the original), the street name, and `Energieausweis C / 78,00 kWh/(m²a) / gültig bis 09.07.2030` — none of it visible on SZ. So on any suspected re-list: curl the AIZ twin (`ab-ins-zuhause.de/angebot/{uuid}`) even when the source expose is already dead — it is a much fatter cache of the same ad and is what lets you say *what changed*.
Corollary: AIZ's `Quelle` link may resolve to the **same** expose ID as SZ's — then it is a second cache of one dead ad, not an independent live channel. Check the link before treating it as a separate chance.

## Cross-listing shortcut
SZ listings are frequently duplicated on **Ab ins Zuhause** (`/angebot/{uuid}`), which is fully static-curlable and much richer (full Objektbeschreibung, Lage, Sonstiges, Baujahr, Energieausweis, photo uuids, Kaution, frei-ab date). If the pipeline flags a DUPE, curl the AIZ twin for the body text and the source expose for the authoritative facts leaflet (Etage, Warmmiete, Anbieter name + rating). Two curls + one browser call covers everything.

## Machine-generated descriptions
Some source exposés (esp. Immowelt via Potsdam agencies) carry auto-generated body text that **contradicts the structured fields** — seen in one listing: "Erdgeschosswohnung … liegt auf der ersten Etage", "3 Zimmer" in the fact bar vs "besteht aus insgesamt zwei Zimmern" in prose, Terrasse chip vs Balkon in prose. Trust the structured fact bar, flag the contradiction in the report, and dock Block C/H rather than treating it as a scam signal.
